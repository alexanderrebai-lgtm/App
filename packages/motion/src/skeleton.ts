import { add, comb, cross, dist, dot, len, mul, norm, sub, v, type V3 } from './vec';

/** Proportions du mannequin (mètres) : adulte d'environ 1,75 m. */
export const BODY = {
  shin: 0.44, thigh: 0.45, ankle: 0.08, foot: 0.24, torso: 0.52, neck: 0.13, head: 0.105,
  upperArm: 0.3, forearm: 0.27, hipW: 0.1, shoulderW: 0.19,
} as const;

export type Side = 'L' | 'R';
/** L = côté gauche de l'athlète (z positif). */
export const SIDE: Record<Side, 1 | -1> = { L: 1, R: -1 };

export interface LimbTarget {
  /** Position visée : cheville pour une jambe, main pour un bras. */
  at: V3;
  /** Direction vers laquelle plier (genou, coude). */
  pole: V3;
}

export interface PoseSpec {
  pelvis: V3;
  /** Direction bassin → épaules. */
  up: V3;
  /** Avant de la poitrine ; par défaut perpendiculaire à `up` dans le plan sagittal. */
  front?: V3;
  legs: Record<Side, LimbTarget & { toe?: V3 }>;
  arms: Record<Side, LimbTarget>;
  /** Inclinaison de la tête vers l'avant (rad). */
  headTilt?: number;
}

export interface Joints {
  pelvis: V3; chest: V3; neck: V3; head: V3;
  hipL: V3; hipR: V3; kneeL: V3; kneeR: V3; ankleL: V3; ankleR: V3; toeL: V3; toeR: V3;
  shL: V3; shR: V3; elbowL: V3; elbowR: V3; handL: V3; handR: V3;
}

export interface Solved {
  joints: Joints;
  frame: { up: V3; front: V3; left: V3 };
  /** Écart entre chaque cible et la position atteinte (m) : 0 si la cible est à portée. */
  reachError: number;
}

/** Cinématique inverse à deux segments, avec la direction de pliage `pole`. */
export function ik(a: V3, target: V3, l1: number, l2: number, pole: V3): { joint: V3; end: V3; error: number } {
  let ac = sub(target, a);
  let d = len(ac);
  const max = l1 + l2 - 1e-4;
  const min = Math.abs(l1 - l2) + 1e-4;
  let error = 0;
  if (d > max) { error = d - max; ac = mul(norm(ac), max); d = max; }
  if (d < min) { error = min - d; ac = mul(norm(ac.some((x) => x !== 0) ? ac : v(0, -1, 0)), min); d = min; }
  const end = add(a, ac);
  const dir = norm(ac);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  let n = sub(pole, mul(dir, dot(pole, dir)));
  if (len(n) < 1e-6) n = cross(dir, v(0, 0, 1));
  n = norm(n);
  return { joint: comb(a, [dir, x], [n, h]), end, error };
}

export function solve(spec: PoseSpec): Solved {
  const up = norm(spec.up);
  const front = norm(spec.front ?? v(up[1], -up[0], 0));
  const left = norm(cross(front, up));
  const p = spec.pelvis;
  const chest = comb(p, [up, BODY.torso]);
  const neck = comb(chest, [up, BODY.neck]);
  const tilt = spec.headTilt ?? 0;
  const head = comb(neck, [up, 0.1 * Math.cos(tilt)], [front, 0.02 + 0.1 * Math.sin(tilt)]);
  const j: Partial<Joints> = { pelvis: p, chest, neck, head };
  let reachError = 0;
  for (const s of ['L', 'R'] as const) {
    const k = s === 'L' ? 1 : -1;
    const hip = comb(p, [left, BODY.hipW * k]);
    const leg = ik(hip, spec.legs[s].at, BODY.thigh, BODY.shin, spec.legs[s].pole);
    const toe = comb(leg.end, [norm(spec.legs[s].toe ?? v(1, -0.25, 0)), BODY.foot * 0.85]);
    const sh = comb(chest, [left, BODY.shoulderW * k]);
    const arm = ik(sh, spec.arms[s].at, BODY.upperArm, BODY.forearm, spec.arms[s].pole);
    Object.assign(j, {
      [`hip${s}`]: hip, [`knee${s}`]: leg.joint, [`ankle${s}`]: leg.end, [`toe${s}`]: toe,
      [`sh${s}`]: sh, [`elbow${s}`]: arm.joint, [`hand${s}`]: arm.end,
    });
    reachError = Math.max(reachError, leg.error, arm.error);
  }
  return { joints: j as Joints, frame: { up, front, left }, reachError };
}

/** Point d'une épaule ou d'une hanche avant résolution (utile pour poser les mains). */
export function shoulderOf(pelvis: V3, up: V3, side: Side, front?: V3): V3 {
  const u = norm(up);
  const f = norm(front ?? v(u[1], -u[0], 0));
  const l = norm(cross(f, u));
  return comb(pelvis, [u, BODY.torso], [l, BODY.shoulderW * SIDE[side]]);
}

export { dist };
