# Block Arena — 개발 로드맵

> 마지막 정리: 2026-10-24 (KST) · 관리 원칙: **GitHub Issues가 작업 상태의 기준(Single Source of Truth)** 입니다. 이 문서는 마일스톤과 주요 의존성을 요약합니다. 날짜나 버전은 목표이며 확정 출시 일정이 아닙니다.

## 현재 기준선

- **운영 `main`**: v0.2까지 반영. 싱글 클래식/PWA, 모바일 HUD, 줄 제거 파편 효과, 메인/싱글/멀티/기록/설정 메뉴 및 모바일 가로 회전 안내 포함.
- **테스트 `test`**: 현재 v0.2와 동일한 게임 기능을 보유하며 이후 기능 개발/검증 브랜치로 유지. Git 히스토리는 운영의 병합 커밋과 별도로 관리됩니다.
- **온라인 대전 서버**: 아직 미구현. 방 만들기, 초대코드, 빠른 매칭은 메뉴 흐름만 확인 가능하며 실제 서버 요청은 없음.
- **저장 데이터**: 브라우저에 싱글 최고 점수만 저장. 온라인 전적·통계는 아직 없음.
- **AWS 인프라**: EC2/Nginx/SSM·GitHub Actions OIDC 인증 및 원격 명령 테스트 성공. 게임의 AWS 자동 배포·HTTPS·S3는 아직 미구현([AWS 운영 기록](./docs/AWS_DEPLOYMENT.md)).
- **관련 PR**: [#2 운영 병합](https://github.com/kimsangjin83/TestProject/pull/2) · [#3 v0.2 운영 병합](https://github.com/kimsangjin83/TestProject/pull/3)

## AWS 기술 방향 및 실제 구축 상태 (2026-10-24)

AWS Linux 서버 + Java/Spring Boot 방향을 확정하고, 서울 리전에 **EC2 서버를 생성**했다. 현재 **AWS에 게임이 서비스되고 있지는 않다.** Nginx 기본 페이지가 외부 HTTP로 표시되는 상태이며, 운영 게임은 GitHub Pages에서 계속 제공한다.

| 구성 | 현황 |
|---|---|
| 신규 AWS Free 계정 | 가입 시 $100 크레딧과 당시 무료 플랜 종료일(2027-04-22) 확인; 잔여 크레딧은 Billing에서 재확인 |
| EC2 | ✅ 서울 `ap-northeast-2` / `app-server-01` / `t3.small` (2 vCPU·2 GiB) / Ubuntu 24.04 |
| 스토리지·웹 | ✅ EBS gp3 20 GiB, Nginx 설치·외부 HTTP 확인 |
| 앱 경로 | ✅ `/var/www/apps/blockarena` 디렉터리 생성 |
| SSM | ✅ SSM Agent 관리형 노드 등록, EC2 역할 연결, Run Command 조회 테스트 |
| GitHub OIDC | ✅ `test` 브랜치에서 역할 Assume 및 SSM 명령 성공([실행 기록](https://github.com/kimsangjin83/TestProject/actions/runs/39926325077)) |
| S3 아티팩트 저장소 | ⏳ 아직 미생성 |
| GitHub Actions **실제 게임 배포** | ⏳ 미구현: 현재 워크플로는 원격 명령 연결 점검 전용 |
| HTTPS·도메인·test/main 배포 분리 | ⏳ 미구현 |
| Spring Boot WebSocket·DB | ⏳ 실시간 대전 구현 시 도입 |

### 목표 서비스 구성

```text
GitHub (현재 Public)
  ├─ test → GitHub Actions → OIDC → S3 배포 ZIP(예정) → SSM → EC2 테스트 웹
  └─ main → 검증/승인 후 운영 배포(추후 별도 워크플로)
                                                        │
                                                       Nginx
                                                        │
                                              블록 아레나 PWA(미배포)
                                                        │
                                Spring Boot WebSocket 게임 서버(추후)
                                                        │
                                           영구 전적/계정 DB(필요 시)
```

- **원본 보호**: AWS에서 운영·롤백·HTTPS/PWA를 확인한 후 GitHub Private 전환을 검토한다. 브라우저 JavaScript는 계속 다운로드 가능하다.
- **서버 보안**: SSH는 일부 IP 대역으로 제한하고, 모바일 IP 변동 대응([#25](https://github.com/kimsangjin83/TestProject/issues/25))을 후속 작업으로 관리한다. 배포에는 SSH 개방 대신 SSM을 활용한다.
- **클라우드 비용**: 작은 S3 배포 ZIP의 월 저장·요청료는 매우 작을 것으로 예상되지만, EC2/EBS/IPv4/인터넷 전송 등은 별도 산정·예산 알림이 필요하다.
- **검증 기준**: OIDC/SSM 연결 성공 ≠ 게임 배포 완료. AWS에서 게임 페이지·PWA·HTTPS가 정상 동작할 때 프론트 이전을 완료 처리한다.
- **자세한 운영 기록**: [docs/AWS_DEPLOYMENT.md](./docs/AWS_DEPLOYMENT.md).

**진행 의존성**: [#22 비용/예산](https://github.com/kimsangjin83/TestProject/issues/22)(서버 생성은 완료·비용 점검 지속) → [#23 프론트 AWS 이전](https://github.com/kimsangjin83/TestProject/issues/23) 및 [#8 test/운영 분리](https://github.com/kimsangjin83/TestProject/issues/8) → [#11 WebSocket 서버](https://github.com/kimsangjin83/TestProject/issues/11) → [#12 친구 방](https://github.com/kimsangjin83/TestProject/issues/12).

## 상태 정의

| 상태 | 의미 | 관리 방식 |
|---|---|---|
| `TODO` | 구현 전 또는 작업 착수 전 | 열린 Issue, `[TODO]` 제목 |
| `IN PROGRESS` | 실제 개발 진행 중 | 열린 Issue, `[IN PROGRESS]` 제목 |
| `TESTING` | `test` 반영 후 검증/승인 대기 | 열린 Issue, `[TESTING]` 제목, 관련 PR |
| `DONE` | 검증 후 `main`에 반영 | 완료된 Issue(`closed`), `[DONE]` 제목 |
| `BLOCKED` | 선행 작업 또는 외부 조건 대기 | 열린 Issue, 차단 원인·연결 Issue 명시 |

진행 상태가 변경되면 **Issue 제목/본문/체크리스트를 먼저 업데이트**하고, 단계가 변경될 때 이 로드맵도 갱신합니다. 코드만 `test`에 들어간 상태는 `DONE`으로 표시하지 않습니다.

## 릴리스별 작업표

| 목표 버전 | 우선순위 | 작업 | Issue | 상태 |
|---|---|---|---|---|
| v0.1 | P0 | 싱글 엔진/PWA 기본 | [#4](https://github.com/kimsangjin83/TestProject/issues/4) | ✅ DONE · main |
| v0.1 | P0 | 모바일 HUD 및 세로 스크롤 최적화 | [#5](https://github.com/kimsangjin83/TestProject/issues/5) | ✅ DONE · main |
| v0.1 | P0 | 줄 제거 파괴·낙하 애니메이션 | [#6](https://github.com/kimsangjin83/TestProject/issues/6) | ✅ DONE · main |
| v0.2 | P0 | 메인/싱글/멀티/기록/설정 메뉴, 가로 안내 | [#7](https://github.com/kimsangjin83/TestProject/issues/7) | ✅ DONE · main |
| AWS 준비 | P0 | AWS 신규 Free 계정 확인 완료 · 서버 비용/사양 결정 | [#22](https://github.com/kimsangjin83/TestProject/issues/22) | 🔨 IN PROGRESS |
| AWS 준비 | P0 | AWS 프론트 이전 및 GitHub Private 전환 | [#23](https://github.com/kimsangjin83/TestProject/issues/23) | 📋 TODO |
| v0.3 | P1 | AWS test/운영 배포 분리 및 UI 검증 | [#8](https://github.com/kimsangjin83/TestProject/issues/8) | 📋 TODO |
| v0.3 | P1 | 싱글 기록 확장/게임 결과 화면 | [#9](https://github.com/kimsangjin83/TestProject/issues/9) | 📋 TODO |
| v0.3 | P2 | 효과음·진동·애니메이션/조작 설정 | [#10](https://github.com/kimsangjin83/TestProject/issues/10) | 📋 TODO |
| v0.4 | P0 | AWS Spring Boot WebSocket 백엔드/룸 프로토콜 | [#11](https://github.com/kimsangjin83/TestProject/issues/11) | 📋 TODO |
| v0.4 | P0 | 친구 1:1 방 생성/입장/초대/READY | [#12](https://github.com/kimsangjin83/TestProject/issues/12) | 📋 TODO |
| v0.4 | P0 | 1:1 게임 동기화/승패 판정 | [#13](https://github.com/kimsangjin83/TestProject/issues/13) | 📋 TODO |
| v0.4 | P0 | 상대 방해 줄/공격 상쇄 | [#14](https://github.com/kimsangjin83/TestProject/issues/14) | 📋 TODO |
| v0.5 | P0 | READY 없는 1:1 랜덤 매칭/자동 시작 | [#15](https://github.com/kimsangjin83/TestProject/issues/15) | 📋 TODO |
| v0.6 | P1 | 4인 개인전 | [#16](https://github.com/kimsangjin83/TestProject/issues/16) | 📋 TODO |
| v0.6 | P1 | 2:2 팀 대전 | [#17](https://github.com/kimsangjin83/TestProject/issues/17) | 📋 TODO |
| v0.7 | P1 | 재접속·연결 안정성·치트 방지 | [#18](https://github.com/kimsangjin83/TestProject/issues/18) | 📋 TODO |
| v0.7 | P2 | 멀티 전적 및 랭킹 | [#19](https://github.com/kimsangjin83/TestProject/issues/19) | 📋 TODO |
| v0.8 | P2 | 닉네임·게스트·선택적 계정 연동 | [#20](https://github.com/kimsangjin83/TestProject/issues/20) | 📋 TODO |
| v0.8 | P2 | 출시 품질/성능/운영·비용 점검 | [#21](https://github.com/kimsangjin83/TestProject/issues/21) | 📋 TODO |

> 이 목록은 현시점의 계획입니다. 기능 우선순위는 사용자 테스트 결과에 따라 재정렬할 수 있습니다.

## 다음 작업 우선순위

1. **배포용 S3 / IAM 최소 권한 ([#23](https://github.com/kimsangjin83/TestProject/issues/23))**: 서울 리전에 비공개 배포 버킷 생성, GitHub 업로드·EC2 다운로드 권한 분리, 배포 파일 수명 주기 설정.
2. **실제 test 배포 ([#23](https://github.com/kimsangjin83/TestProject/issues/23), [#8](https://github.com/kimsangjin83/TestProject/issues/8))**: 정적 PWA ZIP 생성 → S3 → SSM → Nginx 정적 경로 연결, 실패 처리 및 롤백 전략, 모바일 실기기 확인.
3. **HTTPS / main 운영 분리**: 도메인·HTTPS·서비스 워커 검증, 운영 배포에 별도 승인 절차 적용. 새 배포 확인 전까지 GitHub Pages 유지.
4. **비용·보안 ([#22](https://github.com/kimsangjin83/TestProject/issues/22), [#25](https://github.com/kimsangjin83/TestProject/issues/25))**: 크레딧/EC2/EBS/IPv4/트래픽 추적, 예산 알림 설정, SSH 접근 IP 변경 문제 개선.
5. **실시간 대전 ([#11](https://github.com/kimsangjin83/TestProject/issues/11) → [#12](https://github.com/kimsangjin83/TestProject/issues/12))**: Spring Boot REST/WebSocket 뼈대, 친구 방/READY, 서버 권위 판정. 전적 DB는 추후 필요 시 도입.
6. **게임 개선 ([#9](https://github.com/kimsangjin83/TestProject/issues/9), [#10](https://github.com/kimsangjin83/TestProject/issues/10))**: 기록·설정 기능을 test에서 계속 개발.

## 기술 및 결정 사항

- **웹앱**: PWA, iPhone Safari/Android/PC 브라우저 대상, 모바일은 세로 화면 우선. iOS Safari에서 방향을 강제 잠그지 않고 가로 회전 시 안내·자동 일시정지.
- **싱글**: 기존 10×20 캔버스 게임 로직을 유지.
- **대전**: 친구 방은 READY 완료 후 시작, 랜덤 매칭은 **READY 없이** 3초 카운트다운 후 동시 시작.
- **인원**: 1:1 → 4인 개인전 → 2:2 팀전 순차 확장.
- **공격 초안**: 1줄→0, 2줄→1, 3줄→2, 4줄→4방해 줄; 서버에서 검증 및 상쇄 구현.
- **초기 계정**: 회원가입 강제 없이 닉네임/게스트 중심. 온라인 영구 전적이 필요해지면 계정 정책 결정.
- **운영 플랫폼**: AWS 서울 리전 EC2/Ubuntu/Nginx 구축 완료. Spring Boot WebSocket은 추후 도입. 게임 자체는 현재 GitHub Pages로만 서비스 중.
- **운영 비용**: EC2 서버는 이미 생성됨. 가입 당시 크레딧/무료 조건을 확인했고, 실제 사용액·EBS·IPv4·데이터 전송·S3 비용 및 AWS Budgets 알림은 점검할 예정.

## 작업 관리 절차

1. 기능을 **Issue**로 등록하고 목표 버전·우선순위·수용 조건·선행 이슈를 기록.
2. 작업 시작 시 `[IN PROGRESS]`로 변경, 소스 변경은 `test` (또는 기능 브랜치 → test PR)에 반영.
3. 테스트 가능하면 `[TESTING]`으로 전환하고 검증 방법/링크를 Issue 및 PR에 기재.
4. 실제 기기와 자동 테스트를 확인한 다음 **승인된 변경만 `test → main` PR로 병합**.
5. 운영(main) 반영 확인 후 Issue를 `[DONE]` 및 `closed`로 변경하고 이 문서를 최신화.
6. 문제·버그가 발생하면 별도 Issue를 추가해 우선순위를 다시 정함.

### 링크

- [GitHub Issues — 열린 작업](https://github.com/kimsangjin83/TestProject/issues?q=is%3Aissue+is%3Aopen)
- [GitHub Issues — 완료 작업](https://github.com/kimsangjin83/TestProject/issues?q=is%3Aissue+is%3Aclosed)
- [GitHub Pull Requests](https://github.com/kimsangjin83/TestProject/pulls)
- [운영 main](https://github.com/kimsangjin83/TestProject/tree/main)
- [개발 test](https://github.com/kimsangjin83/TestProject/tree/test)
