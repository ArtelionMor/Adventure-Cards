// BANC DU PARTAGE — « tous les calculs se partagent, et ça doit rester vrai ».
//
// Un outil de mesure qui joue ses parties dans son coin ne profite ni des coeurs des
// renforts ni de la file commune, et RIEN NE LE DIT : le calcul marche, il est juste
// trois fois trop lent. C'est arrive a `analyse-cartes`, qui montait ses propres workers
// pendant que les PC regardaient. Ce banc ferme cette porte.
//
//   node scripts/test-partage.mjs
//
// Les quatre regles, et pourquoi :
//   1. un seul endroit fabrique des workers : scripts/lib/pool.mjs. Ailleurs, c'est une
//      parallelisation qui ne voit pas les renforts ;
//   2. un script qui JOUE DES PARTIES (il importe l'arene) passe par `enParallele` ;
//   3. ce qu'on donne a `enParallele` est un `scripts/lib/taches-<nom>.mjs` qui existe —
//      c'est ce qui le rend jouable par un renfort (la liste blanche est justement
//      celle-la, et l'empreinte du code les couvre tous) ;
//   4. un module de taches exporte `joue`, et son resultat voyage en JSON (il traverse un
//      postMessage, puis le reseau jusqu'a un PC) : ni Map, ni Set, ni fonction.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { modules, moduleConnu } from './lib/renforts.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const rouge = t => `\x1b[31m${t}\x1b[0m`;
const vert = t => `\x1b[32m${t}\x1b[0m`;

let passes = 0;
const echecs = [];
const verifie = (nom, ok, detail) => {
  if (ok) { passes++; return; }
  echecs.push(`${nom} — ${detail}`);
};

const lit = f => readFileSync(join(RACINE, f), 'utf8');
const scripts = readdirSync(join(RACINE, 'scripts')).filter(f => f.endsWith('.mjs'));

console.log('\n=== Le partage des calculs ===\n');

// --- 1. Les workers ne se fabriquent qu'a un seul endroit.
for (const f of [...scripts.map(f => `scripts/${f}`), ...readdirSync(join(RACINE, 'scripts', 'lib')).map(f => `scripts/lib/${f}`)]) {
  if (f === 'scripts/lib/pool.mjs' || f === 'scripts/lib/ouvrier.mjs') continue;
  verifie(`${f} ne fabrique pas de worker`, !/new Worker\s*\(/.test(lit(f)),
    'il monte ses propres workers : ils ne voient pas les renforts. Passer par enParallele() de lib/pool.mjs.');
}

// --- 2. Un script qui joue des parties passe par la file commune.
const JOUE = /from '\.\.\/game\/src\/tools\/arene\.js'/;
for (const f of scripts) {
  const src = lit(`scripts/${f}`);
  if (!JOUE.test(src)) continue;
  verifie(`scripts/${f} partage ses parties`, /enParallele\s*\(/.test(src),
    'il joue des parties sans passer par enParallele() : elles restent sur cette machine.');
}

// --- 3. Ce qu'on donne a enParallele est un module de taches reconnu par un renfort.
for (const f of scripts) {
  const src = lit(`scripts/${f}`);
  for (const m of src.matchAll(/enParallele\s*\([^,]+,\s*new URL\('([^']+)'/g)) {
    const nom = m[1].split('/').pop().replace(/\.mjs$/, '');
    verifie(`scripts/${f} → ${nom}`, moduleConnu(nom),
      `« ${m[1]} » n'est pas un scripts/lib/taches-*.mjs : un renfort refusera de le jouer.`);
  }
}

// --- 4. Chaque module de taches est jouable, et son resultat voyage en JSON.
for (const nom of modules()) {
  const m = await import(pathToFileURL(join(RACINE, 'scripts', 'lib', `${nom}.mjs`)).href);
  verifie(`${nom} exporte joue()`, typeof m.joue === 'function', 'un module de taches doit exporter joue(tache).');
  const src = lit(`scripts/lib/${nom}.mjs`);
  // Le resultat traverse un postMessage puis, pour un renfort, du JSON : une Map ou un
  // Set y arriveraient vides, sans une erreur — le calcul rendrait des chiffres faux.
  const rendu = /return\s*{[^}]*}/s.exec(src.slice(src.lastIndexOf('export function joue')));
  verifie(`${nom} rend du JSON`, !rendu || !/new (Map|Set)\b/.test(rendu[0]),
    'son resultat contient une Map ou un Set : ils ne survivent pas au voyage jusqu\'a un renfort.');
}

// --- Le bilan, comme les autres bancs.
for (const e of echecs) console.log(rouge('  ECHEC     ') + e);
if (!echecs.length) console.log(vert(`  Les ${modules().length} module(s) de taches et les ${scripts.length} script(s) partagent leurs calculs.`));
console.log(`\n${passes} test(s) passe(s), ${echecs.length} echec(s).\n`);
process.exit(echecs.length ? 1 : 0);
