import { Switch, View } from 'react-native';
import { router } from 'expo-router';
import { content } from '@muscu/content';
import { LIMITS } from '../../lib/onboarding';
import { useOnboarding } from '../../lib/OnboardingContext';
import { colors, space } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { OptionCard } from '../../ui/OptionCard';
import { Screen } from '../../ui/Screen';
import { StepHeader } from '../../ui/StepHeader';
import { Stepper } from '../../ui/Stepper';
import { T } from '../../ui/Text';

function Toggle({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange(v: boolean): void }) {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.l }}>
      <View style={{ flex: 1, gap: space.xs }}>
        <T v="heading">{title}</T>
        <T v="detail" color={colors.soft}>{description}</T>
      </View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.neon }} thumbColor={colors.chalk} ios_backgroundColor={colors.line} />
    </Card>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function OptionsStep() {
  const { draft, update } = useOnboarding();
  return (
    <Screen footer={<Button label="Voir mon programme" onPress={() => router.push('/onboarding/recap')} />}>
      <StepHeader step="options" title="Ton quotidien" subtitle="Pour adapter les exercices et les menus. Tout se modifie ensuite." />

      <View style={{ gap: space.s }}>
        <T v="label" color={colors.mute}>Où t’entraînes-tu ?</T>
        <OptionCard title="En salle" description="Machines, poulies, barres et haltères." selected={draft.equipment === 'gym'} onPress={() => update({ equipment: 'gym' })} />
        <OptionCard title="À la maison" description={content.equipment.home.description} selected={draft.equipment === 'home'} onPress={() => update({ equipment: 'home' })} />
      </View>

      <Toggle title="Dos sensible" value={draft.backCare} onChange={(backCare) => update({ backCare })}
        description="Ajoute un bloc de renfort du dos aux séances du bas et garde des charges légères au début." />

      <View style={{ gap: space.s }}>
        <T v="label" color={colors.mute}>Alimentation</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {content.exclusions.diets.map((d) => (
            <Chip key={d.id} label={d.name} selected={draft.dietTags.includes(d.id)} onPress={() => update({ dietTags: toggle(draft.dietTags, d.id) })} />
          ))}
        </View>
        <T v="label" color={colors.mute} style={{ marginTop: space.s }}>Allergies ou aliments à éviter</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {content.exclusions.allergies.map((a) => (
            <Chip key={a.id} label={a.name} selected={draft.allergies.includes(a.id)} onPress={() => update({ allergies: toggle(draft.allergies, a.id) })} />
          ))}
        </View>
      </View>

      <View style={{ gap: space.m }}>
        <Toggle title="Budget serré" value={draft.budgetMode} onChange={(budgetMode) => update({ budgetMode })}
          description="Menus à base de riz, pâtes, lentilles, pois chiches, flocons d’avoine, œufs et lait." />
        <Stepper label="Budget courses par semaine" unit="€" value={draft.weeklyBudgetEur} {...LIMITS.weeklyBudgetEur}
          onChange={(weeklyBudgetEur) => update({ weeklyBudgetEur })} />
      </View>
    </Screen>
  );
}
