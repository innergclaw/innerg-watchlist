create table public.innerg_research_content (
  id text primary key check (id in ('news','brief','mover')),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.innerg_research_settings (id text primary key, value text not null);
create table public.innerg_research_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_email boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.innerg_research_deliveries (
  edition_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('sending','sent','failed','uncertain')),
  message_id text,
  updated_at timestamptz not null default now(),
  primary key (edition_id,user_id)
);
alter table public.innerg_research_content enable row level security;
alter table public.innerg_research_settings enable row level security;
alter table public.innerg_research_preferences enable row level security;
alter table public.innerg_research_deliveries enable row level security;
revoke all on public.innerg_research_content,public.innerg_research_settings,public.innerg_research_preferences,public.innerg_research_deliveries from anon,authenticated;
grant all on public.innerg_research_content,public.innerg_research_settings,public.innerg_research_preferences,public.innerg_research_deliveries to service_role;
