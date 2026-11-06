import { View } from 'react-native';
import { router } from 'expo-router';
import type { DayPlan } from '@muscu/engine';
import { longDate } from '../lib/format';
import { exerciseName, kindColor, phaseName, planLabel } from '../lib/programView';
import { useApp, useProfile } from '../store/AppState';
import { colors, space } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { T } from './Text';

export function DayDetail({ date, plan }: { date: string; plan: DayPlan | null }) {
  const p = useProfile();
  const { sessions, toggleDone, today } = useApp();
  const done = sessions.some((s) => s.date === date && s.done);
  if (!plan) {
    return (
      <Card>
        <T v="heading">{longDate(date, true)}</T>
        <T v="detail" color={colors.soft}>Hors des 26 semaines du programme (début le {longDate(p.startDate)}).</T>
      </Card>
    );
  }
  const training = plan.day.kind === 'training';
  return (
    <Card style={{ borderTopWidth: 4, borderTopColor: kindColor(plan) ?? colors.line }}>
      <View style={{ gap: space.xs }}>
        <T v="heading">{longDate(date, true)} · {planLabel(plan)}</T>
        <T v="detail" color={colors.mute}>
          Semaine {plan.week + 1} sur 26 · {phaseName(p.level, plan.phase)}
          {plan.deload && training ? ' · semaine allégée : une série de moins' : ''}
        </T>
      </View>
      {plan.items.length ? (
        <View style={{ gap: space.s }}>
          {plan.items.map((i, k) => (
            <View key={`${i.exercise}-${k}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
              <T v="detail" style={{ flex: 1 }}>{exerciseName(i.exercise)}</T>
              <T v="detail" color={colors.mute}>{i.scheme}</T>
            </View>
          ))}
        </View>
      ) : (
        <T v="detail" color={colors.soft}>Repos complet. Dors bien et mange à ta faim.</T>
      )}
      {plan.items.length ? <Button label={training ? 'Voir la séance' : 'Voir le détail'} variant="secondary" onPress={() => router.push(`/seance/${date}`)} /> : null}
      {training && date <= today ? (
        <Button label={done ? 'Faite · annuler' : 'Marquer comme faite'} variant={done ? 'secondary' : 'primary'} onPress={() => toggleDone(date)} />
      ) : null}
    </Card>
  );
}
