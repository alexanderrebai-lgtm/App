import { dedupeKey, guessAisle } from "../domain/aisles";
import { newId } from "../domain/ids";
import type { Aisle, ShoppingItem, Staple } from "../domain/types";
import { db as defaultDb, removeRows } from "./db";

/** Ajoute un article rangé automatiquement par rayon. Renvoie false s'il est déjà sur la liste. */
export async function addShoppingItem(name: string, database = defaultDb): Promise<boolean> {
  const n = name.trim();
  if (!n) return false;
  return database.transaction("rw", database.shoppingItems, async () => {
    const items = await database.shoppingItems.toArray();
    if (items.some((i) => !i.checked && dedupeKey(i.name) === dedupeKey(n))) return false;
    await database.shoppingItems.add({
      id: newId(), name: n, aisle: guessAisle(n), checked: false, origin: "manuel", createdAt: Date.now(),
    });
    return true;
  });
}

export async function toggleShoppingItem(id: string, database = defaultDb): Promise<void> {
  await database.transaction("rw", database.shoppingItems, async () => {
    const item = await database.shoppingItems.get(id);
    if (item) await database.shoppingItems.update(id, { checked: !item.checked });
  });
}

export async function updateShoppingItem(id: string, patch: { name?: string; aisle?: Aisle }, database = defaultDb): Promise<void> {
  const fields: { name?: string; aisle?: Aisle } = {};
  if (patch.name !== undefined && patch.name.trim()) fields.name = patch.name.trim();
  if (patch.aisle) fields.aisle = patch.aisle;
  if (Object.keys(fields).length) await database.shoppingItems.update(id, fields);
}

export const removeShoppingItem = (id: string, database = defaultDb) => removeRows(database, "shoppingItems", [id]);

/** Retire tous les articles cochés. Renvoie leur nombre. */
export async function clearCheckedItems(database = defaultDb): Promise<number> {
  const checked = (await database.shoppingItems.toArray()).filter((i) => i.checked).map((i) => i.id);
  await removeRows(database, "shoppingItems", checked);
  return checked.length;
}

/**
 * Un toucher sur un essentiel l'ajoute à la liste, un second le retire.
 * Renvoie true si l'article est maintenant sur la liste.
 */
export async function toggleStaple(staple: Staple, database = defaultDb): Promise<boolean> {
  return database.transaction("rw", [database.shoppingItems, database.deletions], async () => {
    const items = await database.shoppingItems.toArray();
    const existing = items.find((i) => !i.checked && dedupeKey(i.name) === dedupeKey(staple.name));
    if (existing) {
      await removeRows(database, "shoppingItems", [existing.id]);
      return false;
    }
    await database.shoppingItems.add({
      id: newId(), name: staple.name, aisle: staple.aisle, checked: false, origin: "essentiel", createdAt: Date.now(),
    });
    return true;
  });
}

export async function addStaple(name: string, database = defaultDb): Promise<void> {
  const n = name.trim();
  if (!n) return;
  const all = await database.staples.toArray();
  if (all.some((s) => dedupeKey(s.name) === dedupeKey(n))) return;
  await database.staples.add({
    id: newId(), name: n, aisle: guessAisle(n), order: all.reduce((m, s) => Math.max(m, s.order), -1) + 1,
  });
}

export const removeStaple = (id: string, database = defaultDb) => removeRows(database, "staples", [id]);

export function stapleInList(staple: Pick<Staple, "name">, items: ShoppingItem[]): boolean {
  return items.some((i) => !i.checked && dedupeKey(i.name) === dedupeKey(staple.name));
}
