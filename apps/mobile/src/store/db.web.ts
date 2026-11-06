// Aperçu web (démos et captures) : mêmes opérations, gardées dans le navigateur.
import type { Profile } from '@muscu/engine';
import type { ProfileData, Store } from './types';

interface Data extends ProfileData { profiles: Profile[]; settings: Record<string, string> }
const KEY = 'elan-web-preview';
const empty = (): Data => ({ profiles: [], sessions: [], exerciseLogs: [], checkIns: [], weights: [], measurements: [], settings: {} });

export function createStore(): Store {
  let d = empty();
  const save = () => { try { globalThis.localStorage?.setItem(KEY, JSON.stringify(d)); } catch { /* ignoré */ } };
  const upsert = <T extends { profileId: string; date: string }>(list: T[], x: T, same = (a: T) => a.profileId === x.profileId && a.date === x.date) =>
    [...list.filter((a) => !same(a)), x].sort((a, b) => (a.date < b.date ? -1 : 1));
  return {
    async init() {
      try { const raw = globalThis.localStorage?.getItem(KEY); if (raw) d = { ...empty(), ...JSON.parse(raw) }; } catch { d = empty(); }
    },
    async getProfiles() { return d.profiles; },
    async saveProfile(p) { d.profiles = [...d.profiles.filter((x) => x.id !== p.id), p]; save(); },
    async load(id) {
      const f = <T extends { profileId: string }>(l: T[]) => l.filter((x) => x.profileId === id);
      return { sessions: f(d.sessions), exerciseLogs: f(d.exerciseLogs), checkIns: f(d.checkIns), weights: f(d.weights), measurements: f(d.measurements) };
    },
    async saveSession(s) { d.sessions = upsert(d.sessions, s); save(); },
    async saveExerciseLogs(logs) {
      for (const l of logs) d.exerciseLogs = upsert(d.exerciseLogs, l, (a) => a.profileId === l.profileId && a.date === l.date && a.exercise === l.exercise);
      save();
    },
    async saveCheckIn(c) { d.checkIns = upsert(d.checkIns, c); save(); },
    async saveWeight(w) { d.weights = upsert(d.weights, w); save(); },
    async saveMeasurements(m) { d.measurements = upsert(d.measurements, m); save(); },
    async getSetting(k) { return d.settings[k] ?? null; },
    async setSetting(k, v) { const s = { ...d.settings }; if (v === null) delete s[k]; else s[k] = v; d.settings = s; save(); },
    async wipe() { d = empty(); save(); },
  };
}
