import { beforeEach, describe, expect, it } from "vitest";
import { addDays } from "../domain/dates";
import {
  addTask,
  cleanAnchor,
  dismissWelcomeBack,
  recordOpening,
  resetOverdueChores,
  saveHabit,
  setHardMode,
  toggleChore,
  toggleHabit,
  toggleMinimum,
  toggleTask,
} from "./actions";
import { AimanteDB } from "./db";
import { ensureSeeded } from "./seed";
import { choreStatus } from "../domain/chores";

const T = "2026-11-06";
let d: AimanteDB;
let n = 0;
beforeEach(async () => {
  d = new AimanteDB(`test-actions-${n++}`);
  await ensureSeeded(d, T);
});
const drops = async () => (await d.settings.get("settings"))!.totalDrops;
const log = (date = T) => d.dayLogs.get(date);

describe("gouttes", () => {
  it("routine : +1, et décocher retire la goutte", async () => {
    const [h] = await d.habits.toArray();
    expect(await toggleHabit(h!.id, T, d)).toBe(true);
    expect(await drops()).toBe(1);
    expect((await log())!.habits).toEqual([h!.id]);
    expect((await log())!.drops).toBe(1);
    expect(await toggleHabit(h!.id, T, d)).toBe(false);
    expect(await drops()).toBe(0);
    expect((await log())!.drops).toBe(0);
  });

  it("tâche obligatoire : +2, secondaire : +1", async () => {
    await addTask("Appeler la banque", "obligatoire", T, d);
    await addTask("Trier les photos", "secondaire", T, d);
    const tasks = await d.tasks.toArray();
    for (const t of tasks) await toggleTask(t.id, T, d);
    expect(await drops()).toBe(3);
    const mandatory = tasks.find((t) => t.kind === "obligatoire")!;
    await toggleTask(mandatory.id, T, d);
    expect(await drops()).toBe(1);
    expect((await d.tasks.get(mandatory.id))!.doneOn).toBeNull();
  });

  it("une tâche reportée cochée aujourd'hui compte pour aujourd'hui", async () => {
    await addTask("Payer la cantine", "obligatoire", addDays(T, -2), d);
    const [t] = await d.tasks.toArray();
    await toggleTask(t!.id, T, d);
    expect((await d.tasks.get(t!.id))!.doneOn).toBe(T);
    expect((await log())!.drops).toBe(2);
  });

  it("ménage : gouttes selon l'effort, et décocher remet la date d'avant", async () => {
    const chore = (await d.chores.toArray()).find((c) => c.effort === 2)!;
    const before = chore.lastDone;
    await toggleChore(chore.id, T, d);
    expect(await drops()).toBe(2);
    expect((await d.chores.get(chore.id))!.lastDone).toBe(T);
    expect(choreStatus((await d.chores.get(chore.id))!, T).daysLeft).toBe(chore.everyDays);
    await toggleChore(chore.id, T, d);
    expect(await drops()).toBe(0);
    expect((await d.chores.get(chore.id))!.lastDone).toBe(before);
  });

  it("minimum du jour : +2 par élément, et signale quand les 3 sont faits", async () => {
    await setHardMode(true, T, d);
    expect((await toggleMinimum("repas", T, d)).all).toBe(false);
    await toggleMinimum("maison", T, d);
    expect((await toggleMinimum("hygiene", T, d)).all).toBe(true);
    expect(await drops()).toBe(6);
    expect((await log())!.hardMode).toBe(true);
  });

  it("le total ne descend jamais sous zéro", async () => {
    const [h] = await d.habits.toArray();
    await toggleHabit(h!.id, T, d);
    await d.settings.update("settings", { totalDrops: 0 });
    await toggleHabit(h!.id, T, d);
    expect(await drops()).toBe(0);
  });

  it("chaque jour a son propre journal", async () => {
    const [h] = await d.habits.toArray();
    await toggleHabit(h!.id, addDays(T, -1), d);
    await toggleHabit(h!.id, T, d);
    expect(await drops()).toBe(2);
    expect((await log(addDays(T, -1)))!.drops).toBe(1);
  });
});

describe("routines", () => {
  it("impose le format Après… je…, sans doublon de mots", async () => {
    await saveHabit({ moment: "soir", anchor: "Après je me brosse les dents,", action: "je pose mes vêtements." }, T, d);
    const h = (await d.habits.toArray()).find((x) => x.anchor === "je me brosse les dents" && x.action === "je pose mes vêtements");
    expect(h).toBeDefined();
    expect(h!.createdOn).toBe(T);
    expect(h!.order).toBe(6);
  });

  it("ignore une routine incomplète", async () => {
    await saveHabit({ moment: "matin", anchor: "  ", action: "boire" }, T, d);
    expect(await d.habits.count()).toBe(6);
  });

  it("nettoie l'ancre", () => {
    expect(cleanAnchor("après le café…")).toBe("le café");
  });
});

describe("retour en douceur", () => {
  it("prépare le message après 3 jours sans ouvrir, puis l'efface", async () => {
    await recordOpening(addDays(T, 1), d);
    expect((await d.settings.get("settings"))!.welcomeBack).toBeNull();
    await recordOpening(addDays(T, 5), d);
    expect((await d.settings.get("settings"))!.welcomeBack).toEqual({ on: addDays(T, 5), daysAway: 4 });
    // Rouvrir le même jour ne change rien.
    await recordOpening(addDays(T, 5), d);
    expect((await d.settings.get("settings"))!.welcomeBack).not.toBeNull();
    await dismissWelcomeBack(d);
    expect((await d.settings.get("settings"))!.welcomeBack).toBeNull();
  });

  it("remet à plat les tâches ménagères en retard", async () => {
    const later = addDays(T, 20);
    const lateBefore = (await d.chores.toArray()).filter((c) => choreStatus(c, later).daysLeft < 0).length;
    expect(lateBefore).toBeGreaterThan(5);
    expect(await resetOverdueChores(later, d)).toBe(lateBefore);
    const after = await d.chores.toArray();
    expect(after.filter((c) => choreStatus(c, later).daysLeft < 0)).toHaveLength(0);
  });
});

describe("traces pour la synchro", () => {
  it("chaque modification met à jour updatedAt", async () => {
    const [h] = await d.habits.toArray();
    expect(typeof (h as unknown as { updatedAt: number }).updatedAt).toBe("number");
    const before = (h as unknown as { updatedAt: number }).updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await d.habits.update(h!.id, { action: "autre" });
    const after = (await d.habits.get(h!.id)) as unknown as { updatedAt: number };
    expect(after.updatedAt).toBeGreaterThan(before);
  });
});

describe("pièces et tâches ménagères", () => {
  it("ajoute une tâche jamais faite, donc à faire tout de suite", async () => {
    const [room] = await d.rooms.toArray();
    await (await import("./actions")).saveChore({ name: "Laver les vitres", roomId: room!.id, everyDays: 0, effort: 3 }, d);
    const c = (await d.chores.toArray()).find((x) => x.name === "Laver les vitres")!;
    expect(c.everyDays).toBe(1);
    expect(c.lastDone).toBeNull();
  });

  it("refuse de retirer une pièce qui contient des tâches", async () => {
    const { deleteRoom, saveRoom } = await import("./actions");
    const [room] = await d.rooms.toArray();
    expect(await deleteRoom(room!.id, d)).toBe(false);
    await saveRoom({ name: "Balcon" }, d);
    const balcon = (await d.rooms.toArray()).find((r) => r.name === "Balcon")!;
    expect(balcon.order).toBe(6);
    expect(await deleteRoom(balcon.id, d)).toBe(true);
    expect(await d.deletions.get(`rooms|${balcon.id}`)).toBeDefined();
  });
});
