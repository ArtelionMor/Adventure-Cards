// LES PICTOGRAMMES D'UNE CARTE OU D'UNE UNITE : ce qu'elle FAIT, sans une ligne de texte.
//
// Decision du game designer (9 octobre 2026) : une carte n'ecrit pas son effet — trop de texte, et un
// texte change la taille de la carte (les jetons faisaient des effets bizarres). Une ligne de pictogrammes
// de HAUTEUR FIXE la remplace ; le texte complet reste a l'appui long (la fiche). Les icones sont celles de
// `icones.js` (le dessin du game designer quand il existe, un pictogramme de travail sinon).
import { keyId, TRIGGERS } from '../config/mechanics.js';
import { icone } from './icones.js';

// Mot-cle -> icone. Les types (`type:Chien`, `type_tous`) sont des etiquettes, pas des effets : aucun picto.
export const CLES = {
  Taunt: 'Taunt', Charge: 'Charge', Venin: 'Venom', Bouclier: 'Shield', elusif: 'Elusive',
  passe_murailles: 'WallWalker', miroir: 'Mirror', reprise: 'Flashback',
  characteristique_variable: 'Static', cout_x_de_moins_de_plus: 'Mana'
};

// Effet (`op`) -> icone. Un effet que cette table ne connait pas s'affiche « Trigger » (l'eclair) : il se voit.
export const OPS = {
  dmg: 'Damage', heal: 'Heal', draw: 'Draw', armor: 'Armor', mana: 'Mana', mana_au_prochain_tour: 'Mana',
  buff: 'Buff', renforce_les_cartes: 'Buff', summon: 'Summon', pose_sur_le_plateau: 'Summon',
  cree: 'Create', melange_a_la_pioche: 'Shuffle', detruit: 'Destroy', copie: 'Copy', switch: 'Switch',
  renvoie_en_main: 'Return', reduit_le_cout_de: 'Mana', choisir: 'Choice', controle: 'Control'
};

// Moment (slot de `TRIGGERS`) -> icone ; `play` n'en a pas (c'est l'effet lui-meme qui s'affiche).
export const MOMENTS = { death: 'Deathrattle', turnStart: 'TurnStart', turnEnd: 'TurnEnd' };

/** L'icone d'un mot-cle (`Taunt:...`), ou null (un type n'en a pas). */
export const iconeDeCle = k => CLES[keyId(k)] || null;

/** L'icone d'un effet (`op`), « Trigger » s'il est inconnu ; celle d'un moment (slot de `TRIGGERS`), ou null. */
export const iconeDeOp = op => OPS[op] || 'Trigger';
export const iconeDeMoment = slot => MOMENTS[slot] || null;

/** Un montant a cote de l'icone : le nombre s'il est fixe, « X » s'il depend d'un compteur. */
const montant = v => (typeof v === 'number' ? (v > 1 || v < 0 ? v : null) : v && typeof v === 'object' ? 'X' : null);

/**
 * La liste des pictogrammes de `x` (une carte ou une unite) : mots-cles, moments, puis — pour une carte
 * qu'on n'a pas encore jouee — ses effets. `{ nom, n, titre }`, au plus `max` (le reste est a l'appui long).
 */
export function pictosDe(x, { effets = true, max = 4 } = {}) {
  const out = [];
  const ajoute = (nom, n, titre) => { if (!out.some(o => o.nom === nom && o.n === n)) out.push({ nom, n: n ?? null, titre }); };
  for (const k of x.keys || x.baseKeys || []) {
    const nom = CLES[keyId(k)];
    if (nom) ajoute(nom, null, keyId(k));
  }
  for (const [slot, nom] of Object.entries(MOMENTS)) {
    if ((x[slot] || []).length) {
      ajoute(nom, null, TRIGGERS[slot] ? TRIGGERS[slot].label : slot);
      if (slot === 'death' && effets) for (const e of x[slot]) if (OPS[e.op]) ajoute(OPS[e.op], montant(e.v), e.op);
    }
  }
  if (x.aura) ajoute('Aura', null, 'Aura');
  if ((x.statics || []).length) ajoute('Static', null, 'Effet continu');
  if (effets) for (const e of x.play || []) ajoute(OPS[e.op] || 'Trigger', montant(e.v), e.op);
  return { liste: out.slice(0, max), reste: Math.max(0, out.length - max) };
}

/** La ligne de pictogrammes, en HTML, a hauteur fixe (une ligne, jamais plus). */
export function ligneDePictos(x, { taille = 16, ...opt } = {}) {
  const { liste, reste } = pictosDe(x, opt);
  const html = liste.map(p => `<span class="pc" title="${p.titre || p.nom}">${icone(p.nom, taille)}${p.n !== null ? `<b>${p.n}</b>` : ''}</span>`).join('');
  return `<div class="pic">${html}${reste ? `<span class="pc plus">+${reste}</span>` : ''}</div>`;
}
