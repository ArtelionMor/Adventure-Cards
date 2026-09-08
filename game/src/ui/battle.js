// Ecran de combat. Le mode auto est l'etat par defaut : le jeu est idle d'abord,
// le mode manuel est une reprise en main volontaire (GDD).
import { BALANCE } from '../config/balance.js';
import { CHAR_BY_ID, characterDeck } from '../config/characters.js';
import { ENCOUNTERS } from '../config/world.js';
import { save, team, gain, persist } from '../state.js';
import { relicMods } from '../config/relics.js';
import { TRIGGERS, COUNTERS, keyLabel, hasKey, cardCost, describeStatic, describeEffect, describeAura, eachSubEffect, momentLabel } from '../config/mechanics.js';
import { createBattle, playCard, attack, endTurn, canPlay, needsTarget, needsChoice, legalTargets, attackableTargets, aurasSur } from '../combat/engine.js';
import { botAction } from '../combat/ai.js';
import { $, el, asset, toast, modal, closeModal } from './shell.js';

let B = null;
let auto = true;
let timer = null;
let selCard = null;   // index dans la main
let selChoix = null;  // la branche choisie sur une carte « Choisir », en attente de cible
let selUnit = null;   // uid d'une unite prete
let onDone = null;
let ctx = null;
// L'unite dont la fiche est ouverte, ou null. On la garde par identifiant et non par
// reference : le combat continue derriere la fiche (mode auto), donc elle se redessine
// a chaque render() et se ferme d'elle-meme si l'unite meurt.
let insp = null;   // { side, uid }

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
    // Le deck du PNJ vient des donnees du builder, deja resolu carte par carte.
    deck: enc.deck.map(c => ({ ...c, sprite: c.sprite || enc.sprite }))
  };
}

export function openBattle(node, done) {
  ctx = node;
  onDone = done;
  selCard = selUnit = null;
  fermeFiche();
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
    // L'adversaire peut jouer a un autre niveau que le pilote automatique du joueur :
    // c'est le champ `ia` de la rencontre (GAME CONFIG), un boss a le droit d'etre dur.
    const a = botAction(B, B.turn, B.turn === 'e' ? (ENCOUNTERS[ctx.enemy] || {}).ia : undefined);
    applyAction(B.turn, a);
    render();
    if (B.over) finish(); else loop();
  }, BALANCE.combat.autoStepMs);
}

function applyAction(k, a) {
  if (!a || a.type === 'end') { endTurn(B); return; }
  if (a.type === 'play') playCard(B, k, a.index, a.target, a.choix);
  else if (a.type === 'attack') attack(B, k, a.uid, a.target);
}

// ------------------------------------------------------------------ rendu
/** Les moments portes par une carte ou une unite, en une ligne lisible. */
function moments(x) {
  const out = Object.entries(TRIGGERS)
    .filter(([slot, def]) => slot !== 'play' && (x[slot] || []).length)
    .map(([, def]) => def.label);
  if (x.aura) out.push('Aura');
  // Un effet statique se lit en entier : c'est lui qui explique pourquoi une carte
  // de la main coute soudain moins cher.
  for (const m of x.statics || []) out.push(describeStatic(m));
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
    // Le cout affiche est celui qu'on va vraiment payer : le mot-cle « Cout X de
    // moins/de plus » peut le faire bouger d'un tour a l'autre, on le signale.
    const cout = cardCost(c, B, 'p');
    const n = el(`
      <div class="hcard ${c.type === 'spell' ? 'spell' : ''} ${ok ? '' : 'no'} ${selCard === i ? 'sel' : ''}">
        <div class="cost" ${cout !== c.cost ? `title="coût de base ${c.cost}" style="color:var(--accent2)"` : ''}>${cout}</div>
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

  const eb = plateauNode(B.e.board, 'e', 'boardE');
  root.appendChild(eb);

  const log = el('<div class="bt-log"></div>');
  B.log.slice(-40).forEach(l => log.appendChild(el(`<div>${l}</div>`)));
  root.appendChild(log);
  // Le journal complet, telechargeable : l'ecran n'en montre que la fin, et c'est
  // justement le debut du combat qu'on relit quand on cherche a comprendre.
  const dl = el('<button class="btn ghost" style="font-size:11px;padding:4px 10px;align-self:flex-end">⬇ journal</button>');
  dl.onclick = () => {
    const texte = [`${B.p.name} contre ${B.e.name} — tour ${B.turnNo}`,
      `PV ${B.p.hp}/${B.p.maxHp} contre ${B.e.hp}/${B.e.maxHp}`, ''].concat(B.log).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + texte], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `combat-${B.e.name.replace(/\s+/g, '-')}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  root.appendChild(dl);

  const pb = plateauNode(B.p.board, 'p', 'boardP');
  root.appendChild(pb);

  const bot = el('<div class="bt-side"></div>');
  bot.appendChild(heroNode(B.p, 'p'));
  root.appendChild(bot);

  root.appendChild(handNode());

  const bar = el(`
    <div class="bt-bar">
      <div class="autochip ${auto ? 'on' : ''}" id="autoChip">${auto ? '▶ Auto' : '✋ Manuel'}</div>
      <div class="grow muted">Pioche ${B.p.deck.length} · Défausse ${B.p.discard.length} · Tour ${Math.ceil(B.turnNo / 2)}</div>
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
  // Les vignettes ne sont mises a l'echelle qu'une fois tout l'ecran en place : c'est
  // la hauteur reellement laissee au plateau par les autres blocs qui decide.
  ajustePlateau(eb);
  ajustePlateau(pb);
  // La fiche ouverte suit le combat plutot que de montrer un etat perime.
  renderInspect();
}

function plateauNode(board, side, id) {
  const n = el(`<div class="board" id="${id}"><div class="bwrap"></div></div>`);
  const wrap = n.firstElementChild;
  board.forEach(u => wrap.appendChild(unitNode(u, side)));
  return n;
}

// L'ECHELLE DES VIGNETTES. Le plateau n'a plus de plafond d'unites (boardSize = 0), et
// il ne defile pas : quand il y a trop de monde, on retrecit. On mesure la place
// disponible et une vignette, puis on cherche la plus GRANDE echelle a laquelle tout
// tient. Le wrapper est elargi de 1/echelle avant d'etre reduit d'autant : les retours
// a la ligne se calculent alors sur la largeur reelle, et le bloc reduit fait pile la
// largeur du plateau.
const ECHELLE_MIN = 0.28;   // en dessous, plus rien n'est lisible : on laisse deborder
function ajustePlateau(board) {
  const wrap = board.firstElementChild;
  if (!wrap) return;
  const n = wrap.children.length;
  // On repart de l'etat « tout tient » : largeur libre, echelle 1, centrage par la
  // grille. C'est aussi cet etat qu'on mesure juste apres.
  wrap.style.width = '';
  wrap.style.placeSelf = '';
  wrap.style.setProperty('--u', 1);
  wrap.style.setProperty('--dy', '0px');
  if (!n) return;
  // La boite de contenu, padding deduit (6px de chaque cote, cf. `.board`). Il faut la
  // valeur EXACTE : trop prudent ici, on descalerait un plateau qui tenait deja — le
  // plateau se dimensionne sur son contenu, donc « ca tient » et « ca ne tient pas »
  // sont a un pixel l'un de l'autre. Le liftage « prete a attaquer » (3px) deborde dans
  // le padding, que `overflow: hidden` ne coupe pas.
  const W = board.clientWidth - 12, H = board.clientHeight - 12;
  const gap = 6;
  // offsetWidth/offsetHeight ignorent la transformation : c'est bien la taille a
  // l'echelle 1 qu'on lit. La hauteur varie d'une vignette a l'autre (mots-cles,
  // losange des moments), on prend la plus haute.
  const uw = wrap.children[0].offsetWidth;
  let uh = 0;
  for (const c of wrap.children) uh = Math.max(uh, c.offsetHeight);
  if (W <= 0 || H <= 0 || !uw || !uh) return;
  // Ca tient deja ? On le MESURE au lieu de le calculer : les lignes n'ont pas toutes
  // la meme hauteur, et un calcul par la plus haute ferait retrecir un plateau qui
  // tenait. En dessous du plafond, la hauteur du plateau EST celle de son contenu, donc
  // ce test est exact.
  if (wrap.offsetHeight <= H) return;
  for (let s = 0.98; s > ECHELLE_MIN; s -= 0.02) {
    const parLigne = Math.max(1, Math.floor((W / s + gap) / (uw + gap)));
    const lignes = Math.ceil(n / parLigne);
    if ((lignes * (uh + gap) - gap) * s <= H) return echelle(board, wrap, W, s);
  }
  echelle(board, wrap, W, ECHELLE_MIN);
}

function echelle(board, wrap, W, s) {
  // Elargi de 1/echelle, le bloc deborde du plateau — et une grille recale un element
  // trop grand sur son bord de depart au lieu de le centrer. On l'ancre donc en haut a
  // gauche : reduit d'autant, il fait pile la largeur du plateau.
  wrap.style.placeSelf = 'start';
  wrap.style.width = (W / s) + 'px';
  wrap.style.setProperty('--u', s);
  // La largeur posee, le bloc tient sur MOINS de lignes qu'avant — et comme le plateau
  // se dimensionne sur son contenu, il vient de retrecir d'autant. On RELIT donc sa
  // hauteur ici : la centrer sur celle d'avant pousserait le bloc hors du cadre, ou il
  // serait coupe. `offsetHeight` ignore la transformation, d'ou le * s.
  const H = board.clientHeight - 12;
  wrap.style.setProperty('--dy', Math.max(0, (H - wrap.offsetHeight * s) / 2) + 'px');
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
/** Pose la carte et remet l'ecran a zero. Le choix de branche part avec elle. */
function joue(i, target) {
  playCard(B, 'p', i, target, selChoix);
  selCard = null;
  selChoix = null;
  render();
  if (B.over) finish();
}

/**
 * « CHOISIR » : la carte demande laquelle de ses deux branches part. On pose la
 * question AVANT la cible — la branche peut changer ce qu'on vise. Fermer la fenetre
 * sans repondre annule la pose : rien n'est joue, rien n'est paye.
 */
function demandeChoix(card, done) {
  let choisi = null;
  for (const e of card.play || []) eachSubEffect(e, x => { if (!choisi && x.op === 'choisir') choisi = x; });
  if (!choisi) { done(null); return; }
  const box = el(`<div><h3 style="margin:0 0 4px">${card.name}</h3><p class="muted" style="margin:0">Choisis un effet.</p></div>`);
  let boutons = 0;
  for (const cle of ['a', 'b']) {
    const branche = choisi[cle];
    if (!branche || !branche.op) continue;
    const b = el('<button class="btn" style="width:100%;margin-top:8px;text-align:left"></button>');
    b.textContent = describeEffect(branche);
    b.onclick = () => { closeModal(); done(cle); };
    box.appendChild(b);
    boutons++;
  }
  // Une carte dont les branches sont vides (elle est en cours d'ecriture dans le
  // builder) ne doit pas ouvrir une fenetre sans bouton, ou le joueur resterait
  // coince : on la joue, et le journal dira que le choix ne proposait rien.
  if (!boutons) { done(null); return; }
  modal(box, () => {});
}

function onCardClick(i) {
  if (auto || B.turn !== 'p' || B.over) return;
  const c = B.p.hand[i];
  if (!canPlay(B, 'p', c)) { toast('Pas assez de mana.'); return; }
  // Reclic sur la carte deja choisie : on annule tout, y compris sa branche.
  if (selCard === i) { selCard = null; selChoix = null; render(); return; }
  const suite = () => {
    // La branche est deja choisie : on ne propose que les cibles qu'ELLE demande.
    if (needsTarget(c, selChoix) && legalTargets(B, 'p', c, selChoix).length) {
      selCard = i;
      selUnit = null;
      render();
      return;
    }
    joue(i, null);
  };
  if (needsChoice(c)) demandeChoix(c, choix => { selChoix = choix; suite(); });
  else suite();
}

// Le clic sur une unite OUVRE SA FICHE — c'est le comportement par defaut, valable en
// mode auto comme pendant le tour adverse : lire une unite ne coute jamais un coup.
// Il n'agit que quand une action est deja engagee : une carte qui attend sa cible, une
// unite qui attend sa victime. Attaquer se declenche donc depuis la fiche, ou le joueur
// voit enfin ce qu'il envoie au combat.
function onTargetClick(side, uid) {
  if (B.over) return;
  const monTour = !auto && B.turn === 'p';
  // 1) une carte attend sa cible : le clic la designe.
  if (monTour && selCard !== null) {
    const c = B.p.hand[selCard];
    if (legalTargets(B, 'p', c, selChoix).some(t => t.side === side && t.uid === uid)) joue(selCard, { side, uid });
    return;
  }
  // 2) une de nos unites attend sa victime : le clic frappe. Une cible illegale
  //    (une Provocation en travers) ne fait pas perdre le clic : on tombe sur la fiche.
  if (monTour && selUnit && side === 'e') {
    const u = B.p.board.find(x => x.uid === selUnit);
    if (u && attackableTargets(B, 'p', u).some(t => t.uid === uid)) {
      attack(B, 'p', selUnit, { side, uid });
      selUnit = null;
      render();
      if (B.over) finish();
      return;
    }
  }
  // 3) sinon, la fiche. Le heros n'en a pas : sa banniere affiche deja tout.
  if (uid === 'hero') return;
  if (!B[side].board.some(x => x.uid === uid)) return;
  insp = { side, uid };
  renderInspect();
}

// ------------------------------------------------------------- vue inspectee
/** Une ligne « Titre : texte », avec sa source en gris quand il y en a une. */
function ligne(titre, texte, source) {
  const src = source ? ` <span class="src">— ${source}</span>` : '';
  return el(`<div class="ln"><b>${titre}</b><span>${texte}${src}</span></div>`);
}

function bloc(titre, lignes) {
  if (!lignes.length) return null;
  const n = el(`<section><h4>${titre}</h4></section>`);
  lignes.forEach(l => n.appendChild(l));
  return n;
}

/**
 * La fiche d'une unite : la meme unite en grand, avec
 *   - ce qui la MODIFIE en ce moment et D'OU ca vient (auras nommees par leur porteur,
 *     renforts recus, caracteristique variable). C'est tout l'interet de la vue
 *     inspectee : le plateau montre « 4/5 », la fiche explique pourquoi ;
 *   - ce qu'elle FAIT (ses moments, son aura, ses effets statiques) ;
 *   - ses PALIERS, debloques ou non, tels que son niveau de resolution les a laisses.
 */
function inspectNode(u, side) {
  const box = el('<div class="insp"></div>');
  const blesse = u.damage ? ` · ${u.damage} dégât${u.damage > 1 ? 's' : ''} subi${u.damage > 1 ? 's' : ''}` : '';
  box.appendChild(el(`
    <div class="tete">
      ${u.sprite ? `<img src="${asset(u.sprite)}" alt="">` : '<img alt="">'}
      <div style="min-width:0">
        <div class="nm">${u.name}</div>
        <div class="stats"><span class="a">⚔ ${u.atk}</span> · <span class="h">❤ ${Math.max(0, u.hp)}/${u.maxHp}</span></div>
        <div class="src">${side === 'p' ? 'Ton allié' : 'Unité adverse'}${blesse}</div>
        <div class="chips">${u.keys.map(x => `<span class="chip">${keyLabel(x)}</span>`).join('')}</div>
      </div>
    </div>`));

  // --- ce qui la modifie en ce moment, et par qui
  const mods = [];
  const dAtk = u.baseAtk - u.printedAtk, dHp = u.baseHp - u.printedHp;
  const signe = v => (v >= 0 ? '+' : '') + v;
  if (dAtk || dHp) mods.push(ligne('Renforts', `${signe(dAtk)}/${signe(dHp)}`, 'reçus en combat'));
  if (u.variable) {
    const c = COUNTERS[u.variable.src];
    const quoi = u.variable.stat === 'both' ? 'attaque et vie' : u.variable.stat === 'hp' ? 'vie' : 'attaque';
    const dit = (c ? c.label.toLowerCase() : u.variable.src) + (c && c.needsArg ? ` « ${u.variable.arg || '?'} »` : '');
    mods.push(ligne('Variable', `${quoi} = ${u.variable.x}`, dit));
  }
  // Les auras : le combat n'en garde que le total, `aurasSur` retrouve les porteurs.
  // Depuis que le plateau n'a plus de plafond, neuf Chiots donnent neuf fois la meme
  // aura : on les compte au lieu d'ecrire neuf fois la meme ligne.
  const parPorteur = new Map();
  for (const a of aurasSur(B, side, u)) {
    const dit = describeAura(a.src.aura);
    const cle = `${a.src.name}|${a.camp}|${dit}`;
    const vu = parPorteur.get(cle);
    if (vu) vu.n++;
    else parPorteur.set(cle, { n: 1, dit, nom: a.src.name, camp: a.camp });
  }
  for (const a of parPorteur.values()) {
    mods.push(ligne('Aura', a.dit, `${a.n > 1 ? a.n + ' × ' : ''}${a.nom} (${a.camp === side ? 'allié' : 'en face'})`));
  }
  if (mods.length) mods.unshift(ligne('Imprimé', `${u.printedAtk}/${u.printedHp}`, 'ce que la carte annonçait'));
  const bMods = bloc('Ce qui la modifie', mods);
  if (bMods) box.appendChild(bMods);

  // --- ce qu'elle fait
  const fait = Object.entries(TRIGGERS)
    .filter(([slot]) => (u[slot] || []).length)
    .map(([slot]) => ligne(momentLabel(slot, u), u[slot].map(describeEffect).join(' · ')));
  if (u.aura) fait.push(ligne('Aura', describeAura(u.aura), 'portée par elle'));
  for (const m of u.statics || []) fait.push(ligne('Statique', describeStatic(m), 'tant qu’elle est en jeu'));
  const bFait = bloc('Ce qu’elle fait', fait);
  if (bFait) box.appendChild(bFait);

  // --- ses paliers. Un jeton n'a pas de carte : il n'en a donc pas.
  const card = u.card;
  if (card && (card.tiers || []).length) {
    const n = el(`<section><h4>Paliers (niveau ${card.ownerLevel || 0})</h4></section>`);
    for (const t of card.tiers) {
      const on = (card.unlocked || []).includes(t.lvl);
      n.appendChild(el(`<div class="tier ${on ? 'on' : 'off'}">Niveau ${t.lvl} — ${t.text}</div>`));
    }
    box.appendChild(n);
  }

  // --- etat et actions
  const etat = [];
  if (u.atk <= 0) etat.push('0 attaque : elle ne frappe pas');
  else if (u.canAttack) etat.push('prête à attaquer');
  else if (u.attackedThisTurn) etat.push('a déjà attaqué ce tour');
  else etat.push('pas encore prête');
  if (u.shield) etat.push('bouclier intact');
  box.appendChild(el(`<div class="src">${etat.join(' · ')}</div>`));

  const actions = el('<div class="actions"></div>');
  const monTour = !auto && B.turn === 'p' && !B.over;
  if (monTour && side === 'p' && u.canAttack && u.atk > 0) {
    const choisie = selUnit === u.uid;
    const b = el(`<button class="btn">${choisie ? '✖ Annuler' : '⚔ Attaquer'}</button>`);
    b.onclick = () => {
      selUnit = choisie ? null : u.uid;
      selCard = null;
      fermeFiche();
      render();
      if (selUnit) toast('Choisis la cible.');
    };
    actions.appendChild(b);
  }
  const f = el('<button class="btn ghost">Fermer</button>');
  f.onclick = fermeFiche;
  actions.appendChild(f);
  box.appendChild(actions);
  return box;
}

function fermeFiche() {
  insp = null;
  closeModal();
}

/** Redessine la fiche ouverte, ou la ferme si son unite n'est plus la. */
function renderInspect() {
  if (!insp || !B) return;
  const u = B[insp.side].board.find(x => x.uid === insp.uid);
  if (!u) { fermeFiche(); return; }
  // Le combat continue derriere : on redessine sans faire sauter la lecture en cours.
  const ancien = $('#modal .sheet');
  const y = ancien ? ancien.scrollTop : 0;
  const sheet = modal(inspectNode(u, insp.side), () => { insp = null; });
  sheet.scrollTop = y;
}

// --------------------------------------------------------------- fin de combat
function finish() {
  clearTimeout(timer);
  fermeFiche();
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
