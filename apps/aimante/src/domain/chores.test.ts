import { describe, expect, it } from "vitest";
import { choreStatus, dueChores, dueLabel, overdueCount, spreadInitialDates } from "./chores";
import { addDays, fromISO } from "./dates";
import type { Chore } from "./types";

const T = "2026-11-06";
const chore = (p: Partial<Chore>): Chore => ({
  id: p.id ?? "c", roomId: "r", name: p.name ?? "Tâche", everyDays: 7, effort: 1, lastDone: T, previousDone: null, ...p,
});

describe("échéances du ménage", () => {
  it("calcule les jours restants et le libellé", () => {
    expect(choreStatus(chore({ lastDone: addDays(T, -4) }), T)).toMatchObject({ daysLeft: 3, label: "dans 3 j", freshness: "ok" });
    expect(choreStatus(chore({ lastDone: addDays(T, -6) }), T)).toMatchObject({ daysLeft: 1, label: "demain" });
    expect(choreStatus(chore({ lastDone: addDays(T, -7) }), T)).toMatchObject({ daysLeft: 0, label: "aujourd'hui", freshness: "warn" });
    expect(choreStatus(chore({ lastDone: addDays(T, -9) }), T)).toMatchObject({ daysLeft: -2, label: "en retard de 2 j", freshness: "bad" });
  });

  it("vert juste après, orange en approchant, rouge en retard", () => {
    expect(choreStatus(chore({ lastDone: addDays(T, -1) }), T).freshness).toBe("ok");
    expect(choreStatus(chore({ lastDone: addDays(T, -5) }), T).freshness).toBe("warn");
    expect(choreStatus(chore({ lastDone: addDays(T, -8) }), T).freshness).toBe("bad");
  });

  it("une tâche faite aujourd'hui l'indique", () => {
    const s = choreStatus(chore({ everyDays: 1, lastDone: T }), T);
    expect(s.doneToday).toBe(true);
    expect(s.label).toBe("fait aujourd'hui");
  });

  it("une tâche jamais faite est à faire", () => {
    expect(choreStatus(chore({ lastDone: null }), T)).toMatchObject({ daysLeft: 0, label: "jamais fait" });
  });

  it("trie les tâches dues de la plus urgente à la moins urgente", () => {
    const list = [
      chore({ id: "a", lastDone: addDays(T, -7) }),
      chore({ id: "b", lastDone: addDays(T, -14) }),
      chore({ id: "c", lastDone: addDays(T, -2) }),
      chore({ id: "d", everyDays: 1, lastDone: T }),
    ];
    expect(dueChores(list, T).map((c) => c.id)).toEqual(["b", "a"]);
    expect(overdueCount(list, T)).toBe(1);
  });

  it("libellés", () => {
    expect(dueLabel(5)).toBe("dans 5 j");
    expect(dueLabel(-1)).toBe("en retard de 1 j");
  });
});

describe("répartition des tâches au départ", () => {
  it("les tâches hebdomadaires tombent des jours différents de la semaine", () => {
    const weekly = Array.from({ length: 6 }, (_, i) => ({ name: `t${i}`, everyDays: 7 }));
    const spread = spreadInitialDates(weekly, T);
    const dueDays = spread.map((c) => fromISO(addDays(c.lastDone, 7)).getDay());
    expect(new Set(dueDays).size).toBe(6);
    // Aucune n'est en retard et toutes sont dues dans les 7 prochains jours.
    for (const c of spread) {
      const left = choreStatus(chore({ lastDone: c.lastDone }), T).daysLeft;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThan(7);
    }
  });

  it("les tâches quotidiennes sont dues aujourd'hui", () => {
    const [c] = spreadInitialDates([{ everyDays: 1 }], T);
    expect(c!.lastDone).toBe(addDays(T, -1));
  });

  it("peu de tâches non quotidiennes tombent le premier jour", () => {
    const spread = spreadInitialDates([{ everyDays: 30 }, { everyDays: 14 }, { everyDays: 14 }], T);
    expect(spread.every((c) => addDays(c.lastDone, c.everyDays) !== T)).toBe(true);
  });

  it("les tâches mensuelles ne sont pas toutes dues le même jour", () => {
    const spread = spreadInitialDates([{ everyDays: 14 }, { everyDays: 14 }, { everyDays: 14 }], T);
    expect(new Set(spread.map((c) => c.lastDone)).size).toBe(3);
  });
});
