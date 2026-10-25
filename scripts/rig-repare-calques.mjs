// Recolle les calques dont l'image manque : un rig.json qui cite `calques/<id>.png` sans que le
// fichier existe (bug de l'enregistrement de l'Atelier avant le 26 oct. 2026 : le sprite n'apparaissait plus).
// Le PNG est recoupe dans source.png a la place (x, y, largeur, hauteur) du calque.
//
//   node scripts/rig-repare-calques.mjs [--ecrire]
//
// Ne touche que les calques SANS lignee (`de`) et SANS os rigide : un calque decoupe a la main ne se devine pas.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lisPng, ecrisPng } from './lib/png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'game/data/rigs');
const ECRIRE = process.argv.includes('--ecrire');
let n = 0;
for (const id of fs.readdirSync(OUT)) {
  const d = path.join(OUT, id), f = path.join(d, 'rig.json');
  if (!fs.existsSync(f)) continue;
  const rig = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const c of rig.calques || []) {
    if (!c.image || c.image === rig.source.image || fs.existsSync(path.join(d, c.image))) continue;
    if (c.de || c.os) { console.log(`${id}/${c.id} : image manquante, calque découpé : à voir à la main`); continue; }
    console.log(`${ECRIRE ? 'recoupe' : 'recouperait'} ${id}/${c.image}`);
    n++;
    if (!ECRIRE) continue;
    const src = lisPng(path.join(d, rig.source.image || 'source.png'));
    const x0 = c.x || 0, y0 = c.y || 0, w = c.largeur, h = c.hauteur;
    const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = x0 + x, sy = y0 + y;
      if (sx < 0 || sy < 0 || sx >= src.largeur || sy >= src.hauteur) continue;
      const a = (sy * src.largeur + sx) * 4, b = (y * w + x) * 4;
      data[b] = src.data[a]; data[b + 1] = src.data[a + 1]; data[b + 2] = src.data[a + 2]; data[b + 3] = src.data[a + 3];
    }
    fs.mkdirSync(path.dirname(path.join(d, c.image)), { recursive: true });
    ecrisPng(path.join(d, c.image), { largeur: w, hauteur: h, data });
  }
}
console.log(`${n} image(s) ${ECRIRE ? 'recoupée(s)' : 'à recouper'}.`);
