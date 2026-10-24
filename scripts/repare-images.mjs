// Apres un RANGEMENT des images (des decks en sous-dossiers, un renommage de dossier) :
// recolle les images des cartes, des heros et des adversaires, et attache leur illustration
// aux cartes qui n'en ont pas quand leur deck contient une image a leur nom.
//
//   node scripts/repare-images.mjs            (dit ce qu'il ferait, n'ecrit rien)
//   node scripts/repare-images.mjs --ecrire   (reecrit game/data/characters.data.js)
//
// Les regles sont dans game/src/config/images.js (retrouve, repareImages, proposeIllustrations) :
// le jeu et le Card Builder appliquent les memes au chargement. Ici, en plus, un nom present
// dans plusieurs dossiers A EGALITE se departage par le CONTENU : l'image identique a l'ancienne
// (git, HEAD) l'emporte — le dessin ne change pas.
// ⚠ characters.data.js vit sur le Pi : verifier `git status` la-bas avant d'ecrire ici.
// Relancer ensuite node scripts/gen-sprites.mjs si la liste des images n'est pas a jour.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanSprites } from './gen-sprites.mjs';
import { repareImages, proposeIllustrations } from '../game/src/config/images.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'game/data/characters.data.js');
const ecrire = process.argv.includes('--ecrire');

const texte = fs.readFileSync(F, 'utf8');
const debut = texte.indexOf('export const CHARACTER_DATA = ');
const tete = texte.slice(0, debut);
const D = JSON.parse(texte.slice(debut + 'export const CHARACTER_DATA = '.length, texte.lastIndexOf(';')));
// le fichier doit se reecrire a l'identique : sinon on ne sait pas l'ecrire comme le builder
const ecrit = d => tete + 'export const CHARACTER_DATA = ' + JSON.stringify(d, null, 2) + ';\n';
if (ecrit(D) !== texte.replace(/\r\n/g, '\n')) { console.log('✗ characters.data.js ne se relit pas a l\'identique : rien ne sera ecrit.'); process.exit(1); }

const sprites = scanSprites();
const empreinte = buf => crypto.createHash('md5').update(buf).digest('hex');
const ancienne = chemin => { try { return empreinte(execFileSync('git', ['show', `HEAD:${chemin}`], { cwd: ROOT, maxBuffer: 64 << 20 })); } catch { return null; } };

// 1. recoller les chemins, par le nom (game/src/config/images.js)…
const reparations = repareImages(D, sprites);
// … puis on revoit chaque cas avec DEUX indices, parce qu'aucun ne gagne a tous les coups
// (mesure sur le rangement du 24 oct. 2026) :
//   - le CONTENU : l'image identique a l'ancienne (git, HEAD) — un fichier renomme ou deux noms
//     intervertis (« Chasse Nocturne » / « Impératrice Nocturne ») garde son dessin ;
//   - le DOSSIER DU DECK (celui des autres cartes du heros) — un nouveau dessin pose expres dans
//     le deck (le « Mauvais Œil » de Raven Deck 1) l'emporte sur l'ancien range ailleurs.
// Le deck compte double, le meme dessin simple ; a egalite, le choix par le nom reste.
const tous = Object.entries(sprites).flatMap(([r, f]) => f.map(x => `${r}/${x}`)).filter(p => p.startsWith('Graphical Assets/Cards/'));
const parContenu = new Map();
for (const p of tous) { const h = empreinte(fs.readFileSync(path.join(ROOT, p))); if (!parContenu.has(h)) parContenu.set(h, []); parContenu.get(h).push(p); }
const dossier = p => p.split('/').slice(0, -1).join('/');
const deckDe = deckDesCartes(D);
for (const r of reparations) {
  const avant = ancienne(r.avant);
  const memes = (avant && parContenu.get(avant)) || [];
  const deck = deckDe.get(r.ou);
  const cands = [...new Set([...(r.etat === 'introuvable' ? [] : [r.apres]), ...r.candidats, ...memes])];
  if (!cands.length) continue;
  const note = c => (deck && dossier(c) === deck ? 2 : 0) + (memes.includes(c) ? 1 : 0) + (c === r.apres && r.etat !== 'introuvable' ? 0.5 : 0);
  const mieux = cands.sort((a, b) => note(b) - note(a))[0];
  if (mieux !== r.apres || r.etat === 'introuvable' || r.etat === 'ambigu') {
    r.raison = memes.includes(mieux) ? (deck && dossier(mieux) === deck ? 'même dessin, dans le deck' : 'même dessin') : 'dans le deck';
    r.candidats = cands; r.apres = mieux; r.etat = 'revu';
    poseSprite(D, r.ou, mieux);
  }
}

// Le dossier « deck » de chaque carte : celui ou sont rangees le plus d'images des autres
// cartes de son heros (ou des decks d'adversaires qui la jouent, pour une carte libre).
function deckDesCartes(d) {
  const out = new Map();
  const majorite = cartes => { const n = new Map(); for (const c of cartes) if (c && c.sprite && c.sprite.startsWith('Graphical Assets/Cards/')) n.set(dossier(c.sprite), (n.get(dossier(c.sprite)) || 0) + 1); return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]; };
  const parId = new Map();
  for (const h of d.characters) for (const c of [...h.cards, ...(h.switches || [])]) if (c) parId.set(c.id, c);
  for (const c of d.library || []) parId.set(c.id, c);
  for (const h of d.characters) { const cartes = [...h.cards, ...(h.switches || [])]; for (const c of cartes) if (c) out.set(`carte:${c.id}`, majorite(cartes.filter(k => k !== c))); }
  for (const c of d.library || []) {
    const voisines = [];
    for (const n of d.npcs || []) if ((n.deck || []).some(l => l.card === c.id)) for (const l of n.deck) { const k = parId.get(l.card); if (k && k !== c) voisines.push(k); }
    out.set(`carte:${c.id}`, majorite(voisines));
  }
  return out;
}
// 2. attacher les illustrations manquantes, en plusieurs passes (une carte placee situe son deck)
const attachees = [];
for (let passe = 0; passe < 5; passe++) {
  const p = proposeIllustrations(D, sprites);
  if (!p.length) break;
  for (const x of p) { x.carte.sprite = x.chemin; attachees.push(x); }
}

function poseSprite(d, ou, chemin) {
  const id = ou.replace(/^carte:/, '');
  for (const h of d.characters) for (const c of [...h.cards, ...(h.switches || [])]) if (c && c.id === id) c.sprite = chemin;
  for (const c of d.library || []) if (c.id === id) c.sprite = chemin;
}

const court = c => c.replace('Graphical Assets/Cards/', '');
const par = {};
for (const r of reparations) par[r.etat] = (par[r.etat] || 0) + 1;
console.log(`Images recollées : ${reparations.length} (${Object.entries(par).map(([k, v]) => `${v} ${k}`).join(', ') || 'aucune'})`);
for (const r of reparations.filter(r => r.etat !== 'deplace')) {
  console.log(`  ${r.etat === 'introuvable' ? '✗' : '⚠'} ${r.ou} : ${court(r.avant)}` + (r.etat === 'introuvable' ? ' — aucune image de ce nom ni de ce dessin (à rattacher dans le builder)' : ` → ${court(r.apres)}${r.raison ? ` [${r.raison}]` : ''}  (parmi ${r.candidats.map(court).join(' | ')})`));
}
console.log(`Illustrations attachées par leur nom : ${attachees.length}`);
for (const x of attachees) console.log(`  ${x.ou.padEnd(24)} ${x.carte.name} → ${court(x.chemin)}`);

if (ecrire) {
  let sortie = ecrit(D);
  if (texte.includes('\r\n')) sortie = sortie.replace(/\n/g, '\r\n');
  fs.writeFileSync(F, sortie, 'utf8');
  console.log('écrit : game/data/characters.data.js');
} else console.log('(rien d\'écrit : --ecrire pour appliquer)');
