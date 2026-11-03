// LA CALIBRATION DU POWER (refonte boutique, lot 3, 3 nov. 2026) : à quel niveau un trio bat-il un adversaire de la ligne ?
// Pour chaque adversaire (`--arenes`) et chaque niveau d'adversaire (`--ennemis`), on joue des trios au hasard (`--trios`) à chaque niveau de
// héros (`--heros`, le niveau du JEU : celui que compte le Power) et on lit le NIVEAU DE HEROS A 50 % de victoires (« L50 ») : le Power
// requis est 10 × 3 × L50 (un trio). Trios seulement (CLAUDE.md racine : ni solo ni duo). Les parties passent par la file commune.
//   node scripts/calibre-power.mjs [--runs 2] [--trios 24] [--heros 4,10,16,22,28] [--ennemis 1,10,20,30,40] [--arenes a,b] [--jobs N]
//        [--sortie art-sortie/power/calibration.json]   écrit les mesures (JSON)
//        [--ligne]                                      écrit game/src/config/ligne.js d'après les dernières mesures (ou celles de --depuis f.json)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CHARACTERS, CHAR_BY_ID } from '../game/src/config/characters.js';
import { ENCOUNTERS } from '../game/src/config/world.js';
import { BALANCE } from '../game/src/config/balance.js';
import { enParallele, nombreDeJobs } from './lib/pool.mjs';

const args = process.argv.slice(2);
const val = (nom, def) => { const i = args.indexOf('--' + nom); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const liste = (s, f = Number) => String(s).split(',').filter(Boolean).map(f);
const RUNS = Number(val('runs', 2));
const TRIOS = Number(val('trios', 24));
const HEROS = liste(val('heros', '4,10,16,22,28'));
const ENNEMIS = liste(val('ennemis', '1,10,20,30,40'));
const ARENES = liste(val('arenes', Object.keys(ENCOUNTERS).join(',')), String);
const SORTIE = val('sortie', 'art-sortie/power/calibration.json');
const PAR_NIVEAU = BALANCE.heros.power.parNiveau;

// ------------------------------------------------------------------ la ligne, d'après des mesures
/** Le niveau de heros a 50 % de victoires, interpole sur la grille mesuree (borne si la courbe ne traverse pas 50 %). */
function l50(taux, niveaux) {
  if (taux[0] >= 0.5) return niveaux[0];
  for (let i = 1; i < niveaux.length; i++) {
    if (taux[i] >= 0.5) return niveaux[i - 1] + (niveaux[i] - niveaux[i - 1]) * ((0.5 - taux[i - 1]) / (taux[i] - taux[i - 1] || 1));
  }
  return niveaux[niveaux.length - 1] + 1;
}
const interpole = (xs, ys, x) => {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * ((x - xs[i - 1]) / (xs[i] - xs[i - 1]));
  return ys[ys.length - 1];
};
/** Le niveau d'adversaire qui demande `cible` niveaux de heros (la courbe L50(n) de l'adversaire, inversee ; bornee a la grille). */
function niveauPourCible(ennemis, courbe, cible) {
  if (cible <= courbe[0]) return ennemis[0];
  for (let i = 1; i < ennemis.length; i++) {
    if (cible <= courbe[i]) return ennemis[i - 1] + (ennemis[i] - ennemis[i - 1]) * ((cible - courbe[i - 1]) / (courbe[i] - courbe[i - 1] || 1));
  }
  return ennemis[ennemis.length - 1];
}

function ecrisLigne(mesures) {
  const L = BALANCE.ligne;
  const arenes = Object.keys(mesures.l50);
  const total = L.tours * arenes.length;
  // Une courbe mesuree est bruitee : on la rend croissante (le niveau d'un adversaire ne le rend jamais plus facile).
  const courbes = Object.fromEntries(arenes.map(r => [r, mesures.l50[r].reduce((acc, x) => [...acc, Math.max(x, acc[acc.length - 1] ?? 0)], [])]));
  const lignes = [];
  let precedent = 0;
  for (let i = 0; i < total; i++) {
    const arene = arenes[i % arenes.length];
    // La rampe visee, jamais sous le combat d'avant : un boss qui demande plus que la rampe releve tout ce qui le suit.
    const cible = Math.max(precedent, L.heroDepart + ((L.heroFin - L.heroDepart) * i) / Math.max(1, total - 1));
    const niveau = Math.max(1, Math.min(BALANCE.arenes.niveauMax, Math.round(niveauPourCible(mesures.ennemis, courbes[arene], cible))));
    const reel = interpole(mesures.ennemis, courbes[arene], niveau);
    precedent = Math.max(precedent, reel);
    // Le Power requis ne baisse jamais d'un combat a l'autre : l'arrondi du niveau d'adversaire bouge la mesure de quelques pour cent.
    const puissance = Math.max(Math.round(PAR_NIVEAU * L.rang * reel), lignes.length ? lignes[lignes.length - 1].puissance : 0);
    lignes.push({ arene, niveau, puissance });
  }
  const corps = lignes.map(l => `  { arene: '${l.arene}', niveau: ${l.niveau}, puissance: ${l.puissance} }`).join(',\n');
  writeFileSync('game/src/config/ligne.js', `// LA LIGNE DE COMBATS, combat par combat (refonte boutique, lot 3, 3 nov. 2026) : l'adversaire, son NIVEAU, et le POWER REQUIS — celui
// d'un trio qui le bat une fois sur deux. GENERE par \`node scripts/calibre-power.mjs --ligne\` d'apres des parties jouees (voir
// docs/PLAN-REFONTE-BOUTIQUE.md) : les reglages de la rampe sont \`BALANCE.ligne\`. Une ligne vide retombe sur \`BALANCE.ligne\` seul.
export const LIGNE = [
${corps}
];
`);
  return lignes;
}

if (args.includes('--ligne')) {
  const m = JSON.parse(readFileSync(val('depuis', SORTIE), 'utf8'));
  const l = ecrisLigne(m);
  console.log(`${l.length} combats écrits dans game/src/config/ligne.js (niveau d'adversaire ${l[0].niveau} → ${l[l.length - 1].niveau}, Power requis ${l[0].puissance} → ${l[l.length - 1].puissance}).`);
  process.exit(0);
}

// ------------------------------------------------------------------ les mesures
let graine = 12345;
const hasard = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff; };
const ids = CHARACTERS.map(c => c.id);
const trios = [];
while (trios.length < TRIOS) {
  const t = [...ids].sort(() => hasard() - 0.5).slice(0, 3).sort();
  if (!trios.some(x => x.join() === t.join())) trios.push(t);
}

const taches = [];
for (const rencontre of ARENES) for (const arene of ENNEMIS) for (const niveau of HEROS) for (const equipe of trios) taches.push({ equipe, rencontre, niveau, arene, runs: RUNS });
console.log(`${ARENES.length} adversaires × ${ENNEMIS.length} niveaux × ${HEROS.length} niveaux de héros × ${TRIOS} trios × ${RUNS} parties = ${taches.length * RUNS} parties.`);

const gagnees = new Map(); // « rencontre|arene|niveau » -> [victoires, parties]
await enParallele(taches, new URL('./lib/taches-power.mjs', import.meta.url), {
  jobs: nombreDeJobs(), unite: 'cases',
  surResultat: (i, r) => {
    const t = taches[i];
    const k = `${t.rencontre}|${t.arene}|${t.niveau}`;
    const c = gagnees.get(k) ?? [0, 0];
    c[0] += r.win; c[1] += t.runs;
    gagnees.set(k, c);
  }
});

const sortie = { trios: TRIOS, runs: RUNS, heros: HEROS, ennemis: ENNEMIS, taux: {}, l50: {} };
console.log('\nNiveau de héros à 50 % de victoires (L50) ; Power requis = ' + `${PAR_NIVEAU} × 3 × L50`);
console.log(`adversaire`.padEnd(11) + ENNEMIS.map(n => `niv ${n}`.padStart(8)).join(''));
for (const r of ARENES) {
  sortie.taux[r] = ENNEMIS.map(a => HEROS.map(h => { const [w, n] = gagnees.get(`${r}|${a}|${h}`); return +(w / n).toFixed(3); }));
  sortie.l50[r] = sortie.taux[r].map(t => +l50(t, HEROS).toFixed(2));
  console.log(r.padEnd(11) + sortie.l50[r].map(x => x.toFixed(1).padStart(8)).join(''));
}
mkdirSync(dirname(SORTIE), { recursive: true });
writeFileSync(SORTIE, JSON.stringify(sortie));
console.log(`\nMesures écrites dans ${SORTIE}. Pour écrire la ligne : node scripts/calibre-power.mjs --ligne`);
void CHAR_BY_ID;
