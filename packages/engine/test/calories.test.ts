import { describe, expect, it } from 'vitest';
import { bmi, bmr, effectiveTargets, maintenance, mealSplit, targets, waterLiters } from '../src';
import { loadPrototype, setProtoProfile } from './prototype';
import { profile } from './fixtures';

const ref = { sex: 'male' as const, weightKg: 65, heightCm: 175, age: 30 };

describe('calories — tests d’acceptation (profil de référence 65 kg, 1,75 m, 30 ans, homme)', () => {
  it('M = (10P + 6,25T − 5A + s) × 1,55', () => {
    expect(bmr(ref)).toBe(1598.75);
    expect(maintenance(ref)).toBeCloseTo(2478.06, 2);
  });

  it.each([
    ['mass', 2900, 115, 430, 80],
    ['strength', 2750, 115, 415, 70],
    ['power', 2600, 110, 395, 65],
    ['cardio', 2600, 100, 405, 65],
  ] as const)('%s : C = 50 × round((M + S) / 50)', (goal, kcal, protein, carbs, fat) => {
    expect(targets(ref, goal)).toEqual({ kcal, protein, carbs, fat, maintenance: 2480 });
  });

  it('femme : s = −161', () => {
    const f = { ...ref, sex: 'female' as const };
    expect(bmr(f)).toBe(1432.75);
    // (1432,75 × 1,55 + 400) / 50 = 52,4 → 2 600
    expect(targets(f, 'mass').kcal).toBe(2600);
  });

  it('identique au prototype sur une grille de profils', () => {
    const P = loadPrototype();
    for (const w of [50, 65, 80, 100]) for (const h of [160, 175, 190]) for (const a of [20, 30, 45, 60]) {
      for (const g of ['mass', 'strength', 'power', 'cardio'] as const) {
        setProtoProfile(P, 'd', { w, h, a, ae: 1, prog: g }, '2026-01-05');
        const pt = P.tg(g);
        const t = targets({ sex: 'male', weightKg: w, heightCm: h, age: a }, g);
        expect([t.kcal, t.protein, t.carbs, t.fat, t.maintenance]).toEqual([pt.k, pt.p, pt.g, pt.l, pt.t]);
      }
    }
  });

  it('les cibles saisies priment sur le calcul', () => {
    expect(effectiveTargets(profile({ kcalTarget: 3050, proteinTarget: 130 }))).toMatchObject({ kcal: 3050, protein: 130 });
  });

  it('répartition 25 / 30 / 15 / 30 %', () => {
    const s = mealSplit(targets(ref, 'mass'));
    expect(s.map((m) => m.kcal)).toEqual([730, 870, 440, 870]);
    expect(s.map((m) => m.protein)).toEqual([29, 35, 17, 35]);
  });

  it('eau et IMC', () => {
    expect(waterLiters(65, false)).toBe(2.3);
    expect(waterLiters(65, true)).toBe(2.8);
    expect(bmi(65, 175)).toBe(21.2);
  });
});
