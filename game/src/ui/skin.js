// LES SKINS : l'habillage graphique du jeu, interchangeable.
//
// Un skin est une feuille de style (`game/skins/<nom>.css`) qui redefinit les couleurs (les variables de styles.css) et habille
// le combat, la barre du haut, la navigation, le deck, la ferme et le sac. « actuel » = aucune feuille : le violet nuit et or
// d'origine. Le choix se retient dans `localStorage`.
//
// Console : `AC.skin()` dit le skin courant et la liste ; `AC.skin('juice')`, `AC.skin('actuel')`. Le defaut : `cozy`
// (21 oct. 2026). ⚠ Un skin choisi une fois reste retenu : un appareil ou l'on a fait tourner les skins garde le sien.
// Le panneau de triche (5 touchers sur « Tour N ») a un bouton qui les fait tourner.
//
// Pour ajouter un skin : une feuille `skins/<nom>.css`, et une ligne dans `SKINS` ci-dessous.
// Une VARIANTE (`base: 'juice'`) garde la feuille de sa base et pose la sienne par-dessus : `<html data-skin="juice"
// data-variante="cozy">`. Elle ne retouche que ce qu'elle change, et la base ne sait rien d'elle.
import { FONDS, FOND_PAR_DEFAUT, ARENE_PAR_ID } from '../config/arenes.js';
import { save, fondsDebloques } from '../state.js';

const CLE = 'adventureCard.skin';

/** nom -> sa feuille, sa police (une feuille Google Fonts, facultative) et la couleur de la barre d'etat du telephone. */
const SKINS_DEF = {
  juice: { css: 'juice.css', police: 'https://fonts.googleapis.com/css2?family=Lilita+One&display=swap', barre: '#fff3d8' },
  // LE DEFAUT depuis le 21 oct. 2026 (regard de directeur artistique) : juice, plus calme, et le combat dans un decor —
  // celui de l'arene (`fondDuCombat`). La barre d'etat garde le creme de la barre du haut, que cozy ne change pas.
  cozy: { base: 'juice', css: 'cozy.css', police: 'https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@700;800&display=swap', barre: '#fff3d8' },
  actuel: { css: null, police: null, barre: '#1b1726' }
};
export const SKINS = Object.keys(SKINS_DEF);
const DEFAUT = 'cozy';

let courant = DEFAUT;
let lien = null;
let lienVariante = null;
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

/** Pose (ou reprend) le `<link>` d'une feuille de `skins/`. */
function feuille(l, css) {
  const href = new URL(`../../skins/${css}`, import.meta.url).href;
  if (!l) {
    l = document.createElement('link');
    l.rel = 'stylesheet';
    document.head.appendChild(l);
  }
  if (l.href !== href) l.href = href;
  return l;
}

function applique() {
  const def = SKINS_DEF[courant];
  const base = def.base ? SKINS_DEF[def.base] : def;
  const racine = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', def.barre);
  if (!def.base && lienVariante) { lienVariante.remove(); lienVariante = null; }
  if (!base.css) {
    racine.removeAttribute('data-skin');
    racine.removeAttribute('data-variante');
    if (lien) { lien.remove(); lien = null; }
    return;
  }
  racine.setAttribute('data-skin', def.base || courant);
  if (def.base) racine.setAttribute('data-variante', courant); else racine.removeAttribute('data-variante');
  chargePolice(courant, def.police);
  lien = feuille(lien, base.css);
  // La variante APRES sa base : a specificite egale, c'est elle qui gagne.
  if (def.base) lienVariante = feuille(lienVariante, def.css);
}

courant = lis();
applique();

// LE FOND DU COMBAT (21 oct. 2026) : `<div id="battle" data-fond="…">`, dessine par skins/cozy.css. Dans l'ordre : le
// fond FORCE en console (`AC.fond('nuit')`, pour essayer ; `AC.fond(null)` l'oublie), le fond que le joueur a choisi dans
// son Profil (s'il l'a debloque), celui de l'arene, et `FOND_PAR_DEFAUT` hors arene.
const CLE_FOND = 'adventureCard.fond';
let fondForce = null;
let dernierNoeud = null;   // le point du dernier combat : `AC.fond(…)` redessine celui qui est ouvert
try { const f = localStorage.getItem(CLE_FOND); if (FONDS[f]) fondForce = f; } catch { /* rien de retenu */ }

/** Le fond d'un combat lance sur `node` (un point du monde ; `node.arene` = l'identifiant de son arene). */
export function fondDuCombat(node) {
  dernierNoeud = node;
  if (fondForce) return fondForce;
  const choisi = save.profil && save.profil.fond;
  if (choisi && FONDS[choisi] && fondsDebloques().has(choisi)) return choisi;
  const a = node && ARENE_PAR_ID[node.arene];
  return (a && a.fond) || FOND_PAR_DEFAUT;
}

function forceFond(nom) {
  if (nom !== null && !FONDS[nom]) return `fond inconnu : ${Object.keys(FONDS).join(', ')}`;
  fondForce = nom;
  try { if (nom) localStorage.setItem(CLE_FOND, nom); else localStorage.removeItem(CLE_FOND); } catch { /* le fond vaut pour cette visite */ }
  // Un combat ouvert change de decor tout de suite.
  const b = document.getElementById('battle');
  if (b && b.dataset.fond) b.dataset.fond = fondDuCombat(dernierNoeud);
  return nom;
}

// `window.AC` (la console du jeu) est cree par main.js APRES les imports : on s'y accroche quand la page est prete.
const installeConsole = () => {
  if (!window.AC) return;
  window.AC.skin = nom => (nom === undefined ? { courant, skins: SKINS } : choisitSkin(nom));
  window.AC.fond = nom => (nom === undefined ? { force: fondForce, fonds: Object.keys(FONDS) } : forceFond(nom));
};
if (window.AC) installeConsole(); else window.addEventListener('DOMContentLoaded', installeConsole);
