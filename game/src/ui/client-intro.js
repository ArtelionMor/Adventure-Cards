// L'ENTREE D'UN CLIENT (refonte boutique, lot 4, 3 nov. 2026) : quand un client arrive pour la premiere fois, un zoom sur son visage, puis sa carte
// « a la Borderlands » : ce qu'il cherche et ce qu'il achete en priorite (jamais l'information sur le bulk). Une scene par client, dans l'ordre
// d'arrivee ; elle attend la fin d'un combat ou d'une fenetre ouverte. Les textes sont dans `BOUTIQUE.clients` (config/boutique.js) et `textes.js`.
import { BOUTIQUE } from '../config/boutique.js';
import { t } from '../config/textes.js';
import { clientsAIntroduire, marqueClientVu, ecoute } from '../boutique/partie.js';
import { $, el, modal, closeModal } from './shell.js';

const ZOOM_MS = 1400;   // le temps du zoom avant que la carte arrive (un toucher l'avance)

function montre(id) {
  const info = BOUTIQUE.clients?.[id] ?? { cherche: '', prioritaire: '' };
  const p = BOUTIQUE.profils[id];
  const tete = p?.tetes?.[0];
  const box = el(`<div class="cl-intro" style="--c:${p?.couleur ?? '#888'}">
    <div class="cl-zoom"><img src="${tete ? BOUTIQUE.visage(tete) : ''}" alt=""></div>
    <div class="cl-nom">${t('client.titre', { nom: id })}</div>
    <div class="cl-carte">
      <h2>${id}</h2>
      <div class="cl-ligne"><span>${t('client.cherche')}</span><b>${info.cherche}</b></div>
      <div class="cl-ligne"><span>${t('client.prioritaire')}</span><b>${info.prioritaire}</b></div>
      <button class="btn cl-ok">${t('client.accueil')}</button>
    </div>
  </div>`);
  let carte = false;
  const montreLaCarte = () => { if (!carte) { carte = true; box.classList.add('carte'); } };
  const fin = () => { marqueClientVu(id); closeModal(); };
  box.querySelector('.cl-ok').onclick = fin;
  box.addEventListener('click', ev => { if (!ev.target.closest('.cl-ok')) montreLaCarte(); });
  const m = modal(box, () => marqueClientVu(id));
  m.classList.add('cl-feuille');
  setTimeout(montreLaCarte, ZOOM_MS);
}

/** Installe l'ecoute : a chaque seconde de la boutique, si rien ne gene, la scene du prochain client arrive. */
export function installeIntroClients() {
  const essaie = () => {
    const [id] = clientsAIntroduire();
    if (!id) return;
    const combat = $('#battle');
    if (combat && !combat.classList.contains('hidden')) return;
    if (!$('#modal').classList.contains('hidden')) return;
    montre(id);
  };
  ecoute(e => { if (e.t === 'seconde') essaie(); });
}
