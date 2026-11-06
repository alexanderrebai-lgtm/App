// Aperçu web (démos et captures) : mêmes opérations, gardées dans le navigateur.
import type { FoodEntry, IsoDate, PriceOverrides, Profile } from '@muscu/engine';
import type { ProfileData, RecipePref, Store } from './types';

type Keyed<T> = T & { profileId: string };
interface Data {
  profiles: Profile[];
  settings: Record<string, string>;
  sessions: ProfileData['sessions'];
  exerciseLogs: ProfileData['exerciseLogs'];
  checkIns: ProfileData['checkIns'];
  weights: ProfileData['weights'];
  measurements: ProfileData['measurements'];
  food: FoodEntry[];
  water: Keyed<{ date: IsoDate; ml: number }>[];
  overrides: Keyed<{ key: string; recipe: string }>[];
  pantry: Keyed<{ ingredient: string }>[];
  prefs: Keyed<{ recipe: string; pref: RecipePref }>[];
  prices: PriceOverrides;
  nextId: number;
}
const KEY = 'elan-web-preview';
const empty = (): Data => ({
  profiles: [], settings: {}, sessions: [], exerciseLogs: [], checkIns: [], weights: [], measurements: [],
  food: [], water: [], overrides: [], pantry: [], prefs: [], prices: {}, nextId: 1,
});

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
      return {
        sessions: f(d.sessions), exerciseLogs: f(d.exerciseLogs), checkIns: f(d.checkIns), weights: f(d.weights), measurements: f(d.measurements),
        food: f(d.food), water: f(d.water).map(({ date, ml }) => ({ date, ml })),
        menuOverrides: Object.fromEntries(f(d.overrides).map((o) => [o.key, o.recipe])),
        pantry: f(d.pantry).map((x) => x.ingredient),
        recipePrefs: Object.fromEntries(f(d.prefs).map((x) => [x.recipe, x.pref])),
      };
    },
    async saveSession(s) { d.sessions = upsert(d.sessions, s); save(); },
    async saveExerciseLogs(logs) {
      for (const l of logs) d.exerciseLogs = upsert(d.exerciseLogs, l, (a) => a.profileId === l.profileId && a.date === l.date && a.exercise === l.exercise);
      save();
    },
    async saveCheckIn(c) { d.checkIns = upsert(d.checkIns, c); save(); },
    async saveWeight(w) { d.weights = upsert(d.weights, w); save(); },
    async saveMeasurements(m) { d.measurements = upsert(d.measurements, m); save(); },
    async addFood(f) { d.food = [...d.food, { ...f, id: d.nextId++ }]; save(); },
    async deleteFood(id) { d.food = d.food.filter((x) => x.id !== id); save(); },
    async setWater(profileId, date, ml) { d.water = upsert(d.water, { profileId, date, ml }); save(); },
    async setMenuOverride(profileId, date, slot, recipe) {
      const key = `${date}|${slot}`;
      d.overrides = d.overrides.filter((o) => !(o.profileId === profileId && o.key === key));
      if (recipe) d.overrides.push({ profileId, key, recipe });
      save();
    },
    async setPantry(profileId, ingredient, owned) {
      d.pantry = d.pantry.filter((x) => !(x.profileId === profileId && x.ingredient === ingredient));
      if (owned) d.pantry.push({ profileId, ingredient });
      save();
    },
    async setRecipePref(profileId, recipe, pref) {
      d.prefs = d.prefs.filter((x) => !(x.profileId === profileId && x.recipe === recipe));
      if (pref) d.prefs.push({ profileId, recipe, pref });
      save();
    },
    async getPriceOverrides() { return d.prices; },
    async setPriceOverride(ingredient, price) {
      const p = { ...d.prices };
      if (price === null) delete p[ingredient]; else p[ingredient] = price;
      d.prices = p;
      save();
    },
    async getSetting(k) { return d.settings[k] ?? null; },
    async setSetting(k, v) { const s = { ...d.settings }; if (v === null) delete s[k]; else s[k] = v; d.settings = s; save(); },
    async wipe() { d = empty(); save(); },
  };
}
