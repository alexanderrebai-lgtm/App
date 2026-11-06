// Test d'intégration contre un vrai projet Supabase. Ignoré sans SUPABASE_IT=1.
// Variables : EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY (clé publique), SUPABASE_SECRET_KEY (comptes de test).
import { afterAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { EMPTY_BACKUP, type BackupData, type Profile } from '@muscu/engine';

const RUN = process.env.SUPABASE_IT === '1';
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const PUB = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SECRET = process.env.SUPABASE_SECRET_KEY ?? '';

const profile = (id: string, name: string): Profile => ({
  id, name, sex: 'male', weightKg: 65, heightCm: 175, age: 30, goal: 'mass', sessionsPerWeek: 2, level: 'beginner',
  startDate: '2026-11-09', firstUseDate: '2026-11-06', equipment: 'gym', backCare: false, dietTags: [], excludedIngredients: [],
  budgetMode: true, weeklyBudgetEur: 30,
});

describe.skipIf(!RUN)('synchronisation et partage (Supabase réel)', async () => {
  const { createInvite, pullProfiles, redeemInvite } = await import('../src/sync/api');
  const { syncNow } = await import('../src/sync/sync');
  const admin = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
  const stamp = Date.now().toString(36);
  const ids: string[] = [];
  const user = async (tag: string): Promise<SupabaseClient> => {
    const email = `elan-test-${tag}-${stamp}@example.com`;
    const password = `T-${stamp}-${Math.random().toString(36).slice(2)}!`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    ids.push(data.user.id);
    const c = createClient(URL, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
    const s = await c.auth.signInWithPassword({ email, password });
    if (s.error) throw s.error;
    return c;
  };
  afterAll(async () => { for (const id of ids) await admin.auth.admin.deleteUser(id); });

  const pid = `it-${stamp}`;
  let a: SupabaseClient; let b: SupabaseClient; let c: SupabaseClient;
  let localA: BackupData = { ...EMPTY_BACKUP, profiles: [profile(pid, 'Alex')], weights: [{ profileId: pid, date: '2026-11-08', kg: 65 }] };
  let localB: BackupData = { ...EMPTY_BACKUP };

  it('le propriétaire envoie son profil', async () => {
    a = await user('a'); b = await user('b'); c = await user('c');
    const r = await syncNow(a, localA, null, async (x) => { localA = x; });
    expect(r.pushed).toBe(1);
    expect((await pullProfiles(a)).map((x) => [x.profileId, x.role])).toEqual([[pid, 'owner']]);
  });

  it('les autres ne voient rien et ne peuvent rien vider', async () => {
    expect(await pullProfiles(b)).toEqual([]);
    const del = await c.from('profile_snapshot').delete().eq('profile_id', pid).select();
    expect(del.data ?? []).toEqual([]);
    expect((await pullProfiles(a)).length).toBe(1);
  });

  it('partage en lecture seule : visible, non modifiable', async () => {
    const code = await createInvite(a, pid, 'read');
    expect(code).toMatch(/^[0-9A-F]{8}$/);
    expect(await redeemInvite(b, code)).toBe(pid);
    await expect(redeemInvite(c, code)).rejects.toBeTruthy(); // usage unique
    const r = await syncNow(b, localB, null, async (x) => { localB = x; });
    expect(r.sharedWithMe.map((x) => x.profileId)).toEqual([pid]);
    expect(localB.profiles).toEqual([]); // la lecture seule n'entre pas dans les profils de l'appareil
    const upd = await b.from('profile_snapshot').update({ data: { hacked: true } }).eq('profile_id', pid).select();
    expect(upd.data ?? []).toEqual([]);
    await expect(createInvite(b, pid, 'edit')).rejects.toBeTruthy(); // seul le propriétaire partage
  });

  it('co-édition : les deux appareils fusionnent leurs données', async () => {
    const code = await createInvite(a, pid, 'edit');
    await redeemInvite(b, code);
    await syncNow(b, localB, null, async (x) => { localB = x; });
    expect(localB.profiles.map((p) => p.id)).toEqual([pid]);
    localB = { ...localB, weights: [...localB.weights, { profileId: pid, date: '2026-11-15', kg: 65.4 }] };
    const lastB = new Date().toISOString();
    await syncNow(b, localB, lastB, async (x) => { localB = x; });
    await syncNow(a, localA, null, async (x) => { localA = x; });
    expect(localA.weights.map((w) => w.kg).sort()).toEqual([65, 65.4]);
  });

  it('le propriétaire ne peut pas être changé', async () => {
    const { data: me } = await b.auth.getUser();
    const upd = await b.from('profile_snapshot').update({ owner_id: me.user!.id }).eq('profile_id', pid).select();
    expect(upd.error).toBeTruthy();
  });
});
