import { z } from 'zod';

export const GoalId = z.enum(['mass', 'strength', 'power', 'cardio']);
export type GoalId = z.infer<typeof GoalId>;

/** Objet avec une entrée obligatoire par objectif (z.record rendrait les clés optionnelles). */
const byGoal = <T extends z.ZodTypeAny>(s: T) => z.object({ mass: s, strength: s, power: s, cardio: s });

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

export const RecipeTag = z.enum(['budget', 'noPork', 'vegetarian', 'batch', 'freezable']);
export type RecipeTag = z.infer<typeof RecipeTag>;

export const Recipe = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['breakfast', 'main', 'snack']),
  minutes: z.number().int().positive(),
  // kcal et protéines annoncés par le prototype, gardés comme repère de contrôle
  reference: z.object({ kcal: z.number(), protein: z.number() }),
  ingredients: z.array(RecipeIngredient).min(1),
  steps: z.array(z.string()).min(1),
  tasteTip: z.string().min(1),
  tags: z.array(RecipeTag),
});
export type Recipe = z.infer<typeof Recipe>;

export const RecipesFile = z.object({ recipes: z.array(Recipe) });

const Rotation = z.object({
  breakfast: z.array(z.string()).min(1),
  main: z.array(z.string()).min(1),
  snack: z.array(z.string()).min(1),
});
export type Rotation = z.infer<typeof Rotation>;
export const MenusFile = z.object({
  rotationWeeks: z.number().int().positive(),
  mealShares: z.array(z.number()).length(4),
  slots: z.array(z.string()).length(4),
  budget: Rotation,
  normal: Rotation,
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

export const NutritionFile = z.object({
  activityFactor: z.number(),
  waterLitersPerKg: z.number(),
  waterTrainingBonusL: z.number(),
  goals: byGoal(z.object({
    kcalOffset: z.number(),
    proteinPerKg: z.number(),
    fatPerKg: z.number(),
    weightTrendKgPerWeek: z.tuple([z.number(), z.number()]),
  })),
  quickFoods: z.array(z.object({ name: z.string(), kcal: z.number(), protein: z.number() })),
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
});
export type SupplementsFile = z.infer<typeof SupplementsFile>;
