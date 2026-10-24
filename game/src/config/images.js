// LES CHEMINS D'IMAGES QUI SURVIVENT A UN RANGEMENT.
//
// Une carte, un heros ou un adversaire designe son image par son chemin complet
// (`Graphical Assets/Cards/Cat Decks/Cat Deck 1/Griffure.png`). Le game designer range ses
// images comme il veut — par deck, par adversaire, en sous-dossiers — et un rangement ne doit
// rien casser : une image qui n'est plus a son chemin est RETROUVEE par son nom de fichier
// (sans tenir compte des majuscules ni des accents) dans la liste des images (`SPRITES`,
// game/data/sprites.js).
//
// ⚠ Un meme nom peut exister dans plusieurs dossiers, avec des dessins differents (« Eclair »
// du deck Chat 1 et celui de l'adversaire Chat, 24 oct. 2026). On departage alors par les
// VOISINES : le dossier ou se trouvent deja les images des autres cartes du meme heros (ou des
// memes decks d'adversaires) l'emporte. Sans voisine pour trancher, on prend le premier dans
// l'ordre alphabetique et on le dit (etat « ambigu »).
//
// Pur (pas de DOM, pas d'import) : le jeu (config/characters.js), le Card Builder et les
// scripts (scripts/repare-images.mjs, gen-lapins.mjs) s'en servent.

// Le nom d'un fichier ou d'une carte, comparable : sans extension, sans accents, ligatures
// defaites (« Mauvais Œil » = « Mauvais Oeil.png »), apostrophes et espaces unifies.
export const normaliseNom = s => String(s).replace(/\.(png|jpe?g|webp|gif)$/i, '')
  .replace(/œ/g, 'oe').replace(/Œ/g, 'Oe').replace(/æ/g, 'ae').replace(/Æ/g, 'Ae').replace(/[’‘`]/g, "'")
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const nomDe = chemin => String(chemin).split('/').pop();
const dossierDe = chemin => String(chemin).split('/').slice(0, -1).join('/');

// L'index des images : tous les chemins, et par nom de fichier normalise la liste des chemins.
export function indexImages(sprites) {
  const chemins = new Set(), parNom = new Map(), parDossier = new Map();
  for (const [racine, fichiers] of Object.entries(sprites || {})) {
    for (const f of fichiers) {
      const c = `${racine}/${f}`;
      chemins.add(c);
      const n = normaliseNom(nomDe(c));
      if (!parNom.has(n)) parNom.set(n, []);
      parNom.get(n).push(c);
      const d = dossierDe(c);
      if (!parDossier.has(d)) parDossier.set(d, new Set());
      parDossier.get(d).add(n);
    }
  }
  for (const l of parNom.values()) l.sort();
  return { chemins, parNom, parDossier };
}

// Ou est passee l'image `chemin` ? `voisins` : les noms de fichier des images qui vont avec
// (les autres cartes du heros). Rend { chemin, etat, candidats } : etat = 'ok' (rien a faire),
// 'deplace' (retrouvee, sans doute), 'ambigu' (retrouvee, plusieurs possibles a egalite),
// 'introuvable' (aucune image de ce nom : le chemin est rendu tel quel).
export function retrouve(chemin, index, voisins = []) {
  if (!chemin || index.chemins.has(chemin)) return { chemin, etat: 'ok', candidats: [] };
  let candidats = index.parNom.get(normaliseNom(nomDe(chemin))) || [];
  // un portrait reste un portrait : on cherche d'abord sous la meme racine (« Graphical Assets/Cards »)
  const racine = String(chemin).split('/').slice(0, 2).join('/');
  const memeRacine = candidats.filter(c => c.startsWith(racine + '/'));
  if (memeRacine.length) candidats = memeRacine;
  if (!candidats.length) return { chemin, etat: 'introuvable', candidats: [] };
  if (candidats.length === 1) return { chemin: candidats[0], etat: 'deplace', candidats };
  const v = new Set(voisins.map(normaliseNom));
  const score = c => { const s = index.parDossier.get(dossierDe(c)) || new Set(); let n = 0; for (const x of v) if (s.has(x)) n++; return n; };
  const tries = candidats.map(c => [c, score(c)]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const ambigu = tries.length > 1 && tries[0][1] === tries[1][1];
  return { chemin: tries[0][0], etat: ambigu ? 'ambigu' : 'deplace', candidats };
}

// Repare toutes les images des donnees du builder (CHARACTER_DATA) EN PLACE : portraits des
// heros et des adversaires, illustrations des cartes (base, switch, cartes libres). Rend la
// liste de ce qui a bouge ou reste casse : [{ ou, avant, apres, etat, candidats }].
// `devine` : un cas « ambigu » prend quand meme le meilleur candidat (le jeu : mieux vaut une
// image qu'une case vide). Sans (le Card Builder, decision du 24 oct. 2026 : « quand il y a des
// problemes, juste les signaler a l'import »), seul un deplacement SANS doute est recolle ; un
// ambigu ou un introuvable garde son chemin, et la validation le signale avec ses candidats.
export function repareImages(data, sprites, { devine = true } = {}) {
  const index = indexImages(sprites);
  const out = [];
  const noms = cartes => cartes.filter(c => c && c.sprite).map(c => nomDe(c.sprite));
  const regle = (objet, ou, voisins) => {
    if (!objet || !objet.sprite) return;
    const r = retrouve(objet.sprite, index, voisins);
    if (r.etat === 'ok') return;
    out.push({ ou, avant: objet.sprite, apres: r.chemin, etat: r.etat, candidats: r.candidats });
    if (r.etat === 'deplace' || (devine && r.etat === 'ambigu')) objet.sprite = r.chemin;
  };
  // les cartes de chaque heros se departagent entre elles
  for (const h of data.characters || []) {
    const cartes = [...(h.cards || []), ...(h.switches || [])];
    const voisins = noms(cartes);
    regle(h, `heros:${h.id}`, []);
    for (const c of cartes) if (c) regle(c, `carte:${c.id}`, voisins.filter(n => n !== nomDe(c.sprite || '')));
  }
  // une carte libre se departage par les decks d'adversaires qui la jouent
  const parId = new Map();
  for (const h of data.characters || []) for (const c of [...(h.cards || []), ...(h.switches || [])]) if (c) parId.set(c.id, c);
  for (const c of data.library || []) parId.set(c.id, c);
  const decksDe = new Map();
  for (const n of data.npcs || []) for (const l of n.deck || []) {
    if (!decksDe.has(l.card)) decksDe.set(l.card, []);
    decksDe.get(l.card).push(n);
  }
  for (const c of data.library || []) {
    const voisins = [];
    for (const n of decksDe.get(c.id) || []) for (const l of n.deck || []) { const k = parId.get(l.card); if (k && k !== c && k.sprite) voisins.push(nomDe(k.sprite)); }
    regle(c, `carte:${c.id}`, voisins);
  }
  for (const n of data.npcs || []) regle(n, `pnj:${n.id}`, []);
  return out;
}

// Les cartes SANS illustration dont le deck contient une image a leur nom : on la propose.
// « Son deck » = le dossier ou sont rangees les images des autres cartes du heros (ou des decks
// d'adversaires qui jouent cette carte libre). Rend [{ ou, carte, chemin }] ; ne touche a rien.
export function proposeIllustrations(data, sprites) {
  const index = indexImages(sprites);
  const out = [];
  const dossiersDe = cartes => {
    const n = new Map();
    for (const c of cartes) if (c && c.sprite && index.chemins.has(c.sprite)) n.set(dossierDe(c.sprite), (n.get(dossierDe(c.sprite)) || 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
  };
  const propose = (c, dossiers) => {
    if (!c || c.sprite) return;
    const cands = (index.parNom.get(normaliseNom(c.name || '')) || []).filter(p => p.startsWith('Graphical Assets/Cards/'));
    const dansLeDeck = dossiers.length ? cands.filter(p => dossierDe(p) === dossiers[0]) : [];
    const choix = dansLeDeck.length === 1 ? dansLeDeck[0] : (!dossiers.length && cands.length === 1 ? cands[0] : null);
    if (choix) out.push({ ou: `carte:${c.id}`, carte: c, chemin: choix });
  };
  for (const h of data.characters || []) {
    const cartes = [...(h.cards || []), ...(h.switches || [])];
    const d = dossiersDe(cartes);
    for (const c of cartes) propose(c, d);
  }
  const parId = new Map();
  for (const h of data.characters || []) for (const c of [...(h.cards || []), ...(h.switches || [])]) if (c) parId.set(c.id, c);
  for (const c of data.library || []) parId.set(c.id, c);
  for (const c of data.library || []) {
    const voisines = [];
    for (const n of data.npcs || []) if ((n.deck || []).some(l => l.card === c.id)) for (const l of n.deck) { const k = parId.get(l.card); if (k && k !== c) voisines.push(k); }
    propose(c, dossiersDe(voisines));
  }
  return out;
}
