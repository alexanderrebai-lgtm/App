import { content as defaultContent, type Content } from '@muscu/content';
import { addDays, mondayOf, weekDates, type IsoDate } from './dates';
import type {
  BodyWeight, CheckIn, ExerciseLog, FoodEntry, LifeLog, Profile, SessionLog, SupplementLog,
} from './model';
import { effectiveTargets } from './nutrition';
import { dayPlan } from './program';
import { records, tonnage, weightAdvice, type WeightAdvice } from './progress';
import { trackedSupplements } from './supplements';

export interface LifeTotals { cigarettes: number; drinks: number }

export function lifeTotals(logs: LifeLog[], dates: IsoDate[]): LifeTotals {
  const set = new Set(dates);
  return logs.filter((l) => set.has(l.date)).reduce(
    (a, l) => ({ cigarettes: a.cigarettes + l.cigarettes, drinks: a.drinks + l.drinks }),
    { cigarettes: 0, drinks: 0 },
  );
}

export type Trend = 'down' | 'up' | 'same' | 'none';
export function trend(current: number, previous: number): Trend {
  if (!previous && !current) return 'none';
  return current < previous ? 'down' : current > previous ? 'up' : 'same';
}

/** Codes de conseil, traduits par l'interface (voir i18n/fr.ts). */
export type Tip =
  | { code: 'allSessionsDone' }
  | { code: 'missingSessions'; n: number }
  | { code: 'eatMore' }
  | { code: 'proteinLow' }
  | { code: 'tired' }
  | { code: 'smokingDown' }
  | { code: 'smokingUp' }
  | { code: 'alcoholDown' }
  | { code: 'records'; n: number };

export interface WeeklyReview {
  dates: IsoDate[];
  sessions: { done: number; planned: number };
  liftedKg: number;
  records: number;
  nutrition: { daysLogged: number; avgKcal: number; avgProtein: number; kcalTarget: number; proteinTarget: number };
  weight: { last: number | null; changeSincePrevious: number | null };
  avgFeeling: number | null;
  avgEnergy: number | null;
  supplementsRate: number | null;
  life: { current: LifeTotals; previous: LifeTotals; cigarettes: Trend; drinks: Trend };
  calorieAdvice: WeightAdvice | null;
  tips: Tip[];
}

export interface ReviewData {
  exerciseLogs: ExerciseLog[];
  sessions: SessionLog[];
  food: FoodEntry[];
  weights: BodyWeight[];
  supplements: SupplementLog[];
  life: LifeLog[];
  checkIns: CheckIn[];
}

/** Bilan de la semaine qui contient `anyDayOfWeek`, arrêté à `today`. */
export function weeklyReview(
  p: Profile, data: ReviewData, anyDayOfWeek: IsoDate, today: IsoDate, c: Content = defaultContent,
): WeeklyReview {
  const dates = weekDates(mondayOf(anyDayOfWeek));
  const prev = dates.map((d) => addDays(d, -7));
  const first = dates[0]!;
  const lastDay = dates[6]!;
  const t = effectiveTargets(p, c);

  const doneSet = new Set(data.sessions.filter((s) => s.done).map((s) => s.date));
  let planned = 0;
  let done = 0;
  for (const d of dates) {
    if (d < p.firstUseDate) continue;
    if (dayPlan(p, d, c)?.day.kind === 'training') { planned++; if (doneSet.has(d)) done++; }
  }

  const strength = data.exerciseLogs.filter((l) => !l.cardio);
  const before = records(strength, first);
  const inWeek = records(strength.filter((l) => l.date <= lastDay), undefined);
  let recs = 0;
  for (const [ex, r] of inWeek) {
    const b = before.get(ex);
    if (r.date >= first && b && r.score > b.score * 1.001) recs++;
  }

  const days = new Map<string, { k: number; p: number }>();
  for (const f of data.food) {
    if (f.date < first || f.date > lastDay) continue;
    const d = days.get(f.date) ?? { k: 0, p: 0 };
    d.k += f.kcal; d.p += f.protein;
    days.set(f.date, d);
  }
  const logged = [...days.values()].filter((d) => d.k > 0);
  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
  const avgKcal = avg(logged.map((d) => d.k));
  const avgProtein = avg(logged.map((d) => d.p));

  const bw = [...data.weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  const inW = bw.filter((w) => w.date >= first && w.date <= lastDay);
  const bf = bw.filter((w) => w.date < first);
  const lastW = inW.at(-1)?.kg ?? null;
  const prevW = bf.at(-1)?.kg ?? null;

  const feelings = data.sessions.filter((s) => s.date >= first && s.date <= lastDay && s.feeling).map((s) => s.feeling!);
  const avgFeeling = feelings.length ? feelings.reduce((a, b) => a + b, 0) / feelings.length : null;
  const energies = data.checkIns.filter((x) => x.date >= first && x.date <= lastDay).map((x) => x.energy);
  const avgEnergy = energies.length ? energies.reduce((a, b) => a + b, 0) / energies.length : null;

  // la caféine (jours de séance) est exclue du taux, comme dans le prototype
  const ids = trackedSupplements(p, c).filter((id) => id !== 'caffeine');
  let expected = 0;
  let taken = 0;
  for (const d of dates) {
    if (d > today) continue;
    for (const id of ids) {
      expected++;
      if (data.supplements.some((s) => s.date === d && s.supplement === id && s.taken)) taken++;
    }
  }

  const cur = lifeTotals(data.life, dates);
  const pre = lifeTotals(data.life, prev);

  const tips: Tip[] = [];
  if (planned && done >= planned) tips.push({ code: 'allSessionsDone' });
  else if (planned) tips.push({ code: 'missingSessions', n: planned - done });
  if (logged.length >= 3 && avgKcal < t.kcal * 0.9) tips.push({ code: 'eatMore' });
  if (logged.length >= 3 && avgProtein < t.protein * 0.85) tips.push({ code: 'proteinLow' });
  if (avgFeeling !== null && avgFeeling <= 2.3) tips.push({ code: 'tired' });
  if (pre.cigarettes > 0 && cur.cigarettes < pre.cigarettes) tips.push({ code: 'smokingDown' });
  else if (pre.cigarettes > 0 && cur.cigarettes > pre.cigarettes) tips.push({ code: 'smokingUp' });
  if (pre.drinks > 0 && cur.drinks < pre.drinks) tips.push({ code: 'alcoholDown' });
  if (recs > 0) tips.push({ code: 'records', n: recs });

  return {
    dates,
    sessions: { done, planned },
    liftedKg: Math.round(tonnage(strength, first, lastDay)),
    records: recs,
    nutrition: { daysLogged: logged.length, avgKcal, avgProtein, kcalTarget: t.kcal, proteinTarget: t.protein },
    weight: {
      last: lastW,
      changeSincePrevious: lastW !== null && prevW !== null ? Math.round((lastW - prevW) * 10) / 10 : null,
    },
    avgFeeling,
    avgEnergy,
    supplementsRate: expected ? taken / expected : null,
    life: {
      current: cur, previous: pre,
      cigarettes: trend(cur.cigarettes, pre.cigarettes), drinks: trend(cur.drinks, pre.drinks),
    },
    calorieAdvice: weightAdvice(data.weights, p.goal, lastDay < today ? lastDay : today, c),
    tips,
  };
}

/** Hygiène de vie des 7 derniers jours (jour par jour) et comparaison avec les 7 jours d'avant. */
export function lifeWeek(logs: LifeLog[], today: IsoDate) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const prev = days.map((d) => addDays(d, -7));
  const byDay = days.map((date) => {
    const l = logs.find((x) => x.date === date);
    return { date, cigarettes: l?.cigarettes ?? 0, drinks: l?.drinks ?? 0 };
  });
  const cur = lifeTotals(logs, days);
  const pre = lifeTotals(logs, prev);
  const alcoholFreeDays = byDay.filter((d) => d.drinks === 0).length;
  return { byDay, current: cur, previous: pre, cigarettes: trend(cur.cigarettes, pre.cigarettes), drinks: trend(cur.drinks, pre.drinks), alcoholFreeDays };
}
