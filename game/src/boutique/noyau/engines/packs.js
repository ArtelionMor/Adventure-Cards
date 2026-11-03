// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Ouverture de boosters : rareté → héros pondéré par son tier → carte du héros.
// Le pool = cartes des extensions débloquées, héros verrouillés COMPRIS : sinon un héros
// verrouillé ne pourrait jamais sortir ses cartes, donc jamais se débloquer. Une extension arrive en deux phases
// (3 nov. 2026) : la phase A donne ses cartes de base, la phase B ajoute ses cartes switch (mythiques comprises).
// Il y a un seul booster par extension, le même aux deux phases : `opts.extension` le choisit, et il pioche dans toutes les
// cartes débloquées de cette extension. Sans extension, le pool est celui de toutes les extensions débloquées.
// La pitié compte les boosters ouverts (jamais des jours) depuis la dernière carte de la rareté
// objectif d'un héros du tier de tête. Le booster premium ne touche pas à ce compteur.

import { addCopy, hasFeature } from '../state.js';
import { pickCumulative } from '../rng.js';
                                                                                                                                         
import { checkHeroUnlock } from './heroUnlock.js';
import { effectiveRef, instanceRef } from './pricing.js';
import { objectiveRate } from './rates.js';

                              
                   
               
                   
                         
                    
 

                             
                          
                      
                                
                                                                          
                           
 

const cache = new WeakMap                                                          ();

function tablesKey(state           )         {
  let key = `${state.progression.extensions.join(',')}/${state.progression.switchExtensions.join(',')}`;
  for (const hero in state.heroes) key += `|${state.heroes[hero]?.tier}`;
  return key;
}

/** Cette carte peut-elle sortir ? Sa phase doit être débloquée, et son extension être celle du booster s'il en a une. */
function inPool(c         , state           , extension                         )          {
  if (extension !== undefined && c.extension !== extension) return false;
  return (c.isSwitch ? state.progression.switchExtensions : state.progression.extensions).includes(c.extension);
}

function buildTables(state           , ctx     , extension              )             {
  const { cfg, index } = ctx;
  const tables                = [];
  let objective                     = null;

  for (const r of cfg.rarities) {
    const heroes           = [];
    const heroCards              = [];
    const heroCum           = [];
    let cum = 0;
    for (const [hero, cards] of index.cardsByHero) {
      const pool = cards.filter((c) => c.rarity === r.id && inPool(c, state, extension));
      if (pool.length === 0) continue;
      cum += index.tierWeight.get(state.heroes[hero]?.tier ?? cfg.tiers.defaultTier) ?? 0;
      heroes.push(hero);
      heroCards.push(pool);
      heroCum.push(cum);
    }
    if (heroes.length === 0 || cum <= 0) continue;
    const table              = { rarity: r.id, rate: 0, heroes, heroCards, heroCum };
    tables.push(table);
    if (r.id === cfg.targets.objectiveRarity) objective = table;
  }

  const objectiveShare = objective ? objectiveRate(cfg, (objective               ).heroes.length) : 0;
  let weights = 0;
  for (const t of tables) if (t !== objective) weights += index.rarityById.get(t.rarity)?.dropWeight ?? 0;
  const others = objective && weights > 0 ? 1 - objectiveShare : 1;
  const rarityCum           = [];
  let cum = 0;
  for (const t of tables) {
    const weight = index.rarityById.get(t.rarity)?.dropWeight ?? 0;
    t.rate = t === objective ? objectiveShare : weights > 0 ? (others * weight) / weights : 0;
    cum += t.rate;
    rarityCum.push(cum);
  }

  const topHeroIndexes           = [];
  if (objective) {
    const o              = objective;
    let best = 0;
    for (const hero of o.heroes) best = Math.max(best, index.tierWeight.get(state.heroes[hero]?.tier ?? '') ?? 0);
    o.heroes.forEach((hero, i) => {
      if ((index.tierWeight.get(state.heroes[hero]?.tier ?? '') ?? 0) === best) topHeroIndexes.push(i);
    });
  }
  return { rarities: tables, rarityCum, objective, topHeroIndexes };
}

export function getPackTables(state           , ctx     , extension              )             {
  const key = tablesKey(state);
  const slot = extension ?? '';
  let byExtension = cache.get(ctx);
  if (!byExtension) cache.set(ctx, (byExtension = {}));
  const hit = byExtension[slot];
  if (hit && hit.key === key) return hit.tables;
  const tables = buildTables(state, ctx, extension);
  byExtension[slot] = { key, tables };
  return tables;
}

function pickUniform(cards                    , ctx     )          {
  return cards[ctx.rng.int(cards.length)]           ;
}

function drawFromRarity(table             , ctx     )          {
  const i = pickCumulative(ctx.rng, table.heroCum);
  return pickUniform(table.heroCards[i]             , ctx);
}

function drawCard(tables            , ctx     )          {
  const table = tables.rarities[pickCumulative(ctx.rng, tables.rarityCum)]               ;
  return drawFromRarity(table, ctx);
}

function isTopObjective(card         , tables            )          {
  const o = tables.objective;
  if (!o || card.rarity !== o.rarity) return false;
  return tables.topHeroIndexes.some((i) => o.heroes[i] === card.hero);
}

function drawPity(tables            , ctx     )          {
  const o = tables.objective               ;
  const i = tables.topHeroIndexes[ctx.rng.int(tables.topHeroIndexes.length)]          ;
  return pickUniform(o.heroCards[i]             , ctx);
}

function drawFinish(ctx     )         {
  const rate = ctx.cfg.foil.dropRate;
  return rate > 0 && ctx.rng.next() < rate ? 'foil' : 'normal';
}

/** Un double part-il au bulk d'après le filtre du joueur ? (carte « bulk » du catalogue, ou valeur sous le seuil ; un foil protégé reste.) */
export function bulkEligible(state           , inst                                                              , ctx     )          {
  const card = ctx.index.cardById.get(inst.cardId);
  const threshold = state.settings.bulkFilterThreshold;
  const protectedVariant = state.settings.bulkFilterProtectVariants && inst.finish === 'foil';
  return !!card && !protectedVariant && (card.isBulk || (threshold > 0 && instanceRef(inst         , state, ctx) < threshold));
}

/** Options d'ouverture : `autoBulk: false` laisse les doubles en stock (le joueur choisit leur sort carte par carte, à l'ouverture). */
                              
                     
                                                                                                                             
                          
 

/** Les extensions dont on peut ouvrir le booster : celles dont la phase A est débloquée. */
export function openableExtensions(state           )                {
  return [...state.progression.extensions];
}

/** Reçoit une carte tirée : découverte, héros, filtre de bulk. Seul un double peut partir au bulk. */
function receiveCard(state           , ctx     , card         , pity         , autoBulk = true)             {
  const finish = drawFinish(ctx);
  const { id, isNew } = addCopy(state, card.id, finish);
  if (finish === 'foil') state.foilCollection[card.id] = true;
  ctx.on?.({ t: 'cardOpened', cardId: card.id, isNew, pity });
  if (isNew) {
    checkHeroUnlock(state, card.hero, ctx);
    return id;
  }
  const inst = state.instances[id];
  if (autoBulk && inst && bulkEligible(state, inst         , ctx)) {
    inst.location = 'bulk';
    state.bulkBox.push({ instanceId: id, addedAtMs: state.nowMs });
  }
  return id;
}

export function openBooster(state           , ctx     , opts              = {})                   {
  if (state.boosters.stock <= 0) return { ok: false, reason: 'Aucun booster en stock.' };
  const extension = opts.extension;
  if (extension !== undefined && !state.progression.extensions.includes(extension)) {
    return { ok: false, reason: `Extension pas encore débloquée : ${extension}.` };
  }
  const tables = getPackTables(state, ctx, extension);
  if (tables.rarities.length === 0) return { ok: false, reason: 'Aucune carte à tirer.' };
  const n = ctx.cfg.boosters.cardsPerBooster;
  const pityAt = ctx.cfg.targets.pityBoosters;
  const canForce = pityAt > 0 && tables.topHeroIndexes.length > 0;
  const opened           = [];
  let hit = false;
  const pityBefore = extension === undefined ? state.boosters.pity : (state.boosters.pityByExtension[extension] ?? 0);

  state.boosters.stock--;
  state.boosters.opened++;
  for (let i = 0; i < n; i++) {
    const force = canForce && !hit && i === n - 1 && pityBefore + 1 >= pityAt;
    const card = force ? drawPity(tables, ctx) : drawCard(tables, ctx);
    if (isTopObjective(card, tables)) hit = true;
    receiveCard(state, ctx, card, force, opts.autoBulk ?? true);
    opened.push(card.id);
  }
  // Sans mythique dans le pool (phase A seule), il n'y a rien à attendre : la pitié n'avance pas.
  const pityAfter = hit ? 0 : tables.objective ? pityBefore + 1 : 0;
  if (extension === undefined) state.boosters.pity = pityAfter;
  else state.boosters.pityByExtension[extension] = pityAfter;
  return { ok: true, value: opened };
}

/** Gain moyen dû au foil sur une rareté : un booster compte aussi les foils qu'il peut contenir. */
function foilFactor(rarity          , ctx     )         {
  const { dropRate, priceMultiplier } = ctx.cfg.foil;
  const power = ctx.index.rarityById.get(rarity)?.variantPower ?? 1;
  return 1 + dropRate * (Math.pow(priceMultiplier, power) - 1);
}

/** Valeur espérée d'une carte tirée, en prix de référence effectifs, foils compris. */
export function expectedCardValue(state           , ctx     , extension              )         {
  const tables = getPackTables(state, ctx, extension);
  let value = 0;
  for (const t of tables.rarities) value += t.rate * rarityMeanValue(t, state, ctx) * foilFactor(t.rarity, ctx);
  return value;
}

function rarityMeanValue(t             , state           , ctx     )         {
  let weighted = 0;
  let prev = 0;
  t.heroCards.forEach((cards, i) => {
    const cum = t.heroCum[i]          ;
    let sum = 0;
    for (const c of cards) sum += effectiveRef(c, state, ctx);
    weighted += ((cum - prev) * sum) / cards.length;
    prev = cum;
  });
  return prev > 0 ? weighted / prev : 0;
}

export function expectedBoosterValue(state           , ctx     , extension              )         {
  return expectedCardValue(state, ctx, extension) * ctx.cfg.boosters.cardsPerBooster;
}

/**
 * Rachat d'un booster. Hors profil de référence : il dépasse les 1 365 cartes par semaine.
 * TODO(design) : prix et limite du rachat, absents du design. Surveiller le « rendement du
 * rachat » de la simulation : au-dessus de 1, la boucle crée de l'or sans fin.
 */
export function boosterShopPrice(state           , ctx     , extension              )         {
  return Math.ceil(expectedBoosterValue(state, ctx, extension) * ctx.cfg.shop.boosterPriceVsValue);
}

export function buyBooster(state           , ctx     , extension              )                 {
  const price = boosterShopPrice(state, ctx, extension);
  if (state.gold < price) return { ok: false, reason: 'Or insuffisant.' };
  state.gold -= price;
  state.boosters.stock++;
  return { ok: true, value: price };
}

// ---------------------------------------------------------------- Booster premium

function premiumDef(id        , ctx     )                                {
  return ctx.cfg.premium.boosters.find((p) => p.id === id);
}

/** Valeur de référence d'un premium : son espérance, sert aux enchères et au prix d'achat. */
export function premiumRef(id        , state           , ctx     )         {
  const def = premiumDef(id, ctx);
  if (!def) throw new Error(`Premium inconnu : ${id}`);
  const tables = getPackTables(state, ctx);
  const random = expectedCardValue(state, ctx);
  let value = 0;
  for (const slot of def.slots) {
    const table = slot.rarity ? tables.rarities.find((t) => t.rarity === slot.rarity) : undefined;
    value += table ? rarityMeanValue(table, state, ctx) : random;
  }
  return Math.max(value, def.minValue);
}

function nextRarityTable(rarity          , tables            , ctx     )                          {
  const rank = ctx.index.rarityRank.get(rarity) ?? 0;
  return tables.rarities.find((t) => (ctx.index.rarityRank.get(t.rarity) ?? 0) > rank);
}

export function openPremium(state           , id        , ctx     , opts              = {})                   {
  const def = premiumDef(id, ctx);
  if (!def) return { ok: false, reason: `Premium inconnu : ${id}.` };
  if ((state.boosters.premium[id] ?? 0) <= 0) return { ok: false, reason: 'Aucun booster premium en stock.' };
  const tables = getPackTables(state, ctx);
  const cards = def.slots.map((slot) => {
    const table = slot.rarity ? tables.rarities.find((t) => t.rarity === slot.rarity) : undefined;
    return table ? drawFromRarity(table, ctx) : drawCard(tables, ctx);
  });

  // Valeur minimale : on monte la carte la moins chère d'un cran de rareté, jusqu'à l'atteindre.
  let value = 0;
  for (const c of cards) value += effectiveRef(c, state, ctx);
  while (value < def.minValue) {
    let lowest = -1;
    let lowestValue = Infinity;
    cards.forEach((c, i) => {
      const v = effectiveRef(c, state, ctx);
      if (v < lowestValue && nextRarityTable(c.rarity, tables, ctx)) {
        lowest = i;
        lowestValue = v;
      }
    });
    if (lowest < 0) break;
    const upgraded = drawFromRarity(nextRarityTable((cards[lowest]           ).rarity, tables, ctx)               , ctx);
    cards[lowest] = upgraded;
    value += effectiveRef(upgraded, state, ctx) - lowestValue;
  }

  state.boosters.premium[id] = (state.boosters.premium[id] ?? 0) - 1;
  for (const c of cards) receiveCard(state, ctx, c, false, opts.autoBulk ?? true);
  return { ok: true, value: cards.map((c) => c.id) };
}

/** Achat sur le marché premium : le validateur garantit qu'il ne s'arbitre pas aux enchères. */
/** Le prix d'un booster premium au marché (ce que montre le bouton « Buy for »). */
export function premiumShopPrice(state           , id        , ctx     )         {
  return Math.ceil(premiumRef(id, state, ctx) * ctx.cfg.premium.marketBuyMultiplier);
}

export function buyPremium(state           , id        , ctx     )                 {
  if (!hasFeature(state, 'premiumMarket')) return { ok: false, reason: 'Marché premium pas encore débloqué.' };
  const price = premiumShopPrice(state, id, ctx);
  if (state.gold < price) return { ok: false, reason: 'Or insuffisant.' };
  state.gold -= price;
  state.boosters.premium[id] = (state.boosters.premium[id] ?? 0) + 1;
  return { ok: true, value: price };
}
