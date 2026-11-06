import Dexie, { type EntityTable } from "dexie";
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
