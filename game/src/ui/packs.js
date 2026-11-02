// L'ECRAN DES PACKS (31 octobre 2026, a la place du Sac) : ouvrir ses boosters, comme dans Pokemon TCG Pocket. Le booster en
// grand, on le DECHIRE d'un doigt sur son haut, les cartes sortent et se passent une a une, de la moins rare a la plus rare ; une
// carte rare arrive de dos, et la retourner est le moment du tirage (rayons, particules Kenney, nom de la rarete). Puis le resume.
// Aucune regle ici : le tirage vient du noyau (`openBooster`, `openPremium`), les reglages de `BOUTIQUE.ouverture`.
import { BOUTIQUE } from '../config/boutique.js';
import { CHAR_BY_ID } from '../config/characters.js';
import { t } from '../config/textes.js';
import { sendToBulk, setBulkFilter, setBulkFilterProtectsVariants } from '../boutique/noyau/engines/bulk.js';
import { boosterShopPrice, buyBooster, bulkEligible, openBooster, openPremium } from '../boutique/noyau/engines/packs.js';
import { instanceRef } from '../boutique/noyau/engines/pricing.js';
import { listShowcase } from '../boutique/noyau/engines/showcase.js';
import { change, ctx, ecoute, partie } from '../boutique/partie.js';
import { DOS_DE_CARTE } from './battle.js';
import { carteDef, carteHtml, spriteDeCarte } from './boutique.js';
import { ouvreSouhaits } from './souhaits.js';
import { $, asset, court, el, toast } from './shell.js';

const cfg = ctx.cfg;
const O = BOUTIQUE.ouverture;
const hasard = (a, b) => a + Math.random() * (b - a);
const texture = nom => asset(`Graphical Assets/VFX/${nom}.png`);

// ------------------------------------------------------------------ le booster
// Le bord dechire : des dents le long de la ligne ou le haut se detache (le haut et le bas sont deux copies de la meme face).
const dents = (n = 14) => Array.from({ length: n + 1 }, (_, i) => `${i * 100 / n}% ${O.ligneDechirure + (i % 2 ? 1.2 : 0)}%`);
const COUPE_HAUT = `polygon(0 0, 100% 0, ${[...dents()].reverse().join(', ')})`;
const COUPE_BAS = `polygon(${dents().join(', ')}, 100% 100%, 0 100%)`;

function faceDuPack(premium) {
  const dessin = CHAR_BY_ID[premium ? O.heros.premium : O.heros.base]?.sprite;
  return `<div class="pk-face ${premium ? 'premium' : ''}">
    <i class="pk-sertie h"></i>
    <b class="pk-titre">${t('packs.titre')}</b>
    <img class="pk-dessin" src="${asset(dessin)}" alt="">
    <span class="pk-nom">${t(premium ? 'packs.premium' : 'packs.booster')}</span>
    <i class="pk-reflet"></i>
    <i class="pk-sertie b"></i>
  </div>`;
}

const paquet = premium => `<div class="pk-pack">
  <div class="pk-morceau bas" style="clip-path:${COUPE_BAS}">${faceDuPack(premium)}</div>
  <div class="pk-morceau haut" style="clip-path:${COUPE_HAUT}">${faceDuPack(premium)}</div>
</div>`;

// ------------------------------------------------------------------ les particules
/** Une gerbe de particules (textures blanches de `Graphical Assets/VFX/`, teintees par un masque) depuis le centre de `plan`. */
function gerbe(plan, n, couleur, portee) {
  for (let i = 0; i < n; i++) {
    const p = el('<i class="pk-part"></i>');
    const url = `url("${texture(O.particules[i % O.particules.length])}")`;
    const taille = hasard(16, 54);
    const a = hasard(0, Math.PI * 2), d = portee * hasard(.35, 1);
    const fin = `${Math.cos(a) * d}px ${Math.sin(a) * d}px`;
    Object.assign(p.style, { width: `${taille}px`, height: `${taille}px`, background: couleur, maskImage: url, webkitMaskImage: url });
    plan.appendChild(p);
    p.animate([
      { translate: '0 0', scale: .2, opacity: 1, rotate: '0deg' },
      { translate: fin, scale: 1, opacity: 1, rotate: `${hasard(-200, 200)}deg`, offset: .7 },
      { translate: fin, scale: .4, opacity: 0, rotate: `${hasard(-260, 260)}deg` }
    ], { duration: hasard(700, 1400), easing: 'cubic-bezier(.12, .75, .3, 1)' }).onfinish = () => p.remove();
  }
}

// ------------------------------------------------------------------ l'ouverture
let ouverture = null;   // l'ecran d'ouverture en cours

/** Le tirage qu'on vient d'ouvrir, de la carte la moins rare a la plus rare : les derniers exemplaires crees. */
function lisTirage(n) {
  const S = partie();
  const rang = id => cfg.rarities.findIndex(r => r.id === id);
  return Array.from({ length: n }, (_, i) => S.instances[S.nextInstanceId - n + i])
    .filter(Boolean)
    .map(inst => ({ ...inst, def: carteDef(inst.cardId), neuve: inst.location === 'collection', bulk: inst.location === 'bulk' }))
    .sort((a, b) => rang(a.def.rarity) - rang(b.def.rarity) || (a.finish === 'foil') - (b.finish === 'foil'));
}

function carteTiree(x, i, total) {
  const r = x.def.rarity;
  return el(`<div class="pk-carte ${x.finish === 'foil' ? 'foil' : ''} ${O.raretes[r] ? 'cachee' : ''}" data-r="${r}" style="z-index:${total - i};--r:${BOUTIQUE.couleursRaretes[r]}">
    <div class="pk-dos"><img src="${asset(DOS_DE_CARTE)}" alt=""></div>
    <div class="pk-recto">
      <img src="${asset(spriteDeCarte(x.cardId))}" alt="">
      <b>${x.def.name}</b>
      <small>${ctx.index.rarityById.get(r).name}${x.finish === 'foil' ? ` · ${t('packs.foil')}` : ''}</small>
      ${x.neuve ? `<em>${t('packs.nouvelle')}</em>` : ''}
    </div>
  </div>`);
}

/** L'ecran d'ouverture, du booster entier au resume. `premiumId` : un booster premium, sinon le booster de base. */
function ouvre(premiumId = null) {
  if (ouverture) return;
  const S = partie();
  if ((premiumId ? S.boosters.premium[premiumId] : S.boosters.stock) <= 0) { toast(t('packs.vide')); return; }
  const racine = el(`<div class="pk-ouv">
    <div class="pk-bandeau">${t('packs.ouvre')}</div>
    <div class="pk-rang"></div>
    <div class="pk-plan">
      <i class="pk-rayons"></i>
      <div class="pk-pile"></div>
      ${paquet(!!premiumId)}
      <div class="pk-guide"><i></i></div>
    </div>
    <div class="pk-aide">${t('packs.aideDechire')}</div>
    <b class="pk-cote g">‹ ${t('packs.versCollection')}</b><b class="pk-cote d">${t('packs.versVente')} ›</b>
    <div class="pk-bas-ecran"></div>
  </div>`);
  ouverture = racine;
  $('#app').appendChild(racine);
  const plan = racine.querySelector('.pk-plan');
  const pack = racine.querySelector('.pk-pack');
  const haut = pack.querySelector('.haut');

  // --- dechirer : le doigt qui glisse souleve le haut ; assez loin (ou un simple toucher), il part.
  let x0 = null, fait = false;
  const avance = p => { haut.style.transform = `rotate(${p * 6}deg) translate(${p * 10}px, ${-p * 14}px)`; };
  plan.onpointerdown = ev => { if (!fait) x0 = ev.clientX; };
  plan.onpointermove = ev => {
    if (x0 === null) return;
    const p = Math.max(0, Math.min(1, (ev.clientX - x0) / pack.offsetWidth));
    avance(p);
    if (p >= O.seuilDechirure) { x0 = null; dechire(); }
  };
  plan.onpointerup = ev => {
    if (x0 === null) return;
    const bouge = Math.abs(ev.clientX - x0);
    x0 = null;
    if (bouge < 10) dechire(); else avance(0);
  };
  plan.onpointercancel = () => { x0 = null; avance(0); };

  function dechire() {
    if (fait) return;
    fait = true;
    plan.onpointerdown = plan.onpointermove = plan.onpointerup = plan.onpointercancel = null;
    const n = premiumId ? cfg.premium.boosters.find(p => p.id === premiumId).slots.length : cfg.boosters.cardsPerBooster;
    // Les doubles restent en stock : c'est le joueur qui choisit leur sort, carte par carte (`decide`).
    const r = premiumId ? openPremium(S, premiumId, ctx, { autoBulk: false }) : openBooster(S, ctx, { autoBulk: false });
    if (!r.ok) { toast(r.reason); ferme(); return; }
    const tirage = lisTirage(n);
    change();
    const pile = racine.querySelector('.pk-pile');
    tirage.forEach((x, i) => pile.appendChild(carteTiree(x, i, tirage.length)));
    racine.querySelector('.pk-guide').remove();
    racine.querySelector('.pk-aide').textContent = '';
    gerbe(plan, O.gerbeDechirure, '#fff', 170);
    haut.animate([
      { transform: getComputedStyle(haut).transform },
      { transform: 'translate(150px, -320px) rotate(38deg)', opacity: 0 }
    ], { duration: O.dechirureMs, easing: 'ease-in', fill: 'forwards' });
    pack.querySelector('.bas').animate([
      { transform: 'none' }, { transform: 'translateY(-3%)', offset: .3 }, { transform: 'translateY(125%)' }
    ], { duration: O.sortieMs, delay: O.dechirureMs * .6, easing: 'cubic-bezier(.5, 0, .75, .4)', fill: 'forwards' })
      .onfinish = () => { pack.remove(); passe(tirage); };
  }

  // --- passer les cartes : toucher retourne une carte de dos, puis la jette
  function passe(tirage) {
    racine.querySelector('.pk-bandeau').textContent = t('packs.tes');
    racine.querySelector('.pk-aide').textContent = t('packs.aidePasse');
    let i = 0, occupe = false;
    const carte = () => racine.querySelector('.pk-pile .pk-carte');
    const rang = racine.querySelector('.pk-rang');
    const rayons = racine.querySelector('.pk-rayons');

    let revele = () => {
      const n = carte(), r = tirage[i].def.rarity;
      const effet = O.raretes[r], couleur = BOUTIQUE.couleursRaretes[r];
      occupe = true;
      n.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: O.retourneMs / 2, easing: 'ease-in' }).onfinish = () => {
        n.classList.remove('cachee');
        n.animate([{ transform: 'rotateY(-90deg) scale(1.1)' }, { transform: 'rotateY(0deg) scale(1)' }], { duration: O.retourneMs / 2, easing: 'ease-out' }).onfinish = () => { occupe = false; };
        gerbe(plan, effet.particules, couleur, effet.portee);
        rang.textContent = ctx.index.rarityById.get(r).name;
        rang.style.setProperty('--r', couleur);
        rang.classList.remove('vu'); void rang.offsetWidth; rang.classList.add('vu');
        if (effet.rayons) { rayons.style.setProperty('--r', couleur); rayons.classList.add('on'); }
        if (effet.secousse) racine.animate([0, -8, 8, -6, 6, -3, 3, 0].map(v => ({ translate: `${v}px ${-v / 2}px` })), { duration: 420 });
      };
    };

    // --- le sort de la carte : a gauche elle reste a toi, a droite elle part a la vente (bulk si elle y est eligible, sinon vitrine
    // libre au prix de reference). Une carte NOUVELLE reste toujours dans la collection : c'est sa seule copie.
    const cotes = [...racine.querySelectorAll('.pk-cote')];
    const decide = choix => {
      const x = tirage[i], S = partie(), inst = S.instances[x.id];
      let sort = 'collection';
      if (choix === 'vente') {
        if (x.neuve || !inst) toast(t('packs.nouvelleReste'));
        else if (bulkEligible(S, inst, ctx)) { sendToBulk(S, x.id); sort = 'bulk'; }
        else {
          const r = listShowcase(S, x.id, Math.max(1, Math.round(instanceRef(inst, S, ctx))), ctx);
          if (r.ok) sort = 'vitrine'; else toast(t('packs.pasDePlace'));
        }
      }
      x.sort = sort;
      change();
      suivante(sort === 'collection' ? -1 : 1);
    };

    const suivante = sens => {
      const n = carte();
      occupe = true;
      calme();
      rang.classList.remove('vu');
      rayons.classList.remove('on');
      n.animate([{ transform: n.style.transform || 'none' }, { transform: `translate(${sens * 130}%, -12%) rotate(${sens * 14}deg)`, opacity: .2 }],
        { duration: O.jetteMs, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
        n.remove();
        occupe = false;
        i++;
        racine.querySelector('.pk-aide').textContent = t('packs.aidePasse');
        if (i >= tirage.length) resume(tirage);
      };
    };

    // Sans geste pendant `O.veilleMs`, la carte se balance de gauche a droite et nomme chaque cote.
    let veille = 0, balance = [];
    const calme = () => {
      clearTimeout(veille);
      for (const a of balance) a.cancel();
      balance = [];
      for (const c of cotes) c.style.opacity = 0;
    };
    const arme = () => {
      calme();
      if (occupe || i >= tirage.length || !carte() || carte().classList.contains('cachee')) return;
      veille = setTimeout(() => {
        const n = carte();
        if (!n) return;
        balance = [
          n.animate([{ transform: 'none' }, { transform: 'translateX(-22%) rotate(-7deg)', offset: .25 }, { transform: 'none', offset: .5 },
            { transform: 'translateX(22%) rotate(7deg)', offset: .75 }, { transform: 'none' }], { duration: O.balanceMs, iterations: Infinity, easing: 'ease-in-out' }),
          cotes[0].animate([{ opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 0, offset: .5 }, { opacity: 0 }], { duration: O.balanceMs, iterations: Infinity, fill: 'both' }),
          cotes[1].animate([{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { duration: O.balanceMs, iterations: Infinity, fill: 'both' })
        ];
      }, O.veilleMs);
    };

    // Toucher une carte cachee la retourne ; une carte retournee se glisse (a gauche : collection, a droite : vente) ou se touche d'un cote.
    let doigt = null;
    racine.onpointerdown = ev => {
      if (occupe || i >= tirage.length) return;
      calme();
      doigt = { x: ev.clientX, dx: 0 };
    };
    racine.onpointermove = ev => {
      if (!doigt || !carte() || carte().classList.contains('cachee')) return;
      doigt.dx = ev.clientX - doigt.x;
      carte().style.transform = `translateX(${doigt.dx}px) rotate(${doigt.dx / 18}deg)`;
      cotes[0].style.opacity = Math.max(0, Math.min(1, -doigt.dx / 90));
      cotes[1].style.opacity = Math.max(0, Math.min(1, doigt.dx / 90));
    };
    const lache = ev => {
      if (!doigt) return;
      const { dx } = doigt;
      doigt = null;
      const n = carte();
      if (!n || occupe) return;
      if (n.classList.contains('cachee')) { if (ev.type === 'pointerup') revele(); return; }
      if (Math.abs(dx) > 70) { decide(dx < 0 ? 'collection' : 'vente'); return; }
      // Un toucher : sur un BORD il va de ce cote (a droite la vente, a gauche la collection), au MILIEU il va a la collection.
      if (Math.abs(dx) < 10 && ev.type === 'pointerup') {
        const f = (ev.clientX - racine.getBoundingClientRect().left) / racine.offsetWidth;
        decide(f > 1 - O.bordTapPart ? 'vente' : 'collection');
        return;
      }
      n.animate([{ transform: n.style.transform }, { transform: 'none' }], { duration: 160 });
      n.style.transform = '';
      arme();
    };
    racine.onpointerup = lache;
    racine.onpointercancel = lache;
    racine.onclick = null;
    // Une carte retournee : l'aide change, et la veille commence.
    const retourne = revele;
    revele = () => {
      retourne();
      racine.querySelector('.pk-aide').textContent = t('packs.aideChoix');
      setTimeout(arme, O.retourneMs + 200);
    };
    // Une carte sans effet de rarete n'a pas de dos : elle est deja visible.
    if (!carte().classList.contains('cachee')) { racine.querySelector('.pk-aide').textContent = t('packs.aideChoix'); arme(); }
  }

  // --- le resume : tout le tirage d'un coup d'oeil
  function resume(tirage) {
    racine.onclick = racine.onpointerdown = racine.onpointermove = racine.onpointerup = racine.onpointercancel = null;
    for (const c of ['.pk-plan', '.pk-rang', '.pk-aide', '.pk-cote']) racine.querySelector(c).remove();
    racine.querySelector('.pk-bandeau').textContent = t('packs.resume');
    const bas = racine.querySelector('.pk-bas-ecran');
    const grille = el(`<div class="pk-resume ${tirage.length > 3 ? 'large' : ''}"></div>`);
    tirage.forEach((x, i) => grille.appendChild(el(`<div class="btq-revele" style="animation-delay:${i * .12}s">
      ${carteHtml(x.cardId, x.finish)}${x.neuve ? `<em>${t('packs.nouvelle')}</em>` : ''}${x.sort === 'bulk' ? `<em class="b">${t('packs.bulk')}</em>` : ''}${x.sort === 'vitrine' ? `<em class="b">${t('packs.vitrine')}</em>` : ''}</div>`)));
    bas.before(grille);
    const encore = el(`<button class="btn">${t('packs.encore')}</button>`);
    encore.disabled = partie().boosters.stock <= 0;
    encore.onclick = () => { ferme(); ouvre(); };
    const fini = el(`<button class="btn alt">${t('packs.terminer')}</button>`);
    fini.onclick = ferme;
    bas.append(encore, fini);
  }

  function ferme() {
    racine.remove();
    ouverture = null;
    if (ecran) dessine();
  }
}

// ------------------------------------------------------------------ l'ecran
let ecran = null;
let quitte = null;

// Chaque seconde, seuls le compteur et les boutons changent : le booster reste en place.
function majCompteur() {
  const S = partie(), b = S.boosters;
  if (!ecran) return;
  ecran.querySelector('#pkStock').textContent = t('packs.stock', { n: b.stock, max: cfg.boosters.storageCap });
  ecran.querySelector('#pkProchain').textContent = b.stock >= cfg.boosters.storageCap ? t('packs.plein')
    : t('packs.prochain', { n: Math.ceil((cfg.boosters.intervalMinutes * 60000 - b.progressMs) / 1000) });
  ecran.querySelector('#pkOuvre').disabled = b.stock <= 0;
  ecran.querySelector('#pkAchete').textContent = t('packs.acheter', { n: court(boosterShopPrice(S, ctx)) });
}

function dessine() {
  const S = partie();
  const racine = $('#screen-packs');
  racine.innerHTML = '';
  ecran = el(`<div class="pk">
    <div class="pk-compte"><b id="pkStock"></b><span id="pkProchain"></span></div>
    <button class="pk-souhaits" id="pkSouhaits" aria-label="Souhaits">★</button>
    <div class="pk-vitrine" role="button" aria-label="${t('packs.ouvrir')}">${paquet(false)}</div>
    <div class="pk-actions">
      <button class="btn" id="pkOuvre">${t('packs.ouvrir')}</button>
      <button class="btn alt" id="pkAchete"></button>
      <div id="pkPremium"></div>
      <label class="btq-filtre">${t('packs.filtre')} <b id="pkSeuilV">${S.settings.bulkFilterThreshold}</b>
        <input type="range" id="pkSeuil" min="0" max="60" value="${S.settings.bulkFilterThreshold}"></label>
      <label class="btq-case"><input type="checkbox" id="pkProtege" ${S.settings.bulkFilterProtectVariants ? 'checked' : ''}> ${t('packs.garderFoils')}</label>
    </div>
  </div>`);
  racine.appendChild(ecran);
  ecran.querySelector('.pk-vitrine').onclick = () => ouvre();
  ecran.querySelector('#pkSouhaits').onclick = ouvreSouhaits;
  ecran.querySelector('#pkOuvre').onclick = () => ouvre();
  ecran.querySelector('#pkAchete').onclick = () => {
    const r = buyBooster(S, ctx);
    if (!r.ok) toast(r.reason); else { change(); majCompteur(); }
  };
  ecran.querySelector('#pkSeuil').oninput = e => { setBulkFilter(S, Number(e.target.value)); ecran.querySelector('#pkSeuilV').textContent = e.target.value; };
  ecran.querySelector('#pkProtege').onchange = e => setBulkFilterProtectsVariants(S, e.target.checked);
  for (const [id, n] of Object.entries(S.boosters.premium)) {
    if (n <= 0) continue;
    const b = el(`<button class="btn alt">${t('packs.ouvrirPremium', { n })}</button>`);
    b.onclick = () => ouvre(id);
    ecran.querySelector('#pkPremium').appendChild(b);
  }
  majCompteur();
}

export function renderPacks() {
  // Les particules se chargent d'avance : la premiere gerbe ne doit pas sortir vide.
  for (const nom of O.particules) new Image().src = texture(nom);
  dessine();
  quitte?.();
  quitte = ecoute(e => { if (e.t === 'seconde' && !ouverture) majCompteur(); });
}

export function quittePacks() {
  quitte?.();
  quitte = null;
  ecran = null;
}
