import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  addDays, adherence, applyCalorieAdvice, effectiveTargets, estimate1RM, exerciseCurve, measurementsDue, mondayOf, records, setsPerMuscle,
  tonnage, weightAdvice,
} from '@muscu/engine';
import { dayMonth, num } from '../../lib/format';
import { exerciseName } from '../../lib/programView';
import { useApp, useProfile } from '../../store/AppState';
import { colors, fonts, space } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { Chip } from '../../ui/Chip';
import { LifestyleView } from '../../ui/progress/LifestyleView';
import { ReviewView } from '../../ui/progress/ReviewView';
import { Sparkline } from '../../ui/Sparkline';
import { Stepper } from '../../ui/Stepper';
import { T } from '../../ui/Text';

const MUSCLE_FR: Record<string, string> = {
  chest: 'Pectoraux', back: 'Dos', shoulders: 'Épaules', biceps: 'Biceps', triceps: 'Triceps', quads: 'Quadriceps',
  hamstrings: 'Ischios', glutes: 'Fessiers', calves: 'Mollets', core: 'Gainage', lowerBack: 'Lombaires',
};

type Tab = 'summary' | 'records' | 'body' | 'life' | 'review';
const TABS: [Tab, string][] = [['summary', 'Résumé'], ['records', 'Records'], ['body', 'Corps'], ['life', 'Hygiène de vie'], ['review', 'Bilan']];

export default function Progress() {
  const [tab, setTab] = useState<Tab>('summary');
  return (
    <Screen>
      <T v="title" accessibilityRole="header">Progrès</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {TABS.map(([k, l]) => <Chip key={k} label={l} selected={tab === k} onPress={() => setTab(k)} />)}
      </View>
      {tab === 'summary' ? <Summary /> : tab === 'records' ? <Records /> : tab === 'body' ? <Body /> : tab === 'life' ? <LifestyleView /> : <ReviewView />}
    </Screen>
  );
}

function Summary() {
  const p = useProfile();
  const { sessions, today, exerciseLogs } = useApp();
  const [advanced, setAdvanced] = useState(p.level === 'advanced');
  const a = adherence(p, sessions, today);
  const monday = mondayOf(today);
  const week = tonnage(exerciseLogs, monday, addDays(monday, 6));
  const total = tonnage(exerciseLogs, '0000-01-01', today);
  const muscles = [...setsPerMuscle(exerciseLogs, monday, addDays(monday, 6)).entries()].filter(([m]) => MUSCLE_FR[m]).sort((x, y) => y[1] - x[1]);
  const maxSets = Math.max(1, ...muscles.map(([, n]) => n));
  return (
    <>
      <Card hero>
        <T v="label" color={colors.neon}>Assiduité</T>
        <T v="number">{a.planned ? Math.round(a.rate * 100) : 0} %</T>
        <T v="detail" color={colors.soft}>{a.done} séance{a.done > 1 ? 's' : ''} faite{a.done > 1 ? 's' : ''} sur {a.planned} prévue{a.planned > 1 ? 's' : ''} depuis ton début.</T>
      </Card>
      <View style={{ flexDirection: 'row', gap: space.m }}>
        <Card style={{ flex: 1 }}>
          <T v="caption" color={colors.mute}>Soulevés cette semaine</T>
          <T v="title">{num(week)} <T v="detail" color={colors.mute}>kg</T></T>
        </Card>
        <Card style={{ flex: 1 }}>
          <T v="caption" color={colors.mute}>Depuis le début</T>
          <T v="title">{num(total)} <T v="detail" color={colors.mute}>kg</T></T>
        </Card>
      </View>
      {advanced ? (
        <Card>
          <T v="heading">Séries par muscle cette semaine</T>
          {muscles.length ? muscles.map(([m, n]) => (
            <View key={m} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="detail">{MUSCLE_FR[m]}</T><T v="detail" color={colors.mute}>{n}</T>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line }}>
                <View style={{ width: `${(n / maxSets) * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.azure }} />
              </View>
            </View>
          )) : <T v="detail" color={colors.mute}>Termine une séance guidée pour voir le volume par muscle.</T>}
        </Card>
      ) : (
        <Button label="Voir les statistiques avancées" variant="secondary" onPress={() => setAdvanced(true)} />
      )}
    </>
  );
}

function Records() {
  const p = useProfile();
  const { exerciseLogs } = useApp();
  const recs = useMemo(() => [...records(exerciseLogs).values()].sort((a, b) => (a.date < b.date ? 1 : -1)), [exerciseLogs]);
  const [sel, setSel] = useState<string | null>(null);
  const cur = sel ?? recs[0]?.exercise ?? null;
  if (!recs.length) {
    return <Card><T v="detail" color={colors.soft}>Tes records apparaîtront ici après ta première séance guidée.</T></Card>;
  }
  const curve = cur ? exerciseCurve(exerciseLogs, cur, p.level === 'advanced' ? 'e1rm' : 'kg') : [];
  const curRec = recs.find((r) => r.exercise === cur);
  return (
    <>
      {cur && curRec ? (
        <Card>
          <T v="label" color={colors.mute}>{curRec.cardio ? 'Durée (min)' : p.level === 'advanced' ? '1RM estimé (kg)' : 'Meilleure charge (kg)'}</T>
          <T v="heading">{exerciseName(cur)}</T>
          <Sparkline values={curve.map((c) => Math.round(c.value * 10) / 10)} unit={curRec.cardio ? 'min' : 'kg'} />
        </Card>
      ) : null}
      <View style={{ gap: space.s }}>
        {recs.map((r) => (
          <Pressable key={r.exercise} accessibilityRole="button" accessibilityState={{ selected: r.exercise === cur }} onPress={() => setSel(r.exercise)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, borderWidth: r.exercise === cur ? 2 : 0, borderColor: colors.neon }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontFamily: fonts.semibold }}>{exerciseName(r.exercise)}</T>
                <T v="caption" color={colors.mute}>
                  {dayMonth(r.date)}{!r.cardio && p.level === 'advanced' ? ` · 1RM estimé ${num(estimate1RM(r.kg, r.reps), 1)} kg` : ''}
                </T>
              </View>
              <T v="heading">{r.cardio ? `${num(r.kg)} min` : `${num(r.kg, r.kg % 1 ? 1 : 0)} × ${r.reps}`}</T>
            </Card>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function Body() {
  const p = useProfile();
  const { weights, measurements, today, saveWeight, saveMeasurements, saveProfile } = useApp();
  const last = weights.at(-1);
  const [kg, setKg] = useState(last?.kg ?? p.weightKg);
  const lastM = measurements.at(-1);
  const [m, setM] = useState({ armCm: lastM?.armCm ?? 30, chestCm: lastM?.chestCm ?? 90, waistCm: lastM?.waistCm ?? 80, thighCm: lastM?.thighCm ?? 52 });
  const advice = weightAdvice(weights, p.goal, today, { level: p.level, hardGainer: p.hardGainer });
  const t = effectiveTargets(p);
  const due = measurementsDue(lastM?.date, today);
  return (
    <>
      <Card>
        <T v="heading">Poids de corps</T>
        <T v="detail" color={colors.mute}>Une pesée par semaine, le matin à jeun, de préférence le dimanche.</T>
        <Stepper label="Poids du jour" unit="kg" value={kg} step={0.1} min={35} max={200} decimals={1} onChange={setKg} />
        <Button label={weights.some((w) => w.date === today) ? 'Mettre à jour la pesée du jour' : 'Enregistrer la pesée'} onPress={() => saveWeight({ date: today, kg })} />
        <Sparkline values={weights.map((w) => w.kg)} unit="kg" color={colors.azure} />
        {last ? <T v="detail" color={colors.soft}>Dernière pesée : {num(last.kg, 1)} kg le {dayMonth(last.date)}.</T> : null}
      </Card>

      <Card style={{ borderWidth: advice?.deltaKcal ? 2 : 0, borderColor: colors.neon }}>
        <T v="heading">Ajustement des calories</T>
        {!advice ? (
          <T v="detail" color={colors.soft}>Pèse-toi chaque semaine pendant au moins 2 semaines : l’appli te dira s’il faut ajuster tes calories.</T>
        ) : (
          <>
            <T v="detail" color={colors.soft}>
              {advice.status === 'onTrack' ? 'Ton poids évolue comme prévu' : advice.status === 'belowTarget' ? 'Ton poids évolue moins que prévu' : 'Ton poids évolue plus vite que prévu'}
              {' '}({advice.slope >= 0 ? '+' : ''}{num(advice.slope, 2)} kg par semaine, objectif {num(advice.range[0], 2)} à {num(advice.range[1], 2)}).
            </T>
            {advice.deltaKcal ? (
              <Button label={`${advice.deltaKcal > 0 ? 'Ajouter' : 'Retirer'} ${Math.abs(advice.deltaKcal)} kcal (${num(applyCalorieAdvice(p, advice.deltaKcal).kcal)} kcal)`}
                onPress={() => saveProfile({ ...p, kcalTarget: applyCalorieAdvice(p, advice.deltaKcal).kcal })} />
            ) : <T v="detail" color={colors.mute}>Garde ton objectif actuel ({num(t.kcal)} kcal).</T>}
          </>
        )}
      </Card>

      <Card>
        <T v="heading">Mensurations</T>
        <T v="detail" color={due ? colors.neon : colors.mute}>{due ? 'C’est le moment de te mesurer (toutes les 4 semaines).' : `Prochaine mesure à partir du ${dayMonth(addDays(lastM!.date, 28))}.`}</T>
        <Stepper label="Bras" unit="cm" value={m.armCm} step={0.5} min={15} max={70} decimals={1} onChange={(armCm) => setM({ ...m, armCm })} />
        <Stepper label="Poitrine" unit="cm" value={m.chestCm} step={0.5} min={50} max={180} decimals={1} onChange={(chestCm) => setM({ ...m, chestCm })} />
        <Stepper label="Taille" unit="cm" value={m.waistCm} step={0.5} min={45} max={180} decimals={1} onChange={(waistCm) => setM({ ...m, waistCm })} />
        <Stepper label="Cuisse" unit="cm" value={m.thighCm} step={0.5} min={30} max={100} decimals={1} onChange={(thighCm) => setM({ ...m, thighCm })} />
        <Button label="Enregistrer les mesures" variant={due ? 'primary' : 'secondary'} onPress={() => saveMeasurements({ date: today, ...m })} />
        {measurements.length ? (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row' }}>
              {['Date', 'Bras', 'Poitr.', 'Taille', 'Cuisse'].map((h) => <T key={h} v="caption" color={colors.mute} style={{ flex: 1 }}>{h}</T>)}
            </View>
            {measurements.slice(-4).reverse().map((x) => (
              <View key={x.date} style={{ flexDirection: 'row' }}>
                {[dayMonth(x.date), x.armCm, x.chestCm, x.waistCm, x.thighCm].map((v, i) => (
                  <T key={i} v="detail" style={{ flex: 1 }}>{typeof v === 'number' ? num(v, v % 1 ? 1 : 0) : v}</T>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </Card>
      <T v="caption" color={colors.mute}>Les photos de progression arriveront plus tard, gardées chiffrées sur ce téléphone.</T>
    </>
  );
}
