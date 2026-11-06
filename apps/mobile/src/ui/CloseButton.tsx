import { Pressable } from 'react-native';
import { router, type Href } from 'expo-router';
import { colors } from '../theme';
import { Icon } from './Icon';

export function CloseButton({ fallback = '/' }: { fallback?: Href }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="close" color={colors.chalk} size={20} />
    </Pressable>
  );
}
