// LA PARTIE DE BOUTIQUE : l'etat du noyau, sa sauvegarde (cle a part de celle du jeu), le temps et le resume d'absence.
// Pas de DOM. Les ecrans lisent `partie()` et appellent les moteurs du noyau avec `ctx`, puis `change()`.
import { BOUTIQUE } from '../config/boutique.js';
import { BALANCE } from '../config/balance.js';
import { persist, sauvegardeFigee, save, brancheCartes, brancheAmelioration } from '../state.js';
import { CHARACTERS } from '../config/characters.js';
import { LIGNE } from '../config/ligne.js';
import { createContext } from './noyau/context.js';
import { CARTES, CONFIG } from './noyau/donnees.js';
import { recordWin, startProgression } from './noyau/engines/progression.js';
import { tick } from './noyau/engines/tick.js';
import { createShop, syncBaseFurniture } from './noyau/engines/shop.js';
import { createState, recordDeckPlayed } from './noyau/state.js';
import { unlockClients, noteTableGame } from './noyau/engines/buyers.js';

const CLE = BALANCE.save.cleBoutique;
const ecouteurs = new Set();
let resume = null;      // ce qui arrive pendant une absence : le recapitulatif du retour
let retour = null;
let etat = null;
let dernier = 0;
let compte = 0;

const nouveauResume = () => ({ absenceMs: 0, or: 0, vendues: [], gagnees: [], perdues: [], gradees: [], heros: [] });

function note(e) {
  if (e.t === 'sale') {
    resume.or += e.price;
    resume.vendues.push({ cardId: e.cardId, prix: e.price, canal: e.channel });
  }
  if (e.t === 'auctionWon') resume.gagnees.push({ cardId: e.cardId, prix: e.price });
  if (e.t === 'auctionLost') resume.perdues.push({ cardId: e.cardId, prix: e.price });
  if (e.t === 'gradeDone') resume.gradees.push({ cardId: e.cardId, note: e.grade, instanceId: e.instanceId });
  if (e.t === 'heroUnlocked') resume.heros.push(e.hero);
}

function recoit(e) {
  if (resume) note(e);
  for (const f of ecouteurs) f(e);
}

// Un retour merite un recapitulatif s'il a dure, et s'il y a quelque chose a dire.
const aDire = r => r.absenceMs >= BOUTIQUE.resumeHorsLigneDesS * 1000 && (r.vendues.length || r.gagnees.length || r.perdues.length || r.gradees.length);

// LE HEROS DU JEU ET LE HEROS DE L'ECONOMIE : les noms ne different que par les accents (Félix / Felix, Athéna / Athena).
const sansAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const NOM_ECO = new Map(CARTES.map(c => [sansAccent(c.hero), c.hero]));
/** Le nom du héros dans le noyau de la boutique (`state.heroes`), à partir de l'identifiant du jeu (`lapin1`, `dog`…). */
export const nomEconomique = id => NOM_ECO.get(sansAccent(CHARACTERS.find(c => c.id === id)?.name ?? ''));

export const ctx = createContext(CONFIG, CARTES, Date.now() >>> 0, recoit);
export const partie = () => etat;
export const ecoute = f => { ecouteurs.add(f); return () => ecouteurs.delete(f); };
/** `f(resume)` : le joueur revient apres avoir quitte l'application sans la fermer. */
export const surRetour = f => { retour = f; };

export function sauve() {
  if (!etat || sauvegardeFigee()) return;
  try { localStorage.setItem(CLE, JSON.stringify({ etat, rng: ctx.rng.state, quand: dernier })); } catch { /* stockage plein : on retentera */ }
}

/** Des boosters premium offerts (la recompense d'un defi de client). */
export function donneBoosterPremium(id, n = 1) {
  etat.boosters.premium[id] = (etat.boosters.premium[id] ?? 0) + n;
  change();
}

/** A appeler apres une action du joueur : previent les ecrans et sauvegarde. */
export function change() {
  sauve();
  for (const f of ecouteurs) f({ t: 'change' });
}

// UNE SEULE BOURSE (31 octobre 2026) : l'or du noyau EST les pieces du jeu (`save.cur.C`), celles de la barre du haut. Deux
// monnaies au meme dessin faisaient refuser un meuble (« Or insuffisant ») a un joueur qui avait 200 pieces a l'ecran. Le noyau ne
// le sait pas : il lit et ecrit `gold`, qui mene aux pieces. L'or d'une ancienne partie les rejoint une fois.
function lieLaBourse(e) {
  if (!e.bourseUnique) save.cur.C += e.gold;
  e.bourseUnique = true;
  Object.defineProperty(e, 'gold', { get: () => save.cur.C, set: v => { save.cur.C = v; }, enumerable: true, configurable: true });
}

// Une partie faite avant le 31 octobre 2026 : les paliers ont change (acheter aux encheres d'abord, vendre ensuite), on repose ceux
// qu'elle a deja passes ; ses cartes comptent comme vues, sinon toute sa collection serait « nouvelle ».
function metAJour(e) {
  if ((e.version ?? 1) < 2) {
    const p = e.progression;
    const faits = CONFIG.progression.steps.slice(0, p.stepIndex);
    p.features = [...new Set([...p.features, ...faits.flatMap(s => s.features)])];
    p.auctionSlots = Math.max(e.auctions.length, faits.at(-1)?.auctionSlots ?? 0);
    e.vues = Object.fromEntries(Object.keys(e.collection).map(id => [id, true]));
  }
  // Les encheres d'achat a lots et le grading qui prend du temps : les anciennes offres a prix fixe disparaissent.
  if ((e.version ?? 1) < 3) {
    e.market = { lots: [], nextLotId: 1, nextRefreshMs: e.nowMs, rngState: e.market.rngState };
    e.gradingQueue = [];
  }
  // Les entreprises de grading et le tableau des miseurs : ce qui existait passe chez l'entreprise neutre, sans rien perdre.
  if ((e.version ?? 1) < 4) {
    const company = CONFIG.grading.defaultCompany;
    for (const i of Object.values(e.instances)) i.slab = i.grade === null ? null : { company, by: null, atMs: e.nowMs };
    for (const g of e.gradingQueue) g.company = company;
    for (const l of e.market.lots) {
      Object.assign(l, { finish: 'normal', grade: null, slab: null, rivals: [l.rival, l.rival + 1, l.rival + 2], bids: [] });
      if (l.holder) l.bids.push({ who: l.holder === 'player' ? 'player' : l.rival, amount: l.price });
    }
  }
  // La wishlist (2 nov. 2026) : le rang par defaut s'appelle « N » (sans rang) ; « C » devient un vrai rang, a 7 places.
  if ((e.version ?? 1) < 5) {
    for (const h of Object.values(e.heroes)) if (h.tier === 'C') h.tier = CONFIG.tiers.defaultTier;
  }
  // Refonte du 3 nov. 2026 : extensions en deux phases (A : base, B : switch), plus de verrou de deck, parties jouees par carte, doublons aux
  // encheres, identifiants en anglais (`Control`). Les paliers ont change de place : on les repose d'apres la position dans la ligne, sans
  // rendre ni gems ni boosters premium deux fois, et sans rien retirer a un joueur (une extension deja ouverte garde ses switch).
  if ((e.version ?? 1) < 6) {
    const p = e.progression;
    const { gems, premium } = { gems: e.gems, premium: { ...e.boosters.premium } };
    const anciennes = [...p.extensions];
    const fonctions = [...p.features];
    p.stepIndex = 0;
    p.extensions = [];
    p.switchExtensions = [];
    p.features = [];
    startProgression(e, ctx);
    e.gems = gems;
    e.boosters.premium = premium;
    for (const x of anciennes) {
      if (!p.extensions.includes(x)) p.extensions.push(x);
      if (!p.switchExtensions.includes(x)) p.switchExtensions.push(x);
    }
    p.features = [...new Set([...p.features, ...fonctions])];
    e.boosters.pityByExtension = {};
    e.plays = {};
    e.lastDeck = null;
    delete e.lockedByDeck;
    for (const l of e.market.lots) l.owned = e.collection[l.cardId] !== undefined;
  }
  // Les dix clients (3 nov. 2026) : Johnny devient Jenna ; les clients deja arrives se recalculent d'apres les paliers passes, les tables posees et
  // les ameliorations faites ; les produits se relisent dans l'ordre des extensions (la phase A, puis la B).
  if ((e.version ?? 1) < 7) {
    const p = e.progression;
    p.products = [...p.extensions.map(x => `${x}:A`), ...p.switchExtensions.map(x => `${x}:B`)];
    p.clients = [];
    e.tableAtMs = null;
    unlockClients(e, ctx, 'start');
    for (const s of CONFIG.progression.steps.slice(0, p.stepIndex)) unlockClients(e, ctx, 'step', s.id);
    if (e.shop.items.some(i => i.type === 'tableJeu')) unlockClients(e, ctx, 'table');
    if (CHARACTERS.some(c => (save.chars[c.id]?.level ?? 1) > 1)) unlockClients(e, ctx, 'heroUpgrade');
    for (const l of e.showcase) if (l.buyer === 'Johnny') l.buyer = 'Jenna';
    e.clientsVus = [...p.clients];   // les clients deja la ne refont pas leur entree
  }
  e.version = 7;
}

function avance() {
  const maintenant = Date.now();
  const dt = maintenant - dernier;
  if (dt <= 0) return;
  dernier = maintenant;
  tick(etat, dt, ctx);
}

/** Charge la partie, rattrape l'absence et lance le temps. Rend le resume, ou null s'il n'y a rien a dire. */
export function demarreBoutique() {
  let brut = null;
  try { brut = JSON.parse(localStorage.getItem(CLE)); } catch { /* sauvegarde illisible : partie neuve */ }
  dernier = Date.now();
  if (brut?.etat) {
    etat = brut.etat;
    ctx.rng.state = brut.rng;
    dernier = brut.quand;
    // Une sauvegarde d'avant le plan de la boutique : ses cartes en vitrine prennent place sur les presentoirs.
    if (!etat.shop) {
      etat.shop = createShop(CONFIG);
      syncBaseFurniture(etat, ctx);
      const presentoirs = etat.shop.items.filter(i => i.type === 'presentoir');
      etat.showcase.forEach((l, i) => { l.displayId = presentoirs[i]?.id ?? null; });
    }
    metAJour(etat);
    syncBaseFurniture(etat, ctx);   // les objets des niveaux de boutique deja atteints (une ancienne sauvegarde les recoit)
  } else etat = { ...createState(ctx), vues: {}, version: 7, clientsVus: [] };
  lieLaBourse(etat);
  // Un héros dont toutes les cartes de base sont découvertes est à toi (`possede`, state.js).
  brancheCartes(id => !!etat?.heroes[nomEconomique(id)]?.unlocked);
  brancheAmelioration(() => { if (etat) unlockClients(etat, ctx, 'heroUpgrade'); });
  persist();

  const absence = Date.now() - dernier;
  resume = nouveauResume();
  avance();
  const fini = { ...resume, absenceMs: absence };
  resume = null;
  sauve();
  setInterval(() => {
    avance();
    if (++compte >= BOUTIQUE.sauvegardeToutesLesS) { compte = 0; sauve(); }
    for (const f of ecouteurs) f({ t: 'seconde' });
  }, 1000);
  let parti = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { sauve(); resume = nouveauResume(); parti = Date.now(); return; }
    if (!resume) return;
    avance();
    const r = { ...resume, absenceMs: Date.now() - parti };
    resume = null;
    if (aDire(r)) retour?.(r);
  });
  addEventListener('beforeunload', sauve);
  return aDire(fini) ? fini : null;
}

// LES CARTES NOUVELLES : decouvertes (dans la collection) et pas encore vues. Ce sont elles qui allument la pastille rouge.
export const cartesNouvelles = () => (etat ? Object.keys(etat.collection).filter(id => !etat.vues[id]) : []);
export function marqueVues(ids) {
  for (const id of ids) etat.vues[id] = true;
  change();
}

export const adversaireCourant = () => CONFIG.meta.opponents[etat.progression.opponentIndex]?.id;

// LA LIGNE DE COMBATS : toute la progression a la suite. Un combat = un adversaire a un niveau : `winsToAdvance` combats par
// adversaire, puis le suivant ; apres le dernier, le palier monte et la ligne repasse par tous, plus forts.
const parAdversaire = () => CONFIG.progression.ladder.winsToAdvance;
const nbAdversaires = () => CONFIG.meta.opponents.length;
export const longueurLigne = () => CONFIG.progression.ladder.levelMax * nbAdversaires() * parAdversaire();

export function indexCourant() {
  const p = etat.progression;
  return ((p.level - 1) * nbAdversaires() + p.opponentIndex) * parAdversaire() + p.wins;
}

/**
 * Le combat n° `i` de la ligne (0 = le premier). `niveau` : le niveau de l'adversaire a ce combat ; `puissance` : le Power requis, celui
 * d'un trio qui le bat une fois sur deux. Ils viennent de `config/ligne.js` (mesures, `scripts/calibre-power.mjs`) ; sans ligne ecrite,
 * l'adversaire est celui de `meta.opponents` et son niveau monte d'un cran a chaque tour de la liste.
 */
export function combatDeLaLigne(i) {
  const w = parAdversaire(), n = nbAdversaires();
  const parPalier = n * w;
  const palier = Math.floor(i / parPalier) + 1;
  const dans = i % parPalier;
  const mesure = LIGNE[i];
  const opponent = CONFIG.meta.opponents[Math.floor(dans / w)];
  if (mesure) return { i, palier, arene: opponent.id, niveau: mesure.niveau, puissance: mesure.puissance };
  return { i, palier, arene: opponent.id, niveau: (palier - 1) * w + (dans % w) + 1, puissance: null };
}

/** Une victoire fait avancer la ligne si c'est le combat courant : rejouer un combat passe ne compte pas. */
export function noteVictoireBoutique(arene, niveau) {
  if (!etat) return;
  const c = combatDeLaLigne(indexCourant());
  if (arene !== c.arene || niveau !== c.niveau) return;
  recordWin(etat, ctx);
  change();
}

/** Un client vient de jouer une partie a une table : Brock passe acheter juste apres. */
export function noteTablePartie() {
  if (!etat) return;
  noteTableGame(etat, ctx);
  change();
}

// L'ENTREE DES CLIENTS : ceux qui sont arrives et n'ont pas encore eu leur scene d'intro (un zoom sur le client, puis sa carte).
export const clientsAIntroduire = () => (etat ? etat.progression.clients.filter(id => !(etat.clientsVus ?? []).includes(id)) : []);
export function marqueClientVu(id) {
  (etat.clientsVus ??= []).push(id);
  change();
}

/** Un combat joue (gagne ou perdu) : les cartes du deck gagnent une partie jouee et ce deck devient le dernier deck joue (mode Auto, Cipher). */
export function noteCombatBoutique(heros, cartes) {
  if (!etat) return;
  recordDeckPlayed(etat, { heroes: heros, cards: cartes });
  change();
}

/** Une absence, avec son recapitulatif (console de triche). Rend faux s'il n'y a rien a dire. */
export function simuleAbsence(minutes) {
  resume = nouveauResume();
  tick(etat, minutes * 60000, ctx);
  const r = { ...resume, absenceMs: minutes * 60000 };
  resume = null;
  change();
  if (!aDire(r)) return false;
  retour?.(r);
  return true;
}

/** Avance le temps a la main (console : `AC.boutique.avance(60)`). */
export function avanceDeMinutes(minutes) {
  tick(etat, minutes * 60000, ctx);
  change();
}
