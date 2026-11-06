import { Pressable } from 'react-native';
import { colors, fonts } from '../theme';
import { T } from './Text';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={{
        minHeight: 44, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center',
        borderWidth: 1, borderColor: selected ? colors.chalk : colors.line,
        backgroundColor: selected ? colors.chalk : 'transparent',
      }}
    >
      <T v="detail" color={selected ? colors.night : colors.chalk} style={{ fontFamily: fonts.medium }}>{label}</T>
    </Pressable>
  );
}
