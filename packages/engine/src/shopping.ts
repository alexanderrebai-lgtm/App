import { content as defaultContent, type Content, type Ingredient, type PricesFile, type Unit } from '@muscu/content';
import { plannedMeals } from './nutrition';
import type { Recipe } from '@muscu/content';

export interface ShoppingLine {
  ingredient: Ingredient;
  unit: Unit;
  qty: number;
  /** Coût au prorata de ce qui est consommé dans la semaine. */
  cost: number;
}

/** Coût d'une quantité d'ingrédient, règles du prototype (cuillères : coût forfaitaire). */
export function lineCost(ing: Ingredient, unit: Unit, qty: number, prices: PricesFile): number {
  if (unit === 'tbsp' || unit === 'tsp') return qty * prices.spoonCost;
  const p = prices.items[ing.id];
  if (!p) return 0;
  const g = ing.gramsPerUnit;
  if (unit === 'piece') {
    if ('perUnit' in p) return qty * p.perUnit;
    return g ? (qty * g * p.perKg) / 1000 : 0;
  }
  if ('perKg' in p) return (qty / 1000) * p.perKg;
  return g ? (qty / g) * p.perUnit : 0;
}

/** Coût d'une recette mise à l'échelle. */
export function recipeCost(r: Recipe, factor: number, prices: PricesFile, c: Content = defaultContent): number {
  return r.ingredients.reduce((a, i) => a + lineCost(c.ingredients.ingredients.find((x) => x.id === i.ingredient)!, i.unit, i.qty * factor, prices), 0);
}

/** Prix modifiés par la personne : ils remplacent ceux du fichier daté. */
export type PriceOverrides = Record<string, { perKg: number } | { perUnit: number }>;
export function withPriceOverrides(prices: PricesFile, overrides: PriceOverrides): PricesFile {
  return { ...prices, items: { ...prices.items, ...overrides } };
}

/** Totaux de courses pour une liste de jours (recettes par prise), portions ajustées à la cible. */
export function daysTotals(days: string[][], dailyKcal: number, c: Content = defaultContent, prices: PricesFile = c.prices): Map<string, ShoppingLine> {
  const t = new Map<string, ShoppingLine>();
  for (const day of days) {
    for (const meal of plannedMeals(day, dailyKcal, c)) {
      for (const i of meal.recipe.ingredients) {
        const ing = c.ingredients.ingredients.find((x) => x.id === i.ingredient)!;
        const key = `${i.ingredient}|${i.unit}`;
        const line = t.get(key) ?? { ingredient: ing, unit: i.unit, qty: 0, cost: 0 };
        line.qty += i.qty * meal.factor;
        line.cost += lineCost(ing, i.unit, i.qty * meal.factor, prices);
        t.set(key, line);
      }
    }
  }
  return t;
}

export interface PantryLine extends ShoppingLine {
  owned: boolean;
  packLabel: string;
  packPrice: number;
  /** À payer cette semaine (0 si « j'en ai »). */
  toPay: number;
  /** Durée d'un paquet en semaines, null pour les épices (6 mois et plus). */
  lastsWeeks: number | null;
}

export interface BulkOffer {
  ingredient: Ingredient;
  format: string;
  price: number;
  shelfLife: string;
  lastsWeeks: number;
  saving: number;
}

export interface ShoppingList {
  fresh: ShoppingLine[];
  pantry: PantryLine[];
  bulk: BulkOffer[];
  /** Coût moyen de la semaine, placard compté au prorata. */
  weekCost: number;
  freshCost: number;
  pantryToPay: number;
  budget: BudgetStatus;
}

export type BudgetTip = 'dropSnackTwoDays' | 'lowerTarget150' | 'switchToBudgetMode' | 'buyBulk';
export interface BudgetStatus { within: boolean; budget: number; over: number; tips: BudgetTip[] }

/** Message de budget : dans le budget, ou dépassement avec deux pistes concrètes. */
export function budgetStatus(weekCost: number, budget: number, budgetMode: boolean): BudgetStatus {
  const over = Math.max(0, Math.round((weekCost - budget) * 100) / 100);
  if (over <= 0) return { within: true, budget, over: 0, tips: [] };
  return {
    within: false, budget, over,
    tips: budgetMode ? ['dropSnackTwoDays', 'lowerTarget150'] : ['switchToBudgetMode', 'buyBulk'],
  };
}

export interface ShoppingOptions {
  /** Les 7 jours de la semaine choisie (recettes par prise). */
  days: string[][];
  /** Les 28 jours de la rotation, pour estimer la durée d'un paquet. */
  rotation: string[][];
  dailyKcal: number;
  budgetMode: boolean;
  weeklyBudget: number;
  owned: Set<string>;
  prices?: PricesFile;
}

export function shoppingList(o: ShoppingOptions, c: Content = defaultContent): ShoppingList {
  const prices = o.prices ?? c.prices;
  const T = daysTotals(o.days, o.dailyKcal, c, prices);
  const weeks = Math.max(1, Math.floor(o.rotation.length / 7));
  const all = Array.from({ length: weeks }, (_, w) => daysTotals(o.rotation.slice(w * 7, w * 7 + 7), o.dailyKcal, c, prices));
  const avg = (key: string) => all.reduce((a, w) => a + (w.get(key)?.qty ?? 0), 0) / all.length;
  const fresh: ShoppingLine[] = [];
  const pantry: PantryLine[] = [];
  let weekCost = 0;
  for (const [key, line] of T) {
    weekCost += line.cost;
    if (line.ingredient.aisle === 'fresh') { fresh.push(line); continue; }
    const owned = o.owned.has(line.ingredient.id);
    const pack = prices.packs[line.ingredient.id];
    if (pack) {
      const n = Math.max(1, Math.ceil(line.qty / pack.size));
      pantry.push({
        ...line, owned, packLabel: pack.label, packPrice: pack.price, toPay: owned ? 0 : n * pack.price,
        lastsWeeks: Math.max(1, Math.round(pack.size / Math.max(1, avg(key)))),
      });
    } else {
      pantry.push({
        ...line, owned, packLabel: '1 pot', packPrice: prices.spicePotPrice,
        toPay: owned ? 0 : prices.spicePotPrice, lastsWeeks: null,
      });
    }
  }
  const byName = (a: ShoppingLine, b: ShoppingLine) => a.ingredient.name.localeCompare(b.ingredient.name, 'fr');
  fresh.sort(byName);
  pantry.sort(byName);

  const bulk: BulkOffer[] = [];
  for (const b of prices.bulk) {
    const unit: Unit = b.unit === 'piece' ? 'piece' : 'g';
    const key = `${b.ingredient}|${unit}`;
    const weekly = avg(key);
    if (!weekly) continue;
    const ing = c.ingredients.ingredients.find((x) => x.id === b.ingredient)!;
    const pack = prices.packs[b.ingredient];
    const p = prices.items[b.ingredient];
    const small = pack ? pack.price / pack.size
      : !p ? 0 : unit === 'piece' ? ('perUnit' in p ? p.perUnit : 0) : ('perKg' in p ? p.perKg / 1000 : 0);
    const saving = b.size * small - b.price;
    if (saving > 0.2) {
      bulk.push({ ingredient: ing, format: b.format, price: b.price, shelfLife: b.shelfLife, lastsWeeks: b.size / weekly, saving });
    }
  }
  const freshCost = fresh.reduce((a, l) => a + l.cost, 0);
  const pantryToPay = pantry.reduce((a, l) => a + l.toPay, 0);
  return {
    fresh, pantry, bulk, weekCost, freshCost, pantryToPay,
    budget: budgetStatus(weekCost, o.weeklyBudget, o.budgetMode),
  };
}

/** Quantité affichée dans la liste : g/ml à la dizaine (kg au-delà de 1 000 g), pièces arrondies au-dessus. */
export function shoppingQty(unit: Unit, qty: number): { qty: number; unit: Unit | 'kg' } {
  if (unit === 'g' || unit === 'ml') {
    const q = Math.round(qty / 10) * 10;
    if (unit === 'g' && q >= 1000) return { qty: Math.round(q / 100) / 10, unit: 'kg' };
    return { qty: q, unit };
  }
  return { qty: Math.ceil(qty), unit };
}
