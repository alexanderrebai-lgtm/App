import { dayPlan, type DayPlan, type IsoDate, type Profile } from '@muscu/engine';

export interface CalendarCell {
  date: IsoDate;
  day: number;
  plan: DayPlan | null;
}

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Grille d'un mois, lundi en premier ; null pour les cases vides avant le 1er. */
export function monthGrid(year: number, month: number, profile: Profile | null): (CalendarCell | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (CalendarCell | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= days; d++) {
    const date = `${year}-${pad(month + 1)}-${pad(d)}`;
    cells.push({ date, day: d, plan: profile ? dayPlan(profile, date) : null });
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const m = month + delta;
  return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
}
