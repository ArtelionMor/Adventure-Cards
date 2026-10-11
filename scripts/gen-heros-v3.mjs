// Ajoute (ou remplace) les six heros V3 dans characters.data.js — leur SOURCE est docs/V3-HEROS.md.
// ⚠ Relancer ECRASE les six heros V3 par leur definition d'ici : toute retouche faite depuis dans le
// builder sur Patou, Melusine, Morrigane, Dendrobate, Hulotte ou Pastiche serait perdue.
// A utiliser pour (re)generer le point de depart ; apres, on edite dans le builder.
// Les paliers de niveau sont dans scripts/lib/heros-v3-paliers.mjs (docs/GRAMMAIRE-DES-PALIERS.md).
// Idempotent : relancer reecrit les memes heros.
//
// ⚠ DES MECANIQUES PAS ENCORE CODEES. Ex-libris et Registre ne sont pas dans le moteur (docs/V3-HEROS.md,
// section 5) ; Charogne, Appat, Pistage et Toxine le sont depuis le 10 octobre 2026 (EFFECTS).
// Les cartes s'ecrivent quand meme :
//   - les EFFETS et le MOT-CLE inventes sont declares dans `customMechanics` (implemented: false) —
//     le moteur ecrit « pas encore codee » dans le journal et la carte ne fait rien de cette partie ;
//   - le reste du vocabulaire (moments, garde, statiques, compteurs, filtres) est dans le registre
//     de game/src/config/mechanics.js avec `implemented: false`, et inerte.
// Reprise, la meule (met_a_la_defausse), l'exil et les evenements de defausse/meule/fatigue, eux, EXISTENT.
//
// Le fichier docs/MECANIQUES-A-CODER.md est reecrit dans le format du Card Builder.
import { readFileSync, writeFileSync } from 'node:fs';
import { fabrique } from './lib/heros-v3-paliers.mjs';
import { eachEffect, eachUnit } from '../game/src/config/validate.js';
import { keyId, EFFECTS, KEYWORDS } from '../game/src/config/mechanics.js';

const F = process.argv[2] || 'game/data/characters.data.js';
const DOC = process.argv[3] || 'docs/MECANIQUES-A-CODER.md';
const src = readFileSync(F, 'utf8');
const crlf = src.includes('\r\n');
const lf = src.replace(/\r\n/g, '\n');
const PRE = 'export const CHARACTER_DATA = ';
const i0 = lf.indexOf(PRE), head = lf.slice(0, i0 + PRE.length), body = lf.slice(head.length);
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
const spellTiers = () => [{ lvl: 3, amp: 1, text: 'Effet +1' }, { lvl: 6, cost: -1, text: 'coût -1' }, { lvl: 11, amp: 2, text: 'Effet +2' }];

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
  play: o.play, tiers: o.tiers || spellTiers()
});
const tok = (name, atk, hp, keys, extra = {}) => ({ name, atk, hp, keys, statics: [], ...extra });

// Aides d'effets (les memes que dans le fichier de paliers : une carte et son palier s'ecrivent pareil).
const dmgEU = v => ({ op: 'dmg', t: 'enemyUnit', v });
const dmgH = v => ({ op: 'dmg', t: 'enemyHero', v });
const draw = v => ({ op: 'draw', v });
const heal = v => ({ op: 'heal', t: 'ownHero', v });
const meule = n => ({ op: 'met_a_la_defausse', d_ou: 'pioche', choix: 'precise', carte: '', quoi: 'all', argCard: '', t: 'enemyUnit', qui: 'toi', ordre: 'dessus', n });
const defausse = (qui = 'toi', quoi = 'all') => ({ op: 'met_a_la_defausse', d_ou: 'main', choix: 'precise', carte: '', quoi, argCard: '', t: 'enemyUnit', qui, ordre: 'hasard', n: 1 });
const piste = n => ({ op: 'piste', n });
const charogne = (n, t = 'self') => ({ op: 'charogne', n, t });
const appat = n => ({ op: 'appat', n });
const toxine = (t, v) => ({ op: 'toxine', t, v });

// ------------------------------------------------------------------ LES MECANIQUES PAS ENCORE CODEES
const num = (k, label, def = 1) => ({ k, type: 'number', label, def });
const cible = (k, label, allow, def) => ({ k, type: 'target', label, allow, def });
const choix = (k, label, def, choices) => ({ k, type: 'choice', label, def, choices });
const mecanique = (id, kind, label, desc, params = []) => ({ id, kind, label, desc, params, implemented: false });

const MECANIQUES = [
  mecanique('enregistre', 'effect', 'Le Registre enregistre une carte',
    'Le Registre enregistre N cartes AU HASARD de ta main, sans les jouer (elles restent en main). Un type déjà présent ne compte pas deux fois ; une carte « Type : tous » compte pour +1. Détail : docs/V3-HEROS.md, 4.6.',
    [num('n', 'Cartes enregistrées', 1)]),
  mecanique('donne_type_du_registre', 'effect', 'Reçoit un type du Registre',
    'La cible reçoit un type du Registre tiré au hasard (« un »), ou chacun de ses types (« tous »). Un type reçu compte comme un type imprimé. Détail : docs/V3-HEROS.md, 4.6.',
    [cible('t', 'Qui reçoit', ['self', 'allyUnit', 'allAllies', 'randomAllyUnit', 'previous'], 'self'),
      choix('quoi', 'Combien de types', 'un', [['un', 'Un type du Registre au hasard'], ['tous', 'Chaque type du Registre']])]),
  mecanique('relance_registre', 'effect', 'Relance des cartes du Registre',
    'Relance GRATUITEMENT des cartes du Registre, avec `autoTarget` : « par type » = pour chaque type nommé du Registre, une carte de ce type tirée au hasard (Rétrospective) ; « hasard » = N cartes du Registre au hasard. Une carte relancée n’est ni mise en défausse ni exilée (c’est une copie), mais entre au Registre. Une relance n’en relance JAMAIS une autre (règle lisible, pas un plafond). Les cartes sont lues avec le niveau de leur propriétaire. Détail : docs/V3-HEROS.md, 4.6.',
    [choix('mode', 'Quelles cartes', 'parType', [['parType', 'Une carte par type du Registre'], ['hasard', 'Des cartes du Registre au hasard']]),
      num('n', 'Combien (mode « au hasard »)', 1)]),
  mecanique('cree_du_registre', 'effect', 'Crée une carte d’un type du Registre',
    'Crée en main N cartes au hasard parmi les cartes du catalogue qui portent un type du Registre. Détail : docs/V3-HEROS.md, 2.6 (Index du Registre, niveau 16).',
    [num('n', 'Cartes créées', 1), num('lvl', 'Niveau de la carte', 1)])
];
// CODEES, donc retirees de `customMechanics` : Charogne, Appât, Pistage, Toxine, Contagion, Épidémie, et — le
// 11 octobre 2026 — Ex-libris (mot-clé du registre), avec la pile de fatigue par camp. Les deux effets de la
// pile (`renforce_la_fatigue`, `cree_de_la_fatigue`) n'ont jamais été que `renforce_les_cartes` (zone fatigue)
// et `cree` (source fatigue) : ils disparaissent du brouillon.
const RETIREES = new Set(['renforce_la_fatigue', 'cree_de_la_fatigue']);

// ------------------------------------------------------------------ PATOU (Chien) — le berger, Contrôle Soft
const CHIEN = ['type:Chien'];
const dog3 = {
  id: 'dog3', name: 'Patou', species: 'Chien', sprite: 'Characters/Dog Cocker.png',
  role: 'Berger — Contrôle Soft : taxe, punit et défausse ce que l’adversaire veut jouer',
  stats: { hp: 30, mana: 7, hand: 2 },
  cards: [
    ally({ id: 'dog3_herd', name: 'Chien de Troupeau', cost: 1, atk: 1, hp: 2, keys: CHIEN,
      text: 'Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, tu gagnes 3 PV.',
      play: [piste(1)], on_pistee_foe: [heal(3)] }),
    ally({ id: 'dog3_shepherd', name: 'Berger Vigilant', cost: 2, atk: 2, hp: 3, keys: CHIEN,
      text: 'Cri de guerre : piste une carte. Les cartes pistées coûtent 2 de plus.',
      play: [piste(1)],
      statics: [{ op: 'cout_des_cartes', qui: 'adversaire', quoi: 'pistee', argCard: '', sens: 'plus', v: 2 }] }),
    spell({ id: 'dog3_train', name: 'Dressage', cost: 2, keys: CHIEN,
      text: 'Piste une carte. Inflige X dégâts à une unité adverse, X étant le nombre de cartes pistées.',
      play: [piste(1), { op: 'dmg', t: 'enemyUnit', v: cnt('cartesPistees') }] }),
    ally({ id: 'dog3_patou', name: 'Patou', cost: 4, atk: 3, hp: 5, keys: ['Taunt', ...CHIEN],
      text: 'Provocation. Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, il perd 5 PV.',
      play: [piste(1)], on_pistee_foe: [dmgH(5)] }),
    spell({ id: 'dog3_hunt', name: 'Chasse au Loup', cost: 5, keys: CHIEN,
      text: 'Détruis une unité adverse. Piste deux cartes.',
      play: [{ op: 'detruit', t: 'enemyUnit' }, piste(2)] })
  ],
  switches: [
    ally({ id: 'dog3_pup', name: 'Chiot Pisteur', cost: 2, atk: 2, hp: 3, keys: CHIEN,
      text: 'Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, tes Chiens gagnent +1/+1.',
      play: [piste(1)], on_pistee_foe: [{ op: 'buff', t: 'allyType:Chien', atk: 1, hp: 1 }] }),
    spell({ id: 'dog3_muzzle', name: 'Muselière', cost: 3, keys: CHIEN,
      text: 'Piste une carte, puis l’adversaire défausse une carte pistée.',
      play: [piste(1), defausse('adversaire', 'pistee')] }),
    ally({ id: 'dog3_rott', name: 'Rottweiler', cost: 3, atk: 3, hp: 3, keys: CHIEN,
      text: 'Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, 3 dégâts à une unité adverse au hasard.',
      play: [piste(1)], on_pistee_foe: [{ op: 'dmg', t: 'randomEnemyUnit', v: 3 }] }),
    spell({ id: 'dog3_beat', name: 'Battue', cost: 4, keys: CHIEN,
      text: 'Piste toute la main adverse. Pioche une carte.',
      play: [piste(99), draw(1)] }),
    ally({ id: 'dog3_elder', name: 'Vieux Berger', cost: 5, atk: 4, hp: 6, keys: CHIEN,
      text: 'Cri de guerre : piste une carte. Les cartes que l’adversaire pioche sont pistées. Les cartes pistées coûtent 1 de plus.',
      play: [piste(1)],
      statics: [{ op: 'pistage_a_la_pioche', qui: 'adversaire', sens: 'plus', v: 1 },
        { op: 'cout_des_cartes', qui: 'adversaire', quoi: 'pistee', argCard: '', sens: 'plus', v: 1 }] })
  ]
};

// ------------------------------------------------------------------ MELUSINE (Chat) — la sorciere, Combo
const CHAT = ['type:Chat'];
const chat = tok('Chat', 2, 2, CHAT);
const cat3 = {
  id: 'cat3', name: 'Mélusine', species: 'Chat', sprite: 'Characters/Cat Witch.png',
  role: 'Sorcière — Combo : ses sorts se relancent depuis la défausse, sa défausse est une seconde main',
  stats: { hp: 25, mana: 8, hand: 2 },
  cards: [
    spell({ id: 'cat3_spark', name: 'Étincelle', cost: 1, keys: [...CHAT, 'reprise'],
      text: 'Reprise. Inflige 2 dégâts à une unité adverse.', play: [dmgEU(2)] }),
    ally({ id: 'cat3_kit', name: 'Chaton Apprenti', cost: 1, atk: 1, hp: 2, keys: CHAT,
      text: 'Cri de guerre : défausse une carte, puis pioche une carte.', play: [defausse(), draw(1)] }),
    ally({ id: 'cat3_cauldron', name: 'Chaudron', cost: 3, atk: 2, hp: 4, keys: CHAT,
      text: 'Les cartes de ta défausse coûtent 1 de moins.',
      statics: [{ op: 'cout_des_cartes', qui: 'toi', quoi: 'all', argCard: '', sens: 'moins', v: 1, zone: 'defausse' }] }),
    ally({ id: 'cat3_ash', name: 'Sorcière des Cendres', cost: 4, atk: 3, hp: 4, keys: CHAT,
      text: 'Cri de guerre : reprends un sort de ta défausse dans ta main.',
      play: [{ op: 'renvoie_en_main', d_ou: 'defausse', choix: 'precise', carte: '', quoi: 'spell', argCard: '', t: 'enemyUnit', qui: 'toi', ordre: 'hasard', n: 1, fatigue: false, atk: 0, hp: 0 }] }),
    spell({ id: 'cat3_philter', name: 'Grand Philtre', cost: 6, keys: CHAT,
      text: 'Inflige à l’adversaire autant de dégâts que de cartes dans ta défausse.',
      play: [{ op: 'dmg', t: 'enemyHero', v: cnt('discardCards') }] })
  ],
  switches: [
    spell({ id: 'cat3_evil', name: 'Mauvais Œil', cost: 2, keys: [...CHAT, 'reprise'],
      text: 'Reprise. Donne -2/-2 à une unité adverse.',
      play: [{ op: 'buff', t: 'enemyUnit', atk: -2, hp: -2 }] }),
    spell({ id: 'cat3_divin', name: 'Divination', cost: 2, keys: [...CHAT, 'reprise'],
      text: 'Reprise. Pioche une carte.', play: [draw(1)] }),
    ally({ id: 'cat3_familiar', name: 'Familier Affamé', cost: 2, atk: 1, hp: 3, keys: CHAT,
      text: 'Quand tu lances un sort depuis ta défausse, gagne +1/+1.',
      on_reprise_self: [{ op: 'buff', t: 'self', atk: 1, hp: 1 }] }),
    ally({ id: 'cat3_black', name: 'Chat Noir', cost: 3, atk: 3, hp: 3, keys: CHAT,
      text: 'Quand tu défausses une carte, 1 dégât au héros adverse.',
      on_defausse_self: [dmgH(1)] }),
    ally({ id: 'cat3_sabbat', name: 'Sabbat', cost: 6, atk: 4, hp: 5, keys: CHAT,
      text: 'Les sorts de ta défausse ont +1 puissance des sorts.',
      statics: [{ op: 'montant_des_effets', qui: 'toi', cible: 'tous', zone: 'defausse', sens: 'plus', v: 1 }] })
  ]
};

// ------------------------------------------------------------------ MORRIGANE (Corbeau) — la charognarde, Aggro MidRange
const CORB = ['type:Oiseau', 'type:Corbeau'];
const crow3 = {
  id: 'crow3', name: 'Morrigane', species: 'Corbeau', sprite: 'Characters/Crow Skeleton.png',
  role: 'Charognarde — Aggro MidRange : dévore la défausse adverse, tient mieux la longueur qu’un Turbo',
  stats: { hp: 24, mana: 8, hand: 2 },
  cards: [
    ally({ id: 'crow3_hungry', name: 'Corbeau Affamé', cost: 1, atk: 2, hp: 1, keys: CORB,
      text: 'Cri de guerre : Charogne 1.', play: [charogne(1)] }),
    ally({ id: 'crow3_magpie', name: 'Pie Voleuse', cost: 2, atk: 2, hp: 2, keys: CORB,
      text: 'Cri de guerre : appât 2. Quand une carte est exilée d’une défausse, gagne +1/+0.',
      play: [appat(2)], on_exil_any: [{ op: 'buff', t: 'self', atk: 1, hp: 0 }] }),
    ally({ id: 'crow3_vulture', name: 'Vautour', cost: 3, atk: 3, hp: 2, keys: ['Charge', ...CORB],
      text: 'Charge. Quand cette unité attaque, Charogne 1.',
      on_attack_self: [charogne(1)], gardes: { on_attack_self: 'moi' } }),
    ally({ id: 'crow3_knacker', name: 'Équarrisseur', cost: 4, atk: 3, hp: 3, keys: CORB,
      text: 'Quand une unité adverse meurt, Charogne 1.',
      on_unitDies_foe: [charogne(1)] }),
    ally({ id: 'crow3_lord', name: 'Seigneur des Charognes', cost: 6, atk: 4, hp: 5, keys: CORB,
      text: 'Cri de guerre : Charogne 4.', play: [charogne(4)] })
  ],
  switches: [
    spell({ id: 'crow3_charnel', name: 'Charnier', cost: 2, keys: ['type:Oiseau'],
      text: 'Appât 1, puis Charogne 2 : une unité alliée gagne +1/+1 par carte dévorée et leurs mots-clés.',
      play: [appat(1), charogne(2, 'allyUnit')] }),
    ally({ id: 'crow3_skel', name: 'Corbeau Squelette', cost: 3, atk: 2, hp: 3, keys: CORB,
      text: 'Début de ton tour : Charogne 1.', turnStart: [charogne(1)] }),
    ally({ id: 'crow3_prince', name: 'Prince des Ossements', cost: 5, atk: 4, hp: 4, keys: CORB,
      text: 'Quand une carte est exilée d’une défausse, 1 dégât au héros adverse.',
      on_exil_any: [dmgH(1)] }),
    ally({ id: 'crow3_colossus', name: 'Colosse d’Os', cost: 7, atk: 5, hp: 5, keys: CORB,
      text: 'Cri de guerre : Charogne 5.', play: [charogne(5)] }),
    ally({ id: 'crow3_lean', name: 'Rapace Maigre', cost: 1, atk: 2, hp: 1, keys: ['Charge', ...CORB],
      text: 'Charge. Cri de guerre : appât 1. Quand l’adversaire perd des PV, Charogne 1.',
      play: [appat(1)], on_heroHurt_foe: [charogne(1)] })
  ]
};

// ------------------------------------------------------------------ DENDROBATE (Grenouille) — le venin, Controle Hard
const GREN = ['type:Grenouille'];
const tetard = tok('Têtard', 1, 1, ['type:Têtard', 'type:Grenouille']);
const frog3 = {
  id: 'frog3', name: 'Dendrobate', species: 'Grenouille', sprite: 'Characters/Frog Venomous.png',
  role: 'Venin — Contrôle Hard : des Toxines, un 1 pour 1 ou un 1 pour 2, aucune unité au-delà de 5',
  stats: { hp: 28, mana: 7, hand: 2 },
  cards: [
    ally({ id: 'frog3_tree', name: 'Rainette Toxique', cost: 1, atk: 1, hp: 2, keys: GREN,
      text: 'Cri de guerre : pose 1 Toxine sur une unité adverse.', play: [toxine('enemyUnit', 1)] }),
    spell({ id: 'frog3_dart', name: 'Dard Empoisonné', cost: 2, keys: GREN,
      text: 'Pose 3 Toxines sur une unité adverse.', play: [toxine('enemyUnit', 3)] }),
    ally({ id: 'frog3_sentinel', name: 'Sentinelle des Roseaux', cost: 3, atk: 2, hp: 4, keys: ['Taunt', 'Venin', ...GREN],
      text: 'Provocation. Venin.' }),
    spell({ id: 'frog3_slow', name: 'Poison Lent', cost: 4, keys: GREN,
      text: 'Détruis une unité adverse. Pose 3 Toxines sur une unité adverse au hasard.',
      play: [{ op: 'detruit', t: 'enemyUnit' }, toxine('randomEnemyUnit', 3)] }),
    ally({ id: 'frog3_royal', name: 'Dendrobate Royale', cost: 5, atk: 3, hp: 5, keys: GREN,
      text: 'Aura : tes autres alliés ont Venin.',
      aura: { scope: 'otherAllies', atk: 0, hp: 0, key: 'Venin' } })
  ],
  switches: [
    ally({ id: 'frog3_tadpole', name: 'Têtard Toxique', cost: 1, atk: 1, hp: 1, keys: ['type:Têtard', ...GREN],
      text: 'Râle d’agonie : pose 1 Toxine sur une unité adverse au hasard.',
      death: [toxine('randomEnemyUnit', 1)] }),
    ally({ id: 'frog3_toad', name: 'Crapaud Cornu', cost: 2, atk: 2, hp: 3, keys: GREN,
      text: 'Quand une unité adverse attaque, elle reçoit 1 Toxine.',
      on_attack_foe: [toxine('previous', 1)] }),
    spell({ id: 'frog3_contagion', name: 'Contagion', cost: 2, keys: GREN,
      text: 'Chaque unité adverse qui porte une Toxine en reçoit 1 de plus.',
      play: [{ op: 'contagion', v: 1, dmg: 0 }] }),
    ally({ id: 'frog3_collector', name: 'Collectionneur de Poisons', cost: 3, atk: 2, hp: 4, keys: GREN,
      text: 'Quand une unité adverse qui porte une Toxine meurt, pioche une carte.',
      on_unitToxinee_foe: [draw(1)] }),
    spell({ id: 'frog3_epidemic', name: 'Épidémie', cost: 5, keys: GREN,
      text: 'Pose 2 Toxines sur chaque unité adverse. Puis chaque unité adverse inflige à son contrôleur autant de dégâts que de Toxines qu’elle porte.',
      play: [{ op: 'epidemie', v: 2 }] })
  ]
};

// ------------------------------------------------------------------ HULOTTE (Hibou) — la bibliothecaire, Fatigue
const HIB = ['type:Oiseau', 'type:Hibou'];
const owl3 = {
  id: 'owl3', name: 'Hulotte', species: 'Hibou', sprite: 'Characters/Owl Academic.png',
  role: 'Bibliothécaire — Fatigue : meule sa pioche pour atteindre la fatigue avant l’adversaire, et y range ses Ex-libris',
  stats: { hp: 27, mana: 9, hand: 2 },
  cards: [
    spell({ id: 'owl3_skim', name: 'Lecture en diagonale', cost: 1, keys: ['type:Oiseau'],
      text: 'Meule 3 cartes, pioche une carte.', play: [meule(3), draw(1)] }),
    ally({ id: 'owl3_archivist', name: 'Archiviste', cost: 2, atk: 2, hp: 3, keys: HIB,
      text: 'Cri de guerre : meule 2 cartes.', play: [meule(2)] }),
    spell({ id: 'owl3_annot', name: 'Annotation', cost: 2, keys: ['type:Oiseau'],
      text: 'Les cartes de ta pile de fatigue gagnent +1/+1.',
      play: [{ op: 'renforce_les_cartes', d_ou: 'fatigue', qui: 'toi', quoi: 'all', ordre: 'hasard', n: 99, atk: 1, hp: 1 }] }),
    ally({ id: 'owl3_night', name: 'Veilleuse de Nuit', cost: 3, atk: 2, hp: 4, keys: HIB,
      text: 'Quand tu pioches dans la fatigue, gagne +1/+1.',
      on_fatigue_self: [{ op: 'buff', t: 'self', atk: 1, hp: 1 }] }),
    ally({ id: 'owl3_chancellor', name: 'Chancelière', cost: 4, atk: 4, hp: 4, keys: ['Taunt', 'ex_libris', ...HIB],
      text: 'Provocation. Ex-libris.' })
  ],
  switches: [
    ally({ id: 'owl3_barn', name: 'Chouette Effraie', cost: 1, atk: 2, hp: 1, keys: ['elusif', ...HIB],
      text: 'Élusif. Cri de guerre : meule une carte.', play: [meule(1)] }),
    spell({ id: 'owl3_index', name: 'Index', cost: 3, keys: ['type:Oiseau'],
      text: 'Crée une carte au hasard de ta pile de fatigue : elle gagne +2/+2.',
      play: [{ op: 'cree', choix: 'fatigue', n: 1, atk: 2, hp: 2 }] }),
    ally({ id: 'owl3_bookmark', name: 'Marque-page', cost: 4, atk: 2, hp: 5, keys: ['Taunt', ...HIB],
      text: 'Provocation. Tu pioches une carte de plus au début de ton tour.',
      statics: [{ op: 'pioche_du_tour', qui: 'toi', sens: 'plus', v: 1 }] }),
    ally({ id: 'owl3_dean', name: 'Doyenne', cost: 5, atk: 3, hp: 6, keys: HIB,
      text: 'Quand tu pioches dans la fatigue, la carte piochée coûte 2 de moins.',
      on_fatigue_self: [{ op: 'reduit_le_cout_de', quoi: 'sujet', typeDe: 'ecrit', argType: '', typeQui: 'toi', argKey: '', argCard: '', v: 2, n: 0 }] }),
    ally({ id: 'owl3_grand', name: 'Grand Chancelier', cost: 6, atk: 5, hp: 6, keys: ['ex_libris', ...HIB],
      text: 'Ex-libris. Quand tu pioches dans la fatigue, un allié gagne +1/+1.',
      on_fatigue_self: [{ op: 'buff', t: 'randomAllyUnit', atk: 1, hp: 1 }] })
  ]
};

// ------------------------------------------------------------------ PASTICHE (Caméléon) — l'usurpateur, MidRange
const CAM = ['type:Cameleon'];
const cameleon3 = {
  id: 'cameleon3', name: 'Pastiche', species: 'Cameleon', sprite: 'Characters/Cameleon.png',
  role: 'Usurpateur — MidRange : le Registre garde les types de toutes les cartes jouées',
  stats: { hp: 25, mana: 8, hand: 2 },
  cards: [
    ally({ id: 'cam3_clerk', name: 'Greffier', cost: 2, atk: 0, hp: 0, keys: [...CAM, 'characteristique_variable:both:typesRegistre::1'],
      text: 'Gagne +1/+1 pour chaque type différent dans le Registre.' }),
    ally({ id: 'cam3_librarian', name: 'Bibliothécaire', cost: 3, atk: 3, hp: 3, keys: CAM,
      text: 'Les cartes qui partagent un type avec une carte du Registre coûtent 1 de moins.',
      statics: [{ op: 'cout_des_cartes', qui: 'toi', quoi: 'typeDuRegistre', argCard: '', sens: 'moins', v: 1 }] }),
    ally({ id: 'cam3_chronicler', name: 'Chroniqueur', cost: 3, atk: 2, hp: 4, keys: CAM,
      text: 'Quand un type entre pour la première fois dans le Registre, pioche une carte.',
      on_typeNouveau_any: [draw(1)] }),
    spell({ id: 'cam3_specimen', name: 'Spécimen', cost: 4, keys: CAM,
      text: 'Inflige X dégâts à une cible adverse (unité ou héros), X étant le nombre de types dans le Registre.',
      play: [{ op: 'dmg', t: 'enemyAny', v: cnt('typesRegistre') }] }),
    ally({ id: 'cam3_grand', name: 'Grand Registre', cost: 7, atk: 6, hp: 6, keys: CAM,
      text: 'Cri de guerre : tes autres alliés reçoivent chaque type du Registre et +2/+2.',
      play: [{ op: 'donne_type_du_registre', t: 'allAllies', quoi: 'tous' }, { op: 'buff', t: 'allAllies', atk: 2, hp: 2 }] })
  ],
  switches: [
    ally({ id: 'cam3_copyist', name: 'Copiste', cost: 1, atk: 1, hp: 2, keys: CAM,
      text: 'Cri de guerre : le Registre enregistre une carte au hasard de ta main (elle reste en main).',
      play: [{ op: 'enregistre', n: 1 }] }),
    spell({ id: 'cam3_mimic', name: 'Mimétisme', cost: 2, keys: CAM,
      text: 'Une unité alliée gagne +2/+2 et un type du Registre au hasard.',
      play: [{ op: 'buff', t: 'allyUnit', atk: 2, hp: 2 }, { op: 'donne_type_du_registre', t: 'allyUnit', quoi: 'un' }] }),
    ally({ id: 'cam3_ruthless', name: 'Archiviste Impitoyable', cost: 4, atk: 3, hp: 4, keys: CAM,
      text: 'Quand l’adversaire joue une carte qui partage un type avec le Registre, il perd 1 PV.',
      on_registre_foe: [dmgH(1)] }),
    spell({ id: 'cam3_index', name: 'Index du Registre', cost: 5, keys: CAM,
      text: 'Pioche autant de cartes que de types dans le Registre.',
      play: [{ op: 'draw', v: cnt('typesRegistre') }] }),
    spell({ id: 'cam3_retro', name: 'Rétrospective', cost: 8, keys: CAM,
      text: 'Pour chaque type du Registre, relance gratuitement une carte du Registre de ce type, au hasard.',
      play: [{ op: 'relance_registre', mode: 'parType', n: 1 }] })
  ]
};

// ------------------------------------------------------------------ ecriture
const V3 = [dog3, cat3, crow3, frog3, owl3, cameleon3];

const { TIERS, GARDES } = fabrique({ tok, cnt, LVL, chat, tetard });
for (const h of V3) for (const c of [...h.cards, ...h.switches]) {
  if (!TIERS[c.id]) throw new Error('pas de paliers pour ' + c.id);
  c.tiers = TIERS[c.id];
  if (GARDES[c.id]) c.gardes = { ...(c.gardes || {}), ...GARDES[c.id] };
}
for (const id of Object.keys(TIERS)) if (!V3.some(h => [...h.cards, ...h.switches].some(c => c.id === id))) throw new Error('paliers pour une carte inconnue : ' + id);

const ids = new Set(V3.map(h => h.id));
D.characters = D.characters.filter(h => !ids.has(h.id)).concat(V3);

// Les mecaniques inventees : on remplace celles du meme identifiant, on garde les autres.
// Une mecanique CODEE (elle est dans EFFECTS / KEYWORDS) n'a plus rien a faire ici : on la retire.
const idsMeca = new Set(MECANIQUES.map(m => m.id));
const dejaCodee = m => !!((m.kind === 'keyword' ? KEYWORDS : EFFECTS)[m.id]);
D.customMechanics = [...(D.customMechanics || []).filter(m => !idsMeca.has(m.id) && !RETIREES.has(m.id)), ...MECANIQUES].filter(m => !dejaCodee(m));

// garde-fous : aucun identifiant de carte en double dans tout le catalogue, 5 + 5 cartes par heros
const seen = new Map();
for (const c of [...D.library, ...D.characters.flatMap(h => [...h.cards, ...h.switches])]) {
  if (seen.has(c.id)) throw new Error('id en double : ' + c.id);
  seen.set(c.id, c.name);
}
for (const h of V3) if (h.cards.length !== 5 || h.switches.length !== 5) throw new Error('5+5 attendu : ' + h.id);

const ecrit = head + JSON.stringify(D, null, 2) + body.slice(end + 1);
writeFileSync(F, crlf ? ecrit.replace(/\n/g, '\r\n') : ecrit);

// ------------------------------------------------------------------ docs/MECANIQUES-A-CODER.md (format du builder)
function mechanicsDoc() {
  const pending = (D.customMechanics || []).filter(m => !m.implemented);
  const users = {};
  for (const c of D.characters) {
    for (const side of ['cards', 'switches']) {
      (c[side] || []).forEach((card, i) => {
        if (!card) return;
        const where = `${c.name} · « ${card.name} » (${side === 'cards' ? 'base' : 'switch'}, slot ${i + 1})`;
        eachEffect(card, e => (users[e.op] = users[e.op] || []).push(where));
        eachUnit(card, u => {
          const ou = u === card ? where : where + ' — jeton ' + u.name;
          for (const k of u.keys || []) (users[keyId(k)] = users[keyId(k)] || []).push(ou);
        });
        for (const t of card.tiers || []) {
          if (t.key) (users[t.key] = users[t.key] || []).push(where + ' — palier ' + t.lvl);
          if (t.extra && t.extra.op) (users[t.extra.op] = users[t.extra.op] || []).push(where + ' — palier ' + t.lvl);
        }
      });
    }
  }
  let md = '# Mécaniques à coder\n\n';
  md += '> Fichier généré le ' + new Date().toLocaleString('fr-FR') + ' par `scripts/gen-heros-v3.mjs`, au format du Card Builder.\n';
  md += '> Réécrit entièrement à chaque « Appliquer au jeu » — ne pas l\'éditer à la main.\n\n';
  if (!pending.length) {
    md += 'Rien à coder : toutes les mécaniques utilisées par les cartes existent déjà dans le moteur.\n';
    return md;
  }
  md += pending.length + ' mécanique(s) inventée(s) dans le builder attendent d\'être implémentées.\n';
  md += 'Tant qu\'elles ne le sont pas, le jeu les affiche mais écrit « pas encore codée » dans le journal de combat.\n\n';
  md += '> **Les six héros V3** (`docs/V3-HEROS.md`) portent toutes les mécaniques ci-dessous (Charogne, Appât, Pistage et Toxine, eux, sont codés). Le reste de leur vocabulaire — ';
  md += 'moments `typeNouveau` et `registre`, compteur `typesRegistre`, filtre `typeDuRegistre` — ';
  md += 'est déjà déclaré dans `game/src/config/mechanics.js` avec `implemented: false` : ';
  md += 'il est inerte, et la validation dit « pas encore codé » sur chaque carte qui s\'en sert.\n\n';
  for (const m of pending) {
    md += '---\n\n## `' + m.id + '` — ' + m.label + '\n\n';
    md += '**Type** : ' + (m.kind === 'keyword' ? 'mot-clé porté par une unité (`keys`)' : 'effet jouable (`play`)') + '\n\n';
    md += '**Ce qu\'elle doit faire**\n\n' + (m.desc || '_(pas de description — à préciser)_') + '\n\n';
    if ((m.params || []).length) {
      md += '**Paramètres**\n\n';
      for (const p of m.params) md += '- `' + p.k + '` (' + p.type + ') — ' + (p.label || '') + (p.def !== undefined ? ' · défaut `' + p.def + '`' : '') + '\n';
      md += '\n';
    }
    const use = [...new Set(users[m.id] || [])];
    md += '**Utilisée par** : ' + (use.length ? '\n\n' + use.map(u => '- ' + u).join('\n') + '\n' : 'aucune carte pour l\'instant.\n');
    md += '\n**Où la coder**\n\n';
    if (m.kind === 'keyword') {
      md += '1. `game/src/config/mechanics.js` → ajouter `' + m.id + '` dans `KEYWORDS` avec `implemented: true`.\n';
      md += '2. `game/src/combat/engine.js` → gérer le comportement (voir `Taunt` dans `attackableTargets`, `Venin` dans `damageUnit`, `Charge` dans `makeUnit`).\n';
    } else {
      md += '1. `game/src/config/mechanics.js` → ajouter `' + m.id + '` dans `EFFECTS` avec ses params et `implemented: true`.\n';
      md += '2. `game/src/combat/engine.js` → ajouter `case \'' + m.id + '\':` dans `applyEffects`.\n';
      md += '3. `game/src/combat/ai.js` → si l\'effet doit peser dans les décisions du bot, l\'ajouter aux heuristiques.\n';
    }
    md += (m.kind === 'keyword' ? '3' : '4') + ". Retirer l'entrée de `customMechanics` dans `game/data/characters.data.js` (ou passer `implemented: true`).\n\n";
  }
  return md;
}
const docSrc = mechanicsDoc();
let docOld = '';
try { docOld = readFileSync(DOC, 'utf8'); } catch { /* premier jet */ }
writeFileSync(DOC, docOld.includes('\r\n') ? docSrc.replace(/\n/g, '\r\n') : docSrc);

console.log('OK :', V3.map(h => `${h.name} (${h.id})`).join(', '), '— héros au total :', D.characters.length,
  '— mécaniques à coder :', D.customMechanics.filter(m => !m.implemented).length);
