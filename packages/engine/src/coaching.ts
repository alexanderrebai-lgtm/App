// Coaching : transforme le profil et les résultats en décisions expliquées.
// Chaque règle renvoie des codes et des chiffres ; les textes viennent de packages/content (why.json, evidence.json).
import { content as defaultContent, type Content, type GoalId, type Muscle } from '@muscu/content';
import { addDays, diffDays, mondayOf, type IsoDate } from './dates';
import type { CheckIn, ExerciseLog, InjuryArea, Level, Profile, SessionLog } from './model';
import { bmi, calorieFloor, effectiveTargets, goalPlan, maintenance, mealCount, type Targets } from './nutrition';
import { dayPlan, isDeloadWeek, PROGRAM_WEEKS } from './program';
import { exerciseCurve, weightRange } from './progress';
import { parseScheme, setsToDo } from './scheme';
import { restSeconds } from './training';
import { muscleSets, muscleTarget, volumeTarget } from './volume';

// ---------- volume hebdomadaire par muscle ----------

export interface VolumeRow {
  muscle: Muscle;
  /** Séries directes (1 par série) + indirectes (0,5 par série pour les muscles secondaires). */
  sets: number;
  target: [number, number];
  status: 'low' | 'ok' | 'high';
  /** Faux pour les muscles seulement affichés (mollets, gainage). */
  evaluated: boolean;
}

/**
 * Séries prévues par muscle sur la semaine qui contient `date`, d'après les séances réelles de la personne
 * (matériel, blessures, durée de séance et complément de volume compris).
 */
export function weeklyVolume(p: Profile, date: IsoDate, c: Content = defaultContent): VolumeRow[] | null {
  const base = volumeTarget(p.goal, p.level, c);
  if (!base) return null;
  const monday = mondayOf(date);
  const sets = new Map<Muscle, number>();
  for (let i = 0; i < 7; i++) {
    const plan = dayPlan(p, addDays(monday, i), c);
    if (plan?.day.kind !== 'training') continue;
    for (const [m, n] of muscleSets(plan.items, plan.deload, c)) sets.set(m, (sets.get(m) ?? 0) + n);
  }
  return c.coaching.volumeMuscles.map((m) => {
    const n = Math.round((sets.get(m) ?? 0) * 2) / 2;
    const target = muscleTarget(m, base, c);
    const evaluated = c.coaching.volumeEvaluated.includes(m);
    return { muscle: m, sets: n, target, status: !evaluated ? 'ok' : n < target[0] ? 'low' : n > target[1] ? 'high' : 'ok', evaluated };
  });
}

// ---------- plateaux ----------

export interface Plateau { exercise: string; sessions: number; best: number; lastDate: IsoDate }

/**
 * Plateau : sur les dernières séances d'un exercice de base, le meilleur 1RM estimé n'a pas dépassé
 * celui d'avant de plus de 0,5 %. Il faut au moins une séance de plus que la fenêtre et une séance récente.
 */
export function plateaus(logs: ExerciseLog[], today: IsoDate, c: Content = defaultContent): Plateau[] {
  const n = c.coaching.progression.plateauSessions;
  const out: Plateau[] = [];
  const ids = new Set(logs.filter((l) => !l.cardio).map((l) => l.exercise));
  for (const id of ids) {
    const ex = c.exercises.exercises.find((e) => e.id === id);
    if (ex?.role !== 'compound') continue;
    const curve = exerciseCurve(logs, id, 'e1rm');
    if (curve.length < n + 1) continue;
    const last = curve.at(-1)!;
    if (diffDays(today, last.date) > 21) continue;
    const recent = curve.slice(-n);
    const before = Math.max(...curve.slice(0, -n).map((x) => x.value));
    const best = Math.max(...recent.map((x) => x.value));
    if (best < before * (1 + c.coaching.progression.plateauMinGainPct / 100)) out.push({ exercise: id, sessions: n, best: Math.round(best * 10) / 10, lastDate: last.date });
  }
  return out;
}

// ---------- semaine allégée adaptative ----------

export type DeloadReason = 'lowEnergy' | 'hardSets' | 'plateaus' | 'longWithout' | 'fresh';
export interface DeloadAdvice {
  /** now : alléger cette semaine ; skip : sauter l'allègement prévu ; keep : rien à changer. */
  action: 'now' | 'skip' | 'keep';
  reasons: DeloadReason[];
  weekIndex: number;
}

/**
 * Semaine allégée décidée d'après la fatigue réelle, pas seulement le calendrier :
 * énergie basse, séries jugées « dures », plateaux, ou trop longtemps sans allègement → alléger maintenant.
 * Semaine allégée prévue alors qu'on est en forme (surtout débutant) → proposer de la sauter.
 */
export function deloadAdvice(
  p: Profile,
  data: { checkIns: CheckIn[]; exerciseLogs: ExerciseLog[]; sessions: SessionLog[] },
  today: IsoDate,
  c: Content = defaultContent,
): DeloadAdvice | null {
  const week = Math.floor(diffDays(today, p.startDate) / 7);
  if (week < 0 || week >= PROGRAM_WEEKS) return null;
  const d = c.coaching.deload;
  const from = addDays(today, -d.windowDays);
  const checks = data.checkIns.filter((x) => x.date >= from && x.date <= today);
  const energy = checks.length >= 3 ? checks.reduce((a, x) => a + x.energy, 0) / checks.length : null;
  const sets = data.exerciseLogs.filter((l) => !l.cardio && l.date >= from && l.date <= today).flatMap((l) => l.sets).filter((s) => s.feedback);
  const hardShare = sets.length >= 6 ? sets.filter((s) => s.feedback === 'hard').length / sets.length : null;
  const plateau = plateaus(data.exerciseLogs, today, c).length;
  let lastDeload = -1;
  for (let w = week - 1; w >= 0; w--) if (isDeloadWeek(w, p.deloadOverrides)) { lastDeload = w; break; }
  const since = week - lastDeload;
  const planned = isDeloadWeek(week, p.deloadOverrides);
  const reasons: DeloadReason[] = [];
  if (energy !== null && energy < d.fatigueEnergyBelow) reasons.push('lowEnergy');
  if (hardShare !== null && hardShare > d.hardShareAbove) reasons.push('hardSets');
  if (plateau >= 2) reasons.push('plateaus');
  if (since > c.coaching.deload.maxWeeksWithoutDeload[p.level]) reasons.push('longWithout');
  if (!planned && reasons.length && since >= d.minWeeksBetween) return { action: 'now', reasons, weekIndex: week };
  // semaine prévue, mais en forme : le débutant peut la sauter
  const hasData = energy !== null || hardShare !== null;
  if (planned && !reasons.length && hasData && p.level === 'beginner' && (energy ?? 5) >= 3.5) return { action: 'skip', reasons: ['fresh'], weekIndex: week };
  return { action: 'keep', reasons, weekIndex: week };
}

// ---------- calories : ajustement sûr ----------

/** Nouvelle cible après un ajustement : jamais sous le plancher de calories en déficit. */
export function applyCalorieAdvice(p: Profile, delta: number, c: Content = defaultContent): { kcal: number; blocked: boolean } {
  const cur = effectiveTargets(p, c).kcal;
  const next = cur + delta;
  if (delta < 0 && next < calorieFloor(p, c)) return { kcal: cur, blocked: true };
  return { kcal: next, blocked: false };
}

// ---------- questionnaire de santé ----------

export type ScreeningOutcome = 'ok' | 'advice' | 'doctor';
export interface Screening { outcome: ScreeningOutcome; flagged: string[]; underweight: boolean }

/** Une réponse « oui » à une question « médecin » → avis médical avant de commencer ; « conseil » → à voir avec le médecin. */
export function screen(
  answers: Record<string, boolean>, body?: { weightKg: number; heightCm: number }, hardGainer?: boolean, c: Content = defaultContent,
): Screening {
  const yes = c.health.questions.filter((q) => answers[q.id]);
  const underweight = !!body && !!hardGainer && bmi(body.weightKg, body.heightCm) < 18.5;
  const outcome: ScreeningOutcome = yes.some((q) => q.level === 'doctor') ? 'doctor' : yes.length || underweight ? 'advice' : 'ok';
  return { outcome, flagged: yes.map((q) => q.id), underweight };
}

// ---------- explications ----------

export interface Explanation {
  role: { id: string; label: string; text: string };
  muscles: Muscle[];
  zone: { id: string; label: string; text: string; restText: string };
  restSeconds: number;
  rir: string;
  goalText: string;
  evidence: string[];
  joints: string[];
}

/** Explication d'un exercice dans une séance : son rôle, ses muscles, pourquoi ces répétitions, ce repos, cet effort. */
export function explainExercise(
  exerciseId: string, scheme: string, ctx: { goal: GoalId; phase: 0 | 1 | 2 }, c: Content = defaultContent,
): Explanation | null {
  const ex = c.exercises.exercises.find((e) => e.id === exerciseId);
  if (!ex) return null;
  const sc = parseScheme(scheme);
  const role = c.why.roles[ex.role]!;
  const zone = sc.topReps
    ? c.why.zones.find((z) => z.id !== 'timed' && sc.topReps >= z.min && sc.topReps <= z.max) ?? c.why.zones[c.why.zones.length - 2]!
    : c.why.zones.find((z) => z.id === 'timed')!;
  return {
    role: { id: ex.role, ...role },
    muscles: ex.muscles,
    zone,
    restSeconds: sc.sets ? restSeconds(sc, ctx.goal) : 0,
    rir: c.why.rirByPhase[ctx.phase]!,
    goalText: c.why.goals[ctx.goal].training,
    evidence: c.why.goals[ctx.goal].evidence,
    joints: ex.joints,
  };
}

// ---------- plan récapitulatif : « Mon coaching » ----------

export interface CoachingPlan {
  goal: GoalId;
  level: Level;
  levelText: string;
  recommendedSessions: [number, number];
  sessionsOk: boolean;
  targets: Targets;
  kcal: { maintenance: number; offset: number; value: number; percentOfMaintenance: number; adjusted: boolean };
  proteinPerKg: number;
  trendPctPerWeek: [number, number];
  trendKgPerWeek: [number, number];
  trendPctPerMonth: [number, number];
  meals: number;
  hardGainer: boolean;
  volume: VolumeRow[] | null;
  volumeTarget: [number, number] | null;
  injuries: InjuryArea[];
  evidence: string[];
}

export function coachingPlan(p: Profile, today: IsoDate, c: Content = defaultContent): CoachingPlan {
  const o = { level: p.level, hardGainer: p.hardGainer };
  const g = goalPlan(p.goal, o, c);
  const t = effectiveTargets(p, c);
  const m = maintenance(p, c);
  const week = Math.max(0, Math.min(PROGRAM_WEEKS - 1, Math.floor(diffDays(today, p.startDate) / 7)));
  const lv = c.coaching.levels[p.level];
  const [lo, hi] = g.trendPct;
  return {
    goal: p.goal,
    level: p.level,
    levelText: lv.text,
    recommendedSessions: lv.recommendedSessions,
    sessionsOk: p.sessionsPerWeek >= lv.recommendedSessions[0] - 1 && p.sessionsPerWeek <= lv.recommendedSessions[1],
    targets: t,
    kcal: {
      maintenance: Math.round(m / 10) * 10, offset: t.kcal - Math.round(m / 10) * 10, value: t.kcal,
      percentOfMaintenance: Math.round((t.kcal / m) * 100), adjusted: p.kcalTarget !== undefined,
    },
    proteinPerKg: Math.round((t.protein / p.weightKg) * 10) / 10,
    trendPctPerWeek: [lo, hi],
    trendKgPerWeek: weightRange(p.weightKg, p.goal, o, c),
    trendPctPerMonth: [Math.round(lo * 4.33 * 10) / 10, Math.round(hi * 4.33 * 10) / 10],
    meals: mealCount(p),
    hardGainer: g.hardGainer,
    volume: weeklyVolume(p, addDays(p.startDate, week * 7), c),
    volumeTarget: volumeTarget(p.goal, p.level, c),
    injuries: p.injuries ?? [],
    evidence: c.why.goals[p.goal].evidence,
  };
}
