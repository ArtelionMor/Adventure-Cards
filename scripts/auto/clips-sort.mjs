// Un SORT n'a que deux animations : « idle » et « play » (jouée une fois). Le lot produit les quatre clips d'une unité : pour une carte
// de type « spell », « play » reprend « hitting » (le coup : recul, élan, retour) et on retire walking, hitting et taking_damage.
//   node scripts/auto/clips-sort.mjs <dossier contenant les rigs> <id,id,…|@fichier>
// (décision du game designer, 28 oct. 2026 : « c'est un sort, donc deux animations : idle et play »)
import fs from 'node:fs';
import path from 'node:path';
const [dossier, liste] = process.argv.slice(2);
const ids = (liste.startsWith('@') ? fs.readFileSync(liste.slice(1), 'utf8') : liste).split(/[,\n]/).map(x => x.trim()).filter(Boolean);
let n = 0;
for (const id of ids) {
  const f = path.join(dossier, id, 'clips.json');
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const c = j.clips || {};
  if (c.play && !c.hitting) continue;                    // déjà fait
  if (!c.hitting) continue;
  c.play = { ...c.hitting, description: 'Sort, joué une fois : ' + (c.hitting.description || '').replace(/^Coup : /, '') };
  delete c.walking; delete c.hitting; delete c.taking_damage;
  fs.writeFileSync(f, JSON.stringify(j, null, 2));
  n++;
}
console.log('sorts mis à deux clips (idle, play) :', n);
