// Migrations SQLite numérotées ; PRAGMA user_version garde la dernière appliquée.
export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS profile (
     id TEXT PRIMARY KEY NOT NULL,
     data TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE TABLE IF NOT EXISTS session_log (
     profile_id TEXT NOT NULL,
     date TEXT NOT NULL,
     done INTEGER NOT NULL DEFAULT 0,
     feeling INTEGER,
     duration_min INTEGER,
     updated_at TEXT NOT NULL,
     PRIMARY KEY (profile_id, date)
   );
   CREATE TABLE IF NOT EXISTS settings (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );`,
];
