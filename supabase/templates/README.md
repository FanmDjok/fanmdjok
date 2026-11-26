# Modèles d'e-mails Supabase Auth (français)

Tableau de bord Supabase : **Authentication › Emails › Templates**. Pour chaque modèle, copiez le **contenu HTML** du fichier dans « Message body » et le **sujet** indiqué dans « Subject heading ».

| Modèle Supabase | Fichier à coller | Sujet à coller |
|---|---|---|
| Confirm signup | `confirmation.html` | Confirmez votre adresse e-mail KAZONLY |
| Invite user | `invite.html` | Vous êtes invité à rejoindre KAZONLY |
| Magic link | `magic_link.html` | Votre lien de connexion KAZONLY |
| Reset password | `recovery.html` | Réinitialisez votre mot de passe KAZONLY |
| Change email address | `email_change.html` | Confirmez votre nouvelle adresse e-mail KAZONLY |
| Reauthentication | `reauthentication.html` | Votre code de confirmation KAZONLY |

Variables utilisées : `{{ .ConfirmationURL }}` (lien), `{{ .Token }}` (code, modèle Reauthentication), `{{ .SiteURL }}` (site).

Les modèles n'affichent aucune mention personnelle ni de partenaire. Les couleurs respectent la charte : bleu pour les actions, turquoise en accent, ambre pour les précautions. Aucun rouge.

Après collage, envoyez un e-mail de test à une adresse de contrôle pour vérifier le rendu (Gmail, Outlook, mobile).
