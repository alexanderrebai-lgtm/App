import { content as defaultContent, type Content, type GoalId, type Prescription } from '@muscu/content';
import { addDays, diffDays, weekday, type IsoDate } from './dates';
import type { InjuryArea, Level, Profile, SessionsPerWeek } from './model';
import { parseScheme } from './scheme';
import { restSeconds } from './training';
import { muscleSets, muscleTarget, volumeTarget } from './volume';

export const PROGRAM_WEEKS = 26;
export const PROGRAM_DAYS = PROGRAM_WEEKS * 7;

export type Phase = 0 | 1 | 2;

/** Semaines de bascule de phase (index de semaine, base 0). */
export const PHASE_STARTS: Record<Level, [number, number]> = {
  beginner: [8, 17], // 1–8 apprendre, 9–17 progresser, 18–26 intensifier
  intermediate: [6, 15], // 1–6 remise en route, 7–15 progresser, 16–26 intensifier
  advanced: [4, 14], // 1–4 remise en route, 5–14 progresser, 15–26 intensifier
};

export function phaseOf(weekIndex: number, level: Level): Phase {
  const [b1, b2] = PHASE_STARTS[level];
  return weekIndex < b1 ? 0 : weekIndex < b2 ? 1 : 2;
}

/**
 * Semaine allégée : prévue toutes les 4 semaines (semaines 4, 8, 12…), sauf si la personne a décidé
 * autrement (fatigue : on allège plus tôt ; en pleine forme : on saute celle-ci).
 */
export function isDeloadWeek(weekIndex: number, overrides?: Record<number, boolean>): boolean {
  return overrides?.[weekIndex] ?? weekIndex % 4 === 3;
}

export type DayType = { kind: 'training'; index: number } | { kind: 'mobility' } | { kind: 'walk' } | { kind: 'rest' };

const T = (index: number): DayType => ({ kind: 'training', index });
const MOB: DayType = { kind: 'mobility' };
const WALK: DayType = { kind: 'walk' };
const REST: DayType = { kind: 'rest' };

/** Semaine type, du lundi au dimanche. */
export const WEEK_PATTERN: Record<SessionsPerWeek, DayType[]> = {
  2: [T(0), REST, MOB, T(1), REST, WALK, REST],
  3: [T(0), REST, T(1), REST, T(2), WALK, REST],
  4: [T(0), T(1), MOB, T(2), T(3), WALK, REST],
};

/**
 * Semaine d'une personne : ses jours d'entraînement s'ils sont choisis (du lundi au samedi,
 * autant que de séances), sinon la semaine type. Mobilité le mercredi et marche le samedi quand ils sont libres.
 */
export function weekPattern(freq: SessionsPerWeek, trainingDays?: number[]): DayType[] {
  const d = trainingDays && [...new Set(trainingDays)].filter((x) => x >= 0 && x <= 5).sort((a, b) => a - b);
  if (!d || d.length !== freq) return WEEK_PATTERN[freq];
  const out: DayType[] = [REST, REST, REST, REST, REST, REST, REST];
  d.forEach((wd, i) => { out[wd] = T(i); });
  if (out[2]!.kind === 'rest' && freq !== 3) out[2] = MOB;
  if (out[5]!.kind === 'rest') out[5] = WALK;
  return out;
}

/** Séances construites à partir du gabarit « masse » : le troisième jour mélange haut et bas du corps. */
const mixedThree = (g: GoalId) => g === 'mass' || g === 'strength' || g === 'fatloss' || g === 'health';
/**
 * Avec 2 séances, chaque séance mélange haut et bas du corps (cahier des charges).
 * Le prototype ne le faisait qu'en masse et force ; étendu à l'explosivité.
 * Le cardio garde endurance + fractionné, le mélange haut/bas n'y a pas de sens.
 */
const mixedTwo = (g: GoalId) => g !== 'cardio';

export function weekSessions(
  goal: GoalId, phase: Phase, freq: SessionsPerWeek, c: Content = defaultContent,
): Prescription[][] {
  const s = c.programs.templates[goal][phase] as Prescription[][];
  const at = (i: number, j: number) => s[i]![j]!;
  const m1 = [at(0, 0), at(0, 1), at(0, 2), at(2, 3), at(1, 0), at(1, 4)];
  const m2 = [at(3, 0), at(1, 1), at(1, 2), at(2, 0), at(2, 1), at(3, 3)];
  // objectifs perte de graisse et forme générale : un bloc de cardio termine chaque séance (6e exercice)
  if (s[0]![5]) m1.push(s[0]![5]);
  if (s[1]![5]) m2.push(s[1]![5]);
  if (freq === 4) return s;
  if (freq === 3) return mixedThree(goal) ? [s[0]!, s[1]!, m2] : [s[0]!, s[1]!, s[2]!];
  return mixedTwo(goal) ? [m1, m2] : [s[0]!, s[1]!];
}

/** Clés de libellé des séances (traduites par l'interface). */
export function sessionLabels(goal: GoalId, freq: SessionsPerWeek): string[] {
  if (goal === 'cardio') return ['endurance', 'intervals', 'bikeStrength', 'circuit'].slice(0, freq);
  if (freq === 2 && mixedTwo(goal)) return ['session1', 'session2'];
  if (mixedThree(goal)) return freq === 3 ? ['upper', 'lower', 'fullBody'] : ['upperA', 'lowerA', 'upperB', 'lowerB'];
  return ['upper', 'lower', 'upperB', 'lowerB'].slice(0, freq);
}

/** Séances « bas du corps » qui reçoivent le bloc dos (bird-dog) en mode dos sensible. */
function getsBackCare(goal: GoalId, freq: SessionsPerWeek, index: number): boolean {
  if (goal === 'cardio') return false;
  return freq === 4 ? index === 1 || index === 3 : index === 1;
}

export type PlanNote =
  | { code: 'shortened'; minutes: number; removed: string[] }
  | { code: 'swapped'; from: string; to: string; joint: InjuryArea }
  | { code: 'dropped'; exercise: string; joint: InjuryArea };

export interface DayPlan {
  date: IsoDate;
  /** Semaine du programme, base 0 (0…25). */
  week: number;
  weekday: number;
  phase: Phase;
  deload: boolean;
  day: DayType;
  /** Clé de libellé : nom de séance, ou mobility / walk / rest. */
  label: string;
  items: Prescription[];
  /** Adaptations faites pour cette personne (blessure, durée de séance). */
  notes: PlanNote[];
}

type PlanProfile = Pick<Profile, 'goal' | 'sessionsPerWeek' | 'level' | 'startDate' | 'backCare'>
  & Partial<Pick<Profile, 'equipment' | 'injuries' | 'sessionMinutes' | 'trainingDays' | 'deloadOverrides'>>;

/**
 * Matériel maison : chaque exercice de salle est remplacé par le premier équivalent
 * faisable avec des haltères et le poids du corps qui n'est pas déjà dans la séance.
 */
export function adaptForEquipment(items: Prescription[], equipment: Profile['equipment'], c: Content = defaultContent): Prescription[] {
  if (equipment !== 'home') return items;
  const home = c.equipment.home;
  const out: Prescription[] = [];
  for (const it of items) {
    const alts = home.alternatives[it.exercise];
    if (!alts) { out.push(it); continue; }
    const taken = new Set([...out.map((o) => o.exercise), ...items.map((o) => o.exercise)]);
    const pick = alts.find((a) => !taken.has(a)) ?? alts[0]!;
    out.push({ exercise: pick, scheme: it.scheme });
  }
  return out;
}

const joints = (id: string, c: Content): string[] => c.exercises.exercises.find((e) => e.id === id)?.joints ?? [];

/**
 * Blessures : un exercice qui sollicite une zone douloureuse est remplacé par un équivalent qui ne la sollicite pas
 * (groupes d'exercices équivalents, puis alternatives maison) ; à défaut il est retiré.
 */
export function adaptForInjuries(
  items: Prescription[], injuries: InjuryArea[] | undefined, c: Content = defaultContent,
): { items: Prescription[]; notes: PlanNote[] } {
  if (!injuries?.length) return { items, notes: [] };
  const hit = (id: string) => injuries.find((j) => joints(id, c).includes(j));
  const out: Prescription[] = [];
  const notes: PlanNote[] = [];
  const used = new Set(items.map((i) => i.exercise));
  for (const it of items) {
    const joint = hit(it.exercise);
    if (!joint) { out.push(it); continue; }
    const name = c.exercises.exercises.find((e) => e.id === it.exercise)?.name ?? '';
    const pool = [
      ...c.exercises.substitutions.filter((g) => g.some((id) => name.startsWith(c.exercises.exercises.find((e) => e.id === id)?.name ?? '\0'))).flat(),
      ...(c.equipment.home.alternatives[it.exercise] ?? []),
    ];
    const to = pool.find((id) => id !== it.exercise && !used.has(id) && !hit(id) && c.exercises.exercises.some((e) => e.id === id));
    if (to) { used.add(to); out.push({ exercise: to, scheme: it.scheme }); notes.push({ code: 'swapped', from: it.exercise, to, joint }); }
    else notes.push({ code: 'dropped', exercise: it.exercise, joint });
  }
  return { items: out, notes };
}

/** Minutes d'un exercice : séries × (effort + repos), ou durée libre. */
function itemMinutes(it: Prescription, goal: GoalId, c: Content): number {
  const sc = parseScheme(it.scheme);
  if (sc.sets) {
    const perSet = c.coaching.session.setSeconds + restSeconds(sc, goal);
    return (sc.sets * perSet) / 60;
  }
  const m = /(\d+)\s*min/.exec(it.scheme);
  if (m) return Number(m[1]);
  const rep = /(\d+)\s*(rép|tours)/.exec(it.scheme);
  return rep ? Number(rep[1]) * 3 : c.coaching.session.freeMinutesDefault / 2;
}

/** Durée estimée d'une séance de musculation, échauffement compris. */
export function estimateMinutes(items: Prescription[], goal: GoalId, c: Content = defaultContent): number {
  const s = c.coaching.session;
  return Math.round(s.warmupMinutes + items.reduce((a, it) => a + itemMinutes(it, goal, c) + s.transitionSeconds / 60, 0));
}

/**
 * Séance trop longue pour le temps disponible : on retire d'abord les exercices secondaires
 * (cardio de fin, gainage, exercices ciblés) en partant de la fin, puis on enlève une série aux exercices de base.
 */
export function fitToDuration(
  items: Prescription[], minutes: number | undefined, goal: GoalId, c: Content = defaultContent,
): { items: Prescription[]; notes: PlanNote[] } {
  if (!minutes || estimateMinutes(items, goal, c) <= minutes) return { items, notes: [] };
  let cur = [...items];
  const removed: string[] = [];
  const min = c.coaching.session.minExercises;
  const roleOf = (id: string) => c.exercises.exercises.find((e) => e.id === id)?.role ?? 'compound';
  const secondary = (it: Prescription) => ['cardio', 'core', 'isolation', 'mobility'].includes(roleOf(it.exercise));
  while (estimateMinutes(cur, goal, c) > minutes && cur.length > min) {
    const i = [...cur].map((it, k) => [it, k] as const).reverse().find(([it]) => secondary(it))?.[1] ?? cur.length - 1;
    removed.push(cur[i]!.exercise);
    cur = cur.filter((_, k) => k !== i);
  }
  // encore trop long : une série de moins sur les exercices de base, en partant de la fin
  for (let k = cur.length - 1; k >= 0 && estimateMinutes(cur, goal, c) > minutes; k--) {
    const sc = parseScheme(cur[k]!.scheme);
    if (sc.sets > 2) cur[k] = { ...cur[k]!, scheme: cur[k]!.scheme.replace(/^\d+×/, `${sc.sets - 1}×`) };
  }
  return { items: cur, notes: [{ code: 'shortened', minutes, removed }] };
}

/**
 * Complément de volume (niveaux intermédiaire et avancé, à partir de la phase « progresser ») :
 * les muscles sous la fourchette de séries de la semaine reçoivent un exercice ciblé réparti sur une ou deux séances.
 * Le programme débutant reste celui du prototype.
 */
export function volumeTopUp(
  sessions: Prescription[][], p: Pick<PlanProfile, 'goal' | 'level'>, phase: Phase, c: Content = defaultContent,
): Prescription[][] {
  const base = volumeTarget(p.goal, p.level, c);
  if (!base || p.level === 'beginner' || phase < c.coaching.topUpFromPhase) return sessions;
  const out = sessions.map((s) => [...s]);
  const added = out.map(() => 0);
  const have = () => {
    const m = new Map<string, number>();
    for (const s of out) for (const [k, n] of muscleSets(s, false, c)) m.set(k, (m.get(k) ?? 0) + n);
    return m;
  };
  const roleOf = (id: string) => c.exercises.exercises.find((e) => e.id === id)?.role;
  for (const muscle of c.coaching.volumePriority) {
    const lo = muscleTarget(muscle, base, c)[0];
    const deficit = lo - (have().get(muscle) ?? 0);
    if (deficit < 1) continue;
    const taken = new Set(out.flat().map((i) => i.exercise));
    const acc = (c.coaching.accessories[muscle] ?? []).find((a) => !taken.has(a.exercise));
    if (!acc) continue;
    const reps = acc.scheme.replace(/^\d+×/, '');
    const nSessions = Math.min(deficit > 3 ? 2 : 1, out.length);
    const sets = Math.min(4, Math.max(2, Math.ceil(deficit / nSessions)));
    const order = out.map((s, i) => [i, estimateMinutes(s, p.goal, c)] as const)
      .filter(([i]) => added[i]! < c.coaching.topUpMaxPerSession)
      .sort((a, b) => a[1] - b[1]).slice(0, nSessions).map(([i]) => i).sort((a, b) => a - b);
    for (const i of order) {
      const s = out[i]!;
      let at = s.length;
      for (let k = s.length - 1; k >= 0; k--) if (roleOf(s[k]!.exercise) === 'compound' || roleOf(s[k]!.exercise) === 'isolation') { at = k + 1; break; }
      s.splice(at, 0, { exercise: acc.exercise, scheme: `${sets}×${reps}` });
      added[i]!++;
    }
  }
  return out;
}

export function dayPlan(p: PlanProfile, date: IsoDate, c: Content = defaultContent): DayPlan | null {
  const offset = diffDays(date, p.startDate);
  if (offset < 0 || offset >= PROGRAM_DAYS) return null;
  const week = Math.floor(offset / 7);
  const wd = weekday(date);
  const phase = phaseOf(week, p.level);
  const day = weekPattern(p.sessionsPerWeek, p.trainingDays)[wd]!;
  let items: Prescription[] = [];
  let label: string = day.kind;
  let notes: PlanNote[] = [];
  if (day.kind === 'training') {
    items = [...volumeTopUp(weekSessions(p.goal, phase, p.sessionsPerWeek, c), p, phase, c)[day.index]!];
    label = sessionLabels(p.goal, p.sessionsPerWeek)[day.index]!;
    items = adaptForEquipment(items, p.equipment ?? 'gym', c);
    const inj = adaptForInjuries(items, p.injuries, c);
    items = inj.items; notes = inj.notes;
    if (p.backCare && getsBackCare(p.goal, p.sessionsPerWeek, day.index) && !items.some((i) => i.exercise === c.programs.backCare.exercise)) {
      items.push(c.programs.backCare);
    }
    const fit = fitToDuration(items, p.sessionMinutes, p.goal, c);
    items = fit.items; notes = [...notes, ...fit.notes];
  } else if (day.kind === 'mobility') items = c.programs.recovery.mobility.items;
  else if (day.kind === 'walk') items = adaptForEquipment(c.programs.recovery.walk.items, p.equipment ?? 'gym', c);
  return { date, week, weekday: wd, phase, deload: isDeloadWeek(week, p.deloadOverrides), day, label, items, notes };
}
/** Toutes les dates de séance prévues entre deux dates incluses. */
export function plannedTrainingDates(p: PlanProfile, from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const plan = dayPlan(p, d);
    if (plan?.day.kind === 'training') out.push(d);
  }
  return out;
}

/**
 * Remplacement : exercice suivant dans son groupe d'équivalents (cyclique).
 * Comme le prototype, une variante (« Squat goblet lourd ») se rattache au groupe de son nom de base.
 */
export function substitute(exerciseId: string, c: Content = defaultContent): string | null {
  const name = c.exercises.exercises.find((e) => e.id === exerciseId)?.name;
  if (!name) return null;
  const nameOf = (id: string) => c.exercises.exercises.find((e) => e.id === id)?.name ?? '';
  for (const g of c.exercises.substitutions) {
    const i = g.findIndex((id) => name.startsWith(nameOf(id)));
    if (i >= 0) return g[(i + 1) % g.length]!;
  }
  return null;
}
