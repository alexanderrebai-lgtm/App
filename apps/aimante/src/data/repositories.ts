import type { EntityTable } from "dexie";
import type { DayLog, ISODate, Settings } from "../domain/types";
import { db } from "./db";

/**
 * Accès aux données. Les écrans n'importent que ce fichier (et `live.ts`),
 * jamais Dexie directement : pour brancher une synchro plus tard, on ne
 * change que ce dossier.
 */
function repo<T, K extends keyof T & string>(table: EntityTable<T, K>) {
  const remove = (key: T[K] & string): Promise<void> =>
    db.transaction("rw", [table, db.deletions], async () => {
      await table.delete(key as never);
      await db.deletions.put({ key: `${table.name}|${key}`, table: table.name, id: key, at: Date.now() });
    });
  return {
    getAll: (): Promise<T[]> => table.toArray(),
    get: (key: T[K] & string): Promise<T | undefined> => table.get(key as never),
    save: async (item: T): Promise<void> => {
      await table.put(item as never);
    },
    saveMany: async (items: T[]): Promise<void> => {
      await table.bulkPut(items as never);
    },
    remove,
  };
}

export const habitsRepo = repo(db.habits);
export const tasksRepo = repo(db.tasks);
export const roomsRepo = repo(db.rooms);
export const choresRepo = repo(db.chores);
export const recipesRepo = repo(db.recipes);
export const mealPlanRepo = repo(db.mealPlan);
export const shoppingRepo = repo(db.shoppingItems);
export const staplesRepo = repo(db.staples);
export const eventsRepo = repo(db.events);
export const eventDoneRepo = repo(db.eventDone);
export const backlogRepo = repo(db.backlog);
export const memosRepo = repo(db.memos);
export const dayLogsRepo = repo(db.dayLogs);

export const getSettings = (): Promise<Settings | undefined> => db.settings.get("settings");

export async function saveSettings(patch: Partial<Omit<Settings, "id">>): Promise<void> {
  await db.settings.update("settings", patch);
}

export function emptyDayLog(date: ISODate): DayLog {
  return { date, habits: [], tasks: [], chores: [], minimum: [], hardMode: false, review: [], drops: 0 };
}

export async function getDayLog(date: ISODate): Promise<DayLog> {
  return (await db.dayLogs.get(date)) ?? emptyDayLog(date);
}

/** Journaux des jours de `from` à `to` inclus. */
export function getDayLogs(from: ISODate, to: ISODate): Promise<DayLog[]> {
  return db.dayLogs.where("date").between(from, to, true, true).toArray();
}

export function getMealPlan(from: ISODate, to: ISODate) {
  return db.mealPlan.where("date").between(from, to, true, true).toArray();
}
