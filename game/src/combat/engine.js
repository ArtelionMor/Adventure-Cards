// Moteur de combat de cartes. Aucun DOM ici : l'UI lit l'etat et rejoue le log.
//
// MODELE D'UNITE — une unite separe ce qu'elle EST de ce qu'on lui FAIT :
//   baseAtk / baseHp / baseKeys  ce que la carte apporte, plus les renforts permanents
//   damage                       les degats encaisses, cumules
//   atk / maxHp / hp / keys      DERIVES, recalcules par refresh() a chaque changement
// C'est ce qui rend les auras propres : une aura qui tombe retire son bonus de maxHp
// sans "reguerir" l'unite, et sans la tuer deux fois si elle etait deja blessee.
//
// MOMENTS OU UNE CARTE PEUT AGIR (voir TRIGGERS dans config/mechanics.js) :
//   play       quand la carte est jouee (cri de guerre / effet du sort)
//   death      quand l'unite meurt (rale d'agonie)
//   turnStart  au debut du tour de son proprietaire
//   turnEnd    a la fin du tour de son proprietaire
//   aura       en continu tant que l'unite est en jeu (pas un effet : un modificateur)
import { BALANCE } from '../config/balance.js';
import { ALL_EFFECTS, ALL_KEYWORDS, TRIGGERS, TARGETS } from '../config/mechanics.js';

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
    pending: [],   // mecaniques rencontrees mais pas encore codees
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

// -------------------------------------------------------------------- auras
/**
 * Recalcule les valeurs derivees de toutes les unites a partir de leurs valeurs de
 * base et des auras presentes sur le plateau. A appeler apres tout changement.
 */
function refresh(B) {
  for (const k of ['p', 'e']) {
    const mine = B[k].board, theirs = B[foe(k)].board;
    for (const u of mine) {
      let bAtk = 0, bHp = 0;
      const bKeys = [];
      const take = src => {
        bAtk += src.aura.atk || 0;
        bHp += src.aura.hp || 0;
        if (src.aura.key) bKeys.push(src.aura.key);
      };
      // Auras alliees : elles ne se portent pas sur leur propre porteur.
      for (const src of mine) {
        if (!src.aura || src === u) continue;
        if ((src.aura.scope || 'otherAllies') === 'otherAllies') take(src);
      }
      // Auras adverses qui debuffent nos unites.
      for (const src of theirs) {
        if (!src.aura || src.aura.scope !== 'enemyUnits') continue;
        take(src);
      }
      u.atk = Math.max(0, u.baseAtk + bAtk);
      u.maxHp = u.baseHp + bHp;
      u.hp = u.maxHp - u.damage;
      u.keys = [...new Set([...u.baseKeys, ...bKeys])];
      // Une aura peut donner Charge : l'unite doit alors pouvoir frapper tout de suite.
      if (u.keys.includes('Charge') && B.turn === k && !u.attackedThisTurn) u.canAttack = true;
    }
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

/** Inflige des degats a une unite. Ne retire personne du plateau : resolveDeaths s'en charge. */
function damageUnit(B, k, u, v, source) {
  if (v <= 0) return;
  if (u.shield) { u.shield = false; say(B, `${u.name} encaisse avec son bouclier.`); return; }
  u.damage += v;
  if (source && source !== u && source.keys && source.keys.includes('Venin')) {
    u.damage = u.maxHp;
    say(B, `${u.name} succombe au venin.`);
  }
  u.hp = u.maxHp - u.damage;
}

/**
 * Retire les unites mortes et declenche leur rale d'agonie. Boucle tant que ces rales
 * (ou la disparition d'une aura) en tuent d'autres, avec un garde-fou.
 */
function resolveDeaths(B, depth = 0) {
  refresh(B);
  const dead = [];
  for (const k of ['p', 'e']) {
    const s = B[k];
    for (const u of s.board) if (u.hp <= 0) dead.push({ k, u });
    s.board = s.board.filter(u => u.hp > 0);
  }
  if (!dead.length) return;

  for (const { k, u } of dead) {
    say(B, `${u.name} est mis hors de combat.`);
    if (u.death && u.death.length && !B.over) {
      say(B, `Rale d'agonie de ${u.name}.`);
      applyEffects(B, k, u.death, autoTarget(B, k, u.death), u);
    }
  }
  if (depth < 8 && !B.over) resolveDeaths(B, depth + 1);
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
function fireTrigger(B, k, slot, label) {
  // On fige la liste : une unite qui meurt pendant la sequence ne doit pas la casser.
  for (const u of [...B[k].board]) {
    if (B.over) return;
    if (!u[slot] || !u[slot].length) continue;
    if (!B[k].board.includes(u)) continue;   // deja morte entre-temps
    say(B, `${label} — ${u.name}.`);
    applyEffects(B, k, u[slot], autoTarget(B, k, u[slot]), u);
    resolveDeaths(B);
  }
}

export function beginTurn(B) {
  if (B.over) return;
  const k = B.turn;
  const s = B[k];
  B.turnNo++;
  s.maxMana = Math.min(s.maxMana + 1, s.manaCap);
  s.mana = s.maxMana;
  s.tempMana = 0;
  for (const u of s.board) { u.canAttack = true; u.attackedThisTurn = false; }
  if (B.turnNo > 2) draw(B, k);   // les deux premiers tours partent de la main de depart
  say(B, `— Tour de ${s.name} (${s.mana} mana) —`);
  fireTrigger(B, k, 'turnStart', 'Debut de tour');
}

export function endTurn(B) {
  if (B.over) return;
  fireTrigger(B, B.turn, 'turnEnd', 'Fin de tour');
  if (B.over) return;
  B.turn = foe(B.turn);
  beginTurn(B);
}

// ------------------------------------------------------------------- ciblage
const isPick = t => !!(TARGETS[t] && TARGETS[t].pick);

/** Une carte a-t-elle besoin que le joueur designe une cible avant d'etre jouee ? */
export function needsTarget(card) {
  return (card.play || []).some(e => isPick(e.t));
}

export function legalTargets(B, k, card) {
  const out = [];
  const me = B[k], them = B[foe(k)];
  for (const e of card.play || []) {
    if (e.t === 'enemyUnit') out.push(...them.board.map(u => ({ side: foe(k), uid: u.uid })));
    else if (e.t === 'enemyAny') {
      out.push(...them.board.map(u => ({ side: foe(k), uid: u.uid })));
      out.push({ side: foe(k), uid: 'hero' });
    } else if (e.t === 'allyUnit') out.push(...me.board.map(u => ({ side: k, uid: u.uid })));
  }
  // dedoublonne
  return out.filter((t, i) => out.findIndex(o => o.side === t.side && o.uid === t.uid) === i);
}

/**
 * Un rale d'agonie ou un declencheur de tour part tout seul : personne n'est la pour
 * choisir une cible. On en designe une raisonnable ici plutot que d'appeler l'IA,
 * qui depend deja du moteur (on eviterait un import circulaire).
 * Seules les cibles `pick` sont concernees : les autres se resolvent d'elles-memes.
 */
function autoTarget(B, k, effects) {
  const me = B[k], them = B[foe(k)];
  for (const e of effects) {
    if (!isPick(e.t)) continue;
    if (e.t === 'enemyUnit' || e.t === 'enemyAny') {
      const kill = them.board.filter(u => u.hp <= (e.v || 0)).sort((a, b) => b.atk - a.atk)[0];
      if (kill) return { side: foe(k), uid: kill.uid };
      if (e.t === 'enemyAny') return { side: foe(k), uid: 'hero' };
      const weakest = [...them.board].sort((a, b) => a.hp - b.hp)[0];
      return weakest ? { side: foe(k), uid: weakest.uid } : null;
    }
    if (e.t === 'allyUnit') {
      const best = [...me.board].sort((a, b) => b.atk - a.atk)[0];
      if (best) return { side: k, uid: best.uid };
    }
  }
  return null;
}

function findUnit(B, ref) {
  if (!ref || ref.uid === 'hero') return null;
  return B[ref.side].board.find(u => u.uid === ref.uid) || null;
}

const pickOne = list => (list.length ? list[Math.floor(Math.random() * list.length)] : null);

/**
 * Traduit une cible en destinataires concrets : des unites et/ou un heros.
 * Tout le ciblage passe par ici, donc ajouter une cible au registre ne demande
 * qu'un `case` de plus, jamais de retoucher les effets un par un.
 */
function recipients(B, k, t, target, source) {
  const me = B[k], them = B[foe(k)];
  const unit = (side, u) => ({ kind: 'unit', side, unit: u });
  const hero = side => ({ kind: 'hero', side });

  switch (t) {
    case 'enemyHero': return [hero(foe(k))];
    case 'ownHero': return [hero(k)];
    case 'allEnemyUnits': return them.board.map(u => unit(foe(k), u));
    case 'allAllies': return me.board.filter(u => u !== source).map(u => unit(k, u));
    case 'randomAllyUnit': { const u = pickOne(me.board); return u ? [unit(k, u)] : []; }
    case 'randomEnemyUnit': { const u = pickOne(them.board); return u ? [unit(foe(k), u)] : []; }
    case 'randomEnemyAny': {
      const pool = [...them.board.map(u => unit(foe(k), u)), hero(foe(k))];
      return [pickOne(pool)];
    }
    case 'randomAllyAny': {
      const pool = [...me.board.map(u => unit(k, u)), hero(k)];
      return [pickOne(pool)];
    }
    case 'self':
      // Un sort n'est "lui-meme" de rien : la source doit etre une unite en jeu.
      return source && source.uid && me.board.includes(source) ? [unit(k, source)] : [];
    default: {
      // Cibles designees par le joueur (ou par autoTarget).
      const u = findUnit(B, target);
      if (u) return [unit(target.side, u)];
      if (target && target.uid === 'hero') return [hero(target.side)];
      // Sans cible fournie, seul 'enemyAny' sait retomber sur le heros adverse.
      return t === 'enemyAny' ? [hero(foe(k))] : [];
    }
  }
}

const nameOf = (B, r) => (r.kind === 'hero' ? B[r.side].name : r.unit.name);

// ------------------------------------------------------------------- effets
function applyEffects(B, k, effects, target, source) {
  const me = B[k], them = B[foe(k)];
  for (const e of effects) {
    switch (e.op) {
      case 'dmg': {
        const cibles = recipients(B, k, e.t, target, source);
        if (!cibles.length) { say(B, 'Aucune cible a viser.'); break; }
        for (const r of cibles) {
          say(B, `${e.v} degats a ${nameOf(B, r)}.`);
          if (r.kind === 'hero') damageHero(B, r.side, e.v);
          else damageUnit(B, r.side, r.unit, e.v, source);
        }
        break;
      }
      case 'heal': {
        // On soigne en effacant des degats, jamais en gonflant les PV au-dela du max.
        for (const r of recipients(B, k, e.t, target, source)) {
          if (r.kind === 'hero') {
            const s = B[r.side];
            s.hp = Math.min(s.maxHp, s.hp + e.v);
            say(B, `${s.name} recupere ${e.v} PV.`);
          } else {
            r.unit.damage = Math.max(0, r.unit.damage - e.v);
            say(B, `${r.unit.name} recupere ${e.v} PV.`);
          }
        }
        break;
      }
      case 'buff': {
        const list = recipients(B, k, e.t, target, source).filter(r => r.kind === 'unit').map(r => r.unit);
        for (const u of list) {
          u.baseAtk += e.atk || 0;
          u.baseHp += e.hp || 0;
          if (e.key && !u.baseKeys.includes(e.key)) {
            u.baseKeys.push(e.key);
            if (e.key === 'Charge' && !u.attackedThisTurn) u.canAttack = true;
          }
        }
        if (list.length) say(B, `Renfort : +${e.atk || 0}/+${e.hp || 0} (${list.map(u => u.name).join(', ')}).`);
        break;
      }
      case 'draw': draw(B, k, e.v); break;
      case 'armor': me.armor += e.v; say(B, `${me.name} gagne ${e.v} armure.`); break;
      case 'mana': me.mana += e.v; say(B, `+${e.v} mana.`); break;
      case 'summon': {
        for (let i = 0; i < (e.n || 1); i++) {
          if (me.board.length >= BALANCE.combat.boardSize) break;
          const t = makeUnit({ ...e.unit, sprite: source ? source.sprite : null });
          me.board.push(t);
          checkKeywords(B, t);
        }
        say(B, `${e.n || 1} ${e.unit.name}(s) arrivent.`);
        break;
      }
      default: {
        // Mecanique inventee dans le Card Builder et pas encore implementee ici.
        // On le dit dans le journal plutot que de faire semblant que la carte a marche.
        const def = ALL_EFFECTS[e.op];
        notePending(B, e.op, def ? def.label : e.op);
        break;
      }
    }
    refresh(B);
    checkOver(B);
    if (B.over) return;
  }
}

function notePending(B, id, label) {
  if (!B.pending.includes(id)) B.pending.push(id);
  say(B, `⚠ « ${label} » n'est pas encore codee — la carte n'a rien fait.`);
}

function checkKeywords(B, unit) {
  for (const k of unit.keys) {
    if (ALL_KEYWORDS[k] && ALL_KEYWORDS[k].implemented) continue;
    notePending(B, k, (ALL_KEYWORDS[k] && ALL_KEYWORDS[k].label) || k);
  }
}

function makeUnit(c) {
  const keys = [...(c.keys || [])];
  const u = {
    uid: nextUid(),
    name: c.name,
    baseAtk: c.atk || 0,
    baseHp: c.hp || 0,
    baseKeys: keys,
    damage: 0,
    sprite: c.sprite,
    shield: keys.includes('Bouclier'),
    canAttack: keys.includes('Charge'),
    attackedThisTurn: false,
    aura: c.aura && (c.aura.atk || c.aura.hp || c.aura.key) ? { ...c.aura } : null
  };
  // Les moments accroches a l'unite, copies depuis la carte. Generique : un moment
  // ajoute au registre est transporte sans toucher a cette fonction.
  for (const slot of Object.keys(TRIGGERS)) u[slot] = (c[slot] || []).map(e => ({ ...e }));
  // Valeurs derivees, corrigees des le refresh() qui suit.
  u.atk = u.baseAtk;
  u.maxHp = u.baseHp;
  u.hp = u.baseHp;
  u.keys = [...keys];
  return u;
}

// ---------------------------------------------------------------- jouer/attaquer
export function canPlay(B, k, card) {
  const s = B[k];
  if (s.mana < card.cost) return false;
  if (card.type === 'ally' && s.board.length >= BALANCE.combat.boardSize) return false;
  if (needsTarget(card) && legalTargets(B, k, card).length === 0) {
    // Un sort de degats sans cible d'unite peut toujours viser le heros adverse.
    return (card.play || []).some(e => e.t === 'enemyAny' || !isPick(e.t));
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
    refresh(B);
    checkKeywords(B, source);
    if (source.aura) say(B, `Aura de ${source.name}.`);
  }
  if ((card.play || []).length) applyEffects(B, k, card.play, target, source || card);
  refresh(B);
  resolveDeaths(B);
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
  a.attackedThisTurn = true;
  if (target.uid === 'hero') {
    say(B, `${a.name} frappe ${them.name} pour ${a.atk}.`);
    damageHero(B, foe(k), a.atk);
  } else {
    const d = them.board.find(u => u.uid === target.uid);
    if (!d) return false;
    say(B, `${a.name} (${a.atk}/${a.hp}) attaque ${d.name} (${d.atk}/${d.hp}).`);
    // Les deux coups partent avant qu'on ne ramasse les morts : une unite tuee en
    // attaquant rend quand meme ses degats, et les deux rales se declenchent.
    const riposte = d.atk;
    damageUnit(B, foe(k), d, a.atk, a);
    if (riposte > 0) damageUnit(B, k, a, riposte, d);
  }
  resolveDeaths(B);
  checkOver(B);
  return true;
}
