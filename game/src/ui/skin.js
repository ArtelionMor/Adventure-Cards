// LES SKINS DU COMBAT : l'habillage graphique de l'ecran de combat, interchangeable.
//
// Un skin est une feuille de style (`game/skins/<nom>.css`) qui ne s'applique QUE pendant un combat : elle redefinit les
// couleurs (les variables de styles.css) et habille les elements avec les sprites de `game/skins/kenney/` (packs Kenney,
// CC0). « actuel » = aucune feuille : le violet nuit et or d'origine. Le choix se retient dans `localStorage`.
//
// Console : `AC.skin()` dit le skin courant et la liste ; `AC.skin('juice')`, `AC.skin('parchemin')`, `AC.skin('bonbon')`, `AC.skin('actuel')`.
// Le panneau de triche (5 touchers sur « Tour N ») a un bouton qui les fait tourner.
const CLE = 'adventureCard.skin';
export const SKINS = ['juice', 'parchemin', 'bonbon', 'actuel'];
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

// La police du skin « juice » (Lilita One, licence OFL), chargee sans bloquer l'affichage : la feuille est demandee en
// media="print" puis basculee en media="all" quand elle est arrivee. Hors ligne, la police du systeme (en gras) fait l'affaire.
const POLICES = { juice: 'https://fonts.googleapis.com/css2?family=Lilita+One&display=swap' };
function chargePolice(nom) {
  const url = POLICES[nom];
  if (!url || document.querySelector(`link[data-police="${nom}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = url; l.media = 'print'; l.dataset.police = nom;
  l.onload = () => { l.media = 'all'; };
  document.head.appendChild(l);
}

function applique() {
  const racine = document.documentElement;
  if (courant === 'actuel') {
    racine.removeAttribute('data-skin');
    if (lien) { lien.remove(); lien = null; }
    return;
  }
  racine.setAttribute('data-skin', courant);
  chargePolice(courant);
  const href = new URL(`../../skins/${courant}.css`, import.meta.url).href;
  if (!lien) {
    lien = document.createElement('link');
    lien.rel = 'stylesheet';
    document.head.appendChild(lien);
  }
  if (lien.href !== href) lien.href = href;
}

// `data-combat` sur <html> tant que l'ecran de combat est ouvert : les feuilles de skin s'y accrochent, si bien que la
// carte, la ferme, le deck et le sac gardent leur habillage.
function suisLeCombat() {
  const b = document.getElementById('battle');
  if (!b) return;
  const maj = () => document.documentElement.toggleAttribute('data-combat', !b.classList.contains('hidden'));
  new MutationObserver(maj).observe(b, { attributes: true, attributeFilter: ['class'] });
  maj();
}

courant = lis();
applique();
suisLeCombat();
if (window.AC) window.AC.skin = nom => (nom === undefined ? { courant, skins: SKINS } : choisitSkin(nom));
else window.addEventListener('DOMContentLoaded', () => { if (window.AC) window.AC.skin = nom => (nom === undefined ? { courant, skins: SKINS } : choisitSkin(nom)); });
