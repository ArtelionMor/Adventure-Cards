// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Atelier de grading : prix fixe selon la rareté, note de 1 à 10 selon une loi normale.
// Le grading se fait sur une copie du stock. Casser une note coûte des gems et rend la copie
// non gradée : on repaie alors pour retenter le 10.

import { normal } from '../rng.js';
                                     
import { hasFeature } from '../state.js';
                                                                                  
import { spendGems } from './gems.js';

/** Loi normale arrondie, tronquée à 1..10 par rejet : pas d'empilement sur les bornes. */
export function drawGrade(rng     , cfg            )         {
  for (let i = 0; i < 256; i++) {
    const g = Math.round(normal(rng, cfg.grading.mean, cfg.grading.sd));
    if (g >= 1 && g <= 10) return g;
  }
  return Math.round(Math.min(10, Math.max(1, cfg.grading.mean)));
}

export function gradeCard(state           , id            , ctx     )                 {
  if (!hasFeature(state, ctx.cfg.grading.feature)) return { ok: false, reason: 'Atelier de grading pas encore débloqué.' };
  const inst = state.instances[id];
  if (!inst) return { ok: false, reason: 'Exemplaire inconnu.' };
  if (inst.location !== 'stock') return { ok: false, reason: 'Seule une copie du stock se grade.' };
  if (inst.grade !== null) return { ok: false, reason: 'Déjà gradée : il faut d’abord casser la note.' };
  const card = ctx.index.cardById.get(inst.cardId);
  const cost = card ? ctx.index.rarityById.get(card.rarity)?.gradingCost : undefined;
  if (cost === undefined) return { ok: false, reason: 'Rareté inconnue.' };
  if (state.gold < cost) return { ok: false, reason: 'Or insuffisant.' };
  state.gold -= cost;
  inst.grade = drawGrade(ctx.rng, ctx.cfg);
  return { ok: true, value: inst.grade };
}

export function breakGrade(state           , id            , ctx     )         {
  const inst = state.instances[id];
  if (!inst) return { ok: false, reason: 'Exemplaire inconnu.' };
  if (inst.location !== 'stock') return { ok: false, reason: 'Seule une copie du stock se casse.' };
  if (inst.grade === null) return { ok: false, reason: 'Cette copie n’est pas gradée.' };
  const paid = spendGems(state, ctx.cfg.grading.breakSink, ctx);
  if (!paid.ok) return paid;
  inst.grade = null;
  return { ok: true, value: undefined };
}
