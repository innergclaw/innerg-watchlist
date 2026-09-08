create table if not exists public.innerg_research_editions (
  id text primary key,
  subject text not null,
  body_text text not null,
  created_at timestamptz not null default now()
);
alter table public.innerg_research_editions enable row level security;
revoke all on public.innerg_research_editions from anon, authenticated;
grant all on public.innerg_research_editions to service_role;
