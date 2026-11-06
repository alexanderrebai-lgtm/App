import { ingredientById, type Recipe, type RecipeIngredient, type Unit } from '@muscu/content';
import { scaleQty } from '@muscu/engine';
import { num } from './format';

export const CATEGORY_FR: Record<Recipe['category'], string> = { breakfast: 'Petit-déj', main: 'Plat', snack: 'Collation' };
export const TAG_FR: Record<string, string> = { budget: 'Budget', vegetarian: 'Végétarien', batch: 'Batch cooking', freezable: 'Congelable', noPork: 'Sans porc' };

export function euros(x: number): string {
  return `${num(x, 2)} €`;
}

const UNIT_FR: Record<Unit | 'kg', string> = { g: 'g', ml: 'ml', piece: '', tbsp: 'c. à soupe', tsp: 'c. à café', kg: 'kg' };

export function qtyLabel(qty: number, unit: Unit | 'kg'): string {
  const q = num(qty, qty % 1 ? (unit === 'kg' ? 1 : 1) : 0);
  return UNIT_FR[unit] ? `${q} ${UNIT_FR[unit]}` : q;
}

/** « 120 g escalope de poulet », « 1,5 banane » */
export function ingredientLine(i: RecipeIngredient, factor: number): string {
  const name = i.label ?? ingredientById.get(i.ingredient)?.name ?? i.ingredient;
  return `${qtyLabel(scaleQty(i, factor), i.unit)} ${name}`;
}
