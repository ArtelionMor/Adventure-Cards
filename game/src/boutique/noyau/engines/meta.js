// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// META systémique : les adversaires débloqués déplacent la demande par archétype, sans
// multiplicateur écrit à la main ni timer. Chaque adversaire ajoute de la demande à l'archétype
// qui bat le sien (pierre-feuille-ciseaux de la config). La moyenne des multiplicateurs reste 1
// avant élasticité. `cardScore` affine ce prix carte par carte : ses valeurs viennent de simulations
// du bot de combat faites HORS LIGNE (`config/meta-scores.json`), un jeu de valeurs par moment du
// jeu, jamais en direct. Le prix reste borné par priceFloor et priceCeil de la rareté.

                                                                                   

/** L'échelle a-t-elle atteint cette position ? */
export function positionReached(at                , state           , ctx     )          {
  const p = state.progression;
  const index = ctx.cfg.meta.opponents.findIndex((o) => o.id === at.opponent);
  return p.level > at.level || (p.level === at.level && p.opponentIndex >= index);
}

export function refreshMeta(state           , ctx     )       {
  const { cfg } = ctx;
  const counts = new Map                ();
  for (const a of cfg.archetypes) counts.set(a.id, cfg.meta.smoothing);
  for (const id of state.progression.opponents) {
    const opp = cfg.meta.opponents.find((o) => o.id === id);
    if (!opp) continue;
    const beater = cfg.archetypes.find((a) => a.beats === opp.archetype);
    if (beater) counts.set(beater.id, (counts.get(beater.id) ?? 0) + 1);
  }
  let total = 0;
  for (const n of counts.values()) total += n;
  const mean = total / Math.max(1, counts.size);
  const mul                         = {};
  for (const [id, n] of counts) mul[id] = mean > 0 ? Math.pow(n / mean, cfg.meta.elasticity) : 1;
  state.meta.archetypeMul = mul;

  let moment                                = null;
  for (const m of cfg.meta.scoreTable) if (positionReached(m, state, ctx)) moment = m.scores;
  if (moment) state.meta.cardScore = moment;
}

/** Importe des scores par carte (1 = neutre), issus d'une mesure extérieure. */
export function importCardScores(state           , scores                        )       {
  state.meta.cardScore = { ...scores };
}

export function metaMultiplier(card         , state           , ctx     )         {
  const archetype = state.meta.archetypeMul[card.archetype] ?? 1;
  const score = state.meta.cardScore[card.id];
  return score === undefined ? archetype : archetype * Math.pow(score, ctx.cfg.meta.cardScoreElasticity);
}
