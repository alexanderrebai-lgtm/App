// Lecture des prescriptions du type « 3×10–12 », « 3×20–30 s », « 25 min », « 6 rép. ».

export interface Scheme {
  raw: string;
  /** Nombre de séries, 0 si la prescription n'est pas en séries (durée, tours…). */
  sets: number;
  /** Bas de la fourchette de répétitions (0 si « max » ou absent). */
  minReps: number;
  /** Haut de la fourchette de répétitions (0 si « max » ou absent). */
  topReps: number;
  /** Vrai pour les durées/distances : saisie en minutes et kilomètres. */
  free: boolean;
}

export function parseScheme(raw: string): Scheme {
  const sets = /^(\d+)×/.exec(raw);
  const reps = /×(\d+)(?:–(\d+))?/.exec(raw);
  return {
    raw,
    sets: sets ? Number(sets[1]) : 0,
    minReps: reps ? Number(reps[1]) : 0,
    topReps: reps ? Number(reps[2] ?? reps[1]) : 0,
    free: !raw.includes('×'),
  };
}

/** Séries à faire : une de moins en semaine allégée ou après un check-in difficile (non cumulé). */
export function setsToDo(scheme: Scheme, opts: { deload: boolean; lowReadiness: boolean }): number {
  if (!scheme.sets) return 0;
  return Math.max(1, scheme.sets - (opts.deload || opts.lowReadiness ? 1 : 0));
}
