import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  bedtimeCountdown,
  formatClock,
  formatDuration,
  isCarriedOver,
  missedYesterday,
  pickFlashChores,
  tasksForDay,
  welcomeBackGap,
} from "./today";
import type { Chore, DayLog, Habit, Task } from "./types";

const T = "2026-11-06";
const Y = addDays(T, -1);

const task = (p: Partial<Task>): Task => ({ id: "t", title: "x", kind: "secondaire", date: T, doneOn: null, ...p });
const log = (date: string, habits: string[] = []): DayLog => ({
  date, habits, tasks: [], chores: [], minimum: [], hardMode: false, review: [], drops: 1,
});
const habit: Habit = { id: "h", moment: "matin", anchor: "a", action: "b", order: 0, createdOn: "2026-10-01" };

describe("report des tâches", () => {
  const tasks = [
    task({ id: "today" }),
    task({ id: "yesterday", date: Y }),
    task({ id: "lastWeek", date: addDays(T, -7) }),
    task({ id: "doneToday", date: Y, doneOn: T }),
    task({ id: "doneYesterday", date: Y, doneOn: Y }),
    task({ id: "tomorrow", date: addDays(T, 1) }),
  ];

  it("une tâche non faite reste visible les jours suivants", () => {
    expect(tasksForDay(tasks, T).map((t) => t.id)).toEqual(["today", "yesterday", "lastWeek", "doneToday"]);
  });

  it("elle porte l'étiquette « reportée »", () => {
    expect(isCarriedOver(tasks[0]!, T)).toBe(false);
    expect(isCarriedOver(tasks[1]!, T)).toBe(true);
    expect(isCarriedOver(tasks[3]!, T)).toBe(false); // faite
  });

  it("le lendemain, la tâche d'aujourd'hui non faite devient reportée", () => {
    const tomorrow = addDays(T, 1);
    expect(tasksForDay(tasks, tomorrow).map((t) => t.id)).toContain("today");
    expect(isCarriedOver(tasks[0]!, tomorrow)).toBe(true);
  });
});

describe("ne jamais rater deux fois", () => {
  it("signale une routine ratée hier", () => {
    expect(missedYesterday(habit, log(Y), log(T))).toBe(true);
  });
  it("se tait si elle a été faite hier", () => {
    expect(missedYesterday(habit, log(Y, ["h"]), undefined)).toBe(false);
  });
  it("se tait dès qu'elle est faite aujourd'hui", () => {
    expect(missedYesterday(habit, log(Y), log(T, ["h"]))).toBe(false);
  });
  it("se tait si l'appli n'a pas servi hier", () => {
    expect(missedYesterday(habit, undefined, undefined)).toBe(false);
  });
  it("se tait pour une routine créée hier ou aujourd'hui", () => {
    expect(missedYesterday({ ...habit, createdOn: Y }, log(Y), undefined)).toBe(false);
    expect(missedYesterday({ ...habit, createdOn: T }, log(Y), undefined)).toBe(false);
  });
});

describe("session éclair", () => {
  const c = (id: string, effort: 1 | 2 | 3, daysAgo: number, everyDays = 7): Chore => ({
    id, roomId: "r", name: id, everyDays, effort, lastDone: addDays(T, -daysAgo), previousDone: null,
  });
  const chores = [c("late15", 2, 12), c("late5", 1, 9), c("due5", 1, 7), c("late30", 3, 20), c("fresh", 1, 1)];

  it("prend les plus en retard qui tiennent dans le temps", () => {
    expect(pickFlashChores(chores, 5, T).map((x) => x.id)).toEqual(["late5"]);
    // 30 min : late30 (ratio 2,9) tient seule.
    expect(pickFlashChores(chores, 30, T).map((x) => x.id)).toEqual(["late30"]);
    // 15 min : late30 ne tient pas, late15 (1,7) puis rien d'autre ne rentre.
    expect(pickFlashChores(chores, 15, T).map((x) => x.id)).toEqual(["late15"]);
  });

  it("ne dépasse jamais la durée choisie", () => {
    for (const n of [5, 15, 30]) {
      const total = pickFlashChores(chores, n, T).reduce((s, x) => s + ({ 1: 5, 2: 15, 3: 30 } as const)[x.effort], 0);
      expect(total).toBeLessThanOrEqual(n);
    }
  });

  it("ignore ce qui est déjà fait aujourd'hui", () => {
    expect(pickFlashChores(chores, 5, T, ["late5"]).map((x) => x.id)).toEqual(["due5"]);
  });

  it("s'il n'y a rien d'urgent, prend ce qui arrive bientôt", () => {
    const clean = [c("a", 1, 2), c("b", 1, 5), c("c", 1, 0)];
    expect(pickFlashChores(clean, 5, T).map((x) => x.id)).toEqual(["b"]);
  });
});

describe("retour en douceur", () => {
  it("à partir de 3 jours d'absence", () => {
    expect(welcomeBackGap(addDays(T, -2), T)).toBeNull();
    expect(welcomeBackGap(addDays(T, -3), T)).toBe(3);
    expect(welcomeBackGap(addDays(T, -40), T)).toBe(40);
    expect(welcomeBackGap(undefined, T)).toBeNull();
  });
});

describe("heure de coucher", () => {
  const at = (h: number, m = 0) => new Date(2026, 10, 6, h, m);
  it("compte les minutes dans la fenêtre du soir", () => {
    expect(bedtimeCountdown(at(21, 30), "23:00")).toBe(90);
    expect(bedtimeCountdown(at(23, 20), "23:00")).toBe(-20);
    expect(bedtimeCountdown(at(20, 0), "23:00")).toBeNull();
    expect(bedtimeCountdown(at(9, 0), "23:00")).toBeNull();
    expect(bedtimeCountdown(at(21, 0), null)).toBeNull();
  });
  it("gère un coucher après minuit", () => {
    expect(bedtimeCountdown(at(23, 30), "00:30")).toBe(60);
    expect(bedtimeCountdown(at(0, 45), "00:30")).toBe(-15);
    expect(bedtimeCountdown(at(23, 30), "23:00")).toBe(-30);
  });
  it("écrit les durées et les heures", () => {
    expect(formatDuration(80)).toBe("1 h 20");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatClock("23:00")).toBe("23 h");
    expect(formatClock("22:30")).toBe("22 h 30");
  });
});
