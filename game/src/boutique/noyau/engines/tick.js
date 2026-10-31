// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Avance le temps, en ligne comme hors ligne. Le résultat ne dépend pas du découpage : un tick
// de 8 h et 480 ticks d'une minute donnent la même chose (heures de vente fixées d'avance, graine
// propre à chaque enchère).
// Aucune allocation tant que rien ne se conclut.

                                                  
import { settleAuctions } from './auction.js';
import { settleBulk } from './bulk.js';
import { settleGrading } from './grading.js';
import { settleMarket } from './market.js';
import { settleShowcase } from './showcase.js';

function produceBoosters(state           , dtMs        , ctx     )       {
  const { intervalMinutes, storageCap } = ctx.cfg.boosters;
  const b = state.boosters;
  // Stock plein : la production est à l'arrêt et son compteur reste à zéro.
  if (b.stock >= storageCap) {
    b.progressMs = 0;
    return;
  }
  const intervalMs = intervalMinutes * 60000;
  b.progressMs += dtMs;
  while (b.progressMs >= intervalMs && b.stock < storageCap) {
    b.progressMs -= intervalMs;
    b.stock++;
  }
  if (b.stock >= storageCap) b.progressMs = 0;
}

export function tick(state           , dtMs        , ctx     )       {
  if (dtMs <= 0) return;
  state.nowMs += dtMs;
  produceBoosters(state, dtMs, ctx);
  settleShowcase(state, ctx);
  settleAuctions(state, ctx);
  settleBulk(state, dtMs, ctx);
  settleMarket(state, ctx);
  settleGrading(state, ctx);
}
