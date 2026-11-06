import { useState } from 'react';
import { Stack, useGlobalSearchParams } from 'expo-router';
import { OnboardingProvider } from '../../lib/OnboardingContext';
import { colors } from '../../theme';

export default function OnboardingLayout() {
  const params = useGlobalSearchParams<{ edit?: string }>();
  const [edit] = useState(params.edit === '1');
  return (
    <OnboardingProvider edit={edit}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }} />
    </OnboardingProvider>
  );
}
