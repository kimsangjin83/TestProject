# Block Arena — 개발 로드맵

> 마지막 정리: 2026-10-22 (KST) · 관리 원칙: **GitHub Issues가 작업 상태의 기준(Single Source of Truth)** 입니다. 이 문서는 마일스톤과 주요 의존성을 요약합니다. 날짜나 버전은 목표이며 확정 출시 일정이 아닙니다.

## 현재 기준선

- **운영 `main`**: v0.2까지 반영. 싱글 클래식/PWA, 모바일 HUD, 줄 제거 파편 효과, 메인/싱글/멀티/기록/설정 메뉴 및 모바일 가로 회전 안내 포함.
- **테스트 `test`**: 현재 v0.2와 동일한 게임 기능을 보유하며 이후 기능 개발/검증 브랜치로 유지. Git 히스토리는 운영의 병합 커밋과 별도로 관리됩니다.
- **온라인 대전 서버**: 아직 미구현. 방 만들기, 초대코드, 빠른 매칭은 메뉴 흐름만 확인 가능하며 실제 서버 요청은 없음.
- **저장 데이터**: 브라우저에 싱글 최고 점수만 저장. 온라인 전적·통계는 아직 없음.
- **관련 PR**: [#2 운영 병합](https://github.com/kimsangjin83/TestProject/pull/2) · [#3 v0.2 운영 병합](https://github.com/kimsangjin83/TestProject/pull/3)

## 기술 방향 결정: AWS 우선 검토 (계정·비용 확인 대기)

**2026-10-22 합의한 기본 방향**: 블럭아레나 정식 운영까지 고려해 Cloudflare 서버리스 대신 **AWS Linux 기반 서버 + Java/Spring Boot**를 우선 검토한다. **2026-10-22 현재 신규 AWS Free 계정과 가입 크레딧 US$100를 확인했으며, AWS 화면에 남은 184일·2027-04-22 무료 플랜 종료로 표시됨.** 콘솔 리전은 현재 시드니로 표시되므로 서버 구축 전 서울(`ap-northeast-2`)로 전환 예정. 인스턴스·월 예산은 미확정이며 **AWS 리소스는 아직 생성하지 않았다**.

```text
GitHub (현재 Public, AWS 전환/배포 검증 후 Private 검토)
  ├─ main → AWS 운영 배포 (HTTPS, PWA)
  └─ test → AWS 테스트 배포 (운영과 경로/설정 분리)
             │
        Nginx 정적 파일 + Reverse Proxy
             │
     Java 17+ / Spring Boot / WebSocket
             │
     게임룸 · 초대 코드 · READY · 매칭 · 대전 검증
             │
     DB는 영구 전적/계정 필요 시 도입 (초기 필수 아님)
```

- **서버 후보**: AWS EC2 우선 비교, AWS Lightsail을 월정액형 대안으로 검토. 초기 규모와 월 예산에 따라 1대 구성, 용량이 커지면 분리/확장.
- **프론트 배포**: 우선 최소 구성으로 Nginx에서 기존 정적 PWA를 호스팅한다. 이후 CDN이 필요하면 S3 + CloudFront로 분리 가능.
- **원본 보호**: GitHub Private 전환은 AWS 운영 배포와 롤백 확인 **이후** 수행. 브라우저 JavaScript 코드는 공개되는 점에 유의.
- **서버 검증**: 멀티플레이에서 클라이언트가 보낸 공격량·점수·승패를 그대로 신뢰하지 않음. 서버가 게임 상태와 최종 판정 권한을 가짐.
- **비용 우선 원칙**: 계정별 프리 티어/크레딧 만료일 확인 → 지역·인스턴스·EBS·IPv4·전송 비용 계산 → 예산 알림 설정 → 서버 개설. 구체 요금은 실제 계정 조건으로 결정.
- **중간 운영**: AWS 배포가 검증되기 전까지 기존 GitHub Pages와 `main/test` 개발 구조를 유지.

**진행 의존성**: [#22 AWS 계정/예산](https://github.com/kimsangjin83/TestProject/issues/22) → [#23 프론트 AWS 이전/Private 전환](https://github.com/kimsangjin83/TestProject/issues/23) 및 [#8 테스트 배포](https://github.com/kimsangjin83/TestProject/issues/8) → [#11 Spring Boot 게임서버](https://github.com/kimsangjin83/TestProject/issues/11) → [#12 1:1 방](https://github.com/kimsangjin83/TestProject/issues/12).

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

1. **[#22](https://github.com/kimsangjin83/TestProject/issues/22) 진행 중**: 신규 Free 계정·US$100 크레딧·2027-04-22 종료일 확인 완료. 서울 리전 변경, EC2/Lightsail 비교, 월 예산·비용 경보 설정이 남아 있음. 계정 비밀번호/액세스 키/계정 ID는 저장소에 올리지 않는다.
2. **설계 ([#22](https://github.com/kimsangjin83/TestProject/issues/22))**: 서울 리전 EC2 vs Lightsail, 최소 메모리 사양, EBS/IPv4/전송량 비용 비교 및 예산 알림 계획.
3. **배포 전환 ([#23](https://github.com/kimsangjin83/TestProject/issues/23), [#8](https://github.com/kimsangjin83/TestProject/issues/8))**: 운영/테스트 분리, HTTPS/PWA 검증, GitHub Private 전환. 기존 Pages는 대체 경로 확인 시까지 유지.
4. **백엔드 ([#11](https://github.com/kimsangjin83/TestProject/issues/11))**: Spring Boot REST/WebSocket 뼈대 → 1:1 친구 게임룸 ([#12](https://github.com/kimsangjin83/TestProject/issues/12)) → 동기화/공격 ([#13](https://github.com/kimsangjin83/TestProject/issues/13), [#14](https://github.com/kimsangjin83/TestProject/issues/14)).
5. **기존 게임 개선 ([#9](https://github.com/kimsangjin83/TestProject/issues/9), [#10](https://github.com/kimsangjin83/TestProject/issues/10))**: 백엔드 준비와 독립적으로 기록·설정 기능은 test에서 순차 개발.

## 기술 및 결정 사항

- **웹앱**: PWA, iPhone Safari/Android/PC 브라우저 대상, 모바일은 세로 화면 우선. iOS Safari에서 방향을 강제 잠그지 않고 가로 회전 시 안내·자동 일시정지.
- **싱글**: 기존 10×20 캔버스 게임 로직을 유지.
- **대전**: 친구 방은 READY 완료 후 시작, 랜덤 매칭은 **READY 없이** 3초 카운트다운 후 동시 시작.
- **인원**: 1:1 → 4인 개인전 → 2:2 팀전 순차 확장.
- **공격 초안**: 1줄→0, 2줄→1, 3줄→2, 4줄→4방해 줄; 서버에서 검증 및 상쇄 구현.
- **초기 계정**: 회원가입 강제 없이 닉네임/게스트 중심. 온라인 영구 전적이 필요해지면 계정 정책 결정.
- **운영 플랫폼**: AWS Linux 서버(EC2 vs Lightsail 미확정) + Spring Boot WebSocket을 우선 검토. 현재는 GitHub Pages로 서비스 중.
- **운영 비용**: AWS 계정별 크레딧/무료 조건과 EBS·IPv4·데이터 전송 요금을 확인하고, 예산 상한을 정하기 전에는 서버를 생성하지 않음.

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
