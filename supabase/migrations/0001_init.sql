-- KAZONLY : schéma initial. À exécuter une fois dans Supabase (SQL Editor) sur le projet dédié.

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  numero text not null default '',
  rue text not null,
  code_postal text not null check (code_postal ~ '^[0-9]{5}$'),
  territoire text not null check (territoire in (
    'guadeloupe','martinique','guyane','reunion','mayotte','saint-martin',
    'saint-barthelemy','spm','nouvelle-caledonie','polynesie','wallis-futuna')),
  currency text not null check (currency in ('EUR','XPF')),
  type_location text not null check (type_location in ('nue','meublee','tourisme_classe','tourisme_non_classe')),
  loyer numeric(14,2) not null check (loyer > 0),
  taux_occupation numeric(5,2),
  locataire_nom text,
  locataire_phone text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  -- la devise découle toujours du territoire
  constraint currency_matches_territory check (
    (territoire in ('nouvelle-caledonie','polynesie','wallis-futuna')) = (currency = 'XPF')
  )
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount numeric(14,2) not null check (amount >= 0),
  status text not null default 'attente' check (status in ('attente','recu','retard')),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  note text,
  created_at timestamptz not null default now()
);

create index on public.properties (user_id);
create index on public.payments (user_id, month);
create index on public.expenses (user_id, month);

-- Sécurité : chaque utilisateur ne voit et ne modifie que ses propres lignes.
alter table public.properties enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

create policy "own properties" on public.properties for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own payments" on public.payments for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.properties p where p.id = property_id and p.user_id = (select auth.uid())));
create policy "own expenses" on public.expenses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.properties p where p.id = property_id and p.user_id = (select auth.uid())));
