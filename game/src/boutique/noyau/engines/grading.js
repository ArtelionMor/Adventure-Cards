// GÉNÉRÉ par scripts/gen-boutique.mjs depuis le noyau de la boutique : ne pas éditer ici.
// Atelier de grading : prix fixe selon la rareté, note de 1 à 10 selon une loi normale propre à chaque entreprise. Une maison dure
// note bas mais sa note vaut plus cher (`noteValue`) : à espérance voisine, le choix est entre la sécurité et le gros coup.
// Le grading se fait sur une copie du stock, qui part à l'atelier le temps de `grading.minutes` et revient notée. Casser une note coûte des gems et rend la copie
// non gradée : on repaie alors pour retenter le 10.

import { normal } from '../rng.js';
                                     
import { hasFeature } from '../state.js';
                                                                                                  
import { spendGems } from './gems.js';

/** Loi normale arrondie, tronquée à 1..10 par rejet : pas d'empilement sur les bornes. */
export function drawGrade(rng     , company                )         {
  for (let i = 0; i < 256; i++) {
    const g = Math.round(normal(rng, company.mean, company.sd));
    if (g >= 1 && g <= 10) return g;
  }
  return Math.round(Math.min(10, Math.max(1, company.mean)));
}

export function gradingCompany(cfg            , id         = cfg.grading.defaultCompany)                             {
  return cfg.grading.companies.find((c) => c.id === id);
}

export function gradeCard(state           , id            , ctx     , companyId         )                 {
  if (!hasFeature(state, ctx.cfg.grading.feature)) return { ok: false, reason: 'Atelier de grading pas encore débloqué.' };
  const company = gradingCompany(ctx.cfg, companyId);
  if (!company) return { ok: false, reason: 'Entreprise de grading inconnue.' };
  const inst = state.instances[id];
  if (!inst) return { ok: false, reason: 'Exemplaire inconnu.' };
  if (inst.location !== 'stock') return { ok: false, reason: 'Seule une copie du stock se grade.' };
  if (inst.grade !== null) return { ok: false, reason: 'Déjà gradée : il faut d’abord casser la note.' };
  const card = ctx.index.cardById.get(inst.cardId);
  const cost = card ? ctx.index.rarityById.get(card.rarity)?.gradingCost : undefined;
  if (cost === undefined) return { ok: false, reason: 'Rareté inconnue.' };
  if (state.gold < cost) return { ok: false, reason: 'Or insuffisant.' };
  state.gold -= cost;
  inst.location = 'grading';
  const grade = drawGrade(ctx.rng, company);
  state.gradingQueue.push({ instanceId: id, grade, company: company.id, doneMs: state.nowMs + ctx.cfg.grading.minutes * 60000 });
  return { ok: true, value: grade };
}

/** Les copies dont le grading est fini reviennent au stock, avec leur note. */
export function settleGrading(state           , ctx     )       {
  const q = state.gradingQueue;
  for (let i = q.length - 1; i >= 0; i--) {
    const job = q[i];
    if (!job || state.nowMs < job.doneMs) continue;
    q.splice(i, 1);
    const inst = state.instances[job.instanceId];
    if (!inst) continue;
    inst.location = 'stock';
    inst.grade = job.grade;
    inst.slab = { company: job.company, by: null, atMs: job.doneMs };
    ctx.on?.({ t: 'gradeDone', instanceId: job.instanceId, cardId: inst.cardId, grade: job.grade });
  }
}

export function breakGrade(state           , id            , ctx     )         {
  const inst = state.instances[id];
  if (!inst) return { ok: false, reason: 'Exemplaire inconnu.' };
  if (inst.location !== 'stock') return { ok: false, reason: 'Seule une copie du stock se casse.' };
  if (inst.grade === null) return { ok: false, reason: 'Cette copie n’est pas gradée.' };
  const paid = spendGems(state, ctx.cfg.grading.breakSink, ctx);
  if (!paid.ok) return paid;
  inst.grade = null;
  inst.slab = null;
  return { ok: true, value: undefined };
}
