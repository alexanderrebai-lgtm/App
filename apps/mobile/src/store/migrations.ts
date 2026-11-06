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
  `CREATE TABLE IF NOT EXISTS exercise_log (
     profile_id TEXT NOT NULL,
     date TEXT NOT NULL,
     exercise TEXT NOT NULL,
     cardio INTEGER NOT NULL DEFAULT 0,
     sets TEXT NOT NULL,
     PRIMARY KEY (profile_id, date, exercise)
   );
   CREATE TABLE IF NOT EXISTS check_in (
     profile_id TEXT NOT NULL,
     date TEXT NOT NULL,
     energy INTEGER NOT NULL,
     soreness TEXT NOT NULL,
     PRIMARY KEY (profile_id, date)
   );
   CREATE TABLE IF NOT EXISTS body_weight (
     profile_id TEXT NOT NULL,
     date TEXT NOT NULL,
     kg REAL NOT NULL,
     PRIMARY KEY (profile_id, date)
   );
   CREATE TABLE IF NOT EXISTS measurements (
     profile_id TEXT NOT NULL,
     date TEXT NOT NULL,
     arm_cm REAL NOT NULL,
     chest_cm REAL NOT NULL,
     waist_cm REAL NOT NULL,
     thigh_cm REAL NOT NULL,
     PRIMARY KEY (profile_id, date)
   );`,
  `CREATE TABLE IF NOT EXISTS food_entry (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     profile_id TEXT NOT NULL,
     date TEXT NOT NULL,
     name TEXT NOT NULL,
     kcal REAL NOT NULL,
     protein REAL NOT NULL,
     carbs REAL,
     fat REAL,
     menu_slot INTEGER
   );
   CREATE INDEX IF NOT EXISTS food_entry_day ON food_entry (profile_id, date);
   CREATE TABLE IF NOT EXISTS water_log (
     profile_id TEXT NOT NULL,
     date TEXT NOT NULL,
     ml INTEGER NOT NULL,
     PRIMARY KEY (profile_id, date)
   );
   CREATE TABLE IF NOT EXISTS menu_override (
     profile_id TEXT NOT NULL,
     date TEXT NOT NULL,
     slot INTEGER NOT NULL,
     recipe_id TEXT NOT NULL,
     PRIMARY KEY (profile_id, date, slot)
   );
   CREATE TABLE IF NOT EXISTS pantry_item (
     profile_id TEXT NOT NULL,
     ingredient TEXT NOT NULL,
     owned INTEGER NOT NULL,
     PRIMARY KEY (profile_id, ingredient)
   );
   CREATE TABLE IF NOT EXISTS recipe_pref (
     profile_id TEXT NOT NULL,
     recipe_id TEXT NOT NULL,
     pref TEXT NOT NULL,
     PRIMARY KEY (profile_id, recipe_id)
   );
   CREATE TABLE IF NOT EXISTS price_override (
     ingredient TEXT PRIMARY KEY NOT NULL,
     price TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS supplement_log (
     profile_id TEXT NOT NULL,
     date TEXT NOT NULL,
     supplement TEXT NOT NULL,
     taken INTEGER NOT NULL,
     PRIMARY KEY (profile_id, date, supplement)
   );
   CREATE TABLE IF NOT EXISTS life_log (
     profile_id TEXT NOT NULL,
     date TEXT NOT NULL,
     cigarettes INTEGER NOT NULL DEFAULT 0,
     drinks INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (profile_id, date)
   );`,
];
