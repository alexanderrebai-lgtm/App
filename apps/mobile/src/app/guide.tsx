import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { exercisesData, guide } from '@muscu/content';
import { colors, fonts, space } from '../theme';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { CloseButton } from '../ui/CloseButton';
import { Screen } from '../ui/Screen';
import { T } from '../ui/Text';

type Tab = 'guide' | 'gestes' | 'glossaire';

function Fold({ title, children, open: o = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(o);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.m }}>
          <T v="heading" style={{ flex: 1 }}>{title}</T>
          <T v="detail" color={colors.neon}>{open ? '−' : '+'}</T>
        </View>
        {open ? children : null}
      </Card>
    </Pressable>
  );
}

export default function Guide() {
  const [tab, setTab] = useState<Tab>('guide');
  return (
    <Screen>
      <CloseButton fallback="/profil" />
      <T v="title" accessibilityRole="header">Guide</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {([['guide', 'Bien démarrer'], ['gestes', 'Fiches techniques'], ['glossaire', 'Glossaire']] as const).map(([k, l]) => (
          <Chip key={k} label={l} selected={tab === k} onPress={() => setTab(k)} />
        ))}
      </View>
      {tab === 'guide' ? (
        <>
          {guide.sections.map((s, i) => <Fold key={s.id} title={s.title} open={i === 0}><T v="detail" color={colors.soft}>{s.text}</T></Fold>)}
          <Fold title={guide.warmup.title}>
            {guide.warmup.steps.map((x, i) => <T key={i} v="detail" color={colors.soft}>{i + 1}. {x}</T>)}
          </Fold>
        </>
      ) : tab === 'gestes' ? (
        exercisesData.techniques.map((t) => <Fold key={t.id} title={t.name}><T v="detail" color={colors.soft}>{t.text}</T></Fold>)
      ) : (
        <Card style={{ gap: space.m }}>
          {guide.glossary.map((g) => (
            <View key={g.term} style={{ gap: 2 }}>
              <T style={{ fontFamily: fonts.semibold }}>{g.term}</T>
              <T v="detail" color={colors.soft}>{g.text}</T>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
