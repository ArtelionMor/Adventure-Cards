// UNE CASE DE LA MATRICE deck contre deck (scripts/matchups.mjs), jouable dans un
// worker de scripts/lib/pool.mjs.
//
// Un deck voyage sous forme de RECETTE (« dog et cat, niveau 5, melange ») et non de
// camp : un deck melange est une fabrique, et une fonction ne traverse pas un
// postMessage. Meme principe, et memes fonctions d'arene, que builder/balance-worker.js.
import { campPerso, campMelange, campPnj, serie } from '../../game/src/tools/arene.js';

/** Le camp decrit par une recette. Le script principal s'en sert aussi, pour les noms.
 *  `hasard` (une liste d'ids) ajoute UN heros de plus, tire au sort a chaque partie : la
 *  recette devient une fabrique, comme un deck melange, et le taux est la moyenne sur
 *  tous les coequipiers possibles (`--archetypes`). */
export function camp(r) {
  if (r.hasard && r.hasard.length) {
    return () => {
      const c = camp({ ...r, ids: [...r.ids, r.hasard[Math.floor(Math.random() * r.hasard.length)]], hasard: null });
      return typeof c === 'function' ? c() : c;
    };
  }
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
