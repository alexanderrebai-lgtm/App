import { Pressable, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { T } from './Text';

interface Props {
  title: string;
  description?: string;
  badge?: string;
  selected: boolean;
  onPress(): void;
}

/** Choix d'onboarding : grande zone tactile, bord néon quand il est choisi. */
export function OptionCard({ title, description, badge, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.slate,
        borderRadius: radius.card,
        borderWidth: 2,
        borderColor: selected ? colors.neon : colors.slate,
        padding: space.l,
        gap: space.xs,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s }}>
        <T v="heading">{title}</T>
        {badge ? (
          <View style={{ backgroundColor: colors.neonSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <T v="caption" color={colors.neon} style={{ fontFamily: 'Barlow_600SemiBold' }}>{badge}</T>
          </View>
        ) : null}
      </View>
      {description ? <T v="detail" color={colors.soft}>{description}</T> : null}
    </Pressable>
  );
}
