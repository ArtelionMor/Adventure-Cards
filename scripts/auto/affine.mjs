// AFFINE un rig du lot selon les règles du game designer (28 oct. 2026, mémoire « feedback-rig-methode ») :
//   1. les os se posent à l'ARTICULATION (le cou, l'épaule, la hanche, la base de l'oreille, la main), pas « pour couvrir » ;
//   2. une partie qui dépasse sur son parent le CONTINUE : on peint le parent sous elle — les couleurs voisines sur quelques pixels
//      (la tête continue sous l'oreille), et EN CAS DE DOUTE EN NOIR (comme dans lapin-cuirasse : le corps porte de grandes taches
//      noires derrière le bras, la tête et les jambes) ;
//   3. tous les calques sont MAILLÉS ;
//   4. les poids sont LOGIQUES : un calque n'est tiré que par son os et celui de son parent (`osPoids`) ; le décor, par `fond` seul.
//   node scripts/auto/affine.mjs <id> [--pas 28] [--sans-peindre]
// Travaille sur game/data/rigs/<id>/ (garder une copie avant : art-sortie/revue/avant/<id>/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lisPng, ecrisPng } from '../lib/png.mjs';
import { ecrisJson } from '../lib/rig-fichiers.mjs';
import { verifieClips } from '../../game/src/rig/verifie.js';
import { depuisFichiers, pourEnregistrer, comblePrevisoire, mailleCalque, recalculePoids } from '../../builder/rig/calques.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const id = args.find(a => !a.startsWith('--'));
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (!id) { console.log('usage : node scripts/auto/affine.mjs <id> [--pas 28] [--sans-peindre]'); process.exit(1); }
const dossier = path.join(ROOT, 'game/data/rigs', id), fRig = path.join(dossier, 'rig.json');
const lis = rel => { const f = path.join(dossier, rel); return fs.existsSync(f) ? lisPng(f) : null; };
const { rig, images, masques } = depuisFichiers(JSON.parse(fs.readFileSync(fRig, 'utf8')), lis);
const W = rig.source.largeur, H = rig.source.hauteur, RAD = Math.PI / 180;
const sansAccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const roleDe = n => {
  n = sansAccent(n);
  if (/decor|arriere|ombre|herbe|rocher|sol$/.test(n)) return 'decor';
  if (/tete|visage|casque|head/.test(n)) return 'tete';
  if (/oreille/.test(n)) return 'oreille';
  if (/corne/.test(n)) return 'corne';
  if (/corps|torse|robe|body|ventre/.test(n)) return 'corps';
  if (/aile|wing/.test(n)) return 'aile';
  if (/bras|main/.test(n)) return 'bras';
  if (/jambe|patte|pied|pate/.test(n)) return 'jambe';
  if (/queue|tail/.test(n)) return 'queue';
  if (/cape|echarpe/.test(n)) return 'cape';
  if (/arme|epee|baton|bouclier/.test(n)) return 'arme';
  return 'accessoire';
};

// 0. AUCUN CALQUE « PNG » NE SE SUPERPOSE (règle du game designer) : un pixel identique à celui de la source n'appartient qu'à UN calque —
// celui du dessus ; les calques dessinés (noir, comblement) peuvent déborder. Sans ça, le même bout de dessin bouge deux fois (le « dédoublement »).
const source = lisPng(path.join(dossier, 'source.png'));
const estPng = (im, i) => im.data[i * 4 + 3] > 128 && Math.abs(im.data[i * 4] - source.data[i * 4]) < 4 && Math.abs(im.data[i * 4 + 1] - source.data[i * 4 + 1]) < 4 && Math.abs(im.data[i * 4 + 2] - source.data[i * 4 + 2]) < 4;
let doubles = 0;
{
  const dessus = rig.calques.filter(c => c.id !== 'tout' && c.os).sort((a, b) => (b.ordre || 0) - (a.ordre || 0)).map(c => images[c.id]);
  for (let i = 0; i < W * H; i++) {
    let pris = false;
    for (const im of dessus) if (estPng(im, i)) { if (pris) { im.data[i * 4 + 3] = 0; doubles++; } else pris = true; }
  }
}
// les calques de parties (tout sauf le fond « tout »), leur masque, leur rôle
const parts = rig.calques.filter(c => c.id !== 'tout' && c.os).map(c => ({ id: c.id, os: c.os, role: roleDe(c.id), im: images[c.id] }));
for (const p of parts) {
  p.m = new Uint8Array(W * H); p.xs = []; p.ys = [];
  for (let i = 0; i < W * H; i++) if (p.im.data[i * 4 + 3] > 128) { p.m[i] = 1; p.xs.push(i % W); p.ys.push((i / W) | 0); }
  p.n = p.xs.length;
}
const vivants = parts.filter(p => p.n > 40);
const par = r => vivants.find(p => p.role === r);
const corps = par('corps') || [...vivants].sort((a, b) => b.n - a.n)[0];
const tete = par('tete'), bras = par('bras'), jambes = par('jambe');
// le parent voulu : l'oreille et la corne sur la tête, l'arme sur le bras, le reste sur le corps
const parentDe = p => p === corps ? null : (p.role === 'oreille' || p.role === 'corne') ? (tete || corps) : p.role === 'arme' ? (bras || corps) : corps;
const centre = p => [p.xs.reduce((s, x) => s + x, 0) / p.n, p.ys.reduce((s, x) => s + x, 0) / p.n];
const proche = (p, [x, y]) => { let b = 1e18, r = [p.xs[0], p.ys[0]]; for (let i = 0; i < p.n; i++) { const d = (p.xs[i] - x) ** 2 + (p.ys[i] - y) ** 2; if (d < b) { b = d; r = [p.xs[i], p.ys[i]]; } } return r; };
const voisinage = (q, R, pasEch = 2) => { // les pixels à moins de R px d'un pixel de q
  const near = new Uint8Array(W * H);
  for (let i = 0; i < q.n; i += pasEch) { const x = q.xs[i], y = q.ys[i]; for (let dy = -R; dy <= R; dy += 2) for (let dx = -R; dx <= R; dx += 2) { const X = x + dx, Y = y + dy; if (X >= 0 && X < W && Y >= 0 && Y < H) near[Y * W + X] = 1; } }
  return near;
};
const contact = (p, q, R = 16) => { // centre des pixels de p à moins de R px de q
  const near = voisinage(q, R, 2); let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < p.n; i++) if (near[p.ys[i] * W + p.xs[i]]) { sx += p.xs[i]; sy += p.ys[i]; n++; }
  return n > 20 ? [sx / n, sy / n] : null;
};

// 1. LES OS : chaque pivot à son articulation
const pivot = {}, cC = centre(corps);
// le corps : entre les jambes et la tête — au contact des jambes s'il en a, sinon un peu sous le centre du tronc
pivot[corps.os] = (jambes && contact(corps, jambes, 20)) || [cC[0], cC[1] + 0.15 * (corps.ys.reduce((a, b) => Math.max(a, b), 0) - cC[1])];
const cou = tete ? (contact(tete, corps, 18) || proche(tete, cC)) : null;
for (const p of vivants) {
  if (p === corps) continue;
  const pr = parentDe(p);
  if (p.role === 'tete') pivot[p.os] = cou;
  else if (p.role === 'bras' || p.role === 'cape') pivot[p.os] = proche(p, cou || cC);   // l'épaule : le bout le plus proche du cou
  else if (p.role === 'jambe') pivot[p.os] = proche(p, pivot[corps.os]);                  // la hanche
  else pivot[p.os] = contact(p, pr) || proche(p, centre(pr));                              // la main (arme), la base (oreille, queue…)
}
const osDe = i => rig.os.find(o => o.id === i);
for (const p of vivants) {
  const o = osDe(p.os), pv = pivot[p.os];
  if (!o || !pv) continue;
  let far = 0, fx = pv[0], fy = pv[1];
  for (let i = 0; i < p.n; i++) { const d = (p.xs[i] - pv[0]) ** 2 + (p.ys[i] - pv[1]) ** 2; if (d > far) { far = d; fx = p.xs[i]; fy = p.ys[i]; } }
  o.x = Math.round(pv[0]); o.y = Math.round(pv[1]);
  o.angle = +(Math.atan2(fy - pv[1], fx - pv[0]) / RAD).toFixed(1);
  o.longueur = Math.max(10, Math.round(Math.sqrt(far)));
  const pr = parentDe(p);
  o.parent = pr ? pr.os : 'sol';
}
const oc = osDe(corps.os);
if (oc) oc.parent = 'sol';

// 2. LES PARTIES CACHEES : le parent continue sous son enfant ; au-delà de quelques pixels de matière connue, du NOIR
let peints = 0;
if (!args.includes('--sans-peindre')) {
  for (const p of vivants) {
    const pr = parentDe(p);
    if (!pr) continue;
    // une partie DERRIERE son parent (la queue) n'a rien à cacher : le noir se verrait par-dessus elle
    const ordre = i => rig.calques.find(k => k.id === i)?.ordre || 0;
    if (ordre(p.id) <= ordre(pr.id)) continue;
    const proches = voisinage(pr, 70);
    const trou = new Float32Array(W * H), empreinte = new Uint8Array(W * H);
    // l'empreinte de l'enfant (un peu épaissie), là où le parent ne couvre pas déjà et assez près de lui
    for (let i = 0; i < p.n; i++) for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      const X = p.xs[i] + dx, Y = p.ys[i] + dy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const k = Y * W + X;
      if (proches[k] && !pr.m[k]) empreinte[k] = 1;
    }
    let n = 0; for (let k = 0; k < W * H; k++) if (empreinte[k]) { trou[k] = 1; n++; }
    if (n < 30) continue;
    const im = comblePrevisoire(pr.im, trou, 24);                       // les couleurs voisines, sur 24 px
    for (let k = 0; k < W * H; k++) if (empreinte[k] && im.data[k * 4 + 3] < 128) { im.data[k * 4] = im.data[k * 4 + 1] = im.data[k * 4 + 2] = 0; im.data[k * 4 + 3] = 255; peints++; }   // en cas de doute : noir
    images[pr.id] = im; pr.im = im;
  }
}

// 3 + 4. TOUT MAILLE, DES POIDS LOGIQUES
const pas = +opt('--pas', 28);
for (const p of vivants) {
  const c = rig.calques.find(k => k.id === p.id);
  delete c.os; c.mesh = { pas };
  mailleCalque(rig, images, p.id);
  const pr = parentDe(p);
  c.osPoids = p.role === 'decor' ? ['fond'] : [p.os, ...(pr ? [pr.os] : [])];
}
recalculePoids(rig);
const { json, fichiers } = pourEnregistrer(rig, images, masques, null);
for (const f of fichiers) { const q = path.join(dossier, f.chemin); fs.mkdirSync(path.dirname(q), { recursive: true }); ecrisPng(q, f.image); }
ecrisJson(fRig, json);
console.log(`${id} : ${doubles} pixel(s) en double retirés, ${vivants.length} calque(s) maillés, pivots replacés, ${peints} pixel(s) peints en noir (${vivants.map(p => p.id).join(', ')})`);

// 5. LES CLIPS : les pivots ont bougé, certains os étirent trop le contour — on calme CES os-là (×0,85 par tour), pas tout le clip
const fClips = path.join(dossier, 'clips.json');
if (fs.existsSync(fClips)) {
  const clips = JSON.parse(fs.readFileSync(fClips, 'utf8'));
  const erreurs = () => verifieClips(json, clips, {}).constats.filter(x => x.niveau === 'erreur');
  const calmes = {};
  for (let tour = 0; tour < 14; tour++) {
    const e = erreurs();
    if (!e.length) break;
    const fautifs = new Set(e.map(x => x.os).filter(Boolean));
    if (!fautifs.size) break;
    for (const o of fautifs) {
      calmes[o] = (calmes[o] || 1) * 0.85;
      for (const c of Object.values(clips.clips)) {
        for (const k of c.pistes?.[o]?.rot || []) k.v = +(k.v * 0.85).toFixed(3);
        for (const m of c.procedural || []) if (m.os === o) m.amplitude = +(m.amplitude * 0.85).toFixed(3);
      }
    }
  }
  ecrisJson(fClips, clips);
  const reste = erreurs();
  console.log('clips calmés : ' + (Object.entries(calmes).map(([o, v]) => o + ' ×' + v.toFixed(2)).join(', ') || 'aucun') + (reste.length ? ' — ' + reste.length + ' erreur(s) restantes' : ''));
}
