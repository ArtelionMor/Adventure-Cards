// Moteur de combat de cartes. Aucun DOM ici : l'UI lit l'etat et rejoue le log.
import { BALANCE } from '../config/balance.js';

let uid = 1;
const nextUid = () => 'u' + uid++;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeSide(cfg) {
  return {
    key: cfg.key,
    name: cfg.name,
    sprite: cfg.sprite,
    hp: cfg.hp,
    maxHp: cfg.hp,
    armor: cfg.startArmor || 0,
    mana: 0,
    maxMana: 0,
    manaCap: Math.min(cfg.mana, BALANCE.combat.maxManaCap),
    handSize: cfg.hand,
    deck: shuffle(cfg.deck.map(c => ({ ...c }))),
    discard: [],
    hand: [],
    board: [],
    fatigue: 0
  };
}

export function createBattle(playerCfg, enemyCfg, meta = {}) {
  const B = {
    meta,
    p: makeSide({ ...playerCfg, key: 'p' }),
    e: makeSide({ ...enemyCfg, key: 'e' }),
    turn: 'p',
    turnNo: 0,
    log: [],
    over: false,
    winner: null
  };
  for (let i = 0; i < B.p.handSize; i++) draw(B, 'p');
  for (let i = 0; i < B.e.handSize; i++) draw(B, 'e');
  say(B, `${B.p.name} affronte ${B.e.name}.`);
  beginTurn(B);
  return B;
}

const foe = k => (k === 'p' ? 'e' : 'p');
export const other = foe;

function say(B, msg) {
  B.log.push(msg);
  if (B.log.length > 120) B.log.shift();
}

// ------------------------------------------------------------------ pioche
export function draw(B, k, n = 1) {
  const s = B[k];
  for (let i = 0; i < n; i++) {
    // Facon Slay the Spire : la defausse est remelangee. Un deck de 5 cartes (un seul
    // personnage equipe) reste donc jouable, et la fatigue ne punit que les combats
    // qui s'eternisent vraiment.
    if (!s.deck.length && s.discard.length) {
      s.deck = shuffle(s.discard);
      s.discard = [];
      say(B, `${s.name} remelange sa defausse.`);
    }
    if (!s.deck.length) {
      s.fatigue += BALANCE.combat.fatigueBase;
      say(B, `${s.name} n'a plus rien a piocher : ${s.fatigue} degats de fatigue.`);
      damageHero(B, k, s.fatigue);
      continue;
    }
    const c = s.deck.pop();
    if (s.hand.length >= BALANCE.combat.handMax) { say(B, `Main pleine : ${c.name} part a la defausse.`); s.discard.push(c); continue; }
    s.hand.push(c);
  }
}

// ------------------------------------------------------------------- degats
function damageHero(B, k, v) {
  const s = B[k];
  if (s.armor > 0) {
    const used = Math.min(s.armor, v);
    s.armor -= used;
    v -= used;
  }
  if (v > 0) s.hp -= v;
  checkOver(B);
}

function damageUnit(B, k, u, v, source) {
  if (u.shield) { u.shield = false; say(B, `${u.name} encaisse avec son bouclier.`); return; }
  u.hp -= v;
  if (source && source.keys && source.keys.includes('Venin') && v > 0) {
    u.hp = 0;
    say(B, `${u.name} succombe au venin.`);
  }
  cleanBoard(B, k);
}

function cleanBoard(B, k) {
  const s = B[k];
  const dead = s.board.filter(u => u.hp <= 0);
  if (dead.length) {
    s.board = s.board.filter(u => u.hp > 0);
    for (const d of dead) say(B, `${d.name} est mis hors de combat.`);
  }
}

function checkOver(B) {
  if (B.over) return;
  if (B.p.hp <= 0 || B.e.hp <= 0) {
    B.over = true;
    B.winner = B.e.hp <= 0 && B.p.hp > 0 ? 'p' : B.p.hp <= 0 && B.e.hp > 0 ? 'e' : 'draw';
    say(B, B.winner === 'p' ? 'Victoire !' : B.winner === 'e' ? 'Defaite...' : 'Match nul.');
  }
}

// -------------------------------------------------------------------- tours
export function beginTurn(B) {
  if (B.over) return;
  const k = B.turn;
  const s = B[k];
  B.turnNo++;
  s.maxMana = Math.min(s.maxMana + 1, s.manaCap);
  s.mana = s.maxMana;
  s.tempMana = 0;
  for (const u of s.board) u.canAttack = true;
  if (B.turnNo > 2) draw(B, k);   // les deux premiers tours partent de la main de depart
  say(B, `— Tour de ${s.name} (${s.mana} mana) —`);
}

export function endTurn(B) {
  if (B.over) return;
  B.turn = foe(B.turn);
  beginTurn(B);
}

// ------------------------------------------------------------------- ciblage
export function needsTarget(card) {
  return card.play.some(e => ['enemyAny', 'enemyUnit', 'allyUnit'].includes(e.t));
}

export function legalTargets(B, k, card) {
  const out = [];
  const me = B[k], them = B[foe(k)];
  for (const e of card.play) {
    if (e.t === 'enemyUnit') out.push(...them.board.map(u => ({ side: foe(k), uid: u.uid })));
    else if (e.t === 'enemyAny') {
      out.push(...them.board.map(u => ({ side: foe(k), uid: u.uid })));
      out.push({ side: foe(k), uid: 'hero' });
    } else if (e.t === 'allyUnit') out.push(...me.board.map(u => ({ side: k, uid: u.uid })));
  }
  // dedoublonne
  return out.filter((t, i) => out.findIndex(o => o.side === t.side && o.uid === t.uid) === i);
}

function findUnit(B, ref) {
  if (!ref || ref.uid === 'hero') return null;
  return B[ref.side].board.find(u => u.uid === ref.uid) || null;
}

// ------------------------------------------------------------------- effets
function applyEffects(B, k, effects, target, source) {
  const me = B[k], them = B[foe(k)];
  for (const e of effects) {
    switch (e.op) {
      case 'dmg': {
        if (e.t === 'enemyHero') { say(B, `${e.v} degats a ${them.name}.`); damageHero(B, foe(k), e.v); }
        else if (e.t === 'allEnemyUnits') {
          say(B, `${e.v} degats a toutes les unites adverses.`);
          for (const u of [...them.board]) damageUnit(B, foe(k), u, e.v, source);
        } else {
          const u = findUnit(B, target);
          if (u) { say(B, `${e.v} degats a ${u.name}.`); damageUnit(B, target.side, u, e.v, source); }
          else if (target && target.uid === 'hero') { say(B, `${e.v} degats a ${them.name}.`); damageHero(B, foe(k), e.v); }
          else { say(B, `${e.v} degats a ${them.name}.`); damageHero(B, foe(k), e.v); }
        }
        break;
      }
      case 'heal': {
        if (e.t === 'ownHero') { me.hp = Math.min(me.maxHp, me.hp + e.v); say(B, `${me.name} recupere ${e.v} PV.`); }
        else if (e.t === 'allAllies') for (const u of me.board) u.hp = Math.min(u.maxHp, u.hp + e.v);
        else { const u = findUnit(B, target); if (u) u.hp = Math.min(u.maxHp, u.hp + e.v); }
        break;
      }
      case 'buff': {
        const list = e.t === 'allAllies'
          ? me.board.filter(u => u !== source)
          : [findUnit(B, target)].filter(Boolean);
        for (const u of list) {
          u.atk += e.atk || 0;
          u.hp += e.hp || 0;
          u.maxHp += e.hp || 0;
          if (e.key && !u.keys.includes(e.key)) {
            u.keys.push(e.key);
            if (e.key === 'Charge') u.canAttack = true;
          }
        }
        if (list.length) say(B, `Renfort : +${e.atk || 0}/+${e.hp || 0}.`);
        break;
      }
      case 'draw': draw(B, k, e.v); break;
      case 'armor': me.armor += e.v; say(B, `${me.name} gagne ${e.v} armure.`); break;
      case 'mana': me.mana += e.v; say(B, `+${e.v} mana.`); break;
      case 'summon': {
        for (let i = 0; i < (e.n || 1); i++) {
          if (me.board.length >= BALANCE.combat.boardSize) break;
          me.board.push(makeUnit({
            name: e.unit.name, atk: e.unit.atk, hp: e.unit.hp,
            keys: e.unit.keys || [], sprite: source ? source.sprite : null
          }));
        }
        say(B, `${e.n} ${e.unit.name}(s) arrivent.`);
        break;
      }
    }
    checkOver(B);
    if (B.over) return;
  }
}

function makeUnit(c) {
  return {
    uid: nextUid(),
    name: c.name,
    atk: c.atk,
    hp: c.hp,
    maxHp: c.hp,
    keys: [...(c.keys || [])],
    sprite: c.sprite,
    shield: (c.keys || []).includes('Bouclier'),
    canAttack: (c.keys || []).includes('Charge')
  };
}

// ---------------------------------------------------------------- jouer/attaquer
export function canPlay(B, k, card) {
  const s = B[k];
  if (s.mana < card.cost) return false;
  if (card.type === 'ally' && s.board.length >= BALANCE.combat.boardSize) return false;
  if (needsTarget(card) && legalTargets(B, k, card).length === 0) {
    // Un sort de degats sans cible d'unite peut toujours viser le heros adverse.
    return card.play.some(e => e.t === 'enemyAny' || !['enemyUnit', 'allyUnit'].includes(e.t));
  }
  return true;
}

export function playCard(B, k, handIndex, target = null) {
  const s = B[k];
  const card = s.hand[handIndex];
  if (!card || !canPlay(B, k, card)) return false;
  s.mana -= card.cost;
  s.hand.splice(handIndex, 1);
  s.discard.push(card);
  say(B, `${s.name} joue ${card.name}.`);

  let source = null;
  if (card.type === 'ally') {
    source = makeUnit(card);
    s.board.push(source);
  }
  if (card.play.length) applyEffects(B, k, card.play, target, source || card);
  return true;
}

export function attackableTargets(B, k, unit) {
  const them = B[foe(k)];
  const taunts = them.board.filter(u => u.keys.includes('Taunt'));
  if (taunts.length) return taunts.map(u => ({ side: foe(k), uid: u.uid }));
  return [...them.board.map(u => ({ side: foe(k), uid: u.uid })), { side: foe(k), uid: 'hero' }];
}

export function attack(B, k, unitUid, target) {
  const s = B[k], them = B[foe(k)];
  const a = s.board.find(u => u.uid === unitUid);
  if (!a || !a.canAttack || a.atk <= 0 || B.over) return false;
  const legal = attackableTargets(B, k, a);
  if (!legal.some(t => t.uid === target.uid)) return false;

  a.canAttack = false;
  if (target.uid === 'hero') {
    say(B, `${a.name} frappe ${them.name} pour ${a.atk}.`);
    damageHero(B, foe(k), a.atk);
  } else {
    const d = them.board.find(u => u.uid === target.uid);
    if (!d) return false;
    say(B, `${a.name} (${a.atk}/${a.hp}) attaque ${d.name} (${d.atk}/${d.hp}).`);
    damageUnit(B, foe(k), d, a.atk, a);
    if (d.atk > 0) damageUnit(B, k, a, d.atk, d);
  }
  checkOver(B);
  return true;
}
