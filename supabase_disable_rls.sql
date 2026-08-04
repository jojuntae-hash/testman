-- 가입고객 관련 테이블의 RLS(행 보안) 비활성화
alter table subscribed_customers disable row level security;
alter table subscribed_backups disable row level security;
