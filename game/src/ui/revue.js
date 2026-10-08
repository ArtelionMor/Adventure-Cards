// REVOIR UN COMBAT. Le journal graphique (ui/journal.js) sur un combat DEJA FINI, garde par
// ui/combats.js : tout y est lisible — y compris ce que l'adversaire avait en main, puisqu'il n'y a
// plus rien a cacher. On y arrive depuis l'ecran de resultat et depuis le Sac.
import { $, el } from './shell.js';
import { creeJournal } from './journal.js';
import { chargeCombat } from './combats.js';

/** Ouvre le recit du combat `id`. Rend false s'il n'est plus garde. */
export function ouvreRevue(id) {
  const c = chargeCombat(id);
  if (!c) return false;
  const fond = el('<div class="revue"></div>');
  const gagne = c.gagnant === 'p';
  const j = creeJournal({
    evts: () => c.evts,
    heros: { p: { sprite: c.heros && c.heros.p }, e: { sprite: c.heros && c.heros.e } },
    revele: true,
    titre: `${c.nom} · ${gagne ? 'victoire' : c.gagnant === 'draw' ? 'match nul' : 'défaite'}`,
    onFerme: () => fond.remove()
  });
  fond.appendChild(j.n);
  $('#app').appendChild(fond);
  j.ouvre();
  return true;
}
