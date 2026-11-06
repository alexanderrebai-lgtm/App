import { describe, expect, it } from 'vitest';
import { budgetStatus, recipeCost, rotationDays, shoppingList, shoppingQty, withPriceOverrides, type MenuPrefs } from '../src';
import { content, recipeById } from '@muscu/content';

const prefs = (budgetMode: boolean): MenuPrefs => ({ budgetMode, dietTags: [], excludedIngredients: [] });
const rot = { true: rotationDays(prefs(true)), false: rotationDays(prefs(false)) };
const week = (budgetMode: boolean, w: number) => ({ days: rot[`${budgetMode}`].slice(w * 7, w * 7 + 7), rotation: rot[`${budgetMode}`], budgetMode });
const base = { ...week(true, 0), dailyKcal: 2900, weeklyBudget: 30, owned: new Set<string>() };

describe('liste de courses', () => {
  const s = shoppingList(base);

  it('sépare le frais du placard', () => {
    expect(s.fresh.length).toBeGreaterThan(3);
    expect(s.fresh.every((l) => l.ingredient.aisle === 'fresh')).toBe(true);
    expect(s.pantry.every((l) => l.ingredient.aisle !== 'fresh')).toBe(true);
    expect(s.pantry.map((l) => l.ingredient.id)).toContain('rice');
  });

  it('budget serré : autour de 25–30 € par semaine, un peu plus en prise de masse avec deux pistes', () => {
    for (const wk of [0, 1, 2, 3]) {
      // 2 600 kcal (force, explosivité, cardio) : dans le budget de 30 € à 1 € près
      const lean = shoppingList({ ...base, ...week(true, wk), dailyKcal: 2600 });
      expect(lean.weekCost, `semaine ${wk + 1} à 2 600 kcal`).toBeLessThan(31);
      expect(lean.weekCost).toBeGreaterThan(20);
      // 2 900 kcal (prise de masse) : légèrement au-dessus, avec le message et deux pistes
      const mass = shoppingList({ ...base, ...week(true, wk) });
      expect(mass.weekCost, `semaine ${wk + 1} à 2 900 kcal`).toBeLessThan(34);
      if (!mass.budget.within) expect(mass.budget.tips).toHaveLength(2);
    }
    expect(shoppingList({ ...base, ...week(false, 0) }).weekCost).toBeGreaterThan(s.weekCost);
  });

  it('« j’en ai » : rien à payer pour ce produit', () => {
    const rice = s.pantry.find((l) => l.ingredient.id === 'rice')!;
    expect(rice.toPay).toBeGreaterThan(0);
    expect(rice.lastsWeeks).toBeGreaterThanOrEqual(1);
    const owned = shoppingList({ ...base, owned: new Set(['rice']) });
    expect(owned.pantry.find((l) => l.ingredient.id === 'rice')!.toPay).toBe(0);
    expect(owned.pantryToPay).toBeCloseTo(s.pantryToPay - rice.toPay);
  });

  it('épices : un pot, dure plus de 6 mois', () => {
    const all = [0, 1, 2, 3].flatMap((w) => shoppingList({ ...base, ...week(false, w) }).pantry);
    const cumin = all.find((l) => l.ingredient.aisle === 'spice' && l.unit === 'tsp');
    expect(cumin).toMatchObject({ packPrice: 2.5, lastsWeeks: null });
  });

  it('achats en grande quantité : économie positive et durée', () => {
    expect(s.bulk.length).toBeGreaterThan(3);
    for (const b of s.bulk) { expect(b.saving).toBeGreaterThan(0.2); expect(b.lastsWeeks).toBeGreaterThan(0); }
    const oil = s.bulk.find((b) => b.ingredient.id === 'oil')!;
    expect(oil.saving).toBeCloseTo(3.5); // 5 × 3 € − 11,50 €
  });
});

describe('budget', () => {
  it('dans le budget : pas de piste', () => {
    expect(budgetStatus(27, 30, true)).toEqual({ within: true, budget: 30, over: 0, tips: [] });
  });
  it('dépassé : message et deux pistes', () => {
    expect(budgetStatus(33.5, 30, true)).toMatchObject({ within: false, over: 3.5, tips: ['dropSnackTwoDays', 'lowerTarget150'] });
    expect(budgetStatus(45, 30, false).tips).toEqual(['switchToBudgetMode', 'buyBulk']);
  });
  it('budget modifiable', () => {
    expect(shoppingList({ ...base, weeklyBudget: 20 }).budget.within).toBe(false);
    expect(shoppingList({ ...base, weeklyBudget: 40 }).budget.within).toBe(true);
  });
});

it('quantités affichées', () => {
  expect(shoppingQty('g', 1234)).toEqual({ qty: 1.2, unit: 'kg' });
  expect(shoppingQty('g', 453)).toEqual({ qty: 450, unit: 'g' });
  expect(shoppingQty('piece', 6.2)).toEqual({ qty: 7, unit: 'piece' });
});

describe('prix', () => {
  it('coût d’une recette mise à l’échelle', () => {
    const r = recipeById.get('lentilles-corail-epicees')!;
    expect(recipeCost(r, 1.5, content.prices)).toBeCloseTo(recipeCost(r, 1, content.prices) * 1.5, 5);
  });
  it('les prix modifiés remplacent ceux du fichier', () => {
    const cheap = withPriceOverrides(content.prices, { rice: { perKg: 0 } });
    const a = shoppingList(base);
    const b = shoppingList({ ...base, prices: cheap });
    expect(b.fresh.length).toBe(a.fresh.length);
    expect(b.weekCost).toBeLessThan(a.weekCost);
    expect(content.prices.items.rice).toEqual({ perKg: 1.7 });
  });
});
