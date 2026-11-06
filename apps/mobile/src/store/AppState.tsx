import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SupplementId } from '@muscu/content';
import {
  DEFAULT_REMINDERS, localToday, type BackupData, type BodyWeight, type CheckIn, type FoodEntry, type IsoDate, type LifeLog,
  type Measurements, type PriceOverrides, type Profile, type ReminderSettings, type SessionLog, type SessionResult,
  type SessionState,
} from '@muscu/engine';
import { exportAll, importAll } from './backup';
import { createStore } from './db';
import type { ProfileData, RecipePref } from './types';

const store = createStore();
const EMPTY: ProfileData = {
  sessions: [], exerciseLogs: [], checkIns: [], weights: [], measurements: [],
  food: [], water: [], menuOverrides: {}, pantry: [], recipePrefs: {}, supplements: [], life: [],
};
const ACTIVE = 'activeSession';

interface AppState extends ProfileData {
  ready: boolean;
  error: string | null;
  /** Profil affiché. */
  profile: Profile | null;
  /** Tous les profils de l'appareil (amis, couple…). */
  profiles: Profile[];
  today: IsoDate;
  priceOverrides: PriceOverrides;
  reminders: ReminderSettings;
  saveProfile(p: Profile): Promise<void>;
  switchProfile(id: string): Promise<void>;
  deleteProfile(id: string): Promise<void>;
  toggleDone(date: IsoDate): Promise<void>;
  saveCheckIn(c: Omit<CheckIn, 'profileId'>): Promise<void>;
  /** Enregistre une séance guidée terminée : séries, durée, ressenti, séance faite. */
  saveSessionResult(date: IsoDate, r: SessionResult, feeling: SessionLog['feeling'] | null): Promise<void>;
  saveWeight(w: Omit<BodyWeight, 'profileId'>): Promise<void>;
  saveMeasurements(m: Omit<Measurements, 'profileId'>): Promise<void>;
  addFood(f: Omit<FoodEntry, 'profileId' | 'id'>): Promise<void>;
  deleteFood(id: number): Promise<void>;
  setWater(date: IsoDate, ml: number): Promise<void>;
  setMenuOverride(date: IsoDate, slot: number, recipeId: string | null): Promise<void>;
  togglePantry(ingredient: string): Promise<void>;
  setRecipePref(recipeId: string, pref: RecipePref | null): Promise<void>;
  setPriceOverride(ingredient: string, price: PriceOverrides[string] | null): Promise<void>;
  setSupplement(date: IsoDate, id: SupplementId, taken: boolean): Promise<void>;
  setLife(l: Omit<LifeLog, 'profileId'>): Promise<void>;
  saveReminders(r: ReminderSettings): Promise<void>;
  /** Séance guidée en cours, gardée pour la reprendre après une interruption. */
  loadActiveSession(): Promise<SessionState | null>;
  saveActiveSession(s: SessionState | null): Promise<void>;
  exportData(): Promise<BackupData>;
  importData(b: BackupData): Promise<void>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string | null): Promise<void>;
  wipe(): Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [data, setData] = useState<ProfileData>(EMPTY);
  const [today, setToday] = useState(localToday());
  const [priceOverrides, setPrices] = useState<PriceOverrides>({});
  const [reminders, setReminders] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const profile = profiles.find((p) => p.id === profileId) ?? null;

  const open = useCallback(async (id: string | null) => {
    setProfileId(id);
    setData(id ? await store.load(id) : EMPTY);
    if (id) await store.setSetting('activeProfile', id);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await store.init();
        setPrices(await store.getPriceOverrides());
        const r = await store.getSetting('reminders');
        if (r) setReminders({ ...DEFAULT_REMINDERS, ...JSON.parse(r) });
        const all = await store.getProfiles();
        setProfiles(all);
        const activeId = await store.getSetting('activeProfile');
        await open((all.find((x) => x.id === activeId) ?? all[0])?.id ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setReady(true);
      }
    })();
    const t = setInterval(() => setToday(localToday()), 60_000);
    return () => clearInterval(t);
  }, [open]);

  const reload = useCallback(async (id: string) => setData(await store.load(id)), []);
  const withProfile = useCallback(async (fn: (id: string) => Promise<void>) => {
    if (!profileId) return;
    await fn(profileId);
    await reload(profileId);
  }, [profileId, reload]);

  const saveProfile = useCallback(async (p: Profile) => {
    await store.saveProfile(p);
    setProfiles(await store.getProfiles());
    await open(p.id);
  }, [open]);
  const switchProfile = useCallback((id: string) => open(id), [open]);
  const deleteProfile = useCallback(async (id: string) => {
    await store.deleteProfile(id);
    const all = await store.getProfiles();
    setProfiles(all);
    await open(id === profileId ? all[0]?.id ?? null : profileId);
  }, [open, profileId]);

  const toggleDone = useCallback((date: IsoDate) => withProfile(async (id) => {
    const cur = data.sessions.find((s) => s.date === date);
    await store.saveSession({ ...(cur ?? { profileId: id, date }), done: !cur?.done });
  }), [withProfile, data.sessions]);
  const saveCheckIn = useCallback((c: Omit<CheckIn, 'profileId'>) => withProfile((id) => store.saveCheckIn({ ...c, profileId: id })), [withProfile]);
  const saveSessionResult = useCallback((date: IsoDate, r: SessionResult, feeling: SessionLog['feeling'] | null) => withProfile(async (id) => {
    await store.saveExerciseLogs(r.logs);
    await store.saveSession({ profileId: id, date, done: true, durationMin: r.durationMin, ...(feeling ? { feeling } : {}) });
    await store.setSetting(ACTIVE, null);
  }), [withProfile]);
  const saveWeight = useCallback((w: Omit<BodyWeight, 'profileId'>) => withProfile((id) => store.saveWeight({ ...w, profileId: id })), [withProfile]);
  const saveMeasurements = useCallback((m: Omit<Measurements, 'profileId'>) => withProfile((id) => store.saveMeasurements({ ...m, profileId: id })), [withProfile]);
  const addFood = useCallback((f: Omit<FoodEntry, 'profileId' | 'id'>) => withProfile((id) => store.addFood({ ...f, profileId: id })), [withProfile]);
  const deleteFood = useCallback((foodId: number) => withProfile(() => store.deleteFood(foodId)), [withProfile]);
  const setWater = useCallback((date: IsoDate, ml: number) => withProfile((id) => store.setWater(id, date, Math.max(0, ml))), [withProfile]);
  const setMenuOverride = useCallback((date: IsoDate, slot: number, recipeId: string | null) =>
    withProfile((id) => store.setMenuOverride(id, date, slot, recipeId)), [withProfile]);
  const togglePantry = useCallback((ingredient: string) =>
    withProfile((id) => store.setPantry(id, ingredient, !data.pantry.includes(ingredient))), [withProfile, data.pantry]);
  const setRecipePref = useCallback((recipeId: string, pref: RecipePref | null) => withProfile((id) => store.setRecipePref(id, recipeId, pref)), [withProfile]);
  const setPriceOverride = useCallback(async (ingredient: string, price: PriceOverrides[string] | null) => {
    await store.setPriceOverride(ingredient, price);
    setPrices(await store.getPriceOverrides());
  }, []);
  const setSupplement = useCallback((date: IsoDate, s: SupplementId, taken: boolean) => withProfile((id) => store.setSupplement(id, date, s, taken)), [withProfile]);
  const setLife = useCallback((l: Omit<LifeLog, 'profileId'>) => withProfile((id) => store.setLife({
    ...l, profileId: id, cigarettes: Math.max(0, l.cigarettes), drinks: Math.max(0, l.drinks),
  })), [withProfile]);
  const saveReminders = useCallback(async (r: ReminderSettings) => {
    await store.setSetting('reminders', JSON.stringify(r));
    setReminders(r);
  }, []);

  const loadActiveSession = useCallback(async () => {
    const raw = await store.getSetting(ACTIVE);
    if (!raw) return null;
    try { return JSON.parse(raw) as SessionState; } catch { return null; }
  }, []);
  const saveActiveSession = useCallback(async (s: SessionState | null) => {
    await store.setSetting(ACTIVE, s ? JSON.stringify(s) : null);
  }, []);

  const exportData = useCallback(() => exportAll(store), []);
  const importData = useCallback(async (b: BackupData) => {
    await importAll(store, b);
    setPrices(await store.getPriceOverrides());
    const all = await store.getProfiles();
    setProfiles(all);
    await open(profileId && all.some((p) => p.id === profileId) ? profileId : all[0]?.id ?? null);
  }, [open, profileId]);
  const getSetting = useCallback((k: string) => store.getSetting(k), []);
  const setSetting = useCallback((k: string, v: string | null) => store.setSetting(k, v), []);

  const wipe = useCallback(async () => {
    await store.wipe();
    setProfiles([]);
    await open(null);
  }, [open]);

  const value = useMemo(() => ({
    ready, error, profile, profiles, today, ...data, priceOverrides, reminders,
    saveProfile, switchProfile, deleteProfile, toggleDone, saveCheckIn, saveSessionResult, saveWeight, saveMeasurements,
    addFood, deleteFood, setWater, setMenuOverride, togglePantry, setRecipePref, setPriceOverride, setSupplement, setLife,
    saveReminders, loadActiveSession, saveActiveSession, exportData, importData, getSetting, setSetting, wipe,
  }), [ready, error, profile, profiles, today, data, priceOverrides, reminders,
    saveProfile, switchProfile, deleteProfile, toggleDone, saveCheckIn, saveSessionResult, saveWeight, saveMeasurements,
    addFood, deleteFood, setWater, setMenuOverride, togglePantry, setRecipePref, setPriceOverride, setSupplement, setLife,
    saveReminders, loadActiveSession, saveActiveSession, exportData, importData, getSetting, setSetting, wipe]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp hors AppStateProvider');
  return v;
}

export function useProfile(): Profile {
  const { profile } = useApp();
  if (!profile) throw new Error('Aucun profil');
  return profile;
}
