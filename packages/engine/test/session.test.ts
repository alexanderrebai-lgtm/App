import { describe, expect, it } from 'vitest';
import {
  addDays, dayPlan, restRemaining, sessionReducer, sessionResult, startSession, substituteFor,
  type ExerciseLog, type SessionAction, type SessionState,
} from '../src';
import { profile } from './fixtures';

const START = '2026-01-05';
const run = (s: SessionState, ...acts: SessionAction[]) => acts.reduce(sessionReducer, s);

function session(o: { date?: string; history?: ExerciseLog[]; low?: boolean; orm?: Record<string, number>; p?: Parameters<typeof profile>[0] } = {}) {
  const p = profile(o.p);
  const plan = dayPlan(p, o.date ?? START)!;
  return startSession({ plan, goal: p.goal, history: o.history ?? [], lowReadiness: !!o.low, now: 0, oneRepMaxes: o.orm }, plan.label);
}

describe('séance guidée', () => {
  it('commence par la présentation du premier exercice, charge à trouver la première fois', () => {
    const s = session();
    expect(s.phase).toBe('intro');
    expect(s.exercises[0]).toMatchObject({ exercise: 'developpe-couche-halteres', targetSets: 3, suggestedKg: null, suggestedReps: 12 });
    expect(s.kg).toBe(0);
  });

  it('préremplit avec la dernière séance et propose +2,5 kg si le haut de fourchette est atteint', () => {
    const history: ExerciseLog[] = [{ profileId: 'p1', date: '2026-01-01', exercise: 'developpe-couche-halteres', sets: [{ kg: 20, reps: 12 }, { kg: 20, reps: 12 }] }];
    const s = session({ history });
    expect([s.kg, s.reps]).toEqual([22.5, 12]);
  });

  it('Facile / Bien / Dur règle la série suivante, puis repos automatique', () => {
    let s = run(session(), { type: 'begin' }, { type: 'setKg', kg: 20 }, { type: 'setReps', reps: 12 }, { type: 'feedback', value: 'easy' }, { type: 'validateSet', now: 1000 });
    expect(s.phase).toBe('rest');
    expect(s.kg).toBe(22.5);
    expect(s.restTotal).toBe(75); // 3×10–12
    expect(restRemaining(s, 1000)).toBe(75);
    s = run(s, { type: 'addRest', seconds: 30 });
    expect(restRemaining(s, 1000)).toBe(105);
    s = run(s, { type: 'tick', now: 50_000 });
    expect(s.phase).toBe('rest');
    s = run(s, { type: 'tick', now: 106_000 });
    expect(s.phase).toBe('set');
    s = run(s, { type: 'feedback', value: 'hard' }, { type: 'validateSet', now: 110_000 });
    expect(s.kg).toBe(20);
  });

  it('après la dernière série, repos puis présentation de l’exercice suivant', () => {
    let s = run(session(), { type: 'begin' }, { type: 'setKg', kg: 20 }, { type: 'setReps', reps: 10 });
    for (let i = 0; i < 3; i++) s = run(s, { type: 'validateSet', now: i }, { type: 'skipRest' });
    expect(s.index).toBe(1);
    expect(s.phase).toBe('intro');
    expect(s.exercises[0]!.sets).toHaveLength(3);
  });

  it('check-in difficile ou semaine allégée : une série de moins', () => {
    expect(session({ low: true }).exercises[0]!.targetSets).toBe(2);
    expect(session({ date: addDays(START, 21) }).exercises[0]!.targetSets).toBe(2); // semaine 4
  });

  it('revoir le mouvement en cours de série, puis reprendre', () => {
    let s = run(session(), { type: 'begin' }, { type: 'setKg', kg: 20 }, { type: 'setReps', reps: 10 }, { type: 'validateSet', now: 0 }, { type: 'skipRest' });
    s = run(s, { type: 'review' });
    expect(s.phase).toBe('intro');
    s = run(s, { type: 'begin' });
    expect([s.phase, s.exercises[0]!.sets.length]).toEqual(['set', 1]);
  });

  it('remplacer et passer', () => {
    let s = run(session(), { type: 'replace', exercise: 'pompes', history: [] });
    expect(s.exercises[0]).toMatchObject({ exercise: 'pompes', planned: 'developpe-couche-halteres', targetSets: 3 });
    s = run(s, { type: 'skipExercise', now: 5 });
    expect(s.index).toBe(1);
    expect(s.exercises[0]!.skipped).toBe(true);
  });

  it('un 1RM connu donne la charge de départ (niveau confirmé)', () => {
    const s = session({ orm: { 'developpe-couche-halteres': 40 } });
    // 40 / (1 + (12 + 2) / 30) = 27,3 → 25 kg
    expect(s.kg).toBe(25);
  });

  it('répétitions en réserve enregistrées en RPE', () => {
    const s = run(session(), { type: 'begin' }, { type: 'setKg', kg: 20 }, { type: 'setReps', reps: 10 }, { type: 'rir', value: 2 }, { type: 'validateSet', now: 0 });
    expect(s.exercises[0]!.sets[0]).toEqual({ kg: 20, reps: 10, feedback: 'good', rpe: 8 });
  });

  it('cardio : durée et distance, sans repos', () => {
    const p = { goal: 'cardio' as const };
    let s = session({ p });
    expect(s.exercises[0]!.free).toBe(true);
    s = run(s, { type: 'begin' }, { type: 'logFree', minutes: 5, km: 0.4, now: 10 });
    expect(s.phase).toBe('intro');
    expect(s.exercises[0]!.sets).toEqual([{ kg: 5, reps: 0.4 }]);
  });

  it('fin de séance : durée, séries, volume, ressenti et journaux', () => {
    let s = run(session(), { type: 'begin' }, { type: 'setKg', kg: 20 }, { type: 'setReps', reps: 10 });
    s = run(s, { type: 'validateSet', now: 60_000 }, { type: 'skipRest' }, { type: 'validateSet', now: 120_000 });
    s = run(s, { type: 'finish', now: 30 * 60_000 }, { type: 'feeling', value: 4 });
    const r = sessionResult(s, 'p1', 99);
    expect(r).toMatchObject({ durationMin: 30, sets: 2, volumeKg: 400, exercisesDone: 1 });
    expect(r.logs[0]).toMatchObject({ profileId: 'p1', date: START, exercise: 'developpe-couche-halteres' });
    expect(s.feeling).toBe(4);
  });

  it('dernier exercice terminé : séance finie', () => {
    let s = session();
    for (let i = 0; i < s.exercises.length; i++) s = run(s, { type: 'skipExercise', now: 1 });
    expect(s.phase).toBe('done');
  });
});

describe('remplacement selon le matériel', () => {
  it('en salle : suivant du groupe', () => {
    expect(substituteFor('developpe-couche-halteres', 'gym', [])).toBe('pompes');
  });
  it('à la maison : saute les machines, évite les doublons', () => {
    expect(substituteFor('presse-a-cuisses', 'home', [])).toBe('squat-goblet');
    expect(substituteFor('squat-goblet', 'home', ['fentes-marchees'])).toBe('fentes-bulgares');
    expect(substituteFor('tirage-vertical-poulie', 'home', [])).toBe('rowing-haltere-un-bras');
  });
});
