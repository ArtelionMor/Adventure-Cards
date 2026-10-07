// Ajoute (ou remplace) les six heros V2 dans characters.data.js.
// ⚠ Relancer ECRASE les six heros V2 par leur definition d'ici : toute retouche faite depuis
// dans le builder sur Croc, Mistigri, Sirocco, Reinette, Morphee ou Mirage serait perdue.
// A utiliser pour (re)generer le point de depart ; apres, on edite dans le builder.
// Les paliers de niveau sont dans scripts/lib/heros-v2-paliers.mjs (docs/GRAMMAIRE-DES-PALIERS.md).
// Idempotent : relancer reecrit les memes heros. N'utilise que des mecaniques deja codees.
import { readFileSync, writeFileSync } from 'node:fs';
import { fabrique } from './lib/heros-v2-paliers.mjs';

const F = process.argv[2] || 'game/data/characters.data.js';
const src = readFileSync(F, 'utf8');
const PRE = 'export const CHARACTER_DATA = ';
const i0 = src.indexOf(PRE), head = src.slice(0, i0 + PRE.length), body = src.slice(head.length);
const end = body.lastIndexOf('};');
const D = JSON.parse(body.slice(0, end + 1));

// ------------------------------------------------------------------ petits outils
const LVL = { src: 'ownerLevel', arg: '', plus: 0 };
const cnt = (src, arg = '', plus = 0) => ({ src, arg, plus });
const allyTiers = () => [
  { lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' },
  { lvl: 5, stats: { atk: 1, hp: 0 }, text: '+1/+0' },
  { lvl: 10, stats: { atk: 1, hp: 2 }, text: '+1/+2' }
];
// Sort : effet +1 / cout -1 / effet +2 (les trois paliers de reference du GDD : 3/6/11)
const spellTiers = (amplifiable = true) => amplifiable
  ? [{ lvl: 3, amp: 1, text: 'Effet +1' }, { lvl: 6, cost: -1, text: 'coût -1' }, { lvl: 11, amp: 2, text: 'Effet +2' }]
  : [{ lvl: 3, cost: -1, text: 'coût -1' }, { lvl: 7, cost: -1, text: 'coût -1' }, { lvl: 12, cost: -1, text: 'coût -1' }];

const ally = (o) => ({
  id: o.id, name: o.name, type: 'ally', cost: o.cost, keys: o.keys || [], text: o.text,
  play: o.play || [], tiers: o.tiers || allyTiers(), atk: o.atk ?? 0, hp: o.hp ?? 0,
  statics: o.statics || [], ...(o.aura ? { aura: o.aura } : {}),
  ...(o.death ? { death: o.death } : {}), ...(o.turnStart ? { turnStart: o.turnStart } : {}),
  ...(o.turnEnd ? { turnEnd: o.turnEnd } : {}), ...(o.gardes ? { gardes: o.gardes } : {}),
  ...Object.fromEntries(Object.entries(o).filter(([k]) => k.startsWith('on_')))
});
const spell = (o) => ({
  id: o.id, name: o.name, type: 'spell', cost: o.cost, keys: o.keys || [], text: o.text,
  play: o.play, tiers: o.tiers || spellTiers(true)
});
const tok = (name, atk, hp, keys, extra = {}) => ({ name, atk, hp, keys, statics: [], ...extra });
const bounceAlly = { op: 'renvoie_en_main', d_ou: 'plateau', choix: 'precise', carte: '', quoi: 'all', argCard: '', t: 'allyUnit', qui: 'toi', ordre: 'hasard', n: 1, fatigue: false, atk: 0, hp: 0 };
const handPump = (atk, hp) => ({ op: 'renforce_les_cartes', d_ou: 'main', qui: 'toi', quoi: 'all', argCard: '', ordre: 'hasard', n: 8, atk, hp });

// ------------------------------------------------------------------ CHIEN V2 : Croc (Loup)
const WOLF = ['type:Loup', 'type:Chien'];
const cub = tok('Louveteau', 2, 1, ['Charge', ...WOLF]);
const dog2 = {
  id: 'dog2', name: 'Croc', species: 'Chien', sprite: 'Characters/Dog German Shepherd.png',
  role: 'Meute — Aggro Turbo : charge, frappe le héros, sacrifie',
  stats: { hp: 26, mana: 7, hand: 2 },
  cards: [
    ally({ id: 'dog2_cub', name: 'Louveteau Affamé', cost: 1, atk: 2, hp: 1, keys: ['Charge', ...WOLF], text: 'Charge.' }),
    spell({ id: 'dog2_hunt', name: 'Traque', cost: 2, keys: ['type:Chien'], text: 'Un allié gagne +2/+1 et Charge.',
      play: [{ op: 'buff', t: 'allyUnit', atk: 2, hp: 1, key: 'Charge' }] }),
    ally({ id: 'dog2_beater', name: 'Rabatteur', cost: 3, atk: 2, hp: 3, keys: WOLF,
      text: 'Quand une de tes unités Chien attaque, inflige 1 dégât au héros adverse.',
      on_attack_self: [{ op: 'dmg', t: 'enemyHero', v: 1 }], gardes: { on_attack_self: 'type:Chien' },
      tiers: [{ lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' }, { lvl: 5, amp: 1, text: 'Effet +1' }, { lvl: 10, stats: { atk: 1, hp: 2 }, text: '+1/+2' }] }),
    spell({ id: 'dog2_pack', name: 'Meute Affamée', cost: 4, keys: ['type:Chien'], text: 'Invoque trois Louveteaux 2/1 avec Charge.',
      play: [{ op: 'summon', n: 3, unit: cub }],
      tiers: [{ lvl: 3, cost: -1, text: 'coût -1' }, { lvl: 6, extra: { op: 'summon', n: 1, unit: cub }, text: 'Invoque un Louveteau de plus' }, { lvl: 11, cost: -1, text: 'coût -1' }] }),
    ally({ id: 'dog2_alpha', name: 'Grand Loup', cost: 6, atk: 5, hp: 4, keys: ['Charge', ...WOLF],
      text: 'Charge. Cri de guerre : tes autres Chiens gagnent +1/+0.',
      play: [{ op: 'buff', t: 'sameTypeAllies', atk: 1, hp: 0 }] })
  ],
  switches: [
    ally({ id: 'dog2_kami', name: 'Chiot Kamikaze', cost: 1, atk: 1, hp: 1, keys: ['Charge', 'type:Chien'],
      text: "Charge. Râle d'agonie : inflige 2 dégâts au héros adverse.",
      death: [{ op: 'dmg', t: 'enemyHero', v: 2 }],
      tiers: [{ lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' }, { lvl: 5, amp: 1, text: 'Effet +1' }, { lvl: 10, stats: { atk: 1, hp: 1 }, text: '+1/+1' }] }),
    spell({ id: 'dog2_curee', name: 'Curée', cost: 3, keys: ['type:Chien'],
      text: 'Inflige au héros adverse 1 dégât par Chien que tu contrôles, +1.',
      play: [{ op: 'dmg', t: 'enemyHero', v: cnt('alliesOfType', 'Chien', 1) }] }),
    ally({ id: 'dog2_queen', name: 'Louve Alpha', cost: 4, atk: 3, hp: 3, keys: ['Charge', ...WOLF],
      text: 'Charge. Quand tu perds une unité, gagne +1/+1.',
      on_unitDies_self: [{ op: 'buff', t: 'self', atk: 1, hp: 1 }] }),
    spell({ id: 'dog2_feast', name: 'Festin', cost: 1, keys: ['type:Chien'],
      text: 'Détruit un de tes alliés. Pioche une carte. Inflige 2 dégâts au héros adverse.',
      play: [{ op: 'detruit', t: 'allyUnit' }, { op: 'draw', v: 1 }, { op: 'dmg', t: 'enemyHero', v: 2 }] }),
    spell({ id: 'dog2_moon', name: 'Lune de Sang', cost: 5, keys: ['type:Chien'], text: 'Tes Chiens gagnent +2/+0 et Charge.',
      play: [{ op: 'buff', t: 'allyType:Chien', atk: 2, hp: 0, key: 'Charge' }] })
  ]
};

// ------------------------------------------------------------------ CHAT V2 : Mistigri
const kitten = tok('Chaton', 1, 1, ['passe_murailles', 'type:Chat']);
const cat2 = {
  id: 'cat2', name: 'Mistigri', species: 'Chat', sprite: 'Characters/Cat Siamese.png',
  role: 'Maraudeur — Aggro Tempo : des Chats rapides, qui reviennent',
  stats: { hp: 25, mana: 8, hand: 2 },
  cards: [
    ally({ id: 'cat2_kit', name: 'Chaton Fureteur', cost: 1, atk: 1, hp: 1, keys: ['Charge', 'passe_murailles', 'type:Chat'],
      text: 'Charge. Passe-Murailles. Quand tu lances un sort, gagne +1/+0.',
      on_spell_self: [{ op: 'buff', t: 'self', atk: 1, hp: 0 }] }),
    ally({ id: 'cat2_stray', name: 'Matou Têtu', cost: 3, atk: 3, hp: 2, keys: ['Charge', 'type:Chat'],
      text: "Charge. Râle d'agonie : recrée un Matou Têtu dans ta main.",
      death: [{ op: 'cree', choix: 'precise', carte: 'cat2_stray', quoi: 'all', argCard: '', n: 1, lvl: LVL }] }),
    spell({ id: 'cat2_sneak', name: 'Griffes Sournoises', cost: 2, keys: ['type:Chat'], text: 'Un allié gagne +2/+0 et Passe-Murailles.',
      play: [{ op: 'buff', t: 'allyUnit', atk: 2, hp: 0, key: 'passe_murailles' }] }),
    ally({ id: 'cat2_burglar', name: 'Cambrioleur', cost: 3, atk: 2, hp: 3, keys: ['Charge', 'passe_murailles', 'type:Chat'],
      text: 'Charge. Passe-Murailles. Quand il attaque, gagne 1 mana ce tour.',
      on_attack_self: [{ op: 'mana', v: 1 }], gardes: { on_attack_self: 'moi' } }),
    ally({ id: 'cat2_lord', name: 'Grand Matou', cost: 6, atk: 5, hp: 5, keys: ['Charge', 'passe_murailles', 'type:Chat'],
      text: 'Charge. Passe-Murailles. Quand il attaque, inflige 2 dégâts au héros adverse.',
      on_attack_self: [{ op: 'dmg', t: 'enemyHero', v: 2 }], gardes: { on_attack_self: 'moi' } })
  ],
  switches: [
    ally({ id: 'cat2_ghost', name: 'Ombre Furtive', cost: 1, atk: 2, hp: 1, keys: ['elusif', 'passe_murailles', 'type:Chat'],
      text: "Élusif. Passe-Murailles. Râle d'agonie : crée une Foudre dans ta main.",
      death: [{ op: 'cree', choix: 'precise', carte: 'cat_pounce', quoi: 'all', argCard: '', n: 1, lvl: LVL }] }),
    ally({ id: 'cat2_matriarch', name: 'Matriarche', cost: 4, atk: 2, hp: 4, keys: ['type:Chat'],
      text: 'Quand tu perds une unité, invoque un Chaton 1/1 avec Passe-Murailles.',
      on_unitDies_self: [{ op: 'summon', n: 1, unit: kitten }] }),
    spell({ id: 'cat2_yowl', name: 'Concert Nocturne', cost: 3, keys: ['type:Chat'], text: 'Tes Chats gagnent +1/+1 et Passe-Murailles.',
      play: [{ op: 'buff', t: 'allyType:Chat', atk: 1, hp: 1, key: 'passe_murailles' }] }),
    ally({ id: 'cat2_pick', name: 'Pickpocket', cost: 2, atk: 2, hp: 1, keys: ['Charge', 'type:Chat'],
      text: 'Charge. Cri de guerre : pioche une carte.', play: [{ op: 'draw', v: 1 }] }),
    ally({ id: 'cat2_roof', name: 'Seigneur des Gouttières', cost: 6, atk: 4, hp: 6, keys: ['Charge', 'passe_murailles', 'type:Chat'],
      text: 'Charge. Passe-Murailles. Tes autres Chats ont +1/+0. Quand tu lances un sort, inflige 1 dégât au héros adverse.',
      aura: { scope: 'sameTypeAllies', atk: 1, hp: 0, key: '' },
      on_spell_self: [{ op: 'dmg', t: 'enemyHero', v: 1 }] })
  ]
};

// ------------------------------------------------------------------ CORBEAU V2 : Sirocco (Faucon)
const FALC = ['type:Oiseau', 'type:Faucon'];
const crow2 = {
  id: 'crow2', name: 'Sirocco', species: 'Faucon', sprite: 'Characters/Falcon.png',
  role: 'Rapace — Aggro Tempo : une main pleine, des coups qui comptent',
  stats: { hp: 24, mana: 8, hand: 2 },
  cards: [
    ally({ id: 'crow2_eaglet', name: 'Aiglon', cost: 2, atk: 2, hp: 1, keys: ['Charge', ...FALC],
      text: 'Charge. Cri de guerre : les cartes de ta main gagnent +1/+0.', play: [handPump(1, 0)] }),
    spell({ id: 'crow2_dive', name: 'Piqué', cost: 2, keys: ['type:Oiseau'],
      text: 'Un allié gagne +X/+0 et Charge, X étant le nombre de cartes dans ta main.',
      play: [{ op: 'buff', t: 'allyUnit', atk: cnt('handCards'), hp: 0, key: 'Charge' }] }),
    ally({ id: 'crow2_hawk', name: 'Faucon Chasseur', cost: 3, atk: 0, hp: 3, keys: [...FALC, 'characteristique_variable:atk:handCards:'],
      text: 'Son attaque est égale au nombre de cartes dans ta main.',
      tiers: [{ lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' }, { lvl: 5, key: 'Charge', text: 'gagne Charge' }, { lvl: 10, stats: { atk: 0, hp: 3 }, text: '+0/+3' }] }),
    spell({ id: 'crow2_gust', name: 'Courant Ascendant', cost: 3, keys: ['type:Oiseau'], text: 'Tes Oiseaux gagnent +2/+1.',
      play: [{ op: 'buff', t: 'allyType:Oiseau', atk: 2, hp: 1 }] }),
    ally({ id: 'crow2_roc', name: 'Grand Rapace', cost: 6, atk: 5, hp: 5, keys: FALC,
      text: 'Quand tu pioches une carte, inflige 1 dégât au héros adverse.',
      on_draw_self: [{ op: 'dmg', t: 'enemyHero', v: 1 }],
      tiers: [{ lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' }, { lvl: 5, amp: 1, text: 'Effet +1' }, { lvl: 10, stats: { atk: 1, hp: 2 }, text: '+1/+2' }] })
  ],
  switches: [
    ally({ id: 'crow2_sparrow', name: 'Moineau Messager', cost: 1, atk: 1, hp: 1, keys: ['elusif', 'type:Oiseau'],
      text: 'Élusif. Cri de guerre : pioche une carte.', play: [{ op: 'draw', v: 1 }] }),
    spell({ id: 'crow2_dart', name: 'Plongeon', cost: 1, keys: ['type:Oiseau'],
      text: 'Inflige X dégâts à une unité adverse, X étant le nombre de cartes dans ta main.',
      play: [{ op: 'dmg', t: 'enemyUnit', v: cnt('handCards') }] }),
    ally({ id: 'crow2_robin', name: 'Rouge-Gorge Chanceux', cost: 2, atk: 1, hp: 3, keys: FALC,
      text: 'Quand tu pioches une carte, un de tes alliés au hasard gagne +1/+0.',
      on_draw_self: [{ op: 'buff', t: 'randomAllyUnit', atk: 1, hp: 0 }] }),
    spell({ id: 'crow2_cry', name: 'Cri du Faucon', cost: 2, keys: ['type:Oiseau'], text: 'Les cartes de ta main gagnent +2/+2.',
      play: [handPump(2, 2)], tiers: spellTiers(false) }),
    ally({ id: 'crow2_storm', name: 'Faucon Foudroyant', cost: 5, atk: 4, hp: 3, keys: ['Charge', 'elusif', ...FALC],
      text: 'Charge. Élusif. Cri de guerre : inflige X dégâts au héros adverse, X étant le nombre de cartes dans ta main.',
      play: [{ op: 'dmg', t: 'enemyHero', v: cnt('handCards') }] })
  ]
};

// ------------------------------------------------------------------ GRENOUILLE V2 : Reinette
const TAD = ['type:Têtard', 'type:Grenouille'];
const tad = tok('Têtard', 1, 1, TAD, { on_renfort_self: [{ op: 'buff', t: 'self', atk: 1, hp: 1 }] });
const FR = ['type:Grenouille'];
const frog2 = {
  id: 'frog2', name: 'Reinette', species: 'Grenouille', sprite: 'Characters/Frog Venomous.png',
  role: 'Marais — Combo croissance : chaque renfort déclenche quelque chose',
  stats: { hp: 27, mana: 7, hand: 2 },
  cards: [
    spell({ id: 'frog2_spawn', name: 'Frai', cost: 2, keys: FR, text: 'Invoque deux Têtards 1/1.',
      play: [{ op: 'summon', n: 2, unit: tad }],
      tiers: [{ lvl: 3, cost: -1, text: 'coût -1' }, { lvl: 6, extra: { op: 'summon', n: 1, unit: tad }, text: 'Invoque un Têtard de plus' }, { lvl: 11, cost: -1, text: 'coût -1' }] }),
    ally({ id: 'frog2_croak', name: 'Hurleur du Marais', cost: 2, atk: 1, hp: 3, keys: FR,
      text: 'Quand cette unité reçoit du renfort, inflige 2 dégâts au héros adverse.',
      on_renfort_self: [{ op: 'dmg', t: 'enemyHero', v: 2 }],
      tiers: [{ lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' }, { lvl: 5, amp: 1, text: 'Effet +1' }, { lvl: 10, stats: { atk: 1, hp: 2 }, text: '+1/+2' }] }),
    ally({ id: 'frog2_bull', name: 'Crapaud-Buffle', cost: 4, atk: 2, hp: 5, keys: ['Taunt', ...FR],
      text: 'Provocation. Quand cette unité reçoit du renfort, gagne 3 armures et +1/+1.',
      on_renfort_self: [{ op: 'armor', v: 3 }, { op: 'buff', t: 'self', atk: 1, hp: 1 }] }),
    spell({ id: 'frog2_rain', name: 'Pluie Fertile', cost: 3, keys: FR, text: 'Tous tes alliés gagnent +1/+1.',
      play: [{ op: 'buff', t: 'allAllies', atk: 1, hp: 1 }] }),
    ally({ id: 'frog2_elder', name: 'Doyen du Marais', cost: 5, atk: 3, hp: 5, keys: FR,
      text: 'Début de ton tour : un de tes alliés au hasard gagne +1/+1.',
      turnStart: [{ op: 'buff', t: 'randomAllyUnit', atk: 1, hp: 1 }] })
  ],
  switches: [
    ally({ id: 'frog2_pond', name: 'Étang Fécond', cost: 2, atk: 0, hp: 3, keys: ['Taunt', ...FR],
      text: 'Provocation. Début de ton tour : invoque un Têtard.', turnStart: [{ op: 'summon', n: 1, unit: tad }] }),
    spell({ id: 'frog2_mud', name: 'Bain de Boue', cost: 2, keys: FR, text: 'Tes Têtards gagnent +2/+2.',
      play: [{ op: 'buff', t: 'allyType:Têtard', atk: 2, hp: 2 }] }),
    ally({ id: 'frog2_queen', name: 'Reine des Nénuphars', cost: 3, atk: 2, hp: 2, keys: FR,
      text: 'Quand cette unité reçoit du renfort, crée un Têtard dans ta main.',
      on_renfort_self: [{ op: 'cree', choix: 'precise', carte: 'frog_tad', quoi: 'all', argCard: '', n: 1, lvl: LVL }] }),
    ally({ id: 'frog2_leaper', name: 'Sauteur Électrique', cost: 3, atk: 2, hp: 2, keys: FR,
      text: 'Quand cette unité reçoit du renfort, inflige 2 dégâts à un ennemi au hasard.',
      on_renfort_self: [{ op: 'dmg', t: 'randomEnemyAny', v: 2 }],
      tiers: [{ lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' }, { lvl: 5, amp: 1, text: 'Effet +1' }, { lvl: 10, stats: { atk: 1, hp: 2 }, text: '+1/+2' }] }),
    ally({ id: 'frog2_king', name: 'Roi Crapaud', cost: 7, atk: 6, hp: 6, keys: ['Taunt', ...FR],
      text: 'Provocation. Quand cette unité reçoit du renfort, tes autres alliés gagnent +1/+1.',
      on_renfort_self: [{ op: 'buff', t: 'allAllies', atk: 1, hp: 1 }] })
  ]
};

// ------------------------------------------------------------------ CHOUETTE V2 : Morphée (Hibou)
const OWL = ['type:Oiseau', 'type:Hibou'];
const owl2 = {
  id: 'owl2', name: 'Morphée', species: 'Hibou', sprite: 'Characters/Owl Snow.png',
  role: 'Veilleur — Contrôle Pillow Fort : le temps joue pour lui',
  stats: { hp: 28, mana: 9, hand: 2 },
  cards: [
    ally({ id: 'owl2_nest', name: 'Nid Douillet', cost: 2, atk: 0, hp: 4, keys: ['Taunt', ...OWL],
      text: 'Provocation. Fin de ton tour : ton héros gagne 1 armure.', turnEnd: [{ op: 'armor', v: 1 }] }),
    spell({ id: 'owl2_sand', name: 'Sablier', cost: 3, keys: ['type:Oiseau'],
      text: 'Inflige au héros adverse autant de dégâts que de tours que tu as joués.',
      play: [{ op: 'dmg', t: 'enemyHero', v: cnt('ownTurns') }] }),
    ally({ id: 'owl2_watch', name: 'Veilleur', cost: 5, atk: 0, hp: 0, keys: ['Taunt', ...OWL, 'characteristique_variable:both:ownTurns:'],
      text: 'Provocation. Attaque et vie égales au nombre de tours que tu as joués.',
      tiers: [{ lvl: 3, cost: -1, text: 'coût -1' }, { lvl: 6, key: 'elusif', text: 'gagne Élusif' }, { lvl: 10, cost: -1, text: 'coût -1' }] }),
    ally({ id: 'owl2_lull', name: 'Hibou Berceur', cost: 4, atk: 2, hp: 6, keys: OWL,
      text: "Les cartes de l'adversaire coûtent 1 de plus.",
      statics: [{ op: 'cout_des_cartes', qui: 'adversaire', quoi: 'all', argCard: '', sens: 'plus', v: 1 }] }),
    ally({ id: 'owl2_elder', name: 'Grand Veilleur', cost: 7, atk: 4, hp: 9, keys: ['Taunt', ...OWL],
      text: 'Provocation. Début de ton tour : inflige 2 dégâts à un ennemi au hasard.',
      turnStart: [{ op: 'dmg', t: 'randomEnemyAny', v: 2 }],
      tiers: [{ lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' }, { lvl: 5, amp: 1, text: 'Effet +1' }, { lvl: 10, stats: { atk: 1, hp: 2 }, text: '+1/+2' }] })
  ],
  switches: [
    ally({ id: 'owl2_egg', name: 'Œuf de Hibou', cost: 1, atk: 0, hp: 3, keys: ['Taunt', ...OWL],
      text: 'Provocation. Début de ton tour : gagne +1/+1.', turnStart: [{ op: 'buff', t: 'self', atk: 1, hp: 1 }] }),
    spell({ id: 'owl2_dream', name: 'Songe', cost: 2, keys: ['type:Oiseau'], text: 'Pioche une carte. Gagne 3 mana au prochain tour.',
      play: [{ op: 'draw', v: 1 }, { op: 'mana_au_prochain_tour', x: 3 }], tiers: spellTiers(false) }),
    ally({ id: 'owl2_clock', name: 'Horloge Murale', cost: 3, atk: 1, hp: 5, keys: ['type:Oiseau'],
      text: 'Fin de ton tour : inflige 1 dégât au héros adverse.', turnEnd: [{ op: 'dmg', t: 'enemyHero', v: 1 }],
      tiers: [{ lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' }, { lvl: 5, amp: 1, text: 'Effet +1' }, { lvl: 10, stats: { atk: 1, hp: 2 }, text: '+1/+2' }] }),
    ally({ id: 'owl2_pillow', name: 'Oreiller Géant', cost: 5, atk: 2, hp: 8, keys: ['Taunt', 'type:Oiseau'],
      text: 'Provocation. Les dégâts subis par ton héros sont réduits de 1.',
      statics: [{ op: 'degats_du_heros', qui: 'toi', sens: 'moins', v: 1 }] }),
    spell({ id: 'owl2_midnight', name: 'Minuit', cost: 14, keys: ['cout_x_de_moins_de_plus:moins:1:ownTurns:', 'type:Oiseau'],
      text: 'Coûte 1 de moins par tour que tu as joué. Inflige 18 dégâts au héros adverse.',
      play: [{ op: 'dmg', t: 'enemyHero', v: 18 }] })
  ]
};

// ------------------------------------------------------------------ CAMELEON V2 : Mirage
const ALL = ['type_tous'];
const cam2 = {
  id: 'cameleon2', name: 'Mirage', species: 'Cameleon', sprite: 'Characters/Cameleon.png',
  role: 'Imitateur — Support : donne à chacun le type qu’il lui faut',
  stats: { hp: 25, mana: 8, hand: 2 },
  cards: [
    ally({ id: 'cam2_prism', name: 'Prisme', cost: 2, atk: 1, hp: 3, keys: ALL,
      text: 'Type : tous. Cri de guerre : un allié gagne Type : tous.',
      play: [{ op: 'buff', t: 'allyUnit', atk: 0, hp: 0, key: 'type_tous' }] }),
    spell({ id: 'cam2_mirror', name: 'Reflet', cost: 3, text: 'Une de tes unités devient une copie d’une unité adverse.',
      play: [{ op: 'copie', t: 'randomAllyUnit', d_ou: 'plateau', choix: 'precise', carte: '', quoi: 'all', argCard: '', tm: 'enemyUnit', qui: 'adversaire', ordre: 'hasard' }],
      tiers: spellTiers(false) }),
    ally({ id: 'cam2_choir', name: 'Chœur Chromatique', cost: 4, atk: 3, hp: 4, keys: ALL,
      text: 'Type : tous. Tes autres alliés qui ont un type gagnent +1/+1.',
      aura: { scope: 'sameTypeAllies', atk: 1, hp: 1, key: '' } }),
    spell({ id: 'cam2_shed', name: 'Mue', cost: 2, text: 'Renvoie un de tes alliés en main. Tes alliés en main coûtent 1 de moins.',
      play: [bounceAlly, { op: 'reduit_le_cout_de', quoi: 'ally', typeDe: 'ecrit', argType: '', typeQui: 'toi', argKey: '', argCard: '', v: 1 }],
      tiers: spellTiers(false) }),
    spell({ id: 'cam2_ball', name: 'Bal Masqué', cost: 5, text: 'Tous tes alliés gagnent +1/+1 et Type : tous.',
      play: [{ op: 'buff', t: 'allAllies', atk: 1, hp: 1, key: 'type_tous' }] })
  ],
  switches: [
    ally({ id: 'cam2_bud', name: 'Bourgeon', cost: 1, atk: 1, hp: 2, keys: ALL,
      text: 'Type : tous. Début de ton tour : gagne +1/+0.', turnStart: [{ op: 'buff', t: 'self', atk: 1, hp: 0 }] }),
    spell({ id: 'cam2_double', name: 'Doublure', cost: 3, text: 'Invoque deux Doubles 2/2 avec Type : tous.',
      play: [{ op: 'summon', n: 2, unit: tok('Double', 2, 2, ALL) }], tiers: spellTiers(false) }),
    spell({ id: 'cam2_veil', name: 'Voile Chromatique', cost: 2, text: 'Un allié gagne +0/+3 et Élusif.',
      play: [{ op: 'buff', t: 'allyUnit', atk: 0, hp: 3, key: 'elusif' }] }),
    ally({ id: 'cam2_mime', name: 'Mime', cost: 3, atk: 2, hp: 3, keys: ALL,
      text: 'Type : tous. Quand tu joues un allié, il gagne +1/+0 et Type : tous.',
      on_ally_self: [{ op: 'buff', t: 'previous', atk: 1, hp: 0, key: 'type_tous' }] }),
    ally({ id: 'cam2_chimera', name: 'Chimère', cost: 6, atk: 5, hp: 6, keys: ALL,
      text: 'Type : tous. Les unités adverses ont -1/-0.',
      aura: { scope: 'enemyUnits', atk: -1, hp: 0, key: '' } })
  ]
};

// ------------------------------------------------------------------ ecriture
const V2 = [dog2, cat2, crow2, frog2, owl2, cam2];

// Paliers de niveau : voir measure/v2-paliers.mjs et docs/GRAMMAIRE-DES-PALIERS.md.
const { TIERS, GARDES, REFONTE } = fabrique({ cub, kitten, tad, tok, cnt, LVL, ALL, OWL, WOLF });
for (const h of V2) for (const c of [...h.cards, ...h.switches]) {
  if (!TIERS[c.id]) throw new Error('pas de paliers pour ' + c.id);
  c.tiers = TIERS[c.id];
  if (GARDES[c.id]) c.gardes = { ...(c.gardes || {}), ...GARDES[c.id] };
  if (REFONTE[c.id]) Object.assign(c, REFONTE[c.id]);
}
for (const id of [...Object.keys(TIERS)]) if (!V2.some(h => [...h.cards, ...h.switches].some(c => c.id === id))) throw new Error('paliers pour une carte inconnue : ' + id);
const ids = new Set(V2.map(h => h.id));
D.characters = D.characters.filter(h => !ids.has(h.id)).concat(V2);

// garde-fou : aucun identifiant de carte en double dans tout le catalogue
const seen = new Map();
for (const c of [...D.library, ...D.characters.flatMap(h => [...h.cards, ...h.switches])]) {
  if (seen.has(c.id)) throw new Error('id en double : ' + c.id);
  seen.set(c.id, c.name);
}
for (const h of V2) if (h.cards.length !== 5 || h.switches.length !== 5) throw new Error('5+5 attendu : ' + h.id);

writeFileSync(F, head + JSON.stringify(D, null, 2) + body.slice(end + 1));
console.log('OK :', V2.map(h => `${h.name} (${h.id})`).join(', '), '— héros au total :', D.characters.length);
