// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// État joueur et règles de possession.
// Le premier exemplaire d'une carte occupe son emplacement de collection et ne se vend pas :
// c'est ce qui garantit « on ne vend jamais la dernière copie ». TODO(design) : ce modèle
// d'emplacement (un occupant par carte, le reste en stock) reste à confirmer.

import { startProgression } from './engines/progression.js';
import { createShop } from './engines/shop.js';
                                                                                                

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
    lockedByDeck: {},
    heroes,
    boosters: { stock: cfg.boosters.startStock, progressMs: 0, opened: 0, pity: 0, premium: {} },
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
      opponents: [],
      features: [],
    },
    meta: { archetypeMul: {}, cardScore: {} },
  };
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
  delete state.lockedByDeck[id];
}

/** Vendable = en stock et hors deck. L'occupant de la collection n'est jamais en stock. */
export function checkSellable(state           , id            )         {
  const inst = state.instances[id];
  if (!inst) return { ok: false, reason: 'Exemplaire inconnu.' };
  if (inst.location === 'collection') return { ok: false, reason: 'Dernière copie : elle reste dans la collection.' };
  if (inst.location !== 'stock') return { ok: false, reason: 'Exemplaire déjà engagé dans un canal de vente.' };
  if (state.lockedByDeck[id]) return { ok: false, reason: 'Exemplaire utilisé dans un deck.' };
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

/** Le jeu de cartes fournit le deck courant. Une copie déjà en vente ne peut pas y entrer. */
export function setDeck(state           , ids                       )         {
  for (const id of ids) {
    const inst = state.instances[id];
    if (!inst) return { ok: false, reason: `Exemplaire inconnu : ${id}.` };
    if (inst.location !== 'collection' && inst.location !== 'stock') {
      return { ok: false, reason: `Exemplaire ${id} engagé dans un canal de vente.` };
    }
  }
  state.lockedByDeck = {};
  for (const id of ids) state.lockedByDeck[id] = true;
  return { ok: true, value: undefined };
}
