import {
  content as defaultContent, type Content, type GoalId, type Macros, type Recipe, type RecipeIngredient,
} from '@muscu/content';
import { diffDays, type IsoDate } from './dates';
import type { Profile, Sex } from './model';

const r5 = (x: number) => Math.round(x / 5) * 5;
const SEX_CONSTANT: Record<Sex, number> = { male: 5, female: -161 };

type Body = Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age'>;

/** Métabolisme de base (Mifflin-St Jeor). */
export function bmr(p: Body): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + SEX_CONSTANT[p.sex];
}

/** Dépense d'entretien M = BMR × 1,55 (activité modérée). */
export function maintenance(p: Body, c: Content = defaultContent): number {
  return bmr(p) * c.nutrition.activityFactor;
}

export interface Targets extends Macros {
  /** Entretien arrondi à 10 kcal, pour l'affichage. */
  maintenance: number;
}

/**
 * Cibles du jour : C = 50 × round((M + S) / 50), S selon l'objectif.
 * Protéines et lipides en g/kg arrondis à 5 g ; les glucides complètent.
 */
export function targets(p: Body, goal: GoalId, c: Content = defaultContent): Targets {
  const g = c.nutrition.goals[goal];
  const m = maintenance(p, c);
  const kcal = Math.round((m + g.kcalOffset) / 50) * 50;
  const protein = r5(g.proteinPerKg * p.weightKg);
  const fat = r5(g.fatPerKg * p.weightKg);
  const carbs = r5((kcal - 4 * protein - 9 * fat) / 4);
  return { kcal, protein, carbs, fat, maintenance: Math.round(m / 10) * 10 };
}

/** Cibles effectives : celles saisies par la personne priment sur le calcul. */
export function effectiveTargets(p: Profile, c: Content = defaultContent): Targets {
  const t = targets(p, p.goal, c);
  return { ...t, kcal: p.kcalTarget ?? t.kcal, protein: p.proteinTarget ?? t.protein };
}

export function mealSplit(t: Macros, c: Content = defaultContent): Macros[] {
  return c.menus.mealShares.map((q) => ({
    kcal: Math.round((t.kcal * q) / 10) * 10,
    protein: Math.round(t.protein * q),
    carbs: Math.round(t.carbs * q),
    fat: Math.round(t.fat * q),
  }));
}

/** Eau recommandée en litres (0,035 L/kg, +0,5 L les jours de séance). */
export function waterLiters(weightKg: number, trainingDay: boolean, c: Content = defaultContent): number {
  const base = Math.round(weightKg * c.nutrition.waterLitersPerKg * 10) / 10;
  return trainingDay ? Math.round((base + c.nutrition.waterTrainingBonusL) * 10) / 10 : base;
}

export function bmi(weightKg: number, heightCm: number): number {
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
}

// ---------- recettes ----------

export function ingredientGrams(i: RecipeIngredient, c: Content = defaultContent): number {
  const ing = c.ingredients.ingredients.find((x) => x.id === i.ingredient);
  if (!ing) throw new Error(`Ingrédient inconnu : ${i.ingredient}`);
  switch (i.unit) {
    case 'g': case 'ml': return i.qty;
    case 'piece': return i.qty * (ing.gramsPerUnit ?? 0);
    case 'tbsp': return i.qty * c.ingredients.spoonGrams.tbsp;
    case 'tsp': return i.qty * c.ingredients.spoonGrams.tsp;
  }
}

/** Valeurs nutritionnelles d'une portion de base, calculées depuis les ingrédients. */
export function recipeMacros(r: Recipe, c: Content = defaultContent): Macros {
  const m = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const i of r.ingredients) {
    const ing = c.ingredients.ingredients.find((x) => x.id === i.ingredient)!;
    const f = ingredientGrams(i, c) / 100;
    m.kcal += ing.per100g.kcal * f;
    m.protein += ing.per100g.protein * f;
    m.carbs += ing.per100g.carbs * f;
    m.fat += ing.per100g.fat * f;
  }
  return { kcal: Math.round(m.kcal), protein: Math.round(m.protein), carbs: Math.round(m.carbs), fat: Math.round(m.fat) };
}

export const PORTION_MIN = 0.7;
export const PORTION_MAX = 1.6;

/** Coefficient de portion pour atteindre la part de la cible, borné de 0,7 à 1,6, au dixième. */
export function portionFactor(recipeKcal: number, dailyKcal: number, share: number): number {
  const m = Math.round(((dailyKcal * share) / recipeKcal) * 10) / 10;
  return Math.min(PORTION_MAX, Math.max(PORTION_MIN, m));
}

export function scaleMacros(m: Macros, f: number): Macros {
  return {
    kcal: Math.round(m.kcal * f), protein: Math.round(m.protein * f),
    carbs: Math.round(m.carbs * f), fat: Math.round(m.fat * f),
  };
}

/** Quantité affichée après mise à l'échelle : g/ml au 5 près, pièces à la demie sous 2, sinon à l'unité. */
export function scaleQty(i: RecipeIngredient, f: number): number {
  const q = i.qty * f;
  if (i.unit === 'g' || i.unit === 'ml') return Math.round(q / 5) * 5;
  return q < 2 ? Math.round(q * 2) / 2 : Math.round(q);
}

// ---------- menus ----------

export type Slot = 0 | 1 | 2 | 3;
export const SLOTS: Slot[] = [0, 1, 2, 3];

/**
 * Menu d'un jour de la rotation (semaine 0–3, jour 0–6), formules du prototype.
 * Renvoie les identifiants de recette : matin, midi, collation, soir.
 */
export function menuForDay(week: number, day: number, budgetMode: boolean, c: Content = defaultContent): string[] {
  const n = week * 7 + day;
  const R = budgetMode ? c.menus.budget : c.menus.normal;
  const at = (a: string[], i: number) => a[i % a.length]!;
  if (budgetMode) {
    return [at(R.breakfast, n + week), at(R.main, n * 3 + week), at(R.snack, n + week), at(R.main, n * 3 + week + 3)];
  }
  return [at(R.breakfast, n + week), at(R.main, n * 3 + week), at(R.snack, n + 2 * week), at(R.main, n * 3 + week + 7)];
}

/** Menu d'une date réelle : rotation de 28 jours depuis le début du programme. */
export function menuForDate(start: IsoDate, date: IsoDate, budgetMode: boolean, c: Content = defaultContent): string[] {
  const n = Math.max(0, diffDays(date, start)) % (c.menus.rotationWeeks * 7);
  return menuForDay(Math.floor(n / 7), n % 7, budgetMode, c);
}

export interface PlannedMeal {
  slot: Slot;
  recipe: Recipe;
  factor: number;
  macros: Macros;
}

export function plannedMeals(recipeIds: string[], dailyKcal: number, c: Content = defaultContent): PlannedMeal[] {
  return recipeIds.map((id, slot) => {
    const recipe = c.recipes.find((r) => r.id === id);
    if (!recipe) throw new Error(`Recette inconnue : ${id}`);
    const base = recipeMacros(recipe, c);
    const factor = portionFactor(base.kcal, dailyKcal, c.menus.mealShares[slot]!);
    return { slot: slot as Slot, recipe, factor, macros: scaleMacros(base, factor) };
  });
}

/** Filtres de profil : tags exigés et ingrédients exclus. */
export function recipeAllowed(r: Recipe, p: Pick<Profile, 'dietTags' | 'excludedIngredients'>): boolean {
  return p.dietTags.every((t) => r.tags.includes(t))
    && !r.ingredients.some((i) => p.excludedIngredients.includes(i.ingredient));
}
