-- Add DEETZ as an ERP business unit and separate project ownership from delivery.
insert into public.business_units (code, name)
values ('DEETZ', 'deetz 에이전시')
on conflict (code) do update
set name = excluded.name;

alter table public.projects
  add column if not exists brand_bu_code public.bu_code,
  add column if not exists delivery_bu_code public.bu_code,
  add column if not exists artist_management_bu_code public.bu_code;

update public.projects
set
  brand_bu_code = coalesce(brand_bu_code, bu_code),
  delivery_bu_code = coalesce(delivery_bu_code, bu_code)
where brand_bu_code is null
   or delivery_bu_code is null;

alter table public.projects
  alter column brand_bu_code set not null,
  alter column delivery_bu_code set not null;

create or replace function public.set_project_bu_role_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.brand_bu_code := coalesce(new.brand_bu_code, new.bu_code);
  new.delivery_bu_code := coalesce(new.delivery_bu_code, new.bu_code);
  return new;
end;
$$;

drop trigger if exists projects_set_bu_role_defaults on public.projects;
create trigger projects_set_bu_role_defaults
before insert or update of bu_code, brand_bu_code, delivery_bu_code
on public.projects
for each row
execute function public.set_project_bu_role_defaults();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_brand_bu_code_fkey'
  ) then
    alter table public.projects
      add constraint projects_brand_bu_code_fkey
      foreign key (brand_bu_code) references public.business_units (code);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projects_delivery_bu_code_fkey'
  ) then
    alter table public.projects
      add constraint projects_delivery_bu_code_fkey
      foreign key (delivery_bu_code) references public.business_units (code);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projects_artist_management_bu_code_fkey'
  ) then
    alter table public.projects
      add constraint projects_artist_management_bu_code_fkey
      foreign key (artist_management_bu_code) references public.business_units (code);
  end if;
end
$$;

create index if not exists idx_projects_brand_bu_code
  on public.projects (brand_bu_code);
create index if not exists idx_projects_delivery_bu_code
  on public.projects (delivery_bu_code);
create index if not exists idx_projects_artist_management_bu_code
  on public.projects (artist_management_bu_code)
  where artist_management_bu_code is not null;

comment on column public.projects.bu_code is
  'External project P&L owner business unit.';
comment on column public.projects.brand_bu_code is
  'Brand or content owner business unit.';
comment on column public.projects.delivery_bu_code is
  'Business unit responsible for delivery or production.';
comment on column public.projects.artist_management_bu_code is
  'Business unit responsible for exclusive artist management and settlement.';

alter table public.financial_entries
  add column if not exists entry_scope text not null default 'external',
  add column if not exists counterparty_bu_code public.bu_code;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'financial_entries_entry_scope_check'
  ) then
    alter table public.financial_entries
      add constraint financial_entries_entry_scope_check
      check (
        (entry_scope = 'external' and counterparty_bu_code is null)
        or
        (entry_scope = 'internal_allocation'
          and counterparty_bu_code is not null
          and counterparty_bu_code <> bu_code)
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'financial_entries_counterparty_bu_code_fkey'
  ) then
    alter table public.financial_entries
      add constraint financial_entries_counterparty_bu_code_fkey
      foreign key (counterparty_bu_code) references public.business_units (code);
  end if;
end
$$;

alter table public.financial_entries
  validate constraint financial_entries_entry_scope_check;

create index if not exists idx_financial_entries_internal_counterparty
  on public.financial_entries (counterparty_bu_code, occurred_at)
  where entry_scope = 'internal_allocation';

comment on column public.financial_entries.entry_scope is
  'external is included in consolidated P&L; internal_allocation is eliminated in consolidated P&L.';
comment on column public.financial_entries.counterparty_bu_code is
  'The other internal BU for an internal allocation.';

-- deetz owns its channel content while REACT remains the production/delivery BU.
update public.projects
set
  bu_code = 'DEETZ',
  brand_bu_code = 'DEETZ',
  delivery_bu_code = 'REACT',
  artist_management_bu_code = case
    when trim(name) in (
      'deetz 4월 1회차 (nmixx-renan)',
      'DEET''Z - WDA 레난편',
      '디츠 레난 레모네이드 편'
    ) then 'GRIGO'::public.bu_code
    else null
  end
where trim(name) in (
  'deetz 채널 재개',
  'deetz 4월 1회차 (nmixx-renan)',
  'deetz 현세 편',
  'deetz 뱅갈편',
  'deetz wackxxy 편',
  'deetz 해인 & 유리 편',
  'DEET''Z - WDA 레난편',
  '디츠 레난 레모네이드 편'
);

-- AlphaDriveOne Beast is a DEETZ non-exclusive dancer casting/operation project.
update public.projects
set
  bu_code = 'DEETZ',
  brand_bu_code = 'DEETZ',
  delivery_bu_code = 'DEETZ',
  artist_management_bu_code = null
where name = '구도워크스_알파드라이브원 뮤비촬영_20260714';

update public.financial_entries
set bu_code = 'DEETZ'
where project_id = (
  select id
  from public.projects
  where name = '구도워크스_알파드라이브원 뮤비촬영_20260714'
  limit 1
)
and name = '뮤직비디오 현장 보조·개인 장비 활용 (이원영)';

-- REACT production fees billed to DEETZ are management-accounting allocations.
update public.financial_entries
set
  entry_scope = 'internal_allocation',
  counterparty_bu_code = 'DEETZ'
where bu_code = 'REACT'
  and kind = 'revenue'
  and amount = 1300000
  and project_id in (
    select id
    from public.projects
    where trim(name) in (
      'deetz 4월 1회차 (nmixx-renan)',
      'deetz 해인 & 유리 편',
      'DEET''Z - WDA 레난편'
    )
  );

-- Clobe transaction 140033924 confirms the Pop Off staff payment on 2026-08-07.
update public.financial_entries
set
  status = 'paid',
  paid_at = timestamptz '2026-08-07 18:06:00+09',
  payment_ref = 'clobe:140033924',
  memo = concat_ws(
    E'\n',
    nullif(memo, ''),
    '2026-08-10 Clobe 확인: 2026-08-07 이원영 145,050원 지급 완료, 거래 ID 140033924.'
  )
where project_id = (
  select id
  from public.projects
  where name = '라치카 ''Pop Off'' 촬영·편집'
  limit 1
)
and name = '현장 보조·편집 (이원영)'
and status = 'planned';
