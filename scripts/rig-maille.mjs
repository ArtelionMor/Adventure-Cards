// Maille un personnage en « image seule » et calcule ses poids, sans ouvrir l'Atelier :
// la meme chose que les boutons « Générer le mesh » et « Calculer les poids » de
// builder/rig.html (memes fonctions, game/src/rig/mesh.js).
//
//   node scripts/rig-maille.mjs <id> [--pas 40] [--poids-seuls] [--calque <id>] [--forcer]
//
// Ecrit game/data/rigs/<id>/rig.json (garde ses fins de ligne). --poids-seuls garde le mesh
// et ne refait que les poids (apres avoir deplace des os). Chaque calque maille prend les os
// de osDuCalque() (game/src/rig/mesh.js) ; des poids peints a la main sont gardes sauf --forcer.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lisPng } from './lib/png.mjs';
import { grilleDepuisImage, poidsAuto, osDuCalque } from '../game/src/rig/mesh.js';
import { prepareSquelette } from '../game/src/rig/squelette.js';
import { ecrisJson } from './lib/rig-fichiers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args.find(a => !a.startsWith('--'));
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
if (!id) { console.log('usage : node scripts/rig-maille.mjs <id> [--pas 40] [--poids-seuls] [--calque <id>] [--forcer]'); process.exit(1); }

const dossier = path.join(ROOT, 'game/data/rigs', id);
const fRig = path.join(dossier, 'rig.json');
const rig = JSON.parse(fs.readFileSync(fRig, 'utf8'));
const sq = prepareSquelette(rig);

const seul = opt('--calque');
for (const c of rig.calques || []) {
  if (!c.mesh && c.os) continue; // calque rigide : pas de mesh
  if (seul && c.id !== seul) continue;
  if (!args.includes('--poids-seuls') || !c.mesh) {
    const img = lisPng(path.join(dossier, c.image || rig.source.image));
    // le pas se regle sur la SOURCE, pas sur le calque recadre : tous les calques d'un
    // personnage ont la meme finesse de maillage
    const pas = +(opt('--pas') || c.mesh?.pas || 0) || Math.max(8, Math.round(Math.max(rig.source.largeur, rig.source.hauteur) / 50));
    c.mesh = grilleDepuisImage(img, { pas, decalage: [c.x || 0, c.y || 0] });
  }
  // des poids peints a la main (le pinceau de l'Atelier) ne se recalculent pas en douce
  if (c.mesh.poidsManuels && !args.includes('--forcer')) { console.log(`${c.id} : poids peints à la main, gardés (--forcer pour les refaire)`); continue; }
  delete c.mesh.poidsManuels;
  c.mesh.poids = poidsAuto(c.mesh, sq, { osPermis: osDuCalque(rig, c) });
  console.log(`${c.id} : ${c.mesh.sommets.length / 2} sommets, ${c.mesh.triangles.length / 3} triangles (${c.mesh.trait.length} sur du contour), pas ${c.mesh.pas}`);
}
ecrisJson(fRig, rig);
console.log('écrit : ' + path.relative(ROOT, fRig));
