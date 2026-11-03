// POUSSE des rigs sur l'Atelier du Pi (POST /api/rig?path=<id>/<fichier>, un POST par fichier, rig.json en DERNIER), par le port de service
// (7332 : un second serveur du Pi, pour ne pas ralentir l'Atelier du game designer sur 7330), quatre rigs à la fois.
//   node scripts/auto/pousse-rig.mjs <dossier contenant les rigs> <ids.txt> [--hote http://192.168.1.75:7332] [--parallele 4] [--seulement-clips]
// ⚠ Avant : `node scripts/auto/deja-touche.mjs` et RETIRER de la liste tout rig que le game designer a retouché. L'Atelier du Pi garde une
// sauvegarde datée de chaque fichier écrasé. Écrit la liste de ce qui est poussé dans <dossier>/../pousses.txt (pour s'en souvenir : après
// un envoi, deja-touche voit ces rigs comme « touchés »).
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const [dossier, liste] = args;
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const HOTE = opt('--hote', 'http://192.168.1.75:7332');
const PAR = +opt('--parallele', 4);
const seulementClips = args.includes('--seulement-clips');
const ids = fs.readFileSync(liste, 'utf8').split(/[,\n]/).map(x => x.trim()).filter(Boolean);
const type = f => f.endsWith('.json') ? 'application/json' : f.endsWith('.png') ? 'image/png' : 'application/octet-stream';

async function poste(id, f) {
  const chemin = path.join(dossier, id, f);
  const r = await fetch(`${HOTE}/api/rig?path=${encodeURIComponent(id + '/' + f).replace(/%2F/g, '/')}`, { method: 'POST', headers: { 'Content-Type': type(f) }, body: fs.readFileSync(chemin) });
  const t = (await r.text()).trim();
  if (!r.ok || !/ok/i.test(t)) throw new Error(`${id}/${f} : ${r.status} ${t.slice(0, 80)}`);
}

async function rig(id) {
  const fichiers = new Set();
  const rj = seulementClips ? { calques: [] } : JSON.parse(fs.readFileSync(path.join(dossier, id, 'rig.json'), 'utf8'));
  if (!seulementClips) for (const c of rj.calques) { fichiers.add(c.image); for (const z of c.zones || []) fichiers.add(z.masque); }
  for (const f of fichiers) if (fs.existsSync(path.join(dossier, id, f))) await poste(id, f);
  await poste(id, 'clips.json');
  if (!seulementClips) await poste(id, 'rig.json');
}

let i = 0, ok = [], ko = [];
await Promise.all(Array.from({ length: PAR }, async () => {
  while (i < ids.length) {
    const id = ids[i++];
    try { await rig(id); ok.push(id); } catch (e) { ko.push(e.message); }
    if ((ok.length + ko.length) % 20 === 0) console.log(`${ok.length + ko.length}/${ids.length}`);
  }
}));
fs.appendFileSync(path.join(path.dirname(path.resolve(dossier)), 'pousses.txt'), ok.join('\n') + '\n');
console.log(`poussés : ${ok.length}, échecs : ${ko.length}`);
for (const e of ko.slice(0, 10)) console.log('  ' + e);
