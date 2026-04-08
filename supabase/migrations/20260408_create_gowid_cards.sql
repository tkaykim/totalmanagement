-- 법인카드 ERP 별칭 관리 테이블
CREATE TABLE IF NOT EXISTS gowid_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gowid_alias TEXT NOT NULL UNIQUE,
  short_card_number TEXT,
  card_number TEXT,
  card_user_name TEXT,
  card_name TEXT,
  card_type TEXT,
  erp_alias TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gowid_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_gowid_cards"
  ON gowid_cards FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_manage_gowid_cards"
  ON gowid_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );
