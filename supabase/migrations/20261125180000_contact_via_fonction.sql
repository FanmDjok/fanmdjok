-- Le formulaire de contact passe par une fonction serveur qui vérifie Turnstile puis écrit avec la clé de service.
-- Plus aucune insertion publique directe : le visiteur anonyme ne peut ni écrire ni lire contact_requests.
drop policy if exists "demandes de contact: insertion publique" on public.contact_requests;
