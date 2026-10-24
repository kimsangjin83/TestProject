# Block Arena — 배포 전략 / 운영 Runbook (초안)

작성일: 2026-10-23. **자동 배포, AWS 서버 배치, 백엔드 서비스 등록은 아직 미완료**다. 아래는 목표 설계 및 검증 항목이다.

## 현재 운영
- `main`은 GitHub Pages 정적 PWA의 운영 소스다.
- `test`는 기능 개발 및 검증 브랜치다.
- AWS 전환 검증 전에는 GitHub Pages 의존성을 제거하거나 저장소를 Private으로 전환하지 않는다.

## 계획 중인 인프라
| 구분 | 방향 | 현재 상태 |
| --- | --- | --- |
| EC2 | 서울 리전, Ubuntu Server 24.04 LTS 일반판 | 생성 절차 진행 중, 완료 미확인 |
| 인스턴스 | `app-server-01`, `t3.small` (2 vCPU/2 GiB) | 선택 방향 |
| 리버스 프록시 | Nginx + HTTPS/WSS | 미구축 |
| 백엔드 | Spring Boot, Java 17+ | 미구현 |
| DB | 실제 영구 저장 요구 시 도입 | 미구현 |
| 배포 자동화 | GitHub Actions → 배포 아티팩트 → EC2 | 미구축 |

2 GiB EC2에서 Gradle 빌드와 백엔드·DB를 동시에 운영하면 메모리가 부족할 수 있다. **CI에서 빌드하고 서버에는 산출물만 전달**하는 접근을 우선한다.

## 목표 배포 흐름
```text
ChatGPT / Codex (기능 브랜치)
      │ PR 및 테스트
      ▼
     test (검증)
      │ 사용자 승인 / PR
      ▼
     main (배포 대상)
      │ 별도 수동 승인/실행
      ▼
 GitHub Actions
  ├─ 최신 SHA 고정 및 테스트
  ├─ PWA/백엔드 아티팩트 준비
  ├─ 배포 전용 SSH로 서버 전송
  ├─ 서비스 교체 및 재시작
  └─ 상태 확인, 실패 시 롤백
      │
      ▼
 AWS EC2 app-server-01
```

- `push`만으로 자동 운영 배포되지 않도록 **별도 `workflow_dispatch` 등 승인 기반**으로 구성한다.
- Actions의 구체적 YAML은 서버 주소, 포트, 실행 방식, Secret 관리, 검증 경로가 결정된 뒤 작성한다. 존재하지 않는 배포 파일을 실제 작동 중이라고 안내하지 않는다.
- 운영은 `main`, 테스트 환경은 `test`를 기준으로 하되 동일 EC2 사용 시 경로·포트·환경 변수·로그·데이터를 분리한다.
- 배포 산출물과 커밋 SHA를 기록하고 이전 버전으로 되돌릴 수 있도록 준비한다.
- 장애 시 상태 점검(HTTP health, 프로세스·Nginx·WebSocket 연결), 로그 확인, 필요 시 롤백한다.

## 인증/네트워크 안전 원칙
- 개인 SSH 키와 Actions 배포 전용 키를 분리한다. 배포 전용 계정에는 최소 권한만 부여한다.
- EC2 최초 개인 접속에는 Ubuntu의 `ubuntu` 계정 및 관리용 키를 사용할 수 있지만, 배포 자동화에는 제한된 사용자/권한을 설계한다.
- AWS 키/SSH 개인키/토큰/DB 암호는 코드·PR·Issue에 절대 남기지 않고 GitHub Secrets 또는 적절한 비밀 관리 수단에서 관리한다.
- 보안 그룹 SSH(22)는 가능하면 승인된 IP/VPN/SSM 등으로 제한한다. SSH를 인터넷 전체에 개방하지 않는다.
- 80/443 서비스 공개도 HTTPS, 방화벽, 비용, 모니터링 계획과 함께 검증한다.

## AWS 이전 완료 기준
1. EC2 생성/SSH 접속 및 리소스 비용 확인.
2. 테스트용 PWA 주소와 운영용 HTTPS 주소 확보.
3. 프론트 기능·PWA 홈 화면 설치/Service Worker 확인.
4. 배포·상태 확인·롤백을 최소 1회 실제 검증.
5. GitHub Actions 및 서버 보안·접근 권한 점검.
6. 기존 GitHub Pages 대체 확인 후에만 GitHub Private 전환 여부 결정.

## 관련 작업
- AWS 비용/사양 [Issue #22](https://github.com/kimsangjin83/TestProject/issues/22)
- AWS 프론트 이전 및 Private [Issue #23](https://github.com/kimsangjin83/TestProject/issues/23)
- 테스트·운영 배포 [Issue #8](https://github.com/kimsangjin83/TestProject/issues/8)
- 백엔드 [Issue #11](https://github.com/kimsangjin83/TestProject/issues/11)

참고: [ARCHITECTURE](ARCHITECTURE.md) · [DEVELOPMENT](DEVELOPMENT.md) · [AI 협업](AI_WORKFLOW.md).
