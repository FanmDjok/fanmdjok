-- Mouvements : réalisés ET prévus (base des prévisions de trésorerie)
create table public.mouvements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bien_id uuid not null,
  bail_id uuid,
  sens text not null check (sens in ('recette','depense')),
  categorie text not null check (categorie in (
    'loyer','charges_locatives','depot_garantie',
    'credit_immobilier','charges_copro','travaux','entretien',
    'taxe_fonciere','assurance','frais_gestion','energie','autre')),
  libelle text,
  montant numeric(12,2) not null check (montant > 0),
  date_operation date not null,
  statut text not null default 'realise' check (statut in ('prevu','realise','annule')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bien_id, owner_id) references public.biens(id, owner_id) on delete cascade,
  foreign key (bail_id, owner_id) references public.baux(id, owner_id) on delete set null (bail_id)
);
create index mouvements_owner_date_idx on public.mouvements(owner_id, date_operation);
create index mouvements_bien_idx on public.mouvements(bien_id, owner_id);
create index mouvements_bail_idx on public.mouvements(bail_id, owner_id);
create trigger mouvements_updated_at before update on public.mouvements
  for each row execute function public.set_updated_at();

-- Échéances / rappels par bien
create table public.echeances (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bien_id uuid not null,
  type_echeance text not null check (type_echeance in (
    'revision_loyer','fin_bail','assurance_pno','taxe_fonciere','dpe',
    'diagnostic','entretien','declaration_fiscale','saison_cyclonique','autre')),
  titre text not null,
  date_echeance date not null,
  rappel_jours_avant smallint not null default 30 check (rappel_jours_avant >= 0),
  fait boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bien_id, owner_id) references public.biens(id, owner_id) on delete cascade
);
create index echeances_owner_date_idx on public.echeances(owner_id, date_echeance) where not fait;
create index echeances_bien_idx on public.echeances(bien_id, owner_id);
create trigger echeances_updated_at before update on public.echeances
  for each row execute function public.set_updated_at();

-- Repères et alertes réglementaires par territoire (contenu géré par l'admin)
create table public.alertes_reglementaires (
  id uuid primary key default gen_random_uuid(),
  territoire text references public.territoires(code), -- null = tous les DROM
  categorie text not null check (categorie in (
    'location','fiscalite','diagnostics','assurance','climat','urbanisme','autre')),
  titre text not null,
  resume text not null,
  source_url text,
  date_effet date,
  publie boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index alertes_territoire_idx on public.alertes_reglementaires(territoire) where publie;
create trigger alertes_updated_at before update on public.alertes_reglementaires
  for each row execute function public.set_updated_at();

alter table public.mouvements enable row level security;
alter table public.echeances enable row level security;
alter table public.alertes_reglementaires enable row level security;

create policy "mouvements: propriétaire" on public.mouvements for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "echeances: propriétaire" on public.echeances for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "alertes publiées lisibles" on public.alertes_reglementaires
  for select to authenticated using (publie);

-- Vue trésorerie mensuelle (respecte la RLS de l'utilisateur)
create view public.tresorerie_mensuelle with (security_invoker = true) as
select
  owner_id,
  bien_id,
  date_trunc('month', date_operation)::date as mois,
  sum(montant) filter (where sens = 'recette' and statut = 'realise') as recettes_realisees,
  sum(montant) filter (where sens = 'depense' and statut = 'realise') as depenses_realisees,
  sum(montant) filter (where sens = 'recette' and statut = 'prevu')   as recettes_prevues,
  sum(montant) filter (where sens = 'depense' and statut = 'prevu')   as depenses_prevues,
  coalesce(sum(case when sens = 'recette' then montant else -montant end)
           filter (where statut <> 'annule'), 0) as solde_net
from public.mouvements
group by owner_id, bien_id, date_trunc('month', date_operation);

-- Génère les loyers prévus d'un bail sur N mois (pour la prévision)
create or replace function public.generer_loyers_prevus(p_bail_id uuid, p_nb_mois int default 12)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  b public.baux%rowtype;
  d date;
  n int := 0;
  i int;
begin
  select * into b from public.baux where id = p_bail_id and owner_id = (select auth.uid());
  if not found then raise exception 'Bail introuvable'; end if;
  if p_nb_mois < 1 or p_nb_mois > 36 then raise exception 'Entre 1 et 36 mois'; end if;
  for i in 0..p_nb_mois - 1 loop
    d := (date_trunc('month', greatest(b.date_debut, current_date)) + make_interval(months => i))::date
         + (b.jour_echeance - 1);
    exit when b.date_fin is not null and d > b.date_fin;
    if not exists (select 1 from public.mouvements m
                   where m.bail_id = b.id and m.categorie = 'loyer'
                     and date_trunc('month', m.date_operation) = date_trunc('month', d)) then
      insert into public.mouvements (owner_id, bien_id, bail_id, sens, categorie, libelle, montant, date_operation, statut)
      values (b.owner_id, b.bien_id, b.id, 'recette', 'loyer',
              'Loyer ' || to_char(d, 'MM/YYYY'), b.loyer_hc + b.charges, d, 'prevu');
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.generer_loyers_prevus(uuid, int) from public, anon;
grant execute on function public.generer_loyers_prevus(uuid, int) to authenticated;
