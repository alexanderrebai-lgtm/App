import type { Effort, Moment } from "../domain/types";

/** Contenus de départ. Tout reste modifiable dans l'appli. */

export const SEED_ROOMS = ["Cuisine", "Salle de bain", "Chambre", "Salon", "Sols", "Linge"];

export const SEED_CHORES: { room: string; name: string; everyDays: number; effort: Effort }[] = [
  { room: "Cuisine", name: "Faire la vaisselle", everyDays: 1, effort: 1 },
  { room: "Cuisine", name: "Essuyer le plan de travail", everyDays: 1, effort: 1 },
  { room: "Cuisine", name: "Sortir les poubelles", everyDays: 3, effort: 1 },
  { room: "Cuisine", name: "Nettoyer l'évier", everyDays: 7, effort: 1 },
  { room: "Cuisine", name: "Nettoyer le micro-ondes", everyDays: 14, effort: 1 },
  { room: "Cuisine", name: "Vider et laver le frigo", everyDays: 30, effort: 2 },
  { room: "Salle de bain", name: "Nettoyer le lavabo", everyDays: 7, effort: 1 },
  { room: "Salle de bain", name: "Nettoyer la douche", everyDays: 7, effort: 2 },
  { room: "Salle de bain", name: "Nettoyer les WC", everyDays: 7, effort: 1 },
  { room: "Salle de bain", name: "Changer les serviettes", everyDays: 7, effort: 1 },
  { room: "Chambre", name: "Faire le lit", everyDays: 1, effort: 1 },
  { room: "Chambre", name: "Changer les draps", everyDays: 14, effort: 2 },
  { room: "Chambre", name: "Ranger les vêtements", everyDays: 3, effort: 1 },
  { room: "Salon", name: "Ranger 10 objets qui traînent", everyDays: 1, effort: 1 },
  { room: "Salon", name: "Dépoussiérer", everyDays: 14, effort: 2 },
  { room: "Sols", name: "Passer l'aspirateur", everyDays: 7, effort: 2 },
  { room: "Sols", name: "Passer la serpillière", everyDays: 14, effort: 2 },
  { room: "Linge", name: "Lancer une machine", everyDays: 3, effort: 1 },
  { room: "Linge", name: "Étendre et plier le linge", everyDays: 3, effort: 1 },
];

export const SEED_HABITS: { moment: Moment; anchor: string; action: string }[] = [
  { moment: "matin", anchor: "j'éteins le réveil", action: "je bois un grand verre d'eau" },
  { moment: "matin", anchor: "je me lève", action: "je fais mon lit (1 minute)" },
  { moment: "matin", anchor: "le petit-déjeuner", action: "j'ouvre Aimanté et je lis ma journée" },
  { moment: "soir", anchor: "le dîner", action: "je lave ou range la vaisselle tout de suite" },
  { moment: "soir", anchor: "je me brosse les dents", action: "je prépare mes affaires de demain" },
  { moment: "soir", anchor: "je me mets au lit", action: "je pose le téléphone hors de portée" },
];

export const SEED_RECIPES: { name: string; note: string; ingredients: string[] }[] = [
  { name: "Pâtes complètes, thon et tomates", note: "15 min", ingredients: ["pâtes complètes", "thon en boîte", "coulis de tomate", "oignon"] },
  { name: "Poulet, riz et brocolis", note: "20 min", ingredients: ["blancs de poulet", "riz", "brocolis surgelés"] },
  { name: "Omelette, pommes de terre et salade", note: "20 min", ingredients: ["œufs", "pommes de terre", "salade"] },
  { name: "Chili sin carne", note: "double portion", ingredients: ["haricots rouges en conserve", "maïs en conserve", "tomates concassées", "riz", "oignon"] },
  { name: "Dahl de lentilles corail", note: "double portion", ingredients: ["lentilles corail", "lait de coco", "carottes", "oignon", "riz"] },
  { name: "Saumon, pommes de terre et haricots verts", note: "25 min", ingredients: ["pavés de saumon surgelés", "pommes de terre", "haricots verts surgelés"] },
  { name: "Wraps poulet crudités", note: "15 min", ingredients: ["tortillas", "blancs de poulet", "salade", "tomates", "fromage blanc"] },
  { name: "Soupe de légumes et tartines", note: "double portion", ingredients: ["légumes pour soupe", "pain complet", "fromage"] },
  { name: "Salade pois chiches et feta", note: "10 min", ingredients: ["pois chiches en conserve", "tomates", "concombre", "feta", "quinoa"] },
  { name: "Gratin de pâtes au jambon", note: "30 min", ingredients: ["pâtes", "jambon", "gruyère râpé", "crème légère"] },
];

export const SEED_STAPLES = [
  "Lait",
  "Pain",
  "Œufs",
  "Café",
  "Pâtes",
  "Riz",
  "Bananes",
  "Yaourts",
  "Papier toilette",
  "Liquide vaisselle",
  "Dentifrice",
  "Sacs poubelle",
];

export const SEED_BACKLOG = [
  "Prendre RDV chez le dentiste (contrôle annuel)",
  "Prévoir une sortie avec des amis ce mois-ci",
];

export const SEED_MEMOS = ["Exemple : poubelle jaune le mardi soir", "Exemple : relevé du compteur avant le 15"];
