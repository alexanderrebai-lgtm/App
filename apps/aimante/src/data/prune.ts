import { addDays } from "../domain/dates";
import type { ISODate } from "../domain/types";
import type { AimanteDB } from "./db";

export const RETENTION_DAYS = { doneTasks: 14, dayLogs: 120, mealPlan: 60 } as const;

/**
 * Supprime ce qui est trop ancien : tâches faites depuis plus de 14 jours,
 * journaux de plus de 120 jours, menus (et coches d'agenda) de plus de 60 jours.
 * Le total de gouttes est stocké à part et n'est pas touché.
 */
export async function pruneOldData(database: AimanteDB, today: ISODate): Promise<void> {
  const taskLimit = addDays(today, -RETENTION_DAYS.doneTasks);
  const logLimit = addDays(today, -RETENTION_DAYS.dayLogs);
  const mealLimit = addDays(today, -RETENTION_DAYS.mealPlan);
  await database.transaction("rw", [database.tasks, database.dayLogs, database.mealPlan, database.eventDone], async () => {
    await database.tasks.where("doneOn").below(taskLimit).delete();
    await database.dayLogs.where("date").below(logLimit).delete();
    await database.mealPlan.where("date").below(mealLimit).delete();
    await database.eventDone.where("date").below(mealLimit).delete();
  });
}
