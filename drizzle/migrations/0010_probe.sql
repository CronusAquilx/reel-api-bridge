create table public._probe (id int primary key);
grant all on public._probe to service_role;
alter table public._probe enable row level security;