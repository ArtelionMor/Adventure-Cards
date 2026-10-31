// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Amélioration des héros : le puits d'or de fin de collection.

                                                                              

/** Coût pour passer du niveau `level` à `level + 1`. */
export function upgradeCost(cfg            , level        )         {
  return Math.round(cfg.heroes.upgradeBaseCost * Math.pow(cfg.heroes.upgradeGrowth, level - 1));
}

export function upgradeHero(state           , hero        , ctx     )                 {
  const h = state.heroes[hero];
  if (!h) return { ok: false, reason: `Héros inconnu : ${hero}.` };
  if (!h.unlocked) return { ok: false, reason: 'Héros verrouillé.' };
  if (h.level >= ctx.cfg.heroes.maxLevel) return { ok: false, reason: 'Niveau maximum atteint.' };
  const cost = upgradeCost(ctx.cfg, h.level);
  if (state.gold < cost) return { ok: false, reason: 'Or insuffisant.' };
  state.gold -= cost;
  h.level++;
  return { ok: true, value: cost };
}
