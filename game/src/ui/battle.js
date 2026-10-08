// Ecran de combat. Le mode auto est l'etat par defaut : le jeu est idle d'abord,
// le mode manuel est une reprise en main volontaire (GDD).
import { BALANCE } from '../config/balance.js';
import { CHAR_BY_ID, characterDeck } from '../config/characters.js';
import { ENCOUNTERS } from '../config/world.js';
import { save, team, gain, persist } from '../state.js';
import { relicMods } from '../config/relics.js';
import { TRIGGERS, COUNTERS, keyLabel, hasKey, cardCost, describeStatic, describeEffect, describeAura, eachSubEffect, momentLabel, branchesDe, listeEffets } from '../config/mechanics.js';
import { createBattle, canPlay, needsTarget, needsChoice, legalTargets, attackableTargets, aurasSur, reprisesPossibles, draw, refresh } from '../combat/engine.js';
import { evt, refUnite, refHeros, refCarte } from '../combat/evenements.js';
import { botAction } from '../combat/ai.js';
import { joue as joueLeCoup, ouvreJournal, fermeJournal, nomDeFichier } from '../combat/journal.js';
import { $, el, asset, toast, modal, closeModal } from './shell.js';
import { ouvreZone } from './zone.js';
import { installeGestes } from './gestes.js';
import { apercuAttaque, apercuCarte, pilule } from './apercu.js';
import { creeJournal } from './journal.js';
import { icone } from './icones.js';
import { gardeCombat } from './combats.js';
import { ouvreRevue } from './revue.js';
import { creeFx } from './effets.js';
import { montreFin } from './fin.js';

let B = null;
let auto = true;
let timer = null;
let selCard = null;   // index dans la main — ou dans la defausse, voir `selZone`
let selZone = 'main'; // d'ou part la carte choisie : 'main', ou 'defausse' (une Reprise)
let selChoix = null;  // la branche choisie sur une carte « Choisir », en attente de cible
let selUnit = null;   // uid d'une unite prete
let onDone = null;
let ctx = null;
// Ce que le doigt est en train de LIRE (appui long), ou null : { kind: 'unit', side, uid } ou
// { kind: 'carte', carte, camp }. Comme la fenetre de zone, la lecture se redessine a chaque
// render() : maintenue pendant le mode auto, elle suit le combat au lieu de mentir.
let lecture = null;
// La fenetre de la defausse est-elle ouverte ? Comme la fiche, elle se redessine a chaque
// render() : ouverte pendant le mode auto, elle suit le combat au lieu de mentir.
let zoneOuverte = false;
// Ce que la fenetre de zone montre en ce moment (sa signature, ses groupes) : on ne la
// redessine QUE si cela a change — un doigt pose sur une carte ne doit pas la voir remplacee.
let zoneSig = null;
let zoneGroupes = [];
// Les noeuds de l'ecran qui ne bougent pas pendant un combat (voir `monteLaCoque`).
let coque = null;
// L'apercu de chaque cible possible du coup engage : « camp:uid » -> { cible, acteur }.
// Vide tant qu'aucune action n'est engagee (voir ui/apercu.js).
let apercus = new Map();
let gestesPoses = false;
// Les effets (chiffres, secousses, morts) : voir ui/effets.js. Crees une fois, rejoues sur chaque combat.
let fx = null;
let rangArrivee = 0;   // le rang des cartes arrivees en main pendant ce rendu (decalage de leur glissade)
// Le fichier JSONL du dernier combat enregistre, garde jusqu'a l'ecran de resultat :
// c'est la qu'on le telecharge (le journal est ferme des que le combat l'est).
let dernierJournal = null;

// ------------------------------------------------ enregistrement des combats
// ETEINT PAR DEFAUT, et il doit le rester : enregistrer coute une copie d'etat par
// decision, et l'idle d'un joueur n'a pas a payer pour un outil de game design.
// Il n'y a pas (encore) d'ecran d'options de developpement : l'interrupteur, c'est
// `?journal=1` dans l'adresse — et il se RETIENT, sinon il faudrait le retaper a
// chaque ouverture de l'app installee. `?journal=0` l'eteint.
const CLE_JOURNAL = 'adventureCard.journalCombats';
function enregistreLesCombats() {
  try {
    const p = new URLSearchParams(location.search).get('journal');
    if (p !== null) localStorage.setItem(CLE_JOURNAL, p === '1' || p === 'true' ? '1' : '0');
    return localStorage.getItem(CLE_JOURNAL) === '1';
  } catch { return false; }   // navigation privee, stockage refuse : on n'enregistre pas
}

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
  selZone = 'main';
  selChoix = null;
  zoneOuverte = false;
  zoneSig = null;
  zoneGroupes = [];
  apercus = new Map();
  coque = null;
  if (!fx) fx = creeFx({
    racine: () => $('#battle'),
    couche: () => coque.fx,
    milieu: () => coque.mid,
    main: () => coque.main,
    defausse: camp => (camp === 'p' ? coque.def : coque.heroE.n),
    heros: camp => (camp === 'p' ? coque.heroP : coque.heroE).n,
    unite: (camp, uid) => (camp === 'p' ? coque.boardP : coque.boardE).firstElementChild._n.get(uid) || null,
    unites: camp => [...(camp === 'p' ? coque.boardP : coque.boardE).firstElementChild.children]
  });
  fx.vide();
  fermeLecture();
  poseLesGestes();
  closeModal();
  auto = true;
  dernierJournal = null;
  // `evenements` : le combat se raconte en donnees (combat/evenements.js), c'est ce que lit le
  // journal graphique. Seul le jeu l'allume — ni le bot, ni les simulations n'en paient le prix.
  B = createBattle(buildPlayerSide(), buildEnemySide(node.enemy), { node, evenements: true });
  if (enregistreLesCombats()) {
    const enc = ENCOUNTERS[node.enemy] || {};
    ouvreJournal(B, {
      source: 'jeu',
      rencontre: { id: node.id, nom: enc.name || node.enemy, adversaire: node.enemy },
      camps: {
        // L'equipe, niveau par niveau et switch par switch : c'est ce qui permet de
        // remonter le deck exact des mois plus tard, quand la sauvegarde aura bouge.
        p: {
          // Le camp du joueur. Qui a REELLEMENT decide se lit decision par decision :
          // le pilote automatique joue pour lui tant qu'il n'a pas repris la main.
          controle: 'humain',
          equipe: team().map(id => ({ id, niveau: save.chars[id].level, switches: [...save.chars[id].switches] })),
          reliques: [...(save.relics || [])]
        },
        e: { controle: 'bot', niveauBot: enc.ia || null }
      }
    });
    // Le nom du fichier porte l'heure de DEBUT du combat : on le prend maintenant.
    dernierJournal = { nom: nomDeFichier(node), texte: null };
  }
  installeTriche();
  const root = $('#battle');
  root.style.alignItems = '';
  root.style.justifyContent = '';
  root.classList.remove('hidden');
  render();
  loop();
}

/** Le calme entre deux coups du mode auto : le pas habituel, ou la fin des effets si elle vient apres. */
function delaiAuto() {
  const f = BALANCE.ui.fx;
  return Math.max(BALANCE.combat.autoStepMs * f.ralenti / fx.vitesse, fx.reste() + f.pauseApresMs * f.ralenti / fx.vitesse);
}

/** La fin du combat attend la fin du film : on voit le dernier coup avant l'ecran de resultat. */
function finirApresLesEffets() {
  clearTimeout(timer);
  timer = setTimeout(finish, fx.reste() + BALANCE.ui.fx.pauseApresMs * BALANCE.ui.fx.ralenti / fx.vitesse);
}

// LA CONSOLE DE TRICHE (F12 : `AC.triche.aide`). Elle sert a VOIR un effet sans attendre que le combat
// le produise : `AC.triche.voir('armure')` pousse un evenement fabrique dans le recit et
// l'ecran le joue comme un vrai. Elle ne touche pas aux regles : les evenements sont de la mise en
// scene (les PV ne changent pas), sauf `gagne`, `perd`, `mana`, `pv` et `pioche`, qui changent la partie.
// ⚠ `gagne()` paie les recompenses de la rencontre, comme une vraie victoire.
function installeTriche() {
  if (!window.AC) return;
  const camp = k => (k === 'p' ? 'p' : 'e');
  const cible = k => (B[k].board[0] ? refUnite(B[k].board[0], k) : refHeros(B, k));
  const pousse = ev => {
    if (!B || B.over || !coque) return 'pas de combat en cours';
    evt(B, ev, null);
    render();
    return 'ok';
  };
  const SCENES = {
    degats: k => ({ t: 'degats', cible: refHeros(B, k), n: 3, perdu: 3, avant: B[k].hp, apres: B[k].hp - 3 }),
    gros: k => ({ t: 'degats', cible: refHeros(B, k), n: 8, perdu: 8, avant: B[k].hp, apres: B[k].hp - 8 }),
    unite: k => ({ t: 'degats', cible: cible(k), n: 2, perdu: 2, avant: 3, apres: 1 }),
    bouclier: k => ({ t: 'degats', cible: cible(k), n: 3, perdu: 0, bouclier: true }),
    venin: k => ({ t: 'degats', cible: cible(k), n: 1, perdu: 4, venin: true }),
    annule: k => ({ t: 'degats', cible: cible(k), n: 3, perdu: 0, annule: true }),
    armure: k => ({ t: 'armure', camp: k, v: 3 }),
    soin: k => ({ t: 'soin', cible: refHeros(B, k), n: 4, soigne: 4, avant: B[k].hp, apres: B[k].hp + 4 }),
    mana: k => ({ t: 'mana', camp: k, v: 2 }),
    manaplus: k => ({ t: 'mana', camp: k, v: 2, promis: true }),
    renfort: k => ({ t: 'renfort', atk: 2, hp: 2, cle: null, cible: cible(k) }),
    tour: k => ({ t: 'tour', camp: k, nom: B[k].name, mana: B[k].mana, maxMana: B[k].maxMana, pv: B[k].hp }),
    invoque: k => ({ t: 'invoque', via: 'jeton', camp: k, unite: cible(k) }),
    carte: k => {
      const c = B[k].hand[0] || B[k].deck[0];
      return c ? { t: 'joue', camp: k, carte: refCarte(c), paye: c.cost, zone: 'main', cible: null, choix: null } : null;
    }
  };
  window.AC.triche = {
    aide: "voir(nom, camp='e') · scenes() · aura(camp='p') · gagne() · perd() · mana(n) · pv(camp, n) · pioche(n) · fx.ralenti = 5",
    scenes: () => Object.keys(SCENES).concat('aura'),
    voir(nom = 'degats', k = 'e') {
      const f = SCENES[nom];
      if (nom === 'aura') return this.aura(k);
      if (!f) return `scene inconnue : ${Object.keys(SCENES).join(', ')}, aura`;
      const ev = f(camp(k));
      return ev ? pousse(ev) : 'rien a montrer';
    },
    // Un allie gagne +1/+1 sans evenement : c'est ce que l'ecran lit comme une aura.
    aura(k = 'p') {
      const u = B && B[camp(k)].board[0];
      if (!u) return 'aucune unite sur ce plateau';
      u.baseAtk += 1; u.baseHp += 1; refresh(B); render();
      return 'ok';
    },
    gagne: () => fin('p'),
    perd: () => fin('e'),
    mana: n => { B.p.mana += n; render(); return B.p.mana; },
    pv: (k, n) => { B[camp(k)].hp = n; render(); return n; },
    pioche: (n = 1) => { draw(B, 'p', n); render(); return B.p.hand.length; }
  };
  function fin(w) {
    if (!B || B.over) return 'pas de combat en cours';
    B.over = true; B.winner = w;
    render();
    finirApresLesEffets();
    return 'ok';
  }
}

function loop() {
  clearTimeout(timer);
  if (!B || B.over) return;
  const isBot = B.turn === 'e' || auto;
  if (!isBot) return;                       // au joueur de jouer
  timer = setTimeout(() => {
    const k = B.turn;
    // L'adversaire peut jouer a un autre niveau que le pilote automatique du joueur :
    // c'est le champ `ia` de la rencontre (GAME CONFIG), un boss a le droit d'etre dur.
    const niveau = k === 'e' ? (ENCOUNTERS[ctx.enemy] || {}).ia : undefined;
    const a = botAction(B, k, niveau);
    if (!joueLeCoup(B, k, a, 'bot', niveau || null)) joueLeCoup(B, k, { type: 'end' }, 'bot', niveau || null);
    render();
    if (B.over) finirApresLesEffets(); else loop();
  }, delaiAuto());
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

// LES NOEUDS QUI NE BOUGENT PAS. L'ecran ne se reconstruit plus a chaque pas : le heros, les
// plateaux, la main et la barre sont crees UNE FOIS par combat (`monteLaCoque`), puis
// `render()` ne fait que les mettre a jour — une unite garde son noeud tant qu'elle est la
// (`syncListe`), et son contenu n'est retouche que s'il a change. C'est ce qui garde le
// defilement de la main entre deux pas du mode auto, et c'est ce qui laisse un doigt pose
// sur une unite la toucher encore 750 ms plus tard : les enfants d'une unite ou d'une carte
// ne recoivent aucun toucher (`pointer-events: none`), le noeud touche est toujours le
// noeud externe, qui ne disparait pas.
/**
 * Met `liste` en correspondance avec les enfants de `wrap`, dans l'ordre : un noeud par
 * element (retrouve par `cle`), cree s'il manque, retire s'il n'y a plus d'element.
 * `maj(noeud, element, rang)` redit l'etat du noeud.
 */
function syncListe(wrap, liste, cle, cree, maj) {
  const noeuds = wrap._n || (wrap._n = new Map());
  const vus = new Set();
  let prec = null;
  liste.forEach((x, rang) => {
    const k = cle(x);
    let n = noeuds.get(k);
    if (!n) { n = cree(x); noeuds.set(k, n); }
    maj(n, x, rang);
    // On ne deplace un noeud que s'il n'est pas deja a sa place : le deplacer coupe parfois
    // le geste d'un doigt pose dessus.
    const attendu = prec ? prec.nextSibling : wrap.firstChild;
    if (attendu !== n) wrap.insertBefore(n, attendu);
    prec = n;
    vus.add(k);
  });
  for (const [k, n] of noeuds) if (!vus.has(k)) { n.remove(); noeuds.delete(k); }
}

function majUnite(n, u, side) {
  n.dataset.side = side;
  n.dataset.uid = u.uid;
  n.dataset.atk = u.atk;
  n.dataset.hp = u.hp;
  const ap = pilule(apercus.get(`${side}:${u.uid}`));
  const sig = [u.name, u.sprite || '', u.atk, u.hp, u.keys.join(','), moments(u).length ? 1 : 0, ap].join('|');
  if (n._sig !== sig) {
    n._sig = sig;
    n.innerHTML = `
      ${u.sprite ? `<img src="${asset(u.sprite)}" alt="">` : '<img alt="">'}
      <div class="un">${u.name}</div>
      <div class="s"><span class="a">${u.atk}</span> / <span class="h">${u.hp}</span></div>
      ${u.keys.length ? `<div class="kw">${u.keys.map(keyLabel).join(' ')}</div>` : ''}
      ${moments(u).length ? `<div class="kw" style="color:var(--accent2)">◆</div>` : ''}
      ${ap ? `<div class="pv">${ap}</div>` : ''}`;
  }
  n.classList.toggle('taunt', hasKey(u.keys, 'Taunt'));
  n.classList.toggle('ready', side === 'p' && u.canAttack && u.atk > 0);
  n.classList.toggle('sel', selUnit === u.uid);
}

function heroNode(k) {
  const n = el(`
    <div class="bt-hero" data-geste="hero" data-side="${k}" data-uid="hero">
      <img alt="">
      <div style="flex:1">
        <div class="hnm"><span class="hn"></span><span class="pv"></span></div>
        <div class="hpbar"><i></i><b></b></div>
      <div class="hinfo"></div>
      </div>
      <div class="manapips"></div>
    </div>`);
  return {
    n, img: n.querySelector('img'), nom: n.querySelector('.hn'), pv: n.querySelector('.pv'),
    info: n.querySelector('.hinfo'), fill: n.querySelector('.hpbar i'), txt: n.querySelector('.hpbar b'), pips: n.querySelector('.manapips')
  };
}

function majHero(h, s, k) {
  const pct = Math.max(0, s.hp / s.maxHp * 100);
  const src = asset(s.sprite);
  if (h.img.getAttribute('src') !== src) h.img.setAttribute('src', src);
  h.nom.textContent = `${s.name} ${s.armor ? '🛡' + s.armor : ''}${s.nextMana ? ' ⧗+' + s.nextMana : ''}`;
  // Ce qu'on peut savoir de la main adverse sans la voir : combien de cartes, et ce qui reste a piocher.
  if (k === 'e') h.info.textContent = `Main ${s.hand.length} · Pioche ${s.deck.length}`;
  h.fill.style.width = `${pct}%`;
  h.txt.textContent = `${Math.max(0, s.hp)} / ${s.maxHp}`;
  // Le mana peut depasser le plafond (mana promis au tour precedent) : on affiche
  // alors les cristaux en trop plutot que de les faire disparaitre.
  const n = Math.max(s.manaCap, s.mana);
  const sigPips = `${n}:${s.mana}`;
  if (h.sigPips !== sigPips) {
    h.sigPips = sigPips;
    h.pips.innerHTML = Array.from({ length: n }, (_, i) => `<i class="pip ${i < s.mana ? 'on' : ''}"></i>`).join('');
  }
  const ap = pilule(apercus.get(`${k}:hero`));
  if (h.sigPv !== ap) { h.sigPv = ap; h.pv.innerHTML = ap; }
}

function majCarte(n, c, i) {
  n.dataset.i = i;
  const ok = canPlay(B, 'p', c) && B.turn === 'p' && !auto;
  // Le cout affiche est celui qu'on va vraiment payer : le mot-cle « Cout X de
  // moins/de plus » peut le faire bouger d'un tour a l'autre, on le signale.
  const cout = cardCost(c, B, 'p');
  const sig = [c.name, cout, c.cost, c.sprite || '', c.text || '', c.type, c.atk, c.hp, moments(c).join('·')].join('|');
  if (n._sig !== sig) {
    n._sig = sig;
    n.innerHTML = `
      <div class="cost" ${cout !== c.cost ? `title="coût de base ${c.cost}" style="color:var(--accent2)"` : ''}>${cout}</div>
      ${c.sprite ? `<img src="${asset(c.sprite)}" alt="">` : ''}
      <div class="nm">${c.name}</div>
      <div class="tx">${c.text || ''}</div>
      ${moments(c).length ? `<div class="tx" style="color:var(--accent2)">◆ ${moments(c).join(' · ')}</div>` : ''}
      ${c.type === 'ally' ? `<div class="st">${c.atk}/${c.hp}</div>` : ''}`;
  }
  n.classList.toggle('spell', c.type === 'spell');
  n.classList.toggle('no', !ok);
  n.classList.toggle('sel', selCard === i && selZone === 'main');
}

function plateauNode(id) {
  return el(`<div class="board" id="${id}"><div class="bwrap"></div></div>`);
}

/** Construit, une fois par combat, tout ce qui ne bouge pas. */
function monteLaCoque(root) {
  root.innerHTML = '';
  const c = {};
  c.fx = el('<div class="fx"></div>');
  const haut = el('<div class="bt-side"></div>');
  c.heroE = heroNode('e');
  haut.appendChild(c.heroE.n);
  root.appendChild(haut);

  c.boardE = plateauNode('boardE');
  root.appendChild(c.boardE);

  // La zone entre les deux plateaux : elle porte le bandeau d'instruction (l'action engagee) et
  // ne recouvre ni l'acteur, ni les cibles. Le journal n'est plus du texte qui mange un tiers de
  // l'ecran : il a son panneau, qu'on ouvre avec l'icone de la barre (ui/journal.js).
  c.mid = el('<div class="bt-mid"></div>');
  root.appendChild(c.mid);
  c.journal = creeJournal({
    evts: () => B.evts,
    heros: { p: { sprite: B.p.sprite }, e: { sprite: B.e.sprite } },
    revele: false,   // en direct, on ne voit pas ce que l'adversaire a en main
    onFerme: () => { if (coque) majBarre(); }
  });
  // Enregistrement en cours : le joueur doit le SAVOIR, une partie ne s'enregistre pas
  // dans son dos. Le point rouge reste dans l'en-tete du journal.
  if (B.journal) c.journal.extra(el('<span class="rec" title="Ce combat est enregistré (journal de décisions)">⏺</span>'));
  // Le journal en TEXTE, telechargeable : c'est l'outil du game designer, plus celui du joueur.
  const dl = el('<button class="jr-dl" title="Télécharger le journal en texte">⬇ texte</button>');
  dl.onclick = () => {
    const texte = [`${B.p.name} contre ${B.e.name} — tour ${B.turnNo}`,
      `PV ${B.p.hp}/${B.p.maxHp} contre ${B.e.hp}/${B.e.maxHp}`, ''].concat(B.log).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + texte], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `combat-${B.e.name.replace(/\s+/g, '-')}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  c.journal.extra(dl);
  root.appendChild(c.journal.n);

  c.boardP = plateauNode('boardP');
  root.appendChild(c.boardP);

  const bas = el('<div class="bt-side"></div>');
  c.heroP = heroNode('p');
  bas.appendChild(c.heroP.n);
  root.appendChild(bas);

  c.main = el('<div class="bt-hand"></div>');
  root.appendChild(c.main);

  c.bar = el(`
    <div class="bt-bar">
      <div class="autochip" id="autoChip"></div>
      <button class="vitesse" id="vitesse" aria-label="Vitesse du combat"></button>
      <button class="ib" id="logBtn" aria-label="Journal du combat">${icone('Log', 24)}<b class="bdg hidden"></b></button>
      <div class="grow muted"><span class="npioche"></span> · <button class="zlink" id="defBtn" title="Voir la défausse"></button> · <span class="ntour"></span></div>
      <button class="btn" id="endTurn">Fin du tour</button>
    </div>`);
  root.appendChild(c.bar);
  c.chip = c.bar.querySelector('#autoChip');
  c.vit = c.bar.querySelector('#vitesse');
  c.vit.onclick = () => { fx.cycleVitesse(); majBarre(); };
  c.def = c.bar.querySelector('#defBtn');
  c.fin = c.bar.querySelector('#endTurn');
  c.npioche = c.bar.querySelector('.npioche');
  c.ntour = c.bar.querySelector('.ntour');
  c.logBtn = c.bar.querySelector('#logBtn');
  c.badge = c.bar.querySelector('.bdg');
  c.logBtn.onclick = () => {
    reinitSelection();
    c.journal.bascule();
    render();
  };
  c.def.onclick = ouvreDefausse;
  c.chip.onclick = () => {
    auto = !auto;
    reinitSelection();
    render();
    loop();
  };
  c.fin.onclick = () => {
    reinitSelection();
    joueLeCoup(B, 'p', { type: 'end' }, 'humain');
    render();
    loop();
  };

  // Le bandeau qui dit ce qu'on attend du joueur pendant une action engagee.
  c.bandeau = el('<div class="bt-bandeau"></div>');
  c.mid.appendChild(c.bandeau);
  root.appendChild(c.fx);
  coque = c;
}

function majBarre() {
  const c = coque;
  // Des sorts a REPRISE a relancer maintenant : le bouton de la defausse le dit, sinon on
  // ne penserait pas a l'ouvrir. A ton tour et en mode manuel seulement — sinon rien ne se
  // joue d'un clic.
  const nbReprises = !auto && B.turn === 'p' && !B.over ? reprisesPossibles(B, 'p').length : 0;
  c.chip.textContent = auto ? '▶ Auto' : '✋ Manuel';
  c.chip.classList.toggle('on', auto);
  c.vit.textContent = `x${fx.vitesse}`;
  c.npioche.textContent = `Pioche ${B.p.deck.length}`;
  c.def.textContent = `Défausse ${B.p.discard.length}${nbReprises ? ' ↺' + nbReprises : ''}`;
  c.def.classList.toggle('pret', !!nbReprises);
  c.ntour.textContent = `Tour ${Math.ceil(B.turnNo / 2)}`;
  c.fin.disabled = !(B.turn === 'p' && !auto);
  // Le badge de l'icone du journal : combien de scenes depuis la derniere fois qu'on l'a ouvert.
  const nl = c.journal.nonLus();
  c.badge.textContent = nl > 9 ? '9+' : String(nl);
  c.badge.classList.toggle('hidden', !nl);
  // Le panneau tient entre le heros adverse et la barre : on lui donne la place qu'ils laissent.
  c.journal.n.style.top = c.heroE.n.parentElement.offsetHeight + 'px';
  c.journal.n.style.bottom = c.bar.offsetHeight + 'px';
}

function render() {
  const root = $('#battle');
  if (!coque) monteLaCoque(root); else fx.photo();
  const c = coque;
  // Une action engagee ne survit pas a un changement de tour ni de mode : on la rend.
  if (!peutEngager()) reinitSelection();

  majHero(c.heroE, B.e, 'e');
  majHero(c.heroP, B.p, 'p');
  syncListe(c.boardE.firstElementChild, B.e.board, u => u.uid, () => el('<div class="unit" data-geste="unit"></div>'), (n, u) => majUnite(n, u, 'e'));
  syncListe(c.boardP.firstElementChild, B.p.board, u => u.uid, () => el('<div class="unit" data-geste="unit"></div>'), (n, u) => majUnite(n, u, 'p'));

  // Le journal ne redessine que les scenes qui ont recu un evenement (et rien s'il est ferme).
  c.journal.maj();

  // Une carte qui arrive en main glisse jusqu'a sa place (CSS), l'une apres l'autre.
  rangArrivee = 0;
  root.style.setProperty('--fx-pioche', BALANCE.ui.fx.piocheMs);
  root.style.setProperty('--fx-pioche-decalage', BALANCE.ui.fx.piocheDecalageMs);
  syncListe(c.main, B.p.hand, carte => carte, () => {
    const n = el('<div class="hcard nouvelle" data-geste="main"></div>');
    n.style.setProperty('--r', rangArrivee++);
    setTimeout(() => n.classList.remove('nouvelle'), 1500 * BALANCE.ui.fx.ralenti);
    return n;
  }, majCarte);
  majBarre();
  majFocus();
  // Les vignettes ne sont mises a l'echelle qu'une fois tout l'ecran en place : c'est
  // la hauteur reellement laissee au plateau par les autres blocs qui decide.
  ajustePlateau(c.boardE);
  ajustePlateau(c.boardP);
  // La lecture ouverte suit le combat plutot que de montrer un etat perime.
  renderLecture();
  renderZone();
  fx.joue(B.evts);
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

// ------------------------------------------------------------ l'action engagee
// TAP = AGIR, APPUI LONG = LIRE (decision du game designer, 8 octobre 2026). Toucher une
// carte jouable ou une unite prete ENGAGE une action : un masque noir tombe sur l'ecran,
// seuls l'acteur et ses cibles restent en couleur et contoures, et chaque cible dit ce qui lui
// arriverait (ui/apercu.js). Toucher une cible joue le coup ; toucher le fond, ou n'importe
// quoi d'autre, l'annule. Lire une carte ou une unite, c'est la maintenir (ui/gestes.js).

/** Peut-on engager une action ? Seulement a son tour, en manuel, tant que le combat dure. */
const peutEngager = () => !!B && !B.over && !auto && B.turn === 'p';
/** Une action est-elle engagee (une carte attend sa cible, ou une unite sa victime) ? */
const engage = () => peutEngager() && (selCard !== null || !!selUnit);

function reinitSelection() {
  selCard = selUnit = null;
  selZone = 'main';
  selChoix = null;
  apercus = new Map();
}

/** Rend la main au joueur : plus d'action engagee, plus de masque. */
function annule() {
  reinitSelection();
  render();
}

/** Calcule l'apercu de chaque cible de l'action qu'on vient d'engager. */
function calculeApercus() {
  apercus = new Map();
  if (selCard !== null) {
    apercus = apercuCarte(B, 'p', selCard, selZone, selChoix, legalTargets(B, 'p', carteChoisie(), selChoix));
  } else if (selUnit) {
    const u = B.p.board.find(x => x.uid === selUnit);
    if (u) apercus = apercuAttaque(B, 'p', selUnit, attackableTargets(B, 'p', u));
  }
}

/** Le masque : l'acteur et ses cibles en couleur, le reste s'eteint (CSS, `#battle.spot`). */
function majFocus() {
  const c = coque, root = $('#battle');
  const actif = engage();
  root.classList.toggle('spot', actif);
  root.querySelectorAll('.lit').forEach(n => n.classList.remove('lit', 'acteur'));
  if (!actif) { c.bandeau.textContent = ''; return; }
  const noeudDe = (side, uid) => uid === 'hero'
    ? (side === 'e' ? c.heroE.n : c.heroP.n)
    : (side === 'e' ? c.boardE : c.boardP).firstElementChild._n.get(uid);
  let acteur = null, cibles = [], texte = '';
  if (selCard !== null) {
    const carte = carteChoisie();
    cibles = legalTargets(B, 'p', carte, selChoix);
    texte = `${carte.name} : choisis une cible`;
    if (selZone === 'main') acteur = c.main._n.get(carte);
  } else {
    const u = B.p.board.find(x => x.uid === selUnit);
    cibles = attackableTargets(B, 'p', u);
    texte = `${u.name} attaque : choisis une cible`;
    acteur = noeudDe('p', u.uid);
  }
  if (acteur) acteur.classList.add('lit', 'acteur');
  for (const t of cibles) {
    const n = noeudDe(t.side, t.uid);
    if (n) n.classList.add('lit');
  }
  c.bandeau.innerHTML = `${texte}<small>Touche le fond pour annuler</small>`;
}

// ------------------------------------------------------------- interactions
/** La carte choisie, qu'elle vienne de la main ou de la defausse (une Reprise). */
const carteChoisie = () => (selCard === null ? null : (selZone === 'defausse' ? B.p.discard : B.p.hand)[selCard]);

/** Pose la carte et remet l'ecran a zero. Le choix de branche part avec elle. */
function joue(i, target) {
  // `zone` n'est ecrit que pour une Reprise : le coup d'une carte de la main garde sa forme.
  joueLeCoup(B, 'p', { type: 'play', index: i, ...(selZone === 'defausse' ? { zone: 'defausse' } : {}), target, choix: selChoix }, 'humain');
  reinitSelection();
  render();
  if (B.over) finirApresLesEffets();
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
  // Une branche est une LISTE d'effets (l'ancienne forme, un effet seul, se lit
  // pareil) : le bouton les dit tous, a la suite. Deux ou trois choix (`branchesDe`).
  for (const cle of branchesDe(choisi)) {
    const branche = listeEffets(choisi[cle]);
    if (!branche.length) continue;
    const b = el('<button class="btn" style="width:100%;margin-top:8px;text-align:left"></button>');
    b.textContent = branche.map(describeEffect).join(', puis ');
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

/** Pourquoi une carte ne se joue pas maintenant, dit au joueur. */
function raisonCarte(c, zone) {
  const cout = cardCost(c, B, 'p', zone);
  if (B.p.mana < cout) return `Pas assez de mana (${cout} requis, ${B.p.mana} disponible${B.p.mana > 1 ? 's' : ''}).`;
  return 'Cette carte ne peut pas être jouée maintenant.';
}

function onCardClick(i, zone = 'main') {
  if (auto || B.turn !== 'p' || B.over) return;
  const c = (zone === 'defausse' ? B.p.discard : B.p.hand)[i];
  if (!c) return;
  if (!canPlay(B, 'p', c, zone)) { toast(raisonCarte(c, zone)); return; }
  // Reclic sur la carte deja choisie : on annule tout, y compris sa branche.
  if (selCard === i && selZone === zone) { annule(); return; }
  selChoix = null;
  const suite = () => {
    // La branche est deja choisie : on ne propose que les cibles qu'ELLE demande.
    if (needsTarget(c, selChoix) && legalTargets(B, 'p', c, selChoix).length) {
      selCard = i;
      selZone = zone;
      selUnit = null;
      calculeApercus();
      render();
      return;
    }
    selZone = zone;
    joue(i, null);
  };
  if (needsChoice(c)) demandeChoix(c, choix => { selChoix = choix; suite(); });
  else suite();
}

/** Pourquoi cette unite n'attaque pas maintenant, ou '' si elle peut. */
function raisonUnite(u) {
  if (u.atk <= 0) return `${u.name} n'a pas d'attaque.`;
  if (u.attackedThisTurn) return `${u.name} a déjà attaqué ce tour.`;
  if (!u.canAttack) return `${u.name} vient d'arriver : elle n'est pas encore prête.`;
  if (!attackableTargets(B, 'p', u).length) return `${u.name} n'a aucune cible possible.`;
  return '';
}

/** Une unite ou un heros est touche : designer sa cible, engager une attaque, ou annuler. */
function tapeUnite(side, uid) {
  if (B.over || !peutEngager()) return;   // en auto ou au tour adverse, le tap ne fait rien : on lit en maintenant
  if (engage() && designe(side, uid)) return;
  const u = side === 'p' ? B.p.board.find(x => x.uid === uid) : null;
  if (!u) { if (engage()) annule(); return; }
  // Une de nos unites : elle prend la place de l'acteur, si elle peut attaquer.
  const raison = raisonUnite(u);
  if (raison) { if (engage()) annule(); toast(raison); return; }
  if (selUnit === uid) { annule(); return; }
  selUnit = uid;
  selCard = null;
  selZone = 'main';
  selChoix = null;
  calculeApercus();
  render();
}

/** Le coup engage vise (side, uid) : on le joue s'il est legal. Rend true si le toucher a servi. */
function designe(side, uid) {
  if (selCard !== null) {
    if (!legalTargets(B, 'p', carteChoisie(), selChoix).some(t => t.side === side && t.uid === uid)) return false;
    joue(selCard, { side, uid });
    return true;
  }
  const u = B.p.board.find(x => x.uid === selUnit);
  if (u && side === 'e' && attackableTargets(B, 'p', u).some(t => t.uid === uid)) {
    joueLeCoup(B, 'p', { type: 'attack', uid: selUnit, target: { side, uid } }, 'humain');
    reinitSelection();
    render();
    if (B.over) finirApresLesEffets();
    return true;
  }
  return false;
}

/**
 * EN AUTO, TOUCHER L'ECRAN REND LA MAIN AU JOUEUR (decision du game designer, 8 octobre 2026) :
 * c'est ce qui rend le bouton Auto/Manuel inutile a trouver. Le tap qui reprend la main ne fait
 * QUE ca — il n'agit pas en meme temps : un tap distrait sur la fenetre de la defausse ne doit
 * pas relancer une Reprise. Lire (appui long) ne reprend pas la main : on regarde jouer le bot,
 * et on lit ce qu'on ne comprend pas.
 */
function reprendLaMain() {
  if (!B || B.over || !auto) return false;
  auto = false;
  reinitSelection();
  render();
  loop();
  toast('Tu reprends la main (mode Manuel).');
  return true;
}

/** Ce qu'un tap fait, selon le noeud `[data-geste]` touche. */
function tape(n) {
  if (reprendLaMain()) return;
  const d = n.dataset;
  if (d.geste === 'unit') tapeUnite(d.side, d.uid);
  else if (d.geste === 'hero') {
    if (engage() && !designe(d.side, 'hero')) annule();
  } else if (d.geste === 'main') {
    if (engage() && selCard === +d.i && selZone === 'main') { annule(); return; }
    onCardClick(+d.i);
  } else if (d.geste === 'zone') {
    const x = (zoneGroupes[+d.g] || { cartes: [] }).cartes.find(y => y.i === +d.i);
    // Seule la defausse du joueur se joue (groupe 0), et seulement une carte eclairee.
    if (!x || +d.g !== 0 || x.etat !== 'on') return;
    closeModal();
    onCardClick(+d.i, 'defausse');
  }
}

/** Un appui long commence : on ouvre la lecture de ce qu'il touche. */
function lisCe(n) {
  const d = n.dataset;
  if (d.geste === 'unit') lecture = { kind: 'unit', side: d.side, uid: d.uid };
  else if (d.geste === 'main') lecture = { kind: 'carte', carte: B.p.hand[+d.i], camp: 'p' };
  else if (d.geste === 'zone') {
    const g = zoneGroupes[+d.g];
    const x = g && g.cartes.find(y => y.i === +d.i);
    if (x) lecture = { kind: 'carte', carte: x.carte, camp: g.camp };
  }
  renderLecture();
}

/** Les ecouteurs, poses une fois pour toutes sur les elements qui ne changent jamais. */
function poseLesGestes() {
  if (gestesPoses) return;
  gestesPoses = true;
  const gestes = { tap: tape, lire: lisCe, finLire: fermeLecture };
  installeGestes($('#battle'), gestes);
  installeGestes($('#modal'), gestes);
  // Toucher le fond (ni une carte, ni une unite, ni un bouton) annule l'action engagee — ou,
  // en Auto, rend la main au joueur.
  $('#battle').addEventListener('pointerup', ev => {
    if (ev.target.closest('[data-geste], button')) return;
    if (engage()) annule();
    else reprendLaMain();
  });
}

// ------------------------------------------------------- la fenetre de la defausse
/**
 * LA DEFAUSSE, vue par la fenetre de zone (ui/zone.js). Les sorts a REPRISE que tu peux
 * relancer MAINTENANT sont eclaires, le reste est grise — mais seulement a ton tour et en
 * mode manuel : sinon rien ne se joue d'un clic, et eclairer mentirait. La plus recente
 * d'abord. Elle montre aussi ton exil et la defausse adverse, en lecture seule.
 */
function ouvreDefausse() {
  fermeLecture();
  reinitSelection();
  zoneOuverte = true;
  zoneSig = null;
  render();
}

function renderZone() {
  if (!zoneOuverte || !B) return;
  const monTour = !auto && B.turn === 'p' && !B.over;
  const recentes = pile => [...pile.keys()].reverse();
  const lecturePile = pile => recentes(pile).map(i => ({ carte: pile[i], i, etat: 'vue' }));
  const moi = recentes(B.p.discard).map(i => {
    const carte = B.p.discard[i];
    const reprise = carte.type !== 'ally' && hasKey(carte.keys, 'reprise');
    const cout = cardCost(carte, B, 'p', reprise ? 'defausse' : 'main');
    if (!monTour) return { carte, i, cout, etat: 'vue', note: reprise ? '↺ Reprise' : '' };
    if (!reprise) return { carte, i, cout, etat: 'off' };
    const ok = canPlay(B, 'p', carte, 'defausse');
    return { carte, i, cout, etat: ok ? 'on' : 'off', note: ok ? '↺ relancer' : (B.p.mana < cout ? '↺ pas assez de mana' : '↺ pas maintenant') };
  });
  // `camp` n'est pas lu par la fenetre : c'est la lecture (appui long) qui en a besoin, pour
  // afficher le cout de la carte du bon cote.
  const groupes = [{ titre: 'Ta défausse', camp: 'p', cartes: moi }];
  if (B.p.exile.length) groupes.push({ titre: 'Ton exil', camp: 'p', cartes: lecturePile(B.p.exile) });
  groupes.push({ titre: 'Défausse adverse', camp: 'e', cartes: lecturePile(B.e.discard) });
  const aReprise = B.p.discard.some(c => c.type !== 'ally' && hasKey(c.keys, 'reprise'));
  const aide = !aReprise ? ''
    : monTour ? 'Touche un sort éclairé pour le relancer : il coûte son prix, puis il est exilé.'
      : 'Les sorts à Reprise se relancent à ton tour, en mode manuel.';
  zoneGroupes = groupes;
  // Le combat continue derriere : on ne redessine QUE si la fenetre a change, sinon un doigt
  // pose sur une carte la verrait remplacee au pas suivant du mode auto.
  const sig = JSON.stringify([aide, groupes.map(g => [g.titre, g.cartes.map(x => [x.carte.inst ?? x.carte.name, x.carte.atk, x.carte.hp, x.etat, x.cout, x.note])])]);
  if (sig === zoneSig && !$('#modal').classList.contains('hidden')) return;
  zoneSig = sig;
  const ancien = $('#modal .sheet');
  const y = ancien ? ancien.scrollTop : 0;
  const sheet = ouvreZone({
    titre: 'Défausse', aide, groupes,
    onClose: () => { zoneOuverte = false; zoneSig = null; zoneGroupes = []; }
  });
  sheet.scrollTop = y;
}

// ------------------------------------------------------------- lecture (appui long)
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

/** Ce qu'une carte ou une unite FAIT : ses moments, son aura, ses effets statiques. */
function blocFait(x) {
  const fait = Object.entries(TRIGGERS)
    .filter(([slot]) => (x[slot] || []).length)
    .map(([slot]) => ligne(momentLabel(slot, x), x[slot].map(describeEffect).join(' · ')));
  if (x.aura) fait.push(ligne('Aura', describeAura(x.aura), 'portée par elle'));
  for (const m of x.statics || []) fait.push(ligne('Statique', describeStatic(m), 'tant qu’elle est en jeu'));
  return bloc('Ce qu’elle fait', fait);
}

/** Les PALIERS d'une carte, debloques ou non, tels que son niveau de resolution les a laisses. */
function blocPaliers(card) {
  if (!card || !(card.tiers || []).length) return null;
  const n = el(`<section><h4>Paliers (niveau ${card.ownerLevel || 0})</h4></section>`);
  for (const t of card.tiers) {
    const on = (card.unlocked || []).includes(t.lvl);
    n.appendChild(el(`<div class="tier ${on ? 'on' : 'off'}">Niveau ${t.lvl} — ${t.text}</div>`));
  }
  return n;
}

/**
 * La fiche d'une unite : la meme unite en grand, avec
 *   - ce qui la MODIFIE en ce moment et D'OU ca vient (auras nommees par leur porteur,
 *     renforts recus, caracteristique variable). C'est tout l'interet de la vue
 *     inspectee : le plateau montre « 4/5 », la fiche explique pourquoi ;
 *   - ce qu'elle FAIT (ses moments, son aura, ses effets statiques) ;
 *   - ses PALIERS, debloques ou non, tels que son niveau de resolution les a laisses.
 * Elle s'ouvre en MAINTENANT l'unite (ui/gestes.js) et se referme quand on la lache : elle
 * n'a donc ni bouton « Attaquer » ni bouton « Fermer ».
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

  // --- ce qu'elle fait, puis ses paliers. Un jeton n'a pas de carte : il n'en a donc pas.
  const bFait = blocFait(u);
  if (bFait) box.appendChild(bFait);
  const bPaliers = blocPaliers(u.card);
  if (bPaliers) box.appendChild(bPaliers);

  // --- etat
  const etat = [];
  if (u.atk <= 0) etat.push('0 attaque : elle ne frappe pas');
  else if (u.canAttack) etat.push('prête à attaquer');
  else if (u.attackedThisTurn) etat.push('a déjà attaqué ce tour');
  else etat.push('pas encore prête');
  if (u.shield) etat.push('bouclier intact');
  box.appendChild(el(`<div class="src">${etat.join(' · ')}</div>`));
  return box;
}

/** La fiche d'une CARTE (main, defausse, exil) : ce que la vignette n'a pas la place de dire. */
function ficheCarte(c, camp) {
  const box = el('<div class="insp"></div>');
  const cout = cardCost(c, B, camp);
  const ally = c.type === 'ally';
  box.appendChild(el(`
    <div class="tete">
      ${c.sprite ? `<img src="${asset(c.sprite)}" alt="">` : '<img alt="">'}
      <div style="min-width:0">
        <div class="nm">${c.name}</div>
        <div class="stats">${ally ? `<span class="a">⚔ ${c.atk}</span> · <span class="h">❤ ${c.hp}</span>` : 'Sort'}</div>
        <div class="src">Coût ${cout}${cout !== c.cost ? ` (de base ${c.cost})` : ''} · ${ally ? 'Allié' : 'Sort'}</div>
        <div class="chips">${(c.keys || []).map(x => `<span class="chip">${keyLabel(x)}</span>`).join('')}</div>
      </div>
    </div>`));
  if (c.text) box.appendChild(ligne('Texte', c.text));
  const bFait = blocFait(c);
  if (bFait) box.appendChild(bFait);
  const bPaliers = blocPaliers(c);
  if (bPaliers) box.appendChild(bPaliers);
  return box;
}

/** Le panneau de lecture : flotte au-dessus de tout, ne recoit aucun toucher (le doigt qui lit reste sur sa carte). */
function panneauLecture() {
  let p = $('#lecture');
  if (!p) {
    p = el('<div id="lecture" class="lecture hidden"></div>');
    $('#app').appendChild(p);
  }
  return p;
}

function fermeLecture() {
  lecture = null;
  const p = $('#lecture');
  if (p) { p.classList.add('hidden'); p.replaceChildren(); }
}

/** Redessine la lecture ouverte, ou la ferme si ce qu'elle lisait n'est plus la. */
function renderLecture() {
  if (!lecture || !B) return;
  let contenu = null;
  if (lecture.kind === 'unit') {
    const u = B[lecture.side].board.find(x => x.uid === lecture.uid);
    if (u) contenu = inspectNode(u, lecture.side);
  } else if (lecture.carte) {
    contenu = ficheCarte(lecture.carte, lecture.camp);
  }
  if (!contenu) { fermeLecture(); return; }
  const sheet = el('<div class="sheet"></div>');
  sheet.appendChild(contenu);
  sheet.appendChild(el('<div class="src">Relâche pour fermer</div>'));
  const p = panneauLecture();
  p.replaceChildren(sheet);
  p.classList.remove('hidden');
}

// --------------------------------------------------------------- fin de combat
function finish() {
  clearTimeout(timer);
  fx.vide();
  zoneOuverte = false;
  fermeLecture();
  closeModal();
  coque = null;
  // Le journal se ferme avec le combat : c'est la derniere ligne (`fin`) qui rend le
  // fichier verifiable — nombre de decisions, etat final, vainqueur.
  if (B.journal && dernierJournal) dernierJournal.texte = fermeJournal(B);
  const enc = ENCOUNTERS[ctx.enemy];
  const win = B.winner === 'p';
  const r = enc.rewards;
  // Le combat est GARDE (les derniers) : c'est lui qu'on rouvre en AFK pour comprendre.
  const idRecit = gardeCombat({
    nom: enc.name, gagnant: B.winner, tours: Math.ceil(B.turnNo / 2), equipe: B.p.name,
    heros: { p: B.p.sprite, e: B.e.sprite }, evts: B.evts
  });

  const recompenses = [];
  const notes = [];
  if (win) {
    // Monnaie A : recompense d'exploration. Monnaie B : collecte encore a trancher
    // dans le GDD ("butin de combat" = hypothese) — c'est ce qu'on teste ici.
    gain('A', r.A);
    gain('B', r.B);
    recompenses.push({ label: 'Fanions', n: r.A }, { label: 'Sceaux', n: r.B });
    // Un boss peut annoncer un heros qui n'existe plus (le Grand Mechant Loup annonce `fox`, devenu
    // `cameleon`) : sans cette garde la victoire plantait avant l'ecran de fin.
    if (ctx.unlocks && save.chars[ctx.unlocks] && CHAR_BY_ID[ctx.unlocks]) {
      save.chars[ctx.unlocks].bossBeaten = true;
      notes.push(`${CHAR_BY_ID[ctx.unlocks].name} peut désormais être acheté avec des Fanions.`);
    }
    save.world.cleared[ctx.id] = true;
    persist();
  }

  const ferme = () => {
    $('#battle').classList.add('hidden');
    $('#battle').classList.remove('spot');
    $('#battle').innerHTML = '';
    B = null;
    if (onDone) onDone(win);
  };
  const boutons = [];
  // Perdre ne coute rien : on relance tout de suite la meme rencontre (la victoire, elle, paie
  // des recompenses — la rejouer en boucle est une question d'economie, pas d'interface).
  if (!win) boutons.push({ texte: 'Réessayer', primaire: true, onClick: () => { const n = ctx, d = onDone; B = null; openBattle(n, d); } });
  boutons.push({ texte: win ? 'Continuer' : 'Retour', primaire: win, onClick: ferme });
  if (idRecit) boutons.push({ texte: 'Revoir le combat', onClick: () => ouvreRevue(idRecit) });
  // Le journal de DECISIONS, en JSONL : ce que le joueur avait, ce qu'il pouvait jouer, ce que le
  // bot aurait joue a sa place (outil du game designer : on le telecharge a la main).
  if (dernierJournal && dernierJournal.texte) {
    boutons.push({ texte: '⬇ Journal de décisions', onClick: () => {
      const url = URL.createObjectURL(new Blob([dernierJournal.texte], { type: 'application/x-ndjson' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = dernierJournal.nom;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } });
  }

  // L'ecran de fin se pose par-dessus le plateau, qui reste visible derriere.
  const root = $('#battle');
  root.classList.remove('spot');
  montreFin({
    racine: root, issue: win ? 'victoire' : (B.winner === 'e' ? 'defaite' : 'nul'),
    sousTitre: win ? `${enc.name} est vaincu.` : `${enc.name} tient bon. Reviens plus fort.`,
    recompenses, notes, boutons
  });
}
