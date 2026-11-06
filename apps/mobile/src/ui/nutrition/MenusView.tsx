import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { addDays, batchPlan, effectiveTargets, fr, mondayOf, nextRecipe, plannedMeals, recipeCost, type Slot } from '@muscu/engine';
import { euros } from '../../lib/food';
import { longDate, num } from '../../lib/format';
import { useMenuPrefs, useWeekMenus } from '../../lib/useNutrition';
import { useApp, useProfile } from '../../store/AppState';
import { colors, fonts, space } from '../../theme';
import { Card } from '../Card';
import { Segmented } from '../Segmented';
import { T } from '../Text';
import { WeekChips } from './WeekChips';

export function MenusView() {
  const p = useProfile();
  const { today, saveProfile, setMenuOverride, menuOverrides } = useApp();
  const [w, setW] = useState(0);
  const prefs = useMenuPrefs();
  const { dates, days, prices } = useWeekMenus(addDays(mondayOf(today), 7 * w));
  const kcal = effectiveTargets(p).kcal;
  const batch = batchPlan(days);
  return (
    <>
      <Segmented<'budget' | 'normal'> value={p.budgetMode ? 'budget' : 'normal'}
        options={[{ key: 'budget', label: 'Budget serré' }, { key: 'normal', label: 'Menus normaux' }]}
        onChange={(k) => saveProfile({ ...p, budgetMode: k === 'budget' })} />
      <WeekChips today={today} value={w} onChange={setW} />
      <T v="detail" color={colors.mute}>Quantités ajustées à ta cible de {num(kcal)} kcal. Touche un plat pour la recette, « Changer » pour un autre plat.</T>

      {batch.length ? (
        <Card style={{ borderWidth: 1, borderColor: colors.azure }}>
          <T v="label" color={colors.azure}>Batch cooking du dimanche</T>
          {batch.map((b) => (
            <Pressable key={b.recipe.id} accessibilityRole="button" onPress={() => router.push(`/recette/${b.recipe.id}`)}>
              <T v="detail">{b.recipe.name} : {b.portions} portions{b.recipe.tags.includes('freezable') ? ', se congèle' : ', 3 jours au frigo'}</T>
            </Pressable>
          ))}
          <T v="caption" color={colors.mute}>Cuisine ces plats en une fois et garde-les en boîtes.</T>
        </Card>
      ) : null}

      {days.map((day, di) => {
        const date = dates[di]!;
        const meals = plannedMeals(day, kcal);
        const total = meals.reduce((a, m) => a + m.macros.kcal, 0);
        const prot = meals.reduce((a, m) => a + m.macros.protein, 0);
        const cost = meals.reduce((a, m) => a + recipeCost(m.recipe, m.factor, prices), 0);
        return (
          <Card key={date} style={{ gap: space.s, borderWidth: date === today ? 2 : 0, borderColor: colors.neon }}>
            <View style={{ gap: 2 }}>
              <T v="heading">{longDate(date, true)}</T>
              <T v="caption" color={colors.mute}>{num(total)} kcal · {prot} g de protéines · ≈ {euros(cost)}</T>
            </View>
            {meals.map((m) => {
              const key = `${date}|${m.slot}`;
              return (
                <View key={m.slot} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 44 }}>
                  <Pressable style={{ flex: 1 }} accessibilityRole="button" onPress={() => router.push(`/recette/${m.recipe.id}?f=${m.factor}`)}>
                    <T v="caption" color={colors.mute}>{fr.mealSlots[m.slot]}{menuOverrides[key] ? ' · changé' : ''}</T>
                    <T v="detail" style={{ fontFamily: fonts.medium }}>{m.recipe.name} <T v="caption" color={colors.mute}>×{num(m.factor, 1)}</T></T>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Changer le plat : ${fr.mealSlots[m.slot]} du ${longDate(date)}`} hitSlop={6}
                    onPress={() => setMenuOverride(date, m.slot, nextRecipe(m.recipe.id, m.slot as Slot, prefs, day))}
                    style={{ minHeight: 44, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' }}>
                    <T v="caption" style={{ fontFamily: fonts.semibold }}>Changer</T>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        );
      })}
    </>
  );
}
