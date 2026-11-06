import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { colors, radius, space, type as typeScale } from '../theme';
import { num } from '../lib/format';
import { T } from './Text';

interface Props {
  label: string;
  unit: string;
  value: number;
  step: number;
  min: number;
  max: number;
  decimals?: number;
  onChange(v: number): void;
}

/** Réglage par + et −, ou saisie directe au clavier numérique. */
export function Stepper({ label, unit, value, step, min, max, decimals = 0, onChange }: Props) {
  const [text, setText] = useState(num(value, decimals));
  useEffect(() => setText(num(value, decimals)), [value, decimals]);
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));
  const commit = () => {
    const v = parseFloat(text.replace(',', '.').replace(/\s/g, ''));
    if (Number.isFinite(v)) set(v); else setText(num(value, decimals));
  };
  const btn = (sign: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sign > 0 ? 'Augmenter' : 'Diminuer'} ${label.toLowerCase()} de ${num(step, decimals)} ${unit}`}
      onPress={() => set(value + sign * step)}
      style={({ pressed }) => ({
        width: 56, height: 56, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line,
        backgroundColor: pressed ? colors.slateHi : colors.slate, alignItems: 'center', justifyContent: 'center',
      })}
    >
      <T v="heading">{sign > 0 ? '+' : '−'}</T>
    </Pressable>
  );
  return (
    <View style={{ gap: space.s }}>
      <T v="label" color={colors.mute}>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        {btn(-1)}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
          <TextInput
            accessibilityLabel={`${label} en ${unit}`}
            value={text}
            onChangeText={setText}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
            style={[typeScale.title, { color: colors.chalk, textAlign: 'center', minWidth: 72, padding: 0 }]}
          />
          <T v="detail" color={colors.mute}>{unit}</T>
        </View>
        {btn(1)}
      </View>
    </View>
  );
}
