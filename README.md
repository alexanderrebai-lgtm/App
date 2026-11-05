# Appli muscu, cardio et nutrition

Application mobile (iOS d'abord, Expo et React Native) qui construit un programme de 26 semaines, guide chaque séance, adapte charges et calories, propose menus, recettes et courses à petit budget, et suit la progression.

## Structure

```
packages/content   Contenus en JSON validés par Zod (exercices, programmes, recettes, prix…)
packages/engine    Moteur métier en TypeScript pur, sans dépendance à l'interface
apps/mobile        Application Expo (à partir de M1)
docs/              Prototype de référence, modèle de données, décisions
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
- [ ] M1 : onboarding, génération du programme, calendrier
- [ ] M2 : séance guidée, check-in, suivi des performances
- [ ] M3 : nutrition (cibles, menus, 60 recettes, courses, budget, calories)
- [ ] M4 : compléments, hygiène de vie, bilan, rappels, profils multiples, partage
- [ ] M5 : finitions, accessibilité, performances, builds de test

Voir `docs/decisions.md` pour les écarts avec le prototype et `docs/data-model.md` pour le modèle de données.
