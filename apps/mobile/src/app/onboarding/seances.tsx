import { router } from 'expo-router';
import type { SessionsPerWeek } from '@muscu/engine';
import { useOnboarding } from '../../lib/OnboardingContext';
import { colors } from '../../theme';
import { OptionCard } from '../../ui/OptionCard';
import { Screen } from '../../ui/Screen';
import { StepHeader } from '../../ui/StepHeader';
import { T } from '../../ui/Text';

const OPTIONS: { n: SessionsPerWeek; title: string; description: string; badge?: string }[] = [
  { n: 2, title: '2 séances', description: 'Lundi et jeudi. Mobilité le mercredi, marche le samedi.', badge: 'Pour reprendre' },
  { n: 3, title: '3 séances', description: 'Lundi, mercredi et vendredi. Marche le samedi.' },
  { n: 4, title: '4 séances', description: 'Lundi, mardi, jeudi et vendredi. Mobilité le mercredi.' },
];

export default function SessionsStep() {
  const { draft, update } = useOnboarding();
  return (
    <Screen>
      <StepHeader step="seances" title="Combien de séances par semaine ?" subtitle="Le dimanche reste toujours un jour de repos." />
      {OPTIONS.map((o) => (
        <OptionCard key={o.n} title={o.title} description={o.description} badge={o.badge} selected={draft.sessionsPerWeek === o.n}
          onPress={() => { update({ sessionsPerWeek: o.n }); router.push('/onboarding/niveau'); }} />
      ))}
      <T v="detail" color={colors.mute}>Après des années sans sport, commence par 2 séances et passe à 3 ou 4 au bout de quelques semaines.</T>
    </Screen>
  );
}
