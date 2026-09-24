# src/features/leave — 연차·대체휴무·특별휴가

## 맡는 것
- 본인 잔여(`LeaveBalanceCard`), 신청·취소(`LeaveRequestModal`, `LeaveRequestList`), 이력
- 대체휴무 생성 신청(`CompensatoryRequestModal`)
- 관리자 승인 큐(`LeaveApprovalQueue`), 관리자 부여·대리 소진(`AdminLeaveGrant`, `AdminLeaveUse`), 입사일 설정(`UserHireDateModal`), 팀 통계
- 일수 계산(`lib/leave-calculator.ts`)과 표시(`lib/format-leave-days.ts`)
- 서버 쪽: `src/app/api/leave/*`(requests, requests/[id]/approve·reject, balances, grants, compensatory, logs, pending, team-stats, auto-generate-monthly·yearly)

## 맡지 않는 것
- 출근 기록 자체. 다만 승인된 종일 휴가는 출근 기록을 만들고, 승인 취소는 그 기록을 지운다(아래).
- 급여·수당 계산.

## 지켜야 할 것
- **자동 부여**
  - 입사 1년 미만: 입사일로부터 매달 같은 날(그 날이 없는 달은 말일)에 1일, 최대 11일(월 크론, 09:00 KST).
  - 입사 1년 이상: 매년 1월 1일에 15일(연 크론).
  - 같은 날·같은 해에 두 번 부여하지 않는다.
  - `hire_date`가 없는 사람은 자동 부여 대상이 아니다.
- **근속 가산일 불일치**: `calculateAnnualLeave`는 가산일(floor((근속연수−1)/2), 최대 +10)을 더한다. 연 크론은 15일 고정이다. 둘 중 하나만 고치지 말고, 회사 방침이 확정되면 함께 맞춘다.
- **반차**
  - 반차(`half_am`·`half_pm`)는 연차 잔여에서 0.5일을 뺀다.
  - 대체반차(`comp_half_am`·`comp_half_pm`)는 대체휴무 잔여에서 0.5일을 뺀다.
  - 반차는 종료일이 시작일로 고정된다.
- **종일 휴가 목록**: 종일 휴가(`annual`·`compensatory`·`special`)만 승인 시 출근 기록을 만든다. 반차 4종은 이 목록(`isFullDayLeave`)에 넣지 않는다. 넣으면 반차 날 출근 기록이 휴가로 덮인다.
- **승인 권한**
  - 휴가 승인은 admin 전체, leader는 같은 사업부.
  - 대체휴무 생성 승인·특별휴가 부여·연차 수동 조정은 HEAD 사업부 admin만.
- **승인 부수 효과**
  - 승인하면 잔여(`leave_balances.used_days`)가 늘어나고 종일 휴가는 출근 기록이 생긴다.
  - 승인된 신청을 관리자가 지우면 잔여를 되돌리고 그 출근 기록을 지운다.
  - 이 처리는 RLS 때문에 서버 권한 키로 한다. 잔여·출근 기록을 브라우저에서 직접 고치는 경로를 만들지 않는다.
- **취소 권한**: 본인은 `pending` 상태의 본인 신청만 취소할 수 있다.
- **목록에서 빼는 사람**: 목록·통계에서 `status`가 `active`가 아닌 사람(퇴사·휴면)은 뺀다.
- **새 휴가 유형 추가 시 함께 고칠 곳**: enum 추가 → `types.ts`의 `getLeaveTypeFromRequestType`·라벨, `calculateDaysUsed`, 신청·대리소진 모달, 팀 통계, 알림 라벨을 한 커밋에서 고친다.

## 테스트할 것
- 반차 승인 → 잔여 0.5 감소, 출근 기록 미생성.
- 승인된 종일 휴가 삭제 → 잔여 복원, 해당 날짜 휴가 출근 기록 삭제.
- 다른 사업부 leader의 승인 시도 → 거부.
- 1월 31일 입사자의 2월 부여일.
