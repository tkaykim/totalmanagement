-- Gowid Open API 멤버와 ERP 사용자를 매핑하는 테이블
CREATE TABLE IF NOT EXISTS gowid_user_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  erp_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gowid_user_id BIGINT NOT NULL,
  gowid_user_name TEXT NOT NULL,
  gowid_email TEXT,
  gowid_card_alias TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(erp_user_id),
  UNIQUE(gowid_user_id)
);

ALTER TABLE gowid_user_mapping ENABLE ROW LEVEL SECURITY;

-- admin만 매핑 테이블 관리 가능
CREATE POLICY "admin_manage_gowid_mapping"
  ON gowid_user_mapping FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- 본인 매핑 정보 조회 가능
CREATE POLICY "users_view_own_gowid_mapping"
  ON gowid_user_mapping FOR SELECT
  USING (erp_user_id = auth.uid());
