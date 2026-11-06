import { z } from 'zod';

export const GoalId = z.enum(['mass', 'strength', 'power', 'cardio', 'fatloss', 'health']);
export type GoalId = z.infer<typeof GoalId>;

/** Objet avec une entrée obligatoire par objectif (z.record rendrait les clés optionnelles). */
const byGoal = <T extends z.ZodTypeAny>(s: T) => z.object({ mass: s, strength: s, power: s, cardio: s, fatloss: s, health: s });

export const LevelId = z.enum(['beginner', 'intermediate', 'advanced']);
export type LevelId = z.infer<typeof LevelId>;
const byLevel = <T extends z.ZodTypeAny>(s: T) => z.object({ beginner: s, intermediate: s, advanced: s });

export const Joint = z.enum(['shoulder', 'knee', 'lowerBack', 'wrist', 'elbow']);
export type Joint = z.infer<typeof Joint>;

export const Muscle = z.enum([
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes',
  'calves', 'core', 'lowerBack', 'fullBody', 'cardio', 'mobility',
]);
export type Muscle = z.infer<typeof Muscle>;
export const Equipment = z.enum([
  'barbell', 'dumbbell', 'cable', 'machine', 'pullupBar', 'box', 'medicineBall',
  'jumpRope', 'cardioMachine', 'foamRoller', 'bodyweight',
]);

export const Exercise = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['strength', 'power', 'core', 'cardio', 'mobility']),
  muscles: z.array(Muscle).min(1),
  equipment: Equipment,
  /** Rôle dans la séance : exercice de base, ciblé, gainage… */
  role: z.enum(['compound', 'isolation', 'core', 'power', 'cardio', 'mobility']),
  /** Articulations fortement sollicitées (pour adapter la séance aux blessures). */
  joints: z.array(Joint),
  technique: z.string().optional(),
});
export type Exercise = z.infer<typeof Exercise>;

export const ExercisesFile = z.object({
  exercises: z.array(Exercise),
  techniques: z.array(z.object({ id: z.string(), name: z.string(), text: z.string() })),
  substitutions: z.array(z.array(z.string()).min(2)),
});

export const Prescription = z.object({ exercise: z.string(), scheme: z.string() });
export type Prescription = z.infer<typeof Prescription>;

const Goal = z.object({
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  weightGoalText: z.string(),
  phaseTexts: z.array(z.string()).length(3),
  nutritionNotes: z.object({ before: z.string(), after: z.string(), adjust: z.string() }),
});

export const ProgramsFile = z.object({
  goals: byGoal(Goal),
  phaseNames: z.array(z.string()).length(3),
  // templates[goal][phase][session] -> prescriptions
  templates: byGoal(z.array(z.array(z.array(Prescription))).length(3)),
  recovery: z.object({
    mobility: z.object({ title: z.string(), items: z.array(Prescription) }),
    walk: z.object({ title: z.string(), items: z.array(Prescription) }),
  }),
  backCare: Prescription,
});
export type ProgramsFile = z.infer<typeof ProgramsFile>;

export const Macros = z.object({
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});
export type Macros = z.infer<typeof Macros>;

export const Ingredient = z.object({
  id: z.string(),
  name: z.string(),
  aisle: z.enum(['fresh', 'pantry', 'spice']),
  per100g: Macros,
  gramsPerUnit: z.number().positive().optional(),
});
export type Ingredient = z.infer<typeof Ingredient>;

export const IngredientsFile = z.object({
  ingredients: z.array(Ingredient),
  spoonGrams: z.object({ tbsp: z.number(), tsp: z.number() }),
});

export const Unit = z.enum(['g', 'ml', 'piece', 'tbsp', 'tsp']);
export type Unit = z.infer<typeof Unit>;

export const RecipeIngredient = z.object({
  ingredient: z.string(),
  qty: z.number().positive(),
  unit: Unit,
  label: z.string().optional(),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredient>;

export const RecipeTag = z.enum(['budget', 'noPork', 'vegetarian', 'batch', 'freezable', 'dense', 'light']);
export type RecipeTag = z.infer<typeof RecipeTag>;

export const Recipe = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['breakfast', 'main', 'snack']),
  minutes: z.number().int().positive(),
  // kcal et protéines annoncés par le prototype, gardés comme repère de contrôle
  reference: z.object({ kcal: z.number(), protein: z.number() }).optional(),
  ingredients: z.array(RecipeIngredient).min(1),
  steps: z.array(z.string()).min(1),
  tasteTip: z.string().min(1),
  tags: z.array(RecipeTag),
});
export type Recipe = z.infer<typeof Recipe>;

export const RecipesFile = z.object({ recipes: z.array(Recipe) });

export const MealPlan = z.object({
  names: z.array(z.string()).min(3),
  categories: z.array(z.enum(['breakfast', 'main', 'snack'])).min(3),
  shares: z.array(z.number()).min(3),
});
export const MenusFile = z.object({
  rotationWeeks: z.number().int().positive(),
  /** Plans de repas : clé = nombre de prises par jour (3 à 6). */
  mealPlans: z.record(z.string(), MealPlan),
});
export type MenusFile = z.infer<typeof MenusFile>;

export const PricesFile = z.object({
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.literal('EUR'),
  source: z.string(),
  spoonCost: z.number().nonnegative(),
  spicePotPrice: z.number().nonnegative(),
  items: z.record(z.string(), z.union([
    z.object({ perKg: z.number().nonnegative() }),
    z.object({ perUnit: z.number().nonnegative() }),
  ])),
  packs: z.record(z.string(), z.object({ size: z.number().positive(), price: z.number().nonnegative(), label: z.string() })),
  bulk: z.array(z.object({
    ingredient: z.string(),
    format: z.string(),
    size: z.number().positive(),
    unit: z.enum(['g', 'piece']),
    price: z.number().positive(),
    shelfLife: z.string(),
  })),
});
export type PricesFile = z.infer<typeof PricesFile>;

const LevelPlan = z.object({ kcalOffset: z.number(), trendPct: z.tuple([z.number(), z.number()]) });
export const NutritionFile = z.object({
  activityFactor: z.number(),
  waterLitersPerKg: z.number(),
  waterTrainingBonusL: z.number(),
  minKcal: z.object({ male: z.number(), female: z.number(), bmrFactor: z.number() }),
  goals: byGoal(z.object({
    proteinPerKg: z.number(),
    fatPerKg: z.number(),
    /** Surplus ou déficit (kcal/jour) et variation de poids visée (% du poids par semaine), par niveau. */
    byLevel: byLevel(LevelPlan),
    /** Prise de masse difficile : surplus plus grand, 5 repas, ajustement de 200 kcal. */
    hardGainer: z.object({
      kcalOffset: byLevel(z.number()),
      trendPct: byLevel(z.tuple([z.number(), z.number()])),
      proteinPerKg: z.number(),
      fatPerKg: z.number(),
      adjustKcal: z.number(),
      mealsPerDay: z.number(),
    }).optional(),
  })),
  quickFoods: z.array(z.object({ name: z.string(), kcal: z.number(), protein: z.number(), carbs: z.number(), fat: z.number() })),
});
export type NutritionFile = z.infer<typeof NutritionFile>;

export const SupplementId = z.enum(['creatine', 'whey', 'omega3', 'caffeine', 'vitaminD', 'magnesium']);
export type SupplementId = z.infer<typeof SupplementId>;
export const SupplementsFile = z.object({
  supplements: z.array(z.object({
    id: SupplementId, name: z.string(), dose: z.string(), timing: z.string(), trainingDaysOnly: z.boolean(),
  })),
  defaults: byGoal(z.array(SupplementId)),
  usefulness: z.array(z.object({
    name: z.string(),
    byGoal: byGoal(z.enum(['recommended', 'useful', 'optional', 'useless'])),
  })),
  guide: z.object({
    intro: z.string(),
    buyOrder: z.string(),
    stacks: byGoal(z.array(z.string())),
    doses: z.array(z.object({ name: z.string(), dose: z.string() })),
    cupNote: z.string(),
    timing: z.array(z.object({ when: z.string(), what: z.string() })),
    preworkout: z.string(),
    warnings: z.array(z.string()),
    smokerWarning: z.string(),
    disclosure: z.string(),
    shops: z.array(z.object({ title: z.string(), text: z.string(), links: z.array(z.object({ label: z.string(), url: z.string().url() })) })),
    labels: z.string(),
  }),
});
export type SupplementsFile = z.infer<typeof SupplementsFile>;

export const EquipmentFile = z.object({
  home: z.object({
    description: z.string(),
    available: z.array(Equipment),
    alternatives: z.record(z.string(), z.array(z.string()).min(1)),
  }),
});
export type EquipmentFile = z.infer<typeof EquipmentFile>;

export const ExclusionsFile = z.object({
  diets: z.array(z.object({ id: RecipeTag, name: z.string() })),
  allergies: z.array(z.object({ id: z.string(), name: z.string(), ingredients: z.array(z.string()).min(1) })),
});
export type ExclusionsFile = z.infer<typeof ExclusionsFile>;

export const GuideFile = z.object({
  sections: z.array(z.object({ id: z.string(), title: z.string(), text: z.string() })).min(1),
  warmup: z.object({ title: z.string(), steps: z.array(z.string()).min(1) }),
  glossary: z.array(z.object({ term: z.string(), text: z.string() })).min(1),
});

const Confidence = z.enum(['élevée', 'moyenne', 'faible']);
export const EvidenceFile = z.object({
  note: z.string(),
  items: z.array(z.object({
    id: z.string(), topic: z.string(), claim: z.string(),
    source: z.object({ title: z.string(), url: z.string().url() }),
    type: z.string(), confidence: Confidence, limit: z.string(),
  })).min(1),
});
export type EvidenceFile = z.infer<typeof EvidenceFile>;

export const HealthFile = z.object({
  intro: z.string(),
  questions: z.array(z.object({ id: z.string(), text: z.string(), level: z.enum(['advice', 'doctor']) })).min(1),
  outcomes: z.object({
    ok: z.object({ title: z.string(), text: z.string() }),
    advice: z.object({ title: z.string(), text: z.string() }),
    doctor: z.object({ title: z.string(), text: z.string() }),
  }),
  underweight: z.string(),
});
export type HealthFile = z.infer<typeof HealthFile>;

const Range = z.tuple([z.number(), z.number()]);
export const CoachingFile = z.object({
  levels: byLevel(z.object({ name: z.string(), text: z.string(), phaseStarts: Range, recommendedSessions: Range })),
  volumeSetsPerWeek: z.object({ default: byLevel(Range), strength: byLevel(Range), health: byLevel(Range), fatloss: byLevel(Range) }),
  volumeMuscles: z.array(Muscle),
  /** Muscles évalués par rapport à la cible (les autres sont seulement affichés). */
  volumeEvaluated: z.array(Muscle),
  /** Petits muscles : cible réduite (ils travaillent aussi en indirect). */
  volumeSmallMuscles: z.object({ muscles: z.array(Muscle), low: z.number(), high: z.number() }),
  volumePriority: z.array(Muscle),
  /** Complément de volume pour les niveaux intermédiaire et avancé, à partir de cette phase (0, 1 ou 2). */
  topUpFromPhase: z.number().int().min(0).max(2),
  topUpMaxPerSession: z.number().int().positive(),
  accessories: z.record(z.string(), z.array(Prescription)),
  session: z.object({ setSeconds: z.number(), transitionSeconds: z.number(), warmupMinutes: z.number(), minExercises: z.number(), freeMinutesDefault: z.number() }),
  progression: z.object({ microStepKg: z.number(), microBelowKg: z.number(), stepKg: z.number(), plateauSessions: z.number(), plateauMinGainPct: z.number() }),
  deload: z.object({
    fatigueEnergyBelow: z.number(), hardShareAbove: z.number(), windowDays: z.number(),
    maxWeeksWithoutDeload: byLevel(z.number()), minWeeksBetween: z.number(),
  }),
  calories: z.object({ adjustKcal: z.number(), belowToleranceKg: z.number(), aboveToleranceKg: z.number() }),
  plyoContactsMax: z.number(),
});
export type CoachingFile = z.infer<typeof CoachingFile>;

export const WhyFile = z.object({
  roles: z.record(z.string(), z.object({ label: z.string(), text: z.string() })),
  zones: z.array(z.object({ id: z.string(), min: z.number(), max: z.number(), label: z.string(), text: z.string(), restText: z.string() })),
  rirByPhase: z.array(z.string()).length(3),
  phaseWhy: z.array(z.string()).length(3),
  goals: byGoal(z.object({ training: z.string(), nutrition: z.string(), evidence: z.array(z.string()) })),
  hardGainer: z.object({
    title: z.string(), intro: z.string(),
    tips: z.array(z.object({ text: z.string(), evidence: z.array(z.string()) })),
    boosters: z.array(z.object({ ingredient: z.string(), qty: z.number(), unit: Unit, label: z.string() })),
  }),
  fatLoss: z.object({ title: z.string(), tips: z.array(z.string()) }),
  cardio: z.object({ title: z.string(), zones: z.array(z.object({ label: z.string(), text: z.string() })), fuel: z.string() }),
  progression: z.object({ title: z.string(), text: z.string() }),
  deload: z.object({
    title: z.string(), text: z.string(), reasons: z.record(z.string(), z.string()),
    now: z.string(), skip: z.string(), undo: z.string(),
  }),
});
export type WhyFile = z.infer<typeof WhyFile>;
