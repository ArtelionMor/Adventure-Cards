// GAME CONFIG — overworld et rencontres.
// Les adversaires eux-memes (statistiques, deck, niveau de jeu) sont dans les donnees
// du Card Builder (config/npcs.js) ou, en attendant, dans config/ennemis.js ; ce fichier
// ne fait que les placer.
// REFONTE DU 16 OCTOBRE 2026 (spec « Overworld + Arenes ») : plus de chaine lineaire ni de
// niveau requis. La carte est COMPACTE (de l'apparition a n'importe quelle arene : moins de
// ~15 s de marche a 4,6 cases/s), organisee en etoile autour d'une place centrale ; les
// combats sont des ARENES (un batiment, config/arenes.js), toutes ouvertes des le depart.

import { FEUILLE } from '../../data/feuille.data.js';
import { appliqueRencontres } from './feuille.js';
import { coteEnnemi, ennemiDef } from './ennemis.js';

export const TILE = {
  GRASS: 0, SAND: 1, WATER: 2, TREE: 3, ROCK: 4, PATH: 5, DARK: 6, SNOW: 7, BUSH: 8
};
export const BLOCKED = new Set([TILE.WATER, TILE.TREE, TILE.ROCK]);

export const TILE_COLOR = {
  [TILE.GRASS]: '#3f6b3a',
  [TILE.SAND]: '#9c8455',
  [TILE.WATER]: '#2c4d76',
  [TILE.TREE]: '#2b4a2a',
  [TILE.ROCK]: '#57505e',
  [TILE.PATH]: '#7a6647',
  [TILE.DARK]: '#2f4433',
  [TILE.SNOW]: '#a8b6c4',
  [TILE.BUSH]: '#375c33'
};

export const WORLD = {
  // La VERSION de la carte : une sauvegarde faite sur une autre carte replace le joueur a l'apparition
  // (state.js) — ses coordonnees ne voudraient plus rien dire. 1 = l'ancienne chaine de 110 x 74.
  version: 2,
  cols: 60,
  rows: 56,
  tile: 46,
  vitesse: 4.6,            // cases par seconde
  spawn: { x: 30, y: 31 },
  // La place centrale : chaque point d'interet y est relie par un chemin (l'etoile), et les arenes d'un
  // meme anneau se relient entre voisines (l'anneau).
  hub: { x: 30, y: 28 },

  // ECHELLE DES OBJETS DU MONDE (decision du game designer, 8 octobre 2026) : la TAILLE D'UN
  // PERSONNAGE VAUT 1, et un batiment en vaut 7 — c'est la porte du batiment qui en donne la
  // mesure, elle fait a peu pres la hauteur d'un personnage. La hauteur dont on parle est la
  // hauteur VISIBLE du dessin (les marges transparentes de l'image ne comptent pas) : le jeu
  // la mesure sur chaque sprite, ce n'est donc pas la taille du fichier image qui decide.
  // `unite` = cette hauteur de reference, en cases : le chien, dessine a 1,35 case, mesure
  // 56 % de son image, soit 0,76 case. `tailles` donne, par type de point d'interet, sa
  // hauteur en unites ; un point peut aussi porter `taille` pour faire exception. Un type qui
  // n'y figure pas garde le dessin d'avant (un carre de 1,25 case).
  unite: 0.76,
  tailles: { shop: 7, arena: 7 },

  // Biomes : rectangles peints dans l'ordre, le dernier gagne. Hors d'eux : l'eau (le bord du monde).
  regions: [
    { name: 'Prairie', x: 2, y: 2, w: 56, h: 52, ground: TILE.GRASS, density: 0.05 },
    { name: 'Bois', x: 2, y: 2, w: 26, h: 24, ground: TILE.DARK, density: 0.14 },
    { name: 'Cimes', x: 34, y: 2, w: 24, h: 26, ground: TILE.SNOW, density: 0.10 },
    { name: 'Marais', x: 32, y: 32, w: 26, h: 22, ground: TILE.SAND, density: 0.08, water: 0.12 },
    { name: 'Clairiere', x: 19, y: 19, w: 22, h: 20, ground: TILE.GRASS, density: 0.02 }
  ],

  // Les points d'interet. Une ARENE porte `arene` (config/arenes.js) et `enemy` (le meme identifiant : les
  // recompenses, les outils et la feuille le lisent) ; `anneau` 1 = pres de la place, 2 = plus loin. Les
  // identifiants des anciens combats (f1, b1...) sont gardes : la sauvegarde s'en sert (`world.cleared`).
  nodes: [
    { id: 'tuto', type: 'npc', x: 26, y: 31, name: 'Vieux Chêne',
      sprite: 'Graphical Assets/Old UI/Tree.png',
      dialog: "Toutes les arènes sont ouvertes. Approche-toi d'un bâtiment pour voir qui t'y attend." },
    { id: 's1', type: 'shop', x: 34, y: 28, name: 'Marchand Ambulant', sprite: 'Graphical Assets/Buildings/Coffee shop.png' },

    // Premier anneau : les arenes d'apprentissage.
    { id: 'f1', type: 'arena', anneau: 1, x: 30, y: 17, arene: 'rabbit1', enemy: 'rabbit1' },
    { id: 'f2', type: 'arena', anneau: 1, x: 40, y: 23, arene: 'cat1', enemy: 'cat1' },
    { id: 'f3', type: 'arena', anneau: 1, x: 40, y: 34, arene: 'crow1', enemy: 'crow1' },
    { id: 'a2', type: 'arena', anneau: 1, x: 30, y: 39, arene: 'robin1', enemy: 'robin1' },
    { id: 'a1', type: 'arena', anneau: 1, x: 20, y: 34, arene: 'sloth1', enemy: 'sloth1' },
    { id: 'f4', type: 'arena', anneau: 1, x: 20, y: 23, arene: 'frog1', enemy: 'frog1' },

    // Second anneau : les boss et les arenes plus dures.
    { id: 'b1', type: 'arena', anneau: 2, x: 38, y: 9, arene: 'wolf', enemy: 'wolf', unlocks: 'cameleon' },
    { id: 'f5', type: 'arena', anneau: 2, x: 49, y: 20, arene: 'octo1', enemy: 'octo1' },
    { id: 'a3', type: 'arena', anneau: 2, x: 49, y: 36, arene: 'panda1', enemy: 'panda1' },
    { id: 'b2', type: 'arena', anneau: 2, x: 38, y: 47, arene: 'frogboss', enemy: 'frogboss', unlocks: 'frog' },
    { id: 'a4', type: 'arena', anneau: 2, x: 22, y: 47, arene: 'goat1', enemy: 'goat1' },
    { id: 'f6', type: 'arena', anneau: 2, x: 11, y: 36, arene: 'fox1', enemy: 'fox1' },
    { id: 'a5', type: 'arena', anneau: 2, x: 11, y: 20, arene: 'octo2', enemy: 'octo2' },
    { id: 'b3', type: 'arena', anneau: 2, x: 22, y: 9, arene: 'owlboss', enemy: 'owlboss', unlocks: 'owl' },

    { id: 'c1', type: 'chest', x: 46, y: 28, name: 'Vieux Coffre', loot: { A: 6, C: 30 } },
    { id: 'c2', type: 'chest', x: 14, y: 28, name: 'Coffre Englouti', loot: { A: 10, C: 60 } },
    { id: 'c3', type: 'chest', x: 30, y: 4, name: 'Cache du Sommet', loot: { A: 16, C: 120 } },
    { id: 't1', type: 'teleport', x: 30, y: 52, name: 'Pierre de Passage' },

    // CUEILLETTE (spec du 16 octobre 2026) : les legumes se trouvent dans la nature. Chaque point fait
    // connaitre des cultures a la Ferme (`save.farm.discovered`). PROVISOIRE : quelles cultures, et ou.
    { id: 'fo1', type: 'forage', x: 22, y: 14, name: 'Carottes sauvages', crops: ['carrot3', 'carrot4'] },
    { id: 'fo2', type: 'forage', x: 38, y: 14, name: 'Nénuphars du ruisseau', crops: ['nenuphar3', 'nenuphar4'] },
    { id: 'fo3', type: 'forage', x: 6, y: 50, name: 'Nid abandonné', crops: ['nest3', 'nest4'] },
    { id: 'fo4', type: 'forage', x: 54, y: 8, name: 'Coussins perdus', crops: ['pillow3', 'pillow4'] },
    { id: 'fo5', type: 'forage', x: 6, y: 8, name: 'Graines rares', crops: ['carrot5', 'carrot6', 'nenuphar5', 'nenuphar6'] },
    { id: 'fo6', type: 'forage', x: 54, y: 50, name: 'Trésor du marais', crops: ['nest5', 'nest6', 'pillow5', 'pillow6'] }
  ]
};

// Le nom d'une arene sur la carte est celui de son adversaire (builder, ou config/ennemis.js).
for (const n of WORLD.nodes) if (n.type === 'arena' && !n.name) n.name = (ennemiDef(n.enemy) || {}).name || n.enemy;

// La Google Sheet (onglet « encounters », colonne `power_needed`) donne a un combat une PUISSANCE CONSEILLEE
// (`reqPower`) : config/feuille.js. Depuis la refonte, elle ne verrouille plus rien — la fiche d'arene l'affiche.
appliqueRencontres(WORLD.nodes, FEUILLE.encounters);

// ---------------------------------------------------------------------------
// RENCONTRES. Le MONDE dit ou elles sont et ce qu'elles rapportent ; le DECK et les
// statistiques de l'adversaire, eux, sont editables dans le Card Builder (onglet
// « Adversaires ») — voir config/npcs.js et config/ennemis.js.
// Une rencontre porte donc juste ses recompenses ; tout le reste vient de l'ennemi de
// meme identifiant, AU NIVEAU 1 (le niveau d'une arene monte avec ses victoires :
// `coteEnnemi(id, niveau)`). Un ennemi absent laisse une rencontre vide plutot que de
// casser le monde : le controle des decks le signale.
const RECOMPENSES = {
  rabbit1: { A: 3, B: 6, xp: 14 },
  cat1: { A: 4, B: 8, xp: 16 },
  crow1: { A: 5, B: 10, xp: 18 },
  wolf: { A: 15, B: 25, xp: 60 },
  frog1: { A: 7, B: 14, xp: 24 },
  octo1: { A: 9, B: 16, xp: 28 },
  frogboss: { A: 25, B: 40, xp: 90 },
  fox1: { A: 12, B: 20, xp: 34 },
  owlboss: { A: 35, B: 55, xp: 130 },
  // Les cinq ennemis ajoutes le 16 octobre. PROVISOIRE.
  sloth1: { A: 6, B: 12, xp: 22 },
  robin1: { A: 5, B: 10, xp: 20 },
  panda1: { A: 8, B: 15, xp: 26 },
  goat1: { A: 8, B: 15, xp: 26 },
  octo2: { A: 10, B: 18, xp: 30 }
};

export const ENCOUNTERS = Object.fromEntries(Object.entries(RECOMPENSES).map(([id, rewards]) => {
  const side = coteEnnemi(id, 1) || { name: id, sprite: '', hp: 20, mana: 5, hand: 3, deck: [] };
  return [id, { ...side, rewards }];
}));

// --------------------------------------------------------------------------
// Generation du terrain. Deterministe (seed fixe) : le monde est le meme pour
// tout le monde, on peut donc y placer des points d'interet a la main.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildMap(seed = 20260830) {
  const { cols, rows, regions, nodes } = WORLD;
  const rnd = rng(seed);
  const g = new Uint8Array(cols * rows).fill(TILE.WATER);
  const at = (x, y) => y * cols + x;

  for (const r of regions) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        // Bords adoucis pour eviter les rectangles nets.
        const edge = Math.min(x - r.x, r.x + r.w - 1 - x, y - r.y, r.y + r.h - 1 - y);
        if (edge < 2 && rnd() < 0.45) continue;
        g[at(x, y)] = r.ground;
        if (r.water && rnd() < r.water) g[at(x, y)] = TILE.WATER;
        else if (rnd() < r.density) g[at(x, y)] = rnd() < 0.75 ? TILE.TREE : TILE.ROCK;
      }
    }
  }

  // Corridors en L, de 2 tuiles de large.
  const carve = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (Math.abs(dx) + Math.abs(dy) === 2 && rnd() < 0.5) continue;
      g[at(nx, ny)] = TILE.PATH;
    }
  };
  const link = (a, b) => {
    let x = a.x, y = a.y;
    while (x !== b.x) { carve(x, y); x += Math.sign(b.x - x); }
    while (y !== b.y) { carve(x, y); y += Math.sign(b.y - y); }
    carve(b.x, b.y);
  };
  // L'ETOILE : la place centrale reliee a l'apparition et a chaque point d'interet...
  const hub = WORLD.hub || WORLD.spawn;
  link(WORLD.spawn, hub);
  for (const n of nodes) link(hub, n);
  // ...et L'ANNEAU : les arenes d'un meme anneau reliees a leurs voisines, dans l'ordre du tour.
  const angle = n => Math.atan2(n.y - hub.y, n.x - hub.x);
  for (const a of [...new Set(nodes.map(n => n.anneau).filter(Boolean))]) {
    const tour = nodes.filter(n => n.anneau === a).sort((p, q) => angle(p) - angle(q));
    for (let i = 0; i < tour.length; i++) link(tour[i], tour[(i + 1) % tour.length]);
  }
  // La place elle-meme : degagee, pour qu'on y arrive sans buter dans un arbre.
  for (let dy = -4; dy <= 4; dy++) for (let dx = -5; dx <= 5; dx++) {
    const nx = hub.x + dx, ny = hub.y + dy + 1;
    if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && BLOCKED.has(g[at(nx, ny)])) g[at(nx, ny)] = TILE.GRASS;
  }

  // Une clairiere autour de chaque point d'interet pour qu'il reste accessible.
  for (const n of nodes) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = n.x + dx, ny = n.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (BLOCKED.has(g[at(nx, ny)])) g[at(nx, ny)] = TILE.PATH;
    }
  }
  return g;
}
