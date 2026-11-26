# Liens de paiement Stripe : état et marche à suivre

## État au 26 novembre 2026
- Compte : KAZONLY (`acct_1UfvLq8mMdKNLKBf`), mode test. Les 12 prix existent et sont actifs.
- **Les 12 liens de paiement ne sont pas créés.** Le compte n'a pas encore de profil public : aucune URL de conditions d'utilisation n'est renseignée. Or le lien exige `consent_collection.terms_of_service: required`. Créer les liens sans cette URL échouerait, ou il faudrait contourner la règle : je ne le fais pas.

## Marche à suivre (mode test, tableau de bord Stripe du compte KAZONLY)
1. Paramètres → Informations publiques (ou « Public details ») : renseigner le nom affiché « KAZONLY », l'adresse du site `https://kazonly.com` et l'e-mail `contact@kazonly.com`.
2. Dans le même écran, renseigner l'URL des conditions d'utilisation : `https://kazonly.pages.dev/cgv/` (à remplacer par `https://kazonly.com/cgv/` au lancement).
3. Me prévenir. Je crée alors les 12 liens, avec le texte d'acceptation des CGV, puis je vous donne la liste des URL à ajouter dans Cloudflare.

## Variables prévues (publiques)
`STRIPE_LINK_<FORMULE>_<MONTHLY|YEARLY>[_XPF]`, par exemple `STRIPE_LINK_ESSENTIEL_MONTHLY`. Les 12 URL seront listées ici une fois créées.

## Points juridiques à valider
- Texte d'acceptation : « J'accepte les CGV et je demande à commencer l'accès à KAZONLY tout de suite… » — **[À VALIDER juriste]**, marquage dans le code et la documentation uniquement, jamais affiché.
- Délai de rétractation et remboursement de la part de service déjà utilisée : voir CGV, article 5.

## Mode réel (plus tard)
Recréer les 12 liens en mode réel, une fois le compte vérifié. Ne pas le faire avant.
