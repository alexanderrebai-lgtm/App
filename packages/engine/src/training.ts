import type { GoalId } from '@muscu/content';
import type { CheckIn, ExerciseLog, Feedback } from './model';
import type { Scheme } from './scheme';

/** Pas de réglage des charges (boutons + et −, retour « Facile / Dur »). */
export const LOAD_STEP_KG = 2.5;

export function roundToStep(kg: number, step = LOAD_STEP_KG): number {
  return Math.round(kg / step) * step;
}

/** Charge de la série suivante après le retour « Facile / Bien / Dur ». */
export function nextSetLoad(kg: number, feedback: Feedback, step = LOAD_STEP_KG): number {
  const delta = feedback === 'easy' ? step : feedback === 'hard' ? -step : 0;
  return Math.max(0, kg + delta);
}

export type SuggestionReason = 'topOfRange' | 'allEasy' | 'repeat' | 'firstTime' | 'free';

export interface LoadSuggestion {
  kg: number | null;
  reps: number | null;
  reason: SuggestionReason;
}

/** Meilleure série d'une séance (1RM estimé le plus haut). */
export function bestSet(log: ExerciseLog) {
  let best = log.sets[0];
  for (const s of log.sets) if (best && estimate1RM(s.kg, s.reps) > estimate1RM(best.kg, best.reps)) best = s;
  return best;
}

/**
 * Proposition de charge d'après la dernière séance de cet exercice.
 * Haut de fourchette atteint, ou toutes les séries jugées faciles : + un pas.
 * Sinon : même charge. Première fois : charge qui laisse 3–4 répétitions en réserve.
 */
export function suggestLoad(last: ExerciseLog | undefined, scheme: Scheme, step = LOAD_STEP_KG): LoadSuggestion {
  if (scheme.free) return { kg: null, reps: null, reason: 'free' };
  if (!last || last.cardio || !last.sets.length) return { kg: null, reps: null, reason: 'firstTime' };
  const b = bestSet(last)!;
  if (scheme.topReps > 0 && b.reps >= scheme.topReps) return { kg: b.kg + step, reps: b.reps, reason: 'topOfRange' };
  if (last.sets.every((s) => s.feedback === 'easy')) return { kg: b.kg + step, reps: b.reps, reason: 'allEasy' };
  return { kg: b.kg, reps: b.reps, reason: 'repeat' };
}

/** Dernière séance d'un exercice strictement avant une date. */
export function lastLog(logs: ExerciseLog[], exercise: string, before: string): ExerciseLog | undefined {
  let out: ExerciseLog | undefined;
  for (const l of logs) if (l.exercise === exercise && l.date < before && (!out || l.date > out.date)) out = l;
  return out;
}

/** Repos entre séries, en secondes. */
export function restSeconds(scheme: Scheme, goal: GoalId): number {
  if (goal === 'power') return 90;
  const t = scheme.topReps;
  return t && t <= 6 ? 150 : t && t <= 10 ? 105 : 75;
}

/** 1RM estimé (formule d'Epley), utilisé pour les records. */
export function estimate1RM(kg: number, reps: number): number {
  return kg * (1 + reps / 30);
}

/**
 * Niveau confirmé : charge de travail depuis un 1RM connu, en visant
 * `reps` répétitions avec `rir` répétitions en réserve (Epley inversée), arrondie au pas inférieur.
 */
export function workingLoad(oneRm: number, reps: number, rir = 2, step = LOAD_STEP_KG): number {
  const kg = oneRm / (1 + (reps + rir) / 30);
  return Math.max(0, Math.floor(kg / step) * step);
}

/** Check-in : énergie ≤ 2 ou courbatures fortes → séance allégée (une série de moins). */
export function isLowReadiness(c: Pick<CheckIn, 'energy' | 'soreness'> | undefined): boolean {
  return !!c && (c.energy <= 2 || c.soreness === 'strong');
}

export interface SessionSummary {
  sets: number;
  volumeKg: number;
}

/** Séries et volume soulevé (kg × répétitions), hors cardio. */
export function summarize(logs: ExerciseLog[]): SessionSummary {
  let sets = 0;
  let volumeKg = 0;
  for (const l of logs) {
    if (l.cardio) continue;
    for (const s of l.sets) { sets++; volumeKg += s.kg * s.reps; }
  }
  return { sets, volumeKg };
}
