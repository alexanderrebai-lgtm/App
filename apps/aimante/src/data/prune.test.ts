import { afterEach, describe, expect, it } from "vitest";
import { AimanteDB } from "./db";
import { pruneOldData } from "./prune";

const T = "2026-11-06";
const d = new AimanteDB("test-prune");
afterEach(async () => {
  await Promise.all(d.tables.map((t) => t.clear()));
});

const log = (date: string) => ({ date, habits: [], tasks: [], chores: [], minimum: [], hardMode: false, review: [], drops: 1 });

describe("nettoyage automatique", () => {
  it("supprime les tâches faites depuis plus de 14 jours, garde les autres", async () => {
    await d.tasks.bulkAdd([
      { id: "old", title: "a", kind: "secondaire", date: "2026-10-01", doneOn: "2026-10-22" },
      { id: "recent", title: "b", kind: "secondaire", date: "2026-10-01", doneOn: "2026-10-23" },
      { id: "open", title: "c", kind: "obligatoire", date: "2026-09-01", doneOn: null },
    ]);
    await pruneOldData(d, T);
    expect((await d.tasks.toArray()).map((t) => t.id).sort()).toEqual(["open", "recent"]);
  });

  it("supprime les journaux de plus de 120 jours et les menus de plus de 60 jours", async () => {
    await d.dayLogs.bulkAdd([log("2026-07-08"), log("2026-07-09")]);
    await d.mealPlan.bulkAdd([
      { key: "2026-09-06|soir", date: "2026-09-06", slot: "soir", recipeId: null, text: "restes" },
      { key: "2026-09-07|soir", date: "2026-09-07", slot: "soir", recipeId: null, text: "resto" },
    ]);
    await pruneOldData(d, T);
    expect((await d.dayLogs.toArray()).map((l) => l.date)).toEqual(["2026-07-09"]);
    expect((await d.mealPlan.toArray()).map((m) => m.date)).toEqual(["2026-09-07"]);
  });
});
