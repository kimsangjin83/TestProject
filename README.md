# 블록 아레나 (Block Arena)

설치형 웹앱(PWA)으로 만드는 실시간 대전 블록 퍼즐 게임 프로토타입.

현재 개발 단계 (2026-10-24):
- **운영 `main`**: v0.2 싱글 게임 + 모바일 전체화면 UI + 블록 파괴 효과 + 메인/싱글/멀티/기록/설정 메뉴 + 가로 회전 안내까지 반영.
- **테스트 `test`**: v0.2 기능을 포함하고, 이후 신규 기능 개발 및 검증에 사용.
- **온라인 멀티플레이는 아직 미구현**입니다. 테스트 화면의 대전 메뉴는 흐름을 확인하기 위한 UI입니다.

## 📋 개발 진행 현황

- **[ROADMAP.md — 전체 로드맵 및 상태](./ROADMAP.md)**: 버전별 일정 대신 단계별 목표, 의존성, 완료 기준 관리
- **[AWS 인프라 및 배포 운영 기록](./docs/AWS_DEPLOYMENT.md)**: EC2/SSM/GitHub OIDC 검증 결과와 S3 배포 예정 작업·비용
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

## AWS 인프라 구축 현황 (2026-10-24)

**서울 리전의 EC2 서버는 이미 생성·가동 중**이며 Nginx 외부 HTTP 접속, Systems Manager(SSM) 원격 명령, GitHub Actions OIDC 인증 및 SSM 원격 명령 실행 테스트까지 성공했습니다.

다만 **게임 소스는 아직 AWS에 배포되지 않았습니다.** 현재 실제 플레이 가능한 사이트는 위의 **GitHub Pages**이며, AWS 웹 서버는 기본 Nginx 페이지 상태입니다. GitHub 저장소도 아직 **Public**입니다.

| 항목 | 상태 |
|---|---|
| AWS EC2 | ✅ `app-server-01` · 서울 `ap-northeast-2` · `t3.small` (2 vCPU/2 GiB) |
| 운영체제/디스크 | ✅ Ubuntu 24.04 LTS / EBS gp3 20 GiB |
| Nginx | ✅ 설치·자동 실행·외부 HTTP 확인 |
| 앱 배포 경로 | ✅ `/var/www/apps/blockarena` 생성 |
| AWS SSM | ✅ Agent·IAM 역할 연결 및 Run Command 성공 |
| GitHub OIDC/Actions | ✅ `test` 브랜치 → AWS IAM → SSM 원격 조회 테스트 성공 |
| 배포용 S3 버킷 | ⏳ 아직 생성하지 않음 |
| 게임 파일의 AWS 자동 배포 | ⏳ 미구현 |
| HTTPS / 운영·테스트 분리 | ⏳ 미구현 |
| Spring Boot / WebSocket / DB | ⏳ 실시간 대전 단계에서 도입 예정 |

**연동 확인:** [GitHub Actions 검증 워크플로](./.github/workflows/verify-aws-ssm.yml) · [성공 실행 기록](https://github.com/kimsangjin83/TestProject/actions/runs/39926325077)

### 목표 배포 구조 (아직 구축 중)

```text
ChatGPT / Codex → GitHub (test 개발 / main 운영)
                         │
                    GitHub Actions
                         │
                   AWS IAM OIDC
                         │
                   S3 배포 ZIP (예정)
                         │
                 AWS Systems Manager
                         │
                    EC2 + Nginx
                         │
                 정적 PWA 프론트엔드
                         └─ Spring Boot REST/WebSocket (추후)
```

- **다음 작업:** 비공개 S3 배포 버킷 생성 → 최소 권한 설정 → GitHub Actions 배포 ZIP 업로드 → SSM/EC2 다운로드 및 Nginx 연결 → HTTPS/PWA 검증.
- **운영 이관:** `test`에서 검증하고 사용자 승인 후 `main`에 반영합니다. AWS 서비스 확인 전까지 GitHub Pages를 유지합니다.
- **비용:** 작은 배포 ZIP의 S3 저장·요청료는 월 1센트 미만 수준이 예상되지만, EC2/EBS/공인 IPv4/인터넷 송신료는 별도입니다. 크레딧 및 실제 과금은 AWS Billing에서 확인합니다.
- **원본 보호:** AWS 운영과 롤백 검증 후 GitHub Private 전환을 검토합니다. 브라우저에 전달된 JS는 Private 전환만으로 비공개가 되지 않습니다.

설정 내용, 보안 주의사항, 현재 테스트 결과 및 S3 비용 가정은 **[AWS 배포 운영 기록](./docs/AWS_DEPLOYMENT.md)**에 정리했습니다.

### 릴리스 진행 요약

1. **✅ v0.1 운영**: 싱글플레이, PWA, 모바일 UI, 줄 제거 파괴 효과
2. **✅ v0.2 운영**: 메인 메뉴/화면 전환, 가로 회전 안내 (PR #3 병합)
3. **🔨 AWS 환경 준비**: EC2·Nginx·SSM·GitHub OIDC 검증 완료 → S3 기반 프론트 배포/HTTPS/Private 전환 예정 → Spring Boot 서버 개발
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
