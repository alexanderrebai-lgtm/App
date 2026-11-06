import exercisesJson from '../data/exercises.json';
import programsJson from '../data/programs.json';
import ingredientsJson from '../data/ingredients.json';
import recipesJson from '../data/recipes.json';
import menusJson from '../data/menus.json';
import pricesJson from '../data/prices.json';
import nutritionJson from '../data/nutrition.json';
import supplementsJson from '../data/supplements.json';
import equipmentJson from '../data/equipment.json';
import exclusionsJson from '../data/exclusions.json';
import guideJson from '../data/guide.json';
import {
  EquipmentFile, ExclusionsFile, GuideFile, ExercisesFile, IngredientsFile, MenusFile, NutritionFile, PricesFile, ProgramsFile,
  RecipesFile, SupplementsFile,
} from './schema';

export * from './schema';

// Chaque fichier est validé au chargement : une donnée invalide échoue tôt, pas dans l'interface.
export const exercisesData = ExercisesFile.parse(exercisesJson);
export const programs = ProgramsFile.parse(programsJson);
export const ingredientsData = IngredientsFile.parse(ingredientsJson);
export const recipes = RecipesFile.parse(recipesJson).recipes;
export const menus = MenusFile.parse(menusJson);
export const defaultPrices = PricesFile.parse(pricesJson);
export const nutrition = NutritionFile.parse(nutritionJson);
export const supplements = SupplementsFile.parse(supplementsJson);
export const equipment = EquipmentFile.parse(equipmentJson);
export const exclusions = ExclusionsFile.parse(exclusionsJson);
export const guide = GuideFile.parse(guideJson);

export const exerciseById = new Map(exercisesData.exercises.map((e) => [e.id, e]));
export const ingredientById = new Map(ingredientsData.ingredients.map((i) => [i.id, i]));
export const recipeById = new Map(recipes.map((r) => [r.id, r]));

export interface Content {
  programs: typeof programs;
  exercises: typeof exercisesData;
  ingredients: typeof ingredientsData;
  recipes: typeof recipes;
  menus: typeof menus;
  prices: typeof defaultPrices;
  nutrition: typeof nutrition;
  supplements: typeof supplements;
  equipment: typeof equipment;
  exclusions: typeof exclusions;
}

export const content: Content = {
  programs,
  exercises: exercisesData,
  ingredients: ingredientsData,
  recipes,
  menus,
  prices: defaultPrices,
  nutrition,
  supplements,
  equipment,
  exclusions,
};
