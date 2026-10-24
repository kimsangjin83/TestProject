# AWS 인프라 및 배포 운영 기록

> 기준일: **2026-10-24 (KST)** · 대상: `TestProject` / `test` 브랜치  
> 이 문서는 **구축이 끝난 사항**과 **계획만 수립한 사항**을 구분한다. 실제 게임은 아직 AWS에 배포되지 않았으며, 현재 서비스 URL은 GitHub Pages다.

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
| 게임 콘텐츠 배포 | **미구현** · Nginx 기본 페이지 상태 |
| 배포용 S3 | **미생성** |
| HTTPS / 도메인 | **미구성** |
| Spring Boot / WebSocket / DB | **미구현** |

퍼블릭 IPv4는 현재 **자동 할당 방식**이며 인스턴스를 중지 후 재시작하면 변경될 수 있다.

## 2. 개발·배포 원칙

- **`test`**: 개발 및 검증용. 신규 변경은 여기서 작업하고 테스트한다.
- **`main`**: 운영용. 모바일/웹 검증과 명시적 승인 후 병합한다.
- **ChatGPT + Codex**: GitHub를 공동 작업 기준으로 사용한다. 같은 파일 동시 변경은 PR/브랜치로 조정한다.
- **현재 플레이 가능 사이트는 GitHub Pages**다. AWS 전환과 롤백이 검증되기 전에는 기존 경로를 없애지 않는다.
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
- **이 워크플로는 원격 상태 확인만 한다.** 현재 `push` 트리거는 워크플로 파일 자체 변경에 한정되고, `workflow_dispatch` 수동 실행을 지원한다. 게임 파일 배포 자동화는 아직 없다.

## 3. IAM 및 보안

| 역할 / 구성 | 목적 |
|---|---|
| `app-server-ssm-role` | EC2가 SSM에 등록·통신 |
| `AmazonSSMManagedInstanceCore` | EC2 역할에 부여된 AWS 관리형 정책 |
| `github-actions-deploy-role` | GitHub Actions의 OIDC 인증 대상 |
| `github-actions-ssm-policy` | 지정한 서울 리전 EC2에 `AWS-RunShellScript`를 실행하고 결과를 조회하는 권한 |
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

## 5. 다음 구현: S3 아티팩트 기반 배포 (**미완료**)

```text
GitHub test Push
  → GitHub Actions (정적 파일 패키징·검증)
  → S3 비공개 버킷에 ZIP 업로드
  → SSM으로 EC2에 배포 명령 실행
  → EC2에서 S3 ZIP 다운로드·검증·압축 해제
  → /var/www/apps/blockarena 에 반영
  → Nginx를 통한 배포 확인
```

1. 서울 리전에 **S3 버킷 생성**: 퍼블릭 액세스 전체 차단, 기본 SSE-S3, 필요하지 않은 기능 비활성화.
2. GitHub OIDC 역할에 해당 버킷의 **필요한 업로드 권한만** 부여하고, EC2 역할에는 **필요한 다운로드 권한만** 부여한다.
3. 테스트 배포는 `test` 브랜치에서만 수행한다. 파일 해시/무결성 검증, 실패 시 중단, 배포 버전/롤백 전략을 정한다.
4. 테스트·운영 경로를 분리하고 Nginx 설정을 적용한다. 도메인 및 HTTPS를 구축한 뒤 PWA 캐시/서비스 워커를 검증한다.
5. `main` 운영 배포는 별도 승인 절차로 구성한다. 기존 GitHub Pages는 대체 사이트가 검증되기 전까지 유지한다.
6. Spring Boot REST/WebSocket과 계정/전적 DB는 **실시간 대전 단계에서 별도 도입**한다. 현재 정적 사이트 배포에는 필요하지 않다.

참고: 지금 작성된 `verify-aws-ssm.yml`은 **진단용**으로, 실제 배포용 워크플로가 아니다.

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
- [#23 AWS 프론트 이전](https://github.com/kimsangjin83/TestProject/issues/23): S3 배포·HTTPS·실제 페이지 접속·Private 전환 미완료.
- [#8 test/운영 배포 분리](https://github.com/kimsangjin83/TestProject/issues/8): 자동 배포/검증 미완료.
- [#25 SSH 접속 IP 변화 대응](https://github.com/kimsangjin83/TestProject/issues/25): 보안 그룹/접근 방식 개선 필요.
- [#11 실시간 게임 서버](https://github.com/kimsangjin83/TestProject/issues/11): Spring Boot WebSocket은 추후 구현.

> 운영 상태가 바뀌면 **GitHub Issue의 상태를 우선 갱신**하고 이 문서와 `ROADMAP.md`를 동기화한다.
