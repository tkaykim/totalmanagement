-- 0014_add_client_type_and_team_id.sql
-- GRIGOENT 거래처(클라이언트)를 팀/개인으로 구분하고 팀 소속 관계를 표현하기 위한 스키마 변경

-- 1) clients 테이블에 client_type 컬럼 추가 (개인/팀 구분)
ALTER TABLE clients
  ADD COLUMN client_type text NOT NULL DEFAULT 'individual';

-- 2) clients 테이블에 team_id 컬럼 추가 (소속 팀 연결)
ALTER TABLE clients
  ADD COLUMN team_id bigint REFERENCES clients(id);

-- 3) team_id 인덱스 생성 (팀 소속 조회 성능)
CREATE INDEX idx_clients_team_id ON clients(team_id);


