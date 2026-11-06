import { View } from 'react-native';
import { router } from 'expo-router';
import { content } from '@muscu/content';
import { screen } from '@muscu/engine';
import { useOnboarding } from '../../lib/OnboardingContext';
import { colors, space } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Screen } from '../../ui/Screen';
import { StepHeader } from '../../ui/StepHeader';
import { T } from '../../ui/Text';

/** Questionnaire de santé : les réponses restent sur le téléphone. */
export default function HealthStep() {
  const { draft, update } = useOnboarding();
  const { questions, outcomes, intro, underweight } = content.health;
  const answered = questions.every((q) => draft.healthAnswers[q.id] !== undefined);
  const res = screen(draft.healthAnswers, draft, draft.hardGainer);
  const set = (id: string, v: boolean) => update({ healthAnswers: { ...draft.healthAnswers, [id]: v }, healthDone: true });
  const out = outcomes[res.outcome];
  return (
    <Screen footer={<Button label="Continuer" disabled={!answered} onPress={() => router.push('/onboarding/options')} />}>
      <StepHeader step="sante" title="Ta santé" subtitle={intro} />
      {questions.map((q) => (
        <View key={q.id} style={{ gap: space.s }}>
          <T>{q.text}</T>
          <View style={{ flexDirection: 'row', gap: space.s }}>
            <Chip label="Oui" selected={draft.healthAnswers[q.id] === true} onPress={() => set(q.id, true)} />
            <Chip label="Non" selected={draft.healthAnswers[q.id] === false} onPress={() => set(q.id, false)} />
          </View>
        </View>
      ))}
      {answered ? (
        <Card style={{ borderWidth: res.outcome === 'ok' ? 0 : 2, borderColor: res.outcome === 'doctor' ? colors.coral : colors.neon }}>
          <T v="heading">{out.title}</T>
          <T v="detail" color={colors.soft}>{out.text}</T>
          {res.underweight ? <T v="detail" color={colors.soft}>{underweight}</T> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
