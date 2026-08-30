// Deckbuilding : c'est ici que vit la profondeur du jeu (GDD).
// 3 personnages equipes x 5 cartes = 15 cartes dans un paquet unique.
import { BALANCE } from '../config/balance.js';
import { CHARACTERS, CHAR_BY_ID, resolveCard } from '../config/characters.js';
import { save, persist, upgradeCost, upgradeChar, toggleSwitch,
         unlockChar, buyRosterSlot, setTeamSlot } from '../state.js';
import { $, el, asset, toast, modal, closeModal } from './shell.js';

export function renderDeck() {
  const root = $('#screen-deck');
  root.innerHTML = '';
  const wrap = el('<div class="pad"></div>');

  // ------------------------------------------------------------- l'equipe
  const teamBox = el(`<div class="card-panel">
    <div class="row spread"><h2>Equipe</h2><div class="muted">${save.rosterSlots}/3 slots</div></div>
    <div class="roster" style="margin-top:10px"></div>
  </div>`);
  const tgrid = teamBox.querySelector('.roster');
  for (let i = 0; i < 3; i++) {
    if (i >= save.rosterSlots) {
      const cost = BALANCE.costs.rosterSlots[i];
      const n = el(`<div class="hero-tile locked"><div style="font-size:26px">🔒</div>
        <div class="nm">Slot ${i + 1}<br>${cost} legumes</div></div>`);
      n.onclick = () => {
        if (i !== save.rosterSlots) { toast('Debloque les slots dans l’ordre.'); return; }
        const r = buyRosterSlot();
        if (r === 'poor') toast(`Il te manque ${cost - save.cur.C} legumes.`);
        else renderDeck();
      };
      tgrid.appendChild(n);
      continue;
    }
    const id = save.team[i];
    const c = id ? CHAR_BY_ID[id] : null;
    const n = el(`<div class="hero-tile ${c ? 'on' : ''}">
      ${c ? `<img src="${asset(c.sprite)}" alt=""><div class="nm">${c.name}</div><div class="lvl">${save.chars[id].level}</div>`
          : '<div style="font-size:26px">＋</div><div class="nm">Vide</div>'}
    </div>`);
    n.onclick = () => pickHero(i);
    tgrid.appendChild(n);
  }
  const deckSize = save.team.filter(Boolean).length * 5;
  teamBox.appendChild(el(`<div class="muted" style="margin-top:8px">Paquet de combat : <b>${deckSize} cartes</b> melangees.</div>`));
  wrap.appendChild(teamBox);

  // -------------------------------------------------------- tous les persos
  const all = el('<div class="card-panel"><h3>Personnages</h3><div class="roster"></div></div>');
  const agrid = all.querySelector('.roster');
  for (const c of CHARACTERS) {
    const st = save.chars[c.id];
    const n = el(`<div class="hero-tile ${st.owned ? '' : 'locked'}">
      <img src="${asset(c.sprite)}" alt="">
      <div class="nm">${c.name}</div>
      ${st.owned ? `<div class="lvl">${st.level}</div>` : ''}
    </div>`);
    n.onclick = () => (st.owned ? heroSheet(c.id) : unlockSheet(c.id));
    agrid.appendChild(n);
  }
  wrap.appendChild(all);

  root.appendChild(wrap);
}

function pickHero(slot) {
  const box = el(`<div><h2>Slot ${slot + 1}</h2><div class="roster"></div></div>`);
  const g = box.querySelector('.roster');
  for (const c of CHARACTERS) {
    if (!save.chars[c.id].owned) continue;
    const n = el(`<div class="hero-tile"><img src="${asset(c.sprite)}" alt=""><div class="nm">${c.name}</div></div>`);
    n.onclick = () => { setTeamSlot(slot, c.id); closeModal(); renderDeck(); };
    g.appendChild(n);
  }
  const clear = el('<button class="btn ghost">Vider le slot</button>');
  clear.onclick = () => {
    if (save.team.filter(Boolean).length <= 1) { toast('Il te faut au moins un personnage.'); return; }
    save.team[slot] = null; persist(); closeModal(); renderDeck();
  };
  box.appendChild(clear);
  modal(box);
}

function unlockSheet(id) {
  const c = CHAR_BY_ID[id];
  const st = save.chars[id];
  const cost = BALANCE.costs.charUnlock;
  const box = el(`<div>
    <h2>${c.name}</h2>
    <img src="${asset(c.sprite)}" style="width:110px;margin:0 auto;display:block">
    <p class="muted">${c.role}</p>
    <p class="muted">${st.bossBeaten
      ? `Disponible a l'achat : <b>${save.cur.A}/${cost}</b> Fanions.`
      : 'Bats son boss dans l’overworld pour rendre son achat possible.'}</p>
  </div>`);
  const buy = el(`<button class="btn" ${st.bossBeaten ? '' : 'disabled'}>Recruter (${cost} Fanions)</button>`);
  buy.onclick = () => {
    const r = unlockChar(id);
    if (r === 'poor') toast(`Il te manque ${cost - save.cur.A} Fanions.`);
    else if (r === 'boss') toast('Son boss n’est pas encore vaincu.');
    else { closeModal(); renderDeck(); toast(`${c.name} rejoint l’equipe !`); }
  };
  box.appendChild(buy);
  const b = el('<button class="btn ghost">Fermer</button>');
  b.onclick = closeModal;
  box.appendChild(b);
  modal(box);
}

function heroSheet(id) {
  const c = CHAR_BY_ID[id];
  const st = save.chars[id];
  const cost = upgradeCost(id);
  const box = el(`<div>
    <div class="row">
      <img src="${asset(c.sprite)}" style="width:64px">
      <div style="flex:1">
        <h2>${c.name} <span class="lvl">niv. ${st.level}</span></h2>
        <div class="muted">${c.role}</div>
        <div class="muted">${c.stats.hp} PV · ${c.stats.mana} mana · ${c.stats.hand} cartes en main</div>
      </div>
    </div>
  </div>`);

  const up = el(`<button class="btn">Ameliorer — ${cost} legumes (tu en as ${save.cur.C})</button>`);
  up.onclick = () => {
    const r = upgradeChar(id);
    if (r === 'poor') toast(`Il te manque ${cost - save.cur.C} legumes.`);
    else if (r === 'max') toast('Niveau maximum atteint.');
    else { closeModal(); heroSheet(id); renderDeck(); toast(`${c.name} passe niveau ${save.chars[id].level}.`); }
  };
  box.appendChild(up);

  box.appendChild(el('<h3 style="margin-top:8px">Cartes</h3>'));
  const list = el('<div class="cardlist"></div>');
  for (let i = 0; i < 5; i++) {
    const useSwitch = st.switches[i];
    const def = useSwitch ? c.switches[i] : c.cards[i];
    const card = resolveCard(def, st.level);
    const alt = useSwitch ? c.cards[i] : c.switches[i];

    const node = el(`
      <div class="gcard ${card.type === 'spell' ? 'spell' : ''}">
        <img class="port" src="${asset(c.sprite)}" alt="">
        <div>
          <div class="nm">${card.name}</div>
          <div class="tx">${card.text || '—'}</div>
        </div>
        <div style="display:grid;gap:4px;justify-items:end">
          <div class="cost">${card.cost}</div>
          ${card.type === 'ally' ? `<div class="st">${card.atk}/${card.hp}</div>` : ''}
        </div>
        <div class="tiers"></div>
      </div>`);

    const tiers = node.querySelector('.tiers');
    for (const t of def.tiers) {
      const on = st.level >= t.lvl;
      tiers.appendChild(el(`<div class="tier ${on ? 'on' : 'off'}">Niveau ${t.lvl} — ${t.text}</div>`));
    }

    const btn = el(`<button class="btn ghost" style="grid-column:1/-1;margin-top:6px">
      ${useSwitch ? '↩ Revenir a ' + c.cards[i].name : '⇄ ' + alt.name}
    </button>`);
    btn.onclick = () => {
      if (!useSwitch && !hasSwitch(id, i)) {
        buySwitchFlow(id, i, () => { closeModal(); heroSheet(id); });
        return;
      }
      toggleSwitch(id, i);
      closeModal();
      heroSheet(id);
      renderDeck();
    };
    node.appendChild(btn);
    list.appendChild(node);
  }
  box.appendChild(list);

  const b = el('<button class="btn ghost">Fermer</button>');
  b.onclick = closeModal;
  box.appendChild(b);
  modal(box);
}

// Une carte switch s'achete une fois (monnaie B), ensuite on bascule librement.
function hasSwitch(id, slot) {
  const st = save.chars[id];
  if (!st.bought) st.bought = [false, false, false, false, false];
  return st.bought[slot];
}

function buySwitchFlow(id, slot, done) {
  const c = CHAR_BY_ID[id];
  const cost = BALANCE.costs.switchCard;
  const alt = c.switches[slot];
  const box = el(`<div>
    <h2>${alt.name}</h2>
    <p class="muted">Carte switch pour le slot ${slot + 1} de ${c.name}.</p>
    <p>${alt.text || '—'}</p>
    <p class="muted">Cout : <b>${cost}</b> Sceaux (tu en as ${save.cur.B}).</p>
  </div>`);
  const buy = el('<button class="btn">Debloquer</button>');
  buy.onclick = () => {
    if (save.cur.B < cost) { toast(`Il te manque ${cost - save.cur.B} Sceaux.`); return; }
    save.cur.B -= cost;
    const st = save.chars[id];
    if (!st.bought) st.bought = [false, false, false, false, false];
    st.bought[slot] = true;
    st.switches[slot] = true;
    persist();
    closeModal();
    if (done) done();
    toast(`${alt.name} debloquee.`);
  };
  const b = el('<button class="btn ghost">Annuler</button>');
  b.onclick = () => { closeModal(); if (done) done(); };
  box.appendChild(buy);
  box.appendChild(b);
  modal(box);
}
