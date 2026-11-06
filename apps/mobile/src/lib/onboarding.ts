import { content, type GoalId, type RecipeTag } from '@muscu/content';
import {
  addDays, mondayOf, weekday, type IsoDate, type Level, type Profile, type SessionsPerWeek, type Sex,
} from '@muscu/engine';

export type GoalChoice = GoalId | 'unsure';

export interface Draft {
  name: string;
  goal?: GoalChoice;
  sessionsPerWeek?: SessionsPerWeek;
  level?: Level;
  sex?: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  equipment: Profile['equipment'];
  backCare: boolean;
  dietTags: RecipeTag[];
  allergies: string[];
  budgetMode: boolean;
  weeklyBudgetEur: number;
}

/** Valeurs de départ : le profil de référence (30 ans, 65 kg, 1,75 m). */
export const DEFAULT_DRAFT: Draft = {
  name: '',
  weightKg: 65,
  heightCm: 175,
  age: 30,
  equipment: 'gym',
  backCare: false,
  dietTags: [],
  allergies: [],
  budgetMode: true,
  weeklyBudgetEur: 30,
};

export const LIMITS = {
  weightKg: { min: 35, max: 200, step: 0.5 },
  heightCm: { min: 130, max: 220, step: 1 },
  age: { min: 16, max: 90, step: 1 },
  weeklyBudgetEur: { min: 15, max: 100, step: 1 },
} as const;

export const STEPS = ['objectif', 'seances', 'niveau', 'corps', 'options', 'recap'] as const;
export type Step = (typeof STEPS)[number];

/** « Je ne sais pas » mène à la prise de masse, le programme le plus polyvalent. */
export function resolveGoal(g: GoalChoice): GoalId {
  return g === 'unsure' ? 'mass' : g;
}

/**
 * Début du programme : le lundi de la semaine en cours jusqu'au mercredi,
 * sinon le lundi suivant (pour ne pas démarrer avec des séances déjà passées).
 */
export function startDateFor(today: IsoDate): IsoDate {
  return weekday(today) <= 2 ? mondayOf(today) : addDays(mondayOf(today), 7);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function isComplete(d: Draft): d is Draft & Required<Pick<Draft, 'goal' | 'sessionsPerWeek' | 'level' | 'sex'>> {
  return !!(d.goal && d.sessionsPerWeek && d.level && d.sex);
}

/** Ingrédients exclus d'après les allergies cochées. */
export function excludedIngredients(allergies: string[]): string[] {
  const out = new Set<string>();
  for (const a of content.exclusions.allergies) if (allergies.includes(a.id)) a.ingredients.forEach((i) => out.add(i));
  return [...out].sort();
}

export function allergiesFrom(excluded: string[]): string[] {
  return content.exclusions.allergies.filter((a) => a.ingredients.every((i) => excluded.includes(i))).map((a) => a.id);
}

export function newId(): string {
  return `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Construit le profil. En modification, on garde l'identifiant, la date de début,
 * le premier jour d'utilisation et les cibles déjà ajustées si le corps et l'objectif ne changent pas.
 */
export function buildProfile(d: Draft, today: IsoDate, existing?: Profile, id: string = newId()): Profile {
  if (!isComplete(d)) throw new Error('Onboarding incomplet');
  const goal = resolveGoal(d.goal);
  const sameBody = existing && existing.goal === goal && existing.weightKg === d.weightKg
    && existing.heightCm === d.heightCm && existing.age === d.age && existing.sex === d.sex;
  const p: Profile = {
    id: existing?.id ?? id,
    name: d.name.trim() || existing?.name || 'Moi',
    sex: d.sex,
    weightKg: clamp(d.weightKg, LIMITS.weightKg.min, LIMITS.weightKg.max),
    heightCm: clamp(Math.round(d.heightCm), LIMITS.heightCm.min, LIMITS.heightCm.max),
    age: clamp(Math.round(d.age), LIMITS.age.min, LIMITS.age.max),
    goal,
    sessionsPerWeek: d.sessionsPerWeek,
    level: d.level,
    startDate: existing?.startDate ?? startDateFor(today),
    firstUseDate: existing?.firstUseDate ?? today,
    equipment: d.equipment,
    backCare: d.backCare,
    dietTags: [...d.dietTags],
    excludedIngredients: excludedIngredients(d.allergies),
    budgetMode: d.budgetMode,
    weeklyBudgetEur: clamp(Math.round(d.weeklyBudgetEur), LIMITS.weeklyBudgetEur.min, LIMITS.weeklyBudgetEur.max),
  };
  if (sameBody && existing?.kcalTarget) p.kcalTarget = existing.kcalTarget;
  if (sameBody && existing?.proteinTarget) p.proteinTarget = existing.proteinTarget;
  if (existing?.supplements) p.supplements = existing.supplements;
  return p;
}

export function draftFromProfile(p: Profile): Draft {
  return {
    name: p.name,
    goal: p.goal,
    sessionsPerWeek: p.sessionsPerWeek,
    level: p.level,
    sex: p.sex,
    weightKg: p.weightKg,
    heightCm: p.heightCm,
    age: p.age,
    equipment: p.equipment,
    backCare: p.backCare,
    dietTags: [...p.dietTags],
    allergies: allergiesFrom(p.excludedIngredients),
    budgetMode: p.budgetMode,
    weeklyBudgetEur: p.weeklyBudgetEur,
  };
}
