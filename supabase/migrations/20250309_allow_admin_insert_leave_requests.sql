-- 관리자 대리 휴가 소진 시 leave_requests INSERT 허용
-- 기존 "Users can create own leave requests"는 본인만 생성 가능하므로 유지
CREATE POLICY "Admins can create leave requests for any user" ON leave_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
