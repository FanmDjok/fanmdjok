-- Adaptation du schéma à l'application KAZONLY. Uniquement additive : aucune table ni donnée supprimée.

-- Les 11 territoires proposés par l'application (Mayotte actif, comme dans l'interface)
insert into public.territoires (code, nom, devise, fuseau, actif, ordre) values
  ('saint-martin','Saint-Martin','EUR','America/Marigot',true,6),
  ('saint-barthelemy','Saint-Barthélemy','EUR','America/St_Barthelemy',true,7),
  ('spm','Saint-Pierre-et-Miquelon','EUR','America/Miquelon',true,8),
  ('nouvelle-caledonie','Nouvelle-Calédonie','XPF','Pacific/Noumea',true,9),
  ('polynesie','Polynésie française','XPF','Pacific/Tahiti',true,10),
  ('wallis-futuna','Wallis-et-Futuna','XPF','Pacific/Wallis',true,11)
on conflict (code) do nothing;
update public.territoires set actif = true where code = 'mayotte';

-- Biens : champs saisis dans l'application
alter table public.biens
  add column if not exists numero text,
  add column if not exists rue text,
  add column if not exists type_location text not null default 'nue'
    check (type_location in ('nue','meublee','tourisme_classe','tourisme_non_classe')),
  add column if not exists loyer numeric(12,2) not null default 0 check (loyer >= 0),
  add column if not exists taux_occupation numeric(5,2) check (taux_occupation is null or taux_occupation between 0 and 100),
  add column if not exists locataire_nom text,
  add column if not exists locataire_telephone text,
  add column if not exists actif boolean not null default true,
  add column if not exists finance jsonb not null default '{}'::jsonb;

-- Mouvements : statut de paiement tel que suivi dans l'application (attente, recu, retard)
alter table public.mouvements
  add column if not exists statut_paiement text check (statut_paiement in ('attente','recu','retard'));

-- Abonnements : résiliation en fin de période
alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

-- Demandes de contact envoyées depuis le site vitrine (insertion publique, lecture réservée au service)
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  topic text,
  territory text,
  properties integer check (properties is null or properties >= 0),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);
alter table public.contact_requests enable row level security;
create policy "demandes de contact: insertion publique" on public.contact_requests
  for insert to anon, authenticated with check (true);
