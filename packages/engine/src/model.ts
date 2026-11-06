// Modèle de données persistant (une table SQLite par entité, voir docs/data-model.md).
import type { GoalId, RecipeTag, SupplementId } from '@muscu/content';
import type { IsoDate } from './dates';

export type Sex = 'male' | 'female';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type InjuryArea = 'shoulder' | 'knee' | 'lowerBack' | 'wrist' | 'elbow';
export type SessionsPerWeek = 2 | 3 | 4;
export type Feedback = 'easy' | 'good' | 'hard';
export type Soreness = 'none' | 'light' | 'strong';

export interface Profile {
  id: string;
  name: string;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  goal: GoalId;
  sessionsPerWeek: SessionsPerWeek;
  level: Level;
  /** Lundi de la semaine 1. */
  startDate: IsoDate;
  /** Premier jour d'utilisation : l'assiduité ne compte pas les jours d'avant. */
  firstUseDate: IsoDate;
  equipment: 'gym' | 'home';
  backCare: boolean;
  /** Filtres de recettes exigés (ex. végétarien, sans porc). */
  dietTags: RecipeTag[];
  /** Ingrédients exclus (allergies, goûts). */
  excludedIngredients: string[];
  budgetMode: boolean;
  weeklyBudgetEur: number;
  /** Cibles saisies ou ajustées par la personne ; à défaut, cibles calculées. */
  kcalTarget?: number;
  proteinTarget?: number;
  /** Compléments suivis ; à défaut, ceux conseillés pour l'objectif. */
  supplements?: SupplementId[];
  /** Niveau confirmé : 1RM connus, par exercice (kg). */
  oneRepMaxes?: Record<string, number>;
  /** Prise de masse : la personne prend difficilement du poids (surplus plus grand, 5 repas). */
  hardGainer?: boolean;
  /** Zones douloureuses : les exercices qui les sollicitent sont remplacés. */
  injuries?: InjuryArea[];
  /** Durée de séance disponible, en minutes (la séance est raccourcie pour y tenir). */
  sessionMinutes?: 30 | 45 | 60 | 90;
  /** Jours d'entraînement choisis (0 = lundi … 5 = samedi), autant que de séances par semaine. */
  trainingDays?: number[];
  /** Plus lourd haltère disponible, en kg : au-delà, on progresse autrement (répétitions, tempo). */
  maxDumbbellKg?: number;
  /** Nombre de repas par jour (3 à 6) ; 4 par défaut, 5 pour la prise de masse difficile. */
  mealsPerDay?: 3 | 4 | 5 | 6;
  /** Temps de cuisine maximal par repas, en minutes. */
  maxCookMinutes?: 15 | 30 | 45;
  /** Questionnaire de santé passé à l'inscription. */
  health?: { date: IsoDate; answers: Record<string, boolean>; outcome: 'ok' | 'advice' | 'doctor' };
  /** Semaines allégées décidées par la personne : vrai = allégée, faux = normale, par numéro de semaine (0…25). */
  deloadOverrides?: Record<number, boolean>;
}

/** Une série réalisée. Pour le cardio : kg = minutes, reps = kilomètres. */
export interface SetLog {
  kg: number;
  reps: number;
  feedback?: Feedback;
  rpe?: number;
}

export interface ExerciseLog {
  profileId: string;
  date: IsoDate;
  exercise: string;
  cardio?: boolean;
  sets: SetLog[];
}

export interface SessionLog {
  profileId: string;
  date: IsoDate;
  done: boolean;
  feeling?: 1 | 2 | 3 | 4 | 5;
  durationMin?: number;
}

export interface CheckIn {
  profileId: string;
  date: IsoDate;
  energy: 1 | 2 | 3 | 4 | 5;
  soreness: Soreness;
}

export interface BodyWeight { profileId: string; date: IsoDate; kg: number }

export interface Measurements {
  profileId: string;
  date: IsoDate;
  armCm: number;
  chestCm: number;
  waistCm: number;
  thighCm: number;
}

export interface FoodEntry {
  /** Identifiant en base (absent avant l'enregistrement). */
  id?: number;
  profileId: string;
  date: IsoDate;
  name: string;
  kcal: number;
  protein: number;
  carbs?: number;
  fat?: number;
  /** Repas du menu coché (0 matin, 1 midi, 2 collation, 3 soir). */
  menuSlot?: number;
}

export interface SupplementLog { profileId: string; date: IsoDate; supplement: SupplementId; taken: boolean }

export interface LifeLog { profileId: string; date: IsoDate; cigarettes: number; drinks: number }

export interface PantryItem { profileId: string; ingredient: string; owned: boolean }
