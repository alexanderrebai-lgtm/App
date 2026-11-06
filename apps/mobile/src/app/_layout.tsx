import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold } from '@expo-google-fonts/barlow';
import { BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold } from '@expo-google-fonts/barlow-semi-condensed';
import { AppStateProvider, useApp } from '../store/AppState';
import { colors, gutter } from '../theme';
import { ReminderSync } from '../ui/ReminderSync';
import { T } from '../ui/Text';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Écran affiché si un écran plante : rien n'est perdu, les données sont dans la base. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.night, justifyContent: 'center', padding: gutter, gap: 12 }}>
      <T v="title">Oups, cet écran a planté</T>
      <T color={colors.soft}>Tes données sont intactes. Réessaie ; si le problème revient, ferme et rouvre l’appli.</T>
      <T v="caption" color={colors.mute}>{error.message}</T>
      <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: 56, borderRadius: 12, backgroundColor: colors.neon, alignItems: 'center', justifyContent: 'center' }}>
        <T v="button" color={colors.night}>Réessayer</T>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold,
    BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold,
  });
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Gate fontsReady={fontsLoaded || !!fontError} />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

function Gate({ fontsReady }: { fontsReady: boolean }) {
  const { ready, error } = useApp();
  const show = fontsReady && ready;
  useEffect(() => {
    if (show) SplashScreen.hideAsync().catch(() => {});
  }, [show]);
  if (!show) return null;
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.night, justifyContent: 'center', padding: gutter, gap: 8 }}>
        <T v="title">Les données ne s’ouvrent pas</T>
        <T color={colors.soft}>Ferme puis rouvre l’appli. Si le problème continue, réinstalle-la. Détail : {error}</T>
      </View>
    );
  }
  return (
    <>
      <StatusBar style="light" />
      <ReminderSync />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }}>
        <Stack.Screen name="guidee/[date]" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
