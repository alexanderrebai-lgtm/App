import { Pressable, View } from 'react-native';
import { monthGrid, shiftMonth } from '../lib/calendar';
import { DAY_INITIALS, monthTitle } from '../lib/format';
import { kindColor, planLabel } from '../lib/programView';
import { useApp, useProfile } from '../store/AppState';
import { colors, fonts, space } from '../theme';
import { Icon } from './Icon';
import { T } from './Text';

interface Props {
  year: number;
  month: number;
  selected: string;
  onSelect(date: string): void;
  onMonth(year: number, month: number): void;
}

export function MonthCalendar({ year, month, selected, onSelect, onMonth }: Props) {
  const p = useProfile();
  const { sessions, today } = useApp();
  const done = new Set(sessions.filter((s) => s.done).map((s) => s.date));
  const weeks = monthGrid(year, month, p);
  const go = (delta: number) => { const m = shiftMonth(year, month, delta); onMonth(m.year, m.month); };
  const nav = (delta: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={delta < 0 ? 'Mois précédent' : 'Mois suivant'} onPress={() => go(delta)}
      style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={delta < 0 ? 'chevronLeft' : 'chevronRight'} color={colors.chalk} />
    </Pressable>
  );
  return (
    <View style={{ gap: space.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {nav(-1)}
        <T v="heading" accessibilityRole="header">{monthTitle(year, month)}</T>
        {nav(1)}
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {DAY_INITIALS.map((d, i) => <T key={i} v="caption" color={colors.mute} style={{ flex: 1, textAlign: 'center' }}>{d}</T>)}
      </View>
      {weeks.map((w, wi) => (
        <View key={wi} style={{ flexDirection: 'row', gap: 4 }}>
          {w.map((c, ci) => {
            if (!c) return <View key={ci} style={{ flex: 1 }} />;
            const color = kindColor(c.plan);
            const isSel = c.date === selected;
            const isToday = c.date === today;
            const label = c.plan && c.plan.day.kind !== 'rest' ? planLabel(c.plan) : '';
            return (
              <Pressable
                key={ci}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={`${c.day}${label ? `, ${label}` : ''}${done.has(c.date) ? ', faite' : ''}`}
                onPress={() => onSelect(c.date)}
                style={{
                  flex: 1, minHeight: 58, borderRadius: 10, padding: 4, overflow: 'hidden',
                  backgroundColor: isSel ? colors.slateHi : colors.slate,
                  borderWidth: isToday ? 2 : 0, borderColor: colors.azure,
                  opacity: c.plan ? 1 : 0.45,
                }}
              >
                {color ? <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: color }} /> : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <T v="detail" style={{ fontFamily: fonts.semibold }}>{c.day}</T>
                  {done.has(c.date) ? <Icon name="check" size={14} color={colors.neon} strokeWidth={3} /> : null}
                </View>
                {label ? <T v="caption" color={colors.mute} numberOfLines={2} style={{ fontSize: 10, lineHeight: 12 }}>{label.replace(' ', '\n')}</T> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: space.l, flexWrap: 'wrap' }}>
        {[[colors.neon, 'Séance'], [colors.azure, 'Récupération']].map(([c, l]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} />
            <T v="caption" color={colors.mute}>{l}</T>
          </View>
        ))}
      </View>
    </View>
  );
}
