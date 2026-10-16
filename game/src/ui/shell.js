// Helpers UI partages (pas de framework : le prototype doit rester portable).

import { VIGNETTES } from '../../data/vignettes.js';

/**
 * Chemin d'asset : les dossiers de sprites sont servis depuis la racine du projet. Une image qui a sa VERSION
 * ALLEGEE (game/vignettes/, WebP de 512 px au plus, `scripts/gen-vignettes.py`) est servie allegee : les originaux
 * font 2000 px et ~1,5 Mo, et ralentissaient chaque menu sur le telephone. Sans vignette : l'original.
 */
const ALLEGEES = new Set(VIGNETTES);
const encode = p => p.split('/').map(encodeURIComponent).join('/');
export const asset = p => {
  if (!p) return '/';
  return ALLEGEES.has(p) ? '/game/vignettes/' + encode(p.replace(/\.[^./]+$/, '.webp')) : '/' + encode(p);
};

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

export const CURRENCY_NAME = {
  A: 'Fanions',        // distribues en explorant l'overworld
  B: 'Sceaux',         // debloquent les cartes switch (collecte a trancher, cf. GDD)
  C: 'Pièces',         // ameliorations des heros + progression path (la Ferme en rapporte)
  G: 'Gemmes'          // affichees dans la barre du haut ; rien ne les depense encore
};

/** Un montant court, comme la maquette : 950, 12.5k, 999k, 1.2M. */
export function court(n) {
  const a = Math.abs(n);
  if (a < 1000) return String(Math.floor(n));
  const [v, u] = a < 1e6 ? [n / 1e3, 'k'] : [n / 1e6, 'M'];
  return (Math.abs(v) < 100 ? Math.floor(v * 10) / 10 : Math.floor(v)) + u;
}
