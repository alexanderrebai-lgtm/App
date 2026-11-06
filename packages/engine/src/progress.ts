import { content as defaultContent, type Content, type GoalId, type Muscle } from '@muscu/content';
import { addDays, diffDays, type IsoDate } from './dates';
import type { BodyWeight, ExerciseLog, Profile, SessionLog } from './model';
import type { TargetOptions } from './nutrition';
import { goalPlan } from './nutrition';
import { plannedTrainingDates } from './program';
import { estimate1RM } from './training';

export interface PersonalRecord {
  exercise: string;
  date: IsoDate;
  kg: number;
  reps: number;
  cardio: boolean;
  /** 1RM estimé (minutes pour le cardio). */
  score: number;
}

function setScore(kg: number, reps: number, cardio: boolean) {
  return cardio ? kg : estimate1RM(kg, reps);
}

/** Meilleure série par exercice, éventuellement limitée aux séances avant une date. */
export function records(logs: ExerciseLog[], before?: IsoDate): Map<string, PersonalRecord> {
  const best = new Map<string, PersonalRecord>();
  for (const l of logs) {
    if (before && l.date >= before) continue;
    for (const s of l.sets) {
      const score = setScore(s.kg, s.reps, !!l.cardio);
      const cur = best.get(l.exercise);
      if (!cur || score > cur.score) {
        best.set(l.exercise, { exercise: l.exercise, date: l.date, kg: s.kg, reps: s.reps, cardio: !!l.cardio, score });
      }
    }
  }
  return best;
}

/** Courbe d'un exercice : meilleure charge (ou 1RM estimé) par séance, par date croissante. */
export function exerciseCurve(logs: ExerciseLog[], exercise: string, metric: 'kg' | 'e1rm' = 'kg') {
  return logs
    .filter((l) => l.exercise === exercise && l.sets.length)
    .map((l) => ({
      date: l.date,
      value: Math.max(...l.sets.map((s) => (metric === 'kg' ? s.kg : setScore(s.kg, s.reps, !!l.cardio)))),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Tonnage (kg × répétitions) sur une période, hors cardio. */
export function tonnage(logs: ExerciseLog[], from: IsoDate, to: IsoDate): number {
  let t = 0;
  for (const l of logs) {
    if (l.cardio || l.date < from || l.date > to) continue;
    for (const s of l.sets) t += s.kg * s.reps;
  }
  return t;
}

/** Séries par muscle sur une période (statistique avancée). */
export function setsPerMuscle(logs: ExerciseLog[], from: IsoDate, to: IsoDate, c: Content = defaultContent) {
  const out = new Map<Muscle, number>();
  for (const l of logs) {
    if (l.date < from || l.date > to) continue;
    const ex = c.exercises.exercises.find((e) => e.id === l.exercise);
    for (const m of ex?.muscles ?? []) out.set(m, (out.get(m) ?? 0) + l.sets.length);
  }
  return out;
}

export interface Adherence { done: number; planned: number; rate: number }

type PlanProfile = Pick<Profile, 'goal' | 'sessionsPerWeek' | 'level' | 'startDate' | 'backCare' | 'firstUseDate'>;

/** Assiduité : séances faites sur séances prévues, depuis le premier jour d'utilisation jusqu'à `to`. */
export function adherence(p: PlanProfile, sessions: SessionLog[], to: IsoDate, from?: IsoDate): Adherence {
  const start = [from, p.firstUseDate, p.startDate].filter(Boolean).sort().at(-1)!;
  const planned = plannedTrainingDates(p, start, to);
  const done = new Set(sessions.filter((s) => s.done).map((s) => s.date));
  const n = planned.filter((d) => done.has(d)).length;
  return { done: n, planned: planned.length, rate: planned.length ? n / planned.length : 0 };
}

// ---------- ajustement des calories selon le poids ----------

export const ADJUST_KCAL = 150;

export interface WeightAdvice {
  /** Pente en kg par semaine. */
  slope: number;
  range: [number, number];
  /** +150 (+200 si prise de masse difficile), −150 ou 0. */
  deltaKcal: number;
  status: 'belowTarget' | 'onTrack' | 'aboveTarget';
}

/** Fourchette visée en kg par semaine : % du poids par semaine selon l'objectif, le niveau et la difficulté à prendre du poids. */
export function weightRange(weightKg: number, goal: GoalId, o: TargetOptions = {}, c: Content = defaultContent): [number, number] {
  const [lo, hi] = goalPlan(goal, o, c).trendPct;
  return [Math.round(((weightKg * lo) / 100) * 100) / 100, Math.round(((weightKg * hi) / 100) * 100) / 100];
}

/**
 * Sur les pesées des 28 derniers jours (au moins 2, sur au moins 10 jours) :
 * pente sous la fourchette − tolérance → on mange plus (+150 kcal, +200 si prise de masse difficile) ;
 * au-dessus + tolérance → on mange moins (−150 kcal). Pour la perte de graisse, « sous » veut dire
 * « on perd plus vite que prévu » : on remonte les calories pour protéger le muscle.
 */
export function weightAdvice(
  weights: BodyWeight[], goal: GoalId, today: IsoDate, o: TargetOptions = {}, c: Content = defaultContent,
): WeightAdvice | null {
  const lim = addDays(today, -28);
  const b = weights.filter((w) => w.date >= lim && w.date <= today).sort((x, y) => (x.date < y.date ? -1 : 1));
  if (b.length < 2) return null;
  const first = b[0]!;
  const last = b.at(-1)!;
  const span = diffDays(last.date, first.date);
  if (span < 10) return null;
  const slope = (last.kg - first.kg) / (span / 7);
  const range = weightRange(last.kg, goal, o, c);
  const { belowToleranceKg: bt, aboveToleranceKg: at } = c.coaching.calories;
  const up = goalPlan(goal, o, c).adjustKcal;
  if (slope < range[0] - bt) return { slope, range, deltaKcal: up, status: 'belowTarget' };
  if (slope > range[1] + at) return { slope, range, deltaKcal: -c.coaching.calories.adjustKcal, status: 'aboveTarget' };
  return { slope, range, deltaKcal: 0, status: 'onTrack' };
}

/** Rappel de mesures : toutes les 4 semaines. */
export function measurementsDue(lastMeasure: IsoDate | undefined, today: IsoDate): boolean {
  return !lastMeasure || diffDays(today, lastMeasure) >= 28;
}
