# 블록 아레나 (Block Arena)

설치형 웹앱(PWA)으로 만드는 실시간 대전 블록 퍼즐 게임 프로토타입.

현재 개발 단계 (2026-10-22):
- **운영 `main`**: v0.1 싱글 게임 + 모바일 세로형 전체화면 UI + 줄 제거 파괴 효과 운영 반영.
- **테스트 `test`**: v0.2 메인 메뉴, 싱글/멀티/기록/설정 화면 및 가로 회전 안내 검증 중.
- **온라인 멀티플레이는 아직 미구현**입니다. 테스트 화면의 대전 메뉴는 흐름을 확인하기 위한 UI입니다.

## 📋 개발 진행 현황

- **[ROADMAP.md — 전체 로드맵 및 상태](./ROADMAP.md)**: 버전별 일정 대신 단계별 목표, 의존성, 완료 기준 관리
- **[GitHub Issues — 할 일과 완료된 작업](https://github.com/kimsangjin83/TestProject/issues)**: 작업 체크리스트와 실제 진행 상태의 기준
- **[GitHub Pull Requests](https://github.com/kimsangjin83/TestProject/pulls)**: test 검증 후 main 병합 이력
- 현재 검증 중: [메인 메뉴 PR #3](https://github.com/kimsangjin83/TestProject/pull/3) · [Issue #7](https://github.com/kimsangjin83/TestProject/issues/7)

> 개발 규칙: `test`에서 구현·테스트 → 실제 모바일 확인 및 승인 → `main` 병합 → Issue 완료 처리. 버전 목표는 확정 출시일이 아닙니다.

## 직접 플레이

https://kimsangjin83.github.io/TestProject/

아이폰: Safari에서 열기 → 공유 → **홈 화면에 추가**. PWA용 manifest, 아이콘(SVG), service worker를 제공합니다.

## 현재 구현된 기능

- 10×20 보드 / 7종 블록 / 7-bag 랜덤 분배
- 좌·우 이동, 회전, 소프트 드롭, 하드 드롭
- 보관(Hold), 다음 블록(Next), 낙하지점 미리보기(Ghost)
- 줄 제거, 점수, 속도 증가(10줄마다 레벨업)
- 모바일 터치 버튼 / 데스크톱 키보드
- 일시정지, 재시작, 브라우저 로컬 최고 점수 저장
- 오프라인 캐싱 및 설치형 웹앱(PWA) 기본 구성
- 모바일 세로형 스크롤 최소화 HUD·게임판 자동 크기 조절
- 줄 제거 플래시·파편·블록 낙하 애니메이션
- 방해 줄 공격량 계산과 `blockarena:attack` 브라우저 이벤트 (서버 전송은 아직 하지 않음)

### 조작

| 동작 | 키보드 | 스마트폰 |
|---|---|---|
| 이동 | ← / → | ◀ / ▶ |
| 회전 | ↑, X / 역회전 Z | ⟳ |
| 아래로 1칸 | ↓ | ▼ |
| 즉시 낙하 | Space | 바로 내리기 |
| 블록 보관 | C | 보관 |
| 일시정지 | P, Esc | 일시정지 |

## 만들려는 대전 방식

| 모드 | 인원 | 승리 조건 |
|---|---:|---|
| 솔로 | 1명 | 최대 점수 |
| 1:1 | 2명 | 상대보다 오래 생존 |
| 2:2 | 4명 | 상대 팀 2명을 모두 탈락시키면 승리 |
| 1:1:1:1 | 4명 | 최후 생존자 |

### 공격 규칙 (초안)

- 한번에 1줄 제거: 공격 0줄
- 한번에 2줄 제거: 상대에게 1줄
- 한번에 3줄 제거: 상대에게 2줄
- 한번에 4줄 제거: 상대에게 4줄
- 상대는 바닥에 빈 칸이 하나 있는 **방해 줄(garbage row)** 을 받음
- 도착 전, 자신의 줄 제거로 방해 줄을 상쇄할 수 있도록 확장
- 2:2에서는 상대 팀으로만 공격, 4인 개인전은 공격 대상 선택 기능을 추가 예정
- 대전 종료 시 생존자 또는 생존 팀을 승리자로 판정

현재 게임 내 '누적 방해 줄' 숫자는 **연습용 계산만** 하며 다른 사용자에게 전송되지는 않습니다.

## 무료 운영 아키텍처 (계획)

```text
iPhone / Android / PC 브라우저
    │
    ├── GitHub Pages: 정적 PWA / 게임 렌더링
    │
    └── Cloudflare Workers + Durable Objects: 대전 방 WebSocket
            ├── 방 생성 / 초대 코드
            ├── 준비 상태 / 매치 시작
            ├── 게임 이벤트 중계, 점수/생존 상태
            └── 공격 및 승패 판정
```

- **프론트엔드**: GitHub Pages (현재 사용 중, 무료)
- **온라인 대전**: Cloudflare Workers + SQLite 기반 Durable Objects (무료 할당량 내)
- **DB**: 초기에 불필요. 추후 계정·전적 저장이 필요하면 추가
- **AWS와 Spring Boot**: 트래픽 증가나 별도 기능이 필요할 때 검토

공식 문서:
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/durable-objects/platform/pricing/

> WebSocket도 요청량에 포함되므로 프레임(60fps)을 서버로 매번 보내지 않고, 이동/고정/공격/패배 등 의미 있는 이벤트와 제한된 주기로 상태를 동기화합니다.

### 릴리스 진행 요약

1. **✅ v0.1 운영**: 싱글플레이, PWA, 모바일 UI, 줄 제거 파괴 효과
2. **🧪 v0.2 테스트**: 메인 메뉴/화면 전환, 가로 회전 안내 (테스트 후 운영 반영)
3. **📋 v0.3 예정**: 싱글 기록 확장/설정 기능
4. **📋 v0.4 예정**: 1:1 친구 방·WebSocket·공격 시스템
5. **📋 v0.5 이후 예정**: 랜덤 자동 매칭, 4인 개인전, 2:2 팀전, 전적 및 랭킹

세부 Issue 링크와 완료 기준은 [ROADMAP.md](./ROADMAP.md)에서 관리합니다.

## 로컬 실행

```bash
python3 -m http.server 8000
```

http://localhost:8000

파일을 직접 여는 방식(`file://`)에서는 Service Worker가 작동하지 않으므로 로컬 서버로 테스트합니다.

## 참고

이 프로젝트는 독립 제작 실습용입니다. **TETRIS® 명칭 및 공식 로고는 사용하지 않습니다.** 정식 상용화 전에는 지식재산권 관련 검토가 필요합니다.
