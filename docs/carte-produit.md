# Carte produit KAZONLY : état de l'existant (relevé du 26 novembre 2026)

Légende : **existe** = fonctionnel et branché ; **partiel** = présent mais incomplet ou sans l'écran attendu ; **absent** = à construire.

Ce relevé porte sur le code de `claude/funny-ramanujan-8hjs8a` (commit `cd21080`) et sur le projet Supabase `rycbeqvmagemmdqndpij`.

## 1. Cycle de vie du bien

| Module | État | Écrans existants | Tables | Formule requise | Ce qui manque |
|---|---|---|---|---|---|
| 1. Fiche bien (infos, territoire, régime, valeur, financement, score) | partiel | `Biens.tsx` (création, liste), `FinanceForm.tsx` (financement), `Analyses.tsx` (score, rendement) | `biens` (numero, rue, type_location, loyer, finance jsonb, actif) | Gratuit (1 bien) ; score et rendement net : Propriétaire | Photos, fiche dédiée, écran de consultation complet |
| 2. Documents (coffre par bien) | absent | aucun | aucune table, aucun bucket de stockage | Gratuit (au moins 1 document) | Table `documents`, bucket privé, URL signées, date d'échéance |
| 3. Bail et locataire (dates, loyer, charges, dépôt, révision IRL, fin) | partiel | aucun écran dédié : le locataire est saisi comme deux champs sur le bien (`locataire_nom`, `locataire_telephone`) | `locataires`, `baux` (existent mais non utilisées par l'app) ; `irl_indices` (admin uniquement) | Gratuit | Écran bail, locataire, calcul de révision IRL dans l'app, fin et renouvellement |
| 4. Loyers (appels, encaissements, retards, relances, quittances PDF) | partiel | `Paiements.tsx`, `Relances.tsx`, `Quittances.tsx` (relances et quittances présentes ; PDF à vérifier) | `mouvements` (statut_paiement), `echeances`, `email_log` | Gratuit | Vérifier la quittance en PDF ; l'appel de loyer est fait à la main |
| 5. Dépenses et travaux (catégories, justificatifs, prestataires, récupérable) | partiel | `Depenses.tsx` (catégories fixes) | `mouvements` | Gratuit | Justificatifs (documents), carnet des prestataires, répartition récupérable / non récupérable |
| 6. Échéancier (calendrier du portefeuille) | partiel | aucun écran calendrier ; échéances dans l'Accueil (relances) | `echeances` ; fonction `generer_loyers_prevus` | Gratuit (liste) ; calendrier : à confirmer | Vue calendrier, saisie des échéances (assurance, taxe foncière) |
| 7. Trésorerie prévisionnelle 12 mois (scénarios) | absent | aucun écran dans l'app ; la démo existe sur le site seulement | aucune table de prévision | Propriétaire (à confirmer) | Calcul de prévision, scénarios central et prudent, écran |
| 8. Fiscalité (micro / réel, récapitulatif annuel, repères) | partiel | `Fiscalite.tsx` (comparaison micro / réel, niveau 2) ; `fiscalite.ts` | `mouvements`, `biens` | Propriétaire | Récapitulatif annuel exportable, mention « information, pas un conseil » et sources, par territoire |
| 9. Alertes territoire (repères validés, source, date de revue) | absent côté app | aucun écran ; l'admin gère les repères | `alertes_reglementaires` (politique « publiées lisibles »), `admin_reperes` | Gratuit | Lecture dans l'app, affichage par territoire, pastille « à revoir » |
| 10. Rapports (mensuel, annuel, portefeuille, exports) | partiel | `Rapports.tsx` (mensuel, fiscalité) ; export CSV des mouvements (`exportCsv`) | `mouvements` | Export brut : Gratuit (RGPD) ; exports avancés : payant | Rapport annuel ; rapport par bien ; export avancé payant |

## 2. Activation et conversion

| Élément | État | Constat |
|---|---|---|
| Liste de démarrage sur l'Accueil | partiel | `Accueil.tsx` affiche « Premiers pas » en 3 étapes (bien, loyer, dépense) ; pas les 5 étapes demandées |
| Fenêtre de bienvenue (3 écrans) | absent | — |
| Mesure du parcours (compte, bien, loyer, payant) | partiel | Données présentes dans l'admin (`admin_parcours`) ; pas d'événement côté app |
| Paiement Stripe (3 formules × mensuel / annuel × EUR / XPF) | partiel | `create-checkout.ts` et `Paywall.tsx` existent. Cases non cochées : clic sans effet et sans explication. Test e2e absent. Secrets à confirmer. |
| Consentement à l'exécution immédiate | partiel | Case présente dans `Paywall.tsx`. Texte à reprendre et à rendre conforme (marquage `[À VALIDER juriste]` dans le code seulement) |
| Présélection intervalle et devise depuis /tarifs | absent côté app | `Paywall.tsx` lit `plan`, `interval`, `cur` ; à vérifier sur les liens du site |
| Badge de formule mis à jour après paiement, toast « Bienvenue » | absent | Rechargement nécessaire ; pas d'état « confirmation en cours » |
| Endpoint `/api/health/checkout` (variables manquantes) | absent | `admin-config.ts` expose seulement la présence des variables |
| Montée en gamme au 2e bien | absent | `propertyLimit` bloque l'ajout ; pas de fenêtre explicative |
| Verrouillage des fonctionnalités | partiel | `Analyses.tsx` a un composant `Locked` local ; `Simulateurs.tsx` affiche « Formule Propriétaire » comme valeur (`Simulateurs.tsx:54`) |

## 3. Interface et système de design

| Élément | État | Constat |
|---|---|---|
| Tokens et composants partagés | partiel | `ui.tsx` (Card, Btn, Field, Empty, PageTitle) ; pas de Select, Toast, Dialog, Sheet, Badge, Tooltip |
| En-tête mobile | partiel | Gratuit + « Passer à une formule » + Déconnexion dans l'en-tête ; pas d'avatar ni de menu |
| Barre de navigation mobile | à vérifier | 6 onglets (Accueil, Biens, Paiements, Dépenses, Rapports, Analyses) ; réduction à 5 à faire |
| Toasts et confirmations de suppression | absent | — |
| États vides utiles | partiel | `Empty` existe ; pas partout |
| Infobulles sur le jargon | absent | — |
| Signature du pied de page | à harmoniser | Pied du site : « pensée pour les onze territoires » (corrigé) ; l'app à vérifier |

## 4. Saisie

| Élément | État | Constat |
|---|---|---|
| Placeholders qui ressemblent à des données | à corriger | `Biens.tsx:93` « Appartement A », `:98` « 12 », `:99` « Chemin Bois Goudou », `:122` « 850 » / « 95000 », `:135` « 696 00 00 00 » |
| Code postal pré-rempli | à vérifier | Décrit comme pré-rempli à « 974 » |
| Ordre des champs (territoire en premier) | à corriger | Le territoire n'est pas en premier dans `Biens.tsx` |
| Validation code postal / territoire | existe | `validatePostalCode` (`src/lib/territories.ts`) |
| Téléphone par territoire (indicatif, format, E.164) | absent | Pas de `libphonenumber-js` dans `package.json`. Une logique maison existe dans `relances.ts` (`internationalPhone`) |
| Devise affichée dès le choix du territoire | à corriger | Le loyer affiche un placeholder, pas la devise |
| Information RGPD sur les données du locataire | absent | — |

## 5. Notifications

| Élément | État | Constat |
|---|---|---|
| Table `notifications` et RLS | absent | — |
| Cloche et panneau | absent | — |
| « Quoi de neuf » par version | absent | — |
| Alertes territoire, échéances (pg_cron J-30 / J-7), paiement | absent | `taches_planifiees` existe (admin) mais aucune tâche d'échéance |
| Préférences in-app / e-mail | absent | `email_log` existe |

## 6. Formules : grille à confirmer

Les caps de `shared/plans.json` sont : Gratuit 1, Essentiel 5, Propriétaire 15, Investisseur 50. Le cahier décrit une grille par tranches : Essentiel 2 à 5, Propriétaire 6 à 15, Investisseur 16 à 50. **Cette différence doit être tranchée** : une tranche minimale bloquerait un propriétaire à 1 ou 2 biens qui veut seulement l'Essentiel, ce que le site ne dit pas.

## 7. Décisions à prendre avant la Vague 1

1. **Grille des formules** : caps (actuel) ou tranches minimales (cahier) ?
2. **Paiement test** : confirmer la carte 4242 et `checkout.session.completed`. Le connecteur Stripe ne voit que « Karib Property », je ne l'ai pas utilisé. Le test e2e de la Vague 1 en dépend.
3. **Secrets Cloudflare** : `SUPABASE_SERVICE_ROLE_KEY` et `TURNSTILE_SECRET_KEY` sont-ils ajoutés ?
4. **Signature du pied de page** : je propose « KAZONLY, la gestion locative pour les onze territoires d'Outre-mer. » Validez-vous ?
5. **Calendrier** et **prévision 12 mois** : sont-ils dans la Vague 2 telle que définie (oui pour la prévision, à confirmer pour le calendrier) ?
