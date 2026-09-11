// FAIRE JOUER UN SCRIPT SUR TOUS LES COEURS — ceux de cette machine, et ceux des renforts.
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
//
// LES RENFORTS (scripts/lib/renforts.mjs) : d'autres machines — les PC — puisent dans la
// MEME file, par paquets, en meme temps que les coeurs d'ici. Un paquet se taille sur les
// coeurs de la machine et rapetisse vers la fin, pour qu'aucune ne garde les dernieres
// cases pendant que les autres attendent. Si un renfort lache (eteint, endormi, code
// change), ce qu'il n'a pas rendu revient dans la file : c'est pour ca qu'un worker d'ici
// qui ne trouve plus rien a faire ATTEND au lieu de s'arreter, tant que des cases sont
// dehors.
import { cpus } from 'node:os';
import { Worker } from 'node:worker_threads';
import { progression, finProgression } from './progression.mjs';

const OUVRIER = new URL('./ouvrier.mjs', import.meta.url);
const ICI = 'cette machine';

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
 * Les renforts prets pour ce module de taches, avec ce qu'il faut leur envoyer. Aucun si
 * la liste est vide, si le module n'est pas de ceux qu'un renfort sait jouer, ou si les
 * donnees ne se lisent pas en JSON. Le bilan tient en une ligne de la sortie du calcul.
 */
async function renfortsPour(moduleUrl) {
  const module = String(moduleUrl).split('/').pop().replace(/\.mjs$/, '');
  const R = await import('./renforts.mjs');
  if (!R.MODULES.includes(module) || !R.machines().length) return [];
  const statuts = await R.statuts();
  const prets = statuts.filter(m => m.ok && m.coeurs > 0);
  const ecartes = statuts.filter(m => !m.ok).map(m => `${m.nom} (${m.pourquoi})`);
  if (!prets.length) { console.log(`  Renforts : aucun — ${ecartes.join(', ')}`); return []; }
  let donnees;
  try { donnees = R.donneesDuCalcul(); } catch (e) { console.log(`  Renforts : non, ${e.message}`); return []; }
  console.log(`  Renforts : ${prets.map(m => `${m.nom} (${m.coeurs} cœurs)`).join(', ')}`
    + (ecartes.length ? ` · écartés : ${ecartes.join(', ')}` : ''));
  const paquet = { module, empreinte: R.empreinte(), donnees };
  return prets.map(m => ({ ...m, paquet, joueLot: R.joueLot }));
}

/**
 * Joue `taches` avec le module `moduleUrl`, sur `jobs` workers (et les renforts), et rend
 * leurs resultats. `surResultat(i, r)` est appele DANS L'ORDRE des taches — un resultat
 * arrive en avance attend son tour — donc un script affiche ses lignes comme avant, juste
 * plus vite. `renforts: false` : cette machine seule (c'est ce que fait un renfort).
 */
export async function enParallele(taches, moduleUrl, { contexte = {}, jobs = nombreDeJobs(), surResultat = () => {}, unite = 'taches', renforts = true } = {}) {
  const total = taches.length;
  const resultats = new Array(total);
  const rendu = new Array(total).fill(false);
  const prets = new Set();
  const attentes = [];   // workers d'ici sans travail, en attente d'une case rendue ou de la fin
  let prochain = 0, faits = 0;

  /** Un resultat. Faux s'il etait deja la (un renfort cru perdu qui finit quand meme). */
  const recu = (i, r) => {
    if (rendu[i]) return false;
    rendu[i] = true;
    resultats[i] = r;
    prets.add(i);
    faits++;
    if (prets.has(prochain)) finProgression();   // on va ecrire : la ligne de progression s'efface
    while (prets.has(prochain)) { surResultat(prochain, resultats[prochain]); prets.delete(prochain); prochain++; }
    progression(faits, total, unite);
    if (faits === total) reveille();
    return true;
  };
  const reveille = () => { while (attentes.length) attentes.shift()(); };

  if (jobs <= 1 || total <= 1) {
    const m = await import(moduleUrl);
    if (m.prepare) m.prepare(contexte);
    for (let i = 0; i < total; i++) recu(i, m.joue(taches[i]));
    finProgression();
    return resultats;
  }

  // LA FILE : les taches pas encore donnees, et celles qu'un renfort a rendues sans les jouer.
  let suivante = 0;
  const rendues = [];
  const prend = () => (rendues.length ? rendues.pop() : suivante < total ? suivante++ : -1);
  const restantes = () => rendues.length + (total - suivante);

  const aides = renforts ? await renfortsPour(moduleUrl).catch(() => []) : [];
  const locaux = Math.min(jobs, total);
  const coeurs = locaux + aides.reduce((a, m) => a + m.coeurs, 0);
  const parMachine = new Map([[ICI, 0]]);
  const compte = nom => parMachine.set(nom, (parMachine.get(nom) || 0) + 1);
  const perdus = [];

  const ouvriers = Array.from({ length: locaux }, () => new Promise((ok, ko) => {
    const w = new Worker(OUVRIER, { workerData: { module: String(moduleUrl), contexte } });
    const donne = () => {
      if (faits === total) { w.postMessage({ fin: true }); return; }
      const i = prend();
      if (i < 0) { attentes.push(donne); return; }   // tout est distribue, mais des cases sont dehors
      w.postMessage({ i, tache: taches[i] });
    };
    w.on('message', m => { if (!m.pret && recu(m.i, m.r)) compte(ICI); donne(); });
    w.on('error', ko);
    w.on('exit', code => (code === 0 ? ok() : ko(new Error(`un worker s'est arrete (code ${code})`))));
  }));

  const renfort = async m => {
    while (faits < total) {
      // Sa part de ce qui reste, au prorata de ses coeurs, en deux fois : le paquet
      // rapetisse vers la fin. Au plus deux taches par coeur a la fois.
      const taille = Math.max(1, Math.min(m.coeurs * 2, Math.ceil(restantes() * m.coeurs / (coeurs * 2))));
      const lot = [];
      for (let k = 0; k < taille; k++) { const i = prend(); if (i < 0) break; lot.push(i); }
      if (!lot.length) return;
      const vus = new Set();
      try {
        await m.joueLot(m, { ...m.paquet, contexte, taches: lot.map(i => taches[i]) }, (k, r) => {
          vus.add(k);
          if (recu(lot[k], r)) compte(m.nom);
        });
      } catch (e) {
        rendues.push(...lot.filter((_, k) => !vus.has(k)));
        perdus.push(`${m.nom} (${e.message})`);
        reveille();
        return;   // on ne lui redonne rien pour ce calcul
      }
    }
  };

  await Promise.all([...ouvriers, ...aides.map(renfort)]);
  finProgression();
  if (aides.length) {
    console.log(`  Répartition : ${[...parMachine].map(([nom, n]) => `${nom} ${n}`).join(' · ')} ${unite}`
      + (perdus.length ? ` · perdu en route : ${perdus.join(', ')}` : ''));
  }
  return resultats;
}
