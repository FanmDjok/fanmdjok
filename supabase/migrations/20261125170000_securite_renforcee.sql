-- Durcissement : limites de débit, longueurs maximales, bornes de montants.

-- 1. Formulaire de contact public : 3 demandes par adresse et 300 au total par heure.
create or replace function public.contact_throttle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.contact_requests
      where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'TROP_DE_DEMANDES' using errcode = 'P0001';
  end if;
  if (select count(*) from public.contact_requests
      where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'TROP_DE_DEMANDES' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.contact_throttle() from public, anon, authenticated;
create trigger contact_requests_throttle before insert on public.contact_requests
  for each row execute function public.contact_throttle();

-- 2. Longueurs maximales sur les saisies libres.
alter table public.biens add constraint biens_saisies_bornees check (
  char_length(nom) <= 200
  and char_length(coalesce(numero, '')) <= 20
  and char_length(coalesce(rue, '')) <= 200
  and char_length(coalesce(adresse, '')) <= 300
  and char_length(coalesce(code_postal, '')) <= 5
  and char_length(coalesce(ville, '')) <= 120
  and char_length(coalesce(locataire_nom, '')) <= 200
  and char_length(coalesce(locataire_telephone, '')) <= 30
  and char_length(coalesce(notes, '')) <= 5000
  and pg_column_size(finance) <= 4096
);
alter table public.locataires add constraint locataires_saisies_bornees check (
  char_length(nom) <= 200
  and char_length(coalesce(prenom, '')) <= 200
  and char_length(coalesce(email, '')) <= 320
  and char_length(coalesce(telephone, '')) <= 30
  and char_length(coalesce(notes, '')) <= 5000
);
alter table public.mouvements add constraint mouvements_saisies_bornees check (
  char_length(coalesce(libelle, '')) <= 300
  and montant <= 100000000
);
alter table public.echeances add constraint echeances_saisies_bornees check (
  char_length(titre) <= 200
  and char_length(coalesce(notes, '')) <= 5000
);
alter table public.baux add constraint baux_montants_bornes check (
  loyer_hc <= 100000000 and charges <= 100000000 and coalesce(depot_garantie, 0) <= 100000000
);
