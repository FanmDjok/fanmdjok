-- Utilitaire updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Territoires (table de référence, extensible au Pacifique / XPF plus tard)
create table public.territoires (
  code text primary key,
  nom text not null,
  devise text not null default 'EUR' check (devise in ('EUR','XPF')),
  fuseau text not null,
  actif boolean not null default true,
  ordre smallint not null default 0
);
insert into public.territoires (code, nom, devise, fuseau, actif, ordre) values
  ('martinique','Martinique','EUR','America/Martinique',true,1),
  ('guadeloupe','Guadeloupe','EUR','America/Guadeloupe',true,2),
  ('guyane','Guyane','EUR','America/Cayenne',true,3),
  ('reunion','La Réunion','EUR','Indian/Reunion',true,4),
  ('mayotte','Mayotte','EUR','Indian/Mayotte',false,5);

-- Formules (grille validée nov. 2026)
create table public.plans (
  code text primary key,
  nom text not null,
  prix_mensuel_eur numeric(10,2),          -- null = sur devis
  prix_annuel_eur numeric(10,2),           -- 2 mois offerts = 10 x mensuel
  max_biens integer,                       -- null = illimité
  sur_devis boolean not null default false,
  ordre smallint not null default 0
);
insert into public.plans (code, nom, prix_mensuel_eur, prix_annuel_eur, max_biens, sur_devis, ordre) values
  ('gratuit','Gratuit',0,0,1,false,1),
  ('essentiel','Essentiel',9,90,5,false,2),
  ('proprietaire','Propriétaire',19,190,15,false,3),
  ('investisseur','Investisseur',39,390,50,false,4),
  ('agence','Agences',null,null,null,true,5);

-- Profils
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  prenom text,
  nom text,
  territoire_principal text references public.territoires(code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Abonnements (écrits uniquement côté serveur : webhook Stripe / service role)
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null default 'gratuit' references public.plans(code),
  periodicite text not null default 'mensuel' check (periodicite in ('mensuel','annuel')),
  statut text not null default 'active'
    check (statut in ('trialing','active','past_due','canceled','incomplete')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  essai_fin timestamptz,
  periode_fin timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- À l'inscription : profil + formule Gratuite
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, prenom, nom)
  values (new.id, new.email,
          new.raw_user_meta_data->>'prenom',
          new.raw_user_meta_data->>'nom');
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.territoires enable row level security;
alter table public.plans enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

create policy "territoires lisibles par tous" on public.territoires
  for select to anon, authenticated using (true);
create policy "formules lisibles par tous" on public.plans
  for select to anon, authenticated using (true);

create policy "lire son profil" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "modifier son profil" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "lire son abonnement" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
