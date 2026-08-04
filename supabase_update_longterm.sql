alter table long_term_customers
add column if not exists 계약만료일 text,
add column if not exists 최종작업내용 text;
