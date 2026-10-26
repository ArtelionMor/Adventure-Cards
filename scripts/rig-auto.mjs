// ASSEMBLE UN PERSONNAGE a partir de la decoupe automatique (scripts/auto/decoupe.py) : un calque par partie, un os par
// partie, une HIERARCHIE tiree des contacts entre parties, des POIDS qui se fondent d'un os a l'autre pres des articulations,
// les trous combles provisoirement et les quatre animations de base (idle, walking, hitting, taking_damage), calmees
// jusqu'a ce que le validateur ne dise plus rien.
//
//   node scripts/rig-auto.mjs <id> [--auto <dossier de decoupe>] [--sans-ecrire] [--flou 0.04] [--petit 0.008]
//
// Lit  : game/data/rigs/<id>/source.png, <auto>/etiquettes.png et <auto>/parties.json (defaut : art-sortie/auto/<id>)
// Ecrit: game/data/rigs/<id>/{rig.json, clips.json, calques/, masques/} et <auto>/rapport.json (ce qu'il faut verifier)
//
// Ce qui est devine, et donc a verifier dans l'Atelier :
//  - les PARTIES MINUSCULES (moins de 0,8 % du personnage) sont fusionnees dans la voisine qu'elles touchent le plus ;
//  - la HIERARCHIE : on part du corps, et chaque partie s'accroche a la partie deja placee qu'elle TOUCHE le plus (la flamme
//    touche le baton : elle est l'enfant du baton, pas du sol) ; une partie qui ne touche rien s'accroche au corps ;
//  - le PIVOT d'un os : le milieu du contact avec son parent (l'articulation), pas un point deviné ;
//  - les POIDS : un point d'un calque suit son os, et un peu les os des parties voisines, de moins en moins loin d'elles
//    (`--flou` : la portee de ce fondu, en fraction de l'image) — c'est ce qui evite le trou quand un os bouge et que sa
//    voisine, tout aussi proche, restait en place ;
//  - l'ordre de dessin, selon le role de la partie (lu dans son NOM : tete, oreille, bras, jambe, queue…).
// Les trous derriere chaque partie sont combles avec les couleurs voisines (provisoire : a repeindre).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lisPng, ecrisPng } from './lib/png.mjs';
import { ecrisJson } from './lib/rig-fichiers.mjs';
import { extraitCalque, combleZone, mailleCalque, pourEnregistrer } from '../builder/rig/calques.js';
import { verifieClips } from '../game/src/rig/verifie.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args.find(a => !a.startsWith('--'));
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (!id) { console.log('usage : node scripts/rig-auto.mjs <id> [--auto <dossier>] [--sans-ecrire] [--flou 0.04] [--petit 0.008]'); process.exit(1); }
const dossier = path.join(ROOT, 'game/data/rigs', id);
const auto = opt('--auto') || path.join(ROOT, 'art-sortie/auto', id);
const FLOU = +opt('--flou', 0.04), PETIT = +opt('--petit', 0.008);
const RAD = Math.PI / 180;

const sansAccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nomSur = s => sansAccent(s).replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'partie';

// Le role d'une partie, lu dans son nom
function roleDe(nom) {
  const n = sansAccent(nom);
  if (/tete|visage|casque|head/.test(n)) return 'tete';
  if (/oreille/.test(n)) return 'oreille';
  if (/corne/.test(n)) return 'corne';
  if (/corps|torse|robe|body|ventre/.test(n)) return 'corps';
  if (/aile|wing/.test(n)) return 'aile';
  if (/bras|main/.test(n)) return 'bras';
  if (/jambe|patte|pied|pate/.test(n)) return 'jambe';
  if (/queue|tail/.test(n)) return 'queue';
  if (/tentacule/.test(n)) return 'tentacule';
  return 'accessoire';
}
// Plus c'est grand, plus c'est devant
const RANG = { queue: 0, tentacule: 1, jambe: 2, corps: 3, bras: 4, aile: 4, accessoire: 5, tete: 6, corne: 7, oreille: 7 };

const rapport = { id, problemes: [], parties: [], clips: {} };
const probleme = (gravite, texte) => { rapport.problemes.push({ gravite, texte }); };

// ------------------------------------------------------------------ les entrees
const source = lisPng(path.join(dossier, 'source.png'));
const W = source.largeur, H = source.hauteur;
const etiq = lisPng(path.join(auto, 'etiquettes.png'));
const decoupe = JSON.parse(fs.readFileSync(path.join(auto, 'parties.json'), 'utf8'));
const ancien = (() => { try { return JSON.parse(fs.readFileSync(path.join(dossier, 'rig.json'), 'utf8')); } catch { return {}; } })();
if (etiq.largeur !== W || etiq.hauteur !== H) { console.log('ECHEC : etiquettes.png ne fait pas la taille de la source'); process.exit(1); }
for (const a of decoupe.alertes || []) probleme('alerte', 'découpe : ' + a);

const label = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) label[p] = etiq.data[p * 4];

const vus = new Set();
let parties = (decoupe.parties || []).map((q, k) => {
  let nom = nomSur(q.nom); while (vus.has(nom)) nom += '_2'; vus.add(nom);
  return { nom, k: k + 1, role: roleDe(q.nom) };
});

// ------------------------------------------------------------------ les contacts entre parties
// contact(a, b) = { n, sx, sy } : combien de paires de pixels voisins, et leur somme (leur milieu = l'articulation)
function contacts() {
  const m = new Map();
  const note = (a, b, x, y) => {
    if (!a || !b || a === b) return;
    const cle = a < b ? a * 256 + b : b * 256 + a;
    let c = m.get(cle); if (!c) m.set(cle, c = { n: 0, sx: 0, sy: 0 });
    c.n++; c.sx += x; c.sy += y;
  };
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    const a = label[y * W + x];
    if (!a) continue;
    note(a, label[y * W + x + 1], x + 0.5, y); note(a, label[(y + 1) * W + x], x, y + 0.5);
  }
  return m;
}
const contactEntre = (m, a, b) => m.get(a < b ? a * 256 + b : b * 256 + a) || null;
const compte = () => { const n = new Map(); for (let p = 0; p < W * H; p++) if (label[p]) n.set(label[p], (n.get(label[p]) || 0) + 1); return n; };

// 1. les parties minuscules sont fusionnees dans la voisine qu'elles touchent le plus
{
  let ct0 = contacts(); const n = compte();
  for (;;) {
    const tot = [...n.values()].reduce((s, v) => s + v, 0);
    const petites = parties.filter(q => (n.get(q.k) || 0) > 0 && (n.get(q.k) || 0) / tot < PETIT);
    if (!petites.length || parties.filter(q => n.get(q.k)).length <= 3) break;
    petites.sort((a, b) => n.get(a.k) - n.get(b.k));
    const q = petites[0];
    let cible = null, mieux = 0;
    for (const r of parties) { if (r === q || !n.get(r.k)) continue; const c = contactEntre(ct0, q.k, r.k); if (c && c.n > mieux) { mieux = c.n; cible = r; } }
    if (!cible) { n.set(q.k, 0); continue; }
    for (let p = 0; p < W * H; p++) if (label[p] === q.k) label[p] = cible.k;
    probleme('info', `partie « ${q.nom} » minuscule (${(100 * n.get(q.k) / tot).toFixed(2)} %) fusionnée dans « ${cible.nom} »`);
    n.set(cible.k, n.get(cible.k) + n.get(q.k)); n.set(q.k, 0);
    ct0 = contacts();
  }
  parties = parties.filter(q => (n.get(q.k) || 0) > 0);
}
if (!parties.length) { console.log('ECHEC : aucune partie'); process.exit(1); }
const ct = contacts();

// 2. la geometrie : centre, boite, echantillon de pixels
let ymaxPerso = 0, xminPerso = W, xmaxPerso = 0;
for (const q of parties) {
  let n = 0, sx = 0, sy = 0, x0 = W, y0 = H, x1 = 0, y1 = 0; const xs = [], ys = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (label[y * W + x] !== q.k) continue;
    n++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (n % 3 === 0) { xs.push(x); ys.push(y); }
  }
  Object.assign(q, { n, cx: sx / n, cy: sy / n, x0, y0, x1, y1, xs, ys });
  ymaxPerso = Math.max(ymaxPerso, y1); xminPerso = Math.min(xminPerso, x0); xmaxPerso = Math.max(xmaxPerso, x1);
}
const total = parties.reduce((s, q) => s + q.n, 0);

// 3. le corps : la partie qui s'appelle ainsi, sinon la plus grosse
let corps = [...parties].filter(q => q.role === 'corps').sort((a, b) => b.n - a.n)[0];
if (!corps) {
  corps = [...parties].sort((a, b) => b.n - a.n)[0];
  corps.role = 'corps';
  probleme('alerte', `aucune partie « corps » : « ${corps.nom} » (la plus grosse) en tient lieu`);
}
if (!parties.some(q => q.role === 'tete')) probleme('alerte', 'aucune partie « tête » : rien ne penchera la tête');

// 4. la hierarchie : chaque partie s'accroche a la partie DEJA PLACEE qu'elle touche le plus
corps.parent = 'sol'; corps.profondeur = 0;
const placees = [corps];
let restantes = parties.filter(q => q !== corps);
while (restantes.length) {
  let meilleure = null;
  for (const q of restantes) for (const r of placees) {
    const c = contactEntre(ct, q.k, r.k);
    if (c && (!meilleure || c.n > meilleure.c.n)) meilleure = { q, r, c };
  }
  if (!meilleure) {
    for (const q of restantes) { q.parent = corps.nom; q.profondeur = 1; placees.push(q); probleme('alerte', `partie « ${q.nom} » ne touche aucune autre : accrochée au corps`); }
    break;
  }
  meilleure.q.parent = meilleure.r.nom; meilleure.q.profondeur = meilleure.r.profondeur + 1;
  meilleure.q.contact = { x: meilleure.c.sx / meilleure.c.n, y: meilleure.c.sy / meilleure.c.n };
  placees.push(meilleure.q); restantes = restantes.filter(q => q !== meilleure.q);
}
for (const q of parties) q.cote = Math.abs(q.cx - corps.cx) < 0.04 * W ? 0 : (q.cx < corps.cx ? -1 : 1);

// ------------------------------------------------------------------ les os
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
function os(q) {
  let px, py;
  if (q === corps) {
    // le corps : le bas, au milieu des pixels les plus bas
    const seuil = q.y1 - 0.06 * (q.y1 - q.y0);
    let sx = 0, n = 0; for (let i = 0; i < q.ys.length; i++) if (q.ys[i] >= seuil) { sx += q.xs[i]; n++; }
    px = n ? sx / n : q.cx; py = q.y1;
  } else {
    // l'articulation : le milieu du contact avec le parent (a defaut, le centre du parent), ramene sur un pixel de la partie
    const par = parties.find(p => p.nom === q.parent) || corps;
    const cible = q.contact || { x: par.cx, y: par.cy };
    let mieux = Infinity; px = q.cx; py = q.cy;
    for (let i = 0; i < q.xs.length; i++) { const d = dist2(q.xs[i], q.ys[i], cible.x, cible.y); if (d < mieux) { mieux = d; px = q.xs[i]; py = q.ys[i]; } }
  }
  let pire = -1, fx = q.cx, fy = q.cy;
  for (let i = 0; i < q.xs.length; i++) { const d = dist2(q.xs[i], q.ys[i], px, py); if (d > pire) { pire = d; fx = q.xs[i]; fy = q.ys[i]; } }
  return { id: q.nom, parent: q.parent, x: Math.round(px), y: Math.round(py), angle: +(Math.atan2(fy - py, fx - px) / RAD).toFixed(1), longueur: Math.max(6, Math.round(Math.sqrt(pire))) };
}
// les parents avant leurs enfants
const ordreOs = [...parties].sort((a, b) => a.profondeur - b.profondeur);
const squelette = [{ id: 'sol', parent: null, x: Math.round(xminPerso), y: Math.round(ymaxPerso), angle: 0, longueur: Math.max(20, Math.round(xmaxPerso - xminPerso)) }, ...ordreOs.map(os)];

// ------------------------------------------------------------------ le rig : un calque par partie
const rig = {
  format: 'adventure-rig', version: 1, id, nom: ancien.nom || id,
  source: { image: 'source.png', largeur: W, hauteur: H, origine: ancien.source?.origine },
  os: squelette,
  calques: [{ id: 'tout', image: 'source.png', ordre: 0, x: 0, y: 0, largeur: W, hauteur: H }],
  ik: [],
};
if (!rig.source.origine) delete rig.source.origine;
const images = { tout: source }, masques = {};
// du plus devant au plus derriere : chaque extraction se pose juste au-dessus du fond, donc sous les precedentes
for (const q of [...parties].sort((a, b) => (RANG[b.role] ?? 5) - (RANG[a.role] ?? 5) || b.n - a.n)) {
  const m = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) if (label[p] === q.k) m[p] = 1;
  try { extraitCalque(rig, images, masques, { depuis: 'tout', nom: q.nom, masque: m, os: q.nom }); }
  catch (e) { probleme('erreur', `partie « ${q.nom} » : ${e.message}`); }
}
// le fond (ce qu'aucune partie n'a pris, et les trous combles) suit le CORPS : il ne laisse pas de trou derriere lui
rig.calques.find(c => c.id === 'tout').os = corps.nom;
const zones = (rig.calques.find(c => c.id === 'tout').zones || []).map(z => z.id);
for (const z of zones) combleZone(rig, images, masques, 'tout', z, 32);
if (!rig.calques.some(c => c.id !== 'tout')) { console.log('ECHEC : aucun calque extrait'); process.exit(1); }

// ------------------------------------------------------------------ les poids : des calques maillés, fondus entre os voisins
// distance (chanfrein) de chaque pixel a la partie k
function distanceA(k) {
  const d = new Float32Array(W * H), INF = 1e9, D2 = Math.SQRT2;
  for (let p = 0; p < W * H; p++) d[p] = label[p] === k ? 0 : INF;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; let v = d[p];
    if (x > 0) v = Math.min(v, d[p - 1] + 1);
    if (y > 0) { v = Math.min(v, d[p - W] + 1); if (x > 0) v = Math.min(v, d[p - W - 1] + D2); if (x < W - 1) v = Math.min(v, d[p - W + 1] + D2); }
    d[p] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const p = y * W + x; let v = d[p];
    if (x < W - 1) v = Math.min(v, d[p + 1] + 1);
    if (y < H - 1) { v = Math.min(v, d[p + W] + 1); if (x < W - 1) v = Math.min(v, d[p + W + 1] + D2); if (x > 0) v = Math.min(v, d[p + W - 1] + D2); }
    d[p] = v;
  }
  return d;
}
const sigma = FLOU * Math.max(W, H);
const champs = new Map(parties.map(q => [q.nom, distanceA(q.k)]));
const pasMaille = Math.max(8, Math.round(Math.max(W, H) / 50));
for (const q of parties) {
  const c = rig.calques.find(k => k.id === q.nom);
  if (!c) continue;
  delete c.os; c.mesh = { pas: pasMaille };
  mailleCalque(rig, images, q.nom);
  const S = c.mesh.sommets, n = S.length / 2, poids = new Array(n);
  for (let v = 0; v < n; v++) {
    const x = Math.max(0, Math.min(W - 1, Math.round(S[v * 2]))), y = Math.max(0, Math.min(H - 1, Math.round(S[v * 2 + 1]))), p = y * W + x;
    const cand = [];
    for (const r of parties) { const s = Math.exp(-champs.get(r.nom)[p] / sigma); if (s > 0.04) cand.push([r.nom, s]); }
    cand.sort((a, b) => b[1] - a[1]);
    const gardes = cand.slice(0, 4);
    if (!gardes.length) gardes.push([q.nom, 1]);
    const somme = gardes.reduce((t, g) => t + g[1], 0);
    poids[v] = gardes.flatMap(([nom, s]) => [nom, +(s / somme).toFixed(3)]);
  }
  c.mesh.poids = poids;
  c.mesh.poidsManuels = true;          // l'Atelier ne les recalcule pas a chaque os deplace
}

// ------------------------------------------------------------------ les animations
const s = H / 1024;                                  // les pixels d'un clip suivent la taille de l'image
const K = (...a) => a.map(([t, v, courbe]) => (courbe ? { t, v, courbe } : { t, v }));
const par = role => parties.filter(q => q.role === role);
const sg = q => (q.cote || -1);                       // le sens de balancement : le cote du corps, sinon vers la gauche

function clipsBruts() {
  const idle = { description: 'Repos : le corps respire, la tête dodeline, les membres et la queue ondulent en décalé.', duree: 6, boucle: true, pistes: {}, procedural: [] };
  const marche = { description: 'Marche : le corps rebondit à chaque pas, les membres balancent en opposition.', duree: 1.2, boucle: true, pistes: {}, procedural: [] };
  const coup = { description: 'Coup : il se recule, fonce vers l\'avant (le bas de l\'écran) et revient, les membres fouettent.', duree: 1.1, boucle: false, pistes: {}, procedural: [] };
  const degats = { description: 'Dégâts : repoussé en arrière, la tête part en arrière, les membres retombent mollement.', duree: 0.8, boucle: false, pistes: {}, procedural: [] };
  const sin = (c, os_, amp, periode, phase) => c.procedural.push({ type: 'sinus', os: os_, canal: 'rot', amplitude: +amp.toFixed(2), periode, phase: +phase.toFixed(3) });
  const nom = q => q.nom;
  // les DEPLACEMENTS (rebond, elan, recul) vont a la racine « sol » dont tout suit, jamais au corps seul — le validateur y
  // verrait un corps qui s'ecarte de son parent ; seules les ROTATIONS sont sur les os
  idle.pistes.sol = { y: K([0, 0], [2.6, 3 * s], [4.2, 0]) };
  idle.pistes[nom(corps)] = { rot: K([0, -0.3], [3, 0.4]) };
  marche.pistes.sol = { y: K([0, 0], [0.3, -9 * s], [0.6, 0], [0.9, -9 * s]) };
  marche.pistes[nom(corps)] = { rot: K([0, -1], [0.6, 1]) };
  coup.pistes.sol = { y: K([0, 0], [0.25, -10 * s], [0.42, 26 * s], [0.6, 26 * s], [1.1, 0]) };
  coup.pistes[nom(corps)] = { rot: K([0, 0], [0.25, -1.5], [0.42, 1.5], [0.6, 1.5], [1.1, 0]) };
  degats.pistes.sol = { y: K([0, 0], [0.1, -18 * s], [0.3, -6 * s], [0.8, 0]), x: K([0, 0], [0.1, 12 * s], [0.35, 3 * s], [0.8, 0]) };
  degats.pistes[nom(corps)] = { rot: K([0, 0], [0.1, -2], [0.4, 0.6], [0.8, 0]) };
  for (const q of par('tete')) {
    sin(idle, nom(q), 1.2, 3, 0.1);
    marche.pistes[nom(q)] = { rot: K([0, 1], [0.6, -1]) };
    coup.pistes[nom(q)] = { rot: K([0, 0], [0.25, -2], [0.42, 3], [0.6, 3], [1.1, 0]) };
    degats.pistes[nom(q)] = { rot: K([0, 0], [0.1, -5], [0.4, 1.5], [0.8, 0]) };
  }
  let i = 0;
  for (const q of [...par('oreille'), ...par('corne')]) {
    sin(idle, nom(q), 2.5, 3, 0.3 + 0.1 * i++);
    sin(marche, nom(q), 4, 1.2, 0.2);
    degats.pistes[nom(q)] = { rot: K([0, 0], [0.12, 8 * sg(q)], [0.45, -3 * sg(q)], [0.8, 0]) };
  }
  i = 0;
  for (const q of [...par('bras'), ...par('aile')]) {
    const d = sg(q);
    sin(idle, nom(q), 2, 3, 0.5 * (d > 0 ? 1 : 0) + 0.05 * i);
    marche.pistes[nom(q)] = { rot: K([0, 10 * d], [0.6, -10 * d]) };
    coup.pistes[nom(q)] = { rot: K([0, 0], [0.25, -25 * d], [0.45, 40 * d], [0.65, 25 * d], [1.1, 0]) };
    degats.pistes[nom(q)] = { rot: K([0, 0], [0.12, 12 * d], [0.45, -4 * d], [0.8, 0]) };
    i++;
  }
  i = 0;
  for (const q of [...par('queue'), ...par('tentacule')]) {
    sin(idle, nom(q), 4, i % 2 ? 6 : 3, 0.1 * i);
    sin(marche, nom(q), 6, 1.2, 0.15 * i);
    coup.pistes[nom(q)] = { rot: K([0, 0], [0.25, -12 * sg(q)], [0.45, 20 * sg(q)], [1.1, 0]) };
    degats.pistes[nom(q)] = { rot: K([0, 0], [0.12, 10 * sg(q)], [0.45, -4 * sg(q)], [0.8, 0]) };
    i++;
  }
  i = 0;
  for (const q of par('jambe')) { marche.pistes[nom(q)] = { rot: K([0, 5 * (i % 2 ? -1 : 1)], [0.6, -5 * (i % 2 ? -1 : 1)]) }; i++; }
  for (const q of par('accessoire')) { sin(idle, nom(q), 1.2, 6, 0.2); sin(marche, nom(q), 3, 1.2, 0.3); }
  return { idle, walking: marche, hitting: coup, taking_damage: degats };
}
const calme = (c, f) => {
  const d = JSON.parse(JSON.stringify(c));
  for (const cv of Object.values(d.pistes)) for (const keys of Object.values(cv)) for (const k of keys) k.v = +(k.v * f).toFixed(3);
  for (const m of d.procedural) m.amplitude = +(m.amplitude * f).toFixed(3);
  return d;
};

const { json: rigJson, fichiers } = pourEnregistrer(rig, images, masques, null);
const brut = clipsBruts();
const clipsFinal = {};
for (const [nom, c] of Object.entries(brut)) {
  if (!Object.keys(c.pistes).length && !c.procedural.length) { probleme('alerte', `clip « ${nom} » vide`); continue; }
  const erreurs = f => verifieClips(rigJson, { format: 'adventure-rig-clips', version: 1, clips: { [nom]: calme(c, f) } }, { clips: [nom] }).constats.filter(x => x.niveau === 'erreur');
  let f = 1, e = erreurs(1);
  const pleines = e.map(x => x.message).slice(0, 3);   // pourquoi l'amplitude voulue a ete refusee
  if (e.length) {
    let lo = 0, hi = 1;
    for (let it = 0; it < 7; it++) { const m = (lo + hi) / 2; if (erreurs(m).length) hi = m; else lo = m; }
    f = +lo.toFixed(2);
    e = f > 0 ? erreurs(f) : e;
  }
  clipsFinal[nom] = calme(c, f);
  rapport.clips[nom] = { echelle: f, erreurs: e.map(x => x.message).slice(0, 3), refuse_a_pleine_amplitude: f < 1 ? pleines : [] };
  if (e.length) probleme('erreur', `clip « ${nom} » : ${e[0].message}`);
  else if (f < 0.5) probleme('alerte', `clip « ${nom} » réduit à ${Math.round(f * 100)} % de l'amplitude voulue (le validateur refusait davantage : ${pleines[0] || '?'})`);
}

// ------------------------------------------------------------------ ecrire
rapport.parties = parties.map(q => ({ nom: q.nom, role: q.role, parent: q.parent, part: +(q.n / total).toFixed(4) }));
rapport.zones_a_combler = zones.length;
rapport.os = squelette.length;
rapport.flou = FLOU;
const sortie = { format: 'adventure-rig-clips', version: 1, clips: clipsFinal };
if (!args.includes('--sans-ecrire')) {
  for (const f of fichiers) { const p = path.join(dossier, f.chemin); fs.mkdirSync(path.dirname(p), { recursive: true }); ecrisPng(p, f.image); }
  ecrisJson(path.join(dossier, 'rig.json'), rigJson);
  ecrisJson(path.join(dossier, 'clips.json'), sortie);
}
fs.mkdirSync(auto, { recursive: true });
fs.writeFileSync(path.join(auto, 'rapport.json'), JSON.stringify(rapport, null, 1));
const graves = rapport.problemes.filter(p => p.gravite === 'erreur').length;
const aVoir = rapport.problemes.filter(p => p.gravite !== 'info').length;
console.log(`${graves ? 'A VERIFIER' : 'OK'} ${id} : ${parties.length} parties, ${squelette.length} os, ${zones.length} zone(s) comblée(s), ${aVoir} point(s) à voir`);
