-- RLS activée sans politique : voulu. Seule la fonction /api/contact écrit ici (clé de service, après vérification Turnstile).
-- Aucun visiteur ni utilisateur ne lit ni n'écrit directement cette table.
comment on table public.contact_requests is 'Demandes du formulaire de contact. Écrites uniquement par la fonction serveur /api/contact (clé de service, Turnstile vérifié). RLS sans politique volontaire.';
