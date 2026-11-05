import { describe, expect, it } from 'vitest';
import {
  estimate1RM, isLowReadiness, lastLog, nextSetLoad, parseScheme, restSeconds, suggestLoad, summarize,
  workingLoad, type ExerciseLog,
} from '../src';

const log = (date: string, sets: [number, number, ('easy' | 'good' | 'hard')?][], o: Partial<ExerciseLog> = {}): ExerciseLog => ({
  profileId: 'p1', date, exercise: 'squat-goblet', sets: sets.map(([kg, reps, feedback]) => ({ kg, reps, ...(feedback ? { feedback } : {}) })), ...o,
});

describe('réglage série par série', () => {
  it('Facile +2,5 kg, Bien identique, Dur −2,5 kg, jamais négatif', () => {
    expect(nextSetLoad(20, 'easy')).toBe(22.5);
    expect(nextSetLoad(20, 'good')).toBe(20);
    expect(nextSetLoad(20, 'hard')).toBe(17.5);
    expect(nextSetLoad(0, 'hard')).toBe(0);
  });
});

describe('proposition de charge', () => {
  const s = parseScheme('3×10–12');
  it('première fois : charge à trouver (3–4 reps en réserve)', () => {
    expect(suggestLoad(undefined, s)).toEqual({ kg: null, reps: null, reason: 'firstTime' });
  });
  it('haut de fourchette atteint : + 2,5 kg', () => {
    expect(suggestLoad(log('2026-01-05', [[20, 12], [20, 12], [20, 11]]), s)).toMatchObject({ kg: 22.5, reason: 'topOfRange' });
  });
  it('toutes les séries faciles : + 2,5 kg', () => {
    expect(suggestLoad(log('2026-01-05', [[20, 10, 'easy'], [20, 10, 'easy']]), s)).toMatchObject({ kg: 22.5, reason: 'allEasy' });
  });
  it('sinon même charge', () => {
    expect(suggestLoad(log('2026-01-05', [[20, 10, 'good'], [20, 9, 'hard']]), s)).toMatchObject({ kg: 20, reason: 'repeat' });
  });
  it('cardio : saisie libre', () => {
    expect(suggestLoad(undefined, parseScheme('25 min')).reason).toBe('free');
  });
  it('dernière séance avant une date', () => {
    const logs = [log('2026-01-05', [[20, 10]]), log('2026-01-08', [[22.5, 10]]), log('2026-01-12', [[25, 10]])];
    expect(lastLog(logs, 'squat-goblet', '2026-01-12')!.date).toBe('2026-01-08');
  });
});

describe('repos, 1RM, check-in, résumé', () => {
  it('repos selon les répétitions, 90 s en explosivité', () => {
    expect(restSeconds(parseScheme('5×5'), 'strength')).toBe(150);
    expect(restSeconds(parseScheme('3×8–10'), 'mass')).toBe(105);
    expect(restSeconds(parseScheme('3×12–15'), 'mass')).toBe(75);
    expect(restSeconds(parseScheme('3×max'), 'mass')).toBe(75);
    expect(restSeconds(parseScheme('5×5'), 'power')).toBe(90);
  });
  it('1RM estimé (Epley) et charge de travail du niveau confirmé', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 2);
    // 100 kg de 1RM, 5 reps avec 2 en réserve : 100 / (1 + 7/30) = 81,08 → 80 kg
    expect(workingLoad(100, 5, 2)).toBe(80);
  });
  it('check-in : énergie ≤ 2 ou courbatures fortes', () => {
    expect(isLowReadiness({ energy: 2, soreness: 'none' })).toBe(true);
    expect(isLowReadiness({ energy: 3, soreness: 'strong' })).toBe(true);
    expect(isLowReadiness({ energy: 3, soreness: 'light' })).toBe(false);
    expect(isLowReadiness(undefined)).toBe(false);
  });
  it('fin de séance : séries et volume, hors cardio', () => {
    expect(summarize([
      log('2026-01-05', [[20, 10], [20, 8]]),
      log('2026-01-05', [[30, 5]], { exercise: 'footing-facile-tu-peux-parler', cardio: true }),
    ])).toEqual({ sets: 2, volumeKg: 360 });
  });
});
