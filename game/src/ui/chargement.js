// L'ECRAN DE CHARGEMENT (16 octobre 2026) : au demarrage, il charge ET decode toutes les images du jeu, puis les
// GARDE en memoire. Un navigateur reprend une image deja chargee dans la page sans rien redemander au serveur (la
// « liste des images disponibles » du HTML) : ensuite, un menu qui recree ses <img> les affiche tout de suite, au
// lieu de revalider chaque fichier aupres du Pi puis de le redecoder.
// Les images sont les versions allegees (`asset`, ui/shell.js : game/vignettes/) quand elles existent.
// Reglages (combien en parallele, temps maximum avant d'entrer quand meme) : `BALANCE.ui.chargement`.
import { BALANCE } from '../config/balance.js';
import { SPRITES } from '../../data/sprites.js';
import { asset } from './shell.js';
import { imagesDesIcones } from './icones.js';

// Les images chargees : tant qu'on les tient, le navigateur les garde (et une <img> de meme adresse les reprend).
const GARDEES = [];

/** Toutes les images a charger : les sprites (sprites.js, versions allegees) et les icones. */
function aCharger() {
  const out = [];
  for (const [dossier, fichiers] of Object.entries(SPRITES)) for (const f of fichiers) out.push({ url: asset(`${dossier}/${f}`) });
  return [...out, ...imagesDesIcones()];
}

/** Charge et decode une image ; ne rejette jamais (une image absente ne bloque pas le jeu). */
function charge({ url, absente }) {
  return new Promise(fin => {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => { GARDEES.push(i); (i.decode ? i.decode() : Promise.resolve()).catch(() => {}).then(fin); };
    i.onerror = () => { if (absente) absente(); fin(); };
    i.src = url;
  });
}

/**
 * Montre l'ecran `#chargement`, charge tout, puis le retire. Rend une promesse resolue quand le jeu peut s'afficher :
 * toutes les images, ou `BALANCE.ui.chargement.maxMs` passe (le reste continue en arriere-plan).
 */
export function chargeLeJeu() {
  const ecran = document.getElementById('chargement');
  const barre = ecran && ecran.querySelector('.chg-barre i');
  const texte = ecran && ecran.querySelector('.chg-texte');
  const liste = aCharger();
  const { parallele, maxMs } = BALANCE.ui.chargement;
  let fait = 0, prochain = 0;
  const montre = () => {
    if (barre) barre.style.width = `${Math.round(fait / liste.length * 100)}%`;
    if (texte) texte.textContent = `${fait} / ${liste.length}`;
  };
  montre();
  const tout = new Promise(fini => {
    if (!liste.length) { fini(); return; }
    const suivant = () => {
      if (prochain >= liste.length) return;
      charge(liste[prochain++]).then(() => {
        fait++;
        montre();
        if (fait === liste.length) fini(); else suivant();
      });
    };
    for (let k = 0; k < Math.min(parallele, liste.length); k++) suivant();
  });
  const delai = new Promise(r => setTimeout(r, maxMs));
  return Promise.race([tout, delai]).then(() => {
    if (!ecran) return;
    ecran.classList.add('fini');
    setTimeout(() => ecran.remove(), 400);
  });
}
