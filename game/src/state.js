// Etat de sauvegarde + regles de progression hors combat.
import { BALANCE } from './config/balance.js';
import { CHARACTERS, STARTERS } from './config/characters.js';
import { WORLD } from './config/world.js';

const KEY = BALANCE.save.key;

function freshChars() {
  const o = {};
  for (const c of CHARACTERS) {
    o[c.id] = {
      owned: STARTERS.includes(c.id),   // les 3 persos du tutoriel
      level: 1,
      switches: [false, false, false, false, false], // 1 alternative par slot de carte
      bossBeaten: false                 // le boss ouvre l'ELIGIBILITE a l'achat
    };
  }
  return o;
}

export function freshSave() {
  const now = Date.now();
  return {
    v: 1,
    createdAt: now,
    lastSeen: now,
    // Monnaies : jamais affichees en barre permanente, seulement en contexte (GDD).
    cur: { A: 0, B: 0, C: 40 },
    chars: freshChars(),
    team: ['dog', null, null],
    rosterSlots: 1,                     // progression path 1 -> 2 -> 3
    world: {
      px: WORLD.spawn.x + 0.5,
      py: WORLD.spawn.y + 0.5,
      cleared: {},                      // nodeId -> true
      seen: {}
    },
    farm: {
      plotCount: BALANCE.farm.startPlots,
      stallSlots: BALANCE.farm.startStallSlots,
      plots: Array(BALANCE.farm.maxPlots).fill(null),   // {cropId, at}
      stall: Array(BALANCE.farm.maxStallSlots).fill(null), // cropId
      basket: {},                       // cropId -> quantite recoltee
      nextSaleAt: now + BALANCE.farm.saleIntervalMs,
      totalEarned: 0
    },
    relics: [],
    flags: { tutorial: false },
    log: []
  };
}

export const save = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const s = JSON.parse(raw);
    // Migration douce : on complete les champs manquants sans casser la partie.
    return { ...freshSave(), ...s, farm: { ...freshSave().farm, ...s.farm } };
  } catch {
    return freshSave();
  }
}

export function persist() {
  save.lastSeen = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch {}
}

export function resetSave() {
  localStorage.removeItem(KEY);
  location.reload();
}

// ---------------------------------------------------------------- monnaies
export function gain(kind, n) {
  save.cur[kind] = (save.cur[kind] || 0) + n;
}
export function spend(kind, n) {
  if ((save.cur[kind] || 0) < n) return false;
  save.cur[kind] -= n;
  return true;
}

// ------------------------------------------------------------- personnages
export const team = () => save.team.filter(Boolean);

/** Niveau de reference pour les verrous de l'overworld : le meilleur de l'equipe. */
export function partyLevel() {
  const t = team();
  return t.length ? Math.max(...t.map(id => save.chars[id].level)) : 1;
}

export function upgradeCost(charId) {
  return BALANCE.costs.charUpgrade(save.chars[charId].level);
}

export function upgradeChar(charId) {
  const st = save.chars[charId];
  if (st.level >= BALANCE.progression.maxLevel) return 'max';
  const cost = upgradeCost(charId);
  if (!spend('C', cost)) return 'poor';
  st.level++;
  persist();
  return 'ok';
}

export function buySwitch(charId, slot) {
  const st = save.chars[charId];
  if (st.switches[slot]) return 'owned';
  if (!spend('B', BALANCE.costs.switchCard)) return 'poor';
  st.switches[slot] = true;
  persist();
  return 'ok';
}

export function toggleSwitch(charId, slot) {
  // Une fois la carte switch achetee, on peut basculer librement entre les deux faces.
  const st = save.chars[charId];
  st.switches[slot] = !st.switches[slot];
  persist();
}

export function unlockChar(charId) {
  const st = save.chars[charId];
  if (st.owned) return 'owned';
  if (!st.bossBeaten) return 'boss';   // le boss gate l'eligibilite
  if (!spend('A', BALANCE.costs.charUnlock)) return 'poor'; // la monnaie A gate l'achat
  st.owned = true;
  persist();
  return 'ok';
}

export function buyRosterSlot() {
  if (save.rosterSlots >= 3) return 'max';
  const cost = BALANCE.costs.rosterSlots[save.rosterSlots];
  if (!spend('C', cost)) return 'poor';
  save.rosterSlots++;
  persist();
  return 'ok';
}

export function setTeamSlot(slot, charId) {
  if (slot >= save.rosterSlots) return false;
  // Un meme personnage ne peut pas occuper deux slots.
  const other = save.team.indexOf(charId);
  if (other >= 0 && other !== slot) save.team[other] = null;
  save.team[slot] = charId;
  if (!save.team.some(Boolean)) save.team[0] = charId;
  persist();
  return true;
}
