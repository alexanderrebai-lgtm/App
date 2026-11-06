import type { Aisle } from "./types";

/** Retire accents et majuscules pour comparer des noms d'articles. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Mots-clés par rayon, sans accents. L'ordre compte : la première règle qui
 * correspond gagne (« thon en boîte » → Épicerie avant « thon frais »).
 */
const RULES: [Aisle, string[]][] = [
  ["Surgelés", ["surgele", "glace", "frites", "poelee"]],
  ["Hygiène", ["dentifrice", "shampo", "savon", "gel douche", "deodorant", "papier toilette", "coton", "rasoir", "mouchoir", "brosse a dents"]],
  ["Entretien", ["liquide vaisselle", "lessive", "eponge", "sac poubelle", "sacs poubelle", "javel", "nettoyant", "sopalin", "essuie", "pastille lave"]],
  ["Épicerie", ["en boite", "en conserve", "conserve", "pates", "riz", "farine", "sucre", "huile", "sel", "poivre", "lentille", "pois chiche", "haricots rouges", "sauce", "coulis", "tomates concassees", "cereale", "flocon", "avoine", "epice", "lait de coco", "quinoa", "semoule", "confiture", "miel", "chocolat", "biscuit"]],
  ["Viande & poisson", ["poulet", "boeuf", "steak", "viande", "dinde", "porc", "saumon", "poisson", "cabillaud", "thon frais", "crevette", "lardon"]],
  ["Frais", ["lait", "yaourt", "fromage", "beurre", "creme", "oeuf", "feta", "gruyere", "jambon", "skyr", "mozzarella", "emmental"]],
  ["Boulangerie", ["pain", "baguette", "brioche", "tortilla", "wrap"]],
  ["Boissons", ["eau", "jus", "soda", "biere", "vin", "cafe", "the"]],
  ["Fruits & légumes", ["pomme", "banane", "tomate", "salade", "carotte", "oignon", "ail", "courgette", "poivron", "citron", "orange", "concombre", "legume", "fruit", "brocoli", "epinard", "champignon", "avocat", "poireau", "patate", "haricots verts", "mais", "kiwi", "poire", "fraise"]],
];

function matches(name: string, keyword: string): boolean {
  // Mot entier ou début de mot, pour que « the » ne corresponde pas à « thon ».
  const re = new RegExp(`(^|[^a-z])${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  if (!re.test(name)) return false;
  if (keyword.length <= 3) return new RegExp(`(^|[^a-z])${keyword}s?($|[^a-z])`).test(name);
  return true;
}

/** Devine le rayon d'un article à partir de son nom. */
export function guessAisle(name: string): Aisle {
  const n = normalizeName(name);
  for (const [aisle, words] of RULES) {
    if (words.some((w) => matches(n, w))) return aisle;
  }
  return "Autre";
}

/**
 * Clé pour repérer un même article écrit différemment : « Bananes », « banane »
 * et « BANANE » donnent la même clé. Sert à éviter les doublons dans la liste.
 */
export function dedupeKey(name: string): string {
  return normalizeName(name)
    .split(" ")
    .map((w) => (w.length > 3 ? w.replace(/[sx]$/, "") : w))
    .join(" ");
}
