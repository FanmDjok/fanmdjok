-- KAZONLY : abonnements. À exécuter après 0001_init.sql.

create table public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  trial_used boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_customer_id text not null,
  plan text not null check (plan in ('essentiel','proprietaire','portefeuille')),
  billing_interval text not null check (billing_interval in ('month','year')),
  status text not null,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Journal d'idempotence des webhooks Stripe
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

-- L'utilisateur lit uniquement son propre abonnement. Aucune écriture côté client :
-- seules les fonctions serveur (clé service) écrivent, via le webhook Stripe signé.
create policy "own subscription" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- Limite de biens selon la formule (essai, actif ou impayé en grâce).
create or replace function public.plan_property_limit(uid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case plan
      when 'essentiel' then 2
      when 'proprietaire' then 15
      when 'portefeuille' then 50
      else 0 end
    from public.subscriptions
    where user_id = uid and status in ('trialing','active','past_due')
  ), 0);
$$;

create or replace function public.enforce_property_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.properties where user_id = new.user_id) >= public.plan_property_limit(new.user_id) then
    raise exception 'limite_plan_atteinte' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger properties_plan_limit
  before insert on public.properties
  for each row execute function public.enforce_property_limit();

revoke all on function public.plan_property_limit(uuid) from public, anon;
grant execute on function public.plan_property_limit(uuid) to authenticated;
