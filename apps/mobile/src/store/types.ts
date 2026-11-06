import type {
  BodyWeight, CheckIn, ExerciseLog, IsoDate, Measurements, Profile, SessionLog,
} from '@muscu/engine';

export interface ProfileData {
  sessions: SessionLog[];
  exerciseLogs: ExerciseLog[];
  checkIns: CheckIn[];
  weights: BodyWeight[];
  measurements: Measurements[];
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
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string | null): Promise<void>;
  wipe(): Promise<void>;
}

export type { IsoDate };
