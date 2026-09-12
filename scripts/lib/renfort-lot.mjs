// UN PAQUET DE TACHES pour scripts/renfort.mjs, dans son propre processus : le crochet du
// brouillon (scripts/lib/brouillon.mjs) y pointe vers les donnees recues, et chaque paquet
// repart d'un cache de modules neuf — deux calculs aux cartes differentes ne se melangent
// jamais. Il lit { module, contexte, taches } sur son entree, joue tout sur les coeurs de
// la machine, et ecrit une ligne JSON par tache ({ k, r }) sur sa sortie, dans l'ordre.
import { enParallele } from './pool.mjs';
import { moduleConnu } from './renforts.mjs';

let texte = '';
process.stdin.setEncoding('utf8');
for await (const bout of process.stdin) texte += bout;
const { module, contexte, taches } = JSON.parse(texte);
if (!moduleConnu(module)) throw new Error('module refusé : ' + module);

await enParallele(taches, new URL(`./${module}.mjs`, import.meta.url), {
  contexte,
  jobs: Number(process.env.ADVENTURE_RENFORT_JOBS) || undefined,
  renforts: false,   // un renfort ne sous-traite pas : pas de boucle entre machines
  surResultat: (k, r) => process.stdout.write(JSON.stringify({ k, r }) + '\n')
});
