import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { num } from '../lib/format';
import { colors } from '../theme';
import { T } from './Text';

/** Courbe simple : une valeur par date, dernier point mis en avant. */
export function Sparkline({ values, unit, height = 96, color = colors.neon }: { values: number[]; unit: string; height?: number; color?: string }) {
  if (values.length < 2) return <T v="detail" color={colors.mute}>Il faut au moins deux valeurs pour tracer la courbe.</T>;
  const W = 300;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((y, i) => [(i * (W - 12)) / (values.length - 1) + 6, height - 10 - ((y - min) / span) * (height - 24)] as const);
  const last = pts[pts.length - 1]!;
  return (
    <View style={{ gap: 4 }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} accessibilityLabel={`De ${num(min, 1)} à ${num(max, 1)} ${unit}`}>
        <Line x1={0} x2={W} y1={height - 10} y2={height - 10} stroke={colors.line} strokeWidth={1} />
        <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={last[0]} cy={last[1]} r={5} fill={color} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="caption" color={colors.mute}>min {num(min, min % 1 ? 1 : 0)} {unit}</T>
        <T v="caption" color={colors.mute}>max {num(max, max % 1 ? 1 : 0)} {unit}</T>
      </View>
    </View>
  );
}
