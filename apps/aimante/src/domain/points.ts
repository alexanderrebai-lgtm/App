import type { Effort, TaskKind } from "./types";

/** Paliers de croissance de la plante, en gouttes. */
export const STAGE_THRESHOLDS = [0, 8, 25, 50, 90, 150, 240, 360] as const;
export const MAX_STAGE = STAGE_THRESHOLDS.length - 1;

export const DROPS = {
  habit: 1,
  minimum: 2,
  reminder: 1,
  review: 1,
  task: (kind: TaskKind) => (kind === "obligatoire" ? 2 : 1),
  chore: (effort: Effort) => effort,
} as const;

/** Palier atteint (0 à 7). Le palier 7 est la fleur. */
export function stageFor(drops: number): number {
  let stage = 0;
  STAGE_THRESHOLDS.forEach((t, i) => {
    if (drops >= t) stage = i;
  });
  return stage;
}

/** Gouttes manquantes avant la prochaine feuille, ou null au dernier palier. */
export function dropsToNextStage(drops: number): number | null {
  const next = STAGE_THRESHOLDS[stageFor(drops) + 1];
  return next === undefined ? null : next - Math.max(0, drops);
}

/** Ajoute (ou retire) des gouttes sans jamais descendre sous zéro. */
export function addDrops(current: number, delta: number): number {
  return Math.max(0, current + delta);
}
