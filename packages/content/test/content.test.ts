import { describe, expect, it } from 'vitest';
import {
  content, exerciseById, ingredientById, recipeById, GoalId,
} from '../src';

const goals = GoalId.options;

describe('contenus migrés du prototype', () => {
  it('garde toutes les recettes et tous les exercices', () => {
    expect(content.recipes.filter((r) => r.reference)).toHaveLength(27);
    expect(content.exercises.exercises).toHaveLength(90);
    expect(content.exercises.techniques).toHaveLength(8);
  });

  it('chaque recette a une astuce de goût, des étapes et des ingrédients connus', () => {
    for (const r of content.recipes) {
      expect(r.tasteTip.length).toBeGreaterThan(10);
      for (const i of r.ingredients) expect(ingredientById.has(i.ingredient), `${r.id}: ${i.ingredient}`).toBe(true);
    }
  });

  it('les identifiants sont uniques', () => {
    expect(new Set(content.recipes.map((r) => r.id)).size).toBe(content.recipes.length);
    expect(new Set(content.exercises.exercises.map((e) => e.id)).size).toBe(content.exercises.exercises.length);
  });

  it('chaque objectif a 3 phases de 4 séances qui ne citent que des exercices connus', () => {
    for (const g of goals) {
      const t = content.programs.templates[g];
      expect(t).toHaveLength(3);
      for (const phase of t) {
        expect(phase).toHaveLength(4);
        for (const s of phase) for (const p of s) expect(exerciseById.has(p.exercise), p.exercise).toBe(true);
      }
    }
    for (const p of [...content.programs.recovery.mobility.items, ...content.programs.recovery.walk.items]) {
      expect(exerciseById.has(p.exercise)).toBe(true);
    }
  });

  it('les groupes de remplacement ne citent que des exercices connus', () => {
    for (const g of content.exercises.substitutions) for (const id of g) expect(exerciseById.has(id), id).toBe(true);
  });

  it('au moins 60 recettes, chacune réalisable en budget serré ou en menu normal', () => {
    expect(content.recipes.length).toBeGreaterThanOrEqual(60);
    for (const cat of ['breakfast', 'main', 'snack'] as const) {
      const all = content.recipes.filter((r) => r.category === cat);
      expect(all.filter((r) => r.tags.includes('budget')).length, cat).toBeGreaterThanOrEqual(5);
      expect(all.filter((r) => r.tags.includes('vegetarian')).length, cat).toBeGreaterThanOrEqual(4);
    }
    expect(content.menus.mealShares.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('chaque produit de placard a un format d’achat', () => {
    for (const i of content.ingredients.ingredients) if (i.aisle === 'pantry') expect(content.prices.packs[i.id], i.id).toBeDefined();
  });

  it('chaque ingrédient hors épices a un prix', () => {
    for (const i of content.ingredients.ingredients) {
      if (i.aisle === 'spice') continue;
      expect(content.prices.items[i.id], i.id).toBeDefined();
    }
    for (const b of content.prices.bulk) expect(ingredientById.has(b.ingredient)).toBe(true);
    for (const id of Object.keys(content.prices.packs)) expect(ingredientById.has(id), id).toBe(true);
  });

  it('les ingrédients comptés à la pièce ont un poids unitaire', () => {
    for (const r of content.recipes) for (const i of r.ingredients) {
      if (i.unit === 'piece') expect(ingredientById.get(i.ingredient)!.gramsPerUnit, i.ingredient).toBeDefined();
    }
  });

  it('les compléments par défaut existent', () => {
    const ids = new Set(content.supplements.supplements.map((s) => s.id));
    for (const g of goals) for (const id of content.supplements.defaults[g]) expect(ids.has(id)).toBe(true);
  });
});

describe('matériel maison et exclusions', () => {
  const home = content.equipment.home;
  it('les remplacements maison existent et n’utilisent que le matériel disponible', () => {
    for (const [from, alts] of Object.entries(home.alternatives)) {
      expect(exerciseById.has(from), from).toBe(true);
      expect(home.available).not.toContain(exerciseById.get(from)!.equipment);
      for (const a of alts) {
        expect(exerciseById.has(a), a).toBe(true);
        expect(home.available, a).toContain(exerciseById.get(a)!.equipment);
      }
    }
  });
  it('chaque exercice de salle a un remplacement maison', () => {
    for (const e of content.exercises.exercises) {
      if (!home.available.includes(e.equipment)) expect(home.alternatives[e.id], e.id).toBeDefined();
    }
  });
  it('les allergies citent des ingrédients connus', () => {
    for (const a of content.exclusions.allergies) for (const i of a.ingredients) expect(ingredientById.has(i), i).toBe(true);
  });
});
