# Builds de test et publication (iOS)

## Essayer sans compte Apple : Expo Go

L'appli est publiée sur Expo (organisation `alex60s-team`, projet `elan`, canal `preview`). Sur l'iPhone, installer Expo Go depuis l'App Store, puis ouvrir :

```
exp://u.expo.dev/89cb6ae4-e6af-447f-86c8-c73ab9f3e6ce?channel-name=preview&runtime-version=exposdk:58.0.0
```

(ou scanner le QR code correspondant avec l'appareil photo). Pour republier après une modification, depuis `apps/mobile` :

```
npx eas-cli@latest update --branch preview --environment preview --platform ios --message "…"
```

Expo Go ne lit que les mises à jour publiées pour son SDK : `runtimeVersion` vaut donc `exposdk:58.0.0` dans app.json. **Avant le premier build TestFlight**, remettre `"runtimeVersion": { "policy": "appVersion" }`.

## Ce qu'il faut

- Un compte Apple Developer (99 € par an), au nom de la personne ou de la société qui publie.
- Un compte Expo (gratuit) pour les builds dans le cloud : aucun Mac n'est nécessaire.

## Première fois

Depuis `apps/mobile` :

```
npx eas-cli@latest login
npx eas-cli@latest init          # relie le projet à ton compte Expo (ajoute projectId à app.json)
npx eas-cli@latest credentials   # laisse EAS créer le certificat et le profil de distribution
```

L'identifiant de l'appli est `app.elan.training` (app.json). Il doit être libre sur App Store Connect ; sinon, change-le avant le premier build.

## Build TestFlight

```
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

Le build arrive dans App Store Connect › TestFlight après le traitement par Apple (souvent 10 à 30 minutes). Ajoute les testeurs internes (jusqu'à 100) ; les testeurs externes demandent une courte vérification par Apple.

Le numéro de build s'incrémente tout seul (`autoIncrement`). Pour une nouvelle version visible, change `version` dans app.json.

## Vérifications avant chaque build

```
pnpm install
pnpm typecheck
pnpm test
cd apps/mobile && npx expo-doctor
```

## Synchronisation

Le build est fait sans serveur : l'écran Compte et partage affiche « Pas encore disponible ». Pour l'activer, suivre `docs/supabase/README.md`, puis renseigner `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans les variables d'environnement EAS (`eas env:create`), pas dans le dépôt.
