alter table public.innerg_memberships
  drop constraint if exists innerg_memberships_membership_number_key;

alter table public.innerg_memberships
  drop constraint if exists innerg_memberships_monthly_amount_cents_check;

alter table public.innerg_memberships
  drop column membership_number;

alter table public.innerg_memberships
  add column member_index bigint generated always as identity,
  add column membership_number text generated always as (
    'INNERG-' || lpad(member_index::text, 6, '0')
  ) stored,
  add column access_source text not null default 'stripe',
  add column payment_verified boolean not null default false,
  add column welcome_email_sent_at timestamptz,
  add column welcome_email_error text;

alter table public.innerg_memberships
  add constraint innerg_memberships_member_index_key unique (member_index),
  add constraint innerg_memberships_membership_number_key unique (membership_number),
  add constraint innerg_memberships_access_source_check
    check (access_source in ('grandfathered', 'stripe')),
  add constraint innerg_memberships_payment_rule_check
    check (
      (access_source = 'grandfathered' and monthly_amount_cents = 0)
      or
      (access_source = 'stripe' and monthly_amount_cents = 1000 and payment_verified)
    );

alter table public.watchlist_memberships
  drop constraint if exists watchlist_memberships_access_source_check;

alter table public.watchlist_memberships
  add constraint watchlist_memberships_access_source_check
    check (access_source in ('signup', 'stripe', 'innerg_membership', 'grandfathered', 'manual'));

alter table public.innerg_memberships enable row level security;

drop policy if exists "Members can view their own INNERG membership" on public.innerg_memberships;
create policy "Members can view their own INNERG membership"
on public.innerg_memberships
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.innerg_memberships to authenticated;

insert into public.innerg_memberships (
  user_id,
  status,
  membership_type,
  monthly_amount_cents,
  access_source,
  payment_verified,
  joined_at,
  updated_at
)
select
  users.id,
  'active',
  'grandfathered',
  0,
  'grandfathered',
  false,
  users.created_at,
  now()
from auth.users as users
join public.watchlist_memberships as access on access.user_id = users.id
where access.status = 'active'
  and access.access_source = 'grandfathered'
  and users.is_anonymous is not true
  and not exists (
    select 1
    from public.innerg_memberships as existing
    where existing.user_id = users.id
  )
order by users.created_at;
