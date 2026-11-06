import type { SupabaseClient } from '@supabase/supabase-js';
import { backupForProfile, mergeBackups, type BackupData } from '@muscu/engine';
import { pullProfiles, pushProfile, type RemoteProfile } from './api';

export interface SyncResult { pushed: number; pulled: number; sharedWithMe: RemoteProfile[] }

/**
 * Synchronise les profils de l'appareil avec le serveur :
 * - mes profils et ceux en co-édition : fusion des deux versions (la plus récente l'emporte), puis envoi ;
 * - profils partagés en lecture seule : gardés à part, consultables sans modification.
 */
export async function syncNow(
  sb: SupabaseClient, local: BackupData, lastSync: string | null, writeLocal: (b: BackupData) => Promise<void>,
): Promise<SyncResult> {
  const remote = await pullProfiles(sb);
  const byId = new Map(remote.map((r) => [r.profileId, r]));
  let pushed = 0;
  let pulled = 0;
  // profils locaux
  for (const p of local.profiles) {
    const mine = backupForProfile(local, p.id);
    const r = byId.get(p.id);
    if (r && r.role === 'read') continue;
    const merged = r ? (lastSync && r.updatedAt > lastSync ? mergeBackups(mine, r.data) : mergeBackups(r.data, mine)) : mine;
    if (r) { await writeLocal(merged); pulled++; }
    await pushProfile(sb, p.id, merged, !r);
    pushed++;
  }
  // profils du serveur absents de l'appareil (autre téléphone, co-édition acceptée)
  for (const r of remote) {
    if (r.role === 'read' || local.profiles.some((p) => p.id === r.profileId)) continue;
    await writeLocal(r.data);
    pulled++;
  }
  return { pushed, pulled, sharedWithMe: remote.filter((r) => r.role === 'read') };
}
