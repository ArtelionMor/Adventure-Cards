// TELIAU, L'AIDE DU JOUEUR BLOQUE (refonte boutique, lot 5, 3 nov. 2026) : detecte qu'un joueur est coince dans la ligne de combats, propose un
// duel facile tres recompense ou remplace son adversaire, et dit quand un prix de vitrine est trop cher. Tout se regle dans `config/teliau.js`.
// Pas de DOM : l'interface (la bulle de `ui/arene.js`, celle de la fiche de prix) lit ces fonctions. L'etat vit dans `save.teliau`.
import { BALANCE } from '../config/balance.js';
import { TELIAU } from '../config/teliau.js';
import { COURBES, NIVEAUX } from '../config/ligne.js';
import { equipeDefi } from '../config/defi.js';
import { CHARACTERS } from '../config/characters.js';
import { save, persist, possede, puissanceEquipe } from '../state.js';
import { CONFIG } from './noyau/donnees.js';
import { buyerReaction } from './noyau/engines/pricing.js';
import { quoteShowcase } from './noyau/engines/showcase.js';
import { combatDeBase, combatDeLaLigne, indexCourant, ctx, partie, ecoute, brancheRemplacement } from './partie.js';

const MIN = 60000;
const etat = () => (save.teliau ??= { actifMs: 0, defaites: 0, remplace: {}, duel: { dernierActifMs: -1e12, jour: '', n: 0 }, tempsTotalMs: 0 });

// ------------------------------------------------------------------ le blocage

/** Le joueur a avance : la ligne repart de zero (defaites et temps de jeu sans progres). */
export function noteProgres() {
  const e = etat();
  e.actifMs = 0;
  e.defaites = 0;
  for (const k of Object.keys(e.remplace)) if (+k < indexCourant()) delete e.remplace[k];
  persist();
}

/** Une defaite dans la ligne de combats (le combat courant, pas un combat rejoue). */
export function noteDefaiteLigne(arene, niveau) {
  const c = combatDeLaLigne(indexCourant());
  if (arene !== c.arene || niveau !== c.niveau) return;   // un combat deja fait, rejoue : ce n'est pas un blocage
  etat().defaites++;
  persist();
}

/** Le temps de jeu : une seconde de plus quand l'application est a l'ecran. */
function seconde() {
  const e = etat();
  if (typeof document !== 'undefined' && document.hidden) return;
  e.actifMs += 1000;
  e.tempsTotalMs += 1000;
}

export const bloque = () => {
  const e = etat(), c = TELIAU.bloque;
  return e.defaites >= c.defaitesDeSuite || e.actifMs >= c.tempsSansProgresMin * MIN;
};
const doitRemplacer = () => {
  const e = etat(), c = TELIAU.remplace;
  return e.defaites >= c.defaitesDeSuite || e.actifMs >= c.tempsSansProgresMin * MIN;
};

// ------------------------------------------------------------------ remplacer l'adversaire

const interpole = (xs, ys, x) => {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * ((x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1));
  return ys[ys.length - 1];
};

/** Le niveau d'adversaire que bat un trio de `power`, sur la courbe mesuree de `arene` ; `null` si meme son niveau 1 est trop dur. */
export function niveauPourPower(arene, power) {
  const courbe = COURBES[arene];
  if (!courbe) return null;
  const niveauHeros = power / (BALANCE.heros.power.parNiveau * BALANCE.ligne.rang);
  if (niveauHeros < courbe[0]) return null;
  // La courbe est croissante : on cherche le niveau d'adversaire dont elle vaut `niveauHeros`.
  let n = NIVEAUX[NIVEAUX.length - 1];
  for (let i = 1; i < NIVEAUX.length; i++) {
    if (niveauHeros <= courbe[i]) { n = NIVEAUX[i - 1] + (NIVEAUX[i] - NIVEAUX[i - 1]) * ((niveauHeros - courbe[i - 1]) / (courbe[i] - courbe[i - 1] || 1)); break; }
  }
  return Math.max(1, Math.min(BALANCE.arenes.niveauMax, Math.round(n)));
}

/** Le Power que demande `arene` au niveau `niveau`, d'apres la courbe mesuree. */
export const puissanceDe = (arene, niveau) => Math.round(BALANCE.heros.power.parNiveau * BALANCE.ligne.rang * interpole(NIVEAUX, COURBES[arene], niveau));

/**
 * Le combat qui remplacerait le combat `i` pour une equipe de Power `power` : le meme adversaire a un niveau plus bas s'il y gagne, sinon un
 * autre qu'elle bat. `null` s'il n'y a rien de plus facile.
 */
export function choisitRemplacement(i, power) {
  const base = combatDeBase(i);
  const cible = power * TELIAU.remplace.marge;
  const propose = arene => {
    const n = niveauPourPower(arene, cible);
    return n === null ? null : { arene, niveau: n, puissance: puissanceDe(arene, n) };
  };
  const plafond = base.puissance ?? Infinity;
  const meme = propose(base.arene);
  if (meme && meme.niveau < base.niveau && meme.puissance < plafond) return meme;
  let meilleur = null;
  for (const o of CONFIG.meta.opponents) {
    if (o.id === base.arene) continue;
    const p = propose(o.id);
    if (p && p.puissance < plafond && (!meilleur || p.puissance > meilleur.puissance)) meilleur = p;
  }
  return meilleur;
}

/** Remplace l'adversaire du combat courant. Rend le combat choisi, ou `null`. */
export function remplaceLAdversaire() {
  const i = indexCourant();
  const r = choisitRemplacement(i, puissanceEquipe());
  if (!r) return null;
  etat().remplace[i] = r;
  etat().defaites = 0;
  etat().actifMs = 0;
  persist();
  return r;
}

// ------------------------------------------------------------------ le duel facile

const jour = () => new Date().toDateString();

/** Teliau peut-il offrir un duel facile maintenant ? */
function duelPossible() {
  const e = etat(), d = TELIAU.duelFacile;
  const auj = e.duel.jour === jour() ? e.duel.n : 0;
  return auj < d.parJour && e.tempsTotalMs - e.duel.dernierActifMs >= d.attenteMin * MIN;
}

/** L'equipe de Teliau : des heros au hasard, a `ratioNiveau` de ta meilleure combinaison. */
export function equipeDuelFacile(hasard = Math.random) {
  const mes = CHARACTERS.filter(c => possede(c.id));
  const n = Math.max(1, Math.min(save.rosterSlots, mes.length));
  const niveaux = mes.map(c => Math.max(1, Math.round(save.chars[c.id].level * TELIAU.duelFacile.ratioNiveau)));
  const e = equipeDefi(niveaux, n, hasard);
  return { ...e, tete: TELIAU.tete, nom: TELIAU.nom, recompense: { ...TELIAU.duelFacile.recompense } };
}

/** Le duel part : il compte pour aujourd'hui, et pour l'attente avant le suivant. */
export function noteDuelLance() {
  const e = etat();
  e.duel = { dernierActifMs: e.tempsTotalMs, jour: jour(), n: (e.duel.jour === jour() ? e.duel.n : 0) + 1 };
  persist();
}

/** Les aides que Teliau propose maintenant sur le combat courant (vide : il se tait). */
export function aides() {
  if (!partie() || !bloque()) return [];
  const l = [];
  if (duelPossible()) l.push({ id: 'duel', recompense: TELIAU.duelFacile.recompense });
  if (doitRemplacer()) {
    const r = choisitRemplacement(indexCourant(), puissanceEquipe());
    if (r) l.push({ id: 'remplace', remplacement: r });
  }
  return l;
}

// ------------------------------------------------------------------ le prix trop cher

/** « Ce prix est trop cher » : des clients arrives le trouvent trop cher, ou l'attente estimee est longue. Rend `{ attente }`, ou `null`. */
export function prixTropCher(inst, prix) {
  const S = partie();
  if (!S || !(prix > 0)) return null;
  const arrives = CONFIG.buyers.profiles.filter(b => S.progression.clients.includes(b.id));
  const trop = arrives.filter(b => buyerReaction(b, inst, prix, S, ctx) === 'tropCher').length;
  const q = quoteShowcase(S, inst.id, prix, ctx);
  const longue = q.ok && q.value.meanMinutes > TELIAU.prix.attenteMaxMin;
  return trop >= TELIAU.prix.clientsTropCher || longue ? { attente: q.ok ? q.value.label : '' } : null;
}

// ------------------------------------------------------------------ branchement

export function installeTeliau() {
  brancheRemplacement(i => etat().remplace[i] ?? null);
  ecoute(e => {
    if (e.t === 'seconde') seconde();
    if (e.t === 'opponentBeaten') noteProgres();
  });
}
