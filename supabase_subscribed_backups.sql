create table if not exists subscribed_backups (
  id text primary key,
  name text not null,
  timestamp bigint not null,
  data jsonb not null
);
