import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { content, programs } from '@muscu/content';
import {
  dayPlan, dayTotals, effectiveTargets, fr, lastDays, mealSplit, menuEntry, waterLiters,
} from '@muscu/engine';
import { DAY_INITIALS, num } from '../../lib/format';
import { useDayMeals } from '../../lib/useNutrition';
import { useApp, useProfile } from '../../store/AppState';
import { colors, fonts, radius, space, type as typeScale } from '../../theme';
import { Button } from '../Button';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { Icon } from '../Icon';
import { Ring } from '../Ring';
import { T } from '../Text';

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line }}>
      <View style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

export function TodayView() {
  const p = useProfile();
  const { today, food, water, addFood, deleteFood, setWater } = useApp();
  const t = effectiveTargets(p);
  const meals = useDayMeals(today);
  const got = dayTotals(food, today);
  const todays = food.filter((f) => f.date === today);
  const training = dayPlan(p, today)?.day.kind === 'training';
  const waterGoal = Math.round(waterLiters(p.weightKg, training) * 1000);
  const waterMl = water.find((w) => w.date === today)?.ml ?? 0;
  const week = lastDays(food, today);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [prot, setProt] = useState('');
  const [tips, setTips] = useState(false);
  const notes = programs.goals[p.goal].nutritionNotes;
  const toNum = (s: string) => Math.max(0, parseFloat(s.replace(',', '.')) || 0);

  return (
    <>
      <View style={{ flexDirection: 'row', gap: space.m }}>
        {[
          { label: 'Calories', v: got.kcal, max: t.kcal, unit: 'kcal', color: colors.coral },
          { label: 'Protéines', v: got.protein, max: t.protein, unit: 'g', color: colors.neon },
        ].map((r) => (
          <Card key={r.label} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${r.label} : ${Math.round(r.v)} sur ${r.max} ${r.unit}`}>
              <Ring size={112} progress={r.v / r.max} color={r.color} stroke={11} />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <T v="heading" style={{ fontFamily: fonts.displayBold }}>{num(Math.round(r.v))}</T>
                <T v="caption" color={colors.mute}>/ {num(r.max)} {r.unit}</T>
              </View>
            </View>
            <T v="detail" color={colors.soft}>{r.label}</T>
          </Card>
        ))}
      </View>
      <Card style={{ gap: space.s }}>
        {[['Glucides', got.carbs, t.carbs, colors.azure], ['Lipides', got.fat, t.fat, colors.soft]].map(([l, v, m, c]) => (
          <View key={l as string} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T v="detail">{l as string}</T>
              <T v="detail" color={colors.mute}>{Math.round(v as number)} / {m as number} g</T>
            </View>
            <Bar value={v as number} max={m as number} color={c as string} />
          </View>
        ))}
        <T v="caption" color={colors.mute}>{got.kcal < t.kcal ? `Il te reste ${num(Math.round(t.kcal - got.kcal))} kcal.` : 'Objectif atteint.'}</T>
      </Card>

      <View style={{ gap: space.s }}>
        <T v="heading">Menu du jour</T>
        <Card style={{ gap: 0, paddingVertical: space.xs }}>
          {meals.map((m, i) => {
            const eaten = todays.find((f) => f.menuSlot === m.slot);
            return (
              <View key={m.slot} style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!eaten }} aria-checked={!!eaten} accessibilityLabel={`${fr.mealSlots[m.slot]} mangé`}
                  onPress={() => (eaten?.id ? deleteFood(eaten.id) : addFood(menuEntry(m, today, p.id)))}
                  style={{ width: 32, height: 32, borderRadius: 8, borderWidth: eaten ? 0 : 2, borderColor: colors.line, backgroundColor: eaten ? colors.neon : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {eaten ? <Icon name="check" size={18} color={colors.night} strokeWidth={3} /> : null}
                </Pressable>
                <Pressable style={{ flex: 1 }} accessibilityRole="button" onPress={() => router.push(`/recette/${m.recipe.id}?f=${m.factor}`)}>
                  <T v="caption" color={colors.mute}>{fr.mealSlots[m.slot]}</T>
                  <T style={{ fontFamily: fonts.medium }}>{m.recipe.name}</T>
                </Pressable>
                <T v="detail" color={colors.mute}>{num(m.macros.kcal)} kcal</T>
              </View>
            );
          })}
        </Card>
        <T v="caption" color={colors.mute}>Coche un repas quand tu l’as mangé : il s’ajoute à tes calories.</T>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T v="heading">Eau</T>
          <T v="detail" color={colors.mute}>{num(waterMl / 1000, 2)} / {num(waterGoal / 1000, 1)} L</T>
        </View>
        <Bar value={waterMl} max={waterGoal} color={colors.azure} />
        <View style={{ flexDirection: 'row', gap: space.s }}>
          <Button label="− 25 cl" variant="secondary" style={{ flex: 1 }} onPress={() => setWater(today, waterMl - 250)} />
          <Button label="+ 25 cl" variant="secondary" style={{ flex: 1 }} onPress={() => setWater(today, waterMl + 250)} />
        </View>
      </Card>

      <View style={{ gap: space.s }}>
        <T v="heading">Ajout rapide</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {content.nutrition.quickFoods.map((q) => (
            <Chip key={q.name} label={q.name} selected={false} onPress={() => addFood({ date: today, name: q.name, kcal: q.kcal, protein: q.protein, carbs: q.carbs, fat: q.fat })} />
          ))}
        </View>
      </View>

      <Card>
        <T v="heading">Ajouter un aliment</T>
        <TextInput value={name} onChangeText={setName} placeholder="Aliment ou repas" placeholderTextColor={colors.mute} accessibilityLabel="Nom de l’aliment"
          style={[typeScale.body, { color: colors.chalk, backgroundColor: colors.night, borderRadius: radius.button, paddingHorizontal: 14, minHeight: 48 }]} />
        <View style={{ flexDirection: 'row', gap: space.s }}>
          {[[kcal, setKcal, 'kcal'], [prot, setProt, 'Protéines (g)']].map(([v, set, ph]) => (
            <TextInput key={ph as string} value={v as string} onChangeText={set as (s: string) => void} placeholder={ph as string} placeholderTextColor={colors.mute}
              keyboardType="decimal-pad" accessibilityLabel={ph as string}
              style={[typeScale.body, { flex: 1, minWidth: 0, color: colors.chalk, backgroundColor: colors.night, borderRadius: radius.button, paddingHorizontal: 14, minHeight: 48 }]} />
          ))}
        </View>
        <Button label="Ajouter" disabled={!toNum(kcal)} onPress={async () => {
          await addFood({ date: today, name: name.trim() || 'Aliment', kcal: Math.round(toNum(kcal)), protein: Math.round(toNum(prot)) });
          setName(''); setKcal(''); setProt('');
        }} />
      </Card>

      {todays.length ? (
        <Card style={{ gap: space.s }}>
          <T v="heading">Aujourd’hui</T>
          {todays.map((f) => (
            <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
              <T v="detail" style={{ flex: 1 }}>{f.name}</T>
              <T v="detail" color={colors.mute}>{num(Math.round(f.kcal))} kcal · {Math.round(f.protein)} g</T>
              <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer ${f.name}`} onPress={() => f.id && deleteFood(f.id)} hitSlop={10}
                style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={colors.mute} />
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <T v="heading">7 derniers jours</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 110 }} accessible
          accessibilityLabel={`Calories des 7 derniers jours : ${week.map((d) => Math.round(d.kcal)).join(', ')}`}>
          {week.map((d) => (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ width: '100%', height: 84, justifyContent: 'flex-end' }}>
                <View style={{ height: `${Math.min(100, (d.kcal / (t.kcal * 1.2)) * 100)}%`, borderRadius: 4, backgroundColor: d.kcal >= t.kcal * 0.9 ? colors.neon : colors.coral, opacity: d.kcal ? 1 : 0.2, minHeight: 4 }} />
              </View>
              <T v="caption" color={colors.mute}>{DAY_INITIALS[(new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7]}</T>
            </View>
          ))}
        </View>
        {(() => {
          const logged = week.filter((d) => d.kcal > 0);
          return logged.length
            ? <T v="detail" color={colors.soft}>Moyenne des jours notés : {num(Math.round(logged.reduce((a, d) => a + d.kcal, 0) / logged.length))} kcal (objectif {num(t.kcal)}).</T>
            : <T v="detail" color={colors.mute}>Note tes repas pour voir ta moyenne.</T>;
        })()}
      </Card>

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: tips }} onPress={() => setTips(!tips)}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T v="heading">Mes repères</T>
            <T v="detail" color={colors.neon}>{tips ? 'Masquer' : 'Afficher'}</T>
          </View>
          {tips ? (
            <View style={{ gap: space.s }}>
              {mealSplit(t).map((m, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T v="detail">{fr.mealSlots[i]}</T>
                  <T v="detail" color={colors.mute}>{num(m.kcal)} kcal · {m.protein} g prot. · {m.carbs} g gluc. · {m.fat} g lip.</T>
                </View>
              ))}
              <T v="label" color={colors.mute} style={{ marginTop: space.s }}>Avant la séance</T>
              <T v="detail" color={colors.soft}>{notes.before}</T>
              <T v="label" color={colors.mute}>Après la séance</T>
              <T v="detail" color={colors.soft}>{notes.after}</T>
              <T v="label" color={colors.mute}>Ajustement</T>
              <T v="detail" color={colors.soft}>{notes.adjust}</T>
            </View>
          ) : null}
        </Card>
      </Pressable>
    </>
  );
}
