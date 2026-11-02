// LIRE UNE CARTE OU QU'ELLE SOIT (2 nov. 2026) : dans la boutique et les Packs, une carte dessinee par `carteHtml` (`data-carte-id`) s'ouvre sur
// SA FICHE — la meme qu'en combat (`montreLecture`, `ficheDeCarte`, onglets Game / Shop). Comme en combat, un APPUI LONG lit la carte ; un
// simple toucher la lit aussi quand la carte n'est pas deja un bouton (une carte d'un resume, d'un lot) : sur un bouton, le toucher garde son role
// (une carte de la collection ouvre sa fiche de vente, une carte d'une rangee se choisit).
import { BALANCE } from '../config/balance.js';
import { cardById } from '../config/npcs.js';
import { ficheDeCarte, montreLecture } from './fiche.js';

function ouvre(n) {
  let c = null;
  try { c = cardById(n.dataset.carteId); } catch { c = null; }
  if (!c) return;
  montreLecture(ficheDeCarte(c), { cardId: c.id, finish: n.dataset.finish || 'normal', grade: n.dataset.grade ? +n.dataset.grade : null });
}

export function installeLectureCartes() {
  let minuteur = 0, depart = null, lu = false;
  const annule = () => { clearTimeout(minuteur); minuteur = 0; depart = null; };
  const carte = ev => (ev.target.closest?.('#lecture, #battle') ? null : ev.target.closest?.('[data-carte-id]'));

  document.addEventListener('pointerdown', ev => {
    const n = carte(ev);
    annule();
    lu = false;
    if (!n) return;
    depart = [ev.clientX, ev.clientY];
    minuteur = setTimeout(() => { lu = true; minuteur = 0; ouvre(n); }, BALANCE.ui.appuiLongMs);
  });
  document.addEventListener('pointermove', ev => {
    if (depart && Math.hypot(ev.clientX - depart[0], ev.clientY - depart[1]) > BALANCE.ui.toleranceDoigtPx) annule();
  });
  for (const t of ['pointerup', 'pointercancel']) document.addEventListener(t, annule);

  // Le clic qui suit un appui long ne doit pas, en plus, declencher le bouton sous le doigt.
  document.addEventListener('click', ev => {
    if (lu) { ev.stopPropagation(); ev.preventDefault(); lu = false; return; }
    const n = carte(ev);
    if (n && !ev.target.closest('button, a, input, label, [data-geste]')) ouvre(n);
  }, true);
}
