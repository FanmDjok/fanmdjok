-- Demandes de contact du site vitrine (page /contact/). Insertion seule depuis le navigateur : personne ne peut relire les demandes sans la clé de service.
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 5 and 200 and email like '%@%'),
  territory text check (territory is null or char_length(territory) <= 60),
  properties integer check (properties is null or properties between 0 and 100000),
  topic text not null default 'question' check (topic in ('agence', 'question', 'autre')),
  message text not null check (char_length(message) between 1 and 3000)
);
alter table public.contact_requests enable row level security;
drop policy if exists "contact_insert_public" on public.contact_requests;
create policy "contact_insert_public" on public.contact_requests for insert to anon with check (true);
revoke all on public.contact_requests from anon, authenticated;
grant insert on public.contact_requests to anon;
