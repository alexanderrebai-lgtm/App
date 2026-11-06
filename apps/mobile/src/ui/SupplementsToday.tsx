import { Pressable, View } from 'react-native';
import { content, type SupplementId } from '@muscu/content';
import { caffeineDose, dayPlan, supplementsForDay } from '@muscu/engine';
import { useApp, useProfile } from '../store/AppState';
import { colors, fonts, space } from '../theme';
import { Icon } from './Icon';
import { T } from './Text';

/** Routine du jour à cocher (caféine seulement les jours de séance). */
export function SupplementsToday() {
  const p = useProfile();
  const { today, supplements, setSupplement } = useApp();
  const training = dayPlan(p, today)?.day.kind === 'training';
  const ids = supplementsForDay(p, training);
  const taken = (id: SupplementId) => supplements.some((s) => s.date === today && s.supplement === id && s.taken);
  const caf = caffeineDose(p.weightKg);
  if (!ids.length) return <T v="detail" color={colors.mute}>Aucun complément choisi pour aujourd’hui.</T>;
  return (
    <View style={{ gap: 0 }}>
      {ids.map((id, i) => {
        const s = content.supplements.supplements.find((x) => x.id === id)!;
        const on = taken(id);
        return (
          <Pressable key={id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${s.name} pris`}
            onPress={() => setSupplement(today, id, !on)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, borderWidth: on ? 0 : 2, borderColor: colors.line, backgroundColor: on ? colors.neon : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {on ? <Icon name="check" size={18} color={colors.night} strokeWidth={3} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: fonts.medium }} color={on ? colors.mute : colors.chalk}>{s.name} · {id === 'caffeine' ? `${caf.startMg} à ${caf.upToMg} mg` : s.dose}</T>
              <T v="caption" color={colors.mute}>{s.timing}</T>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
