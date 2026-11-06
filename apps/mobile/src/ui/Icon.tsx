import Svg, { Circle, Path } from 'react-native-svg';

const PATHS = {
  home: ['M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  dumbbell: ['M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12'],
  food: ['M7 3v8a2 2 0 0 0 2 2v8M11 3v8M5 3v6M17 3c-2 2-2 6 0 8v10'],
  chart: ['M4 20V10M10 20V4M16 20v-8M22 20H2'],
  user: ['M4 21a8 8 0 0 1 16 0'],
  chevronLeft: ['M15 18l-6-6 6-6'],
  chevronRight: ['M9 18l6-6-6-6'],
  check: ['M5 12l5 5 9-10'],
  close: ['M6 6l12 12M18 6L6 18'],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, color, strokeWidth = 2 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name].map((d) => <Path key={d} d={d} />)}
      {name === 'user' ? <Circle cx={12} cy={8} r={4} /> : null}
    </Svg>
  );
}
