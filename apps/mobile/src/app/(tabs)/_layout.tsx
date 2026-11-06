import { Redirect, Tabs } from 'expo-router';
import { useApp } from '../../store/AppState';
import { colors, fonts } from '../../theme';
import { Icon, type IconName } from '../../ui/Icon';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Accueil', icon: 'home' },
  { name: 'seances', title: 'Séances', icon: 'dumbbell' },
  { name: 'nutrition', title: 'Nutrition', icon: 'food' },
  { name: 'progres', title: 'Progrès', icon: 'chart' },
  { name: 'profil', title: 'Profil', icon: 'user' },
];

export default function TabsLayout() {
  const { profile } = useApp();
  if (!profile) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.night },
        tabBarStyle: { backgroundColor: colors.night, borderTopColor: colors.line },
        tabBarActiveTintColor: colors.neon,
        tabBarInactiveTintColor: colors.mute,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color }) => <Icon name={t.icon} color={String(color)} /> }} />
      ))}
    </Tabs>
  );
}
