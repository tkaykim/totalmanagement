# 버그 리포트 #22, #18, #3 처리 완료 처리 및 푸시 알림 검증

## 1. 처리 완료 반영 (DB)

다음 3건을 **status = 'resolved'(처리완료)** 로 반영했습니다.

| ID | 제목 | 신고자(reporter_id) | 처리 시각 |
|----|------|---------------------|-----------|
| 22 | 근무시간 정정 상세내역이 관리자에게 보였으면 좋겠습니다 | 4f586f7d-... (김민정) | 2026-03-03 06:36:56 UTC |
| 18 | 프로젝트 수정 오류 | bec30ed1-... (장선우) | 2026-03-03 06:36:56 UTC |
| 3 | 프로젝트 날짜 지정 시 오류 | beabf56b-... (김현준) | 2026-03-03 06:36:56 UTC |

- 적용 방법: Supabase `bug_reports` 테이블 직접 UPDATE (SQL).

---

## 2. 푸시 알림 발송 조건

- **알림이 나가는 경우**: 관리자/리더가 **앱 UI에서** 버그 리포트 상태를 "처리완료"로 변경할 때만.
- **호출 경로**: `PATCH /api/bug-reports/[id]` (body: `{ status: 'resolved' }`)  
  → `notifyBugReportResolved(reporter_id, title, id)`  
  → `createNotification()` → `notifications` INSERT + `sendPushToUser()` (FCM/Edge Function).

---

## 3. 이번 3건에 대한 알림 여부

- 이번 3건은 **DB에서 직접 UPDATE**로만 처리완료 처리했기 때문에 **PATCH API가 호출되지 않았고, 따라서 푸시/인앱 알림은 발송되지 않았습니다.**
- `notifications` 테이블 조회 결과, `entity_type = 'bug_report'` 인 알림 레코드는 아직 없습니다. (기능 추가 후 UI에서 “처리완료”로 바꾼 적이 없거나, 아직 한 번도 사용되지 않은 상태로 보임.)

---

## 4. 푸시 알림 로직 검증 결과

- **코드 경로**: `src/app/api/bug-reports/[id]/route.ts`  
  - `body.status === 'resolved'` 이고 `data.reporter_id`, `data.title` 이 있을 때  
  - `notifyBugReportResolved(data.reporter_id, data.title, data.id)` 호출 후  
  - `createNotification()` 에서 `notifications` INSERT + `sendPushToUser()` 호출.
- **정상 동작 조건**:  
  - 관리자/리더가 버그 리포트 화면에서 해당 건의 상태를 "처리완료"로 변경하면,  
  - 신고자(`reporter_id`)에게  
    - 인앱 알림 1건 생성  
    - FCM(또는 Supabase Edge Function `send-push`)으로 푸시 발송  
  이 동작하도록 구현되어 있습니다.

---

## 5. 푸시가 실제로 잘 나가는지 확인하는 방법

1. **UI로 한 건 검증**
   - 버그 리포트 중 한 건을 먼저 "보류" 등으로 바꾼 뒤,
   - 다시 "처리완료"로 변경합니다.
   - 해당 버그의 **신고자 계정**으로 로그인한 기기/앱에서:
     - 인앱 알림 목록에 "버그 리포트가 처리 완료되었습니다" 알림이 쌓이는지,
     - 푸시 알림이 오는지 확인하면 됩니다.
2. **DB로 인앱 알림만 확인**
   - UI에서 "처리완료"로 변경한 직후에  
     `SELECT * FROM notifications WHERE entity_type = 'bug_report' ORDER BY created_at DESC LIMIT 5;`  
     로 새 행이 생겼는지 확인할 수 있습니다.

---

## 6. 요약

- **#22, #18, #3** → DB 기준 **처리 완료(resolved)** 반영 완료.
- 이번에는 **SQL로만 처리**해서 **접수한 사람(김민정, 장선우, 김현준)에게는 푸시/인앱 알림이 발송되지 않았음.**
- **알림은 “UI에서 처리완료로 변경”할 때만 발송**되며, 해당 경로의 코드는 위와 같이 정상 연결되어 있음.
- 푸시가 실제로 잘 나가는지는 위 5번 방법으로 한 건만 UI에서 처리완료로 바꿔서 확인하면 됩니다.
