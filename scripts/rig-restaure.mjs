// REND une ancienne version d'un rig écrasée par un enregistrement de l'Atelier (le serveur garde, avant chaque écriture,
// l'ancien fichier dans ~/.adventure-card/rig-sauvegardes/<id>/<AAAA-MM-JJ-HH-MM>/<chemin>, une version par minute, 80 minutes).
//
//   node scripts/rig-restaure.mjs <id>                 liste les versions gardées (la plus récente en bas) et leurs fichiers
//   node scripts/rig-restaure.mjs <id> <AAAA-MM-JJ-HH-MM>   remet les fichiers de cette version à leur place (UTC, comme la liste)
//
// ⚠ Une version ne contient que les fichiers que l'enregistrement de cette minute a écrasés. Pour revenir à l'état d'AVANT une
// session de travail, rendre aussi les versions suivantes dans l'ordre inverse (de la plus récente à la plus ancienne voulue).
// Ferme l'Atelier (ou recharge-le) après : il relit les fichiers à l'ouverture.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id, minute] = process.argv.slice(2);
if (!id) { console.log('usage : node scripts/rig-restaure.mjs <id> [AAAA-MM-JJ-HH-MM]'); process.exit(1); }
const base = path.join(os.homedir(), '.adventure-card', 'rig-sauvegardes', id);
if (!fs.existsSync(base)) { console.log('aucune sauvegarde pour ' + id); process.exit(1); }
const fichiers = d => fs.readdirSync(d, { recursive: true }).filter(f => fs.statSync(path.join(d, f)).isFile());

if (!minute) {
  for (const m of fs.readdirSync(base).sort()) console.log(m + '  ' + fichiers(path.join(base, m)).join(', '));
  process.exit(0);
}
const src = path.join(base, minute);
if (!fs.existsSync(src)) { console.log('version inconnue : ' + minute); process.exit(1); }
for (const f of fichiers(src)) {
  const dest = path.join(ROOT, 'game', 'data', 'rigs', id, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(src, f), dest);
  console.log('rendu : ' + f);
}
