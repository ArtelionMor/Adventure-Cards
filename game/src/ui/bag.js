// Sac : inventaire, monnaies et objets a passifs.
// Les monnaies ne s'affichent nulle part en permanence — c'est ici qu'on les consulte.
import { RELIC_BY_ID } from '../config/relics.js';
import { BALANCE } from '../config/balance.js';
import { save, resetSave, partyLevel } from '../state.js';
import { $, el, asset, CURRENCY_NAME } from './shell.js';
import { listeCombats } from './combats.js';
import { ouvreRevue } from './revue.js';
import { icone } from './icones.js';

export function renderBag() {
  const root = $('#screen-bag');
  root.innerHTML = '';
  const wrap = el('<div class="pad"></div>');

  const cur = el(`<div class="card-panel"><h3>Monnaies</h3></div>`);
  cur.appendChild(el(`
    <div class="cardlist">
      <div class="gcard"><img class="port" src="${asset('UI/Coins.png')}" alt="">
        <div><div class="nm">${CURRENCY_NAME.A} · ${save.cur.A}</div>
        <div class="tx">Trouves en explorant. Servent a recruter un personnage dont le boss est vaincu.</div></div></div>
      <div class="gcard spell"><img class="port" src="${asset('UI/Vault.png')}" alt="">
        <div><div class="nm">${CURRENCY_NAME.B} · ${save.cur.B}</div>
        <div class="tx">Debloquent les cartes switch. ⚠ Leur collecte n'est pas tranchee dans le GDD : ici, butin de combat.</div></div></div>
      <div class="gcard"><img class="port" src="${asset('Ressources/Carrot Tier 3.png')}" alt="">
        <div><div class="nm">${CURRENCY_NAME.C} · ${save.cur.C}</div>
        <div class="tx">Monnaie de la Ferme. Ameliore les personnages et paie le progression path.</div></div></div>
    </div>`));
  wrap.appendChild(cur);

  const rel = el('<div class="card-panel"><h3>Objets</h3></div>');
  if (!save.relics.length) rel.appendChild(el('<div class="muted">Rien encore. Le marchand de la Clairiere en vend.</div>'));
  else {
    const list = el('<div class="cardlist"></div>');
    for (const id of save.relics) {
      const r = RELIC_BY_ID[id];
      if (!r) continue;
      list.appendChild(el(`<div class="gcard"><img class="port" src="${asset(r.sprite)}" alt="">
        <div><div class="nm">${r.name}</div><div class="tx">${r.text}</div></div></div>`));
    }
    rel.appendChild(list);
  }
  wrap.appendChild(rel);

  // Les derniers combats : on peut les REVOIR (le journal graphique), surtout quand le jeu a
  // tourne tout seul et qu'on se demande pourquoi on n'avance pas.
  const combats = listeCombats();
  const cb = el('<div class="card-panel"><h3>Derniers combats</h3></div>');
  if (!combats.length) cb.appendChild(el('<div class="muted">Aucun combat gardé pour l\'instant.</div>'));
  else {
    const list = el('<div class="cardlist"></div>');
    for (const c of combats) {
      const issue = c.gagnant === 'p' ? 'Victoire' : c.gagnant === 'draw' ? 'Match nul' : 'Défaite';
      const quand = new Date(c.t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const row = el(`<div class="gcard ${c.gagnant === 'p' ? '' : 'spell'}">
        ${c.heros && c.heros.e ? `<img class="port" src="${asset(c.heros.e)}" alt="">` : '<span></span>'}
        <div><div class="nm">${c.nom} · ${issue}</div><div class="tx">${c.equipe} · ${c.tours} tours · ${quand}</div></div>
        <button class="btn ghost" style="display:flex;gap:6px;align-items:center">${icone('Log', 18)} Revoir</button></div>`);
      row.querySelector('button').onclick = () => ouvreRevue(c.id);
      list.appendChild(row);
    }
    cb.appendChild(list);
  }
  wrap.appendChild(cb);

  const info = el(`<div class="card-panel">
    <h3>Prototype</h3>
    <div class="muted">Version ${BALANCE.version} · niveau d'equipe ${partyLevel()}</div>
    <div class="muted">Ferme totale gagnee : ${save.farm.totalEarned} legumes</div>
  </div>`);
  const reset = el('<button class="btn ghost" style="margin-top:8px">Effacer la sauvegarde</button>');
  reset.onclick = () => { if (confirm('Effacer la sauvegarde et repartir de zero ?')) resetSave(); };
  info.appendChild(reset);
  wrap.appendChild(info);

  root.appendChild(wrap);
}
