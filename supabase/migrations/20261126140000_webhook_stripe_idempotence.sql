-- Webhook Stripe : idempotence (événements déjà traités) et paiements à rattacher manuellement.
-- Accès uniquement par la clé de service côté serveur : RLS activée, aucune politique.

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  recu_le timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

create table if not exists public.paiements_a_rattacher (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  email text,
  plan text,
  periodicite text,
  devise text,
  cree_le timestamptz not null default now(),
  traite boolean not null default false
);
alter table public.paiements_a_rattacher enable row level security;
comment on table public.paiements_a_rattacher is 'Paiements Stripe sans utilisateur reconnu (ni identifiant ni e-mail). Signalés dans l''admin, jamais supprimés.';
