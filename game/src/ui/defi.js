// Le DEFI d'un client de la boutique (scene : `boutique-scene.js`, config : `BOUTIQUE.defi`, tirage : `config/defi.js`).
// Le joueur touche la bulle d'un client assis seul : sa fiche montre l'équipe qu'il aligne ; « Relever » lance le duel (combat normal,
// `openBattle` avec un nœud `defi`), la victoire donne un booster premium (`battle.js`, `finish`). Le client repart après le duel.
import { t } from '../config/textes.js';
import { BOUTIQUE } from '../config/boutique.js';
import { CHAR_BY_ID } from '../config/characters.js';
import { equipeDefi } from '../config/defi.js';
import { save, possede, tailleDuDeck, tailleMinDuDeck } from '../state.js';
import { openBattle } from './battle.js';
import { finDefi } from './boutique-scene.js';
import { asset, closeModal, el, modal, toast } from './shell.js';

const echappe = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** L'équipe que le client aligne, tirée une fois pour lui (rouvrir sa fiche ne la change pas). */
function equipeDe(c) {
  if (!c.defiEquipe) {
    const mes = Object.keys(save.chars).filter(possede);
    const n = Math.max(1, Math.min(save.rosterSlots, mes.length));
    const e = equipeDefi(mes.map(id => save.chars[id].level), n);
    c.defiEquipe = { ...e, tete: c.tete, nom: `${c.tete[0].toUpperCase()}${c.tete.slice(1)}`, recompense: BOUTIQUE.defi.recompense };
  }
  return c.defiEquipe;
}

const carte = h => `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center;font-size:13px">
  <img src="${asset(CHAR_BY_ID[h.id].sprite)}" alt="" style="width:100%;max-width:92px;height:92px;object-fit:contain">
  <b>${echappe(CHAR_BY_ID[h.id].name)}</b><span>niv. ${h.niveau}</span></div>`;

export function ouvreDefi(c) {
  const e = equipeDe(c);
  const box = el(`<div class="defi">
    <h3 style="margin:0 0 10px;text-align:center">${echappe(e.nom)} te défie !</h3>
    <div style="display:flex;gap:8px;justify-content:center">${e.heros.map(carte).join('')}</div>
    <p style="text-align:center;margin:10px 0">Niveau total ${e.total} · récompense : ${e.recompense.n} booster premium</p>
    <div class="ar-boutons"><button class="btn ghost" data-k="non">Plus tard</button><button class="btn" data-k="go">Relever le défi</button></div>
  </div>`);
  box.querySelector('[data-k="non"]').onclick = closeModal;
  box.querySelector('[data-k="go"]').onclick = () => {
    if (tailleDuDeck() < tailleMinDuDeck()) { toast(t('ui.teamTooSmall')); return; }
    closeModal();
    c.defiEnCours = true;
    openBattle({ id: 'defi', defi: e, niveau: e.total }, () => finDefi(c));
  };
  modal(box).classList.add('dk-feuille', 'ar-feuille');
}
