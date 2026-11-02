// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Déblocage et tierlist des héros.
// Un héros se débloque quand toutes ses cartes de base ont été ouvertes, hors switch.
// Une mythique du deck de base d'un héros est donc requise comme les autres cartes.
// `heroes.unlockExcludedRarities` permet de mesurer l'inverse (scénario `mythique_bonus`).

                                                                                   

export function requiredCards(hero        , ctx     )            {
  const excluded = ctx.cfg.heroes.unlockExcludedRarities;
  return (ctx.index.cardsByHero.get(hero) ?? []).filter((c) => !c.isSwitch && !excluded.includes(c.rarity));
}

export function canUnlockHero(state           , hero        , ctx     )          {
  const required = requiredCards(hero, ctx);
  return required.length > 0 && required.every((c) => state.collection[c.id] !== undefined);
}

/** Appelé à chaque découverte. Le déblocage est automatique et définitif. */
export function checkHeroUnlock(state           , hero        , ctx     )          {
  const h = state.heroes[hero];
  if (!h || h.unlocked || !canUnlockHero(state, hero, ctx)) return false;
  h.unlocked = true;
  ctx.on?.({ t: 'heroUnlocked', hero });
  return true;
}

/** La tierlist est un état joueur ; un héros encore verrouillé s'y classe aussi. */
export function setHeroTier(state           , hero        , tier        , ctx     )         {
  const h = state.heroes[hero];
  if (!h) return { ok: false, reason: `Héros inconnu : ${hero}.` };
  if (!ctx.index.tierWeight.has(tier)) return { ok: false, reason: `Tier inconnu : ${tier}.` };
  const limit = ctx.cfg.tiers.list.find((t) => t.id === tier)?.limit;
  if (limit !== undefined && h.tier !== tier) {
    const pris = Object.values(state.heroes).filter((x) => x.tier === tier).length;
    if (pris >= limit) return { ok: false, reason: `Le rang ${tier} est plein (${limit}).` };
  }
  h.tier = tier;
  return { ok: true, value: undefined };
}

/** Les chances de chaque héros d'être celui de la prochaine carte tirée, en % (poids de son rang sur la somme) : la wishlist les affiche. */
export function heroPercents(state           , ctx     )                         {
  const weightOf = (hero        )         => ctx.index.tierWeight.get(state.heroes[hero]?.tier ?? ctx.cfg.tiers.defaultTier) ?? 0;
  const heroes = Object.keys(state.heroes);
  const total = heroes.reduce((n, h) => n + weightOf(h), 0);
  return Object.fromEntries(heroes.map((h) => [h, total > 0 ? (100 * weightOf(h)) / total : 0]));
}
