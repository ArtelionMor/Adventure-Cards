// GAME CONFIG — overworld et rencontres.
// Les adversaires eux-memes (statistiques, deck, niveau de jeu) sont dans les donnees
// du Card Builder : config/npcs.js les resout, ce fichier ne fait que les placer.
// Le monde entier existe des le prototype (GDD) ; ce sont les NIVEAUX REQUIS sur les
// passages qui rythment la progression, pas un decoupage en chapitres.

import { NPC_BY_ID, npcSide } from './npcs.js';

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
  cols: 110,
  rows: 74,
  tile: 46,
  spawn: { x: 9, y: 37 },

  // Biomes : rectangles peints dans l'ordre, le dernier gagne.
  regions: [
    { name: 'Clairiere', x: 0, y: 24, w: 34, h: 26, ground: TILE.GRASS, density: 0.06 },
    { name: 'Bois', x: 30, y: 8, w: 32, h: 58, ground: TILE.DARK, density: 0.17 },
    { name: 'Marais', x: 58, y: 30, w: 28, h: 34, ground: TILE.SAND, density: 0.10, water: 0.16 },
    { name: 'Cimes', x: 80, y: 6, w: 30, h: 40, ground: TILE.SNOW, density: 0.12 }
  ],

  // Chaine de la campagne. L'ordre de ce tableau = l'ordre des corridors creuses.
  nodes: [
    { id: 'tuto', type: 'npc', x: 12, y: 37, name: 'Vieux Chene',
      sprite: 'UI/Tree.png',
      dialog: "Tes trois compagnons t'attendent. Un seul peut te suivre pour l'instant." },

    { id: 'f1', type: 'fight', x: 20, y: 34, name: 'Lapin Chapardeur', enemy: 'rabbit1', reqLevel: 1 },
    { id: 'c1', type: 'chest', x: 24, y: 42, name: 'Vieux Coffre', loot: { A: 6, C: 30 } },
    { id: 'f2', type: 'fight', x: 30, y: 38, name: 'Chat de Ruelle', enemy: 'cat1', reqLevel: 2 },
    { id: 's1', type: 'shop', x: 36, y: 31, name: 'Marchand Ambulant', sprite: 'Machines/Coffee shop.png' },
    { id: 'f3', type: 'fight', x: 40, y: 44, name: 'Corbeau Rieur', enemy: 'crow1', reqLevel: 3 },
    { id: 'g1', type: 'gate', x: 46, y: 40, name: 'Ronces Epaisses', reqLevel: 4 },
    { id: 'b1', type: 'boss', x: 52, y: 36, name: 'Grand Mechant Loup', enemy: 'wolf', reqLevel: 4,
      unlocks: 'fox', sprite: 'Characters/Big Bad Wolf.png' },

    { id: 't1', type: 'teleport', x: 56, y: 42, name: 'Pierre de Passage' },
    { id: 'f4', type: 'fight', x: 64, y: 46, name: 'Crapaud Baveux', enemy: 'frog1', reqLevel: 5 },
    { id: 'c2', type: 'chest', x: 70, y: 52, name: 'Coffre Englouti', loot: { A: 10, C: 60 } },
    { id: 'f5', type: 'fight', x: 72, y: 40, name: 'Pieuvre Pirate', enemy: 'octo1', reqLevel: 6 },
    { id: 'g2', type: 'gate', x: 78, y: 36, name: 'Torrent Glace', reqLevel: 8 },
    { id: 'b2', type: 'boss', x: 84, y: 32, name: 'Capitaine Grenouille', enemy: 'frogboss', reqLevel: 8,
      unlocks: 'frog', sprite: 'Characters/Frog Captain.png' },

    { id: 'f6', type: 'fight', x: 90, y: 26, name: 'Renard des Neiges', enemy: 'fox1', reqLevel: 9 },
    { id: 'c3', type: 'chest', x: 96, y: 32, name: 'Cache du Sommet', loot: { A: 16, C: 120 } },
    { id: 'b3', type: 'boss', x: 100, y: 18, name: 'Grand-Duc', enemy: 'owlboss', reqLevel: 11,
      unlocks: 'owl', sprite: 'Characters/Owl Great Horned Owl.png' }
  ]
};

// ---------------------------------------------------------------------------
// RENCONTRES. Le MONDE dit ou elles sont et ce qu'elles rapportent ; le DECK et les
// statistiques de l'adversaire, eux, sont editables dans le Card Builder (onglet
// « Adversaires ») et vivent dans les donnees — voir config/npcs.js.
// Une rencontre porte donc juste ses recompenses ; tout le reste vient du PNJ de
// meme identifiant. Un PNJ absent des donnees laisse une rencontre vide plutot que
// de casser le monde : le controle des decks le signale.
const RECOMPENSES = {
  rabbit1: { A: 3, B: 6, xp: 14 },
  cat1: { A: 4, B: 8, xp: 16 },
  crow1: { A: 5, B: 10, xp: 18 },
  wolf: { A: 15, B: 25, xp: 60 },
  frog1: { A: 7, B: 14, xp: 24 },
  octo1: { A: 9, B: 16, xp: 28 },
  frogboss: { A: 25, B: 40, xp: 90 },
  fox1: { A: 12, B: 20, xp: 34 },
  owlboss: { A: 35, B: 55, xp: 130 }
};

export const ENCOUNTERS = Object.fromEntries(Object.entries(RECOMPENSES).map(([id, rewards]) => {
  const npc = NPC_BY_ID[id] || {};
  const side = npcSide(id) || { name: id, sprite: '', hp: 20, mana: 5, hand: 3, deck: [] };
  return [id, { ...side, boss: !!npc.boss, rewards }];
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

  // Corridors : on relie les noeuds dans l'ordre, en L, et on degage 2 tuiles de large.
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
  link(WORLD.spawn, nodes[0]);
  for (let i = 0; i < nodes.length - 1; i++) link(nodes[i], nodes[i + 1]);

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
