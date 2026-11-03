// Poids en RAMPE (un fondu large entre deux os, sur toute la longueur d'une partie), au lieu des poids automatiques, trop abrupts
// aux articulations : c'est ce qui laissait le validateur réduire une animation à 15 % (bourgeon, 29 oct. 2026).
//   node scripts/auto/poids-rampe.mjs <id> '<json>'
// <json> : { "<calque>": { "de": "<os fixe>", "vers": "<os mobile>", "depuis": [x,y], "jusqu": [x,y] } , ... }
// Pour chaque sommet, t = projection sur le segment depuis→jusqu (0..1) ; poids de « vers » = lisse(t), de « de » = 1 - lisse(t).
// Un calque sans maillage est maillé d'abord (rig-maille). Les poids sont marqués « peints à la main » (non recalculés).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [id, cfg] = process.argv.slice(2);
const f = path.join(ROOT, 'game/data/rigs', id, 'rig.json');
const r = JSON.parse(fs.readFileSync(f, 'utf8'));
const lisse = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
for (const [nom, c] of Object.entries(JSON.parse(cfg))) {
  const cal = r.calques.find(x => x.id === nom);
  if (!cal || !cal.mesh) { console.log('pas de maillage : ' + nom); continue; }
  const [ax, ay] = c.depuis, [bx, by] = c.jusqu, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const S = cal.mesh.sommets;
  cal.osPoids = [c.de, c.vers];
  cal.mesh.poids = [];
  for (let i = 0; i < S.length / 2; i++) {
    const t = lisse(((S[i * 2] - ax) * dx + (S[i * 2 + 1] - ay) * dy) / L2);
    const w = [[c.de, 1 - t], [c.vers, t]].filter(v => v[1] > 0.01);
    const tot = w.reduce((s, v) => s + v[1], 0);
    cal.mesh.poids.push(w.flatMap(([k, v]) => [k, +(v / tot).toFixed(3)]));
  }
  cal.mesh.poidsManuels = true;
  console.log(nom + ' : rampe ' + c.de + ' → ' + c.vers);
}
fs.writeFileSync(f, JSON.stringify(r, null, 2));
