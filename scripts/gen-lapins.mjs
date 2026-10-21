// Ajoute (ou remplace) les trois LAPINS du tutoriel dans characters.data.js — leur SOURCE est docs/TUTORIEL.md.
// Pompon (lapin1) le premier compagnon, Caramel (lapin2) le gardien, Seléné (lapin3) la portée : 5 + 5 cartes chacun,
// paliers compris (docs/GRAMMAIRE-DES-PALIERS.md : Eveil 2-6, Verbe 7-11, Pivot 12-16, quatre sommets 17-20).
// Pose aussi le DEPART d'une partie : `starters` = Pompon seul (le tutoriel ouvre les autres par les quetes), et
// l'adversaire du Potager (arene `rabbit1`) : les Souris, leurs 6 cartes et leur deck.
// ⚠ Relancer ECRASE les trois Lapins par leur definition d'ici : toute retouche faite depuis dans l'Atelier serait perdue.
// A utiliser pour (re)generer le point de depart ; apres, on edite dans le builder. Idempotent.
// ⚠ Les cartes vivent sur le Pi : verifier `git status` la-bas avant de lancer (CLAUDE.md racine).
//   node scripts/gen-lapins.mjs [game/data/characters.data.js]
import { readFileSync, writeFileSync } from 'node:fs';

const F = process.argv[2] || 'game/data/characters.data.js';
const src = readFileSync(F, 'utf8');
const crlf = src.includes('\r\n');
const lf = src.replace(/\r\n/g, '\n');
const PRE = 'export const CHARACTER_DATA = ';
const i0 = lf.indexOf(PRE), head = lf.slice(0, i0 + PRE.length), body = lf.slice(head.length);
const end = body.lastIndexOf('};');
const D = JSON.parse(body.slice(0, end + 1));

// ------------------------------------------------------------------ petits outils
const LAPIN = 'type:Lapin';
const tok = (name, atk, hp, keys) => ({ name, atk, hp, keys, statics: [] });
const lapereau = tok('Lapereau', 1, 1, [LAPIN]);
const garde = tok('Lapin de Garde', 2, 2, ['Taunt', LAPIN]);

const ally = o => ({
  id: o.id, name: o.name, type: 'ally', cost: o.cost, keys: [...(o.keys || []), LAPIN], text: o.text || '',
  play: o.play || [], tiers: [], atk: o.atk, hp: o.hp, statics: [],
  ...(o.aura ? { aura: o.aura } : {}), ...(o.death ? { death: o.death } : {}),
  ...(o.turnStart ? { turnStart: o.turnStart } : {}), ...(o.turnEnd ? { turnEnd: o.turnEnd } : {})
});
const spell = o => ({ id: o.id, name: o.name, type: 'spell', cost: o.cost, keys: [LAPIN], text: o.text, play: o.play, tiers: [] });

// Les effets
const summon = (n, unit = lapereau) => ({ op: 'summon', n, unit });
const buffSelf = (atk, hp) => ({ op: 'buff', t: 'self', atk, hp });
// « allAllies » ne compte pas le porteur de l'effet (engine.js) : sur une unite, c'est « tes autres unites ». « allyType », lui,
// le compte : « tes Lapins » comprend celle qui renforce.
const buffAll = (atk, hp) => ({ op: 'buff', t: 'allAllies', atk, hp });
const buffRand = (atk, hp) => ({ op: 'buff', t: 'randomAllyUnit', atk, hp });
const buffAlly = (atk, hp) => ({ op: 'buff', t: 'allyUnit', atk, hp });
const buffLapins = (atk, hp) => ({ op: 'buff', t: 'allyType:Lapin', atk, hp });
const buffLui = key => ({ op: 'buff', t: 'previous', atk: 0, hp: 0, key });
const heal = v => ({ op: 'heal', t: 'ownHero', v });
const dmgRU = v => ({ op: 'dmg', t: 'randomEnemyUnit', v });
const dmgRA = v => ({ op: 'dmg', t: 'randomEnemyAny', v });
const autres = (atk, hp, key = '') => ({ scope: 'otherAllies', atk, hp, key });
const autresLapins = (atk, hp) => ({ scope: 'sameTypeAllies', atk, hp, key: '' });

// Les paliers (meme ecriture que scripts/lib/heros-v3-paliers.mjs)
const st = (lvl, atk, hp) => ({ lvl, stats: { atk, hp }, text: `+${atk}/+${hp}` });
const amp = (lvl, text) => ({ lvl, amp: 1, text });
const cout = lvl => ({ lvl, cost: -1, text: 'Coût −1' });
const cle = (lvl, k, text) => ({ lvl, key: k, text });
const ex = (lvl, effect, text, slot) => ({ lvl, extra: effect, ...(slot ? { slot } : {}), text });
const aura = (lvl, a, text) => ({ lvl, aura: { key: '', atk: 0, hp: 0, ...a }, text });

// ================================================================== POMPON (lapin1) — le premier compagnon
// Des creatures sans texte : poser, attaquer, grandir ensemble. La switch apprend l'attaque contre la vie, la Charge,
// et une aura contre un cri de guerre.
const lapin1 = {
  id: 'lapin1', name: 'Pompon', species: 'Lapin', sprite: 'Graphical Assets/Characters/Rabbit/Rabbit.png',
  role: 'Le premier compagnon — Aggro simple : poser, attaquer, grandir ensemble',
  stats: { hp: 20, mana: 5, hand: 3 },
  cards: [
    ally({ id: 'lap1_lapereau', name: 'Lapereau', cost: 1, atk: 1, hp: 1 }),
    ally({ id: 'lap1_pres', name: 'Lapin des Prés', cost: 1, atk: 1, hp: 1 }),
    ally({ id: 'lap1_garenne', name: 'Lapin de Garenne', cost: 2, atk: 2, hp: 2 }),
    ally({ id: 'lap1_costaud', name: 'Lapin Costaud', cost: 3, atk: 3, hp: 3 }),
    ally({ id: 'lap1_grandpere', name: 'Grand-Père Lapin', cost: 5, atk: 5, hp: 5, text: 'Tes autres unités ont +1/+1.', aura: autres(1, 1) })
  ],
  switches: [
    ally({ id: 'lap1_hardi', name: 'Lapereau Hardi', cost: 1, atk: 2, hp: 1 }),
    ally({ id: 'lap1_coureur', name: 'Lapin Coureur', cost: 1, atk: 1, hp: 1, keys: ['Charge'], text: 'Charge.' }),
    ally({ id: 'lap1_bagarreur', name: 'Lapin Bagarreur', cost: 2, atk: 3, hp: 1 }),
    ally({ id: 'lap1_bondissant', name: 'Lapin Bondissant', cost: 3, atk: 3, hp: 2, keys: ['Charge'], text: 'Charge.' }),
    ally({ id: 'lap1_chef', name: 'Chef de Clapier', cost: 5, atk: 4, hp: 4, text: 'Cri de guerre : tes autres unités gagnent +1/+1.', play: [buffAll(1, 1)] })
  ]
};

// ================================================================== CARAMEL (lapin2) — le gardien
// La meme courbe que Pompon, mais l'endurance au lieu de l'attaque, et la Provocation (le premier mot-cle).
const lapin2 = {
  id: 'lapin2', name: 'Caramel', species: 'Lapin', sprite: 'Graphical Assets/Characters/Rabbit/Rabbit English Lop.png',
  role: 'Le gardien — tenir : l’endurance et la Provocation',
  stats: { hp: 24, mana: 5, hand: 3 },
  cards: [
    ally({ id: 'lap2_nain', name: 'Lapin Nain', cost: 1, atk: 1, hp: 2 }),
    ally({ id: 'lap2_gardien', name: 'Gardien du Clapier', cost: 1, atk: 1, hp: 2, keys: ['Taunt'], text: 'Provocation.' }),
    ally({ id: 'lap2_oreilles', name: 'Oreilles Tombantes', cost: 2, atk: 1, hp: 3, keys: ['Taunt'], text: 'Provocation.' }),
    ally({ id: 'lap2_grange', name: 'Lapin de Grange', cost: 3, atk: 2, hp: 4 }),
    ally({ id: 'lap2_doyenne', name: 'Doyenne du Clapier', cost: 5, atk: 3, hp: 7, keys: ['Taunt'], text: 'Provocation. Tes autres unités ont +0/+2.', aura: autres(0, 2) })
  ],
  switches: [
    ally({ id: 'lap2_angora', name: 'Lapin Angora', cost: 1, atk: 1, hp: 1, text: 'Cri de guerre : ton héros gagne 2 PV.', play: [heal(2)] }),
    ally({ id: 'lap2_sentinelle', name: 'Lapin Sentinelle', cost: 1, atk: 2, hp: 1, keys: ['Taunt'], text: 'Provocation.' }),
    ally({ id: 'lap2_tetu', name: 'Lapin Têtu', cost: 2, atk: 2, hp: 3 }),
    ally({ id: 'lap2_cuirasse', name: 'Lapin Cuirassé', cost: 3, atk: 2, hp: 3, keys: ['Bouclier'], text: 'Bouclier.' }),
    ally({ id: 'lap2_belier', name: 'Grand Bélier', cost: 5, atk: 4, hp: 6, keys: ['Taunt'], text: 'Provocation. Cri de guerre : tes autres unités gagnent +0/+2.', play: [buffAll(0, 2)] })
  ]
};

// ================================================================== SELENE (lapin3) — la portee
// Go Wide : les moments d'une carte (cri de guerre, rale d'agonie, debut et fin de tour) et les premiers sorts.
const lapin3 = {
  id: 'lapin3', name: 'Séléné', species: 'Lapin', sprite: 'Graphical Assets/Characters/Rabbit/Rabbit Wherewolf.png',
  role: 'La portée — Go Wide : les moments d’une carte et les sorts',
  stats: { hp: 22, mana: 5, hand: 3 },
  cards: [
    ally({ id: 'lap3_prolifique', name: 'Lapine Prolifique', cost: 1, atk: 1, hp: 1, text: 'Râle d’agonie : invoque un Lapereau 1/1.', death: [summon(1)] }),
    spell({ id: 'lap3_trefle', name: 'Festin de Trèfle', cost: 1, text: 'Un de tes alliés gagne +2/+1.', play: [buffAlly(2, 1)] }),
    spell({ id: 'lap3_portee', name: 'Portée de Lapereaux', cost: 2, text: 'Invoque deux Lapereaux 1/1.', play: [summon(2)] }),
    ally({ id: 'lap3_lune', name: 'Lapin de Pleine Lune', cost: 4, atk: 3, hp: 3, text: 'Début de ton tour : gagne +1/+1.', turnStart: [buffSelf(1, 1)] }),
    ally({ id: 'lap3_reine', name: 'Reine du Terrier', cost: 5, atk: 4, hp: 4, text: 'Fin de ton tour : invoque un Lapereau 1/1.', turnEnd: [summon(1)] })
  ],
  switches: [
    ally({ id: 'lap3_farceur', name: 'Lapereau Farceur', cost: 1, atk: 1, hp: 1, text: 'Râle d’agonie : inflige 1 dégât à un ennemi au hasard.', death: [dmgRA(1)] }),
    spell({ id: 'lap3_quatre', name: 'Trèfle à Quatre Feuilles', cost: 1, text: 'Tes unités gagnent +1/+0.', play: [buffAll(1, 0)] }),
    spell({ id: 'lap3_terrier', name: 'Terrier Secret', cost: 2, text: 'Invoque un Lapin de Garde 2/2 avec Provocation.', play: [summon(1, garde)] }),
    ally({ id: 'lap3_mars', name: 'Lièvre de Mars', cost: 4, atk: 2, hp: 2, text: 'Cri de guerre : invoque deux Lapereaux 1/1.', play: [summon(2)] }),
    ally({ id: 'lap3_eclipse', name: 'Lapin d’Éclipse', cost: 5, atk: 4, hp: 4, text: 'Râle d’agonie : invoque trois Lapereaux 1/1.', death: [summon(3)] })
  ]
};

// ------------------------------------------------------------------ les paliers
// Par heros et par pile (base, switch) : un palier par niveau de 2 a 16, un Eveil, un Verbe et un Pivot par carte,
// au plus un palier de chiffre par carte ; quatre sommets (17 a 20) sur les cartes d'arrivee.
const TIERS = {
  // ---------------------------------------------------------------- Pompon, base
  lap1_lapereau: [st(3, 1, 0), ex(9, buffRand(1, 1), 'Râle d’agonie : un de tes alliés au hasard gagne +1/+1.', 'death'), cle(14, 'Charge', 'Gagne Charge.')],
  lap1_pres: [st(5, 0, 1), ex(7, buffRand(1, 0), 'Cri de guerre : un de tes alliés au hasard gagne +1/+0.'), ex(13, buffSelf(1, 1), 'Fin de ton tour : gagne +1/+1.', 'turnEnd')],
  lap1_garenne: [cle(4, 'Charge', 'Gagne Charge.'), ex(10, summon(1), 'Râle d’agonie : invoque un Lapereau 1/1.', 'death'), aura(15, autres(0, 1), 'Aura : tes autres unités ont +0/+1.')],
  lap1_costaud: [st(2, 1, 1), ex(8, buffAll(1, 0), 'Cri de guerre : tes autres unités gagnent +1/+0.'), cle(12, 'Taunt', 'Gagne Provocation.'), ex(19, buffAll(1, 0), 'Fin de ton tour : tes autres unités gagnent +1/+0.', 'turnEnd')],
  lap1_grandpere: [cle(6, 'Taunt', 'Gagne Provocation.'), ex(11, summon(2), 'Cri de guerre : invoque deux Lapereaux 1/1.'), aura(16, autres(0, 1), 'Aura : tes autres unités ont +0/+1 de plus.'), aura(17, autres(1, 0), 'Aura : tes autres unités ont +1/+0 de plus.')],
  // ---------------------------------------------------------------- Pompon, switch
  lap1_hardi: [cle(2, 'Charge', 'Gagne Charge.'), ex(8, dmgRA(1), 'Râle d’agonie : inflige 1 dégât à un ennemi au hasard.', 'death'), ex(15, buffSelf(1, 0), 'Début de ton tour : gagne +1/+0.', 'turnStart')],
  lap1_coureur: [st(3, 1, 0), ex(7, dmgRU(1), 'Cri de guerre : inflige 1 dégât à une unité adverse au hasard.'), ex(12, summon(1), 'Râle d’agonie : invoque un Lapereau 1/1.', 'death')],
  lap1_bagarreur: [st(5, 0, 2), ex(9, buffRand(1, 0), 'Fin de ton tour : un de tes alliés au hasard gagne +1/+0.', 'turnEnd'), cle(14, 'Bouclier', 'Gagne Bouclier.')],
  lap1_bondissant: [st(6, 1, 1), ex(10, buffRand(1, 1), 'Cri de guerre : un de tes alliés au hasard gagne +1/+1.'), ex(13, summon(2), 'Râle d’agonie : invoque deux Lapereaux 1/1.', 'death'), aura(20, autres(1, 0), 'Aura : tes autres unités ont +1/+0.')],
  lap1_chef: [cle(4, 'Taunt', 'Gagne Provocation.'), ex(11, buffAll(1, 1), 'Râle d’agonie : tes unités gagnent +1/+1.', 'death'), amp(16, 'Cri de guerre : +2/+2 au lieu de +1/+1.'), aura(18, autres(1, 1), 'Aura : tes autres unités ont +1/+1.')],

  // ---------------------------------------------------------------- Caramel, base
  lap2_nain: [cle(3, 'Taunt', 'Gagne Provocation.'), ex(8, heal(2), 'Râle d’agonie : ton héros gagne 2 PV.', 'death'), ex(13, heal(1), 'Fin de ton tour : ton héros gagne 1 PV.', 'turnEnd')],
  lap2_gardien: [st(2, 0, 2), ex(9, buffSelf(0, 1), 'Début de ton tour : gagne +0/+1.', 'turnStart'), cle(14, 'Bouclier', 'Gagne Bouclier.')],
  lap2_oreilles: [st(4, 1, 0), ex(7, buffRand(0, 2), 'Cri de guerre : un de tes alliés au hasard gagne +0/+2.'), aura(12, autres(0, 1), 'Aura : tes autres unités ont +0/+1.')],
  lap2_grange: [cle(5, 'Taunt', 'Gagne Provocation.'), ex(10, heal(2), 'Fin de ton tour : ton héros gagne 2 PV.', 'turnEnd'), ex(15, summon(1, garde), 'Râle d’agonie : invoque un Lapin de Garde 2/2 avec Provocation.', 'death'), aura(19, autres(0, 2), 'Aura : tes autres unités ont +0/+2.')],
  lap2_doyenne: [st(6, 1, 0), ex(11, heal(2), 'Début de ton tour : ton héros gagne 2 PV.', 'turnStart'), aura(16, autres(1, 0), 'Aura : tes autres unités ont aussi +1/+0.'), ex(17, buffAll(0, 1), 'Fin de ton tour : tes autres unités gagnent +0/+1.', 'turnEnd')],
  // ---------------------------------------------------------------- Caramel, switch
  lap2_angora: [st(2, 0, 1), ex(7, heal(2), 'Râle d’agonie : ton héros gagne 2 PV.', 'death'), cle(14, 'Taunt', 'Gagne Provocation.')],
  lap2_sentinelle: [cle(3, 'Bouclier', 'Gagne Bouclier.'), ex(9, buffRand(0, 2), 'Râle d’agonie : un de tes alliés au hasard gagne +0/+2.', 'death'), ex(13, buffSelf(1, 0), 'Début de ton tour : gagne +1/+0.', 'turnStart')],
  lap2_tetu: [cle(4, 'Taunt', 'Gagne Provocation.'), ex(8, buffSelf(0, 1), 'Fin de ton tour : gagne +0/+1.', 'turnEnd'), aura(15, autres(0, 1), 'Aura : tes autres unités ont +0/+1.')],
  lap2_cuirasse: [st(5, 1, 1), ex(10, summon(1, garde), 'Râle d’agonie : invoque un Lapin de Garde 2/2 avec Provocation.', 'death'), cle(12, 'Taunt', 'Gagne Provocation.'), ex(20, buffAll(0, 1), 'Début de ton tour : tes autres unités gagnent +0/+1.', 'turnStart')],
  lap2_belier: [cle(6, 'Bouclier', 'Gagne Bouclier.'), ex(11, buffAll(0, 2), 'Râle d’agonie : tes unités gagnent +0/+2.', 'death'), aura(16, autres(0, 1), 'Aura : tes autres unités ont +0/+1.'), aura(18, autres(0, 0, 'Taunt'), 'Aura : tes autres unités ont Provocation.')],

  // ---------------------------------------------------------------- Selene, base
  lap3_prolifique: [st(3, 0, 1), ex(9, summon(1), 'Cri de guerre : invoque un Lapereau 1/1.'), aura(14, autresLapins(1, 0), 'Aura : tes autres Lapins ont +1/+0.')],
  lap3_trefle: [amp(2, 'Effet +1 : +3/+2.'), ex(7, summon(1), 'Invoque aussi un Lapereau 1/1.'), ex(12, buffLui('Charge'), 'L’allié renforcé gagne aussi Charge.')],
  lap3_portee: [cout(4), ex(8, summon(1, garde), 'Invoque aussi un Lapin de Garde 2/2 avec Provocation.'), ex(13, buffLapins(1, 0), 'Tes Lapins gagnent ensuite +1/+0.')],
  lap3_lune: [cle(5, 'Charge', 'Gagne Charge.'), ex(10, summon(2), 'Râle d’agonie : invoque deux Lapereaux 1/1.', 'death'), aura(15, autresLapins(0, 1), 'Aura : tes autres Lapins ont +0/+1.'), ex(19, buffLapins(1, 1), 'Début de ton tour : tes Lapins gagnent +1/+1.', 'turnStart')],
  lap3_reine: [st(6, 0, 2), ex(11, summon(1), 'Cri de guerre : invoque un Lapereau 1/1.'), ex(16, buffLapins(1, 0), 'Début de ton tour : tes Lapins gagnent +1/+0.', 'turnStart'), aura(17, autresLapins(1, 1), 'Aura : tes autres Lapins ont +1/+1.')],
  // ---------------------------------------------------------------- Selene, switch
  lap3_farceur: [st(2, 1, 0), ex(8, dmgRU(1), 'Cri de guerre : inflige 1 dégât à une unité adverse au hasard.'), ex(13, summon(1), 'Râle d’agonie : invoque aussi un Lapereau 1/1.', 'death')],
  lap3_quatre: [amp(3, 'Effet +1 : +2/+0.'), ex(9, summon(1), 'Invoque ensuite un Lapereau 1/1.'), ex(14, buffAll(0, 1), 'Tes unités gagnent aussi +0/+1.')],
  lap3_terrier: [cout(4), ex(7, summon(1), 'Invoque aussi un Lapereau 1/1.'), ex(12, buffLapins(0, 1), 'Tes Lapins gagnent ensuite +0/+1.')],
  lap3_mars: [st(5, 1, 1), ex(10, summon(1), 'Râle d’agonie : invoque un Lapereau 1/1.', 'death'), cle(15, 'Taunt', 'Gagne Provocation.'), aura(20, autresLapins(1, 0), 'Aura : tes autres Lapins ont +1/+0.')],
  lap3_eclipse: [cle(6, 'Taunt', 'Gagne Provocation.'), ex(11, buffLapins(1, 0), 'Fin de ton tour : tes Lapins gagnent +1/+0.', 'turnEnd'), ex(16, summon(1), 'Cri de guerre : invoque un Lapereau 1/1.'), ex(18, summon(1), 'Début de ton tour : invoque un Lapereau 1/1.', 'turnStart')]
};

// ================================================================== LES SOURIS DU POTAGER (l'adversaire du tutoriel)
// L'arene `rabbit1` (Carrot Farm) garde son identifiant — la feuille, le monde et les quetes le citent — mais son
// adversaire devient une bande de Souris (docs/TUTORIEL.md, decision 8). Des cartes LISIBLES : des corps sans texte,
// une Provocation, un petit sort, et le Chef de bande (une aura, comme le Grand-Pere de Pompon, vue de l'autre cote).
// Les niveaux de l'arene (1 a 4, le chef au 4) sont le profil de progression de `rabbit1` (onglet enemy_progress_profile).
// Paliers par defaut des adversaires (2/5/10, 3/6/11) : c'est ce que lit `card_level` dans le profil.
const SOURIS = 'type:Souris';
const MOUSE = 'Graphical Assets/Characters/Mouse/Mouse.png';
const advTiers = () => [st(2, 0, 1), st(5, 1, 0), st(10, 1, 2)];
// Le meme constructeur que les Lapins, mais le type Souris a la place du type Lapin.
const souris = o => ({ ...ally(o), keys: [...(o.keys || []), SOURIS], tiers: advTiers(), sprite: MOUSE });
const CARTES_SOURIS = [
  souris({ id: 'adv_souris_souriceau', name: 'Souris - Souriceau', cost: 1, atk: 1, hp: 1 }),
  souris({ id: 'adv_souris_grise', name: 'Souris - Souris grise', cost: 2, atk: 2, hp: 2 }),
  souris({ id: 'adv_souris_tetue', name: 'Souris - Têtue', cost: 2, atk: 1, hp: 3, keys: ['Taunt'], text: 'Provocation.' }),
  souris({ id: 'adv_souris_rat', name: 'Souris - Rat des greniers', cost: 3, atk: 3, hp: 2 }),
  souris({ id: 'adv_souris_chef', name: 'Souris - Chef de bande', cost: 5, atk: 4, hp: 4, text: 'Tes autres Souris ont +1/+0.', aura: { scope: 'sameTypeAllies', atk: 1, hp: 0, key: '' } }),
  { id: 'adv_souris_grignotage', name: 'Souris - Grignotage', type: 'spell', cost: 1, keys: [SOURIS], text: 'Inflige 1 dégât à une unité adverse.',
    play: [{ op: 'dmg', t: 'enemyUnit', v: 1 }], tiers: [amp(3, 'Effet +1'), cout(6), amp(11, 'Effet +1')], statics: [], sprite: MOUSE }
];
const POTAGER = {
  id: 'rabbit1', name: 'Souris chapardeuses', sprite: MOUSE, hp: 10, mana: 5, hand: 3, level: 1, ia: 'naif',
  deck: [['adv_souris_souriceau', 5], ['adv_souris_grise', 5], ['adv_souris_tetue', 2], ['adv_souris_grignotage', 3], ['adv_souris_rat', 4], ['adv_souris_chef', 1]]
    .map(([card, n]) => ({ card, n }))
};

// ------------------------------------------------------------------ ecriture
const LAPINS = [lapin1, lapin2, lapin3];
for (const h of LAPINS) for (const c of [...h.cards, ...h.switches]) {
  if (!TIERS[c.id]) throw new Error('pas de paliers pour ' + c.id);
  c.tiers = TIERS[c.id];
}
for (const id of Object.keys(TIERS)) if (!LAPINS.some(h => [...h.cards, ...h.switches].some(c => c.id === id))) throw new Error('paliers pour une carte inconnue : ' + id);

// Les Lapins se rangent en tete : ce sont les premiers heros du joueur.
const ids = new Set(LAPINS.map(h => h.id));
D.characters = [...LAPINS, ...D.characters.filter(h => !ids.has(h.id))];
// Le depart d'une partie : Pompon seul (docs/TUTORIEL.md) ; Medor, Felix et Corax viennent des quetes.
D.starters = ['lapin1'];
// Les Souris du Potager : leurs cartes (cartes libres, remplacees par identifiant) et l'adversaire `rabbit1`.
const idsSouris = new Set(CARTES_SOURIS.map(c => c.id));
D.library = D.library.filter(c => !idsSouris.has(c.id)).concat(CARTES_SOURIS);
const i1 = D.npcs.findIndex(n => n.id === POTAGER.id);
if (i1 < 0) throw new Error('adversaire inconnu : ' + POTAGER.id);
D.npcs[i1] = POTAGER;

// garde-fous : aucun identifiant de carte en double dans tout le catalogue, 5 + 5 cartes par heros
const seen = new Map();
for (const c of [...D.library, ...D.characters.flatMap(h => [...h.cards, ...h.switches])]) {
  if (seen.has(c.id)) throw new Error('id en double : ' + c.id);
  seen.set(c.id, c.name);
}
for (const h of LAPINS) if (h.cards.length !== 5 || h.switches.length !== 5) throw new Error('5+5 attendu : ' + h.id);

const ecrit = head + JSON.stringify(D, null, 2) + body.slice(end + 1);
writeFileSync(F, crlf ? ecrit.replace(/\n/g, '\r\n') : ecrit);
console.log('OK :', LAPINS.map(h => `${h.name} (${h.id})`).join(', '), '— héros au total :', D.characters.length, '— départ :', D.starters.join(', '));
