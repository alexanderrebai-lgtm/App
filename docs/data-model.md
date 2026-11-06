# Modèle de données

Deux familles de données :

- **Contenus** (`packages/content/data/*.json`) : livrés avec l'appli, en lecture seule, validés par Zod au chargement. Les prix sont l'exception : ils sont datés (`asOf`) et l'utilisateur peut les modifier ; ses prix sont stockés en base et priment sur le fichier.
- **Données personnelles** : stockées sur l'appareil dans SQLite (M1), une table par entité de `packages/engine/src/model.ts`. Rien ne sort de l'appareil sans synchronisation activée (M4).

## Contenus

| Fichier | Contenu |
|---|---|
| `exercises.json` | 90 exercices (type, muscles, matériel, fiche technique), 8 fiches, groupes de remplacement |
| `programs.json` | 4 objectifs (textes, phases, conseils nutrition), `templates[objectif][phase][séance]`, séances de récupération, bloc dos |
| `ingredients.json` | 83 ingrédients canoniques : rayon (frais, placard, épice), valeurs pour 100 g, poids d'une pièce |
| `recipes.json` | 64 recettes : catégorie, temps, ingrédients structurés (quantité, unité, ingrédient canonique), étapes, astuce de goût, tags, repère kcal/protéines du prototype |
| `menus.json` | Rotation de 4 semaines et parts des 4 prises ; les listes de plats sont calculées selon le profil |
| `prices.json` | Prix datés (au kilo ou à la pièce), paquets de placard, offres en grande quantité |
| `nutrition.json` | Facteur d'activité, eau, paramètres par objectif (S, g/kg, tendance de poids visée), aliments rapides |
| `supplements.json` | 6 compléments suivis, défauts par objectif, tableau d'utilité |

Les kcal, protéines, glucides et lipides d'une recette sont **calculés** à partir des ingrédients (`recipeMacros`). Un test vérifie qu'ils restent proches des valeurs du prototype (kcal à ±10 %).

## Tables SQLite

M1 crée `profile` (profil complet en JSON dans `data`), `session_log` et `settings`. M2 ajoute `exercise_log`, `check_in`, `body_weight` et `measurements` (migration 2). La séance guidée en cours est gardée dans `settings` (clé `activeSession`). M3 ajoute `food_entry`, `water_log`, `menu_override`, `pantry_item`, `recipe_pref` et `price_override` (migration 3). Les autres tables arrivent avec leurs jalons, chacune par une migration numérotée (`apps/mobile/src/store/migrations.ts`).

Toutes les tables personnelles portent `profile_id` ; les dates sont des chaînes `AAAA-MM-JJ`.

| Table | Clé | Colonnes |
|---|---|---|
| `profile` | `id` | name, sex, weight_kg, height_cm, age, goal, sessions_per_week, level, start_date, first_use_date, equipment, back_care, diet_tags (JSON), excluded_ingredients (JSON), budget_mode, weekly_budget_eur, kcal_target?, protein_target?, supplements (JSON)? |
| `exercise_log` | `profile_id, date, exercise` | cardio, sets (JSON : kg, reps, feedback?, rpe?) |
| `session_log` | `profile_id, date` | done, feeling?, duration_min? |
| `check_in` | `profile_id, date` | energy, soreness |
| `body_weight` | `profile_id, date` | kg |
| `measurements` | `profile_id, date` | arm_cm, chest_cm, waist_cm, thigh_cm |
| `food_entry` | `id` | profile_id, date, name, kcal, protein, carbs?, fat?, menu_slot? |
| `supplement_log` | `profile_id, date, supplement` | taken |
| `life_log` | `profile_id, date` | cigarettes, drinks |
| `pantry_item` | `profile_id, ingredient` | owned |
| `price_override` | `ingredient` | per_kg?, per_unit?, updated_at |
| `settings` | `key` | value (JSON) : rappels, langue, thème |

Pour la synchronisation (M4), chaque table recevra `updated_at` et `deleted_at` (suppression logique), afin de fusionner les modifications faites sur deux appareils.

## Sauvegarde

`exportBackup` produit un JSON `{ app: "muscu", version: 1, … }` avec toutes les tables. `importBackup` accepte ce format (validé par Zod) et les exports du prototype web (clé `onair-v3`), convertis vers le nouveau modèle.
