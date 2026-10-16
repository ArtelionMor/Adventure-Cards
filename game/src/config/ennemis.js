// GAME CONFIG — LES ENNEMIS DES ARENES et leurs LIGNES DE PROGRESSION.
//
// Spec « Refonte Overworld + Arenes » (16 octobre 2026). Un ennemi, c'est un adversaire du Card Builder
// (`CHARACTER_DATA.npcs`, config/npcs.js) ou, en attendant qu'il y soit saisi, un adversaire PROVISOIRE ecrit
// ici (meme forme : statistiques + deck en lignes `{ card, n }` qui designent des cartes du catalogue). Aucune
// carte n'est inventee : les decks piochent dans les cartes existantes.
//
// Chaque ennemi suit un PROFIL DE PROGRESSION, au meme schema que l'onglet `progress_profile` de la feuille :
// des lignes `{ id, level, upgrade, value }`. Au niveau N, l'ennemi applique TOUTES les lignes de niveau <= N,
// cumulees. Les ameliorations d'un ennemi sont plus nombreuses et plus fortes que celles d'un heros : c'est ce
// qui garde le defi quand le joueur progresse.
//
// Ou vit la donnee : l'onglet `enemy_progress_profile` de la feuille (meme schema que `progress_profile`), UN PROFIL
// PAR ADVERSAIRE, dont l'`id` est celui de l'adversaire (`cat1`, `wolf`…) : il gagne des qu'il a des lignes pour lui.
// Sinon, les profils PROVISOIRES ci-dessous (`standard`, `boss`).
import { CHARACTER_DATA } from '../../data/characters.data.js';
import { FEUILLE } from '../../data/feuille.data.js';
import { NPC_BY_ID, npcDeck } from './npcs.js';

// ------------------------------------------------------------------ les adversaires provisoires
// PROVISOIRE : a saisir dans le Card Builder (onglet « Adversaires »), puis a retirer d'ici. Un adversaire du
// builder qui porte le meme identifiant GAGNE : il suffit de le creer la-bas pour que celui-ci ne serve plus.
export const ENNEMIS_PROVISOIRES = [
  // Controle Pillow Fort : il se blinde de Provocations et de soins, et gagne avec un chien qui grandit a chaque tour.
  { id: 'sloth1', name: 'Paresseux Batisseur', sprite: 'Characters/Sloth.png', hp: 34, mana: 7, hand: 4, ia: 'normal', level: 1,
    deck: [{ card: 'wall1', n: 3 }, { card: 'wall2', n: 2 }, { card: 'potion', n: 2 }, { card: 'card_njt2j1', n: 2 },
      { card: 'adv_paresseux_hamac', n: 2 }, { card: 'adv_paresseux_sieste', n: 2 }, { card: 'adv_paresseux_coussin', n: 2 }] },
  // Aggro Turbo : des Charges partout, il ne regarde pas ton plateau.
  { id: 'robin1', name: 'Rouge-Gorge Fou', sprite: 'Characters/Robin.png', hp: 24, mana: 6, hand: 4, ia: 'normal', level: 1,
    deck: [{ card: 'rush1', n: 3 }, { card: 'card_9g5803', n: 2 }, { card: 'bolt', n: 2 }, { card: 'crow2_dive', n: 2 },
      { card: 'adv_rougegorge_pique', n: 2 }, { card: 'adv_rougegorge_chant', n: 2 }, { card: 'adv_rougegorge_kamikaze', n: 2 }] },
  // Combo : les cartes du cameleon Mirage (prisme, miroir, choeur), qui copient et se repondent.
  { id: 'panda1', name: 'Kitsune Farceur', sprite: 'Characters/Red Panda Kitsune.png', hp: 30, mana: 7, hand: 4, ia: 'normal', level: 1,
    deck: [{ card: 'cam2_prism', n: 2 }, { card: 'cam2_mirror', n: 2 }, { card: 'cam2_choir', n: 2 }, { card: 'fox_raid', n: 2 }, { card: 'bolt', n: 1 },
      { card: 'adv_kitsune_illusion', n: 2 }, { card: 'adv_kitsune_metamorphe', n: 2 }, { card: 'adv_kitsune_queues', n: 2 }] },
  // Fatigue : un deck court et epais en PV, qui veut t'emmener a la pile de fatigue.
  { id: 'goat1', name: 'Chevre Tetue', sprite: 'Characters/Goat.png', hp: 40, mana: 7, hand: 4, ia: 'normal', level: 1,
    deck: [{ card: 'owl2_nest', n: 2 }, { card: 'owl2_lull', n: 2 }, { card: 'wall1', n: 1 }, { card: 'potion', n: 1 },
      { card: 'adv_chevre_rumination', n: 2 }, { card: 'adv_chevre_bouquetin', n: 2 }, { card: 'adv_chevre_vieille', n: 1 }, { card: 'adv_chevre_mangetout', n: 1 }] },
  // Aggro MidRange : il s'adapte — retraits (Equarrisseur, Souffle) quand tu poses, corps solides sinon.
  // Mesure (16 oct., trios niveau 1) : a 36 PV / 8 mana avec deux Pieuvres Mecaniques, la mediane etait 0 % : adouci.
  { id: 'octo2', name: 'Pieuvre Robot', sprite: 'Characters/Octopus Robot.png', hp: 30, mana: 7, hand: 4, ia: 'normal', level: 1,
    deck: [{ card: 'card_winkd1', n: 1 }, { card: 'grunt3', n: 2 }, { card: 'crow3_vulture', n: 2 }, { card: 'crow3_knacker', n: 2 }, { card: 'smash', n: 1 }, { card: 'bolt', n: 2 },
      { card: 'adv_robot_tentacule', n: 2 }, { card: 'adv_robot_recycleuse', n: 1 }, { card: 'adv_robot_usine', n: 1 }] }
];
const PROVISOIRE_PAR_ID = Object.fromEntries(ENNEMIS_PROVISOIRES.map(e => [e.id, e]));

/** La definition d'un ennemi : celle du builder d'abord, la provisoire sinon. */
export const ennemiDef = id => NPC_BY_ID[id] || PROVISOIRE_PAR_ID[id] || null;

// ------------------------------------------------------------------ les profils de progression
// Ce que vaut UN point de chaque amelioration (`value` x unite). PROVISOIRE : `card_level` = un palier de plus sur
// toutes ses cartes ; `health_up` = 1 PV (la rampe `~draft` donne deja des PV cumules) ; etc. `fatigue_cards_buff`
// n'est pas encore branche (le moteur n'a pas de pile de fatigue par adversaire a renforcer).
export const UNITES = {
  card_level: 1, health_up: 1, mana_max_up: 1, starting_armor_up: 1, starting_hand_cards: 1,
  extra_cards_in_hand: 1, fatigue_cards_buff: 1, start_mana: 1, buff_attack_ally: 1, buff_defense_ally: 1
};

// LA RAMPE ADVERSE de l'onglet `~draft` (colonnes « Opponent hp up », « Opponent lvl up », « Opponent stat up »),
// en valeurs CUMULEES par niveau : [niveau, PV en plus, paliers de cartes en plus, attaque/PV des allies en plus].
// « reduce_cost » et « spell_damages up » n'ont pas d'amelioration qui leur corresponde : ils ne sont pas repris.
// PROVISOIRE : c'est la source d'inspiration que la spec designe, pas une courbe validee.
const RAMPE_DRAFT = [
  [1, 0, 0, 0], [2, 2, 0, 0], [3, 2, 1, 0], [4, 2, 1, 1], [5, 8, 1, 1], [6, 8, 3, 1], [7, 8, 3, 1], [8, 14, 3, 1],
  [9, 14, 4, 1], [10, 14, 4, 1], [11, 20, 4, 1], [12, 20, 6, 1], [13, 20, 6, 2], [14, 26, 6, 2], [15, 26, 7, 2],
  [16, 30, 7, 2], [17, 30, 8, 2], [18, 30, 8, 2], [19, 30, 8, 3], [20, 38, 8, 3], [21, 38, 10, 3], [22, 42, 10, 3],
  [23, 42, 11, 3], [24, 42, 11, 3], [25, 48, 11, 3], [26, 48, 13, 3], [27, 48, 13, 4], [28, 55, 13, 4], [29, 55, 14, 4],
  [30, 55, 14, 4], [31, 61, 14, 4], [32, 61, 16, 4], [33, 61, 16, 5], [34, 67, 16, 5], [35, 67, 17, 5], [36, 67, 17, 5],
  [37, 73, 17, 5], [38, 73, 19, 5], [39, 77, 19, 5], [40, 77, 20, 5]
];

/**
 * Les profils PROVISOIRES. `rampe` : la rampe cumulee ci-dessus, multipliee par `pv` pour les PV (un boss en prend
 * plus). `rythmes` : une amelioration qui revient toutes les `toutesLes` niveaux a partir de `depuis` (le « 1 sur X »
 * de l'outil des courbes de l'Atelier). Les deux s'additionnent.
 */
export const PROFILS = {
  standard: {
    rampe: { pv: 1 },
    rythmes: [
      { upgrade: 'starting_armor_up', depuis: 3, toutesLes: 6, value: 2 },
      { upgrade: 'mana_max_up', depuis: 8, toutesLes: 8, value: 1 },
      { upgrade: 'starting_hand_cards', depuis: 12, toutesLes: 12, value: 1 },
      { upgrade: 'start_mana', depuis: 20, toutesLes: 20, value: 1 }
    ]
  },
  boss: {
    rampe: { pv: 2 },
    rythmes: [
      { upgrade: 'starting_armor_up', depuis: 2, toutesLes: 4, value: 3 },
      { upgrade: 'mana_max_up', depuis: 6, toutesLes: 6, value: 1 },
      { upgrade: 'starting_hand_cards', depuis: 10, toutesLes: 10, value: 1 },
      { upgrade: 'start_mana', depuis: 15, toutesLes: 15, value: 1 }
    ]
  }
};

/** Le profil provisoire de chaque ennemi (absent : `standard`), quand la feuille n'en a pas a son nom. PROVISOIRE. */
export const PROFIL_DE = { wolf: 'boss', frogboss: 'boss', owlboss: 'boss' };

/** Le profil que suit un ennemi : le sien dans la feuille s'il y en a un, le provisoire sinon. */
export const profilDe = id => ((FEUILLE.enemy_progress_profile || []).some(l => String(l.id) === id) ? id : (PROFIL_DE[id] || 'standard'));

/** Les lignes `{ id, level, upgrade, value }` d'un profil provisoire (meme forme que `progress_profile`). */
function lignesProvisoires(id) {
  const p = PROFILS[id];
  if (!p) return [];
  const out = [];
  for (let i = 1; i < RAMPE_DRAFT.length; i++) {
    const [niv, pv, lvl, stat] = RAMPE_DRAFT[i], prec = RAMPE_DRAFT[i - 1];
    if (pv > prec[1]) out.push({ id, level: niv, upgrade: 'health_up', value: Math.round((pv - prec[1]) * p.rampe.pv) });
    if (lvl > prec[2]) out.push({ id, level: niv, upgrade: 'card_level', value: lvl - prec[2] });
    if (stat > prec[3]) {
      out.push({ id, level: niv, upgrade: 'buff_attack_ally', value: stat - prec[3] });
      out.push({ id, level: niv, upgrade: 'buff_defense_ally', value: stat - prec[3] });
    }
  }
  const fin = RAMPE_DRAFT[RAMPE_DRAFT.length - 1][0];
  for (const r of p.rythmes) for (let niv = r.depuis; niv <= fin; niv += r.toutesLes) out.push({ id, level: niv, upgrade: r.upgrade, value: r.value });
  return out.sort((a, b) => a.level - b.level);
}

/** Les lignes d'un profil : l'onglet `enemy_progress_profile` de la feuille s'il en a, le provisoire sinon. */
export function lignesDuProfil(id) {
  const feuille = (FEUILLE.enemy_progress_profile || []).filter(l => String(l.id) === id)
    .map(l => ({ id, level: Number(l.level), upgrade: String(l.upgrade), value: Number(l.value) }))
    .filter(l => Number.isFinite(l.level) && Number.isFinite(l.value) && l.upgrade in UNITES);
  return feuille.length ? feuille : lignesProvisoires(id);
}

/** Les ameliorations cumulees d'un profil jusqu'au niveau `niveau` (inclus), par nom, en unites du jeu. */
export function cumulJusqua(profil, niveau) {
  const a = Object.fromEntries(Object.keys(UNITES).map(k => [k, 0]));
  for (const l of lignesDuProfil(profil)) if (l.level <= niveau) a[l.upgrade] += l.value * UNITES[l.upgrade];
  return a;
}

/**
 * LE CAMP D'UN ENNEMI AU NIVEAU `niveau` : ses statistiques et son deck, ameliorations du profil comprises.
 * C'est ce que recoit `createBattle` (combat/engine.js) — meme forme que `npcSide` (config/npcs.js), plus
 * `startArmor` et `startMana` (mana en plus a son premier tour). Rend null pour un ennemi inconnu.
 */
export function coteEnnemi(id, niveau = 1, data = CHARACTER_DATA) {
  const def = data === CHARACTER_DATA ? ennemiDef(id) : ((data.npcs || []).find(n => n.id === id) || PROVISOIRE_PAR_ID[id]);
  if (!def) return null;
  const a = cumulJusqua(profilDe(id), niveau);
  const deck = npcDeck({ ...def, level: (def.level || 1) + a.card_level }, data).map(c => (c.type === 'ally'
    ? { ...c, atk: (c.atk || 0) + a.buff_attack_ally, hp: (c.hp || 0) + a.buff_defense_ally }
    : c));
  return {
    name: def.name, sprite: def.sprite,
    hp: def.hp + a.health_up,
    mana: def.mana + a.mana_max_up,
    hand: def.hand + a.starting_hand_cards + a.extra_cards_in_hand,
    startArmor: a.starting_armor_up,
    startMana: a.start_mana,
    ia: def.ia, boss: !!def.boss,
    niveau, ameliorations: a,
    deck
  };
}
