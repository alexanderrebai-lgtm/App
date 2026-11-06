import { useState } from 'react';
import { guide } from '@muscu/content';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { dayPlan, isLowReadiness, parseScheme, restSeconds, setsToDo } from '@muscu/engine';
import { longDate } from '../../lib/format';
import { exerciseName, phaseName, planLabel, techniqueText } from '../../lib/programView';
import { useApp, useProfile } from '../../store/AppState';
import { colors, space } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { CheckInCard } from '../../ui/CheckInCard';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import { T } from '../../ui/Text';

const restLabel = (s: number) => `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60}` : ''}`;

export default function SessionDay() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const p = useProfile();
  const { sessions, toggleDone, today, checkIns } = useApp();
  const [open, setOpen] = useState<number | null>(null);
  const plan = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? dayPlan(p, date) : null;
  const done = sessions.some((s) => s.date === date && s.done);
  const back = (
    <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="close" color={colors.chalk} size={20} />
    </Pressable>
  );
  if (!plan || !date) {
    return <Screen>{back}<T v="title">Pas de séance ce jour-là</T></Screen>;
  }
  const training = plan.day.kind === 'training';
  return (
    <Screen footer={training && date <= today ? (
      <>
        {!done ? <Button label="Démarrer la séance guidée" onPress={() => router.push(`/guidee/${date}`)} /> : null}
        <Button label={done ? 'Faite · annuler' : 'Marquer comme faite sans la guider'} variant="secondary" onPress={() => toggleDone(date)} />
      </>
    ) : undefined}>
      {back}
      <View style={{ gap: space.xs }}>
        <T v="label" color={colors.mute}>{longDate(date)} · semaine {plan.week + 1} sur 26</T>
        <T v="title" accessibilityRole="header">{planLabel(plan)}</T>
        <T v="detail" color={colors.soft}>
          Phase {phaseName(p.level, plan.phase)}{plan.deload && training ? ' · semaine allégée, une série de moins par exercice' : ''}
        </T>
      </View>
      {training && date <= today && !done ? <CheckInCard /> : null}
      {training ? (
        <Card style={{ backgroundColor: colors.slateHi }}>
          <T v="label" color={colors.azure}>{guide.warmup.title}</T>
          {guide.warmup.steps.map((x, i) => <T key={i} v="detail" color={colors.soft}>{i + 1}. {x}</T>)}
        </Card>
      ) : null}
      <View style={{ gap: space.m }}>
        {plan.items.map((i, k) => {
          const sc = parseScheme(i.scheme);
          const sets = setsToDo(sc, { deload: plan.deload && training, lowReadiness: isLowReadiness(checkIns.find((c) => c.date === date)) });
          const tech = techniqueText(i.exercise);
          const isOpen = open === k;
          return (
            <Pressable key={`${i.exercise}-${k}`} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
              disabled={!tech} onPress={() => setOpen(isOpen ? null : k)}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m, alignItems: 'baseline' }}>
                  <T v="heading" style={{ flex: 1 }}>{exerciseName(i.exercise)}</T>
                  <T v="detail" color={colors.mute}>{k + 1}/{plan.items.length}</T>
                </View>
                <T v="detail" color={colors.soft}>
                  {sets && sets !== sc.sets ? `${sets} séries (au lieu de ${i.scheme})` : i.scheme}
                  {training && sc.sets ? ` · repos ${restLabel(restSeconds(sc, p.goal))}` : ''}
                </T>
                {tech ? <T v="caption" color={colors.neon}>{isOpen ? 'Masquer la technique' : 'Voir la technique'}</T> : null}
                {tech && isOpen ? <T v="detail" color={colors.soft}>{tech}</T> : null}
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
