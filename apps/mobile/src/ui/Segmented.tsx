import { Pressable, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { T } from './Text';

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange(k: K): void }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.slate, borderRadius: radius.button, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={{ flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.chalk : 'transparent' }}
          >
            <T v="detail" color={on ? colors.night : colors.chalk} style={{ fontFamily: fonts.semibold }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
