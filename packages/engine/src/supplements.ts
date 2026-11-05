import { content as defaultContent, type Content, type GoalId, type SupplementId } from '@muscu/content';
import { addDays, type IsoDate } from './dates';
import type { Profile, SupplementLog } from './model';

const r10 = (x: number) => Math.round(x / 10) * 10;

/** Plafond journalier de caféine pour un adulte en bonne santé (EFSA). */
export const CAFFEINE_DAILY_MAX_MG = 400;

/**
 * Caféine avant la séance : départ 2 mg/kg, jusqu'à 3 mg/kg.
 * Repère haut des études : 6 mg/kg, jamais plus de 400 mg par jour.
 */
export function caffeineDose(weightKg: number) {
  return {
    startMg: r10(weightKg * 2),
    upToMg: r10(weightKg * 3),
    studiedMaxMg: Math.min(CAFFEINE_DAILY_MAX_MG, r10(weightKg * 6)),
  };
}

/** Équivalent en tasses de café (≈ 90 mg), à la demie. */
export function coffeeCups(mg: number): number {
  return Math.round((mg / 90) * 2) / 2;
}

export function trackedSupplements(p: Pick<Profile, 'goal' | 'supplements'>, c: Content = defaultContent): SupplementId[] {
  return p.supplements ?? c.supplements.defaults[p.goal];
}

/** Routine du jour : la caféine seulement les jours de séance. */
export function supplementsForDay(
  p: Pick<Profile, 'goal' | 'supplements'>, trainingDay: boolean, c: Content = defaultContent,
): SupplementId[] {
  const only = new Set(c.supplements.supplements.filter((s) => s.trainingDaysOnly).map((s) => s.id));
  return trackedSupplements(p, c).filter((id) => trainingDay || !only.has(id));
}

export function supplementsLeft(day: SupplementId[], logs: SupplementLog[], date: IsoDate): SupplementId[] {
  const taken = new Set(logs.filter((l) => l.date === date && l.taken).map((l) => l.supplement));
  return day.filter((id) => !taken.has(id));
}

/** Nombre de jours pris sur les 7 derniers jours, par complément. */
export function supplementWeek(ids: SupplementId[], logs: SupplementLog[], today: IsoDate) {
  const from = addDays(today, -6);
  return ids.map((id) => ({
    id,
    days: new Set(logs.filter((l) => l.supplement === id && l.taken && l.date >= from && l.date <= today).map((l) => l.date)).size,
  }));
}

export function usefulnessFor(goal: GoalId, c: Content = defaultContent) {
  return c.supplements.usefulness.map((u) => ({ name: u.name, level: u.byGoal[goal] }));
}
