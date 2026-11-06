import { content as defaultContent, type Content, type GoalId, type Prescription } from '@muscu/content';
import { addDays, diffDays, weekday, type IsoDate } from './dates';
import type { Level, Profile, SessionsPerWeek } from './model';

export const PROGRAM_WEEKS = 26;
export const PROGRAM_DAYS = PROGRAM_WEEKS * 7;

export type Phase = 0 | 1 | 2;

/** Semaines de bascule de phase (index de semaine, base 0). */
export const PHASE_STARTS: Record<Level, [number, number]> = {
  beginner: [8, 17], // 1–8 apprendre, 9–17 progresser, 18–26 intensifier
  advanced: [4, 14], // 1–4 remise en route, 5–14 progresser, 15–26 intensifier
};

export function phaseOf(weekIndex: number, level: Level): Phase {
  const [b1, b2] = PHASE_STARTS[level];
  return weekIndex < b1 ? 0 : weekIndex < b2 ? 1 : 2;
}

/** Semaine allégée toutes les 4 semaines (semaines 4, 8, 12…). */
export function isDeloadWeek(weekIndex: number): boolean {
  return weekIndex % 4 === 3;
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

/** Avec 3 séances, la troisième est un « complet » mélangé (masse et force, comme le prototype). */
const mixedThree = (g: GoalId) => g === 'mass' || g === 'strength';
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
}

type PlanProfile = Pick<Profile, 'goal' | 'sessionsPerWeek' | 'level' | 'startDate' | 'backCare'> & Partial<Pick<Profile, 'equipment'>>;

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

export function dayPlan(p: PlanProfile, date: IsoDate, c: Content = defaultContent): DayPlan | null {
  const offset = diffDays(date, p.startDate);
  if (offset < 0 || offset >= PROGRAM_DAYS) return null;
  const week = Math.floor(offset / 7);
  const wd = weekday(date);
  const phase = phaseOf(week, p.level);
  const day = WEEK_PATTERN[p.sessionsPerWeek][wd]!;
  let items: Prescription[] = [];
  let label: string = day.kind;
  if (day.kind === 'training') {
    items = [...weekSessions(p.goal, phase, p.sessionsPerWeek, c)[day.index]!];
    label = sessionLabels(p.goal, p.sessionsPerWeek)[day.index]!;
    items = adaptForEquipment(items, p.equipment ?? 'gym', c);
    if (p.backCare && getsBackCare(p.goal, p.sessionsPerWeek, day.index) && !items.some((i) => i.exercise === c.programs.backCare.exercise)) {
      items.push(c.programs.backCare);
    }
  } else if (day.kind === 'mobility') items = c.programs.recovery.mobility.items;
  else if (day.kind === 'walk') items = adaptForEquipment(c.programs.recovery.walk.items, p.equipment ?? 'gym', c);
  return { date, week, weekday: wd, phase, deload: isDeloadWeek(week), day, label, items };
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
