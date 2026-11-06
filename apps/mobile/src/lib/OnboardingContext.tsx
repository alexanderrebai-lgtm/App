import { createContext, useContext, useState, type ReactNode } from 'react';
import { DEFAULT_DRAFT, draftFromProfile, type Draft } from './onboarding';
import { useApp } from '../store/AppState';

interface Ctx { draft: Draft; edit: boolean; update(patch: Partial<Draft>): void }
const C = createContext<Ctx | null>(null);

export function OnboardingProvider({ edit, children }: { edit: boolean; children: ReactNode }) {
  const { profile } = useApp();
  const [draft, setDraft] = useState<Draft>(() => (edit && profile ? draftFromProfile(profile) : DEFAULT_DRAFT));
  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  return <C.Provider value={{ draft, edit: edit && !!profile, update }}>{children}</C.Provider>;
}

export function useOnboarding(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error('useOnboarding hors OnboardingProvider');
  return v;
}
