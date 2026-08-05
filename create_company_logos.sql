-- [1] 회사 로고 관리용 테이블 생성
create table if not exists company_logos (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  logo_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- [2] 로컬 데이터 조회를 위해 RLS 비활성화 (기존 다른 테이블들과 동일)
alter table company_logos disable row level security;
