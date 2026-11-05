import { describe, expect, it } from 'vitest';
import { budgetStatus, shoppingList, shoppingQty } from '../src';

const base = { week: 0, dailyKcal: 2900, budgetMode: true, weeklyBudget: 30, owned: new Set<string>() };

describe('liste de courses', () => {
  const s = shoppingList(base);

  it('sépare le frais du placard', () => {
    expect(s.fresh.length).toBeGreaterThan(3);
    expect(s.fresh.every((l) => l.ingredient.aisle === 'fresh')).toBe(true);
    expect(s.pantry.every((l) => l.ingredient.aisle !== 'fresh')).toBe(true);
    expect(s.pantry.map((l) => l.ingredient.id)).toContain('rice');
  });

  it('le profil de référence en budget serré reste autour de 25–30 € par semaine', () => {
    for (const week of [0, 1, 2, 3]) {
      const w = shoppingList({ ...base, week });
      expect(w.weekCost).toBeGreaterThan(22);
      expect(w.weekCost).toBeLessThan(33);
    }
    expect(shoppingList({ ...base, budgetMode: false }).weekCost).toBeGreaterThan(s.weekCost);
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
    const cumin = shoppingList({ ...base, budgetMode: false }).pantry.find((l) => l.ingredient.id === 'cumin');
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
