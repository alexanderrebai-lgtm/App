# Applis

Ce dépôt contient deux applications :

- **Élan** (`apps/mobile`) : appli muscu, cardio et nutrition (Expo, iOS). Détails ci-dessous.
- **Aimanté** (`apps/aimante`) : organisation du quotidien (PWA React). Voir [`apps/aimante/README.md`](apps/aimante/README.md).

## Élan : muscu, cardio et nutrition

Application mobile (iOS d'abord, Expo et React Native) qui construit un programme de 26 semaines, guide chaque séance, adapte charges et calories, propose menus, recettes et courses à petit budget, et suit la progression.

## Structure

```
packages/content   Contenus en JSON validés par Zod (exercices, programmes, recettes, prix…)
packages/engine    Moteur métier en TypeScript pur, sans dépendance à l'interface
packages/motion    Poses du mannequin 3D (squelette, gestes, tempo), TypeScript pur
apps/mobile        Application Expo « Élan » (voir apps/mobile/README.md pour la lancer sur iPhone)
apps/aimante       Application PWA « Aimanté » (organisation du quotidien)
docs/              Prototype de référence, modèle de données, décisions, schéma Supabase
tools/             Script de migration ponctuel du prototype
```

## Commandes

```
pnpm install
pnpm test        # tous les tests
pnpm typecheck   # vérification des types
```

## Jalons

- [x] **M0** : moteur de calcul, modèle de données, migration des contenus du prototype
- [x] M1 : onboarding, génération du programme, calendrier
- [x] M2 : séance guidée avec mannequin 3D, check-in, suivi des performances
- [x] M3 : nutrition (cibles, menus, 64 recettes, courses, budget, calories)
- [x] M4 : compléments, hygiène de vie, bilan, rappels, profils multiples, sauvegarde, synchronisation et partage
- [x] M5 : accessibilité, guide, icône, configuration des builds TestFlight (en attente de validation)

Publication : `docs/release.md` (TestFlight), `docs/privacy.md`, `docs/app-store.md`.

Voir `docs/decisions.md` pour les écarts avec le prototype et `docs/data-model.md` pour le modèle de données.
