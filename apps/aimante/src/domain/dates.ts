import {
  addDays as addDaysFns,
  differenceInCalendarDays,
  format,
  isValid,
  parse,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { ISODate } from "./types";

const ISO = "yyyy-MM-dd";

export function toISO(d: Date): ISODate {
  return format(d, ISO);
}

/** Lit une date « aaaa-mm-jj » à minuit, heure locale. */
export function fromISO(s: ISODate): Date {
  return parse(s, ISO, new Date(2000, 0, 1));
}

export function isISODate(s: unknown): s is ISODate {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && isValid(fromISO(s));
}

export function today(now: Date = new Date()): ISODate {
  return toISO(now);
}

export function addDays(s: ISODate, n: number): ISODate {
  return toISO(addDaysFns(fromISO(s), n));
}

/** Nombre de jours de `from` à `to` (positif si `to` est après). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(fromISO(to), fromISO(from));
}

/** Lundi de la semaine qui contient `s`. */
export function mondayOf(s: ISODate): ISODate {
  return toISO(startOfWeek(fromISO(s), { weekStartsOn: 1 }));
}

/** Les 7 jours de la semaine, du lundi au dimanche. */
export function weekDays(s: ISODate): ISODate[] {
  const mon = mondayOf(s);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

export function isSunday(s: ISODate): boolean {
  return fromISO(s).getDay() === 0;
}

/** « vendredi 6 novembre » */
export function longDate(s: ISODate): string {
  return format(fromISO(s), "EEEE d MMMM", { locale: fr });
}

/** « 6 nov. » */
export function shortDate(s: ISODate): string {
  return format(fromISO(s), "d MMM", { locale: fr });
}

/** « lun. », « mar. »… sans le point final : « Lun » */
export function weekdayShort(s: ISODate): string {
  const w = format(fromISO(s), "EEEEEE", { locale: fr });
  return w.charAt(0).toUpperCase() + w.slice(1).replace(".", "");
}

export function dayOfMonth(s: ISODate): number {
  return fromISO(s).getDate();
}

/** Salutation selon l'heure. */
export function greeting(hour: number): string {
  if (hour < 5) return "Bonsoir";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}
