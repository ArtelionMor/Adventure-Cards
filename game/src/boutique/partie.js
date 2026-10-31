// LA PARTIE DE BOUTIQUE : l'etat du noyau, sa sauvegarde (cle a part de celle du jeu), le temps et le resume d'absence.
// Pas de DOM. Les ecrans lisent `partie()` et appellent les moteurs du noyau avec `ctx`, puis `change()`.
import { BOUTIQUE } from '../config/boutique.js';
import { createContext } from './noyau/context.js';
import { CARTES, CONFIG } from './noyau/donnees.js';
import { recordWin } from './noyau/engines/progression.js';
import { tick } from './noyau/engines/tick.js';
import { createShop, syncBaseFurniture } from './noyau/engines/shop.js';
import { createState } from './noyau/state.js';

const CLE = 'adventureCard.boutique.v1';
const ecouteurs = new Set();
let resume = null;
let etat = null;
let dernier = 0;
let compte = 0;

function recoit(e) {
  if (resume && e.t === 'sale') {
    resume.ventes++;
    resume.or += e.price;
    resume.canaux[e.channel] = (resume.canaux[e.channel] || 0) + 1;
  }
  if (resume && e.t === 'heroUnlocked') resume.heros.push(e.hero);
  for (const f of ecouteurs) f(e);
}

export const ctx = createContext(CONFIG, CARTES, Date.now() >>> 0, recoit);
export const partie = () => etat;
export const ecoute = f => { ecouteurs.add(f); return () => ecouteurs.delete(f); };

export function sauve() {
  if (!etat) return;
  try { localStorage.setItem(CLE, JSON.stringify({ etat, rng: ctx.rng.state, quand: dernier })); } catch { /* stockage plein : on retentera */ }
}

/** A appeler apres une action du joueur : previent les ecrans et sauvegarde. */
export function change() {
  sauve();
  for (const f of ecouteurs) f({ t: 'change' });
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
  } else etat = createState(ctx);

  const absence = Date.now() - dernier;
  resume = { absenceMs: absence, ventes: 0, or: 0, canaux: {}, heros: [] };
  avance();
  const fini = resume;
  resume = null;
  sauve();
  setInterval(() => {
    avance();
    if (++compte >= BOUTIQUE.sauvegardeToutesLesS) { compte = 0; sauve(); }
    for (const f of ecouteurs) f({ t: 'seconde' });
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) sauve(); });
  addEventListener('beforeunload', sauve);
  return absence >= BOUTIQUE.resumeHorsLigneDesS * 1000 && fini.ventes > 0 ? fini : null;
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
