// Ecran de combat. Le mode auto est l'etat par defaut : le jeu est idle d'abord,
// le mode manuel est une reprise en main volontaire (GDD).
import { BALANCE } from '../config/balance.js';
import { CHAR_BY_ID, characterDeck } from '../config/characters.js';
import { ENCOUNTERS, ENEMY_CARDS } from '../config/world.js';
import { save, team, gain, persist } from '../state.js';
import { relicMods } from '../config/relics.js';
import { TRIGGERS, keyLabel, hasKey } from '../config/mechanics.js';
import { createBattle, playCard, attack, endTurn, canPlay, needsTarget, legalTargets, attackableTargets } from '../combat/engine.js';
import { botAction } from '../combat/ai.js';
import { $, el, asset, toast } from './shell.js';

let B = null;
let auto = true;
let timer = null;
let selCard = null;   // index dans la main
let selUnit = null;   // uid d'une unite prete
let onDone = null;
let ctx = null;

export function buildPlayerSide() {
  const ids = team();
  const chars = ids.map(id => CHAR_BY_ID[id]);
  const deck = ids.flatMap(id => characterDeck(id, save));
  const m = relicMods(save);
  return {
    name: chars.map(c => c.name).join(' & '),
    sprite: chars[0].sprite,
    hp: chars.reduce((a, c) => a + c.stats.hp, 0) + m.hp,
    mana: Math.max(...chars.map(c => c.stats.mana)) + m.mana,
    hand: Math.max(...chars.map(c => c.stats.hand)) + m.hand,
    startArmor: m.armor,
    deck
  };
}

function buildEnemySide(encId) {
  const enc = ENCOUNTERS[encId];
  return {
    name: enc.name,
    sprite: enc.sprite,
    hp: enc.hp,
    mana: enc.mana,
    hand: enc.hand,
    deck: enc.deck.map(id => ({ ...ENEMY_CARDS[id], sprite: enc.sprite }))
  };
}

export function openBattle(node, done) {
  ctx = node;
  onDone = done;
  selCard = selUnit = null;
  auto = true;
  B = createBattle(buildPlayerSide(), buildEnemySide(node.enemy), { node });
  const root = $('#battle');
  root.style.alignItems = '';
  root.style.justifyContent = '';
  root.classList.remove('hidden');
  render();
  loop();
}

function loop() {
  clearTimeout(timer);
  if (!B || B.over) return;
  const isBot = B.turn === 'e' || auto;
  if (!isBot) return;                       // au joueur de jouer
  timer = setTimeout(() => {
    const a = botAction(B, B.turn);
    applyAction(B.turn, a);
    render();
    if (B.over) finish(); else loop();
  }, BALANCE.combat.autoStepMs);
}

function applyAction(k, a) {
  if (!a || a.type === 'end') { endTurn(B); return; }
  if (a.type === 'play') playCard(B, k, a.index, a.target);
  else if (a.type === 'attack') attack(B, k, a.uid, a.target);
}

// ------------------------------------------------------------------ rendu
/** Les moments portes par une carte ou une unite, en une ligne lisible. */
function moments(x) {
  const out = Object.entries(TRIGGERS)
    .filter(([slot, def]) => slot !== 'play' && (x[slot] || []).length)
    .map(([, def]) => def.label);
  if (x.aura) out.push('Aura');
  return out;
}

function unitNode(u, side) {
  const n = el(`
    <div class="unit ${hasKey(u.keys, 'Taunt') ? 'taunt' : ''} ${side === 'p' && u.canAttack && u.atk > 0 ? 'ready' : ''}"
         data-uid="${u.uid}" data-side="${side}">
      ${u.sprite ? `<img src="${asset(u.sprite)}" alt="">` : '<img alt="">'}
      <div class="s"><span class="a">${u.atk}</span> / <span class="h">${u.hp}</span></div>
      ${u.keys.length ? `<div class="kw">${u.keys.map(keyLabel).join(' ')}</div>` : ''}
      ${moments(u).length ? `<div class="kw" style="color:var(--accent2)">◆</div>` : ''}
    </div>`);
  if (selUnit === u.uid) n.classList.add('sel');
  return n;
}

function heroNode(s, k) {
  const pct = Math.max(0, s.hp / s.maxHp * 100);
  // Le mana peut depasser le plafond (mana promis au tour precedent) : on affiche
  // alors les cristaux en trop plutot que de les faire disparaitre.
  const pips = Array.from({ length: Math.max(s.manaCap, s.mana) }, (_, i) =>
    `<i class="pip ${i < s.mana ? 'on' : ''}"></i>`).join('');
  return el(`
    <div class="bt-hero" data-side="${k}" data-uid="hero">
      <img src="${asset(s.sprite)}" alt="">
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600">${s.name} ${s.armor ? '🛡' + s.armor : ''}${s.nextMana ? ' ⧗+' + s.nextMana : ''}</div>
        <div class="hpbar"><i style="width:${pct}%"></i><b>${Math.max(0, s.hp)} / ${s.maxHp}</b></div>
      </div>
      <div class="manapips">${pips}</div>
    </div>`);
}

function handNode() {
  const wrap = el('<div class="bt-hand"></div>');
  B.p.hand.forEach((c, i) => {
    const ok = canPlay(B, 'p', c) && B.turn === 'p' && !auto;
    const n = el(`
      <div class="hcard ${c.type === 'spell' ? 'spell' : ''} ${ok ? '' : 'no'} ${selCard === i ? 'sel' : ''}">
        <div class="cost">${c.cost}</div>
        ${c.sprite ? `<img src="${asset(c.sprite)}" alt="">` : ''}
        <div class="nm">${c.name}</div>
        <div class="tx">${c.text || ''}</div>
        ${moments(c).length ? `<div class="tx" style="color:var(--accent2)">◆ ${moments(c).join(' · ')}</div>` : ''}
        ${c.type === 'ally' ? `<div class="st">${c.atk}/${c.hp}</div>` : ''}
      </div>`);
    n.onclick = () => onCardClick(i);
    wrap.appendChild(n);
  });
  return wrap;
}

function render() {
  const root = $('#battle');
  root.innerHTML = '';

  const top = el('<div class="bt-side"></div>');
  top.appendChild(heroNode(B.e, 'e'));
  root.appendChild(top);

  const eb = el('<div class="board" id="boardE"></div>');
  B.e.board.forEach(u => eb.appendChild(unitNode(u, 'e')));
  root.appendChild(eb);

  const log = el('<div class="bt-log"></div>');
  B.log.slice(-40).forEach(l => log.appendChild(el(`<div>${l}</div>`)));
  root.appendChild(log);

  const pb = el('<div class="board" id="boardP"></div>');
  B.p.board.forEach(u => pb.appendChild(unitNode(u, 'p')));
  root.appendChild(pb);

  const bot = el('<div class="bt-side"></div>');
  bot.appendChild(heroNode(B.p, 'p'));
  root.appendChild(bot);

  root.appendChild(handNode());

  const bar = el(`
    <div class="bt-bar">
      <div class="autochip ${auto ? 'on' : ''}" id="autoChip">${auto ? '▶ Auto' : '✋ Manuel'}</div>
      <div class="grow muted">Deck ${B.p.deck.length + B.p.discard.length} · Tour ${Math.ceil(B.turnNo / 2)}</div>
      <button class="btn" id="endTurn" ${B.turn === 'p' && !auto ? '' : 'disabled'}>Fin du tour</button>
    </div>`);
  root.appendChild(bar);

  bar.querySelector('#autoChip').onclick = () => {
    auto = !auto;
    selCard = selUnit = null;
    render();
    loop();
  };
  bar.querySelector('#endTurn').onclick = () => {
    selCard = selUnit = null;
    endTurn(B);
    render();
    loop();
  };

  // clics de ciblage / attaque
  root.querySelectorAll('[data-uid]').forEach(n => {
    n.addEventListener('click', () => onTargetClick(n.dataset.side, n.dataset.uid));
  });
  highlightTargets(root);
  log.scrollTop = log.scrollHeight;
}

function highlightTargets(root) {
  if (auto || B.turn !== 'p') return;
  let list = [];
  if (selCard !== null) list = legalTargets(B, 'p', B.p.hand[selCard]);
  else if (selUnit) list = attackableTargets(B, 'p', B.p.board.find(u => u.uid === selUnit));
  for (const t of list) {
    const n = root.querySelector(`[data-side="${t.side}"][data-uid="${t.uid}"]`);
    if (n) n.classList.add('targetable');
  }
}

// ------------------------------------------------------------- interactions
function onCardClick(i) {
  if (auto || B.turn !== 'p' || B.over) return;
  const c = B.p.hand[i];
  if (!canPlay(B, 'p', c)) { toast('Pas assez de mana.'); return; }
  if (needsTarget(c) && legalTargets(B, 'p', c).length) {
    selCard = selCard === i ? null : i;
    selUnit = null;
    render();
    return;
  }
  playCard(B, 'p', i, null);
  selCard = null;
  render();
  if (B.over) finish();
}

function onTargetClick(side, uid) {
  if (auto || B.turn !== 'p' || B.over) return;
  // 1) on resout d'abord une carte en attente de cible
  if (selCard !== null) {
    const c = B.p.hand[selCard];
    const legal = legalTargets(B, 'p', c);
    if (legal.some(t => t.side === side && t.uid === uid)) {
      playCard(B, 'p', selCard, { side, uid });
      selCard = null;
      render();
      if (B.over) finish();
    }
    return;
  }
  // 2) sinon on selectionne une de nos unites prete a attaquer
  if (side === 'p' && uid !== 'hero') {
    const u = B.p.board.find(x => x.uid === uid);
    if (u && u.canAttack && u.atk > 0) { selUnit = selUnit === uid ? null : uid; render(); }
    return;
  }
  // 3) sinon on attaque
  if (selUnit) {
    attack(B, 'p', selUnit, { side, uid });
    selUnit = null;
    render();
    if (B.over) finish();
  }
}

// --------------------------------------------------------------- fin de combat
function finish() {
  clearTimeout(timer);
  const enc = ENCOUNTERS[ctx.enemy];
  const win = B.winner === 'p';
  const r = enc.rewards;

  const box = el(`<div>
    <h2>${win ? 'Victoire' : 'Defaite'}</h2>
    <p class="muted">${win ? `${enc.name} est vaincu.` : `${enc.name} tient bon. Reviens plus fort.`}</p>
  </div>`);

  if (win) {
    // Monnaie A : recompense d'exploration. Monnaie B : collecte encore a trancher
    // dans le GDD ("butin de combat" = hypothese) — c'est ce qu'on teste ici.
    gain('A', r.A);
    gain('B', r.B);
    box.appendChild(el(`<p>+${r.A} Fanions · +${r.B} Sceaux</p>`));
    if (ctx.unlocks) {
      save.chars[ctx.unlocks].bossBeaten = true;
      box.appendChild(el(`<p class="muted">${CHAR_BY_ID[ctx.unlocks].name} peut desormais etre achete avec des Fanions.</p>`));
    }
    save.world.cleared[ctx.id] = true;
    persist();
  }

  const btn = el('<button class="btn">Continuer</button>');
  btn.onclick = () => {
    $('#battle').classList.add('hidden');
    $('#battle').innerHTML = '';
    B = null;
    if (onDone) onDone(win);
  };
  box.appendChild(btn);

  const root = $('#battle');
  root.innerHTML = '';
  const sheet = el('<div class="sheet" style="margin:auto"></div>');
  sheet.appendChild(box);
  root.appendChild(sheet);
  root.style.alignItems = 'center';
  root.style.justifyContent = 'center';
}
