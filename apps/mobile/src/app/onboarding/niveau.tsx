import { router } from 'expo-router';
import type { Level } from '@muscu/engine';
import { useOnboarding } from '../../lib/OnboardingContext';
import { OptionCard } from '../../ui/OptionCard';
import { Screen } from '../../ui/Screen';
import { StepHeader } from '../../ui/StepHeader';

const LEVELS: { id: Level; title: string; description: string }[] = [
  { id: 'beginner', title: 'Sédentaire ou débutant', description: 'Tu commences ou tu reprends après une longue pause. 8 semaines pour apprendre les gestes, charges trouvées en séance.' },
  { id: 'intermediate', title: 'Intermédiaire (1 à 3 ans)', description: 'Tu t’entraînes régulièrement depuis 1 à 3 ans. 6 semaines de remise en route, puis plus de volume.' },
  { id: 'advanced', title: 'Avancé (plus de 3 ans)', description: 'Tu t’entraînes depuis plus de 3 ans. 4 semaines de remise en route, un volume élevé et des progrès plus lents.' },
];

export default function LevelStep() {
  const { draft, update } = useOnboarding();
  const pick = (level: Level) => { update({ level }); router.push('/onboarding/corps'); };
  return (
    <Screen>
      <StepHeader step="niveau" title="Ton niveau" subtitle="Il règle la durée des phases, le volume, les calories et les outils affichés." />
      {LEVELS.map((l) => <OptionCard key={l.id} title={l.title} description={l.description} selected={draft.level === l.id} onPress={() => pick(l.id)} />)}
    </Screen>
  );
}
