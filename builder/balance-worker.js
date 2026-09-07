// UN OUVRIER DE LA MATRICE. Les cases d'un tableau de matchups sont independantes :
// chacune est un paquet de parties qui ne regarde aucune autre. On en donne donc une
// tranche a chaque coeur, et la page ne fait plus que ramasser les resultats.
//
// Ce worker ne recoit PAS de camps tout faits : `campMelange` rend une fabrique (une
// fonction), et une fonction ne traverse pas un `postMessage`. Il recoit la RECETTE
// (« le personnage dog, niveau 5, cote switch ») et remonte le camp lui-meme, avec les
// memes fonctions d'arene que la page — donc exactement les memes chiffres.
import { campPerso, campMelange, campPnj, serie } from '../game/src/tools/arene.js';

/** Le camp decrit par une recette, reconstruit avec les donnees recues. */
function camp(r, db) {
  if (r.type === 'pnj') return campPnj(r.id, db);
  if (r.type === 'mix') return campMelange([r.id], r.niveau, db);
  return campPerso([r.id], r.niveau, r.type === 'switch' ? 'switches' : 'cards', db);
}

self.onmessage = ({ data }) => {
  const { db, recettes, cellules, runs, bot } = data;
  // Les camps sont montes une fois pour toutes : une case n'a plus qu'a jouer.
  const camps = recettes.map(r => camp(r, db));
  for (const [i, j] of cellules) {
    const r = serie(camps[i], camps[j], runs, { bot });
    self.postMessage({ i, j, r });
  }
  self.postMessage({ fini: true });
};
