// M6 (coaching) : objectifs perte de graisse et forme générale, métadonnées des exercices,
// paramètres nutritionnels par niveau, plans de repas, recettes denses et légères.
// Idempotent. Usage : node tools/add-goals-m6.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const D = (f) => path.join(ROOT, 'packages/content/data', f);
const read = (f) => JSON.parse(fs.readFileSync(D(f), 'utf8'));
const write = (f, o) => fs.writeFileSync(D(f), JSON.stringify(o, null, 2) + '\n');

// ---------- exercices : rôle et articulations sollicitées ----------
const ex = read('exercises.json');
const COMPOUND = /^(developpe|tirage|rowing|tractions|dips|pompes|squat|presse|fentes|hip-thrust|pont-fessier|pull-through|extension-lombaire|circuit)/;
const ISOLATION = /^(curl|extension-triceps|barre-au-front|elevations|oiseau|face-pull|leg-curl|leg-extension|mollets)/;
const JOINTS = {
  shoulder: /^(developpe|dips|pompes|elevations|face-pull|oiseau|tractions|tirage|lancer|etirement-pecs|rotation-du-haut|circuit|rowing-explosif)/,
  knee: /^(squat|presse|fentes|leg-extension|sauts|mollets-sautes|skipping|corde|footing|fractionne|echauffement-footing|circuit|etirement-flechisseurs)/,
  lowerBack: /^(extension-lombaire|pull-through|rowing-t-bar|rowing-buste|rowing-haltere|superman|etirement-ischio|etirements|squat-goblet-lourd|hip-thrust-barre|releve-de-jambes|lancer-de-medecine-ball$)/,
  wrist: /^(pompes|planche|dips|curl-barre|developpe-couche-barre|developpe-militaire-barre)/,
  elbow: /^(barre-au-front|extension-triceps|curl-barre|dips|tractions|developpe-couche-barre)/,
};
for (const e of ex.exercises) {
  e.role = e.kind === 'strength' ? (COMPOUND.test(e.id) ? 'compound' : ISOLATION.test(e.id) ? 'isolation' : 'compound') : e.kind;
  e.joints = Object.entries(JOINTS).filter(([, re]) => re.test(e.id)).map(([j]) => j);
}
write('exercises.json', ex);

// ---------- ingrédients et prix nouveaux ----------
const ing = read('ingredients.json');
const prices = read('prices.json');
const NEW_ING = [
  ['whole-milk', 'lait entier', 'fresh', 64, 3.3, 4.7, 3.6, null, { perKg: 1.2 }, null],
  ['almonds', 'amandes', 'pantry', 580, 21, 22, 50, null, { perKg: 11 }, [200, 2.2, '200 g']],
];
for (const [id, name, aisle, kcal, protein, carbs, fat, gpu, price, pack] of NEW_ING) {
  const o = { id, name, aisle, per100g: { kcal, protein, carbs, fat } };
  if (gpu) o.gramsPerUnit = gpu;
  ing.ingredients = [...ing.ingredients.filter((x) => x.id !== id), o];
  prices.items[id] = price;
  if (pack) prices.packs[id] = { size: pack[0], price: pack[1], label: pack[2] };
}
write('ingredients.json', ing);
write('prices.json', prices);

// ---------- programmes : objectifs perte de graisse et forme générale ----------
const prog = read('programs.json');
prog.goals.fatloss = {
  name: 'Perte de graisse', icon: '🔥',
  description: 'Perdre du gras en gardant ton muscle : musculation complète, un peu de cardio en fin de séance et un déficit calorique modéré.',
  weightGoalText: 'perte visée : 0,3 à 0,8 % du poids par semaine',
  phaseTexts: [
    'Apprendre : 2–3 séries de 10–12 reps, 3–4 reps en réserve, marche rapide en fin de séance',
    'Progresser : 3–4 séries de 8–12 reps, vélo ou rameur en fin de séance',
    'Intensifier : charges plus lourdes pour garder ton muscle, fractionné doux en fin de séance',
  ],
  nutritionNotes: {
    before: '1 à 2 h avant : protéines et féculents légers (œufs et pain, yaourt et flocons). Pas de séance à jeun si tu te sens faible.',
    after: '25 à 35 g de protéines dans les 2 h, avec des légumes : tu restes rassasié pour peu de calories.',
    adjust: 'Poids stable 2 semaines : −150 kcal. Perte de plus de 1 % du poids par semaine : mange un peu plus, tu perdrais du muscle.',
  },
};
prog.goals.health = {
  name: 'Forme générale et santé', icon: '🌿',
  description: 'Te sentir bien, mieux respirer, garder un corps solide : 2 à 3 séries par exercice, du cardio doux et des calories d’entretien.',
  weightGoalText: 'poids stable (à ±0,25 kg par semaine)',
  phaseTexts: [
    'Apprendre : 2 séries de 10–12 reps, 3–4 reps en réserve, marche en fin de séance',
    'Progresser : 3 séries de 10–12 reps, vélo ou rameur doux en fin de séance',
    'Entretenir : 3 séries de 8–12 reps, 150 minutes d’activité par semaine au total',
  ],
  nutritionNotes: {
    before: '1 à 2 h avant : un repas léger avec des féculents. Bois un verre d’eau.',
    after: 'Un repas équilibré dans les 2 h : protéines, féculents, légumes.',
    adjust: 'Poids stable : garde ton objectif. Si tu perds ou prends plus de 0,5 kg par semaine sans le vouloir, l’appli ajuste de 150 kcal.',
  },
};
const mass = prog.templates.mass;
const cond = (ph) => [
  { exercise: 'marche-rapide', scheme: '10 min' },
  { exercise: 'velo-ou-rameur-regulier', scheme: '12 min' },
  { exercise: 'fractionne-doux-1-min-rapide-2-min-lent', scheme: '6 rép.' },
][ph];
const capSets = (scheme, n) => scheme.replace(/^(\d+)×/, (_, s) => `${Math.min(Number(s), n)}×`);
prog.templates.fatloss = mass.map((phase, ph) => phase.map((session) => [...session.map((x) => ({ ...x })), cond(ph)]));
prog.templates.health = mass.map((phase, ph) => phase.map((session) => [
  ...session.map((x) => ({ exercise: x.exercise, scheme: capSets(x.scheme, ph === 0 ? 2 : 3) })),
  { exercise: ph === 2 ? 'velo-ou-rameur-regulier' : 'marche-rapide', scheme: ph === 0 ? '10 min' : '15 min' },
]));
write('programs.json', prog);

// ---------- nutrition : paramètres par objectif et par niveau ----------
const nut = read('nutrition.json');
const lv = (b, i, a) => ({ beginner: b, intermediate: i, advanced: a });
const L = (kcalOffset, lo, hi) => ({ kcalOffset, trendPct: [lo, hi] });
nut.goals = {
  // trendPct : variation visée du poids, en % du poids par semaine
  mass: {
    proteinPerKg: 1.8, fatPerKg: 1.2,
    byLevel: lv(L(400, 0.2, 0.5), L(250, 0.1, 0.25), L(150, 0.05, 0.12)),
    hardGainer: {
      kcalOffset: lv(600, 500, 400), trendPct: lv([0.25, 0.55], [0.15, 0.3], [0.08, 0.15]),
      proteinPerKg: 1.8, fatPerKg: 1.3, adjustKcal: 200, mealsPerDay: 5,
    },
  },
  strength: { proteinPerKg: 1.8, fatPerKg: 1.1, byLevel: lv(L(250, 0.1, 0.3), L(200, 0.05, 0.15), L(150, 0.02, 0.08)) },
  power: { proteinPerKg: 1.7, fatPerKg: 1.0, byLevel: lv(L(100, -0.4, 0.4), L(100, -0.4, 0.4), L(100, -0.4, 0.4)) },
  cardio: { proteinPerKg: 1.5, fatPerKg: 1.0, byLevel: lv(L(100, -0.4, 0.4), L(100, -0.4, 0.4), L(100, -0.4, 0.4)) },
  fatloss: { proteinPerKg: 2.0, fatPerKg: 0.8, byLevel: lv(L(-400, -0.8, -0.3), L(-400, -0.8, -0.3), L(-350, -0.7, -0.25)) },
  health: { proteinPerKg: 1.4, fatPerKg: 1.0, byLevel: lv(L(0, -0.3, 0.3), L(0, -0.3, 0.3), L(0, -0.3, 0.3)) },
};
nut.minKcal = { male: 1700, female: 1400, bmrFactor: 1.15 };
write('nutrition.json', nut);

// ---------- plans de repas (3 à 6 prises par jour) ----------
const menus = read('menus.json');
delete menus.mealShares; delete menus.slots;
menus.mealPlans = {
  3: { names: ['Matin', 'Midi', 'Soir'], categories: ['breakfast', 'main', 'main'], shares: [0.3, 0.4, 0.3] },
  4: { names: ['Matin', 'Midi', 'Collation', 'Soir'], categories: ['breakfast', 'main', 'snack', 'main'], shares: [0.25, 0.3, 0.15, 0.3] },
  5: { names: ['Matin', 'Midi', 'Collation', 'Soir', 'Avant le coucher'], categories: ['breakfast', 'main', 'snack', 'main', 'snack'], shares: [0.22, 0.28, 0.12, 0.26, 0.12] },
  6: { names: ['Matin', 'Milieu de matinée', 'Midi', 'Collation', 'Soir', 'Avant le coucher'], categories: ['breakfast', 'snack', 'main', 'snack', 'main', 'snack'], shares: [0.2, 0.1, 0.25, 0.12, 0.25, 0.08] },
};
write('menus.json', menus);

// ---------- compléments pour les nouveaux objectifs ----------
const sup = read('supplements.json');
sup.defaults.fatloss = ['whey', 'omega3'];
sup.defaults.health = ['omega3', 'vitaminD'];
const U = { 'Créatine monohydrate': ['optional', 'optional'], 'Whey (si besoin)': ['useful', 'optional'], 'Oméga-3': ['useful', 'useful'],
  'Caféine avant séance': ['optional', 'optional'], 'Vitamine D (hiver)': ['useful', 'useful'], Magnésium: ['optional', 'optional'],
  Citrulline: ['optional', 'optional'], 'Bêta-alanine': ['optional', 'optional'] };
for (const u of sup.usefulness) {
  const [f, h] = U[u.name] ?? ['useless', 'useless'];
  u.byGoal.fatloss = f; u.byGoal.health = h;
}
sup.guide.stacks.fatloss = [
  'Whey : 1 dosette (25–30 g) quand tu n’atteins pas tes {protein} g de protéines : c’est le complément le plus utile quand on mange moins',
  'Oméga-3 : 500 mg à 1 g d’EPA + DHA par jour si tu manges peu de poisson gras',
  'Café avant la séance si tu veux (optionnel), sans sucre',
  'Les brûleurs de graisse ne servent à rien : c’est le déficit calorique qui fait le travail',
];
sup.guide.stacks.health = [
  'Oméga-3 : 500 mg à 1 g d’EPA + DHA par jour si tu manges peu de poisson gras',
  'Vitamine D en hiver : dose à valider avec ton médecin',
  'Aucun autre complément n’est nécessaire : mange varié, dors 7 à 9 h',
];
write('supplements.json', sup);

// ---------- exclusions : fruits à coque ----------
const exc = read('exclusions.json');
exc.allergies = exc.allergies.filter((a) => a.id !== 'nuts');
exc.allergies.push({ id: 'nuts', name: 'Fruits à coque', ingredients: ['almonds'] });
const dairy = exc.allergies.find((a) => a.id === 'dairy');
dairy.ingredients = [...new Set([...dairy.ingredients, 'whole-milk'])].sort();
write('exclusions.json', exc);

// ---------- recettes denses (prise de masse difficile) et légères (perte de graisse) ----------
const byId = new Map(ing.ingredients.map((x) => [x.id, x]));
const UNIT_G = { g: 1, ml: 1, tbsp: 15, tsp: 3 };
const gramsOf = (i) => (i.unit === 'piece' ? i.qty * byId.get(i.ingredient).gramsPerUnit : i.qty * UNIT_G[i.unit]);
const kcalOf = (r) => r.ingredients.reduce((a, i) => a + (byId.get(i.ingredient).per100g.kcal * gramsOf(i)) / 100, 0);
const costOf = (r) => r.ingredients.reduce((a, i) => {
  if (i.unit === 'tbsp' || i.unit === 'tsp') return a + i.qty * prices.spoonCost;
  const p = prices.items[i.ingredient];
  if (!p) return a;
  const g = byId.get(i.ingredient).gramsPerUnit;
  if (i.unit === 'piece') return a + ('perUnit' in p ? i.qty * p.perUnit : (i.qty * g * p.perKg) / 1000);
  return a + ('perKg' in p ? (i.qty / 1000) * p.perKg : (i.qty / g) * p.perUnit);
}, 0);
const MEAT = new Set(['chicken-breast', 'chicken-leg', 'cooked-chicken', 'beef-mince-5', 'beef-patty-5', 'tuna', 'turkey', 'white-fish', 'sardines']);
const R = (id, name, category, minutes, ingredients, steps, tasteTip, extra) => ({ id, name, category, minutes, ingredients, steps, tasteTip, extra });
const NEW = [
  R('shake-prise-de-masse-xl', 'Shake prise de masse XL', 'snack', 5,
    [['whole-milk', 400, 'ml'], ['oats', 60, 'g'], ['banana', 1, 'piece'], ['peanut-butter', 30, 'g'], ['honey', 15, 'g']],
    ['Mets tout dans le mixeur.', 'Mixe 1 minute jusqu’à une texture lisse.'],
    'Une boisson passe plus facilement qu’un repas quand on a peu d’appétit : bois-la par petites gorgées en 15 minutes.', ['dense']),
  R('riz-au-lait-gourmand', 'Riz au lait gourmand', 'breakfast', 30,
    [['rice', 80, 'g'], ['whole-milk', 500, 'ml'], ['honey', 20, 'g'], ['butter', 10, 'g'], ['raisins', 20, 'g']],
    ['Fais cuire le riz dans le lait à feu doux 25 minutes en remuant.', 'Ajoute le beurre, le miel et les raisins secs.'],
    'Une pincée de cannelle et de sel : il a le goût d’un dessert de grand-mère.', ['dense', 'batch']),
  R('porridge-xl-amandes', 'Porridge XL aux amandes', 'breakfast', 8,
    [['oats', 100, 'g'], ['whole-milk', 350, 'ml'], ['almonds', 25, 'g'], ['banana', 1, 'piece'], ['honey', 15, 'g']],
    ['Chauffe flocons et lait 4 minutes en remuant.', 'Ajoute la banane écrasée, les amandes concassées et le miel.'],
    'Fais griller les amandes à sec 2 minutes : elles croustillent et parfument tout le bol.', ['dense']),
  R('pates-thon-fromage-huile', 'Pâtes au thon, fromage et huile d’olive', 'main', 20,
    [['pasta', 120, 'g', 'pâtes crues'], ['tuna', 100, 'g'], ['grated-cheese', 40, 'g'], ['olive-oil', 15, 'g'], ['crushed-tomatoes', 100, 'g']],
    ['Cuis les pâtes.', 'Réchauffe les tomates avec le thon émietté.', 'Mélange avec les pâtes, l’huile d’olive et le fromage.'],
    'L’huile d’olive crue ajoutée à la fin apporte des calories sans volume : idéal quand on mange peu.', ['dense']),
  R('omelette-fromagere-pommes-de-terre-xl', 'Omelette fromagère et pommes de terre XL', 'main', 25,
    [['egg', 4, 'piece'], ['potato', 300, 'g'], ['grated-cheese', 40, 'g'], ['olive-oil', 10, 'g']],
    ['Fais dorer les pommes de terre en dés 12 minutes dans l’huile.', 'Verse les œufs battus, ajoute le fromage, cuis 5 minutes à feu doux.'],
    'Laisse bien dorer les pommes de terre avant les œufs : le croustillant fait toute la différence.', ['dense']),
  R('omelette-epinards-feta', 'Omelette aux épinards et feta', 'breakfast', 10,
    [['egg', 3, 'piece'], ['frozen-spinach', 150, 'g'], ['feta', 30, 'g'], ['oil', 5, 'g']],
    ['Fais décongeler et égoutter les épinards.', 'Fais-les revenir 2 minutes, verse les œufs battus et émiette la feta.', 'Cuis doucement jusqu’à ce que ce soit pris.'],
    'Presse bien les épinards : l’omelette reste moelleuse au lieu de rendre de l’eau.', ['light']),
  R('bowl-poulet-pois-chiches-crudites', 'Bowl de poulet, pois chiches et crudités', 'main', 10,
    [['cooked-chicken', 130, 'g'], ['chickpeas', 100, 'g'], ['crudites', 150, 'g'], ['olive-oil', 8, 'g'], ['lemon-juice', 2, 'tsp']],
    ['Égoutte les pois chiches.', 'Mélange tous les ingrédients avec l’huile et le citron.', 'Sale, poivre.'],
    'Beaucoup de volume pour peu de calories : tu es rassasié plus longtemps.', ['light']),
  R('soupe-legumes-lentilles-corail', 'Soupe de légumes et lentilles corail', 'main', 30,
    [['red-lentils', 70, 'g'], ['carrot', 150, 'g'], ['leek', 150, 'g'], ['potato', 150, 'g'], ['olive-oil', 5, 'g'], ['cumin', 1, 'tsp']],
    ['Coupe les légumes en morceaux.', 'Cuis-les 20 minutes avec les lentilles dans 80 cl d’eau.', 'Mixe, assaisonne avec le cumin et l’huile.'],
    'Une cuillère de yaourt nature au moment de servir la rend crémeuse sans crème.', ['light', 'batch', 'freezable']),
  R('thon-riz-haricots-verts', 'Thon, riz et haricots verts', 'main', 15,
    [['tuna', 100, 'g'], ['rice', 60, 'g', 'riz cru'], ['frozen-green-beans', 200, 'g'], ['olive-oil', 8, 'g'], ['lemon-juice', 1, 'tsp']],
    ['Cuis le riz et les haricots verts.', 'Mélange avec le thon émietté, l’huile et le citron.'],
    'Un peu de moutarde dans l’huile de l’assaisonnement donne du caractère.', ['light']),
  R('yaourt-fruits-rouges', 'Yaourt nature et fruits rouges', 'snack', 3,
    [['plain-yogurt', 200, 'g'], ['frozen-berries', 100, 'g'], ['honey', 5, 'g']],
    ['Laisse décongeler les fruits rouges.', 'Verse-les sur le yaourt avec le miel.'],
    'Les fruits décongelés rendent leur jus : un coulis gratuit.', ['light']),
  R('fromage-blanc-pomme-cannelle', 'Fromage blanc, pomme et cannelle', 'snack', 3,
    [['fromage-blanc', 200, 'g'], ['apple', 1, 'piece'], ['cinnamon', 1, 'tsp']],
    ['Coupe la pomme en dés.', 'Mélange avec le fromage blanc et la cannelle.'],
    'Fais chauffer la pomme 1 minute au micro-ondes : elle devient fondante.', ['light']),
];
const rec = read('recipes.json');
for (const r of NEW) {
  const ingredients = r.ingredients.map(([ingredient, qty, unit, label]) => {
    if (!byId.has(ingredient)) throw new Error(`Ingrédient inconnu ${ingredient} dans ${r.id}`);
    return { ingredient, qty, unit, ...(label ? { label } : {}) };
  });
  const o = { id: r.id, name: r.name, category: r.category, minutes: r.minutes, ingredients, steps: r.steps, tasteTip: r.tasteTip, tags: ['noPork'] };
  if (!ingredients.some((i) => MEAT.has(i.ingredient))) o.tags.push('vegetarian');
  if ((costOf(o) / kcalOf(o)) * 1000 <= 2.15) o.tags.push('budget');
  o.tags.push(...r.extra);
  rec.recipes = [...rec.recipes.filter((x) => x.id !== r.id), o];
  console.log(r.id.padEnd(40), Math.round(kcalOf(o)), 'kcal', costOf(o).toFixed(2), '€', o.tags.join(','));
}
write('recipes.json', rec);
console.log(`${rec.recipes.length} recettes`);
