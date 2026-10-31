// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Marché des cartes : des offres tournent à intervalle fixe (les mythiques, par défaut), le joueur
// peut les acheter. C'est la soupape du déblocage : une mythique qui ne sort pas s'achète.
// Seule une carte manquante s'achète : elle prend son emplacement de collection, donc elle ne se
// revend pas et ne se grade pas. Sinon, grader une mythique achetée puis la revendre rapporterait à
// coup sûr. Le prix dépasse en plus ce qu'une revente aux enchères rapporte (`validateConfig`).

import { Rng } from '../rng.js';
import { addCopy, hasFeature } from '../state.js';
                                                                           
import { maxBuyerMultiplier } from './buyers.js';
import { checkHeroUnlock } from './heroUnlock.js';
import { effectiveRef } from './pricing.js';

const scratch = new Rng(0);

function drawOffers(state           , ctx     )       {
  const { rarities, offersPerRefresh } = ctx.cfg.market;
  const offers = state.market.offers;
  offers.length = 0;
  const pool            = [];
  for (const c of ctx.index.cardById.values()) {
    if (rarities.includes(c.rarity) && state.progression.extensions.includes(c.extension)) pool.push(c);
  }
  scratch.state = state.market.rngState;
  for (let i = 0; i < offersPerRefresh && pool.length > 0; i++) {
    const [card] = pool.splice(scratch.int(pool.length), 1);
    if (card) offers.push(card.id);
  }
  state.market.rngState = scratch.state;
}

/** Renouvelle les offres échues, une par intervalle : le découpage des ticks ne change rien. */
export function settleMarket(state           , ctx     )       {
  const intervalMs = ctx.cfg.market.refreshHours * 3600000;
  while (state.nowMs >= state.market.nextRefreshMs) {
    drawOffers(state, ctx);
    state.market.nextRefreshMs += intervalMs;
  }
}

export function marketPrice(cardId        , state           , ctx     )         {
  const card = ctx.index.cardById.get(cardId);
  if (!card) throw new Error(`Carte inconnue : ${cardId}`);
  return Math.ceil(effectiveRef(card, state, ctx) * maxBuyerMultiplier(card, state, ctx) * ctx.cfg.market.buyMultiplier);
}

export function buyMarketCard(state           , cardId        , ctx     )                 {
  if (!hasFeature(state, ctx.cfg.market.feature)) return { ok: false, reason: 'Marché pas encore débloqué.' };
  if (state.collection[cardId] !== undefined) return { ok: false, reason: 'Le marché ne vend que des cartes manquantes.' };
  const i = state.market.offers.indexOf(cardId);
  if (i < 0) return { ok: false, reason: 'Cette carte n’est pas en vente.' };
  const price = marketPrice(cardId, state, ctx);
  if (state.gold < price) return { ok: false, reason: 'Or insuffisant.' };
  state.gold -= price;
  state.market.offers.splice(i, 1);
  addCopy(state, cardId, 'normal');
  const card = ctx.index.cardById.get(cardId);
  if (card) checkHeroUnlock(state, card.hero, ctx);
  return { ok: true, value: price };
}
