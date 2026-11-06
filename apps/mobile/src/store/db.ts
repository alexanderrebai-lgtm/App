import * as SQLite from 'expo-sqlite';
import type { CheckIn, ExerciseLog, FoodEntry, PriceOverrides, Profile, SessionLog } from '@muscu/engine';
import type { SupplementId } from '@muscu/content';
import { MIGRATIONS } from './migrations';
import type { RecipePref, Store } from './types';

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
      const food = await d.getAllAsync<{ id: number; date: string; name: string; kcal: number; protein: number; carbs: number | null; fat: number | null; menu_slot: number | null }>(
        'SELECT * FROM food_entry WHERE profile_id = ? ORDER BY date, id', profileId);
      const water = await d.getAllAsync<{ date: string; ml: number }>('SELECT date, ml FROM water_log WHERE profile_id = ? ORDER BY date', profileId);
      const overrides = await d.getAllAsync<{ date: string; slot: number; recipe_id: string }>('SELECT date, slot, recipe_id FROM menu_override WHERE profile_id = ?', profileId);
      const pantry = await d.getAllAsync<{ ingredient: string }>('SELECT ingredient FROM pantry_item WHERE profile_id = ? AND owned = 1', profileId);
      const prefs = await d.getAllAsync<{ recipe_id: string; pref: RecipePref }>('SELECT recipe_id, pref FROM recipe_pref WHERE profile_id = ?', profileId);
      const supps = await d.getAllAsync<{ date: string; supplement: string; taken: number }>('SELECT date, supplement, taken FROM supplement_log WHERE profile_id = ? ORDER BY date', profileId);
      const life = await d.getAllAsync<{ date: string; cigarettes: number; drinks: number }>('SELECT date, cigarettes, drinks FROM life_log WHERE profile_id = ? ORDER BY date', profileId);
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
        food: food.map((r): FoodEntry => ({
          id: r.id, profileId, date: r.date, name: r.name, kcal: r.kcal, protein: r.protein,
          ...(r.carbs !== null ? { carbs: r.carbs } : {}), ...(r.fat !== null ? { fat: r.fat } : {}),
          ...(r.menu_slot !== null ? { menuSlot: r.menu_slot as FoodEntry['menuSlot'] } : {}),
        })),
        water,
        menuOverrides: Object.fromEntries(overrides.map((o) => [`${o.date}|${o.slot}`, o.recipe_id])),
        pantry: pantry.map((x) => x.ingredient),
        recipePrefs: Object.fromEntries(prefs.map((x) => [x.recipe_id, x.pref])),
        supplements: supps.map((x) => ({ profileId, date: x.date, supplement: x.supplement as SupplementId, taken: !!x.taken })),
        life: life.map((x) => ({ profileId, date: x.date, cigarettes: x.cigarettes, drinks: x.drinks })),
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
    async addFood(f) {
      await get().runAsync('INSERT INTO food_entry (profile_id, date, name, kcal, protein, carbs, fat, menu_slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        f.profileId, f.date, f.name, f.kcal, f.protein, f.carbs ?? null, f.fat ?? null, f.menuSlot ?? null);
    },
    async deleteFood(id) {
      await get().runAsync('DELETE FROM food_entry WHERE id = ?', id);
    },
    async setWater(profileId, date, ml) {
      await get().runAsync('INSERT INTO water_log (profile_id, date, ml) VALUES (?, ?, ?) ON CONFLICT(profile_id, date) DO UPDATE SET ml = excluded.ml', profileId, date, ml);
    },
    async setMenuOverride(profileId, date, slot, recipeId) {
      if (recipeId === null) await get().runAsync('DELETE FROM menu_override WHERE profile_id = ? AND date = ? AND slot = ?', profileId, date, slot);
      else await get().runAsync('INSERT INTO menu_override (profile_id, date, slot, recipe_id) VALUES (?, ?, ?, ?) ON CONFLICT(profile_id, date, slot) DO UPDATE SET recipe_id = excluded.recipe_id', profileId, date, slot, recipeId);
    },
    async setPantry(profileId, ingredient, owned) {
      await get().runAsync('INSERT INTO pantry_item (profile_id, ingredient, owned) VALUES (?, ?, ?) ON CONFLICT(profile_id, ingredient) DO UPDATE SET owned = excluded.owned', profileId, ingredient, owned ? 1 : 0);
    },
    async setRecipePref(profileId, recipeId, pref) {
      if (pref === null) await get().runAsync('DELETE FROM recipe_pref WHERE profile_id = ? AND recipe_id = ?', profileId, recipeId);
      else await get().runAsync('INSERT INTO recipe_pref (profile_id, recipe_id, pref) VALUES (?, ?, ?) ON CONFLICT(profile_id, recipe_id) DO UPDATE SET pref = excluded.pref', profileId, recipeId, pref);
    },
    async getPriceOverrides() {
      const rows = await get().getAllAsync<{ ingredient: string; price: string }>('SELECT ingredient, price FROM price_override');
      return Object.fromEntries(rows.map((r) => [r.ingredient, JSON.parse(r.price)])) as PriceOverrides;
    },
    async setPriceOverride(ingredient, price) {
      if (price === null) await get().runAsync('DELETE FROM price_override WHERE ingredient = ?', ingredient);
      else await get().runAsync('INSERT INTO price_override (ingredient, price, updated_at) VALUES (?, ?, ?) ON CONFLICT(ingredient) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at', ingredient, JSON.stringify(price), now());
    },
    async setSupplement(profileId, date, supplement, taken) {
      await get().runAsync('INSERT INTO supplement_log (profile_id, date, supplement, taken) VALUES (?, ?, ?, ?) ON CONFLICT(profile_id, date, supplement) DO UPDATE SET taken = excluded.taken',
        profileId, date, supplement, taken ? 1 : 0);
    },
    async setLife(l) {
      await get().runAsync('INSERT INTO life_log (profile_id, date, cigarettes, drinks) VALUES (?, ?, ?, ?) ON CONFLICT(profile_id, date) DO UPDATE SET cigarettes = excluded.cigarettes, drinks = excluded.drinks',
        l.profileId, l.date, l.cigarettes, l.drinks);
    },
    async deleteProfile(profileId) {
      const d = get();
      await d.withTransactionAsync(async () => {
        for (const t of ['session_log', 'exercise_log', 'check_in', 'body_weight', 'measurements', 'food_entry', 'water_log', 'menu_override', 'pantry_item', 'recipe_pref', 'supplement_log', 'life_log']) {
          await d.runAsync(`DELETE FROM ${t} WHERE profile_id = ?`, profileId);
        }
        await d.runAsync('DELETE FROM profile WHERE id = ?', profileId);
      });
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
      await get().execAsync('DELETE FROM session_log; DELETE FROM exercise_log; DELETE FROM check_in; DELETE FROM body_weight; DELETE FROM measurements; DELETE FROM food_entry; DELETE FROM water_log; DELETE FROM menu_override; DELETE FROM pantry_item; DELETE FROM recipe_pref; DELETE FROM price_override; DELETE FROM supplement_log; DELETE FROM life_log; DELETE FROM profile; DELETE FROM settings;');
    },
  };
}
