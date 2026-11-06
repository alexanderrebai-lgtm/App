import { useState } from 'react';
import { View } from 'react-native';
import { programs } from '@muscu/content';
import { addDays, dayPlan, diffDays, isDeloadWeek, parseIso, phaseOf, PROGRAM_WEEKS } from '@muscu/engine';
import { exerciseName, LEVEL, phaseName, phaseRanges, planLabel } from '../../lib/programView';
import { useApp, useProfile } from '../../store/AppState';
import { colors, space } from '../../theme';
import { Card } from '../../ui/Card';
import { DayDetail } from '../../ui/DayDetail';
import { MonthCalendar } from '../../ui/MonthCalendar';
import { Screen } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';
import { T } from '../../ui/Text';

export default function Sessions() {
  const [tab, setTab] = useState<'calendar' | 'program'>('calendar');
  return (
    <Screen>
      <T v="title" accessibilityRole="header">Séances</T>
      <Segmented<'calendar' | 'program'> options={[{ key: 'calendar', label: 'Calendrier' }, { key: 'program', label: 'Programme' }]} value={tab} onChange={setTab} />
      {tab === 'calendar' ? <CalendarView /> : <ProgramView />}
    </Screen>
  );
}

function CalendarView() {
  const { today } = useApp();
  const p = useProfile();
  const [selected, setSelected] = useState(today);
  const d = parseIso(today);
  const [ym, setYm] = useState({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  return (
    <>
      <MonthCalendar year={ym.year} month={ym.month} selected={selected} onSelect={setSelected} onMonth={(year, month) => setYm({ year, month })} />
      <DayDetail date={selected} plan={dayPlan(p, selected)} />
    </>
  );
}

function ProgramView() {
  const p = useProfile();
  const { today } = useApp();
  const goal = programs.goals[p.goal];
  const offset = diffDays(today, p.startDate);
  const week = Math.min(PROGRAM_WEEKS - 1, Math.max(0, Math.floor(offset / 7)));
  const phase = phaseOf(week, p.level);
  const ranges = phaseRanges(p.level);
  // séances de la semaine en cours (ou de la première semaine si le programme n'a pas commencé)
  const monday = addDays(p.startDate, week * 7);
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => dayPlan(p, addDays(monday, i))).filter((x) => x?.day.kind === 'training');
  return (
    <>
      <Card hero>
        <T v="label" color={colors.neon}>{p.sessionsPerWeek} séances · {LEVEL[p.level]}{p.equipment === 'home' ? ' · à la maison' : ''}</T>
        <T v="title">{goal.name}</T>
        <T v="detail" color={colors.soft}>{goal.description}</T>
      </Card>

      <View style={{ gap: space.m }}>
        <T v="heading">26 semaines</T>
        <View accessibilityLabel={`Semaine ${week + 1} sur 26`} style={{ flexDirection: 'row', gap: 2 }}>
          {Array.from({ length: PROGRAM_WEEKS }, (_, w) => {
            const ph = phaseOf(w, p.level);
            const bg = w === week ? colors.chalk : ph === 0 ? colors.azure : ph === 1 ? colors.neon : colors.coral;
            return <View key={w} style={{ flex: 1, height: isDeloadWeek(w) ? 12 : 20, alignSelf: 'flex-end', borderRadius: 2, backgroundColor: bg, opacity: w < week ? 0.5 : 1 }} />;
          })}
        </View>
        <T v="caption" color={colors.mute}>Barres courtes : semaines allégées. Barre blanche : cette semaine.</T>
        {goal.phaseTexts.map((txt, i) => (
          <Card key={i} style={{ gap: space.xs, borderWidth: i === phase ? 2 : 0, borderColor: colors.neon }}>
            <T v="label" color={i === 0 ? colors.azure : i === 1 ? colors.neon : colors.coral}>
              {ranges[i]} · {phaseName(p.level, i as 0 | 1 | 2)}{i === phase ? ' · en cours' : ''}
            </T>
            <T v="detail" color={colors.soft}>{txt}</T>
          </Card>
        ))}
      </View>

      <View style={{ gap: space.m }}>
        <T v="heading">Tes séances en ce moment</T>
        {days.map((d) => d && (
          <Card key={d.date}>
            <T v="heading">{planLabel(d)}</T>
            {d.items.map((i, k) => (
              <View key={`${i.exercise}-${k}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
                <T v="detail" style={{ flex: 1 }}>{exerciseName(i.exercise)}</T>
                <T v="detail" color={colors.mute}>{i.scheme}</T>
              </View>
            ))}
          </Card>
        ))}
      </View>
    </>
  );
}
