-- =============================================================================
-- 20260925 데이터 보정: 사업부 없는 재직(active) 계정 1건을 승인 대기(pending)로 바꾼다
--
-- - 대상은 조건으로 고른다: status='active' AND bu_code IS NULL. id·이메일을 적지 않는다(공개 저장소).
-- - 2026-09-24 조회 기준 대상은 정확히 1건이다. 2건 이상이면 중단한다(0건이면 아무것도 하지 않는다).
-- - 봉인 마이그레이션(20260925000000_unified_ops_seal.sql) 뒤에 실행한다.
--   app_users 변경 기록 트리거가 app_user_changes 에 status active→pending (source=external)을 남기고,
--   되돌리기(20260925_data_fix_rollback.sql)는 그 기록으로 대상을 찾는다.
-- - 운영 적용은 대표 승인 뒤, 20260925_seal_apply.sql 트랜잭션 안에서 실행한다.
-- =============================================================================

DO $data_fix$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.app_users
  WHERE status = 'active' AND bu_code IS NULL;

  IF v_count > 1 THEN
    RAISE EXCEPTION '데이터 보정 중단: 사업부 없는 재직 계정이 %건입니다(예상 1건).', v_count;
  END IF;

  UPDATE public.app_users
  SET status = 'pending'
  WHERE status = 'active' AND bu_code IS NULL;

  RAISE NOTICE '데이터 보정: %건을 pending 으로 변경', v_count;
END
$data_fix$;
