import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { isLowReadiness, type Soreness } from '@muscu/engine';
import { useApp } from '../store/AppState';
import { colors, fonts, radius, space } from '../theme';
import { Card } from './Card';
import { T } from './Text';

const SORENESS: [Soreness, string][] = [['none', 'Aucune'], ['light', 'Légères'], ['strong', 'Fortes']];

function Choice({ label, on, onPress, a11y }: { label: string; on: boolean; onPress(): void; a11y?: string }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a11y ?? label} onPress={onPress}
      style={{ flex: 1, minHeight: 48, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? colors.neon : colors.line, backgroundColor: on ? colors.neon : 'transparent' }}>
      <T v="detail" color={on ? colors.night : colors.chalk} style={{ fontFamily: fonts.semibold }}>{label}</T>
    </Pressable>
  );
}

/** Check-in du jour : énergie de 1 à 5 et courbatures. */
export function CheckInCard() {
  const { checkIns, today, saveCheckIn } = useApp();
  const saved = checkIns.find((c) => c.date === today);
  const [edit, setEdit] = useState(false);
  const [energy, setEnergy] = useState<number | null>(saved?.energy ?? null);
  const [soreness, setSoreness] = useState<Soreness | null>(saved?.soreness ?? null);
  const commit = async (e: number | null, s: Soreness | null) => {
    if (e && s) { await saveCheckIn({ date: today, energy: e as 1 | 2 | 3 | 4 | 5, soreness: s }); setEdit(false); }
  };
  if (saved && !edit) {
    const low = isLowReadiness(saved);
    return (
      <Card style={{ borderLeftWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="label" color={low ? colors.coral : colors.neon}>{low ? 'Séance allégée' : 'Feu vert'}</T>
          <Pressable accessibilityRole="button" onPress={() => setEdit(true)} hitSlop={12}><T v="detail" color={colors.mute}>Modifier</T></Pressable>
        </View>
        <T v="detail" color={colors.soft}>
          {low ? 'Une série de moins par exercice aujourd’hui, et des charges un peu plus légères si besoin.' : 'Séance normale. Énergie'} {low ? '' : `${saved.energy} sur 5.`}
        </T>
      </Card>
    );
  }
  return (
    <Card>
      <T v="heading">Comment te sens-tu ?</T>
      <T v="label" color={colors.mute}>Énergie</T>
      <View style={{ flexDirection: 'row', gap: space.s }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Choice key={n} label={String(n)} a11y={`Énergie ${n} sur 5`} on={energy === n} onPress={() => { setEnergy(n); commit(n, soreness); }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="caption" color={colors.mute}>À plat</T><T v="caption" color={colors.mute}>En forme</T>
      </View>
      <T v="label" color={colors.mute}>Courbatures</T>
      <View style={{ flexDirection: 'row', gap: space.s }}>
        {SORENESS.map(([k, l]) => <Choice key={k} label={l} on={soreness === k} onPress={() => { setSoreness(k); commit(energy, k); }} />)}
      </View>
    </Card>
  );
}
