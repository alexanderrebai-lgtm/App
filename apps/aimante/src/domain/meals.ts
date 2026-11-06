import { dedupeKey } from "./aisles";
import type { Ingredient, ISODate, MealPlanEntry, MealSlot, Recipe, ShoppingItem } from "./types";

export const mealKey = (date: ISODate, slot: MealSlot) => `${date}|${slot}`;

/** Texte à afficher dans une case du menu, ou null si elle est vide. */
export function mealLabel(entry: MealPlanEntry | undefined, recipes: Recipe[]): string | null {
  if (!entry) return null;
  if (entry.text) return entry.text;
  return recipes.find((r) => r.id === entry.recipeId)?.name ?? null;
}

/** Nombre de repas prévus (recette ou texte libre) parmi les entrées données. */
export function plannedCount(plan: MealPlanEntry[], recipes: Recipe[]): number {
  return plan.filter((e) => mealLabel(e, recipes) !== null).length;
}

/**
 * Ingrédients des recettes du menu, sans doublon (accents, majuscules et
 * pluriel ignorés), dans l'ordre des repas. Les textes libres n'en ont pas.
 */
export function menuIngredients(plan: MealPlanEntry[], recipes: Recipe[]): Ingredient[] {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const ordered = [...plan].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.slot === b.slot ? 0 : a.slot === "midi" ? -1 : 1),
  );
  const seen = new Set<string>();
  const out: Ingredient[] = [];
  for (const entry of ordered) {
    const recipe = entry.recipeId ? byId.get(entry.recipeId) : undefined;
    for (const ing of recipe?.ingredients ?? []) {
      const key = dedupeKey(ing.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(ing);
    }
  }
  return out;
}

/**
 * Parmi les ingrédients voulus, ceux qui ne sont pas déjà sur la liste. Un
 * article déjà coché (acheté) ne compte pas : on peut en avoir besoin à nouveau.
 */
export function ingredientsToAdd(wanted: Ingredient[], existing: ShoppingItem[]): Ingredient[] {
  const have = new Set(existing.filter((i) => !i.checked).map((i) => dedupeKey(i.name)));
  return wanted.filter((ing) => !have.has(dedupeKey(ing.name)));
}

/**
 * Propose une recette pour chaque soir vide de la semaine, en variant :
 * on prend toujours parmi les recettes les moins utilisées cette semaine, et
 * on évite celle de la veille et celle du midi quand il y a le choix.
 */
export function pickDinners(opts: {
  days: ISODate[];
  plan: MealPlanEntry[];
  recipes: Recipe[];
  rng?: () => number;
}): { date: ISODate; recipeId: string }[] {
  const { days, plan, recipes } = opts;
  const rng = opts.rng ?? Math.random;
  if (!recipes.length) return [];

  const usage = new Map(recipes.map((r) => [r.id, 0]));
  for (const e of plan) {
    if (e.recipeId && days.includes(e.date) && usage.has(e.recipeId)) usage.set(e.recipeId, usage.get(e.recipeId)! + 1);
  }
  const at = (date: ISODate, slot: MealSlot) => plan.find((e) => e.date === date && e.slot === slot);
  const dinner = new Map<ISODate, string | null>();
  for (const d of days) dinner.set(d, at(d, "soir")?.recipeId ?? null);

  const picks: { date: ISODate; recipeId: string }[] = [];
  days.forEach((date, i) => {
    const slot = at(date, "soir");
    if (slot && (slot.recipeId || slot.text)) return; // déjà prévu
    const min = Math.min(...usage.values());
    let pool = recipes.filter((r) => usage.get(r.id) === min);
    const avoid = new Set([dinner.get(days[i - 1]!) ?? null, at(date, "midi")?.recipeId ?? null, dinner.get(days[i + 1]!) ?? null]);
    const varied = pool.filter((r) => !avoid.has(r.id));
    if (varied.length) pool = varied;
    else {
      // Les moins utilisées sont toutes « à éviter » : on prend la moins utilisée parmi les autres.
      const allowed = recipes.filter((r) => !avoid.has(r.id));
      if (allowed.length) {
        const lowest = Math.min(...allowed.map((r) => usage.get(r.id)!));
        pool = allowed.filter((r) => usage.get(r.id) === lowest);
      }
    }
    const chosen = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
    usage.set(chosen.id, usage.get(chosen.id)! + 1);
    dinner.set(date, chosen.id);
    picks.push({ date, recipeId: chosen.id });
  });
  return picks;
}

/** Une ligne par ingrédient : retire les lignes vides et les doublons, garde le rayon déjà connu. */
export function parseIngredients(
  text: string,
  guess: (name: string) => Ingredient["aisle"],
  known: Ingredient[] = [],
): Ingredient[] {
  const knownAisle = new Map(known.map((i) => [dedupeKey(i.name), i.aisle]));
  const seen = new Set<string>();
  const out: Ingredient[] = [];
  for (const raw of text.split("\n")) {
    const name = raw.trim().replace(/^[-•*]\s*/, "");
    const key = dedupeKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, aisle: knownAisle.get(key) ?? guess(name) });
  }
  return out;
}
