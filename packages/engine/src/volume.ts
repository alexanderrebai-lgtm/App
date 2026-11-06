// Volume d'entraînement : séries par muscle et par semaine, face aux fourchettes de la recherche.
import { content as defaultContent, type Content, type GoalId, type Muscle, type Prescription } from '@muscu/content';
import type { Level } from './model';
import { parseScheme, setsToDo } from './scheme';

export const volumeKey = (goal: GoalId) => (goal === 'strength' || goal === 'health' || goal === 'fatloss' ? goal : 'default');

/** Fourchette de séries par semaine et par muscle pour cet objectif et ce niveau (null en explosivité et cardio). */
export function volumeTarget(goal: GoalId, level: Level, c: Content = defaultContent): [number, number] | null {
  if (goal === 'power' || goal === 'cardio') return null;
  return c.coaching.volumeSetsPerWeek[volumeKey(goal)][level];
}

/** Cible adaptée à un muscle : les petits muscles (épaules, biceps, triceps) travaillent aussi en indirect. */
export function muscleTarget(muscle: Muscle, base: [number, number], c: Content = defaultContent): [number, number] {
  const s = c.coaching.volumeSmallMuscles;
  if (!s.muscles.includes(muscle)) return base;
  const r = (x: number) => Math.round(x * 2) / 2;
  return [r(base[0] * s.low), r(base[1] * s.high)];
}

/**
 * Séries par muscle d'une liste d'exercices. Le premier muscle de l'exercice compte pour 1 série,
 * les suivants pour 0,5 (séries « fractionnées »). Une semaine allégée compte une série de moins.
 */
export function muscleSets(items: Prescription[], deload: boolean, c: Content = defaultContent): Map<Muscle, number> {
  const out = new Map<Muscle, number>();
  for (const it of items) {
    const ex = c.exercises.exercises.find((e) => e.id === it.exercise);
    if (!ex || (ex.role !== 'compound' && ex.role !== 'isolation' && ex.role !== 'core')) continue;
    const n = setsToDo(parseScheme(it.scheme), { deload, lowReadiness: false });
    ex.muscles.forEach((m, k) => out.set(m, (out.get(m) ?? 0) + n * (k === 0 ? 1 : 0.5)));
  }
  return out;
}
