import { Text as RNText, type TextProps } from 'react-native';
import { colors, type as typeScale } from '../theme';

export type Variant = keyof typeof typeScale;

export function T({ v = 'body', color = colors.chalk, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  return <RNText {...rest} style={[typeScale[v], { color }, style]} />;
}
