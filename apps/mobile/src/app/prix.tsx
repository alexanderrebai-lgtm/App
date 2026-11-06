import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { content } from '@muscu/content';
import { dayMonth, num } from '../lib/format';
import { useApp } from '../store/AppState';
import { colors, fonts, radius, space, type as typeScale } from '../theme';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Screen } from '../ui/Screen';
import { T } from '../ui/Text';

/** Modifier les prix : ceux de ton drive remplacent les estimations datées. */
export default function Prices() {
  const { priceOverrides, setPriceOverride } = useApp();
  const [q, setQ] = useState('');
  const items = useMemo(() => content.ingredients.ingredients
    .filter((i) => i.aisle !== 'spice' && content.prices.items[i.id])
    .filter((i) => !q || i.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr')), [q]);
  return (
    <Screen>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => (router.canGoBack() ? router.back() : router.replace('/nutrition'))}
        style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" color={colors.chalk} size={20} />
      </Pressable>
      <View style={{ gap: space.xs }}>
        <T v="title" accessibilityRole="header">Mes prix</T>
        <T v="detail" color={colors.soft}>
          Estimations au {dayMonth(content.prices.asOf)} {content.prices.asOf.slice(0, 4)}, marques distributeur. Remplace-les par ceux de ton drive : la liste de courses et le budget se recalculent.
        </T>
      </View>
      <TextInput value={q} onChangeText={setQ} placeholder="Chercher un produit" placeholderTextColor={colors.mute} accessibilityLabel="Chercher un produit"
        style={[typeScale.body, { color: colors.chalk, backgroundColor: colors.slate, borderRadius: radius.button, paddingHorizontal: 14, minHeight: 48 }]} />
      <Card style={{ gap: space.m }}>
        {items.map((i) => {
          const base = content.prices.items[i.id]!;
          const cur = priceOverrides[i.id] ?? base;
          const perKg = 'perKg' in cur;
          const value = perKg ? (cur as { perKg: number }).perKg : (cur as { perUnit: number }).perUnit;
          return <PriceRow key={`${i.id}-${value}`} name={i.name} unit={perKg ? '€/kg' : '€/pièce'} value={value} edited={!!priceOverrides[i.id]}
            onSave={(v) => setPriceOverride(i.id, perKg ? { perKg: v } : { perUnit: v })} onReset={() => setPriceOverride(i.id, null)} />;
        })}
      </Card>
    </Screen>
  );
}

function PriceRow({ name, unit, value, edited, onSave, onReset }: { name: string; unit: string; value: number; edited: boolean; onSave(v: number): void; onReset(): void }) {
  const [text, setText] = useState(num(value, 2));
  const commit = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v) && v >= 0 && Math.abs(v - value) > 0.001) onSave(Math.round(v * 100) / 100);
    else setText(num(value, 2));
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
      <View style={{ flex: 1 }}>
        <T v="detail">{name}</T>
        {edited ? (
          <Pressable accessibilityRole="button" onPress={() => { onReset(); }} hitSlop={6}>
            <T v="caption" color={colors.neon} style={{ fontFamily: fonts.semibold }}>Prix modifié · rétablir l’estimation</T>
          </Pressable>
        ) : null}
      </View>
      <TextInput value={text} onChangeText={setText} onBlur={commit} onSubmitEditing={commit} keyboardType="decimal-pad" selectTextOnFocus
        accessibilityLabel={`Prix de ${name} en ${unit}`}
        style={[typeScale.body, { width: 76, textAlign: 'right', color: colors.chalk, backgroundColor: colors.night, borderRadius: 10, paddingHorizontal: 10, minHeight: 44 }]} />
      <T v="caption" color={colors.mute} style={{ width: 48 }}>{unit}</T>
    </View>
  );
}
