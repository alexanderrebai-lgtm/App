import { router } from 'expo-router';
import { useOnboarding } from '../../lib/OnboardingContext';
import { OptionCard } from '../../ui/OptionCard';
import { Screen } from '../../ui/Screen';
import { StepHeader } from '../../ui/StepHeader';

export default function LevelStep() {
  const { draft, update } = useOnboarding();
  const pick = (level: 'beginner' | 'advanced') => { update({ level }); router.push('/onboarding/corps'); };
  return (
    <Screen>
      <StepHeader step="niveau" title="Ton niveau" subtitle="Il règle la durée des phases et les outils affichés." />
      <OptionCard title="Débutant" selected={draft.level === 'beginner'} onPress={() => pick('beginner')}
        description="Tu commences ou tu reprends après une longue pause. 8 semaines pour apprendre les gestes, charges trouvées en séance." />
      <OptionCard title="Confirmé" selected={draft.level === 'advanced'} onPress={() => pick('advanced')}
        description="Tu t’entraînes régulièrement depuis plus de 6 mois. 4 semaines de remise en route, puis on progresse." />
    </Screen>
  );
}
