// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Le plan de la boutique : une grille, des meubles posés dessus, une zone réservée aux enchères et un passage devant la porte.
// Un présentoir porte une vitrine, une table de jeu fait monter la tolérance des acheteurs : acheter un meuble change donc
// l'économie. Les slots donnés par la progression arrivent avec leur meuble offert (`syncBaseFurniture`) ; un meuble acheté
// s'y ajoute. Le reste est du décor.

                                                                                                         

export function createShop(cfg            )            {
  return { width: cfg.shopLayout.startWidth, height: cfg.shopLayout.startHeight, items: [], nextItemId: 1, floor: 0, wall: 0 };
}

function furnitureDef(type        , ctx     )                           {
  return ctx.cfg.shopLayout.furniture.find((f) => f.id === type);
}

/** Emprise d'un meuble : largeur et profondeur s'échangent quand il tourne d'un quart de tour. */
export function footprint(def              , dir        )                           {
  return dir % 2 === 0 ? { w: def.w, h: def.h } : { w: def.h, h: def.w };
}

export const doorX = (shop           )         => Math.floor(shop.width / 2);

function isReserved(shop           , x        , y        , cfg            )          {
  const z = cfg.shopLayout.auctionZone;
  if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return true;
  return x === doorX(shop) && y >= shop.height - 1;
}

/** L'emprise est-elle libre (dans la boutique, hors zones réservées, sans autre meuble) ? `ignore` : le meuble qu'on déplace. */
export function isFree(shop           , x        , y        , w        , h        , cfg            , ignore                = null)          {
  if (x < 0 || y < 0 || x + w > shop.width || y + h > shop.height) return false;
  for (let i = x; i < x + w; i++) {
    for (let j = y; j < y + h; j++) if (isReserved(shop, i, j, cfg)) return false;
  }
  for (const it of shop.items) {
    if (it.id === ignore) continue;
    const def = cfg.shopLayout.furniture.find((f) => f.id === it.type);
    if (!def) continue;
    const f = footprint(def, it.dir);
    if (x < it.x + f.w && it.x < x + w && y < it.y + f.h && it.y < y + h) return false;
  }
  return true;
}

// Les meubles posés d'office laissent une case autour d'eux : les clients doivent pouvoir passer.
function findSpot(shop           , def              , cfg            )                                  {
  for (const pas of [2, 1]) {
    for (let y = 1; y < shop.height; y += pas) {
      for (let x = 1; x < shop.width; x += pas) if (isFree(shop, x, y, def.w, def.h, cfg)) return { x, y };
    }
  }
  return null;
}

function place(state           , def              , offert         , ctx     )                  {
  const spot = findSpot(state.shop, def, ctx.cfg);
  if (!spot) return null;
  const item           = { id: state.shop.nextItemId++, type: def.id, x: spot.x, y: spot.y, dir: 0, offert };
  state.shop.items.push(item);
  return item;
}

function countEffect(state           , effect        , ctx     , offert                 = null)         {
  let n = 0;
  for (const it of state.shop.items) {
    if (offert !== null && it.offert !== offert) continue;
    if (furnitureDef(it.type, ctx)?.effect === effect) n++;
  }
  return n;
}

/** La progression donne des slots : chacun arrive avec son meuble offert. */
export function syncBaseFurniture(state           , ctx     )       {
  const baseVitrine = ctx.cfg.shopLayout.furniture.find((f) => f.effect === 'vitrine');
  const baseTable = ctx.cfg.shopLayout.furniture.find((f) => f.effect === 'table');
  while (baseVitrine && countEffect(state, 'vitrine', ctx, true) < state.progression.showcaseSlots) {
    if (!place(state, baseVitrine, true, ctx)) break;
  }
  while (baseTable && countEffect(state, 'table', ctx, true) < state.progression.tables) {
    if (!place(state, baseTable, true, ctx)) break;
  }
}

/** Slots de vitrine : ceux de la progression, plus les présentoirs achetés. */
export function showcaseCapacity(state           , ctx     )         {
  return state.progression.showcaseSlots + countEffect(state, 'vitrine', ctx, false);
}

export function tableCount(state           , ctx     )         {
  return state.progression.tables + countEffect(state, 'table', ctx, false);
}

/** Le premier présentoir sans carte : c'est là que la prochaine carte se pose. */
export function freeDisplay(state           , ctx     )                  {
  for (const it of state.shop.items) {
    if (furnitureDef(it.type, ctx)?.effect !== 'vitrine') continue;
    if (!state.showcase.some((l) => l.displayId === it.id)) return it;
  }
  return null;
}

/** Le prix monte avec chaque exemplaire déjà acheté. */
export function furniturePrice(type        , state           , ctx     )         {
  const def = furnitureDef(type, ctx);
  if (!def) return Infinity;
  const owned = state.shop.items.filter((it) => it.type === type && !it.offert).length;
  return Math.round(def.cost * Math.pow(def.growth, owned));
}

export function buyFurniture(state           , type        , ctx     )                   {
  const def = furnitureDef(type, ctx);
  if (!def) return { ok: false, reason: `Meuble inconnu : ${type}.` };
  const price = furniturePrice(type, state, ctx);
  if (state.gold < price) return { ok: false, reason: 'Or insuffisant.' };
  const item = place(state, def, false, ctx);
  if (!item) return { ok: false, reason: 'Plus de place : agrandis la boutique.' };
  state.gold -= price;
  return { ok: true, value: item };
}

export function moveFurniture(state           , id        , x        , y        , dir        , ctx     )         {
  const it = state.shop.items.find((i) => i.id === id);
  const def = it && furnitureDef(it.type, ctx);
  if (!it || !def) return { ok: false, reason: 'Meuble inconnu.' };
  const f = footprint(def, dir);
  if (!isFree(state.shop, x, y, f.w, f.h, ctx.cfg, id)) return { ok: false, reason: 'Cette place est prise.' };
  it.x = x;
  it.y = y;
  it.dir = dir;
  return { ok: true, value: undefined };
}

/** Revendre un meuble acheté. Un meuble offert reste, et un présentoir occupé ou en trop ne part pas. */
export function sellFurniture(state           , id        , ctx     )                 {
  const i = state.shop.items.findIndex((x) => x.id === id);
  const it = state.shop.items[i];
  const def = it && furnitureDef(it.type, ctx);
  if (!it || !def) return { ok: false, reason: 'Meuble inconnu.' };
  if (it.offert) return { ok: false, reason: 'Ce meuble fait partie de la boutique : il se déplace, il ne se vend pas.' };
  if (state.showcase.some((l) => l.displayId === id)) return { ok: false, reason: 'Une carte est posée dessus.' };
  state.shop.items.splice(i, 1);
  const owned = state.shop.items.filter((x) => x.type === it.type && !x.offert).length;
  const refund = Math.round(def.cost * Math.pow(def.growth, owned) * ctx.cfg.shopLayout.resaleFraction);
  state.gold += refund;
  return { ok: true, value: refund };
}

export function expandCost(state           , cfg            )         {
  const { expandBaseCost, expandGrowth, expandStep, startWidth } = cfg.shopLayout;
  const done = Math.round((state.shop.width - startWidth) / expandStep);
  return Math.round(expandBaseCost * Math.pow(expandGrowth, done));
}

export const canExpand = (state           , cfg            )          =>
  state.shop.width < cfg.shopLayout.maxWidth || state.shop.height < cfg.shopLayout.maxHeight;

/** Agrandit la boutique d'une bande sur chaque côté libre. Les meubles ne bougent pas. */
export function expandShop(state           , ctx     )                 {
  const { expandStep, maxWidth, maxHeight } = ctx.cfg.shopLayout;
  if (!canExpand(state, ctx.cfg)) return { ok: false, reason: 'La boutique est à sa taille maximale.' };
  const price = expandCost(state, ctx.cfg);
  if (state.gold < price) return { ok: false, reason: 'Or insuffisant.' };
  state.gold -= price;
  state.shop.width = Math.min(maxWidth, state.shop.width + expandStep);
  state.shop.height = Math.min(maxHeight, state.shop.height + expandStep);
  return { ok: true, value: price };
}
