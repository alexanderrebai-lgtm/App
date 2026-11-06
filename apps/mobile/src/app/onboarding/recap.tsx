import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { content, programs } from '@muscu/content';
import { effectiveTargets, waterLiters } from '@muscu/engine';
import { longDate, num } from '../../lib/format';
import { buildProfile, isComplete } from '../../lib/onboarding';
import { LEVEL, phaseRanges } from '../../lib/programView';
import { useOnboarding } from '../../lib/OnboardingContext';
import { useApp } from '../../store/AppState';
import { colors, space } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { StepHeader } from '../../ui/StepHeader';
import { T } from '../../ui/Text';

export default function RecapStep() {
  const { draft, edit } = useOnboarding();
  const { today, profile, saveProfile } = useApp();
  const [busy, setBusy] = useState(false);
  if (!isComplete(draft)) {
    return (
      <Screen footer={<Button label="Reprendre au début" onPress={() => router.replace('/onboarding')} />}>
        <T v="title">Il manque une réponse</T>
      </Screen>
    );
  }
  const p = buildProfile(draft, today, edit ? profile ?? undefined : undefined);
  const t = effectiveTargets(p);
  const goal = programs.goals[p.goal];
  const ranges = phaseRanges(p.level);
  const start = async () => {
    setBusy(true);
    try {
      await saveProfile(p);
      router.dismissAll();
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen footer={<Button label={edit ? 'Enregistrer' : 'Lancer mon programme'} busy={busy} onPress={start} />}>
      <StepHeader step="recap" title="Ton programme" />

      <Card hero style={{ backgroundColor: colors.neon }}>
        <T v="label" color={colors.night}>{p.sessionsPerWeek} séances · {LEVEL[p.level]} · 26 semaines</T>
        <T v="title" color={colors.night}>{goal.name}</T>
        <T v="detail" color={colors.night}>Début le {longDate(p.startDate)}. {goal.weightGoalText.charAt(0).toUpperCase() + goal.weightGoalText.slice(1)}.</T>
      </Card>

      {p.health && p.health.outcome !== 'ok' ? (
        <Card style={{ borderWidth: 2, borderColor: p.health.outcome === 'doctor' ? colors.coral : colors.neon }}>
          <T v="heading">{content.health.outcomes[p.health.outcome].title}</T>
          <T v="detail" color={colors.soft}>{content.health.outcomes[p.health.outcome].text}</T>
        </Card>
      ) : null}

      <Card>
        <T v="label" color={colors.mute}>Ta cible chaque jour</T>
        <T v="number">{num(t.kcal)} <T v="body" color={colors.mute}>kcal</T></T>
        <View style={{ flexDirection: 'row', gap: space.xl }}>
          {[['Protéines', t.protein], ['Glucides', t.carbs], ['Lipides', t.fat]].map(([l, v]) => (
            <View key={l as string}>
              <T v="heading">{v} g</T>
              <T v="caption" color={colors.mute}>{l}</T>
            </View>
          ))}
        </View>
        <T v="detail" color={colors.soft}>
          Eau : {num(waterLiters(p.weightKg, false), 1)} L par jour, {num(waterLiters(p.weightKg, true), 1)} L les jours de séance.
          Estimation pour {p.age} ans et {num(p.weightKg, p.weightKg % 1 ? 1 : 0)} kg : on l’ajuste avec ton poids après 2 semaines.
        </T>
      </Card>

      <View style={{ gap: space.m }}>
        <T v="heading">Trois phases</T>
        {goal.phaseTexts.map((txt, i) => (
          <Card key={i} style={{ gap: space.xs }}>
            <T v="label" color={colors.neon}>{ranges[i]}</T>
            <T v="detail" color={colors.soft}>{txt}</T>
          </Card>
        ))}
        <T v="detail" color={colors.mute}>Toutes les 4 semaines, une semaine allégée : une série de moins par exercice.</T>
      </View>
      <T v="caption" color={colors.mute}>Élan n’est pas un avis médical. En cas de doute (cœur, tension, douleur, traitement), parle à ton médecin avant de commencer.</T>
    </Screen>
  );
}
