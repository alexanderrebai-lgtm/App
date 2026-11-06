/** Date du calendrier au format « aaaa-mm-jj », sans heure ni fuseau. */
export type ISODate = string;

export type Moment = "matin" | "journee" | "soir";

export interface Habit {
  id: string;
  moment: Moment;
  /** Chose que l'on fait déjà : « Après [anchor]… » */
  anchor: string;
  /** Nouvelle habitude : « …je [action] » */
  action: string;
  order: number;
}

export type TaskKind = "obligatoire" | "secondaire";

export interface Task {
  id: string;
  title: string;
  kind: TaskKind;
  /** Jour prévu. Si la date est passée et la tâche non faite, elle est « reportée ». */
  date: ISODate;
  doneOn: ISODate | null;
}

export interface Room {
  id: string;
  name: string;
  order: number;
}

/** 1 = 5 min, 2 = 15 min, 3 = 30 min */
export type Effort = 1 | 2 | 3;

export interface Chore {
  id: string;
  roomId: string;
  name: string;
  everyDays: number;
  effort: Effort;
  lastDone: ISODate | null;
  /** Date d'avant, pour annuler une coche faite par erreur. */
  previousDone: ISODate | null;
}

export const AISLES = [
  "Fruits & légumes",
  "Frais",
  "Viande & poisson",
  "Boulangerie",
  "Épicerie",
  "Surgelés",
  "Boissons",
  "Hygiène",
  "Entretien",
  "Autre",
] as const;
export type Aisle = (typeof AISLES)[number];

export interface Ingredient {
  name: string;
  aisle: Aisle;
}

export interface Recipe {
  id: string;
  name: string;
  /** Note courte : « 15 min », « double portion »… */
  note: string;
  ingredients: Ingredient[];
}

export type MealSlot = "midi" | "soir";

export interface MealPlanEntry {
  /** `${date}|${slot}` */
  key: string;
  date: ISODate;
  slot: MealSlot;
  recipeId: string | null;
  text: string | null;
}

export type ItemOrigin = "manuel" | "menu" | "essentiel";

export interface ShoppingItem {
  id: string;
  name: string;
  aisle: Aisle;
  checked: boolean;
  origin: ItemOrigin;
  createdAt: number;
}

export interface Staple {
  id: string;
  name: string;
  aisle: Aisle;
  order: number;
}

export type EventKind = "rdv" | "activite" | "a-faire";
export type Repeat = "none" | "weekly" | "monthly";

export interface AgendaEvent {
  id: string;
  title: string;
  /** Date de la première occurrence. */
  date: ISODate;
  /** « hh:mm » ou null */
  time: string | null;
  kind: EventKind;
  repeat: Repeat;
}

export interface EventDone {
  /** `${eventId}|${date}` */
  key: string;
  eventId: string;
  date: ISODate;
}

export interface BacklogItem {
  id: string;
  title: string;
  createdAt: number;
}

export interface Memo {
  id: string;
  text: string;
  createdAt: number;
}

export interface DayLog {
  date: ISODate;
  habits: string[];
  tasks: string[];
  chores: string[];
  minimum: string[];
  hardMode: boolean;
  review: string[];
  drops: number;
}

export interface Settings {
  id: "settings";
  totalDrops: number;
  onboardingSeen: boolean;
  seededAt: ISODate;
  reminders: {
    morning: string | null;
    evening: string | null;
    eventDayBefore: boolean;
    eventHourBefore: boolean;
    sundayReview: boolean;
  };
}
