import {
  content as defaultContent, type Content, type GoalId, type Macros, type Recipe, type RecipeIngredient, type RecipeTag,
} from '@muscu/content';
import { addDays, diffDays, type IsoDate } from './dates';
import type { FoodEntry, Profile, Sex } from './model';

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

export type MealCategory = 'breakfast' | 'main' | 'snack';
/** Catégorie de recette servie à chaque prise : matin, midi, collation, soir. */
export const SLOT_CATEGORY: MealCategory[] = ['breakfast', 'main', 'snack', 'main'];

export interface MenuPrefs {
  budgetMode: boolean;
  dietTags: RecipeTag[];
  excludedIngredients: string[];
  /** Plats que la personne ne veut plus voir. */
  excludedRecipes?: string[];
  /** Plats favoris : ils reviennent deux fois plus souvent. */
  favoriteRecipes?: string[];
}

/**
 * Recettes possibles par catégorie : budget serré = recettes « budget », filtrées par
 * régime, allergies et plats exclus. Si un filtre vide une catégorie, on relâche
 * d'abord le budget, puis les plats exclus, pour toujours proposer un menu.
 */
export function recipePools(prefs: MenuPrefs, c: Content = defaultContent): Record<MealCategory, string[]> {
  const out = {} as Record<MealCategory, string[]>;
  const allowed = (r: Recipe) => recipeAllowed(r, prefs);
  const notExcluded = (r: Recipe) => !(prefs.excludedRecipes ?? []).includes(r.id);
  for (const cat of ['breakfast', 'main', 'snack'] as const) {
    const ofCat = c.recipes.filter((r) => r.category === cat);
    const tries = [
      ofCat.filter((r) => allowed(r) && notExcluded(r) && (!prefs.budgetMode || r.tags.includes('budget'))),
      ofCat.filter((r) => allowed(r) && notExcluded(r)),
      ofCat.filter(allowed),
      ofCat,
    ];
    const pool = tries.find((t) => t.length >= (cat === 'main' ? 2 : 1))!.map((r) => r.id);
    const fav = pool.filter((id) => (prefs.favoriteRecipes ?? []).includes(id));
    out[cat] = [...pool, ...fav];
  }
  return out;
}

/**
 * Menu d'un jour de la rotation (semaine 0–3, jour 0–6) : matin, midi, collation, soir.
 * Les plats du midi et du soir se suivent dans la liste : jamais deux fois le même plat le même jour.
 */
export function menuForDay(week: number, day: number, prefs: MenuPrefs, c: Content = defaultContent): string[] {
  const n = week * 7 + day;
  const P = recipePools(prefs, c);
  const at = (a: string[], i: number) => a[i % a.length]!;
  let lunch = at(P.main, 2 * n);
  let dinner = at(P.main, 2 * n + 1);
  if (lunch === dinner) dinner = at(P.main, 2 * n + 2);
  return [at(P.breakfast, n), lunch, at(P.snack, 3 * n + 1), dinner];
}

/** Changements de plats faits par la personne : clé « AAAA-MM-JJ|prise ». */
export type MenuOverrides = Record<string, string>;

/** Menu d'une date réelle : rotation de 28 jours depuis le début du programme, puis changements. */
export function menuForDate(start: IsoDate, date: IsoDate, prefs: MenuPrefs, overrides: MenuOverrides = {}, c: Content = defaultContent): string[] {
  const n = Math.max(0, diffDays(date, start)) % (c.menus.rotationWeeks * 7);
  const base = menuForDay(Math.floor(n / 7), n % 7, prefs, c);
  return base.map((id, slot) => overrides[`${date}|${slot}`] ?? id);
}

/** Plat suivant possible pour une prise (bouton « changer de plat »). */
export function nextRecipe(current: string, slot: Slot, prefs: MenuPrefs, avoid: string[] = [], c: Content = defaultContent): string {
  const pool = [...new Set(recipePools(prefs, c)[SLOT_CATEGORY[slot]!])];
  const i = pool.indexOf(current);
  for (let k = 1; k <= pool.length; k++) {
    const cand = pool[(Math.max(0, i) + k) % pool.length]!;
    if (cand !== current && !avoid.includes(cand)) return cand;
  }
  return current;
}

/** Les 28 jours de la rotation, recettes par prise. */
export function rotationDays(prefs: MenuPrefs, c: Content = defaultContent): string[][] {
  return Array.from({ length: c.menus.rotationWeeks * 7 }, (_, n) => menuForDay(Math.floor(n / 7), n % 7, prefs, c));
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

// ---------- suivi des calories ----------

export function dayTotals(entries: FoodEntry[], date: IsoDate): Macros {
  return entries.filter((e) => e.date === date).reduce(
    (a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein, carbs: a.carbs + (e.carbs ?? 0), fat: a.fat + (e.fat ?? 0) }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Entrée de journal pour « j'ai mangé le menu ». */
export function menuEntry(meal: PlannedMeal, date: IsoDate, profileId: string): FoodEntry {
  return { profileId, date, name: meal.recipe.name, ...meal.macros, menuSlot: meal.slot };
}

/** Totaux des `n` derniers jours, du plus ancien au plus récent. */
export function lastDays(entries: FoodEntry[], today: IsoDate, n = 7): { date: IsoDate; kcal: number; protein: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - n + 1);
    const t = dayTotals(entries, date);
    return { date, kcal: t.kcal, protein: t.protein };
  });
}

/** Plan de batch cooking : plats « batch » de la semaine servis au moins deux fois. */
export function batchPlan(days: string[][], c: Content = defaultContent): { recipe: Recipe; portions: number; days: number[] }[] {
  const seen = new Map<string, number[]>();
  days.forEach((d, i) => d.forEach((id) => seen.set(id, [...(seen.get(id) ?? []), i])));
  return [...seen.entries()]
    .map(([id, ds]) => ({ recipe: c.recipes.find((r) => r.id === id)!, portions: ds.length, days: [...new Set(ds)] }))
    .filter((x) => x.recipe?.tags.includes('batch') && x.portions >= 2)
    .sort((a, b) => b.portions - a.portions);
}
