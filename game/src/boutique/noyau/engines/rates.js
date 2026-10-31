// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Taux de la rareté objectif, DÉDUIT de l'objectif et du profil de référence (jamais stocké).
// Modèle de tirage : rareté → héros pondéré par son tier → carte du héros.
//
// La tierlist appartient au joueur, sans limite par tier. Le calcul suppose la tierlist de
// référence (`referenceTopCount` héros en tête, le reste au tier par défaut) : une autre tierlist
// partage le même taux autrement. Le déduire de la tierlist réelle donnerait 21 mythiques par
// semaine à qui met tout le monde en S.

                                                              

/** Boosters ouverts par jour : le stock accumulé entre deux sessions (plafonné) + la session. */
export function boostersPerDay(profile                , cfg            )         {
  const { intervalMinutes, storageCap } = cfg.boosters;
  const sessions = [...profile.sessions].sort((a, b) => a.startMinute - b.startMinute);
  let total = 0;
  sessions.forEach((s, i) => {
    const prev = sessions[(i + sessions.length - 1) % sessions.length] ?? s;
    const prevEnd = prev.startMinute + prev.durationMinutes;
    const gap = (s.startMinute - prevEnd + 2880) % 1440 || (sessions.length === 1 ? 1440 - s.durationMinutes : 0);
    total += Math.min(storageCap, Math.floor(gap / intervalMinutes));
    total += Math.floor(s.durationMinutes / intervalMinutes);
  });
  return total;
}

/** Part de la rareté objectif captée par UN héros de tête dans la tierlist de référence. */
export function topHeroShare(cfg            , heroCount        )         {
  const weights = cfg.tiers.list.map((t) => t.weight);
  const top = Math.max(...weights);
  const rest = cfg.tiers.list.find((t) => t.id === cfg.tiers.defaultTier)?.weight ?? 1;
  const topCount = Math.min(cfg.targets.referenceTopCount, heroCount);
  return top / (topCount * top + Math.max(0, heroCount - topCount) * rest);
}

/**
 * Chance par booster d'un tirage réussi pour que l'écart moyen entre deux réussites vaille
 * `meanGap` boosters, avec une pitié qui force la réussite au booster `pity`.
 * Écart moyen avec pitié = (1 − (1 − q)^N) / q. Sans pitié (N = 0) : q = 1 / meanGap.
 * Impossible si N ≤ meanGap : même avec q → 0, la pitié seule fait mieux que l'objectif.
 */
export function boosterChanceForGap(meanGap        , pity        )         {
  if (pity <= 0) return 1 / meanGap;
  if (pity <= meanGap) return Number.NaN;
  let lo = 1e-12;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const q = (lo + hi) / 2;
    const gap = (1 - Math.pow(1 - q, pity)) / q;
    if (gap > meanGap) lo = q;
    else hi = q;
  }
  return (lo + hi) / 2;
}

export function objectiveMeanGap(cfg            )         {
  const profile = cfg.profiles[cfg.targets.referenceProfile];
  if (!profile) throw new Error(`Profil inconnu : ${cfg.targets.referenceProfile}`);
  return (boostersPerDay(profile, cfg) * 7) / cfg.targets.perWeek;
}

/** Taux par carte de la rareté objectif, pour un pool de `heroCount` héros qui en ont une. */
export function objectiveRate(cfg            , heroCount        )         {
  if (heroCount <= 0) return 0;
  const q = boosterChanceForGap(objectiveMeanGap(cfg), cfg.targets.pityBoosters);
  if (Number.isNaN(q)) throw new Error('targets.pityBoosters doit dépasser l’écart moyen visé.');
  const perCard = 1 - Math.pow(1 - q, 1 / cfg.boosters.cardsPerBooster);
  return Math.min(1, perCard / topHeroShare(cfg, heroCount));
}
