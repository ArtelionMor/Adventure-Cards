// REVOIR UN COMBAT, POUR DE VRAI : le rejouer avec le moteur, coup par coup (demande du game designer, 21 oct. 2026).
//
// Un combat se rejoue a l'identique si l'on garde trois choses : son POINT DE DEPART (les deux camps tels qu'ils sont
// entres, `createBattle`), une GRAINE pour le hasard du moteur, et la LISTE DES ACTIONS passees par `joue()`.
//
// - Le moteur tire a `Math.random` sans graine : un hasard a graine (`hasard`) le remplace le temps de la creation du
//   combat (`sousGraine`) et de chaque action (`joue(…, rng)`, combat/journal.js) — et seulement la. Le bot qui reflechit, l'apercu d'un coup (une copie du
//   combat jouee a blanc) et les animations gardent le vrai `Math.random` : ils ne consomment rien de la graine, donc la
//   partie se joue exactement comme avant, et se rejoue exactement pareil.
// - Les unites ont un identifiant tire d'un compteur GLOBAL du moteur (« u12 »), que l'apercu et le bot font aussi avancer :
//   le rejeu ne retrouverait pas les memes. Une action s'enregistre donc avec la PLACE des unites sur le plateau
//   (`versPositions`), et se rejoue en relisant l'unite qui est a cette place (`depuisPositions`).
//
// Aucun DOM ici : l'ecran (ui/battle.js) enregistre et rejoue, le banc (scripts/test-rejeu.mjs) verifie qu'un combat
// rejoue finit exactement comme l'original.
import { createBattle } from './engine.js';
import { joue } from './journal.js';

/** Un hasard a graine (mulberry32) : la meme graine rend la meme suite, dans [0, 1). */
export function hasard(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Une graine neuve (32 bits). */
export const nouvelleGraine = () => Math.floor(Math.random() * 4294967296) >>> 0;

/** Joue `fn` avec `rng` a la place de `Math.random`, et le rend quoi qu'il arrive. */
export function sousGraine(rng, fn) {
  if (!rng) return fn();
  const avant = Math.random;
  Math.random = rng;
  try { return fn(); } finally { Math.random = avant; }
}

/** Une copie qui ne partage rien (les camps de depart et les actions sont du JSON pur). */
export const copie = x => JSON.parse(JSON.stringify(x));

const place = (B, side, uid) => (uid === 'hero' ? 'hero' : B[side].board.findIndex(u => u.uid === uid));
const unite = (B, side, pos) => (pos === 'hero' ? 'hero' : (B[side].board[pos] || {}).uid);

/** L'action telle qu'elle s'enregistre : les unites par leur PLACE sur le plateau, pas par leur identifiant. */
export function versPositions(B, k, action) {
  const a = copie(action || { type: 'end' });
  if (a.type === 'attack') a.uid = place(B, k, a.uid);
  if (a.target && a.target.uid !== undefined) a.target = { side: a.target.side, pos: place(B, a.target.side, a.target.uid) };
  return a;
}

/** L'inverse : l'action rejouable sur CE combat, les places relues en identifiants. */
export function depuisPositions(B, k, action) {
  const a = copie(action);
  if (a.type === 'attack') a.uid = unite(B, k, a.uid);
  if (a.target && a.target.pos !== undefined) a.target = { side: a.target.side, uid: unite(B, a.target.side, a.target.pos) };
  return a;
}

/**
 * UN ENREGISTREMENT : `{ graine, depart: { p, e }, opts, actions: [{ k, a, ok }] }`. `opts` est ce qu'on passe a
 * `createBattle` en plus des camps (la rencontre, `evenements`). L'appelant cree le combat et appelle `note` pour
 * chaque action.
 */
export function enregistre(depart, opts = {}) {
  const graine = nouvelleGraine();
  return { graine, rng: hasard(graine), donnees: { graine, depart: copie(depart), opts: copie(opts), actions: [] } };
}

/** Joue une action SOUS LA GRAINE et l'inscrit (`ok` : ce que le moteur en a dit, pour reperer un rejeu qui derive). */
export function joueEtNote(rec, B, k, action, controle = 'bot', niveau = null) {
  const a = versPositions(B, k, action);
  const ok = joue(B, k, action, controle, niveau, rec.rng) !== false;
  rec.donnees.actions.push({ k, a, ok });
  return ok;
}

/**
 * REJOUER : le combat recree depuis son depart, avec son hasard, et les `jusqua` premieres actions appliquees (toutes
 * par defaut). Rend `{ B, rng, i, derive }` : `rng` continue la suite (pour jouer les actions suivantes), `derive` dit
 * qu'une action n'a pas fait ce qu'elle avait fait a l'enregistrement (les cartes ont change depuis).
 */
export function rejoue(donnees, jusqua = Infinity, opts = {}) {
  const rng = hasard(donnees.graine);
  const B = sousGraine(rng, () => createBattle(copie(donnees.depart.p), copie(donnees.depart.e), { ...copie(donnees.opts || {}), ...opts }));
  const etat = { B, rng, i: 0, derive: false };
  while (etat.i < Math.min(jusqua, donnees.actions.length) && !B.over) pas(etat, donnees);
  return etat;
}

/** Applique l'action suivante d'un rejeu en cours. Rend l'action jouee (avec son camp). */
export function pas(etat, donnees) {
  const x = donnees.actions[etat.i++];
  const ok = joue(etat.B, x.k, depuisPositions(etat.B, x.k, x.a), 'bot', null, etat.rng) !== false;
  if (ok !== x.ok) etat.derive = true;
  return x;
}

/** Le nombre de fins de tour dans les `n` premieres actions : le tour ou en est le rejeu (0 = le premier). */
export const toursJoues = (donnees, n) => donnees.actions.slice(0, n).filter(x => x.a.type === 'end').length;

/** L'indice de la premiere action du tour `t` (0 = le debut du combat), ou la fin de la liste. */
export function debutDuTour(donnees, t) {
  if (t <= 0) return 0;
  let fins = 0;
  for (let i = 0; i < donnees.actions.length; i++) if (donnees.actions[i].a.type === 'end' && ++fins === t) return i + 1;
  return donnees.actions.length;
}
