import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, useWindowDimensions, Vibration, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exerciseById } from '@muscu/content';
import {
  dayPlan, explainExercise, fr, isLowReadiness, records, restRemaining, restSeconds, sessionReducer, sessionResult, startSession, substituteFor,
  workingLoad, type SessionAction, type SessionState,
} from '@muscu/engine';
import { num } from '../../lib/format';
import { exerciseName, planLabel, techniqueText } from '../../lib/programView';
import { useApp, useProfile } from '../../store/AppState';
import type { ViewName } from '../../three/scene';
import { colors, fonts, gutter, radius, space } from '../../theme';
import { BigStepper } from '../../ui/BigStepper';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { Mannequin3D } from '../../ui/Mannequin3D';
import { Ring } from '../../ui/Ring';
import { Stepper } from '../../ui/Stepper';
import { T } from '../../ui/Text';

const MUSCLE_FR: Record<string, string> = {
  chest: 'Pectoraux', back: 'Dos', shoulders: 'Épaules', biceps: 'Biceps', triceps: 'Triceps', quads: 'Quadriceps',
  hamstrings: 'Ischio-jambiers', glutes: 'Fessiers', calves: 'Mollets', core: 'Gainage', lowerBack: 'Lombaires',
  fullBody: 'Tout le corps', cardio: 'Cardio', mobility: 'Mobilité',
};
const JOINT_FR: Record<string, string> = { shoulder: 'l’épaule', knee: 'le genou', lowerBack: 'le bas du dos', wrist: 'le poignet', elbow: 'le coude' };
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;
const restLabel = (s: number) => (s % 60 ? mmss(s) : `${s / 60} min`);

/** Écran maintenu allumé pendant la séance (refusé sans gravité sur certains navigateurs). */
function useScreenAwake() {
  useEffect(() => {
    activateKeepAwakeAsync('seance').catch(() => {});
    return () => { deactivateKeepAwake('seance').catch(() => {}); };
  }, []);
}

export default function GuidedSession() {
  useScreenAwake();
  const { date } = useLocalSearchParams<{ date: string }>();
  const p = useProfile();
  const app = useApp();
  const plan = date ? dayPlan(p, date) : null;
  const [s, setS] = useState<SessionState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [quit, setQuit] = useState(false);
  const prevPhase = useRef<SessionState['phase'] | null>(null);

  useEffect(() => {
    (async () => {
      if (!plan) return;
      const saved = await app.loadActiveSession();
      if (saved && saved.date === date && saved.phase !== 'done') { setS(saved); return; }
      const check = app.checkIns.find((c) => c.date === date);
      setS(startSession({
        plan, goal: p.goal, history: app.exerciseLogs, lowReadiness: isLowReadiness(check), now: Date.now(),
        oneRepMaxes: p.level !== 'beginner' ? p.oneRepMaxes : undefined, maxDumbbellKg: p.maxDumbbellKg,
      }, fr.sessionLabels[plan.label] ?? plan.label));
    })();
    // une seule initialisation par ouverture de l'écran
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dispatch = useCallback((a: SessionAction) => setS((cur) => (cur ? sessionReducer(cur, a) : cur)), []);

  // garde la séance pour la reprendre après une interruption
  useEffect(() => { if (s && s.phase !== 'done') app.saveActiveSession(s); }, [s, app]);

  // horloge : chrono de séance et fin du repos (vibration)
  useEffect(() => {
    const t = setInterval(() => { const n = Date.now(); setNow(n); dispatch({ type: 'tick', now: n }); }, 250);
    return () => clearInterval(t);
  }, [dispatch]);
  useEffect(() => {
    if (!s) return;
    if (prevPhase.current === 'rest' && s.phase !== 'rest') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (Platform.OS === 'android') Vibration.vibrate(400);
    }
    prevPhase.current = s.phase;
  }, [s]);

  if (!plan || !date) {
    return <Shell><T v="title">Pas de séance ce jour-là</T><Button label="Retour" onPress={() => router.back()} /></Shell>;
  }
  if (!s) return <Shell><T color={colors.mute}>Préparation de la séance…</T></Shell>;

  const e = s.exercises[s.index];
  const elapsed = Math.floor((now - s.startedAt) / 1000);
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m }}>
      <RoundButton icon="close" label="Quitter la séance" onPress={() => setQuit(true)} />
      <T v="detail" style={{ fontFamily: fonts.semibold }}>
        {s.phase === 'done' ? planLabel(plan) : `Exercice ${s.index + 1} sur ${s.exercises.length}`}
      </T>
      <T v="detail" color={colors.mute} style={{ minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{mmss(elapsed)}</T>
    </View>
  );

  if (quit) {
    return (
      <Shell>
        <T v="title">Quitter la séance ?</T>
        <T color={colors.soft}>Ta séance est gardée : tu pourras la reprendre depuis le calendrier ou l’accueil.</T>
        <Button label="Continuer la séance" onPress={() => setQuit(false)} />
        <Button label="Quitter pour l’instant" variant="secondary" onPress={() => router.back()} />
        <Button label="Terminer maintenant" variant="secondary" onPress={() => { dispatch({ type: 'finish', now: Date.now() }); setQuit(false); }} />
      </Shell>
    );
  }

  if (s.phase === 'done' || !e) return <Done s={s} header={header} />;
  if (s.phase === 'intro') return <Intro s={s} dispatch={dispatch} header={header} />;
  if (s.phase === 'rest') {
    const left = restRemaining(s, now);
    const next = s.exercises[s.index]!;
    const nextLine = next.sets.length
      ? `Série ${next.sets.length + 1} · ${num(s.kg, s.kg % 1 ? 1 : 0)} kg × ${s.reps}`
      : `Prochain : ${exerciseName(next.exercise)}`;
    return (
      <Shell footer={(
        <View style={{ flexDirection: 'row', gap: space.s }}>
          <Button label="+30 s" variant="secondary" style={{ flex: 1, minHeight: 56 }} onPress={() => dispatch({ type: 'addRest', seconds: 30 })} />
          <Button label="Passer le repos" style={{ flex: 1 }} onPress={() => dispatch({ type: 'skipRest' })} />
        </View>
      )}>
        {header}
        <View style={{ alignItems: 'center', gap: space.xxl, paddingTop: space.xxl }}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`Repos : encore ${left} secondes`}>
            <Ring size={232} progress={s.restTotal ? left / s.restTotal : 0} />
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <T v="label" color={colors.mute}>Repos</T>
              <T style={{ fontFamily: fonts.displayBold, fontSize: 56, lineHeight: 60, fontVariant: ['tabular-nums'] }}>{mmss(left)}</T>
              <T v="caption" color={colors.mute}>sur {mmss(s.restTotal)}</T>
            </View>
          </View>
          <Card style={{ alignSelf: 'stretch' }}>
            <T v="caption" color={colors.mute}>Ensuite</T>
            <T v="heading">{nextLine}</T>
          </Card>
          <T v="detail" color={colors.soft} style={{ textAlign: 'center', maxWidth: 300 }}>Respire par le ventre et bois une gorgée d’eau. Le téléphone vibre à la fin du repos.</T>
        </View>
      </Shell>
    );
  }
  return <SetScreen s={s} dispatch={dispatch} header={header} />;
}

function Shell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }}>
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.xl }}>{children}</ScrollView>
      {footer ? <View style={{ paddingHorizontal: gutter, paddingBottom: space.l, paddingTop: space.s, gap: space.s }}>{footer}</View> : null}
    </SafeAreaView>
  );
}

function RoundButton({ icon, label, onPress }: { icon: 'close' | 'chevronLeft'; label: string; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(14,18,32,0.72)', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} color={colors.chalk} size={20} />
    </Pressable>
  );
}

function Pill({ label, on, onPress }: { label: string; on: boolean; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} hitSlop={6}
      style={{ height: 36, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', backgroundColor: on ? colors.chalk : 'rgba(14,18,32,0.72)' }}>
      <T v="caption" color={on ? colors.night : colors.chalk} style={{ fontFamily: fonts.semibold }}>{label}</T>
    </Pressable>
  );
}

// ---------- présentation de l'exercice, avec le mannequin 3D ----------

function Intro({ s, dispatch, header }: { s: SessionState; dispatch(a: SessionAction): void; header: React.ReactNode }) {
  const p = useProfile();
  const { exerciseLogs, saveProfile } = useApp();
  const { height } = useWindowDimensions();
  const e = s.exercises[s.index]!;
  const ex = exerciseById.get(e.exercise);
  const muscles = ex?.muscles ?? [];
  const [view, setView] = useState<ViewName>('three');
  const [slow, setSlow] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [phase, setPhase] = useState('');
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then((r) => { if (r) setPlaying(false); }).catch(() => {}); }, []);
  const [orm, setOrm] = useState<number | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const why = useMemo(() => explainExercise(e.exercise, e.scheme.raw, { goal: s.goal, phase: dayPlan(p, s.date)?.phase ?? 0 }), [e.exercise, e.scheme.raw, s.goal, s.date, p]);
  const cues = useMemo(() => {
    const t = techniqueText(e.exercise);
    return t ? t.split(/(?<=\.)\s+/) : ['Mouvement contrôlé, sans à-coups.', 'Expire pendant l’effort.', 'Arrête-toi en cas de douleur vive.'];
  }, [e.exercise]);
  const alt = e.sets.length ? null : substituteFor(e.exercise, p.equipment, s.exercises.map((x) => x.exercise));
  const lighter = e.targetSets && e.targetSets < e.scheme.sets;
  const charge = e.free ? 'libre' : s.kg ? `${num(s.kg, s.kg % 1 ? 1 : 0)} kg` : 'à trouver';
  const advanced = p.level !== 'beginner' && !e.free && !e.suggestedKg && !e.sets.length && e.scheme.topReps > 0;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ height: Math.round(height * 0.45) }}>
        <Mannequin3D exerciseId={e.exercise} muscles={muscles} slow={slow ? 0.5 : 1} view={view} playing={playing} style={{ flex: 1 }}
          onPhase={(label) => setPhase(label)} />
        <SafeAreaView edges={['top']} style={{ position: 'absolute', left: gutter, right: gutter, top: 0 }} pointerEvents="box-none">
          <View style={{ paddingTop: space.s }}>{header}</View>
        </SafeAreaView>
        <View pointerEvents="box-none" style={{ position: 'absolute', left: space.l, right: space.l, bottom: space.l, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View accessibilityLiveRegion="polite">
            <T v="heading" color={colors.neon} style={{ fontFamily: fonts.displayBold }}>{phase}</T>
            <View style={{ flexDirection: 'row', gap: space.m }}>
              <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Mettre le mouvement en pause' : 'Lancer le mouvement'} onPress={() => setPlaying(!playing)} hitSlop={10}>
                <T v="caption" color={colors.soft} style={{ fontFamily: fonts.semibold }}>{playing ? 'Pause' : 'Lecture'}</T>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: slow }} onPress={() => setSlow(!slow)} hitSlop={10}>
                <T v="caption" color={colors.soft}>{slow ? 'Vitesse normale' : 'Ralenti'}</T>
              </Pressable>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['face', 'three', 'side'] as const).map((v) => (
              <Pill key={v} label={v === 'face' ? 'Face' : v === 'side' ? 'Profil' : '3/4'} on={view === v} onPress={() => setView(v)} />
            ))}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.l }}>
        <View style={{ gap: space.s }}>
          <T v="title" accessibilityRole="header">{exerciseName(e.exercise)}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
            {muscles.map((m) => (
              <View key={m} style={{ backgroundColor: colors.neonSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <T v="caption" color={colors.neon} style={{ fontFamily: fonts.semibold }}>{MUSCLE_FR[m] ?? m}</T>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.s }}>
          <Tile value={e.free ? e.scheme.raw : `${e.targetSets} × ${e.scheme.raw.split('×')[1] ?? ''}`} label={lighter ? 'séries (allégée)' : 'séries'} />
          <Tile value={charge} label={e.free ? 'durée et distance' : 'charge proposée'} />
          <Tile value={e.free ? '—' : restLabel(restSeconds(e.scheme, s.goal))} label="repos" />
        </View>
        {advanced ? (
          <Card>
            <T v="heading">Tu connais ton 1RM ?</T>
            {orm === null ? (
              <Button label="Indiquer mon 1RM" variant="secondary" onPress={() => setOrm(p.oneRepMaxes?.[e.exercise] ?? 40)} />
            ) : (
              <>
                <Stepper label="1RM (charge maximale sur 1 répétition)" unit="kg" value={orm} step={2.5} min={5} max={400} decimals={1} onChange={setOrm} />
                <T v="detail" color={colors.soft}>Charge de travail pour {e.scheme.topReps} répétitions avec 2 en réserve : {num(workingLoad(orm, e.scheme.topReps, 2), 1)} kg.</T>
                <Button label="Utiliser cette charge" onPress={async () => {
                  dispatch({ type: 'setKg', kg: workingLoad(orm, e.scheme.topReps, 2) });
                  await saveProfile({ ...p, oneRepMaxes: { ...(p.oneRepMaxes ?? {}), [e.exercise]: orm } });
                  setOrm(null);
                }} />
              </>
            )}
          </Card>
        ) : null}
        {why ? (
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: whyOpen }} onPress={() => setWhyOpen(!whyOpen)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="heading">Pourquoi cet exercice ?</T>
                <T v="detail" color={colors.neon}>{whyOpen ? '−' : '+'}</T>
              </View>
              <T v="detail" color={colors.soft}>{why.role.label} : {why.role.text}</T>
              {whyOpen ? (
                <>
                  <T v="detail" color={colors.soft}>{why.zone.label} : {why.zone.text}</T>
                  {why.restSeconds ? <T v="detail" color={colors.soft}>{why.zone.restText}</T> : null}
                  <T v="detail" color={colors.soft}>Effort : {why.rir}</T>
                  <T v="detail" color={colors.soft}>{why.goalText}</T>
                  {why.joints.length ? <T v="detail" color={colors.mute}>Sollicite : {why.joints.map((j) => JOINT_FR[j] ?? j).join(', ')}. Dis-le dans ton profil si une de ces zones te fait mal.</T> : null}
                </>
              ) : null}
            </Card>
          </Pressable>
        ) : null}
        <View style={{ gap: space.s }}>
          <T v="heading">Les points clés</T>
          {cues.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space.s }}>
              <T v="detail" color={colors.neon} style={{ fontFamily: fonts.semibold }}>{i + 1}.</T>
              <T v="detail" color={colors.soft} style={{ flex: 1 }}>{c}</T>
            </View>
          ))}
          {!s.kg && !e.free ? <T v="detail" color={colors.mute}>Première fois : choisis une charge qui te laisse 3 à 4 répétitions en réserve.</T> : null}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: gutter, paddingBottom: space.m, gap: space.s }}>
        <Button label={e.free ? 'C’est parti' : `Je suis prêt · série ${e.sets.length + 1}`} onPress={() => dispatch({ type: 'begin' })} />
        <View style={{ flexDirection: 'row', gap: space.s }}>
          {alt ? <Button label="Remplacer" variant="secondary" style={{ flex: 1 }} onPress={() => dispatch({ type: 'replace', exercise: alt, history: exerciseLogs })} accessibilityHint={`Par ${exerciseName(alt)}`} /> : null}
          <Button label="Passer" variant="secondary" style={{ flex: 1 }} onPress={() => dispatch({ type: 'skipExercise', now: Date.now() })} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.slate, borderRadius: radius.button, padding: space.m, gap: 2 }}>
      <T v="heading" style={{ fontFamily: fonts.displayBold }} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
      <T v="caption" color={colors.mute}>{label}</T>
    </View>
  );
}

// ---------- série en cours ----------

function SetScreen({ s, dispatch, header }: { s: SessionState; dispatch(a: SessionAction): void; header: React.ReactNode }) {
  const p = useProfile();
  const e = s.exercises[s.index]!;
  const [minutes, setMinutes] = useState(() => parseInt(e.scheme.raw, 10) || 10);
  const [km, setKm] = useState(0);
  const prev = e.sets.at(-1);
  if (e.free) {
    return (
      <Shell footer={(
        <>
          <Button label="Fait" onPress={() => dispatch({ type: 'logFree', minutes, km, now: Date.now() })} />
          <Button label="Passer" variant="secondary" onPress={() => dispatch({ type: 'skipExercise', now: Date.now() })} />
        </>
      )}>
        {header}
        <T v="title">{exerciseName(e.exercise)}</T>
        <T color={colors.soft}>{e.scheme.raw}. Note ta durée et ta distance si tu la connais.</T>
        <Stepper label="Durée" unit="min" value={minutes} step={1} min={1} max={240} onChange={setMinutes} />
        <Stepper label="Distance (facultatif)" unit="km" value={km} step={0.1} min={0} max={100} decimals={1} onChange={setKm} />
      </Shell>
    );
  }
  const hint = prev
    ? prev.feedback === 'easy' ? `+2,5 kg : la série précédente était facile (${num(prev.kg, prev.kg % 1 ? 1 : 0)} kg × ${prev.reps})`
      : prev.feedback === 'hard' ? `−2,5 kg : la série précédente était dure (${num(prev.kg, prev.kg % 1 ? 1 : 0)} kg × ${prev.reps})`
      : `Même charge que la série précédente (${num(prev.kg, prev.kg % 1 ? 1 : 0)} kg × ${prev.reps})`
    : e.suggestedKg ? 'D’après ta dernière séance' : 'Charge qui te laisse 3 à 4 répétitions en réserve';
  return (
    <Shell footer={<Button label="Valider la série" disabled={s.reps <= 0} onPress={() => dispatch({ type: 'validateSet', now: Date.now() })} />}>
      {header}
      <Pressable accessibilityRole="button" accessibilityHint="Revoir le mouvement en 3D" onPress={() => dispatch({ type: 'review' })}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="heading">{exerciseName(e.exercise)}</T>
            <T v="detail" color={colors.mute}>Série {e.sets.length + 1} sur {e.targetSets} · vise {e.scheme.raw.split('×')[1]?.trim()}</T>
          </View>
          <T v="caption" color={colors.neon} style={{ fontFamily: fonts.semibold }}>Revoir en 3D</T>
        </Card>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`${e.sets.length} séries faites sur ${e.targetSets}`}>
        {Array.from({ length: e.targetSets }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < e.sets.length ? colors.neon : i === e.sets.length ? colors.chalk : colors.line }} />
        ))}
      </View>
      <View style={{ gap: space.s }}>
        <BigStepper label="Poids" unit="kg" value={s.kg} step={2.5} decimals={1} onDelta={(d) => dispatch({ type: 'adjustKg', delta: d })} />
        <T v="caption" color={colors.mute} style={{ textAlign: 'center' }}>{hint}</T>
      </View>
      <BigStepper label="Répétitions" value={s.reps} step={1} onDelta={(d) => dispatch({ type: 'adjustReps', delta: d })} />
      <View style={{ gap: space.s }}>
        <T v="label" color={colors.mute}>Comment c’était ?</T>
        <View style={{ flexDirection: 'row', gap: space.s }}>
          {([['easy', 'Facile'], ['good', 'Bien'], ['hard', 'Dur']] as const).map(([k, l]) => (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: s.feedback === k }} aria-checked={s.feedback === k} onPress={() => dispatch({ type: 'feedback', value: k })}
              style={{ flex: 1, minHeight: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: s.feedback === k ? colors.chalk : colors.line, backgroundColor: s.feedback === k ? colors.chalk : 'transparent' }}>
              <T v="detail" color={s.feedback === k ? colors.night : colors.chalk} style={{ fontFamily: fonts.semibold }}>{l}</T>
            </Pressable>
          ))}
        </View>
        <T v="caption" color={colors.mute}>Facile : +2,5 kg à la série suivante. Dur : −2,5 kg.</T>
      </View>
      {p.level === 'advanced' ? (
        <View style={{ gap: space.s }}>
          <T v="label" color={colors.mute}>Répétitions en réserve (facultatif)</T>
          <View style={{ flexDirection: 'row', gap: space.s }}>
            {[0, 1, 2, 3, 4].map((n) => (
              <Pressable key={n} accessibilityRole="radio" accessibilityState={{ checked: s.rir === n }} aria-checked={s.rir === n} accessibilityLabel={`${n} en réserve, RPE ${10 - n}`}
                onPress={() => dispatch({ type: 'rir', value: s.rir === n ? null : n })}
                style={{ flex: 1, minHeight: 44, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: s.rir === n ? colors.azure : colors.line, backgroundColor: s.rir === n ? colors.azure : 'transparent' }}>
                <T v="detail" color={s.rir === n ? colors.night : colors.chalk} style={{ fontFamily: fonts.semibold }}>{n === 4 ? '4+' : n}</T>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Shell>
  );
}

// ---------- fin de séance ----------

function Done({ s, header }: { s: SessionState; header: React.ReactNode }) {
  const p = useProfile();
  const { exerciseLogs, saveSessionResult } = useApp();
  const [feeling, setFeeling] = useState<1 | 2 | 3 | 4 | 5 | null>(s.feeling);
  const [busy, setBusy] = useState(false);
  const r = sessionResult(s, p.id, Date.now());
  const before = records(exerciseLogs.filter((l) => !l.cardio), s.date);
  const after = records(r.logs.filter((l) => !l.cardio));
  const newRecords = [...after.values()].filter((x) => { const b = before.get(x.exercise); return b && x.score > b.score * 1.001; });
  return (
    <Shell footer={<Button label="Enregistrer la séance" busy={busy} onPress={async () => {
      setBusy(true);
      await saveSessionResult(s.date, r, feeling);
      router.dismissAll();
      router.replace('/');
    }} />}>
      {header}
      <T v="title">Séance terminée</T>
      <View style={{ flexDirection: 'row', gap: space.s }}>
        <Tile value={`${r.durationMin} min`} label="durée" />
        <Tile value={String(r.sets)} label="séries" />
        <Tile value={`${num(r.volumeKg)} kg`} label="soulevés" />
      </View>
      {newRecords.length ? (
        <Card style={{ backgroundColor: colors.coral }}>
          <T v="label" color={colors.night}>{newRecords.length > 1 ? `${newRecords.length} records` : 'Nouveau record'}</T>
          {newRecords.map((x) => <T key={x.exercise} color={colors.night}>{exerciseName(x.exercise)} : {num(x.kg, x.kg % 1 ? 1 : 0)} kg × {x.reps}</T>)}
        </Card>
      ) : null}
      <View style={{ gap: space.s }}>
        <T v="heading">Comment te sens-tu ?</T>
        <View style={{ flexDirection: 'row', gap: space.s }}>
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <Pressable key={n} accessibilityRole="radio" accessibilityState={{ checked: feeling === n }} aria-checked={feeling === n} accessibilityLabel={`Ressenti ${n} sur 5`} onPress={() => setFeeling(n)}
              style={{ flex: 1, minHeight: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: feeling === n ? colors.neon : colors.line, backgroundColor: feeling === n ? colors.neon : 'transparent' }}>
              <T v="heading" color={feeling === n ? colors.night : colors.chalk}>{n}</T>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="caption" color={colors.mute}>Épuisé</T><T v="caption" color={colors.mute}>Au top</T>
        </View>
      </View>
    </Shell>
  );
}
