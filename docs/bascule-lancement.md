# Bascule au lancement : kazonly.com passe du teaser à l'application

## Aujourd'hui
- **Projet `kazonly-teaser`** (Cloudflare Pages, racine `teaser/`) : page d'attente, liste d'attente, guide. Il porte kazonly.com et www.kazonly.com.
- **Projet `kazonly`** (racine du dépôt, `npm run build`, sortie `dist`) : le site complet, testé sur kazonly.pages.dev. Il ne porte aucun domaine public pour l'instant.

## Marche à suivre pour créer le projet teaser (à faire par la fondatrice)
1. Tableau de bord Cloudflare → Workers & Pages → Créer → Pages → Connecter à Git → le dépôt `fanmdjok`.
2. Nom du projet : `kazonly-teaser`. Branche de production : `claude/funny-ramanujan-8hjs8a`.
3. Racine du projet : `teaser`. Commande de build : aucune. Dossier de sortie : `.` (la racine du dossier `teaser`).
4. Variables et secrets (Paramètres → Variables et secrets) :
   - `BREVO_API_KEY` (secret)
   - `BREVO_WAITLIST_LIST_ID` (identifiant de la liste « Liste d'attente KAZONLY »)
   - `BREVO_DOI_TEMPLATE_ID` (identifiant du modèle de confirmation)
   - `TURNSTILE_SECRET_KEY` (secret)
5. Domaines personnalisés → ajouter `kazonly.com` puis `www.kazonly.com`. Cloudflare crée les enregistrements DNS.
6. Vérifier : `/` s'affiche, `/merci/` aussi, et une inscription de test arrive dans Brevo.

## Bascule le jour du lancement
1. Ouvrir le projet `kazonly-teaser` → Domaines personnalisés → retirer `kazonly.com` et `www.kazonly.com`.
2. Ouvrir le projet `kazonly` → Domaines personnalisés → ajouter `kazonly.com` et `www.kazonly.com`.
3. Attendre la propagation (quelques minutes), puis vérifier la page d'accueil, /tarifs/, /app/ et /api/health/checkout.
4. Envoyer la campagne E4 « KAZONLY est ouvert » dans Brevo (modèle `teaser/emails/4-lancement.html`), uniquement à la liste d'attente, après validation.
5. Garder le projet `kazonly-teaser` pendant 30 jours, puis le supprimer.

## Points à ne pas oublier
- Le guide PDF reste dans `teaser/guide/` sous un nom non devinable, avec `X-Robots-Tag: noindex` : il n'est lié que depuis l'e-mail de bienvenue.
- Les e-mails E1 à E3 sont dans `teaser/emails/`. E1 contient l'URL du guide et ne doit pas partir avant sa validation.
- Pas de bandeau cookies : le teaser n'utilise aucun cookie publicitaire ni outil de mesure.
