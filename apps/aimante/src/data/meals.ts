import { guessAisle } from "../domain/aisles";
import { newId } from "../domain/ids";
import { ingredientsToAdd, mealKey, menuIngredients, parseIngredients, pickDinners } from "../domain/meals";
import { weekDays } from "../domain/dates";
import type { ISODate, MealSlot } from "../domain/types";
import { db as defaultDb, removeRows } from "./db";

/** Choisit une recette, un texte libre, ou vide la case (`null`). */
export async function setMeal(
  date: ISODate,
  slot: MealSlot,
  value: { recipeId: string } | { text: string } | null,
  database = defaultDb,
): Promise<void> {
  const key = mealKey(date, slot);
  const text = value && "text" in value ? value.text.trim() : "";
  if (!value || ("text" in value && !text)) {
    await removeRows(database, "mealPlan", [key]);
    return;
  }
  await database.mealPlan.put({
    key,
    date,
    slot,
    recipeId: "recipeId" in value ? value.recipeId : null,
    text: "text" in value ? text : null,
  });
}

/** Remplit les soirs vides de la semaine de `weekOf`. Renvoie le nombre de soirs remplis. */
export async function fillEmptyDinners(weekOf: ISODate, rng?: () => number, database = defaultDb): Promise<number> {
  const days = weekDays(weekOf);
  return database.transaction("rw", [database.mealPlan, database.recipes], async () => {
    const [plan, recipes] = await Promise.all([
      database.mealPlan.where("date").between(days[0]!, days[6]!, true, true).toArray(),
      database.recipes.toArray(),
    ]);
    const picks = pickDinners({ days, plan, recipes: recipes.sort((a, b) => a.name.localeCompare(b.name, "fr")), rng });
    await database.mealPlan.bulkPut(
      picks.map((p) => ({ key: mealKey(p.date, "soir"), date: p.date, slot: "soir" as const, recipeId: p.recipeId, text: null })),
    );
    return picks.length;
  });
}

/**
 * Ajoute à la liste de courses les ingrédients des recettes de la semaine,
 * sans doublon, avec l'étiquette « menu ». Renvoie le nombre d'articles ajoutés.
 */
export async function sendMenuToShopping(weekOf: ISODate, database = defaultDb): Promise<number> {
  const days = weekDays(weekOf);
  return database.transaction("rw", [database.mealPlan, database.recipes, database.shoppingItems], async () => {
    const [plan, recipes, items] = await Promise.all([
      database.mealPlan.where("date").between(days[0]!, days[6]!, true, true).toArray(),
      database.recipes.toArray(),
      database.shoppingItems.toArray(),
    ]);
    const toAdd = ingredientsToAdd(menuIngredients(plan, recipes), items);
    const now = Date.now();
    await database.shoppingItems.bulkAdd(
      toAdd.map((ing, i) => ({ id: newId(), name: ing.name, aisle: ing.aisle, checked: false, origin: "menu" as const, createdAt: now + i })),
    );
    return toAdd.length;
  });
}

/* ---------- Recettes ---------- */

export async function saveRecipe(
  input: { id?: string; name: string; note: string; ingredients: string },
  database = defaultDb,
): Promise<void> {
  const name = input.name.trim();
  if (!name) return;
  const previous = input.id ? await database.recipes.get(input.id) : undefined;
  const ingredients = parseIngredients(input.ingredients, guessAisle, previous?.ingredients);
  const fields = { name, note: input.note.trim(), ingredients };
  if (input.id) await database.recipes.update(input.id, fields);
  else await database.recipes.add({ id: newId(), ...fields });
}

/** Supprime une recette et vide les cases du menu qui l'utilisaient. */
export async function deleteRecipe(id: string, database = defaultDb): Promise<void> {
  await database.transaction("rw", [database.recipes, database.mealPlan, database.deletions], async () => {
    const used = (await database.mealPlan.toArray()).filter((e) => e.recipeId === id).map((e) => e.key);
    await removeRows(database, "mealPlan", used);
    await removeRows(database, "recipes", [id]);
  });
}
