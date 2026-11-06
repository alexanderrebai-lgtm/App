import { guessAisle } from "../domain/aisles";
import { spreadInitialDates } from "../domain/chores";
import { addDays, fromISO, toISO } from "../domain/dates";
import { newId } from "../domain/ids";
import type {
  AgendaEvent,
  BacklogItem,
  Chore,
  Habit,
  ISODate,
  MealPlanEntry,
  MealSlot,
  Memo,
  Recipe,
  Room,
  Settings,
  Staple,
} from "../domain/types";
import { type AimanteDB } from "./db";
import {
  SEED_BACKLOG,
  SEED_CHORES,
  SEED_HABITS,
  SEED_MEMOS,
  SEED_RECIPES,
  SEED_ROOMS,
  SEED_STAPLES,
} from "./seed-data";

export interface SeedData {
  settings: Settings;
  habits: Habit[];
  rooms: Room[];
  chores: Chore[];
  recipes: Recipe[];
  mealPlan: MealPlanEntry[];
  staples: Staple[];
  events: AgendaEvent[];
  backlog: BacklogItem[];
  memos: Memo[];
}

export function defaultSettings(today: ISODate): Settings {
  return {
    id: "settings",
    totalDrops: 0,
    onboardingSeen: false,
    seededAt: today,
    lastOpenedOn: today,
    welcomeBack: null,
    bedtime: "23:00",
    reminders: {
      morning: "07:30",
      evening: "21:30",
      eventDayBefore: true,
      eventHourBefore: true,
      sundayReview: true,
    },
  };
}

/** Construit les données de la première ouverture (fonction pure, testable). */
export function buildSeed(today: ISODate, now = Date.now()): SeedData {
  const rooms: Room[] = SEED_ROOMS.map((name, order) => ({ id: newId(), name, order }));
  const roomId = (name: string) => rooms.find((r) => r.name === name)?.id ?? rooms[0]!.id;

  const chores: Chore[] = spreadInitialDates(SEED_CHORES, today).map((c) => ({
    id: newId(),
    roomId: roomId(c.room),
    name: c.name,
    everyDays: c.everyDays,
    effort: c.effort,
    lastDone: c.lastDone,
    previousDone: null,
  }));

  const recipes: Recipe[] = SEED_RECIPES.map((r) => ({
    id: newId(),
    name: r.name,
    note: r.note,
    ingredients: r.ingredients.map((name) => ({ name, aisle: guessAisle(name) })),
  }));

  // Quelques repas déjà prévus pour que le menu ne soit pas vide.
  const plan: [number, MealSlot, number][] = [
    [0, "soir", 1],
    [1, "soir", 4],
    [2, "soir", 0],
    [3, "midi", 4],
  ];
  const mealPlan: MealPlanEntry[] = plan.map(([day, slot, ri]) => {
    const date = addDays(today, day);
    return { key: `${date}|${slot}`, date, slot, recipeId: recipes[ri]!.id, text: null };
  });

  const d = fromISO(today);
  const firstOfMonth = toISO(new Date(d.getFullYear(), d.getMonth(), 1));
  const thirdOfMonth = toISO(new Date(d.getFullYear(), d.getMonth(), 3));

  return {
    settings: defaultSettings(today),
    habits: SEED_HABITS.map((h, order) => ({ id: newId(), order, createdOn: today, ...h })),
    rooms,
    chores,
    recipes,
    mealPlan,
    staples: SEED_STAPLES.map((name, order) => ({ id: newId(), name, aisle: guessAisle(name), order })),
    events: [
      { id: newId(), title: "Payer le loyer", date: firstOfMonth, time: null, kind: "a-faire", repeat: "monthly" },
      { id: newId(), title: "Coiffeur", date: thirdOfMonth, time: "10:00", kind: "rdv", repeat: "monthly" },
    ],
    backlog: SEED_BACKLOG.map((title, i) => ({ id: newId(), title, createdAt: now + i })),
    memos: SEED_MEMOS.map((text, i) => ({ id: newId(), text, createdAt: now + i })),
  };
}

/**
 * Remplit la base à la toute première ouverture. Sans effet ensuite : la
 * présence de la ligne `settings` signale que l'appli a déjà été initialisée.
 * Renvoie true si les données de départ viennent d'être écrites.
 */
export async function ensureSeeded(database: AimanteDB, today: ISODate): Promise<boolean> {
  return database.transaction("rw", database.tables, async () => {
    if (await database.settings.get("settings")) return false;
    const s = buildSeed(today);
    await Promise.all([
      database.habits.bulkAdd(s.habits),
      database.rooms.bulkAdd(s.rooms),
      database.chores.bulkAdd(s.chores),
      database.recipes.bulkAdd(s.recipes),
      database.mealPlan.bulkAdd(s.mealPlan),
      database.staples.bulkAdd(s.staples),
      database.events.bulkAdd(s.events),
      database.backlog.bulkAdd(s.backlog),
      database.memos.bulkAdd(s.memos),
    ]);
    await database.settings.add(s.settings);
    return true;
  });
}
