// LA PARTIE DE BOUTIQUE : l'etat du noyau, sa sauvegarde (cle a part de celle du jeu), le temps et le resume d'absence.
// Pas de DOM. Les ecrans lisent `partie()` et appellent les moteurs du noyau avec `ctx`, puis `change()`.
import { BOUTIQUE } from '../config/boutique.js';
import { persist, save } from '../state.js';
import { createContext } from './noyau/context.js';
import { CARTES, CONFIG } from './noyau/donnees.js';
import { recordWin } from './noyau/engines/progression.js';
import { tick } from './noyau/engines/tick.js';
import { createShop, syncBaseFurniture } from './noyau/engines/shop.js';
import { createState } from './noyau/state.js';

const CLE = 'adventureCard.boutique.v1';
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

export const ctx = createContext(CONFIG, CARTES, Date.now() >>> 0, recoit);
export const partie = () => etat;
export const ecoute = f => { ecouteurs.add(f); return () => ecouteurs.delete(f); };
/** `f(resume)` : le joueur revient apres avoir quitte l'application sans la fermer. */
export const surRetour = f => { retour = f; };

export function sauve() {
  if (!etat) return;
  try { localStorage.setItem(CLE, JSON.stringify({ etat, rng: ctx.rng.state, quand: dernier })); } catch { /* stockage plein : on retentera */ }
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
  e.version = 4;
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
  } else etat = { ...createState(ctx), vues: {}, version: 4 };
  lieLaBourse(etat);
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

/** Le combat n° `i` de la ligne (0 = le premier). `niveau` : le niveau de l'adversaire a ce combat. */
export function combatDeLaLigne(i) {
  const w = parAdversaire(), n = nbAdversaires();
  const parPalier = n * w;
  const palier = Math.floor(i / parPalier) + 1;
  const dans = i % parPalier;
  const opponent = CONFIG.meta.opponents[Math.floor(dans / w)];
  return { i, palier, arene: opponent.id, niveau: (palier - 1) * w + (dans % w) + 1 };
}

/** Une victoire fait avancer la ligne si c'est le combat courant : rejouer un combat passe ne compte pas. */
export function noteVictoireBoutique(arene, niveau) {
  if (!etat) return;
  const c = combatDeLaLigne(indexCourant());
  if (arene !== c.arene || niveau !== c.niveau) return;
  recordWin(etat, ctx);
  change();
}

/** Avance le temps a la main (console : `AC.boutique.avance(60)`). */
export function avanceDeMinutes(minutes) {
  tick(etat, minutes * 60000, ctx);
  change();
}
