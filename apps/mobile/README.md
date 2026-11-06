# Élan — application mobile

Application Expo (SDK 58, Expo Router, TypeScript). Les règles de calcul viennent de `@muscu/engine`, les contenus de `@muscu/content`.

## Lancer l'appli sur ton iPhone (Expo Go)

Il faut un ordinateur (Mac, Windows ou Linux) sur le même Wi-Fi que le téléphone.

1. Sur l'iPhone, installe **Expo Go** depuis l'App Store.
2. Sur l'ordinateur, installe Node.js 22 et pnpm (`npm install -g pnpm`), puis :
   ```
   git clone <le dépôt> && cd App
   git checkout claude/fitness-nutrition-mobile-app-vh3eqt
   pnpm install
   pnpm --filter @muscu/mobile start
   ```
3. Scanne le QR code affiché avec l'appareil photo de l'iPhone : l'appli s'ouvre dans Expo Go.

Pour une vraie installation (TestFlight), il faudra un compte Apple Developer (99 € par an) : prévu au jalon M5.

## Aperçu dans un navigateur

`pnpm --filter @muscu/mobile web` ouvre la même appli dans le navigateur. Les données y sont gardées dans le navigateur (pas de SQLite) : cet aperçu sert aux démos et aux captures d'écran.

## Structure

```
src/app/            écrans (Expo Router) : onboarding/, (tabs)/, seance/[date]
src/lib/            logique d'écran testée : onboarding, calendrier, formats français
src/store/          stockage SQLite sur l'appareil (db.ts), version navigateur (db.web.ts)
src/ui/             composants : textes, boutons, cartes, réglage +/−, calendrier
src/theme.ts        couleurs, polices et tailles de la piste 2
```

## Vérifications

```
pnpm --filter @muscu/mobile typecheck
pnpm --filter @muscu/mobile test
npx expo-doctor
```
