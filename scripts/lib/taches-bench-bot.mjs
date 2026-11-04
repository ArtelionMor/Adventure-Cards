// UNE TACHE DU BANC DE FORCE DU BOT (scripts/bench-bot.mjs) : un lot de parties entre deux decks, ou le niveau d'IA A
// joue l'un et le niveau B l'autre. Jouable dans un worker de scripts/lib/pool.mjs ; le resultat est du JSON pur.
import { BALANCE } from '../../game/src/config/balance.js';
import { campMelange } from '../../game/src/tools/arene.js';
import { createBattle } from '../../game/src/combat/engine.js';
import { botAction } from '../../game/src/combat/ai.js';
import { joue as joueLeCoup } from '../../game/src/combat/journal.js';

let camps = [];
/** Fusion profonde (pour l'ablation : BENCH_SURCHARGE='{"lecture":{"timing":{"remplissage":0}}}' change BALANCE.ai le temps d'un essai ; les workers heritent de l'environnement). */
const fusionne = (cible, src) => { for (const [k, v] of Object.entries(src)) { if (v && typeof v === 'object' && !Array.isArray(v) && cible[k] && typeof cible[k] === 'object') fusionne(cible[k], v); else cible[k] = v; } };

export function prepare({ trios, niveau }) {
  if (process.env.BENCH_SURCHARGE) fusionne(BALANCE.ai, JSON.parse(process.env.BENCH_SURCHARGE));
  camps = trios.map(ids => campMelange(ids, niveau));
}

/** Une partie. `niveaux` = { p, e } : le niveau d'IA de chaque camp. Rend le vainqueur, les tours, le temps de decision. */
function partie(cfgP, cfgE, niveaux) {
  const B = createBattle(cfgP, cfgE, {});
  let decisions = 0, ms = 0, garde = 0;
  while (!B.over && garde++ < 4000) {
    const k = B.turn, niveau = niveaux[k];
    const t0 = performance.now();
    const a = botAction(B, k, niveau);
    ms += performance.now() - t0; decisions++;
    // Un coup refuse fait passer le tour (comme arene.js `duel`), sinon la boucle rejouerait le meme coup.
    if (!joueLeCoup(B, k, a, 'bot', niveau)) joueLeCoup(B, k, { type: 'end' }, 'bot', niveau);
  }
  return { winner: garde >= 4000 ? 'stuck' : B.winner, tours: B.turnNo, decisions, ms };
}

/**
 * `i` et `j` : les decks (indices de `trios`). `arr` 0 : A joue le deck i et B le deck j ; `arr` 1 : l'inverse.
 * Les parties alternent le camp qui commence. `niveauA` / `niveauB` : noms de BALANCE.ai.niveaux.
 */
export function joue({ i, j, arr, parties, niveauA, niveauB }) {
  const deckA = arr === 0 ? i : j, deckB = arr === 0 ? j : i;
  let victoiresA = 0, decisives = 0, tours = 0, decisions = 0, ms = 0;
  for (let g = 0; g < parties; g++) {
    const aCommence = g % 2 === 0;
    const A = camps[deckA], Bc = camps[deckB];
    const cA = typeof A === 'function' ? A() : A, cB = typeof Bc === 'function' ? Bc() : Bc;
    const r = aCommence ? partie(cA, cB, { p: niveauA, e: niveauB }) : partie(cB, cA, { p: niveauB, e: niveauA });
    tours += r.tours; decisions += r.decisions; ms += r.ms;
    if (r.winner !== 'p' && r.winner !== 'e') continue;
    decisives++;
    if ((r.winner === 'p') === aCommence) victoiresA++;
  }
  return { i, j, arr, parties, victoiresA, decisives, tours, decisions, ms };
}
