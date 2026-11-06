// Gestes de base du mannequin. Chaque geste renvoie une pose pour s ∈ [0, 1]
// (0 : position de départ, 1 : position d'arrivée) ou pour t ∈ [0, 1[ (gestes cycliques).
// Repère : x vers l'avant de l'athlète, y vers le haut, z vers sa gauche. Le sol est à y = 0.
import { BODY, shoulderOf, SIDE, type LimbTarget, type PoseSpec, type Side } from './skeleton';
import { add, comb, lerp, norm, sag, smooth, sub, v, type V3 } from './vec';

export type Prop =
  | { kind: 'bench'; center: V3; size: V3; tilt?: number }
  | { kind: 'box'; center: V3; size: V3 }
  | { kind: 'bar'; at: V3; width: number }
  | { kind: 'wall'; x: number; side?: number }
  | { kind: 'roller'; at: V3 }
  | { kind: 'bike' }
  | { kind: 'post'; at: V3 };

export interface Frame {
  spec: PoseSpec;
  props?: Prop[];
  /** Point d'attache d'un câble (poulie). */
  anchor?: V3;
  /** Position du médecine-ball s'il n'est pas dans les mains. */
  ball?: V3;
}

/** Style de geste : fixe les libellés de phase. */
export type Style = 'lower' | 'push' | 'pull' | 'raise' | 'hold' | 'cycle' | 'jump';

export interface Pattern {
  id: string;
  style: Style;
  /** Durées (s) : aller, pause, retour, pause. Pour un geste cyclique, seule la première compte (période). */
  tempo: [number, number, number, number];
  /** Alterne côté gauche et côté droit à chaque répétition. */
  alternate?: boolean;
  pose(s: number, side: 1 | -1): Frame;
}

const A = BODY.ankle;
const FWD = v(1, 0, 0);
const DOWN = v(0, -1, 0);
const UPV = v(0, 1, 0);
const BACK = v(-1, 0, 0);

const planted = (w = 0.12, x = 0, pole: V3 = v(1, 0, 0.25)): PoseSpec['legs'] => ({
  L: { at: v(x, A, w), pole: v(pole[0], pole[1], pole[2]) },
  R: { at: v(x, A, -w), pole: v(pole[0], pole[1], -pole[2]) },
});

/** Bras : cible calculée depuis l'épaule de chaque côté. */
function arms(pelvis: V3, up: V3, f: (sh: V3, k: 1 | -1, side: Side) => V3, pole: (k: 1 | -1) => V3, front?: V3): PoseSpec['arms'] {
  const one = (s: Side): LimbTarget => ({ at: f(shoulderOf(pelvis, up, s, front), SIDE[s], s), pole: pole(SIDE[s]) });
  return { L: one('L'), R: one('R') };
}
const hang = (lift = 0) => (sh: V3, k: 1 | -1) => add(sh, v(0.03, -0.54 + lift, 0.03 * k));
const armsDown = (p: V3, up: V3) => arms(p, up, hang(), () => v(-1, 0, 0));
const sideways = (pole: V3, k: number): V3 => v(pole[0], pole[1], pole[2] * k);

/** Bassin et buste debout, penché de `lean` rad vers l'avant. */
const standing = (hipY: number, lean = 0.03, hipX = 0) => ({ pelvis: v(hipX, hipY, 0), up: sag(lean) });

// ---------- membres inférieurs ----------

const squat = (implement: 'goblet' | 'free' = 'goblet'): Pattern => ({
  id: implement === 'goblet' ? 'squat' : 'airSquat', style: 'lower', tempo: [2, 0.35, 1, 0.7],
  pose(s) {
    const { pelvis, up } = standing(0.955 - 0.44 * s, 0.08 + 0.55 * s, -0.02 - 0.2 * s);
    const f = v(up[1], -up[0], 0);
    return {
      spec: {
        pelvis, up, legs: planted(0.16, 0, v(1, 0, 0.35)),
        arms: arms(pelvis, up, (sh, k) => comb(sh, [f, 0.24], [up, -0.2], [v(0, 0, 1), -BODY.shoulderW * k + 0.075 * k]), (k) => v(0.2, -1, 0.5 * k)),
      },
    };
  },
});

const lunge = (rearOnBench = false): Pattern => ({
  id: rearOnBench ? 'splitSquat' : 'lunge', style: 'lower', tempo: [2, 0.35, 1, 0.7], alternate: !rearOnBench,
  pose(s, side) {
    const { pelvis, up } = standing((rearOnBench ? 0.86 : 0.9) - 0.4 * s, 0.03, rearOnBench ? -0.05 : 0);
    const front: LimbTarget & { toe?: V3 } = { at: v(rearOnBench ? 0.4 : 0.32, A, 0.11 * side), pole: FWD };
    const back: LimbTarget & { toe?: V3 } = rearOnBench
      ? { at: v(-0.58, 0.52, -0.11 * side), pole: FWD, toe: v(-0.6, -0.8, 0) }
      : { at: v(-0.36, 0.14, -0.11 * side), pole: FWD, toe: v(0.6, -0.8, 0) };
    return {
      spec: { pelvis, up, legs: side === 1 ? { L: front, R: back } : { L: back, R: front }, arms: armsDown(pelvis, up) },
      props: rearOnBench ? [{ kind: 'bench', center: v(-0.68, 0.22, 0), size: v(0.4, 0.44, 0.35) }] : undefined,
    };
  },
});

const jumpSquat: Pattern = {
  id: 'jumpSquat', style: 'jump', tempo: [1.6, 0, 0, 0],
  pose(t) {
    // 0–0,45 : descente ; 0,45–0,6 : impulsion ; 0,6–0,75 : en l'air ; 0,75–1 : réception
    const depth = t < 0.45 ? smooth(t / 0.45) * 0.55 : t < 0.6 ? (1 - smooth((t - 0.45) / 0.15)) * 0.55 : t < 0.8 ? 0 : smooth((t - 0.8) / 0.1) * 0.3 * (1 - smooth((t - 0.9) / 0.1));
    const air = t >= 0.58 && t < 0.8 ? Math.sin(((t - 0.58) / 0.22) * Math.PI) * 0.22 : 0;
    const { pelvis, up } = standing(0.94 - 0.4 * depth + air, 0.08 + 0.5 * depth, -0.15 * depth);
    const legs = planted(0.15, 0, v(1, 0, 0.3));
    legs.L.at = add(legs.L.at, v(0, air, 0));
    legs.R.at = add(legs.R.at, v(0, air, 0));
    if (air) { legs.L.toe = v(0.7, -0.7, 0); legs.R.toe = v(0.7, -0.7, 0); }
    const swing = depth > 0.1 ? -0.4 : 0.9;
    return { spec: { pelvis, up, legs, arms: arms(pelvis, up, (sh) => comb(sh, [sag(Math.PI - swing), 0.55]), () => BACK) } };
  },
};

const broadJump: Pattern = {
  id: 'broadJump', style: 'jump', tempo: [2.2, 0, 0, 0],
  pose(t) {
    // saut vers l'avant puis retour en marchant
    const go = t < 0.55;
    const k = go ? t / 0.55 : 1;
    const depth = k < 0.4 ? smooth(k / 0.4) * 0.5 : k < 0.55 ? (1 - smooth((k - 0.4) / 0.15)) * 0.5 : k > 0.85 ? (1 - smooth((k - 0.85) / 0.15)) * 0.35 : 0;
    const fly = k >= 0.5 && k < 0.85 ? (k - 0.5) / 0.35 : k >= 0.85 ? 1 : 0;
    const back = go ? 0 : smooth((t - 0.55) / 0.45);
    const x = 0.7 * fly - 0.7 * back;
    const air = fly > 0 && fly < 1 ? Math.sin(fly * Math.PI) * 0.25 : 0;
    const { pelvis, up } = standing(0.94 - 0.4 * depth + air, 0.1 + 0.5 * depth, x - 0.12 * depth);
    const legs = planted(0.14, x, v(1, 0, 0.25));
    legs.L.at = add(legs.L.at, v(-0.15 * air, air, 0));
    legs.R.at = add(legs.R.at, v(-0.15 * air, air, 0));
    const swing = depth > 0.1 && fly === 0 ? -0.5 : 1.2;
    return { spec: { pelvis, up, legs, arms: arms(pelvis, up, (sh) => comb(sh, [sag(Math.PI - swing), 0.55]), () => BACK) } };
  },
};

const boxJump: Pattern = {
  id: 'boxJump', style: 'jump', tempo: [2.4, 0, 0, 0],
  pose(t) {
    const go = t < 0.6;
    const k = go ? t / 0.6 : 1;
    const depth = k < 0.4 ? smooth(k / 0.4) * 0.5 : k < 0.55 ? (1 - smooth((k - 0.4) / 0.15)) * 0.5 : k > 0.85 ? (1 - smooth((k - 0.85) / 0.15)) * 0.4 : 0;
    const fly = k >= 0.5 && k < 0.85 ? (k - 0.5) / 0.35 : k >= 0.85 ? 1 : 0;
    const down = go ? 0 : smooth((t - 0.6) / 0.4);
    const x = 0.5 * fly * (1 - down);
    const ground = 0.42 * fly * (1 - down);
    const air = fly > 0 && fly < 1 ? Math.sin(fly * Math.PI) * 0.18 : 0;
    const { pelvis, up } = standing(0.94 - 0.4 * depth + air + ground, 0.1 + 0.5 * depth, x - 0.12 * depth);
    const legs = planted(0.14, x, v(1, 0, 0.25));
    legs.L.at = add(legs.L.at, v(0, air + ground, 0));
    legs.R.at = add(legs.R.at, v(0, air + ground, 0));
    const swing = depth > 0.1 && fly === 0 ? -0.5 : 1.1;
    return {
      spec: { pelvis, up, legs, arms: arms(pelvis, up, (sh) => comb(sh, [sag(Math.PI - swing), 0.55]), () => BACK) },
      props: [{ kind: 'box', center: v(0.55, 0.21, 0), size: v(0.45, 0.42, 0.55) }],
    };
  },
};

const calfRaise = (seated = false): Pattern => ({
  id: seated ? 'seatedCalf' : 'calfRaise', style: 'push', tempo: [1, 0.5, 2, 0.5],
  pose(s) {
    const lift = 0.07 * s;
    if (seated) {
      const pelvis = v(-0.35, 0.5, 0);
      const up = sag(0.05);
      return {
        spec: {
          pelvis, up,
          legs: { L: { at: v(0.08, A + lift, 0.12), pole: v(1, 1, 0), toe: v(1, -0.5 - 3 * lift, 0) }, R: { at: v(0.08, A + lift, -0.12), pole: v(1, 1, 0), toe: v(1, -0.5 - 3 * lift, 0) } },
          arms: arms(pelvis, up, (sh, k) => v(0.05, 0.56, 0.12 * k), (k) => v(0.3, 0.2, k)),
        },
        props: [{ kind: 'bench', center: v(-0.35, 0.22, 0), size: v(0.4, 0.44, 0.4) }],
      };
    }
    const { pelvis, up } = standing(0.955 + lift, 0.02);
    const legs = planted(0.11, 0);
    legs.L = { ...legs.L, at: add(legs.L.at, v(0, lift, 0)), toe: v(1, -0.25 - 4 * lift, 0) };
    legs.R = { ...legs.R, at: add(legs.R.at, v(0, lift, 0)), toe: v(1, -0.25 - 4 * lift, 0) };
    return { spec: { pelvis, up, legs, arms: armsDown(pelvis, up) } };
  },
});

const hopCalf: Pattern = {
  id: 'hopCalf', style: 'cycle', tempo: [0.55, 0, 0, 0],
  pose(t) {
    const air = Math.max(0, Math.sin(t * Math.PI * 2)) * 0.08;
    const { pelvis, up } = standing(0.95 + air, 0.03);
    const legs = planted(0.11, 0);
    legs.L = { ...legs.L, at: add(legs.L.at, v(0, air + 0.03, 0)), toe: v(1, -0.6, 0) };
    legs.R = { ...legs.R, at: add(legs.R.at, v(0, air + 0.03, 0)), toe: v(1, -0.6, 0) };
    return { spec: { pelvis, up, legs, arms: arms(pelvis, up, (sh, k) => add(sh, v(0.12, -0.45, 0.1 * k)), () => BACK) } };
  },
};

/** Pont fessier au sol, ou hip thrust épaules sur un banc. */
const bridge = (onBench: boolean): Pattern => ({
  id: onBench ? 'hipThrust' : 'bridge', style: 'push', tempo: [1, 0.6, 2, 0.4],
  pose(s) {
    const sh = onBench ? v(-0.55, 0.5, 0) : v(-0.6, 0.11, 0);
    const pelvis = lerp(onBench ? v(-0.08, 0.24, 0) : v(-0.08, 0.11, 0), onBench ? v(-0.05, 0.52, 0) : v(-0.1, 0.36, 0), s);
    const up = norm(sub(sh, pelvis));
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: v(0.32, A, 0.15), pole: UPV }, R: { at: v(0.32, A, -0.15), pole: UPV } },
        arms: onBench
          ? arms(pelvis, up, (p, k) => comb(pelvis, [v(0.05, 0.06, 0), 1], [v(0, 0, 1), 0.12 * k]), (k) => v(0, 1, k))
          : arms(pelvis, up, (p, k) => v(-0.15, 0.03, 0.3 * k), () => UPV),
      },
      props: onBench ? [{ kind: 'bench', center: v(-0.75, 0.21, 0), size: v(0.4, 0.42, 1.0) }] : undefined,
    };
  },
});

/** Charnière de hanche debout (tirage entre les jambes, extension du dos, étirement). */
const hinge = (variant: 'pullThrough' | 'back' | 'stretch'): Pattern => ({
  id: `hinge-${variant}`, style: variant === 'stretch' ? 'hold' : 'push',
  tempo: variant === 'stretch' ? [4, 0, 4, 0] : [1, 0.4, 2, 0.4],
  pose(s) {
    // s : 0 penché, 1 debout (concentrique d'abord)
    const lean = variant === 'stretch' ? 1.25 + 0.1 * s : 1.3 - 1.2 * s;
    const { pelvis, up } = standing(0.93 - 0.05 * (1 - s), lean, -0.1 * (1 - s));
    const f = v(up[1], -up[0], 0);
    let a: PoseSpec['arms'];
    if (variant === 'pullThrough') a = arms(pelvis, up, (sh, k) => lerp(add(sh, v(-0.22, -0.5, -0.12 * k)), add(sh, v(0.12, -0.52, -0.12 * k)), s), () => FWD);
    else if (variant === 'back') a = arms(pelvis, up, (sh, k) => comb(sh, [f, 0.15], [up, -0.08], [v(0, 0, 1), -0.25 * k]), (k) => v(0, -1, k));
    else a = arms(pelvis, up, (sh, k) => add(sh, v(0.02, -0.55, -0.06 * k)), () => BACK);
    return {
      spec: { pelvis, up, legs: planted(0.12, 0, v(1, 0, 0.1)), arms: a, headTilt: -0.3 },
      anchor: variant === 'pullThrough' ? v(-1.1, 0.2, 0) : undefined,
    };
  },
});

const legCurl: Pattern = {
  id: 'legCurl', style: 'pull', tempo: [1, 0.4, 2, 0.4],
  pose(s) {
    const pelvis = v(0, 0.58, 0);
    const up = FWD;
    const th = 0.15 + s * 1.75;
    const knee = (k: number) => v(-BODY.thigh, 0.56, 0.1 * k);
    const foot = (k: number) => add(knee(k), v(-Math.cos(th) * BODY.shin, Math.sin(th) * BODY.shin, 0));
    return {
      spec: {
        pelvis, up, front: DOWN,
        legs: { L: { at: foot(1), pole: DOWN, toe: v(-0.2, -1, 0) }, R: { at: foot(-1), pole: DOWN, toe: v(-0.2, -1, 0) } },
        arms: arms(pelvis, up, (sh, k) => v(0.75, 0.5, 0.2 * k), (k) => v(0, -1, k), DOWN),
        headTilt: 0.8,
      },
      props: [{ kind: 'bench', center: v(0.05, 0.25, 0), size: v(1.1, 0.5, 0.4) }],
    };
  },
};

const legExtension: Pattern = {
  id: 'legExtension', style: 'push', tempo: [1, 0.5, 2, 0.4],
  pose(s) {
    const pelvis = v(-0.2, 0.55, 0);
    const up = sag(-0.12);
    const th = 0.15 + 1.35 * s; // angle depuis la verticale
    const foot = (k: number) => v(-0.2 + BODY.thigh + Math.sin(th) * BODY.shin, 0.55 - Math.cos(th) * BODY.shin, 0.1 * k);
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: foot(1), pole: v(1, 1, 0) }, R: { at: foot(-1), pole: v(1, 1, 0) } },
        arms: arms(pelvis, up, (sh, k) => v(-0.15, 0.52, 0.28 * k), (k) => v(-0.3, 0, k)),
      },
      props: [{ kind: 'bench', center: v(-0.2, 0.26, 0), size: v(0.6, 0.5, 0.4) }],
    };
  },
};

// ---------- poussées ----------

const press = (implement: 'dumbbells' | 'barbell'): Pattern => ({
  id: `ohp-${implement}`, style: 'push', tempo: [1, 0.4, 2, 0.6],
  pose(s) {
    const { pelvis, up } = standing(0.94, 0.02);
    const w = implement === 'barbell' ? 0.06 : 0.1;
    return {
      spec: {
        pelvis, up, legs: planted(0.12),
        arms: arms(pelvis, up, (sh, k) => lerp(add(sh, v(0.06, 0.07, w * k)), add(sh, v(0, 0.555, -0.05 * k)), s), (k) => v(0.15, -0.6, k)),
      },
    };
  },
});

/** Développé couché ou incliné, allongé sur un banc. s : 0 bras tendus, 1 charge sur la poitrine. */
const benchPress = (incline = 0, grip: 'press' | 'skull' = 'press'): Pattern => ({
  id: `bench-${incline}-${grip}`, style: 'lower', tempo: [2, 0.3, 1, 0.5],
  pose(s) {
    const pelvis = v(0.0, 0.53, 0);
    const up = norm(v(-Math.cos(incline), Math.sin(incline), 0));
    const f = v(up[1], -up[0], 0);
    const a = grip === 'press'
      ? arms(pelvis, up, (sh, k) => lerp(comb(sh, [f, 0.56], [v(0, 0, 1), -0.03 * k]), comb(sh, [f, 0.1], [up, -0.05], [v(0, 0, 1), 0.09 * k]), s), (k) => v(0, -0.3, k))
      : arms(pelvis, up, (sh, k) => lerp(comb(sh, [f, 0.56], [up, 0.06], [v(0, 0, 1), -0.07 * k]), comb(sh, [f, 0.3], [up, 0.3], [v(0, 0, 1), -0.07 * k]), s), () => add(f, mul2(up, -0.6)));
    return {
      spec: { pelvis, up, legs: { L: { at: v(0.42, A, 0.28), pole: UPV }, R: { at: v(0.42, A, -0.28), pole: UPV } }, arms: a },
      props: [{ kind: 'bench', center: v(-0.25, 0.22, 0), size: v(1.1, 0.44, 0.32), tilt: incline }],
    };
  },
});
const mul2 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];

/** Pompes. s : 0 bras tendus, 1 poitrine près du sol. */
const pushUp = (knees = false, explosive = false): Pattern => ({
  id: `pushup-${knees ? 'knees' : 'toes'}`, style: 'lower', tempo: explosive ? [1, 0.1, 0.4, 0.6] : [2, 0.3, 1, 0.5],
  pose(s) {
    const shY = 0.6 - 0.38 * s;
    const chest = v(0.03, shY, 0);
    let pelvis: V3;
    let foot: V3;
    let toe: V3;
    if (knees) {
      // genoux au sol : la ligne genou → épaules fait 0,97 m (cuisse + buste)
      const K = v(-0.55, 0.06, 0);
      const dy = (shY - K[1]) / (BODY.thigh + BODY.torso);
      const dir = v(Math.sqrt(1 - dy * dy), dy, 0);
      pelvis = comb(K, [dir, BODY.thigh]);
      chest[0] = pelvis[0] + dir[0] * BODY.torso;
      foot = add(K, v(-0.38, 0.22, 0));
      toe = v(-1, 0.2, 0);
    } else {
      // sur les pointes : chevilles à 16 cm du sol, corps gainé
      const reach = BODY.thigh + BODY.shin - 0.01 + BODY.torso;
      const dy = (shY - 0.16) / reach;
      const dir = v(Math.sqrt(1 - dy * dy), dy, 0);
      pelvis = comb(chest, [dir, -BODY.torso]);
      foot = comb(chest, [dir, -reach]);
      toe = v(0.6, -0.8, 0);
    }
    const up = norm(sub(chest, pelvis));
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: add(foot, v(0, 0, 0.1)), pole: DOWN, toe }, R: { at: add(foot, v(0, 0, -0.1)), pole: DOWN, toe } },
        arms: arms(pelvis, up, (sh, k) => v(sh[0] + 0.02, 0.03, 0.27 * k), (k) => v(-0.6, 0.3, 0.8 * k)),
        headTilt: 0.2,
      },
    };
  },
});

const benchDip: Pattern = {
  id: 'benchDip', style: 'lower', tempo: [2, 0.3, 1, 0.5],
  pose(s) {
    const shY = 0.98 - 0.25 * s;
    const pelvis = v(0.12, shY - 0.5, 0);
    const up = norm(v(-0.12, 1, 0));
    return {
      spec: {
        pelvis, up, legs: planted(0.12, 0.62, UPV),
        arms: arms(pelvis, up, (sh, k) => v(-0.1, 0.45, 0.2 * k), () => BACK),
      },
      props: [{ kind: 'bench', center: v(-0.2, 0.22, 0), size: v(0.4, 0.44, 0.7) }],
    };
  },
};

const dip: Pattern = {
  id: 'dip', style: 'lower', tempo: [2, 0.3, 1, 0.5],
  pose(s) {
    const shY = 1.68 - 0.25 * s;
    const pelvis = v(-0.04 - 0.05 * s, shY - 0.52, 0);
    const up = norm(v(0.1 + 0.25 * s, 1, 0));
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: add(pelvis, v(-0.35, -0.68, 0.08)), pole: FWD }, R: { at: add(pelvis, v(-0.35, -0.68, -0.08)), pole: FWD } },
        arms: arms(pelvis, up, (sh, k) => v(0.02, 1.18, 0.26 * k), () => BACK),
      },
      props: [{ kind: 'bar', at: v(0.02, 1.16, 0.26), width: 0.4 }, { kind: 'bar', at: v(0.02, 1.16, -0.26), width: 0.4 }],
    };
  },
};

// ---------- tirages ----------

const bentRow = (oneArm: boolean, chestSupported = false): Pattern => ({
  id: `row-${oneArm ? 'one' : 'two'}${chestSupported ? '-sup' : ''}`, style: 'pull', tempo: [1, 0.5, 2, 0.4],
  pose(s) {
    const lean = chestSupported ? 1.0 : 1.15;
    const { pelvis, up } = standing(chestSupported ? 0.86 : 0.83, lean, -0.12);
    const row = (sh: V3, k: 1 | -1) => lerp(add(sh, v(0.02, -0.55, 0.02 * k)), add(sh, v(-0.22, -0.2, 0.04 * k)), s);
    const support = (sh: V3, k: 1 | -1) => v(0.45, 0.62, 0.22 * k);
    return {
      spec: {
        pelvis, up, legs: oneArm ? { L: { at: v(0.25, A, 0.18), pole: FWD }, R: { at: v(-0.2, A, -0.18), pole: FWD } } : planted(0.14, 0, v(1, 0, 0.2)),
        arms: arms(pelvis, up, (sh, k, side) => (oneArm && side === 'L' ? support(sh, k) : row(sh, k)), (k) => v(-0.6, 1, 0.3 * k)),
        headTilt: -0.3,
      },
      props: oneArm ? [{ kind: 'bench', center: v(0.5, 0.3, 0.2), size: v(0.5, 0.6, 0.35) }]
        : chestSupported ? [{ kind: 'bench', center: v(0.2, 0.55, 0), size: v(0.9, 0.12, 0.3), tilt: -0.75 }] : undefined,
    };
  },
});

const seatedRow: Pattern = {
  id: 'seatedRow', style: 'pull', tempo: [1, 0.5, 2, 0.4],
  pose(s) {
    const pelvis = v(-0.3, 0.12, 0);
    const up = sag(-0.05 - 0.1 * s + 0.25 * (1 - s));
    const f = v(up[1], -up[0], 0);
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: v(0.45, 0.2, 0.12), pole: UPV, toe: v(0.3, 1, 0) }, R: { at: v(0.45, 0.2, -0.12), pole: UPV, toe: v(0.3, 1, 0) } },
        arms: arms(pelvis, up, (sh, k) => lerp(comb(sh, [f, 0.56], [v(0, 0, 1), -0.12 * k]), comb(sh, [f, 0.2], [up, -0.25], [v(0, 0, 1), -0.08 * k]), s), (k) => v(-0.5, 0, k)),
      },
      anchor: v(0.75, 0.35, 0),
      props: [{ kind: 'post', at: v(0.75, 0.35, 0) }],
    };
  },
};

const pulldown: Pattern = {
  id: 'pulldown', style: 'pull', tempo: [1, 0.5, 2, 0.4],
  pose(s) {
    const pelvis = v(-0.05, 0.52, 0);
    const up = sag(-0.12);
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: v(0.42, A, 0.15), pole: UPV }, R: { at: v(0.42, A, -0.15), pole: UPV } },
        arms: arms(pelvis, up, (sh, k) => lerp(add(sh, v(0.06, 0.53, 0.18 * k)), add(sh, v(0.14, 0.02, 0.24 * k)), s), (k) => v(0, -0.6, k)),
        headTilt: -0.15,
      },
      anchor: v(0.05, 2.25, 0),
      props: [{ kind: 'bench', center: v(-0.05, 0.25, 0), size: v(0.4, 0.5, 0.4) }, { kind: 'post', at: v(0.05, 2.25, 0) }],
    };
  },
};

const pullUp: Pattern = {
  id: 'pullUp', style: 'pull', tempo: [1.2, 0.4, 2, 0.6],
  pose(s) {
    const barY = 2.15;
    const shY = barY - 0.56 + 0.36 * s;
    const pelvis = v(-0.02, shY - 0.52, 0);
    const up = sag(-0.05);
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: add(pelvis, v(-0.2, -0.82, 0.07)), pole: FWD }, R: { at: add(pelvis, v(-0.2, -0.82, -0.07)), pole: FWD } },
        arms: arms(pelvis, up, (sh, k) => v(0.04, barY, 0.32 * k), (k) => v(0, -0.5, k)),
        headTilt: -0.2,
      },
      props: [{ kind: 'bar', at: v(0.04, barY, 0), width: 1.1 }],
    };
  },
};

// ---------- bras et épaules ----------

const lateralRaise = (bent = false): Pattern => ({
  id: bent ? 'rearDelt' : 'lateralRaise', style: 'raise', tempo: [1, 0.4, 2, 0.4],
  pose(s) {
    const { pelvis, up } = bent ? standing(0.86, 1.05, -0.1) : standing(0.94, 0.03);
    const f = v(up[1], -up[0], 0);
    return {
      spec: {
        pelvis, up, legs: planted(0.12, 0, v(1, 0, 0.15)),
        arms: arms(pelvis, up, (sh, k) => lerp(comb(sh, [up, -0.54], [f, 0.06], [v(0, 0, 1), 0.06 * k]), comb(sh, [up, -0.04], [f, 0.06], [v(0, 0, 1), 0.54 * k]), s), (k) => v(0.2, -0.6, 0.2 * k)),
        headTilt: bent ? -0.3 : 0,
      },
    };
  },
});

const facePull: Pattern = {
  id: 'facePull', style: 'pull', tempo: [1, 0.5, 2, 0.4],
  pose(s) {
    const { pelvis, up } = standing(0.94, -0.05);
    return {
      spec: {
        pelvis, up, legs: { L: { at: v(0.15, A, 0.14), pole: FWD }, R: { at: v(-0.15, A, -0.14), pole: FWD } },
        arms: arms(pelvis, up, (sh, k) => lerp(add(sh, v(0.55, 0.06, -0.12 * k)), add(sh, v(0.1, 0.2, 0.05 * k)), s), (k) => v(-0.3, 0.6, k)),
      },
      anchor: v(1.15, 1.6, 0),
      props: [{ kind: 'post', at: v(1.15, 1.6, 0) }],
    };
  },
};

const curl: Pattern = {
  id: 'curl', style: 'pull', tempo: [1, 0.4, 2, 0.4],
  pose(s) {
    const { pelvis, up } = standing(0.94, 0.02);
    return {
      spec: {
        pelvis, up, legs: planted(0.12),
        arms: arms(pelvis, up, (sh, k) => {
          const elbow = add(sh, v(-0.02, -BODY.upperArm, 0.02 * k));
          const a = 0.15 + 2.2 * s;
          return add(elbow, v(Math.sin(a) * BODY.forearm, -Math.cos(a) * BODY.forearm, 0));
        }, () => BACK),
      },
    };
  },
};

const pushdown: Pattern = {
  id: 'pushdown', style: 'push', tempo: [1, 0.4, 2, 0.4],
  pose(s) {
    const { pelvis, up } = standing(0.93, 0.12);
    return {
      spec: {
        pelvis, up, legs: planted(0.13, 0, v(1, 0, 0.15)),
        arms: arms(pelvis, up, (sh, k) => {
          const elbow = add(sh, v(0.0, -BODY.upperArm, 0.03 * k));
          const a = 2.2 - 2.0 * s;
          return add(elbow, v(Math.sin(a) * BODY.forearm, -Math.cos(a) * BODY.forearm, -0.02 * k));
        }, () => BACK),
      },
      anchor: v(0.4, 2.1, 0),
      props: [{ kind: 'post', at: v(0.4, 2.1, 0) }],
    };
  },
};

// ---------- gainage et sol ----------

const plank = (sidePlank = false): Pattern => ({
  id: sidePlank ? 'sidePlank' : 'plank', style: 'hold', tempo: [3, 0, 3, 0],
  pose(s) {
    const breath = 0.008 * Math.sin(s * Math.PI);
    if (sidePlank) {
      // appui sur l'avant-bras droit, corps aligné, côté droit vers le sol
      const chest = v(0.05, 0.43 + breath, 0);
      const pelvis = v(-0.47, 0.3 + breath, 0);
      const up = norm(sub(chest, pelvis));
      const front = v(0, 0, 1);
      return {
        spec: {
          pelvis, up, front,
          legs: { L: { at: v(-1.32, 0.15, 0.02), pole: v(0.2, 0, 1) }, R: { at: v(-1.3, 0.07, -0.08), pole: v(0.2, 0, 1) } },
          arms: { L: { at: add(pelvis, v(0.05, 0.05, 0.12)), pole: v(0, 1, 0) }, R: { at: v(0.3, 0.03, -0.15), pole: v(-1, 0, 0) } },
        },
      };
    }
    const chest = v(0.02, 0.34 + breath, 0);
    const reach = BODY.thigh + BODY.shin - 0.01 + BODY.torso;
    const dy = (chest[1] - 0.16) / reach;
    const dir = v(Math.sqrt(1 - dy * dy), dy, 0);
    const pelvis = comb(chest, [dir, -BODY.torso]);
    const up = dir;
    const foot = comb(chest, [dir, -reach]);
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: add(foot, v(0, 0, 0.09)), pole: DOWN, toe: v(0.6, -0.8, 0) }, R: { at: add(foot, v(0, 0, -0.09)), pole: DOWN, toe: v(0.6, -0.8, 0) } },
        arms: arms(pelvis, up, (sh, k) => v(sh[0] + 0.25, 0.04, 0.12 * k), () => DOWN),
        headTilt: 0.3,
      },
    };
  },
});

/** Dos au sol : dead bug, crunch, relevé de jambes, respiration. */
const supine = (variant: 'deadBug' | 'crunch' | 'legRaise' | 'breath'): Pattern => ({
  id: `supine-${variant}`, style: variant === 'breath' ? 'hold' : variant === 'crunch' ? 'pull' : 'lower',
  tempo: variant === 'breath' ? [4, 0, 4, 0] : [1.5, 0.3, 1.5, 0.3], alternate: variant === 'deadBug',
  pose(s, side) {
    const pelvis = v(0, 0.1, 0);
    const curlA = variant === 'crunch' ? 0.55 * s : 0;
    const up = norm(v(-Math.cos(curlA), Math.sin(curlA) + (variant === 'breath' ? 0.01 * s : 0), 0));
    const f = v(up[1], -up[0], 0);
    let legs: PoseSpec['legs'];
    let a: PoseSpec['arms'];
    if (variant === 'deadBug') {
      const table = (k: 1 | -1): LimbTarget => ({ at: v(0.42, 0.55, 0.1 * k), pole: v(1, 1, 0) });
      const ext = (k: 1 | -1): LimbTarget => ({ at: lerp(v(0.42, 0.55, 0.1 * k), v(0.86, 0.15, 0.1 * k), s), pole: v(1, 1, 0) });
      legs = side === 1 ? { L: table(1), R: ext(-1) } : { L: ext(1), R: table(-1) };
      const armUp = (sh: V3) => comb(sh, [f, 0.56]);
      const armBack = (sh: V3) => lerp(comb(sh, [f, 0.56]), comb(sh, [up, 0.5], [f, 0.12]), s);
      a = arms(pelvis, up, (sh, k) => ((k === 1) === (side === 1) ? armBack(sh) : armUp(sh)), () => DOWN);
    } else if (variant === 'legRaise') {
      const th = 0.12 + 1.3 * s;
      const at = (k: number) => v(Math.cos(th) * 0.87, 0.1 + Math.sin(th) * 0.87, 0.09 * k);
      legs = { L: { at: at(1), pole: FWD, toe: v(-Math.sin(th), Math.cos(th), 0) }, R: { at: at(-1), pole: FWD, toe: v(-Math.sin(th), Math.cos(th), 0) } };
      a = arms(pelvis, up, (sh, k) => v(-0.1, 0.03, 0.3 * k), () => UPV);
    } else {
      legs = { L: { at: v(0.32, A, 0.15), pole: UPV }, R: { at: v(0.32, A, -0.15), pole: UPV } };
      a = variant === 'crunch'
        ? arms(pelvis, up, (sh, k) => comb(sh, [up, 0.2], [f, 0.12], [v(0, 0, 1), -0.08 * k]), (k) => v(0, 0.2, k))
        : arms(pelvis, up, (sh, k) => v(0.05, 0.25 + 0.015 * s, 0.07 * k), (k) => v(0, 0, k));
    }
    return { spec: { pelvis, up, legs, arms: a, headTilt: variant === 'crunch' ? 0.4 : 0 } };
  },
});

/** À quatre pattes : bird-dog, chat-vache, rotation du haut du dos. */
const quadruped = (variant: 'birdDog' | 'catCow' | 'rotation'): Pattern => ({
  id: `quad-${variant}`, style: variant === 'birdDog' ? 'raise' : 'hold',
  tempo: variant === 'birdDog' ? [1.5, 1, 1.5, 0.4] : [2.5, 0.3, 2.5, 0.3], alternate: variant !== 'catCow',
  pose(s, side) {
    const arch = variant === 'catCow' ? (s - 0.5) * 0.25 : 0;
    const pelvis = v(-0.25, 0.52 - (variant === 'catCow' ? arch * 0.15 : 0), 0);
    const up = norm(v(1, arch, 0));
    const knee = (k: number) => ({ at: v(-0.7, 0.06, 0.1 * k), pole: DOWN, toe: v(-1, 0.1, 0) });
    const legExt = (k: number) => ({ at: lerp(v(-0.7, 0.06, 0.1 * k), v(-1.13, 0.5, 0.1 * k), s), pole: DOWN, toe: v(-1, -0.3, 0) });
    const floorHand = (sh: V3, k: number) => v(sh[0] + 0.02, 0.03, 0.2 * k);
    let legs: PoseSpec['legs'] = { L: knee(1), R: knee(-1) };
    let a: PoseSpec['arms'];
    if (variant === 'birdDog') {
      legs = side === 1 ? { L: knee(1), R: legExt(-1) } : { L: legExt(1), R: knee(-1) };
      a = arms(pelvis, up, (sh, k) => ((k === 1) === (side === 1) ? lerp(floorHand(sh, k), add(sh, v(0.55, 0.05, 0)), s) : floorHand(sh, k)), () => BACK, DOWN);
    } else if (variant === 'rotation') {
      a = arms(pelvis, up, (sh, k) => ((k === 1) === (side === 1) ? lerp(v(sh[0], 0.15, 0), add(sh, v(0, 0.5, 0.18 * k)), s) : floorHand(sh, k)), () => BACK, DOWN);
    } else {
      a = arms(pelvis, up, (sh, k) => floorHand(sh, k), () => BACK, DOWN);
    }
    return { spec: { pelvis, up, front: norm(v(-arch, -1, 0)), legs, arms: a, headTilt: variant === 'catCow' ? 0.4 - 1.2 * s : 0.5 } };
  },
});

const superman: Pattern = {
  id: 'superman', style: 'raise', tempo: [1, 1, 1.5, 0.4],
  pose(s) {
    const lift = 0.12 * s;
    const pelvis = v(-0.2, 0.11, 0);
    const up = norm(v(1, lift * 1.2, 0));
    return {
      spec: {
        pelvis, up, front: norm(v(lift, -1, 0)),
        legs: { L: { at: v(-1.06, 0.07 + lift, 0.1), pole: DOWN, toe: v(-1, 0, 0) }, R: { at: v(-1.06, 0.07 + lift, -0.1), pole: DOWN, toe: v(-1, 0, 0) } },
        arms: arms(pelvis, up, (sh, k) => add(sh, v(0.55, 0.04 + lift, 0.05 * k)), () => UPV, norm(v(lift, -1, 0))),
        headTilt: 0.5,
      },
    };
  },
};

const hangingLegRaise: Pattern = {
  id: 'hangingLegRaise', style: 'pull', tempo: [1.2, 0.4, 2, 0.4],
  pose(s) {
    const barY = 2.15;
    const pelvis = v(-0.02, barY - 0.56 - 0.52, 0);
    const up = sag(-0.05);
    const th = 0.1 + 1.3 * s;
    const at = (k: number) => add(pelvis, v(Math.sin(th) * 0.6, -0.4 - 0.4 * Math.cos(th), 0.08 * k));
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: at(1), pole: FWD }, R: { at: at(-1), pole: FWD } },
        arms: arms(pelvis, up, (sh, k) => v(0.02, barY, 0.3 * k), (k) => v(0, -0.5, k)),
      },
      props: [{ kind: 'bar', at: v(0.02, barY, 0), width: 1.1 }],
    };
  },
};

// ---------- lancers ----------

const medBall = (variant: 'slam' | 'chest'): Pattern => ({
  id: `medball-${variant}`, style: 'jump', tempo: [1.8, 0, 0, 0],
  pose(t) {
    if (variant === 'chest') {
      const push = t < 0.35 ? 0 : t < 0.5 ? smooth((t - 0.35) / 0.15) : t < 0.8 ? 1 - smooth((t - 0.5) / 0.3) * 0.0 : 1 - smooth((t - 0.8) / 0.2);
      const dip = t < 0.35 ? smooth(t / 0.35) * 0.1 : 0.1 * (1 - smooth((t - 0.35) / 0.1));
      const { pelvis, up } = standing(0.94 - dip, 0.05 + dip);
      const ballOut = t >= 0.5 && t < 0.85;
      const ballX = ballOut ? 0.6 + 0.5 * Math.sin(((t - 0.5) / 0.35) * Math.PI) : 0;
      const a = arms(pelvis, up, (sh, k) => lerp(add(sh, v(0.22, -0.12, -0.08 * k)), add(sh, v(0.56, 0.0, -0.08 * k)), push), (k) => v(0, -1, k));
      return { spec: { pelvis, up, legs: { L: { at: v(0.12, A, 0.14), pole: FWD }, R: { at: v(-0.12, A, -0.14), pole: FWD } }, arms: a }, ball: ballOut ? v(ballX, 1.42, 0) : undefined, props: [{ kind: 'wall', x: 1.6 }] };
    }
    // lancer vers le haut depuis le squat
    const depth = t < 0.35 ? smooth(t / 0.35) * 0.45 : t < 0.5 ? (1 - smooth((t - 0.35) / 0.15)) * 0.45 : 0;
    const reach = t < 0.35 ? 0 : t < 0.55 ? smooth((t - 0.35) / 0.2) : t < 0.8 ? 1 : 1 - smooth((t - 0.8) / 0.2);
    const { pelvis, up } = standing(0.95 - 0.42 * depth, 0.1 + 0.6 * depth, -0.15 * depth);
    const a = arms(pelvis, up, (sh, k) => lerp(comb(sh, [v(up[1], -up[0], 0), 0.45], [up, -0.25], [v(0, 0, 1), -0.08 * k]), add(sh, v(0.1, 0.55, -0.08 * k)), reach), (k) => v(0, -1, k));
    const flying = t >= 0.55 && t < 0.85;
    return {
      spec: { pelvis, up, legs: planted(0.15, 0, v(1, 0, 0.3)), arms: a },
      ball: flying ? v(0.25, 2.1 + 0.9 * Math.sin(((t - 0.55) / 0.3) * Math.PI), 0) : undefined,
    };
  },
});

// ---------- cardio ----------

const gait = (speed: 'walk' | 'run' | 'skip'): Pattern => ({
  id: speed, style: 'cycle', tempo: [speed === 'walk' ? 1.1 : speed === 'run' ? 0.7 : 0.5, 0, 0, 0],
  pose(t) {
    const ph = t * Math.PI * 2;
    const run = speed !== 'walk';
    const bob = run ? Math.abs(Math.sin(ph)) * 0.05 : Math.abs(Math.sin(ph)) * 0.02;
    const { pelvis, up } = standing(0.92 + bob, speed === 'run' ? 0.15 : 0.04);
    const step = (k: number) => {
      const p = ph + (k === 1 ? 0 : Math.PI);
      if (speed === 'skip') {
        const lift = Math.max(0, Math.sin(p));
        return { at: v(0.05 + 0.25 * lift, A + 0.45 * lift + bob, 0.11 * k), pole: FWD, toe: v(1, -0.4, 0) };
      }
      const stride = run ? 0.38 : 0.3;
      const lift = Math.max(0, Math.sin(p)) * (run ? 0.3 : 0.12);
      return { at: v(Math.cos(p) * stride, A + lift + bob * 0.5, 0.1 * k), pole: FWD };
    };
    const swing = (k: number) => Math.cos(ph + (k === 1 ? Math.PI : 0)) * (run ? 0.6 : 0.35);
    return {
      spec: {
        pelvis, up, legs: { L: step(1), R: step(-1) },
        arms: arms(pelvis, up, (sh, k) => {
          const a = swing(k);
          if (!run) return add(sh, v(Math.sin(a) * 0.55, -Math.cos(a) * 0.55, 0.04 * k));
          const elbow = add(sh, v(Math.sin(a) * 0.3, -Math.cos(a) * 0.3, 0));
          return add(elbow, v(Math.cos(a) * 0.25, Math.sin(a) * 0.25 - 0.02, 0));
        }, () => BACK),
      },
    };
  },
});

const jumpRope: Pattern = {
  id: 'jumpRope', style: 'cycle', tempo: [0.45, 0, 0, 0],
  pose(t) {
    const air = Math.max(0, Math.sin(t * Math.PI * 2)) * 0.05;
    const { pelvis, up } = standing(0.94 + air, 0.04);
    const legs = planted(0.09, 0);
    legs.L = { ...legs.L, at: add(legs.L.at, v(0, air + 0.02, 0)), toe: v(1, -0.6, 0) };
    legs.R = { ...legs.R, at: add(legs.R.at, v(0, air + 0.02, 0)), toe: v(1, -0.6, 0) };
    const c = t * Math.PI * 2;
    return { spec: { pelvis, up, legs, arms: arms(pelvis, up, (sh, k) => add(sh, v(0.12 + 0.04 * Math.cos(c), -0.42 + 0.04 * Math.sin(c), 0.12 * k)), () => BACK) } };
  },
};

const bike: Pattern = {
  id: 'bike', style: 'cycle', tempo: [1, 0, 0, 0],
  pose(t) {
    const pelvis = v(-0.25, 0.88, 0);
    const up = sag(0.55);
    const crank = v(0.12, 0.35, 0);
    const foot = (k: number) => {
      const a = t * Math.PI * 2 + (k === 1 ? 0 : Math.PI);
      return { at: add(crank, v(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.12 * k)), pole: FWD };
    };
    return {
      spec: { pelvis, up, legs: { L: foot(1), R: foot(-1) }, arms: arms(pelvis, up, (sh, k) => v(0.5, 1.1, 0.22 * k), (k) => v(0, -1, k)) },
      props: [{ kind: 'bike' }],
    };
  },
};

// ---------- étirements et récupération ----------

const childPose: Pattern = {
  id: 'childPose', style: 'hold', tempo: [4, 0, 4, 0],
  pose(s) {
    const pelvis = v(-0.42, 0.3 - 0.02 * s, 0);
    const up = norm(v(0.85, -0.35, 0));
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: v(-0.46, 0.08, 0.12), pole: v(1, -0.3, 0), toe: v(-1, 0, 0) }, R: { at: v(-0.46, 0.08, -0.12), pole: v(1, -0.3, 0), toe: v(-1, 0, 0) } },
        arms: arms(pelvis, up, (sh, k) => v(sh[0] + 0.5, 0.03, 0.2 * k), () => UPV),
      },
    };
  },
};

const halfKneel = (variant: 'hipFlexor' | 'pigeon'): Pattern => ({
  id: variant, style: 'hold', tempo: [4, 0, 4, 0], alternate: true,
  pose(s, side) {
    if (variant === 'pigeon') {
      const pelvis = v(0, 0.32, 0);
      const up = sag(0.15 + 0.15 * s);
      const front: LimbTarget = { at: v(0.14, 0.07, -0.3 * side), pole: v(1, 0.1, 0.8 * side) };
      const back: LimbTarget & { toe?: V3 } = { at: v(-0.84, 0.07, 0.08 * side), pole: UPV, toe: v(-1, 0, 0) };
      return {
        spec: {
          pelvis, up, legs: side === 1 ? { L: front, R: back } : { L: back, R: front },
          arms: arms(pelvis, up, (sh, k) => add(sh, v(0.15, -0.53, 0.05 * k)), () => BACK),
        },
      };
    }
    const pelvis = v(0.05 + 0.04 * s, 0.56 - 0.03 * s, 0);
    const up = sag(-0.05);
    const front: LimbTarget = { at: v(0.42, A, 0.12 * side), pole: FWD };
    const back: LimbTarget & { toe?: V3 } = { at: v(-0.62, 0.07, -0.12 * side), pole: DOWN, toe: v(-1, 0, 0) };
    return {
      spec: {
        pelvis, up, legs: side === 1 ? { L: front, R: back } : { L: back, R: front },
        arms: arms(pelvis, up, (sh, k) => v(0.32, 0.6, 0.15 * k), () => BACK),
      },
    };
  },
});

const pecStretch: Pattern = {
  id: 'pecStretch', style: 'hold', tempo: [4, 0, 4, 0], alternate: true,
  pose(s, side) {
    const { pelvis, up } = standing(0.94, 0.02, 0.05 * s);
    return {
      spec: {
        pelvis, up, legs: { L: { at: v(0.12, A, 0.12), pole: FWD }, R: { at: v(-0.08, A, -0.12), pole: FWD } },
        arms: arms(pelvis, up, (sh, k) => (k === side ? add(sh, v(-0.3, 0.05, 0.45 * k)) : add(sh, v(0.03, -0.54, 0.03 * k))), (k) => v(0, -1, 0.3 * k)),
      },
      props: [{ kind: 'wall', x: 0, side }],
    };
  },
};

const foamRoll: Pattern = {
  id: 'foamRoll', style: 'cycle', tempo: [3, 0, 0, 0],
  pose(t) {
    const shift = Math.sin(t * Math.PI * 2) * 0.12;
    const roller = v(-0.45 + shift, 0.08, 0);
    const pelvis = v(0.0 + shift, 0.26, 0);
    const up = norm(sub(add(roller, v(0, 0.13, 0)), pelvis));
    return {
      spec: {
        pelvis, up,
        legs: { L: { at: v(0.42, A, 0.16), pole: UPV }, R: { at: v(0.42, A, -0.16), pole: UPV } },
        arms: arms(pelvis, up, (sh, k) => comb(sh, [up, 0.12], [v(0, 1, 0), 0.08], [v(0, 0, 1), -0.12 * k]), (k) => v(0.5, 0.5, k)),
      },
      props: [{ kind: 'roller', at: roller }],
    };
  },
};

export const PATTERNS = {
  squat: squat('goblet'),
  airSquat: squat('free'),
  lunge: lunge(false),
  splitSquat: lunge(true),
  jumpSquat,
  broadJump,
  boxJump,
  calfRaise: calfRaise(false),
  seatedCalf: calfRaise(true),
  hopCalf,
  bridge: bridge(false),
  hipThrust: bridge(true),
  pullThrough: hinge('pullThrough'),
  backExtension: hinge('back'),
  hamstringStretch: hinge('stretch'),
  legCurl,
  legExtension,
  pressDumbbells: press('dumbbells'),
  pressBarbell: press('barbell'),
  benchPress: benchPress(0),
  inclinePress: benchPress(0.5),
  skullCrusher: benchPress(0, 'skull'),
  pushUp: pushUp(false),
  pushUpKnees: pushUp(true),
  pushUpExplosive: pushUp(false, true),
  benchDip,
  dip,
  rowTwoArms: bentRow(false),
  rowOneArm: bentRow(true),
  rowSupported: bentRow(false, true),
  seatedRow,
  pulldown,
  pullUp,
  lateralRaise: lateralRaise(false),
  rearDelt: lateralRaise(true),
  facePull,
  curl,
  pushdown,
  plank: plank(false),
  sidePlank: plank(true),
  deadBug: supine('deadBug'),
  crunch: supine('crunch'),
  legRaise: supine('legRaise'),
  breathing: supine('breath'),
  birdDog: quadruped('birdDog'),
  catCow: quadruped('catCow'),
  thoracicRotation: quadruped('rotation'),
  superman,
  hangingLegRaise,
  medBallSlam: medBall('slam'),
  medBallChest: medBall('chest'),
  walk: gait('walk'),
  run: gait('run'),
  highKnees: gait('skip'),
  jumpRope,
  bike,
  childPose,
  hipFlexorStretch: halfKneel('hipFlexor'),
  pigeon: halfKneel('pigeon'),
  pecStretch,
  foamRoll,
} satisfies Record<string, Pattern>;

export type PatternId = keyof typeof PATTERNS;
