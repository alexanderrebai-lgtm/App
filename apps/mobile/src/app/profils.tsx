import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { programs } from '@muscu/content';
import { useApp } from '../store/AppState';
import { colors, fonts, space } from '../theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CloseButton } from '../ui/CloseButton';
import { Screen } from '../ui/Screen';
import { T } from '../ui/Text';

/** Plusieurs profils sur le même téléphone (deux amis, un couple) : chacun son programme et son suivi. */
export default function Profiles() {
  const { profiles, profile, switchProfile, deleteProfile } = useApp();
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <Screen footer={<Button label="Ajouter un profil" onPress={() => router.push('/onboarding?new=1')} />}>
      <CloseButton />
      <T v="title" accessibilityRole="header">Profils</T>
      <T v="detail" color={colors.soft}>Chaque profil a son objectif, son corps, ses restrictions alimentaires et son suivi.</T>
      {profiles.map((p) => (
        <Card key={p.id} style={{ borderWidth: 2, borderColor: p.id === profile?.id ? colors.neon : colors.slate }}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: p.id === profile?.id }} onPress={async () => { await switchProfile(p.id); router.replace('/'); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.id === profile?.id ? colors.neon : colors.line, alignItems: 'center', justifyContent: 'center' }}>
              <T v="heading" color={p.id === profile?.id ? colors.night : colors.chalk} style={{ fontFamily: fonts.displayBold }}>{p.name.charAt(0).toUpperCase()}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T v="heading">{p.name}</T>
              <T v="caption" color={colors.mute}>{programs.goals[p.goal].name} · {p.sessionsPerWeek} séances par semaine</T>
            </View>
            {p.id === profile?.id ? <T v="caption" color={colors.neon}>Actif</T> : null}
          </Pressable>
          {profiles.length > 1 ? (
            confirm === p.id ? (
              <View style={{ gap: space.s }}>
                <T v="detail">Supprimer le profil de {p.name} et tout son suivi de ce téléphone ?</T>
                <View style={{ flexDirection: 'row', gap: space.s }}>
                  <Button label="Supprimer" style={{ flex: 1, backgroundColor: colors.coral }} onPress={async () => { await deleteProfile(p.id); setConfirm(null); }} />
                  <Button label="Annuler" variant="secondary" style={{ flex: 1 }} onPress={() => setConfirm(null)} />
                </View>
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setConfirm(p.id)} hitSlop={8}><T v="caption" color={colors.mute}>Supprimer ce profil</T></Pressable>
            )
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
