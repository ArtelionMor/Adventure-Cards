// Le validateur d'animation, en ligne de commande (game/src/rig/verifie.js).
//
//   node scripts/rig-valide.mjs <id> [clip ...] [--json]
//
// Dit les erreurs (a corriger avant de livrer) et les alertes, puis les MESURES de chaque
// clip : l'amplitude de chaque os, le plus grand deplacement et le pire etirement de chaque
// calque, la couture de la boucle. C'est avec ces chiffres qu'on juge « subtil » : un idle
// dont un os tourne de 8° n'est plus subtil, meme si rien n'est casse.
// Code de sortie : 1 s'il y a une erreur.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifieClips } from '../game/src/rig/verifie.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const [id, ...clips] = args.filter(a => !a.startsWith('--'));
if (!id) { console.log('usage : node scripts/rig-valide.mjs <id> [clip ...] [--json]'); process.exit(1); }

const dossier = path.join(ROOT, 'game/data/rigs', id);
const lis = f => JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'));
let clipsJson = null;
try { clipsJson = lis('clips.json'); } catch (e) {
  if (e.code !== 'ENOENT') { console.log('clips.json illisible : ' + e.message); process.exit(1); }
}
const { constats, mesures } = verifieClips(lis('rig.json'), clipsJson, { clips: clips.length ? clips : null });

if (args.includes('--json')) { console.log(JSON.stringify({ constats, mesures }, null, 2)); }
else {
  const erreurs = constats.filter(c => c.niveau === 'erreur'), alertes = constats.filter(c => c.niveau === 'alerte');
  for (const c of erreurs) console.log(`✗ ${c.clip ? c.clip + ' : ' : ''}${c.message}`);
  for (const c of alertes) console.log(`⚠ ${c.clip ? c.clip + ' : ' : ''}${c.message}`);
  for (const [nom, m] of Object.entries(mesures)) {
    console.log(`\n${nom} — ${m.duree} s${m.boucle ? ', en boucle' : ''} (${m.echantillons} instants)`);
    for (const o of m.os) {
      const parts = [];
      if (o.rot) parts.push(`rot ±${o.rot}°`);
      if (o.x || o.y) parts.push(`x ±${o.x} y ±${o.y} px`);
      if (o.sx || o.sy) parts.push(`sx ±${(o.sx * 100).toFixed(1)} % sy ±${(o.sy * 100).toFixed(1)} %`);
      console.log(`  os ${o.os.padEnd(12)} ${parts.join(' · ')}`);
    }
    for (const c of m.calques) console.log(`  calque ${c.calque.padEnd(8)} déplacement max ${c.deplacementMax} px · ${c.etirementLibre ? 'étirement libre' : `étirement contour ${c.etirementTrait} % · intérieur ${c.etirementInterieur} %`}`);
    for (const z of m.zones || []) console.log(`  zone ${z.dessous}/${z.zone} (${z.etat}) : « ${z.dessus} » glisse de ${z.glisse} px au-dessus`);
    if (m.boucle) console.log(`  couture : saut ${m.couture.saut} px, accélération ${m.couture.acceleration} (max du clip ${m.couture.accelerationMax})`);
  }
  console.log(`\n${erreurs.length} erreur(s), ${alertes.length} alerte(s)`);
}
process.exit(constats.some(c => c.niveau === 'erreur') ? 1 : 0);
