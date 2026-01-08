/* [Schema v2.0 - GRIGO ERP Final] */

-- [1. 확장 및 ENUM 정의]
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 부서 (NULL 허용을 위해 ENUM 대신 테이블 참조 권장하지만, 간편함을 위해 ENUM 유지)
CREATE TYPE public.bu_code AS ENUM ('GRIGO', 'REACT', 'MODOO', 'AST', 'HEAD', 'FLOW');
-- 프로젝트 상태
CREATE TYPE public.project_status AS ENUM ('준비중', '기획중', '진행중', '운영중', '편집완료', '완료', '보류', '취소');
-- 사용자 등급 (권한 레벨)
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'MANAGER', 'MEMBER', 'VIEWER');
-- 결제 수단
CREATE TYPE public.payment_method AS ENUM ('CARD', 'CASH', 'TRANSFER');
-- 과세 유형 (★추가됨)
CREATE TYPE public.tax_type AS ENUM ('VAT', 'FREE', 'WITHHOLDING_3.3'); 
-- 재무 상태
CREATE TYPE public.financial_status AS ENUM ('PLANNED', 'ISSUED', 'COMPLETED', 'CANCELED');

-- [2. 마스터 데이터: 거래처 & 인물]
-- 거래처 (기업)
CREATE TABLE public.partner_company (
    id bigserial PRIMARY KEY,
    company_name_ko text NOT NULL,
    business_registration_number text, -- 사업자번호
    representative_name text,
    type text DEFAULT 'CLIENT', -- CLIENT, VENDOR
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 거래처 담당자
CREATE TABLE public.partner_worker (
    id bigserial PRIMARY KEY,
    partner_company_id bigint REFERENCES public.partner_company(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    email text,
    role text, -- 직급
    created_at timestamp with time zone DEFAULT now()
);

-- 아티스트 (부서 종속성 없음)
CREATE TABLE public.artists (
    id bigserial PRIMARY KEY,
    name text NOT NULL, -- 예명
    real_name text, -- 실명 (정산용)
    type text NOT NULL DEFAULT 'individual', -- individual, team
    job_titles text[] DEFAULT '{}', -- ['DANCER', 'INFLUENCER']
    agency_id bigint REFERENCES public.partner_company(id), -- 소속사 (GRIGO일 수도 있음)
    details jsonb DEFAULT '{}'::jsonb, -- 계좌번호, 주민번호 등 민감정보
    created_at timestamp with time zone DEFAULT now()
);

-- [3. 내부 직원 (권한 관리 핵심)]
CREATE TABLE public.app_users (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    name text NOT NULL,
    email text UNIQUE,
    bu_code public.bu_code, -- NULL이면 외주/프리랜서
    role public.user_role DEFAULT 'VIEWER', -- 기본 권한
    artist_id bigint REFERENCES public.artists(id), -- 아티스트 겸직 시 매핑
    created_at timestamp with time zone DEFAULT now()
);

-- [4. 프로젝트 (업무의 중심)]
CREATE TABLE public.projects (
    id bigserial PRIMARY KEY,
    bu_code public.bu_code NOT NULL, -- 주관 부서
    name text NOT NULL,
    pm_id uuid REFERENCES public.app_users(id), -- 총괄 책임자
    
    start_date date,
    due_date date,
    
    -- [참여자] JSONB로 유연하게 관리 + 인덱싱
    -- 예: [{"id": 1, "type": "ARTIST", "role": "Main"}, {"id": "uuid...", "type": "USER", "role": "Sub PM"}]
    participants jsonb DEFAULT '[]'::jsonb, 
    
    status public.project_status DEFAULT '준비중',
    milestones jsonb DEFAULT '[]'::jsonb, -- 주요 일정
    created_at timestamp with time zone DEFAULT now()
);

-- [5. 프로젝트 할 일 (크로스 부서 권한의 열쇠)]
CREATE TABLE public.project_tasks (
    id bigserial PRIMARY KEY,
    project_id bigint NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    status text DEFAULT 'PENDING',
    assignee_id uuid REFERENCES public.app_users(id), -- 담당자 (이 사람이 지정되면 타 부서 프로젝트라도 열람 가능)
    due_date date,
    created_at timestamp with time zone DEFAULT now()
);

-- [6. 재무 (정산 및 세금)]
CREATE TABLE public.financial_entries (
    id bigserial PRIMARY KEY,
    project_id bigint NOT NULL REFERENCES public.projects(id),
    bu_code public.bu_code NOT NULL, -- 비용 발생 부서
    
    kind text NOT NULL, -- 'REVENUE'(매출), 'EXPENSE'(지출)
    transaction_date date NOT NULL, -- 거래 발생일
    
    -- [★세금/금액 계산 핵심]
    tax_type public.tax_type NOT NULL DEFAULT 'VAT', -- 과세, 면세, 3.3%
    supply_price bigint NOT NULL DEFAULT 0, -- 공급가
    tax_amount bigint NOT NULL DEFAULT 0, -- 세액 (면세는 0, 3.3%는 음수)
    total_amount bigint NOT NULL DEFAULT 0, -- 실 지급/수령액
    
    title text NOT NULL, -- 적요 (예: 댄서 출연료)
    
    -- 거래 대상 (하나만 NOT NULL)
    partner_company_id bigint REFERENCES public.partner_company(id),
    artist_id bigint REFERENCES public.artists(id),
    employee_id uuid REFERENCES public.app_users(id),
    
    payment_method public.payment_method, -- 증빙 종류
    status public.financial_status DEFAULT 'PLANNED',
    
    created_by uuid REFERENCES public.app_users(id), -- 작성자 (권한 체크용)
    is_confidential boolean DEFAULT false, -- 보안 유지 필요 여부
    created_at timestamp with time zone DEFAULT now()
);

-- [인덱스 설정]
CREATE INDEX idx_projects_participants ON public.projects USING GIN (participants);
CREATE INDEX idx_tasks_assignee ON public.project_tasks(assignee_id);
CREATE INDEX idx_finance_project ON public.financial_entries(project_id);