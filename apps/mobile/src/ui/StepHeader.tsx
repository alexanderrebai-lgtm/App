import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { STEPS, type Step } from '../lib/onboarding';
import { colors, space } from '../theme';
import { Icon } from './Icon';
import { T } from './Text';

export function StepHeader({ step, title, subtitle, canBack = true }: { step: Step; title: string; subtitle?: string; canBack?: boolean }) {
  const i = STEPS.indexOf(step);
  return (
    <View style={{ gap: space.l }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        {canBack && router.canGoBack() ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()}
            style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevronLeft" color={colors.chalk} />
          </Pressable>
        ) : <View style={{ width: 44, height: 44 }} />}
        <View accessibilityLabel={`Étape ${i + 1} sur ${STEPS.length}`} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {STEPS.map((s, k) => (
            <View key={s} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: k <= i ? colors.neon : colors.line }} />
          ))}
        </View>
      </View>
      <View style={{ gap: space.xs }}>
        <T v="title" accessibilityRole="header">{title}</T>
        {subtitle ? <T color={colors.soft}>{subtitle}</T> : null}
      </View>
    </View>
  );
}
