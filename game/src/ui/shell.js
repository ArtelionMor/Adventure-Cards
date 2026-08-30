// Helpers UI partages (pas de framework : le prototype doit rester portable).

/** Chemin d'asset : les dossiers de sprites sont servis depuis la racine du projet. */
export const asset = p => '/' + p.split('/').map(encodeURIComponent).join('/');

export const $ = sel => document.querySelector(sel);
export const $$ = sel => [...document.querySelectorAll(sel)];

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function toast(msg, ms = 2200) {
  const n = el(`<div class="toast">${msg}</div>`);
  $('#toasts').appendChild(n);
  setTimeout(() => n.remove(), ms);
}

let modalClose = null;
export function modal(contentNode, onClose) {
  const m = $('#modal');
  m.innerHTML = '';
  const sheet = el('<div class="sheet"></div>');
  sheet.appendChild(contentNode);
  m.appendChild(sheet);
  m.classList.remove('hidden');
  modalClose = onClose;
  m.onclick = ev => { if (ev.target === m) closeModal(); };
  return sheet;
}

export function closeModal() {
  const m = $('#modal');
  m.classList.add('hidden');
  m.innerHTML = '';
  if (modalClose) { const f = modalClose; modalClose = null; f(); }
}

export function fmtTime(ms) {
  if (ms <= 0) return 'pret';
  const s = Math.ceil(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm' + String(s % 60).padStart(2, '0');
  return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0');
}

/** Rappel contextuel de monnaie, dans l'esprit "5/16 needed to unlock this" du GDD. */
export function setContext(text) {
  $('#contextCurrency').innerHTML = text || '';
}

export const CURRENCY_NAME = {
  A: 'Fanions',        // distribues en explorant l'overworld
  B: 'Sceaux',         // debloquent les cartes switch (collecte a trancher, cf. GDD)
  C: 'Legumes'         // monnaie de la Ferme : upgrades + progression path
};
