import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { AimanteDB } from "./db";

describe("mise à jour de la base", () => {
  it("une base de l'étape 1 passe en v2 sans perte", async () => {
    const name = "test-migration";
    const v1 = new Dexie(name);
    v1.version(1).stores({ habits: "id, moment, order", settings: "id" });
    await v1.table("habits").add({ id: "h1", moment: "matin", anchor: "a", action: "b", order: 0 });
    await v1.table("settings").add({ id: "settings", totalDrops: 12, onboardingSeen: false, seededAt: "2026-11-01", reminders: {} });
    v1.close();

    const v2 = new AimanteDB(name);
    const h = await v2.habits.get("h1");
    const s = await v2.settings.get("settings");
    expect(h).toMatchObject({ action: "b", createdOn: "2026-11-01" });
    expect(s).toMatchObject({ totalDrops: 12, lastOpenedOn: "2026-11-01", welcomeBack: null, bedtime: "23:00" });
    await v2.delete();
  });
});
