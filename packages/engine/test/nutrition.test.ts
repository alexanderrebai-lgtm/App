import { describe, expect, it } from 'vitest';
import { content, recipeById } from '@muscu/content';
import {
  addDays, batchPlan, dayTotals, ingredientGrams, lastDays, lineCost, menuEntry, menuForDate, menuForDay, nextRecipe,
  plannedMeals, portionFactor, recipeAllowed, recipeMacros, recipePools, rotationDays, scaleQty, SLOT_CATEGORY,
  type MenuPrefs,
} from '../src';
import { loadPrototype } from './prototype';

const P = loadPrototype();

describe('recettes', () => {
  it('macros calculées proches des valeurs du prototype (kcal ±10 %, protéines ±20 %)', () => {
    for (const r of content.recipes) {
      const m = recipeMacros(r);
      expect(m.carbs + m.fat, r.id).toBeGreaterThan(0);
      if (!r.reference) continue;
      expect(Math.abs(m.kcal / r.reference.kcal - 1), r.id).toBeLessThan(0.1);
      expect(Math.abs(m.protein / r.reference.protein - 1), r.id).toBeLessThan(0.2);
    }
  });

  it('portion bornée de 0,7 à 1,6, au dixième', () => {
    expect(portionFactor(620, 2900, 0.25)).toBe(1.2);
    expect(portionFactor(300, 4000, 0.3)).toBe(1.6);
    expect(portionFactor(900, 1500, 0.15)).toBe(0.7);
  });

  it('mise à l’échelle des quantités identique au prototype', () => {
    for (const r of P.RC) {
      const mine = recipeById.get(content.recipes[P.RC.indexOf(r)]!.id)!;
      for (const m of [0.7, 1, 1.3, 1.6]) {
        const theirs: string[] = P.sc(r[5], m);
        mine.ingredients.forEach((i, k) => {
          const q = Number(theirs[k]!.split(' ')[0]!.replace(',', '.'));
          expect(scaleQty(i, m), `${mine.id} ${k} ×${m}`).toBe(q);
        });
      }
    }
  });

  it('coût d’une portion de base proche du prototype (±3 %, œufs durs fusionnés avec œufs)', () => {
    content.recipes.filter((r) => r.reference).forEach((r, idx) => {
      const mine = r.ingredients.reduce((a, i) => a + lineCost(content.ingredients.ingredients.find((x) => x.id === i.ingredient)!, i.unit, i.qty, content.prices), 0);
      const theirs = P.costOf(P.RC[idx][5], 1);
      expect(Math.abs(mine - theirs), r.id).toBeLessThan(Math.max(0.05, theirs * 0.03));
    });
  });

  it('grammes : cuillères et pièces', () => {
    expect(ingredientGrams({ ingredient: 'egg', qty: 3, unit: 'piece' })).toBe(150);
    expect(ingredientGrams({ ingredient: 'soy-sauce', qty: 1, unit: 'tbsp' })).toBe(15);
  });

  it('filtres de profil', () => {
    const chili = recipeById.get('chili-de-boeuf-aux-haricots-rouges')!;
    expect(recipeAllowed(chili, { dietTags: ['vegetarian'], excludedIngredients: [] })).toBe(false);
    expect(recipeAllowed(chili, { dietTags: ['noPork'], excludedIngredients: [] })).toBe(true);
    expect(recipeAllowed(chili, { dietTags: [], excludedIngredients: ['kidney-beans'] })).toBe(false);
  });
});

const BUDGET: MenuPrefs = { budgetMode: true, dietTags: [], excludedIngredients: [] };
const NORMAL: MenuPrefs = { ...BUDGET, budgetMode: false };

describe('menus', () => {
  it('chaque prise sert une recette de la bonne catégorie, jamais le même plat midi et soir', () => {
    for (const prefs of [BUDGET, NORMAL]) {
      for (const day of rotationDays(prefs)) {
        day.forEach((id, slot) => expect(recipeById.get(id)!.category).toBe(SLOT_CATEGORY[slot]));
        expect(day[1]).not.toBe(day[3]);
      }
    }
  });
  it('budget serré : uniquement des recettes « budget » ; les 4 semaines sont différentes', () => {
    const days = rotationDays(BUDGET);
    expect(days.flat().every((id) => recipeById.get(id)!.tags.includes('budget'))).toBe(true);
    const weeks = [0, 1, 2, 3].map((w) => JSON.stringify(days.slice(w * 7, w * 7 + 7)));
    expect(new Set(weeks).size).toBe(4);
  });
  it('filtres : végétarien, allergies, plats exclus, favoris', () => {
    const veg = rotationDays({ ...NORMAL, dietTags: ['vegetarian'] }).flat();
    expect(veg.every((id) => recipeById.get(id)!.tags.includes('vegetarian'))).toBe(true);
    const noEgg = rotationDays({ ...NORMAL, excludedIngredients: ['egg'] }).flat();
    expect(noEgg.some((id) => recipeById.get(id)!.ingredients.some((i) => i.ingredient === 'egg'))).toBe(false);
    const pools = recipePools({ ...NORMAL, excludedRecipes: ['pates-bolognaise'], favoriteRecipes: ['chili-de-boeuf-aux-haricots-rouges'] });
    expect(pools.main).not.toContain('pates-bolognaise');
    expect(pools.main.filter((x) => x === 'chili-de-boeuf-aux-haricots-rouges')).toHaveLength(2);
  });
  it('un filtre trop strict ne laisse jamais une prise vide', () => {
    const strict = { ...BUDGET, dietTags: ['vegetarian' as const], excludedIngredients: ['egg', 'milk', 'oats', 'fromage-blanc', 'plain-yogurt'] };
    for (const day of rotationDays(strict)) expect(day.every(Boolean)).toBe(true);
  });
  it('par date : la rotation repart tous les 28 jours, les changements de plat priment', () => {
    expect(menuForDate('2026-01-05', addDays('2026-01-05', 28), BUDGET)).toEqual(menuForDay(0, 0, BUDGET));
    expect(menuForDate('2026-01-05', addDays('2026-01-05', 9), NORMAL)).toEqual(menuForDay(1, 2, NORMAL));
    const d = '2026-01-07';
    const base = menuForDate('2026-01-05', d, NORMAL);
    const other = nextRecipe(base[1]!, 1, NORMAL, [base[3]!]);
    expect(other).not.toBe(base[1]);
    expect(recipeById.get(other)!.category).toBe('main');
    expect(menuForDate('2026-01-05', d, NORMAL, { [`${d}|1`]: other })[1]).toBe(other);
  });
  it('un jour de menu tombe près de la cible', () => {
    for (const day of rotationDays(BUDGET)) {
      const kcal = plannedMeals(day, 2900).reduce((a, m) => a + m.macros.kcal, 0);
      expect(Math.abs(kcal / 2900 - 1)).toBeLessThan(0.2);
    }
  });
});

describe('suivi des calories', () => {
  const e = (date: string, kcal: number, protein: number) => ({ profileId: 'p', date, name: 'x', kcal, protein, carbs: 10, fat: 5 });
  it('totaux du jour, menu mangé, 7 derniers jours', () => {
    const entries = [e('2026-01-10', 500, 30), e('2026-01-10', 300, 20), e('2026-01-08', 1000, 50)];
    expect(dayTotals(entries, '2026-01-10')).toEqual({ kcal: 800, protein: 50, carbs: 20, fat: 10 });
    const meal = plannedMeals(menuForDay(0, 0, BUDGET), 2900)[1]!;
    expect(menuEntry(meal, '2026-01-10', 'p')).toMatchObject({ menuSlot: 1, kcal: meal.macros.kcal, name: meal.recipe.name });
    const h = lastDays(entries, '2026-01-10');
    expect(h).toHaveLength(7);
    expect(h.at(-1)).toEqual({ date: '2026-01-10', kcal: 800, protein: 50 });
    expect(h.at(-3)!.kcal).toBe(1000);
  });
  it('plan de batch cooking : plats « batch » servis au moins deux fois', () => {
    const plan = batchPlan([['pates-bolognaise', 'chili-de-boeuf-aux-haricots-rouges'], ['pates-bolognaise'], ['riz-cantonais-au-poulet']]);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ portions: 2, days: [0, 1] });
  });
});
