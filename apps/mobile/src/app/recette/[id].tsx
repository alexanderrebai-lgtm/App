import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { content, recipeById } from '@muscu/content';
import { PORTION_MAX, PORTION_MIN, recipeCost, recipeMacros, scaleMacros, withPriceOverrides } from '@muscu/engine';
import { CATEGORY_FR, euros, ingredientLine, TAG_FR } from '../../lib/food';
import { num } from '../../lib/format';
import { useApp } from '../../store/AppState';
import { colors, fonts, space } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import { T } from '../../ui/Text';

export default function RecipeScreen() {
  const { id, f } = useLocalSearchParams<{ id: string; f?: string }>();
  const r = id ? recipeById.get(id) : undefined;
  const { today, addFood, recipePrefs, setRecipePref, priceOverrides } = useApp();
  const [factor, setFactor] = useState(() => {
    const x = parseFloat(f ?? '1');
    return Number.isFinite(x) ? Math.min(PORTION_MAX, Math.max(PORTION_MIN, x)) : 1;
  });
  const [added, setAdded] = useState(false);
  const close = (
    <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => (router.canGoBack() ? router.back() : router.replace('/nutrition'))}
      style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="close" color={colors.chalk} size={20} />
    </Pressable>
  );
  if (!r) return <Screen>{close}<T v="title">Recette introuvable</T></Screen>;
  const m = scaleMacros(recipeMacros(r), factor);
  const pref = recipePrefs[r.id];
  const step = (d: number) => setFactor((x) => Math.round(Math.min(PORTION_MAX, Math.max(PORTION_MIN, x + d)) * 10) / 10);
  return (
    <Screen footer={<Button label={added ? 'Ajouté à tes calories' : 'Ajouter à mes calories du jour'} disabled={added}
      onPress={async () => { await addFood({ date: today, name: r.name, ...m }); setAdded(true); }} />}>
      {close}
      <View style={{ gap: space.s }}>
        <T v="label" color={colors.mute}>{CATEGORY_FR[r.category]} · {r.minutes} min · ≈ {euros(recipeCost(r, factor, withPriceOverrides(content.prices, priceOverrides)))}</T>
        <T v="title" accessibilityRole="header">{r.name}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {r.tags.filter((t) => t !== 'noPork').map((t) => (
            <View key={t} style={{ backgroundColor: colors.neonSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <T v="caption" color={colors.neon} style={{ fontFamily: fonts.semibold }}>{TAG_FR[t]}</T>
            </View>
          ))}
        </View>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[[`${num(m.kcal)}`, 'kcal'], [`${m.protein} g`, 'protéines'], [`${m.carbs} g`, 'glucides'], [`${m.fat} g`, 'lipides']].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <T v="heading" style={{ fontFamily: fonts.displayBold }}>{v}</T>
              <T v="caption" color={colors.mute}>{l}</T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Portion plus petite" onPress={() => step(-0.1)}
            style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><T v="heading">−</T></Pressable>
          <T style={{ flex: 1, textAlign: 'center' }}>Portion ×{num(factor, 1)} <T v="caption" color={colors.mute}>(de 0,7 à 1,6)</T></T>
          <Pressable accessibilityRole="button" accessibilityLabel="Portion plus grande" onPress={() => step(0.1)}
            style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><T v="heading">+</T></Pressable>
        </View>
      </Card>

      <View style={{ gap: space.s }}>
        <T v="heading">Ingrédients</T>
        <Card style={{ gap: space.s }}>
          {r.ingredients.map((i, k) => <T key={k} v="detail">{ingredientLine(i, factor)}</T>)}
        </Card>
      </View>

      <View style={{ gap: space.s }}>
        <T v="heading">Préparation</T>
        {r.steps.map((s, k) => (
          <View key={k} style={{ flexDirection: 'row', gap: space.s }}>
            <T color={colors.neon} style={{ fontFamily: fonts.displayBold }}>{k + 1}</T>
            <T v="detail" color={colors.soft} style={{ flex: 1 }}>{s}</T>
          </View>
        ))}
      </View>

      <Card style={{ backgroundColor: colors.slateHi }}>
        <T v="label" color={colors.coral}>Astuce goût</T>
        <T color={colors.chalk}>{r.tasteTip}</T>
      </Card>

      <View style={{ flexDirection: 'row', gap: space.s }}>
        <Button label={pref === 'favorite' ? 'Favori · retirer' : 'Mettre en favori'} variant="secondary" style={{ flex: 1 }}
          onPress={() => setRecipePref(r.id, pref === 'favorite' ? null : 'favorite')} />
        <Button label={pref === 'excluded' ? 'Proposer à nouveau' : 'Ne plus proposer'} variant="secondary" style={{ flex: 1 }}
          onPress={() => setRecipePref(r.id, pref === 'excluded' ? null : 'excluded')} />
      </View>
    </Screen>
  );
}
