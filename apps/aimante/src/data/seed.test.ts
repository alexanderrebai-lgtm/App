import { afterEach, describe, expect, it } from "vitest";
import { choreStatus } from "../domain/chores";
import { addDays, fromISO } from "../domain/dates";
import { AimanteDB } from "./db";
import { buildSeed, ensureSeeded } from "./seed";

const T = "2026-11-06";
let n = 0;
const dbs: AimanteDB[] = [];
function freshDb() {
  const d = new AimanteDB(`test-seed-${n++}`);
  dbs.push(d);
  return d;
}
afterEach(async () => {
  for (const d of dbs.splice(0)) await d.delete();
});

describe("données de départ", () => {
  it("contient tout ce qui est prévu", () => {
    const s = buildSeed(T);
    expect(s.habits).toHaveLength(6);
    expect(s.habits.filter((h) => h.moment === "matin")).toHaveLength(3);
    expect(s.rooms.map((r) => r.name)).toEqual(["Cuisine", "Salle de bain", "Chambre", "Salon", "Sols", "Linge"]);
    expect(s.chores).toHaveLength(19);
    expect(s.recipes).toHaveLength(10);
    expect(s.staples).toHaveLength(12);
    expect(s.staples.find((x) => x.name === "Œufs")?.aisle).toBe("Frais");
    expect(s.settings.totalDrops).toBe(0);
  });

  it("chaque tâche ménagère appartient à une pièce existante", () => {
    const s = buildSeed(T);
    const ids = new Set(s.rooms.map((r) => r.id));
    expect(s.chores.every((c) => ids.has(c.roomId))).toBe(true);
  });

  it("répartit les tâches hebdomadaires sur la semaine, sans retard", () => {
    const s = buildSeed(T);
    const weekly = s.chores.filter((c) => c.everyDays === 7);
    const weekdays = weekly.map((c) => fromISO(addDays(c.lastDone!, 7)).getDay());
    expect(new Set(weekdays).size).toBe(weekly.length);
    expect(s.chores.every((c) => choreStatus(c, T).daysLeft >= 0)).toBe(true);
  });

  it("prévoit le loyer le 1er et le coiffeur le 3 à 10 h, chaque mois", () => {
    const { events } = buildSeed(T);
    expect(events).toContainEqual(expect.objectContaining({ title: "Payer le loyer", date: "2026-11-01", kind: "a-faire", repeat: "monthly" }));
    expect(events).toContainEqual(expect.objectContaining({ title: "Coiffeur", date: "2026-11-03", time: "10:00", kind: "rdv", repeat: "monthly" }));
  });

  it("les repas prévus pointent vers des recettes existantes", () => {
    const s = buildSeed(T);
    const ids = new Set(s.recipes.map((r) => r.id));
    expect(s.mealPlan.length).toBeGreaterThan(0);
    expect(s.mealPlan.every((m) => m.recipeId && ids.has(m.recipeId) && m.key === `${m.date}|${m.slot}`)).toBe(true);
  });

  it("n'écrit les données qu'une seule fois, même si on l'appelle deux fois en même temps", async () => {
    const d = freshDb();
    const [a, b] = await Promise.all([ensureSeeded(d, T), ensureSeeded(d, T)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await d.habits.count()).toBe(6);
    expect(await d.chores.count()).toBe(19);
    expect(await ensureSeeded(d, T)).toBe(false);
    expect(await d.chores.count()).toBe(19);
  });

  it("ne remet pas les données de départ si l'utilisateur a tout supprimé", async () => {
    const d = freshDb();
    await ensureSeeded(d, T);
    await d.habits.clear();
    await ensureSeeded(d, T);
    expect(await d.habits.count()).toBe(0);
  });
});
