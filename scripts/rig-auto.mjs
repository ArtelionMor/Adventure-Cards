// ASSEMBLE UN PERSONNAGE a partir de la decoupe automatique (scripts/auto/decoupe.py) : un calque RIGIDE par partie
// (comme un pantin de papier), un os par partie (pose d'apres la forme de la partie), les trous comblés provisoirement,
// et les quatre animations de base (idle, walking, hitting, taking_damage) generees par role d'os puis calmees jusqu'a
// ce que le validateur ne dise plus rien.
//
//   node scripts/rig-auto.mjs <id> [--auto <dossier de decoupe>] [--sans-ecrire]
//
// Lit  : game/data/rigs/<id>/source.png, <auto>/etiquettes.png et <auto>/parties.json (defaut : art-sortie/auto/<id>)
// Ecrit: game/data/rigs/<id>/{rig.json, clips.json, calques/, masques/} et <auto>/rapport.json (ce qu'il faut verifier)
//
// Ce qui est devine, et donc a verifier dans l'Atelier : le role de chaque partie (d'apres son NOM : tete, oreille, bras,
// jambe, queue…), son parent (tout est rattache au corps, les oreilles a la tete), son pivot (le point de la partie le
// plus proche du centre de son parent) et l'ordre de dessin. Les trous derriere chaque partie sont comblés avec les
// couleurs voisines (provisoire : a repeindre).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lisPng, ecrisPng } from './lib/png.mjs';
import { ecrisJson } from './lib/rig-fichiers.mjs';
import { extraitCalque, combleZone, pourEnregistrer } from '../builder/rig/calques.js';
import { verifieClips } from '../game/src/rig/verifie.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args.find(a => !a.startsWith('--'));
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (!id) { console.log('usage : node scripts/rig-auto.mjs <id> [--auto <dossier>] [--sans-ecrire]'); process.exit(1); }
const dossier = path.join(ROOT, 'game/data/rigs', id);
const auto = opt('--auto') || path.join(ROOT, 'art-sortie/auto', id);
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

// ------------------------------------------------------------------ les parties
const vus = new Set();
let parties = (decoupe.parties || []).map((q, k) => {
  let nom = nomSur(q.nom); while (vus.has(nom)) nom += '_2'; vus.add(nom);
  return { nom, k: k + 1, role: roleDe(q.nom), pixels: q.pixels };
}).filter(q => q.pixels > 0);
if (!parties.length) { console.log('ECHEC : aucune partie'); process.exit(1); }

// geometrie : centre, boite, echantillon de pixels
let ymaxPerso = 0, yminPerso = H, xminPerso = W, xmaxPerso = 0;
for (const q of parties) {
  let n = 0, sx = 0, sy = 0, x0 = W, y0 = H, x1 = 0, y1 = 0; const xs = [], ys = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (label[y * W + x] !== q.k) continue;
    n++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (n % 3 === 0) { xs.push(x); ys.push(y); }
  }
  Object.assign(q, { n, cx: sx / n, cy: sy / n, x0, y0, x1, y1, xs, ys });
  ymaxPerso = Math.max(ymaxPerso, y1); yminPerso = Math.min(yminPerso, y0); xminPerso = Math.min(xminPerso, x0); xmaxPerso = Math.max(xmaxPerso, x1);
}
const total = parties.reduce((s, q) => s + q.n, 0);
for (const q of parties) if (q.n / total < 0.002) probleme('alerte', `partie « ${q.nom} » minuscule (${(100 * q.n / total).toFixed(2)} % du personnage)`);

// le corps : la partie qui s'appelle ainsi, sinon la plus grosse
let corps = parties.find(q => q.role === 'corps');
if (!corps) {
  corps = [...parties].sort((a, b) => b.n - a.n)[0];
  corps.role = 'corps';
  probleme('alerte', `aucune partie « corps » : « ${corps.nom} » (la plus grosse) en tient lieu`);
}
if (!parties.some(q => q.role === 'tete')) probleme('alerte', 'aucune partie « tête » : rien ne penchera la tête');
const tete = parties.find(q => q.role === 'tete');
for (const q of parties) q.parent = q === corps ? 'sol' : (q.role === 'oreille' || q.role === 'corne') && tete && q !== tete ? tete.nom : q.role === 'tete' ? corps.nom : corps.nom;
// de quel cote du corps (pour faire balancer les membres en sens contraire)
for (const q of parties) q.cote = Math.abs(q.cx - corps.cx) < 0.04 * W ? 0 : (q.cx < corps.cx ? -1 : 1);

// ------------------------------------------------------------------ les os
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
function os(q) {
  const par = parties.find(p => p.nom === q.parent);
  let px, py;
  if (!par) {
    // le corps : le bas, au milieu des pixels les plus bas
    const seuil = q.y1 - 0.06 * (q.y1 - q.y0);
    let sx = 0, n = 0; for (let i = 0; i < q.ys.length; i++) if (q.ys[i] >= seuil) { sx += q.xs[i]; n++; }
    px = n ? sx / n : q.cx; py = q.y1;
  } else {
    let mieux = Infinity; px = q.cx; py = q.cy;
    for (let i = 0; i < q.xs.length; i++) { const d = dist2(q.xs[i], q.ys[i], par.cx, par.cy); if (d < mieux) { mieux = d; px = q.xs[i]; py = q.ys[i]; } }
  }
  let pire = -1, fx = q.cx, fy = q.cy;
  for (let i = 0; i < q.xs.length; i++) { const d = dist2(q.xs[i], q.ys[i], px, py); if (d > pire) { pire = d; fx = q.xs[i]; fy = q.ys[i]; } }
  const longueur = Math.max(6, Math.round(Math.sqrt(pire)));
  const angle = +(Math.atan2(fy - py, fx - px) / RAD).toFixed(1);
  return { id: q.nom, parent: q.parent, x: Math.round(px), y: Math.round(py), angle, longueur };
}
const ordreOs = [corps, ...(tete ? [tete] : []), ...parties.filter(q => q !== corps && q !== tete)];
const squelette = [{ id: 'sol', parent: null, x: Math.round(xminPerso), y: Math.round(ymaxPerso), angle: 0, longueur: Math.max(20, Math.round(xmaxPerso - xminPerso)) }, ...ordreOs.map(os)];

// ------------------------------------------------------------------ le rig : un calque rigide par partie
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
// le fond (ce qu'aucune partie n'a pris, et les trous comblés) suit le CORPS : quand le corps bouge, il ne laisse pas de trou derriere lui
rig.calques.find(c => c.id === 'tout').os = corps.nom;
const zones = (rig.calques.find(c => c.id === 'tout').zones || []).map(z => z.id);
for (const z of zones) combleZone(rig, images, masques, 'tout', z, 32);
if (!rig.calques.some(c => c.id !== 'tout')) { console.log('ECHEC : aucun calque extrait'); process.exit(1); }

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
  // le corps : les DEPLACEMENTS (rebond, elan, recul) vont a la racine « sol » dont tout suit, jamais au corps seul — le
  // validateur y verrait un corps qui s'ecarte de son parent ; seules les ROTATIONS sont sur le corps
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
  else if (f < 0.5) probleme('alerte', `clip « ${nom} » réduit à ${Math.round(f * 100)} % de l'amplitude voulue (le validateur refusait davantage)`);
}

// ------------------------------------------------------------------ ecrire
rapport.parties = parties.map(q => ({ nom: q.nom, role: q.role, parent: q.parent, part: +(q.n / total).toFixed(4) }));
rapport.zones_a_combler = zones.length;
rapport.os = squelette.length;
const sortie = { format: 'adventure-rig-clips', version: 1, clips: clipsFinal };
if (!args.includes('--sans-ecrire')) {
  for (const f of fichiers) { const p = path.join(dossier, f.chemin); fs.mkdirSync(path.dirname(p), { recursive: true }); ecrisPng(p, f.image); }
  ecrisJson(path.join(dossier, 'rig.json'), rigJson);
  ecrisJson(path.join(dossier, 'clips.json'), sortie);
}
fs.mkdirSync(auto, { recursive: true });
fs.writeFileSync(path.join(auto, 'rapport.json'), JSON.stringify(rapport, null, 1));
const graves = rapport.problemes.filter(p => p.gravite === 'erreur').length;
console.log(`${graves ? 'A VERIFIER' : 'OK'} ${id} : ${parties.length} parties, ${squelette.length} os, ${zones.length} zone(s) comblée(s), ${rapport.problemes.length} point(s) à voir`);
