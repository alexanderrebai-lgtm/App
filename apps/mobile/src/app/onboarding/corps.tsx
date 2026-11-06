import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { LIMITS } from '../../lib/onboarding';
import { useOnboarding } from '../../lib/OnboardingContext';
import { colors, radius, space, type as typeScale } from '../../theme';
import { Button } from '../../ui/Button';
import { OptionCard } from '../../ui/OptionCard';
import { Screen } from '../../ui/Screen';
import { StepHeader } from '../../ui/StepHeader';
import { Stepper } from '../../ui/Stepper';
import { T } from '../../ui/Text';

export default function BodyStep() {
  const { draft, update } = useOnboarding();
  return (
    <Screen footer={<Button label="Continuer" disabled={!draft.sex} onPress={() => router.push('/onboarding/sante')} />}>
      <StepHeader step="corps" title="Toi" subtitle="Ces valeurs servent à calculer tes calories et tes protéines." />

      <View style={{ gap: space.s }}>
        <T v="label" color={colors.mute}>Prénom (facultatif)</T>
        <TextInput
          accessibilityLabel="Prénom"
          value={draft.name}
          onChangeText={(name) => update({ name })}
          placeholder="Ton prénom"
          placeholderTextColor={colors.mute}
          autoCapitalize="words"
          returnKeyType="done"
          style={[typeScale.body, { color: colors.chalk, backgroundColor: colors.slate, borderRadius: radius.button, paddingHorizontal: 16, minHeight: 52 }]}
        />
      </View>

      <View style={{ gap: space.s }}>
        <T v="label" color={colors.mute}>Sexe</T>
        <View style={{ flexDirection: 'row', gap: space.m }}>
          <View style={{ flex: 1 }}><OptionCard title="Homme" selected={draft.sex === 'male'} onPress={() => update({ sex: 'male' })} /></View>
          <View style={{ flex: 1 }}><OptionCard title="Femme" selected={draft.sex === 'female'} onPress={() => update({ sex: 'female' })} /></View>
        </View>
        <T v="caption" color={colors.mute}>La formule des calories n’est pas la même pour les hommes et les femmes.</T>
      </View>

      <Stepper label="Poids" unit="kg" decimals={1} value={draft.weightKg} {...LIMITS.weightKg} onChange={(weightKg) => update({ weightKg })} />
      <Stepper label="Taille" unit="cm" value={draft.heightCm} {...LIMITS.heightCm} onChange={(heightCm) => update({ heightCm })} />
      <Stepper label="Âge" unit="ans" value={draft.age} {...LIMITS.age} onChange={(age) => update({ age })} />
    </Screen>
  );
}
