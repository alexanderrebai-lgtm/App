// Séance guidée : machine à états pure. L'interface envoie des actions et l'heure courante,
// le moteur décide des séries, des charges proposées et des repos.
import { content as defaultContent, type Content, type GoalId, type Prescription } from '@muscu/content';
import type { IsoDate } from './dates';
import type { ExerciseLog, Feedback, Profile, SetLog } from './model';
import type { DayPlan } from './program';
import { parseScheme, setsToDo, type Scheme } from './scheme';
import { lastLog, nextSetLoad, restSeconds, suggestLoad, workingLoad } from './training';

export type SessionPhase = 'intro' | 'set' | 'rest' | 'done';

export interface SessionExercise {
  exercise: string;
  /** Exercice prévu au programme, avant un éventuel remplacement. */
  planned: string;
  scheme: Scheme;
  /** Séries à faire (une de moins en semaine allégée ou après un check-in difficile). */
  targetSets: number;
  /** Durée ou distance : saisie libre, pas de séries. */
  free: boolean;
  sets: SetLog[];
  skipped: boolean;
  /** Proposition de départ (dernière séance ou 1RM). */
  suggestedKg: number | null;
  suggestedReps: number | null;
}

export interface SessionState {
  date: IsoDate;
  goal: GoalId;
  label: string;
  startedAt: number;
  phase: SessionPhase;
  index: number;
  exercises: SessionExercise[];
  /** Valeurs réglées pour la série en cours. */
  kg: number;
  reps: number;
  feedback: Feedback;
  /** Répétitions en réserve (niveau confirmé, facultatif). */
  rir: number | null;
  /** Fin du repos (ms depuis l'époque), 0 hors repos. */
  restEndsAt: number;
  restTotal: number;
  lowReadiness: boolean;
  deload: boolean;
  finishedAt: number | null;
  feeling: 1 | 2 | 3 | 4 | 5 | null;
}

export interface StartOptions {
  plan: DayPlan;
  goal: GoalId;
  history: ExerciseLog[];
  lowReadiness: boolean;
  now: number;
  /** Niveau confirmé : 1RM connus par exercice. */
  oneRepMaxes?: Record<string, number>;
}

function prepare(p: Prescription, o: Pick<StartOptions, 'plan' | 'history' | 'lowReadiness' | 'oneRepMaxes'>, planned = p.exercise): SessionExercise {
  const scheme = parseScheme(p.scheme);
  const last = lastLog(o.history, p.exercise, o.plan.date);
  const sug = suggestLoad(last, scheme);
  let kg = sug.kg;
  const orm = o.oneRepMaxes?.[p.exercise];
  if (kg === null && orm && scheme.topReps) kg = workingLoad(orm, scheme.topReps, 2);
  return {
    exercise: p.exercise,
    planned,
    scheme,
    targetSets: setsToDo(scheme, { deload: o.plan.deload, lowReadiness: o.lowReadiness }),
    free: scheme.free || !scheme.sets,
    sets: [],
    skipped: false,
    suggestedKg: kg,
    suggestedReps: sug.reps ?? (scheme.topReps || null),
  };
}

function load(s: SessionState): SessionState {
  const e = s.exercises[s.index];
  if (!e) return s;
  return { ...s, kg: e.suggestedKg ?? 0, reps: e.suggestedReps ?? 0, feedback: 'good', rir: null };
}

export function startSession(o: StartOptions, label: string): SessionState {
  const exercises = o.plan.items.map((p) => prepare(p, o));
  return load({
    date: o.plan.date, goal: o.goal, label, startedAt: o.now, phase: exercises.length ? 'intro' : 'done', index: 0,
    exercises, kg: 0, reps: 0, feedback: 'good', rir: null, restEndsAt: 0, restTotal: 0,
    lowReadiness: o.lowReadiness, deload: o.plan.deload, finishedAt: exercises.length ? null : o.now, feeling: null,
  });
}

export type SessionAction =
  | { type: 'begin' }
  | { type: 'adjustKg'; delta: number }
  | { type: 'adjustReps'; delta: number }
  | { type: 'setKg'; kg: number }
  | { type: 'setReps'; reps: number }
  | { type: 'feedback'; value: Feedback }
  | { type: 'rir'; value: number | null }
  | { type: 'validateSet'; now: number }
  | { type: 'logFree'; minutes: number; km: number; now: number }
  | { type: 'addRest'; seconds: number }
  | { type: 'skipRest' }
  | { type: 'tick'; now: number }
  | { type: 'replace'; exercise: string; history: ExerciseLog[] }
  | { type: 'skipExercise'; now: number }
  | { type: 'feeling'; value: 1 | 2 | 3 | 4 | 5 }
  | { type: 'finish'; now: number };

const round1 = (x: number) => Math.round(x * 10) / 10;

function nextExercise(s: SessionState, now: number, withRest: boolean): SessionState {
  const i = s.exercises.findIndex((e, k) => k > s.index && !e.skipped && !e.sets.length);
  if (i < 0) return { ...s, phase: 'done', restEndsAt: 0, finishedAt: now };
  const cur = s.exercises[s.index]!;
  const rest = withRest && !cur.free ? restSeconds(cur.scheme, s.goal) : 0;
  const n = load({ ...s, index: i });
  return rest
    ? { ...n, phase: 'rest', restEndsAt: now + rest * 1000, restTotal: rest }
    : { ...n, phase: 'intro', restEndsAt: 0 };
}

export function sessionReducer(s: SessionState, a: SessionAction): SessionState {
  const e = s.exercises[s.index];
  switch (a.type) {
    case 'begin':
      return s.phase === 'intro' ? { ...s, phase: 'set' } : s;
    case 'adjustKg':
      return { ...s, kg: Math.max(0, round1(s.kg + a.delta)) };
    case 'adjustReps':
      return { ...s, reps: Math.max(0, s.reps + a.delta) };
    case 'setKg':
      return { ...s, kg: Math.max(0, round1(a.kg)) };
    case 'setReps':
      return { ...s, reps: Math.max(0, Math.round(a.reps)) };
    case 'feedback':
      return { ...s, feedback: a.value };
    case 'rir':
      return { ...s, rir: a.value };
    case 'validateSet': {
      if (!e || s.phase !== 'set' || e.free || s.reps <= 0) return s;
      const set: SetLog = { kg: s.kg, reps: s.reps, feedback: s.feedback, ...(s.rir !== null ? { rpe: 10 - s.rir } : {}) };
      const ex = { ...e, sets: [...e.sets, set] };
      const exercises = s.exercises.map((x, k) => (k === s.index ? ex : x));
      const next = { ...s, exercises };
      if (ex.sets.length >= ex.targetSets) return nextExercise(next, a.now, true);
      const rest = restSeconds(e.scheme, s.goal);
      return {
        ...next, phase: 'rest', restEndsAt: a.now + rest * 1000, restTotal: rest,
        kg: nextSetLoad(s.kg, s.feedback), feedback: 'good', rir: null,
      };
    }
    case 'logFree': {
      if (!e || !e.free) return s;
      const sets = a.minutes > 0 ? [{ kg: a.minutes, reps: a.km }] : [];
      const exercises = s.exercises.map((x, k) => (k === s.index ? { ...x, sets, skipped: !sets.length && x.skipped } : x));
      return nextExercise({ ...s, exercises }, a.now, false);
    }
    case 'addRest':
      return s.phase === 'rest' ? { ...s, restEndsAt: s.restEndsAt + a.seconds * 1000, restTotal: s.restTotal + a.seconds } : s;
    case 'skipRest':
      return s.phase === 'rest' ? { ...s, phase: e && e.sets.length ? 'set' : 'intro', restEndsAt: 0 } : s;
    case 'tick':
      return s.phase === 'rest' && a.now >= s.restEndsAt ? { ...s, phase: e && e.sets.length ? 'set' : 'intro', restEndsAt: 0 } : s;
    case 'replace': {
      if (!e || e.sets.length) return s;
      const fresh = prepare({ exercise: a.exercise, scheme: e.scheme.raw }, {
        plan: { date: s.date, deload: s.deload } as DayPlan, history: a.history, lowReadiness: s.lowReadiness,
      }, e.planned);
      const exercises = s.exercises.map((x, k) => (k === s.index ? fresh : x));
      return load({ ...s, exercises, phase: 'intro' });
    }
    case 'skipExercise': {
      if (!e) return s;
      const exercises = s.exercises.map((x, k) => (k === s.index ? { ...x, skipped: !x.sets.length } : x));
      return nextExercise({ ...s, exercises }, a.now, false);
    }
    case 'feeling':
      return { ...s, feeling: a.value };
    case 'finish':
      return { ...s, phase: 'done', restEndsAt: 0, finishedAt: s.finishedAt ?? a.now };
  }
}

/** Secondes de repos restantes (arrondi supérieur). */
export function restRemaining(s: SessionState, now: number): number {
  return s.phase === 'rest' ? Math.max(0, Math.ceil((s.restEndsAt - now) / 1000)) : 0;
}

export interface SessionResult {
  durationMin: number;
  sets: number;
  volumeKg: number;
  exercisesDone: number;
  logs: ExerciseLog[];
}

/** Bilan de fin de séance et journaux à enregistrer. */
export function sessionResult(s: SessionState, profileId: string, now: number): SessionResult {
  const logs: ExerciseLog[] = s.exercises.filter((e) => e.sets.length).map((e) => ({
    profileId, date: s.date, exercise: e.exercise, ...(e.free ? { cardio: true } : {}), sets: e.sets,
  }));
  let sets = 0;
  let volume = 0;
  for (const e of s.exercises) {
    if (e.free) continue;
    for (const x of e.sets) { sets++; volume += x.kg * x.reps; }
  }
  const end = s.finishedAt ?? now;
  return {
    durationMin: Math.max(1, Math.round((end - s.startedAt) / 60000)),
    sets, volumeKg: Math.round(volume), exercisesDone: logs.length, logs,
  };
}

/**
 * Remplacement tenant compte du matériel : exercice suivant du groupe d'équivalents
 * qui n'est pas déjà dans la séance et, à la maison, faisable sans machine.
 */
export function substituteFor(
  exerciseId: string, equipment: Profile['equipment'], exclude: string[], c: Content = defaultContent,
): string | null {
  const byId = new Map(c.exercises.exercises.map((x) => [x.id, x]));
  const name = byId.get(exerciseId)?.name;
  if (!name) return null;
  const ok = (id: string) => !exclude.includes(id)
    && (equipment !== 'home' || c.equipment.home.available.includes(byId.get(id)!.equipment));
  for (const g of c.exercises.substitutions) {
    const i = g.findIndex((id) => name.startsWith(byId.get(id)!.name));
    if (i < 0) continue;
    for (let k = 1; k < g.length; k++) {
      const cand = g[(i + k) % g.length]!;
      if (cand !== exerciseId && ok(cand)) return cand;
    }
  }
  const alts = equipment === 'home' ? c.equipment.home.alternatives[exerciseId] : undefined;
  return alts?.find(ok) ?? null;
}


