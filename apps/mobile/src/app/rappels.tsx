import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { reminderPlan, type ReminderSettings, type Time } from '@muscu/engine';
import { askPermission, notificationsSupported, scheduleReminders } from '../lib/notifications';
import { useApp, useProfile } from '../store/AppState';
import { colors, fonts, radius, space } from '../theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Screen } from '../ui/Screen';
import { T } from '../ui/Text';

const hhmm = (t: Time) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
const shift = (t: Time, min: number): Time => {
  const x = (((t.hour * 60 + t.minute + min) % 1440) + 1440) % 1440;
  return { hour: Math.floor(x / 60), minute: x % 60 };
};

function TimeField({ label, value, onChange }: { label: string; value: Time; onChange(t: Time): void }) {
  const b = (d: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} : ${d > 0 ? 'plus tard' : 'plus tôt'} de 15 minutes`} onPress={() => onChange(shift(value, d))}
      style={{ width: 44, height: 44, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
      <T v="heading">{d > 0 ? '+' : '−'}</T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
      <T v="detail" style={{ flex: 1 }}>{label}</T>
      {b(-15)}
      <T v="heading" style={{ minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{hhmm(value)}</T>
      {b(15)}
    </View>
  );
}

function Section({ title, desc, on, onToggle, children }: { title: string; desc: string; on: boolean; onToggle(v: boolean): void; children?: React.ReactNode }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <View style={{ flex: 1 }}>
          <T v="heading">{title}</T>
          <T v="detail" color={colors.soft}>{desc}</T>
        </View>
        <Switch accessibilityLabel={title} value={on} onValueChange={onToggle} trackColor={{ false: colors.line, true: colors.neon }} thumbColor={colors.chalk} ios_backgroundColor={colors.line} />
      </View>
      {on ? children : null}
    </Card>
  );
}

const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Collation', 'Dîner'];

export default function Reminders() {
  const p = useProfile();
  const { reminders, saveReminders } = useApp();
  const [r, setR] = useState<ReminderSettings>(reminders);
  const [status, setStatus] = useState<string | null>(null);
  const plan = reminderPlan(p, r);
  const save = async () => {
    await saveReminders(r);
    if (!notificationsSupported) { setStatus('Réglages enregistrés. Les notifications fonctionnent sur le téléphone, pas dans l’aperçu web.'); return; }
    const ok = await askPermission();
    if (!ok) { setStatus('Notifications refusées : autorise Élan dans Réglages › Notifications de ton iPhone, puis enregistre à nouveau.'); return; }
    const n = await scheduleReminders(plan);
    setStatus(`${n} rappel${n > 1 ? 's' : ''} programmé${n > 1 ? 's' : ''} chaque semaine.`);
  };
  return (
    <Screen footer={<Button label="Enregistrer mes rappels" onPress={save} />}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => (router.canGoBack() ? router.back() : router.replace('/profil'))}
        style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" color={colors.chalk} size={20} />
      </Pressable>
      <View style={{ gap: space.xs }}>
        <T v="title" accessibilityRole="header">Rappels</T>
        <T v="detail" color={colors.soft}>Des notifications sur ton téléphone, aux heures que tu choisis. Elles sont programmées sur l’appareil, sans serveur.</T>
      </View>
      <Section title="Séances" desc="Les jours de séance du programme." on={r.sessions.on} onToggle={(on) => setR({ ...r, sessions: { ...r.sessions, on } })}>
        <TimeField label="Heure" value={r.sessions.time} onChange={(time) => setR({ ...r, sessions: { ...r.sessions, time } })} />
      </Section>
      <Section title="Compléments" desc="Chaque jour, avec la liste du jour." on={r.supplements.on} onToggle={(on) => setR({ ...r, supplements: { ...r.supplements, on } })}>
        <TimeField label="Heure" value={r.supplements.time} onChange={(time) => setR({ ...r, supplements: { ...r.supplements, time } })} />
      </Section>
      <Section title="Pesée du dimanche" desc="Une fois par semaine, le matin à jeun." on={r.weighIn.on} onToggle={(on) => setR({ ...r, weighIn: { ...r.weighIn, on } })}>
        <TimeField label="Heure" value={r.weighIn.time} onChange={(time) => setR({ ...r, weighIn: { ...r.weighIn, time } })} />
      </Section>
      <Section title="Repas" desc="Les 4 prises de la journée." on={r.meals.on} onToggle={(on) => setR({ ...r, meals: { ...r.meals, on } })}>
        {r.meals.times.map((t, i) => (
          <TimeField key={i} label={MEALS[i]!} value={t} onChange={(nt) => {
            const times = [...r.meals.times] as ReminderSettings['meals']['times'];
            times[i] = nt;
            setR({ ...r, meals: { ...r.meals, times } });
          }} />
        ))}
      </Section>
      <T v="caption" color={colors.mute}>{plan.length} rappel{plan.length > 1 ? 's' : ''} par semaine.</T>
      {status ? <Card style={{ backgroundColor: colors.slateHi }}><T v="detail" style={{ fontFamily: fonts.medium }}>{status}</T></Card> : null}
    </Screen>
  );
}
