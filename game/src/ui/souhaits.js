// LES SOUHAITS (2 nov. 2026) : la wishlist des heros, que le joueur classe en rangs (1 S, 3 A, 5 B…) pour favoriser leur sortie dans les
// boosters. Ex-onglet « Heros » de la boutique, rangee derriere un bouton de l'ecran des Packs (le menu sera retravaille avec lui).
// Aucune regle ici : les rangs, leurs places et leurs poids sont dans le noyau (`tiers`, `setHeroTier`, `heroPercents`).
import { t } from '../config/textes.js';
import { BOUTIQUE } from '../config/boutique.js';
import { requiredCards } from '../boutique/noyau/engines/heroUnlock.js';
import { heroPercents, setHeroTier } from '../boutique/noyau/engines/heroUnlock.js';
import { upgradeCost, upgradeHero } from '../boutique/noyau/engines/heroUpgrade.js';
import { change, ctx, partie } from '../boutique/partie.js';
import { spriteDeHeros } from './boutique.js';
import { asset, court, el, modal, toast } from './shell.js';

const cfg = ctx.cfg;
const pct = n => (n >= 10 ? n.toFixed(0) : n.toFixed(1)) + ' %';

/** Un heros en pastille ronde : son portrait, et sous lui ses chances d'etre tire. */
function pastille(hero, S, p, choisi) {
  const h = S.heroes[hero];
  return `<button class="sh-h ${h.unlocked ? '' : 'verrou'} ${choisi === hero ? 'on' : ''}" data-h="${hero}">
    <img src="${asset(spriteDeHeros(hero))}" alt="${hero}" draggable="false"><em>${pct(p[hero])}</em></button>`;
}

export function ouvreSouhaits() {
  let choisi = null;
  const box = el('<div class="sh"></div>');

  const dessine = () => {
    const S = partie();
    const p = heroPercents(S, ctx);
    const rangs = cfg.tiers.list.filter(t => t.limit !== undefined);
    const heros = Object.keys(S.heroes);
    const dans = id => heros.filter(h => S.heroes[h].tier === id);
    const lignes = rangs.map(r => {
      const liste = dans(r.id);
      const total = liste.reduce((n, h) => n + p[h], 0);
      const vides = Array.from({ length: Math.max(0, r.limit - liste.length) }, () => '<i class="sh-vide"></i>').join('');
      return `<div class="sh-rang" data-r="${r.id}"><b class="sh-lettre" style="background:${BOUTIQUE.rangs[r.id]}">${r.id}</b>
        <div class="sh-cases">${liste.map(h => pastille(h, S, p, choisi)).join('')}${vides}</div>
        <span class="sh-total">${pct(total)}</span></div>`;
    }).join('');
    const libres = dans(cfg.tiers.defaultTier);
    box.innerHTML = `<h2>Souhaits</h2><p class="muted">Classe les héros que tu veux voir sortir : les rangs ont un nombre de places, et les chances de chacun se lisent dessous.</p>
      ${lignes}
      <h3>Sans rang</h3><div class="sh-cases libres" data-r="${cfg.tiers.defaultTier}">${libres.map(h => pastille(h, S, p, choisi)).join('')}</div>
      <div class="sh-detail"></div>`;
    box.ondragstart = e => e.preventDefault();
    for (const n of box.querySelectorAll('[data-h]')) {
      n.onclick = () => { choisi = choisi === n.dataset.h ? null : n.dataset.h; dessine(); };
      n.onpointerdown = e => debutGlisse(e, n);
    }
    if (choisi) detail(box.querySelector('.sh-detail'), S, p);
  };

  // GLISSER-DEPOSER : on prend un heros et on le lache sur un rang (ou sur « sans rang »). Un simple toucher garde son sens (la fiche).
  const debutGlisse = (e, n) => {
    if (e.button) return;
    const hero = n.dataset.h, x0 = e.clientX, y0 = e.clientY;
    // Le navigateur ne doit pas prendre le glisser pour le sien (image qu'on entraine, selection, defilement) : il couperait nos evenements.
    try { n.setPointerCapture(e.pointerId); } catch { /* deja relache */ }
    let fantome = null, cible = null;
    const sous = ev => {
      if (fantome) fantome.style.display = 'none';
      const r = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-r]') ?? null;
      if (fantome) fantome.style.display = '';
      return r;
    };
    const bouge = ev => {
      if (!fantome) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
        fantome = n.cloneNode(true);
        fantome.classList.add('sh-fantome');
        document.body.appendChild(fantome);
        n.classList.add('tire');
      }
      fantome.style.left = `${ev.clientX}px`;
      fantome.style.top = `${ev.clientY}px`;
      const r = sous(ev);
      if (r !== cible) { cible?.classList.remove('sur'); cible = r; cible?.classList.add('sur'); }
    };
    const fin = ev => {
      removeEventListener('pointermove', bouge);
      removeEventListener('pointerup', fin);
      removeEventListener('pointercancel', fin);
      if (!fantome) return;                              // un toucher : le onclick fera la fiche
      const r = sous(ev);
      fantome.remove();
      cible?.classList.remove('sur');
      n.onclick = null;                                   // le toucher qui suit un glisser n'ouvre pas la fiche
      if (ev.type === 'pointerup' && r && r.dataset.r !== partie().heroes[hero].tier) {
        const res = setHeroTier(partie(), hero, r.dataset.r, ctx);
        if (!res.ok) toast(res.reason); else change();
      }
      dessine();
    };
    addEventListener('pointermove', bouge);
    addEventListener('pointerup', fin);
    addEventListener('pointercancel', fin);
  };

  /** Le heros touche : son niveau, son avancement, et les rangs ou le mettre. */
  const detail = (zone, S, p) => {
    const h = S.heroes[choisi];
    const requises = requiredCards(choisi, ctx);
    const faites = requises.filter(c => S.collection[c.id] !== undefined).length;
    zone.innerHTML = `<div class="sh-fiche"><img src="${asset(spriteDeHeros(choisi))}" alt="">
      <div><h3>${choisi}</h3><p class="muted">${h.unlocked ? t('ui.levelN', { n: h.level }) : t('ui.lockedCards', { a: faites, b: requises.length })} · ${t('ui.pullsShare', { p: pct(p[choisi]) })}</p></div></div>
      <div class="sh-choix"></div><div class="sh-niv"></div>`;
    const choix = zone.querySelector('.sh-choix');
    for (const t of cfg.tiers.list) {
      const plein = t.limit !== undefined && h.tier !== t.id && Object.values(S.heroes).filter(x => x.tier === t.id).length >= t.limit;
      const b = el(`<button class="sh-rangbtn ${h.tier === t.id ? 'on' : ''}" ${plein ? 'disabled' : ''} style="--c:${BOUTIQUE.rangs[t.id]}">${t.limit === undefined ? 'Sans rang' : t.id}</button>`);
      b.onclick = () => {
        const r = setHeroTier(S, choisi, t.id, ctx);
        if (!r.ok) { toast(r.reason); return; }
        change(); dessine();
      };
      choix.appendChild(b);
    }
    if (h.unlocked && h.level < cfg.heroes.maxLevel) {
      const b = el(`<button class="btq-puce">${t('ui.upgradeFor', { n: court(upgradeCost(cfg, h.level)) })}</button>`);
      b.onclick = () => { const r = upgradeHero(S, choisi, ctx); if (!r.ok) toast(r.reason); else { change(); dessine(); } };
      zone.querySelector('.sh-niv').appendChild(b);
    }
  };

  dessine();
  modal(box);
}
