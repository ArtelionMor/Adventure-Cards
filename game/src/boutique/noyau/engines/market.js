// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Enchères d'achat : des lots sortent à intervalle fixe, chacun avec sa limite de temps. On s'y place en payant sa mise ; des
// concurrents la challengent, et celui qui se fait passer devant récupère sa mise tout de suite. À la fin, le dernier en tête
// reçoit la carte. C'est la soupape du déblocage : une carte qui ne sort pas se gagne ici.
// Chaque lot a sa graine et ses concurrents agissent à des heures fixées d'avance : le découpage des ticks ne change rien.
// Un lot peut être foil ou déjà gradé : son plafond suit alors la valeur de cette copie-là.
// Seule une carte manquante se gagne : elle prend son emplacement de collection, donc elle ne se revend pas et ne se grade pas.
// Sinon, grader une carte gagnée puis la revendre rapporterait à coup sûr (`validateConfig` borne aussi le plafond des concurrents).

import { Rng } from '../rng.js';
import { addCopy, hasFeature } from '../state.js';
                                                                                                    
import { maxBuyerMultiplier } from './buyers.js';
import { drawGrade } from './grading.js';
import { checkHeroUnlock } from './heroUnlock.js';
import { effectiveRef, instanceRef } from './pricing.js';

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

function noteBid(lot           , who                   , amount        )       {
  const bid = lot.bids.find((b) => b.who === who);
  if (bid) bid.amount = amount;
  else lot.bids.push({ who, amount });
}

const RIVALS_PER_LOT = 3;
const DAY = 24 * 60 * MIN;

/** Ce qu'une console de test impose à un lot ; le reste se tire comme d'habitude. */
                            
                  
                 
                   
 

function openLot(state           , card         , at        , ctx     , force            = {})       {
  const { lot: c } = ctx.cfg.market;
  const { companies } = ctx.cfg.grading;
  const rollFoil = scratch.next() < c.foilChance;
  const finish         = force.foil ?? rollFoil ? 'foil' : 'normal';
  // La carte a été gradée par un concurrent, un jour des trois derniers mois.
  const rollGraded = scratch.next() < c.gradedChance;
  const graded = force.graded ?? rollGraded;
  const first = scratch.int(1000);
  const company = companies[scratch.int(companies.length)];
  const grade = graded && company ? drawGrade(scratch, company) : null;
  const slab              = grade !== null && company ? { company: company.id, by: first + RIVALS_PER_LOT, atMs: at - scratch.int(90) * DAY } : null;
  const top = Math.ceil(instanceRef({ cardId: card.id, finish, grade, slab }, state, ctx) * maxBuyerMultiplier(card, state, ctx) * ctx.cfg.market.buyMultiplier);
  const hours = c.durationsHours[scratch.int(c.durationsHours.length)] ?? 1;
  const maxRival = Math.ceil(top * (c.rivalMaxMin + scratch.next() * (c.rivalMaxMax - c.rivalMaxMin)));
  const nextRivalMs = at + delay(c.rivalDelayMinutes);
  state.market.lots.push({
    id: state.market.nextLotId++,
    cardId: card.id,
    finish,
    grade,
    slab,
    price: Math.max(1, Math.ceil(top * c.startFraction)),
    holder: null,
    stake: 0,
    rival: first,
    rivals: Array.from({ length: RIVALS_PER_LOT }, (_, i) => first + i),
    bids: [],
    maxRival,
    nextRivalMs,
    endMs: at + hours * 3600000,
    engaged: false,
    warned: false,
    rngState: scratch.nextU32(),
  });
}

function lotPool(state           , ctx     )            {
  const pool            = [];
  for (const c of ctx.index.cardById.values()) {
    if (!ctx.cfg.market.rarities.includes(c.rarity) || !state.progression.extensions.includes(c.extension)) continue;
    if (state.collection[c.id] === undefined && !state.market.lots.some((l) => l.cardId === c.id)) pool.push(c);
  }
  return pool;
}

/** Sort un lot tout de suite, hors du rythme des tirages. Rend sa carte, ou null s'il n'y a plus rien à proposer. */
export function openLotNow(state           , ctx     , force            = {})                {
  const pool = lotPool(state, ctx).filter((c) => !force.rarity || c.rarity === force.rarity);
  scratch.state = state.market.rngState;
  const card = pool[scratch.int(pool.length)];
  if (card) openLot(state, card, state.nowMs, ctx, force);
  state.market.rngState = scratch.state;
  return card?.id ?? null;
}

function drawLots(state           , at        , ctx     )       {
  const { offersPerRefresh } = ctx.cfg.market;
  const pool = lotPool(state, ctx);
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
  // Un concurrent ne se passe pas devant lui-même.
  const others = lot.rivals.filter((r) => lot.holder !== 'rival' || r !== lot.rival);
  lot.rival = others[scratch.int(others.length)] ?? lot.rival;
  lot.holder = 'rival';
  noteBid(lot, lot.rival, price);
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
  const inst = state.instances[addCopy(state, lot.cardId, lot.finish).id];
  if (inst) {
    inst.grade = lot.grade;
    inst.slab = lot.slab;
  }
  if (lot.finish === 'foil') state.foilCollection[lot.cardId] = true;
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
  noteBid(lot, 'player', price);
  // Un concurrent qui a encore les moyens répond ; une mise de dernière minute prolonge le lot pour lui en laisser le temps.
  scratch.state = lot.rngState;
  lot.nextRivalMs = nextBid(lot, ctx) <= lot.maxRival ? state.nowMs + delay(c.reactionMinutes) : null;
  lot.rngState = scratch.state;
  lot.endMs = Math.max(lot.endMs, state.nowMs + c.extendMinutes * MIN);
  return { ok: true, value: price };
}
