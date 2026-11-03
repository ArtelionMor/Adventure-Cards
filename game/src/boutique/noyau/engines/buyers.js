// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Les dix clients (3 nov. 2026) : combien chacun valorise une carte, quand il arrive, et lequel achète.
// Timmy, Jenna et Spike cherchent les cartes flaguées à leur nom ; les sept autres suivent le jeu du joueur (le héros de plus haut niveau, le produit le
// plus récent, les cartes qu'il joue le plus…) : voir `ClientRule`. Les tables de jeu augmentent la tolérance de tous, donc raccourcissent l'attente.

                                     
                                                                                              
import { metaMultiplier } from './meta.js';
import { tableCount } from './shop.js';

export function tableTolerance(state           , ctx     )         {
  const { tableToleranceEach, tableToleranceMax } = ctx.cfg.buyers;
  return 1 + Math.min(tableToleranceMax, tableCount(state, ctx) * tableToleranceEach);
}

/** Les clients arrivent avec la progression, la première table de jeu ou la première amélioration d'un héros. */
export function unlockClients(state           , ctx     , on                                            , stepId         )       {
  for (const b of ctx.cfg.buyers.profiles) {
    if (state.progression.clients.includes(b.id) || b.unlock.on !== on) continue;
    if (on === 'step' && b.unlock.step !== stepId) continue;
    state.progression.clients.push(b.id);
    ctx.on?.({ t: 'clientArrived', client: b.id });
  }
}

/** Le jeu signale une partie jouée à une table : Brock passe acheter juste après, et le premier passage de table l'invite. */
export function noteTableGame(state           , ctx     )       {
  state.tableAtMs = state.nowMs;
  unlockClients(state, ctx, 'table');
}

/** Les héros débloqués au plus haut niveau, ou au plus bas (aucun si tous sont au même niveau et qu'on cherche le plus bas). */
function heroesAtExtreme(state           , high         )              {
  const list = Object.entries(state.heroes).filter(([, h]) => h.unlocked);
  if (!list.length) return new Set();
  const levels = list.map(([, h]) => h.level);
  const target = high ? Math.max(...levels) : Math.min(...levels);
  if (!high && target === Math.max(...levels)) return new Set();
  return new Set(list.filter(([, h]) => h.level === target).map(([id]) => id));
}

/** Cette carte est-elle du produit `product` (`ext2:A` : les cartes de base de l'extension 2 ; `ext2:B` : ses switch) ? */
function inProduct(card         , product        )          {
  const [ext, phase] = product.split(':');
  return card.extension === ext && (phase === 'B') === card.isSwitch;
}

/** Ce que sa règle ajoute au multiplicateur d'un client pour cette carte. */
function ruleBonus(rule                        , card         , state           , ctx     )         {
  if (!rule) return 0;
  switch (rule.type) {
    case 'flag':
      return card.flags?.includes(rule.flag) ? rule.bonus : 0;
    case 'topHero':
      return heroesAtExtreme(state, true).has(card.hero) ? rule.bonus : 0;
    case 'leastUpgraded':
      return heroesAtExtreme(state, false).has(card.hero) ? rule.bonus : 0;
    case 'newestProduct': {
      const last = state.progression.products[state.progression.products.length - 1];
      return last && inProduct(card, last) ? rule.bonus : 0;
    }
    case 'oldestProducts':
      return state.progression.products.slice(0, rule.count).some((p) => inProduct(card, p)) ? rule.bonus : 0;
    case 'mostPlayed': {
      const top = Object.entries(state.plays).sort((a, b) => b[1] - a[1]).slice(0, rule.count);
      return top.some(([id]) => id === card.id) ? rule.bonus : 0;
    }
    case 'rarePlus':
      return (ctx.index.rarityRank.get(card.rarity) ?? 0) >= (ctx.index.rarityRank.get('rare') ?? 1) ? rule.bonus : 0;
    case 'afterTable':
      return 0;
  }
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
    buyer.metaAlignment * (metaMultiplier(card, state, ctx) - 1) +
    ruleBonus(buyer.rule, card, state, ctx);
  const bounded = Math.min(cfg.buyers.maxMultiplier, Math.max(cfg.buyers.minMultiplier, raw));
  return bounded * tableTolerance(state, ctx);
}

/** L'acheteur qui valorise le plus la carte : c'est lui qui fixe `prix_ref_max`. */
export function maxBuyerMultiplier(card         , state           , ctx     )         {
  let best = 0;
  for (const b of ctx.cfg.buyers.profiles) best = Math.max(best, buyerMultiplier(b, card, state, ctx));
  return best;
}

/** Le poids d'un client dans le tirage : sa fréquence, et zéro tant qu'il n'est pas arrivé (ou, pour Brock, tant qu'aucune table n'a joué). */
function spawnWeight(b              , state           , ctx     )         {
  if (!state.progression.clients.includes(b.id)) return 0;
  if (b.rule?.type === 'afterTable') {
    const recent = state.tableAtMs !== null && state.nowMs - state.tableAtMs <= b.rule.windowMinutes * 60000;
    return recent ? b.spawnWeight : 0;
  }
  void ctx;
  return b.spawnWeight;
}

/** Tire l'acheteur d'une vente parmi les clients arrivés, au prorata de leur fréquence et de leur intérêt pour la carte. */
export function pickBuyer(rng     , card         , state           , ctx     )                 {
  const { profiles } = ctx.cfg.buyers;
  const weights = profiles.map((b) => spawnWeight(b, state, ctx) * buyerMultiplier(b, card, state, ctx));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return state.progression.clients[0] ?? null;
  let x = rng.next() * total;
  for (let i = 0; i < profiles.length; i++) {
    x -= weights[i]          ;
    if (x <= 0) return (profiles[i]                ).id;
  }
  return profiles[profiles.length - 1]?.id ?? null;
}
