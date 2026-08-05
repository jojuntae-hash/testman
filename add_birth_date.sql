-- 수동으로 Supabase SQL editor에 입력하여 실행해야 하는 쿼리입니다.
ALTER TABLE subscribed_customers ADD COLUMN IF NOT EXISTS 생년월일 text;
