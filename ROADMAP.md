# Block Arena — 개발 로드맵

> 마지막 정리: 2026-10-22 (KST) · 관리 원칙: **GitHub Issues가 작업 상태의 기준(Single Source of Truth)** 입니다. 이 문서는 마일스톤과 주요 의존성을 요약합니다. 날짜나 버전은 목표이며 확정 출시 일정이 아닙니다.

## 현재 기준선

- **운영 `main`**: 싱글 클래식 게임, PWA, 모바일 세로형 HUD, 줄 제거 파티클·낙하 애니메이션까지 배포 코드 반영 (v0.1 안정화).
- **테스트 `test`**: 메인 메뉴/싱글/멀티 진입 화면, 기록·설정 기본 UI, 모바일 가로 회전 안내 구현 (v0.2 테스트 중).
- **온라인 대전 서버**: 아직 미구현. 방 만들기, 초대코드, 빠른 매칭은 메뉴 흐름만 확인 가능하며 실제 서버 요청은 없음.
- **저장 데이터**: 브라우저에 싱글 최고 점수만 저장. 온라인 전적·통계는 아직 없음.
- **관련 PR**: [#2 운영 병합](https://github.com/kimsangjin83/TestProject/pull/2) · [#3 메뉴 개발/테스트](https://github.com/kimsangjin83/TestProject/pull/3)

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
| v0.2 | P0 | 메인/싱글/멀티/기록/설정 메뉴, 가로 안내 | [#7](https://github.com/kimsangjin83/TestProject/issues/7) | 🧪 TESTING · test |
| v0.2 | P1 | test 고정 미리보기 URL/자동 UI 검증 | [#8](https://github.com/kimsangjin83/TestProject/issues/8) | 📋 TODO |
| v0.3 | P1 | 싱글 기록 확장/게임 결과 화면 | [#9](https://github.com/kimsangjin83/TestProject/issues/9) | 📋 TODO |
| v0.3 | P2 | 효과음·진동·애니메이션/조작 설정 | [#10](https://github.com/kimsangjin83/TestProject/issues/10) | 📋 TODO |
| v0.4 | P0 | WebSocket 백엔드/룸 프로토콜 | [#11](https://github.com/kimsangjin83/TestProject/issues/11) | 📋 TODO |
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

1. **[#7](https://github.com/kimsangjin83/TestProject/issues/7)**: 메뉴 UI를 실제 아이폰 Safari 및 설치 PWA에서 검증. 승인되면 `test → main` 병합 후 DONE 처리.
2. **[#8](https://github.com/kimsangjin83/TestProject/issues/8)**: 커밋별 임시 미리보기에서 벗어나 고정된 test URL·자동 E2E 테스트 마련.
3. **[#9](https://github.com/kimsangjin83/TestProject/issues/9)**: 싱글 통계·게임 종료 결과 화면 개발.
4. **[#11](https://github.com/kimsangjin83/TestProject/issues/11)** 부터: 서버 기반 1:1 친구 대전 구축 → 공격 → 랜덤 매칭.

## 기술 및 결정 사항

- **웹앱**: PWA, iPhone Safari/Android/PC 브라우저 대상, 모바일은 세로 화면 우선. iOS Safari에서 방향을 강제 잠그지 않고 가로 회전 시 안내·자동 일시정지.
- **싱글**: 기존 10×20 캔버스 게임 로직을 유지.
- **대전**: 친구 방은 READY 완료 후 시작, 랜덤 매칭은 **READY 없이** 3초 카운트다운 후 동시 시작.
- **인원**: 1:1 → 4인 개인전 → 2:2 팀전 순차 확장.
- **공격 초안**: 1줄→0, 2줄→1, 3줄→2, 4줄→4방해 줄; 서버에서 검증 및 상쇄 구현.
- **초기 계정**: 회원가입 강제 없이 닉네임/게스트 중심. 온라인 영구 전적이 필요해지면 계정 정책 결정.
- **운영 비용**: GitHub Pages + Cloudflare Workers/Durable Objects 무료 범위 우선 검토. 제한·비용은 구현 시 최신 요금 확인.

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
