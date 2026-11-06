import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, gutter, space } from '../theme';

interface Props {
  children: ReactNode;
  /** Pied fixe (boutons d'action), hors du défilement. */
  footer?: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
}

export function Screen({ children, footer, scroll = true, edges = ['top'], contentStyle }: Props) {
  const body = [{ paddingHorizontal: gutter, paddingTop: space.l, paddingBottom: space.xxxl, gap: space.xxl }, contentStyle];
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.night }}>
      {scroll ? (
        <ScrollView contentContainerStyle={body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : (
        <View style={[{ flex: 1 }, body]}>{children}</View>
      )}
      {footer ? <View style={{ paddingHorizontal: gutter, paddingTop: space.m, paddingBottom: space.l, gap: space.s }}>{footer}</View> : null}
    </SafeAreaView>
  );
}
