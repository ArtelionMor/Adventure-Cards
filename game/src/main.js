// Point d'entree : navigation, bandeau, sauvegarde, regime idle.
import { BALANCE } from './config/balance.js';
import { CHAR_BY_ID } from './config/characters.js';
import { save, persist, partyLevel, upgradeCost } from './state.js';
import { $, $$, el, asset, toast, modal, closeModal, setContext, fmtTime } from './ui/shell.js';
import { initWorld, startWorld, stopWorld, setRefreshTop } from './ui/overworld.js';
import { renderFarm, processFarm } from './ui/farm.js';
import { renderDeck } from './ui/deck.js';
import { renderBag } from './ui/bag.js';
import { openBattle } from './ui/battle.js';

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
  // dans le GDD, un personnage monte en niveau en depensant de la monnaie C.
  const cost = upgradeCost(id);
  $('#topXp').style.width = Math.min(100, save.cur.C / cost * 100) + '%';

  // Rappel de monnaie strictement contextuel (GDD).
  if (current === 'deck') setContext(`<b>${save.cur.C}</b>/${cost} legumes pour le prochain niveau`);
  else if (current === 'farm') setContext(`vente dans <b>${fmtTime(save.farm.nextSaleAt - Date.now())}</b>`);
  else if (current === 'world') {
    const lvl = partyLevel();
    setContext(`niveau d'equipe <b>${lvl}</b>`);
  } else setContext('');
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
  $$('#nav button').forEach(b => b.onclick = () => go(b.dataset.go));
  go('world');
  offlineReport();
  wakeLock();

  if (!save.flags.tutorial) {
    save.flags.tutorial = true;
    persist();
    const box = el(`<div>
      <h2>Adventure Card</h2>
      <p>Tes trois compagnons t'ont ete confies, mais tu ne peux en emmener <b>qu'un seul</b> pour l'instant.</p>
      <p class="muted">Explore, combats (le mode auto joue pour toi), fais pousser des legumes a la Ferme,
      puis depense-les pour monter tes personnages en niveau et ouvrir les chemins verrouilles.</p>
    </div>`);
    const b = el('<button class="btn">C’est parti</button>');
    b.onclick = closeModal;
    box.appendChild(b);
    modal(box);
  }

  setInterval(() => { persist(); refreshTop(); }, BALANCE.save.autosaveMs);
  addEventListener('beforeunload', persist);
}

// Console de debug (F12) : window.AC.fight('wolf'), AC.give('C', 500), AC.go('farm')
window.AC = {
  save, persist, go,
  fight: enc => { stopWorld(); openBattle({ id: 'debug', name: 'Test', enemy: enc }, () => { startWorld(); refreshTop(); }); },
  give: (k, n) => { save.cur[k] += n; persist(); refreshTop(); },
  teleport: (x, y) => { save.world.px = x; save.world.py = y; persist(); },
  level: (id, l) => { save.chars[id].level = l; persist(); refreshTop(); }
};

boot();
