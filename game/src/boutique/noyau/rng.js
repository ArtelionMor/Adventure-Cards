// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// RNG seedable (mulberry32). Tout le noyau tire par ici : jamais de Math.random().
// L'état tient dans un entier 32 bits, donc il se sauvegarde et se reprend tel quel.

export class Rng {
  state        ;

  constructor(seed        ) {
    this.state = seed >>> 0;
  }

  nextU32()         {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Uniforme dans [0, 1[. */
  next()         {
    return this.nextU32() / 4294967296;
  }

  /** Entier uniforme dans [0, n[. */
  int(n        )         {
    return Math.floor(this.next() * n);
  }
}

/** Loi normale (Box-Muller), sans valeur gardée en réserve : deux tirages, un résultat. */
export function normal(rng     , mean        , sd        )         {
  const u = 1 - rng.next();
  const v = rng.next();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Loi exponentielle de moyenne `mean` (attente d'un processus de Poisson). */
export function exponential(rng     , mean        )         {
  return -Math.log(1 - rng.next()) * mean;
}

/**
 * Loi d'Erlang de moyenne 1 : somme de `k` exponentielles, divisée par k. k = 1 est l'exponentielle ;
 * plus k monte, plus les grandes valeurs deviennent rares (écart-type = 1 / √k).
 */
export function erlangUnit(rng     , k        )         {
  let sum = 0;
  for (let i = 0; i < k; i++) sum -= Math.log(1 - rng.next());
  return sum / k;
}

/** Fonction de répartition de la loi normale centrée réduite (approximation d'Abramowitz-Stegun). */
export function normalCdf(x        )         {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Moyenne de N(1, sd) tronquée à [0, +inf[. La troncature tire la moyenne vers le haut :
 * on divise par elle pour que le poids d'un pas d'enchère ait bien une moyenne de 1.
 */
export function truncatedUnitMean(sd        )         {
  if (sd <= 0) return 1;
  const alpha = -1 / sd;
  const phi = Math.exp((-alpha * alpha) / 2) / Math.sqrt(2 * Math.PI);
  return 1 + (sd * phi) / (1 - normalCdf(alpha));
}

/** Poids ≥ 0 de moyenne 1 : loi normale tronquée à 0, renormalisée par `unitMean`. */
export function truncatedUnitWeight(rng     , sd        , unitMean        )         {
  if (sd <= 0) return 1;
  for (let i = 0; i < 64; i++) {
    const w = normal(rng, 1, sd);
    if (w >= 0) return w / unitMean;
  }
  return 0;
}

/** Indice tiré selon des poids cumulés croissants ; le dernier cumul est le total. */
export function pickCumulative(rng     , cumulative                   )         {
  const total = cumulative[cumulative.length - 1] ?? 0;
  const x = rng.next() * total;
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (x < (cumulative[mid]          )) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
