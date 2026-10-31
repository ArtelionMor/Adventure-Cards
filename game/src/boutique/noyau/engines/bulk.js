// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Boîte de bulk : les doubles dont le prix ne justifie ni vitrine ni enchère. Elle se vide toute
// seule, au prix de référence de chaque carte, à un rythme fixe par heure (`bulk.salesPerHour`),
// dans l'ordre d'arrivée, en ligne comme hors ligne. Boîte vide : le compteur reste à zéro.

import { checkSellable, removeInstance } from '../state.js';
                                                                      
import { instanceRef } from './pricing.js';

export function sendToBulk(state           , id            )         {
  const sellable = checkSellable(state, id);
  if (!sellable.ok) return sellable;
  (state.instances[id]                        ).location = 'bulk';
  state.bulkBox.push({ instanceId: id, addedAtMs: state.nowMs });
  return { ok: true, value: undefined };
}

export function setBulkFilter(state           , threshold        )       {
  state.settings.bulkFilterThreshold = Math.max(0, threshold);
}

/** Le filtre d'ouverture laisse les foils de côté, sauf si le joueur le demande. Le geste manuel les accepte. */
export function setBulkFilterProtectsVariants(state           , protect         )       {
  state.settings.bulkFilterProtectVariants = protect;
}

/** Temps restant pour vider la boîte, en heures (estimation pour l'UI). */
export function bulkClearHours(state           , ctx     )         {
  return state.bulkBox.length / ctx.cfg.bulk.salesPerHour;
}

export function settleBulk(state           , dtMs        , ctx     )       {
  const box = state.bulkBox;
  if (box.length === 0) {
    state.bulkProgressMs = 0;
    return;
  }
  const intervalMs = 3600000 / ctx.cfg.bulk.salesPerHour;
  state.bulkProgressMs += dtMs;
  let sold = 0;
  while (state.bulkProgressMs >= intervalMs && sold < box.length) {
    state.bulkProgressMs -= intervalMs;
    const entry = box[sold++];
    const inst = entry ? state.instances[entry.instanceId] : undefined;
    if (!entry || !inst) continue;
    const ref = instanceRef(inst, state, ctx);
    const price = Math.round(ref);
    state.gold += price;
    const waitMs = state.nowMs - state.bulkProgressMs - entry.addedAtMs;
    ctx.on?.({ t: 'sale', channel: 'bulk', kind: 'card', cardId: inst.cardId, price, ref, waitMs, buyer: null });
    removeInstance(state, entry.instanceId);
  }
  if (sold > 0) box.splice(0, sold);
  if (box.length === 0) state.bulkProgressMs = 0;
}
