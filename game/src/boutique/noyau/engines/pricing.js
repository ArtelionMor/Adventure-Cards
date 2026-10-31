// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Prix calculés. Une carte a un prix de référence par rareté, déplacé par la méta et borné par
// [priceFloor, priceCeil]. Foil et note s'appliquent ensuite et font exploser le prix, c'est voulu :
// ils se multiplient, la synergie foil × note s'y ajoute, et `variantPower` amplifie le tout sur les
// hautes raretés. Une mythique foil gradée 10 est très très chère. `refMax` ajoute l'acheteur qui valorise le plus la carte.
//
// Vitrine et enchères partent de ce même `refMax` : avec deux références différentes, l'inégalité
// 1 + (c − 1) × G(T) > r_max ne dirait plus rien (une prime d'acheteur de 2 % casserait déjà 1 h).

                                                                                                                          
import { buyerMultiplier, maxBuyerMultiplier } from './buyers.js';
import { metaMultiplier } from './meta.js';

export function effectiveRef(card         , state           , ctx     )         {
  const r = ctx.index.rarityById.get(card.rarity);
  if (!r) throw new Error(`Rareté inconnue : ${card.rarity}`);
  const moved = r.priceRef * metaMultiplier(card, state, ctx);
  return Math.min(r.priceCeil, Math.max(r.priceFloor, moved));
}

export function instanceRef(inst                                                            , state           , ctx     )         {
  const card = ctx.index.cardById.get(inst.cardId);
  if (!card) throw new Error(`Carte inconnue : ${inst.cardId}`);
  const { foil, grading } = ctx.cfg;
  let variant = 1;
  if (inst.finish === 'foil') variant *= foil.priceMultiplier;
  if (inst.grade !== null) {
    variant *= (grading.multipliers[inst.grade - 1] ?? 1) * (grading.companies.find((c) => c.id === inst.slab?.company)?.noteValue ?? 1);
    if (inst.finish === 'foil') variant *= foil.gradeSynergy[inst.grade - 1] ?? 1;
  }
  const power = ctx.index.rarityById.get(card.rarity)?.variantPower ?? 1;
  return effectiveRef(card, state, ctx) * Math.pow(variant, power);
}

export function instanceRefMax(inst              , state           , ctx     )         {
  const card = ctx.index.cardById.get(inst.cardId);
  if (!card) throw new Error(`Carte inconnue : ${inst.cardId}`);
  return instanceRef(inst, state, ctx) * maxBuyerMultiplier(card, state, ctx);
}

/** Copie du stock qui vaut plus que l'occupant de l'emplacement : l'UI propose l'échange en un geste. */
export function betterCopyFor(cardId        , state           , ctx     )                    {
  const occupantId = state.collection[cardId];
  const occupant = occupantId === undefined ? undefined : state.instances[occupantId];
  if (!occupant) return null;
  let best                    = null;
  let bestValue = instanceRef(occupant, state, ctx);
  for (const key in state.instances) {
    const inst = state.instances[key];
    if (!inst || inst.cardId !== cardId || inst.location !== 'stock') continue;
    const value = instanceRef(inst, state, ctx);
    if (value > bestValue) {
      best = inst.id;
      bestValue = value;
    }
  }
  return best;
}

/**
 * Ce qu'un client pense d'un prix : il compare le prix à ce que la carte vaut pour lui. Trop cher sur une carte de bas de
 * l'échelle, il dit qu'elle n'est pas assez rare pour ça. Ce n'est qu'un avis : l'attente, elle, dépend du prix seul.
 */
export function buyerReaction(buyer              , inst              , price        , state           , ctx     )                {
  const card = ctx.index.cardById.get(inst.cardId);
  if (!card) throw new Error(`Carte inconnue : ${inst.cardId}`);
  const { bonneAffaire, tropCher, pasAssezRareRangMax } = ctx.cfg.buyers.reactions;
  const ratio = price / (instanceRef(inst, state, ctx) * buyerMultiplier(buyer, card, state, ctx));
  if (ratio <= bonneAffaire) return 'bonneAffaire';
  if (ratio < tropCher) return 'bonPrix';
  return (ctx.index.rarityRank.get(card.rarity) ?? 0) <= pasAssezRareRangMax && inst.finish === 'normal' && inst.grade === null ? 'pasAssezRare' : 'tropCher';
}
