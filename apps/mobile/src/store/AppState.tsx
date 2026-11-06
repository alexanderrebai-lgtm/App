import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  localToday, type BodyWeight, type CheckIn, type FoodEntry, type IsoDate, type Measurements, type PriceOverrides,
  type Profile, type SessionLog, type SessionResult, type SessionState,
} from '@muscu/engine';
import { createStore } from './db';
import type { ProfileData, RecipePref } from './types';

const store = createStore();
const EMPTY: ProfileData = {
  sessions: [], exerciseLogs: [], checkIns: [], weights: [], measurements: [],
  food: [], water: [], menuOverrides: {}, pantry: [], recipePrefs: {},
};
const ACTIVE = 'activeSession';

interface AppState extends ProfileData {
  ready: boolean;
  error: string | null;
  profile: Profile | null;
  today: IsoDate;
  saveProfile(p: Profile): Promise<void>;
  toggleDone(date: IsoDate): Promise<void>;
  saveCheckIn(c: Omit<CheckIn, 'profileId'>): Promise<void>;
  /** Enregistre une séance guidée terminée : séries, durée, ressenti, séance faite. */
  saveSessionResult(date: IsoDate, r: SessionResult, feeling: SessionLog['feeling'] | null): Promise<void>;
  saveWeight(w: Omit<BodyWeight, 'profileId'>): Promise<void>;
  saveMeasurements(m: Omit<Measurements, 'profileId'>): Promise<void>;
  priceOverrides: PriceOverrides;
  addFood(f: Omit<FoodEntry, 'profileId' | 'id'>): Promise<void>;
  deleteFood(id: number): Promise<void>;
  setWater(date: IsoDate, ml: number): Promise<void>;
  setMenuOverride(date: IsoDate, slot: number, recipeId: string | null): Promise<void>;
  togglePantry(ingredient: string): Promise<void>;
  setRecipePref(recipeId: string, pref: RecipePref | null): Promise<void>;
  setPriceOverride(ingredient: string, price: PriceOverrides[string] | null): Promise<void>;
  /** Séance guidée en cours, gardée pour la reprendre après une interruption. */
  loadActiveSession(): Promise<SessionState | null>;
  saveActiveSession(s: SessionState | null): Promise<void>;
  wipe(): Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<ProfileData>(EMPTY);
  const [today, setToday] = useState(localToday());
  const [priceOverrides, setPrices] = useState<PriceOverrides>({});

  useEffect(() => {
    (async () => {
      try {
        await store.init();
        setPrices(await store.getPriceOverrides());
        const profiles = await store.getProfiles();
        const activeId = await store.getSetting('activeProfile');
        const p = profiles.find((x) => x.id === activeId) ?? profiles[0] ?? null;
        setProfile(p);
        if (p) setData(await store.load(p.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setReady(true);
      }
    })();
    const t = setInterval(() => setToday(localToday()), 60_000);
    return () => clearInterval(t);
  }, []);

  const reload = useCallback(async (id: string) => setData(await store.load(id)), []);

  const saveProfile = useCallback(async (p: Profile) => {
    await store.saveProfile(p);
    await store.setSetting('activeProfile', p.id);
    setProfile(p);
    await reload(p.id);
  }, [reload]);

  const toggleDone = useCallback(async (date: IsoDate) => {
    if (!profile) return;
    const cur = data.sessions.find((s) => s.date === date);
    await store.saveSession({ ...(cur ?? { profileId: profile.id, date }), done: !cur?.done });
    await reload(profile.id);
  }, [profile, data.sessions, reload]);

  const saveCheckIn = useCallback(async (c: Omit<CheckIn, 'profileId'>) => {
    if (!profile) return;
    await store.saveCheckIn({ ...c, profileId: profile.id });
    await reload(profile.id);
  }, [profile, reload]);

  const saveSessionResult = useCallback(async (date: IsoDate, r: SessionResult, feeling: SessionLog['feeling'] | null) => {
    if (!profile) return;
    await store.saveExerciseLogs(r.logs);
    await store.saveSession({ profileId: profile.id, date, done: true, durationMin: r.durationMin, ...(feeling ? { feeling } : {}) });
    await store.setSetting(ACTIVE, null);
    await reload(profile.id);
  }, [profile, reload]);

  const saveWeight = useCallback(async (w: Omit<BodyWeight, 'profileId'>) => {
    if (!profile) return;
    await store.saveWeight({ ...w, profileId: profile.id });
    await reload(profile.id);
  }, [profile, reload]);

  const saveMeasurements = useCallback(async (m: Omit<Measurements, 'profileId'>) => {
    if (!profile) return;
    await store.saveMeasurements({ ...m, profileId: profile.id });
    await reload(profile.id);
  }, [profile, reload]);

  const withProfile = useCallback((fn: (id: string) => Promise<void>) => async () => {
    if (!profile) return;
    await fn(profile.id);
    await reload(profile.id);
  }, [profile, reload]);

  const addFood = useCallback((f: Omit<FoodEntry, 'profileId' | 'id'>) => withProfile((id) => store.addFood({ ...f, profileId: id }))(), [withProfile]);
  const deleteFood = useCallback((foodId: number) => withProfile(() => store.deleteFood(foodId))(), [withProfile]);
  const setWater = useCallback((date: IsoDate, ml: number) => withProfile((id) => store.setWater(id, date, Math.max(0, ml)))(), [withProfile]);
  const setMenuOverride = useCallback((date: IsoDate, slot: number, recipeId: string | null) =>
    withProfile((id) => store.setMenuOverride(id, date, slot, recipeId))(), [withProfile]);
  const togglePantry = useCallback((ingredient: string) =>
    withProfile((id) => store.setPantry(id, ingredient, !data.pantry.includes(ingredient)))(), [withProfile, data.pantry]);
  const setRecipePref = useCallback((recipeId: string, pref: RecipePref | null) =>
    withProfile((id) => store.setRecipePref(id, recipeId, pref))(), [withProfile]);
  const setPriceOverride = useCallback(async (ingredient: string, price: PriceOverrides[string] | null) => {
    await store.setPriceOverride(ingredient, price);
    setPrices(await store.getPriceOverrides());
  }, []);

  const loadActiveSession = useCallback(async () => {
    const raw = await store.getSetting(ACTIVE);
    if (!raw) return null;
    try { return JSON.parse(raw) as SessionState; } catch { return null; }
  }, []);

  const saveActiveSession = useCallback(async (s: SessionState | null) => {
    await store.setSetting(ACTIVE, s ? JSON.stringify(s) : null);
  }, []);

  const wipe = useCallback(async () => {
    await store.wipe();
    setProfile(null);
    setData(EMPTY);
  }, []);

  const value = useMemo(() => ({
    ready, error, profile, today, ...data, priceOverrides,
    saveProfile, toggleDone, saveCheckIn, saveSessionResult, saveWeight, saveMeasurements, loadActiveSession, saveActiveSession, wipe,
    addFood, deleteFood, setWater, setMenuOverride, togglePantry, setRecipePref, setPriceOverride,
  }), [ready, error, profile, today, data, priceOverrides, saveProfile, toggleDone, saveCheckIn, saveSessionResult, saveWeight, saveMeasurements,
    loadActiveSession, saveActiveSession, wipe, addFood, deleteFood, setWater, setMenuOverride, togglePantry, setRecipePref, setPriceOverride]);
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
