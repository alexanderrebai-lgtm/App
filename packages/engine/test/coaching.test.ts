import { describe, expect, it } from 'vitest';
import { content } from '@muscu/content';
import {
  addDays, adaptForInjuries, applyCalorieAdvice, boostersFor, calorieFloor, coachingPlan, dayPlan, deloadAdvice,
  effectiveTargets, explainExercise, fitToDuration, estimateMinutes, goalPlan, mealPlan, plateaus, screen, targets,
  weekPattern, weeklyVolume, type ExerciseLog, type Profile,
} from '../src';
import { profile } from './fixtures';

const START = '2026-01-05';
const total = (p: Profile, week: number) => weeklyVolume(p, addDays(START, week * 7))!;

describe('volume hebdomadaire par muscle', () => {
  it('débutant : les muscles évalués sont dans la cible ou en dessous, jamais au-dessus', () => {
    const rows = total(profile({ sessionsPerWeek: 3 }), 1).filter((r) => r.evaluated);
    expect(rows.every((r) => r.status !== 'high')).toBe(true);
  });
  it('avancé : le complément de volume ajoute des séries par rapport au débutant', () => {
    const sum = (p: Profile) => total(p, 6).reduce((a, r) => a + r.sets, 0);
    expect(sum(profile({ sessionsPerWeek: 4, level: 'advanced' }))).toBeGreaterThan(sum(profile({ sessionsPerWeek: 4 })));
  });
  it('les muscles seulement affichés ne sont jamais jugés', () => {
    const rows = total(profile({ sessionsPerWeek: 3 }), 1).filter((r) => !r.evaluated);
    expect(rows.every((r) => r.status === 'ok')).toBe(true);
  });
});

describe('plateaux et semaine allégée', () => {
  const log = (date: string, kg: number): ExerciseLog => ({ profileId: 'p1', date, exercise: 'squat-barre', sets: [{ kg, reps: 8 }] });
  const compound = content.exercises.exercises.find((e) => e.role === 'compound')!.id;
  const logs = (kgs: number[]): ExerciseLog[] => kgs.map((kg, i) => ({ ...log(addDays('2026-02-01', i * 3), kg), exercise: compound }));
  it('3 séances sans progression : plateau', () => {
    expect(plateaus(logs([50, 60, 60, 60, 60]), '2026-02-14')).toHaveLength(1);
  });
  it('en progression : pas de plateau', () => {
    expect(plateaus(logs([50, 52.5, 55, 57.5, 60]), '2026-02-14')).toHaveLength(0);
  });
  it('énergie basse en semaine normale : alléger maintenant', () => {
    const p = profile({ level: 'intermediate' });
    const checkIns = [0, 1, 2, 3].map((i) => ({ profileId: 'p1', date: addDays('2026-02-12', i), energy: 1, soreness: 'none' as const, sleep: 5 }));
    const a = deloadAdvice(p, { checkIns: checkIns as never, exerciseLogs: [], sessions: [] }, '2026-02-16');
    expect(a).toMatchObject({ action: 'now' });
    expect(a!.reasons).toContain('lowEnergy');
  });
  it('sans donnée : rien à changer', () => {
    expect(deloadAdvice(profile(), { checkIns: [], exerciseLogs: [], sessions: [] }, '2026-02-02')?.action).toBe('keep');
  });
});

describe('calories et prise de poids difficile', () => {
  it('prise de masse : surplus décroissant avec le niveau', () => {
    const k = (level: Profile['level']) => effectiveTargets(profile({ level })).kcal;
    expect(k('beginner')).toBeGreaterThan(k('intermediate'));
    expect(k('intermediate')).toBeGreaterThan(k('advanced'));
  });
  it('difficulté à prendre du poids : surplus et protéines supérieurs, plus de repas', () => {
    const normal = effectiveTargets(profile());
    const hg = effectiveTargets(profile({ hardGainer: true }));
    expect(hg.kcal).toBeGreaterThan(normal.kcal);
    expect(goalPlan('mass', { level: 'beginner', hardGainer: true }).hardGainer).toBe(true);
    expect(mealPlan(5).names).toHaveLength(5);
  });
  it('perte de graisse : déficit, mais jamais sous le plancher', () => {
    const p = profile({ goal: 'fatloss', sex: 'female', weightKg: 45, heightCm: 155 });
    expect(effectiveTargets(p).kcal).toBeGreaterThanOrEqual(calorieFloor(p));
    const r = applyCalorieAdvice({ ...p, kcalTarget: calorieFloor(p) }, -150);
    expect(r.blocked).toBe(true);
    expect(r.kcal).toBe(calorieFloor(p));
  });
  it('forme générale : calories d’entretien', () => {
    const p = profile({ goal: 'health' });
    const t = targets(p, 'health', { level: 'beginner' });
    expect(Math.abs(t.kcal - effectiveTargets(p).kcal)).toBe(0);
  });
  it('boosters : des calories ajoutées sans volume de repas', () => {
    const b = boostersFor(400);
    expect(b.kcal).toBeGreaterThan(0);
    expect(b.items.length).toBeGreaterThan(0);
  });
});

describe('questionnaire de santé', () => {
  it('aucune réponse oui : ok', () => {
    expect(screen({}).outcome).toBe('ok');
  });
  it('douleur à la poitrine : avis médical', () => {
    expect(screen({ chest: true }).outcome).toBe('doctor');
  });
  it('articulations : conseil seulement', () => {
    expect(screen({ joints: true }).outcome).toBe('advice');
  });
  it('insuffisance pondérale chez la personne qui ne prend pas de poids : conseil', () => {
    expect(screen({}, { weightKg: 50, heightCm: 180 }, true)).toMatchObject({ outcome: 'advice', underweight: true });
  });
});

describe('explications, séances adaptées', () => {
  it('explique le rôle, la zone de répétitions et le repos', () => {
    const id = content.exercises.exercises.find((e) => e.role === 'compound')!.id;
    const e = explainExercise(id, '3×4–6', { goal: 'strength', phase: 1 })!;
    expect(e.role.id).toBe('compound');
    expect(e.restSeconds).toBe(150);
    expect(e.evidence.length).toBeGreaterThan(0);
    expect(explainExercise('inconnu', '3×8', { goal: 'mass', phase: 0 })).toBeNull();
  });
  it('blessure à l’épaule : les exercices qui sollicitent l’épaule sont remplacés ou retirés, avec note', () => {
    expect(adaptForInjuries([], undefined).notes).toEqual([]);
    const p = profile({ sessionsPerWeek: 3, injuries: ['shoulder'] });
    for (let d = 0; d < 7; d++) {
      const plan = dayPlan(p, addDays(START, d))!;
      if (plan.day.kind !== 'training') continue;
      for (const it of plan.items) {
        const ex = content.exercises.exercises.find((e) => e.id === it.exercise)!;
        expect(ex.joints).not.toContain('shoulder');
      }
    }
  });
  it('séance de 30 minutes : raccourcie, durée estimée respectée', () => {
    const p = profile({ sessionsPerWeek: 3, sessionMinutes: 30 });
    const plan = dayPlan(p, START)!;
    expect(estimateMinutes(plan.items, 'mass')).toBeLessThanOrEqual(30);
    expect(fitToDuration(plan.items, undefined, 'mass').notes).toEqual([]);
  });
  it('jours d’entraînement choisis', () => {
    const w = weekPattern(3, [1, 3, 5]);
    expect(w.map((d, i) => (d.kind === 'training' ? i : -1)).filter((i) => i >= 0)).toEqual([1, 3, 5]);
  });
});

describe('Mon coaching', () => {
  it('résume objectif, calories, protéines, volume', () => {
    const c = coachingPlan(profile({ sessionsPerWeek: 3, hardGainer: true }), START);
    expect(c.hardGainer).toBe(true);
    expect(c.kcal.value).toBe(c.targets.kcal);
    expect(c.proteinPerKg).toBeGreaterThan(1.5);
    expect(c.volume).not.toBeNull();
    expect(c.evidence.length).toBeGreaterThan(0);
  });
});
