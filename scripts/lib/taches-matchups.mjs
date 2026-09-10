// UNE CASE DE LA MATRICE deck contre deck (scripts/matchups.mjs), jouable dans un
// worker de scripts/lib/pool.mjs.
//
// Un deck voyage sous forme de RECETTE (« dog et cat, niveau 5, melange ») et non de
// camp : un deck melange est une fabrique, et une fonction ne traverse pas un
// postMessage. Meme principe, et memes fonctions d'arene, que builder/balance-worker.js.
import { campPerso, campMelange, campPnj, serie } from '../../game/src/tools/arene.js';

/** Le camp decrit par une recette. Le script principal s'en sert aussi, pour les noms. */
export function camp(r) {
  if (r.type === 'pnj') return campPnj(r.ids[0]);
  if (r.type === 'mix') return campMelange(r.ids, r.niveau);
  return campPerso(r.ids, r.niveau, r.type === 'switch' ? 'switches' : 'cards');
}

let camps = [];

export function prepare({ recettes }) {
  camps = recettes.map(camp);
}

/** Les parties d'une case, la moitie dans chaque sens (voir `serie`). */
export function joue({ i, j, parties, bot }) {
  return serie(camps[i], camps[j], parties, { bot });
}
