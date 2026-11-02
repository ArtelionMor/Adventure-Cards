// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Le plan de la boutique : une grille, des meubles posés dessus, une zone réservée aux enchères et un passage devant la porte.
// Un présentoir porte une vitrine, une table de jeu fait monter la tolérance des acheteurs : acheter un meuble change donc
// l'économie. Les niveaux de boutique (chaque agrandissement) offrent leurs objets, posés d'office (`syncBaseFurniture`) ; un meuble acheté
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

/** Le niveau de la boutique : 1 au départ, +1 par agrandissement. */
export function shopLevel(shop           , cfg            )         {
  const { startWidth, startHeight, expandStep } = cfg.shopLayout;
  return 1 + Math.round((shop.width - startWidth + shop.height - startHeight) / expandStep);
}

/** Ce que les niveaux atteints ont offert en tout : `{ idDuMeuble: nombre }`. */
export function offeredTotals(level        , cfg            )                         {
  const total                         = {};
  for (const set of cfg.shopLayout.expansionSets.slice(0, level)) {
    for (const [id, n] of Object.entries(set)) total[id] = (total[id] ?? 0) + n;
  }
  return total;
}

/**
 * Les niveaux de boutique donnent des objets (\`expansionSets\`), gratuits : le set de départ arrive posé, les suivants attendent dans
 * l'INVENTAIRE (`inventaire`) que le joueur les pose (`poseOffert`), sinon l'écran serait encombré d'objets mal placés.
 * Un objet offert se déplace, il ne se vend pas ; il ne sert qu'une fois posé : les vitrines, les tables et les lots d'enchères
 * qui en découlent sont recalculés ici sur les objets POSÉS.
 */
export function syncBaseFurniture(state           , ctx     )       {
  for (const [id, wanted] of Object.entries(offeredTotals(1, ctx.cfg))) {
    const def = furnitureDef(id, ctx);
    if (!def) continue;
    while (state.shop.items.filter((it) => it.type === id && it.offert).length < wanted) {
      if (!place(state, def, true, ctx)) break;
    }
  }
  state.progression.showcaseSlots = countEffect(state, 'vitrine', ctx, true);
  state.progression.auctionSlots = countEffect(state, 'estrade', ctx, true);
  state.progression.tables = countEffect(state, 'table', ctx, true);
}

/** Les objets offerts par les niveaux atteints et pas encore posés : `{ idDuMeuble: nombre }`. */
export function inventaire(state           , ctx     )                         {
  const reste                         = {};
  for (const [id, offered] of Object.entries(offeredTotals(shopLevel(state.shop, ctx.cfg), ctx.cfg))) {
    const posed = state.shop.items.filter((it) => it.type === id && it.offert).length;
    if (offered > posed) reste[id] = offered - posed;
  }
  return reste;
}

/** Sort un objet de l'inventaire et le pose à la première place libre ; le joueur le déplace ensuite. */
export function poseOffert(state           , type        , ctx     )                   {
  const def = furnitureDef(type, ctx);
  if (!def || !(inventaire(state, ctx)[type] > 0)) return { ok: false, reason: 'Plus d’exemplaire à poser.' };
  const item = place(state, def, true, ctx);
  if (!item) return { ok: false, reason: 'Plus de place : agrandis la boutique.' };
  syncBaseFurniture(state, ctx);
  return { ok: true, value: item };
}

/** Boosters qu'on peut stocker : la base, plus un bonus par rayon posé. */
export function boosterCap(state           , ctx     )         {
  return ctx.cfg.boosters.storageCap + countEffect(state, 'rayon', ctx) * ctx.cfg.shopLayout.rayonBonus;
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
  if (def.offertSeul) return { ok: false, reason: 'Cet objet vient avec l’agrandissement de la boutique.' };
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
  const { expandBaseCost, expandGrowth } = cfg.shopLayout;
  return Math.round(expandBaseCost * Math.pow(expandGrowth, shopLevel(state.shop, cfg) - 1));
}

/** Un agrandissement par niveau de boutique (`expansionSets`), dans la direction qu'on veut tant qu'elle n'est pas au maximum. */
export function canExpand(state           , cfg            , axis                   = null)          {
  const { maxWidth, maxHeight } = cfg.shopLayout;
  if (shopLevel(state.shop, cfg) >= cfg.shopLayout.expansionSets.length) return false;
  if (axis === 'x') return state.shop.width < maxWidth;
  if (axis === 'y') return state.shop.height < maxHeight;
  return state.shop.width < maxWidth || state.shop.height < maxHeight;
}

/**
 * Agrandit la boutique d'une bande de `expandStep` cases, du côté de l'axe choisi (`x` : vers la droite de l'écran, `y` : vers la gauche).
 * Les meubles ne bougent pas, et le niveau suivant offre son set.
 */
export function expandShop(state           , ctx     , axis            = 'x')                 {
  const { expandStep, maxWidth, maxHeight } = ctx.cfg.shopLayout;
  if (!canExpand(state, ctx.cfg)) return { ok: false, reason: 'La boutique est à sa taille maximale.' };
  if (!canExpand(state, ctx.cfg, axis)) return { ok: false, reason: 'La boutique ne peut plus grandir de ce côté.' };
  const price = expandCost(state, ctx.cfg);
  if (state.gold < price) return { ok: false, reason: 'Or insuffisant.' };
  state.gold -= price;
  if (axis === 'x') state.shop.width = Math.min(maxWidth, state.shop.width + expandStep);
  else state.shop.height = Math.min(maxHeight, state.shop.height + expandStep);
  syncBaseFurniture(state, ctx);
  return { ok: true, value: price };
}
