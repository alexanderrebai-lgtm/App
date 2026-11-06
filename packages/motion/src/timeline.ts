import { PATTERNS, type Pattern, type Style } from './patterns';
import { movementFor } from './mapping';
import { solve, type Solved } from './skeleton';
import { smooth } from './vec';

export interface Sample {
  /** Pose résolue (articulations en mètres). */
  pose: Solved;
  frame: ReturnType<Pattern['pose']>;
  /** 0 aller, 1 pause, 2 retour, 3 pause. */
  phase: 0 | 1 | 2 | 3;
  rep: number;
  side: 1 | -1;
}

/** Libellés de phase par style de geste. */
export const PHASE_LABELS: Record<Style, [string, string, string, string]> = {
  lower: ['Descends', 'Pause en bas', 'Remonte', 'Respire'],
  push: ['Pousse', 'Contrôle', 'Reviens lentement', 'Respire'],
  pull: ['Tire', 'Serre', 'Relâche lentement', 'Respire'],
  raise: ['Monte', 'Tiens', 'Redescends lentement', 'Respire'],
  hold: ['Tiens la position', 'Respire', 'Tiens la position', 'Respire'],
  cycle: ['À ton rythme', 'À ton rythme', 'À ton rythme', 'À ton rythme'],
  jump: ['Prends ton élan', 'Saute', 'Réception souple', 'Replace-toi'],
};

export function cycleLength(p: Pattern, speed = 1): number {
  const total = p.style === 'cycle' || p.style === 'jump' ? p.tempo[0] : p.tempo.reduce((a, b) => a + b, 0);
  return total / speed;
}

/** Pose du mannequin pour un exercice à l'instant `time` (secondes depuis le début). */
export function sampleExercise(exerciseId: string, time: number, slow = 1): Sample {
  const m = movementFor(exerciseId);
  const p = PATTERNS[m.pattern];
  const speed = (m.speed ?? 1) * slow;
  const total = cycleLength(p, speed);
  const rep = Math.floor(time / total);
  const side: 1 | -1 = p.alternate && rep % 2 ? -1 : 1;
  const x = (time - rep * total) / total;
  if (p.style === 'cycle' || p.style === 'jump') {
    const frame = p.pose(x, side);
    const phase = (p.style === 'jump' ? Math.min(3, Math.floor(x * 4)) : 0) as Sample['phase'];
    return { pose: solve(frame.spec), frame, phase, rep, side };
  }
  const seg = p.tempo.map((d) => d / p.tempo.reduce((a, b) => a + b, 0));
  let r = x;
  let phase = 0;
  while (phase < 3 && r > seg[phase]!) { r -= seg[phase]!; phase++; }
  const k = seg[phase]! ? Math.min(1, r / seg[phase]!) : 1;
  const s = phase === 0 ? smooth(k) : phase === 1 ? 1 : phase === 2 ? 1 - smooth(k) : 0;
  const frame = p.pose(s, side);
  return { pose: solve(frame.spec), frame, phase: phase as Sample['phase'], rep, side };
}

/** Parties du mannequin à colorer selon les muscles travaillés. */
export function highlightedParts(muscles: string[]): Set<string> {
  const MAP: Record<string, string[]> = {
    chest: ['chest'], back: ['torso'], shoulders: ['shL', 'shR'], biceps: ['upperL', 'upperR'], triceps: ['upperL', 'upperR'],
    quads: ['thighL', 'thighR'], hamstrings: ['thighL', 'thighR'], glutes: ['pelvis'], calves: ['shinL', 'shinR'],
    core: ['torso'], lowerBack: ['torso'],
  };
  return new Set(muscles.flatMap((m) => MAP[m] ?? []));
}
