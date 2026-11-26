-- Essai de 14 jours : une seule fois par compte.
-- essai_utilise passe à vrai à la création d'un abonnement (webhook customer.subscription.created).
alter table public.subscriptions add column if not exists essai_utilise boolean not null default false;
update public.subscriptions set essai_utilise = true where essai_fin is not null;
