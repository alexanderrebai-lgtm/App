# Décisions et écarts par rapport au prototype

Chaque écart avec le prototype ou le cahier des charges est listé ici, avec sa raison.

## Choix validés (cadrage du 5 novembre 2026)

- iOS d'abord, publication sur l'App Store à terme ; Android reste possible avec la même base Expo.
- Hors ligne jusqu'à M4, puis synchronisation Supabase hébergée dans l'UE.
- Français d'abord, anglais ensuite : le moteur renvoie des codes, traduits dans `packages/engine/src/i18n`.
- Import des exports du prototype : oui.
- Monorepo pnpm : `packages/engine`, `packages/content`, `apps/mobile` (M1).
- M0 validé. Nom retenu : **Élan** (disponibilité App Store, INPI et EUIPO à vérifier). Modèle freemium validé.
- Couleurs « Nuit et néon » validées ; tailles et polices revues (piste 2 : Barlow, six tailles de 13 à 40 px), en attente de validation.
- Séance guidée : un mannequin 3D montre chaque mouvement avant la première série (prototype : `docs/prototype/elan-3d.html`). Les poses sont calculées par cinématique inverse à partir d'une vingtaine de gestes de base, sans vidéo. Approche à valider avant M2.

## Choix de M1

| Sujet | Retenu | Raison |
|---|---|---|
| Version d'Expo | SDK 58 (React Native 0.88) | C'est la version qu'Expo Go sur l'App Store sait ouvrir. |
| Date de début | Lundi de la semaine en cours jusqu'au mercredi, sinon lundi suivant | Le prototype prenait toujours le lundi en cours : un jeudi, les deux premières séances étaient déjà passées. |
| Stockage | `expo-sqlite` seul, migrations SQL numérotées (`PRAGMA user_version`) | Drizzle annoncé au cadrage n'apporte pas assez pour 3 tables ; une dépendance de moins. Le profil est stocké en JSON (une colonne), les journaux en colonnes. |
| Aperçu web | `react-native-web` et `react-dom` | Captures d'écran automatiques et démos sans téléphone ; non utilisés par l'appli iOS. |
| Polices | `@expo-google-fonts/barlow` et `barlow-semi-condensed` | Polices de la piste 2, chargées par `expo-font`, compatibles Expo Go. |
| Matériel maison | Remplacements dans `content/data/equipment.json` | Chaque exercice de salle a un équivalent haltères ou poids du corps, sans doublon dans une séance. |
| Textes du prototype | « +2 kg » → « +2,5 kg », « +200 kcal » → « +150 kcal », « ±1 kg » → « ±0,25 kg par semaine » | Alignés sur les règles ci-dessous. |

## Choix de M2

| Sujet | Retenu | Raison |
|---|---|---|
| Mannequin 3D | Paquet `@muscu/motion` (TypeScript pur, sans dépendance) : squelette, cinématique inverse, 61 gestes de base pour les 90 exercices | Hors ligne, léger, aucune vidéo à télécharger ; les gestes sont testés (longueurs des membres, cibles atteintes, rien sous le sol). |
| Rendu 3D | `three` 0.185 dans `expo-gl` (inclus dans Expo Go) | Pas de `@react-three/fiber` ni d'`expo-three` : deux dépendances de moins, la scène est un module three.js autonome (`apps/mobile/src/three/scene.ts`). Si la 3D est refusée par l'appareil, l'écran affiche les points clés seuls. |
| Écran allumé, vibration | `expo-keep-awake`, `expo-haptics` | Modules Expo officiels, inclus dans Expo Go. |
| Séance guidée | Machine à états pure dans le moteur (`sessionReducer`) | Toute la logique (séries, charges, repos, remplacements) est testée sans interface ; l'écran ne fait qu'afficher et envoyer des actions. |
| Reprise après interruption | État de la séance gardé à chaque action (table `settings`) | Fermer l'appli ou recevoir un appel ne fait rien perdre. |
| Niveau confirmé | Saisie d'un 1RM par exercice (charge de travail : 2 répétitions en réserve) et répétitions en réserve facultatives, enregistrées en RPE | Extensions du cahier des charges, sans alourdir l'écran des débutants. |
| Presse à cuisses | Montrée avec le geste du squat | Même mouvement des hanches et des genoux ; une machine en 3D n'apporte rien à la compréhension. |
| Photos de progression | Reportées | Nécessitent un stockage chiffré ; prévues avec le partage (M4). |

## Règles harmonisées (incohérences du prototype)

| Sujet | Prototype | Retenu | Raison |
|---|---|---|---|
| Pas de progression | +2 kg (Guide, calendrier) ou +2,5 kg (séance guidée) | +2,5 kg partout (`LOAD_STEP_KG`) | Le cahier des charges fixe un pas de 2,5 kg. Le pas sera réglable par exercice si des haltères de 1 kg l'exigent. |
| Ajustement des calories | Texte « masse » : +200 kcal ; code : +150 | ±150 kcal | Dans la fourchette usuelle (100 à 200 kcal) ; un seul chiffre pour éviter la confusion. Texte à corriger en M3. |
| Tendance de poids visée | Texte « poids stable à ±1 kg » ; code ±0,25 kg/sem | ±0,25 kg/sem pour explosivité et cardio | C'est ce que le calcul applique ; le texte sera reformulé. |
| Check-in difficile | Texte : « une série en moins et des charges plus légères » ; code : une série en moins | Une série en moins, non cumulée avec la semaine allégée | Conforme au cahier des charges ; le texte sera aligné. |
| 2 séances en explosivité | Haut puis bas | Chaque séance mélange haut et bas | Cahier des charges. Le cardio garde endurance + fractionné. |
| Magnésium | 200 à 400 mg | 200 à 250 mg | L'EFSA fixe à 250 mg/jour la limite du magnésium apporté en complément. |
| Œufs durs, brocoli, tortillas | Prix et libellés séparés | Fusionnés dans un ingrédient canonique | La liste de courses additionne ce qui s'achète ensemble ; le libellé de la recette est gardé. |

## Vérifications des repères (sources de référence)

- **Calories** : Mifflin-St Jeor × 1,55 (activité modérée), estimation à ajuster avec le poids sur 2 semaines. Conservé.
- **Protéines** : 1,6 à 2,2 g/kg pour la prise de muscle (méta-analyse Morton et al., 2018). Le prototype met 1,7 à 1,8 g/kg en force, masse et explosivité, et 1,5 g/kg en cardio (les recommandations endurance vont de 1,2 à 1,6 g/kg). Conservé.
- **Lipides** : au moins 0,6 g/kg et 20 à 35 % des calories. Le prototype met 1 à 1,2 g/kg, soit environ 25 % pour le profil de référence. Conforme.
- **Prise de poids** : 0,25 à 0,5 kg/sem en masse, adapté à un débutant. Conservé.
- **Caféine** : départ 2 mg/kg, jusqu'à 3 mg/kg ; les études vont de 3 à 6 mg/kg ; plafond EFSA de 400 mg/jour. Départ bas conservé (public fumeur, cœur).
- **Créatine** : 3 à 5 g/jour sans phase de charge. Conforme.
- **Oméga-3** : 500 mg à 1 g d'EPA + DHA (l'EFSA recommande au moins 250 mg). Conforme.
- **Eau** : 35 ml/kg, +0,5 L les jours de séance. Repère usuel, conservé.
- **Sevrage tabagique** : Tabac Info Service, 39 89 (France). Vérifié.

## Constats à traiter plus tard

- En mode budget serré, les semaines 1 et 4 de la rotation donnent le même menu (formules du prototype). À revoir en M3 avec les nouvelles recettes.
- Les recettes passent de 27 à 60 en M3.
- Le remplacement d'exercice ne tient pas encore compte du matériel (salle ou maison) : prévu en M1 avec l'onboarding.
