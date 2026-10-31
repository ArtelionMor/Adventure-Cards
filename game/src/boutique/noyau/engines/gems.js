// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Gems (hard currency) : tout puits passe par ici et se déclare en config (`gems.sinks`).
// TODO(design) : autres puits que le re-roll de grading.

                                                          

export function spendGems(state           , sink        , ctx     )                 {
  const def = ctx.cfg.gems.sinks[sink];
  if (!def) return { ok: false, reason: `Puits de gems inconnu : ${sink}.` };
  if (state.gems < def.cost) return { ok: false, reason: 'Gems insuffisants.' };
  state.gems -= def.cost;
  return { ok: true, value: def.cost };
}
