import { useLiveQuery } from "dexie-react-hooks";

/**
 * Lecture réactive : le composant se met à jour dès que les données changent.
 * Renvoie `undefined` tant que la première lecture n'est pas terminée.
 */
export function useLive<T>(query: () => Promise<T> | T, deps: unknown[] = []): T | undefined {
  return useLiveQuery(query, deps);
}
