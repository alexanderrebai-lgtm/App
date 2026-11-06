import { View } from 'react-native';
import { router } from 'expo-router';
import { content, programs } from '@muscu/content';
import { boostersFor, coachingPlan, deloadAdvice, plateaus } from '@muscu/engine';
import { num } from '../lib/format';
import { exerciseName, LEVEL, MUSCLE_FR } from '../lib/programView';
import { useApp, useProfile } from '../store/AppState';
import { colors, space } from '../theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CloseButton } from '../ui/CloseButton';
import { Screen } from '../ui/Screen';
import { T } from '../ui/Text';

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, height: 8, backgroundColor: color }} />
    </View>
  );
}

const why = content.why;

/** « Mon coaching » : ce que l'application a décidé pour toi, et pourquoi. */
export default function Coaching() {
  const p = useProfile();
  const { today, checkIns, exerciseLogs, sessions, saveProfile } = useApp();
  const c = coachingPlan(p, today);
  const goal = programs.goals[p.goal];
  const deload = deloadAdvice(p, { checkIns, exerciseLogs, sessions }, today);
  const stuck = plateaus(exerciseLogs, today);
  const gap = c.hardGainer ? boostersFor(300) : null;
  const setDeload = (value: boolean | null) => {
    if (!deload) return;
    const o = { ...(p.deloadOverrides ?? {}) };
    if (value === null) delete o[deload.weekIndex]; else o[deload.weekIndex] = value;
    return saveProfile({ ...p, deloadOverrides: o });
  };
  const overridden = deload ? p.deloadOverrides?.[deload.weekIndex] !== undefined : false;
  const [kLo, kHi] = c.trendKgPerWeek;
  return (
    <Screen>
      <CloseButton fallback="/profil" />
      <T v="title" accessibilityRole="header">Mon coaching</T>

      <Card hero style={{ backgroundColor: colors.neon }}>
        <T v="label" color={colors.night}>{goal.name} · {LEVEL[p.level]}</T>
        <T color={colors.night}>{c.levelText}</T>
        <T v="detail" color={colors.night}>
          {c.sessionsOk ? `Tes ${p.sessionsPerWeek} séances par semaine conviennent à ton niveau.`
            : `Pour ton niveau, ${c.recommendedSessions[0]} à ${c.recommendedSessions[1]} séances par semaine sont conseillées ; tu en fais ${p.sessionsPerWeek}.`}
        </T>
      </Card>

      {deload && deload.action !== 'keep' ? (
        <Card style={{ borderWidth: 2, borderColor: colors.neon }}>
          <T v="heading">{why.deload.title}</T>
          {deload.reasons.map((r) => <T key={r} v="detail" color={colors.soft}>• {why.deload.reasons[r]}</T>)}
          {overridden ? <Button label={why.deload.undo} variant="secondary" onPress={() => setDeload(null)} />
            : <Button label={deload.action === 'now' ? why.deload.now : why.deload.skip} onPress={() => setDeload(deload.action === 'now')} />}
        </Card>
      ) : null}

      {stuck.length ? (
        <Card>
          <T v="heading">Exercices qui stagnent</T>
          {stuck.map((s) => (
            <T key={s.exercise} v="detail" color={colors.soft}>
              {exerciseName(s.exercise)} : pas de progrès sur {s.sessions} séances (dernière le {s.lastDate.slice(8)}/{s.lastDate.slice(5, 7)}, {num(s.best, 1)} kg estimés). Dors plus, mange un peu plus ou varie les répétitions.
            </T>
          ))}
        </Card>
      ) : null}

      <Card>
        <T v="heading">Tes calories</T>
        <T v="number">{num(c.kcal.value)} <T v="body" color={colors.mute}>kcal par jour</T></T>
        <T v="detail" color={colors.soft}>
          Ton entretien est d’environ {num(c.kcal.maintenance)} kcal. Ta cible est à {c.kcal.percentOfMaintenance} % de l’entretien
          ({c.kcal.offset > 0 ? '+' : ''}{c.kcal.offset} kcal){c.kcal.adjusted ? ', ajustée d’après ton poids' : ''}.
        </T>
        <T v="detail" color={colors.soft}>
          Rythme visé : {kLo > 0 ? '+' : ''}{num(kLo, 2)} à {kHi > 0 ? '+' : ''}{num(kHi, 2)} kg par semaine ({c.trendPctPerMonth[0]} à {c.trendPctPerMonth[1]} % du poids par mois).
        </T>
        <T v="detail" color={colors.soft}>Protéines : {c.targets.protein} g, soit {num(c.proteinPerKg, 1)} g par kg. {why.goals[p.goal].nutrition}</T>
      </Card>

      {c.volume ? (
        <Card style={{ gap: space.m }}>
          <T v="heading">Séries par muscle chaque semaine</T>
          <T v="detail" color={colors.soft}>
            Cible générale : {c.volumeTarget![0]} à {c.volumeTarget![1]} séries par muscle. Une série d’un exercice qui en sollicite un autre compte pour moitié.
          </T>
          {c.volume.filter((r) => r.evaluated).map((r) => (
            <View key={r.muscle} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="detail">{MUSCLE_FR[r.muscle] ?? r.muscle}</T>
                <T v="detail" color={r.status === 'ok' ? colors.neon : colors.coral}>
                  {num(r.sets, 1)} / {r.target[0]}–{r.target[1]}{r.status === 'low' ? ' · un peu bas' : r.status === 'high' ? ' · élevé' : ''}
                </T>
              </View>
              <Bar value={r.sets} max={r.target[1]} color={r.status === 'ok' ? colors.neon : colors.coral} />
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <T v="heading">{why.progression.title}</T>
        <T v="detail" color={colors.soft}>{why.progression.text}</T>
      </Card>

      <View style={{ gap: space.m }}>
        <T v="heading">Pourquoi ces répétitions</T>
        {why.zones.filter((z) => z.id !== 'timed').map((z) => (
          <Card key={z.id} style={{ gap: space.xs }}>
            <T v="label" color={colors.neon}>{z.label} · {z.min}–{z.max} répétitions</T>
            <T v="detail" color={colors.soft}>{z.text}</T>
            <T v="detail" color={colors.mute}>{z.restText}</T>
          </Card>
        ))}
      </View>

      <View style={{ gap: space.m }}>
        <T v="heading">Pourquoi trois phases</T>
        {why.phaseWhy.map((t, i) => <Card key={i}><T v="detail" color={colors.soft}>{t}</T></Card>)}
      </View>

      {c.hardGainer ? (
        <Card style={{ borderWidth: 2, borderColor: colors.neon }}>
          <T v="heading">{why.hardGainer.title}</T>
          <T v="detail" color={colors.soft}>{why.hardGainer.intro}</T>
          {why.hardGainer.tips.map((t, i) => <T key={i} v="detail" color={colors.soft}>• {t.text}</T>)}
          {gap ? <T v="detail" color={colors.mute}>Exemples d’ajouts : {gap.items.map((b) => `${b.label} (${b.kcal} kcal)`).join(', ')}.</T> : null}
        </Card>
      ) : null}
      {p.goal === 'fatloss' ? (
        <Card>
          <T v="heading">{why.fatLoss.title}</T>
          {why.fatLoss.tips.map((t, i) => <T key={i} v="detail" color={colors.soft}>• {t}</T>)}
        </Card>
      ) : null}

      <Button label="Voir les preuves et les sources" variant="secondary" onPress={() => router.push('/preuves')} />
      <T v="caption" color={colors.mute}>Élan n’est pas un avis médical. Dernière séance de cardio : parle-nous de ton ressenti plutôt que de ton pouls ; si tu peux parler, l’effort est bon.</T>
    </Screen>
  );
}
