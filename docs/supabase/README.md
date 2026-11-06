# Activer la synchronisation et le partage

La synchronisation est facultative : sans elle, Élan fonctionne entièrement sur le téléphone.

1. Crée un projet sur supabase.com en choisissant une région de l'Union européenne (par exemple Paris, `eu-west-3`).
2. Dans l'éditeur SQL du projet, exécute `schema.sql` (tables, règles d'accès RLS, fonctions d'invitation).
3. Dans Authentication › Providers › Email, active la connexion par code (OTP) et mets un modèle d'e-mail qui affiche `{{ .Token }}`.
4. Copie `apps/mobile/.env.example` en `apps/mobile/.env` et renseigne l'adresse du projet et la clé `anon` (publique). Ce fichier n'est pas versionné.
5. Relance l'appli : l'écran Profil › Compte et partage propose alors la connexion.

## Ce qui est stocké

Une ligne par profil (`profile_snapshot`) contenant ses données au format de sauvegarde v2. Les partages sont dans `profile_member` (lecture seule ou co-édition) ; les invitations dans `profile_invite` (code de 8 caractères, 7 jours, usage unique).

## Limites de cette première version

- Fusion entrée par entrée : quand une même entrée existe des deux côtés, la plus récente l'emporte. Une suppression faite sur un seul appareil peut réapparaître après synchronisation.
- La synchronisation se lance à la main (bouton « Synchroniser maintenant »).
- Non testée contre un vrai projet Supabase : à vérifier dès que le projet existe.
