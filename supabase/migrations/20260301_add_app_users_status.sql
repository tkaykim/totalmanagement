-- 휴면/퇴사 구분: active(재직), dormant(휴면), retired(퇴사)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_status_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_status_check CHECK (status IN ('active', 'dormant', 'retired'));
COMMENT ON COLUMN app_users.status IS 'active: 재직, dormant: 휴면, retired: 퇴사';
