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
//   on_X_qui   quand un EVENEMENT se produit (pioche, sort, allie pose, PV perdus,
//              unite tuee, attaque), provoque par toi, l'adversaire ou n'importe qui
//   aura       en continu tant que l'unite est en jeu (pas un effet : un modificateur)
//   statics    en continu aussi, mais sur autre chose que les stats des unites : le
//              cout des cartes en main, les montants des effets, les degats subis par
//              un heros, la pioche et le mana du tour (cf. STATICS dans mechanics.js).
//              Ils ne sont jamais parcourus a la main : staticTotal() les additionne
//              a l'endroit exact ou la valeur est lue.
import { BALANCE } from '../config/balance.js';
import { cardById } from '../config/npcs.js';
import { resolveCard } from '../config/characters.js';
import { ALL_EFFECTS, ALL_KEYWORDS, TRIGGERS, eventSlot, keyId, keyArgs, hasKey, keyFields, counterValue, amountValue, numberParams, cardMatches, describeFilter, cardCost, staticTotal, describeStatic, targetId, targetArg, targetDef } from '../config/mechanics.js';

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
    // Mana promis pour le PROCHAIN tour (effet `mana_au_prochain_tour`). Il s'ajoute
    // au mana du tour et peut donc depasser le mana max : c'est l'interet de l'effet.
    nextMana: 0,
    turns: 0,        // tours joues par ce camp, pour les caracteristiques variables
    aVide: false,    // son deck est epuise : il ne piochera plus (dit une seule fois)
    spellsGame: 0,   // sorts joues par ce camp depuis le debut du combat
    spellsTurn: 0,   // ... et depuis le debut de SON tour (remis a zero a chaque tour)
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
    // Combien de fois chaque moment s'est declenche. Sert aux outils hors-jeu
    // (scripts/check-decks.mjs) a reperer un moment ecrit sur une carte qui ne part
    // jamais en vrai — le journal, lui, se fait tronquer au bout de 120 lignes.
    fired: {},
    eventDepth: 0, // rebonds de « quand X alors Y » en cours (garde-fou anti-boucle)
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
// Le cout d'une carte se lit toujours ici (le mot-cle « Cout X de moins/de plus » peut
// le faire varier d'un tour a l'autre) : l'UI et le bot le prennent au meme endroit.
export { cardCost };

function say(B, msg) {
  B.log.push(msg);
  // Assez long pour qu'un combat entier tienne dedans : c'est ce journal qu'on
  // telecharge pour comprendre une partie, et la fin seule ne dit jamais pourquoi.
  if (B.log.length > 400) B.log.shift();
}

// ------------------------------------------------------------------ pioche
export function draw(B, k, n = 1) {
  const s = B[k];
  for (let i = 0; i < n; i++) {
    // LE DECK NE SE REMELANGE PAS. Finir sa pioche veut dire qu'on ne pioche plus :
    //   - sans ca, « sort a 0 mana qui fait piocher » se rejoue en boucle sans fin ;
    //   - et surtout, un deck plus epais devient un avantage. C'est ce qui recompense
    //     le joueur qui emmene 2 ou 3 compagnons au lieu d'un seul, au lieu de lui
    //     donner l'impression que diluer son deck est une punition.
    // Un camp a sec ne perd pas pour autant : il joue ce qu'il a encore en main et
    // sur le plateau. Quand plus personne ne peut rien faire, beginTurn tranche aux PV.
    if (!s.deck.length) {
      if (!s.aVide) { s.aVide = true; say(B, `${s.name} a fini sa pioche : plus aucune carte a tirer.`); }
      return;
    }
    const c = s.deck.pop();
    if (s.hand.length >= BALANCE.combat.handMax) { say(B, `Main pleine : ${c.name} part a la defausse.`); s.discard.push(c); continue; }
    s.hand.push(c);
    fireEvent(B, k, 'draw');
  }
}

/**
 * Pioche CIBLEE : on cherche dans le deck la premiere carte qui convient au lieu de
 * prendre celle du dessus. On ne fouille pas la defausse — un deck est ce qu'il reste
 * a tirer, et fouiller la defausse ferait des boucles sans fin avec le remelange.
 * `dit` sert au journal quand rien ne correspond.
 */
function drawMatching(B, k, n, convient, dit) {
  const s = B[k];
  let pris = 0;
  for (let i = 0; i < n; i++) {
    // De la fin vers le debut : la fin du tableau est le dessus du deck.
    let idx = -1;
    for (let j = s.deck.length - 1; j >= 0; j--) if (convient(s.deck[j])) { idx = j; break; }
    if (idx < 0) break;
    const c = s.deck.splice(idx, 1)[0];
    if (s.hand.length >= BALANCE.combat.handMax) {
      say(B, `Main pleine : ${c.name} part a la defausse.`);
      s.discard.push(c);
    } else {
      s.hand.push(c);
      say(B, `${s.name} pioche ${c.name}.`);
    }
    pris++;
    fireEvent(B, k, 'draw');   // une pioche reste une pioche
    if (B.over) return pris;
  }
  if (pris < n) say(B, `Rien ${dit} a piocher dans le deck.`);
  return pris;
}

// -------------------------------------------------------------------- types
// Le mot-cle « type:Chien » etiquette une unite. Les types viennent de `baseKeys` et
// pas des auras : une aura ne peut pas donner de valeur a un mot-cle, donc elle ne
// peut pas rendre une unite « Chien » — et on evite un ordre de calcul circulaire
// (une aura qui se donnerait a elle-meme ses propres destinataires).
const typesOf = u => keyArgs(u.baseKeys, 'type');
const shareType = (a, b) => {
  const ta = typesOf(a);
  return ta.length ? typesOf(b).some(t => ta.includes(t)) : false;
};

// -------------------------------------------------- caracteristique variable
// « characteristique_variable:stat:compteur:valeur » : l'attaque et/ou les PV ne sont
// plus ce qui est ecrit sur la carte, ils valent ce que compte un compteur.
//
// C'est un DERIVE, pas un etat : refresh() le recalcule a chaque changement, comme une
// aura. Deux consequences voulues :
//   - la valeur monte et descend toute seule, sans jamais toucher aux degats subis ;
//   - une vie variable qui tombe a 0 tue l'unite au prochain ramassage des morts,
//     exactement comme une aura de +PV qui disparait.
// Les renforts recus en combat s'ajoutent par-dessus : on les retrouve en comparant
// `baseAtk` (qui les cumule) a `printedAtk` (ce que la carte annoncait en arrivant).
const variableDe = u => {
  const k = (u.baseKeys || []).find(x => keyId(x) === 'characteristique_variable');
  return k ? keyFields(k) : null;
};

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
        const scope = src.aura.scope || 'otherAllies';
        if (scope === 'otherAllies') take(src);
        else if (scope === 'sameTypeAllies' && shareType(src, u)) take(src);
      }
      // Auras adverses qui debuffent nos unites.
      for (const src of theirs) {
        if (!src.aura || src.aura.scope !== 'enemyUnits') continue;
        take(src);
      }
      // Socle : ce que la carte annonce, ou le compteur quand la caracteristique varie.
      let socleAtk = u.baseAtk, socleHp = u.baseHp;
      const varia = variableDe(u);
      if (varia) {
        const x = counterValue(varia.src, B, k, u, varia.arg);
        // Les renforts encaisses depuis l'arrivee restent acquis : x + ce qui a ete gagne.
        if (varia.stat === 'atk' || varia.stat === 'both') socleAtk = x + (u.baseAtk - u.printedAtk);
        if (varia.stat === 'hp' || varia.stat === 'both') socleHp = x + (u.baseHp - u.printedHp);
        u.variable = { ...varia, x };
      }
      u.atk = Math.max(0, socleAtk + bAtk);
      u.maxHp = socleHp + bHp;
      u.hp = u.maxHp - u.damage;
      u.keys = [...new Set([...u.baseKeys, ...bKeys])];
      u.types = typesOf(u);
      // Une aura peut donner Charge : l'unite doit alors pouvoir frapper tout de suite.
      if (hasKey(u.keys, 'Charge') && B.turn === k && !u.attackedThisTurn) u.canAttack = true;
    }
  }
}

// ------------------------------------------------------------------- degats
function damageHero(B, k, v) {
  const s = B[k];
  // Un effet statique peut adoucir ou aggraver chaque perte de PV. Ca se joue AVANT
  // l'armure : l'armure encaisse ce qui arrive vraiment jusqu'au heros.
  v = Math.max(0, v + staticTotal(B, k, 'degats_du_heros'));
  if (v <= 0) return;
  if (s.armor > 0) {
    const used = Math.min(s.armor, v);
    s.armor -= used;
    v -= used;
  }
  if (v > 0) s.hp -= v;
  checkOver(B);
  if (v > 0) fireEvent(B, k, 'heroHurt');
}

/** Inflige des degats a une unite. Ne retire personne du plateau : resolveDeaths s'en charge. */
function damageUnit(B, k, u, v, source) {
  if (v <= 0) return;
  if (u.shield) { u.shield = false; say(B, `${u.name} encaisse avec son bouclier.`); return; }
  u.damage += v;
  if (source && source !== u && hasKey(source.keys, 'Venin')) {
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
      B.fired.death = (B.fired.death || 0) + 1;
      say(B, `Rale d'agonie de ${u.name}.`);
      applyEffects(B, k, u.death, autoTarget(B, k, u.death, u), u);
    }
    fireEvent(B, k, 'unitDies');
  }
  if (depth < 8 && !B.over) resolveDeaths(B, depth + 1);
}

/**
 * Ce camp peut-il encore faire QUOI QUE CE SOIT, maintenant ou a son prochain tour ?
 * On regarde large exprès : une carte payable un jour (son cout tient dans son mana
 * maximum) compte, meme s'il n'a pas le mana tout de suite. Sinon on arreterait une
 * partie encore vivante.
 */
function peutAgir(B, k) {
  const s = B[k];
  if (s.deck.length) return true;                       // il piochera encore
  if (s.board.some(u => u.atk > 0)) return true;        // il a de quoi frapper
  return s.hand.some(c => cardCost(c, B, k) <= s.manaCap);
}

/**
 * Fin de partie aux points de vie : le plus haut total l'emporte, egalite = match nul.
 * Cote joueur, l'UI compte le match nul comme une defaite (c'est la regle du jeu).
 */
function finParPv(B, raison) {
  B.over = true;
  B.winner = B.p.hp === B.e.hp ? 'draw' : (B.p.hp > B.e.hp ? 'p' : 'e');
  say(B, `${raison} : ` + (B.winner === 'draw'
    ? `egalite a ${B.p.hp} PV, match nul.`
    : `${B[B.winner].name} l'emporte aux PV (${B.p.hp} contre ${B.e.hp}).`));
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
    B.fired[slot] = (B.fired[slot] || 0) + 1;
    say(B, `${label} — ${u.name}.`);
    applyEffects(B, k, u[slot], autoTarget(B, k, u[slot], u), u);
    resolveDeaths(B);
  }
}

/**
 * Un EVENEMENT vient de se produire du cote `acteur`. Toutes les unites en jeu qui
 * l'ecoutent declenchent leurs effets — celles du camp de l'acteur par « quand tu... »,
 * celles d'en face par « quand l'adversaire... », et tout le monde par « n'importe qui ».
 *
 * On NE ramasse PAS les morts ici : c'est le flux normal (fin de carte, fin d'attaque,
 * debut de tour) qui s'en charge, comme pour les autres effets. Ca evite de retirer une
 * unite du plateau au milieu d'une liste qu'on est en train de parcourir.
 *
 * Le garde-fou est indispensable : « quand tu pioches, pioche » se rappellerait sans
 * fin. Au-dela de quelques rebonds on coupe, et on le dit dans le journal plutot que
 * de laisser le combat se figer.
 */
function fireEvent(B, acteur, ev) {
  if (B.over) return;
  if (B.eventDepth >= 4) {
    say(B, 'La chaine de declenchements est coupee (trop de rebonds).');
    return;
  }
  B.eventDepth++;
  try {
    for (const k of ['p', 'e']) {
      const qui = k === acteur ? 'self' : 'foe';
      for (const slot of [eventSlot(ev, qui), eventSlot(ev, 'any')]) {
        // On fige la liste : une unite qui meurt pendant la sequence ne la casse pas.
        for (const u of [...B[k].board]) {
          if (B.over) return;
          if (!u[slot] || !u[slot].length) continue;
          if (!B[k].board.includes(u)) continue;   // deja partie entre-temps
          B.fired[slot] = (B.fired[slot] || 0) + 1;
          say(B, `${TRIGGERS[slot].label} — ${u.name}.`);
          applyEffects(B, k, u[slot], autoTarget(B, k, u[slot], u), u);
        }
      }
    }
  } finally {
    B.eventDepth--;
  }
}

export function beginTurn(B) {
  if (B.over) return;
  const k = B.turn;
  const s = B[k];
  B.turnNo++;
  // Le combat ne peut pas durer indefiniment : voir BALANCE.combat.maxTurns.
  if (B.turnNo > BALANCE.combat.maxTurns) { finParPv(B, `le combat s'eternise (${BALANCE.combat.maxTurns} tours)`); return; }
  s.turns++;
  s.maxMana = Math.min(s.maxMana + 1, s.manaCap);
  s.mana = s.maxMana;
  s.tempMana = 0;
  s.spellsTurn = 0;
  // Mana statique (« +1 mana par tour tant que je suis la »). Comme le mana promis,
  // il n'est pas plafonne par le mana max : c'est ce que la carte annonce.
  const manaStatique = staticTotal(B, k, 'mana_du_tour');
  if (manaStatique) {
    s.mana = Math.max(0, s.mana + manaStatique);
    say(B, `${s.name} ${manaStatique > 0 ? 'gagne' : 'perd'} ${Math.abs(manaStatique)} mana (effet statique).`);
  }
  if (s.nextMana) {
    // Volontairement au-dessus du mana max : c'est ce que promet l'effet.
    s.mana += s.nextMana;
    say(B, `${s.name} recupere ${s.nextMana} mana promis au tour precedent.`);
    s.nextMana = 0;
  }
  for (const u of s.board) { u.canAttack = true; u.attackedThisTurn = false; }
  // Les deux premiers tours partent de la main de depart. Un effet statique peut faire
  // piocher plus (ou plus rien du tout) : il ne touche que CETTE pioche-la, pas celles
  // qu'une carte declenche.
  if (B.turnNo > 2) draw(B, k, Math.max(0, 1 + staticTotal(B, k, 'pioche_du_tour')));
  // Une caracteristique variable suit un compteur qui bouge SANS qu'aucune carte ne
  // soit jouee : le tour qui avance, la main qui se remplit. Les auras n'avaient pas
  // ce probleme (le plateau ne change qu'en jouant), donc rien ne recalculait ici.
  // resolveDeaths commence par un refresh, et ramasse l'unite dont la vie variable
  // vient de tomber a zero — rale d'agonie compris.
  resolveDeaths(B);
  if (B.over) return;
  // Plus personne ne peut rien faire (plus de pioche, rien de jouable, rien qui
  // frappe) : inutile de tourner dans le vide, on tranche aux PV.
  if (!peutAgir(B, 'p') && !peutAgir(B, 'e')) { finParPv(B, 'plus personne ne peut jouer'); return; }
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
const isPick = t => !!(targetDef(t) && targetDef(t).pick);

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
function autoTarget(B, k, effects, source) {
  const me = B[k], them = B[foe(k)];
  for (const brut of effects) {
    const e = resolveAmounts(B, k, source, brut);
    if (!isPick(e.t)) continue;
    if (e.t === 'enemyUnit' || e.t === 'enemyAny') {
      // Une destruction n'a pas de seuil de PV : n'importe quelle unite tombe, on
      // prend donc la plus genante au lieu de la plus entamee.
      const mortelles = e.op === 'detruit' ? [...them.board] : them.board.filter(u => u.hp <= (e.v || 0));
      const kill = mortelles.sort((a, b) => b.atk - a.atk)[0];
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

/** Compare deux noms de carte sans se faire avoir par les accents ni les majuscules. */
const normalise = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/**
 * Traduit une cible en destinataires concrets : des unites et/ou un heros.
 * Tout le ciblage passe par ici, donc ajouter une cible au registre ne demande
 * qu'un `case` de plus, jamais de retoucher les effets un par un.
 */
function recipients(B, k, t, target, source, last) {
  const me = B[k], them = B[foe(k)];
  const unit = (side, u) => ({ kind: 'unit', side, unit: u });
  const hero = side => ({ kind: 'hero', side });

  switch (targetId(t)) {
    case 'previous':
      // « Lui » : les destinataires du precedent effet de la meme sequence. Les morts
      // ne sont ramassees qu'a la fin de la carte, donc une unite mise a 0 PV par
      // l'effet d'avant est encore la — c'est ce qui permet « inflige 3, puis rend 5 ».
      // Le filtre ne sert qu'a ecarter celles qui ont VRAIMENT quitte le plateau.
      return (last || []).filter(r => r.kind === 'hero' || B[r.side].board.includes(r.unit));
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
    case 'sameTypeAllies': {
      // Comme `allAllies` : le porteur ne se compte pas lui-meme.
      if (!source || !source.uid || !me.board.includes(source)) return [];
      return me.board.filter(u => u !== source && shareType(source, u)).map(u => unit(k, u));
    }
    case 'allyType': {
      // Le type est ecrit dans la cible : aucun besoin de porteur, un sort y a droit.
      const voulu = targetArg(t);
      return voulu ? me.board.filter(u => typesOf(u).includes(voulu)).map(u => unit(k, u)) : [];
    }
    case 'enemyType': {
      const voulu = targetArg(t);
      return voulu ? them.board.filter(u => typesOf(u).includes(voulu)).map(u => unit(foe(k), u)) : [];
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
/**
 * Rend une copie de l'effet ou chaque nombre est un VRAI nombre : un montant variable
 * (« X = tes allies Chien ») est calcule ici, au moment ou l'effet part. C'est le seul
 * endroit qui le fait — le reste du moteur ne voit que des nombres, comme avant.
 * La liste des champs a resoudre vient du registre : un effet qui gagne un parametre
 * numerique en profite sans qu'on touche a cette fonction.
 */
function resolveAmounts(B, k, u, e) {
  const champs = numberParams(e.op);
  if (!champs.length) return e;
  // Un effet statique « tes degats infligent 1 de plus » s'ajoute a chaque nombre de
  // l'effet vise, exactement comme un palier « Amplifie » — mais seulement tant que
  // son porteur tient le plateau.
  const bonus = staticTotal(B, k, 'montant_des_effets', m => m.cible === e.op);
  let copie = null;
  for (const p of champs) {
    if (e[p.k] === undefined) continue;
    if (typeof e[p.k] === 'number' && !bonus) continue;
    copie = copie || { ...e };
    copie[p.k] = Math.max(0, amountValue(e[p.k], B, k, u) + bonus);
  }
  return copie || e;
}

function applyEffects(B, k, effects, target, source) {
  const me = B[k], them = B[foe(k)];
  // Ce que le dernier effet a vise ou cree, pour la cible « Lui ». Les effets sans
  // destinataire (pioche, armure, mana) ne l'ecrasent pas : ils ne coupent pas la chaine.
  let last = [];
  const cible = (t) => recipients(B, k, t, target, source, last);
  for (const brut of effects) {
    const e = resolveAmounts(B, k, source, brut);
    switch (e.op) {
      case 'dmg': {
        const cibles = cible(e.t);
        if (!cibles.length) { say(B, 'Aucune cible a viser.'); break; }
        last = cibles;
        for (const r of cibles) {
          say(B, `${e.v} degats a ${nameOf(B, r)}.`);
          if (r.kind === 'hero') damageHero(B, r.side, e.v);
          else damageUnit(B, r.side, r.unit, e.v, source);
        }
        break;
      }
      case 'detruit': {
        // On ne retire personne du plateau ici : on marque la mort (comme le Venin) et
        // resolveDeaths ramasse, ce qui declenche les rales d'agonie. Le Bouclier ne
        // protege pas — il absorbe une perte de PV, pas une destruction. Un heros dans
        // la liste (via « Lui » ou une cible au hasard) est simplement ignore.
        const cibles = cible(e.t);
        if (!cibles.length) { say(B, 'Aucune cible a detruire.'); break; }
        last = cibles;
        for (const r of cibles) {
          if (r.kind !== 'unit') continue;
          r.unit.damage = r.unit.maxHp;
          r.unit.hp = 0;
          say(B, `${r.unit.name} est detruit.`);
        }
        break;
      }
      case 'heal': {
        // On soigne en effacant des degats, jamais en gonflant les PV au-dela du max.
        const soignes = cible(e.t);
        if (soignes.length) last = soignes;
        for (const r of soignes) {
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
        const recus = cible(e.t).filter(r => r.kind === 'unit');
        if (recus.length) last = recus;
        const list = recus.map(r => r.unit);
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
      case 'cree': {
        // La carte vient du CATALOGUE (cartes libres + cartes des personnages), pas du
        // deck : rien n'est retire nulle part, elle apparait, point.
        const modele = cardById(e.carte);
        if (!modele) { say(B, `« ${e.carte || '?'} » n'existe pas : rien n'est cree.`); break; }
        const combien = e.n === undefined ? 1 : e.n;
        let crees = 0;
        for (let i = 0; i < combien; i++) {
          if (me.hand.length >= BALANCE.combat.handMax) { say(B, 'Main pleine : la carte creee est perdue.'); break; }
          me.hand.push({ ...resolveCard(modele, e.lvl || 1), sprite: modele.sprite || (source ? source.sprite : null) });
          crees++;
        }
        if (crees) say(B, `${me.name} cree ${crees} × ${modele.name}.`);
        break;
      }
      case 'pioche_x': {
        const cherche = normalise(e.carte);
        if (!cherche) { say(B, 'Aucune carte n\'est designee.'); break; }
        drawMatching(B, k, e.n === undefined ? 1 : e.n,
          c => normalise(c.name) === cherche || normalise(c.id) === cherche,
          `qui s'appelle « ${e.carte} »`);
        break;
      }
      case 'pioche_une_carte_de_type': {
        const sort = e.type === 'spell';
        drawMatching(B, k, e.n === undefined ? 1 : e.n,
          c => (c.type === 'ally') !== sort,
          sort ? 'de sort' : 'd\'allie');
        break;
      }
      case 'reduit_le_cout_de': {
        // Les cartes DEJA en main : celles qu'on piochera ensuite gardent leur cout.
        const touchees = me.hand.filter(c => cardMatches(c, e));
        for (const c of touchees) c.cost = Math.max(0, c.cost - e.v);
        say(B, touchees.length
          ? `${describeFilter(e)} : ${e.v} mana de moins (${touchees.map(c => c.name).join(', ')}).`
          : `Aucune carte a alleger dans ta main.`);
        break;
      }
      case 'armor': me.armor += e.v; say(B, `${me.name} gagne ${e.v} armure.`); break;
      case 'mana': me.mana += e.v; say(B, `+${e.v} mana.`); break;
      case 'mana_au_prochain_tour':
        me.nextMana += e.x || 0;
        say(B, `+${e.x || 0} mana au prochain tour.`);
        break;
      case 'summon': {
        // Le jeton porte tout ce que makeUnit sait lire : mots-cles, aura, moments.
        // Les jetons qui viennent d'arriver deviennent le « lui » de l'effet suivant.
        const arrives = [];
        for (let i = 0; i < (e.n || 1); i++) {
          if (me.board.length >= BALANCE.combat.boardSize) break;
          const t = makeUnit({ ...e.unit, sprite: e.unit.sprite || (source ? source.sprite : null) });
          me.board.push(t);
          arrives.push({ kind: 'unit', side: k, unit: t });
          checkKeywords(B, t);
        }
        if (arrives.length) last = arrives;
        say(B, arrives.length ? `${arrives.length} ${e.unit.name}(s) arrivent.` : 'Le plateau est plein : aucune invocation.');
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
    const id = keyId(k);
    if (ALL_KEYWORDS[id] && ALL_KEYWORDS[id].implemented) continue;
    notePending(B, id, (ALL_KEYWORDS[id] && ALL_KEYWORDS[id].label) || id);
  }
}

function makeUnit(c) {
  const keys = [...(c.keys || [])];
  const u = {
    uid: nextUid(),
    name: c.name,
    baseAtk: c.atk || 0,
    baseHp: c.hp || 0,
    // Ce que la carte annoncait en arrivant : sert a distinguer les renforts recus
    // en combat de la ligne de statistiques d'origine (cf. caracteristique variable).
    printedAtk: c.atk || 0,
    printedHp: c.hp || 0,
    baseKeys: keys,
    damage: 0,
    sprite: c.sprite,
    shield: hasKey(keys, 'Bouclier'),
    canAttack: hasKey(keys, 'Charge'),
    attackedThisTurn: false,
    aura: c.aura && (c.aura.atk || c.aura.hp || c.aura.key) ? { ...c.aura } : null,
    // Les effets statiques suivent l'unite : ils agissent tant qu'elle est en jeu et
    // s'arretent avec elle, sans qu'on ait a les retirer de quoi que ce soit.
    statics: (c.statics || []).map(m => ({ ...m }))
  };
  // Les moments accroches a l'unite, copies depuis la carte. Generique : un moment
  // ajoute au registre est transporte sans toucher a cette fonction.
  for (const slot of Object.keys(TRIGGERS)) u[slot] = (c[slot] || []).map(e => ({ ...e }));
  // Valeurs derivees, corrigees des le refresh() qui suit.
  u.atk = u.baseAtk;
  u.maxHp = u.baseHp;
  u.hp = u.baseHp;
  u.keys = [...keys];
  u.types = typesOf(u);
  return u;
}

// ---------------------------------------------------------------- jouer/attaquer
export function canPlay(B, k, card) {
  const s = B[k];
  if (s.mana < cardCost(card, B, k)) return false;
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
  s.mana -= cardCost(card, B, k);
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
    for (const m of source.statics) say(B, `${source.name} : ${describeStatic(m)}.`);
  }
  if (card.type !== 'ally') { s.spellsGame++; s.spellsTurn++; }
  if ((card.play || []).length) {
    B.fired.play = (B.fired.play || 0) + 1;
    applyEffects(B, k, card.play, target, source || card);
  }
  refresh(B);
  resolveDeaths(B);
  // L'evenement part une fois la carte entierement resolue : « quand tu lances un
  // sort » se declenche apres l'effet du sort, pas au milieu.
  fireEvent(B, k, card.type === 'ally' ? 'ally' : 'spell');
  resolveDeaths(B);
  return true;
}

/**
 * Une COPIE independante du combat, pour essayer un coup sans toucher a la vraie
 * partie (c'est ce dont le bot Monte-Carlo a besoin). Tout l'etat est du JSON — des
 * nombres, des chaines, des tableaux d'objets simples — donc structuredClone suffit.
 * `meta` (la rencontre, ses recompenses) n'est jamais modifie : on le partage.
 */
export function cloneBattle(B) {
  const { meta, ...reste } = B;
  const copie = structuredClone(reste);
  copie.meta = meta;
  return copie;
}

export function attackableTargets(B, k, unit) {
  const them = B[foe(k)];
  // Elusif : invisible pour les attaques adverses (mais pas pour les sorts).
  const visibles = them.board.filter(u => !hasKey(u.keys, 'elusif'));
  // Passe-Murailles : les provocations ne l'arretent pas.
  const taunts = unit && hasKey(unit.keys, 'passe_murailles')
    ? [] : visibles.filter(u => hasKey(u.keys, 'Taunt'));
  if (taunts.length) return taunts.map(u => ({ side: foe(k), uid: u.uid }));
  return [...visibles.map(u => ({ side: foe(k), uid: u.uid })), { side: foe(k), uid: 'hero' }];
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
  fireEvent(B, k, 'attack');
  resolveDeaths(B);
  checkOver(B);
  return true;
}
