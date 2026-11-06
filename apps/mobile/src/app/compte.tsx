import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../store/AppState';
import { createInvite, currentEmail, deleteMyData, redeemInvite, sendCode, signOut, supabase, verifyCode, type RemoteProfile } from '../sync/api';
import { syncConfigured } from '../sync/config';
import { syncNow } from '../sync/sync';
import { colors, fonts, radius, space, type as typeScale } from '../theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CloseButton } from '../ui/CloseButton';
import { Screen } from '../ui/Screen';
import { T } from '../ui/Text';

const input = [typeScale.body, { color: colors.chalk, backgroundColor: colors.night, borderRadius: radius.button, paddingHorizontal: 14, minHeight: 48 }];
const SENT = ['Profils (âge, taille, poids, objectif)', 'Séances, séries et check-in', 'Pesées et mensurations', 'Repas, eau et compléments', 'Cigarettes et verres d’alcool'];

export default function Account() {
  const app = useApp();
  const [consent, setConsent] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [join, setJoin] = useState('');
  const [shared, setShared] = useState<RemoteProfile[]>([]);
  const storage = useMemo(() => ({
    getItem: (k: string) => app.getSetting(`sb:${k}`),
    setItem: (k: string, v: string) => app.setSetting(`sb:${k}`, v),
    removeItem: (k: string) => app.setSetting(`sb:${k}`, null),
  }), [app]);
  const sb = syncConfigured ? supabase(storage) : null;

  useEffect(() => {
    app.getSetting('syncConsent').then(setConsent);
    app.getSetting('sharedWithMe').then((s) => setShared(s ? JSON.parse(s) : []));
    if (sb) currentEmail(sb).then(setMe).catch(() => setMe(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Une erreur est survenue. Vérifie ta connexion et réessaie.'); } finally { setBusy(false); }
  };
  const sync = () => run(async () => {
    const last = await app.getSetting('lastSync');
    const r = await syncNow(sb!, await app.exportData(), last, app.importData);
    await app.setSetting('lastSync', new Date().toISOString());
    await app.setSetting('sharedWithMe', JSON.stringify(r.sharedWithMe));
    setShared(r.sharedWithMe);
    setMsg(`Synchronisé : ${r.pushed} profil${r.pushed > 1 ? 's' : ''} envoyé${r.pushed > 1 ? 's' : ''}, ${r.sharedWithMe.length} partagé${r.sharedWithMe.length > 1 ? 's' : ''} avec toi.`);
  });

  return (
    <Screen>
      <CloseButton fallback="/profil" />
      <T v="title" accessibilityRole="header">Compte et partage</T>
      <T v="detail" color={colors.soft}>Facultatif. Sans compte, l’appli fonctionne entièrement sur ce téléphone.</T>

      {!syncConfigured ? (
        <Card>
          <T v="heading">Pas encore disponible</T>
          <T v="detail" color={colors.soft}>
            La synchronisation et le partage avec un ami demandent un serveur, qui n’est pas encore branché dans cette version de test. Tes données restent sur ce téléphone ; pour les copier ailleurs, utilise la sauvegarde.
          </T>
          <Button label="Ouvrir la sauvegarde" variant="secondary" onPress={() => router.push('/sauvegarde')} />
        </Card>
      ) : !consent ? (
        <Card style={{ borderWidth: 1, borderColor: colors.azure }}>
          <T v="heading">Avant d’activer la synchronisation</T>
          <T v="detail" color={colors.soft}>Ces données de santé seront envoyées sur un serveur hébergé dans l’Union européenne (Supabase) :</T>
          {SENT.map((s) => <T key={s} v="detail" color={colors.soft}>• {s}</T>)}
          <T v="detail" color={colors.soft}>Seuls toi et les personnes que tu invites peuvent les voir. Tu peux tout supprimer du serveur à tout moment depuis cet écran. Rien n’est revendu ni utilisé pour de la publicité.</T>
          <Button label="J’accepte d’envoyer ces données" onPress={async () => { const d = new Date().toISOString(); await app.setSetting('syncConsent', d); setConsent(d); }} />
        </Card>
      ) : !me ? (
        <Card>
          <T v="heading">Connexion par e-mail</T>
          {step === 'email' ? (
            <>
              <T v="detail" color={colors.soft}>Tu reçois un code à 6 chiffres, sans mot de passe.</T>
              <TextInput value={email} onChangeText={setEmail} placeholder="ton@email.fr" placeholderTextColor={colors.mute} autoCapitalize="none" keyboardType="email-address" accessibilityLabel="Adresse e-mail" style={input} />
              <Button label="Recevoir le code" busy={busy} disabled={!/^\S+@\S+\.\S+$/.test(email)} onPress={() => run(async () => { await sendCode(sb!, email.trim()); setStep('code'); })} />
            </>
          ) : (
            <>
              <T v="detail" color={colors.soft}>Code envoyé à {email}.</T>
              <TextInput value={code} onChangeText={setCode} placeholder="123456" placeholderTextColor={colors.mute} keyboardType="number-pad" accessibilityLabel="Code reçu par e-mail" style={input} />
              <Button label="Valider" busy={busy} disabled={code.trim().length < 6} onPress={() => run(async () => { await verifyCode(sb!, email.trim(), code.trim()); setMe(email.trim()); })} />
              <Button label="Changer d’adresse" variant="secondary" onPress={() => setStep('email')} />
            </>
          )}
        </Card>
      ) : (
        <>
          <Card>
            <T v="heading">Synchronisation</T>
            <T v="detail" color={colors.soft}>Connecté : {me}</T>
            <Button label="Synchroniser maintenant" busy={busy} onPress={sync} />
          </Card>

          <Card>
            <T v="heading">Partager le profil de {app.profile?.name}</T>
            <T v="detail" color={colors.soft}>Ton ami saisit ce code dans son appli. Il est valable 7 jours, pour une seule personne.</T>
            <View style={{ flexDirection: 'row', gap: space.s }}>
              <Button label="En lecture seule" variant="secondary" style={{ flex: 1 }} onPress={() => run(async () => { await sync(); setInvite(await createInvite(sb!, app.profile!.id, 'read')); })} />
              <Button label="En co-édition" variant="secondary" style={{ flex: 1 }} onPress={() => run(async () => { await sync(); setInvite(await createInvite(sb!, app.profile!.id, 'edit')); })} />
            </View>
            {invite ? <T selectable v="title" color={colors.neon} style={{ textAlign: 'center', letterSpacing: 4 }}>{invite}</T> : null}
          </Card>

          <Card>
            <T v="heading">Rejoindre un profil</T>
            <TextInput value={join} onChangeText={setJoin} placeholder="Code reçu" placeholderTextColor={colors.mute} autoCapitalize="characters" accessibilityLabel="Code de partage" style={input} />
            <Button label="Rejoindre" variant="secondary" disabled={join.trim().length < 6} onPress={() => run(async () => { await redeemInvite(sb!, join); setJoin(''); await sync(); })} />
          </Card>

          {shared.length ? (
            <View style={{ gap: space.s }}>
              <T v="heading">Partagés avec moi</T>
              {shared.map((s) => (
                <Pressable key={s.profileId} accessibilityRole="button" onPress={() => router.push(`/partage/${s.profileId}`)}>
                  <Card><T style={{ fontFamily: fonts.semibold }}>{s.data.profiles[0]?.name ?? 'Profil'}</T><T v="caption" color={colors.mute}>Lecture seule · voir sa progression</T></Card>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Card>
            <Button label="Se déconnecter" variant="secondary" onPress={() => run(async () => { await signOut(sb!); setMe(null); })} />
            <Button label="Supprimer mes données en ligne" variant="secondary" onPress={() => run(async () => {
              await deleteMyData(sb!);
              await signOut(sb!);
              await app.setSetting('syncConsent', null);
              await app.setSetting('lastSync', null);
              setMe(null); setConsent(null);
              setMsg('Tes données ont été supprimées du serveur. Elles restent sur ce téléphone.');
            })} />
          </Card>
        </>
      )}
      {msg ? <T v="detail" color={colors.neon}>{msg}</T> : null}
    </Screen>
  );
}
