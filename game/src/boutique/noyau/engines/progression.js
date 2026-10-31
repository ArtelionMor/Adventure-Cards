// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Progression : une échelle d'adversaires. On bat un adversaire `winsToAdvance` fois pour passer
// au suivant ; après le dernier, le niveau monte et l'échelle reprend. Le jeu de cartes signale
// une victoire par `recordWin`, jouée à la main ou par son mode auto, qui existe déjà. Atteindre un
// adversaire applique les paliers qui l'attendent : slots, tables, extensions, fonctions, gems,
// boosters premium.

                                                                   
import { positionReached, refreshMeta } from './meta.js';
import { syncBaseFurniture } from './shop.js';

function reachOpponent(state           , ctx     )       {
  const p = state.progression;
  const opponent = ctx.cfg.meta.opponents[p.opponentIndex];
  if (opponent && !p.opponents.includes(opponent.id)) p.opponents.push(opponent.id);
}

function applyStep(state           , step                 )       {
  const p = state.progression;
  p.showcaseSlots = step.showcaseSlots;
  p.auctionSlots = step.auctionSlots;
  p.tables = step.tables;
  p.extensions.push(...step.extensions);
  p.features.push(...step.features);
  state.gems += step.gems;
  for (const [id, n] of Object.entries(step.premiumBoosters)) {
    state.boosters.premium[id] = (state.boosters.premium[id] ?? 0) + n;
  }
}

function applyReachedSteps(state           , ctx     )       {
  const { steps } = ctx.cfg.progression;
  const p = state.progression;
  while (p.stepIndex < steps.length) {
    const step = steps[p.stepIndex];
    if (!step || !positionReached(step.unlockAt, state, ctx)) break;
    applyStep(state, step);
    p.stepIndex++;
  }
  syncBaseFurniture(state, ctx);
  refreshMeta(state, ctx);
}

export function startProgression(state           , ctx     )       {
  reachOpponent(state, ctx);
  applyReachedSteps(state, ctx);
}

export function ladderFinished(state           , ctx     )          {
  const p = state.progression;
  const { winsToAdvance, levelMax } = ctx.cfg.progression.ladder;
  return p.level >= levelMax && p.opponentIndex >= ctx.cfg.meta.opponents.length - 1 && p.wins >= winsToAdvance;
}

/** Une victoire contre l'adversaire courant. Rend true si l'échelle a avancé. */
export function recordWin(state           , ctx     )          {
  if (ladderFinished(state, ctx)) return false;
  const p = state.progression;
  const { winsToAdvance, levelMax } = ctx.cfg.progression.ladder;
  p.wins++;
  if (p.wins < winsToAdvance) return false;
  const last = p.opponentIndex >= ctx.cfg.meta.opponents.length - 1;
  if (last && p.level >= levelMax) return false;
  ctx.on?.({ t: 'opponentBeaten', opponent: ctx.cfg.meta.opponents[p.opponentIndex]?.id ?? '', level: p.level });
  p.wins = 0;
  if (last) {
    p.opponentIndex = 0;
    p.level++;
  } else p.opponentIndex++;
  reachOpponent(state, ctx);
  applyReachedSteps(state, ctx);
  return true;
}
