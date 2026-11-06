import { Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { content, programs, type SupplementId } from '@muscu/content';
import { caffeineDose, coffeeCups, effectiveTargets, supplementWeek, trackedSupplements, usefulnessFor } from '@muscu/engine';
import { num } from '../lib/format';
import { useApp, useProfile } from '../store/AppState';
import { colors, fonts, space } from '../theme';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { Screen } from '../ui/Screen';
import { SupplementsToday } from '../ui/SupplementsToday';
import { T } from '../ui/Text';

const LEVEL = { recommended: ['Conseillé', colors.neon], useful: ['Utile', colors.azure], optional: ['Optionnel', colors.mute], useless: ['Inutile', colors.coral] } as const;
const GOALS = ['mass', 'strength', 'power', 'cardio'] as const;

export default function Supplements() {
  const p = useProfile();
  const { today, supplements, life, saveProfile } = useApp();
  const g = content.supplements.guide;
  const caf = caffeineDose(p.weightKg);
  const fill = (s: string) => s.replace('{protein}', String(effectiveTargets(p).protein)).replace('{c0}', String(caf.startMg))
    .replace('{c1}', String(caf.upToMg)).replace('{c2}', String(caf.studiedMaxMg)).replace('{cups}', num(coffeeCups(caf.startMg), 1));
  const ids = trackedSupplements(p);
  const week = supplementWeek(ids, supplements, today);
  const smoker = life.some((l) => l.cigarettes > 0);
  const toggle = (id: SupplementId) => saveProfile({ ...p, supplements: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  return (
    <Screen>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" color={colors.chalk} size={20} />
      </Pressable>
      <T v="title" accessibilityRole="header">Compléments</T>

      <Card>
        <T v="heading">Ma routine du jour</T>
        <SupplementsToday />
        <T v="caption" color={colors.mute}>7 derniers jours : {week.map((w) => `${content.supplements.supplements.find((s) => s.id === w.id)!.name} ${w.days}/7`).join(' · ')}</T>
      </Card>

      <View style={{ gap: space.s }}>
        <T v="label" color={colors.mute}>Ce que je prends</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {content.supplements.supplements.map((s) => <Chip key={s.id} label={s.name} selected={ids.includes(s.id)} onPress={() => toggle(s.id)} />)}
        </View>
      </View>

      <Card hero>
        <T v="detail" color={colors.soft}>{g.intro}</T>
      </Card>

      {smoker ? (
        <Card style={{ borderWidth: 1, borderColor: colors.coral }}>
          <T v="label" color={colors.coral}>Ton cœur</T>
          <T v="detail" color={colors.soft}>{g.smokerWarning}</T>
        </Card>
      ) : null}

      <Card>
        <T v="heading">Ton programme : {programs.goals[p.goal].name}</T>
        {g.stacks[p.goal].map((s, i) => <T key={i} v="detail" color={colors.soft}>• {fill(s)}</T>)}
        <T v="caption" color={colors.mute}>{g.buyOrder}</T>
      </Card>

      <Card style={{ gap: space.s }}>
        <T v="heading">Utilité selon le programme</T>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1.6 }} />
          {GOALS.map((k) => <T key={k} v="caption" color={k === p.goal ? colors.neon : colors.mute} style={{ flex: 1, textAlign: 'center', fontFamily: k === p.goal ? fonts.semibold : undefined }}>{programs.goals[k].name.split(' ').at(-1)}</T>)}
        </View>
        {content.supplements.usefulness.map((u) => (
          <View key={u.name} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}>
            <T v="caption" style={{ flex: 1.6 }}>{u.name}</T>
            {GOALS.map((k) => {
              const [label, color] = LEVEL[u.byGoal[k]];
              return <T key={k} v="caption" color={color} style={{ flex: 1, textAlign: 'center', fontFamily: k === p.goal ? fonts.semibold : undefined }}>{label}</T>;
            })}
          </View>
        ))}
        <T v="caption" color={colors.mute}>Ton objectif : {usefulnessFor(p.goal).filter((u) => u.level === 'recommended').map((u) => u.name).join(', ') || 'aucun complément indispensable'}.</T>
      </Card>

      <Card style={{ gap: space.s }}>
        <T v="heading">Dosages pour {num(p.weightKg, p.weightKg % 1 ? 1 : 0)} kg</T>
        {g.doses.map((d) => (
          <View key={d.name} style={{ gap: 2 }}>
            <T v="detail" style={{ fontFamily: fonts.medium }}>{d.name}</T>
            <T v="detail" color={colors.soft}>{fill(d.dose)}</T>
          </View>
        ))}
        <T v="caption" color={colors.mute}>{g.cupNote}</T>
      </Card>

      <Card style={{ gap: space.s }}>
        <T v="heading">Dans la journée</T>
        {g.timing.map((t) => <T key={t.when} v="detail" color={colors.soft}><T v="detail" style={{ fontFamily: fonts.semibold }}>{t.when} : </T>{t.what}</T>)}
      </Card>

      <Card><T v="heading">Le pré-workout</T><T v="detail" color={colors.soft}>{g.preworkout}</T></Card>

      <Card style={{ gap: space.s }}>
        <T v="heading">À savoir</T>
        {g.warnings.map((w, i) => <T key={i} v="detail" color={colors.soft}>• {w}</T>)}
      </Card>

      <View style={{ gap: space.s }}>
        <T v="heading">Où les trouver</T>
        <T v="caption" color={colors.mute}>{g.disclosure}</T>
        {g.shops.map((s) => (
          <Card key={s.title}>
            <T style={{ fontFamily: fonts.semibold }}>{s.title}</T>
            <T v="detail" color={colors.soft}>{s.text}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
              {s.links.map((l) => (
                <Pressable key={l.url} accessibilityRole="link" onPress={() => Linking.openURL(l.url)}
                  style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' }}>
                  <T v="caption" color={colors.neon} style={{ fontFamily: fonts.semibold }}>{l.label}</T>
                </Pressable>
              ))}
            </View>
          </Card>
        ))}
        <T v="caption" color={colors.mute}>{g.labels}</T>
      </View>
    </Screen>
  );
}
