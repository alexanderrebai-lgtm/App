import { describe, expect, it } from 'vitest';
import { content, exerciseById } from '@muscu/content';
import {
  addDays, dayPlan, fr, isDeloadWeek, parseScheme, phaseOf, plannedTrainingDates, setsToDo, substitute,
  weekday,
} from '../src';
import { loadPrototype, setProtoProfile } from './prototype';
import { profile } from './fixtures';

const START = '2026-01-05'; // un lundi
const nameOf = (id: string) => exerciseById.get(id)!.name;

describe('phases et semaines allégées', () => {
  it('débutant : 1–8, 9–17, 18–26', () => {
    expect([0, 7, 8, 16, 17, 25].map((w) => phaseOf(w, 'beginner'))).toEqual([0, 0, 1, 1, 2, 2]);
  });
  it('confirmé : 1–4, 5–14, 15–26', () => {
    expect([0, 3, 4, 13, 14, 25].map((w) => phaseOf(w, 'advanced'))).toEqual([0, 0, 1, 1, 2, 2]);
  });
  it('semaine allégée toutes les 4 semaines', () => {
    expect([...Array(26).keys()].filter(isDeloadWeek).map((w) => w + 1)).toEqual([4, 8, 12, 16, 20, 24]);
  });
});

describe('semaine type', () => {
  const kinds = (n: 2 | 3 | 4) =>
    [0, 1, 2, 3, 4, 5, 6].map((d) => dayPlan(profile({ sessionsPerWeek: n }), addDays(START, d))!.day.kind);
  it('2 séances : lundi et jeudi, mobilité le mercredi', () => {
    expect(kinds(2)).toEqual(['training', 'rest', 'mobility', 'training', 'rest', 'walk', 'rest']);
  });
  it('3 séances : lundi, mercredi, vendredi', () => {
    expect(kinds(3)).toEqual(['training', 'rest', 'training', 'rest', 'training', 'walk', 'rest']);
  });
  it('4 séances : lundi, mardi, jeudi, vendredi, mobilité le mercredi', () => {
    expect(kinds(4)).toEqual(['training', 'training', 'mobility', 'training', 'training', 'walk', 'rest']);
  });
  it('rien hors des 26 semaines', () => {
    expect(dayPlan(profile(), addDays(START, -1))).toBeNull();
    expect(dayPlan(profile(), addDays(START, 182))).toBeNull();
    expect(dayPlan(profile(), addDays(START, 181))).not.toBeNull();
    expect(plannedTrainingDates(profile({ sessionsPerWeek: 3 }), START, addDays(START, 181))).toHaveLength(78);
  });
});

describe('séances identiques au prototype', () => {
  const P = loadPrototype();
  for (const goal of ['mass', 'strength', 'power', 'cardio'] as const) {
    for (const freq of [2, 3, 4] as const) {
      for (const lv of [0, 1]) {
        for (const back of [false, true]) {
          // écart voulu : en explosivité à 2 séances, chaque séance mélange haut et bas (voir program.ts)
          if (goal === 'power' && freq === 2) continue;
          it(`${goal} · ${freq} séances · niveau ${lv} · dos ${back}`, () => {
            setProtoProfile(P, back ? 'a' : 'd', { prog: goal, fq: freq, lv }, START);
            const p = profile({ goal, sessionsPerWeek: freq, level: lv ? 'advanced' : 'beginner', backCare: back });
            for (let d = 0; d < 182; d += 1) {
              const date = addDays(START, d);
              const mine = dayPlan(p, date)!;
              const theirs = P.sess(date);
              expect(mine.items.map((i) => [nameOf(i.exercise), i.scheme])).toEqual(theirs.l.map((x: string[]) => [x[0], x[1]]));
              expect(fr.sessionLabels[mine.label]).toBe(theirs.lab);
              expect([mine.week, mine.phase, mine.deload]).toEqual([theirs.i.w, theirs.i.ph, theirs.i.dl]);
            }
          });
        }
      }
    }
  }

  it('explosivité à 2 séances : haut et bas dans chaque séance', () => {
    const p = profile({ goal: 'power', sessionsPerWeek: 2 });
    const mon = dayPlan(p, START)!;
    const thu = dayPlan(p, addDays(START, 3))!;
    const muscles = (ids: string[]) => new Set(ids.flatMap((id) => exerciseById.get(id)!.muscles));
    for (const s of [mon, thu]) {
      const m = muscles(s.items.map((i) => i.exercise));
      expect(m.has('quads') || m.has('glutes') || m.has('calves')).toBe(true);
      expect(m.has('chest') || m.has('shoulders') || m.has('back') || m.has('biceps')).toBe(true);
    }
    expect(fr.sessionLabels[mon.label]).toBe('Séance 1');
  });

  it('mode dos sensible : bird-dog ajouté aux séances du bas', () => {
    const p = profile({ backCare: true, sessionsPerWeek: 4 });
    const days = [0, 1, 3, 4].map((d) => dayPlan(p, addDays(START, d))!);
    expect(days.map((x) => x.items.some((i) => i.exercise === 'bird-dog'))).toEqual([false, true, false, true]);
    expect(dayPlan(profile({ backCare: true, goal: 'cardio' }), addDays(START, 3))!.items.some((i) => i.exercise === 'bird-dog')).toBe(false);
  });
});

describe('prescriptions', () => {
  it('lit séries et répétitions', () => {
    expect(parseScheme('3×10–12')).toMatchObject({ sets: 3, topReps: 12, free: false });
    expect(parseScheme('5×5')).toMatchObject({ sets: 5, topReps: 5 });
    expect(parseScheme('3×max')).toMatchObject({ sets: 3, topReps: 0 });
    expect(parseScheme('25 min')).toMatchObject({ sets: 0, free: true });
    expect(parseScheme('6 rép.')).toMatchObject({ sets: 0, free: true });
  });
  it('une série de moins en semaine allégée ou si le check-in est mauvais, sans cumul, minimum 1', () => {
    const s = parseScheme('3×10');
    expect(setsToDo(s, { deload: false, lowReadiness: false })).toBe(3);
    expect(setsToDo(s, { deload: true, lowReadiness: false })).toBe(2);
    expect(setsToDo(s, { deload: false, lowReadiness: true })).toBe(2);
    expect(setsToDo(s, { deload: true, lowReadiness: true })).toBe(2);
    expect(setsToDo(parseScheme('1×10'), { deload: true, lowReadiness: false })).toBe(1);
  });
});

describe('remplacer un exercice', () => {
  it('passe au suivant du groupe, comme le prototype', () => {
    const P = loadPrototype();
    for (const e of content.exercises.exercises) {
      const arr = [e.name];
      const changed = P.swapEx(arr);
      const mine = substitute(e.id);
      expect(mine ? nameOf(mine) : null, e.name).toBe(changed ? arr[0] : null);
    }
  });
  it('une variante se rattache à son groupe', () => {
    expect(substitute('squat-goblet-lourd')).toBe('fentes-marchees');
  });
});

it('weekday : lundi = 0', () => {
  expect(weekday(START)).toBe(0);
  expect(weekday('2026-11-08')).toBe(6);
});
