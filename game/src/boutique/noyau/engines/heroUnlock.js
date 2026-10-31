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
  h.tier = tier;
  return { ok: true, value: undefined };
}
