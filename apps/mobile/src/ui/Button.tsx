import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius, type as typeScale } from '../theme';
import { T } from './Text';

interface Props {
  label: string;
  onPress(): void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled, busy, style, accessibilityHint }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      accessibilityHint={accessibilityHint}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        primary ? s.primary : s.secondary,
        disabled && s.disabled,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={primary ? colors.night : colors.chalk} /> : (
        <T v={primary ? 'button' : 'detail'} color={primary ? colors.night : colors.chalk}
          style={primary ? undefined : { fontFamily: typeScale.label.fontFamily, fontSize: 16 }}>
          {label}
        </T>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { minHeight: 56, backgroundColor: colors.neon },
  secondary: { minHeight: 48, borderWidth: 1, borderColor: colors.line, backgroundColor: 'transparent' },
  disabled: { opacity: 0.4 },
});
