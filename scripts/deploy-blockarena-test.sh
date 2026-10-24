#!/usr/bin/env bash
# Executed as root by AWS Systems Manager Run Command (test branch only).
# Usage: bash -s -- BUCKET COMMIT_SHA ARCHIVE_SHA256
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:/snap/bin:${PATH:-}"
export AWS_EC2_METADATA_DISABLED=false

bucket="${1:?S3 bucket required}"
commit="${2:?Git commit required}"
checksum="${3:?SHA-256 required}"
region="ap-northeast-2"

if [[ ! "$bucket" =~ ^[a-z0-9.-]+$ || ! "$commit" =~ ^[0-9a-f]{40}$ || ! "$checksum" =~ ^[0-9a-f]{64}$ ]]; then
  echo "Invalid deployment inputs" >&2
  exit 2
fi

# Prevent concurrent deployments or accidental replacement of unrelated files.
exec 9>/var/lock/blockarena-test-deploy.lock
flock -w 120 9

base="/var/www/apps/blockarena"
releases="$base/releases"
release="$releases/$commit"
current="$base/current"
public="/var/www/html/blockarena"

for command_name in bash curl python3 flock sha256sum nginx; do
  command -v "$command_name" >/dev/null || { echo "Missing: $command_name" >&2; exit 1; }
done

if [[ -e "$current" && ! -L "$current" ]]; then
  echo "Refusing to replace non-symlink: $current" >&2
  exit 1
fi
if [[ -e "$public" && ! -L "$public" ]]; then
  echo "Refusing to replace existing non-symlink: $public" >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Ubuntu 24.04 does not necessarily ship the aws CLI. Install AWS's official
# v2 binary once if absent; no local static IAM credentials are created.
if ! command -v aws >/dev/null 2>&1; then
  echo "Bootstrapping official AWS CLI v2 on EC2"
  curl -fLsS --retry 3 "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "$work/awscliv2.zip"
  mkdir -p "$work/awscli"
  python3 -m zipfile -e "$work/awscliv2.zip" "$work/awscli"
  # Python's zipfile extraction does not preserve executable mode bits.
  chmod 755 "$work/awscli/aws/install" "$work/awscli/aws/dist/aws"
  "$work/awscli/aws/install" --install-dir /usr/local/aws-cli --bin-dir /usr/local/bin
fi

mkdir -p "$releases"
echo "Downloading s3://$bucket/blockarena/test/$commit.zip"
aws s3api get-object \
  --bucket "$bucket" \
  --key "blockarena/test/$commit.zip" \
  --region "$region" \
  "$work/site.zip" >/dev/null

printf '%s  %s\n' "$checksum" "$work/site.zip" | sha256sum --check --status || {
  echo "Archive SHA-256 mismatch; refusing deployment" >&2
  exit 1
}

stage="$releases/.$commit.stage.$$"
mkdir "$stage"
trap 'rm -rf "$work" "$stage"' EXIT
python3 -m zipfile -e "$work/site.zip" "$stage"
for file in index.html game.js style.css service-worker.js manifest.webmanifest icon.svg icon-192.png; do
  [[ -s "$stage/$file" ]] || { echo "Missing required file: $file" >&2; exit 1; }
done
chmod -R a+rX "$stage"

# Immutable release directories; only the 'current' symlink is switched.
if [[ -e "$release" ]]; then
  rm -rf "$stage"
else
  mv "$stage" "$release"
fi

previous=""
if [[ -L "$current" ]]; then previous="$(readlink -f "$current" || true)"; fi
ln -s "$release" "$base/current.next.$$"
mv -Tf "$base/current.next.$$" "$current"
ln -sfn "$current" "$public"

# Ubuntu Nginx default site serves /var/www/html. Do not overwrite its config,
# other project directories, or the existing root landing page.
if ! nginx -t >/dev/null 2>&1 || \
   ! curl -fsS --max-time 10 "http://127.0.0.1/blockarena/" | grep -q 'Block Arena'; then
  echo "Nginx smoke test failed; rolling back current symlink" >&2
  if [[ -n "$previous" ]]; then
    ln -s "$previous" "$base/current.rollback.$$"
    mv -Tf "$base/current.rollback.$$" "$current"
  else
    rm -f "$current" "$public"
  fi
  exit 1
fi

echo "DEPLOY_SUCCESS commit=$commit URL=http://127.0.0.1/blockarena/"
