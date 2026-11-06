import { addDays, daysBetween } from "./dates";
import type { Chore, Effort, ISODate } from "./types";

export const EFFORT_MINUTES: Record<Effort, number> = { 1: 5, 2: 15, 3: 30 };

export type Freshness = "ok" | "warn" | "bad";

export interface ChoreStatus {
  /** Jours restants avant l'échéance (négatif = en retard). */
  daysLeft: number;
  /** Part du cycle écoulée : 0 = vient d'être fait, 1 = à faire aujourd'hui. */
  ratio: number;
  freshness: Freshness;
  label: string;
  doneToday: boolean;
}

export function choreStatus(chore: Chore, today: ISODate): ChoreStatus {
  if (!chore.lastDone) {
    return { daysLeft: 0, ratio: 1, freshness: "bad", label: "jamais fait", doneToday: false };
  }
  const elapsed = daysBetween(chore.lastDone, today);
  const daysLeft = chore.everyDays - elapsed;
  const ratio = Math.max(0, elapsed / chore.everyDays);
  const doneToday = elapsed === 0;
  return { daysLeft, ratio, freshness: freshnessOf(ratio, daysLeft), label: dueLabel(daysLeft, doneToday), doneToday };
}

function freshnessOf(ratio: number, daysLeft: number): Freshness {
  if (daysLeft < 0) return "bad";
  return ratio < 0.6 ? "ok" : "warn";
}

export function dueLabel(daysLeft: number, doneToday = false): string {
  if (doneToday) return "fait aujourd'hui";
  if (daysLeft > 1) return `dans ${daysLeft} j`;
  if (daysLeft === 1) return "demain";
  if (daysLeft === 0) return "aujourd'hui";
  return `en retard de ${-daysLeft} j`;
}

/** Tâches à faire aujourd'hui ou en retard, les plus urgentes d'abord. */
export function dueChores(chores: Chore[], today: ISODate): Chore[] {
  return chores
    .map((c) => ({ c, s: choreStatus(c, today) }))
    .filter(({ s }) => s.daysLeft <= 0 && !s.doneToday)
    .sort((a, b) => b.s.ratio - a.s.ratio || a.s.daysLeft - b.s.daysLeft)
    .map(({ c }) => c);
}

/** Nombre de tâches en retard (échéance dépassée), pour la pastille de l'onglet. */
export function overdueCount(chores: Chore[], today: ISODate): number {
  return chores.filter((c) => choreStatus(c, today).daysLeft < 0).length;
}

/**
 * Calcule une « dernière fois » de départ pour chaque tâche afin que les
 * échéances soient étalées : les tâches de même fréquence tombent des jours
 * différents (les hebdomadaires sont réparties sur la semaine).
 * Les tâches quotidiennes sont dues aujourd'hui.
 */
export function spreadInitialDates<T extends { everyDays: number }>(
  chores: T[],
  today: ISODate,
): (T & { lastDone: ISODate })[] {
  const groups = new Map<number, number>();
  const counts = new Map<number, number>();
  for (const c of chores) counts.set(c.everyDays, (counts.get(c.everyDays) ?? 0) + 1);

  return chores.map((c) => {
    const f = Math.max(1, c.everyDays);
    const i = groups.get(f) ?? 0;
    groups.set(f, i + 1);
    const n = counts.get(c.everyDays) ?? 1;
    // Décalage de l'échéance, en jours à partir d'aujourd'hui (0 … f-1).
    // Le « + 0,5 » centre chaque tâche dans sa part du cycle : peu de tâches
    // tombent le premier jour, et une tâche mensuelle seule tombe au milieu.
    const offset = f === 1 ? 0 : Math.floor(((i + 0.5) * f) / n) % f;
    return { ...c, lastDone: addDays(today, offset - f) };
  });
}
