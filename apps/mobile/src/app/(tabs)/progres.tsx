import { adherence } from '@muscu/engine';
import { useApp, useProfile } from '../../store/AppState';
import { colors } from '../../theme';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { T } from '../../ui/Text';

export default function Progress() {
  const p = useProfile();
  const { sessions, today } = useApp();
  const a = adherence(p, sessions, today);
  return (
    <Screen>
      <T v="title" accessibilityRole="header">Progrès</T>
      <Card hero>
        <T v="label" color={colors.neon}>Assiduité</T>
        <T v="number">{a.planned ? Math.round(a.rate * 100) : 0} %</T>
        <T v="detail" color={colors.soft}>{a.done} séance{a.done > 1 ? 's' : ''} faite{a.done > 1 ? 's' : ''} sur {a.planned} prévue{a.planned > 1 ? 's' : ''} depuis ton début.</T>
      </Card>
      <T v="detail" color={colors.mute}>Records, courbes de progression, poids et mensurations arrivent avec la séance guidée.</T>
    </Screen>
  );
}
