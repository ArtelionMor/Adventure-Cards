// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// État joueur et règles de possession.
// Le premier exemplaire d'une carte occupe son emplacement de collection et ne se vend pas :
// c'est ce qui garantit « on ne vend jamais la dernière copie ». Tous les doubles se vendent, deck ou non.

import { startProgression } from './engines/progression.js';
import { createShop } from './engines/shop.js';
import { unlockClients } from './engines/buyers.js';
                                                                                                          

export function createState(ctx     )            {
  const { cfg, index } = ctx;
  const heroes                            = {};
  for (const hero of index.heroes) {
    heroes[hero] = { unlocked: cfg.heroes.starters.includes(hero), level: 1, tier: cfg.tiers.defaultTier };
  }
  const state            = {
    nowMs: 0,
    gold: 0,
    gems: 0,
    nextInstanceId: 1,
    instances: {},
    collection: {},
    plays: {},
    lastDeck: null,
    tableAtMs: null,
    heroes,
    boosters: { stock: cfg.boosters.startStock, progressMs: 0, opened: 0, pity: 0, pityByExtension: {}, premium: {} },
    showcase: [],
    auctions: [],
    bulkBox: [],
    bulkProgressMs: 0,
    shop: createShop(cfg),
    foilCollection: {},
    market: { lots: [], nextLotId: 1, nextRefreshMs: 0, rngState: ctx.rng.nextU32() },
    gradingQueue: [],
    settings: { bulkFilterThreshold: cfg.bulk.defaultFilterThreshold, bulkFilterProtectVariants: true },
    progression: {
      stepIndex: 0,
      level: 1,
      opponentIndex: 0,
      wins: 0,
      showcaseSlots: 0,
      auctionSlots: 0,
      tables: 0,
      extensions: [],
      switchExtensions: [],
      products: [],
      clients: [],
      opponents: [],
      features: [],
    },
    meta: { archetypeMul: {}, cardScore: {} },
  };
  unlockClients(state, ctx, 'start');
  startProgression(state, ctx);
  return state;
}

export function hasFeature(state           , feature        )          {
  return state.progression.features.includes(feature);
}

/** Ajoute un exemplaire : emplacement de collection s'il est nouveau, stock sinon. */
export function addCopy(state           , cardId        , finish        )                                     {
  const id = state.nextInstanceId++;
  const isNew = state.collection[cardId] === undefined;
  state.instances[id] = { id, cardId, finish, grade: null, slab: null, location: isNew ? 'collection' : 'stock' };
  if (isNew) state.collection[cardId] = id;
  return { id, isNew };
}

export function removeInstance(state           , id            )       {
  delete state.instances[id];
}

/**
 * Vendable = en stock. L'occupant de la collection n'est jamais en stock. Un double se vend toujours,
 * même celui d'un deck utilisé : le deck se compose de cartes (une par emplacement de collection), pas d'exemplaires.
 */
export function checkSellable(state           , id            )         {
  const inst = state.instances[id];
  if (!inst) return { ok: false, reason: 'Exemplaire inconnu.' };
  if (inst.location === 'collection') return { ok: false, reason: 'Dernière copie : elle reste dans la collection.' };
  if (inst.location !== 'stock') return { ok: false, reason: 'Exemplaire déjà engagé dans un canal de vente.' };
  return { ok: true, value: undefined };
}

/** Échange l'occupant de l'emplacement : l'ancien passe au stock, donc devient vendable. */
export function swapCollectionOccupant(state           , cardId        , id            )         {
  const inst = state.instances[id];
  const current = state.collection[cardId];
  if (!inst || inst.cardId !== cardId) return { ok: false, reason: 'Cet exemplaire n’est pas de cette carte.' };
  if (current === undefined) return { ok: false, reason: 'Carte pas encore découverte.' };
  if (inst.location !== 'stock') return { ok: false, reason: 'Seul un exemplaire en stock peut prendre la place.' };
  const old = state.instances[current];
  if (old) old.location = 'stock';
  inst.location = 'collection';
  state.collection[cardId] = id;
  return { ok: true, value: undefined };
}

/**
 * Le jeu de cartes signale un combat joué : les cartes du deck gagnent une partie jouée, et ce deck devient « le dernier deck joué »
 * (le mode Auto le rejoue, Cipher en duel aussi). `cards` : les cartes réellement dans le deck, une entrée par carte.
 */
export function recordDeckPlayed(state           , deck          )       {
  for (const id of deck.cards) state.plays[id] = (state.plays[id] ?? 0) + 1;
  state.lastDeck = { heroes: [...deck.heroes], cards: [...deck.cards] };
}
