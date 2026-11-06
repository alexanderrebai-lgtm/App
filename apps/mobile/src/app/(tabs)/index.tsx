import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  addDays, dayPlan, effectiveTargets, mondayOf, plannedTrainingDates, weekDates,
} from '@muscu/engine';
import { longDate, num } from '../../lib/format';
import { kindColor, phaseName, planLabel } from '../../lib/programView';
import { useApp, useProfile } from '../../store/AppState';
import { colors, space } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { CheckInCard } from '../../ui/CheckInCard';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import { T } from '../../ui/Text';

export default function Home() {
  const p = useProfile();
  const { today, sessions, loadActiveSession } = useApp();
  const [active, setActive] = useState(false);
  useFocusEffect(useCallback(() => {
    loadActiveSession().then((s) => setActive(!!s && s.date === today && s.phase !== 'done'));
  }, [loadActiveSession, today]));
  const plan = dayPlan(p, today);
  const done = new Set(sessions.filter((s) => s.done).map((s) => s.date));
  const week = weekDates(mondayOf(today));
  const planned = plannedTrainingDates(p, week[0]!, week[6]!);
  const doneWeek = planned.filter((d) => done.has(d)).length;
  const t = effectiveTargets(p);
  let next: string | null = null;
  for (let i = 1; i <= 14 && !next; i++) {
    const d = addDays(today, i);
    if (dayPlan(p, d)?.day.kind === 'training') next = d;
  }

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <T v="label" color={colors.mute}>{longDate(today)}</T>
        <T v="title" accessibilityRole="header">{p.name && p.name !== 'Moi' ? `Salut ${p.name}` : 'Salut'}</T>
      </View>

      {!plan ? (
        <Card hero>
          <T v="label" color={colors.neon}>{today < p.startDate ? 'Bientôt' : 'Programme terminé'}</T>
          <T v="heading">
            {today < p.startDate ? `Ton programme commence ${longDate(p.startDate)}` : 'Tu as bouclé tes 26 semaines'}
          </T>
          <T v="detail" color={colors.soft}>
            {today < p.startDate
              ? 'En attendant, marche 20 à 30 minutes par jour : c’est le meilleur échauffement pour la suite.'
              : 'Choisis un nouvel objectif dans ton profil pour repartir sur un programme.'}
          </T>
        </Card>
      ) : (
        <Card hero style={{ borderTopWidth: 6, borderTopColor: kindColor(plan) ?? colors.line }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T v="label" color={kindColor(plan) ?? colors.mute}>Aujourd’hui</T>
            {done.has(today) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="check" size={18} color={colors.neon} strokeWidth={3} />
                <T v="detail" color={colors.neon}>Faite</T>
              </View>
            ) : null}
          </View>
          <T v="heading">
            {plan.day.kind === 'training' ? `${planLabel(plan)} · ${plan.items.length} exercices`
              : plan.day.kind === 'mobility' ? 'Mobilité · 20 min'
              : plan.day.kind === 'walk' ? 'Marche et étirements' : 'Repos complet'}
          </T>
          <T v="detail" color={colors.soft}>
            {plan.day.kind === 'rest'
              ? 'Dors bien et mange à ta faim : c’est là que le muscle se construit.'
              : `Semaine ${plan.week + 1} sur 26 · ${phaseName(p.level, plan.phase)}${plan.deload && plan.day.kind === 'training' ? ' · semaine allégée' : ''}`}
          </T>
          {plan.day.kind === 'training' && !done.has(today) ? (
            <Button label={active ? 'Reprendre la séance' : 'Démarrer la séance'} onPress={() => router.push(`/guidee/${today}`)} />
          ) : null}
          {plan.day.kind !== 'rest' ? (
            <Button label={plan.day.kind === 'training' ? 'Voir le détail' : 'Voir le programme'} variant="secondary" onPress={() => router.push(`/seance/${today}`)} />
          ) : null}
        </Card>
      )}

      {plan?.day.kind === 'training' && !done.has(today) ? <CheckInCard /> : null}

      <View style={{ flexDirection: 'row', gap: space.m }}>
        {planned.length ? <Card style={{ flex: 1 }}>
          <T v="caption" color={colors.mute}>Cette semaine</T>
          <T v="title">{doneWeek} <T v="detail" color={colors.mute}>/ {planned.length} séances</T></T>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line }}>
            <View style={{ width: `${(doneWeek / planned.length) * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.neon }} />
          </View>
        </Card> : null}
        <Card style={{ flex: 1 }}>
          <T v="caption" color={colors.mute}>Objectif du jour</T>
          <T v="title">{num(t.kcal)} <T v="detail" color={colors.mute}>kcal</T></T>
          <T v="caption" color={colors.mute}>{t.protein} g de protéines</T>
        </Card>
      </View>

      {next ? <T v="detail" color={colors.mute}>Prochaine séance : {longDate(next)}.</T> : null}
    </Screen>
  );
}
