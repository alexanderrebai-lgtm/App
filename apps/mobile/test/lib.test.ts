import { describe, expect, it } from 'vitest';
import { effectiveTargets } from '@muscu/engine';
import { monthGrid, shiftMonth } from '../src/lib/calendar';
import { dayMonth, longDate, monthTitle, num } from '../src/lib/format';
import {
  buildProfile, DEFAULT_DRAFT, draftFromProfile, excludedIngredients, resolveGoal, startDateFor, type Draft,
} from '../src/lib/onboarding';

const full: Draft = { ...DEFAULT_DRAFT, goal: 'unsure', sessionsPerWeek: 2, level: 'beginner', sex: 'male' };

describe('onboarding', () => {
  it('« je ne sais pas » mène à la prise de masse', () => {
    expect(resolveGoal('unsure')).toBe('mass');
    expect(buildProfile(full, '2026-11-09', undefined, 'x').goal).toBe('mass');
  });

  it('début : lundi de la semaine jusqu’au mercredi, sinon lundi suivant', () => {
    expect(startDateFor('2026-11-09')).toBe('2026-11-09'); // lundi
    expect(startDateFor('2026-11-11')).toBe('2026-11-09'); // mercredi
    expect(startDateFor('2026-11-12')).toBe('2026-11-16'); // jeudi
    expect(startDateFor('2026-11-15')).toBe('2026-11-16'); // dimanche
  });

  it('profil de référence : récap à 2 900 kcal', () => {
    const p = buildProfile(full, '2026-11-06', undefined, 'x');
    expect(p).toMatchObject({ id: 'x', name: 'Moi', startDate: '2026-11-09', firstUseDate: '2026-11-06', weeklyBudgetEur: 30 });
    expect(effectiveTargets(p).kcal).toBe(2900);
  });

  it('femme : cible plus basse', () => {
    expect(effectiveTargets(buildProfile({ ...full, sex: 'female' }, '2026-11-06', undefined, 'x')).kcal).toBe(2600);
  });

  it('refuse un onboarding incomplet', () => {
    expect(() => buildProfile({ ...full, sex: undefined }, '2026-11-06')).toThrow();
  });

  it('borne les valeurs saisies', () => {
    const p = buildProfile({ ...full, weightKg: 500, age: 3, weeklyBudgetEur: 2 }, '2026-11-06', undefined, 'x');
    expect([p.weightKg, p.age, p.weeklyBudgetEur]).toEqual([200, 16, 15]);
  });

  it('allergies → ingrédients exclus, et retour', () => {
    expect(excludedIngredients(['peanuts', 'fish'])).toEqual(['peanut-butter', 'tuna']);
    const p = buildProfile({ ...full, allergies: ['eggs'], dietTags: ['vegetarian'] }, '2026-11-06', undefined, 'x');
    expect(draftFromProfile(p)).toMatchObject({ allergies: ['eggs'], dietTags: ['vegetarian'], goal: 'mass' });
  });

  it('modification : garde id, dates et cibles ajustées si le corps ne change pas', () => {
    const p = { ...buildProfile(full, '2026-11-06', undefined, 'x'), kcalTarget: 3050 };
    const same = buildProfile({ ...draftFromProfile(p), sessionsPerWeek: 3 }, '2026-12-01', p);
    expect(same).toMatchObject({ id: 'x', startDate: '2026-11-09', firstUseDate: '2026-11-06', sessionsPerWeek: 3, kcalTarget: 3050 });
    const heavier = buildProfile({ ...draftFromProfile(p), weightKg: 70 }, '2026-12-01', p);
    expect(heavier.kcalTarget).toBeUndefined();
  });
});

describe('calendrier', () => {
  const p = buildProfile(full, '2026-11-06', undefined, 'x');
  it('grille du mois, lundi en premier', () => {
    const g = monthGrid(2026, 10, p); // novembre 2026 : le 1er est un dimanche
    expect(g[0]!.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(g[0]![6]!.date).toBe('2026-11-01');
    expect(g.every((w) => w.length === 7)).toBe(true);
    const nov9 = g.flat().find((c) => c?.date === '2026-11-09')!;
    expect(nov9.plan?.day.kind).toBe('training');
    expect(g.flat().find((c) => c?.date === '2026-11-01')!.plan).toBeNull(); // avant le début
  });
  it('changement de mois', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('formats français', () => {
  it('dates et nombres', () => {
    expect(longDate('2026-01-22')).toBe('jeudi 22 janvier');
    expect(longDate('2026-11-09', true)).toBe('Lundi 9 novembre');
    expect(dayMonth('2026-08-15')).toBe('15 août');
    expect(monthTitle(2026, 10)).toBe('Novembre 2026');
    expect(num(2900)).toBe('2 900');
    expect(num(21.25, 1)).toBe('21,3');
  });
});
