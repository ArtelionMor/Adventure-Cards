// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Acheteurs Timmy / Johnny / Spike : combien chacun valorise une carte, et lequel achète.
// Les tables de jeu augmentent la tolérance de tous, donc raccourcissent l'attente à prix égal.

                                     
                                                                                  
import { metaMultiplier } from './meta.js';
import { tableCount } from './shop.js';

export function tableTolerance(state           , ctx     )         {
  const { tableToleranceEach, tableToleranceMax } = ctx.cfg.buyers;
  return 1 + Math.min(tableToleranceMax, tableCount(state, ctx) * tableToleranceEach);
}

export function buyerMultiplier(buyer              , card         , state           , ctx     )         {
  const { cfg, index } = ctx;
  const rankMax = Math.max(1, cfg.rarities.length - 1);
  const rank = (index.rarityRank.get(card.rarity) ?? 0) / rankMax;
  const cost = index.maxCost > 0 ? (card.cost ?? 0) / index.maxCost : 0;
  const raw =
    1 +
    (buyer.archetypeAffinity[card.archetype] ?? 0) +
    buyer.highCost * cost +
    buyer.rarity * rank +
    buyer.metaAlignment * (metaMultiplier(card, state, ctx) - 1);
  const bounded = Math.min(cfg.buyers.maxMultiplier, Math.max(cfg.buyers.minMultiplier, raw));
  return bounded * tableTolerance(state, ctx);
}

/** L'acheteur qui valorise le plus la carte : c'est lui qui fixe `prix_ref_max`. */
export function maxBuyerMultiplier(card         , state           , ctx     )         {
  let best = 0;
  for (const b of ctx.cfg.buyers.profiles) best = Math.max(best, buyerMultiplier(b, card, state, ctx));
  return best;
}

/** Tire l'acheteur d'une vente, au prorata de son intérêt pour la carte. */
export function pickBuyer(rng     , card         , state           , ctx     )                 {
  const { profiles } = ctx.cfg.buyers;
  let total = 0;
  for (const b of profiles) total += b.spawnWeight * buyerMultiplier(b, card, state, ctx);
  let x = rng.next() * total;
  for (const b of profiles) {
    x -= b.spawnWeight * buyerMultiplier(b, card, state, ctx);
    if (x <= 0) return b.id;
  }
  return profiles[profiles.length - 1]?.id ?? null;
}
