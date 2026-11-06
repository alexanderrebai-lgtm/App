# Synchronisation et partage (Supabase)

## État au 6 novembre 2026

| Élément | État |
|---|---|
| Projet | `omhyjahxhblzifwhuqhx`, région UE (Francfort, `eu-central-1`) |
| Schéma, règles RLS, invitations | Installés (`schema.sql`) |
| Droits | Visiteurs non connectés : aucun. Connectés : lecture, ajout, modification, suppression filtrées par RLS ; `TRUNCATE` retiré |
| Appli | Branchée sur le projet (`apps/mobile/src/sync/config.ts`) |
| Test d'intégration | 5 tests passés contre le serveur réel (envoi, isolation, lecture seule, co-édition, propriétaire non modifiable), comptes de test supprimés ensuite |
| Connexion par code e-mail | SMTP Brevo branché, e-mail en français avec le code à 6 chiffres (valable 10 minutes), connexion ouverte dans l'appli. Reste à vérifier la réception réelle |

## Envoi des codes par e-mail (fait)

Sur l'offre gratuite, Supabase envoie au plus 2 e-mails par heure et n'autorise pas à modifier leur contenu ; son e-mail par défaut contient un lien, pas le code à 6 chiffres que l'appli demande.

1. Crée un compte chez un service d'envoi d'e-mails avec une offre gratuite (par exemple Brevo ou Resend) et récupère ses identifiants SMTP.
2. Dans le tableau de bord Supabase : Authentication › Emails › SMTP Settings, active « Custom SMTP » et colle les identifiants (hôte, port, utilisateur, mot de passe, adresse d'expéditeur). Ne les colle jamais dans la conversation.
3. Préviens Claude : il configurera les modèles d'e-mail (code à 6 chiffres en français) et passera `emailCodeReady` à `true` dans `apps/mobile/src/sync/config.ts`.

## Relancer le test d'intégration

```
cd apps/mobile
SUPABASE_IT=1 SUPABASE_SECRET_KEY=<clé secrète du projet> npx vitest run test/sync.it.test.ts
```

La clé secrète crée et supprime des comptes de test : ne la mets jamais dans le dépôt ni dans l'appli.

## Ce qui est stocké

Une ligne par profil (`profile_snapshot`) avec ses données au format de sauvegarde v2 ; les partages dans `profile_member` (lecture seule ou co-édition) ; les invitations dans `profile_invite` (8 caractères, 7 jours, usage unique).

## Limites connues

- Fusion entrée par entrée : la plus récente l'emporte ; une suppression faite sur un seul appareil peut réapparaître.
- Synchronisation lancée à la main (bouton « Synchroniser maintenant »).

## Délivrabilité

L'expéditeur est une adresse Gmail envoyée par Brevo : certains fournisseurs classent ces e-mails en spam. Avant la publication, prendre un nom de domaine, l'authentifier dans Brevo (DKIM, DMARC) et changer l'adresse d'expéditeur dans Supabase.
