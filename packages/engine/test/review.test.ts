import { describe, expect, it } from 'vitest';
import { EMPTY_BACKUP, exportBackup, fr, importBackup, lifeTotals, trend, weeklyReview, type ReviewData } from '../src';
import { profile } from './fixtures';

const pid = 'p1';
const empty: ReviewData = { exerciseLogs: [], sessions: [], food: [], weights: [], supplements: [], life: [], checkIns: [] };

describe('bilan hebdomadaire', () => {
  const p = profile({ sessionsPerWeek: 2 });
  // semaine 2 du programme : lundi 12 et jeudi 15 janvier 2026
  const data: ReviewData = {
    ...empty,
    exerciseLogs: [
      { profileId: pid, date: '2026-01-05', exercise: 'squat-goblet', sets: [{ kg: 20, reps: 10 }] },
      { profileId: pid, date: '2026-01-12', exercise: 'squat-goblet', sets: [{ kg: 22.5, reps: 10 }, { kg: 22.5, reps: 10 }] },
    ],
    sessions: [{ profileId: pid, date: '2026-01-12', done: true, feeling: 2 }],
    food: ['2026-01-12', '2026-01-13', '2026-01-14'].map((date) => ({ profileId: pid, date, name: 'x', kcal: 2000, protein: 80 })),
    weights: [{ profileId: pid, date: '2026-01-04', kg: 65 }, { profileId: pid, date: '2026-01-11', kg: 65.3 }, { profileId: pid, date: '2026-01-18', kg: 65.6 }],
    supplements: [{ profileId: pid, date: '2026-01-12', supplement: 'creatine', taken: true }],
    life: [
      { profileId: pid, date: '2026-01-06', cigarettes: 10, drinks: 4 },
      { profileId: pid, date: '2026-01-13', cigarettes: 6, drinks: 2 },
    ],
  };
  const r = weeklyReview(p, data, '2026-01-14', '2026-01-18');

  it('séances, kilos, records', () => {
    expect(r.dates[0]).toBe('2026-01-12');
    expect(r.sessions).toEqual({ done: 1, planned: 2 });
    expect(r.liftedKg).toBe(450);
    expect(r.records).toBe(1);
  });
  it('nutrition face aux objectifs, poids', () => {
    expect(r.nutrition).toMatchObject({ daysLogged: 3, avgKcal: 2000, avgProtein: 80, kcalTarget: 2900, proteinTarget: 115 });
    expect(r.weight).toEqual({ last: 65.6, changeSincePrevious: 0.3 });
  });
  it('compléments (hors caféine) et hygiène de vie comparée à la semaine d’avant', () => {
    expect(r.supplementsRate).toBeCloseTo(1 / 21); // 3 compléments × 7 jours
    expect(r.life).toMatchObject({ cigarettes: 'down', drinks: 'down', current: { cigarettes: 6, drinks: 2 } });
  });
  it('conseils concrets et ajustement des calories', () => {
    expect(r.tips.map((t) => t.code)).toEqual(['missingSessions', 'eatMore', 'proteinLow', 'tired', 'smokingDown', 'alcoholDown', 'records']);
    expect(r.tips.map(fr.tipText)[0]).toBe('Il te manque 1 séance : place-la dans ton calendrier.');
    expect(r.calorieAdvice).toMatchObject({ deltaKcal: 0, status: 'onTrack' });
  });
  it('semaine précédente', () => {
    const prev = weeklyReview(p, data, '2026-01-05', '2026-01-18');
    expect(prev.sessions).toEqual({ done: 0, planned: 2 });
    expect(prev.life.cigarettes).toBe('up'); // 10 cigarettes contre 0 la semaine d’avant
  });
  it('tendances', () => {
    expect(trend(3, 5)).toBe('down');
    expect(trend(0, 0)).toBe('none');
    expect(lifeTotals(data.life, ['2026-01-06'])).toEqual({ cigarettes: 10, drinks: 4 });
  });
});

describe('sauvegarde', () => {
  it('export puis import à l’identique', () => {
    const data = { ...EMPTY_BACKUP, ...empty, profiles: [profile()] };
    const json = exportBackup(data, new Date('2026-01-01T00:00:00Z'));
    const r = importBackup(json);
    expect(r.ok && r.source).toBe('app');
    if (r.ok) expect(r.backup.profiles[0]).toEqual(profile());
  });
  it('refuse un fichier invalide', () => {
    expect(importBackup('pas du json')).toEqual({ ok: false, error: 'invalidJson' });
    expect(importBackup('{"app":"muscu","version":1}')).toEqual({ ok: false, error: 'invalidBackup' });
    expect(importBackup('{"x":1}')).toEqual({ ok: false, error: 'unknownFormat' });
  });
  it('importe un export du prototype', () => {
    const proto = {
      fst: '2026-01-07', start: '2026-01-05',
      p: {
        a: {
          prog: 'mass', fq: 3, lv: 0, w: 66, h: 178, a: 31, bud: true, gk: 3050, gp: 120,
          log: {
            '2026-01-05|Squat goblet': { kg: 20, rep: 10, sets: [[20, 10, 1], [20, 9, 3]] },
            '2026-01-07|Footing facile (tu peux parler)': { kg: 25, rep: 4, c: 1, sets: [[25, 4]] },
            '2026-01-07|Exercice disparu': { kg: 1, rep: 1 },
          },
          done: { '2026-01-05': 1 }, fb: { '2026-01-05': 4 },
          bw: [{ d: '2026-01-05', kg: 66 }],
          me: [{ d: '2026-01-05', a: 32, p: 95, t: 80, c: 55 }],
          life: { '2026-01-05': { c: 5, a: 1 } },
          cal: { '2026-01-05': [{ n: 'Porridge', k: 620, p: 25, m: 0 }] },
          ck: { '2026-01-05': { e: 2, c: 2 } },
          sp: { '2026-01-05': { cre: true } },
          stk: { 'riz cru': true, 'huile d’olive': true },
        },
        d: { w: 70 },
      },
    };
    const r = importBackup(JSON.stringify(proto), { names: { a: 'Alexander' } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const b = r.backup;
    expect(b.profiles).toHaveLength(1); // « d » n'a jamais lancé de programme
    expect(b.profiles[0]).toMatchObject({
      name: 'Alexander', goal: 'mass', sessionsPerWeek: 3, weightKg: 66, backCare: true,
      kcalTarget: 3050, startDate: '2026-01-05', firstUseDate: '2026-01-07',
    });
    expect(b.exerciseLogs).toHaveLength(2);
    expect(b.exerciseLogs[0]!.sets[1]).toEqual({ kg: 20, reps: 9, feedback: 'hard' });
    expect(b.exerciseLogs[1]!.cardio).toBe(true);
    expect(b.sessions).toEqual([{ profileId: 'proto-a', date: '2026-01-05', done: true, feeling: 4 }]);
    expect(b.checkIns[0]).toMatchObject({ energy: 2, soreness: 'strong' });
    expect(b.pantry.map((x) => x.ingredient).sort()).toEqual(['olive-oil', 'rice']);
    expect(b.food[0]).toMatchObject({ kcal: 620, menuSlot: 0 });
    expect(b.supplements[0]).toMatchObject({ supplement: 'creatine', taken: true });
    // la sauvegarde convertie est valide au format de l'appli
    expect(importBackup(JSON.stringify(b)).ok).toBe(true);
  });
});
