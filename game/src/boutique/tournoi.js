// LE TOURNOI DE LA BOUTIQUE (2 nov. 2026) : le tableau des defis annonce de temps en temps un tournoi a quatre — le joueur et trois clients,
// demi-finales puis finale — ou le joueur peut s'inscrire (gratuit). Ses matchs sont des duels comme ceux d'un defi (`ui/defi.js`) ; l'autre
// demi-finale se joue sans lui. Le gain depend du tour atteint (`BOUTIQUE.tournoi.recompenses`). Aucune regle d'economie du noyau :
// l'etat vit dans la boutique (`partie().tournoi`, sauvegarde avec elle) et le gain est un booster premium (`donneBoosterPremium`).
import { BOUTIQUE } from '../config/boutique.js';
import { equipeDefi } from '../config/defi.js';
import { save, possede } from '../state.js';
import { donneBoosterPremium, change, partie } from './partie.js';

const T = BOUTIQUE.tournoi;
const hasard = ([a, b]) => a + Math.random() * (b - a);
const TETES = Object.keys(BOUTIQUE.dossierDe);
const nomDe = tete => `${tete[0].toUpperCase()}${tete.slice(1)}`;

/** L'etat du tournoi, mis a jour avec l'heure de la boutique : `attente` -> `ouvert` (inscriptions) -> `inscrit` (le joueur joue) -> `attente`. */
export function etatTournoi() {
  const S = partie();
  const t = S.tournoi ??= { etat: 'attente', suivantMs: S.nowMs + hasard(T.premierS) * 1000 };
  if (t.etat === 'attente' && S.nowMs >= t.suivantMs) ouvre(t, S.nowMs);
  if (t.etat === 'ouvert' && S.nowMs >= t.finMs) { t.etat = 'attente'; t.suivantMs = S.nowMs + hasard(T.delaiS) * 1000; }
  if (t.etat === 'ouvert' && !t.adv) prepare(t);   // un tournoi ouvert avant que le tableau existe
  return t;
}

/** Ouvre les inscriptions : les trois adversaires sont connus tout de suite (leur equipe se tire a l'inscription). */
function ouvre(t, maintenant) {
  t.etat = 'ouvert';
  t.finMs = maintenant + T.inscriptionS * 1000;
  t.dernier = null;
  prepare(t);
}

/** Le tableau : le joueur et `adv[0]` jouent la demi-finale ; `adv[1]` et `adv[2]` l'autre, que `autre` (1 ou 2) gagne. */
function prepare(t) {
  const tetes = [...TETES].sort(() => Math.random() - 0.5).slice(0, 3);
  t.adv = tetes.map(tete => ({ tete, nom: nomDe(tete) }));
  t.autre = Math.random() < 0.5 ? 1 : 2;
}

/**
 * Qui est elimine, pour le tableau du widget : `{ toi, 0, 1, 2 }` (vrai = elimine). Les deux demi-finales se jouent a la fois : tant que la
 * demi-finale du joueur n'est pas jouee, personne n'est sorti ; ensuite le perdant de l'autre demi-finale l'est aussi.
 */
export function elimines(t) {
  const sorti = { toi: false, 0: false, 1: false, 2: false };
  if (!t.adv) return sorti;
  const perdantAutre = t.autre === 1 ? 2 : 1;
  if (t.etat === 'inscrit' && t.tour === 2) { sorti[0] = true; sorti[perdantAutre] = true; }
  if (t.etat === 'attente' && t.dernier) {
    sorti[perdantAutre] = true;
    if (t.dernier.issue === 'perdu1') sorti.toi = true;
    else { sorti[0] = true; if (t.dernier.issue === 'finale') sorti.toi = true; else sorti[t.autre] = true; }
  }
  return sorti;
}

/** La triche : ouvre les inscriptions tout de suite. Rend ce qui s'est passe, en une phrase. */
export function ouvreLeTournoi() {
  const t = etatTournoi();
  if (t.etat === 'inscrit') return 'Tu es déjà inscrit à un tournoi.';
  ouvre(t, partie().nowMs);
  change();
  return 'Tournoi ouvert : touche la bulle du tableau des défis.';
}

/** Les trois adversaires et l'issue de l'autre demi-finale ; le joueur est inscrit. */
export function inscrire() {
  const t = etatTournoi();
  if (t.etat !== 'ouvert') return false;
  const mes = Object.keys(save.chars).filter(possede);
  const n = Math.max(1, Math.min(save.rosterSlots, mes.length));
  const niveaux = mes.map(id => save.chars[id].level);
  // Leurs equipes se tirent maintenant : elles valent ce que vaut le joueur a l'inscription.
  for (const a of t.adv) a.equipe = equipeDefi(niveaux, n);
  t.tour = 1;
  t.etat = 'inscrit';
  t.dernier = null;
  change();
  return true;
}

/** L'adversaire du match que le joueur va jouer. */
export const adversaireDuTour = () => { const t = etatTournoi(); return t.etat === 'inscrit' ? t.adv[t.tour === 1 ? 0 : t.autre] : null; };

/** Le noeud de combat du match (comme un defi, sans recompense : le gain vient a la fin du tournoi). */
export const noeudDuMatch = adv => ({ id: 'defi', defi: { ...adv.equipe, nom: adv.nom, tete: adv.tete, recompense: { booster: null, n: 0 } }, niveau: adv.equipe.total });

/** Le match est joue. Rend `{ fini, issue, n }` : `issue` = 'perdu1' | 'finale' | 'victoire' quand le tournoi est fini. */
export function finDuMatch(gagne) {
  const t = etatTournoi();
  if (t.etat !== 'inscrit') return { fini: false };
  if (gagne && t.tour === 1) { t.tour = 2; change(); return { fini: false }; }
  const issue = !gagne ? (t.tour === 1 ? 'perdu1' : 'finale') : 'victoire';
  const r = T.recompenses[issue];
  if (r.n > 0) donneBoosterPremium(r.booster, r.n);
  t.dernier = { issue, n: r.n };
  t.etat = 'attente';
  t.suivantMs = partie().nowMs + hasard(T.delaiS) * 1000;
  change();
  return { fini: true, issue, n: r.n };
}
