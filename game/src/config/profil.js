// GAME CONFIG — LE PROFIL DU JOUEUR (spec « Refonte Overworld + Arenes », 16 octobre 2026).
//
// Un arbre de 25 niveaux, paye en XP de combat (`BALANCE.profil.xpPourNiveau`). Chaque niveau dit ce qu'il
// rapporte, lisible d'un coup d'oeil :
//   { type: 'heros', id }      — le heros devient RECRUTABLE (meme chemin que « boss battu » : on l'achete ensuite
//                                avec des Fanions, `unlockChar` dans state.js). Decision v1, a confirmer par le game
//                                designer : l'arbre donne l'eligibilite, le boss et les Fanions restent le chemin
//                                « classique ».
//   { type: 'place' }          — une place d'equipe de plus (`save.rosterSlots`).
//   { type: 'joker', n }       — n jokers de retrait (retirer une carte d'un deck, `save.profil.jokersRetrait`).
// Le nom de cette progression n'est pas tranche : l'interface dit « Profil » / « Niveau du joueur » (pas « plan »,
// qui designe le meta-jeu dans le vocabulaire du projet).
// PROVISOIRE : tout l'arbre. Un heros qui n'existe pas ou que le joueur a deja est simplement saute.

export const NIVEAU_MAX_PROFIL = 25;

export const ARBRE_PROFIL = {
  2: [{ type: 'heros', id: 'frog' }],
  3: [{ type: 'heros', id: 'owl' }],
  4: [{ type: 'joker', n: 1 }],
  5: [{ type: 'heros', id: 'cameleon' }],
  6: [{ type: 'place' }],
  7: [{ type: 'heros', id: 'dog2' }],
  8: [{ type: 'heros', id: 'cat2' }],
  9: [{ type: 'joker', n: 1 }],
  10: [{ type: 'heros', id: 'crow2' }],
  11: [{ type: 'heros', id: 'frog2' }],
  12: [{ type: 'heros', id: 'owl2' }],
  13: [{ type: 'joker', n: 1 }],
  14: [{ type: 'heros', id: 'cameleon2' }],
  15: [{ type: 'place' }],
  16: [{ type: 'heros', id: 'dog3' }],
  17: [{ type: 'heros', id: 'cat3' }],
  18: [{ type: 'joker', n: 1 }],
  19: [{ type: 'heros', id: 'crow3' }],
  20: [{ type: 'heros', id: 'frog3' }],
  21: [{ type: 'heros', id: 'owl3' }],
  22: [{ type: 'joker', n: 1 }],
  23: [{ type: 'heros', id: 'cameleon3' }],
  24: [{ type: 'joker', n: 1 }],
  25: [{ type: 'place' }, { type: 'joker', n: 2 }]
};

/** Les recompenses d'un niveau (une liste vide pour le niveau 1, le depart). */
export const recompensesDuNiveau = n => ARBRE_PROFIL[n] || [];
