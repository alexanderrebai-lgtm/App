import { exerciseById, exercisesData, programs } from '@muscu/content';
import { fr, PHASE_STARTS, type DayPlan, type Level, type Phase } from '@muscu/engine';
import { colors } from '../theme';

export const LEVEL: Record<Level, string> = { beginner: 'Débutant', advanced: 'Confirmé' };

export function phaseRanges(level: Level): string[] {
  const [a, b] = PHASE_STARTS[level];
  return [`Semaines 1 à ${a}`, `Semaines ${a + 1} à ${b}`, `Semaines ${b + 1} à 26`];
}

/** Nom de phase ; en niveau confirmé, la première s'appelle « Remise en route ». */
export function phaseName(level: Level, phase: Phase): string {
  return level === 'advanced' && phase === 0 ? 'Remise en route' : programs.phaseNames[phase]!;
}

export function planLabel(plan: DayPlan): string {
  return fr.sessionLabels[plan.label] ?? plan.label;
}

/** Couleur du jour : néon pour l'entraînement, azur pour la récupération. */
export function kindColor(plan: DayPlan | null): string | null {
  if (!plan) return null;
  if (plan.day.kind === 'training') return colors.neon;
  if (plan.day.kind === 'mobility' || plan.day.kind === 'walk') return colors.azure;
  return null;
}

export function exerciseName(id: string): string {
  return exerciseById.get(id)?.name ?? id;
}

export function techniqueText(id: string): string | null {
  const t = exerciseById.get(id)?.technique;
  if (!t) return null;
  return techniques.get(t) ?? null;
}

const techniques = new Map(exercisesData.techniques.map((x) => [x.id, x.text]));
