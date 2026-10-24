// Le banc des CHEMINS D'IMAGES (game/src/config/images.js) : un rangement des images en
// sous-dossiers (des decks) ne doit rien casser, et un doute doit etre signale, pas devine.
// Et sur les vraies donnees : aucune image introuvable dans game/data/characters.data.js.
//
//   node scripts/test-images.mjs

import { normaliseNom, indexImages, retrouve, repareImages, proposeIllustrations } from '../game/src/config/images.js';
import { validateData } from '../game/src/config/validate.js';
import { ALL_EFFECTS, ALL_KEYWORDS } from '../game/src/config/mechanics.js';
import { CHARACTER_DATA } from '../game/data/characters.data.js';
import { SPRITES } from '../game/data/sprites.js';

let ok = 0, ko = 0;
const test = (nom, f) => { try { if (f() === false) throw new Error('faux'); ok++; } catch (e) { ko++; console.log('✗ ' + nom + ' : ' + e.message); } };

// une petite bibliotheque d'images, rangee en decks
const S = {
  'Graphical Assets/Characters': ['Cat/Cat.png'],
  'Graphical Assets/Cards': [
    'Cat Decks/Cat Deck 1/Griffure.png', 'Cat Decks/Cat Deck 1/Eclair.png', 'Cat Decks/Cat Deck 1/Neuf Vies.png',
    'Opponent Cat/Eclair.png', 'Opponent Cat/Matou.png',
    'Raven Decks/Raven Deck 1/Mauvais Oeil.png', 'Raven Decks/Raven Deck 1/Plume.png',
    'Cat Decks/Cat Deck 3/Mauvais Oeil.png', 'Cat Decks/Cat Deck 3/Sabbat.png',
  ],
};
const I = indexImages(S);

test('normaliser un nom : accents, ligatures, extension, casse', () => normaliseNom('Mauvais Œil') === normaliseNom('mauvais oeil.PNG') && normaliseNom('Étang Fécond') === 'etang fecond');
test('une image a sa place : rien a faire', () => retrouve('Graphical Assets/Cards/Opponent Cat/Matou.png', I).etat === 'ok');
test('une image deplacee, seule de son nom : retrouvee', () => {
  const r = retrouve('Graphical Assets/Cards/Griffure.png', I);
  return r.etat === 'deplace' && r.chemin === 'Graphical Assets/Cards/Cat Decks/Cat Deck 1/Griffure.png';
});
test('un nom dans deux dossiers : les voisines tranchent', () => {
  const r = retrouve('Graphical Assets/Cards/Mauvais Oeil.png', I, ['Plume.png']);
  return r.etat === 'deplace' && r.chemin.includes('Raven Deck 1');
});
test('un nom dans deux dossiers sans voisine : ambigu, et dit ses candidats', () => {
  const r = retrouve('Graphical Assets/Cards/Eclair.png', I);
  return r.etat === 'ambigu' && r.candidats.length === 2;
});
test('aucune image de ce nom : introuvable, le chemin reste', () => {
  const r = retrouve('Graphical Assets/Cards/Inconnue.png', I);
  return r.etat === 'introuvable' && r.chemin === 'Graphical Assets/Cards/Inconnue.png';
});

const donnees = () => ({
  characters: [{ id: 'cat', name: 'Felix', sprite: 'Graphical Assets/Characters/Cat/Cat.png', cards: [
    { id: 'c1', name: 'Griffure', sprite: 'Graphical Assets/Cards/Griffure.png' },
    { id: 'c2', name: 'Neuf Vies', sprite: 'Graphical Assets/Cards/Neuf Vies.png' },
    { id: 'c3', name: 'Mauvais Œil' },
  ], switches: [] },
  { id: 'cat3', name: 'Sorciere', cards: [{ id: 'd1', name: 'Sabbat' }, { id: 'd2', name: 'Mauvais Œil' }], switches: [] }],
  library: [{ id: 'bolt', name: 'Eclair', sprite: 'Graphical Assets/Cards/Eclair.png' }],
  npcs: [],
});
test('reparer pour le jeu : un ambigu prend le meilleur candidat', () => {
  const d = donnees(); repareImages(d, S);
  return d.characters[0].cards[0].sprite.includes('Cat Deck 1') && d.library[0].sprite.startsWith('Graphical Assets/Cards/') && d.library[0].sprite !== 'Graphical Assets/Cards/Eclair.png';
});
test('reparer pour le builder (sans deviner) : un ambigu garde son chemin et se signale', () => {
  const d = donnees(); const r = repareImages(d, S, { devine: false });
  return d.characters[0].cards[0].sprite.includes('Cat Deck 1') && d.library[0].sprite === 'Graphical Assets/Cards/Eclair.png' && r.some(x => x.etat === 'ambigu');
});
test('attacher une illustration par le nom, dans le deck du heros', () => {
  const d = donnees(); repareImages(d, S);
  let p = proposeIllustrations(d, S);
  for (const x of p) x.carte.sprite = x.chemin;
  p = proposeIllustrations(d, S); for (const x of p) x.carte.sprite = x.chemin; // la 2e passe situe le deck de cat3
  return d.characters[1].cards[0].sprite.includes('Cat Deck 3') && d.characters[1].cards[1].sprite.includes('Cat Deck 3/Mauvais Oeil');
});
test('la validation signale un nom dans plusieurs dossiers, et une image introuvable', () => {
  const d = donnees();
  d.characters[0].cards[2].sprite = 'Graphical Assets/Cards/Disparue.png';
  const m = validateData(d, ALL_EFFECTS, ALL_KEYWORDS, { sprites: S }).filter(i => i.regle === 'image-introuvable');
  return m.some(i => i.ou === 'carte:bolt' && /2 dossiers/.test(i.msg)) && m.some(i => i.ou === 'carte:c3' && /introuvable/.test(i.msg)) && m.every(i => !i.bad);
});

// les vraies donnees
test('les cartes du jeu : aucune image introuvable', () => {
  const index = indexImages(SPRITES), manquent = [];
  const voit = (x, ou) => { if (x && x.sprite && !index.chemins.has(x.sprite)) manquent.push(`${ou} : ${x.sprite}`); };
  for (const h of CHARACTER_DATA.characters) { voit(h, h.id); for (const c of [...h.cards, ...(h.switches || [])]) voit(c, c && c.id); }
  for (const c of CHARACTER_DATA.library || []) voit(c, c.id);
  for (const n of CHARACTER_DATA.npcs || []) voit(n, n.id);
  if (manquent.length) throw new Error(manquent.length + ' : ' + manquent.slice(0, 3).join(' ; ') + ' (node scripts/repare-images.mjs)');
});

console.log(`${ok} tests passés, ${ko} échoué(s)`);
process.exit(ko ? 1 : 0);
