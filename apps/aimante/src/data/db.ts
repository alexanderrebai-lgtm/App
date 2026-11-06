import Dexie, { type EntityTable, type Table } from "dexie";
import type {
  AgendaEvent,
  BacklogItem,
  Chore,
  DayLog,
  EventDone,
  Habit,
  MealPlanEntry,
  Memo,
  Recipe,
  Room,
  Settings,
  ShoppingItem,
  Staple,
  Task,
} from "../domain/types";

export const DB_NAME = "aimante";

/** Trace d'une suppression, gardée pour la future synchro entre appareils. */
export interface Deletion {
  /** `${table}|${id}` */
  key: string;
  table: string;
  id: string;
  at: number;
}

/**
 * Base locale IndexedDB. Seul le dossier `data/` y accède : le reste de
 * l'appli passe par les fonctions de `repositories.ts`.
 */
export class AimanteDB extends Dexie {
  habits!: EntityTable<Habit, "id">;
  tasks!: EntityTable<Task, "id">;
  rooms!: EntityTable<Room, "id">;
  chores!: EntityTable<Chore, "id">;
  recipes!: EntityTable<Recipe, "id">;
  mealPlan!: EntityTable<MealPlanEntry, "key">;
  shoppingItems!: EntityTable<ShoppingItem, "id">;
  staples!: EntityTable<Staple, "id">;
  events!: EntityTable<AgendaEvent, "id">;
  eventDone!: EntityTable<EventDone, "key">;
  backlog!: EntityTable<BacklogItem, "id">;
  memos!: EntityTable<Memo, "id">;
  dayLogs!: EntityTable<DayLog, "date">;
  settings!: EntityTable<Settings, "id">;
  deletions!: EntityTable<Deletion, "key">;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores({
      habits: "id, moment, order",
      tasks: "id, date, doneOn",
      rooms: "id, order",
      chores: "id, roomId",
      recipes: "id",
      mealPlan: "key, date",
      shoppingItems: "id, aisle, checked",
      staples: "id, order",
      events: "id, date",
      eventDone: "key, eventId, date",
      backlog: "id, createdAt",
      memos: "id, createdAt",
      dayLogs: "date",
      settings: "id",
    });
    // v2 : date de création des routines, retour en douceur, heure de coucher,
    // et traces pour la synchro (date de modification, suppressions).
    this.version(2)
      .stores({ deletions: "key, at" })
      .upgrade(async (tx) => {
        const settings = (await tx.table("settings").get("settings")) as Partial<Settings> | undefined;
        const since = settings?.seededAt ?? new Date().toISOString().slice(0, 10);
        await tx
          .table("habits")
          .toCollection()
          .modify((h: Partial<Habit>) => {
            h.createdOn ??= since;
          });
        await tx.table("settings").toCollection().modify((st: Partial<Settings>) => {
          st.lastOpenedOn ??= since;
          st.welcomeBack ??= null;
          if (st.bedtime === undefined) st.bedtime = "23:00";
        });
      });
    installSyncMetadata(this);
  }
}

/**
 * Chaque ligne garde `updatedAt` (millisecondes) : la future synchro saura
 * quelle version est la plus récente. Une ligne importée garde le sien.
 */
function installSyncMetadata(database: Dexie) {
  for (const table of database.tables as Table<Record<string, unknown>>[]) {
    if (table.name === "deletions") continue;
    table.hook("creating", (_key, obj) => {
      if (typeof obj.updatedAt !== "number") obj.updatedAt = Date.now();
    });
    table.hook("updating", (mods) => {
      if ("updatedAt" in mods) return undefined;
      return { updatedAt: Date.now() };
    });
  }
}

export const SCHEMA_VERSION = 1;

/** Noms des tables, dans l'ordre de l'export JSON. */
export const TABLE_NAMES = [
  "settings",
  "habits",
  "tasks",
  "rooms",
  "chores",
  "recipes",
  "mealPlan",
  "shoppingItems",
  "staples",
  "events",
  "eventDone",
  "backlog",
  "memos",
  "dayLogs",
] as const;
export type TableName = (typeof TABLE_NAMES)[number];

export const db = new AimanteDB();
