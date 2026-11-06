# Aimanté

Application d'organisation du quotidien : routines, ménage, menus, courses et agenda, sur une « porte de frigo » dans la poche. PWA installable, qui marche sans compte et sans internet. Tout est en français.

Le prototype d'origine est dans `docs/prototype.html` (référence pour les textes et l'ambiance).

## Lancer le projet

Depuis la racine du dépôt (pnpm 10 et Node 22) :

```
pnpm install
pnpm --filter @aimante/web dev        # http://localhost:5173
```

Pour l'ouvrir sur ton téléphone pendant le développement (même wifi) : `pnpm --filter @aimante/web dev --host`, puis ouvre l'adresse « Network » affichée. Le mode hors ligne et l'installation demandent la version construite (ci-dessous) servie en HTTPS.

## Tests et vérifications

```
pnpm --filter @aimante/web test        # tests Vitest de la logique métier
pnpm --filter @aimante/web typecheck
```

## Construire

```
pnpm --filter @aimante/web build       # résultat dans apps/aimante/dist
pnpm --filter @aimante/web preview     # sert le build sur http://localhost:4173
```

`pnpm --filter @aimante/web icons` régénère les icônes et les écrans de démarrage iPhone à partir de `public/favicon.svg` (il faut Playwright).

## Déployer gratuitement

L'appli est un site statique : n'importe quel hébergeur gratuit convient. Elle utilise des chemins relatifs, donc elle marche aussi dans un sous-dossier.

**Netlify (recommandé, marche avec un dépôt privé)**
1. Sur netlify.com : « Add new site » → « Import an existing project » → choisis ce dépôt GitHub.
2. *Base directory* : `apps/aimante`. Le reste est lu dans `apps/aimante/netlify.toml` (commande `pnpm run build`, dossier `dist`).
3. Chaque push sur la branche choisie redéploie l'appli.

**Vercel** : « Add New Project » → ce dépôt → *Root Directory* `apps/aimante`, *Framework* Vite, *Output* `dist`.

**GitHub Pages** : gratuit seulement pour un dépôt public. Construis, puis publie le contenu de `apps/aimante/dist` (par exemple avec l'action `actions/deploy-pages`).

## Installer sur le téléphone

Ouvre l'adresse du site déployé (en HTTPS), puis :
- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Installer l'application ».

Ensuite l'appli s'ouvre en plein écran et marche sans réseau. Les mises à jour s'installent toutes seules à l'ouverture suivante.

## Tes données

Tout est stocké sur l'appareil (IndexedDB). Rien n'est envoyé sur internet. Pour changer de téléphone ou garder une copie : **Aujourd'hui → ⚙ Réglages → Exporter mes données** (fichier JSON), puis **Importer une sauvegarde** sur l'autre appareil. L'import remplace toutes les données, après confirmation.

Nettoyage automatique au démarrage : tâches faites depuis plus de 14 jours, journaux de plus de 120 jours, menus de plus de 60 jours. Le total de gouttes de la plante est conservé.

## Organisation du code

```
src/domain/    logique métier pure (dates, échéances du ménage, gouttes, rayons…), testée
src/data/      base Dexie, accès aux données, données de départ, sauvegarde, nettoyage
src/ui/        composants communs : fiche à aimant, panneau, barre d'onglets, plante
src/features/  un dossier par écran (today, home, meals, shopping, agenda, settings)
src/styles/    couleurs clair / sombre et styles
```

Les écrans ne parlent jamais à Dexie directement : ils passent par `src/data/repositories.ts` et `src/data/live.ts`. Pour brancher une synchro (Supabase par exemple), seul `src/data/` change.

## Avancement

- [x] Étape 1 : base (Vite, PWA, Dexie, 5 onglets, thème clair/sombre, données de départ, export/import)
- [x] Étape 2 : Aujourd'hui + Maison (routines, tâches avec report, ménage, session éclair, plante et gouttes, journée difficile, retour en douceur, heure de coucher)
- [x] Étape 3 : Repas + Courses (menu sur 7 jours, recettes, remplissage varié, ingrédients vers les courses sans doublon, rayons automatiques, essentiels)
- [ ] Étape 4 : Agenda, revue et bilan doux du dimanche
- [ ] Synchro téléphone + ordi (Supabase, connexion par code e-mail)
- [ ] Étape 5 : vraies notifications (service Supabase) et finitions
- [ ] Étape 6 : budget (saisie rapide d'abord, photo du relevé en essai)

Préparation de la synchro : chaque ligne garde sa date de modification (`updatedAt`) et chaque suppression laisse une trace (table `deletions`).
