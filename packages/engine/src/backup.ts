import { z } from 'zod';
import { content as defaultContent, GoalId, RecipeTag, SupplementId, type Content } from '@muscu/content';
import { mondayOf, type IsoDate } from './dates';
import type {
  BodyWeight, CheckIn, ExerciseLog, FoodEntry, LifeLog, Measurements, PantryItem, Profile, SessionLog,
  SupplementLog,
} from './model';

export const BACKUP_VERSION = 2;

const Iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Feedback = z.enum(['easy', 'good', 'hard']);

const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  sex: z.enum(['male', 'female']),
  weightKg: z.number().positive(),
  heightCm: z.number().positive(),
  age: z.number().int().positive(),
  goal: GoalId,
  sessionsPerWeek: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  level: z.enum(['beginner', 'advanced']),
  startDate: Iso,
  firstUseDate: Iso,
  equipment: z.enum(['gym', 'home']),
  backCare: z.boolean(),
  dietTags: z.array(RecipeTag),
  excludedIngredients: z.array(z.string()),
  budgetMode: z.boolean(),
  weeklyBudgetEur: z.number().positive(),
  kcalTarget: z.number().positive().optional(),
  proteinTarget: z.number().positive().optional(),
  supplements: z.array(SupplementId).optional(),
  oneRepMaxes: z.record(z.string(), z.number().positive()).optional(),
});

const pid = { profileId: z.string(), date: Iso };
export const BackupSchema = z.object({
  app: z.literal('muscu'),
  // la version 1 (M0 à M2) reste lisible : les collections ajoutées ensuite sont vides
  version: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.string(),
  profiles: z.array(ProfileSchema),
  exerciseLogs: z.array(z.object({
    ...pid, exercise: z.string(), cardio: z.boolean().optional(),
    sets: z.array(z.object({ kg: z.number().min(0), reps: z.number().min(0), feedback: Feedback.optional(), rpe: z.number().optional() })),
  })),
  sessions: z.array(z.object({
    ...pid, done: z.boolean(),
    feeling: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    durationMin: z.number().optional(),
  })),
  checkIns: z.array(z.object({
    ...pid, energy: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    soreness: z.enum(['none', 'light', 'strong']),
  })),
  weights: z.array(z.object({ ...pid, kg: z.number().positive() })),
  measurements: z.array(z.object({
    ...pid, armCm: z.number(), chestCm: z.number(), waistCm: z.number(), thighCm: z.number(),
  })),
  food: z.array(z.object({
    ...pid, name: z.string(), kcal: z.number(), protein: z.number(),
    carbs: z.number().optional(), fat: z.number().optional(),
    menuSlot: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  })),
  supplements: z.array(z.object({ ...pid, supplement: SupplementId, taken: z.boolean() })),
  life: z.array(z.object({ ...pid, cigarettes: z.number().int().min(0), drinks: z.number().int().min(0) })),
  pantry: z.array(z.object({ profileId: z.string(), ingredient: z.string(), owned: z.boolean() })),
  water: z.array(z.object({ ...pid, ml: z.number().min(0) })).default([]),
  menuOverrides: z.array(z.object({ ...pid, slot: z.number().int().min(0).max(3), recipeId: z.string() })).default([]),
  recipePrefs: z.array(z.object({ profileId: z.string(), recipeId: z.string(), pref: z.enum(['favorite', 'excluded']) })).default([]),
  priceOverrides: z.record(z.string(), z.union([z.object({ perKg: z.number().min(0) }), z.object({ perUnit: z.number().min(0) })])).default({}),
});

export interface Backup {
  app: 'muscu';
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  profiles: Profile[];
  exerciseLogs: ExerciseLog[];
  sessions: SessionLog[];
  checkIns: CheckIn[];
  weights: BodyWeight[];
  measurements: Measurements[];
  food: FoodEntry[];
  supplements: SupplementLog[];
  life: LifeLog[];
  pantry: PantryItem[];
  water: { profileId: string; date: IsoDate; ml: number }[];
  menuOverrides: { profileId: string; date: IsoDate; slot: number; recipeId: string }[];
  recipePrefs: { profileId: string; recipeId: string; pref: 'favorite' | 'excluded' }[];
  priceOverrides: Record<string, { perKg: number } | { perUnit: number }>;
}

export type BackupData = Omit<Backup, 'app' | 'version' | 'exportedAt'>;

export const EMPTY_BACKUP: BackupData = {
  profiles: [], exerciseLogs: [], sessions: [], checkIns: [], weights: [], measurements: [], food: [],
  supplements: [], life: [], pantry: [], water: [], menuOverrides: [], recipePrefs: [], priceOverrides: {},
};

export function exportBackup(data: BackupData, now = new Date()): string {
  const b: Backup = { app: 'muscu', version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data };
  return JSON.stringify(b);
}

export type ImportResult = { ok: true; backup: Backup; source: 'app' | 'prototype' } | { ok: false; error: string };

/** Importe une sauvegarde de l'appli, ou un export du prototype web (clé « onair-v3 »). */
export function importBackup(json: string, opts: PrototypeImportOptions = {}): ImportResult {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return { ok: false, error: 'invalidJson' }; }
  if (raw && typeof raw === 'object' && (raw as { app?: unknown }).app === 'muscu') {
    const r = BackupSchema.safeParse(raw);
    return r.success ? { ok: true, backup: { ...r.data, version: BACKUP_VERSION } as Backup, source: 'app' } : { ok: false, error: 'invalidBackup' };
  }
  const proto = PrototypeSchema.safeParse(raw);
  if (!proto.success) return { ok: false, error: 'unknownFormat' };
  return { ok: true, backup: fromPrototype(proto.data, opts), source: 'prototype' };
}

// ---------- format du prototype ----------

const PrototypeProfile = z.object({
  prog: GoalId.nullable().optional(),
  fq: z.number().optional(),
  lv: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  a: z.number().optional(),
  log: z.record(z.object({
    kg: z.number(), rep: z.number(), c: z.number().optional(),
    sets: z.array(z.array(z.number())).optional(),
  })).optional(),
  done: z.record(z.number()).optional(),
  fb: z.record(z.number()).optional(),
  bw: z.array(z.object({ d: Iso, kg: z.number() })).optional(),
  me: z.array(z.object({ d: Iso, a: z.number(), p: z.number(), t: z.number(), c: z.number() })).optional(),
  life: z.record(z.object({ c: z.number(), a: z.number() })).optional(),
  cal: z.record(z.array(z.object({ n: z.string(), k: z.number(), p: z.number().optional(), m: z.number().optional() }))).optional(),
  ck: z.record(z.object({ e: z.number().optional(), c: z.number().optional() })).optional(),
  sp: z.record(z.record(z.boolean())).optional(),
  spl: z.array(z.string()).optional(),
  stk: z.record(z.boolean()).optional(),
  bud: z.boolean().optional(),
  gk: z.number().optional(),
  gp: z.number().optional(),
}).passthrough();

const PrototypeSchema = z.object({
  start: Iso,
  fst: Iso.optional(),
  p: z.record(PrototypeProfile),
});

export interface PrototypeImportOptions {
  /** Noms des profils du prototype (clés « a » et « d »). */
  names?: Record<string, string>;
  /** Profils en mode dos sensible (dans le prototype : « a »). */
  backCare?: string[];
  content?: Content;
}

const SP: Record<string, z.infer<typeof SupplementId>> = {
  cre: 'creatine', whey: 'whey', om3: 'omega3', caf: 'caffeine', vd: 'vitaminD', mg: 'magnesium',
};
const FB = { 1: 'easy', 2: 'good', 3: 'hard' } as const;
const clamp5 = (n: number) => Math.min(5, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4 | 5;

function fromPrototype(s: z.infer<typeof PrototypeSchema>, opts: PrototypeImportOptions): Backup {
  const c = opts.content ?? defaultContent;
  const exId = new Map(c.exercises.exercises.map((e) => [e.name, e.id]));
  // libellés d'ingrédients du prototype → identifiants canoniques (via les recettes migrées)
  const ingId = new Map<string, string>();
  for (const i of c.ingredients.ingredients) ingId.set(i.name, i.id);
  for (const r of c.recipes) for (const i of r.ingredients) if (i.label) ingId.set(i.label, i.ingredient);
  for (const [k, v] of [['riz cru', 'rice'], ['pâtes crues', 'pasta'], ['semoule crue', 'semolina']] as const) ingId.set(k, v);

  const b: Backup = {
    app: 'muscu', version: BACKUP_VERSION, exportedAt: new Date().toISOString(),
    ...EMPTY_BACKUP, profiles: [],
  };
  const first = s.fst && s.fst > s.start ? s.fst : s.start;
  for (const [key, p] of Object.entries(s.p)) {
    if (!p.prog) continue; // profil jamais lancé
    const profileId = `proto-${key}`;
    b.profiles.push({
      id: profileId,
      name: opts.names?.[key] ?? `Profil ${key.toUpperCase()}`,
      sex: 'male', // le prototype ne gère que la formule masculine
      weightKg: p.w ?? 65, heightCm: p.h ?? 175, age: p.a ?? 30,
      goal: p.prog,
      sessionsPerWeek: (p.fq === 3 || p.fq === 4 ? p.fq : 2),
      level: p.lv ? 'advanced' : 'beginner',
      startDate: mondayOf(s.start),
      firstUseDate: first,
      equipment: 'gym',
      backCare: (opts.backCare ?? ['a']).includes(key),
      dietTags: [], excludedIngredients: [],
      budgetMode: p.bud !== false,
      weeklyBudgetEur: 30,
      ...(p.gk ? { kcalTarget: p.gk } : {}),
      ...(p.gp ? { proteinTarget: p.gp } : {}),
      ...(p.spl ? { supplements: p.spl.map((x) => SP[x]).filter((x): x is NonNullable<typeof x> => !!x) } : {}),
    });
    for (const [k, l] of Object.entries(p.log ?? {})) {
      const [date, name] = k.split('|') as [IsoDate, string];
      const exercise = exId.get(name);
      if (!exercise) continue;
      const sets = l.sets?.length
        ? l.sets.map(([kg = 0, reps = 0, rpe]) => ({ kg, reps, ...(rpe && FB[rpe as 1 | 2 | 3] ? { feedback: FB[rpe as 1 | 2 | 3] } : {}) }))
        : [{ kg: l.kg, reps: l.rep }];
      b.exerciseLogs.push({ profileId, date, exercise, ...(l.c ? { cardio: true } : {}), sets });
    }
    const dates = new Set([...Object.keys(p.done ?? {}), ...Object.keys(p.fb ?? {})]);
    for (const date of dates) {
      const fb = p.fb?.[date];
      b.sessions.push({ profileId, date, done: !!p.done?.[date], ...(fb ? { feeling: clamp5(fb) } : {}) });
    }
    for (const [date, x] of Object.entries(p.ck ?? {})) {
      if (x.e == null || x.c == null) continue;
      b.checkIns.push({ profileId, date, energy: clamp5(x.e), soreness: (['none', 'light', 'strong'] as const)[x.c] ?? 'none' });
    }
    for (const w of p.bw ?? []) b.weights.push({ profileId, date: w.d, kg: w.kg });
    for (const m of p.me ?? []) b.measurements.push({ profileId, date: m.d, armCm: m.a, chestCm: m.p, waistCm: m.t, thighCm: m.c });
    for (const [date, a] of Object.entries(p.cal ?? {})) {
      for (const f of a) {
        b.food.push({
          profileId, date, name: f.n, kcal: f.k, protein: f.p ?? 0,
          ...(f.m != null && f.m >= 0 && f.m <= 3 ? { menuSlot: f.m as 0 | 1 | 2 | 3 } : {}),
        });
      }
    }
    for (const [date, t] of Object.entries(p.sp ?? {})) {
      for (const [k, taken] of Object.entries(t)) if (SP[k]) b.supplements.push({ profileId, date, supplement: SP[k]!, taken });
    }
    for (const [date, l] of Object.entries(p.life ?? {})) b.life.push({ profileId, date, cigarettes: l.c, drinks: l.a });
    for (const [label, owned] of Object.entries(p.stk ?? {})) {
      const ingredient = ingId.get(label);
      if (ingredient) b.pantry.push({ profileId, ingredient, owned });
    }
  }
  return b;
}

// ---------- fusion (synchronisation entre appareils et co-édition) ----------

type Collections = Exclude<keyof BackupData, 'profiles' | 'priceOverrides'>;
const KEYS: Record<Collections, (x: never) => string> = {
  exerciseLogs: (x: ExerciseLog) => `${x.profileId}|${x.date}|${x.exercise}`,
  sessions: (x: SessionLog) => `${x.profileId}|${x.date}`,
  checkIns: (x: CheckIn) => `${x.profileId}|${x.date}`,
  weights: (x: BodyWeight) => `${x.profileId}|${x.date}`,
  measurements: (x: Measurements) => `${x.profileId}|${x.date}`,
  food: (x: FoodEntry) => `${x.profileId}|${x.date}|${x.menuSlot ?? ''}|${x.name}|${x.kcal}`,
  supplements: (x: SupplementLog) => `${x.profileId}|${x.date}|${x.supplement}`,
  life: (x: LifeLog) => `${x.profileId}|${x.date}`,
  pantry: (x: PantryItem) => `${x.profileId}|${x.ingredient}`,
  water: (x: { profileId: string; date: string }) => `${x.profileId}|${x.date}`,
  menuOverrides: (x: { profileId: string; date: string; slot: number }) => `${x.profileId}|${x.date}|${x.slot}`,
  recipePrefs: (x: { profileId: string; recipeId: string }) => `${x.profileId}|${x.recipeId}`,
};

/**
 * Fusionne deux sauvegardes : tout ce qui n'existe que d'un côté est gardé ; quand une même
 * entrée (même profil, même jour…) existe des deux côtés, la version de `newer` l'emporte.
 * Les journaux alimentaires sont additionnés sans doublon. Une suppression faite sur un seul
 * appareil peut donc réapparaître : limite assumée de cette première synchronisation.
 */
export function mergeBackups(older: BackupData, newer: BackupData): BackupData {
  const out = { ...EMPTY_BACKUP } as BackupData;
  const profiles = new Map(older.profiles.map((p) => [p.id, p]));
  for (const p of newer.profiles) profiles.set(p.id, p);
  out.profiles = [...profiles.values()];
  for (const k of Object.keys(KEYS) as Collections[]) {
    const key = KEYS[k] as (x: unknown) => string;
    const m = new Map<string, unknown>();
    for (const x of older[k] as unknown[]) m.set(key(x), x);
    for (const x of newer[k] as unknown[]) m.set(key(x), x);
    (out as unknown as Record<string, unknown[]>)[k] = [...m.values()];
  }
  out.priceOverrides = { ...older.priceOverrides, ...newer.priceOverrides };
  return out;
}

/** Ne garde que les données d'un profil (partage d'un seul profil). */
export function backupForProfile(b: BackupData, profileId: string): BackupData {
  const out = { ...EMPTY_BACKUP } as BackupData;
  out.profiles = b.profiles.filter((p) => p.id === profileId);
  for (const k of Object.keys(KEYS) as Collections[]) {
    (out as unknown as Record<string, unknown[]>)[k] = (b[k] as { profileId: string }[]).filter((x) => x.profileId === profileId);
  }
  out.priceOverrides = {};
  return out;
}
