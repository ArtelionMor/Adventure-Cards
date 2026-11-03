// LE VÉRIFICATEUR AUTOMATIQUE (sans IA, gratuit) : note un rig produit par le lot sur ce qu'on peut MESURER, pour que la boucle de
// feedback ne dépense des jetons que sur ce qui est vraiment douteux. Pas un juge de beauté : le game designer et un sous-agent
// regardent ensuite les « à revoir ».
//   node scripts/auto/verifie-rig.mjs <dossier-d'un-rig> [--json]
// Constats (gravité 3 = à refaire, 2 = à regarder, 1 = noté) :
//   validateur (clips refusés), calque mobile non maillé, partie qui mange tout (> 70 % du personnage), trop peu de parties,
//   recouvrement entre calques png (> 3 % du plus petit), brins détachés (petits morceaux isolés dans un calque mobile),
//   clips trop timides (aucune rotation de plus de 1,5° sur tout le walking), `tout` encore plein quand il y a un `decor`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lisPng } from '../lib/png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const D = path.resolve(process.argv[2]);
const { verifieClips } = await import(pathToFileURL(path.join(ROOT, 'game/src/rig/verifie.js')).href);
const rig = JSON.parse(fs.readFileSync(path.join(D, 'rig.json'), 'utf8'));
const clips = JSON.parse(fs.readFileSync(path.join(D, 'clips.json'), 'utf8'));
const W = rig.source.largeur, H = rig.source.hauteur;
const constats = [];
const c = (g, t) => constats.push({ g, t });

// plans alpha de chaque calque, à la taille de la source
const plan = {};
for (const cal of rig.calques) {
  try {
    const im = lisPng(path.join(D, cal.image));
    const a = new Uint8Array(W * H);
    for (let y = 0; y < im.hauteur; y++) for (let x = 0; x < im.largeur; x++) {
      const X = cal.x + x, Y = cal.y + y;
      if (X >= 0 && X < W && Y >= 0 && Y < H && im.data[(y * im.largeur + x) * 4 + 3] > 128) a[Y * W + X] = 1;
    }
    plan[cal.id] = a;
  } catch { c(3, `calque « ${cal.id} » illisible`); }
}
const aire = id => (plan[id] || []).reduce((s, v) => s + v, 0);
const copie = id => /-copie$/.test(id);
const mobiles = rig.calques.filter(k => k.id !== 'tout' && k.id !== 'decor' && !copie(k.id));
const total = mobiles.reduce((s, k) => s + aire(k.id), 0) || 1;

// 1. validateur
const noms = Object.keys(clips.clips || {});
if (noms.length < 2) c(3, `seulement ${noms.length} clip(s)`);
const res = verifieClips(rig, clips, {});
const erreurs = res.constats.filter(x => x.niveau === 'erreur');
if (erreurs.length) c(3, `validateur : ${erreurs.length} erreur(s), ex. ${erreurs[0].message}`);

// 2. maillage des calques mobiles
const nonMailles = mobiles.filter(k => !k.mesh && !k.os);
if (nonMailles.length) c(3, `non maillés : ${nonMailles.map(k => k.id).join(', ')}`);

// 3. parties
if (mobiles.length < 3) c(2, `peu de calques mobiles (${mobiles.length})`);
for (const k of mobiles) if (aire(k.id) / total > 0.7 && mobiles.length > 1) c(3, `« ${k.id} » porte ${Math.round(100 * aire(k.id) / total)} % du personnage`);

// 4. recouvrement entre calques png (copies et fond exclus)
for (let i = 0; i < mobiles.length; i++) for (let j = i + 1; j < mobiles.length; j++) {
  const A = plan[mobiles[i].id], B = plan[mobiles[j].id];
  if (!A || !B) continue;
  let n = 0; for (let p = 0; p < A.length; p++) if (A[p] && B[p]) n++;
  const m = Math.min(aire(mobiles[i].id), aire(mobiles[j].id)) || 1;
  if (n / m > 0.03) c(2, `recouvrement ${mobiles[i].id} / ${mobiles[j].id} : ${n} px (${Math.round(100 * n / m)} % du plus petit)`);
}

// 5. brins détachés : composantes connexes isolées d'un calque mobile
for (const k of mobiles) {
  const A = plan[k.id]; if (!A) continue;
  const vu = new Uint8Array(A.length), tailles = [];
  for (let s = 0; s < A.length; s++) {
    if (!A[s] || vu[s]) continue;
    let n = 0; const pile = [s]; vu[s] = 1;
    while (pile.length) {
      const p = pile.pop(); n++;
      const x = p % W, y = (p - x) / W;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) if (q >= 0 && A[q] && !vu[q]) { vu[q] = 1; pile.push(q); }
    }
    tailles.push(n);
  }
  tailles.sort((a, b) => b - a);
  const brins = tailles.slice(1).filter(n => n < 0.02 * tailles[0]).length;
  if (brins > 4) c(2, `« ${k.id} » : ${brins} brins détachés`);
}

// 6. clips timides
const walk = clips.clips?.walking;
if (walk) {
  let maxRot = 0, maxSol = 0;
  for (const [os, cv] of Object.entries(walk.pistes || {})) for (const [canal, ks] of Object.entries(cv)) {
    const v = ks.map(k => Math.abs(k.v));
    if (canal === 'rot') maxRot = Math.max(maxRot, ...v);
    if ((canal === 'y' || canal === 'x') && os === 'sol') maxSol = Math.max(maxSol, ...v);
  }
  for (const m of walk.procedural || []) if (m.type === 'sinus' && m.canal === 'rot') maxRot = Math.max(maxRot, Math.abs(m.amplitude));
  if (maxRot < 1.5 && maxSol < 4) c(2, `walking très timide (rotation max ${maxRot.toFixed(1)}°, sol ${maxSol.toFixed(1)} px)`);
}

// 7. tout encore plein malgré un décor
if (plan.decor && plan.tout && aire('tout') > 0.05 * total) c(2, '« tout » n\'est pas vide alors qu\'un `decor` existe');

const note = constats.reduce((s, x) => s + x.g, 0);
const id = rig.id || path.basename(D);
const sortie = { id, note, graves: constats.filter(x => x.g === 3).length, constats };
if (process.argv.includes('--json')) console.log(JSON.stringify(sortie));
else console.log(`${id} : note ${note}` + constats.map(x => `\n  [${x.g}] ${x.t}`).join(''));
