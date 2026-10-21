// Ecran de combat. Le mode auto est l'etat par defaut : le jeu est idle d'abord,
// le mode manuel est une reprise en main volontaire (GDD).
import { BALANCE } from '../config/balance.js';
import { CHAR_BY_ID, CHARACTERS, characterDeck } from '../config/characters.js';
import { ENCOUNTERS } from '../config/world.js';
import { save, team, gain, persist, gagneXp, noteCombatArene, etatArene, signale } from '../state.js';
import { coteEnnemi } from '../config/ennemis.js';
import { relicMods } from '../config/relics.js';
import { TRIGGERS, EVENT_TRIGGERS, COUNTERS, keyLabel, hasKey, typesOf, cardCost, describeStatic, describeEffect, describeAura, eachSubEffect, momentLabel, branchesDe, listeEffets } from '../config/mechanics.js';
import { createBattle, canPlay, needsTarget, needsChoice, legalTargets, attackableTargets, aurasSur, reprisesPossibles, draw, refresh, nbFatigue, pileDeFatigue } from '../combat/engine.js';
import { evt, refUnite, refHeros, refCarte } from '../combat/evenements.js';
import { botAction } from '../combat/ai.js';
import { joue as joueMoteur, ouvreJournal, fermeJournal, nomDeFichier, texteJournal } from '../combat/journal.js';
import { enregistre, joueEtNote, sousGraine, rejoue, pas, debutDuTour, toursJoues } from '../combat/rejeu.js';
import { $, el, asset, toast, modal, closeModal } from './shell.js';
import { ouvreZone } from './zone.js';
import { installeGestes } from './gestes.js';
import { apercuAttaque, apercuCarte, pilule } from './apercu.js';
import { creeJournal } from './journal.js';
import { icone, urlIcone, BRUME, OEIL } from './icones.js';

// L'OEIL D'UNE CARTE A REGLE « QUAND X » (maquette du game designer, 20 oct. 2026) : pose en grand sur le bord haut de la
// carte, ferme tant que rien ne se passe. Quand la regle se declenche, ui/effets.js (`oeil`) l'ouvre ici meme, etape par
// etape, en notant l'etape sur le noeud (`data-oeil`) : un redessin de la carte pendant l'animation garde l'oeil ou il en est.
const veille = x => EVENT_TRIGGERS.some(s => (x[s] || []).length);
const oeilDeCarte = n => `<div class="oeil-carte"><img src="${urlIcone(OEIL[Number(n.dataset.oeil) || 0])}" alt=""></div>`;
// LES MOTS-CLES DESSINES (pictos.js, `DESSINES`) : sur le PLATEAU, ils se voient sur l'unite au lieu d'un picto. Venin =
// la fiole sur le bord haut (a cote de l'oeil s'il y en a un), Elusif = la brume, Bouclier = le badge (et le halo d'or,
// classe `bouclier`) ; la Provocation est le bouclier de pierre de la classe `taunt` (skins/juice.css). En MAIN, rien de
// tout ca (« on ne voit plus rien sur la carte », 21 oct. 2026) : les pictos, en grille quand ils debordent.
const fiole = oeil => `<div class="fiole${oeil ? ' oeil-aussi' : ''}">${icone('Venom', 30)}</div>`;
const brume = () => `<div class="brume">${BRUME.map((f, i) => `<img class="b${i}" src="${urlIcone(f)}" alt="">`).join('')}</div>`;
const ecu = () => `<div class="ecu">${icone('Shield', 34)}</div>`;
import { gardeCombat, chargeCombat } from './combats.js';
import { ouvreRevue } from './revue.js';
import { creeFx } from './effets.js';
import { montreFin } from './fin.js';
import { ligneDePictos } from './pictos.js';
import { fabrique } from './vfx-scenes.js';
import { cardById } from '../config/npcs.js';
import { couleurDuType } from '../config/familles.js';
import { ligneSource, lignesDeFait, lignesDeRenforts } from './fiche.js';
import { skinCourant, skinSuivant, ecouteSkin, fondDuCombat } from './skin.js';   // l'habillage du combat (skins/*.css), AC.skin(), son fond

let B = null;
let auto = true;
let timer = null;
let selCard = null;   // index dans la main — ou dans la defausse, voir `selZone`
let selZone = 'main'; // d'ou part la carte choisie : 'main', ou 'defausse' (une Reprise)
let selChoix = null;  // la branche choisie sur une carte « Choisir », en attente de cible
let selUnit = null;   // uid d'une unite prete
let onDone = null;
let enPause = false;  // le menu est ouvert : le mode Auto attend
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
// Les cartes de l'adversaire qui volent encore vers sa main (ui/effets.js) : son eventail ne les montre qu'arrivees.
let dosEnVol = 0;
// LES PV MONTRES (« camp:hero » ou « camp:uid » -> PV) : tant que le coup n'a pas touche, l'ecran garde les PV d'avant —
// ui/effets.js les pose ici et les fait descendre a l'impact. Sans entree, on montre ceux du moteur.
const pvMontres = new Map();
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
// REVOIR LE COMBAT (combat/rejeu.js, demande du game designer, 21 oct. 2026). `enreg` : le combat EN COURS s'enregistre
// (depart, graine, actions) pour qu'on puisse le rejouer ; `rejeu` : on est en train d'en REJOUER un — personne ne joue,
// le combat avance tout seul, et les fleches des bords sautent d'un tour a l'autre.
let enreg = null;
let rejeu = null;
// LES PLACES DU PLATEAU (21 oct. 2026) : une unite qui MEURT garde sa place (un noeud invisible, `partante`) jusqu'a la
// fin de son animation de mort ; c'est ui/effets.js qui la libere (`acces.libere`), et ses voisines glissent alors.
let evtsRendus = 0;            // les evenements deja vus par `render()` : les morts neuves sont dans la suite
let mortsAVenir = new Set();   // « camp:uid » des unites dont la mort va se jouer     // { donnees, etat: { B, rng, i, derive }, pause, apres }

/**
 * TOUTE ACTION passe par ici (puis par `joue()` de combat/journal.js) : sous la graine du combat, et inscrite pour
 * « Revoir le combat ». Le nom est celui qu'avaient les appels avant le rejeu : ils n'ont pas change.
 */
function joueLeCoup(B, k, action, controle = 'bot', niveau = null) {
  return enreg ? joueEtNote(enreg, B, k, action, controle, niveau) : joueMoteur(B, k, action, controle, niveau);
}

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

// `niveau` : celui de l'arene (config/ennemis.js applique le profil de progression de l'ennemi jusque-la).
function buildEnemySide(encId, niveau = 1) {
  const enc = niveau > 1 ? { ...ENCOUNTERS[encId], ...coteEnnemi(encId, niveau) } : ENCOUNTERS[encId];
  return {
    name: enc.name,
    sprite: enc.sprite,
    hp: enc.hp,
    mana: enc.mana,
    hand: enc.hand,
    startArmor: enc.startArmor || 0,
    startMana: enc.startMana || 0,
    // Le deck du PNJ vient des donnees du builder, deja resolu carte par carte.
    deck: enc.deck.map(c => ({ ...c, sprite: c.sprite || enc.sprite }))
  };
}

export function openBattle(node, done, { rejeu: donnees = null, apres = null } = {}) {
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
    plateau: camp => (camp === 'p' ? coque.boardP : coque.boardE),
    pioche: () => coque.npioche,
    // La pioche et la main d'un camp (l'adversaire : sa pile en haut a gauche, son eventail de dos en haut a droite).
    piocheDe: camp => (camp === 'p' ? coque.npioche : coque.piocheE.n),
    mainDe: camp => (camp === 'p' ? coque.main : coque.eventail),
    dos: () => DOS_DE_CARTE,
    dosEnVol: d => { dosEnVol = Math.max(0, dosEnVol + d); if (coque && B) majEventail(coque); },
    // Les PV a montrer pour un heros (`uid` 'hero') ou une unite ; `null` rend ceux du moteur. Seul ce noeud est redessine.
    pv: (camp, uid, v) => {
      const k = `${camp}:${uid}`;
      if (v === null) pvMontres.delete(k); else pvMontres.set(k, v);
      if (!coque || !B) return;
      if (uid === 'hero') { majHero(camp === 'p' ? coque.heroP : coque.heroE, B[camp], camp); return; }
      const u = B[camp].board.find(x => x.uid === uid);
      const n = (camp === 'p' ? coque.boardP : coque.boardE).firstElementChild._n.get(uid);
      if (u && n) majUnite(n, u, camp);
    },
    // Les cartes de ta main qui viennent d'arriver (pas encore animees) : `nouvelle`, posee par `render()`.
    nouvellesEnMain: () => [...coque.main.children].filter(n => n.classList.contains('nouvelle')),
    main: () => coque.main,
    defausse: camp => (camp === 'p' ? coque.def : coque.defE.n),
    heros: camp => (camp === 'p' ? coque.heroP : coque.heroE).n,
    unite: (camp, uid) => (camp === 'p' ? coque.boardP : coque.boardE).firstElementChild._n.get(uid) || null,
    // Les unites vivantes : pas les places gardees pour une mort en cours (`partante`).
    unites: camp => [...(camp === 'p' ? coque.boardP : coque.boardE).firstElementChild.children].filter(n => !n._partante),
    // Une unite morte a fini son animation : sa place se libere, ses voisines glissent.
    libere: (camp, uid) => {
      const board = coque && (camp === 'p' ? coque.boardP : coque.boardE);
      const n = board && [...board.firstElementChild.children].find(x => x._partante && x.dataset.uid === uid);
      if (n) glisse(board, () => n.remove());
    },
    // Un changement de plateau qui deplace des unites (une arrivee) : ses voisines glissent a leur nouvelle place.
    change: (camp, fn) => { const board = coque && (camp === 'p' ? coque.boardP : coque.boardE); if (board) glisse(board, fn); else fn(); },
    ajuste: camp => { if (coque) ajustePlateau(camp === 'p' ? coque.boardP : coque.boardE); },
    // Les unites qu'une aura touche VRAIMENT, par la regle du moteur (`aurasSur`) : l'onde d'aura (ui/effets.js) n'eclaire
    // qu'elles — un corbeau a cote d'une aura « alliés du même type » de lapins reste eteint.
    sousAura: (camp, uid) => {
      const src = B && B[camp].board.find(u => u.uid === uid);
      if (!src) return [];
      return ['p', 'e'].flatMap(k => B[k].board.filter(u => aurasSur(B, k, u).some(a => a.src === src)).map(u => ({ camp: k, uid: u.uid })));
    }
  });
  fx.vide();
  fermeLecture();
  poseLesGestes();
  closeModal();
  auto = true;
  enPause = false;
  dernierJournal = null;
  fx.remetVitesse();
  // `evenements` : le combat se raconte en donnees (combat/evenements.js), c'est ce que lit le
  // journal graphique. Seul le jeu l'allume — ni le bot, ni les simulations n'en paient le prix.
  if (donnees) {
    // UN REJEU : le combat recree depuis son depart, avec son hasard ; rien ne se paie, rien ne s'enregistre.
    enreg = null;
    rejeu = { donnees, etat: rejoue(donnees, 0), pause: false, apres };
    B = rejeu.etat.B;
  } else {
    // UN VRAI COMBAT : les camps vont au moteur tels quels, l'enregistrement en garde une copie prise AVANT (createBattle
    // les touche), et le combat nait sous la graine — sa main de depart se rejouera a l'identique.
    rejeu = null;
    const depart = { p: buildPlayerSide(), e: buildEnemySide(node.enemy, node.niveau || 1) };
    const opts = { node, evenements: true };
    enreg = enregistre(depart, opts);
    B = sousGraine(enreg.rng, () => createBattle(depart.p, depart.e, opts));
  }
  if (!rejeu && enregistreLesCombats()) {
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
  evtsRendus = 0;
  installeTriche();
  const root = $('#battle');
  root.style.alignItems = '';
  root.style.justifyContent = '';
  // Le decor : celui de l'arene, ou celui que le joueur a choisi dans son Profil (ui/skin.js, skins/cozy.css).
  root.dataset.fond = fondDuCombat(node);
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
    aide: "voir(nom, camp='e') · effet(moment, camp='p') · scenes() · aura(camp='p') · gagne() · perd() · mana(n) · pv(camp, n) · pioche(n) · fx.ralenti = 5",
    scenes: () => Object.keys(SCENES).concat('aura'),
    voir(nom = 'degats', k = 'e') {
      const f = SCENES[nom];
      if (nom === 'aura') return this.aura(k);
      if (!f) return `scene inconnue : ${Object.keys(SCENES).join(', ')}, aura`;
      const ev = f(camp(k));
      return ev ? pousse(ev) : 'rien a montrer';
    },
    // La carte-effet d'une unite : `effet('death' | 'turnStart' | 'turnEnd' | 'autre', camp)` — son premier allie
    // « declenche », et la carte-effet montre ce que ca a cause (ici 2 degats au heros d'en face).
    effet(moment = 'death', k = 'p') {
      const c = camp(k), u = B && B[c].board[0];
      if (!u) return 'aucune unite sur ce plateau';
      const i = evt(B, { t: 'declenche', moment, camp: c, src: refUnite(u, c) }, null);
      const autre = c === 'p' ? 'e' : 'p';
      evt(B, { t: 'degats', cible: refHeros(B, autre), n: 2, perdu: 2, avant: B[autre].hp, apres: B[autre].hp - 2 }, i);
      render();
      return 'ok';
    },
    // Le VFX d'une carte (ui/vfx.js) : `vfx('cat_pounce', 'p')` joue la carte pour de faux — son lancer, puis ce qu'elle
    // cause (des degats sur le heros d'en face, un renfort sur ton premier allie, ou l'arrivee de ton premier allie).
    vfx(id = 'cat_pounce', k = 'p', moment = 'jouer') {
      const c = cardById(id);
      if (!c) return `carte inconnue : voir AC.triche.vfxListe()`;
      const cp = camp(k), autre = cp === 'p' ? 'e' : 'p';
      const u = B[cp].board[0];
      const src = u ? { ...refUnite(u, cp), id: c.id, nom: c.name } : refHeros(B, cp);
      const ev = (e, cause = null) => evt(B, e, cause);
      fabrique(c, moment, { ev, src, allies: B[cp].board.slice(1).map(x => refUnite(x, cp)), ennemis: B[autre].board.map(x => refUnite(x, autre)), heroP: refHeros(B, cp), heroE: refHeros(B, autre) });
      render();
      return 'ok';
    },
    vfxListe: () => CHARACTERS.flatMap(h => [...h.cards, ...(h.switches || [])].map(c => ({ id: c.id, nom: `${h.name} · ${c.name}` }))),
    // Un allie gagne +1/+1 sans evenement : c'est ce que l'ecran lit comme une aura.
    aura(k = 'p') {
      const u = B && B[camp(k)].board[0];
      if (!u) return 'aucune unite sur ce plateau';
      if (enreg) enreg.triche = true;
      u.baseAtk += 1; u.baseHp += 1; refresh(B); render();
      return 'ok';
    },
    gagne: () => fin('p'),
    perd: () => fin('e'),
    mana: n => { triche(); B.p.mana += n; render(); return B.p.mana; },
    pv: (k, n) => { triche(); B[camp(k)].hp = n; render(); return n; },
    pioche: (n = 1) => { triche(); draw(B, 'p', n); render(); return B.p.hand.length; },
    // Les journaux a telecharger : outils du game designer, pas du joueur (ils ne sont plus ni dans le Menu, ni a l'ecran de
    // fin). `decisions()` marche aussi apres la fin du combat : c'est le dernier journal de decisions (`?journal=1`).
    texte: () => (B ? (telechargeTexte(), 'ok') : 'pas de combat en cours'),
    decisions: () => {
      const texte = (B && B.journal && texteJournal(B)) || (dernierJournal && dernierJournal.texte);
      if (!texte) return 'aucun journal de decisions (?journal=1 dans l\'adresse pour en enregistrer)';
      telecharge(texte, dernierJournal ? dernierJournal.nom : 'combat.jsonl', 'application/x-ndjson');
      return 'ok';
    }
  };
  // Une triche qui change la partie la rend impossible a rejouer : elle n'est plus le fruit de ses actions.
  function triche() { if (enreg) enreg.triche = true; }
  function fin(w) {
    if (!B || B.over) return 'pas de combat en cours';
    triche();
    B.over = true; B.winner = w;
    render();
    finirApresLesEffets();
    return 'ok';
  }
}

// LE PANNEAU DE TRICHE (telephone) : les memes commandes que `AC.triche`, en boutons. On l'ouvre en touchant
// CINQ FOIS le « Tour N » de la barre (2 s au plus) ; il n'existe pour personne d'autre, rien ne l'affiche.
function panneauTriche() {
  const scenes = [['Dégâts', 'degats'], ['Gros coup', 'gros'], ['Unité', 'unite'], ['Bouclier', 'bouclier'], ['Venin', 'venin'], ['Annulé', 'annule'],
    ['Armure', 'armure'], ['Soin', 'soin'], ['Mana', 'mana'], ['Mana +', 'manaplus'], ['Renfort', 'renfort'], ['Tour', 'tour'], ['Invoque', 'invoque'], ['Carte jouée', 'carte']];
  const effets = [['Effet : mort', 'death'], ['Effet : début', 'turnStart'], ['Effet : fin', 'turnEnd'], ['Effet : règle', 'autre']];
  let camp = 'p', ralenti = 1;
  const n = el(`<div class="triche">
    <div class="tr-tete"><b>Triche</b><span class="tr-res"></span><button class="tr-ferme">Fermer</button></div>
    <div class="tr-grille"></div></div>`);
  const grille = n.querySelector('.tr-grille'), res = n.querySelector('.tr-res');
  const T = () => window.AC && window.AC.triche;
  const bouton = (texte, fn, classe = '') => {
    const b = el(`<button class="${classe}"></button>`);
    b.textContent = texte;
    b.onclick = () => { try { const r = fn(); res.textContent = r === undefined ? '' : String(r); } catch (e) { res.textContent = e.message; } };
    grille.appendChild(b);
    return b;
  };
  const cb = bouton('Camp : toi', () => { camp = camp === 'p' ? 'e' : 'p'; cb.textContent = camp === 'p' ? 'Camp : toi' : 'Camp : adversaire'; }, 'large');
  for (const [t, nom] of scenes) bouton(t, () => T().voir(nom, camp));
  for (const [t, m] of effets) bouton(t, () => T().effet(m, camp));
  bouton('Aura +1/+1', () => T().aura(camp));
  // Le VFX d'une carte, au choix : la liste de ui/vfx.js, un bouton pour la jouer pour de faux.
  const choix = el('<select class="large"></select>');
  for (const c of (T() ? T().vfxListe() : [])) choix.appendChild(new Option(`${c.nom} (${c.id})`, c.id));
  grille.appendChild(choix);
  const quand = el('<select class="large"></select>');
  for (const [v, l] of [['jouer', 'Quand on la joue / la pose'], ['attaque', 'Quand elle attaque'], ['mort', 'Quand elle meurt'], ['debut', 'Début de tour'], ['fin', 'Fin de tour'], ['regle', 'Sa règle « quand X »']]) quand.appendChild(new Option(l, v));
  grille.appendChild(quand);
  bouton('Jouer ce VFX', () => T().vfx(choix.value, camp, quand.value), 'large');
  const sk = bouton(`Skin : ${skinCourant()}`, () => skinSuivant());
  ecouteSkin(nom => { sk.textContent = `Skin : ${nom}`; });
  bouton('+1 mana', () => T().mana(1));
  bouton('Pioche', () => T().pioche(1));
  const rb = bouton('Ralenti ×1', () => { ralenti = ralenti === 1 ? 5 : ralenti === 5 ? 10 : 1; window.AC.fx.ralenti = ralenti; rb.textContent = `Ralenti ×${ralenti}`; });
  bouton('Gagner (paie)', () => T().gagne(), 'danger');
  bouton('Perdre', () => T().perd(), 'danger');
  n.querySelector('.tr-ferme').onclick = () => n.classList.remove('ouvert');
  // Le panneau est a lui : un toucher ici n'est ni une action de jeu ni un « toucher le fond ».
  for (const e of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) n.addEventListener(e, ev => ev.stopPropagation());
  return n;
}

function loop() {
  if (rejeu) { boucleRejeu(); return; }
  clearTimeout(timer);
  if (!B || B.over || enPause) return;
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
function syncListe(wrap, liste, cle, cree, maj, garde = null) {
  const noeuds = wrap._n || (wrap._n = new Map());
  const vus = new Set();
  let prec = null;
  // Une place gardee (`partante`, voir `garde`) n'est pas dans la liste : on la saute sans la deplacer, elle reste ou
  // etait son unite.
  const suivant = n => { while (n && n._partante) n = n.nextSibling; return n; };
  // Les places a garder sont marquees AVANT de ranger la liste : sinon les unites suivantes passaient devant la place de
  // l'unite morte, et le plateau se reorganisait quand meme.
  if (garde) {
    const restent = new Set(liste.map(cle));
    for (const [k, n] of noeuds) if (!restent.has(k) && garde(n)) { n._partante = true; n.classList.add('partante'); n.removeAttribute('data-geste'); noeuds.delete(k); }
  }
  liste.forEach((x, rang) => {
    const k = cle(x);
    let n = noeuds.get(k);
    if (!n) { n = cree(x); noeuds.set(k, n); }
    maj(n, x, rang);
    // On ne deplace un noeud que s'il n'est pas deja a sa place : le deplacer coupe parfois
    // le geste d'un doigt pose dessus.
    const attendu = suivant(prec ? prec.nextSibling : wrap.firstChild);
    if (attendu !== n) wrap.insertBefore(n, attendu);
    prec = n;
    vus.add(k);
  });
  for (const [k, n] of noeuds) {
    if (vus.has(k)) continue;
    noeuds.delete(k);
    n.remove();
  }
}

/**
 * LES VOISINES GLISSENT (FLIP) : `fn` change le plateau (retire une place, montre une unite qui arrive) ; on note ou
 * etait chaque unite avant, on remet le plateau a l'echelle, puis chacune part de son ancienne place vers la nouvelle
 * (`translate` : `transform` est aux animations d'ui/effets.js).
 */
function glisse(board, fn) {
  const wrap = board.firstElementChild;
  const avant = new Map([...wrap.children].map(n => [n, n.getBoundingClientRect()]));
  fn();
  ajustePlateau(board);
  const u = parseFloat(wrap.style.getPropertyValue('--u')) || 1;
  const ms = BALANCE.ui.fx.glisseMs * fx.reglage.ralenti / fx.vitesse;
  for (const n of wrap.children) {
    const a = avant.get(n);
    if (!a || !a.width || n._partante) continue;
    const b = n.getBoundingClientRect();
    const dx = (a.left - b.left) / u, dy = (a.top - b.top) / u;
    if (Math.abs(dx) + Math.abs(dy) < 1) continue;
    n.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: ms, easing: 'ease-out' });
  }
}

function majUnite(n, u, side) {
  n.dataset.side = side;
  n.dataset.uid = u.uid;
  n.dataset.carte = u.card ? u.card.id : '';   // la carte de l'unite : ses animations (ui/vfx.js) la retrouvent par la
  n.dataset.atk = u.atk;
  n.dataset.hp = u.hp;
  const ap = pilule(apercus.get(`${side}:${u.uid}`));
  const pics = ligneDePictos(u, { effets: false, taille: 26, max: 2, plus: false, sansDessines: true });
  // Les chiffres se colorent comme dans un jeu de cartes : l'attaque en vert quand elle depasse celle de la carte, la vie
  // en rouge quand l'unite est blessee (un jeton n'a pas de carte : pas de reference, donc pas de vert).
  // Les PV montres : ceux d'avant le coup tant que son animation ne l'a pas fait tomber (`pvMontres`, ui/effets.js).
  const hp = pvMontres.has(`${side}:${u.uid}`) ? pvMontres.get(`${side}:${u.uid}`) : u.hp;
  const plus = u.card && u.card.atk != null && u.atk > u.card.atk, moins = hp < u.maxHp;
  const elusif = hasKey(u.keys, 'elusif'), venin = hasKey(u.keys, 'Venin');
  const oeil = veille(u);
  const sig = [u.name, u.sprite || '', u.atk, hp, plus, moins, pics, ap, u.tox || 0, elusif, venin, !!u.shield, oeil, !!u.aura].join('|');
  if (n._sig !== sig) {
    n._sig = sig;
    n.innerHTML = `
      ${u.aura ? '<div class="halo-aura"></div>' : ''}
      ${u.sprite ? `<img src="${asset(u.sprite)}" alt="">` : '<img alt="">'}
      ${u.tox > 0 ? `<div class="tox" title="${u.tox} marqueur${u.tox > 1 ? 's' : ''} Toxine">${icone('Venom', 12)}${u.tox}</div>` : ''}
      <div class="un">${u.name}</div>
      <div class="s"><span class="a${plus ? ' plus' : ''}">${u.atk}</span> / <span class="h${moins ? ' moins' : ''}">${hp}</span></div>
      ${pics}
      ${elusif ? brume() : ''}
      ${u.shield ? ecu() : ''}
      ${oeil ? oeilDeCarte(n) : ''}
      ${venin ? fiole(oeil) : ''}
      ${ap ? `<div class="pv">${ap}</div>` : ''}`;
  }
  n.classList.toggle('taunt', hasKey(u.keys, 'Taunt'));
  // Les capacites qui changent la facon de jouer se VOIENT sur la carte, pas seulement par leur icone
  // (demande du game designer, 19 oct. 2026) : Provocation = bouclier de pierre, Bouclier = halo d'or, Elusif = palot.
  n.classList.toggle('bouclier', !!u.shield);
  n.classList.toggle('elusif', elusif);
  // Le porteur d'une aura a un halo qui bat tant qu'il est en jeu (`.halo-aura`, un noeud a lui : sur `::before`, il
  // prenait la place du bouclier de pierre de la Provocation et le faisait clignoter — 21 oct. 2026).
  n.classList.toggle('porte-aura', !!u.aura);
  n.classList.toggle('ready', side === 'p' && u.canAttack && u.atk > 0);
  n.classList.toggle('sel', selUnit === u.uid);
}

// LE HAUT ET LE BAS DE L'ECRAN (maquette « Combat Screen », 19 octobre 2026). L'adversaire en haut : sa pioche et sa
// defausse a gauche, son portrait rond au milieu (nom dedans, niveau en pastille, PV dessous), sa main en eventail de
// dos a droite et son mana dessous. Le joueur en bas : son avatar, son nom et ses PV ; son mana est sur le plateau de
// la main. Le noeud `n` est celui qu'on touche (`data-geste="hero"`) et que le masque eclaire quand il est une cible.
function heroNode(k) {
  const n = k === 'e'
    ? el(`
      <div class="bt-hero e" data-geste="hero" data-side="e" data-uid="hero">
        <img alt="">
        <span class="hn"></span>
        <span class="lvl"></span>
        <span class="pv"></span>
      </div>`)
    : el(`
      <div class="bt-hero p" data-geste="hero" data-side="p" data-uid="hero">
        <img alt="">
        <div class="bt-hid">
          <div class="hnm"><span class="hn"></span><span class="pv"></span></div>
          <div class="hpbar"><i></i><b></b></div>
        </div>
      </div>`);
  // Les PV de l'adversaire vivent hors du portrait : le halo d'une cible ne doit entourer que lui.
  const hors = k === 'e' ? el('<div class="bt-hpe"><div class="hpbar"><i></i><b></b></div><span class="hx"></span></div>') : null;
  const mana = el('<div class="bt-mana"><b></b><div class="manapips"></div></div>');
  const q = sel => n.querySelector(sel) || (hors && hors.querySelector(sel));
  return {
    n, hors, mana, img: n.querySelector('img'), nom: n.querySelector('.hn'), pv: n.querySelector('.pv'), lvl: n.querySelector('.lvl'),
    extra: hors ? hors.querySelector('.hx') : null, fill: q('.hpbar i'), txt: q('.hpbar b'),
    pips: mana.querySelector('.manapips'), manaTxt: mana.querySelector('b')
  };
}

function majHero(h, s, k) {
  // Les PV montres : ceux d'avant le coup tant que son animation ne l'a pas fait tomber (`pvMontres`, ui/effets.js).
  const hp = pvMontres.has(`${k}:hero`) ? pvMontres.get(`${k}:hero`) : s.hp;
  const pct = Math.max(0, hp / s.maxHp * 100);
  const src = asset(s.sprite);
  if (h.img.getAttribute('src') !== src) h.img.setAttribute('src', src);
  // L'armure et le mana promis se disent par leur icone, pas par un signe ecrit a la main.
  const extra = `${s.armor ? `<span class="hv">${icone('Armor', 14)}${s.armor}</span>` : ''}${s.nextMana ? `<span class="hv">${icone('Mana', 14)}+${s.nextMana}${icone('TurnStart', 12)}</span>` : ''}`;
  const nom = h.extra ? s.name : `${s.name}${extra ? ' ' + extra : ''}`;
  if (h.sigNom !== nom) { h.sigNom = nom; h.nom.innerHTML = nom; }
  if (h.extra && h.sigExtra !== extra) { h.sigExtra = extra; h.extra.innerHTML = extra; }
  // Le niveau de l'adversaire : celui de l'arene (le profil de progression de l'ennemi, config/ennemis.js).
  if (h.lvl) h.lvl.textContent = (ctx && ctx.niveau) || 1;
  h.fill.style.width = `${pct}%`;
  h.txt.textContent = `${Math.max(0, hp)} / ${s.maxHp}`;
  // Le mana peut depasser le plafond (mana promis au tour precedent) : on affiche
  // alors les cristaux en trop plutot que de les faire disparaitre.
  const n = Math.max(s.manaCap, s.mana);
  const sigPips = `${n}:${s.mana}`;
  if (h.sigPips !== sigPips) {
    h.sigPips = sigPips;
    h.manaTxt.textContent = `${s.mana}/${s.manaCap}`;
    h.pips.innerHTML = Array.from({ length: n }, (_, i) => `<i class="pip ${i < s.mana ? 'on' : ''}"></i>`).join('');
  }
  const ap = pilule(apercus.get(`${k}:hero`));
  if (h.sigPv !== ap) { h.sigPv = ap; h.pv.innerHTML = ap; }
}

function majCarte(n, c, i) {
  n.dataset.i = i;
  // Ce qui permet aux animations de retrouver la carte d'un evenement (une pioche) : son exemplaire, sinon son nom.
  n.dataset.inst = c.inst || '';
  n.dataset.nom = c.name;
  const ok = canPlay(B, 'p', c) && B.turn === 'p' && !auto;
  // Le cout affiche est celui qu'on va vraiment payer : le mot-cle « Cout X de
  // moins/de plus » peut le faire bouger d'un tour a l'autre, on le signale.
  const cout = cardCost(c, B, 'p');
  const pics = ligneDePictos(c, { taille: 26, max: 4, plus: false });
  const oeil = veille(c);
  const sig = [c.name, cout, c.cost, c.sprite || '', c.type, c.atk, c.hp, pics, c.pistee ? 1 : 0, oeil].join('|');
  if (n._sig !== sig) {
    n._sig = sig;
    n.innerHTML = `
      <div class="cost" ${cout !== c.cost ? `title="coût de base ${c.cost}" style="color:var(--accent2)"` : ''}>${cout}</div>
      ${c.pistee ? `<div class="patte" title="Pistée par l’adversaire">${icone('Track', 16)}</div>` : ''}
      ${c.sprite ? `<img src="${asset(c.sprite)}" alt="">` : ''}
      <div class="nm">${c.name}</div>
      ${pics}
      ${oeil ? oeilDeCarte(n) : ''}
      ${c.type === 'ally' ? `<div class="st">${c.atk}/${c.hp}</div>` : ''}`;
  }
  n.classList.toggle('spell', c.type === 'spell');
  n.classList.toggle('no', !ok);
  n.classList.toggle('sel', selCard === i && selZone === 'main');
}

function plateauNode(id) {
  return el(`<div class="board" id="${id}"><div class="bwrap"></div></div>`);
}

// Le dos des cartes (pioches, main adverse) : un des dos dessines par le game designer (Graphical Assets/CardBack/).
const DOS_DE_CARTE = 'Graphical Assets/CardBack/CardBack Cozy.png';

/** Une pioche (des dos empiles, le nombre dessus) ou une defausse (la derniere carte, le nombre dessus). */
function pileNode(quoi, camp) {
  const n = el(`<button class="bt-pile ${quoi} ${camp} bt-ctrl" aria-label="${quoi === 'pioche' ? 'Pioche' : 'Défausse'}"><span class="bt-face"></span><b></b><em class="bt-rep hidden"></em></button>`);
  return { n, face: n.querySelector('.bt-face'), nb: n.querySelector('b'), rep: n.querySelector('.bt-rep') };
}

function majPile(p, quoi, s, k) {
  if (quoi === 'pioche') {
    // La pioche vide, ce qu'on tire est SA pile de fatigue : le compteur dit combien de modeles elle compte.
    const fatigue = !s.deck.length && nbFatigue(B, k);
    const sig = `${s.deck.length}|${fatigue}`;
    if (p.sig === sig) return;
    p.sig = sig;
    p.n.classList.toggle('vide', !s.deck.length);
    p.n.classList.toggle('fatigue', !!fatigue);
    p.face.innerHTML = s.deck.length ? `<img src="${asset(DOS_DE_CARTE)}" alt="">` : (fatigue ? icone('Fatigue', 28) : '');
    p.nb.textContent = s.deck.length || fatigue || 0;
    p.n.title = fatigue ? `Fatigue ${fatigue}` : `Pioche ${s.deck.length}`;
    return;
  }
  const der = s.discard[s.discard.length - 1];
  const sig = `${s.discard.length}|${der ? der.inst ?? der.name : ''}`;
  if (p.sig === sig) return;
  p.sig = sig;
  p.n.classList.toggle('vide', !s.discard.length);
  p.n.classList.toggle('spell', !!der && der.type === 'spell');
  p.face.innerHTML = der && der.sprite ? `<img src="${asset(der.sprite)}" alt="">` : '';
  p.nb.textContent = s.discard.length;
}

/** La main de l'adversaire, de dos, en eventail. Une carte pistee (V3) porte sa patte. */
function majEventail(c) {
  const main = B.e.hand;
  // Dans un REJEU, la main de l'adversaire se voit : on comprend pourquoi il a joue ce qu'il a joue.
  const face = !!rejeu;
  // Les dernieres cartes arrivees ne s'y montrent qu'a la fin de leur vol (`dosEnVol`).
  const n = Math.max(0, main.length - dosEnVol);
  const sig = n + ':' + main.slice(0, n).map(x => (x.pistee ? 1 : 0) + (face ? x.name : '')).join('|');
  if (c.sigEventail === sig) return;
  c.sigEventail = sig;
  const dos = asset(DOS_DE_CARTE);
  c.eventail.title = `Main ${n}`;
  // Sept dos au plus : au-dela, l'eventail tiendrait tout l'ecran (Neuf Vies remplit la main) ; le nombre le dit.
  const vus = main.slice(0, Math.min(7, n)), k = vus.length;
  c.eventail.innerHTML = vus.map((x, i) => {
    const t = k > 1 ? i / (k - 1) - 0.5 : 0;
    const dessin = face ? `<img src="${asset(x.sprite || '')}" alt=""><b class="cout">${x.cost}</b>` : `<img src="${dos}" alt="">`;
    return `<span class="bt-dos${face ? ' face' : ''}" style="--i:${i};--n:${k};--t:${t.toFixed(3)}">${dessin}${x.pistee ? icone('Track', 16) : ''}</span>`;
  }).join('') + (n > 7 ? `<b class="bt-nb">${n}</b>` : '');
}

/**
 * LA MAIN : a plat jusqu'a trois cartes, en EVENTAIL au-dela (maquettes « Combat Screen » et « more than 3 cards ») :
 * les cartes se chevauchent juste assez pour tenir dans la largeur, tournent de part et d'autre du centre et suivent
 * un arc. Rien ne defile. La rotation passe par `rotate` et l'arc par la marge : `transform` et `translate` sont
 * aux animations (WAAPI d'ui/effets.js, sautillement du skin).
 */
const MAIN_A_PLAT = 3;
function etaleLaMain(main) {
  const cartes = [...main.children];
  const n = cartes.length;
  const eventail = n > MAIN_A_PLAT;
  main.classList.toggle('eventail', eventail);
  if (!eventail) {
    for (const c of cartes) for (const v of ['--chev', '--rot', '--arc']) c.style.removeProperty(v);
    return;
  }
  const cs = getComputedStyle(main);
  const W = main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const cw = cartes[0].offsetWidth;
  const angle = Math.min(22, 3 + n * 2.5);   // degres, de chaque cote
  // Une carte tournee deborde de sa place : on garde de quoi loger le coin des deux cartes du bout.
  const marge = cw * Math.sin(angle * Math.PI / 180) * 2.4;
  const pas = Math.min(cw * 0.86, (W - cw - marge) / (n - 1));
  cartes.forEach((c, i) => {
    const t = i / (n - 1) - 0.5;
    c.style.setProperty('--chev', i ? `${pas - cw}px` : '0px');
    c.style.setProperty('--rot', `${(t * 2 * angle).toFixed(2)}deg`);
    c.style.setProperty('--arc', `${(t * t * 4 * 16).toFixed(1)}px`);
  });
}

/**
 * LE MENU DU COMBAT (« un vrai menu, avec un moyen d'abandonner », game designer, 20 oct. 2026). Il MET LE COMBAT EN
 * PAUSE tant qu'il est ouvert (le mode Auto ne joue plus) : Reprendre, la vitesse, la defausse et le Registre, le journal,
 * et ABANDONNER — deux touchers (le premier demande, le second abandonne), jamais de boite de dialogue.
 */
function ouvreMenu() {
  fermeLecture();
  reinitSelection();
  render();
  enPause = true;
  clearTimeout(timer);
  const box = el(`<div class="bt-menu">
    <h3>Menu</h3>
    <p class="bt-tour"></p>
    <button class="btn" data-k="fermer">Reprendre</button>
    <button class="btn ghost" data-k="vitesse"></button>
    <button class="btn ghost" data-k="zone">Défausse et Registre</button>
    <button class="btn ghost" data-k="journal">Journal du combat</button>
    <button class="btn rouge" data-k="abandon">${rejeu ? 'Quitter le rejeu' : 'Abandonner'}</button>
  </div>`);
  const tour = box.querySelector('.bt-tour');
  tour.textContent = `Tour ${Math.ceil(B.turnNo / 2)}`;
  const vit = box.querySelector('[data-k="vitesse"]');
  const ditVitesse = () => { vit.textContent = `Vitesse x${fx.vitesse}`; };
  ditVitesse();
  vit.onclick = () => { fx.cycleVitesse(!!rejeu); ditVitesse(); majBarre(); };
  box.querySelector('[data-k="journal"]').onclick = () => { closeModal(); coque.journal.bascule(); render(); };
  const ab = box.querySelector('[data-k="abandon"]');
  ab.onclick = () => {
    if (rejeu) { closeModal(); quitteRejeu(); return; }
    if (!ab.classList.contains('sur')) { ab.classList.add('sur'); ab.textContent = 'Toucher encore pour abandonner'; return; }
    abandonne();
  };
  // Cinq touchers sur « Tour N » ouvrent le panneau de triche.
  let touches = [];
  tour.addEventListener('pointerdown', ev => {
    ev.stopPropagation();
    const t = Date.now();
    touches = touches.filter(x => t - x < 2000);
    touches.push(t);
    if (touches.length >= 5) { touches = []; closeModal(); coque.triche.classList.toggle('ouvert'); }
  });
  box.querySelector('[data-k="zone"]').onclick = () => { closeModal(); ouvreDefausse(); };
  box.querySelector('[data-k="fermer"]').onclick = closeModal;
  // Fermer le menu (Reprendre, ou toucher a cote) relance le combat la ou il s'etait arrete.
  modal(box, () => { enPause = false; if (B && !B.over) loop(); });
}

/**
 * ABANDONNER : le combat s'arrete la, compte comme une DEFAITE (pas de recompense, l'arene note une defaite) et le
 * journal de decisions l'ecrit « abandon » (`fermeJournal` le reconnait : un combat ferme avant sa fin). Le moteur n'y
 * est pour rien : c'est le joueur qui quitte la table.
 */
function abandonne() {
  if (!B || B.over) return;
  B.abandon = true;
  enPause = true;   // la fermeture du menu ne doit pas relancer le bot
  closeModal();
  clearTimeout(timer);
  finish();
}

/** Le journal en TEXTE, telechargeable : c'est l'outil du game designer, plus celui du joueur. */
function telechargeTexte() {
  const texte = [`${B.p.name} contre ${B.e.name} — tour ${B.turnNo}`,
    `PV ${B.p.hp}/${B.p.maxHp} contre ${B.e.hp}/${B.e.maxHp}`, ''].concat(B.log).join('\n');
  telecharge('﻿' + texte, `combat-${B.e.name.replace(/\s+/g, '-')}.txt`, 'text/plain;charset=utf-8');
}

/** Donne un fichier a enregistrer (console de triche). */
function telecharge(texte, nom, type) {
  const url = URL.createObjectURL(new Blob([texte], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Construit, une fois par combat, tout ce qui ne bouge pas. */
function monteLaCoque(root) {
  root.innerHTML = '';
  const c = {};
  c.fx = el('<div class="fx"></div>');

  // --- l'adversaire
  c.haut = el('<div class="bt-haut"></div>');
  c.heroE = heroNode('e');
  c.piocheE = pileNode('pioche', 'e');
  c.defE = pileNode('defausse', 'e');
  c.eventail = el('<button class="bt-eventail bt-ctrl" aria-label="Main adverse"></button>');
  const piles = el('<div class="bt-piles e"></div>');
  piles.append(c.piocheE.n, c.defE.n);
  c.haut.append(piles, c.heroE.n, c.heroE.hors, c.eventail, c.heroE.mana);
  root.appendChild(c.haut);

  c.boardE = plateauNode('boardE');
  root.appendChild(c.boardE);

  // La zone entre les deux plateaux : elle porte le bandeau d'instruction (l'action engagee) et
  // ne recouvre ni l'acteur, ni les cibles. Le journal n'est plus du texte qui mange un tiers de
  // l'ecran : il a son panneau, qu'on ouvre avec l'onglet « Log » (ui/journal.js).
  c.mid = el('<div class="bt-mid"></div>');
  root.appendChild(c.mid);
  c.journal = creeJournal({
    evts: () => B.evts,
    heros: { p: { sprite: B.p.sprite }, e: { sprite: B.e.sprite } },
    revele: !!rejeu,   // en direct, on ne voit pas ce que l'adversaire a en main ; dans un rejeu, si
    onFerme: () => { if (coque) majBarre(); }
  });
  // Enregistrement en cours : le joueur doit le SAVOIR, une partie ne s'enregistre pas
  // dans son dos. Le point rouge reste dans l'en-tete du journal.
  if (B.journal) c.journal.extra(el('<span class="rec" title="Ce combat est enregistré (journal de décisions)">⏺</span>'));
  root.appendChild(c.journal.n);

  c.boardP = plateauNode('boardP');
  root.appendChild(c.boardP);

  // --- le joueur : son avatar, son nom, ses PV, et le bouton Auto
  c.joueur = el('<div class="bt-joueur"></div>');
  c.heroP = heroNode('p');
  c.chip = el('<button class="autochip bt-ctrl" id="autoChip"></button>');
  c.joueur.append(c.heroP.n, c.chip);
  root.appendChild(c.joueur);

  // --- le plateau de la main : le mana, la main, la pioche et la defausse qui depassent en bas
  c.basMain = el('<div class="bt-basmain"></div>');
  c.main = el('<div class="bt-hand"></div>');
  c.piocheP = pileNode('pioche', 'p');
  c.defP = pileNode('defausse', 'p');
  const pilesP = el('<div class="bt-piles p"></div>');
  pilesP.append(c.piocheP.n, c.defP.n);
  c.basMain.append(c.heroP.mana, c.main, pilesP);
  root.appendChild(c.basMain);
  // L'eventail se recalcule quand la main change de largeur (rotation de l'ecran, fenetre redimensionnee).
  new ResizeObserver(() => { if (coque === c) etaleLaMain(c.main); }).observe(c.main);
  // Ce que les animations et la fenetre de zone appellent « la pioche » et « la defausse » du joueur.
  c.npioche = c.piocheP.n;
  c.def = c.defP.n;
  c.def.id = 'defBtn';

  // --- les onglets des bords : Menu, Registre, Log a gauche ; Fin de tour et la vitesse a droite
  const gauche = el(`<div class="bt-onglets g">
      <button class="bt-onglet bt-ctrl" id="menuBtn">Menu</button>
      <button class="bt-onglet bt-ctrl" id="registreBtn">Registre</button>
      <button class="bt-onglet bt-ctrl" id="logBtn">Log<b class="bdg hidden"></b></button>
    </div>`);
  const droite = el(`<div class="bt-onglets d">
      <button class="bt-onglet fintour bt-ctrl" id="endTurn"><span>Fin de tour</span>${icone('TurnEnd', 22)}</button>
      <button class="vitesse bt-ctrl" id="vitesse" aria-label="Vitesse du combat"></button>
    </div>`);
  root.append(gauche, droite);
  c.vit = droite.querySelector('#vitesse');
  c.vit.onclick = () => { fx.cycleVitesse(!!rejeu); majBarre(); };
  // LE REJEU : « Fin de tour » devient « Quitter », et deux fleches sur les cotes sautent au tour precedent / suivant.
  if (rejeu) {
    droite.querySelector('#endTurn').innerHTML = `<span>Quitter</span>${icone('Close', 22)}`;
    const prec = el(`<button class="bt-rejeu prec bt-ctrl" aria-label="Tour précédent">${icone('Previous', 30)}</button>`);
    const suiv = el(`<button class="bt-rejeu suiv bt-ctrl" aria-label="Tour suivant">${icone('Next', 30)}</button>`);
    prec.onclick = () => { const d = rejeu.donnees; allerAuTour(toursJoues(d, rejeu.etat.i) - 1); };
    suiv.onclick = () => { const d = rejeu.donnees; allerAuTour(toursJoues(d, rejeu.etat.i) + 1); };
    root.append(prec, suiv);
    c.tourRejeu = el('<div class="bt-rejeu-tour"></div>');
    root.appendChild(c.tourRejeu);
  }
  c.fin = droite.querySelector('#endTurn');
  c.logBtn = gauche.querySelector('#logBtn');
  c.badge = c.logBtn.querySelector('.bdg');
  c.triche = panneauTriche();
  root.appendChild(c.triche);
  gauche.querySelector('#menuBtn').onclick = ouvreMenu;
  gauche.querySelector('#registreBtn').onclick = ouvreDefausse;
  c.logBtn.onclick = () => {
    reinitSelection();
    c.journal.bascule();
    render();
  };
  for (const p of [c.def, c.defE.n, c.piocheP.n, c.piocheE.n, c.eventail]) p.onclick = ouvreDefausse;
  c.chip.onclick = () => {
    if (rejeu) { rejeu.pause = !rejeu.pause; render(); boucleRejeu(); return; }
    auto = !auto;
    reinitSelection();
    render();
    loop();
  };
  c.fin.onclick = () => {
    if (rejeu) { quitteRejeu(); return; }
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
  // Des sorts a REPRISE a relancer maintenant : la defausse le dit, sinon on ne penserait pas a l'ouvrir. A ton tour
  // et en mode manuel seulement — sinon rien ne se joue d'un toucher.
  const nbReprises = !auto && B.turn === 'p' && !B.over ? reprisesPossibles(B, 'p').length : 0;
  const chip = rejeu ? (rejeu.pause ? `Lecture ${icone('Auto', 18)}` : `Pause ${icone('Pause', 18)}`)
    : auto ? `Auto ${icone('Auto', 18)}` : `Manuel ${icone('Manual', 18)}`;
  if (c.sigChip !== chip) { c.sigChip = chip; c.chip.innerHTML = chip; }
  c.chip.classList.toggle('on', auto);
  c.vit.textContent = `x${fx.vitesse}`;
  majPile(c.piocheP, 'pioche', B.p, 'p');
  majPile(c.defP, 'defausse', B.p, 'p');
  majPile(c.piocheE, 'pioche', B.e, 'e');
  majPile(c.defE, 'defausse', B.e, 'e');
  majEventail(c);
  c.defP.rep.classList.toggle('hidden', !nbReprises);
  if (nbReprises) c.defP.rep.innerHTML = `${icone('Flashback', 14)}${nbReprises}`;
  c.def.classList.toggle('pret', !!nbReprises);
  c.fin.disabled = !rejeu && !(B.turn === 'p' && !auto);
  if (c.tourRejeu) {
    const d = rejeu.donnees, t = toursJoues(d, rejeu.etat.i), n = toursJoues(d, d.actions.length);
    c.tourRejeu.textContent = `Rejeu · tour ${Math.min(n, t) + 1} / ${n + 1}`;
  }
  // Le badge de l'onglet du journal : combien de scenes depuis la derniere fois qu'on l'a ouvert.
  // Le journal ouvert prend toute la largeur : les onglets des bords se retirent (ils cachaient « Tous »). Il se ferme
  // par sa croix.
  $('#battle').classList.toggle('jr-ouvert', !c.journal.n.classList.contains('hidden'));
  const nl = c.journal.nonLus();
  c.badge.textContent = nl > 9 ? '9+' : String(nl);
  c.badge.classList.toggle('hidden', !nl);
  // Le panneau tient entre le haut de l'ecran et la ligne du joueur : on lui donne la place qu'ils laissent.
  c.journal.n.style.top = c.haut.offsetHeight + 'px';
  c.journal.n.style.bottom = Math.max(0, $('#battle').clientHeight - c.joueur.offsetTop) + 'px';
}

function render() {
  const root = $('#battle');
  if (!coque) monteLaCoque(root); else fx.photo();
  const c = coque;
  // Une action engagee ne survit pas a un changement de tour ni de mode : on la rend.
  if (!peutEngager()) reinitSelection();

  majHero(c.heroE, B.e, 'e');
  majHero(c.heroP, B.p, 'p');
  // Les unites qui meurent dans ce qui vient d'arriver gardent leur place jusqu'a la fin de leur animation de mort.
  const neufs = (B.evts || []).slice(evtsRendus);
  evtsRendus = (B.evts || []).length;
  mortsAVenir = new Set(neufs.filter(e => e.t === 'meurt' && e.unite).map(e => `${e.unite.camp}:${e.unite.uid}`));
  const garde = n => mortsAVenir.has(`${n.dataset.side}:${n.dataset.uid}`);
  syncListe(c.boardE.firstElementChild, B.e.board, u => u.uid, () => el('<div class="unit" data-geste="unit"></div>'), (n, u) => majUnite(n, u, 'e'), garde);
  syncListe(c.boardP.firstElementChild, B.p.board, u => u.uid, () => el('<div class="unit" data-geste="unit"></div>'), (n, u) => majUnite(n, u, 'p'), garde);

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
  etaleLaMain(c.main);
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
  // La largeur de CHAQUE vignette, marges comprises : une Provocation est plus large (son bouclier de pierre ecarte ses
  // voisines, skins/juice.css) — compter toutes les vignettes a la largeur de la premiere faisait deborder le plateau.
  const larges = [], marge = c => { const cs = getComputedStyle(c); return [parseFloat(cs.marginLeft) + parseFloat(cs.marginRight), parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)]; };
  let uh = 0;
  for (const c of wrap.children) { const [mx, my] = marge(c); larges.push(c.offsetWidth + mx); uh = Math.max(uh, c.offsetHeight + my); }
  if (W <= 0 || H <= 0 || !larges[0] || !uh) return;
  // Ca tient deja ? On le MESURE au lieu de le calculer : les lignes n'ont pas toutes
  // la meme hauteur, et un calcul par la plus haute ferait retrecir un plateau qui
  // tenait. En dessous du plafond, la hauteur du plateau EST celle de son contenu, donc
  // ce test est exact.
  if (wrap.offsetHeight <= H) return;
  for (let s = 0.98; s > ECHELLE_MIN; s -= 0.02) {
    // Les lignes, comme le flex les remplit : une vignette passe a la ligne quand elle ne tient plus dans W / s.
    let lignes = 1, x = 0;
    for (const w of larges) { if (x && x + gap + w > W / s) { lignes++; x = w; } else x += (x ? gap : 0) + w; }
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
const peutEngager = () => !rejeu && !!B && !B.over && !auto && B.turn === 'p';
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
  // Pendant une visee au doigt, le trait et la cible disent tout : pas de bandeau.
  c.bandeau.textContent = tir ? '' : 'Choisis une cible';
  c.bandeau.classList.toggle('hidden', !!tir);
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
  if (rejeu) return true;   // un rejeu se regarde : un toucher n'y fait rien (l'appui long lit toujours)
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
  // Une carte du JOURNAL : un toucher n'y a rien d'autre a faire, il ouvre donc sa fiche, qui reste jusqu'au toucher
  // suivant (et ne rend pas la main en Auto : on lit le combat qu'on regarde).
  if (n.dataset.geste === 'journal') { lisCe(n); fermeAuProchainToucher(); return; }
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
  } else if (d.geste === 'journal') {
    // Le journal ne garde qu'une PHOTO de la carte : on relit sa definition dans le catalogue, par son identifiant
    // (la carte de base : ses paliers du moment ne sont pas dans la photo).
    let c = null;
    try { c = cardById(d.carte); } catch { c = null; }
    // Le dessin vient de la photo : une carte de heros ne porte pas toujours le sien dans le catalogue.
    if (c) lecture = { kind: 'carte', carte: c.sprite || !d.sprite ? c : { ...c, sprite: d.sprite }, camp: d.camp === 'e' ? 'e' : 'p' };
  }
  renderLecture();
}

/** Une fiche ouverte d'un toucher (pas d'un appui) : elle se ferme au prochain toucher, ou qu'il tombe. */
function fermeAuProchainToucher() {
  setTimeout(() => document.addEventListener('pointerdown', () => fermeLecture(), { capture: true, once: true }), 0);
}

// ------------------------------------------------------------- glisser-deposer une carte, viser d'un geste
// GLISSER POUR JOUER (demandes du game designer, 19 octobre 2026), en plus du toucher. Deux gestes :
//   - POSER : une carte SANS cible suit le doigt et se joue lachee n'importe ou au-dessus de la main ; lachee sur la
//     main, elle y retourne sans rien couter. Une carte « Choisir » pose sa question au lacher.
//   - VISER : une carte A CIBLE, ou une unite prete a attaquer, reste a sa place ; un TRAIT part d'elle vers le doigt,
//     et une grosse CIBLE ROUGE entoure le doigt (le doigt cache ce qu'il touche : la cible doit deborder autour).
//     Les cibles legales s'eclairent (le meme masque et le meme apercu que le toucher) ; lache sur l'une d'elles, le
//     coup part, ailleurs il est annule.
// Le coup passe par les memes fonctions que le toucher (`joue`, `designe`, `onCardClick`), donc par `joueLeCoup`.
let tir = null;   // { mode: 'pose' | 'vise', i, carte, noeud, fantome, trait, cible, survol }

/** Le noeud touchable sous le doigt (le fantome, le trait et la cible ne recoivent aucun toucher). */
const sousLeDoigt = ev => {
  const x = document.elementFromPoint(ev.clientX, ev.clientY);
  return x && x.closest ? x.closest('[data-geste="unit"], [data-geste="hero"]') : null;
};

/** Le trait et la cible de la visee, poses sur l'ecran de combat (ils ne recoivent aucun toucher). */
function viseur() {
  const root = $('#battle');
  const trait = el(`<svg class="tir-trait" xmlns="http://www.w3.org/2000/svg"><path class="fond"/><path class="dessus"/></svg>`);
  const cible = el('<div class="tir-cible"><i></i></div>');
  root.append(trait, cible);
  return { trait, cible };
}

function debutTir(n, ev) {
  if (!peutEngager()) return false;
  // VISER avec une unite : celle qui est prete a attaquer.
  if (n.dataset.geste === 'unit') {
    if (n.dataset.side !== 'p') return false;
    const u = B.p.board.find(x => x.uid === n.dataset.uid);
    if (!u) return false;
    const raison = raisonUnite(u);
    if (raison) { toast(raison); return false; }
    reinitSelection();
    selUnit = u.uid;
    calculeApercus();
    tir = { mode: 'vise', noeud: n, survol: null, ...viseur() };
    render();
    bougeTir(ev);
    return true;
  }
  if (n.dataset.geste !== 'main') return false;
  const i = +n.dataset.i;
  const carte = B.p.hand[i];
  if (!carte) return false;
  if (!canPlay(B, 'p', carte)) { toast(raisonCarte(carte, 'main')); return false; }
  reinitSelection();
  // VISER avec une carte a cible (sans choix de branche) : elle reste dans la main, soulevee.
  if (!needsChoice(carte) && needsTarget(carte, null) && legalTargets(B, 'p', carte, null).length > 0) {
    selCard = i;
    selZone = 'main';
    calculeApercus();
    n.classList.add('visante');
    tir = { mode: 'vise', i, carte, noeud: n, survol: null, ...viseur() };
    render();
    bougeTir(ev);
    return true;
  }
  // POSER : un double de la carte suit le doigt.
  const r = n.getBoundingClientRect();
  const fantome = n.cloneNode(true);
  fantome.classList.remove('nouvelle', 'sel', 'lit', 'acteur');
  fantome.classList.add('tir-fantome');
  fantome.removeAttribute('data-geste');
  fantome.style.cssText += `;left:${r.left}px;top:${r.top}px;width:${n.offsetWidth}px;height:${n.offsetHeight}px;`;
  $('#battle').appendChild(fantome);
  n.classList.add('tiree');
  tir = { mode: 'pose', i, carte, noeud: n, fantome };
  render();
  bougeTir(ev);
  return true;
}

function bougeTir(ev) {
  if (!tir) return;
  if (tir.mode === 'pose') {
    const w = tir.fantome.offsetWidth, h = tir.fantome.offsetHeight;
    tir.fantome.style.left = `${ev.clientX - w / 2}px`;
    // La carte se tient AU-DESSUS du doigt : on voit ou on la pose.
    tir.fantome.style.top = `${ev.clientY - h * 0.85}px`;
    // Au-dessus de la main, la carte « rentre » : le double le dit en palissant.
    tir.fantome.classList.toggle('rentre', ev.clientY > coque.basMain.getBoundingClientRect().top);
    return;
  }
  // VISER : le trait part du centre de la source et se courbe jusqu'au doigt ; la cible suit le doigt.
  const rr = $('#battle').getBoundingClientRect();
  const s = tir.noeud.getBoundingClientRect();
  const x0 = s.left + s.width / 2 - rr.left, y0 = s.top + s.height / 2 - rr.top;
  const x1 = ev.clientX - rr.left, y1 = ev.clientY - rr.top;
  const cx = (x0 + x1) / 2 + (y1 - y0) * 0.12, cy = Math.min(y0, y1) - 40;
  const d = `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`;
  for (const p of tir.trait.querySelectorAll('path')) p.setAttribute('d', d);
  tir.cible.style.left = `${x1}px`;
  tir.cible.style.top = `${y1}px`;
  const n = sousLeDoigt(ev);
  const vise = n && n.classList.contains('lit') && !n.classList.contains('acteur') ? n : null;
  if (vise !== tir.survol) {
    if (tir.survol) tir.survol.classList.remove('survol');
    if (vise) vise.classList.add('survol');
    tir.survol = vise;
    tir.cible.classList.toggle('sur', !!vise);
  }
}

function lacheTir(ev, annuleGeste) {
  if (!tir) return;
  const t = tir;
  tir = null;
  if (t.fantome) t.fantome.remove();
  if (t.trait) { t.trait.remove(); t.cible.remove(); }
  t.noeud.classList.remove('tiree', 'visante');
  if (t.survol) t.survol.classList.remove('survol');
  const encore = t.carte ? B && B.p.hand[t.i] === t.carte : B && B.p.board.some(u => u.uid === selUnit);
  if (annuleGeste || !B || B.over || !peutEngager() || !encore) { annule(); return; }
  if (t.mode === 'vise') {
    const n = sousLeDoigt(ev);
    // Comme un toucher (`tape`) : l'uid tel que le noeud le porte.
    if (n && designe(n.dataset.side, n.dataset.uid)) return;
    annule();
    return;
  }
  // POSER : jouee si on la lache au-dessus de la main (sur le terrain).
  const surLaMain = ev.clientY > coque.basMain.getBoundingClientRect().top;
  reinitSelection();
  if (surLaMain) { render(); return; }
  onCardClick(t.i);
}

/** Les ecouteurs, poses une fois pour toutes sur les elements qui ne changent jamais. */
function poseLesGestes() {
  if (gestesPoses) return;
  gestesPoses = true;
  const gestes = { tap: tape, lire: lisCe, finLire: fermeLecture };
  installeGestes($('#battle'), { ...gestes, glisse: { debut: debutTir, bouge: bougeTir, lache: lacheTir } });
  installeGestes($('#modal'), gestes);
  // Toucher le fond (ni une carte, ni une unite, ni un bouton) annule l'action engagee — ou,
  // en Auto, rend la main au joueur.
  $('#battle').addEventListener('pointerup', ev => {
    // Le chip Auto/Manuel est un <div> : sans `.autochip` ici, son toucher comptait aussi comme « toucher le fond »
    // (donc reprendre la main), puis son propre clic rebasculait en Auto — impossible de quitter l'Auto en le touchant.
    if (ev.gesteGlisse || ev.target.closest('[data-geste], button, .autochip')) return;
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
  // TA PILE DE FATIGUE (V3, Ex-libris) : ce que tu tirerais, la pioche finie. Les cartes a Ex-libris sont
  // eclairees — ce sont celles que ta defausse y a rangees —, le reste est grise. Lecture seule : un tap n'y
  // joue rien (seul le groupe 0, ta defausse, se joue).
  const maPile = pileDeFatigue(B, 'p');
  if (maPile.length) {
    groupes.push({ titre: 'Ta pile de fatigue', camp: 'p',
      cartes: maPile.map((carte, i) => ({ carte, i, etat: hasKey(carte.keys, 'ex_libris') ? 'on' : 'off' })) });
  }
  groupes.push({ titre: 'Défausse adverse', camp: 'e', cartes: lecturePile(B.e.discard) });
  // LA MAIN ADVERSE, DE DOS (V3, pistage) : on ne lit jamais ce qu'elle contient — seulement quelles places
  // portent la patte. Rien d'autre ne passe a la fenetre : ni nom, ni cout, ni mot-cle.
  if (B.e.hand.some(c => c.pistee)) {
    groupes.push({ titre: 'Main adverse (de dos)', camp: 'e',
      cartes: B.e.hand.map((c, i) => ({ carte: { name: '?', type: 'ally' }, i, etat: 'vue', dos: asset(DOS_DE_CARTE), pistee: !!c.pistee })) });
  }
  // LE REGISTRE (V3) : les cartes jouees par les deux camps, la plus recente d'abord. Les types nommes se lisent dans
  // l'aide ; une carte « Type : tous » porte sa pastille.
  const R = B.registre;
  if (R && R.cartes.length) {
    groupes.push({ titre: `Le Registre (${R.types.length + R.tous.length} type${R.types.length + R.tous.length > 1 ? 's' : ''})`, camp: 'p',
      cartes: recentes(R.cartes).map(i => ({ carte: R.cartes[i], i, etat: 'vue', note: hasKey(R.cartes[i].keys, 'type_tous') ? '∞ Type : tous' : '' })) });
  }
  const aReprise = B.p.discard.some(c => c.type !== 'ally' && hasKey(c.keys, 'reprise'));
  const aideReprise = !aReprise ? ''
    : monTour ? 'Touche un sort éclairé pour le relancer : il coûte son prix, puis il est exilé.'
      : 'Les sorts à Reprise se relancent à ton tour, en mode manuel.';
  const aideRegistre = R && (R.types.length || R.tous.length)
    ? `Registre : ${[...R.types, ...(R.tous.length ? [`Tous ×${R.tous.length}`] : [])].join(', ')}.` : '';
  const aide = [aideReprise, aideRegistre].filter(Boolean).join(' ');
  zoneGroupes = groupes;
  // Le combat continue derriere : on ne redessine QUE si la fenetre a change, sinon un doigt
  // pose sur une carte la verrait remplacee au pas suivant du mode auto.
  const sig = JSON.stringify([aide, groupes.map(g => [g.titre, g.cartes.map(x => [x.carte.inst ?? x.carte.name, x.carte.atk, x.carte.hp, x.etat, x.cout, x.note, x.pistee])])]);
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
// LA FICHE (maquette « Combat Screen Zoom on a card », 19 octobre 2026) : la carte en grand a gauche, son nom, son
// attaque et sa vie, ses types ; dessous ce qu'elle FAIT (« icones : texte ») ; puis, apres un trait, ce qui la
// MODIFIE en ce moment, chaque chose sous le portrait de sa source (ui/fiche.js).



/** Le fond de la puce « Type » : une part de couleur par type, en biais (config/familles.js, `couleurDuType`). */
function fondDesTypes(types) {
  const k = types.length;
  const parts = types.map((t, i) => `${couleurDuType(t)} ${(i * 100 / k).toFixed(1)}% ${((i + 1) * 100 / k).toFixed(1)}%`);
  return `linear-gradient(135deg, ${parts.join(', ')})`;
}

/** L'en-tete : la carte en grand (cout, dessin), le nom, l'attaque et la vie, les types, une ligne d'etat. */
function teteFiche({ nom, sprite, cout, coutBase, sort, atk, hp, maxHp, plus, moins, types, note, adverse = false }) {
  const stats = sort ? '<span class="fi-sort">Sort</span>'
    : `<span class="a${plus ? ' plus' : ''}">${atk}</span>${icone('Attack', 24)}<span class="h${moins ? ' moins' : ''}">${hp}${maxHp != null ? '/' + maxHp : ''}</span>${icone('Health', 24)}`;
  return el(`
    <div class="fi-tete">
      <div class="fi-carte${sort ? ' spell' : ''}${adverse ? ' adverse' : ''}">
        ${cout != null ? `<div class="cost" ${coutBase != null && coutBase !== cout ? `title="coût de base ${coutBase}"` : ''}>${cout}</div>` : ''}
        ${sprite ? `<img src="${asset(sprite)}" alt="">` : ''}
      </div>
      <div class="fi-id">
        <div class="nm">${nom}</div>
        <div class="fi-stats">${stats}</div>
        ${types.length ? `<span class="fi-type" style="background:${fondDesTypes(types)}">Type : ${types.join(' & ')}</span>` : ''}
        ${note ? `<div class="src">${note}</div>` : ''}
      </div>
    </div>`);
}

/** Ce qu'une carte ou une unite FAIT : son texte (ou ses effets) puis ses mots-cles (voir ui/fiche.js). */
function blocFait(x, texte) {
  const lignes = lignesDeFait(x, texte);
  if (!lignes.length) return null;
  const n = el('<section class="fi-fait"></section>');
  lignes.forEach(l => n.appendChild(l));
  return n;
}

/**
 * La fiche d'une unite : la meme unite en grand, avec ce qu'elle FAIT (ses moments, son aura, ses effets statiques)
 * puis ce qui la MODIFIE en ce moment et D'OU ca vient (renforts recus, auras nommees par leur porteur,
 * caracteristique variable). C'est tout l'interet de la vue inspectee : le plateau montre « 4/5 », la fiche explique
 * pourquoi. Elle s'ouvre en MAINTENANT l'unite (ui/gestes.js) et se referme quand on la lache : elle n'a donc ni
 * bouton « Attaquer » ni bouton « Fermer ».
 */
function inspectNode(u, side) {
  const box = el('<div class="insp fiche"></div>');
  box.appendChild(teteFiche({
    nom: u.name, sprite: u.sprite, cout: u.card ? u.card.cost : null, sort: false,
    atk: u.atk, hp: Math.max(0, u.hp), maxHp: u.maxHp, plus: u.card && u.card.atk != null && u.atk > u.card.atk, moins: u.hp < u.maxHp,
    types: typesOf(u), note: '', adverse: side === 'e'
  }));

  const bFait = blocFait(u, u.card ? u.card.text : '');
  if (bFait) box.appendChild(bFait);

  // --- ce qui la modifie en ce moment, et par qui
  const mods = [];
  const dAtk = u.baseAtk - u.printedAtk, dHp = u.baseHp - u.printedHp;
  // Chaque renfort avec sa SOURCE (lue dans le recit du combat), comme la liste de bonus de Hearthstone.
  mods.push(...lignesDeRenforts(B, u, side, dAtk, dHp));
  if (u.variable) {
    const c = COUNTERS[u.variable.src];
    const quoi = u.variable.stat === 'both' ? 'attaque et vie' : u.variable.stat === 'hp' ? 'vie' : 'attaque';
    const dit = (c ? c.label.toLowerCase() : u.variable.src) + (c && c.needsArg ? ` « ${u.variable.arg || '?'} »` : '');
    mods.push(ligneSource({ ico: 'Static', titre: `Variable : ${dit}`, texte: `${quoi} = ${u.variable.x}` }));
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
    else parPorteur.set(cle, { n: 1, dit, nom: a.src.name, sprite: a.src.sprite, camp: a.camp });
  }
  for (const a of parPorteur.values()) {
    mods.push(ligneSource({ sprite: a.sprite, ico: 'Aura', titre: `${a.nom}${a.n > 1 ? ` (${a.n} fois)` : ''}`, texte: `aura : ${a.dit}`, ton: a.camp === side ? 'bon' : 'mal' }));
  }
  // LA TOXINE (V3) : ce que sa Toxine lui prendra au debut de SON prochain tour (le Bouclier absorbe le premier).
  if (u.tox > 0) {
    const perdra = u.shield ? 'son bouclier absorbera le premier tour' : `perdra ${u.tox} PV au début de son tour${u.hp <= u.tox ? ' — et en mourra' : ''}`;
    mods.push(ligneSource({ ico: 'Venom', titre: `Toxine ×${u.tox}`, texte: perdra, ton: 'mal' }));
  }
  if (mods.length) {
    box.appendChild(el('<hr class="fi-trait">'));
    const n = el('<section class="fi-mods"></section>');
    mods.forEach(l => n.appendChild(l));
    box.appendChild(n);
  }
  return box;
}

/** La fiche d'une CARTE (main, defausse, exil) : ce que la vignette n'a pas la place de dire. */
function ficheCarte(c, camp) {
  const box = el('<div class="insp fiche"></div>');
  const cout = cardCost(c, B, camp);
  const ally = c.type === 'ally';
  box.appendChild(teteFiche({
    nom: c.name, sprite: c.sprite, cout, coutBase: c.cost, sort: !ally, atk: c.atk, hp: c.hp, maxHp: null,
    types: typesOf(c), note: '', adverse: camp === 'e'
  }));
  const bFait = blocFait(c, c.text);
  if (bFait) box.appendChild(bFait);
  // UNE CARTE PISTEE (V3) : ce que le camp d'en face a en reserve si on la joue. Le surcout en mana est deja
  // dans le cout affiche en haut ; ici, ce qui part EN PLUS — lu sur les unites de l'adversaire.
  if (c.pistee) {
    box.appendChild(el('<hr class="fi-trait">'));
    const n = el('<section class="fi-mods"></section>');
    n.appendChild(ligneSource({ ico: 'Track', titre: 'Pistée', texte: 'coûte plus cher', ton: 'mal' }));
    for (const u of B[camp === 'p' ? 'e' : 'p'].board) {
      for (const e of [...(u.on_pistee_foe || []), ...(u.on_pistee_any || [])]) {
        n.appendChild(ligneSource({ sprite: u.sprite, titre: u.name, texte: `si tu la joues : ${describeEffect(e)}`, ton: 'mal' }));
      }
    }
    box.appendChild(n);
  }
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
  const p = panneauLecture();
  p.replaceChildren(sheet);
  p.classList.remove('hidden');
}

// --------------------------------------------------------------- fin de combat
function finish() {
  if (rejeu) { finRejeu(); return; }
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
  // Avec de quoi le REJOUER (combat/rejeu.js) — sauf si une triche a change la partie : elle ne se rejouerait pas.
  const idRecit = gardeCombat({
    nom: enc.name, gagnant: B.winner, tours: Math.ceil(B.turnNo / 2), equipe: B.p.name,
    heros: { p: B.p.sprite, e: B.e.sprite }, evts: B.evts,
    rejeu: enreg && !enreg.triche ? enreg.donnees : null
  });
  enreg = null;

  const recompenses = [];
  const notes = [];
  if (win) {
    // Monnaie A : recompense d'exploration. Monnaie B : collecte encore a trancher
    // dans le GDD ("butin de combat" = hypothese) — c'est ce qu'on teste ici.
    gain('A', r.A);
    gain('B', r.B);
    recompenses.push({ label: 'Fanions', n: r.A }, { label: 'Sceaux', n: r.B });
    // L'XP du PROFIL DU JOUEUR (config/profil.js) : un niveau atteint donne ses recompenses tout de suite.
    if (r.xp) {
      const p = gagneXp(r.xp);
      recompenses.push({ label: 'XP', n: r.xp });
      for (const n of p.niveaux) notes.push(`Niveau du joueur ${n} !`);
      notes.push(...p.notes);
    }
    // Un boss peut annoncer un heros qui n'existe plus (le Grand Mechant Loup annonce `fox`, devenu
    // `cameleon`) : sans cette garde la victoire plantait avant l'ecran de fin.
    if (ctx.unlocks && save.chars[ctx.unlocks] && CHAR_BY_ID[ctx.unlocks]) {
      save.chars[ctx.unlocks].bossBeaten = true;
      notes.push(`${CHAR_BY_ID[ctx.unlocks].name} peut désormais être acheté avec des Fanions.`);
    }
    save.world.cleared[ctx.id] = true;
    persist();
  }
  // Une ARENE monte d'un niveau a chaque victoire (state.js) ; la fiche montre le prochain.
  if (ctx.arene) {
    const avant = etatArene(ctx.arene).niveau;
    const a = noteCombatArene(ctx.arene, win, ctx.niveau);
    if (a.niveau > avant) notes.push(`L'arène passe au niveau ${a.niveau}.`);
  }
  // Le FIL DE QUETES (state.js) : une victoire compte pour « gagne un combat », et une arene battue se relit toute seule.
  if (win) signale('victoire', { equipe: team().length });

  // `onDone` est lu ici et non au moment du toucher : « Revoir le combat » ouvre un rejeu qui le remplace.
  const fini = onDone;
  const ferme = () => {
    $('#battle').classList.add('hidden');
    $('#battle').classList.remove('spot');
    $('#battle').innerHTML = '';
    B = null;
    if (fini) fini(win);
  };
  const boutons = [];
  // Perdre ne coute rien : on relance tout de suite la meme rencontre (la victoire, elle, paie
  // des recompenses — la rejouer en boucle est une question d'economie, pas d'interface).
  if (!win) boutons.push({ texte: 'Réessayer', primaire: true, onClick: () => { const n = ctx, d = onDone; B = null; openBattle(n, d); } });
  boutons.push({ texte: win ? 'Continuer' : 'Retour', primaire: win, onClick: ferme });
  // « Revoir le combat » le REJOUE devant le joueur ; « Continuer » au bout du rejeu reprend ou celui-ci s'arretait.
  // Le journal de DECISIONS (outil du game designer) n'est plus ici : `AC.triche.decisions()`, 5 touchers sur « Tour N ».
  if (idRecit) boutons.push({ texte: 'Revoir le combat', onClick: () => lanceRejeu(idRecit, ferme) });

  // L'ecran de fin se pose par-dessus le plateau, qui reste visible derriere.
  const root = $('#battle');
  root.classList.remove('spot');
  montreFin({
    racine: root, issue: win ? 'victoire' : (B.abandon || B.winner === 'e' ? 'defaite' : 'nul'),
    sousTitre: win ? `${enc.name} est vaincu.` : B.abandon ? 'Tu as abandonné.' : `${enc.name} tient bon. Reviens plus fort.`,
    recompenses, notes, boutons
  });
}

// ------------------------------------------------------------------ revoir le combat
/**
 * REVOIR UN COMBAT GARDE (ui/combats.js) : on le REJOUE sur l'ecran de combat, avec ses vraies animations. Un combat
 * garde avant le rejeu (sans graine ni actions) ouvre le journal graphique (`ouvreRevue`). `apres` : ce qu'on fait en
 * quittant le rejeu (fermer l'ecran de fin du vrai combat, revenir au Sac).
 */
export function lanceRejeu(id, apres = null) {
  const c = chargeCombat(id);
  if (!c) return false;
  if (!c.rejeu) return ouvreRevue(id);
  openBattle(c.rejeu.opts.node, null, { rejeu: c.rejeu, apres });
  return true;
}

/** Le rejeu avance tout seul, une action a la fois, au rythme du mode auto (et de la vitesse choisie, x8 compris). */
function boucleRejeu() {
  clearTimeout(timer);
  if (!rejeu || rejeu.pause || enPause || !B) return;
  const d = rejeu.donnees, e = rejeu.etat;
  if (B.over || e.i >= d.actions.length) { finirApresLesEffets(); return; }
  timer = setTimeout(() => {
    if (!rejeu || rejeu.pause || enPause) return;
    pas(e, d);
    render();
    boucleRejeu();
  }, delaiAuto());
}

/**
 * SAUTER AU DEBUT DU TOUR `t` (0 = le debut du combat) : le combat est recree et rejoue jusque-la SANS RIEN MONTRER
 * (le moteur va vite : moins d'une seconde), puis l'ecran est remonte et la lecture reprend. Les evenements deja passes
 * ne se rejouent pas (`fx.saute`).
 */
function allerAuTour(t) {
  if (!rejeu) return;
  const d = rejeu.donnees;
  const dernier = toursJoues(d, d.actions.length);
  clearTimeout(timer);
  rejeu.etat = rejoue(d, debutDuTour(d, Math.max(0, Math.min(t, dernier))));
  B = rejeu.etat.B;
  fx.vide();
  fx.saute(B.evts.length);
  evtsRendus = B.evts.length;
  fermeLecture();
  closeModal();
  zoneOuverte = false;
  enPause = false;
  reinitSelection();
  coque = null;
  render();
  boucleRejeu();
}

/** Le rejeu est arrive au bout : l'ecran de fin, sans recompense — continuer, ou revoir encore. */
function finRejeu() {
  clearTimeout(timer);
  fx.vide();
  fermeLecture();
  closeModal();
  const root = $('#battle');
  root.classList.remove('spot');
  const w = B.over ? B.winner : null;
  montreFin({
    racine: root, issue: w === 'p' ? 'victoire' : w === 'e' || !w ? 'defaite' : 'nul',
    sousTitre: rejeu.etat.derive ? 'Les cartes ont changé depuis : ce rejeu n’est plus fidèle.' : !w ? 'Tu avais abandonné.' : 'Fin du combat rejoué.',
    recompenses: [], notes: [],
    boutons: [
      { texte: 'Continuer', primaire: true, onClick: quitteRejeu },
      { texte: 'Revoir encore', onClick: () => allerAuTour(0) }
    ]
  });
}

/** Quitter le rejeu : l'ecran de combat se ferme, la vitesse x8 (propre au rejeu) s'en va, puis `apres`. */
function quitteRejeu() {
  if (!rejeu) return;
  const apres = rejeu.apres;
  clearTimeout(timer);
  fx.vide();
  fx.remetVitesse();
  fermeLecture();
  closeModal();
  rejeu = null;
  coque = null;
  B = null;
  const root = $('#battle');
  root.classList.add('hidden');
  root.classList.remove('spot');
  root.innerHTML = '';
  if (apres) apres();
}
