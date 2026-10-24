# Block Arena — 아키텍처

기준일: 2026-10-23. **현재 구현**과 **예정 아키텍처**를 구분한다.

## 현재 구현 (검증된 범위)
```text
iPhone Safari / PC 브라우저
          │
          ▼
 GitHub Pages (정적 PWA)
          │
  index.html / style.css
  game.js (싱글 게임)
  service-worker.js / manifest.webmanifest
          │
          ▼
  브라우저 localStorage (최고 점수)
```

- 게임 판은 10×20, 7-bag, 이동/회전/드롭/홀드/넥스트/고스트 등을 지원한다.
- 멀티플레이 메뉴와 `blockarena:attack` 이벤트는 존재하지만 **네트워크 대전은 없다**.
- Spring Boot, WebSocket 서버, 데이터베이스 및 실제 AWS 호스팅은 아직 없다.

## 목표 구성 (AWS)
```text
PWA 클라이언트 (iOS/Android/PC)
          │ HTTPS / WSS
          ▼
   AWS EC2 (Ubuntu 24.04 LTS, 구축 예정)
          │
        Nginx
      ┌───┴────────────────┐
      ▼                    ▼
   정적 PWA        Spring Boot / Java 17+
                   REST + WebSocket
                       │
              방·매칭·게임 상태
              공격 및 승패 검증
                       │
                DB (추후 필요 시)
```

- 현재 검토 중인 EC2 인스턴스명은 `app-server-01`, 사양은 `t3.small` (2 vCPU/2 GiB)이다. **인스턴스 생성·접속·배포 완료를 뜻하지 않는다.**
- 초기에는 정적 파일과 백엔드를 한 인스턴스에 두되, 프로덕션 부하 증가 시 분리한다.
- 프론트엔드는 향후 Cloudflare Pages / S3 + CloudFront 등으로 분리할 수 있으나 현재 확정·배포된 구성은 아니다.
- 계정, 전적, 랭킹 등의 영구 데이터가 필요할 때 DB를 도입한다. 초기 WebSocket 검증에 MySQL이 반드시 필요한 것은 아니다.
- 1:1 친구 방 → 자동 매칭 → 4인 개인전 → 2:2 팀전 순서로 확장한다.

## 권한과 신뢰 경계
- 브라우저 입력 및 클라이언트가 주장하는 공격량·점수·승패를 신뢰하지 않는다.
- 멀티플레이 서버는 룸 상태, 동기화 및 최종 판정을 담당한다.
- 실시간 게임 상태의 동기화·재접속·치트 방지 정책은 백엔드 설계 시 구체화한다.
- 소스 저장소 Private 전환은 서버 API 보안의 대체 수단이 아니다. 브라우저로 전송되는 JS는 열람 가능하다.

## 관련 기록
- 주요 요구사항·상태: [README](../README.md), [ROADMAP](../ROADMAP.md)
- 개발 표준: [AGENTS](../AGENTS.md), [AI 협업](AI_WORKFLOW.md)
