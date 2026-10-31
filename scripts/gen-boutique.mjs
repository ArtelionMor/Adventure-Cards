// Recopie le noyau de la boutique (TypeScript, dépôt à part) en JS pur dans game/src/boutique/noyau/, et sa config dans
// donnees.js. Sans aucune dépendance : Node retire les types lui-même. Le jeu n'importe que ces fichiers générés.
//   node scripts/gen-boutique.mjs [dossier du noyau]
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const NOYAU = process.argv[2] ?? 'D:/tcg-card-tycoon_-marché-&-enchères/core';
const SORTIE = join(ICI, '..', 'game', 'src', 'boutique', 'noyau');

const FICHIERS = [
  'rng', 'context', 'state',
  ...['auction', 'bulk', 'buyers', 'gems', 'grading', 'heroUnlock', 'heroUpgrade', 'market', 'meta', 'packs', 'pricing', 'progression', 'rates', 'shop', 'showcase', 'tick']
    .map(n => `engines/${n}`)
];
const ENTETE = '// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.\n';

rmSync(SORTIE, { recursive: true, force: true });
mkdirSync(join(SORTIE, 'engines'), { recursive: true });
for (const f of FICHIERS) {
  const ts = readFileSync(join(NOYAU, 'src', `${f}.ts`), 'utf8');
  const js = stripTypeScriptTypes(ts, { mode: 'strip' }).replace(/from '(\.[^']*)\.ts'/g, "from '$1.js'");
  writeFileSync(join(SORTIE, `${f}.js`), ENTETE + js);
}

const { loadCatalog, loadConfig } = await import(pathToFileURL(join(NOYAU, 'src', 'load.ts')).href);
const config = loadConfig();
const cartes = loadCatalog(config);
writeFileSync(join(SORTIE, 'donnees.js'), `${ENTETE}export const CONFIG = ${JSON.stringify(config)};\nexport const CARTES = ${JSON.stringify(cartes)};\n`);
console.log(`${FICHIERS.length} modules et ${cartes.length} cartes dans game/src/boutique/noyau/`);
