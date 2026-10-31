// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Contexte d'exécution : config, index en lecture seule, RNG injecté.

import { Rng } from './rng.js';
                                                                                    

export function buildIndex(cfg            , cards                    )            {
  const cardById = new Map                 ();
  const cardsByHero = new Map                   ();
  let maxCost = 0;
  for (const c of cards) {
    cardById.set(c.id, c);
    const list = cardsByHero.get(c.hero);
    if (list) list.push(c);
    else cardsByHero.set(c.hero, [c]);
    maxCost = Math.max(maxCost, c.cost ?? 0);
  }
  return {
    rarityById: new Map(cfg.rarities.map((r) => [r.id, r])),
    rarityRank: new Map(cfg.rarities.map((r, i) => [r.id, i])),
    cardById,
    cardsByHero,
    heroes: [...cardsByHero.keys()],
    tierWeight: new Map(cfg.tiers.list.map((t) => [t.id, t.weight])),
    maxCost,
  };
}

export function createContext(
  cfg            ,
  cards                    ,
  rng              ,
  on                            ,
)      {
  return {
    cfg,
    index: buildIndex(cfg, cards),
    rng: typeof rng === 'number' ? new Rng(rng) : rng,
    on,
  };
}
