// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Enchères : les bots montent d'emblée à la référence, puis le prix évolue par pas et converge
// vers P_cap = c × ref. Trajectoire moyenne, en temps normalisé u = t / T :
//   prix(u) = ref + (P_cap − ref) × G(T) × u^γ
// Chaque pas ajoute l'incrément prévu × un poids normal tronqué de moyenne 1 : prix monotone.
// Chaque enchère a sa propre graine, donc le résultat ne dépend pas du découpage des ticks.
// c, γ, G(T) et le sniper se règlent dans la config.

import { Rng, truncatedUnitMean, truncatedUnitWeight } from '../rng.js';
import { checkSellable, removeInstance } from '../state.js';
                                                                                                                          
import { premiumRef } from './packs.js';
import { instanceRefMax } from './pricing.js';

/** Prix moyen attendu à l'instant normalisé u (hors bruit et hors sniper). */
export function auctionMeanPrice(cfg            , ref        , hours        , u        )         {
  const gain = cfg.auction.gainByDuration[String(hours)] ?? 0;
  return ref + (cfg.auction.c * ref - ref) * gain * Math.pow(u, cfg.auction.gamma);
}

function createListing(state           , item             , ref        , hours        , ctx     )                 {
  const { auction } = ctx.cfg;
  return {
    item,
    ref,
    cap: auction.c * ref,
    gain: auction.gainByDuration[String(hours)] ?? 0,
    price: ref,
    startMs: state.nowMs,
    stepsDone: 0,
    stepsTotal: Math.round((hours * 60) / auction.stepMinutes),
    rngState: ctx.rng.nextU32(),
  };
}

function checkAuctionSlot(state           , hours        , ctx     )         {
  if (state.auctions.length >= state.progression.auctionSlots) return { ok: false, reason: 'Aucun slot d’enchères libre.' };
  if (!ctx.cfg.auction.durationsHours.includes(hours)) return { ok: false, reason: `Durée non proposée : ${hours} h.` };
  return { ok: true, value: undefined };
}

export function listAuction(state           , id            , hours        , ctx     )                         {
  const slot = checkAuctionSlot(state, hours, ctx);
  if (!slot.ok) return slot;
  const sellable = checkSellable(state, id);
  if (!sellable.ok) return sellable;
  const inst = state.instances[id];
  if (!inst) return { ok: false, reason: 'Exemplaire inconnu.' };
  inst.location = 'auction';
  const listing = createListing(state, { kind: 'card', instanceId: id }, instanceRefMax(inst, state, ctx), hours, ctx);
  state.auctions.push(listing);
  return { ok: true, value: listing };
}

export function listPremiumAuction(state           , id           , hours        , ctx     )                         {
  const slot = checkAuctionSlot(state, hours, ctx);
  if (!slot.ok) return slot;
  if ((state.boosters.premium[id] ?? 0) <= 0) return { ok: false, reason: 'Aucun booster premium en stock.' };
  state.boosters.premium[id] = (state.boosters.premium[id] ?? 0) - 1;
  const listing = createListing(state, { kind: 'premium', premiumId: id }, premiumRef(id, state, ctx), hours, ctx);
  state.auctions.push(listing);
  return { ok: true, value: listing };
}

const scratch = new Rng(0);

/** Avance d'un pas. Prix monotone et jamais au-dessus de P_cap. */
export function stepAuction(a                , cfg            , unitMean        )       {
  const { gamma, noiseSigma, sniper, stepMinutes } = cfg.auction;
  const n = a.stepsTotal;
  const k = a.stepsDone;
  const planned = (a.cap - a.ref) * a.gain * (Math.pow((k + 1) / n, gamma) - Math.pow(k / n, gamma));
  scratch.state = a.rngState;
  let price = a.price + planned * truncatedUnitWeight(scratch, noiseSigma, unitMean);
  if ((n - k) * stepMinutes <= sniper.windowMinutes && scratch.next() < sniper.chancePerStep) {
    price += (a.cap - Math.min(a.cap, price)) * sniper.bumpOfGap;
  }
  a.rngState = scratch.state;
  a.price = Math.min(a.cap, price);
  a.stepsDone = k + 1;
}

/** Rejoue les pas échus (hors ligne compris) et conclut les enchères finies. */
export function settleAuctions(state           , ctx     )       {
  const list = state.auctions;
  if (list.length === 0) return;
  const { cfg } = ctx;
  const stepMs = cfg.auction.stepMinutes * 60000;
  const unitMean = truncatedUnitMean(cfg.auction.noiseSigma);
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    if (!a) continue;
    const due = Math.min(a.stepsTotal, Math.floor((state.nowMs - a.startMs) / stepMs));
    while (a.stepsDone < due) stepAuction(a, cfg, unitMean);
    if (a.stepsDone < a.stepsTotal) continue;

    const price = Math.round(a.price);
    state.gold += price;
    const inst = a.item.kind === 'card' ? state.instances[a.item.instanceId] : undefined;
    ctx.on?.({
      t: 'sale',
      channel: 'auction',
      kind: a.item.kind,
      cardId: inst ? inst.cardId : null,
      price,
      ref: a.ref,
      waitMs: a.stepsTotal * stepMs,
      buyer: null,
    });
    if (a.item.kind === 'card') removeInstance(state, a.item.instanceId);
    const last = list.pop();
    if (last && i < list.length) list[i] = last;
  }
}
