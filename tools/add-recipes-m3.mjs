// Ajout des recettes de M3 (37 recettes, 64 au total) et des ingrédients nécessaires.
// Idempotent : remplace les entrées de mêmes identifiants. Usage : node tools/add-recipes-m3.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const D = (f) => path.join(ROOT, 'packages/content/data', f);
const read = (f) => JSON.parse(fs.readFileSync(D(f), 'utf8'));
const write = (f, o) => fs.writeFileSync(D(f), JSON.stringify(o, null, 2) + '\n');

// ---------- ingrédients : [id, nom, rayon, kcal, prot, gluc, lip, g/pièce, prix, paquet] ----------
// prix : { perKg } ou { perUnit } ; paquet (placard) : [taille g, prix €, libellé]
const NEW_ING = [
  ['sardines', 'sardines à l’huile (égouttées)', 'pantry', 220, 25, 0, 13, null, { perKg: 9 }, [100, 0.95, '1 boîte']],
  ['frozen-spinach', 'épinards hachés surgelés', 'fresh', 25, 3, 1.5, 0.4, null, { perKg: 2.4 }],
  ['lemon', 'citron', 'fresh', 30, 0.8, 6, 0.3, 100, { perUnit: 0.35 }],
  ['coconut-milk', 'lait de coco', 'pantry', 180, 1.5, 3, 18, null, { perKg: 3.2 }, [400, 1.25, '1 boîte de 40 cl']],
  ['sweet-potato', 'patate douce', 'fresh', 86, 1.6, 20, 0.1, null, { perKg: 2.5 }],
  ['white-fish', 'colin d’Alaska surgelé', 'fresh', 80, 18, 0, 0.8, null, { perKg: 8 }],
  ['tofu', 'tofu nature', 'fresh', 120, 12, 2, 7, null, { perKg: 8 }],
  ['feta', 'feta', 'fresh', 260, 14, 1, 21, null, { perKg: 10 }],
  ['cabbage', 'chou blanc ou vert', 'fresh', 25, 1.3, 4, 0.2, null, { perKg: 1.3 }],
  ['leek', 'poireaux', 'fresh', 30, 1.5, 5, 0.3, null, { perKg: 2 }],
  ['frozen-peppers', 'poivrons en lanières surgelés', 'fresh', 30, 1, 5, 0.3, null, { perKg: 2.6 }],
  ['turkey', 'escalope de dinde', 'fresh', 110, 24, 0, 1.5, null, { perKg: 9.5 }],
  ['bulgur', 'boulgour', 'pantry', 350, 12, 69, 1.5, null, { perKg: 2.6 }, [500, 1.3, '500 g']],
  ['corn', 'maïs en boîte', 'pantry', 80, 2.5, 14, 1.2, null, { perKg: 3.5 }, [285, 0.95, '1 boîte']],
  ['frozen-green-beans', 'haricots verts surgelés', 'fresh', 30, 2, 4, 0.2, null, { perKg: 2 }],
  ['mushrooms', 'champignons de Paris', 'fresh', 22, 3, 0.5, 0.3, null, { perKg: 4 }],
  ['light-cream', 'crème fraîche légère', 'fresh', 150, 3, 4, 15, null, { perKg: 4.4 }],
  ['raisins', 'raisins secs', 'pantry', 300, 3, 70, 0.5, null, { perKg: 6 }, [250, 1.5, '250 g']],
  ['dark-chocolate', 'chocolat noir', 'pantry', 550, 8, 30, 42, null, { perKg: 10 }, [100, 1, '1 tablette']],
  ['noodles', 'nouilles aux œufs', 'pantry', 360, 13, 70, 2.5, null, { perKg: 3.2 }, [250, 0.8, '250 g']],
  ['white-beans', 'haricots blancs en boîte', 'pantry', 100, 7, 13, 0.5, null, { perKg: 3.6 }, [250, 0.9, '1 boîte']],
  ['frozen-berries', 'fruits rouges surgelés', 'fresh', 50, 1, 10, 0.3, null, { perKg: 6 }],
  ['curry', 'curry en poudre', 'spice', 320, 13, 30, 14, null, null],
  ['cinnamon', 'cannelle', 'spice', 250, 4, 50, 1, null, null],
  ['ginger', 'gingembre en poudre', 'spice', 330, 9, 60, 4, null, null],
  ['herbs', 'herbes de Provence', 'spice', 260, 9, 40, 7, null, null],
  ['chili', 'piment en flocons', 'spice', 300, 12, 50, 14, null, null],
  ['mustard', 'moutarde', 'spice', 150, 7, 5, 11, null, null],
  ['vinegar', 'vinaigre', 'spice', 20, 0, 1, 0, null, null],
];

// ---------- recettes ----------
// ingrédient : [id, quantité, unité, libellé facultatif] ; unités : g, ml, piece, tbsp, tsp
const R = (id, name, category, minutes, ingredients, steps, tasteTip, extra = []) => ({ id, name, category, minutes, ingredients, steps, tasteTip, extra });
const RECIPES = [
  // petits-déjeuners
  R('overnight-oats-cacao-banane', 'Overnight oats cacao-banane', 'breakfast', 5,
    [['oats', 70, 'g'], ['milk', 200, 'ml'], ['plain-yogurt', 100, 'g'], ['cocoa', 5, 'g'], ['banana', 1, 'piece'], ['honey', 10, 'g']],
    ['Mélange flocons, lait, yaourt, cacao et miel dans un bocal.', 'Ferme et laisse une nuit au frais.', 'Le matin, ajoute la banane en rondelles.'],
    'Prépare trois pots le dimanche : ils se gardent trois jours et sont encore meilleurs le lendemain.', ['batch']),
  R('tartines-oeufs-brouilles-tomate', 'Tartines aux œufs brouillés et tomate', 'breakfast', 10,
    [['wholemeal-bread', 80, 'g'], ['egg', 3, 'piece'], ['tomato', 1, 'piece'], ['butter', 5, 'g']],
    ['Grille le pain.', 'Bats les œufs, cuis-les à feu doux dans le beurre en remuant sans arrêt.', 'Sers sur le pain avec la tomate en tranches.'],
    'Retire les œufs du feu quand ils sont encore crémeux : ils finissent de cuire dans l’assiette.'),
  R('pain-perdu-cannelle', 'Pain perdu à la cannelle', 'breakfast', 15,
    [['wholemeal-bread', 100, 'g'], ['egg', 2, 'piece'], ['milk', 150, 'ml'], ['cinnamon', 1, 'tsp'], ['honey', 10, 'g'], ['butter', 5, 'g']],
    ['Bats œufs, lait et cannelle.', 'Trempe les tranches de pain des deux côtés.', 'Dore-les 2 minutes par face dans le beurre, puis arrose de miel.'],
    'Une pincée de sel dans le mélange œufs-lait fait ressortir la cannelle. Le pain rassis est le meilleur.'),
  R('porridge-sale-oeuf-mollet', 'Porridge salé, œuf mollet et fromage', 'breakfast', 10,
    [['oats', 60, 'g'], ['milk', 200, 'ml'], ['egg', 1, 'piece'], ['grated-cheese', 15, 'g']],
    ['Cuis l’œuf 6 minutes dans l’eau bouillante, passe-le sous l’eau froide.', 'Chauffe flocons et lait 3 minutes en remuant, ajoute le fromage.', 'Pose l’œuf écalé sur le porridge.'],
    'Un trait de sauce soja et beaucoup de poivre : un petit-déjeuner salé qui tient jusqu’à midi.'),
  R('bowl-fromage-blanc-fruits-rouges', 'Bowl fromage blanc et fruits rouges', 'breakfast', 5,
    [['fromage-blanc', 250, 'g'], ['frozen-berries', 100, 'g'], ['oats', 40, 'g'], ['honey', 10, 'g']],
    ['Sors les fruits rouges du congélateur la veille.', 'Verse-les sur le fromage blanc avec leur jus.', 'Ajoute les flocons et le miel.'],
    'Décongelés une nuit, les fruits rouges font un coulis naturel qui parfume tout le bol.'),
  R('crepes-banane-cacahuete', 'Crêpes à la banane et beurre de cacahuète', 'breakfast', 20,
    [['flour', 60, 'g'], ['egg', 2, 'piece'], ['milk', 150, 'ml'], ['banana', 1, 'piece'], ['peanut-butter', 15, 'g']],
    ['Fouette farine, œufs et lait, laisse reposer 10 minutes.', 'Cuis de fines crêpes dans une poêle chaude légèrement huilée.', 'Garnis de banane et de beurre de cacahuète.'],
    'Poêle la banane une minute avec le beurre de cacahuète : il fond et nappe les crêpes.'),
  // collations
  R('yaourt-granola-maison', 'Yaourt et granola maison', 'snack', 8,
    [['plain-yogurt', 200, 'g'], ['oats', 30, 'g'], ['honey', 10, 'g'], ['raisins', 15, 'g']],
    ['Fais dorer les flocons 3 minutes à la poêle avec le miel.', 'Laisse refroidir : ils deviennent croustillants.', 'Verse sur le yaourt avec les raisins secs.'],
    'Fais-en une grande quantité le dimanche : le granola se garde deux semaines dans un bocal.', ['batch']),
  R('houmous-maison-crudites', 'Houmous maison et crudités', 'snack', 10,
    [['chickpeas', 120, 'g'], ['olive-oil', 10, 'g'], ['garlic', 1, 'piece', 'gousse d’ail'], ['lemon-juice', 2, 'tsp'], ['cumin', 1, 'tsp'], ['carrot', 1, 'piece'], ['wholemeal-bread', 40, 'g']],
    ['Mixe pois chiches, huile, ail, citron, cumin et 2 cuillères d’eau.', 'Coupe la carotte en bâtonnets.', 'Sers avec le pain grillé.'],
    'Garde un peu du jus de la boîte de pois chiches : ajouté au mixage, il rend le houmous très lisse.', ['batch']),
  R('oeufs-durs-pain-tomate', 'Œufs durs, pain et tomate', 'snack', 12,
    [['egg', 2, 'piece'], ['wholemeal-bread', 50, 'g'], ['tomato', 1, 'piece']],
    ['Cuis les œufs 9 minutes, refroidis-les.', 'Coupe la tomate, sale et poivre.', 'Mange avec le pain.'],
    'Une pincée de paprika et de sel sur les œufs coupés : simple et très bon.'),
  R('lait-frappe-chocolat-flocons', 'Lait frappé chocolat-flocons', 'snack', 3,
    [['milk', 300, 'ml'], ['cocoa', 10, 'g'], ['oats', 30, 'g'], ['honey', 10, 'g']],
    ['Mets tout dans le mixeur.', 'Ajoute trois glaçons.', 'Mixe 1 minute.'],
    'Avec les glaçons et une minute de mixeur, la texture devient celle d’un vrai milkshake.'),
  R('toast-thon-fromage-blanc', 'Toast au thon et fromage blanc', 'snack', 5,
    [['wholemeal-bread', 60, 'g'], ['tuna', 70, 'g'], ['fromage-blanc', 50, 'g'], ['lemon-juice', 1, 'tsp']],
    ['Écrase le thon avec le fromage blanc et le citron.', 'Sale et poivre.', 'Tartine sur le pain grillé.'],
    'Un peu d’oignon haché très fin ou de ciboulette transforme ce toast en rillettes de thon.'),
  R('fromage-blanc-banane-chocolat', 'Fromage blanc, banane et chocolat noir', 'snack', 3,
    [['fromage-blanc', 150, 'g'], ['banana', 1, 'piece'], ['dark-chocolate', 15, 'g']],
    ['Coupe la banane en rondelles sur le fromage blanc.', 'Râpe le chocolat au couteau par-dessus.'],
    'Le chocolat râpé sur un fromage blanc bien froid croque comme des copeaux de dessert.'),
  R('barres-cereales-maison', 'Barres de céréales maison', 'snack', 10,
    [['oats', 50, 'g'], ['peanut-butter', 20, 'g'], ['honey', 15, 'g'], ['raisins', 15, 'g']],
    ['Chauffe beurre de cacahuète et miel 30 secondes.', 'Mélange avec les flocons et les raisins.', 'Tasse dans un plat, laisse 1 heure au frais, coupe en barres.'],
    'Tasse très fort avec le dos d’une cuillère : les barres se tiennent et ne s’émiettent pas.', ['batch', 'freezable']),
  // plats
  R('curry-pois-chiches-coco-epinards', 'Curry de pois chiches, coco et épinards', 'main', 25,
    [['chickpeas', 150, 'g'], ['coconut-milk', 80, 'ml'], ['frozen-spinach', 150, 'g'], ['crushed-tomatoes', 100, 'g'], ['onion', 0.5, 'piece'], ['rice', 80, 'g', 'riz cru'], ['curry', 1, 'tsp'], ['oil', 5, 'g']],
    ['Cuis le riz.', 'Fais revenir l’oignon puis le curry 1 minute dans l’huile.', 'Ajoute tomates, pois chiches, épinards et lait de coco, mijote 15 minutes.'],
    'Faire revenir le curry dans l’huile avant le reste libère tout son parfum.', ['batch', 'freezable']),
  R('dahl-lentilles-corail-coco', 'Dahl de lentilles corail au lait de coco', 'main', 25,
    [['red-lentils', 80, 'g'], ['coconut-milk', 60, 'ml'], ['crushed-tomatoes', 100, 'g'], ['onion', 0.5, 'piece'], ['garlic', 1, 'piece', 'gousse d’ail'], ['rice', 70, 'g', 'riz cru'], ['curry', 1, 'tsp'], ['ginger', 1, 'tsp'], ['oil', 5, 'g']],
    ['Fais revenir oignon, ail et épices.', 'Ajoute lentilles, tomates, lait de coco et 30 cl d’eau, cuis 15 minutes.', 'Sers avec le riz.'],
    'Un jus de citron au moment de servir réveille toutes les épices.', ['batch', 'freezable']),
  R('poulet-basquaise-riz', 'Poulet basquaise et riz', 'main', 30,
    [['chicken-breast', 130, 'g'], ['frozen-peppers', 150, 'g'], ['crushed-tomatoes', 150, 'g'], ['onion', 0.5, 'piece'], ['rice', 80, 'g', 'riz cru'], ['paprika', 1, 'tsp'], ['olive-oil', 5, 'g']],
    ['Dore le poulet en morceaux.', 'Ajoute oignon et poivrons 5 minutes, puis tomates et paprika.', 'Mijote 15 minutes, sers sur le riz.'],
    'Une pincée de piment ou de paprika fumé donne le goût du Pays basque.', ['batch', 'freezable']),
  R('colin-puree-haricots-verts', 'Colin, purée maison et haricots verts', 'main', 30,
    [['white-fish', 150, 'g'], ['potato', 300, 'g'], ['milk', 50, 'ml'], ['butter', 10, 'g'], ['frozen-green-beans', 150, 'g'], ['lemon-juice', 1, 'tsp']],
    ['Cuis les pommes de terre 20 minutes, écrase-les avec le lait et la moitié du beurre.', 'Cuis les haricots verts.', 'Poêle le colin 3 minutes par face dans le reste du beurre.'],
    'Laisse le beurre devenir noisette dans la poêle avant d’y mettre le poisson, puis un trait de citron.'),
  R('pates-sardines-tomate-citron', 'Pâtes aux sardines, tomate et citron', 'main', 20,
    [['pasta', 100, 'g', 'pâtes crues'], ['sardines', 100, 'g'], ['crushed-tomatoes', 150, 'g'], ['garlic', 1, 'piece', 'gousse d’ail'], ['chili', 1, 'tsp'], ['lemon-juice', 1, 'tsp']],
    ['Cuis les pâtes.', 'Fais revenir l’ail et le piment, ajoute les tomates 5 minutes.', 'Ajoute les sardines, écrase-les à la fourchette, mélange avec les pâtes et le citron.'],
    'Écrasées dans la sauce chaude, les sardines fondent : sauce marine et riche en oméga-3 pour pas cher.'),
  R('frittata-courgette-feta', 'Frittata courgette et feta', 'main', 25,
    [['egg', 4, 'piece'], ['zucchini', 150, 'g'], ['feta', 40, 'g'], ['potato', 150, 'g'], ['olive-oil', 5, 'g']],
    ['Fais revenir pommes de terre et courgette en dés 10 minutes.', 'Verse les œufs battus, émiette la feta.', 'Cuis 5 minutes à feu doux couvert.'],
    'Termine 3 minutes sous le gril du four : le dessus dore et gonfle.'),
  R('chili-dinde-haricots-blancs', 'Chili de dinde aux haricots blancs', 'main', 30,
    [['turkey', 130, 'g'], ['white-beans', 120, 'g'], ['crushed-tomatoes', 200, 'g'], ['onion', 0.5, 'piece'], ['corn', 60, 'g'], ['rice', 70, 'g', 'riz cru'], ['cumin', 1, 'tsp'], ['paprika', 1, 'tsp']],
    ['Coupe la dinde en petits dés et dore-la avec l’oignon.', 'Ajoute épices, tomates, haricots et maïs, mijote 20 minutes.', 'Sers sur le riz.'],
    'Un carré de chocolat noir fondu à la fin donne de la rondeur au chili.', ['batch', 'freezable']),
  R('riz-saute-oeufs-legumes', 'Riz sauté aux œufs et légumes', 'main', 15,
    [['rice', 90, 'g', 'riz cru'], ['egg', 3, 'piece'], ['frozen-veg', 150, 'g'], ['soy-sauce', 1, 'tbsp'], ['oil', 10, 'g'], ['garlic', 1, 'piece', 'gousse d’ail']],
    ['Cuis le riz (idéalement la veille).', 'Fais sauter l’ail et les légumes à feu vif.', 'Pousse sur le côté, brouille les œufs, ajoute riz et sauce soja.'],
    'Riz froid et feu très vif : les grains grillent au lieu de coller.'),
  R('lasagnes-express-lentilles', 'Lasagnes express aux lentilles', 'main', 40,
    [['pasta', 90, 'g', 'pâtes crues'], ['green-lentils', 60, 'g'], ['crushed-tomatoes', 200, 'g'], ['onion', 0.5, 'piece'], ['carrot', 1, 'piece'], ['milk', 150, 'ml'], ['flour', 15, 'g'], ['grated-cheese', 25, 'g']],
    ['Cuis les lentilles 20 minutes et les pâtes.', 'Fais une sauce avec oignon, carotte, tomates et lentilles ; une béchamel avec lait et farine.', 'Alterne pâtes, sauce et béchamel, couvre de fromage, 15 minutes au four.'],
    'Une pointe de muscade dans la béchamel et 5 minutes de repos avant de servir.', ['batch', 'freezable']),
  R('boulgour-legumes-rotis-feta', 'Boulgour, légumes rôtis et feta', 'main', 30,
    [['bulgur', 80, 'g'], ['zucchini', 150, 'g'], ['frozen-peppers', 100, 'g'], ['chickpeas', 80, 'g'], ['feta', 50, 'g'], ['olive-oil', 10, 'g'], ['lemon-juice', 2, 'tsp']],
    ['Rôtis courgette, poivrons et pois chiches 20 minutes à 220 °C avec l’huile.', 'Gonfle le boulgour dans l’eau bouillante.', 'Mélange, ajoute la feta et le citron.'],
    'Four très chaud : les légumes caramélisent et deviennent sucrés.', ['batch']),
  R('hachis-parmentier', 'Hachis parmentier', 'main', 45,
    [['beef-mince-5', 120, 'g'], ['potato', 300, 'g'], ['milk', 60, 'ml'], ['butter', 5, 'g'], ['onion', 0.5, 'piece'], ['carrot', 1, 'piece'], ['grated-cheese', 20, 'g']],
    ['Cuis les pommes de terre et fais une purée avec lait et beurre.', 'Fais dorer oignon, carotte râpée et viande.', 'Viande au fond, purée dessus, fromage, 20 minutes au four à 200 °C.'],
    'Laisse l’oignon bien dorer et ajoute de la muscade dans la purée.', ['batch', 'freezable']),
  R('poulet-curry-coco-riz', 'Poulet au curry et lait de coco', 'main', 25,
    [['chicken-breast', 130, 'g'], ['coconut-milk', 70, 'ml'], ['onion', 0.5, 'piece'], ['frozen-peas', 70, 'g'], ['rice', 80, 'g', 'riz cru'], ['curry', 1, 'tsp'], ['oil', 5, 'g']],
    ['Cuis le riz.', 'Dore le poulet en morceaux avec l’oignon et le curry.', 'Ajoute lait de coco et petits pois, mijote 10 minutes.'],
    'Un jus de citron à la fin équilibre la douceur du coco.', ['batch', 'freezable']),
  R('tofu-saute-sauce-cacahuete', 'Tofu sauté, sauce cacahuète et nouilles', 'main', 20,
    [['tofu', 150, 'g'], ['noodles', 80, 'g'], ['peanut-butter', 15, 'g'], ['soy-sauce', 1, 'tbsp'], ['frozen-veg', 150, 'g'], ['garlic', 1, 'piece', 'gousse d’ail'], ['honey', 5, 'g'], ['oil', 5, 'g']],
    ['Cuis les nouilles.', 'Coupe le tofu en cubes et dore-le à la poêle.', 'Ajoute légumes et ail, puis la sauce (beurre de cacahuète, soja, miel, un peu d’eau) et les nouilles.'],
    'Sèche bien le tofu dans un torchon avant de le dorer : il devient croustillant.'),
  R('rosti-oeufs-au-plat', 'Rösti et œufs au plat', 'main', 25,
    [['potato', 250, 'g'], ['egg', 2, 'piece'], ['onion', 0.5, 'piece'], ['oil', 10, 'g'], ['crudites', 80, 'g']],
    ['Râpe pommes de terre et oignon, presse-les dans un torchon.', 'Forme des galettes et dore-les 5 minutes par face.', 'Sers avec les œufs au plat et la salade.'],
    'Plus tu presses les pommes de terre, plus le rösti est croustillant.'),
  R('boulettes-boeuf-tomate-semoule', 'Boulettes de bœuf sauce tomate et semoule', 'main', 30,
    [['beef-mince-5', 120, 'g'], ['crushed-tomatoes', 200, 'g'], ['semolina', 80, 'g', 'semoule crue'], ['onion', 0.5, 'piece'], ['egg', 0.5, 'piece', 'œuf'], ['cumin', 1, 'tsp']],
    ['Mélange viande, œuf, cumin, sel et poivre, forme des boulettes.', 'Dore-les, ajoute l’oignon et les tomates, mijote 15 minutes.', 'Sers sur la semoule.'],
    'Saisis bien les boulettes avant de les mijoter : la sauce prend leur goût grillé.', ['batch', 'freezable']),
  R('wok-dinde-legumes-nouilles', 'Wok de dinde, légumes et nouilles', 'main', 20,
    [['turkey', 130, 'g'], ['noodles', 80, 'g'], ['frozen-veg', 150, 'g'], ['soy-sauce', 1, 'tbsp'], ['honey', 5, 'g'], ['garlic', 1, 'piece', 'gousse d’ail'], ['oil', 5, 'g']],
    ['Cuis les nouilles.', 'Saisis la dinde en lanières à feu très vif.', 'Ajoute légumes, ail, soja, miel et nouilles, fais sauter 3 minutes.'],
    'Ne surcharge pas la poêle : la viande doit griller, pas bouillir.'),
  R('salade-lentilles-oeuf-carotte', 'Salade de lentilles, œuf et carottes', 'main', 25,
    [['green-lentils', 70, 'g'], ['egg', 2, 'piece'], ['carrot', 1, 'piece'], ['onion', 0.5, 'piece'], ['olive-oil', 10, 'g'], ['mustard', 1, 'tsp'], ['vinegar', 1, 'tsp'], ['wholemeal-bread', 60, 'g']],
    ['Cuis les lentilles 20 minutes et les œufs 9 minutes.', 'Fais une vinaigrette moutarde, vinaigre, huile.', 'Mélange lentilles tièdes, carotte râpée, oignon et œufs.'],
    'Verse la vinaigrette sur les lentilles encore tièdes : elles l’absorbent.', ['batch']),
  R('veloute-poireaux-tartines-fromage', 'Velouté poireaux-pommes de terre et tartines au fromage', 'main', 35,
    [['leek', 200, 'g'], ['potato', 200, 'g'], ['milk', 100, 'ml'], ['butter', 5, 'g'], ['wholemeal-bread', 80, 'g'], ['grated-cheese', 30, 'g']],
    ['Fais suer les poireaux 10 minutes dans le beurre.', 'Ajoute pommes de terre et 50 cl d’eau, cuis 20 minutes, mixe avec le lait.', 'Gratine les tartines au fromage 5 minutes au four.'],
    'Les poireaux doivent fondre doucement sans colorer : c’est le secret d’un velouté sucré.', ['batch', 'freezable']),
  R('pates-cremeuses-champignons-poulet', 'Pâtes crémeuses champignons et poulet', 'main', 20,
    [['pasta', 100, 'g', 'pâtes crues'], ['chicken-breast', 110, 'g'], ['mushrooms', 150, 'g'], ['light-cream', 60, 'g'], ['garlic', 1, 'piece', 'gousse d’ail'], ['grated-cheese', 15, 'g']],
    ['Cuis les pâtes.', 'Saisis les champignons à feu vif, puis le poulet en dés et l’ail.', 'Ajoute la crème et un peu d’eau des pâtes, mélange.'],
    'Ne remue pas les champignons pendant 2 minutes : ils dorent au lieu de rendre leur eau.'),
  R('patate-douce-haricots-rouges-yaourt', 'Patate douce rôtie, haricots rouges et yaourt', 'main', 35,
    [['sweet-potato', 300, 'g'], ['kidney-beans', 120, 'g', 'haricots rouges égouttés'], ['plain-yogurt', 100, 'g'], ['corn', 60, 'g'], ['paprika', 1, 'tsp'], ['oil', 10, 'g'], ['lemon-juice', 1, 'tsp']],
    ['Coupe la patate douce en cubes, mélange avec huile et paprika, 25 minutes à 220 °C.', 'Réchauffe haricots et maïs.', 'Sers avec le yaourt citronné.'],
    'Paprika fumé et yaourt au citron : sucré, fumé, frais.'),
  R('shakshuka-pain', 'Shakshuka et pain', 'main', 25,
    [['egg', 3, 'piece'], ['crushed-tomatoes', 250, 'g'], ['frozen-peppers', 100, 'g'], ['onion', 0.5, 'piece'], ['cumin', 1, 'tsp'], ['paprika', 1, 'tsp'], ['wholemeal-bread', 100, 'g'], ['olive-oil', 5, 'g']],
    ['Fais revenir oignon, poivrons et épices.', 'Ajoute les tomates, mijote 10 minutes.', 'Casse les œufs dans la sauce, couvre 5 minutes, sers avec le pain.'],
    'Couvre la poêle : les blancs prennent pendant que les jaunes restent coulants.'),
  R('poelee-chou-pommes-de-terre-oeufs', 'Poêlée de chou, pommes de terre et œufs', 'main', 30,
    [['cabbage', 200, 'g'], ['potato', 250, 'g'], ['egg', 2, 'piece'], ['onion', 0.5, 'piece'], ['oil', 10, 'g'], ['paprika', 1, 'tsp'], ['vinegar', 1, 'tsp']],
    ['Fais dorer les pommes de terre en dés 10 minutes.', 'Ajoute oignon et chou émincé, cuis 10 minutes en laissant colorer.', 'Fais cuire les œufs au plat par-dessus.'],
    'Laisse le chou griller sans trop remuer, puis un filet de vinaigre à la fin.'),
  R('burritos-poulet-riz-haricots', 'Burritos poulet, riz et haricots', 'main', 25,
    [['wheat-tortilla', 2, 'piece', 'tortillas'], ['chicken-breast', 110, 'g'], ['rice', 50, 'g', 'riz cru'], ['kidney-beans', 80, 'g', 'haricots rouges égouttés'], ['corn', 40, 'g'], ['plain-yogurt', 50, 'g'], ['cumin', 1, 'tsp']],
    ['Cuis le riz.', 'Dore le poulet en dés avec le cumin, ajoute haricots et maïs.', 'Garnis les tortillas, ajoute le yaourt et roule.'],
    'Dore le burrito fermé une minute par face à la poêle : il devient croustillant et se tient.'),
  R('poisson-pane-riz-brocoli', 'Poisson pané maison, riz et brocoli', 'main', 25,
    [['white-fish', 150, 'g'], ['flour', 15, 'g'], ['egg', 1, 'piece'], ['oats', 20, 'g'], ['rice', 80, 'g', 'riz cru'], ['frozen-broccoli', 150, 'g'], ['oil', 10, 'g'], ['lemon-juice', 1, 'tsp']],
    ['Mixe les flocons en chapelure.', 'Passe le poisson dans la farine, l’œuf battu puis les flocons.', 'Dore 3 minutes par face ; sers avec riz, brocoli et citron.'],
    'Les flocons d’avoine mixés font une chapelure très croustillante et nourrissante.'),
];

const MEAT = new Set(['chicken-breast', 'chicken-leg', 'cooked-chicken', 'beef-mince-5', 'beef-patty-5', 'tuna', 'turkey', 'white-fish', 'sardines']);

// ---------- écriture ----------
const ing = read('ingredients.json');
const prices = read('prices.json');
for (const [id, name, aisle, kcal, protein, carbs, fat, gpu, price, pack] of NEW_ING) {
  const o = { id, name, aisle, per100g: { kcal, protein, carbs, fat } };
  if (gpu) o.gramsPerUnit = gpu;
  ing.ingredients = [...ing.ingredients.filter((x) => x.id !== id), o];
  if (price) prices.items[id] = price;
  if (pack) prices.packs[id] = { size: pack[0], price: pack[1], label: pack[2] };
}
write('ingredients.json', ing);
// le paquet manquant du placard : chaque produit de placard a un format d'achat
prices.packs['peanut-butter'] ??= { size: 350, price: 2.5, label: '350 g' };
write('prices.json', prices);

const byId = new Map(ing.ingredients.map((x) => [x.id, x]));
const UNIT_G = { g: 1, ml: 1, tbsp: 15, tsp: 3 };
const cost = (r) => r.ingredients.reduce((a, i) => {
  if (i.unit === 'tbsp' || i.unit === 'tsp') return a + i.qty * prices.spoonCost;
  const p = prices.items[i.ingredient];
  const g = byId.get(i.ingredient).gramsPerUnit;
  if (!p) return a;
  if (i.unit === 'piece') return a + ('perUnit' in p ? i.qty * p.perUnit : (i.qty * g * p.perKg) / 1000);
  return a + ('perKg' in p ? (i.qty / 1000) * p.perKg : (i.qty / g) * p.perUnit);
}, 0);

const kcal = (r) => r.ingredients.reduce((a, i) => {
  const x = byId.get(i.ingredient);
  const g = i.unit === 'piece' ? i.qty * x.gramsPerUnit : i.qty * UNIT_G[i.unit];
  return a + (x.per100g.kcal * g) / 100;
}, 0);

const rec = read('recipes.json');
const added = RECIPES.map((r) => {
  const ingredients = r.ingredients.map(([ingredient, qty, unit, label]) => {
    if (!byId.has(ingredient)) throw new Error(`Ingrédient inconnu ${ingredient} dans ${r.id}`);
    return { ingredient, qty, unit, ...(label ? { label } : {}) };
  });
  const o = { id: r.id, name: r.name, category: r.category, minutes: r.minutes, ingredients, steps: r.steps, tasteTip: r.tasteTip, tags: [] };
  o.tags = ['noPork'];
  if (!ingredients.some((i) => MEAT.has(i.ingredient))) o.tags.push('vegetarian');
  // budget serré : au plus 2,15 € pour 1 000 kcal (le niveau des recettes budget du prototype)
  if ((cost(o) / kcal(o)) * 1000 <= 2.15) o.tags.push('budget');
  o.tags.push(...r.extra);
  return o;
});
const ids = new Set(added.map((r) => r.id));
rec.recipes = [...rec.recipes.filter((r) => !ids.has(r.id)), ...added];
write('recipes.json', rec);

for (const r of added) console.log(r.id.padEnd(42), r.category.padEnd(9), cost(r).toFixed(2), r.tags.join(','));
console.log(`${rec.recipes.length} recettes`);
