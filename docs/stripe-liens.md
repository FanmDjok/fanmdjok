# Paiement Stripe : checkout hébergé retenu (liens de paiement annulés)

## Décision
Le plan des 12 liens de paiement (Payment Links) est **annulé**. Le paiement passe par la page Checkout hébergée, créée à la demande par `/api/checkout` (fonction `functions/api/create-checkout.ts`).

## Variables
- `CHECKOUT_MODE=api` (défaut) : seul mode disponible. Toute autre valeur renvoie 503.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` : secrets Cloudflare, jamais dans le code.
- `STRIPE_PRICE_<FORMULE>_<MONTHLY|YEARLY>[_XPF]` : identifiants des 12 prix (publics, non secrets).

## Session créée (`server/checkout.ts`)
- `mode: subscription`, `ui_mode: hosted_page`, `locale: fr`.
- `billing_address_collection: required`, collecte du nom facultative (particulier ou entreprise).
- `payment_method_collection: always`, `saved_payment_method_options.payment_method_save: enabled`.
- `allow_promotion_codes: true`. Pas de `consent_collection.promotions` (la newsletter passe par Brevo).
- `consent_collection.terms_of_service: required` avec le texte sur la rétractation de 14 jours.
- `client_reference_id` = identifiant Supabase. `customer` = client Stripe existant (voir ci-dessous).
- `metadata` et `subscription_data.metadata` : `user_id`, `plan`, `interval`, `currency`.
- `success_url` : `/app/abonnement/merci/?session_id={CHECKOUT_SESSION_ID}`. `cancel_url` : `/tarifs/`.

**Écart volontaire** : `customer_email` n'est pas envoyé. Stripe refuse `customer` et `customer_email` dans la même session. L'e-mail est porté par le client Stripe, créé à la première souscription.

## Client déjà abonné
Un abonnement actif renvoie vers le portail client Stripe (`billingPortal.sessions`), jamais vers un second abonnement.

## Webhook (`functions/api/stripe-webhook.ts`)
- Événements : `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created|updated|deleted`.
- Idempotence : table `stripe_events`. Un événement déjà traité répond 200 sans être rejoué ; un échec retire l'événement du journal pour que Stripe le renvoie.
- Rattachement : par `client_reference_id`, puis par l'e-mail du client. Sinon, le paiement est enregistré dans `paiements_a_rattacher`, visible dans l'admin, et rien n'est perdu.

## Validation effectuée
Une session de test a été créée dans le compte KAZONLY (mode test) avec les paramètres ci-dessus, pour l'Essentiel mensuel en euros. Stripe l'a acceptée (statut `open`). Aucun paiement n'a été effectué.

## Mode réel (plus tard)
Le compte n'est pas encore vérifié. Le passage en mode réel se fera après vérification, avec les identifiants de prix du mode réel.
