// LES HEROS DEPUIS LA BOUTIQUE (refonte du 3 nov. 2026) : qui est visible, qui est grise, le niveau de reference, les ameliorations en lot,
// l'offre faite a l'arrivee d'un heros, et la file des animations d'amelioration jouees a l'ouverture du heros. Pas de DOM.
// Les valeurs sont dans `BALANCE.heros` (config/balance.js).
import { BALANCE } from '../config/balance.js';
import { CHARACTERS, CHAR_BY_ID, niveauMax } from '../config/characters.js';
import { save, persist, possede, coutEtape, upgradeChar, tutorielFini } from '../state.js';
import { ctx, partie, nomEconomique, indexCourant, change } from './partie.js';
import { requiredCards } from './noyau/engines/heroUnlock.js';

/** Les héros à toi, par niveau décroissant. */
const possedes = () => CHARACTERS.filter(c => possede(c.id)).sort((a, b) => save.chars[b.id].level - save.chars[a.id].level);

// ------------------------------------------------------------------ visibilité (le menu des héros)

/** L'extension d'un héros dans la boutique (la phase A porte ses cartes de base). */
function extensionDe(id) {
  const nom = nomEconomique(id);
  return nom ? ctx.index.cardsByHero.get(nom)?.[0]?.extension : undefined;
}

/**
 * Ce que le menu des héros montre : `ouvert` (à toi), `grise` (ses cartes sont dans les boosters, mais pas toutes découvertes) ou
 * `cache` (aucune de ses cartes ne sort encore : l'extension n'est pas débloquée). Un héros que le jeu t'a donné (le tutoriel) est ouvert.
 */
export function visibilite(id) {
  if (possede(id)) return 'ouvert';
  const e = partie();
  const ext = extensionDe(id);
  if (!e || !ext) return 'cache';
  return e.progression.extensions.includes(ext) ? 'grise' : 'cache';
}

/** Les cartes de base d'un héros découvertes, sur le total à découvrir pour le débloquer. */
export function progresDecouverte(id) {
  const e = partie();
  const nom = nomEconomique(id);
  if (!e || !nom) return { n: 0, sur: 0 };
  const requises = requiredCards(nom, ctx);
  return { n: requises.filter(c => e.collection[c.id] !== undefined).length, sur: requises.length };
}

// ------------------------------------------------------------------ niveau de référence, héros en retard

/** Le niveau du `rang`-ième meilleur héros : celui qu'un trio atteint au moins. */
export function niveauDeReference() {
  const l = possedes();
  if (!l.length) return 1;
  const i = Math.min(BALANCE.heros.reference.rang, l.length) - 1;
  return save.chars[l[i].id].level;
}

const niveauAtteint = id => save.chars[id].level >= niveauMax(CHAR_BY_ID[id]);

/** Les héros sous le niveau de référence (qui peuvent encore monter). */
export const enRetard = () => {
  const ref = niveauDeReference();
  return possedes().filter(c => save.chars[c.id].level < ref && !niveauAtteint(c.id));
};

/** Le prix, à la main, de faire passer un héros au niveau `niveau`. */
export function coutJusquA(id, niveau) {
  let n = 0;
  for (let k = save.chars[id].level - 1; k < niveau - 1; k++) n += coutEtape(CHAR_BY_ID[id], k) ?? 0;
  return n;
}

// ------------------------------------------------------------------ les améliorations en lot

/** Le lot est-il débloqué ? (la ligne de combats a avancé assez ; le tutoriel d'abord). */
export const lotDebloque = () => !!partie() && tutorielFini() && indexCourant() >= BALANCE.heros.lot.apresVictoires;

/** Le bouton flottant se montre (grisé) dès la fin du tutoriel, avant d'être débloqué. */
export const lotVisible = () => !!partie() && tutorielFini();

/** « behind » tant qu'un héros est en retard, « all » ensuite : le bouton flottant n'a qu'un texte à la fois. */
export const modeDuLot = () => (enRetard().length ? 'behind' : 'all');

/** Ce que le prochain lot ferait : les montées prévues (héros, niveau visé) et leur prix. */
export function lotPrevu() {
  const mode = modeDuLot();
  const ref = niveauDeReference();
  const cibles = mode === 'behind'
    ? enRetard().map(c => ({ id: c.id, vers: ref }))
    : possedes().filter(c => !niveauAtteint(c.id)).map(c => ({ id: c.id, vers: save.chars[c.id].level + 1 }));
  return { mode, cibles, cout: cibles.reduce((n, x) => n + coutJusquA(x.id, x.vers), 0) };
}

/** File des animations en attente, par héros : les niveaux gagnés hors de sa fiche, joués à son ouverture. */
const file = () => (save.animations ??= {});
export const animationsEnAttente = id => file()[id] ?? [];
export function prendAnimations(id) {
  const l = file()[id] ?? [];
  delete file()[id];
  persist();
  return l;
}
const enfile = (id, niveau) => { (file()[id] ??= []).push(niveau); };

/**
 * Monte les héros du lot, un niveau à la fois, le plus bas d'abord, tant que les pièces suffisent (chacun reste dans la limite de sa cible).
 * Rend { montees, depense, mode } ; rien de fait si le premier niveau est trop cher.
 */
export function ameliorerEnLot() {
  if (!lotDebloque()) return { montees: 0, depense: 0, mode: modeDuLot(), refus: 'locked' };
  const { mode, cibles } = lotPrevu();
  const avant = save.cur.C;
  let montees = 0;
  for (;;) {
    const candidats = cibles.filter(x => save.chars[x.id].level < x.vers && !niveauAtteint(x.id))
      .sort((a, b) => save.chars[a.id].level - save.chars[b.id].level);
    const x = candidats[0];
    if (!x || upgradeChar(x.id) !== 'ok') break;
    enfile(x.id, save.chars[x.id].level);
    montees++;
  }
  persist();
  change();
  return { montees, depense: avant - save.cur.C, mode, refus: montees ? null : 'poor' };
}

// ------------------------------------------------------------------ l'offre à l'arrivée d'un héros

/** Les héros déjà annoncés et les offres qui attendent (sauvegarde du jeu, champs créés au besoin). */
const vus = () => (save.herosVus ??= possedes().map(c => c.id));
const offres = () => (save.offres ??= []);

/** Repère les héros arrivés depuis la dernière fois : un héros sous le niveau de référence reçoit une offre. */
export function reperesLesArrivees() {
  const ref = niveauDeReference();
  for (const c of possedes()) {
    if (vus().includes(c.id)) continue;
    vus().push(c.id);
    if (save.chars[c.id].level < ref) offres().push(c.id);
  }
  persist();
}

/** L'offre d'un héros : le niveau visé et son prix en pièces (une part du prix à la main). */
export function offreDe(id) {
  const vers = niveauDeReference();
  return { id, vers, cout: Math.round(coutJusquA(id, vers) * BALANCE.heros.offre.remise) };
}

/** La prochaine offre qui attend (une offre dont le héros a rattrapé son retard disparaît). */
export function offreEnAttente() {
  const l = offres();
  while (l.length && save.chars[l[0]].level >= niveauDeReference()) l.shift();
  return l.length ? offreDe(l[0]) : null;
}

export const refuseOffre = () => { offres().shift(); persist(); };

/** Accepte l'offre : le héros passe au niveau de référence, ses animations attendent son ouverture. */
export function accepteOffre() {
  const o = offreEnAttente();
  if (!o) return 'none';
  if (save.cur.C < o.cout) return 'poor';
  save.cur.C -= o.cout;
  while (save.chars[o.id].level < o.vers && !niveauAtteint(o.id)) { save.chars[o.id].level++; enfile(o.id, save.chars[o.id].level); }
  offres().shift();
  persist();
  change();
  return 'ok';
}

// ------------------------------------------------------------------ le mode Auto

/** Le mode Auto est verrouillé au départ : il vient avec le rang atteint dans la ligne de combats (le tutoriel garde le sien). */
export const autoDebloque = () => !partie() || !tutorielFini() || indexCourant() >= BALANCE.heros.auto.apresVictoires;
