-- KAZONLY : grille v2. Gratuit = 1 bien sans abonnement ; Essentiel 5 ; Propriétaire 15 ; Investisseur (id « portefeuille ») 50.
create or replace function public.plan_property_limit(uid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case plan
      when 'essentiel' then 5
      when 'proprietaire' then 15
      when 'portefeuille' then 50
      else 1 end
    from public.subscriptions
    where user_id = uid and status in ('trialing','active','past_due')
  ), 1);
$$;
