import { afterEach, describe, expect, it } from "vitest";
import { exportAll, importAll, parseBackup } from "./backup";
import { AimanteDB, SCHEMA_VERSION } from "./db";
import { ensureSeeded } from "./seed";

const T = "2026-11-06";
let n = 0;
const dbs: AimanteDB[] = [];
function freshDb() {
  const d = new AimanteDB(`test-backup-${n++}`);
  dbs.push(d);
  return d;
}
afterEach(async () => {
  for (const d of dbs.splice(0)) await d.delete();
});

describe("export et import JSON", () => {
  it("retrouve exactement les mêmes données après un aller-retour", async () => {
    const a = freshDb();
    await ensureSeeded(a, T);
    await a.shoppingItems.add({ id: "s1", name: "Kiwis", aisle: "Fruits & légumes", checked: false, origin: "manuel", createdAt: 1 });
    await a.dayLogs.add({ date: T, habits: ["h"], tasks: [], chores: [], minimum: [], hardMode: false, review: [], drops: 1 });
    await a.settings.update("settings", { totalDrops: 12 });

    const backup = await exportAll(a, new Date("2026-11-06T10:00:00Z"));
    expect(backup.app).toBe("aimante");
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION);

    // Passage par du texte, comme dans un vrai fichier.
    const b = freshDb();
    await ensureSeeded(b, "2020-01-01");
    await importAll(b, JSON.parse(JSON.stringify(backup)));

    const again = await exportAll(b, new Date("2026-11-06T10:00:00Z"));
    expect(again).toEqual(backup);
    expect((await b.settings.get("settings"))?.totalDrops).toBe(12);
    expect(await b.shoppingItems.get("s1")).toMatchObject({ name: "Kiwis" });
  });

  it("refuse un fichier qui n'est pas une sauvegarde, sans rien effacer", async () => {
    const d = freshDb();
    await ensureSeeded(d, T);
    await expect(importAll(d, { hello: "world" })).rejects.toThrow("pas une sauvegarde");
    expect(await d.habits.count()).toBe(6);
  });

  it("refuse une sauvegarde d'une version plus récente", () => {
    expect(() => parseBackup({ app: "aimante", schemaVersion: SCHEMA_VERSION + 1, tables: {} })).toThrow("plus récente");
  });

  it("refuse une sauvegarde abîmée", () => {
    const base = { app: "aimante", schemaVersion: 1, exportedAt: "", tables: { settings: [{ id: "settings" }] } };
    expect(() => parseBackup({ ...base, tables: { ...base.tables, habits: "x" } })).toThrow("n'est pas une liste");
    expect(() => parseBackup({ ...base, tables: { ...base.tables, habits: [{ nom: "sans id" }] } })).toThrow("incomplète");
    expect(() => parseBackup({ ...base, tables: {} })).toThrow("réglages");
  });

  it("accepte une sauvegarde où il manque des tables (listes vides)", () => {
    const b = parseBackup({ app: "aimante", schemaVersion: 1, tables: { settings: [{ id: "settings" }] } });
    expect(b.tables.habits).toEqual([]);
  });
});
