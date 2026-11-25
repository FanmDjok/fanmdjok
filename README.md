# KAZONLY

Site vitrine statique (SEO) + application React sous `/app/` + fonctions Netlify (Stripe).

## Commandes
- `npm run dev` : application seule
- `npm test` : tests
- `npm run build` : application (dist/app) + site vitrine (dist/)
- `STRICT_SITE=1 npm run build` : échoue tant que la configuration légale est incomplète

## Avant le lancement
1. **shared/site.config.json** : contactEmail, publisherName, siret, publisherAddress, mediator, dbRegion, siteUrl (domaine final), puis `legalReviewed: true` après relecture des pages légales (elles sont en noindex d'ici là).
2. **Supabase** : nouveau projet, exécuter `supabase/migrations/0001_init.sql` à `0005_plans_v2.sql` dans l'ordre (la 0005 fixe les limites 5 / 15 / 50 biens et 1 bien en formule gratuite).
3. **Stripe** (produits et prix déjà créés, voir ci-dessous ; sinon commencer en mode test) : 3 produits avec prix mensuel et annuel (mensuel 9, 19, 39 € ; annuel 90, 190, 390 €, soit 2 mois offerts). Formule Gratuite : 1 bien, sans carte, sans Stripe. L'essai de 14 jours est géré par le code.
   Webhook : `https://<domaine>/api/stripe-webhook`, événements `customer.subscription.created|updated|deleted` et `checkout.session.completed`.
4. **Variables Netlify** (jamais dans le dépôt) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_{ESSENTIEL|PROPRIETAIRE|PORTEFEUILLE}_{MONTHLY|YEARLY}` et leurs variantes francs Pacifique `…_{MONTHLY|YEARLY}_XPF`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Désactiver la protection SSO de l'équipe Netlify pour rendre le site public.

## Captures de la vitrine
Les images de `site-assets/shots/` viennent de l'application avec des données d'exemple : `scripts/capture-shots.cjs` les régénère (voir l'en-tête du script), puis les convertir en WebP 520 px de large.

## Analyses (app)
Migration `0003_finances.sql` (données financières facultatives par bien). Niveaux : Essentiel = brut/cash-flow/patrimoine, Propriétaire = + net, score, financement, projections, Investisseur (id interne `portefeuille`) = + vue consolidée par devise et classement.

## Stripe (compte Karib Property, mode réel)
Grille : Gratuit (1 bien) · Essentiel 9 €/90 € (2–5 biens) · Propriétaire 19 €/190 € (6–15) · Investisseur 39 €/390 € (16–50) · Agences sur devis. XPF : 1 100 / 2 300 / 4 700 par mois, ×10 par an.
Produits : Essentiel `prod_VekIf5OFghyjBy`, Propriétaire `prod_VekIXdki8hSLk5`, Investisseur `prod_VekIgYhTigqyRN` (l'ancien nom Portefeuille subsiste dans les variables `PORTEFEUILLE_*`).
Variables Netlify `STRIPE_PRICE_*` :
- ESSENTIEL_MONTHLY `price_1UdTT5EFtECOGV5Crr7Sf0SV` · ESSENTIEL_YEARLY `price_1UdTT6EFtECOGV5Cul6bL27T`
- PROPRIETAIRE_MONTHLY `price_1UdTT7EFtECOGV5CHLPZKdlj` · PROPRIETAIRE_YEARLY `price_1UdTT8EFtECOGV5Cp16G8LCa`
- PORTEFEUILLE_MONTHLY `price_1UdTT8EFtECOGV5CLaqtEzJp` · PORTEFEUILLE_YEARLY `price_1UdTT9EFtECOGV5CIqP7CcVD`
- Francs Pacifique :
  - ESSENTIEL_MONTHLY_XPF `price_1UdTTAEFtECOGV5CeyxclctY` · ESSENTIEL_YEARLY_XPF `price_1UdTTAEFtECOGV5CNfwyhxbt`
  - PROPRIETAIRE_MONTHLY_XPF `price_1UdTTBEFtECOGV5CXtHpM30P` · PROPRIETAIRE_YEARLY_XPF `price_1UdTTBEFtECOGV5C0gRLXiYs`
  - PORTEFEUILLE_MONTHLY_XPF `price_1UdTTCEFtECOGV5CoBthcCkV` · PORTEFEUILLE_YEARLY_XPF `price_1UdTTDEFtECOGV5CJ78cPXbD`
Les anciens prix (12/29/69 € et anciens XPF) sont archivés. Limites de biens : 1 (gratuit) / 5 / 15 / 50. Offre Agences : sur devis, hors Stripe (page /contact/).
