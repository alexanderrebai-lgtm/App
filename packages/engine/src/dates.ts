// Dates au format ISO « AAAA-MM-JJ », calculées en UTC pour éviter les décalages d'heure d'été.
export type IsoDate = string;

const DAY = 86_400_000;

export function toIso(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function parseIso(s: IsoDate): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`Date invalide : ${s}`);
  return new Date(`${s}T00:00:00Z`);
}

/** Date locale de l'appareil, au format ISO. */
export function localToday(now: Date = new Date()): IsoDate {
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${now.getFullYear()}-${m < 10 ? '0' : ''}${m}-${d < 10 ? '0' : ''}${d}`;
}

export function addDays(s: IsoDate, n: number): IsoDate {
  return toIso(new Date(parseIso(s).getTime() + n * DAY));
}

/** Nombre de jours de b à a (a − b). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((parseIso(a).getTime() - parseIso(b).getTime()) / DAY);
}

/** 0 = lundi … 6 = dimanche. */
export function weekday(s: IsoDate): number {
  return (parseIso(s).getUTCDay() + 6) % 7;
}

export function mondayOf(s: IsoDate): IsoDate {
  return addDays(s, -weekday(s));
}

export function weekDates(monday: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
