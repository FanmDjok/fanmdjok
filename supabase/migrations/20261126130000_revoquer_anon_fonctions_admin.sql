-- Défense en profondeur : aucune fonction d'administration n'est appelable par le rôle anonyme
-- (ni par public). Elles restent accessibles aux seules sessions authentifiées, qui vérifient
-- ensuite is_admin() et l'aal2 à l'intérieur de la fonction. Additif : aucune donnée modifiée.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'admin\_%' or p.proname in ('is_admin', 'est_admin', 'journaliser_admin'))
  loop
    execute format('revoke execute on function %s from public, anon', r.signature);
    execute format('grant execute on function %s to authenticated', r.signature);
  end loop;
end $$;
