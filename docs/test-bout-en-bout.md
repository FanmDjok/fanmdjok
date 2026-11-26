# Test de bout en bout — KAZONLY sur kazonly.pages.dev

Objectif : parcourir chaque parcours sensible, dans l'ordre, et noter le résultat. Utilisez une adresse e-mail de test que vous contrôlez, et la carte de test Stripe `4242 4242 4242 4242` (date future, code à 3 chiffres).

**Avant de commencer** : `Espace admin > Santé > Configuration` doit afficher « présent » pour toutes les variables et le mode Stripe « test ». Sinon, corrigez d'abord Cloudflare Pages.

| # | Parcours | Étapes | Résultat attendu | À vérifier dans Supabase / Stripe |
|---|---|---|---|---|
| 1 | Inscription | Ouvrir `/app/?mode=inscription`, saisir une adresse de test et un mot de passe de 12 caractères, cocher les CGV, valider la case anti-robot, « Créer mon compte » | Message « Compte créé. Consultez votre boîte mail… » | Authentication › Users : le compte est **non confirmé** ; `profiles` et `subscriptions` (plan `gratuit`) ont une ligne |
| 2 | Mot de passe court refusé | Même formulaire avec 8 caractères | Bouton désactivé ou message de longueur | Aucun compte créé |
| 3 | Confirmation d'e-mail | Ouvrir l'e-mail reçu (modèle « confirmation »), cliquer le bouton | Retour sur l'application, session ouverte | Le compte est confirmé (`email_confirmed_at` renseigné) |
| 4 | Connexion | Se déconnecter, se reconnecter avec le mot de passe | Accès à l'accueil | `last_sign_in_at` mis à jour |
| 5 | Mot de passe oublié | Connexion > « Mot de passe oublié ? », saisir l'adresse | Message neutre « Si un compte existe… » | E-mail « réinitialisation » reçu ; le lien ouvre « Nouveau mot de passe » |
| 6 | Double authentification | « Mes données » > Double authentification > Activer, scanner le QR code, saisir le code | « Double authentification activée » | `auth.mfa_factors` : un facteur `verified` |
| 7 | Connexion avec code | Se déconnecter, se reconnecter | Un écran « Code de confirmation » après le mot de passe | Le code accepté ouvre l'application |
| 8 | Ajout d'un bien | Biens > ajouter un bien (Martinique, 1 bien) | Le bien apparaît dans la liste, devise EUR | `biens` : une ligne avec `owner_id` = l'utilisateur |
| 9 | Limite de biens | Essayer d'ajouter un 2e bien en formule Gratuite | Message de limite de formule | Trigger `LIMITE_BIENS` : aucune ligne ajoutée |
| 10 | Paiement test | Tarifs > Essentiel > cocher « commencer tout de suite » > Essayer 14 jours > carte 4242 | Retour sur l'application, formule Essentiel en essai | Stripe (mode test) : abonnement en `trialing`. Supabase : `subscriptions.plan_code = essentiel`, `statut = trialing`, `essai_fin` renseigné |
| 11 | Refus sans consentement | Tenter un paiement sans cocher la case | Bouton désactivé | Aucune session Stripe créée |
| 12 | Webhook | Après le paiement, vérifier Stripe > Développeurs > Webhooks > événements | Événement `checkout.session.completed` reçu, réponse 200 | Supabase `subscriptions` mise à jour sans relance manuelle |
| 13 | Portail client | « Mon abonnement » ou « Gérer » | Portail Stripe ouvert (carte, factures) | — |
| 14 | Résiliation | « Mon abonnement » > Résilier mon abonnement > confirmer | « Votre accès reste actif jusqu'au… » | Stripe : `cancel_at_period_end = true` ; `subscriptions.cancel_at_period_end = true` |
| 15 | Lien de résiliation sans compte | Ouvrir `/resilier/`, saisir l'adresse | Message neutre | E-mail de connexion reçu ; le lien ouvre la résiliation |
| 16 | Rétractation | Sur un nouvel abonnement de test, « Me rétracter » dans les 14 jours | « Votre rétractation est enregistrée… » | Stripe : abonnement annulé, remboursement créé si une facture est payée [À VALIDER] |
| 17 | Export | « Mes données » > Télécharger en JSON, puis CSV | Fichiers téléchargés, données du compte | — |
| 18 | Suppression du compte | « Mes données » > taper SUPPRIMER > supprimer | Déconnexion ; le compte ne peut plus se connecter | `auth.users` et les lignes liées supprimées ; Stripe : abonnement annulé |
| 19 | Admin : droit | Ouvrir `/app/admin` avec un compte non admin | Redirection vers `/app/` | Aucune donnée affichée |
| 20 | Admin : double authentification | Ouvrir `/app/admin` avec le compte admin, sans aal2 | Écran de code, puis espace admin après le code | `app_admins` contient le compte |
| 21 | Admin : données | Onglets Vue d'ensemble, Parcours, Abonnements | Chiffres cohérents avec les étapes 1 à 13 | — |
| 22 | Admin : messages | Envoyer une demande via `/contact/`, la traiter dans l'admin | La demande apparaît, puis passe à « Traité » | `contact_requests.statut` mis à jour, `admin_audit_log` renseigné |

## Après le test
- Notez chaque résultat (réussi, échoué, bloqué) avec la date et la capture utile.
- Les échecs sont à corriger avant toute ouverture publique. Les points marqués **[À VALIDER]** dans le code sont à trancher avec le juriste, pas avec le test.
- Supprimez les comptes de test et les abonnements de test une fois le parcours validé.
