# 블록 아레나 (Block Arena)

설치형 웹앱(PWA)으로 만드는 실시간 대전 블록 퍼즐 게임 프로토타입.

현재 개발 단계 (2026-10-22):
- **운영 `main`**: v0.2 싱글 게임 + 모바일 전체화면 UI + 블록 파괴 효과 + 메인/싱글/멀티/기록/설정 메뉴 + 가로 회전 안내까지 반영.
- **테스트 `test`**: v0.2 기능을 포함하고, 이후 신규 기능 개발 및 검증에 사용.
- **온라인 멀티플레이는 아직 미구현**입니다. 테스트 화면의 대전 메뉴는 흐름을 확인하기 위한 UI입니다.

## 🤝 ChatGPT · Codex 공동 개발 안내

이 프로젝트는 ChatGPT와 Codex가 **GitHub를 공통 코드 기준**으로 사용해 협업한다. 기능 브랜치에서 작업해 `test` PR로 통합하고, 검증/사용자 승인 후에만 `main`에 반영한다. 운영 배포는 코드 반영과 별도 승인 단계로 관리한다.

- [AGENTS.md — AI 공통 개발 규칙](./AGENTS.md)
- [AI_WORKFLOW.md — 역할 분담·브랜치·인수인계](./docs/AI_WORKFLOW.md)
- [ARCHITECTURE.md — 현재 구현과 AWS 목표 아키텍처](./docs/ARCHITECTURE.md)
- [DEVELOPMENT.md — 실행 및 검증 방법](./docs/DEVELOPMENT.md)
- [DEPLOYMENT.md — AWS/GitHub Actions 배포 계획](./docs/DEPLOYMENT.md)
- [CHANGELOG.md — 주요 변경 이력](./docs/CHANGELOG.md)

> 현재 AWS 서버/배포 자동화/백엔드는 **준비·설계 단계**이며 완료된 기능으로 간주하지 않는다.

## 📋 개발 진행 현황

- **[ROADMAP.md — 전체 로드맵 및 상태](./ROADMAP.md)**: 버전별 일정 대신 단계별 목표, 의존성, 완료 기준 관리
- **[GitHub Issues — 할 일과 완료된 작업](https://github.com/kimsangjin83/TestProject/issues)**: 작업 체크리스트와 실제 진행 상태의 기준
- **[GitHub Pull Requests](https://github.com/kimsangjin83/TestProject/pulls)**: test 검증 후 main 병합 이력
- 최근 운영 반영: [메인 메뉴 PR #3](https://github.com/kimsangjin83/TestProject/pull/3) · [완료 Issue #7](https://github.com/kimsangjin83/TestProject/issues/7)
- 다음 인프라 작업: [AWS 계정/비용 Issue #22](https://github.com/kimsangjin83/TestProject/issues/22), [AWS 프론트 배포/Private 전환 Issue #23](https://github.com/kimsangjin83/TestProject/issues/23), [배포 테스트 Issue #8](https://github.com/kimsangjin83/TestProject/issues/8)

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
- 메인/싱글/멀티/기록/설정 메뉴와 화면 전환(멀티 기능은 UI만 제공)
- 휴대폰 가로 화면 전환 시 세로 회전 안내 및 일시정지
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

## 향후 AWS 운영 아키텍처 (계정·무료 자격 확인 대기)

현재 게임은 GitHub Pages에 배포 중이며 **AWS 환경으로 아직 이전하지 않았습니다**. 운영 환경은 사용자 AWS 계정/무료 혜택 확인 후 결정합니다.

```text
GitHub (main 운영 / test 개발·검증; 현재 Public)
  │
  └─ AWS Linux (EC2 또는 Lightsail, 비용 확인 후 결정)
      ├─ Nginx: HTML/CSS/JS PWA + HTTPS/Reverse Proxy
      └─ Spring Boot 3.x / Java 17+ : REST API · WebSocket
          ├─ 방 생성/초대·READY
          ├─ 매칭
          ├─ 서버 기준 게임 상태/공격/승패 검증
          └─ DB: 전적 저장 필요 시 도입
```

- 1단계: [#22 AWS 계정·무료 혜택·월 비용 확인](https://github.com/kimsangjin83/TestProject/issues/22). 실제 서버 개설/과금은 아직 하지 않음.
- 2단계: [#23 AWS 프론트 배포 및 GitHub Private 전환](https://github.com/kimsangjin83/TestProject/issues/23). 새 운영/테스트 주소 검증 후에만 GitHub Pages 의존성 제거.
- 3단계: [#11 Spring Boot WebSocket 게임룸](https://github.com/kimsangjin83/TestProject/issues/11) → 1:1 친구 대전 → 공격 → 랜덤 매칭.
- 최소 서버 검증에는 DB를 반드시 설치할 필요는 없음. 랭킹/계정이 필요하면 MariaDB 등 검토.
- GitHub Private으로 바꿔도 **브라우저에 내려가는 JavaScript는 노출됨**. 대전 데이터는 서버에서 검증해야 함.
- AWS 사용량은 서비스·리전·계정 혜택·퍼블릭 IPv4·EBS·전송량에 따라 과금될 수 있음.

### 이전 배포 계획 변경
Cloudflare Workers/Durable Objects 방식 대신 AWS + Spring Boot를 **우선 검토**하기로 했음. AWS 계정/예산 상태 확인에 따라 최종 사양 확정 예정.

### 릴리스 진행 요약

1. **✅ v0.1 운영**: 싱글플레이, PWA, 모바일 UI, 줄 제거 파괴 효과
2. **✅ v0.2 운영**: 메인 메뉴/화면 전환, 가로 회전 안내 (PR #3 병합)
3. **📋 AWS 환경 준비**: 계정·무료 자격 확인 → 프론트 AWS 이전·GitHub Private 전환 → Spring Boot 서버 개발
4. **📋 v0.3 예정**: 싱글 기록 확장/설정 기능
5. **📋 v0.4 예정**: 1:1 친구 방·WebSocket·공격 시스템
6. **📋 v0.5 이후 예정**: 랜덤 자동 매칭, 4인 개인전, 2:2 팀전, 전적 및 랭킹

세부 Issue 링크와 완료 기준은 [ROADMAP.md](./ROADMAP.md)에서 관리합니다.

## 로컬 실행

```bash
python3 -m http.server 8000
```

http://localhost:8000

파일을 직접 여는 방식(`file://`)에서는 Service Worker가 작동하지 않으므로 로컬 서버로 테스트합니다.

## 참고

이 프로젝트는 독립 제작 실습용입니다. **TETRIS® 명칭 및 공식 로고는 사용하지 않습니다.** 정식 상용화 전에는 지식재산권 관련 검토가 필요합니다.
