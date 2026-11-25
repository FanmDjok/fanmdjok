-- Test d'isolation des données (RLS et contraintes). À exécuter sur un projet de test, jamais en production.
-- Tout est annulé à la fin : le RAISE EXCEPTION final rend la transaction sans effet et affiche les résultats.
do $$
declare
  a uuid := '11111111-1111-1111-1111-111111111111';
  b uuid := '22222222-2222-2222-2222-222222222222';
  bien_b uuid;
  n int;
  r text := '';
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'a@test.invalid', 'authenticated', 'authenticated'),
    (b, 'b@test.invalid', 'authenticated', 'authenticated');
  insert into public.biens (owner_id, nom, territoire) values (a, 'Bien A', 'martinique');
  insert into public.biens (owner_id, nom, territoire) values (b, 'Bien B', 'martinique') returning id into bien_b;

  -- Visiteur anonyme
  set local role anon;
  select count(*) into n from public.biens; r := r || 'anon_voit_biens=' || n || ' ; ';
  reset role;

  -- Utilisateur A
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.biens; r := r || 'A_voit_biens=' || n || ' ; ';
  begin
    insert into public.biens (owner_id, nom, territoire) values (b, 'Intrusion', 'martinique');
    r := r || 'A_insere_pour_B=OK(FAILLE) ; ';
  exception when others then r := r || 'A_insere_pour_B=bloque ; '; end;
  update public.biens set nom = 'pwn' where id = bien_b;
  get diagnostics n = row_count; r := r || 'A_modifie_bien_de_B=' || n || ' ; ';
  select count(*) into n from public.subscriptions where user_id = b; r := r || 'A_voit_abonnement_B=' || n || ' ; ';
  update public.subscriptions set plan_code = 'investisseur', statut = 'active' where user_id = a;
  get diagnostics n = row_count; r := r || 'A_se_passe_investisseur=' || n || ' lignes ; ';
  begin
    insert into public.mouvements (owner_id, bien_id, sens, categorie, montant, date_operation)
      values (a, bien_b, 'recette', 'loyer', 100, current_date);
    r := r || 'A_mouvement_sur_bien_B=OK(FAILLE) ; ';
  exception when others then r := r || 'A_mouvement_sur_bien_B=bloque ; '; end;
  reset role;

  raise exception 'RESULTATS: %', r;
end $$;
