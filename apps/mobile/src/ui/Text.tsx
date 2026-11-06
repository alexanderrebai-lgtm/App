import { Text as RNText, type TextProps } from 'react-native';
import { colors, type as typeScale } from '../theme';

export type Variant = keyof typeof typeScale;

/** Texte de l'appli : suit la taille de texte choisie dans l'iPhone, jusqu'à 150 % pour garder des écrans lisibles. */
export function T({ v = 'body', color = colors.chalk, style, maxFontSizeMultiplier = 1.5, ...rest }: TextProps & { v?: Variant; color?: string }) {
  return <RNText {...rest} maxFontSizeMultiplier={maxFontSizeMultiplier} style={[typeScale[v], { color }, style]} />;
}
