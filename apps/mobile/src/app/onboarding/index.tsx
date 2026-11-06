import { router } from 'expo-router';
import { programs } from '@muscu/content';
import type { GoalChoice } from '../../lib/onboarding';
import { useOnboarding } from '../../lib/OnboardingContext';
import { useApp } from '../../store/AppState';
import { OptionCard } from '../../ui/OptionCard';
import { Screen } from '../../ui/Screen';
import { StepHeader } from '../../ui/StepHeader';

const GOALS: { key: GoalChoice; title: string; description: string }[] = [
  { key: 'mass', title: programs.goals.mass.name, description: programs.goals.mass.description },
  { key: 'strength', title: programs.goals.strength.name, description: programs.goals.strength.description },
  { key: 'power', title: programs.goals.power.name, description: programs.goals.power.description },
  { key: 'cardio', title: programs.goals.cardio.name, description: programs.goals.cardio.description },
  { key: 'unsure', title: 'Je ne sais pas', description: 'On commence par la prise de masse : c’est le plus polyvalent. Tu pourras changer plus tard.' },
];

export default function GoalStep() {
  const { draft, edit, update } = useOnboarding();
  const { profiles } = useApp();
  return (
    <Screen>
      <StepHeader step="objectif" title={edit ? 'Ton objectif' : profiles.length ? 'Nouveau profil' : 'Bienvenue sur Élan'} subtitle="Qu’est-ce que tu veux travailler pendant les 26 prochaines semaines ?" canBack={edit || profiles.length > 0} />
      {GOALS.map((g) => (
        <OptionCard key={g.key} title={g.title} description={g.description} selected={draft.goal === g.key}
          onPress={() => { update({ goal: g.key }); router.push('/onboarding/seances'); }} />
      ))}
    </Screen>
  );
}
