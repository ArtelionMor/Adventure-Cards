// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Enchères d'achat : des lots sortent à intervalle fixe, chacun avec sa limite de temps. On s'y place en payant sa mise ; des
// concurrents la challengent, et celui qui se fait passer devant récupère sa mise tout de suite. À la fin, le dernier en tête
// reçoit la carte. C'est la soupape du déblocage : une carte qui ne sort pas se gagne ici.
// Chaque lot a sa graine et ses concurrents agissent à des heures fixées d'avance : le découpage des ticks ne change rien.
// Seule une carte manquante se gagne : elle prend son emplacement de collection, donc elle ne se revend pas et ne se grade pas.
// Sinon, grader une carte gagnée puis la revendre rapporterait à coup sûr (`validateConfig` borne aussi le plafond des concurrents).

import { Rng } from '../rng.js';
import { addCopy, hasFeature } from '../state.js';
                                                                                      
import { maxBuyerMultiplier } from './buyers.js';
import { checkHeroUnlock } from './heroUnlock.js';
import { effectiveRef } from './pricing.js';

const scratch = new Rng(0);
const MIN = 60000;

/** Le prix plafond d'une carte : le plus que des concurrents puissent y mettre. */
export function marketPrice(cardId        , state           , ctx     )         {
  const card = ctx.index.cardById.get(cardId);
  if (!card) throw new Error(`Carte inconnue : ${cardId}`);
  return Math.ceil(effectiveRef(card, state, ctx) * maxBuyerMultiplier(card, state, ctx) * ctx.cfg.market.buyMultiplier);
}

/** La prochaine mise possible : le prix d'ouverture tant que personne n'a misé, un cran au-dessus ensuite. */
export function nextBid(lot           , ctx     )         {
  if (lot.holder === null) return lot.price;
  return Math.max(lot.price + 1, Math.ceil(lot.price * (1 + ctx.cfg.market.lot.incrementFraction)));
}

function delay([min, max]                  )         {
  return Math.round((min + scratch.next() * (max - min)) * MIN);
}

function openLot(state           , card         , at        , ctx     )       {
  const { lot: c } = ctx.cfg.market;
  const top = marketPrice(card.id, state, ctx);
  const hours = c.durationsHours[scratch.int(c.durationsHours.length)] ?? 1;
  const maxRival = Math.ceil(top * (c.rivalMaxMin + scratch.next() * (c.rivalMaxMax - c.rivalMaxMin)));
  const nextRivalMs = at + delay(c.rivalDelayMinutes);
  const rival = scratch.int(1000);
  state.market.lots.push({
    id: state.market.nextLotId++,
    cardId: card.id,
    price: Math.max(1, Math.ceil(top * c.startFraction)),
    holder: null,
    stake: 0,
    rival,
    maxRival,
    nextRivalMs,
    endMs: at + hours * 3600000,
    engaged: false,
    warned: false,
    rngState: scratch.nextU32(),
  });
}

function drawLots(state           , at        , ctx     )       {
  const { rarities, offersPerRefresh } = ctx.cfg.market;
  const pool            = [];
  for (const c of ctx.index.cardById.values()) {
    if (!rarities.includes(c.rarity) || !state.progression.extensions.includes(c.extension)) continue;
    if (state.collection[c.id] === undefined && !state.market.lots.some((l) => l.cardId === c.id)) pool.push(c);
  }
  scratch.state = state.market.rngState;
  for (let i = 0; i < offersPerRefresh && pool.length > 0; i++) {
    const [card] = pool.splice(scratch.int(pool.length), 1);
    if (card) openLot(state, card, at, ctx);
  }
  state.market.rngState = scratch.state;
}

// Un concurrent agit : il monte d'un cran s'il en a encore les moyens, sinon il abandonne. Passé devant, le joueur est remboursé.
function rivalActs(state           , lot           , at        , ctx     )       {
  const price = nextBid(lot, ctx);
  if (price > lot.maxRival) {
    lot.nextRivalMs = null;
    return;
  }
  scratch.state = lot.rngState;
  if (lot.holder === 'player') {
    state.gold += lot.stake;
    ctx.on?.({ t: 'auctionOutbid', lotId: lot.id, cardId: lot.cardId, price, refund: lot.stake });
    lot.stake = 0;
  }
  lot.price = price;
  lot.holder = 'rival';
  lot.rival = scratch.int(1000);
  lot.nextRivalMs = at + delay(ctx.cfg.market.lot.rivalDelayMinutes);
  lot.rngState = scratch.state;
}

function closeLot(state           , lot           , ctx     )       {
  if (lot.holder !== 'player') {
    if (lot.engaged) ctx.on?.({ t: 'auctionLost', cardId: lot.cardId, price: lot.price });
    return;
  }
  // La carte est sortie d'un booster entre-temps : un exemplaire gagné ne doit pas pouvoir se revendre, la mise revient.
  if (state.collection[lot.cardId] !== undefined) {
    state.gold += lot.stake;
    ctx.on?.({ t: 'auctionLost', cardId: lot.cardId, price: lot.price });
    return;
  }
  addCopy(state, lot.cardId, 'normal');
  const card = ctx.index.cardById.get(lot.cardId);
  if (card) checkHeroUnlock(state, card.hero, ctx);
  ctx.on?.({ t: 'auctionWon', cardId: lot.cardId, price: lot.price });
}

/** Les lots, tels qu'ils sont à l'instant `at`. */
function settleLots(state           , at        , ctx     )       {
  const { lots } = state.market;
  const warnMs = ctx.cfg.market.lot.warnMinutes * MIN;
  for (let i = lots.length - 1; i >= 0; i--) {
    const lot = lots[i];
    if (!lot) continue;
    while (lot.nextRivalMs !== null && lot.nextRivalMs <= Math.min(at, lot.endMs)) rivalActs(state, lot, lot.nextRivalMs, ctx);
    if (at >= lot.endMs) {
      closeLot(state, lot, ctx);
      lots.splice(i, 1);
    } else if (lot.engaged && !lot.warned && lot.endMs - at <= warnMs) {
      lot.warned = true;
      ctx.on?.({ t: 'auctionEnding', lotId: lot.id, cardId: lot.cardId, holder: lot.holder === 'player' });
    }
  }
}

/** Rejoue le marché dans l'ordre : chaque tirage sort à son heure, même après une longue absence. */
export function settleMarket(state           , ctx     )       {
  const intervalMs = ctx.cfg.market.refreshHours * 3600000;
  while (state.nowMs >= state.market.nextRefreshMs) {
    const at = state.market.nextRefreshMs;
    settleLots(state, at, ctx);
    drawLots(state, at, ctx);
    state.market.nextRefreshMs += intervalMs;
  }
  settleLots(state, state.nowMs, ctx);
}

/** Se placer sur un lot : la mise est payée tout de suite et revient si un concurrent passe devant. */
export function placeBid(state           , lotId        , ctx     )                 {
  const { lot: c, feature } = ctx.cfg.market;
  if (!hasFeature(state, feature)) return { ok: false, reason: 'Enchères pas encore débloquées.' };
  const lot = state.market.lots.find((l) => l.id === lotId);
  if (!lot || state.nowMs >= lot.endMs) return { ok: false, reason: 'Cette enchère est terminée.' };
  if (lot.holder === 'player') return { ok: false, reason: 'Tu es déjà en tête.' };
  if (state.collection[lot.cardId] !== undefined) return { ok: false, reason: 'Tu as déjà cette carte.' };
  const price = nextBid(lot, ctx);
  if (state.gold < price) return { ok: false, reason: 'Or insuffisant.' };
  state.gold -= price;
  lot.price = price;
  lot.stake = price;
  lot.holder = 'player';
  lot.engaged = true;
  // Un concurrent qui a encore les moyens répond ; une mise de dernière minute prolonge le lot pour lui en laisser le temps.
  scratch.state = lot.rngState;
  lot.nextRivalMs = nextBid(lot, ctx) <= lot.maxRival ? state.nowMs + delay(c.reactionMinutes) : null;
  lot.rngState = scratch.state;
  lot.endMs = Math.max(lot.endMs, state.nowMs + c.extendMinutes * MIN);
  return { ok: true, value: price };
}
