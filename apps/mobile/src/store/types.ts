import type {
  BodyWeight, CheckIn, ExerciseLog, FoodEntry, IsoDate, LifeLog, Measurements, MenuOverrides, PriceOverrides,
  Profile, SessionLog, SupplementLog,
} from '@muscu/engine';
import type { SupplementId } from '@muscu/content';

export type RecipePref = 'favorite' | 'excluded';

export interface ProfileData {
  sessions: SessionLog[];
  exerciseLogs: ExerciseLog[];
  checkIns: CheckIn[];
  weights: BodyWeight[];
  measurements: Measurements[];
  food: FoodEntry[];
  water: { date: IsoDate; ml: number }[];
  menuOverrides: MenuOverrides;
  /** Produits de placard que la personne a déjà. */
  pantry: string[];
  recipePrefs: Record<string, RecipePref>;
  supplements: SupplementLog[];
  life: LifeLog[];
}

/** Accès aux données sur l'appareil. Rien n'est envoyé ailleurs. */
export interface Store {
  init(): Promise<void>;
  getProfiles(): Promise<Profile[]>;
  saveProfile(p: Profile): Promise<void>;
  load(profileId: string): Promise<ProfileData>;
  saveSession(s: SessionLog): Promise<void>;
  saveExerciseLogs(logs: ExerciseLog[]): Promise<void>;
  saveCheckIn(c: CheckIn): Promise<void>;
  saveWeight(w: BodyWeight): Promise<void>;
  saveMeasurements(m: Measurements): Promise<void>;
  addFood(f: FoodEntry): Promise<void>;
  deleteFood(id: number): Promise<void>;
  setWater(profileId: string, date: IsoDate, ml: number): Promise<void>;
  setMenuOverride(profileId: string, date: IsoDate, slot: number, recipeId: string | null): Promise<void>;
  setPantry(profileId: string, ingredient: string, owned: boolean): Promise<void>;
  setRecipePref(profileId: string, recipeId: string, pref: RecipePref | null): Promise<void>;
  getPriceOverrides(): Promise<PriceOverrides>;
  setPriceOverride(ingredient: string, price: PriceOverrides[string] | null): Promise<void>;
  setSupplement(profileId: string, date: IsoDate, supplement: SupplementId, taken: boolean): Promise<void>;
  setLife(l: LifeLog): Promise<void>;
  deleteProfile(profileId: string): Promise<void>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string | null): Promise<void>;
  wipe(): Promise<void>;
}
