import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { content, programs } from '@muscu/content';
import { bmi, mondayOf } from '@muscu/engine';
import { longDate, num } from '../../lib/format';
import { allergiesFrom } from '../../lib/onboarding';
import { LEVEL } from '../../lib/programView';
import { useApp, useProfile } from '../../store/AppState';
import { colors, fonts, space } from '../../theme';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { T } from '../../ui/Text';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
      <T color={colors.mute}>{label}</T>
      <T style={{ flexShrink: 1, textAlign: 'right' }}>{value}</T>
    </View>
  );
}

export default function ProfileTab() {
  const p = useProfile();
  const { saveProfile, wipe, today } = useApp();
  const [confirm, setConfirm] = useState(false);
  const allergies = allergiesFrom(p.excludedIngredients).map((id) => content.exclusions.allergies.find((a) => a.id === id)!.name);
  const diets = p.dietTags.map((t) => content.exclusions.diets.find((d) => d.id === t)?.name).filter(Boolean);
  return (
    <Screen>
      <T v="title" accessibilityRole="header">{p.name}</T>
      <Card style={{ gap: space.s }}>
        <Row label="Objectif" value={programs.goals[p.goal].name} />
        <Row label="Séances" value={`${p.sessionsPerWeek} par semaine`} />
        <Row label="Niveau" value={LEVEL[p.level]} />
        <Row label="Lieu" value={p.equipment === 'home' ? 'À la maison' : 'En salle'} />
        <Row label="Dos sensible" value={p.backCare ? 'Oui' : 'Non'} />
        <Row label="Corps" value={`${num(p.weightKg, p.weightKg % 1 ? 1 : 0)} kg · ${p.heightCm} cm · ${p.age} ans · IMC ${num(bmi(p.weightKg, p.heightCm), 1)}`} />
        <Row label="Alimentation" value={[...diets, ...allergies.map((a) => `sans ${a.toLowerCase()}`)].join(', ') || 'Aucune restriction'} />
        <Row label="Budget" value={`${p.weeklyBudgetEur} € par semaine${p.budgetMode ? ' · serré' : ''}`} />
        <Row label="Début" value={longDate(p.startDate)} />
      </Card>
      <Button label="Modifier mon profil" variant="secondary" onPress={() => router.push('/onboarding?edit=1')} />
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {([
          ['Mon coaching', 'Calories, volume, progression, pourquoi', '/coaching'],
          ['Preuves', 'Sources et niveau de confiance', '/preuves'],
          ['Profils', 'Changer de profil ou en ajouter un', '/profils'],
          ['Rappels', 'Séances, compléments, pesée, repas', '/rappels'],
          ['Compléments', 'Routine, dosages et où les trouver', '/complements'],
          ['Sauvegarde', 'Exporter ou importer tes données', '/sauvegarde'],
          ['Compte et partage', 'Synchroniser, partager avec un ami', '/compte'],
          ['Guide', 'Bien démarrer, fiches techniques, glossaire', '/guide'],
        ] as const).map(([title, desc, href], i) => (
          <Pressable key={href} accessibilityRole="button" onPress={() => router.push(href)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, minHeight: 56 }}>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: fonts.medium }}>{title}</T>
              <T v="caption" color={colors.mute}>{desc}</T>
            </View>
            <Icon name="chevronRight" color={colors.mute} size={20} />
          </Pressable>
        ))}
      </Card>
      <Button label="Recommencer le programme cette semaine" variant="secondary"
        onPress={() => saveProfile({ ...p, startDate: today >= p.startDate ? mondayOf(today) : p.startDate })} />
      <View style={{ gap: space.s }}>
        <T v="detail" color={colors.mute}>Tes données restent sur ce téléphone. Rien n’est envoyé sur internet.</T>
        {confirm ? (
          <Card style={{ borderWidth: 1, borderColor: colors.coral }}>
            <T>Tout effacer ? Ton profil et tes séances seront supprimés de ce téléphone.</T>
            <Button label="Oui, tout effacer" onPress={async () => { await wipe(); router.replace('/onboarding'); }} style={{ backgroundColor: colors.coral }} />
            <Button label="Annuler" variant="secondary" onPress={() => setConfirm(false)} />
          </Card>
        ) : (
          <Button label="Effacer mes données" variant="secondary" onPress={() => setConfirm(true)} />
        )}
      </View>
    </Screen>
  );
}

