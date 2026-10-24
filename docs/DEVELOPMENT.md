# Block Arena — 개발 환경 및 검증

기준일: 2026-10-23.

## 현재 소스
현재 프로젝트는 **HTML/CSS/바닐라 JavaScript 정적 PWA**다. 별도의 npm, Gradle, Java 백엔드 프로젝트는 아직 없다.

```text
/
├── README.md
├── ROADMAP.md
├── AGENTS.md
├── index.html
├── style.css
├── game.js
├── service-worker.js
├── manifest.webmanifest
├── icon.svg
├── icon-192.png
└── docs/
```

## 로컬 실행
Python 3가 있으면 저장소 루트에서 다음 명령으로 실행한다.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`에 접속한다. 파일을 `file://`로 직접 열면 Service Worker가 정상 동작하지 않는다. 다른 기기에서 접속하는 경우 HTTPS/보안 컨텍스트 조건을 별도로 확인한다.

## 검증 체크리스트
- 싱글게임 시작/일시정지/재시작/게임오버/최고 점수
- 이동/회전/소프트 드롭/하드 드롭/홀드/다음 블록
- 점수·레벨 변화, 줄 제거 애니메이션 및 브라우저 콘솔 오류
- 메뉴 이동, 모바일 세로 레이아웃, 가로 회전 안내
- 아이폰 Safari의 홈 화면 추가, PWA 재시작/캐시 업데이트
- 기존 공격량 계산 이벤트가 UI를 방해하지 않는지 확인
- 멀티플레이 화면은 현재 UI만 존재함을 사용자에게 명확히 표시

현재 저장소에 자동화된 테스트 러너가 없으므로, CI가 생기기 전까지 이 항목은 수동 검증에 해당한다. **검증하지 않은 항목을 통과로 기재하지 않는다.**

## 브랜치 관리
- `main`: GitHub Pages 운영
- `test`: 개발 통합 및 실제 기기 검증
- 작업 브랜치: `test`에서 분기 후 PR로 통합
- 운영 전환: 승인된 `test` 변경만 `main`에 병합

실제 Git 이력에서 `main`과 `test`가 별도 커밋으로 분기되어 있을 수 있다. 병합 시 기존 변경 이력을 확인한다.

## AI를 통한 개발
- [AGENTS.md](../AGENTS.md)를 먼저 읽고 코드 현황을 확인한다.
- ChatGPT와 Codex는 GitHub의 **커밋·PR·Issue·문서**로 변경 사항을 공유한다.
- AI 도구의 테스트 실행, GitHub 쓰기, Actions 호출, AWS SSH 접근 가능 여부는 각각의 연결·권한·환경에 따라 달라진다.
- 인수인계 형식과 충돌 방지는 [AI 협업 운영 가이드](AI_WORKFLOW.md)를 따른다.

## 이후 단계
Spring Boot 프로젝트가 생성되면 Java/Gradle 버전, 실행 프로파일, 테스트 명령, 환경 변수를 **실제 구성 확인 후** 이 문서에 추가한다.
