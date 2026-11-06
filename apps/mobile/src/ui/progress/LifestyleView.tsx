import { Linking, Pressable, View } from 'react-native';
import { fr, lifeWeek } from '@muscu/engine';
import { DAY_INITIALS } from '../../lib/format';
import { useApp } from '../../store/AppState';
import { colors, fonts, radius, space } from '../../theme';
import { Card } from '../Card';
import { T } from '../Text';

function Counter({ label, value, onDelta }: { label: string; value: number; onDelta(d: number): void }) {
  const b = (d: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${d > 0 ? 'Ajouter' : 'Retirer'} : ${label.toLowerCase()}`} onPress={() => onDelta(d)}
      style={({ pressed }) => ({ width: 56, height: 56, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.slateHi : colors.slate, alignItems: 'center', justifyContent: 'center' })}>
      <T v="title">{d > 0 ? '+' : '−'}</T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
      <T style={{ flex: 1 }}>{label}</T>
      {b(-1)}
      <T v="title" style={{ minWidth: 40, textAlign: 'center' }} accessibilityLabel={`${label} : ${value}`}>{value}</T>
      {b(1)}
    </View>
  );
}

function Bars({ values, color }: { values: { date: string; v: number }[]; color: string }) {
  const max = Math.max(1, ...values.map((x) => x.v));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 76 }}>
      {values.map((x) => (
        <View key={x.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <T v="caption" color={colors.mute}>{x.v || ''}</T>
          <View style={{ width: '100%', height: 36, justifyContent: 'flex-end' }}>
            <View style={{ height: `${(x.v / max) * 100}%`, minHeight: x.v ? 4 : 2, borderRadius: 4, backgroundColor: x.v ? color : colors.line }} />
          </View>
          <T v="caption" color={colors.mute}>{DAY_INITIALS[(new Date(`${x.date}T00:00:00Z`).getUTCDay() + 6) % 7]}</T>
        </View>
      ))}
    </View>
  );
}

export function LifestyleView() {
  const { today, life, setLife } = useApp();
  const cur = life.find((l) => l.date === today) ?? { date: today, cigarettes: 0, drinks: 0 };
  const w = lifeWeek(life, today);
  return (
    <>
      <Card>
        <T v="heading">Aujourd’hui</T>
        <Counter label="Cigarettes" value={cur.cigarettes} onDelta={(d) => setLife({ date: today, cigarettes: cur.cigarettes + d, drinks: cur.drinks })} />
        <Counter label="Verres d’alcool" value={cur.drinks} onDelta={(d) => setLife({ date: today, cigarettes: cur.cigarettes, drinks: cur.drinks + d })} />
        <T v="caption" color={colors.mute}>Facultatif, et visible seulement par toi. Note honnêtement : personne ne juge.</T>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="heading">Cigarettes</T>
          <T v="detail" color={colors.mute}>{w.current.cigarettes} sur 7 jours (avant : {w.previous.cigarettes})</T>
        </View>
        <Bars values={w.byDay.map((d) => ({ date: d.date, v: d.cigarettes }))} color={colors.coral} />
        <T v="detail" color={colors.soft}>{fr.lifeMessage('cigarettes', w.cigarettes, w.current.cigarettes, w.previous.cigarettes)}</T>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="heading">Alcool</T>
          <T v="detail" color={colors.mute}>{w.current.drinks} verre{w.current.drinks > 1 ? 's' : ''} (avant : {w.previous.drinks})</T>
        </View>
        <Bars values={w.byDay.map((d) => ({ date: d.date, v: d.drinks }))} color={colors.azure} />
        <T v="detail" color={colors.soft}>{fr.lifeMessage('drinks', w.drinks, w.current.drinks, w.previous.drinks)}</T>
        <T v="caption" color={colors.mute}>{w.alcoholFreeDays} jour{w.alcoholFreeDays > 1 ? 's' : ''} sans alcool sur 7.</T>
      </Card>

      <Card style={{ backgroundColor: colors.slateHi }}>
        <T v="detail" color={colors.soft}>{fr.lifestyle.encouragement}</T>
        <T v="detail" color={colors.soft}>{fr.lifestyle.training}</T>
        <T v="detail" color={colors.soft}>{fr.lifestyle.heartWarning}</T>
      </Card>

      <View style={{ gap: space.s }}>
        <T v="heading">Se faire aider (France)</T>
        {fr.lifestyle.quitHelp.FR.map((h) => (
          <Card key={h.name}>
            <T style={{ fontFamily: fonts.semibold }}>{h.name}</T>
            <T v="detail" color={colors.soft}>{h.what}</T>
            <T selectable v="heading" color={colors.neon}>{h.phone}</T>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(h.url)}>
              <T v="detail" color={colors.azure}>{h.url.replace('https://', '')}</T>
            </Pressable>
          </Card>
        ))}
      </View>
    </>
  );
}
