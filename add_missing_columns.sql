-- Supabase SQL Editor에서 실행해주셔야 하는 통합 쿼리입니다.
ALTER TABLE subscribed_customers ADD COLUMN IF NOT EXISTS 이름 text;
ALTER TABLE subscribed_customers ADD COLUMN IF NOT EXISTS 약정 text;
ALTER TABLE subscribed_customers ADD COLUMN IF NOT EXISTS 가입유형 text;
ALTER TABLE subscribed_customers ADD COLUMN IF NOT EXISTS 월렌탈료 text;
ALTER TABLE subscribed_customers ADD COLUMN IF NOT EXISTS 생년월일 text;
