// LE CURSEUR DE PRIX (fiche de vitrine) : un curseur logarithmique encadre de « − » et « + » (comme l'Ultimatum Game). 75 % de la barre
// couvrent les prix raisonnables (de `min` a `cap`, la zone que le noyau juge normale), les 25 % restants vont jusqu'a `max` : le joueur
// peut afficher n'importe quel prix, la carte ne se vendra simplement pas. Aucune regle d'economie ici, seulement la maniere de choisir.
import { court } from './shell.js';

const PAS_CURSEUR = 10000;      // positions du curseur : plus c'est fin, plus le prix est precis
const PART_RAISONNABLE = 0.75;  // la part de la barre qui va de `min` a `cap`
const MAX_PRIX = 99999999;
const MIN_PRIX = 1;

/** Un prix ENTIER a 3 chiffres significatifs, pour que le curseur ne tombe pas sur 4 518 327. */
export function arrondiPrix(p) {
  if (p < 100) return Math.max(MIN_PRIX, Math.round(p));
  const u = 10 ** (Math.floor(Math.log10(p)) - 2);
  return Math.min(MAX_PRIX, Math.round(p / u) * u);
}

/** Le pas des boutons − et + : 1 sous 100, puis 2 chiffres significatifs (100 -> 10, 1 000 -> 100…). */
export const pasBouton = p => (p < 100 ? 1 : 10 ** (Math.floor(Math.log10(p)) - 1));

/** « 4 », « 18 », « 1,2k » : le prix tel qu'on l'ecrit dans une bulle ou sous le curseur (jamais de virgule : un prix est entier). */
export const texteDePrix = p => court(Math.round(p));

/** Position (0…PAS_CURSEUR) du prix `p` ; l'inverse de `prixDe`. */
function positionDe(p, cap) {
  const t = p <= cap
    ? Math.log(Math.max(p, MIN_PRIX) / MIN_PRIX) / Math.log(cap / MIN_PRIX) * PART_RAISONNABLE
    : PART_RAISONNABLE + Math.log(Math.min(p, MAX_PRIX) / cap) / Math.log(MAX_PRIX / cap) * (1 - PART_RAISONNABLE);
  return Math.round(Math.min(1, Math.max(0, t)) * PAS_CURSEUR);
}

function prixDe(pos, cap) {
  const t = pos / PAS_CURSEUR;
  const p = t <= PART_RAISONNABLE
    ? MIN_PRIX * (cap / MIN_PRIX) ** (t / PART_RAISONNABLE)
    : cap * (MAX_PRIX / cap) ** ((t - PART_RAISONNABLE) / (1 - PART_RAISONNABLE));
  return arrondiPrix(p);
}

/**
 * Le curseur : renvoie `{ el, prix() }`. `cap` : la fin de la zone raisonnable (le noyau : `showcasePriceCap`) ; `valeur` : le prix de depart ;
 * `surChange(prix)` : appele a chaque changement (et une fois au depart).
 */
export function curseurPrix({ cap, valeur, surChange }) {
  const zone = Math.max(cap, MIN_PRIX * 2);
  let prix = arrondiPrix(Math.min(MAX_PRIX, Math.max(MIN_PRIX, valeur)));
  const el = document.createElement('div');
  el.className = 'btq-prixw';
  el.innerHTML = '<button type="button" class="btq-pm" aria-label="Baisser le prix">−</button>'
    + `<input type="range" class="btq-gros" min="0" max="${PAS_CURSEUR}" step="1">`
    + '<button type="button" class="btq-pm" aria-label="Monter le prix">+</button>';
  const [moins, plus] = el.querySelectorAll('button');
  const barre = el.querySelector('input');
  const pose = (p, deLaBarre = false) => {
    prix = Math.min(MAX_PRIX, Math.max(MIN_PRIX, p));
    if (!deLaBarre) barre.value = positionDe(prix, zone);
    surChange(prix);
  };
  barre.oninput = () => pose(prixDe(+barre.value, zone), true);
  // Un appui long repete, de plus en plus vite (comme les boutons des jeux de negoce).
  const repete = (sens, bouton) => {
    let minuteur = 0, delai = 380;
    const pas = () => {
      pose(arrondiPrix(sens > 0 ? prix + pasBouton(prix) : prix - pasBouton(prix - 1e-9)));
      delai = Math.max(40, delai * 0.82);
      minuteur = setTimeout(pas, delai);
    };
    const fin = () => { clearTimeout(minuteur); bouton.removeEventListener('pointerup', fin); bouton.removeEventListener('pointerleave', fin); bouton.removeEventListener('pointercancel', fin); };
    bouton.addEventListener('pointerdown', e => { e.preventDefault(); pas(); bouton.addEventListener('pointerup', fin); bouton.addEventListener('pointerleave', fin); bouton.addEventListener('pointercancel', fin); });
  };
  repete(-1, moins);
  repete(1, plus);
  pose(prix);
  return { el, prix: () => prix };
}
