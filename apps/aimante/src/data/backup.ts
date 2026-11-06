import { type AimanteDB, SCHEMA_VERSION, TABLE_NAMES, type TableName } from "./db";

export interface Backup {
  app: "aimante";
  schemaVersion: number;
  exportedAt: string;
  tables: Record<TableName, unknown[]>;
}

/** Clé primaire de chaque table, pour vérifier un fichier importé. */
const PRIMARY_KEY: Record<TableName, string> = {
  settings: "id",
  habits: "id",
  tasks: "id",
  rooms: "id",
  chores: "id",
  recipes: "id",
  mealPlan: "key",
  shoppingItems: "id",
  staples: "id",
  events: "id",
  eventDone: "key",
  backlog: "id",
  memos: "id",
  dayLogs: "date",
};

export async function exportAll(database: AimanteDB, now = new Date()): Promise<Backup> {
  const tables = {} as Record<TableName, unknown[]>;
  await database.transaction("r", database.tables, async () => {
    for (const name of TABLE_NAMES) tables[name] = await database.table(name).toArray();
  });
  return { app: "aimante", schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), tables };
}

export class BackupError extends Error {}

/** Vérifie qu'un objet lu depuis un fichier est bien une sauvegarde Aimanté. */
export function parseBackup(raw: unknown): Backup {
  if (!raw || typeof raw !== "object") throw new BackupError("Ce fichier n'est pas une sauvegarde Aimanté.");
  const b = raw as Partial<Backup>;
  if (b.app !== "aimante" || typeof b.schemaVersion !== "number" || !b.tables || typeof b.tables !== "object") {
    throw new BackupError("Ce fichier n'est pas une sauvegarde Aimanté.");
  }
  if (b.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError("Cette sauvegarde vient d'une version plus récente d'Aimanté. Mets l'appli à jour d'abord.");
  }
  const tables = {} as Record<TableName, unknown[]>;
  for (const name of TABLE_NAMES) {
    const rows = (b.tables as Record<string, unknown>)[name] ?? [];
    if (!Array.isArray(rows)) throw new BackupError(`Sauvegarde abîmée : « ${name} » n'est pas une liste.`);
    const key = PRIMARY_KEY[name];
    for (const row of rows) {
      if (!row || typeof row !== "object" || typeof (row as Record<string, unknown>)[key] !== "string") {
        throw new BackupError(`Sauvegarde abîmée : une ligne de « ${name} » est incomplète.`);
      }
    }
    tables[name] = rows;
  }
  if (!tables.settings.some((s) => (s as { id: string }).id === "settings")) {
    throw new BackupError("Sauvegarde abîmée : les réglages manquent.");
  }
  return { app: "aimante", schemaVersion: b.schemaVersion, exportedAt: String(b.exportedAt ?? ""), tables };
}

/** Remplace toutes les données par celles de la sauvegarde, en une seule transaction. */
export async function importAll(database: AimanteDB, raw: unknown): Promise<void> {
  const backup = parseBackup(raw);
  await database.transaction("rw", database.tables, async () => {
    for (const name of TABLE_NAMES) {
      const table = database.table(name);
      await table.clear();
      await table.bulkAdd(backup.tables[name]);
    }
  });
}

/** Nom de fichier proposé : aimante-sauvegarde-2026-11-06.json */
export function backupFileName(today: string): string {
  return `aimante-sauvegarde-${today}.json`;
}
