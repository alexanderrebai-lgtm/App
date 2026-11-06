// Sauvegarde complète de l'appareil et restauration, à partir des opérations du stockage.
import { EMPTY_BACKUP, type BackupData } from '@muscu/engine';
import type { Store } from './types';

export async function exportAll(store: Store): Promise<BackupData> {
  const out: BackupData = { ...EMPTY_BACKUP, profiles: await store.getProfiles(), priceOverrides: await store.getPriceOverrides() };
  for (const p of out.profiles) {
    const d = await store.load(p.id);
    out.sessions.push(...d.sessions);
    out.exerciseLogs.push(...d.exerciseLogs);
    out.checkIns.push(...d.checkIns);
    out.weights.push(...d.weights);
    out.measurements.push(...d.measurements);
    out.food.push(...d.food.map(({ id: _id, ...f }) => f));
    out.supplements.push(...d.supplements);
    out.life.push(...d.life);
    out.pantry.push(...d.pantry.map((ingredient) => ({ profileId: p.id, ingredient, owned: true })));
    out.water.push(...d.water.map((w) => ({ profileId: p.id, ...w })));
    out.menuOverrides.push(...Object.entries(d.menuOverrides).map(([k, recipeId]) => {
      const [date, slot] = k.split('|');
      return { profileId: p.id, date: date!, slot: Number(slot), recipeId };
    }));
    out.recipePrefs.push(...Object.entries(d.recipePrefs).map(([recipeId, pref]) => ({ profileId: p.id, recipeId, pref })));
  }
  return out;
}

/** Remplace, pour chaque profil de la sauvegarde, ses données sur l'appareil. */
export async function importAll(store: Store, b: BackupData): Promise<void> {
  for (const p of b.profiles) {
    await store.deleteProfile(p.id);
    await store.saveProfile(p);
  }
  const mine = new Set(b.profiles.map((p) => p.id));
  const only = <T extends { profileId: string }>(l: T[]) => l.filter((x) => mine.has(x.profileId));
  for (const s of only(b.sessions)) await store.saveSession(s);
  await store.saveExerciseLogs(only(b.exerciseLogs));
  for (const c of only(b.checkIns)) await store.saveCheckIn(c);
  for (const w of only(b.weights)) await store.saveWeight(w);
  for (const m of only(b.measurements)) await store.saveMeasurements(m);
  for (const f of only(b.food)) await store.addFood(f);
  for (const s of only(b.supplements)) await store.setSupplement(s.profileId, s.date, s.supplement, s.taken);
  for (const l of only(b.life)) await store.setLife(l);
  for (const x of only(b.pantry)) await store.setPantry(x.profileId, x.ingredient, x.owned);
  for (const w of only(b.water)) await store.setWater(w.profileId, w.date, w.ml);
  for (const o of only(b.menuOverrides)) await store.setMenuOverride(o.profileId, o.date, o.slot, o.recipeId);
  for (const r of only(b.recipePrefs)) await store.setRecipePref(r.profileId, r.recipeId, r.pref);
  for (const [k, v] of Object.entries(b.priceOverrides)) await store.setPriceOverride(k, v);
}
