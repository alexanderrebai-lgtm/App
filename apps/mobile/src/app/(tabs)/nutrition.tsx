import { View } from 'react-native';
import { programs } from '@muscu/content';
import { effectiveTargets, fr, mealSplit, waterLiters } from '@muscu/engine';
import { num } from '../../lib/format';
import { useProfile } from '../../store/AppState';
import { colors, space } from '../../theme';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { T } from '../../ui/Text';

export default function Nutrition() {
  const p = useProfile();
  const t = effectiveTargets(p);
  const notes = programs.goals[p.goal].nutritionNotes;
  return (
    <Screen>
      <T v="title" accessibilityRole="header">Nutrition</T>
      <Card hero>
        <T v="label" color={colors.neon}>{programs.goals[p.goal].name}</T>
        <T v="number">{num(t.kcal)} <T v="body" color={colors.mute}>kcal par jour</T></T>
        <T v="detail" color={colors.soft}>{t.protein} g de protéines · {t.carbs} g de glucides · {t.fat} g de lipides</T>
        <T v="detail" color={colors.soft}>Eau : {num(waterLiters(p.weightKg, false), 1)} L, {num(waterLiters(p.weightKg, true), 1)} L les jours de séance.</T>
      </Card>
      <View style={{ gap: space.m }}>
        <T v="heading">Tes 4 repas</T>
        <Card style={{ gap: space.s }}>
          {mealSplit(t).map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
              <T style={{ flex: 1 }}>{fr.mealSlots[i]}</T>
              <T color={colors.soft}>{num(m.kcal)} kcal · {m.protein} g prot.</T>
            </View>
          ))}
        </Card>
      </View>
      <View style={{ gap: space.m }}>
        <T v="heading">Autour de la séance</T>
        <Card><T v="label" color={colors.mute}>Avant</T><T v="detail" color={colors.soft}>{notes.before}</T></Card>
        <Card><T v="label" color={colors.mute}>Après</T><T v="detail" color={colors.soft}>{notes.after}</T></Card>
      </View>
      <T v="detail" color={colors.mute}>Menus, recettes, liste de courses et suivi des calories arrivent dans une prochaine version.</T>
    </Screen>
  );
}
