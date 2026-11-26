-- Espace admin : droit réservé aux comptes listés dans app_admins ET connectés avec la double authentification (aal2).
-- Aucune table admin n'est lisible directement : tout passe par des fonctions qui vérifient le droit en premier.

create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
     and exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()));
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table public.admin_audit_log (
  id bigserial primary key,
  admin_id uuid,
  action text not null,
  cible text,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;

create or replace function public.journaliser_admin(p_action text, p_cible text, p_details jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.admin_audit_log (admin_id, action, cible, details)
  values ((select auth.uid()), p_action, p_cible, p_details);
$$;
revoke execute on function public.journaliser_admin(text, text, jsonb) from public, anon, authenticated;

-- Demandes de contact : statut de traitement.
alter table public.contact_requests add column if not exists statut text not null default 'a_traiter'
  check (statut in ('a_traiter', 'traite'));

-- Repères réglementaires : source obligatoire, date de revérification.
alter table public.alertes_reglementaires add column if not exists verifier_avant date;
alter table public.alertes_reglementaires add constraint reperes_source_obligatoire
  check (source_url is not null and source_url like 'https://%') not valid;

-- Indices IRL saisis chaque trimestre.
create table public.irl_indices (
  id uuid primary key default gen_random_uuid(),
  trimestre text not null unique check (trimestre ~ '^[0-9]{4}-T[1-4]$'),
  valeur numeric(8,2) not null check (valeur > 0),
  date_publication date not null,
  lien_insee text not null check (char_length(lien_insee) between 10 and 500),
  created_at timestamptz not null default now()
);
alter table public.irl_indices enable row level security;

-- Journal des e-mails (rempli par l'envoi Brevo, phase 3). Destinataire haché, jamais en clair.
create table public.email_log (
  id bigserial primary key,
  type text not null,
  destinataire_hash text not null,
  statut text not null,
  created_at timestamptz not null default now()
);
alter table public.email_log enable row level security;

-- Tâches planifiées : dernière exécution et statut, mis à jour par les tâches elles-mêmes.
create table public.taches_planifiees (
  nom text primary key,
  derniere_execution timestamptz,
  statut text not null default 'jamais' check (statut in ('jamais', 'ok', 'echec')),
  message text check (message is null or char_length(message) <= 500),
  updated_at timestamptz not null default now()
);
alter table public.taches_planifiees enable row level security;

-- Vérification du droit en tête de chaque fonction d'administration.
create or replace function public.est_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin();
$$;
revoke execute on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated;

create or replace function public.admin_vue_ensemble()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  select jsonb_build_object(
    'inscrits_total', (select count(*) from public.profiles),
    'inscrits_7j', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'inscrits_30j', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'payants', (select count(*) from public.subscriptions where plan_code <> 'gratuit' and statut in ('active', 'trialing', 'past_due')),
    'essais', (select count(*) from public.subscriptions where statut = 'trialing'),
    'revenu_mensuel_eur', (select coalesce(round(sum(case when s.periodicite = 'annuel' then p.prix_annuel_eur / 12 else p.prix_mensuel_eur end), 2), 0)
                           from public.subscriptions s join public.plans p on p.code = s.plan_code
                           where s.plan_code <> 'gratuit' and s.statut in ('active', 'trialing', 'past_due')),
    'resiliations_mois', (select count(*) from public.subscriptions where statut = 'canceled' and updated_at >= date_trunc('month', now())),
    'biens_crees_mois', (select count(*) from public.biens where created_at >= date_trunc('month', now())),
    'biens_total', (select count(*) from public.biens)
  ) into r;
  return r;
end $$;

create or replace function public.admin_parcours()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return jsonb_build_object(
    'inscrits', (select count(*) from public.profiles),
    'avec_bien', (select count(distinct owner_id) from public.biens),
    'avec_bail', (select count(distinct owner_id) from public.baux),
    'abonnes_payants', (select count(*) from public.subscriptions where plan_code <> 'gratuit' and statut in ('active', 'trialing', 'past_due')),
    'inscrits_30j', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'avec_bien_30j', (select count(distinct b.owner_id) from public.biens b join public.profiles p on p.id = b.owner_id where p.created_at > now() - interval '30 days'),
    'payants_30j', (select count(*) from public.subscriptions s join public.profiles p on p.id = s.user_id
                    where p.created_at > now() - interval '30 days' and s.plan_code <> 'gratuit' and s.statut in ('active', 'trialing', 'past_due'))
  );
end $$;

create or replace function public.admin_inscriptions_par_jour()
returns table (jour date, inscriptions bigint) language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return query
    select d::date, (select count(*) from public.profiles p where p.created_at::date = d::date)
    from generate_series(current_date - 29, current_date, interval '1 day') d
    order by 1;
end $$;

create or replace function public.admin_utilisateurs(p_recherche text default '', p_plan text default '', p_limite int default 100)
returns table (id uuid, email text, prenom text, territoire text, plan text, statut text, nb_biens bigint, created_at timestamptz, derniere_connexion timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return query
    select p.id, p.email, p.prenom, p.territoire_principal, s.plan_code, s.statut,
           (select count(*) from public.biens b where b.owner_id = p.id),
           p.created_at, u.last_sign_in_at
    from public.profiles p
    left join public.subscriptions s on s.user_id = p.id
    left join auth.users u on u.id = p.id
    where (p_recherche = '' or p.email ilike '%' || p_recherche || '%' or p.nom ilike '%' || p_recherche || '%')
      and (p_plan = '' or s.plan_code = p_plan)
    order by p.created_at desc
    limit least(greatest(p_limite, 1), 500);
end $$;

create or replace function public.admin_abonnements()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return jsonb_build_object(
    'par_formule', (select coalesce(jsonb_agg(x), '[]') from (
        select s.plan_code, s.periodicite, count(*) as n from public.subscriptions s
        where s.statut in ('active', 'trialing', 'past_due') group by 1, 2 order by 1, 2) x),
    'essais_finissent_7j', (select count(*) from public.subscriptions where statut = 'trialing' and essai_fin between now() and now() + interval '7 days'),
    'past_due', (select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'plan', plan_code)), '[]') from public.subscriptions where statut = 'past_due'),
    'resiliations_30j', (select count(*) from public.subscriptions where statut = 'canceled' and updated_at > now() - interval '30 days')
  );
end $$;

create or replace function public.admin_utilisation()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return jsonb_build_object(
    'biens_par_territoire', (select coalesce(jsonb_agg(x), '[]') from (
        select territoire, count(*) as n from public.biens group by 1 order by 2 desc) x),
    'baux_actifs', (select count(*) from public.baux where statut = 'actif'),
    'comptes_sans_bien', (select count(*) from public.profiles p where not exists (select 1 from public.biens b where b.owner_id = p.id)),
    'inactifs_30j', (select count(*) from auth.users u where u.last_sign_in_at < now() - interval '30 days'),
    'a_atteint_limite', (select count(*) from public.subscriptions s
        join public.plans pl on pl.code = s.plan_code
        where pl.max_biens is not null and (select count(*) from public.biens b where b.owner_id = s.user_id) >= pl.max_biens)
  );
end $$;

create or replace function public.admin_messages()
returns table (id uuid, name text, email text, topic text, territory text, properties int, message text, statut text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return query
    select c.id, c.name, c.email, c.topic, c.territory, c.properties, c.message, c.statut, c.created_at
    from public.contact_requests c order by c.created_at desc limit 200;
end $$;

create or replace function public.admin_message_statut(p_id uuid, p_statut text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  if p_statut not in ('a_traiter', 'traite') then raise exception 'statut_invalide'; end if;
  update public.contact_requests set statut = p_statut where id = p_id;
  perform public.journaliser_admin('message_statut', p_id::text, jsonb_build_object('statut', p_statut));
end $$;

create or replace function public.admin_reperes()
returns table (id uuid, territoire text, categorie text, titre text, resume text, source_url text, date_effet date, verifier_avant date, publie boolean, a_revalider boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return query
    select a.id, a.territoire, a.categorie, a.titre, a.resume, a.source_url, a.date_effet, a.verifier_avant, a.publie,
           (a.verifier_avant is not null and a.verifier_avant < current_date)
    from public.alertes_reglementaires a order by a.created_at desc;
end $$;

create or replace function public.admin_repere_enregistrer(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_publie boolean := coalesce((p->>'publie')::boolean, false);
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  if (p->>'source_url') is null or (p->>'source_url') not like 'https://%' then raise exception 'source_obligatoire'; end if;
  if (p->>'verifier_avant') is null then raise exception 'date_revalidation_obligatoire'; end if;
  if v_publie and (p->>'verifier_avant')::date < current_date then raise exception 'revalidation_depassee'; end if;
  if p ? 'id' and (p->>'id') is not null then
    update public.alertes_reglementaires set territoire = p->>'territoire', categorie = p->>'categorie', titre = p->>'titre',
      resume = p->>'resume', source_url = p->>'source_url', date_effet = nullif(p->>'date_effet', '')::date,
      verifier_avant = (p->>'verifier_avant')::date, publie = v_publie
    where id = (p->>'id')::uuid returning id into v_id;
  else
    insert into public.alertes_reglementaires (territoire, categorie, titre, resume, source_url, date_effet, verifier_avant, publie)
    values (p->>'territoire', p->>'categorie', p->>'titre', p->>'resume', p->>'source_url', nullif(p->>'date_effet', '')::date,
            (p->>'verifier_avant')::date, v_publie)
    returning id into v_id;
  end if;
  perform public.journaliser_admin('repere_enregistrer', v_id::text, jsonb_build_object('publie', v_publie));
  return v_id;
end $$;

-- Dépublication automatique : un repère non revérifié depuis plus de 30 jours est retiré (tâche quotidienne).
create or replace function public.expirer_reperes()
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.alertes_reglementaires set publie = false
  where publie and verifier_avant is not null and verifier_avant < current_date - 30;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.expirer_reperes() from public, anon, authenticated;

create or replace function public.admin_irl()
returns table (id uuid, trimestre text, valeur numeric, date_publication date, lien_insee text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return query select i.id, i.trimestre, i.valeur, i.date_publication, i.lien_insee from public.irl_indices i order by i.trimestre desc;
end $$;

create or replace function public.admin_irl_enregistrer(p_trimestre text, p_valeur numeric, p_date date, p_lien text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  insert into public.irl_indices (trimestre, valeur, date_publication, lien_insee) values (p_trimestre, p_valeur, p_date, p_lien)
  on conflict (trimestre) do update set valeur = excluded.valeur, date_publication = excluded.date_publication, lien_insee = excluded.lien_insee;
  perform public.journaliser_admin('irl_enregistrer', p_trimestre, jsonb_build_object('valeur', p_valeur));
end $$;

create or replace function public.admin_sante()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return jsonb_build_object(
    'base_octets', pg_database_size(current_database()),
    'base_limite_octets', 524288000,
    'utilisateurs_actifs_30j', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'utilisateurs_limite', 50000,
    'emails_aujourdhui', (select count(*) from public.email_log where created_at::date = current_date),
    'emails_limite', 300,
    'dernier_export', (select max(created_at) from public.admin_audit_log where action = 'export_base'),
    'taches', (select coalesce(jsonb_agg(jsonb_build_object('nom', nom, 'derniere_execution', derniere_execution, 'statut', statut, 'message', message) order by nom), '[]') from public.taches_planifiees)
  );
end $$;

create or replace function public.admin_exporter_base()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  select jsonb_build_object(
    'exporte_le', now(),
    'biens', (select coalesce(jsonb_agg(b), '[]') from public.biens b),
    'locataires', (select coalesce(jsonb_agg(l), '[]') from public.locataires l),
    'baux', (select coalesce(jsonb_agg(x), '[]') from public.baux x),
    'mouvements', (select coalesce(jsonb_agg(m), '[]') from public.mouvements m),
    'echeances', (select coalesce(jsonb_agg(e), '[]') from public.echeances e),
    'abonnements', (select coalesce(jsonb_agg(s), '[]') from public.subscriptions s)
  ) into r;
  perform public.journaliser_admin('export_base', null, null);
  return r;
end $$;
