// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Vitrine : le joueur fixe un prix borné, un acheteur vient toujours.
// Attente moyenne = B × exp(r), r = prix / prix_ref_max. Le revenu par minute de slot est maximal
// à r = 1. L'heure de vente est tirée à la mise en rayon : le tick ne fait que la comparer.
// L'attente dérive du prix, avec une part de hasard autour de cette moyenne : plus le prix approche
// de la cible (`showcase.shapeTargetR`), plus les longues attentes deviennent rares (`waitLaw: narrowing`).
// B et r_max se règlent dans la config.

import { Rng, erlangUnit, exponential } from '../rng.js';
import { checkSellable, removeInstance } from '../state.js';
                                                                                  
import { pickBuyer } from './buyers.js';
import { instanceRef, instanceRefMax } from './pricing.js';
import { freeDisplay, showcaseCapacity } from './shop.js';

export function meanWaitMinutes(cfg            , r        )         {
  return cfg.showcase.baseMinutes * Math.exp(r);
}

export function showcasePriceCap(cfg            , refMax        )         {
  return cfg.showcase.rMax * refMax;
}

/** Texte lisible pour l'UI : « 22 min », « 2 h 30 ». */
export function formatDuration(minutes        )         {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const total = Math.round(minutes / 5) * 5;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Forme de la loi : elle monte avec le prix, jusqu'à `shapeMax` à la cible. */
export function waitShape(cfg            , r        )         {
  const { shapeMin, shapeMax, shapeTargetR } = cfg.showcase;
  const t = Math.min(1, Math.max(0, r / shapeTargetR));
  return Math.max(1, Math.round(shapeMin + (shapeMax - shapeMin) * t));
}

function drawWaitMinutes(rng     , cfg            , mean        , r        )         {
  if (cfg.showcase.waitLaw === 'deterministic') return mean;
  if (cfg.showcase.waitLaw === 'exponential') return exponential(rng, mean);
  return mean * erlangUnit(rng, waitShape(cfg, r));
}

                                
                
                 
            
                      
                
 

/** Devis affiché à côté du curseur : toute valeur au-delà du plafond y est ramenée. */
export function quoteShowcase(state           , id            , wanted        , ctx     )                        {
  const inst = state.instances[id];
  if (!inst) return { ok: false, reason: 'Exemplaire inconnu.' };
  if (!(wanted > 0)) return { ok: false, reason: 'Le prix doit être positif.' };
  const refMax = instanceRefMax(inst, state, ctx);
  const price = Math.min(wanted, showcasePriceCap(ctx.cfg, refMax));
  const r = price / refMax;
  const meanMinutes = meanWaitMinutes(ctx.cfg, r);
  return { ok: true, value: { price, refMax, r, meanMinutes, label: formatDuration(meanMinutes) } };
}

export function listShowcase(state           , id            , wanted        , ctx     )                        {
  if (state.showcase.length >= showcaseCapacity(state, ctx)) return { ok: false, reason: 'Aucun slot de vitrine libre.' };
  const sellable = checkSellable(state, id);
  if (!sellable.ok) return sellable;
  const quote = quoteShowcase(state, id, wanted, ctx);
  if (!quote.ok) return quote;

  const rngState = ctx.rng.nextU32();
  const seeded = new Rng(rngState);
  const mean = quote.value.meanMinutes;
  const minutes = drawWaitMinutes(seeded, ctx.cfg, mean, quote.value.r);
  const inst = state.instances[id];
  const card = inst ? ctx.index.cardById.get(inst.cardId) : undefined;
  const display = freeDisplay(state, ctx)?.id ?? null;
  (state.instances[id]                        ).location = 'showcase';
  state.showcase.push({
    instanceId: id,
    price: quote.value.price,
    listedAtMs: state.nowMs,
    sellAtMs: state.nowMs + minutes * 60000,
    buyer: card ? pickBuyer(seeded, card, state, ctx) : null,
    displayId: display,
  });
  return quote;
}

/**
 * Change le prix d'une carte en vitrine. L'attente repart de zéro avec le nouveau prix : garder le temps déjà écoulé
 * permettrait de lister à bas prix, d'attendre, puis de remonter le prix juste avant la vente.
 */
export function repriceShowcase(state           , id            , wanted        , ctx     )                        {
  const listing = state.showcase.find((l) => l.instanceId === id);
  if (!listing) return { ok: false, reason: 'Pas en vitrine.' };
  const quote = quoteShowcase(state, id, wanted, ctx);
  if (!quote.ok) return quote;
  const seeded = new Rng(ctx.rng.nextU32());
  const inst = state.instances[id];
  const card = inst ? ctx.index.cardById.get(inst.cardId) : undefined;
  listing.price = quote.value.price;
  listing.listedAtMs = state.nowMs;
  listing.sellAtMs = state.nowMs + drawWaitMinutes(seeded, ctx.cfg, quote.value.meanMinutes, quote.value.r) * 60000;
  listing.buyer = card ? pickBuyer(seeded, card, state, ctx) : null;
  return quote;
}

export function cancelShowcase(state           , id            )         {
  const i = state.showcase.findIndex((l) => l.instanceId === id);
  if (i < 0) return { ok: false, reason: 'Pas en vitrine.' };
  state.showcase.splice(i, 1);
  (state.instances[id]                        ).location = 'stock';
  return { ok: true, value: undefined };
}

/** Conclut les ventes échues. Sans allocation tant que rien ne se vend. */
export function settleShowcase(state           , ctx     )       {
  const list = state.showcase;
  for (let i = list.length - 1; i >= 0; i--) {
    const l = list[i];
    if (!l || l.sellAtMs > state.nowMs) continue;
    const inst = state.instances[l.instanceId];
    if (inst) {
      const price = Math.round(l.price);
      state.gold += price;
      ctx.on?.({
        t: 'sale',
        channel: 'showcase',
        kind: 'card',
        cardId: inst.cardId,
        price,
        ref: instanceRef(inst, state, ctx),
        waitMs: l.sellAtMs - l.listedAtMs,
        buyer: l.buyer,
      });
      removeInstance(state, l.instanceId);
    }
    const last = list.pop();
    if (last && i < list.length) list[i] = last;
  }
}
