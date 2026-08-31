// Genere game/data/sprites.js : la liste des sprites disponibles, pour que le
// Card Builder puisse proposer un portrait sans que tu tapes un chemin a la main.
// A relancer apres avoir ajoute des images :  node scripts/gen-sprites.mjs
import { readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDERS = ['Characters', 'Machines', 'Ressources', 'UI'];

const out = {};
for (const f of FOLDERS) {
  const dir = join(root, f);
  if (!existsSync(dir)) continue;
  out[f] = readdirSync(dir).filter(n => /\.(png|jpg|jpeg|webp|gif)$/i.test(n)).sort();
}

writeFileSync(
  join(root, 'game/data/sprites.js'),
  `// Genere par scripts/gen-sprites.mjs — ne pas editer a la main.\nexport const SPRITES = ${JSON.stringify(out, null, 2)};\n`,
  'utf8'
);
console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.length}`).join(' · '));
