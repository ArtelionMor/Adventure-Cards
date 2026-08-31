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
import { TRIGGERS, TARGETS } from '../config/mechanics.js';

const foe = k => (k === 'p' ? 'e' : 'p');
const MISPLAY = 0.12; // probabilite de partir sur un coup au hasard plutot que le bon

// Combien de tours on suppose qu'une unite survit : sert a chiffrer le recurrent.
const TOURS_ESPERES = 2;

// --------------------------------------------------------------- valorisation
/** Valeur approximative d'un effet, en "points de tempo". ctx = tailles de plateau. */
function effectValue(e, ctx) {
  switch (e.op) {
    case 'dmg':
      if (e.t === 'allEnemyUnits') return e.v * Math.max(1, ctx.enemies) * 0.9;
      // Se blesser soi-meme ou blesser un allie est un cout, pas un gain : le bot
      // doit prendre une carte pareille pour ce qu'elle est.
      if (['self', 'randomAllyUnit', 'randomAllyAny'].includes(e.t)) return -e.v;
      // Une cible tiree au sort vaut un peu moins qu'une cible choisie.
      return (TARGETS[e.t] && TARGETS[e.t].random) ? e.v * 0.85 : e.v;
    case 'heal': return e.v * 0.6;
    case 'draw': return e.v * 1.6;
    case 'armor': return e.v * 0.6;
    case 'mana': return e.v * 1.2;
    case 'buff': {
      const per = (e.atk || 0) + (e.hp || 0) * 0.6 + (e.key ? 1.2 : 0);
      return per * (e.t === 'allAllies' ? Math.max(1, ctx.allies) : 1);
    }
    case 'summon': {
      const u = e.unit || {};
      return (e.n || 1) * ((u.atk || 0) + (u.hp || 0) * 0.8);
    }
    // Mecanique inventee dans le builder et pas encore codee : elle ne fait rien,
    // le bot ne doit donc pas surestimer la carte qui la porte.
    default: return 0.2;
  }
}

const effectsValue = (list, ctx) => (list || []).reduce((a, e) => a + effectValue(e, ctx), 0);

/** Une aura ne vaut rien seule : elle vaut ce qu'elle multiplie. */
function auraValue(aura, allies, enemies) {
  if (!aura) return 0;
  const per = (aura.atk || 0) + (aura.hp || 0) * 0.6 + (aura.key ? 1.5 : 0);
  if (aura.scope === 'enemyUnits') return -per * Math.max(1, enemies); // per negatif = bon
  return per * Math.max(1, allies);
}

/** Ce que vaut une carte si on la pose maintenant, dans cette position. */
function cardValue(B, k, card) {
  const me = B[k], them = B[foe(k)];
  const ctx = { allies: me.board.length, enemies: them.board.length };
  let v = effectsValue(card.play, ctx);

  if (card.type === 'ally') {
    v += (card.atk || 0) + (card.hp || 0) * 0.7;
    const keys = card.keys || [];
    if (keys.includes('Taunt')) v += 1.5;
    if (keys.includes('Charge')) v += (card.atk || 0) * 0.6;
    if (keys.includes('Venin')) v += 2;
    if (keys.includes('Bouclier')) v += 1.5;
    v += auraValue(card.aura, ctx.allies, ctx.enemies);
    // Un rale part meme quand l'unite tombe : sa valeur ne se perd presque jamais.
    v += effectsValue(card.death, ctx) * 0.9;
    // Un declencheur de tour rapporte a chaque tour ou l'unite tient.
    v += (effectsValue(card.turnStart, ctx) + effectsValue(card.turnEnd, ctx)) * TOURS_ESPERES;
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
  const ctx = { allies: them.board.length, enemies: B[k].board.length };
  let p = u.atk * 1.3 + u.hp * 0.35;
  if ((u.keys || []).includes('Venin')) p += 2;
  if ((u.keys || []).includes('Taunt')) p += 0.5;
  // Couper une aura adverse vaut plus que sa ligne de stats.
  p += auraValue(u.aura, them.board.length - 1, B[k].board.length) * 1.5;
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
  const taunts = them.board.filter(u => u.keys.includes('Taunt'));
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
    .filter(x => (x.c.play || []).some(e => ['draw', 'armor', 'heal', 'buff', 'mana'].includes(e.op)))
    .sort((a, b) => cardValue(B, k, b.c) - cardValue(B, k, a.c));
  if (utility.length) {
    const u = utility[0];
    const besoinAllie = (u.c.play || []).some(e => e.t === 'allyUnit' || e.t === 'allAllies');
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
      const ctx = { allies: B[k].board.length, enemies: B[foe(k)].board.length };
      const best = mine.sort((a, b) =>
        (b.atk + auraValue(b.aura, ctx.allies - 1, ctx.enemies) * 1.5 + effectsValue(b.death, ctx)) -
        (a.atk + auraValue(a.aura, ctx.allies - 1, ctx.enemies) * 1.5 + effectsValue(a.death, ctx)))[0];
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
