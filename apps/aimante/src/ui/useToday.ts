import { useEffect, useState } from "react";
import { today } from "../domain/dates";
import type { ISODate } from "../domain/types";

/** Date du jour, mise à jour quand on revient sur l'appli ou à minuit. */
export function useToday(): ISODate {
  const [value, setValue] = useState(today);
  useEffect(() => {
    const refresh = () => setValue(today());
    const id = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return value;
}
