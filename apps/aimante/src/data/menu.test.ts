import { beforeEach, describe, expect, it } from "vitest";
import { addDays } from "../domain/dates";
import { AimanteDB } from "./db";
import { deleteRecipe, fillEmptyDinners, saveRecipe, sendMenuToShopping, setMeal } from "./meals";
import { ensureSeeded } from "./seed";
import {
  addShoppingItem, addStaple, clearCheckedItems, removeShoppingItem, toggleShoppingItem, toggleStaple, updateShoppingItem,
} from "./shopping";

const T = "2026-11-06"; // vendredi, semaine du 2 au 8 novembre
const MON = "2026-11-02";
let d: AimanteDB;
let n = 0;
beforeEach(async () => {
  d = new AimanteDB(`test-menu-${n++}`);
  await ensureSeeded(d, T);
  await d.mealPlan.clear();
  await d.shoppingItems.clear();
});
const names = async () => (await d.shoppingItems.toArray()).map((i) => i.name).sort();

describe("menu", () => {
  it("choisit une recette, un texte libre, puis vide la case", async () => {
    const [r] = await d.recipes.toArray();
    await setMeal(MON, "soir", { recipeId: r!.id }, d);
    expect(await d.mealPlan.get(`${MON}|soir`)).toMatchObject({ recipeId: r!.id, text: null });
    await setMeal(MON, "soir", { text: "  restes " }, d);
    expect(await d.mealPlan.get(`${MON}|soir`)).toMatchObject({ recipeId: null, text: "restes" });
    await setMeal(MON, "soir", null, d);
    expect(await d.mealPlan.get(`${MON}|soir`)).toBeUndefined();
    expect(await d.deletions.get(`mealPlan|${MON}|soir`)).toBeDefined();
  });

  it("un texte libre vide vide la case", async () => {
    await setMeal(MON, "midi", { text: "resto" }, d);
    await setMeal(MON, "midi", { text: "   " }, d);
    expect(await d.mealPlan.count()).toBe(0);
  });

  it("remplit les soirs vides de la semaine affichée, rien d'autre", async () => {
    await setMeal(MON, "soir", { text: "resto" }, d);
    await setMeal(MON, "midi", { text: "restes" }, d);
    expect(await fillEmptyDinners(T, () => 0.3, d)).toBe(6);
    const plan = await d.mealPlan.toArray();
    expect(plan.filter((e) => e.slot === "soir")).toHaveLength(7);
    expect(await d.mealPlan.get(`${MON}|soir`)).toMatchObject({ text: "resto" });
    expect(plan.filter((e) => e.slot === "midi")).toHaveLength(1);
    expect(plan.every((e) => e.date >= MON && e.date <= "2026-11-08")).toBe(true);
    // Une deuxième fois : plus rien à remplir.
    expect(await fillEmptyDinners(T, undefined, d)).toBe(0);
  });

  it("envoie les ingrédients à la liste avec l'étiquette « menu », sans doublon, même en double clic", async () => {
    const recipes = (await d.recipes.toArray()).sort((a, b) => a.name.localeCompare(b.name));
    await setMeal(MON, "soir", { recipeId: recipes.find((r) => r.name.startsWith("Poulet"))!.id }, d);
    await setMeal(addDays(MON, 1), "soir", { recipeId: recipes.find((r) => r.name.startsWith("Wraps"))!.id }, d);
    const first = await sendMenuToShopping(T, d);
    const items = await d.shoppingItems.toArray();
    expect(first).toBe(items.length);
    expect(items.every((i) => i.origin === "menu")).toBe(true);
    // poulet apparaît dans les deux recettes : une seule fois
    expect(items.filter((i) => /poulet/.test(i.name))).toHaveLength(1);
    expect(await sendMenuToShopping(T, d)).toBe(0);
    expect(await d.shoppingItems.count()).toBe(first);
  });

  it("ne duplique pas un article déjà ajouté à la main sous un autre nom", async () => {
    const r = (await d.recipes.toArray()).find((x) => x.name.startsWith("Omelette"))!;
    await setMeal(MON, "soir", { recipeId: r.id }, d);
    await addShoppingItem("Oeufs", d);
    await addShoppingItem("salades", d);
    await sendMenuToShopping(T, d);
    expect(await names()).toEqual(["Oeufs", "pommes de terre", "salades"]);
  });

  it("les semaines voisines ne sont pas touchées", async () => {
    const r = (await d.recipes.toArray())[0]!;
    await setMeal("2026-11-09", "soir", { recipeId: r.id }, d);
    expect(await sendMenuToShopping(T, d)).toBe(0);
  });
});

describe("recettes", () => {
  it("ajoute une recette : un ingrédient par ligne, rayon deviné", async () => {
    await saveRecipe({ name: " Crêpes ", note: "10 min", ingredients: "farine\nlait\n\nœufs\nFarine" }, d);
    const r = (await d.recipes.toArray()).find((x) => x.name === "Crêpes")!;
    expect(r.ingredients).toEqual([
      { name: "farine", aisle: "Épicerie" },
      { name: "lait", aisle: "Frais" },
      { name: "œufs", aisle: "Frais" },
    ]);
  });

  it("modifier garde les rayons connus", async () => {
    await saveRecipe({ name: "Test", note: "", ingredients: "bidule" }, d);
    const r = (await d.recipes.toArray()).find((x) => x.name === "Test")!;
    await d.recipes.update(r.id, { ingredients: [{ name: "bidule", aisle: "Hygiène" }] });
    await saveRecipe({ id: r.id, name: "Test 2", note: "", ingredients: "bidule\nlait" }, d);
    expect((await d.recipes.get(r.id))!.ingredients).toEqual([
      { name: "bidule", aisle: "Hygiène" },
      { name: "lait", aisle: "Frais" },
    ]);
  });

  it("supprimer une recette vide les cases du menu qui l'utilisaient", async () => {
    const [a, b] = await d.recipes.toArray();
    await setMeal(MON, "soir", { recipeId: a!.id }, d);
    await setMeal(MON, "midi", { recipeId: b!.id }, d);
    await deleteRecipe(a!.id, d);
    expect(await d.recipes.get(a!.id)).toBeUndefined();
    expect(await d.mealPlan.get(`${MON}|soir`)).toBeUndefined();
    expect(await d.mealPlan.get(`${MON}|midi`)).toBeDefined();
  });
});

describe("courses", () => {
  it("range automatiquement par rayon, refuse les doublons", async () => {
    expect(await addShoppingItem("  Bananes ", d)).toBe(true);
    expect(await addShoppingItem("banane", d)).toBe(false);
    expect(await addShoppingItem("   ", d)).toBe(false);
    expect(await d.shoppingItems.toArray()).toMatchObject([{ name: "Bananes", aisle: "Fruits & légumes", origin: "manuel" }]);
  });

  it("coche, change de rayon, supprime, retire les cochés", async () => {
    await addShoppingItem("Lait", d);
    await addShoppingItem("Truc", d);
    await addShoppingItem("Pain", d);
    const all = await d.shoppingItems.toArray();
    const byName = (n: string) => all.find((i) => i.name === n)!;
    const [lait, truc, pain] = [byName("Lait"), byName("Truc"), byName("Pain")];
    expect(truc!.aisle).toBe("Autre");
    await updateShoppingItem(truc!.id, { aisle: "Entretien", name: "Éponges" }, d);
    expect(await d.shoppingItems.get(truc!.id)).toMatchObject({ aisle: "Entretien", name: "Éponges" });
    await toggleShoppingItem(lait!.id, d);
    await toggleShoppingItem(pain!.id, d);
    await toggleShoppingItem(pain!.id, d);
    expect((await d.shoppingItems.get(lait!.id))!.checked).toBe(true);
    expect((await d.shoppingItems.get(pain!.id))!.checked).toBe(false);
    expect(await clearCheckedItems(d)).toBe(1);
    await removeShoppingItem(truc!.id, d);
    expect(await names()).toEqual(["Pain"]);
    expect(await d.deletions.count()).toBe(2);
  });

  it("essentiel : un toucher l'ajoute, un second le retire", async () => {
    const staple = (await d.staples.toArray()).find((s) => s.name === "Œufs")!;
    expect(await toggleStaple(staple, d)).toBe(true);
    expect(await d.shoppingItems.toArray()).toMatchObject([{ name: "Œufs", aisle: "Frais", origin: "essentiel" }]);
    expect(await toggleStaple(staple, d)).toBe(false);
    expect(await d.shoppingItems.count()).toBe(0);
  });

  it("essentiel déjà sur la liste sous un autre nom : le toucher le retire", async () => {
    await addShoppingItem("oeufs", d);
    const staple = (await d.staples.toArray()).find((s) => s.name === "Œufs")!;
    expect(await toggleStaple(staple, d)).toBe(false);
    expect(await d.shoppingItems.count()).toBe(0);
  });

  it("essentiel : un article déjà acheté (coché) peut être remis", async () => {
    const staple = (await d.staples.toArray()).find((s) => s.name === "Lait")!;
    await toggleStaple(staple, d);
    const [item] = await d.shoppingItems.toArray();
    await toggleShoppingItem(item!.id, d);
    expect(await toggleStaple(staple, d)).toBe(true);
    expect(await d.shoppingItems.count()).toBe(2);
  });

  it("ajoute un essentiel sans doublon", async () => {
    await addStaple("Sucre", d);
    await addStaple("sucre", d);
    expect((await d.staples.toArray()).filter((s) => s.name.toLowerCase() === "sucre")).toHaveLength(1);
  });
});
