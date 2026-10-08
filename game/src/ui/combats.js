// LES COMBATS GARDES. Un joueur qui laisse tourner le jeu (AFK) revient plus tard et se demande
// « pourquoi je n'avance pas ? » : il faut que le dernier combat soit encore la pour etre relu. On
// garde donc les `MAX` derniers, avec leurs evenements (combat/evenements.js), dans une cle de
// localStorage A PART — la sauvegarde, elle, s'ecrit toutes les quelques secondes, et ne doit pas
// trainer des centaines de ko de recit a chaque ecriture.
//
// Un evenement repete le chemin de ses images a chaque photo (une unite, une carte...) : on les range
// dans une table une fois pour toutes, et l'evenement ne garde qu'un entier. Un localStorage plein
// ne doit jamais gener un combat : on retire les plus anciens jusqu'a ce que ca tienne, et si meme
// un seul ne tient pas, on renonce sans bruit.
const CLE = 'adventureCard.combats.v1';
const MAX = 5;

/** Remplace chaque `sprite` (une chaine) par son rang dans une table. */
function compacte(evts) {
  const table = [], rang = new Map();
  const marche = o => {
    if (Array.isArray(o)) return o.map(marche);
    if (!o || typeof o !== 'object') return o;
    const r = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === 'sprite' && typeof v === 'string') {
        if (!rang.has(v)) { rang.set(v, table.length); table.push(v); }
        r[k] = rang.get(v);
      } else r[k] = marche(v);
    }
    return r;
  };
  return { sprites: table, evts: marche(evts) };
}

/** L'inverse de `compacte`. */
function developpe({ sprites, evts }) {
  const marche = o => {
    if (Array.isArray(o)) return o.map(marche);
    if (!o || typeof o !== 'object') return o;
    const r = {};
    for (const [k, v] of Object.entries(o)) r[k] = k === 'sprite' && typeof v === 'number' ? sprites[v] : marche(v);
    return r;
  };
  return marche(evts);
}

function lit() {
  try { return JSON.parse(localStorage.getItem(CLE)) || []; } catch { return []; }
}

/**
 * Garde un combat fini. `info` : { nom, gagnant, tours, equipe, heros: { p, e } (sprites), evts }.
 * Rend l'identifiant du combat garde, ou null si rien n'a pu etre ecrit.
 */
export function gardeCombat(info) {
  if (!info.evts || !info.evts.length) return null;
  const { evts, ...meta } = info;
  const entree = { id: Date.now().toString(36), t: Date.now(), ...meta, recit: compacte(evts) };
  const liste = [entree, ...lit()].slice(0, MAX);
  while (liste.length) {
    try { localStorage.setItem(CLE, JSON.stringify(liste)); return entree.id; }
    catch { liste.pop(); }   // plein : on sacrifie le plus ancien
  }
  return null;
}

/** Les combats gardes, du plus recent au plus ancien, sans leur recit (c'est lourd). */
export function listeCombats() {
  return lit().map(({ recit, ...meta }) => meta);
}

/** Un combat garde, evenements compris, ou null. */
export function chargeCombat(id) {
  const c = lit().find(x => x.id === id);
  if (!c) return null;
  const { recit, ...meta } = c;
  return { ...meta, evts: developpe(recit) };
}
