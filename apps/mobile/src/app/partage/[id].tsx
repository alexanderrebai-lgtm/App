import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { programs } from '@muscu/content';
import { addDays, adherence, records, type BackupData } from '@muscu/engine';
import { dayMonth, num } from '../../lib/format';
import { exerciseName } from '../../lib/programView';
import { useApp, useProfile } from '../../store/AppState';
import type { RemoteProfile } from '../../sync/api';
import { colors, space } from '../../theme';
import { Card } from '../../ui/Card';
import { CloseButton } from '../../ui/CloseButton';
import { Screen } from '../../ui/Screen';
import { T } from '../../ui/Text';

/** Profil d'un ami en lecture seule, et défi amical sur l'assiduité des 4 dernières semaines. */
export default function SharedProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useProfile();
  const { getSetting, sessions, today } = useApp();
  const [data, setData] = useState<BackupData | null>(null);
  useEffect(() => {
    getSetting('sharedWithMe').then((s) => setData((s ? (JSON.parse(s) as RemoteProfile[]) : []).find((r) => r.profileId === id)?.data ?? null));
  }, [id, getSetting]);
  if (!data?.profiles[0]) return <Screen><CloseButton fallback="/compte" /><T v="title">Profil introuvable</T></Screen>;
  const p = data.profiles[0];
  const from = addDays(today, -27);
  const his = adherence(p, data.sessions, today, from);
  const mine = adherence(me, sessions, today, from);
  const recs = [...records(data.exerciseLogs.filter((l) => !l.cardio)).values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const lastW = [...data.weights].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
  return (
    <Screen>
      <CloseButton fallback="/compte" />
      <View style={{ gap: space.xs }}>
        <T v="label" color={colors.mute}>Lecture seule</T>
        <T v="title" accessibilityRole="header">{p.name}</T>
        <T v="detail" color={colors.soft}>{programs.goals[p.goal].name} · {p.sessionsPerWeek} séances par semaine</T>
      </View>
      <Card hero>
        <T v="label" color={colors.neon}>Défi amical · 4 dernières semaines</T>
        <View style={{ flexDirection: 'row', gap: space.l }}>
          {[[me.name === 'Moi' ? 'Toi' : me.name, mine], [p.name, his]].map(([n, a]) => (
            <View key={n as string} style={{ flex: 1 }}>
              <T v="number">{(a as typeof mine).planned ? Math.round((a as typeof mine).rate * 100) : 0} %</T>
              <T v="detail" color={colors.soft}>{n as string} · {(a as typeof mine).done}/{(a as typeof mine).planned} séances</T>
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <T v="heading">Derniers records</T>
        {recs.length ? recs.map((r) => (
          <View key={r.exercise} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
            <T v="detail" style={{ flex: 1 }}>{exerciseName(r.exercise)}</T>
            <T v="detail" color={colors.mute}>{num(r.kg, r.kg % 1 ? 1 : 0)} kg × {r.reps} · {dayMonth(r.date)}</T>
          </View>
        )) : <T v="detail" color={colors.mute}>Pas encore de record.</T>}
      </Card>
      {lastW ? <Card><T v="heading">Poids</T><T v="detail" color={colors.soft}>{num(lastW.kg, 1)} kg le {dayMonth(lastW.date)}</T></Card> : null}
    </Screen>
  );
}
