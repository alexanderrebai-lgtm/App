import type { PatternId } from './patterns';

/** Ce que tient le mannequin. */
export type Implement = 'none' | 'dumbbells' | 'dumbbell' | 'goblet' | 'barbell' | 'ball' | 'cable';

export interface Movement {
  pattern: PatternId;
  implement: Implement;
  /** Orientation des haltères : poignée de gauche à droite, ou d'avant en arrière (prise neutre). */
  grip?: 'pronated' | 'neutral';
  /** Accélère ou ralentit le tempo du geste (exercices explosifs, fractionné). */
  speed?: number;
}

const M = (pattern: PatternId, implement: Implement = 'none', extra: Partial<Movement> = {}): Movement => ({ pattern, implement, ...extra });

/** Geste et accessoire pour chacun des 90 exercices du programme. */
export const MOVEMENTS: Record<string, Movement> = {
  'barre-au-front': M('skullCrusher', 'barbell'),
  'bird-dog': M('birdDog'),
  'chat-vache': M('catCow'),
  'circuit-squat-pompes-rowing': M('airSquat'),
  'corde-a-sauter': M('jumpRope'),
  crunch: M('crunch'),
  'curl-barre-ez': M('curl', 'barbell'),
  'curl-biceps-halteres': M('curl', 'dumbbells'),
  'curl-marteau': M('curl', 'dumbbells', { grip: 'neutral' }),
  'dead-bug': M('deadBug'),
  'developpe-couche-barre': M('benchPress', 'barbell'),
  'developpe-couche-halteres': M('benchPress', 'dumbbells'),
  'developpe-couche-halteres-rapide': M('benchPress', 'dumbbells', { speed: 1.6 }),
  'developpe-epaules-halteres': M('pressDumbbells', 'dumbbells'),
  'developpe-incline-barre': M('inclinePress', 'barbell'),
  'developpe-incline-halteres': M('inclinePress', 'dumbbells'),
  'developpe-militaire-barre': M('pressBarbell', 'barbell'),
  'developpe-militaire-halteres': M('pressDumbbells', 'dumbbells'),
  dips: M('dip'),
  'dips-lestes': M('dip'),
  'dips-sur-banc': M('benchDip'),
  'echauffement-footing': M('run', 'none', { speed: 0.85 }),
  'echauffement-marche': M('walk'),
  'elevations-laterales': M('lateralRaise', 'dumbbells', { grip: 'neutral' }),
  'etirement-flechisseurs-de-hanche': M('hipFlexorStretch'),
  'etirement-ischio-jambiers': M('hamstringStretch'),
  'etirement-pecs-au-mur': M('pecStretch'),
  etirements: M('hamstringStretch'),
  'etirements-jambes-et-dos': M('hamstringStretch'),
  'extension-lombaire-a-45': M('backExtension'),
  'extension-lombaire-lestee': M('backExtension'),
  'extension-triceps-poulie': M('pushdown', 'cable'),
  'face-pull': M('facePull', 'cable'),
  'fentes-alternees': M('lunge', 'dumbbells', { grip: 'neutral' }),
  'fentes-bulgares': M('splitSquat', 'dumbbells', { grip: 'neutral' }),
  'fentes-marchees': M('lunge'),
  'fentes-marchees-lestees': M('lunge', 'dumbbells', { grip: 'neutral' }),
  'footing-facile-tu-peux-parler': M('run', 'none', { speed: 0.85 }),
  'fractionne-30-s-vite-90-s-lent': M('run', 'none', { speed: 1.25 }),
  'fractionne-45-s-vite-75-s-lent': M('run', 'none', { speed: 1.25 }),
  'fractionne-doux-1-min-rapide-2-min-lent': M('run'),
  'hip-thrust': M('hipThrust'),
  'hip-thrust-barre': M('hipThrust', 'barbell'),
  'lancer-de-medecine-ball': M('medBallSlam', 'ball'),
  'lancer-de-medecine-ball-au-mur': M('medBallChest', 'ball'),
  'leg-curl-machine': M('legCurl'),
  'leg-extension': M('legExtension'),
  'marche-rapide': M('walk', 'none', { speed: 1.2 }),
  'marche-rapide-retour-au-calme': M('walk'),
  'mollets-assis': M('seatedCalf'),
  'mollets-debout': M('calfRaise'),
  'mollets-sautes': M('hopCalf'),
  'oiseau-arriere-d-epaule': M('rearDelt', 'dumbbells', { grip: 'neutral' }),
  'pigeon-fessiers': M('pigeon'),
  planche: M('plank'),
  'planche-laterale': M('sidePlank'),
  pompes: M('pushUp'),
  'pompes-sur-genoux-si-besoin': M('pushUpKnees'),
  'pompes-explosives': M('pushUpExplosive'),
  'pont-fessier': M('bridge'),
  'pont-fessier-lent': M('bridge', 'none', { speed: 0.6 }),
  'posture-de-l-enfant': M('childPose'),
  'presse-a-cuisses': M('airSquat'),
  'presse-a-cuisses-vitesse': M('airSquat', 'none', { speed: 1.5 }),
  'pull-through-poulie': M('pullThrough', 'cable'),
  'releve-de-jambes': M('legRaise'),
  'releve-de-jambes-suspendu': M('hangingLegRaise'),
  'respiration-ventrale': M('breathing'),
  'retour-au-calme': M('walk', 'none', { speed: 0.8 }),
  'rotation-du-haut-du-dos': M('thoracicRotation'),
  'rouleau-de-massage-dos-et-cuisses': M('foamRoll'),
  'rowing-buste-appuye': M('rowSupported', 'dumbbells', { grip: 'neutral' }),
  'rowing-explosif-poulie': M('seatedRow', 'cable', { speed: 1.5 }),
  'rowing-haltere-un-bras': M('rowOneArm', 'dumbbell', { grip: 'neutral' }),
  'rowing-poulie-assis': M('seatedRow', 'cable'),
  'rowing-t-bar': M('rowTwoArms', 'barbell'),
  'sauts-en-longueur-sur-place': M('broadJump'),
  'sauts-sur-box': M('boxJump'),
  'skipping-rapide': M('highKnees'),
  'squat-goblet': M('squat', 'goblet'),
  'squat-goblet-lourd': M('squat', 'goblet'),
  'squat-saute': M('jumpSquat'),
  'superman-au-sol': M('superman'),
  'tirage-horizontal-poulie': M('seatedRow', 'cable'),
  'tirage-poitrine-prise-serree': M('pulldown', 'cable'),
  'tirage-vertical-poulie': M('pulldown', 'cable'),
  'tirage-vertical-prise-neutre': M('pulldown', 'cable'),
  'tractions-assistees': M('pullUp'),
  'tractions-lestees': M('pullUp'),
  'velo-ou-rameur-regulier': M('bike'),
};

export function movementFor(exerciseId: string): Movement {
  return MOVEMENTS[exerciseId] ?? M('walk');
}
