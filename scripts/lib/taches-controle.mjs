// UNE PAIRE DE DECKS jouee pour le controle des decks (scripts/check-decks.mjs), dans un
// worker de scripts/lib/pool.mjs — donc aussi chez un renfort.
//
// La passe dynamique de l'outil cherche ce qui ne se produit JAMAIS : une carte qu'aucun
// mana ne peut payer, un moment ecrit qui ne part pas. Chaque paire se joue seule, et ce
// qu'on en retient — des comptages par carte, l'ensemble des moments declenches — se
// recolle par une somme et une union. D'ou une tache = une paire.
//
// Le camp voyage sous forme de RECETTE (campPerso / campPnj ne traversent pas un
// postMessage), exactement comme dans taches-matchups.
import { campPerso, campPnj, duel } from '../../game/src/tools/arene.js';

let camps = [], parties = 1;

/** Le camp decrit par une recette. Le script principal s'en sert aussi, pour les noms. */
export function camp(r) {
  return r.type === 'pnj' ? campPnj(r.id) : campPerso([r.id], r.niveau, r.cote);
}

export function prepare({ recettes, partiesParPaire }) {
  camps = recettes.map(camp);
  parties = partiesParPaire;
}

/** Les parties d'une paire, et ce qu'elles ont fait sortir. */
export function joue({ i, j }) {
  const jouees = new Map();     // nom de carte -> combien de fois posee
  const piochees = new Map();   // nom de carte -> combien de fois vue en main
  const declenches = new Set(); // moments qui sont vraiment partis
  const compte = (m, nom) => m.set(nom, (m.get(nom) || 0) + 1);
  let n = 0, bloquees = 0, tours = 0, nulles = 0;

  for (let k = 0; k < parties; k++) {
    const { winner, B } = duel(camps[i], camps[j]);
    n++;
    tours += B.turnNo;
    if (winner === 'stuck') bloquees++;
    if (winner === 'draw') nulles++;
    for (const c of ['p', 'e']) {
      // Une carte posee est soit a la defausse (sort joue, allie mort), soit sur le
      // plateau (allie encore en vie, sa carte voyage avec l'unite).
      const posees = [...B[c].discard, ...B[c].board.map(u => u.card).filter(Boolean)];
      for (const x of posees) { compte(jouees, x.name); compte(piochees, x.name); }
      for (const x of B[c].hand) compte(piochees, x.name);
    }
    for (const slot of Object.keys(B.fired)) declenches.add(slot);
  }
  // Des tableaux, pas des Map ni des Set : ce resultat passe par un postMessage et, pour
  // un renfort, par du JSON.
  return { parties: n, bloquees, tours, nulles, jouees: [...jouees], piochees: [...piochees], declenches: [...declenches] };
}
