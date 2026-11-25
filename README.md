# KAZONLY

Site vitrine statique (SEO) + application React sous `/app/` + fonctions Cloudflare Pages (Stripe, dans `functions/api/`, partage dans `server/`). Hébergement : Cloudflare Pages (plan gratuit) ; base et authentification : Supabase.

## Commandes
- `npm run dev` : application seule
- `npm test` : tests
- `npm run check` : tests, build et audit de sécurité des dépendances (`npm audit --audit-level=high`), à lancer avant chaque mise en ligne
- `npm run build` : application (dist/app) + site vitrine (dist/)
- `STRICT_SITE=1 npm run build` : échoue tant que la configuration légale est incomplète

## Avant le lancement
1. **shared/site.config.json** : contactEmail, publisherName, siret, publisherAddress, mediator, dbRegion, siteUrl (domaine final), puis `legalReviewed: true` après relecture des pages légales (elles sont en noindex d'ici là).
2. **Supabase** : le schéma de production est dans `supabase/migrations/` (migrations horodatées, à exécuter dans l'ordre sur un projet vierge). `20261125160000_adaptation_application.sql` ajoute ce que l'application utilise (territoires, champs des biens, statut de paiement, contact). Les anciennes migrations `supabase/legacy/` ne sont plus utilisées.
3. **Stripe** (produits et prix déjà créés, voir ci-dessous ; sinon commencer en mode test) : 3 produits avec prix mensuel et annuel (mensuel 9, 19, 39 € ; annuel 90, 190, 390 €, soit 2 mois offerts). Formule Gratuite : 1 bien, sans carte, sans Stripe. L'essai de 14 jours est géré par le code.
   Webhook : `https://<domaine>/api/stripe-webhook`, événements `customer.subscription.created|updated|deleted` et `checkout.session.completed`.
4. **Variables Cloudflare Pages** (Settings › Variables and Secrets ; jamais dans le dépôt) :
   - Build et publiques : `NODE_VERSION` = `22`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SITE_URL` (`https://kazonly.com` en production ; `https://kazonly.pages.dev` pour les tests), et les 12 identifiants de prix `STRIPE_PRICE_{ESSENTIEL|PROPRIETAIRE|INVESTISSEUR}_{MONTHLY|YEARLY}` plus leurs variantes `…_XPF` (le nom `PORTEFEUILLE_*` reste accepté en repli).
   - Secrets (saisis dans Cloudflare, jamais dans le dépôt ni dans le chat) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (la clé secrète `sb_secret_…` peut occuper cette variable).
   - Les `VITE_*` sont lues au build : elles doivent exister avant le déploiement.
   - Turnstile : `TURNSTILE_SITE_KEY` = `0x4AAAAAAGS5zCvmd0soJiFr` (clé publique, sans secret ; lue au build pour le site et l'application). Widget « KAZONLY » (mode Managed) : kazonly.pages.dev, kazonly.com, www.kazonly.com. Secret à saisir comme secret : `TURNSTILE_SECRET_KEY` (vérification côté serveur de `/api/contact`). Ce même secret doit aussi être renseigné dans Supabase (Authentication › Attack protection › CAPTCHA, fournisseur Cloudflare Turnstile) pour que Supabase Auth vérifie les formulaires de connexion, d'inscription et de mot de passe oublié.
5. **Projet Cloudflare Pages** : connecter le dépôt GitHub `FanmDjok/fanmdjok`, branche de production (`claude/funny-ramanujan-8hjs8a` ou `main` après fusion). Commande de build `npm run build`, dossier de sortie `dist`. Les fichiers `_headers` (sécurité, cache) et `_redirects` (`/app/*`) sont générés dans `dist/` par le build, et les fonctions de `functions/` sont déployées automatiquement.

## Données personnelles (droits des utilisateurs)
- **Export** : `GET /api/export` (JSON complet du compte) et `GET /api/export?format=csv` (mouvements), depuis « Mes données » dans l'application.
- **Suppression** : `POST /api/supprimer-compte` avec la confirmation `SUPPRIMER`. L'abonnement Stripe est annulé immédiatement, puis le compte est supprimé en cascade (profil, abonnement, biens, locataires, baux, mouvements, échéances). [À VALIDER] : conservation des factures Stripe.

## Sauvegarde et restauration
Supabase gratuit ne fait pas de sauvegarde automatique. Procédure (non testée à ce jour ; à tester avant le lancement) :
1. **Sauvegarder** : dans le tableau de bord Supabase, Project Settings › Database, récupérer la chaîne de connexion, puis lancer `pg_dump --schema=public --data-only --no-owner -Fc -f kazonly-public.dump "<chaîne de connexion>"`. Conserver le fichier hors du dépôt, chiffré. Répéter chaque mois au minimum.
2. **Créer un projet vide** dans la même région (eu-west-1, Irlande).
3. **Appliquer le schéma** : exécuter dans le SQL Editor les fichiers de `supabase/migrations/`, dans l'ordre des noms.
4. **Restaurer les données** : `pg_restore --data-only --no-owner -d "<chaîne de connexion du nouveau projet>" kazonly-public.dump`.
5. **Utilisateurs** : les comptes d'authentification (schéma `auth`) ne sont pas dans cette sauvegarde. [À VALIDER] : procédure à définir et tester (export/import de `auth.users` ou réinscription assistée).
6. **Mettre à jour** les variables Cloudflare (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) puis redéployer.
7. **Vérifier** : lancer `supabase/tests/isolation_rls.sql` (annulé en fin de test) et relancer les contrôles de sécurité du tableau de bord.

## Technologies et versions
| Rôle | Technologie | Version |
|---|---|---|
| Application | React | 19.3.0 |
| Application | Vite | 8.3.4 |
| Application | TypeScript | 7.0.2 |
| Application | Tailwind CSS | 4.3.3 |
| Données et authentification | Supabase (`@supabase/supabase-js`) | 2.117.3 |
| Paiement | Stripe (`stripe`, côté serveur) | 23.2.0 |
| Fonctions serveur | Cloudflare Pages Functions (runtime Workers) | selon la plateforme |
| Tests | Vitest | 5.0.3 |
| Site vitrine | Générateur maison (`scripts/build-site.mjs`), sans framework | — |

Les versions ci-dessus sont celles de `package-lock.json`. Dependabot ouvre les mises à jour chaque semaine (`.github/dependabot.yml`) ; activez aussi les alertes de sécurité du dépôt dans GitHub (Settings › Code security).

## Stockage dans le navigateur
Le site vitrine ne dépose aucun cookie et n'utilise aucun outil de mesure d'audience. L'application n'utilise que le stockage du navigateur strictement nécessaire : la session de connexion (Supabase) et, en mode local, les données saisies. Aucun bandeau cookies n'est donc requis en l'état ; à faire valider.

## Captures de la vitrine
Les images de `site-assets/shots/` viennent de l'application avec des données d'exemple : `scripts/capture-shots.cjs` les régénère (voir l'en-tête du script), puis les convertir en WebP 520 px de large.

## Analyses (app)
Les données financières facultatives d'un bien sont stockées dans `biens.finance` (jsonb). Niveaux : Essentiel = brut/cash-flow/patrimoine, Propriétaire = + net, score, financement, projections, Investisseur (id interne `investisseur`) = + vue consolidée par devise et classement.

## Stripe (compte Karib Property, mode réel)
Grille : Gratuit (1 bien) · Essentiel 9 €/90 € (2–5 biens) · Propriétaire 19 €/190 € (6–15) · Investisseur 39 €/390 € (16–50) · Agences sur devis. XPF : 1 100 / 2 300 / 4 700 par mois, ×10 par an.
Produits : Essentiel `prod_VekIf5OFghyjBy`, Propriétaire `prod_VekIXdki8hSLk5`, Investisseur `prod_VekIgYhTigqyRN` (les variables `PORTEFEUILLE_*` existantes restent lues en repli).
Variables `STRIPE_PRICE_*` :
- ESSENTIEL_MONTHLY `price_1UdTT5EFtECOGV5Crr7Sf0SV` · ESSENTIEL_YEARLY `price_1UdTT6EFtECOGV5Cul6bL27T`
- PROPRIETAIRE_MONTHLY `price_1UdTT7EFtECOGV5CHLPZKdlj` · PROPRIETAIRE_YEARLY `price_1UdTT8EFtECOGV5Cp16G8LCa`
- PORTEFEUILLE_MONTHLY `price_1UdTT8EFtECOGV5CLaqtEzJp` · PORTEFEUILLE_YEARLY `price_1UdTT9EFtECOGV5CIqP7CcVD`
- Francs Pacifique :
  - ESSENTIEL_MONTHLY_XPF `price_1UdTTAEFtECOGV5CeyxclctY` · ESSENTIEL_YEARLY_XPF `price_1UdTTAEFtECOGV5CNfwyhxbt`
  - PROPRIETAIRE_MONTHLY_XPF `price_1UdTTBEFtECOGV5CXtHpM30P` · PROPRIETAIRE_YEARLY_XPF `price_1UdTTBEFtECOGV5C0gRLXiYs`
  - PORTEFEUILLE_MONTHLY_XPF `price_1UdTTCEFtECOGV5CoBthcCkV` · PORTEFEUILLE_YEARLY_XPF `price_1UdTTDEFtECOGV5CJ78cPXbD`
Les anciens prix (12/29/69 € et anciens XPF) sont archivés. Limites de biens : 1 (gratuit) / 5 / 15 / 50. Offre Agences : sur devis, hors Stripe (page /contact/).
