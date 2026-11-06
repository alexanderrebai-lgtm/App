import { describe, expect, it } from "vitest";
import { dedupeKey, guessAisle } from "./aisles";
import { ingredientsToAdd, mealKey, mealLabel, menuIngredients, parseIngredients, pickDinners, plannedCount } from "./meals";
import type { MealPlanEntry, Recipe, ShoppingItem } from "./types";

const recipe = (id: string, ings: string[]): Recipe => ({
  id, name: `Recette ${id}`, note: "", ingredients: ings.map((name) => ({ name, aisle: guessAisle(name) })),
});
const entry = (date: string, slot: "midi" | "soir", recipeId: string | null, text: string | null = null): MealPlanEntry => ({
  key: mealKey(date, slot), date, slot, recipeId, text,
});
const item = (name: string, checked = false): ShoppingItem => ({
  id: name, name, aisle: "Autre", checked, origin: "manuel", createdAt: 0,
});

const DAYS = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"];

describe("clé anti-doublon", () => {
  it("ignore majuscules, accents et pluriel", () => {
    expect(dedupeKey("Bananes")).toBe(dedupeKey("banane"));
    expect(dedupeKey("Œufs")).toBe(dedupeKey("oeuf"));
    expect(dedupeKey("Pâtes")).toBe(dedupeKey("pates"));
    expect(dedupeKey("Riz")).toBe("riz");
    expect(dedupeKey("tomates")).not.toBe(dedupeKey("tomates concassées"));
  });
});

describe("ingrédients du menu", () => {
  const recipes = [
    recipe("a", ["pâtes", "oignon", "thon en boîte"]),
    recipe("b", ["Oignons", "riz", "poulet"]),
    recipe("c", ["lentilles"]),
  ];

  it("réunit les ingrédients sans doublon, dans l'ordre des repas", () => {
    const plan = [entry("2026-11-03", "soir", "b"), entry("2026-11-02", "soir", "a"), entry("2026-11-02", "midi", null, "restes")];
    expect(menuIngredients(plan, recipes).map((i) => i.name)).toEqual(["pâtes", "oignon", "thon en boîte", "riz", "poulet"]);
  });

  it("la même recette deux fois ne double rien", () => {
    const plan = [entry("2026-11-02", "soir", "a"), entry("2026-11-04", "soir", "a")];
    expect(menuIngredients(plan, recipes)).toHaveLength(3);
  });

  it("ignore les recettes supprimées et les textes libres", () => {
    expect(menuIngredients([entry("2026-11-02", "soir", "zzz"), entry("2026-11-03", "soir", null, "resto")], recipes)).toEqual([]);
  });

  it("n'ajoute pas ce qui est déjà sur la liste, sans doublon non plus après un second envoi", () => {
    const wanted = menuIngredients([entry("2026-11-02", "soir", "a")], recipes);
    const list = [item("Pâtes"), item("OIGNONS")];
    expect(ingredientsToAdd(wanted, list).map((i) => i.name)).toEqual(["thon en boîte"]);
    expect(ingredientsToAdd(wanted, [...list, item("thon en boîte")])).toEqual([]);
  });

  it("un article déjà coché peut être ajouté de nouveau", () => {
    expect(ingredientsToAdd([{ name: "riz", aisle: "Épicerie" }], [item("riz", true)])).toHaveLength(1);
  });
});

describe("cases du menu", () => {
  const recipes = [recipe("a", [])];
  it("texte libre ou nom de recette", () => {
    expect(mealLabel(entry("d", "soir", null, "restes"), recipes)).toBe("restes");
    expect(mealLabel(entry("d", "soir", "a"), recipes)).toBe("Recette a");
    expect(mealLabel(entry("d", "soir", "zzz"), recipes)).toBeNull();
    expect(mealLabel(undefined, recipes)).toBeNull();
  });
  it("compte les repas prévus", () => {
    expect(plannedCount([entry("d", "soir", "a"), entry("d", "midi", null, "x"), entry("e", "soir", "zzz")], recipes)).toBe(2);
  });
});

describe("remplir les cases vides", () => {
  const recipes = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => recipe(id, []));

  it("remplit tous les soirs vides et seulement eux", () => {
    const plan = [entry(DAYS[1]!, "soir", "a"), entry(DAYS[2]!, "soir", null, "resto"), entry(DAYS[0]!, "midi", "b")];
    const picks = pickDinners({ days: DAYS, plan, recipes });
    expect(picks.map((p) => p.date)).toEqual([DAYS[0], DAYS[3], DAYS[4], DAYS[5], DAYS[6]]);
  });

  it("varie : aucune recette deux fois tant qu'il en reste d'autres", () => {
    for (let seed = 0; seed < 30; seed++) {
      let s = seed + 1;
      const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const picks = pickDinners({ days: DAYS, plan: [], recipes, rng });
      expect(picks).toHaveLength(7);
      expect(new Set(picks.map((p) => p.recipeId)).size).toBe(7);
    }
  });

  it("ne répète pas la recette de la veille ni celle du midi", () => {
    const two = recipes.slice(0, 2);
    const plan = [entry(DAYS[0]!, "soir", "a"), entry(DAYS[1]!, "midi", "b")];
    const picks = pickDinners({ days: DAYS.slice(0, 3), plan, recipes: two, rng: () => 0 });
    // Jour 2 : la veille est « a », le midi est « b » : tout est à éviter, on prend quand même.
    expect(picks.map((p) => p.date)).toEqual([DAYS[1], DAYS[2]]);
    expect(picks[1]!.recipeId).not.toBe(picks[0]!.recipeId);
  });

  it("une seule recette : elle est utilisée partout, sans erreur", () => {
    expect(pickDinners({ days: DAYS, plan: [], recipes: recipes.slice(0, 1) })).toHaveLength(7);
  });

  it("aucune recette : rien à proposer", () => {
    expect(pickDinners({ days: DAYS, plan: [], recipes: [] })).toEqual([]);
  });

  it("une semaine déjà pleine ne change pas", () => {
    const full = DAYS.map((d) => entry(d, "soir", "a"));
    expect(pickDinners({ days: DAYS, plan: full, recipes })).toEqual([]);
  });
});

describe("saisie des ingrédients", () => {
  it("une ligne par ingrédient, sans doublon ni ligne vide, rayon conservé", () => {
    const known = [{ name: "sauce", aisle: "Autre" as const }];
    const out = parseIngredients("pâtes\n\n  - Sauce \nPÂTES\nlait", guessAisle, known);
    expect(out).toEqual([
      { name: "pâtes", aisle: "Épicerie" },
      { name: "Sauce", aisle: "Autre" },
      { name: "lait", aisle: "Frais" },
    ]);
  });
});
