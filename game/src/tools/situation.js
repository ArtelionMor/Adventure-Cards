// MONTER UNE POSITION DE TOUTES PIECES — « je ne veux pas avoir a jouer pour arriver
// a la situation a tester ».
//
// Une partie normale part du tour 1 et se construit toute seule. Ici on decrit la
// position qu'on veut (`game/data/situations.js`) et on la fabrique : les PV, le mana,
// les mains, les plateaux, la defausse, le numero de tour. Le combat obtenu est un
// combat ORDINAIRE — le moteur, le bot et le journal ne voient aucune difference, et
// c'est la seule chose qui rende la position credible.
//
// DEUX REGLES QUI TIENNENT TOUT :
//
// 1. UNE UNITE POSEE N'EST PAS JOUEE. On passe par `depose()`, pas par `playCard` :
//    « A la pose » ne part pas. Sans ca, decrire « Appel en jeu » invoquerait un
//    Toutou en plus et le plateau obtenu ne serait pas celui qu'on a ecrit.
//
// 2. UNE CARTE CITEE EST PRISE DANS LA PIOCHE quand elle s'y trouve. Le deck reste
//    donc a son compte honnete : une position ou tu tiens trois cartes en main est une
//    position ou ton deck en a trois de moins, comme en vraie partie. Une carte
//    absente du deck (une carte libre, une carte d'un autre personnage) est fabriquee
//    depuis le catalogue — et on l'accepte, c'est le but d'un banc.
//
// ⚠ CE QU'ON NE PEUT PAS FAIRE, et il faut le savoir : le moteur tire a `Math.random`
// sans graine. On ne REJOUE donc jamais une partie a l'identique. On peut en revanche
// RESTAURER un etat (`cloneBattle`), et c'est tout ce dont un retour arriere a besoin —
// le but n'est pas de revoir la meme chose, c'est d'essayer autre chose au meme point.
import { CHARACTER_DATA } from '../../data/characters.data.js';
import { SITUATIONS, FAMILLES } from '../../data/situations.js';
import { resolveCard } from '../config/characters.js';
import { cardById } from '../config/npcs.js';
import { createBattle, depose, refresh } from '../combat/engine.js';
import { campPerso, campPnj } from './arene.js';

export { SITUATIONS, FAMILLES };

export const situationParId = id => SITUATIONS.find(s => s.id === id) || null;

/**
 * Le niveau auquel les cartes d'un cote se resolvent. ⚠ Pour un PNJ, c'est le SIEN et
 * le meme repli qu'`npcDeck` (1) : lui donner le niveau du banc resoudrait les cartes
 * qu'on pose a la main autrement que celles de son deck, et deux exemplaires de la
 * meme carte n'auraient pas les memes statistiques dans la meme partie.
 */
function niveauDe(cote, fiche, data) {
  if (cote.heros) return cote.niveau || fiche.niveau || 1;
  const npc = (data.npcs || []).find(n => n.id === cote.pnj);
  return cote.niveau || (npc && npc.level) || 1;
}

/** Le melange du moteur, refait ici : on reconstitue une pioche, elle doit etre melee. */
function melange(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * UNE CARTE NOMMEE, prise dans la pioche si elle y est. C'est ce qui garde les comptes
 * justes : la carte qu'on met en main sort du deck, elle n'apparait pas de nulle part.
 * Rend `null` quand l'identifiant n'existe pas — l'appelant le signale, il ne l'ignore
 * pas : une situation qui cite une carte disparue doit le dire, pas se monter a moitie.
 */
function carte(side, id, niveau, data) {
  const i = side.deck.findIndex(c => c.id === id);
  if (i >= 0) return side.deck.splice(i, 1)[0];
  const def = cardById(id, data);
  return def ? { ...resolveCard(def, niveau), sprite: def.sprite } : null;
}

/**
 * Monte la position decrite par `fiche`. Rend `{ B, soucis }` : le combat pret a jouer,
 * et la liste de ce qui n'a pas pu etre monte (une carte inconnue, un camp introuvable).
 * ⚠ `soucis` n'est jamais vide en silence — c'est le banc qui l'affiche.
 */
export function monteSituation(fiche, data = CHARACTER_DATA) {
  const soucis = [];
  const cfg = {};
  for (const k of ['p', 'e']) {
    const cote = fiche[k] || {};
    cfg[k] = cote.heros
      ? campPerso(cote.heros, niveauDe(cote, fiche, data), cote.cote || 'cards', data)
      : campPnj(cote.pnj, data);
    if (!cfg[k]) { soucis.push(`camp « ${k} » introuvable (${cote.heros ? cote.heros.join('&') : cote.pnj})`); return { B: null, soucis }; }
  }

  // `createBattle` melange, pioche les mains de depart et lance le premier tour. On
  // le laisse faire — c'est un vrai combat — puis on ecrase l'etat par ce qu'on veut.
  const B = createBattle(cfg.p, cfg.e, { situation: fiche.id });

  for (const k of ['p', 'e']) {
    const cote = fiche[k] || {};
    const s = B[k];
    const niveau = niveauDe(cote, fiche, data);

    // La main de depart retourne dans la pioche : on va la remplacer, et ces cartes
    // ne doivent pas disparaitre du compte. On remelange — sinon elles reviendraient
    // dans l'ordre, sur le dessus, et les premieres pioches seraient truquees.
    s.deck.push(...s.hand);
    melange(s.deck);
    s.hand = [];
    s.board = [];
    s.discard = [];
    // Les compteurs du tour repartent a zero : la position commence maintenant.
    s.jouees = s.attaques = s.piochees = s.recycle = s.fatigue = 0;
    s.nextMana = 0;
    s.plafondPioche = false;
    // Sauf les deux qui decrivent le PASSE, et que des cartes lisent (« X = tes sorts
    // joues cette partie ») : ceux-la, la fiche peut les poser.
    s.spellsGame = cote.sortsPartie || 0;
    s.spellsTurn = cote.sortsTour || 0;

    if (cote.pvMax !== undefined) s.maxHp = cote.pvMax;
    s.hp = cote.pv !== undefined ? cote.pv : s.maxHp;
    // Les tours joues par CE camp : c'est ce que lisent les compteurs (« X = tes tours
    // joues »), et non le numero de tour global. Par defaut, la moitie.
    s.turns = cote.tours !== undefined ? cote.tours : Math.ceil((fiche.tour || 1) / 2);
    // LE MANA SUIT LA COURBE DU JEU : un cristal par tour joue, plafonne. C'est le seul
    // defaut honnete — donner le mana plein ferait d'une fiche « tour 1 » un tour 1 a
    // dix mana, et garder celui du montage en ferait un tour 11 a un mana. Une fiche
    // qui veut autre chose le dit (`mana`, et `manaMax` quand le plafond compte).
    const manaMax = cote.manaMax !== undefined ? cote.manaMax : Math.max(cote.mana || 0, s.turns);
    s.maxMana = Math.min(manaMax, s.manaCap);
    s.mana = cote.mana !== undefined ? cote.mana : s.maxMana;

    // LA MAIN, et ses trois facons de se dire — la distinction compte :
    //   absente    une main normale, comme au debut d'un tour. C'est ce qu'il faut a
    //              une situation qu'on joue depuis le debut (« le Grand-Duc, tour 1 ») ;
    //   un nombre  autant de cartes prises dans la pioche, sans les nommer ;
    //   une liste  exactement ces cartes-la. `[]` veut donc dire « vide expres ».
    if (cote.main === undefined || typeof cote.main === 'number') {
      const n = cote.main === undefined ? s.handSize : cote.main;
      for (let i = 0; i < n && s.deck.length; i++) s.hand.push(s.deck.pop());
    } else {
      for (const id of cote.main) {
        const c = carte(s, id, niveau, data);
        if (c) s.hand.push(c); else soucis.push(`${k} : carte « ${id} » inconnue (main)`);
      }
    }
    for (const id of cote.plateau || []) {
      const c = carte(s, id, niveau, data);
      if (!c) { soucis.push(`${k} : carte « ${id} » inconnue (plateau)`); continue; }
      if (c.type !== 'ally') { soucis.push(`${k} : « ${c.name} » est un sort, il ne se pose pas`); continue; }
      depose(B, k, c, 'plateau');
    }
    // La defausse : soit des cartes nommees, soit « n cartes prises dans la pioche ».
    if (Array.isArray(cote.defausse)) {
      for (const id of cote.defausse) {
        const c = carte(s, id, niveau, data);
        if (c) s.discard.push(c); else soucis.push(`${k} : carte « ${id} » inconnue (défausse)`);
      }
    } else if (cote.defausse > 0) {
      for (let i = 0; i < cote.defausse && s.deck.length; i++) s.discard.push(s.deck.pop());
    }
    // Tronquer la pioche : c'est ainsi qu'on met un camp au bord de la fatigue.
    if (cote.pioche !== undefined && s.deck.length > cote.pioche) {
      s.discard.push(...s.deck.splice(0, s.deck.length - cote.pioche));
    }
    s.aVide = false;
  }

  B.turn = fiche.qui || 'p';
  B.turnNo = fiche.tour || 1;

  // QUI PEUT ATTAQUER. Une unite qu'on vient de deposer arrive « fraiche » : sans
  // Charge, elle ne frappe pas. Mais une position decrit des unites DEJA LA depuis le
  // tour d'avant — sinon « tu as 11 d'attaque en face de 12 PV » ne se joue pas, et la
  // question posee par la fiche n'existe plus. Le camp qui a la main a donc ses unites
  // pretes ; celui d'en face les recevra a son `beginTurn`, comme d'habitude.
  for (const k of ['p', 'e']) {
    const pret = (fiche[k] || {}).prets;
    const parDefaut = k === B.turn;
    for (const u of B[k].board) { u.canAttack = pret === undefined ? parDefaut : !!pret; u.attackedThisTurn = false; }
  }
  // Une unite posee peut porter une aura : personne ne l'a encore prise en compte.
  refresh(B);
  // Le journal texte repart de la position, pas du montage : ce qui precede est un
  // decor, pas une partie, et le laisser brouillerait la lecture.
  B.log = [`— Situation ${fiche.id} : ${fiche.titre} —`];
  B.logTotal = 1;
  return { B, soucis };
}
