// Migration ponctuelle : extrait les données du prototype (docs/prototype/muscu-app.html)
// et les écrit en fichiers JSON structurés dans packages/content/data.
// Après la migration, les JSON sont la source de vérité ; ce script reste pour la traçabilité.
// Usage : node tools/migrate-prototype.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'packages/content/data');
const html = fs.readFileSync(path.join(ROOT, 'docs/prototype/muscu-app.html'), 'utf8');

// ---------- exécution isolée du script du prototype (sans DOM) ----------
const js = html.split('<script>')[1].split('</script>')[0].replace('render();updSync();', '');
const el = () => new Proxy({}, { get: (_t, k) => (k === 'style' ? { setProperty() {} } : undefined) });
const P = {
  document: { getElementById: el, addEventListener() {}, documentElement: { style: { setProperty() {} } } },
  localStorage: { getItem: () => null, setItem() {} },
  setInterval() {}, setTimeout, clearTimeout, window: {}, navigator: {},
};
vm.createContext(P);
vm.runInContext(js, P);

const write = (name, data) => {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n');
  console.log('écrit', name);
};
const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const GOALS = ['mass', 'strength', 'power', 'cardio'];

// ---------- exercices ----------
const exNames = new Set();
const addEx = (x) => x.split('|')[0].split('>').forEach((n) => exNames.add(n));
P.SES.flat(2).forEach(addEx);
Object.values(P.BASE).flat(2).forEach(addEx);
P.REC.flat().forEach(addEx);
P.ALT.flat().forEach((n) => exNames.add(n));
exNames.add('Bird-dog');

const rule = (n, rules, def) => { for (const [re, v] of rules) if (re.test(n)) return v; return def; };
const KIND = [
  [/^(Échauffement|Retour au calme|Footing|Fractionné|Vélo|Marche rapide|Corde à sauter|Circuit)/, 'cardio'],
  [/^(Chat-vache|Rotation|Posture|Étirement|Pigeon|Rouleau|Respiration|Pont fessier lent)/, 'mobility'],
  [/(sauté|Sauts|explosi|Lancer|Skipping|rapide$|vitesse)/i, 'power'],
  [/^(Planche|Dead bug|Crunch|Relevé|Bird-dog|Superman)/, 'core'],
];
const MUSCLES = [
  [/^Circuit/, ['fullBody']],
  [/(Footing|Fractionné|Vélo|Corde|Marche|Échauffement|Retour au calme|Skipping)/, ['cardio']],
  [/(Chat-vache|Rotation|Posture|Étirement|Pigeon|Rouleau|Respiration)/, ['mobility']],
  [/(couché|incliné|Pompes|Dips)/, ['chest', 'triceps']],
  [/(Tirage|Tractions|Rowing)/, ['back', 'biceps']],
  [/(militaire|épaules|Élévations|Face pull|Oiseau)/, ['shoulders']],
  [/^Curl (?!.*leg)/i, ['biceps']],
  [/(triceps|Barre au front)/, ['triceps']],
  [/(Squat|Presse|Fentes|Leg extension|Sauts)/, ['quads', 'glutes']],
  [/(Hip thrust|Pont fessier|Pull-through)/, ['glutes', 'hamstrings']],
  [/Leg curl/, ['hamstrings']],
  [/Mollets/, ['calves']],
  [/(Extension lombaire|Superman|Bird-dog)/, ['lowerBack', 'core']],
  [/(Planche|Dead bug|Crunch|Relevé)/, ['core']],
  [/Lancer/, ['fullBody']],
];
const EQUIP = [
  [/barre|EZ|T-bar/i, 'barbell'],
  [/^(Tractions|Dips(?! sur banc))|suspendu/, 'pullupBar'],
  [/Extension lombaire/, 'machine'],
  [/haltère|goblet|lestée?s?|Fentes bulgares|^Élévations|^Curl marteau|^Oiseau|^Rowing buste/i, 'dumbbell'],
  [/poulie|Face pull|^Tirage/i, 'cable'],
  [/(Presse|Leg curl|Leg extension|Mollets assis|machine|Extension lombaire à 45°)/i, 'machine'],
  [/box/, 'box'],
  [/médecine-ball/, 'medicineBall'],
  [/Corde/, 'jumpRope'],
  [/Vélo ou rameur/, 'cardioMachine'],
  [/Rouleau/, 'foamRoller'],
];
const techniqueOf = (n) => P.mvOf(n) || undefined;
const exercises = [...exNames].sort((a, b) => a.localeCompare(b, 'fr')).map((name) => {
  const e = {
    id: slug(name),
    name,
    kind: rule(name, KIND, 'strength'),
    muscles: rule(name, MUSCLES, ['fullBody']),
    equipment: rule(name, EQUIP, 'bodyweight'),
  };
  const t = techniqueOf(name);
  if (t) e.technique = t;
  return e;
});
const exId = new Map(exercises.map((e) => [e.name, e.id]));
const techniques = Object.entries(P.MV).map(([id, v]) => ({ id, name: v.n, text: v.t }));
const substitutions = P.ALT.map((g) => g.map((n) => exId.get(n)));
write('exercises.json', { exercises, techniques, substitutions });

// ---------- programmes ----------
// Normalisation : templates[goal][phase][session] = [{ exercise, scheme }]
const templates = {};
for (const g of GOALS) {
  templates[g] = [0, 1, 2].map((ph) =>
    P.getS(g, ph).map((session) =>
      session.map((x) => { const [n, s] = P.pr(x, ph); return { exercise: exId.get(n), scheme: s }; })));
}
const goals = {};
for (const g of GOALS) {
  goals[g] = {
    name: P.PGM[g].n,
    icon: P.PGM[g].ic,
    description: P.PGM[g].d,
    weightGoalText: P.PGM[g].g,
    phaseTexts: P.PHF[g],
    nutritionNotes: { before: P.NOTES[g][0], after: P.NOTES[g][1], adjust: P.NOTES[g][2] },
  };
}
// Corrections de texte : alignées sur les règles retenues (voir docs/decisions.md).
goals.mass.phaseTexts[1] = goals.mass.phaseTexts[1].replace('+2 kg', '+2,5 kg');
goals.mass.nutritionNotes.adjust = goals.mass.nutritionNotes.adjust.replace('+200 kcal', '+150 kcal');
for (const g of ['power', 'cardio']) goals[g].weightGoalText = 'poids stable (à ±0,25 kg par semaine)';
const recovery = {
  mobility: { title: 'Mobilité · mercredi · 20 min', items: P.REC[0].map((x) => { const [n, s] = x.split('|'); return { exercise: exId.get(n), scheme: s }; }) },
  walk: { title: 'Marche et étirements · samedi', items: P.REC[1].map((x) => { const [n, s] = x.split('|'); return { exercise: exId.get(n), scheme: s }; }) },
};
write('programs.json', {
  goals,
  phaseNames: P.PH,
  templates,
  recovery,
  backCare: { exercise: 'bird-dog', scheme: '3×8 par côté' },
});

// ---------- ingrédients (nom canonique, nutrition /100 g, poids unitaire) ----------
// Valeurs nutritionnelles moyennes (ordre de grandeur table Ciqual), ajoutées : absentes du prototype.
// [id, nom canonique, rayon, kcal, prot, gluc, lip, g par pièce | null]
const ING = [
  ['oats', 'flocons d’avoine', 'pantry', 370, 13.5, 58.7, 7, null],
  ['milk', 'lait demi-écrémé', 'fresh', 46, 3.3, 4.8, 1.6, null],
  ['banana', 'banane', 'fresh', 90, 1.1, 20, 0.3, 120],
  ['peanut-butter', 'beurre de cacahuète', 'pantry', 600, 25, 14, 49, null],
  ['cocoa', 'cacao en poudre', 'pantry', 360, 20, 13, 21, null],
  ['egg', 'œufs', 'fresh', 140, 12.5, 0.5, 10, 50],
  ['baking-powder', 'levure chimique', 'spice', 50, 0, 12, 0, null],
  ['fromage-blanc', 'fromage blanc', 'fresh', 70, 7.5, 4, 2.5, null],
  ['grated-cheese', 'fromage râpé', 'fresh', 380, 28, 0, 29, null],
  ['wholemeal-bread', 'pain complet', 'fresh', 245, 9, 43, 3, null],
  ['butter', 'beurre', 'fresh', 745, 0.7, 0.6, 82, null],
  ['honey', 'miel', 'pantry', 330, 0.4, 81, 0, null],
  ['fruit', 'fruits de saison', 'fresh', 55, 0.7, 12, 0.3, null],
  ['potato', 'pommes de terre', 'fresh', 80, 2, 17, 0.1, null],
  ['onion', 'oignon', 'fresh', 40, 1.2, 7.5, 0.2, 100],
  ['olive-oil', 'huile d’olive', 'pantry', 900, 0, 0, 100, null],
  ['oil', 'huile de colza ou tournesol', 'pantry', 900, 0, 0, 100, null],
  ['rice', 'riz', 'pantry', 355, 7.5, 78, 0.6, null],
  ['chicken-breast', 'escalope de poulet', 'fresh', 110, 23.5, 0, 1.5, null],
  ['frozen-peas', 'petits pois surgelés', 'fresh', 75, 5.5, 10, 0.5, null],
  ['soy-sauce', 'sauce soja', 'spice', 60, 8, 6, 0.1, null],
  ['beef-mince-5', 'bœuf haché 5 %', 'fresh', 125, 21, 0, 5, null],
  ['beef-patty-5', 'steak haché 5 %', 'fresh', 125, 21, 0, 5, null],
  ['kidney-beans', 'haricots rouges en boîte', 'pantry', 105, 8, 14, 0.5, null],
  ['crushed-tomatoes', 'tomates concassées', 'pantry', 25, 1.2, 3.8, 0.2, null],
  ['paprika', 'paprika', 'spice', 300, 14, 20, 13, null],
  ['cumin', 'cumin', 'spice', 375, 18, 34, 22, null],
  ['turmeric', 'curcuma', 'spice', 310, 10, 44, 3, null],
  ['ras-el-hanout', 'ras-el-hanout', 'spice', 300, 12, 40, 10, null],
  ['garam-masala', 'garam masala', 'spice', 300, 12, 40, 12, null],
  ['pasta', 'pâtes', 'pantry', 355, 12.5, 70, 1.5, null],
  ['tuna', 'thon au naturel', 'pantry', 115, 26, 0, 1, null],
  ['frozen-broccoli', 'brocoli surgelé', 'fresh', 30, 2.8, 3.5, 0.4, null],
  ['flour', 'farine', 'pantry', 345, 10, 72, 1.2, null],
  ['chicken-leg', 'cuisse de poulet', 'fresh', 150, 18, 0, 8.5, 150],
  ['frozen-veg', 'légumes surgelés', 'fresh', 40, 2, 6, 0.3, null],
  ['garlic', 'ail', 'fresh', 130, 6, 28, 0.5, 5],
  ['red-lentils', 'lentilles corail', 'pantry', 345, 24, 50, 1.5, null],
  ['green-lentils', 'lentilles vertes', 'pantry', 330, 24, 48, 1.5, null],
  ['wheat-tortilla', 'tortillas de blé', 'fresh', 300, 8, 50, 7, 40],
  ['cooked-chicken', 'blanc de poulet cuit', 'fresh', 150, 30, 0, 3, null],
  ['crudites', 'carottes râpées et salade', 'fresh', 30, 1, 5, 0.2, null],
  ['lemon-juice', 'jus de citron', 'spice', 25, 0.4, 6, 0, null],
  ['carrot', 'carottes', 'fresh', 36, 0.8, 7, 0.2, 100],
  ['semolina', 'semoule', 'pantry', 360, 12, 72, 1.5, null],
  ['chickpeas', 'pois chiches en boîte', 'pantry', 130, 7, 17, 2.4, null],
  ['zucchini', 'courgette', 'fresh', 17, 1.2, 2.5, 0.3, null],
  ['burger-bun', 'pain à burger', 'fresh', 280, 9, 50, 4.5, 70],
  ['cheese-slice', 'fromage en tranches', 'fresh', 380, 24, 1, 31, null],
  ['tomato', 'tomate', 'fresh', 20, 0.9, 3, 0.2, 120],
  ['plain-yogurt', 'yaourt nature', 'fresh', 55, 4.3, 5.5, 1.5, null],
  ['mozzarella', 'mozzarella', 'fresh', 250, 18, 1, 19, null],
  ['tomato-sauce', 'sauce tomate', 'spice', 45, 1.5, 7, 1, null],
  ['apple', 'pomme', 'fresh', 52, 0.3, 12, 0.2, 150],
];
// libellé du prototype -> id canonique
const ALIAS = {
  'flocons d’avoine': 'oats', lait: 'milk', banane: 'banana', 'beurre de cacahuète': 'peanut-butter',
  'cacao en poudre': 'cocoa', 'œufs': 'egg', 'œuf': 'egg', 'œufs durs': 'egg', levure: 'baking-powder',
  'fromage blanc': 'fromage-blanc', 'fromage râpé': 'grated-cheese', 'pain complet': 'wholemeal-bread',
  beurre: 'butter', miel: 'honey', fruits: 'fruit', 'pommes de terre': 'potato', oignon: 'onion',
  'huile d’olive': 'olive-oil', huile: 'oil', 'riz cru': 'rice', 'escalope de poulet': 'chicken-breast',
  'petits pois surgelés': 'frozen-peas', 'sauce soja': 'soy-sauce', 'bœuf haché 5 %': 'beef-mince-5',
  'steak haché 5 %': 'beef-patty-5', 'haricots rouges égouttés': 'kidney-beans',
  'tomates concassées': 'crushed-tomatoes', paprika: 'paprika', cumin: 'cumin', curcuma: 'turmeric',
  'ras-el-hanout': 'ras-el-hanout', 'garam masala': 'garam-masala', 'pâtes crues': 'pasta', thon: 'tuna',
  'brocoli surgelé': 'frozen-broccoli', brocoli: 'frozen-broccoli', farine: 'flour',
  'cuisse de poulet': 'chicken-leg', 'légumes surgelés': 'frozen-veg', 'gousse d’ail': 'garlic',
  'lentilles corail': 'red-lentils', 'lentilles vertes': 'green-lentils', 'galettes de blé': 'wheat-tortilla',
  tortillas: 'wheat-tortilla', 'poulet cuit': 'cooked-chicken', 'carottes et salade': 'crudites',
  'jus de citron': 'lemon-juice', carotte: 'carrot', carottes: 'carrot', 'semoule crue': 'semolina',
  'pois chiches égouttés': 'chickpeas', courgette: 'zucchini', 'pain à burger': 'burger-bun',
  fromage: 'cheese-slice', tomate: 'tomato', 'yaourt nature': 'plain-yogurt', mozzarella: 'mozzarella',
  'sauce tomate': 'tomato-sauce', pomme: 'apple',
};
const UNIT = { g: 'g', ml: 'ml', '': 'piece', 'c. à soupe': 'tbsp', 'c. à café': 'tsp' };
const ingredients = ING.map(([id, name, aisle, kcal, protein, carbs, fat, gramsPerUnit]) => {
  const o = { id, name, aisle, per100g: { kcal, protein, carbs, fat } };
  if (gramsPerUnit) o.gramsPerUnit = gramsPerUnit;
  return o;
});
const ingById = new Map(ingredients.map((i) => [i.id, i]));
// Règle du prototype : une plante aromatique de placard (SPOT) ou un paquet (PANT) = placard.
for (const i of ingredients) {
  const protoNames = Object.entries(ALIAS).filter(([, v]) => v === i.id).map(([k]) => k);
  const pantry = protoNames.some((n) => P.PANT[n] || P.SPOT.includes(n));
  if (i.aisle !== 'spice' && pantry !== (i.aisle === 'pantry')) throw new Error('rayon incohérent ' + i.id);
}
write('ingredients.json', { ingredients, spoonGrams: { tbsp: 15, tsp: 3 } });

// ---------- prix (fichier daté, modifiable par l'utilisateur) ----------
const items = {};
for (const [label, price] of Object.entries(P.PRC)) {
  const id = ALIAS[label];
  if (!id || items[id]) continue;
  const unitBased = ingById.get(id).gramsPerUnit && !['carrot'].includes(id);
  items[id] = unitBased ? { perUnit: price } : { perKg: price };
}
const packs = {};
for (const [label, [size, price, desc]] of Object.entries(P.PANT)) {
  packs[ALIAS[label]] = { size, price, label: desc };
}
const BULKU = { 'cuisse de poulet': 'piece' };
const bulk = P.BULK.map(([label, format, size, price, shelfLife]) => ({
  ingredient: ALIAS[label], format, size, unit: BULKU[label] || 'g', price, shelfLife,
}));
write('prices.json', {
  asOf: '2026-11-05',
  currency: 'EUR',
  source: 'Estimations du prototype : marques distributeur en drive, France. À vérifier sur ton drive.',
  spoonCost: 0.04,
  spicePotPrice: 2.5,
  items,
  packs,
  bulk,
});

// ---------- recettes ----------
const CAT = { 'Petit-déj': 'breakfast', Plat: 'main', Collation: 'snack' };
const MEAT = /poulet|bœuf|steak|thon|cuisse/;
const BATCH = ['chili-de-boeuf-aux-haricots-rouges', 'pates-bolognaise', 'lentilles-corail-epicees',
  'soupe-epaisse-lentilles-carottes-et-pain', 'chili-sans-viande-lentilles-haricots-rouges',
  'poulet-tikka-masala-et-riz', 'couscous-poulet-et-pois-chiches', 'riz-lentilles-et-oeufs-au-plat',
  'pates-aux-lentilles-corail-et-tomate', 'semoule-pois-chiches-et-carottes-au-cumin'];
const FREEZE = ['chili-de-boeuf-aux-haricots-rouges', 'pates-bolognaise', 'lentilles-corail-epicees',
  'soupe-epaisse-lentilles-carottes-et-pain', 'chili-sans-viande-lentilles-haricots-rouges',
  'poulet-tikka-masala-et-riz', 'pancakes-flocons-banane'];
const budgetIdx = new Set([...P.BMAT, ...P.BCOL, ...P.BPL]);
const recipes = P.RC.map((r, idx) => {
  const id = slug(r[0]);
  const ings = r[5].split(';').map((x) => {
    const o = P.PRS(x);
    const ing = { ingredient: ALIAS[o.l], qty: o.q, unit: UNIT[o.u] };
    if (!ing.ingredient) throw new Error('ingrédient inconnu ' + o.l);
    if (o.l !== ingById.get(ing.ingredient).name) ing.label = o.l;
    return ing;
  });
  const tags = ['noPork'];
  if (!ings.some((i) => MEAT.test(ingById.get(i.ingredient).name))) tags.push('vegetarian');
  if (budgetIdx.has(idx)) tags.push('budget');
  if (BATCH.includes(id)) tags.push('batch');
  if (FREEZE.includes(id)) tags.push('freezable');
  return {
    id,
    name: r[0],
    category: CAT[r[1]],
    minutes: parseInt(r[2], 10),
    reference: { kcal: r[3], protein: r[4] },
    ingredients: ings,
    steps: r[6].split(/(?<=\.)\s+(?=[A-ZÀ-Ý])/u),
    tasteTip: r[7],
    tags,
  };
});
const rid = (i) => recipes[i].id;
write('recipes.json', { recipes });
write('menus.json', {
  rotationWeeks: 4,
  mealShares: P.SHARE,
  slots: P.SLOT,
  budget: { breakfast: P.BMAT.map(rid), main: P.BPL.map(rid), snack: P.BCOL.map(rid) },
  normal: { breakfast: P.MI.map(rid), main: P.PI.map(rid), snack: P.CI.map(rid) },
});

// ---------- nutrition : paramètres par objectif ----------
const nutrition = {};
for (const g of GOALS) {
  nutrition[g] = {
    kcalOffset: P.OFF[g], proteinPerKg: P.PRO[g], fatPerKg: P.FAT[g],
    weightTrendKgPerWeek: P.TGW[g],
  };
}
write('nutrition.json', {
  activityFactor: 1.55,
  waterLitersPerKg: 0.035,
  waterTrainingBonusL: 0.5,
  goals: nutrition,
  quickFoods: P.FOODS.map(([name, kcal, protein]) => ({ name, kcal, protein })),
});

// ---------- compléments ----------
const SPID = { cre: 'creatine', whey: 'whey', om3: 'omega3', caf: 'caffeine', vd: 'vitaminD', mg: 'magnesium' };
const SYM = { '✅': 'recommended', '👍': 'useful', '➖': 'optional', '❌': 'useless' };
write('supplements.json', {
  supplements: Object.entries(P.SPL).map(([k, [name, dose, timing]]) => ({
    // Correction : l'EFSA fixe à 250 mg/jour la limite du magnésium en complément (le prototype disait 200 à 400 mg).
    id: SPID[k], name, dose: k === 'mg' ? '200 à 250 mg' : dose, timing, trainingDaysOnly: k === 'caf',
  })),
  defaults: Object.fromEntries(GOALS.map((g) => [g, P.SPD[g].map((k) => SPID[k])])),
  usefulness: P.SM.map(([name, ...v]) => ({ name, byGoal: Object.fromEntries(GOALS.map((g, i) => [g, SYM[v[i]]])) })),
});
console.log(`${exercises.length} exercices, ${recipes.length} recettes, ${ingredients.length} ingrédients`);
