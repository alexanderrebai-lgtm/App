import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BackupData } from '@muscu/engine';
import { SUPABASE_ANON_KEY, SUPABASE_URL, syncConfigured } from './config';

export interface KeyValue { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void>; removeItem(k: string): Promise<void> }

let client: SupabaseClient | null = null;

/** Client unique ; la session de connexion est gardée dans la base locale de l'appli. */
export function supabase(storage: KeyValue): SupabaseClient {
  if (!syncConfigured) throw new Error('Synchronisation non configurée');
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

export type Role = 'owner' | 'edit' | 'read';
export interface RemoteProfile { profileId: string; data: BackupData; updatedAt: string; role: Role }

/** Connexion sans mot de passe : un code à 6 chiffres reçu par e-mail. */
export async function sendCode(sb: SupabaseClient, email: string) {
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(sb: SupabaseClient, email: string, token: string) {
  const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function currentEmail(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb.auth.getUser();
  return data.user?.email ?? null;
}

export async function signOut(sb: SupabaseClient) {
  await sb.auth.signOut();
}

/** Profils visibles : les miens et ceux partagés avec moi. */
export async function pullProfiles(sb: SupabaseClient): Promise<RemoteProfile[]> {
  const { data: user } = await sb.auth.getUser();
  const uid = user.user?.id;
  const { data, error } = await sb.from('profile_snapshot').select('profile_id, owner_id, data, updated_at, profile_member(user_id, role)');
  if (error) throw error;
  return (data ?? []).map((r: { profile_id: string; owner_id: string; data: BackupData; updated_at: string; profile_member?: { user_id: string; role: 'read' | 'edit' }[] }) => ({
    profileId: r.profile_id,
    data: r.data,
    updatedAt: r.updated_at,
    role: r.owner_id === uid ? 'owner' : r.profile_member?.find((m) => m.user_id === uid)?.role ?? 'read',
  }));
}

export async function pushProfile(sb: SupabaseClient, profileId: string, data: BackupData, isNew: boolean) {
  const row = { profile_id: profileId, data, updated_at: new Date().toISOString() };
  const { error } = isNew
    ? await sb.from('profile_snapshot').insert(row)
    : await sb.from('profile_snapshot').update(row).eq('profile_id', profileId);
  if (error) throw error;
}

export async function deleteMyData(sb: SupabaseClient) {
  const { data: user } = await sb.auth.getUser();
  const { error } = await sb.from('profile_snapshot').delete().eq('owner_id', user.user?.id ?? '');
  if (error) throw error;
}

export async function createInvite(sb: SupabaseClient, profileId: string, role: 'read' | 'edit'): Promise<string> {
  const { data, error } = await sb.rpc('create_invite', { p_profile: profileId, p_role: role });
  if (error) throw error;
  return data as string;
}

export async function redeemInvite(sb: SupabaseClient, code: string): Promise<string> {
  const { data, error } = await sb.rpc('redeem_invite', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data as string;
}
