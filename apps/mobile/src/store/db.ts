import * as SQLite from 'expo-sqlite';
import type { Profile, SessionLog } from '@muscu/engine';
import { MIGRATIONS } from './migrations';
import type { Store } from './types';

const now = () => new Date().toISOString();

export function createStore(name = 'elan.db'): Store {
  let db: SQLite.SQLiteDatabase | null = null;
  const get = () => {
    if (!db) throw new Error('Base non ouverte');
    return db;
  };
  return {
    async init() {
      db = await SQLite.openDatabaseAsync(name);
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      let v = row?.user_version ?? 0;
      while (v < MIGRATIONS.length) {
        const sql = MIGRATIONS[v]!;
        await db.withTransactionAsync(async () => {
          await db!.execAsync(sql);
        });
        v++;
        await db.execAsync(`PRAGMA user_version = ${v}`);
      }
    },
    async getProfiles() {
      const rows = await get().getAllAsync<{ data: string }>('SELECT data FROM profile ORDER BY updated_at');
      return rows.map((r) => JSON.parse(r.data) as Profile);
    },
    async saveProfile(p) {
      await get().runAsync(
        'INSERT INTO profile (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
        p.id, JSON.stringify(p), now(),
      );
    },
    async getSessions(profileId) {
      const rows = await get().getAllAsync<{ date: string; done: number; feeling: number | null; duration_min: number | null }>(
        'SELECT date, done, feeling, duration_min FROM session_log WHERE profile_id = ? ORDER BY date', profileId,
      );
      return rows.map((r): SessionLog => ({
        profileId, date: r.date, done: !!r.done,
        ...(r.feeling ? { feeling: r.feeling as SessionLog['feeling'] } : {}),
        ...(r.duration_min ? { durationMin: r.duration_min } : {}),
      }));
    },
    async setSessionDone(profileId, date, done) {
      await get().runAsync(
        'INSERT INTO session_log (profile_id, date, done, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(profile_id, date) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at',
        profileId, date, done ? 1 : 0, now(),
      );
    },
    async getSetting(key) {
      const r = await get().getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
      return r?.value ?? null;
    },
    async setSetting(key, value) {
      await get().runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
    },
    async wipe() {
      await get().execAsync('DELETE FROM session_log; DELETE FROM profile; DELETE FROM settings;');
    },
  };
}
