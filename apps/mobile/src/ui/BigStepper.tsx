import { Pressable, View } from 'react-native';
import { colors, radius, space, type as typeScale } from '../theme';
import { num } from '../lib/format';
import { T } from './Text';

interface Props { label: string; value: number; unit?: string; step: number; decimals?: number; onDelta(d: number): void }

/** Grand réglage + / − utilisable d'une main pendant la séance. */
export function BigStepper({ label, value, unit, step, decimals = 0, onDelta }: Props) {
  const b = (sign: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sign > 0 ? 'Ajouter' : 'Retirer'} ${num(step, decimals)}${unit ? ` ${unit}` : ''}`}
      onPress={() => onDelta(sign * step)}
      style={({ pressed }) => ({ width: 64, height: 64, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.slateHi : colors.slate, alignItems: 'center', justifyContent: 'center' })}
    >
      <T v="title">{sign > 0 ? '+' : '−'}</T>
    </Pressable>
  );
  return (
    <View style={{ gap: space.s }}>
      <T v="label" color={colors.mute}>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        {b(-1)}
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 6 }} accessible accessibilityLabel={`${label} : ${num(value, decimals)} ${unit ?? ''}`}>
          <T style={typeScale.number}>{num(value, value % 1 ? 1 : 0)}</T>
          {unit ? <T v="detail" color={colors.mute}>{unit}</T> : null}
        </View>
        {b(1)}
      </View>
    </View>
  );
}
