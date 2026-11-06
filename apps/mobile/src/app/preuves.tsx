import { View } from 'react-native';
import { Linking, Pressable } from 'react-native';
import { content } from '@muscu/content';
import { colors, space } from '../theme';
import { Card } from '../ui/Card';
import { CloseButton } from '../ui/CloseButton';
import { Screen } from '../ui/Screen';
import { T } from '../ui/Text';

export default function Preuves() {
  const e = content.evidence;
  return (
    <Screen>
      <CloseButton fallback="/coaching" />
      <T v="title" accessibilityRole="header">Preuves et sources</T>
      <T v="detail" color={colors.soft}>{e.note}</T>
      {e.items.map((i) => (
        <Card key={i.id} style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
            <T v="heading" style={{ flex: 1 }}>{i.topic}</T>
            <T v="label" color={i.confidence === 'élevée' ? colors.neon : i.confidence === 'moyenne' ? colors.azure : colors.coral}>Confiance {i.confidence}</T>
          </View>
          <T v="detail" color={colors.soft}>{i.claim}</T>
          <T v="caption" color={colors.mute}>Limite : {i.limit}</T>
          <Pressable accessibilityRole="link" accessibilityLabel={`Ouvrir la source : ${i.source.title}`} onPress={() => Linking.openURL(i.source.url)}>
            <T v="caption" color={colors.azure}>{i.type} · {i.source.title}</T>
          </Pressable>
        </Card>
      ))}
    </Screen>
  );
}
