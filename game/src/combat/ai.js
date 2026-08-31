// Bot de combat. Priorites imposees par le GDD :
//   1. chercher la victoire immediate  2. se developper
//   3. freiner l'adversaire            4. jouer au hasard
// Il joue donc regulierement mal, et c'est voulu : c'est la marge de progression
// que recupere le joueur qui reprend la main en mode manuel.
//
// Ce qui le rend un peu moins bete, c'est une fonction de valeur : une carte ne vaut
// pas son cout en mana mais ce qu'elle rapporte. Un rale d'agonie compte parce qu'il
// part meme si l'unite meurt ; une aura compte pour ce qu'elle multiplie ; un
// declencheur de tour compte plusieurs fois parce qu'il se repete.
import { canPlay, legalTargets, attackableTargets, needsTarget } from './engine.js';
import { TRIGGERS, TARGETS, hasKey, keyArgs, targetId, targetArg } from '../config/mechanics.js';

const foe = k => (k === 'p' ? 'e' : 'p');
const MISPLAY = 0.12; // probabilite de partir sur un coup au hasard plutot que le bon

// Combien de tours on suppose qu'une unite survit : sert a chiffrer le recurrent.
const TOURS_ESPERES = 2;

// Les types portes par une carte (`keys`) ou par une unite en jeu (`baseKeys`).
const typesOf = x => keyArgs(x.baseKeys || x.keys, 'type');
/** Combien d'unites du plateau partagent une etiquette de type avec `x`. */
function sameTypeCount(board, x) {
  const mine = typesOf(x);
  if (!mine.length) return 0;
  return board.filter(u => u !== x && typesOf(u).some(t => mine.includes(t))).length;
}
/** Combien d'unites d'un plateau portent le type ecrit dans une cible « allyType:X ». */
function typeCount(board, t) {
  const voulu = targetArg(t);
  return voulu ? (board || []).filter(u => typesOf(u).includes(voulu)).length : 0;
}

// --------------------------------------------------------------- valorisation
/** Valeur approximative d'un effet, en "points de tempo". ctx = tailles de plateau. */
function effectValue(e, ctx) {
  switch (e.op) {
    case 'dmg':
      if (e.t === 'allEnemyUnits') return e.v * Math.max(1, ctx.enemies) * 0.9;
      // Une cible par type ne vaut que les unites qui portent vraiment l'etiquette :
      // sans meute en face, la carte ne fait rien et le bot ne doit pas la jouer.
      if (targetId(e.t) === 'enemyType') return e.v * typeCount(ctx.foeBoard, e.t) * 0.9;
      if (targetId(e.t) === 'allyType') return -e.v * typeCount(ctx.board, e.t);
      // Se blesser soi-meme ou blesser un allie est un cout, pas un gain : le bot
      // doit prendre une carte pareille pour ce qu'elle est.
      if (['self', 'randomAllyUnit', 'randomAllyAny'].includes(e.t)) return -e.v;
      // Une cible tiree au sort vaut un peu moins qu'une cible choisie.
      // « Lui » peut viser aussi bien un jeton adverse qu'un des notres selon ce que
      // l'effet d'avant a touche : on ne parie ni dans un sens ni dans l'autre.
      if (e.t === 'previous') return e.v * 0.5;
      return (TARGETS[targetId(e.t)] || {}).random ? e.v * 0.85 : e.v;
    case 'heal': return e.v * 0.6;
    case 'draw': return e.v * 1.6;
    case 'armor': return e.v * 0.6;
    case 'mana': return e.v * 1.2;
    // Un mana promis pour le tour suivant vaut presque autant qu'un mana tout de
    // suite : il n'est pas plafonne, mais il faut survivre au tour d'en face.
    case 'mana_au_prochain_tour': return (e.x || 0) * 1.1;
    case 'buff': {
      const per = (e.atk || 0) + (e.hp || 0) * 0.6 + (e.key ? 1.2 : 0);
      // Un renfort « du meme type » ne vaut que le nombre d'allies etiquetes presents :
      // sans meute sur le plateau, il ne fait rien, et le bot ne doit pas le jouer.
      const cibles = e.t === 'allAllies' ? Math.max(1, ctx.allies)
        : e.t === 'sameTypeAllies' ? Math.max(0, ctx.sameType || 0)
          : targetId(e.t) === 'allyType' ? typeCount(ctx.board, e.t)
            : 1;
      return per * cibles;
    }
    case 'summon': {
      // Un jeton peut porter mots-cles, aura et moments : il vaut son corps entier.
      return (e.n || 1) * bodyValue(e.unit || {}, ctx, 0.8);
    }
    // Mecanique inventee dans le builder et pas encore codee : elle ne fait rien,
    // le bot ne doit donc pas surestimer la carte qui la porte.
    default: return 0.2;
  }
}

const effectsValue = (list, ctx) => (list || []).reduce((a, e) => a + effectValue(e, ctx), 0);

/** Une aura ne vaut rien seule : elle vaut ce qu'elle multiplie. */
function auraValue(aura, allies, enemies, sameType) {
  if (!aura) return 0;
  const per = (aura.atk || 0) + (aura.hp || 0) * 0.6 + (aura.key ? 1.5 : 0);
  if (aura.scope === 'enemyUnits') return -per * Math.max(1, enemies); // per negatif = bon
  // Une aura « du meme type » ne porte que sur les allies qui partagent l'etiquette.
  // Sans compte precis (on ne sait pas toujours qui est en face), on suppose la moitie.
  if (aura.scope === 'sameTypeAllies') return per * Math.max(0, sameType ?? allies * 0.5);
  return per * Math.max(1, allies);
}

/**
 * Ce que vaut un CORPS d'unite : sa ligne de stats, ses mots-cles, son aura et ses
 * moments. Sert aux cartes alliees comme aux jetons invoques — un jeton qui laisse
 * un rale ou porte une aura n'est pas un 1/1 comme un autre.
 * `poidsPv` : une carte se paie plus cher en attaque qu'en PV, un jeton un peu moins.
 */
function bodyValue(u, ctx, poidsPv) {
  let v = (u.atk || 0) + (u.hp || 0) * poidsPv;
  const keys = u.keys || [];
  if (hasKey(keys, 'Taunt')) v += 1.5;
  if (hasKey(keys, 'Charge')) v += (u.atk || 0) * 0.6;
  if (hasKey(keys, 'Venin')) v += 2;
  if (hasKey(keys, 'Bouclier')) v += 1.5;
  v += auraValue(u.aura, ctx.allies, ctx.enemies, ctx.sameType);
  // Un rale part meme quand l'unite tombe : sa valeur ne se perd presque jamais.
  v += effectsValue(u.death, ctx) * 0.9;
  // Un declencheur de tour rapporte a chaque tour ou l'unite tient.
  v += (effectsValue(u.turnStart, ctx) + effectsValue(u.turnEnd, ctx)) * TOURS_ESPERES;
  return v;
}

/** Ce que vaut une carte si on la pose maintenant, dans cette position. */
function cardValue(B, k, card) {
  const me = B[k], them = B[foe(k)];
  const ctx = { allies: me.board.length, enemies: them.board.length, sameType: sameTypeCount(me.board, card),
    board: me.board, foeBoard: them.board };
  let v = effectsValue(card.play, ctx);

  if (card.type === 'ally') {
    v += bodyValue(card, ctx, 0.7);
    // Les moments qui seront ajoutes plus tard comptent aussi, sans rien savoir d'eux.
    for (const slot of Object.keys(TRIGGERS)) {
      if (['play', 'death', 'turnStart', 'turnEnd'].includes(slot)) continue;
      v += effectsValue(card[slot], ctx);
    }
  }
  return v;
}

/** A quel point on veut voir cette unite ADVERSE disparaitre. */
function unitThreat(B, k, u) {
  const them = B[foe(k)];
  const memeType = sameTypeCount(them.board, u);
  const ctx = { allies: them.board.length, enemies: B[k].board.length, sameType: memeType,
    board: them.board, foeBoard: B[k].board };
  let p = u.atk * 1.3 + u.hp * 0.35;
  if (hasKey(u.keys, 'Venin')) p += 2;
  if (hasKey(u.keys, 'Taunt')) p += 0.5;
  // Couper une aura adverse vaut plus que sa ligne de stats.
  p += auraValue(u.aura, them.board.length - 1, B[k].board.length, memeType) * 1.5;
  // Un moteur qui se redeclenche chaque tour doit tomber en priorite.
  p += (effectsValue(u.turnStart, ctx) + effectsValue(u.turnEnd, ctx)) * TOURS_ESPERES;
  // Mais le tuer lui offre son rale : c'est un cadeau, ca fait baisser l'envie.
  p -= effectsValue(u.death, ctx) * 0.8;
  return p;
}

const directDamage = card =>
  (card.play || []).filter(e => e.op === 'dmg' && (e.t === 'enemyAny' || e.t === 'enemyHero'))
    .reduce((a, e) => a + e.v, 0);

// ------------------------------------------------------------------- decision
/** Renvoie UNE action a executer, ou {type:'end'} quand il n'y a plus rien a faire. */
export function botAction(B, k) {
  const me = B[k], them = B[foe(k)];
  const ready = me.board.filter(u => u.canAttack && u.atk > 0);
  const taunts = them.board.filter(u => hasKey(u.keys, 'Taunt'));
  const playable = me.hand.map((c, i) => ({ c, i })).filter(x => canPlay(B, k, x.c));

  // --- 1. victoire immediate -----------------------------------------------
  const faceDamage = taunts.length ? 0 : ready.reduce((a, u) => a + u.atk, 0);
  const burnCards = playable.filter(x => directDamage(x.c) > 0);
  let burn = 0, mana = me.mana;
  for (const x of burnCards.sort((a, b) => directDamage(b.c) - directDamage(a.c))) {
    if (mana >= x.c.cost) { burn += directDamage(x.c); mana -= x.c.cost; }
  }
  if (them.hp <= faceDamage + burn - them.armor) {
    const b = burnCards.sort((a, b) => directDamage(b.c) - directDamage(a.c))[0];
    if (b && them.hp > faceDamage - them.armor) {
      return { type: 'play', index: b.i, target: { side: foe(k), uid: 'hero' } };
    }
    if (ready.length) return { type: 'attack', uid: ready[0].uid, target: { side: foe(k), uid: 'hero' } };
  }

  // --- coup au hasard occasionnel ------------------------------------------
  if (Math.random() < MISPLAY) {
    const r = randomAction(B, k, playable, ready);
    if (r) return r;
  }

  // --- 2. se developper ----------------------------------------------------
  // On pose l'allie qui rapporte le plus dans cette position, pas le plus cher.
  const allies = playable.filter(x => x.c.type === 'ally')
    .sort((a, b) => cardValue(B, k, b.c) - cardValue(B, k, a.c));
  if (allies.length) return { type: 'play', index: allies[0].i, target: pickTarget(B, k, allies[0].c) };

  const utility = playable
    // L'invocation en fait partie : un sort qui pose un jeton developpe le plateau
    // autant qu'un allie, et depuis que les jetons portent mots-cles, aura et moments,
    // le laisser au tirage au sort revenait a jeter la carte.
    .filter(x => (x.c.play || []).some(e => ['draw', 'armor', 'heal', 'buff', 'mana', 'mana_au_prochain_tour', 'summon'].includes(e.op)))
    .sort((a, b) => cardValue(B, k, b.c) - cardValue(B, k, a.c));
  if (utility.length) {
    const u = utility[0];
    const besoinAllie = (u.c.play || []).some(e => ['allyUnit', 'allAllies', 'sameTypeAllies', 'allyType'].includes(targetId(e.t)));
    // On ne gaspille pas un renfort quand il n'y a personne a renforcer.
    if (!(besoinAllie && me.board.length === 0)) {
      return { type: 'play', index: u.i, target: pickTarget(B, k, u.c) };
    }
  }

  // --- 3. freiner l'adversaire ---------------------------------------------
  // Sort de degats sur une unite qu'on peut tuer : on vise la plus genante.
  for (const x of playable) {
    const dmg = (x.c.play || []).filter(e => e.op === 'dmg').reduce((a, e) => a + e.v, 0);
    if (!dmg) continue;
    const kill = them.board.filter(u => u.hp <= dmg)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0];
    if (kill) return { type: 'play', index: x.i, target: { side: foe(k), uid: kill.uid } };
    if ((x.c.play || []).some(e => e.t === 'allEnemyUnits') && them.board.length >= 2) {
      return { type: 'play', index: x.i, target: null };
    }
  }
  // Attaques : provocations d'abord, puis les echanges qui valent le coup.
  for (const u of ready) {
    const legal = attackableTargets(B, k, u);
    const units = legal.filter(t => t.uid !== 'hero')
      .map(t => them.board.find(x => x.uid === t.uid)).filter(Boolean);

    // Echange franchement favorable : on tue sans mourir.
    const propre = units.filter(d => d.hp <= u.atk && d.atk < u.hp)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0];
    if (propre) return { type: 'attack', uid: u.uid, target: { side: foe(k), uid: propre.uid } };

    // Echange ou l'on meurt aussi : acceptable si la cible est vraiment genante,
    // ou si notre unite laisse un rale derriere elle.
    const ctx = { allies: me.board.length, enemies: them.board.length };
    const consolation = effectsValue(u.death, ctx) * 0.9;
    const troc = units.filter(d => d.hp <= u.atk)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0];
    if (troc && unitThreat(B, k, troc) + consolation > u.atk * 1.3 + u.hp * 0.35) {
      return { type: 'attack', uid: u.uid, target: { side: foe(k), uid: troc.uid } };
    }

    if (taunts.length) {
      const t = units.sort((a, b) => a.hp - b.hp)[0];
      if (t) return { type: 'attack', uid: u.uid, target: { side: foe(k), uid: t.uid } };
    }
    return { type: 'attack', uid: u.uid, target: { side: foe(k), uid: 'hero' } };
  }

  // --- 4. au hasard --------------------------------------------------------
  const r = randomAction(B, k, playable, ready);
  return r || { type: 'end' };
}

function randomAction(B, k, playable, ready) {
  const pool = [];
  for (const x of playable) pool.push({ type: 'play', index: x.i, target: pickTarget(B, k, x.c) });
  for (const u of ready) {
    const legal = attackableTargets(B, k, u);
    pool.push({ type: 'attack', uid: u.uid, target: legal[Math.floor(Math.random() * legal.length)] });
  }
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function pickTarget(B, k, card) {
  if (!needsTarget(card)) return null;
  const targets = legalTargets(B, k, card);
  if (!targets.length) return { side: foe(k), uid: 'hero' };

  const soutien = (card.play || []).some(e => e.op === 'buff' || (e.op === 'heal' && e.t === 'allyUnit'));
  if (soutien) {
    const mine = targets.filter(t => t.side === k)
      .map(t => B[k].board.find(u => u.uid === t.uid)).filter(Boolean);
    if (mine.length) {
      // On renforce l'unite qui compte le plus : porteuse d'aura ou grosse attaque.
      const ctx = { allies: B[k].board.length, enemies: B[foe(k)].board.length, sameType: 0,
        board: B[k].board, foeBoard: B[foe(k)].board };
      const poids = u => u.atk
        + auraValue(u.aura, ctx.allies - 1, ctx.enemies, sameTypeCount(B[k].board, u)) * 1.5
        + effectsValue(u.death, { ...ctx, sameType: sameTypeCount(B[k].board, u) });
      const best = mine.sort((a, b) => poids(b) - poids(a))[0];
      if (best) return { side: k, uid: best.uid };
    }
  }

  const dmg = (card.play || []).filter(e => e.op === 'dmg').reduce((a, e) => a + e.v, 0);
  if (dmg) {
    const them = B[foe(k)];
    const kill = them.board.filter(u => u.hp <= dmg)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0];
    if (kill) return { side: foe(k), uid: kill.uid };
    const face = targets.find(t => t.uid === 'hero');
    if (face) return face;
  }
  return targets[0];
}
