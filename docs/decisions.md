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

## Choix de M3

| Sujet | Retenu | Raison |
|---|---|---|
| Recettes | 64 (27 du prototype, 37 nouvelles), chacune avec astuce de goût, macros calculées, coût et tags | Cahier des charges : au moins 60. Script d'ajout `tools/add-recipes-m3.mjs` (relançable). |
| Tag « budget » des nouvelles recettes | Au plus 2,15 € pour 1 000 kcal | Le coût par portion seul classait « budget » des plats chers en calories (œufs, feta) et faisait passer la semaine à 38 €. 2,15 € est le niveau des recettes budget du prototype. |
| Rotation des menus | Construite à partir des recettes autorisées (budget, régime, allergies, plats exclus, favoris doublés) | Le prototype utilisait des listes fixes : impossible de filtrer, et en budget serré les semaines 1 et 4 étaient identiques. Les menus diffèrent donc de ceux du prototype. |
| Budget serré, profil de référence | Environ 29 € par semaine à 2 600 kcal, 32 à 33 € à 2 900 kcal (prise de masse) | Au-dessus du budget, l'appli l'affiche avec deux pistes (cahier des charges). La première semaine coûte plus cher : on remplit le placard. |
| Prix | Fichier daté (5 novembre 2026) et prix de la personne en base (`price_override`) | Les prix saisis remplacent l'estimation partout : menus, recettes, courses, budget. |
| Suivi de l'eau, batch cooking | Faits | Extensions simples, utiles au quotidien. |
| Open Food Facts, scan de code-barres | Reportés | Envoient une requête à un service tiers : à faire avec votre accord explicite et une dépendance de scan à valider. |
| Migration du prototype | Script figé (`--force` obligatoire) | Les JSON contiennent désormais des ajouts faits à la main. |

## Choix de M4

| Sujet | Retenu | Raison |
|---|---|---|
| Rappels | `expo-notifications`, notifications locales hebdomadaires (jour + heure), calculées par le moteur (`reminderPlan`) | Fonctionne dans Expo Go sans serveur ; au plus 40 rappels, sous la limite iOS de 64. |
| Synchronisation et partage | `@supabase/supabase-js`, projet UE, une ligne par profil, règles RLS, invitations par code | Choix validé au cadrage. Activée seulement si un projet est configuré (`.env`, non versionné) ; aucune clé dans le dépôt. |
| Consentement | Écran explicite listant les données de santé envoyées, avant toute connexion ; suppression des données en ligne en un bouton | Règle du cahier des charges : aucune donnée de santé envoyée sans accord explicite. |
| Partage en lecture seule | Écran de consultation dédié (assiduité, records, poids) avec défi amical sur 4 semaines | Plus simple et plus sûr que d'ouvrir toute l'appli en mode bloqué. La co-édition, elle, importe le profil comme un profil normal. |
| Fusion des données | Par entrée (même profil et même jour) : la plus récente l'emporte | Une suppression peut réapparaître ; limite notée, à améliorer avec des dates de modification par entrée. |
| Sauvegarde | Format v2 (eau, changements de plats, favoris, prix ajoutés) ; v1 et exports du prototype toujours lisibles | Export par la feuille de partage d'iOS, import par copier-coller : aucune dépendance. |
| Profils multiples | Sur le même téléphone, chacun son programme, sa nutrition et son suivi | Cahier des charges. |
| Hygiène de vie | Compteurs quotidiens, tendance sur 7 jours, Tabac Info Service (39 89) et Alcool Info Service (0 980 980 930) | Messages bienveillants, jamais culpabilisants. |
| Liens d'achat des compléments | Dans `supplements.json`, avec la mention des commissions éventuelles | Modifiables sans toucher au code. Élan ne touche aucune commission aujourd'hui. |

## Choix de M5

| Sujet | Retenu | Raison |
|---|---|---|
| Accessibilité | Audit axe-core sur 12 écrans : plus aucun défaut critique ou sérieux. États « coché » annoncés, étapes de l'onboarding en barre de progression, zones tactiles d'au moins 44 points | VoiceOver annonce correctement les choix. L'alerte restante (« landmarks ») ne concerne que le web. |
| Taille du texte | Suit le réglage de l'iPhone jusqu'à 150 % | Au-delà, les écrans de séance deviennent illisibles ; 150 % couvre les tailles d'accessibilité courantes. |
| Mannequin 3D | Bouton pause ; à l'arrêt au départ si « Réduire les animations » est activé | Règle d'accessibilité : tout contenu animé doit pouvoir être mis en pause. |
| Performances | Pas d'optimisation ajoutée | Les calculs les plus lourds (rotation des menus, liste de courses) prennent moins de 2 ms. |
| Icône | « É » néon sur fond nuit, générée depuis les polices de l'appli | Lisible en petit, cohérente avec la piste 2. |
| Builds | `eas.json` (aperçu interne et production TestFlight), configuration iOS vérifiée par `expo prebuild` | Build et envoi dans le cloud, sans Mac. Le compte Apple Developer reste à créer. |
| `expo-system-ui` | Ajouté | Fond nuit dès le lancement, sans flash blanc (module Expo officiel). |
| Contenu manquant du prototype | Écran Guide (bien démarrer, fiches techniques, glossaire), échauffement avant chaque séance, mention « pas un avis médical » | Prévu par le cahier des charges pour le niveau débutant ; il n'avait pas encore d'écran. |

## Supabase (après M5)

| Sujet | Retenu | Raison |
|---|---|---|
| Projet | Projet existant du compte, vide, en région UE (Francfort) | Évite un second projet ; l'offre gratuite en limite le nombre. |
| Droits | `TRUNCATE` et tous les droits des visiteurs non connectés retirés | `TRUNCATE` ignore les règles RLS : n'importe quel utilisateur aurait pu vider la table. |
| Clé de l'appli | Clé « publishable » et adresse versionnées dans `config.ts` | Publiques par conception (incluses dans chaque appli installée) ; la clé secrète n'est jamais versionnée. |
| Connexion | Désactivée dans l'appli tant que les codes par e-mail ne sont pas envoyés | Sans SMTP, Supabase envoie un lien et non un code, et au plus 2 e-mails par heure. |

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
