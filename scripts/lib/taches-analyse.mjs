// UNE PART DES PARTIES de « ce que le bot a prefere » (scripts/analyse-cartes.mjs),
// jouable dans un worker de scripts/lib/pool.mjs — donc aussi par un renfort.
//
// Une partie ne depend d'aucune autre, et le depouillement n'est QUE DES COMPTEURS :
// combien de fois une carte etait jouable, combien de fois jouee, ce qu'on lui a prefere.
// Des sommes se recollent sans rien perdre, d'ou une tache = un paquet de parties, et le
// total = la somme des paquets. C'est ce qui rend l'outil partageable entre machines.
//
// Le camp voyage sous forme de RECETTE (« dog, niveau 5, base » et « wolf »), comme dans
// taches-matchups : on remonte les camps ici, chez celui qui joue.
import { campPerso, campPnj, duel } from '../../game/src/tools/arene.js';
import { ecouteLesChoix } from '../../game/src/combat/ai.js';

let joueur = null, adverse = null, reglageBot = null, avecLogs = false;
let etat = compteursNeufs();

function compteursNeufs() {
  return { victoires: 0, nulles: 0, decisions: 0, avecChoix: 0, lignes: [], cartes: new Map() };
}

const fiche = nom => {
  if (!etat.cartes.has(nom)) etat.cartes.set(nom, {
    nom, propose: 0, joue: 0, sommeValeur: 0, nValeur: 0, sommeEcart: 0, nEcart: 0, prefereA: new Map()
  });
  return etat.cartes.get(nom);
};

const pc = x => Math.round(x * 100) + '%';

/** Le mouchard du bot : il note CHAQUE decision ou une carte etait jouable. */
function ecoute(d) {
  etat.decisions++;
  // « attaquer ou passer » ne dit rien sur le deck : seules les decisions ou une CARTE
  // etait jouable nous interessent.
  const jouables = d.candidats.filter(c => c.quoi === 'carte');
  if (!jouables.length) return;
  etat.avecChoix++;

  const meilleur = d.candidats.reduce((a, b) => ((b.victoires ?? -1) > (a.victoires ?? -1) ? b : a), d.candidats[0]);
  for (const c of jouables) {
    const f = fiche(c.nom);
    f.propose++;
    if (c.valeur !== undefined) { f.sommeValeur += c.valeur; f.nValeur++; }
    // L'ECART AU MEILLEUR COUP, en points de victoire : le seul chiffre du Monte-Carlo
    // qui parle de la CARTE (le taux brut dit surtout si la position etait gagnante).
    if (c.victoires !== undefined && meilleur.victoires !== undefined) {
      f.sommeEcart += meilleur.victoires - c.victoires;
      f.nEcart++;
    }
    if (c.nom === d.choisi.nom) f.joue++;
    else f.prefereA.set(d.choisi.nom, (f.prefereA.get(d.choisi.nom) || 0) + 1);   // ce qu'on lui a prefere
  }

  if (avecLogs) {
    const dit = c => `${c.nom}${c.victoires === undefined ? '' : ` ${pc(c.victoires)}`}${c.valeur === undefined ? '' : ` (valeur ${c.valeur})`}`;
    const autres = d.candidats.filter(c => c !== d.choisi).map(dit).join(', ');
    etat.lignes.push(`T${d.tour} ${d.nom} — joue ${dit(d.choisi)}   devant : ${autres || '(rien d’autre)'}`);
  }
}

export function prepare({ persos, niveau, cote, pnj, bot, logs }) {
  joueur = campPerso(persos, niveau, cote);
  adverse = campPnj(pnj);
  reglageBot = bot;
  avecLogs = !!logs;
  ecouteLesChoix(ecoute);
}

/** Le nom des camps, pour l'en-tete du script principal (il ne monte pas de camp lui-meme). */
export const noms = () => ({ joueur: joueur && joueur.name, adverse: adverse && adverse.name });

/**
 * `n` parties, `depart` decalant qui commence — l'avantage du premier tour est reel, et
 * il fausserait les preferences si un seul camp en profitait. Rend des compteurs bruts,
 * donc additionnables tels quels (et transportables en JSON jusqu'a un renfort).
 */
export function joue({ n = 1, depart = 0 }) {
  etat = compteursNeufs();
  for (let i = 0; i < n; i++) {
    const joueurCommence = (depart + i) % 2 === 0;
    const { winner } = joueurCommence
      ? duel(joueur, adverse, { bot: reglageBot })
      : duel(adverse, joueur, { bot: reglageBot });
    if (winner === 'draw' || winner === 'stuck') etat.nulles++;
    else if (joueurCommence ? winner === 'p' : winner === 'e') etat.victoires++;
  }
  return { ...etat, cartes: [...etat.cartes.values()].map(f => ({ ...f, prefereA: [...f.prefereA.entries()] })) };
}
