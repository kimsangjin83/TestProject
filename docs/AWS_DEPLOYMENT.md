# AWS 인프라 및 배포 운영 기록

> 기준일: **2026-10-24 (KST)** · 대상: `TestProject` / `test` 브랜치  
> 이 문서는 **구축이 끝난 사항**과 **계획만 수립한 사항**을 구분한다. **AWS test 정적 웹 배포는 SSM 내부 HTTP 스모크 테스트까지 성공**했다. 기존 운영 사이트는 GitHub Pages이며, HTTPS/PWA 외부 실기기 검증은 아직 남아 있다.

## 1. 현재 상태

| 항목 | 현재 상태 |
|---|---|
| AWS 리전 | 서울 `ap-northeast-2` |
| EC2 | `app-server-01` · `t3.small` (2 vCPU, 2 GiB) · Ubuntu 24.04 LTS |
| 볼륨 | EBS gp3 20 GiB |
| 웹 서버 | Nginx 설치/부팅 시 자동 시작/HTTP 외부 접속 **확인** |
| 정적 파일 대상 디렉터리 | `/var/www/apps/blockarena` **생성 완료** |
| 원격 운영 | Termius SSH 및 Systems Manager 관리형 노드 등록 **확인** |
| SSM Agent | Ubuntu snap 서비스 활성 및 실행 중 **확인** |
| GitHub OIDC | GitHub Actions → AWS 임시 인증 **확인** |
| GitHub Actions → SSM | 원격 조회 명령 `whoami`, `hostname`, Nginx 상태 **성공** |
| 게임 콘텐츠 배포 | ✅ GitHub test → S3 ZIP → SSM → EC2 배포 완료. `/blockarena/` 서버 내부 HTTP 검사 성공. 아이폰 외부 확인 필요 |
| 배포용 S3 | ✅ 비공개 버킷 생성 및 전체 퍼블릭 액세스 차단 확인 |
| AWS EC2에 AWS CLI | ✅ 최초 test 배포 중 AWS CLI v2 설치 성공 |
| HTTPS / 도메인 | **미구성** |
| Spring Boot / WebSocket / DB | **미구현** |

퍼블릭 IPv4는 현재 **자동 할당 방식**이며 인스턴스를 중지 후 재시작하면 변경될 수 있다.

## 2. 개발·배포 원칙

- **`test`**: 개발 및 검증용. 신규 변경은 여기서 작업하고 테스트한다.
- **`main`**: 운영용. 모바일/웹 검증과 명시적 승인 후 병합한다.
- **ChatGPT + Codex**: GitHub를 공동 작업 기준으로 사용한다. 같은 파일 동시 변경은 PR/브랜치로 조정한다.
- **현재 기존 운영 사이트는 GitHub Pages**, **AWS test 사이트는 `http://<EC2_PUBLIC_IP>/blockarena/`**다. AWS 내부 스모크 테스트는 성공했지만 외부 휴대폰 테스트와 HTTPS/서비스 워커 검증은 아직이다. 기존 GitHub Pages를 유지한다.
- **GitHub Private 전환**은 새 서비스 경로 검증 이후 진행한다. Private 전환해도 브라우저에 전달되는 JS는 사용자에게 노출된다.

### 확인된 연동 흐름

```text
GitHub test
  └─ GitHub Actions (검증 워크플로)
       └─ GitHub OIDC → AWS IAM 임시 자격 증명
            └─ AWS Systems Manager Run Command
                 └─ EC2 app-server-01 → Nginx 상태 확인
```

- 검증 파일: [`.github/workflows/verify-aws-ssm.yml`](../.github/workflows/verify-aws-ssm.yml)
- 성공한 실행: [GitHub Actions run #39926325077 (2차 실행)](https://github.com/kimsangjin83/TestProject/actions/runs/39926325077)
- 확인된 출력: `Success`, `root`, 인스턴스 호스트명, `active`.
- 위 검증 워크플로는 **원격 상태 확인 전용**이며 독립적으로 유지한다.
- **test 자동 배포 워크플로**: [`.github/workflows/deploy-blockarena-test.yml`](../.github/workflows/deploy-blockarena-test.yml) · 서버 배포 스크립트: [`scripts/deploy-blockarena-test.sh`](../scripts/deploy-blockarena-test.sh).
- **실제 배포 성공 실행**: [Actions run #40052567405](https://github.com/kimsangjin83/TestProject/actions/runs/40052567405) · SSM 출력 `DEPLOY_SUCCESS`. 1차 시도는 AWS CLI 설치 파일의 실행 권한 문제로 실패했으나 수정 후 재실행에 성공했다.
- `test` 브랜치의 정적 게임 소스 또는 배포 스크립트가 변경될 때 자동 배포되며 수동 실행(`workflow_dispatch`)도 지원한다. 운영 `main`과는 분리했다.

## 3. IAM 및 보안

| 역할 / 구성 | 목적 |
|---|---|
| `app-server-ssm-role` | EC2가 SSM에 등록·통신 |
| `AmazonSSMManagedInstanceCore` | EC2 역할에 부여된 AWS 관리형 정책 |
| `github-actions-deploy-role` | GitHub Actions의 OIDC 인증 대상 |
| `github-actions-ssm-policy` | 지정한 서울 리전 EC2에 `AWS-RunShellScript`를 실행하고 결과를 조회하는 권한 |
| `github-actions-s3-upload-policy` | S3 `blockarena/test/*`에 `s3:PutObject`만 허용 |
| `ec2-s3-download-policy` | 동일 S3 접두 경로에 `s3:GetObject`만 허용 |
| OIDC 공급자 | `https://token.actions.githubusercontent.com`; Audience `sts.amazonaws.com` |

GitHub Actions 역할의 신뢰 조건은 저장소 `kimsangjin83/TestProject`의 **`test` 브랜치**에서 생성된 OIDC 주체 값으로 제한했다. 실제 GitHub 토큰의 `iss`/`aud`/`sub`를 확인했고 IAM 인증 테스트에 성공했다.

**주의**

- `AWS-RunShellScript`는 대상 호스트에서 일반적으로 **root 권한으로 명령을 실행**한다. 실행 대상·브랜치·권한 범위를 최소화하고 승인된 변경만 배포한다.
- **SSH(22)는 현재 일부 모바일 통신사 공인 IP 대역으로 제한** 중이다. 실제 접속 IP가 자주 바뀌는 이슈는 별도 보안 개선 과제([#25](https://github.com/kimsangjin83/TestProject/issues/25))로 관리한다. 무제한 `0.0.0.0/0` 개방을 영구적으로 사용하지 않는다.
- IAM에 OIDC 공급자가 **슬래시 없는 URL과 끝에 `/`가 붙은 URL** 두 형태로 등록된 이력이 있다. 신뢰 정책과 실제 사용 여부를 확인하기 전에는 임의 삭제하지 않는다.
- AWS 접근 키, SSH PEM, 계정 비밀번호, 민감한 식별자 및 비밀값은 GitHub에 저장하지 않는다. **공개 저장소에는 공인 IP·보안그룹 CIDR·AWS 계정 번호의 중복 기재를 피한다.**
- 현재 웹 접속은 HTTP이며, **실제 PWA 운영 전 HTTPS 필수**(서비스 워커의 안전한 컨텍스트 요구).

## 4. 완료한 서버 점검

Termius/SSH를 통한 조회(조회 명령 예시):

```bash
sudo systemctl status nginx --no-pager
curl -I http://127.0.0.1
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service --no-pager
ls -ld /var/www/apps/blockarena
```

Systems Manager의 `AWS-RunShellScript` 테스트:

```bash
whoami
hostname
systemctl is-active nginx
```

Run Command 결과가 `root`, 서버 호스트명, `active`로 확인됐으며, GitHub Actions 경유 SSM 테스트도 동일하게 성공했다. SSM용 IAM 역할 연결/Agent 실행과 **Run Command 실행 권한**은 서로 다른 설정이다.

## 5. S3 아티팩트 기반 test 자동 배포 (**완료: 서버 내부 검증**)

```text
GitHub test Push (정적 게임 파일 변경)
  → GitHub Actions → OIDC 임시 자격 증명
  → 정적 파일 7개 ZIP 패키징/검사
  → S3 비공개 버킷에 blockarena/test/<gitsha>.zip 업로드
  → SSM Run Command → EC2 배포 스크립트
  → EC2 IAM 역할로 S3 ZIP 다운로드 → SHA-256 검증 → 압축 해제
  → /var/www/apps/blockarena/releases/<gitsha> 에 버전별 배포
  → current 심볼릭 링크 교체
  → /var/www/html/blockarena → /var/www/apps/blockarena/current 링크 제공
  → nginx -t + 서버 내부 http://127.0.0.1/blockarena/ 스모크 테스트
```

| 항목 | 값 |
|---|---|
| S3 버킷 | `app-deploy-artifacts-apne2-f9f678bb` · 서울 리전 · 퍼블릭 액세스 차단 |
| S3 키 | `blockarena/test/<commit>.zip` |
| GitHub 워크플로 | [`deploy-blockarena-test.yml`](../.github/workflows/deploy-blockarena-test.yml) |
| EC2 배포 스크립트 | [`deploy-blockarena-test.sh`](../scripts/deploy-blockarena-test.sh) |
| 최초 성공 실행 | [#40052567405](https://github.com/kimsangjin83/TestProject/actions/runs/40052567405) |
| 서버 경로 | `/var/www/apps/blockarena/current` → `releases/<commit>` |
| 웹 경로 | `/blockarena/` (기본 nginx 루트의 별도 심볼릭 링크; 기존 기본 페이지 유지) |

- SHA-256으로 내려받은 ZIP의 무결성을 검증하고 필수 파일 존재를 확인한다.
- 배포 성공 전에는 새 릴리스를 만들고 `current` 링크만 바꾼다. HTTP 스모크 테스트 실패 시 직전 `current`로 롤백하도록 구성했다.
- 새 서버에 AWS CLI가 없는 경우 공식 AWS CLI v2를 자동 설치한다(초기 1회). 인증은 EC2 IAM 역할을 사용하며 정적 키를 생성하지 않는다.
- S3 버킷은 **웹 호스팅을 하지 않는다**. 정적 파일은 EC2의 nginx에서 제공한다.
- **서버 내부 스모크 테스트만 확인했다.** 외부 IP의 `http://<PUBLIC_IP>/blockarena/` 페이지 열기와 모바일 플레이는 사용자 실기기 확인이 필요하다.
- **HTTP에서는 일반적인 공인 IP 주소의 서비스 워커 등록/PWA 설치가 제한된다**. HTTPS+도메인 설정이 필요하다.
- 배포 ZIP 누적 파일 정리(S3 수명주기), 디스크 오래된 `releases` 정리, 정식 롤백 절차, 운영 `main` 승인 배포는 향후 구현한다.

**남은 작업:** 외부 접속·게임 조작 확인 → HTTPS/도메인 → 아이폰 PWA 기능 검증 → main 승인 배포 분리 → GitHub Private 전환 검토 → Spring Boot 실시간 서버 도입.

## 6. 대략적인 비용 및 관리 포인트

### S3 배포 ZIP 저장 비용 (예시 가정)

배포 파일 **100 KB**, 월 **30회** 업로드/다운로드, 모든 ZIP 보관 시 약 **3 MB**다. S3 Standard 서울 리전에서 저장 용량·PUT/GET 요청량 기준으로는 **월 미화 1센트 미만**의 매우 작은 금액이 예상된다. 파일 크기, 배포 횟수, 수명 주기, 기타 API 요청에 따라 달라진다.

- 참고용 단가 가정: S3 Standard 약 **$0.025/GB·월**, PUT 약 **$0.0045/1,000회**, GET 약 **$0.00035/1,000회**.
- 실제 청구액은 [AWS S3 공식 요금](https://aws.amazon.com/s3/pricing/) 및 계정 청구 내역으로 확인한다.
- **동일 리전 S3 ↔ EC2 직접 전송에는 일반적으로 리전 간 전송 비용이 없지만, S3 요청 요금은 별도**로 발생한다.
- 사용자의 게임 파일 다운로드는 S3가 아닌 **EC2/Nginx의 인터넷 송신 트래픽**으로 계산된다.
- 전체 AWS 비용은 **EC2(t3.small), EBS, 퍼블릭 IPv4, 인터넷 전송, 로그 저장** 등이 S3보다 중요하다. 중지한 인스턴스에도 남아 있는 EBS 비용은 발생할 수 있다.
- 가입 시 확인한 **$100 크레딧** 및 무료 플랜 종료일 **2027-04-22**은 당시 계정 화면 기준이다. 잔여 크레딧·만료·적용 가능 항목은 현재 Billing 콘솔에서 재확인해야 한다.
- AWS Budgets 요금 알림을 설정한다. 이 알림은 청구를 **자동 차단하지 않는다**.

## 7. 확인할 작업과 이슈

- [#22 AWS 비용/서버 사양](https://github.com/kimsangjin83/TestProject/issues/22): EC2 생성은 완료, 세부 비용 산정 및 예산 경보 필요.
- [#23 AWS 프론트 이전](https://github.com/kimsangjin83/TestProject/issues/23): S3 test 자동 배포·서버 내부 검증 완료, 외부 실기기/HTTPS/Private 전환 미완료.
- [#8 test/운영 배포 분리](https://github.com/kimsangjin83/TestProject/issues/8): test 자동 배포 완료, main 승인 배포 및 실기기 검증은 미완료.
- [#25 SSH 접속 IP 변화 대응](https://github.com/kimsangjin83/TestProject/issues/25): 보안 그룹/접근 방식 개선 필요.
- [#11 실시간 게임 서버](https://github.com/kimsangjin83/TestProject/issues/11): Spring Boot WebSocket은 추후 구현.

> 운영 상태가 바뀌면 **GitHub Issue의 상태를 우선 갱신**하고 이 문서와 `ROADMAP.md`를 동기화한다.
