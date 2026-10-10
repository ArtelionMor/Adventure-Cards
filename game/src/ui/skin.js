// LES SKINS : l'habillage graphique du jeu, interchangeable.
//
// Un skin est une feuille de style (`game/skins/<nom>.css`) qui redefinit les couleurs (les variables de styles.css) et habille
// le combat, la barre du haut, la navigation, le deck, la ferme et le sac. « actuel » = aucune feuille : le violet nuit et or
// d'origine. Le choix se retient dans `localStorage`.
//
// Console : `AC.skin()` dit le skin courant et la liste ; `AC.skin('juice')`, `AC.skin('actuel')`.
// Le panneau de triche (5 touchers sur « Tour N ») a un bouton qui les fait tourner.
//
// Pour ajouter un skin : une feuille `skins/<nom>.css`, et une ligne dans `SKINS` ci-dessous.
const CLE = 'adventureCard.skin';

/** nom -> sa feuille, sa police (une feuille Google Fonts, facultative) et la couleur de la barre d'etat du telephone. */
const SKINS_DEF = {
  juice: { css: 'juice.css', police: 'https://fonts.googleapis.com/css2?family=Lilita+One&display=swap', barre: '#fff3d8' },
  actuel: { css: null, police: null, barre: '#1b1726' }
};
export const SKINS = Object.keys(SKINS_DEF);
const DEFAUT = 'juice';

let courant = DEFAUT;
let lien = null;
const auChangement = new Set();

function lis() {
  try { const v = localStorage.getItem(CLE); return SKINS.includes(v) ? v : DEFAUT; } catch { return DEFAUT; }
}

export function skinCourant() { return courant; }

/** Appelle `fn(nom)` quand le skin change (le bouton de la triche remet son libelle). */
export function ecouteSkin(fn) { auChangement.add(fn); return () => auChangement.delete(fn); }

export function choisitSkin(nom) {
  if (!SKINS.includes(nom)) return `skin inconnu : ${SKINS.join(', ')}`;
  courant = nom;
  try { localStorage.setItem(CLE, nom); } catch { /* stockage refuse : le skin vaut pour cette visite */ }
  applique();
  auChangement.forEach(fn => fn(nom));
  return nom;
}

export function skinSuivant() {
  return choisitSkin(SKINS[(SKINS.indexOf(courant) + 1) % SKINS.length]);
}

/**
 * La police d'un skin, chargee SANS bloquer l'affichage : la feuille est demandee en media="print" puis basculee en
 * media="all" quand elle est arrivee (un `@import` dans la feuille du skin ferait attendre le reseau a tout l'ecran).
 * Hors ligne, la police du systeme (en gras) fait l'affaire.
 */
function chargePolice(nom, url) {
  if (!url || document.querySelector(`link[data-police="${nom}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = url; l.media = 'print'; l.dataset.police = nom;
  l.onload = () => { l.media = 'all'; };
  document.head.appendChild(l);
}

function applique() {
  const def = SKINS_DEF[courant];
  const racine = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', def.barre);
  if (!def.css) {
    racine.removeAttribute('data-skin');
    if (lien) { lien.remove(); lien = null; }
    return;
  }
  racine.setAttribute('data-skin', courant);
  chargePolice(courant, def.police);
  const href = new URL(`../../skins/${def.css}`, import.meta.url).href;
  if (!lien) {
    lien = document.createElement('link');
    lien.rel = 'stylesheet';
    document.head.appendChild(lien);
  }
  if (lien.href !== href) lien.href = href;
}

courant = lis();
applique();

// `window.AC` (la console du jeu) est cree par main.js APRES les imports : on s'y accroche quand la page est prete.
const installeConsole = () => { if (window.AC) window.AC.skin = nom => (nom === undefined ? { courant, skins: SKINS } : choisitSkin(nom)); };
if (window.AC) installeConsole(); else window.addEventListener('DOMContentLoaded', installeConsole);
