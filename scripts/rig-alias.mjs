// Les ILLUSTRATIONS EN DOUBLE : le deck complet de chaque adversaire est rangé dans son dossier, donc une même carte (« Lapin Colosse »)
// existe en plusieurs exemplaires, et `rig-squelettes-types.mjs` a donné un squelette à chacun. On n'anime qu'UNE copie (la première par
// ordre alphabétique de dossier de rig, celle sans préfixe de deck) ; ce script écrit `game/data/rigs-alias.json` : chemin de chaque
// copie -> rig de la copie retenue, que lit le jeu (`ui/rig-hero.js`). `--liste` dit les rigs en trop (à retirer, une fois le lot fini).
//   node scripts/rig-alias.mjs            écrit game/data/rigs-alias.json
//   node scripts/rig-alias.mjs --liste    n'écrit rien, liste les dossiers redondants
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RIGS = path.join(ROOT, 'game', 'data', 'rigs');
const vus = new Map(), alias = {}, trop = [];
for (const d of fs.readdirSync(RIGS).sort()) {
  let j, h;
  try {
    j = JSON.parse(fs.readFileSync(path.join(RIGS, d, 'rig.json'), 'utf8'));
    h = crypto.createHash('md5').update(fs.readFileSync(path.join(RIGS, d, 'source.png'))).digest('hex');
  } catch { continue; }
  if (!vus.has(h)) { vus.set(h, d); continue; }
  trop.push(d);
  if (j.source?.origine) alias[j.source.origine] = vus.get(h);
}
if (process.argv.includes('--liste')) { console.log(trop.join('\n')); console.log(`\n${trop.length} rig(s) redondant(s)`); process.exit(0); }
fs.writeFileSync(path.join(ROOT, 'game', 'data', 'rigs-alias.json'), JSON.stringify(alias, null, 1) + '\n');
console.log(`${Object.keys(alias).length} copie(s) renvoyée(s) vers leur rig`);
