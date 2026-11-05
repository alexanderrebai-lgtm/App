import { describe, expect, it } from 'vitest';
import { content, recipeById } from '@muscu/content';
import {
  addDays, ingredientGrams, lineCost, menuForDate, menuForDay, plannedMeals, portionFactor, recipeAllowed,
  recipeMacros, scaleQty,
} from '../src';
import { loadPrototype, setProtoProfile } from './prototype';

const P = loadPrototype();

describe('recettes', () => {
  it('macros calculées proches des valeurs du prototype (kcal ±10 %, protéines ±20 %)', () => {
    for (const r of content.recipes) {
      const m = recipeMacros(r);
      expect(Math.abs(m.kcal / r.reference.kcal - 1), r.id).toBeLessThan(0.1);
      expect(Math.abs(m.protein / r.reference.protein - 1), r.id).toBeLessThan(0.2);
      expect(m.carbs + m.fat, r.id).toBeGreaterThan(0);
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
    content.recipes.forEach((r, idx) => {
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

describe('menus', () => {
  it('rotation de 4 semaines identique au prototype (budget serré et normal)', () => {
    for (const bud of [true, false]) {
      setProtoProfile(P, 'd', { prog: 'mass', bud }, '2026-01-05');
      for (let w = 0; w < 4; w++) for (let d = 0; d < 7; d++) {
        const theirs = (P.menuDay(w, d) as number[]).map((i) => content.recipes[i]!.id);
        expect(menuForDay(w, d, bud)).toEqual(theirs);
      }
    }
  });
  it('par date : la rotation repart tous les 28 jours', () => {
    expect(menuForDate('2026-01-05', addDays('2026-01-05', 28), true)).toEqual(menuForDay(0, 0, true));
    expect(menuForDate('2026-01-05', addDays('2026-01-05', 9), false)).toEqual(menuForDay(1, 2, false));
  });
  it('un jour de menu tombe près de la cible', () => {
    const meals = plannedMeals(menuForDay(0, 0, true), 2900);
    const kcal = meals.reduce((a, m) => a + m.macros.kcal, 0);
    expect(Math.abs(kcal / 2900 - 1)).toBeLessThan(0.12);
    expect(meals.map((m) => m.slot)).toEqual([0, 1, 2, 3]);
  });
});
