import { parseIso, type IsoDate } from '@muscu/engine';

export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « jeudi 22 janvier » */
export function longDate(d: IsoDate, capitalize = false): string {
  const x = parseIso(d);
  const s = `${DAYS[(x.getUTCDay() + 6) % 7]} ${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
  return capitalize ? cap(s) : s;
}

/** « 22 janvier » */
export function dayMonth(d: IsoDate): string {
  const x = parseIso(d);
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
}

export function monthTitle(year: number, month: number): string {
  return `${cap(MONTHS[month]!)} ${year}`;
}

/** Nombre au format français : 2 900, 21,2 */
export function num(n: number, decimals = 0): string {
  const s = n.toFixed(decimals).replace('.', ',');
  const [i, d] = s.split(',');
  const grouped = i!.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return d ? `${grouped},${d}` : grouped;
}
