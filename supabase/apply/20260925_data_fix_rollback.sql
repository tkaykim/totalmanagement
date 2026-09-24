-- =============================================================================
-- 20260925 데이터 보정 되돌리기: 20260925_data_fix.sql 이 pending 으로 바꾼 계정을 active 로 되돌린다
--
-- - 대상은 app_user_changes 기록으로 찾는다(field=status, active→pending, source=external, changed_by 없음)
--   그중 지금도 pending 이고 사업부가 비어 있는 계정만 되돌린다.
-- - 봉인 되돌리기(20260925_seal_rollback.sql)보다 먼저 실행한다(기록 테이블은 봉인 되돌리기 뒤에도 남는다).
-- =============================================================================

UPDATE public.app_users u
SET status = 'active'
WHERE u.status = 'pending'
  AND u.bu_code IS NULL
  AND EXISTS (
    SELECT 1 FROM public.app_user_changes c
    WHERE c.user_id = u.id
      AND c.field = 'status'
      AND c.old_value = 'active'
      AND c.new_value = 'pending'
      AND c.source = 'external'
      AND c.changed_by IS NULL
  );
