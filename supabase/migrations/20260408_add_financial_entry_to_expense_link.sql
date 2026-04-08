-- gowid_expense_project_link에 연동된 financial_entry 추적 칼럼 추가
ALTER TABLE gowid_expense_project_link
  ADD COLUMN IF NOT EXISTS financial_entry_id BIGINT REFERENCES financial_entries(id) ON DELETE SET NULL;

ALTER TABLE gowid_expense_project_link
  ADD COLUMN IF NOT EXISTS expense_amount BIGINT;

ALTER TABLE gowid_expense_project_link
  ADD COLUMN IF NOT EXISTS expense_store_name TEXT;

ALTER TABLE gowid_expense_project_link
  ADD COLUMN IF NOT EXISTS expense_date DATE;
