import { describe, expect, it } from 'vitest';
import { content } from '@muscu/content';
import { BODY, dist, MOVEMENTS, PATTERNS, solve, sampleExercise, cycleLength, type Joints, type PatternId } from '../src';

const LIMBS: [keyof Joints, keyof Joints, number][] = [
  ['hipL', 'kneeL', BODY.thigh], ['kneeL', 'ankleL', BODY.shin], ['hipR', 'kneeR', BODY.thigh], ['kneeR', 'ankleR', BODY.shin],
  ['shL', 'elbowL', BODY.upperArm], ['elbowL', 'handL', BODY.forearm], ['shR', 'elbowR', BODY.upperArm], ['elbowR', 'handR', BODY.forearm],
];

describe('gestes du mannequin', () => {
  for (const [id, p] of Object.entries(PATTERNS)) {
    it(`${id} : longueurs fixes, cibles atteintes, rien sous le sol`, () => {
      for (const side of [1, -1] as const) for (let i = 0; i <= 20; i++) {
        const s = i / 20;
        const frame = p.pose(s, side);
        const r = solve(frame.spec);
        for (const [a, b, l] of LIMBS) expect(dist(r.joints[a], r.joints[b]), `${id} ${a}-${b} s=${s}`).toBeCloseTo(l, 3);
        for (const [k, j] of Object.entries(r.joints)) {
          expect(j.every(Number.isFinite), `${id} ${k}`).toBe(true);
          expect(j[1], `${id} ${k} sous le sol (s=${s})`).toBeGreaterThan(-0.03);
        }
        expect(r.reachError, `${id} cible hors de portée (s=${s}, côté ${side})`).toBeLessThan(0.06);
      }
    });
  }
});

describe('correspondance exercices → gestes', () => {
  it('chacun des exercices du programme a un geste', () => {
    for (const e of content.exercises.exercises) expect(MOVEMENTS[e.id], e.id).toBeDefined();
    for (const m of Object.values(MOVEMENTS)) expect(PATTERNS[m.pattern as PatternId]).toBeDefined();
  });
  it('échantillonnage au fil du temps : répétitions comptées, côtés alternés', () => {
    const len = cycleLength(PATTERNS.lunge);
    expect(sampleExercise('fentes-marchees', 0.1).side).toBe(1);
    expect(sampleExercise('fentes-marchees', len + 0.1)).toMatchObject({ rep: 1, side: -1 });
    expect(sampleExercise('squat-goblet', 0.1).phase).toBe(0);
    expect(sampleExercise('squat-goblet', 2.1).phase).toBe(1);
    // ralenti : deux fois plus long
    expect(sampleExercise('squat-goblet', 2.1, 0.5).phase).toBe(0);
  });
  it('squat : les pieds restent au sol, le bassin descend', () => {
    const top = sampleExercise('squat-goblet', 0).pose.joints;
    const bottom = sampleExercise('squat-goblet', 2.1).pose.joints;
    expect(bottom.pelvis[1]).toBeLessThan(top.pelvis[1] - 0.35);
    expect(bottom.ankleL[1]).toBeCloseTo(BODY.ankle, 2);
  });
});
