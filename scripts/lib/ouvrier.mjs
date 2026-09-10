// UN OUVRIER de scripts/lib/pool.mjs : il charge le module de taches qu'on lui donne,
// le prepare une fois, puis joue chaque tache recue et renvoie son resultat. Il
// n'affiche rien — c'est le fil principal qui ecrit, dans l'ordre.
import { parentPort, workerData } from 'node:worker_threads';

const m = await import(workerData.module);
if (m.prepare) m.prepare(workerData.contexte);

parentPort.on('message', ({ i, tache, fin }) => {
  if (fin) process.exit(0);
  parentPort.postMessage({ i, r: m.joue(tache) });
});
parentPort.postMessage({ pret: true });
