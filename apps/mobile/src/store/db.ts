import * as SQLite from 'expo-sqlite';
import type { CheckIn, ExerciseLog, Profile, SessionLog } from '@muscu/engine';
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
      await db.execAsync('PRAGMA journal_mode = WAL;');
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      let v = row?.user_version ?? 0;
      while (v < MIGRATIONS.length) {
        const sql = MIGRATIONS[v]!;
        await db.withTransactionAsync(async () => { await db!.execAsync(sql); });
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
    async load(profileId) {
      const d = get();
      const sessions = await d.getAllAsync<{ date: string; done: number; feeling: number | null; duration_min: number | null }>(
        'SELECT date, done, feeling, duration_min FROM session_log WHERE profile_id = ? ORDER BY date', profileId);
      const logs = await d.getAllAsync<{ date: string; exercise: string; cardio: number; sets: string }>(
        'SELECT date, exercise, cardio, sets FROM exercise_log WHERE profile_id = ? ORDER BY date', profileId);
      const checks = await d.getAllAsync<{ date: string; energy: number; soreness: string }>(
        'SELECT date, energy, soreness FROM check_in WHERE profile_id = ? ORDER BY date', profileId);
      const weights = await d.getAllAsync<{ date: string; kg: number }>('SELECT date, kg FROM body_weight WHERE profile_id = ? ORDER BY date', profileId);
      const meas = await d.getAllAsync<{ date: string; arm_cm: number; chest_cm: number; waist_cm: number; thigh_cm: number }>(
        'SELECT * FROM measurements WHERE profile_id = ? ORDER BY date', profileId);
      return {
        sessions: sessions.map((r): SessionLog => ({
          profileId, date: r.date, done: !!r.done,
          ...(r.feeling ? { feeling: r.feeling as SessionLog['feeling'] } : {}),
          ...(r.duration_min ? { durationMin: r.duration_min } : {}),
        })),
        exerciseLogs: logs.map((r): ExerciseLog => ({ profileId, date: r.date, exercise: r.exercise, ...(r.cardio ? { cardio: true } : {}), sets: JSON.parse(r.sets) })),
        checkIns: checks.map((r): CheckIn => ({ profileId, date: r.date, energy: r.energy as CheckIn['energy'], soreness: r.soreness as CheckIn['soreness'] })),
        weights: weights.map((r) => ({ profileId, date: r.date, kg: r.kg })),
        measurements: meas.map((r) => ({ profileId, date: r.date, armCm: r.arm_cm, chestCm: r.chest_cm, waistCm: r.waist_cm, thighCm: r.thigh_cm })),
      };
    },
    async saveSession(s) {
      await get().runAsync(
        `INSERT INTO session_log (profile_id, date, done, feeling, duration_min, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(profile_id, date) DO UPDATE SET done = excluded.done, feeling = excluded.feeling, duration_min = excluded.duration_min, updated_at = excluded.updated_at`,
        s.profileId, s.date, s.done ? 1 : 0, s.feeling ?? null, s.durationMin ?? null, now(),
      );
    },
    async saveExerciseLogs(logs) {
      const d = get();
      await d.withTransactionAsync(async () => {
        for (const l of logs) {
          await d.runAsync(
            'INSERT INTO exercise_log (profile_id, date, exercise, cardio, sets) VALUES (?, ?, ?, ?, ?) ON CONFLICT(profile_id, date, exercise) DO UPDATE SET cardio = excluded.cardio, sets = excluded.sets',
            l.profileId, l.date, l.exercise, l.cardio ? 1 : 0, JSON.stringify(l.sets),
          );
        }
      });
    },
    async saveCheckIn(c) {
      await get().runAsync('INSERT INTO check_in (profile_id, date, energy, soreness) VALUES (?, ?, ?, ?) ON CONFLICT(profile_id, date) DO UPDATE SET energy = excluded.energy, soreness = excluded.soreness',
        c.profileId, c.date, c.energy, c.soreness);
    },
    async saveWeight(w) {
      await get().runAsync('INSERT INTO body_weight (profile_id, date, kg) VALUES (?, ?, ?) ON CONFLICT(profile_id, date) DO UPDATE SET kg = excluded.kg', w.profileId, w.date, w.kg);
    },
    async saveMeasurements(m) {
      await get().runAsync(
        'INSERT INTO measurements (profile_id, date, arm_cm, chest_cm, waist_cm, thigh_cm) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(profile_id, date) DO UPDATE SET arm_cm = excluded.arm_cm, chest_cm = excluded.chest_cm, waist_cm = excluded.waist_cm, thigh_cm = excluded.thigh_cm',
        m.profileId, m.date, m.armCm, m.chestCm, m.waistCm, m.thighCm);
    },
    async getSetting(key) {
      const r = await get().getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
      return r?.value ?? null;
    },
    async setSetting(key, value) {
      if (value === null) await get().runAsync('DELETE FROM settings WHERE key = ?', key);
      else await get().runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
    },
    async wipe() {
      await get().execAsync('DELETE FROM session_log; DELETE FROM exercise_log; DELETE FROM check_in; DELETE FROM body_weight; DELETE FROM measurements; DELETE FROM profile; DELETE FROM settings;');
    },
  };
}
