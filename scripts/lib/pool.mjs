// FAIRE JOUER UN SCRIPT SUR TOUS LES COEURS.
//
// Les cases d'une matrice, les combinaisons d'une courbe : des paquets de parties qui ne
// regardent aucun autre. On les donne a des workers, un par coeur, en FILE DE TRAVAIL :
// chacun redemande une tache des qu'il a fini la sienne. Une case coute de quelques
// secondes a une minute selon les decks — un decoupage fige d'avance laisserait des
// coeurs a attendre le dernier. C'est l'idee de builder/balance-worker.js, cote Node.
//
// Un worker ne recoit pas de camps tout faits (un deck « melange » est une fonction, et
// une fonction ne traverse pas un postMessage) : il importe un MODULE DE TACHES qui
// exporte `prepare(contexte)`, appele une fois, et `joue(tache)`, appele pour chaque
// tache — et il remonte ses camps lui-meme. Avec --jobs 1, le meme module tourne sans
// worker : memes chiffres, plus simple a deboguer.
//
// Les workers heritent des options de Node : le crochet du brouillon
// (scripts/lib/brouillon.mjs) les suit, ils mesurent donc les memes cartes.
import { cpus } from 'node:os';
import { Worker } from 'node:worker_threads';
import { progression, finProgression } from './progression.mjs';

const OUVRIER = new URL('./ouvrier.mjs', import.meta.url);

/**
 * Combien de workers : --jobs N, sinon UN PAR COEUR. Le fil principal ne fait qu'attendre
 * et afficher, il ne merite pas un coeur a lui — sur le Pi (4 coeurs), en laisser un au
 * repos couterait un quart du temps de calcul.
 */
export function nombreDeJobs(argv = process.argv) {
  const i = argv.indexOf('--jobs');
  const demande = i >= 0 ? Number(argv[i + 1]) : 0;
  return Math.max(1, Math.round(demande) || cpus().length);
}

/**
 * Joue `taches` avec le module `moduleUrl`, sur `jobs` workers, et rend leurs resultats.
 * `surResultat(i, r)` est appele DANS L'ORDRE des taches — un resultat arrive en avance
 * attend son tour — donc un script affiche ses lignes comme avant, juste plus vite.
 */
export async function enParallele(taches, moduleUrl, { contexte = {}, jobs = nombreDeJobs(), surResultat = () => {}, unite = 'taches' } = {}) {
  const total = taches.length;
  const resultats = new Array(total);
  const prets = new Set();
  let prochain = 0, faits = 0;

  const recu = (i, r) => {
    resultats[i] = r;
    prets.add(i);
    faits++;
    if (prets.has(prochain)) finProgression();   // on va ecrire : la ligne de progression s'efface
    while (prets.has(prochain)) { surResultat(prochain, resultats[prochain]); prets.delete(prochain); prochain++; }
    progression(faits, total, unite);
  };

  if (jobs <= 1 || total <= 1) {
    const m = await import(moduleUrl);
    if (m.prepare) m.prepare(contexte);
    for (let i = 0; i < total; i++) recu(i, m.joue(taches[i]));
    finProgression();
    return resultats;
  }

  let suivante = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, total) }, () => new Promise((ok, ko) => {
    const w = new Worker(OUVRIER, { workerData: { module: String(moduleUrl), contexte } });
    const donne = () => {
      if (suivante >= total) { w.postMessage({ fin: true }); return; }
      const i = suivante++;
      w.postMessage({ i, tache: taches[i] });
    };
    w.on('message', m => { if (!m.pret) recu(m.i, m.r); donne(); });
    w.on('error', ko);
    w.on('exit', code => (code === 0 ? ok() : ko(new Error(`un worker s'est arrete (code ${code})`))));
  })));
  finProgression();
  return resultats;
}
