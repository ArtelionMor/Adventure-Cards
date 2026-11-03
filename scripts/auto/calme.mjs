// RE-CALME les clips d'un rig déjà assemblé (après que finit.py a changé ses calques et ses poids) : pour chaque clip, la plus grande
// échelle (0 à 1) de ses amplitudes que le validateur accepte. Même méthode que rig-auto.mjs (dichotomie) ; réécrit clips.json.
//   node scripts/auto/calme.mjs <id> [--depot <dossier>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const id = args[0];
const dep = args.indexOf('--depot');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEPOT = dep >= 0 ? args[dep + 1] : ROOT;
const { verifieClips } = await import(pathToFileURL(path.join(DEPOT, 'game/src/rig/verifie.js')).href);
const dossier = path.join(DEPOT, 'game/data/rigs', id);
const rig = JSON.parse(fs.readFileSync(path.join(dossier, 'rig.json'), 'utf8'));
const clipsF = JSON.parse(fs.readFileSync(path.join(dossier, 'clips.json'), 'utf8'));
const calme = (c, f) => {
  const d = JSON.parse(JSON.stringify(c));
  for (const cv of Object.values(d.pistes || {})) for (const keys of Object.values(cv)) for (const k of keys) k.v = +(k.v * f).toFixed(3);
  for (const m of d.procedural || []) m.amplitude = +(m.amplitude * f).toFixed(3);
  return d;
};
const erreurs = (nom, c, f) => verifieClips(rig, { format: 'adventure-rig-clips', version: 1, clips: { [nom]: calme(c, f) } }, { clips: [nom] }).constats.filter(x => x.niveau === 'erreur');
const bilan = {};
for (const [nom, c] of Object.entries(clipsF.clips)) {
  let f = 1;
  if (erreurs(nom, c, 1).length) {
    let lo = 0, hi = 1;
    for (let it = 0; it < 8; it++) { const m = (lo + hi) / 2; if (erreurs(nom, c, m).length) hi = m; else lo = m; }
    f = +(lo * 0.95).toFixed(2);                 // une marge : le validateur refuse « 5,0 % » pile
  }
  clipsF.clips[nom] = calme(c, f);
  bilan[nom] = f;
}
fs.writeFileSync(path.join(dossier, 'clips.json'), JSON.stringify(clipsF, null, 2));
console.log('calme : ' + Object.entries(bilan).map(([k, v]) => `${k} ${Math.round(v * 100)} %`).join(', '));
