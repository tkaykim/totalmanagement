# src/features/attendance — 출퇴근·근무 요청

## 맡는 것
- 출근·퇴근 버튼과 근무 상태(`CheckInButton`, `CheckOutButton`, `WorkStatusButtons`). 앱 상단의 근무 상태 표시·모달은 `src/components/WorkStatus*.tsx`에 있지만 같은 규칙을 따른다.
- 본인 근태 달력·통계
- 퇴근 누락 확인 모달(`MissedCheckoutModal`)
- 근무 요청(외근·재택·초과근무·근태 정정: `WorkRequestModal`, `ApprovalQueue`)
- 관리자 전체 근무현황·수정(`AttendanceAdminView`, `AdminAttendanceEditModal`)
- 서버 쪽: `src/app/api/attendance/*`(check-in, check-out, logs, status, stats, team-stats, work-requests, work-status, admin/*, auto-checkout, pending-auto-checkouts)

## 맡지 않는 것
- 휴가 일수·승인. 휴가 기능이 한다. 반차는 하루치 출근 기록을 만들지 않는다.
- 급여·초과근무 수당 계산. ERP 밖(세무사)의 일이다.

## 지켜야 할 것
- **날짜 기준**
  - 출근 기록은 한국 날짜 `work_date` 하나에 묶인다.
  - "오늘"은 `getTodayKST()`로 구한다.
  - 서버의 `new Date()`로 날짜 문자열을 만들면 자정~09시(KST)에 전날이 된다.
- **자동 퇴근**(크론 `/api/attendance/auto-checkout`, 매일 23:59 KST)
  - 대상: `check_out_at`이 비었고, `work_date`가 오늘보다 앞이거나 출근 후 16시간 이상 지난 기록
  - 퇴근 시각: 출근+9시간. 단, 그 `work_date`의 23:59:59 KST를 넘으면 23:59:59
  - 표시: `is_auto_checkout=true`, `is_modified=true`, `user_confirmed=false`, 사유 문구, 활동 기록 `auto_check_out`, 본인 알림
  - 이 조건 밖의 기록(오늘 출근, 16시간 미만)은 건드리지 않는다.
- **근무시간 계산**(`lib/workTimeCalculator.ts`): 기준 8시간, 점심 60분 차감, 기준 출근 09:00. 자동 퇴근의 "출근+9시간"은 8시간 근무 + 점심 1시간이다. 두 값을 따로 바꾸지 않는다.
- **권한**(DB RLS로 강제)
  - 본인 기록은 본인이 만들고 고친다.
  - 관리자는 전체를 보고 고친다.
  - 같은 사업부 manager는 팀원을 보고 고친다.
  - 뷰 `attendance_logs_with_user`는 운영 DB에서 아직 소유자 권한으로 돌아 이 RLS를 우회한다. 레포의 봉인 SQL이 적용되면 호출자 권한으로 바뀌어, 이 뷰로 다른 사람 근태를 읽던 조회는 RLS 범위만 받는다. 화면 조회에 이 뷰를 새로 쓰지 않는다.
- **퇴사자 제외**: 전체 근무현황·팀 통계는 `app_users.status='active'`만 센다. 퇴사자가 다시 나타나면 버그다.
- **위치 정보**: 출근 기록의 위치 필드는 현재 검증하지 않는다(`is_verified_location=false`). 위치로 출근을 막는 규칙은 없다.

## 테스트할 것
- 23:50 KST 출근 → 자동 퇴근 크론 → 퇴근이 23:59:59로 잘리는가.
- 전날 퇴근 누락 → 다음 날 로그인 시 확인 모달 → 사용자가 퇴근 시각을 정정(`/api/attendance/logs/[id]/correct-checkout`)하면 `user_confirmed=true`가 되는가.
- 크론을 같은 날 두 번 호출해도 이미 처리된 행이 다시 바뀌지 않는가.
- 다른 사업부 manager가 남의 기록을 수정할 수 없는가.
