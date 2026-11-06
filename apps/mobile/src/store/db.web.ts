// Aperçu web (démos et captures) : mêmes opérations, gardées dans le navigateur.
import type { Profile, SessionLog } from '@muscu/engine';
import type { Store } from './types';

interface Data { profiles: Profile[]; sessions: SessionLog[]; settings: Record<string, string> }
const KEY = 'elan-web-preview';

function load(): Data {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) return JSON.parse(raw) as Data;
  } catch { /* stockage indisponible : mémoire seule */ }
  return { profiles: [], sessions: [], settings: {} };
}

export function createStore(): Store {
  let d: Data = { profiles: [], sessions: [], settings: {} };
  const save = () => {
    try { globalThis.localStorage?.setItem(KEY, JSON.stringify(d)); } catch { /* ignoré */ }
  };
  return {
    async init() { d = load(); },
    async getProfiles() { return d.profiles; },
    async saveProfile(p) { d.profiles = [...d.profiles.filter((x) => x.id !== p.id), p]; save(); },
    async getSessions(profileId) { return d.sessions.filter((s) => s.profileId === profileId); },
    async setSessionDone(profileId, date, done) {
      d.sessions = [...d.sessions.filter((s) => !(s.profileId === profileId && s.date === date)), { profileId, date, done }];
      save();
    },
    async getSetting(key) { return d.settings[key] ?? null; },
    async setSetting(key, value) { d.settings = { ...d.settings, [key]: value }; save(); },
    async wipe() { d = { profiles: [], sessions: [], settings: {} }; save(); },
  };
}
