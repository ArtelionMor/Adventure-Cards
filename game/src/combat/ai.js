// Bot de combat. Priorites imposees par le GDD :
//   1. chercher la victoire immediate  2. se developper
//   3. freiner l'adversaire            4. jouer au hasard
// Il joue donc regulierement mal, et c'est voulu : c'est la marge de progression
// que recupere le joueur qui reprend la main en mode manuel.
import { canPlay, legalTargets, attackableTargets, needsTarget } from './engine.js';

const foe = k => (k === 'p' ? 'e' : 'p');
const MISPLAY = 0.12; // probabilite de partir sur un coup au hasard plutot que le bon

const directDamage = card =>
  card.play.filter(e => e.op === 'dmg' && (e.t === 'enemyAny' || e.t === 'enemyHero'))
           .reduce((a, e) => a + e.v, 0);

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
  // On pose d'abord la plus grosse creature abordable, puis les sorts utilitaires.
  const allies = playable.filter(x => x.c.type === 'ally').sort((a, b) => b.c.cost - a.c.cost);
  if (allies.length) return { type: 'play', index: allies[0].i, target: pickTarget(B, k, allies[0].c) };

  const utility = playable.filter(x => x.c.play.some(e => ['draw', 'armor', 'heal', 'buff', 'mana'].includes(e.op)));
  if (utility.length) {
    const u = utility[0];
    if (u.c.play.some(e => e.t === 'allyUnit' || e.t === 'allAllies') && me.board.length === 0) {
      // pas d'allie a buffer : on garde la carte
    } else {
      return { type: 'play', index: u.i, target: pickTarget(B, k, u.c) };
    }
  }

  // --- 3. freiner l'adversaire ---------------------------------------------
  // Sort de degats sur une unite qu'on peut tuer.
  for (const x of playable) {
    const dmg = x.c.play.filter(e => e.op === 'dmg').reduce((a, e) => a + e.v, 0);
    if (!dmg) continue;
    const kill = them.board.find(u => u.hp <= dmg);
    if (kill) return { type: 'play', index: x.i, target: { side: foe(k), uid: kill.uid } };
    if (x.c.play.some(e => e.t === 'allEnemyUnits') && them.board.length >= 2) {
      return { type: 'play', index: x.i, target: null };
    }
  }
  // Attaques : d'abord les provocations, puis les echanges favorables, puis le heros.
  for (const u of ready) {
    const legal = attackableTargets(B, k, u);
    const units = legal.filter(t => t.uid !== 'hero')
      .map(t => them.board.find(x => x.uid === t.uid)).filter(Boolean);
    const good = units.find(d => d.hp <= u.atk && d.atk < u.hp);
    if (good) return { type: 'attack', uid: u.uid, target: { side: foe(k), uid: good.uid } };
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
  const heals = card.play.some(e => e.op === 'buff' || (e.op === 'heal' && e.t === 'allyUnit'));
  if (heals) {
    const mine = targets.filter(t => t.side === k);
    if (mine.length) {
      // On buffe la plus grosse creature.
      const best = mine.map(t => B[k].board.find(u => u.uid === t.uid))
        .filter(Boolean).sort((a, b) => b.atk - a.atk)[0];
      if (best) return { side: k, uid: best.uid };
    }
  }
  const dmg = card.play.filter(e => e.op === 'dmg').reduce((a, e) => a + e.v, 0);
  if (dmg) {
    const them = B[foe(k)];
    const kill = them.board.filter(u => u.hp <= dmg).sort((a, b) => b.atk - a.atk)[0];
    if (kill) return { side: foe(k), uid: kill.uid };
    const face = targets.find(t => t.uid === 'hero');
    if (face) return face;
  }
  return targets[0];
}
