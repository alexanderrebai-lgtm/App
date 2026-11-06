import { choreStatus, spreadInitialDates } from "../domain/chores";
import { DROPS } from "../domain/points";
import { MINIMUM, welcomeBackGap } from "../domain/today";
import { newId } from "../domain/ids";
import type { DayLog, Effort, Habit, ISODate, Moment, TaskKind } from "../domain/types";
import { type AimanteDB, db as defaultDb } from "./db";
import { emptyDayLog } from "./repositories";

/**
 * Actions qui cochent, décochent et comptent les gouttes. Chacune se fait en
 * une seule transaction : le journal du jour et le total de la plante restent
 * toujours d'accord, même si l'appli est fermée au mauvais moment.
 */

type ListKey = "habits" | "tasks" | "chores" | "minimum" | "review";

/** Ajoute ou retire `id` de la liste du jour. Renvoie true si l'élément est maintenant coché. */
function toggleIn(log: DayLog, list: ListKey, id: string): boolean {
  const arr = log[list];
  const i = arr.indexOf(id);
  if (i >= 0) {
    arr.splice(i, 1);
    return false;
  }
  arr.push(id);
  return true;
}

async function changeDrops(database: AimanteDB, log: DayLog, delta: number) {
  log.drops = Math.max(0, log.drops + delta);
  const s = await database.settings.get("settings");
  if (s) await database.settings.update("settings", { totalDrops: Math.max(0, s.totalDrops + delta) });
}

async function loadLog(database: AimanteDB, date: ISODate): Promise<DayLog> {
  return (await database.dayLogs.get(date)) ?? emptyDayLog(date);
}

const scope = (database: AimanteDB) => [database.dayLogs, database.settings, database.tasks, database.chores];

export async function toggleHabit(habitId: string, date: ISODate, database = defaultDb): Promise<boolean> {
  return database.transaction("rw", scope(database), async () => {
    const log = await loadLog(database, date);
    const on = toggleIn(log, "habits", habitId);
    await changeDrops(database, log, on ? DROPS.habit : -DROPS.habit);
    await database.dayLogs.put(log);
    return on;
  });
}

export async function toggleMinimum(key: string, date: ISODate, database = defaultDb): Promise<{ on: boolean; all: boolean }> {
  return database.transaction("rw", scope(database), async () => {
    const log = await loadLog(database, date);
    const on = toggleIn(log, "minimum", key);
    await changeDrops(database, log, on ? DROPS.minimum : -DROPS.minimum);
    await database.dayLogs.put(log);
    return { on, all: MINIMUM.every((m) => log.minimum.includes(m.id)) };
  });
}

export async function setHardMode(on: boolean, date: ISODate, database = defaultDb): Promise<void> {
  await database.transaction("rw", scope(database), async () => {
    const log = await loadLog(database, date);
    log.hardMode = on;
    await database.dayLogs.put(log);
  });
}

export async function toggleTask(taskId: string, date: ISODate, database = defaultDb): Promise<boolean> {
  return database.transaction("rw", scope(database), async () => {
    const task = await database.tasks.get(taskId);
    if (!task) return false;
    const log = await loadLog(database, date);
    const on = task.doneOn === null;
    const delta = DROPS.task(task.kind);
    await database.tasks.update(taskId, { doneOn: on ? date : null });
    if (on && !log.tasks.includes(taskId)) log.tasks.push(taskId);
    if (!on) log.tasks = log.tasks.filter((x) => x !== taskId);
    await changeDrops(database, log, on ? delta : -delta);
    await database.dayLogs.put(log);
    return on;
  });
}

export async function addTask(title: string, kind: TaskKind, date: ISODate, database = defaultDb): Promise<void> {
  const t = title.trim();
  if (!t) return;
  await database.tasks.add({ id: newId(), title: t, kind, date, doneOn: null });
}

/**
 * Cocher une tâche ménagère remet son compteur à zéro. La décocher le même
 * jour (erreur) remet la date d'avant.
 */
export async function toggleChore(choreId: string, date: ISODate, database = defaultDb): Promise<boolean> {
  return database.transaction("rw", scope(database), async () => {
    const chore = await database.chores.get(choreId);
    if (!chore) return false;
    const log = await loadLog(database, date);
    const on = toggleIn(log, "chores", choreId);
    if (on) {
      await database.chores.update(choreId, { previousDone: chore.lastDone, lastDone: date });
    } else {
      await database.chores.update(choreId, { lastDone: chore.previousDone, previousDone: null });
    }
    await changeDrops(database, log, on ? DROPS.chore(chore.effort) : -DROPS.chore(chore.effort));
    await database.dayLogs.put(log);
    return on;
  });
}

/* ---------- Routines ---------- */

export async function saveHabit(
  input: { id?: string; moment: Moment; anchor: string; action: string },
  today: ISODate,
  database = defaultDb,
): Promise<void> {
  const anchor = cleanAnchor(input.anchor);
  const action = cleanAction(input.action);
  if (!anchor || !action) return;
  if (input.id) {
    await database.habits.update(input.id, { moment: input.moment, anchor, action });
    return;
  }
  const all = await database.habits.toArray();
  const order = all.reduce((m, h) => Math.max(m, h.order), -1) + 1;
  const habit: Habit = { id: newId(), moment: input.moment, anchor, action, order, createdOn: today };
  await database.habits.add(habit);
}

/** Retire un « Après » ou un « je » tapé en trop : le format les ajoute déjà. */
export function cleanAnchor(s: string): string {
  return s.trim().replace(/^apr[eè]s\s+/i, "").replace(/[,.…]+$/, "").trim();
}
export function cleanAction(s: string): string {
  return s.trim().replace(/^…\s*/, "").replace(/\.+$/, "").trim();
}

/* ---------- Ouverture de l'appli : retour en douceur ---------- */

/**
 * À appeler à chaque ouverture. Note le jour d'ouverture et, après une pause
 * de 3 jours ou plus, prépare le message « Content de te revoir ».
 */
export async function recordOpening(today: ISODate, database = defaultDb): Promise<void> {
  await database.transaction("rw", database.settings, async () => {
    const s = await database.settings.get("settings");
    if (!s || s.lastOpenedOn === today) return;
    const gap = welcomeBackGap(s.lastOpenedOn, today);
    await database.settings.update("settings", {
      lastOpenedOn: today,
      welcomeBack: gap !== null ? { on: today, daysAway: gap } : null,
    });
  });
}

export async function dismissWelcomeBack(database = defaultDb): Promise<void> {
  await database.settings.update("settings", { welcomeBack: null });
}

/**
 * Après une pause : les tâches ménagères en retard repartent comme au
 * premier jour, étalées sur leur cycle, au lieu d'une liste rouge qui fait peur.
 * Renvoie le nombre de tâches remises à plat.
 */
export async function resetOverdueChores(today: ISODate, database = defaultDb): Promise<number> {
  return database.transaction("rw", database.chores, async () => {
    const chores = await database.chores.toArray();
    const late = chores.filter((c) => !c.lastDone || choreStatus(c, today).daysLeft < 0);
    const spread = spreadInitialDates(late, today);
    await database.chores.bulkPut(spread.map((c) => ({ ...c, previousDone: null })));
    return late.length;
  });
}
/* ---------- Ménage : tâches et pièces ---------- */

export async function saveChore(
  input: { id?: string; name: string; roomId: string; everyDays: number; effort: Effort },
  database = defaultDb,
): Promise<void> {
  const name = input.name.trim();
  if (!name) return;
  const n = Math.round(input.everyDays);
  const everyDays = Number.isFinite(n) ? Math.min(365, Math.max(1, n)) : 7;
  const fields = { name, roomId: input.roomId, everyDays, effort: input.effort };
  if (input.id) {
    await database.chores.update(input.id, fields);
  } else {
    // Jamais faite : elle apparaît tout de suite dans les tâches à faire.
    await database.chores.add({ id: newId(), ...fields, lastDone: null, previousDone: null });
  }
}

export async function saveRoom(input: { id?: string; name: string }, database = defaultDb): Promise<void> {
  const name = input.name.trim();
  if (!name) return;
  if (input.id) {
    await database.rooms.update(input.id, { name });
    return;
  }
  const all = await database.rooms.toArray();
  await database.rooms.add({ id: newId(), name, order: all.reduce((m, r) => Math.max(m, r.order), -1) + 1 });
}

/** Retire une pièce vide. Renvoie false si elle contient encore des tâches. */
export async function deleteRoom(id: string, database = defaultDb): Promise<boolean> {
  return database.transaction("rw", [database.rooms, database.chores, database.deletions], async () => {
    if ((await database.chores.where("roomId").equals(id).count()) > 0) return false;
    await database.rooms.delete(id);
    await database.deletions.put({ key: `rooms|${id}`, table: "rooms", id, at: Date.now() });
    return true;
  });
}
