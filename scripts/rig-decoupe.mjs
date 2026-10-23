// Le decoupage en calques, en ligne de commande : les memes operations que le mode
// ✂ Calques de l'Atelier (builder/rig/calques.js), sur les PNG du disque.
//
//   node scripts/rig-decoupe.mjs <id> extrait --depuis <calque> --nom <nouveau> --poly "x,y x,y …"
//        [--contour 10] [--lissage 2] [--trait 8] [--os <os>]
//   node scripts/rig-decoupe.mjs <id> comble --calque <calque> [--zone z1] [--distance 32]
//   node scripts/rig-decoupe.mjs <id> etat
//
// extrait : le polygone (pixels de la source) devient le calque <nouveau>, juste au-dessus de
//   <calque> ; --contour R accroche chaque sommet au trait noir le plus proche (rayon R),
//   --lissage N arrondit le trace (N passes), --trait L etend la selection sur le trait qui la
//   borde (L px) pour que l'objet emporte tout son contour ; --os : calque rigide sur cet os
//   (sinon maille). Le trou laisse devient une zone a combler (masques/<calque>-zN.png).
// comble : remplissage PROVISOIRE de la zone (couleurs voisines diffusees, a moins de
//   --distance px de la matiere) ; la zone passe « provisoire ».

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lisPng, ecrisPng } from './lib/png.mjs';
import { ecrisJson } from './lib/rig-fichiers.mjs';
import { accroche, lisse, masquePolygone, inclutTrait, extraitCalque, combleZone, pourEnregistrer, depuisFichiers } from '../builder/rig/calques.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const [id, action] = args;
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (!id || !['extrait', 'comble', 'etat'].includes(action)) {
  console.log('usage : node scripts/rig-decoupe.mjs <id> extrait|comble|etat … (voir l\'en-tête du script)');
  process.exit(1);
}
const dossier = path.join(ROOT, 'game/data/rigs', id);
const fRig = path.join(dossier, 'rig.json');
const lis = rel => { const f = path.join(dossier, rel); return fs.existsSync(f) ? lisPng(f) : null; };
const { rig, images, masques } = depuisFichiers(JSON.parse(fs.readFileSync(fRig, 'utf8')), lis);
const W = rig.source.largeur, H = rig.source.hauteur;
let touches = [];

if (action === 'extrait') {
  const depuis = opt('--depuis'), nom = opt('--nom');
  let pts = (opt('--poly') || '').trim().split(/\s+/).map(p => p.split(',').map(Number));
  if (pts.length < 3 || pts.some(p => p.length !== 2 || p.some(isNaN))) { console.log('--poly "x,y x,y x,y …" : trois points au moins'); process.exit(1); }
  const r = +opt('--contour', 0);
  if (r > 0) pts = pts.map(([x, y]) => accroche(images[depuis], x, y, r));
  pts = lisse(pts, +opt('--lissage', 2));
  let m = masquePolygone(pts, W, H);
  const t = +opt('--trait', 0);
  if (t > 0) m = inclutTrait(m, images[depuis], t);
  const zone = extraitCalque(rig, images, masques, { depuis, nom, masque: m, os: opt('--os') });
  touches = [depuis, nom];
  console.log(`calque « ${nom} » extrait de « ${depuis} »` + (zone ? ` ; zone à combler ${depuis}/${zone.id} (${zone.largeur} × ${zone.hauteur} px)` : ''));
} else if (action === 'comble') {
  const calque = opt('--calque');
  const B = rig.calques.find(k => k.id === calque);
  const zones = opt('--zone') ? [opt('--zone')] : (B?.zones || []).filter(z => z.etat === 'a-combler').map(z => z.id);
  for (const z of zones) { combleZone(rig, images, masques, calque, z, +opt('--distance', 32)); console.log(`zone ${calque}/${z} comblée (provisoire)`); }
  touches = [calque];
}

if (action === 'etat') {
  for (const c of [...rig.calques].sort((a, b) => (b.ordre || 0) - (a.ordre || 0))) {
    console.log(`${String(c.ordre || 0).padStart(2)} ${c.id.padEnd(12)} ${c.os ? 'rigide sur ' + c.os : c.mesh ? 'maillé (' + c.mesh.sommets.length / 2 + ' sommets)' : '—'}` +
      (c.zones?.length ? '  zones : ' + c.zones.map(z => `${z.id} ${z.etat}`).join(', ') : ''));
  }
} else {
  const { json, fichiers } = pourEnregistrer(rig, images, masques, touches);
  for (const f of fichiers) { const p = path.join(dossier, f.chemin); fs.mkdirSync(path.dirname(p), { recursive: true }); ecrisPng(p, f.image); }
  ecrisJson(fRig, json);
  console.log(`écrit : rig.json + ${fichiers.length} image(s)`);
}
