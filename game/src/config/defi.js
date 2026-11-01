// Le DEFI d'un client de la boutique : l'equipe qu'il aligne. Pas de regle de combat ici, seulement le tirage.
//   - autant de heros que le joueur (ses places, au plus ses heros possedes) ;
//   - des heros AU HASARD (pas ceux du joueur) ;
//   - un niveau TOTAL egal a la meilleure combinaison du joueur : la somme de ses N plus hauts niveaux
//     (trois places, des heros niveau 20, 15, 10, 4, 1 : 20 + 15 + 10 = 45), reparti au hasard entre ses heros.
import { CHARACTERS, niveauMax } from './characters.js';

/** La meilleure somme de `n` niveaux parmi ceux du joueur. */
export const totalDuJoueur = (niveaux, n) => [...niveaux].sort((a, b) => b - a).slice(0, n).reduce((a, b) => a + b, 0);

/** `{ total, heros: [{ id, niveau }] }` ; `hasard` rend un nombre dans [0, 1[ (Math.random, ou un tirage graine pour un test). */
export function equipeDefi(niveaux, n, hasard = Math.random) {
  const pool = [...CHARACTERS];
  const heros = [];
  for (let i = 0; i < Math.max(1, n) && pool.length; i++) heros.push({ id: pool.splice(Math.floor(hasard() * pool.length), 1)[0].id, niveau: 1 });
  let reste = Math.max(totalDuJoueur(niveaux, n), heros.length) - heros.length;
  const total = reste + heros.length;
  while (reste > 0) {
    const ouverts = heros.filter(h => h.niveau < niveauMax(CHARACTERS.find(c => c.id === h.id)));
    if (!ouverts.length) break;
    ouverts[Math.floor(hasard() * ouverts.length)].niveau++;
    reste--;
  }
  return { total, heros };
}
