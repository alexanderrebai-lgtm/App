import { useSyncExternalStore } from "react";

/** Session éclair en cours. Gardée en mémoire du navigateur : elle survit à un changement d'onglet ou à un rechargement. */
export interface FlashSession {
  minutes: number;
  choreIds: string[];
  endsAt: number;
}

const KEY = "aimante:flash";
const listeners = new Set<() => void>();

function read(): FlashSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FlashSession) : null;
  } catch {
    return null;
  }
}

let current: FlashSession | null = read();

function set(next: FlashSession | null) {
  current = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // Stockage indisponible : la session reste en mémoire.
  }
  listeners.forEach((l) => l());
}

export function startFlashSession(minutes: number, choreIds: string[], now = Date.now()) {
  set({ minutes, choreIds, endsAt: now + minutes * 60_000 });
}

export function endFlashSession() {
  set(null);
}

export function useFlashSession(): FlashSession | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
