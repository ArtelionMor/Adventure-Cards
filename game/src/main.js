// Point d'entree : navigation, bandeau, sauvegarde, regime idle.
import { BALANCE } from './config/balance.js';
import { CHAR_BY_ID } from './config/characters.js';
import { CHAR_BY_ID as HEROS, niveauMax } from './config/characters.js';
import { save, persist, upgradeCost } from './state.js';
import { $, $$, el, asset, toast, modal, closeModal, fmtTime, court } from './ui/shell.js';
import { icone } from './ui/icones.js';
import { initWorld, startWorld, stopWorld, setRefreshTop } from './ui/overworld.js';
import { renderFarm, processFarm } from './ui/farm.js';
import { renderDeck } from './ui/deck.js';
import { renderBag } from './ui/bag.js';
import { renderArene } from './ui/arene.js';
import { ouvreProfil } from './ui/profil.js';
import { chargeLeJeu } from './ui/chargement.js';
import { openBattle } from './ui/battle.js';
import { installeQuetes } from './ui/quetes.js';

let current = 'world';

function go(screen) {
  current = screen;
  $$('#screens .screen').forEach(s => s.classList.add('hidden'));
  $('#screen-' + screen).classList.remove('hidden');
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.go === screen));
  if (screen === 'world') startWorld(); else stopWorld();
  if (screen === 'farm') renderFarm();
  if (screen === 'deck') renderDeck();
  if (screen === 'bag') renderBag();
  if (screen === 'arene') renderArene();
  refreshTop();
}

function refreshTop() {
  const id = save.team.find(Boolean) || 'dog';
  const c = CHAR_BY_ID[id];
  const st = save.chars[id];
  $('#topPortrait').src = asset(c.sprite);
  $('#topName').textContent = c.name;
  $('#topLevel').textContent = st.level;
  // La barre montre la progression vers la prochaine amelioration, pas de l'XP :
  // dans le GDD, un personnage monte en niveau en depensant des pieces (monnaie C).
  const cost = st.level < niveauMax(HEROS[id]) ? upgradeCost(id) : 0;
  $('#topXp').style.width = (cost ? Math.min(100, save.cur.C / cost * 100) : 100) + '%';
  // Les monnaies, toujours la (maquette « Deck Screen », 12 octobre 2026).
  $('#topCoin').innerHTML = `${icone('Coin', 15)}<b>${court(save.cur.C)}</b>`;
  $('#topGem').innerHTML = `${icone('Gem', 15)}<b>${court(save.cur.G || 0)}</b>`;
}
setRefreshTop(refreshTop);

// ------------------------------------------------------------------ idle
// Foreground : on garde l'ecran allume tant que l'onglet est visible (GDD).
async function wakeLock() {
  try {
    if (!('wakeLock' in navigator)) return;
    const l = await navigator.wakeLock.request('screen');
    l.addEventListener('release', () => {});
  } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    wakeLock();
    const r = processFarm();
    if (r.earned) toast(`Vente pendant ton absence : +${r.earned} legumes.`);
    if (current === 'farm') renderFarm();
    refreshTop();
  } else persist();
});

function offlineReport() {
  const away = Date.now() - (save.lastSeen || Date.now());
  const r = processFarm();
  if (away < 60000 && !r.earned) return;
  if (!r.earned) return;
  const box = el(`<div>
    <h2>Pendant ton absence</h2>
    <p class="muted">${fmtTime(away)} hors du jeu.</p>
    <p>L'etale a ete achetee : <b>+${r.earned} legumes</b>${r.sales > 1 ? ` (${r.sales} ventes)` : ''}.</p>
    <p class="muted">Plafond des gains hors-ligne : ${BALANCE.farm.offlineCapMs / 3600000} h.</p>
  </div>`);
  const b = el('<button class="btn">Merci</button>');
  b.onclick = closeModal;
  box.appendChild(b);
  modal(box);
}

// ------------------------------------------------------------------ boot
function boot() {
  initWorld();
  $$('#nav button').forEach(b => { b.innerHTML = icone(b.dataset.ico, 46); b.onclick = () => go(b.dataset.go); });
  // L'avatar de la barre du haut ouvre le PROFIL DU JOUEUR (ui/profil.js), comme toucher le joueur sur la carte.
  $('#topbar .hero-chip').onclick = ouvreProfil;
  go('world');
  offlineReport();
  wakeLock();

  // Le TUTORIEL n'est plus une fenetre : c'est le debut du fil de quetes (config/quetes.js), dans le bandeau sous la
  // barre du haut. Son toucher emmene ou il faut ; « rafraichit » redessine l'ecran courant (une place, un heros recus).
  installeQuetes({ go, rafraichit: () => go(current) });

  setInterval(() => { persist(); refreshTop(); }, BALANCE.save.autosaveMs);
  addEventListener('beforeunload', persist);
}

// Console de debug (F12) : window.AC.fight('wolf'), AC.give('C', 500), AC.go('farm')
window.AC = {
  save, persist, go,
  fight: enc => { stopWorld(); openBattle({ id: 'debug', name: 'Test', enemy: enc }, () => { startWorld(); refreshTop(); }); },
  give: (k, n) => { save.cur[k] = (save.cur[k] || 0) + n; persist(); refreshTop(); },
  teleport: (x, y) => { save.world.px = x; save.world.py = y; persist(); },
  level: (id, l) => { save.chars[id].level = l; persist(); refreshTop(); }
};

// L'ecran de chargement d'abord : les images du jeu chargees et gardees, les menus les affichent ensuite sans attendre.
chargeLeJeu().then(boot);
