import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { localToday, type IsoDate, type Profile, type SessionLog } from '@muscu/engine';
import { createStore } from './db';

const store = createStore();

interface AppState {
  ready: boolean;
  error: string | null;
  profile: Profile | null;
  sessions: SessionLog[];
  today: IsoDate;
  saveProfile(p: Profile): Promise<void>;
  toggleDone(date: IsoDate): Promise<void>;
  wipe(): Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [today, setToday] = useState(localToday());

  useEffect(() => {
    (async () => {
      try {
        await store.init();
        const profiles = await store.getProfiles();
        const activeId = await store.getSetting('activeProfile');
        const p = profiles.find((x) => x.id === activeId) ?? profiles[0] ?? null;
        setProfile(p);
        if (p) setSessions(await store.getSessions(p.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setReady(true);
      }
    })();
    // la date change à minuit : on la relit chaque minute
    const t = setInterval(() => setToday(localToday()), 60_000);
    return () => clearInterval(t);
  }, []);

  const saveProfile = useCallback(async (p: Profile) => {
    await store.saveProfile(p);
    await store.setSetting('activeProfile', p.id);
    setProfile(p);
    setSessions(await store.getSessions(p.id));
  }, []);

  const toggleDone = useCallback(async (date: IsoDate) => {
    if (!profile) return;
    const done = !sessions.some((s) => s.date === date && s.done);
    await store.setSessionDone(profile.id, date, done);
    setSessions(await store.getSessions(profile.id));
  }, [profile, sessions]);

  const wipe = useCallback(async () => {
    await store.wipe();
    setProfile(null);
    setSessions([]);
  }, []);

  const value = useMemo(
    () => ({ ready, error, profile, sessions, today, saveProfile, toggleDone, wipe }),
    [ready, error, profile, sessions, today, saveProfile, toggleDone, wipe],
  );
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
