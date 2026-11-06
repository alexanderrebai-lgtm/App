import type { IsoDate, Profile, SessionLog } from '@muscu/engine';

/** Accès aux données sur l'appareil. Rien n'est envoyé ailleurs. */
export interface Store {
  init(): Promise<void>;
  getProfiles(): Promise<Profile[]>;
  saveProfile(p: Profile): Promise<void>;
  getSessions(profileId: string): Promise<SessionLog[]>;
  setSessionDone(profileId: string, date: IsoDate, done: boolean): Promise<void>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  wipe(): Promise<void>;
}
