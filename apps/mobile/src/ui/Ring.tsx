import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

export function Ring({ size, progress, color = colors.azure, stroke = 10 }: { size: number; progress: number; color?: string; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={stroke} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={`${c * Math.max(0, Math.min(1, progress))} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </Svg>
  );
}
