# src/features/reservations — 회의실·장비·차량 예약

## 맡는 것
- 예약 달력·목록·생성·수정·취소(`ReservationsView`, `ReservationModal`, `MonthlyCalendar`, `DayDetailModal`), 반복 예약(`RecurrenceSelector`)
- 장비 대여(여러 장비 한 번에: `MultiEquipmentRentalModal`, `EquipmentRentalView`)
- 차량 운행 일지(`VehicleLogView`), 회의실(`MeetingRoomView`)
- 자원 관리(`ResourceManageModal`)
- 서버 쪽: `src/app/api/reservations`, `meeting-rooms`, `equipment`, `vehicles`

## 맡지 않는 것
- 외부 스튜디오·연습실 예약(공집사·스페이스클라우드 등). 이 기능은 사내 자원만 다룬다.

## 지켜야 할 것
- **겹침 방지는 DB 트리거가 최종 판정한다**(`prevent_reservation_overlap` → `check_reservation_overlap`).
  - 회의실·차량: 같은 자원의 `active` 예약과 시간이 겹치면 거부
  - 장비: 겹치는 시간대 예약 수량 합 + 요청 수량이 `equipment.quantity`를 넘으면 거부
  - `cancelled` 예약은 계산에서 뺀다
  - 화면의 사전 검사는 편의 기능이다. 트리거가 내는 한국어 오류 메시지를 그대로 사용자에게 보여 준다.
- **예약자 사업부**: 소속 사업부(`bu_code`)가 없는 사용자는 예약할 수 없다(`check_reserver_authorization` 트리거).
- **취소는 삭제가 아니다**: 예약 취소는 `status='cancelled'`로 바꾼다.
- **자원 관리**
  - 회의실·차량·장비 자원의 추가·수정·삭제는 admin만 한다.
  - `meeting-rooms/[id]`, `vehicles/[id]`의 PATCH는 요청 본문을 통째로 update에 넘긴다. 고칠 때는 허용 컬럼 목록으로 바꾼다.
- **프로젝트 연결**: 예약은 프로젝트를 선택해 연결할 수 있다(`reservations.project_id`). 프로젝트가 지워지면 연결만 비워지고 예약은 남는다.

## 테스트할 것
- 같은 차량 10:00–12:00 예약이 있을 때 11:00–13:00 예약 → 거부.
- 수량 3개 장비에 2개 대여 중일 때 2개 추가 요청 → 거부, 1개 → 허용.
- 반복 예약 중 한 회차가 겹치면 전체가 어떻게 처리되는지.
- 사업부 없는 사용자 예약 → 거부.
