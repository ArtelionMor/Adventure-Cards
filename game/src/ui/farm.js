// Mini-jeu de Ferme : la seule source de monnaie C.
// Planter -> recolter -> poser a l'etale. Une vente passe toutes les 15 min et achete
// tout ce qui est en vente. C'est aussi le support des gains hors-ligne (GDD).
import { BALANCE } from '../config/balance.js';
import { CROPS, CROP_BY_ID } from '../config/farm.js';
import { relicMods } from '../config/relics.js';
import { save, persist, gain, spend, partyLevel } from '../state.js';
import { $, el, asset, toast, modal, closeModal, fmtTime } from './shell.js';

const growMs = crop => Math.round(crop.growMs * (1 - Math.min(0.6, relicMods(save).farmSpeed)));

/** Fait tourner les ventes qui auraient du avoir lieu, y compris hors-ligne. */
export function processFarm(now = Date.now()) {
  const f = save.farm;
  let earned = 0, sales = 0;
  const cap = BALANCE.farm.offlineCapMs;
  if (now - f.nextSaleAt > cap) f.nextSaleAt = now - cap; // plafond des gains hors-ligne
  while (now >= f.nextSaleAt) {
    let sale = 0;
    for (let i = 0; i < f.stall.length; i++) {
      const id = f.stall[i];
      if (!id) continue;
      sale += CROP_BY_ID[id].price;
      f.stall[i] = null;
    }
    if (sale > 0) { gain('C', sale); earned += sale; sales++; f.totalEarned += sale; }
    f.nextSaleAt += BALANCE.farm.saleIntervalMs;
  }
  if (earned) persist();
  return { earned, sales };
}

export function renderFarm() {
  const root = $('#screen-farm');
  const f = save.farm;
  processFarm();

  root.innerHTML = '';
  const wrap = el('<div class="pad"></div>');

  const head = el(`
    <div class="card-panel">
      <div class="row spread">
        <div>
          <h2>Ferme</h2>
          <div class="muted">Prochaine vente dans <b id="saleIn">—</b></div>
        </div>
        <div style="text-align:right">
          <div class="muted">Legumes</div>
          <div style="font-size:20px;font-weight:800;color:var(--accent)">${save.cur.C}</div>
        </div>
      </div>
    </div>`);
  wrap.appendChild(head);

  // ------------------------------------------------------------- parcelles
  const plots = el(`<div class="card-panel"><h3>Parcelles</h3><div class="plots"></div></div>`);
  const grid = plots.querySelector('.plots');
  for (let i = 0; i < BALANCE.farm.maxPlots; i++) {
    if (i >= f.plotCount) {
      const cost = BALANCE.costs.farmPlot(i);
      const n = el(`<div class="plot locked" title="Debloquer : ${cost} legumes"></div>`);
      n.onclick = () => {
        if (i !== f.plotCount) { toast('Debloque les parcelles dans l’ordre.'); return; }
        if (!spend('C', cost)) { toast(`Il te manque ${cost - save.cur.C} legumes.`); return; }
        f.plotCount++; persist(); renderFarm();
      };
      grid.appendChild(n);
      continue;
    }
    const p = f.plots[i];
    if (!p) {
      const n = el('<div class="plot empty"></div>');
      n.onclick = () => choosePlant(i);
      grid.appendChild(n);
    } else {
      const crop = CROP_BY_ID[p.cropId];
      const total = growMs(crop);
      const left = p.at + total - Date.now();
      const pct = Math.max(0, Math.min(1, 1 - left / total)) * 100;
      const n = el(`
        <div class="plot ${left <= 0 ? 'ready' : ''}">
          <img src="${asset(crop.sprite)}" alt="">
          <div class="grow"><i style="width:${pct}%"></i></div>
        </div>`);
      n.onclick = () => {
        if (left > 0) { toast(`${crop.name} : pret dans ${fmtTime(left)}`); return; }
        f.plots[i] = null;
        f.basket[crop.id] = (f.basket[crop.id] || 0) + 1;
        persist(); renderFarm();
      };
      grid.appendChild(n);
    }
  }
  wrap.appendChild(plots);

  // ---------------------------------------------------------------- panier
  const basketIds = Object.keys(f.basket).filter(k => f.basket[k] > 0);
  const basket = el(`<div class="card-panel"><h3>Panier</h3></div>`);
  if (!basketIds.length) basket.appendChild(el('<div class="muted">Rien de recolte pour l’instant.</div>'));
  else {
    const row = el('<div class="stall"></div>');
    for (const id of basketIds) {
      const c = CROP_BY_ID[id];
      const n = el(`<div class="slot"><img src="${asset(c.sprite)}" alt=""><b style="position:absolute">×${f.basket[id]}</b></div>`);
      n.style.position = 'relative';
      n.onclick = () => putOnStall(id);
      row.appendChild(n);
    }
    basket.appendChild(row);
    basket.appendChild(el('<div class="muted" style="margin-top:6px">Touche un legume pour le mettre en vente.</div>'));
  }
  wrap.appendChild(basket);

  // ---------------------------------------------------------------- etale
  const stall = el(`<div class="card-panel"><h3>Etale</h3><div class="stall"></div></div>`);
  const sgrid = stall.querySelector('.stall');
  for (let i = 0; i < BALANCE.farm.maxStallSlots; i++) {
    if (i >= f.stallSlots) {
      const cost = BALANCE.costs.stallSlot(i);
      const n = el(`<div class="slot locked">🔒<br><span style="font-size:9px">${cost}</span></div>`);
      n.onclick = () => {
        if (i !== f.stallSlots) { toast('Debloque les slots dans l’ordre.'); return; }
        if (!spend('C', cost)) { toast(`Il te manque ${cost - save.cur.C} legumes.`); return; }
        f.stallSlots++; persist(); renderFarm();
      };
      sgrid.appendChild(n);
      continue;
    }
    const id = f.stall[i];
    if (!id) { sgrid.appendChild(el('<div class="slot"></div>')); continue; }
    const c = CROP_BY_ID[id];
    const n = el(`<div class="slot"><img src="${asset(c.sprite)}" alt=""></div>`);
    n.onclick = () => {
      f.stall[i] = null;
      f.basket[id] = (f.basket[id] || 0) + 1;
      persist(); renderFarm();
    };
    sgrid.appendChild(n);
  }
  const worth = f.stall.filter(Boolean).reduce((a, id) => a + CROP_BY_ID[id].price, 0);
  stall.appendChild(el(`<div class="muted" style="margin-top:6px">Valeur en vente : <b>${worth}</b> legumes.</div>`));
  wrap.appendChild(stall);

  root.appendChild(wrap);
  tickSale();
}

let saleTimer = null;
function tickSale() {
  clearInterval(saleTimer);
  saleTimer = setInterval(() => {
    const n = $('#saleIn');
    if (!n) { clearInterval(saleTimer); return; }
    const left = save.farm.nextSaleAt - Date.now();
    n.textContent = fmtTime(left);
    if (left <= 0) { const r = processFarm(); if (r.earned) toast(`Vente : +${r.earned} legumes.`); renderFarm(); }
  }, 1000);
}

function putOnStall(cropId) {
  const f = save.farm;
  const slot = f.stall.findIndex((s, i) => i < f.stallSlots && !s);
  if (slot < 0) { toast('L’etale est pleine.'); return; }
  f.basket[cropId]--;
  f.stall[slot] = cropId;
  persist();
  renderFarm();
}

function choosePlant(plotIndex) {
  const lvl = partyLevel();
  const box = el('<div><h2>Que planter ?</h2></div>');
  const list = el('<div class="cardlist"></div>');
  for (const c of CROPS) {
    const ok = lvl >= c.reqLevel;
    const row = el(`
      <div class="gcard" style="opacity:${ok ? 1 : .4}">
        <img class="port" src="${asset(c.sprite)}" alt="">
        <div>
          <div class="nm">${c.name}</div>
          <div class="tx">${fmtTime(growMs(c))} · vaut ${c.price} legumes${ok ? '' : ` · niveau ${c.reqLevel} requis`}</div>
        </div>
        <div class="st">T${c.tier}</div>
      </div>`);
    if (ok) row.onclick = () => {
      save.farm.plots[plotIndex] = { cropId: c.id, at: Date.now() };
      persist(); closeModal(); renderFarm();
    };
    list.appendChild(row);
  }
  box.appendChild(list);
  const b = el('<button class="btn ghost">Annuler</button>');
  b.onclick = closeModal;
  box.appendChild(b);
  modal(box);
}
