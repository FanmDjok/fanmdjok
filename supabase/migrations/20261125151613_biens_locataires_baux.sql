create table public.biens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nom text not null,
  territoire text not null references public.territoires(code),
  type_bien text not null default 'appartement'
    check (type_bien in ('appartement','maison','studio','local_commercial','terrain','autre')),
  adresse text,
  code_postal text,
  ville text,
  surface_m2 numeric(8,2) check (surface_m2 is null or surface_m2 > 0),
  nb_pieces smallint check (nb_pieces is null or nb_pieces >= 0),
  meuble boolean not null default false,
  regime_fiscal text check (regime_fiscal in ('location_nue','lmnp','lmp','sci_ir','sci_is','autre')),
  statut text not null default 'vacant' check (statut in ('vacant','loue','travaux','vente')),
  prix_achat numeric(12,2),
  date_achat date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);
create index biens_owner_idx on public.biens(owner_id);
create index biens_territoire_idx on public.biens(territoire);
create trigger biens_updated_at before update on public.biens
  for each row execute function public.set_updated_at();

-- Limite de biens selon la formule
create or replace function public.check_limite_biens()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_max integer;
  v_count integer;
begin
  select p.max_biens into v_max
  from public.subscriptions s join public.plans p on p.code = s.plan_code
  where s.user_id = new.owner_id
    and s.statut in ('trialing','active','past_due');
  if not found then
    v_max := 1; -- par défaut : Gratuit
  end if;
  if v_max is null then return new; end if; -- illimité
  select count(*) into v_count from public.biens where owner_id = new.owner_id;
  if v_count >= v_max then
    raise exception 'LIMITE_BIENS: votre formule permet % bien(s). Passez à la formule supérieure pour en ajouter.', v_max
      using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.check_limite_biens() from public, anon, authenticated;
create trigger biens_limite before insert on public.biens
  for each row execute function public.check_limite_biens();

create table public.locataires (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prenom text,
  nom text not null,
  email text,
  telephone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);
create index locataires_owner_idx on public.locataires(owner_id);
create trigger locataires_updated_at before update on public.locataires
  for each row execute function public.set_updated_at();

create table public.baux (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bien_id uuid not null,
  locataire_id uuid,
  type_bail text not null default 'vide'
    check (type_bail in ('vide','meuble','mobilite','saisonnier','commercial','autre')),
  date_debut date not null,
  date_fin date,
  loyer_hc numeric(10,2) not null check (loyer_hc >= 0),
  charges numeric(10,2) not null default 0 check (charges >= 0),
  depot_garantie numeric(10,2) default 0,
  jour_echeance smallint not null default 5 check (jour_echeance between 1 and 28),
  date_revision date,
  statut text not null default 'actif' check (statut in ('brouillon','actif','termine')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  check (date_fin is null or date_fin > date_debut),
  -- garantit que le bien et le locataire appartiennent au même propriétaire
  foreign key (bien_id, owner_id) references public.biens(id, owner_id) on delete cascade,
  foreign key (locataire_id, owner_id) references public.locataires(id, owner_id) on delete set null (locataire_id)
);
create index baux_owner_idx on public.baux(owner_id);
create index baux_bien_idx on public.baux(bien_id, owner_id);
create index baux_locataire_idx on public.baux(locataire_id, owner_id);
create trigger baux_updated_at before update on public.baux
  for each row execute function public.set_updated_at();

alter table public.biens enable row level security;
alter table public.locataires enable row level security;
alter table public.baux enable row level security;

create policy "biens: propriétaire" on public.biens for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "locataires: propriétaire" on public.locataires for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "baux: propriétaire" on public.baux for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
