import { describe, expect, it } from 'vitest';
import {
  adherence, addDays, exerciseCurve, measurementsDue, records, setsPerMuscle, tonnage, weightAdvice,
  type BodyWeight, type ExerciseLog,
} from '../src';
import { loadPrototype, setProtoProfile } from './prototype';
import { profile } from './fixtures';

const L = (date: string, exercise: string, sets: [number, number][], cardio = false): ExerciseLog =>
  ({ profileId: 'p1', date, exercise, sets: sets.map(([kg, reps]) => ({ kg, reps })), ...(cardio ? { cardio } : {}) });

describe('records et statistiques', () => {
  const logs = [
    L('2026-01-05', 'squat-goblet', [[20, 10], [22.5, 8]]),
    L('2026-01-08', 'squat-goblet', [[25, 6]]),
    L('2026-01-12', 'squat-goblet', [[22.5, 12]]),
    L('2026-01-05', 'footing-facile-tu-peux-parler', [[25, 4]], true),
  ];
  it('record = meilleur 1RM estimé', () => {
    const r = records(logs).get('squat-goblet')!;
    expect([r.date, r.kg, r.reps]).toEqual(['2026-01-12', 22.5, 12]); // 1RM estimés : 31,5 contre 30 (25×6) et 28,5 (22,5×8)
    expect(records(logs, '2026-01-12').get('squat-goblet')!.date).toBe('2026-01-08');
  });
  it('courbe, tonnage, séries par muscle', () => {
    expect(exerciseCurve(logs, 'squat-goblet').map((p) => p.value)).toEqual([22.5, 25, 22.5]);
    expect(tonnage(logs, '2026-01-05', '2026-01-08')).toBe(200 + 180 + 150);
    const m = setsPerMuscle(logs, '2026-01-01', '2026-01-31');
    expect(m.get('quads')).toBe(4);
  });
  it('assiduité depuis le premier jour d’utilisation', () => {
    const p = profile({ sessionsPerWeek: 2, firstUseDate: '2026-01-08' });
    const a = adherence(p, [{ profileId: 'p1', date: '2026-01-08', done: true }], '2026-01-18');
    expect(a).toEqual({ done: 1, planned: 3, rate: 1 / 3 });
  });
  it('mesures toutes les 4 semaines', () => {
    expect(measurementsDue(undefined, '2026-02-01')).toBe(true);
    expect(measurementsDue('2026-01-10', '2026-02-01')).toBe(false);
    expect(measurementsDue('2026-01-04', '2026-02-01')).toBe(true);
  });
});

describe('ajustement des calories', () => {
  const W = (pairs: [number, number][], today: string): BodyWeight[] =>
    pairs.map(([d, kg]) => ({ profileId: 'p1', date: addDays(today, -d), kg }));
  const today = '2026-03-01';

  it('pas assez de pesées ou trop rapprochées : pas d’avis', () => {
    expect(weightAdvice(W([[7, 65]], today), 'mass', today)).toBeNull();
    expect(weightAdvice(W([[7, 65], [0, 65.2]], today), 'mass', today)).toBeNull();
  });
  it('masse, poids stable : +150 kcal', () => {
    expect(weightAdvice(W([[14, 65], [0, 65]], today), 'mass', today)).toMatchObject({ deltaKcal: 150, status: 'belowTarget' });
  });
  it('masse, +0,4 kg/sem : on garde', () => {
    expect(weightAdvice(W([[14, 65], [0, 65.8]], today), 'mass', today)).toMatchObject({ deltaKcal: 0, status: 'onTrack' });
  });
  it('masse, +0,8 kg/sem : −150 kcal', () => {
    expect(weightAdvice(W([[14, 65], [0, 66.6]], today), 'mass', today)).toMatchObject({ deltaKcal: -150, status: 'aboveTarget' });
  });

  it('identique au prototype', () => {
    const P = loadPrototype();
    const realToday = new Date().toISOString().slice(0, 10);
    const cases: [number, number][][] = [
      [[20, 65], [10, 65.1], [0, 65.2]], [[27, 70], [0, 69]], [[12, 60], [0, 61.5]], [[30, 65], [3, 65]],
    ];
    for (const goal of ['mass', 'strength', 'power', 'cardio'] as const) for (const c of cases) {
      const ws = W(c, realToday);
      setProtoProfile(P, 'd', { prog: goal, bw: ws.map((w) => ({ d: w.date, kg: w.kg })) }, '2026-01-05');
      const theirs = P.wAdv();
      const mine = weightAdvice(ws, goal, realToday);
      expect(mine?.deltaKcal ?? null, `${goal} ${JSON.stringify(c)}`).toBe(theirs ? theirs.dl : null);
    }
  });
});
