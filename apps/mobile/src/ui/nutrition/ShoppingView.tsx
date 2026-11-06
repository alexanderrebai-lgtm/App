import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { addDays, effectiveTargets, fr, mondayOf, shoppingList, shoppingQty } from '@muscu/engine';
import { content } from '@muscu/content';
import { euros, qtyLabel } from '../../lib/food';
import { dayMonth } from '../../lib/format';
import { useWeekMenus } from '../../lib/useNutrition';
import { useApp, useProfile } from '../../store/AppState';
import { colors, fonts, space } from '../../theme';
import { Button } from '../Button';
import { Card } from '../Card';
import { Stepper } from '../Stepper';
import { T } from '../Text';
import { WeekChips } from './WeekChips';

export function ShoppingView() {
  const p = useProfile();
  const { today, pantry, togglePantry, saveProfile, priceOverrides } = useApp();
  const [w, setW] = useState(0);
  const { days, rotation, prices } = useWeekMenus(addDays(mondayOf(today), 7 * w));
  const list = shoppingList({
    days, rotation, dailyKcal: effectiveTargets(p).kcal, budgetMode: p.budgetMode,
    weeklyBudget: p.weeklyBudgetEur, owned: new Set(pantry), prices,
  });
  const edited = Object.keys(priceOverrides).length;
  return (
    <>
      <WeekChips today={today} value={w} onChange={setW} />
      <Card hero style={{ backgroundColor: list.budget.within ? colors.neon : colors.coral }}>
        <T v="label" color={colors.night}>Semaine · 1 personne · {p.budgetMode ? 'budget serré' : 'menus normaux'}</T>
        <T v="title" color={colors.night}>≈ {euros(list.weekCost)} par semaine</T>
        <T v="detail" color={colors.night}>
          {list.budget.within
            ? `Dans ton budget de ${p.weeklyBudgetEur} € (placard compté au prorata).`
            : `${euros(list.budget.over)} au-dessus de ton budget de ${p.weeklyBudgetEur} €. Deux pistes :`}
        </T>
        {list.budget.tips.map((t) => <T key={t} v="detail" color={colors.night}>• {fr.budgetTips[t]}</T>)}
        <T v="caption" color={colors.night}>Cette semaine tu paies : frais {euros(list.freshCost)} + placard {euros(list.pantryToPay)} = {euros(list.freshCost + list.pantryToPay)}</T>
        {list.pantryToPay > list.freshCost ? (
          <T v="caption" color={colors.night}>La première fois, tu remplis le placard (épices, huile, riz…). Ensuite, coche « J’en ai » : tu ne paies plus que le frais et ce qui est vide.</T>
        ) : null}
      </Card>
      <Stepper label="Mon budget par semaine" unit="€" value={p.weeklyBudgetEur} step={1} min={15} max={100} onChange={(v) => saveProfile({ ...p, weeklyBudgetEur: v })} />

      <View style={{ gap: space.s }}>
        <T v="heading">À acheter chaque semaine</T>
        <T v="caption" color={colors.mute}>Frais et surgelés.</T>
        <Card style={{ gap: space.s }}>
          {list.fresh.map((l) => {
            const q = shoppingQty(l.unit, l.qty);
            return (
              <View key={`${l.ingredient.id}|${l.unit}`} style={{ flexDirection: 'row', gap: space.m }}>
                <T v="detail" style={{ flex: 1 }}>{l.ingredient.name}</T>
                <T v="detail" color={colors.soft}>{qtyLabel(q.qty, q.unit)}</T>
                <T v="detail" color={colors.mute} style={{ minWidth: 64, textAlign: 'right' }}>{euros(l.cost)}</T>
              </View>
            );
          })}
        </Card>
      </View>

      <View style={{ gap: space.s }}>
        <T v="heading">Placard</T>
        <T v="caption" color={colors.mute}>À racheter quand c’est vide. Touche « J’en ai » : il disparaît de ce que tu paies.</T>
        <Card style={{ gap: space.m }}>
          {list.pantry.map((l) => (
            <View key={`${l.ingredient.id}|${l.unit}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
              <View style={{ flex: 1 }}>
                <T v="detail">{l.ingredient.name}</T>
                <T v="caption" color={colors.mute}>{l.packLabel} · {euros(l.packPrice)} · dure ≈ {l.lastsWeeks ? `${l.lastsWeeks} sem.` : '6 mois et +'}</T>
              </View>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: l.owned }} onPress={() => togglePantry(l.ingredient.id)}
                style={{ minHeight: 36, paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center', borderWidth: 1, borderColor: l.owned ? colors.neon : colors.line, backgroundColor: l.owned ? colors.neon : 'transparent' }}>
                <T v="caption" color={l.owned ? colors.night : colors.chalk} style={{ fontFamily: fonts.semibold }}>{l.owned ? 'J’en ai' : 'À acheter'}</T>
              </Pressable>
              <T v="detail" color={colors.mute} style={{ minWidth: 56, textAlign: 'right' }}>{l.owned ? '—' : euros(l.toPay)}</T>
            </View>
          ))}
        </Card>
      </View>

      {list.bulk.length ? (
        <Card>
          <T v="heading">Achats en grande quantité</T>
          <T v="caption" color={colors.mute}>Pour ce qui se garde : moins cher au kilo, calculé pour ton rythme.</T>
          {list.bulk.map((b) => (
            <View key={b.ingredient.id} style={{ flexDirection: 'row', gap: space.m }}>
              <View style={{ flex: 1 }}>
                <T v="detail">{b.ingredient.name} · {b.format}</T>
                <T v="caption" color={colors.mute}>{euros(b.price)} · dure {b.lastsWeeks >= 52 ? '1 an et +' : `≈ ${Math.round(b.lastsWeeks)} sem.`} · {b.shelfLife}</T>
              </View>
              <T v="detail" color={colors.neon}>−{euros(b.saving)}</T>
            </View>
          ))}
          <T v="detail" color={colors.soft}>
            Premier gros achat : {euros(list.bulk.reduce((a, b) => a + b.price, 0))}, économie estimée {euros(list.bulk.reduce((a, b) => a + b.saving, 0))} sur la durée.
          </T>
        </Card>
      ) : null}

      <View style={{ gap: space.s }}>
        <T v="caption" color={colors.mute}>
          Prix estimés au {dayMonth(content.prices.asOf)} {content.prices.asOf.slice(0, 4)} (marques distributeur en drive). {edited ? `${edited} prix modifié${edited > 1 ? 's' : ''} par toi.` : ''}
        </T>
        <Button label="Modifier les prix" variant="secondary" onPress={() => router.push('/prix')} />
      </View>
    </>
  );
}
