import { View, type ViewProps } from 'react-native';
import { colors, radius, space } from '../theme';

export function Card({ style, hero, ...rest }: ViewProps & { hero?: boolean }) {
  return (
    <View
      {...rest}
      style={[{ backgroundColor: colors.slate, borderRadius: hero ? radius.hero : radius.card, padding: space.l, gap: space.m }, style]}
    />
  );
}
