// AFFINE un rig du lot selon les règles du game designer (28 oct. 2026, mémoire « feedback-rig-methode ») :
//   1. les os se posent à l'ARTICULATION (le cou, l'épaule, la hanche, la base de l'oreille, la main), pas « pour couvrir » ;
//   2. une partie cachée derrière un enfant : EN CAS DE DOUTE DU NOIR, mais dans un calque SÉPARÉ `<parent>-copie` (comme le `corps-copie`
//      du cameleon fini à la main : de: le parent, ordre 1 juste au-dessus de `tout`, mêmes poids que le parent, maillé), qui ne contient
//      QUE ce noir, borné à ~10 px autour du dessin des enfants et TOUJOURS LOIN DU BORD (érodé de --loin px : jamais un liseré le long de la
//      silhouette ou d'un calque voisin, il se verrait en rotation). Le calque du parent garde ses trous (ses vrais pixels seulement). Les
//      JONCTIONS OUVERTES (de la silhouette sans aucun calque entre deux calques : cou/poitrine sous la tête) sont remplies du même noir, loin
//      des bords. Pas de noir sous une ARME (elle tourne sur un os différent de son porteur), ni sous une partie DERRIÈRE son parent (une queue) ;
//   3. tous les calques sont MAILLÉS ;
//   4. les poids sont LOGIQUES : un calque n'est tiré que par son os et celui de son parent (`osPoids`) ; le décor, par `fond` seul.
//   node scripts/auto/affine.mjs <id> [--pas 28] [--sans-peindre] [--devant <calque>] [--comble 0] [--sous-enfant] [--rayon 10] [--loin 12]
//   --sous-enfant : sous un enfant, le calque -copie reprend les couleurs de l'enfant lui-même (le cou continue la poitrine) au lieu du noir ;
//   --rayon : la bordure (px) du noir autour du dessin de l'enfant (10) ; --loin : la distance minimale (px) du noir aux bords (12) ;
//   --devant : remonte ce calque juste au-dessus de son parent (une queue dessinée devant la croupe : sinon le parent lui mange ses pixels
//   et elle laisse un trou blanc en bougeant) ; --comble : rayon (px) d'un comblement par les couleurs voisines dans le -copie, à la place du noir (0 par défaut = noir pur).
//   Signale (sans résoudre) les calques qui regroupent deux pattes éloignées.
// Travaille sur game/data/rigs/<id>/ (garder une copie avant : art-sortie/revue/avant/<id>/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lisPng, ecrisPng } from '../lib/png.mjs';
import { ecrisJson } from '../lib/rig-fichiers.mjs';
import { verifieClips } from '../../game/src/rig/verifie.js';
import { depuisFichiers, pourEnregistrer, comblePrevisoire, mailleCalque, recalculePoids, imageVide } from '../../builder/rig/calques.js';

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
if (opt('--devant', null)) {   // remonter un calque juste au-dessus de son parent (le corps)
  const cd = rig.calques.find(c => c.id === opt('--devant', null)), cp = rig.calques.find(c => c.id === (rig.os.find(o => o.id === cd?.os)?.parent && rig.calques.find(k => k.os === rig.os.find(o => o.id === cd.os).parent)?.id));
  if (cd && cp) {
    const ids = rig.calques.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).map(c => c.id).filter(i => i !== cd.id);
    ids.splice(ids.indexOf(cp.id) + 1, 0, cd.id);
    ids.forEach((i, k) => { rig.calques.find(c => c.id === i).ordre = k; });
  }
}
const source = lisPng(path.join(dossier, 'source.png'));
// dilatation / érosion d'un masque par un carré de rayon r (séparable ; hors image = vide)
const passe = (m, r, max) => {
  const tmp = new Uint8Array(W * H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = max ? 0 : 1; for (let d = -r; d <= r; d++) { const X = x + d, b = X >= 0 && X < W ? m[y * W + X] : 0; if (max ? b : !b) { v = max ? 1 : 0; break; } } tmp[y * W + x] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = max ? 0 : 1; for (let d = -r; d <= r; d++) { const Y = y + d, b = Y >= 0 && Y < H ? tmp[Y * W + x] : 0; if (max ? b : !b) { v = max ? 1 : 0; break; } } out[y * W + x] = v; }
  return out;
};
const dilate = (m, r) => r > 0 ? passe(m, r, true) : m, erode = (m, r) => r > 0 ? passe(m, r, false) : m;
const composantes = (m, minAire) => {   // composantes 4-connexes d'un masque : { aire, cx, cy, boite, masque }
  const vu = new Uint8Array(W * H), res = [];
  for (let s0 = 0; s0 < W * H; s0++) if (m[s0] && !vu[s0]) {
    const pile = [s0], pts = []; vu[s0] = 1; let sx = 0, sy = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    while (pile.length) {
      const k = pile.pop(), x = k % W, y = (k / W) | 0; pts.push(k); sx += x; sy += y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      if (x > 0 && m[k - 1] && !vu[k - 1]) { vu[k - 1] = 1; pile.push(k - 1); }
      if (x < W - 1 && m[k + 1] && !vu[k + 1]) { vu[k + 1] = 1; pile.push(k + 1); }
      if (y > 0 && m[k - W] && !vu[k - W]) { vu[k - W] = 1; pile.push(k - W); }
      if (y < H - 1 && m[k + W] && !vu[k + W]) { vu[k + W] = 1; pile.push(k + W); }
    }
    if (pts.length >= minAire) res.push({ aire: pts.length, cx: sx / pts.length, cy: sy / pts.length, boite: [x0, y0, x1, y1], pts });
  }
  return res;
};
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
// le cou : au contact tête/corps, mais la tête englobe souvent le collier (feuilles, fourrure) qui descend sur la poitrine : le contact est alors
// trop bas ; l'articulation visible est ~30 % plus haut, vers le centre de la tête (cameleon du game designer : tête (447,541), contact brut (438,659))
const cou0 = tete ? (contact(tete, corps, 18) || proche(tete, cC)) : null;
const cou = cou0 && (() => { const ct = centre(tete), d = Math.hypot(ct[0] - cou0[0], ct[1] - cou0[1]); const t = d > 150 ? +opt('--cou', 0.3) : 0; return [cou0[0] + t * (ct[0] - cou0[0]), cou0[1] + t * (ct[1] - cou0[1])]; })();
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

// 2. LES PARTIES CACHEES : du noir dans un calque `<parent>-copie` SEPARE (tout en bas, mêmes poids que le parent), jamais peint dans le parent,
// et LOIN DU BORD (érodé de --loin px) : un noir qui suit un contour se voit dès que le calque tourne
let peints = 0, jonctions = 0;
const copies = [];
if (!args.includes('--sans-peindre')) {
  const ordre = i => rig.calques.find(k => k.id === i)?.ordre || 0;
  const rayon = +opt('--rayon', 10), comble = +opt('--comble', 0), loin = +opt('--loin', 12);
  const silhouette = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) silhouette[k] = source.data[k * 4 + 3] > 128 ? 1 : 0;
  const masques = new Map();   // parent (partie) -> masque du noir
  const masqueDe = pr => { if (!masques.has(pr)) masques.set(pr, new Uint8Array(W * H)); return masques.get(pr); };
  const couvert = new Uint8Array(W * H);
  for (const p of vivants) for (let i = 0; i < p.n; i++) couvert[p.ys[i] * W + p.xs[i]] = 1;
  // (a) sous les enfants
  for (const pr of vivants) {
    // les enfants posés AU-DESSUS de ce parent ; ni une arme (os différent de son porteur), ni une partie derrière son parent (une queue : le noir se verrait)
    const enfants = vivants.filter(p => parentDe(p) === pr && p.role !== 'arme' && ordre(p.id) > ordre(pr.id));
    if (!enfants.length) continue;
    // la région où du noir pourrait vivre : la silhouette, moins ce que le parent et les AUTRES parties couvrent (leurs bords comptent comme des bords)
    const libre = new Uint8Array(W * H);
    const autres = new Uint8Array(W * H);
    for (const q of vivants) if (!enfants.includes(q)) for (let i = 0; i < q.n; i++) autres[q.ys[i] * W + q.xs[i]] = 1;
    for (let k = 0; k < W * H; k++) libre[k] = silhouette[k] && !autres[k] ? 1 : 0;
    const coeur = erode(libre, loin), proches = voisinage(pr, 70), m = masqueDe(pr);
    for (const p of enfants) { const d = dilate(p.m, rayon); for (let k = 0; k < W * H; k++) if (d[k] && coeur[k] && proches[k]) m[k] = 1; }
  }
  // (b) jonctions ouvertes : de la silhouette que AUCUN calque ne couvre, au contact de deux calques de parties différentes -> noir, loin des bords
  {
    const sil = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) sil[k] = silhouette[k] && !couvert[k] ? 1 : 0;
    const bords = vivants.filter(p => p.role !== 'decor').map(p => ({ p, d: dilate(p.m, 6) }));
    for (const c of composantes(erode(sil, 1), 600)) {
      const [x0, y0, x1, y1] = c.boite, touche = [];
      for (const { p, d } of bords) { let t = 0; for (let y = Math.max(0, y0 - 1); y <= Math.min(H - 1, y1 + 1) && t < 20; y++) for (let x = x0; x <= x1; x++) if (d[y * W + x] && sil[y * W + x] && ++t >= 20) break; if (t >= 20) touche.push(p); }
      if (touche.length < 2) continue;
      const cible = touche.find(p => touche.some(q => parentDe(q) === p)) || corps;
      const comp = new Uint8Array(W * H); for (const k of c.pts) comp[k] = 1;
      const coeur = erode(comp, loin), m = masqueDe(cible); let n = 0;
      for (const k of c.pts) if (coeur[k]) { m[k] = 1; n++; }
      if (!n) { console.log(`jonction ouverte : ${c.aire} px sans calque vers (${Math.round(c.cx)}, ${Math.round(c.cy)}) entre ${touche.map(p => p.id).join(' et ')} — trop étroite pour du noir à ${loin} px des bords : un calque de plus ?`); continue; }
      console.log(`jonction ouverte : ${c.aire} px sans calque vers (${Math.round(c.cx)}, ${Math.round(c.cy)}) entre ${touche.map(p => p.id).join(' et ')} -> ${n} px de noir dans ${cible.id}-copie, à ${loin} px des bords (un calque de plus, cou/poitrine, serait peut-être mieux)`);
      jonctions++;
    }
  }
  for (const [pr, masque] of masques) {
    let n = 0; for (let k = 0; k < W * H; k++) if (masque[k]) n++;
    if (n < 30) continue;
    const im = imageVide(W, H);
    const rempli = comble > 0 ? comblePrevisoire(pr.im, masque, comble) : null;
    for (let k = 0; k < W * H; k++) if (masque[k]) {
      if (rempli && rempli.data[k * 4 + 3] >= 128) for (let c = 0; c < 4; c++) im.data[k * 4 + c] = rempli.data[k * 4 + c];
      else { im.data[k * 4] = im.data[k * 4 + 1] = im.data[k * 4 + 2] = 0; im.data[k * 4 + 3] = 255; }   // en cas de doute : noir
      peints++;
    }
    if (args.includes('--sous-enfant')) for (const p of vivants) if (parentDe(p) === pr && p.role !== 'arme') for (let k = 0; k < W * H; k++) if (masque[k] && p.m[k]) for (let c = 0; c < 4; c++) im.data[k * 4 + c] = p.im.data[k * 4 + c];
    copies.push({ id: pr.id + '-copie', pr, im });
  }
  // dans l'ordre : juste au-dessus de `tout` (ordre 1, 2…), le reste monte d'autant
  copies.forEach((cp, j) => {
    for (const k of rig.calques) if ((k.ordre || 0) >= 1 + j && k.id !== 'tout') k.ordre = (k.ordre || 0) + 1;
    rig.calques.push({ id: cp.id, image: `calques/${cp.id}.png`, de: cp.pr.id, ordre: 1 + j, x: 0, y: 0, largeur: W, hauteur: H });
    images[cp.id] = cp.im;
  });
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
for (const cp of copies) {   // le -copie : maillé, et tiré par le seul os du parent
  const c = rig.calques.find(k => k.id === cp.id);
  c.mesh = { pas }; mailleCalque(rig, images, cp.id);
  c.osPoids = [cp.pr.os];
}
recalculePoids(rig);
const { json, fichiers } = pourEnregistrer(rig, images, masques, null);
for (const f of fichiers) { const q = path.join(dossier, f.chemin); fs.mkdirSync(path.dirname(q), { recursive: true }); ecrisPng(q, f.image); }
ecrisJson(fRig, json);
console.log(`${id} : ${doubles} pixel(s) en double retirés, ${vivants.length} calque(s) maillés, pivots replacés, ${peints} pixel(s) de noir dans ${copies.length} calque(s) -copie (${copies.map(c => c.id).join(', ') || 'aucun'}), ${jonctions} jonction(s) ouverte(s) comblée(s) ; calques : ${vivants.map(p => p.id).join(', ')}`);

// 4b. SIGNALER (sans résoudre) : un calque qui regroupe deux pattes (ou bras, oreilles, ailes) éloignées
for (const p of vivants) {
  if (!['jambe', 'bras', 'oreille', 'aile'].includes(p.role)) continue;
  const cs = composantes(dilate(p.m, 4), Math.max(300, p.n * 0.15));
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const d = Math.hypot(cs[i].cx - cs[j].cx, cs[i].cy - cs[j].cy);
    if (d > 120) console.log(`⚠ « ${p.id} » regroupe deux morceaux éloignés (${Math.round(d)} px : vers (${Math.round(cs[i].cx)}, ${Math.round(cs[i].cy)}) et (${Math.round(cs[j].cx)}, ${Math.round(cs[j].cy)})) — deux pattes ? à séparer`);
  }
}


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
