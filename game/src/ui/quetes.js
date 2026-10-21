// LE BANDEAU DE QUETE (docs/TUTORIEL.md, 21 octobre 2026) : sous la barre du haut, la quete en cours — son titre, ce
// qu'elle demande, sa progression. Le toucher Y EMMENE (la fiche de l'arene, l'ecran Deck, la Ferme) ; remplie, il
// pulse et un toucher RECUPERE la recompense. Aucune fenetre qui bloque. Le fil est dans config/quetes.js, ses regles
// dans state.js (`queteCourante`, `progresQuete`, `recupereQuete`).
import { queteCourante, progresQuete, recupereQuete, ecouteQuetes } from '../state.js';
import { t } from '../config/textes.js';
import { $, el, toast, CURRENCY_NAME } from './shell.js';
import { icone } from './icones.js';
import { noeudDeLArene, ouvreFicheArene } from './arene.js';

// Ou mene une quete, selon ce qu'elle demande.
const ECRAN = { equipe: 'deck', ameliore: 'deck', switch: 'deck', plante: 'farm', vend: 'farm', victoire: 'arene' };

let nav = null;   // { go, rafraichit } : fournis par main.js (la navigation vit la-bas)

/** Pose le bandeau ; `go(ecran)` change d'ecran, `rafraichit()` redessine l'ecran courant et la barre du haut. */
export function installeQuetes({ go, rafraichit }) {
  nav = { go, rafraichit };
  ecouteQuetes(dessine);
  dessine();
}

function dessine() {
  const zone = $('#quete');
  if (!zone) return;
  const q = queteCourante();
  zone.classList.toggle('hidden', !q);
  if (!q) { zone.innerHTML = ''; return; }
  const p = progresQuete(q);
  zone.classList.toggle('fait', p.fait);
  zone.innerHTML = '';
  const b = el(`<button class="qt-carte">
    <span class="qt-ico">${icone(p.fait ? 'Validate' : 'Quest', 30)}</span>
    <span class="qt-txt"><b></b><span></span></span>
    <span class="qt-prog">${p.fait ? t('quete.recuperer') : `${p.n}/${p.sur}`}</span>
  </button>`);
  // Les textes viennent de la config : jamais par innerHTML.
  b.querySelector('.qt-txt b').textContent = q.titre;
  b.querySelector('.qt-txt span').textContent = q.texte;
  b.onclick = () => (p.fait ? recupere() : guide(q));
  zone.appendChild(b);
}

function recupere() {
  const r = recupereQuete();
  if (!r) return;
  const morceaux = [...r.gains.map(g => `+${g.n} ${CURRENCY_NAME[g.k] || g.k}`), ...r.notes];
  toast(`${t('quete.accomplie')} ${morceaux.join(' · ')}`);
  if (r.quete.finTutoriel) toast(t('quete.tutorielFini'));
  if (nav) nav.rafraichit();
}

function guide(q) {
  if (!nav) return;
  const o = q.objectif;
  if (o.quoi === 'arene') {
    const n = noeudDeLArene(o.arene);
    if (!n) { nav.go('arene'); return; }
    // Comme depuis l'onglet « Arene » : la fiche s'ouvre a distance, et l'onglet se redessine apres le combat.
    nav.go('arene');
    ouvreFicheArene(n, { apres: () => nav.rafraichit() });
    return;
  }
  nav.go(ECRAN[o.quoi] || 'world');
}
