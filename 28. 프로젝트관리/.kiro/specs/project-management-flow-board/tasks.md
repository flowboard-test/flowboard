# Implementation Plan: Project Management Flow Board

## Overview

Flow 스타일 프로젝트 관리 SaaS의 구현 계획. React + TypeScript 프론트엔드, Fastify 백엔드, PostgreSQL 데이터베이스, Socket.io 실시간 통신 기반으로 칸반 보드, 업무 이관, 알림 시스템, 멀티 뷰를 구현한다.

## Tasks

- [x] 1. 프로젝트 초기 설정
  - [x] 1.1 백엔드 프로젝트 구조 생성 및 Fastify 앱 설정
    - Fastify + TypeScript 프로젝트 초기화
    - 모듈 디렉토리 구조 생성 (auth, project, board, card, transfer, resolution, notification, dashboard, file, realtime)
    - 공통 미들웨어, 에러 핸들링, 환경변수 설정
    - _Requirements: 전체_

  - [x] 1.2 프론트엔드 프로젝트 구조 생성 및 React 앱 설정
    - React + TypeScript + Vite 프로젝트 초기화
    - Tailwind CSS + shadcn/ui 설정
    - TanStack Query, Zustand, Socket.io client 설치
    - 컴포넌트 디렉토리 구조 생성
    - _Requirements: 전체_

  - [x] 1.3 PostgreSQL 데이터베이스 스키마 마이그레이션 생성
    - 마이그레이션 도구 설정 (node-pg-migrate 또는 Knex)
    - users, projects, project_members 테이블 생성
    - boards, columns, cards 테이블 생성
    - transfers, resolutions, workflow_chains, workflow_steps 테이블 생성
    - comments, attachments, custom_field_definitions, custom_field_values 테이블 생성
    - notifications, notification_settings, notification_sent_log, card_timeline 테이블 생성
    - 주요 인덱스 생성
    - _Requirements: 전체 데이터 모델_

  - [x] 1.4 공통 TypeScript 타입 정의
    - 백엔드/프론트엔드 공유 타입 패키지 또는 파일 생성
    - MoveCardRequest, TransferRequest, WsEvent, Notification 등 핵심 인터페이스 정의
    - ENUM 타입 (priority, role, resolution_type, status 등) 정의
    - 에러 응답 타입 정의
    - _Requirements: 전체_

- [x] 2. 인증/인가 모듈
  - [x] 2.1 JWT 기반 인증 구현
    - 회원가입 (이메일/비밀번호) 엔드포인트 구현
    - 로그인 엔드포인트 구현 (JWT 발급)
    - 토큰 갱신 엔드포인트 구현
    - OAuth2 연동 (Google) 구현
    - 인증 미들웨어 구현 (JWT 검증)
    - _Requirements: 1.3, 1.4_

  - [x] 2.2 역할 기반 권한 미들웨어 구현
    - 역할별 권한 매핑 정의 (owner, admin, member)
    - 프로젝트 컨텍스트 권한 검증 미들웨어 구현
    - API 라우트별 권한 적용
    - _Requirements: 1.3, 1.4_

  - [ ]* 2.3 Property test: 역할-권한 매핑 일관성
    - **Property 3: 역할-권한 매핑 일관성**
    - **Validates: Requirements 1.3, 1.4**

- [x] 3. 프로젝트 관리 (CRUD + 멤버)
  - [x] 3.1 프로젝트 CRUD API 구현
    - POST /api/projects - 프로젝트 생성 (생성자를 owner로 자동 지정)
    - GET /api/projects - 프로젝트 목록 조회
    - GET /api/projects/:id - 프로젝트 상세 조회
    - PUT /api/projects/:id - 프로젝트 수정
    - DELETE /api/projects/:id - 프로젝트 삭제
    - _Requirements: 1.1, 1.2_

  - [ ]* 3.2 Property test: 프로젝트 CRUD Round Trip
    - **Property 1: 프로젝트 CRUD Round Trip**
    - **Validates: Requirements 1.1**

  - [ ]* 3.3 Property test: 프로젝트 생성 시 소유자 자동 지정
    - **Property 2: 프로젝트 생성 시 소유자 자동 지정**
    - **Validates: Requirements 1.2**

  - [x] 3.4 프로젝트 멤버 관리 API 구현
    - POST /api/projects/:id/members - 멤버 추가 (역할 할당)
    - PUT /api/projects/:id/members/:userId - 멤버 역할 변경
    - DELETE /api/projects/:id/members/:userId - 멤버 제거
    - 소유자 제거 시 소유권 이전 요구 로직 구현
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ]* 3.5 Unit test: 소유자 제거 시 소유권 이전 요구
    - 소유자 제거 시 OWNER_TRANSFER_REQUIRED 에러 반환 검증
    - 소유권 이전 후 제거 성공 검증
    - _Requirements: 1.5_

- [ ] 4. Checkpoint - 프로젝트 기반 구조 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 보드/컬럼 관리
  - [x] 5.1 보드 및 컬럼 CRUD API 구현
    - GET /api/projects/:id/board - 보드 전체 조회 (컬럼 + 카드 포함)
    - POST /api/projects/:id/columns - 컬럼 생성
    - PUT /api/columns/:id - 컬럼 수정 (이름, WIP Limit)
    - PUT /api/columns/reorder - 컬럼 순서 변경
    - DELETE /api/columns/:id - 컬럼 삭제
    - WIP Limit 설정 (양의 정수 또는 null=무제한)
    - _Requirements: 3.1, 3.2_

  - [ ]* 5.2 Property test: WIP Limit 강제
    - **Property 10: WIP Limit 강제**
    - **Validates: Requirements 3.2, 3.3**

- [x] 6. 카드 관리
  - [x] 6.1 카드 CRUD API 구현
    - POST /api/columns/:id/cards - 카드 생성 (제목, 설명, 우선순위, 태그, 담당자, 시작일, 마감일)
    - GET /api/cards/:id - 카드 상세 조회
    - PUT /api/cards/:id - 카드 수정 (낙관적 잠금 version 체크)
    - DELETE /api/cards/:id - 카드 삭제
    - 우선순위 유효성 검증 (urgent, high, normal, low)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 6.2 Property test: 카드 생성 Round Trip
    - **Property 4: 카드 생성 Round Trip**
    - **Validates: Requirements 2.1, 2.3**

  - [ ]* 6.3 Property test: 우선순위 유효성 검증
    - **Property 5: 우선순위 유효성 검증**
    - **Validates: Requirements 2.2**

  - [ ] 6.4 서브태스크 관리 구현
    - POST /api/cards/:id/subtasks - 서브태스크 생성 (무제한 깊이 트리 구조)
    - 상위 카드 완료 시 모든 서브태스크 완료 검증 로직
    - 서브태스크 트리 조회 (재귀)
    - _Requirements: 2.4, 2.5_

  - [ ]* 6.5 Property test: 서브태스크 완료 검증
    - **Property 6: 서브태스크 완료 검증**
    - **Validates: Requirements 2.5**

  - [ ] 6.6 파일 첨부 기능 구현
    - POST /api/cards/:id/attachments - 파일 업로드 (S3 저장)
    - GET /api/attachments/:id/download - 파일 다운로드
    - 파일 메타데이터 관리 (파일명, 크기, MIME 타입)
    - _Requirements: 2.6_

  - [ ]* 6.7 Property test: 파일 첨부 Round Trip
    - **Property 7: 파일 첨부 Round Trip**
    - **Validates: Requirements 2.6**

  - [ ] 6.8 Custom Field 구현
    - POST /api/projects/:id/custom-fields - 커스텀 필드 정의 생성
    - PUT /api/cards/:id/custom-fields - 카드에 커스텀 필드 값 저장
    - 필드 유형별 값 검증 (텍스트, 숫자, 날짜, 단일선택, 다중선택)
    - _Requirements: 2.7_

  - [ ]* 6.9 Property test: Custom Field 값 Round Trip
    - **Property 8: Custom Field 값 Round Trip**
    - **Validates: Requirements 2.7**

  - [ ] 6.10 댓글 및 멘션 기능 구현
    - POST /api/cards/:id/comments - 댓글 추가
    - @ 멘션 파싱 로직 구현 (유효한 사용자 추출)
    - 멘션된 사용자에게 알림 생성 연동
    - _Requirements: 2.8, 2.9_

  - [ ]* 6.11 Property test: 멘션 파싱 정확성
    - **Property 9: 멘션 파싱 정확성**
    - **Validates: Requirements 2.8, 2.9**

- [ ] 7. Checkpoint - 카드 관리 기능 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. 칸반 보드 프론트엔드 (드래그앤드롭)
  - [ ] 8.1 보드 뷰 컴포넌트 구현
    - BoardView 컴포넌트 (컬럼 목록 렌더링)
    - Column 컴포넌트 (카드 목록 + WIP Limit 표시)
    - CardItem 컴포넌트 (카드 요약 정보)
    - _Requirements: 3.1, 3.4_

  - [ ] 8.2 dnd-kit 기반 드래그앤드롭 구현
    - 컬럼 간 카드 이동 드래그앤드롭
    - 낙관적 UI 업데이트 (즉시 반영 후 서버 확인)
    - WIP Limit 초과 시 이동 차단 및 경고 메시지 표시
    - PUT /api/cards/:id/move API 호출
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ] 8.3 카드 이동 시 담당자 변경 옵션 구현
    - 컬럼 이동 시 "담당자도 변경하시겠습니까?" 다이얼로그
    - 담당자 변경 선택 시 Transfer와 동시 실행
    - _Requirements: 3.6, 3.7, 9.3_

  - [ ]* 8.4 Property test: 카드 이동 시 상태 갱신 및 담당자 보존
    - **Property 11: 카드 이동 시 상태 갱신 및 담당자 보존**
    - **Validates: Requirements 3.5, 3.6, 9.1**

- [ ] 9. 업무 이관 (수동 + 자동 워크플로우)
  - [x] 9.1 수동 이관 API 구현
    - POST /api/cards/:id/transfers - 수동 이관 생성
    - 이관 대상 프로젝트 멤버 검증
    - Resolution 유형 선택 필수 (approved, rejected, completed, hold)
    - 이관 코멘트 및 파일 첨부 지원
    - 반려(rejected) 시 이전 담당자 자동 재할당
    - 타임라인 이벤트 기록 (타임스탬프, 발신자, 수신자, Resolution, 코멘트)
    - GET /api/cards/:id/transfers - 이관 이력 조회
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 9.2 Property test: 이관 유효성 검증
    - **Property 16: 이관 유효성 검증**
    - **Validates: Requirements 5.1, 5.2, 7.1**

  - [ ]* 9.3 Property test: 반려 시 자동 재할당
    - **Property 17: 반려 시 자동 재할당**
    - **Validates: Requirements 5.4**

  - [ ]* 9.4 Property test: 이관 시 코멘트/첨부 Round Trip
    - **Property 19: 이관 시 코멘트/첨부 Round Trip**
    - **Validates: Requirements 5.3, 7.3**

  - [ ] 9.5 자동 워크플로우 체인 구현
    - POST /api/projects/:id/workflows - 워크플로우 체인 생성 (컬럼별 담당자 순서 정의)
    - GET /api/projects/:id/workflows - 워크플로우 목록 조회
    - PUT /api/workflows/:id - 워크플로우 수정 (진행 중 카드 미영향)
    - DELETE /api/workflows/:id - 워크플로우 삭제
    - 워크플로우 엔진: 현재 단계 완료 시 다음 담당자 자동 Transfer 생성
    - 마지막 단계 완료 시 카드 완료 상태 변경
    - 자동 Transfer에도 수동 Transfer와 동일한 규칙 적용 (Resolution 기록)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 9.6 Property test: 자동 워크플로우 체인 진행
    - **Property 20: 자동 워크플로우 체인 진행**
    - **Validates: Requirements 6.2, 6.4**

  - [ ]* 9.7 Property test: 워크플로우 체인 수정 격리
    - **Property 21: 워크플로우 체인 수정 격리**
    - **Validates: Requirements 6.5**

  - [ ] 9.8 이관 프론트엔드 구현
    - TransferDialog 컴포넌트 (담당자 선택, Resolution 유형, 코멘트, 첨부)
    - 이관 이력 타임라인 UI
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 10. 처리 결과 기록
  - [x] 10.1 Resolution API 구현
    - POST /api/cards/:id/resolutions - 처리 결과 기록 (유형, 코멘트, 첨부)
    - GET /api/cards/:id/resolutions - 처리 결과 이력 조회 (시간순)
    - resolution_required 프로젝트 설정 시 완료/이관 전 Resolution 강제
    - 이관 알림에 Resolution 상세 내용 포함
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 10.2 Property test: Resolution 필수 설정 강제
    - **Property 22: Resolution 필수 설정 강제**
    - **Validates: Requirements 7.2**

  - [ ]* 10.3 Property test: Resolution 이력 시간순 정렬
    - **Property 23: Resolution 이력 시간순 정렬**
    - **Validates: Requirements 7.5**

  - [ ] 10.4 Resolution 프론트엔드 구현
    - ResolutionForm 컴포넌트 (유형 선택, 코멘트, 첨부)
    - 카드 상세 화면에 Resolution 이력 표시
    - _Requirements: 7.1, 7.5_

- [ ] 11. Checkpoint - 이관 및 처리 결과 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. 칸반과 이관의 관계 (동시 동작)
  - [ ] 12.1 컬럼 이동 + Transfer 원자적 실행 구현
    - PUT /api/cards/:id/move에 transferTo, resolution 옵션 추가
    - DB 트랜잭션으로 컬럼 이동 + Transfer 원자성 보장
    - Transfer 없이 이동 시 담당자 유지, 상태만 변경
    - Transfer만 수행 시 column_id 유지
    - 동시 발생 시 두 이벤트 모두 타임라인 기록
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 12.2 Property test: Transfer 없이 이동 시 위치만 변경
    - **Property 27: Transfer 없이 이동 시 위치만 변경**
    - **Validates: Requirements 9.2**

  - [ ]* 12.3 Property test: 컬럼 이동 + Transfer 원자성
    - **Property 28: 컬럼 이동 + Transfer 원자성**
    - **Validates: Requirements 9.4**

  - [ ]* 12.4 Property test: 이관 및 이동 타임라인 기록
    - **Property 18: 이관 및 이동 타임라인 기록**
    - **Validates: Requirements 5.5, 9.5**

- [ ] 13. 알림 시스템
  - [x] 13.1 Notification Service 구현
    - 알림 생성 로직 (이관 수신, Resolution 기록, 반려, 멘션)
    - 채널별 발송 (인앱: DB 저장, 이메일: SMTP, 푸시: FCM)
    - 사용자별 알림 설정 조회 및 채널 필터링
    - GET /api/notifications - 알림 목록 조회
    - PUT /api/notifications/:id/read - 알림 읽음 처리
    - PUT /api/notifications/settings - 알림 설정 변경
    - _Requirements: 8.1, 8.2, 8.3, 8.8, 8.9_

  - [ ]* 13.2 Property test: 알림 생성 규칙
    - **Property 24: 알림 생성 규칙**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [ ]* 13.3 Property test: 알림 채널 설정 준수
    - **Property 26: 알림 채널 설정 준수**
    - **Validates: Requirements 8.9**

  - [ ] 13.4 마감 알림 스케줄러 구현
    - Cron 기반 스케줄러 (매일 09:00 실행)
    - D-3, D-1, D-day, 기한 초과 카드 조회 및 알림 생성
    - 중복 발송 방지 (notification_sent_log 활용)
    - 기한 초과 시 담당자 + 프로젝트 관리자 모두에게 알림
    - _Requirements: 8.4, 8.5, 8.6, 8.7_

  - [ ]* 13.5 Property test: 기한 초과 알림 수신자
    - **Property 25: 기한 초과 알림 수신자**
    - **Validates: Requirements 8.7**

  - [ ] 13.6 알림 프론트엔드 구현
    - NotificationPanel 컴포넌트 (알림 목록, 읽음 처리)
    - NotificationItem 컴포넌트 (알림 유형별 렌더링)
    - 알림 설정 UI (채널별, 유형별 토글)
    - _Requirements: 8.8, 8.9_

- [ ] 14. 멀티 뷰 (리스트, 간트차트, 캘린더)
  - [ ] 14.1 멀티 뷰 백엔드 API 구현
    - GET /api/projects/:id/cards/list - 리스트 뷰 (상태별 그룹화, 정렬)
    - GET /api/projects/:id/cards/gantt - 간트차트 뷰 (시작일/마감일 기준)
    - GET /api/projects/:id/cards/calendar - 캘린더 뷰 (마감일 기준)
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [ ]* 14.2 Property test: 뷰 간 데이터 일관성
    - **Property 12: 뷰 간 데이터 일관성**
    - **Validates: Requirements 4.2**

  - [ ]* 14.3 Property test: 간트차트 배치 정확성
    - **Property 13: 간트차트 배치 정확성**
    - **Validates: Requirements 4.3**

  - [ ]* 14.4 Property test: 캘린더 배치 정확성
    - **Property 14: 캘린더 배치 정확성**
    - **Validates: Requirements 4.4**

  - [ ]* 14.5 Property test: 리스트 뷰 정렬 정확성
    - **Property 15: 리스트 뷰 정렬 정확성**
    - **Validates: Requirements 4.5**

  - [ ] 14.6 멀티 뷰 프론트엔드 구현
    - ListView 컴포넌트 (상태별 그룹화, 정렬 옵션)
    - GanttView 컴포넌트 (dhtmlx-gantt 연동, 타임라인 렌더링)
    - CalendarView 컴포넌트 (마감일 기준 카드 배치)
    - 뷰 전환 탭 UI (보드/리스트/간트/캘린더)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 15. Checkpoint - 뷰 및 알림 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. 내 업무 뷰
  - [ ] 16.1 내 업무 API 구현
    - GET /api/my-tasks - 모든 프로젝트에서 현재 사용자 할당/이관 카드 조회
    - 상태별 필터링 (진행 중, 완료, 기한 초과)
    - 정렬: 기한 초과 최상단, 나머지 마감일 오름차순
    - 이관 카드: 발신자 Resolution, 코멘트, 이름, 타임스탬프 포함
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 16.2 Property test: 내 업무 뷰 완전성
    - **Property 29: 내 업무 뷰 완전성**
    - **Validates: Requirements 10.1**

  - [ ]* 16.3 Property test: 내 업무 뷰 필터 정확성
    - **Property 30: 내 업무 뷰 필터 정확성**
    - **Validates: Requirements 10.2**

  - [ ]* 16.4 Property test: 내 업무 뷰 정렬 규칙
    - **Property 31: 내 업무 뷰 정렬 규칙**
    - **Validates: Requirements 10.4**

  - [ ]* 16.5 Property test: 이관 카드 메타데이터 표시
    - **Property 32: 이관 카드 메타데이터 표시**
    - **Validates: Requirements 10.3, 10.5**

  - [ ] 16.6 내 업무 뷰 프론트엔드 구현
    - MyTasksList 컴포넌트 (카드 목록, 필터, 정렬)
    - TaskCard 컴포넌트 (이관 출처 정보 표시)
    - 상태 필터 탭 (진행 중/완료/기한 초과)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 17. 대시보드
  - [x] 17.1 대시보드 API 구현
    - GET /api/projects/:id/dashboard - 대시보드 집계 데이터
    - 프로젝트 전체 진행률 (완료 카드 수 / 전체 카드 수 × 100)
    - 컬럼별 평균 체류 시간 (card_timeline 기반 계산)
    - 개인별 멤버 처리량 (기간별 완료 카드 수)
    - 컬럼별 카드 수 분포
    - 기간 필터 (일간, 주간, 월간)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 17.2 Property test: 대시보드 진행률 계산
    - **Property 33: 대시보드 진행률 계산**
    - **Validates: Requirements 11.1**

  - [ ]* 17.3 Property test: 대시보드 컬럼별 체류 시간 계산
    - **Property 34: 대시보드 컬럼별 체류 시간 계산**
    - **Validates: Requirements 11.2**

  - [ ]* 17.4 Property test: 대시보드 기간 필터 정확성
    - **Property 35: 대시보드 기간 필터 정확성**
    - **Validates: Requirements 11.3, 11.4**

  - [ ]* 17.5 Property test: 대시보드 컬럼 분포 정확성
    - **Property 36: 대시보드 컬럼 분포 정확성**
    - **Validates: Requirements 11.6**

  - [ ] 17.6 대시보드 프론트엔드 구현
    - ProgressChart 컴포넌트 (전체 진행률 표시)
    - BottleneckChart 컴포넌트 (컬럼별 체류 시간 시각화)
    - MemberThroughput 컴포넌트 (개인별 처리량)
    - ColumnDistribution 컴포넌트 (컬럼별 카드 수 차트)
    - 기간 선택 UI (일간/주간/월간)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6_

- [ ] 18. 실시간 동기화 (WebSocket)
  - [ ] 18.1 WebSocket 서버 구현
    - Socket.io 서버 설정 (Fastify 통합)
    - 프로젝트 룸 join/leave 이벤트 처리
    - 카드 이벤트 브로드캐스트 (card:moved, card:updated, card:created, card:deleted)
    - 컬럼/이관 이벤트 브로드캐스트 (column:updated, transfer:created)
    - Redis pub/sub 기반 다중 인스턴스 지원
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ] 18.2 낙관적 잠금 및 충돌 감지 구현
    - 카드 수정 시 version 필드 비교 (WHERE version = $expected)
    - 충돌 시 conflict:detected 이벤트 발송
    - 클라이언트 충돌 알림 UI
    - _Requirements: 12.5_

  - [ ]* 18.3 Property test: 낙관적 잠금 충돌 감지
    - **Property 38: 낙관적 잠금 충돌 감지**
    - **Validates: Requirements 12.5**

  - [ ] 18.4 WebSocket 재연결 및 동기화 구현
    - 지수 백오프 재연결 로직 (base × 2^n, 최대값 제한)
    - 재연결 시 sync:request로 마지막 이벤트 버전 전송
    - 서버 sync:response로 누락 이벤트 일괄 전송
    - 최대 10회 시도 후 폴링 모드 전환
    - _Requirements: 12.4_

  - [ ]* 18.5 Property test: 지수 백오프 재연결 간격
    - **Property 37: 지수 백오프 재연결 간격**
    - **Validates: Requirements 12.4**

  - [ ] 18.6 WebSocket 클라이언트 훅 구현
    - useRealtime 훅 (연결 관리, 이벤트 구독)
    - 실시간 이벤트 수신 시 TanStack Query 캐시 갱신
    - Zustand store 실시간 상태 업데이트
    - 모든 뷰에서 실시간 변경 반영
    - _Requirements: 3.8, 4.6, 12.1, 12.2, 12.3_

- [ ] 19. Checkpoint - 실시간 동기화 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. 통합 및 최종 연결
  - [ ] 20.1 카드 상세 화면 통합 구현
    - CardDetail 컴포넌트 (모든 기능 통합)
    - 서브태스크 트리, 댓글, 첨부파일, 커스텀 필드, 이관 이력, Resolution 이력
    - 타임라인 뷰 (모든 이벤트 시간순 표시)
    - _Requirements: 2.4, 2.6, 2.7, 2.8, 5.5, 7.5_

  - [ ] 20.2 대시보드 실시간 갱신 연동
    - 카드 이동 시 5초 이내 대시보드 체류 시간 지표 갱신
    - WebSocket 이벤트 기반 대시보드 데이터 자동 리프레시
    - _Requirements: 11.5_

  - [ ]* 20.3 Integration test: 카드 이동 → WebSocket 브로드캐스트 흐름
    - 카드 이동 API 호출 → WebSocket card:moved 이벤트 수신 검증
    - 1초 이내 전파 검증
    - _Requirements: 3.8, 12.2, 12.3_

  - [ ]* 20.4 Integration test: 이관 → 알림 발송 흐름
    - 이관 생성 → 알림 생성 → 채널별 발송 검증
    - _Requirements: 5.6, 8.1_

  - [ ]* 20.5 Integration test: 자동 워크플로우 체인 전체 흐름
    - 워크플로우 정의 → 카드 진입 → 단계별 자동 이관 → 완료 검증
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 21. Final Checkpoint - 전체 시스템 검증
  - Ensure all tests pass, ask the user if questions arise.
