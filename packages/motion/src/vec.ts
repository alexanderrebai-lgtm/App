export type V3 = [number, number, number];

export const v = (x: number, y: number, z: number): V3 => [x, y, z];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const dist = (a: V3, b: V3): number => len(sub(a, b));
/** Combinaison linéaire : o + Σ kᵢ·vᵢ */
export const comb = (o: V3, ...terms: [V3, number][]): V3 => terms.reduce((acc, [d, k]) => add(acc, mul(d, k)), o);
export const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
/** Direction dans le plan sagittal (x avant, y haut) à partir d'un angle depuis la verticale, vers l'avant. */
export const sag = (angleFromUp: number): V3 => [Math.sin(angleFromUp), Math.cos(angleFromUp), 0];
