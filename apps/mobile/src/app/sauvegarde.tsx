import { useState } from 'react';
import { Share, TextInput, View } from 'react-native';
import { exportBackup, importBackup } from '@muscu/engine';
import { useApp } from '../store/AppState';
import { colors, radius, space, type as typeScale } from '../theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CloseButton } from '../ui/CloseButton';
import { Screen } from '../ui/Screen';
import { T } from '../ui/Text';

const ERR: Record<string, string> = {
  invalidJson: 'Ce texte n’est pas une sauvegarde : copie-la en entier, de la première à la dernière accolade.',
  invalidBackup: 'La sauvegarde est incomplète ou abîmée.',
  unknownFormat: 'Format inconnu : seules les sauvegardes d’Élan et du prototype web sont acceptées.',
};

export default function Backup() {
  const { exportData, importData } = useApp();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Screen>
      <CloseButton fallback="/profil" />
      <T v="title" accessibilityRole="header">Sauvegarde</T>
      <T v="detail" color={colors.soft}>Tes données sont enregistrées sur ce téléphone. Exporte-les pour les garder ou les copier sur un autre appareil.</T>
      <Card>
        <T v="heading">Exporter</T>
        <T v="detail" color={colors.soft}>Tous les profils, séances, repas, pesées et réglages, dans un texte au format JSON que tu peux envoyer à toi-même ou enregistrer dans Fichiers.</T>
        <Button label="Exporter mes données" onPress={async () => {
          const json = exportBackup(await exportData());
          try { await Share.share({ message: json, title: 'Sauvegarde Élan' }); } catch { setText(json); }
          setMsg(`Sauvegarde prête (${Math.round(json.length / 1024)} Ko).`);
        }} />
      </Card>
      <Card>
        <T v="heading">Importer</T>
        <T v="detail" color={colors.soft}>Colle une sauvegarde d’Élan ou un export du prototype web. Les profils importés remplacent ceux de même identifiant.</T>
        <TextInput value={text} onChangeText={setText} multiline placeholder="Colle ta sauvegarde ici" placeholderTextColor={colors.mute} accessibilityLabel="Sauvegarde à importer"
          style={[typeScale.caption, { color: colors.chalk, backgroundColor: colors.night, borderRadius: radius.button, padding: 12, minHeight: 120, textAlignVertical: 'top' }]} />
        <Button label="Importer" variant="secondary" disabled={!text.trim()} onPress={async () => {
          const r = importBackup(text);
          if (!r.ok) { setMsg(ERR[r.error] ?? 'Import impossible.'); return; }
          await importData(r.backup);
          setText('');
          setMsg(`${r.backup.profiles.length} profil${r.backup.profiles.length > 1 ? 's' : ''} importé${r.backup.profiles.length > 1 ? 's' : ''}${r.source === 'prototype' ? ' depuis le prototype' : ''}.`);
        }} />
      </Card>
      {msg ? <View style={{ gap: space.xs }}><T v="detail" color={colors.neon}>{msg}</T></View> : null}
    </Screen>
  );
}
