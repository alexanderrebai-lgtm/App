import { choreStatus, dueChores, EFFORT_MINUTES } from "./chores";
import { daysBetween } from "./dates";
import type { Chore, DayLog, Habit, ISODate, Task } from "./types";

/* ---------- Tâches du jour ---------- */

/**
 * Tâches à montrer aujourd'hui : celles prévues jusqu'à aujourd'hui et pas
 * encore faites (une tâche d'hier non faite est donc reportée toute seule),
 * plus celles cochées aujourd'hui.
 */
export function tasksForDay(tasks: Task[], day: ISODate): Task[] {
  return tasks.filter((t) => (t.doneOn === null && t.date <= day) || t.doneOn === day);
}

/** Une tâche est « reportée » si elle était prévue avant aujourd'hui et n'est pas faite. */
export function isCarriedOver(task: Task, day: ISODate): boolean {
  return task.doneOn === null && task.date < day;
}

/* ---------- Ne jamais rater deux fois ---------- */

/**
 * Vrai si la routine a été ratée hier et n'est pas encore faite aujourd'hui.
 * On ne le dit que si l'appli a servi hier (sinon on ne sait pas, et après
 * une pause c'est le message « retour en douceur » qui prend le relais) et si
 * la routine existait déjà hier.
 */
export function missedYesterday(habit: Habit, yesterday: DayLog | undefined, today: DayLog | undefined): boolean {
  if (!yesterday) return false;
  if (habit.createdOn >= yesterday.date) return false;
  if (today?.habits.includes(habit.id)) return false;
  return !yesterday.habits.includes(habit.id);
}

/* ---------- Le minimum du jour ---------- */

export const MINIMUM = [
  { id: "repas", label: "Manger un vrai repas avec un légume" },
  { id: "maison", label: "Une tâche maison de 5 minutes" },
  { id: "hygiene", label: "Me laver et me brosser les dents" },
] as const;

/* ---------- Session éclair ---------- */

/**
 * Choisit les tâches à faire pendant une session de `minutes` : d'abord les
 * plus en retard dont la durée totale tient dans le temps. S'il n'y a rien
 * d'urgent, prend celles qui arrivent bientôt.
 */
export function pickFlashChores(chores: Chore[], minutes: number, today: ISODate, doneToday: string[] = []): Chore[] {
  const done = new Set(doneToday);
  const picked: Chore[] = [];
  let total = 0;
  const take = (list: Chore[]) => {
    for (const c of list) {
      const m = EFFORT_MINUTES[c.effort];
      if (done.has(c.id) || picked.includes(c) || total + m > minutes) continue;
      picked.push(c);
      total += m;
    }
  };
  take(dueChores(chores, today));
  if (picked.length === 0) {
    const soon = chores
      .map((c) => ({ c, s: choreStatus(c, today) }))
      .filter(({ s }) => !s.doneToday)
      .sort((a, b) => b.s.ratio - a.s.ratio)
      .map(({ c }) => c);
    take(soon);
  }
  return picked;
}

/* ---------- Retour en douceur ---------- */

export const WELCOME_BACK_AFTER_DAYS = 3;

/** Nombre de jours d'absence si l'on revient après une pause, sinon null. */
export function welcomeBackGap(lastOpenedOn: ISODate | undefined, today: ISODate): number | null {
  if (!lastOpenedOn) return null;
  const gap = daysBetween(lastOpenedOn, today);
  return gap >= WELCOME_BACK_AFTER_DAYS ? gap : null;
}

/* ---------- Heure de coucher ---------- */

function minutesOf(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export const BEDTIME_WINDOW = { before: 120, after: 60 } as const;

/**
 * Minutes avant l'heure de coucher (négatif si elle est passée), seulement
 * dans la fenêtre du soir : 2 h avant jusqu'à 1 h après. Gère un coucher
 * après minuit (00:30).
 */
export function bedtimeCountdown(now: Date, bedtime: string | null): number | null {
  if (!bedtime) return null;
  const target = minutesOf(bedtime);
  if (target === null) return null;
  const current = now.getHours() * 60 + now.getMinutes();
  let diff = target - current;
  // Ramène l'écart entre -12 h et +12 h : 23:30 → 00:30 donne +60, pas -1380.
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  if (diff > BEDTIME_WINDOW.before || diff < -BEDTIME_WINDOW.after) return null;
  return diff;
}

/** « 1 h 20 », « 45 min » */
export function formatDuration(minutes: number): string {
  const m = Math.abs(Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
}

/** « 23 h », « 22 h 30 » */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return m === "00" ? `${Number(h)} h` : `${Number(h)} h ${m}`;
}
