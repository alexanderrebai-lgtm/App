import { useMemo } from 'react';
import { content } from '@muscu/content';
import {
  addDays, effectiveTargets, mealCount, mealPlan, menuForDate, menuPrefsFor, mondayOf, plannedMeals, rotationDays, withPriceOverrides,
  type IsoDate, type MenuPrefs,
} from '@muscu/engine';
import { useApp, useProfile } from '../store/AppState';

/** Préférences de menu du profil : budget, régime, allergies, plats favoris et exclus. */
export function useMenuPrefs(): MenuPrefs {
  const p = useProfile();
  const { recipePrefs } = useApp();
  return useMemo(() => {
    const ids = Object.entries(recipePrefs);
    return menuPrefsFor(p, {
      excludedRecipes: ids.filter(([, v]) => v === 'excluded').map(([k]) => k),
      favoriteRecipes: ids.filter(([, v]) => v === 'favorite').map(([k]) => k),
    });
  }, [p.budgetMode, p.dietTags, p.excludedIngredients, p.mealsPerDay, p.hardGainer, p.goal, p.maxCookMinutes, recipePrefs]);
}

/** Noms des prises de la journée (3 à 6 repas selon le profil). */
export function useMealNames(): string[] {
  const p = useProfile();
  return mealPlan(mealCount(p)).names;
}

/** Repas prévus d'une date, portions ajustées à la cible du profil. */
export function useDayMeals(date: IsoDate) {
  const p = useProfile();
  const { menuOverrides } = useApp();
  const prefs = useMenuPrefs();
  const kcal = effectiveTargets(p).kcal;
  return useMemo(() => plannedMeals(menuForDate(p.startDate, date, prefs, menuOverrides), kcal), [p.startDate, date, prefs, menuOverrides, kcal]);
}

/** Les 7 jours d'une semaine (lundi en premier) et la rotation complète, pour la liste de courses. */
export function useWeekMenus(monday: IsoDate) {
  const p = useProfile();
  const { menuOverrides, priceOverrides } = useApp();
  const prefs = useMenuPrefs();
  return useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => addDays(mondayOf(monday), i));
    return {
      dates,
      days: dates.map((d) => menuForDate(p.startDate, d, prefs, menuOverrides)),
      rotation: rotationDays(prefs),
      prices: withPriceOverrides(content.prices, priceOverrides),
    };
  }, [monday, p.startDate, prefs, menuOverrides, priceOverrides]);
}
