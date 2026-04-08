-- Gowid 지출내역과 ERP 프로젝트를 연결하는 테이블
CREATE TABLE IF NOT EXISTS gowid_expense_project_link (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gowid_expense_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  linked_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gowid_expense_id)
);

ALTER TABLE gowid_expense_project_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_manage_expense_project_link"
  ON gowid_expense_project_link FOR ALL
  USING (auth.uid() IS NOT NULL);
