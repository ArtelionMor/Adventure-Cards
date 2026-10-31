// L'ECRAN DES PACKS (31 octobre 2026, a la place du Sac) : ouvrir ses boosters, comme dans Pokemon TCG Pocket. Le booster en
// grand, on le DECHIRE d'un doigt sur son haut, les cartes sortent et se passent une a une, de la moins rare a la plus rare ; une
// carte rare arrive de dos, et la retourner est le moment du tirage (rayons, particules Kenney, nom de la rarete). Puis le resume.
// Aucune regle ici : le tirage vient du noyau (`openBooster`, `openPremium`), les reglages de `BOUTIQUE.ouverture`.
import { BOUTIQUE } from '../config/boutique.js';
import { CHAR_BY_ID } from '../config/characters.js';
import { t } from '../config/textes.js';
import { setBulkFilter, setBulkFilterProtectsVariants } from '../boutique/noyau/engines/bulk.js';
import { boosterShopPrice, buyBooster, openBooster, openPremium } from '../boutique/noyau/engines/packs.js';
import { change, ctx, ecoute, partie } from '../boutique/partie.js';
import { DOS_DE_CARTE } from './battle.js';
import { carteDef, carteHtml, spriteDeCarte } from './boutique.js';
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
    const r = premiumId ? openPremium(S, premiumId, ctx) : openBooster(S, ctx);
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

    const revele = () => {
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

    const suivante = () => {
      const n = carte();
      occupe = true;
      rang.classList.remove('vu');
      rayons.classList.remove('on');
      n.animate([{ transform: 'none' }, { transform: `translate(${i % 2 ? 130 : -130}%, -12%) rotate(${i % 2 ? 14 : -14}deg)`, opacity: .2 }],
        { duration: O.jetteMs, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
        n.remove();
        occupe = false;
        i++;
        if (i >= tirage.length) resume(tirage);
      };
    };

    racine.onclick = () => {
      if (occupe || i >= tirage.length) return;
      if (carte().classList.contains('cachee')) revele(); else suivante();
    };
  }

  // --- le resume : tout le tirage d'un coup d'oeil
  function resume(tirage) {
    racine.onclick = null;
    for (const c of ['.pk-plan', '.pk-rang', '.pk-aide']) racine.querySelector(c).remove();
    racine.querySelector('.pk-bandeau').textContent = t('packs.resume');
    const bas = racine.querySelector('.pk-bas-ecran');
    const grille = el(`<div class="pk-resume ${tirage.length > 3 ? 'large' : ''}"></div>`);
    tirage.forEach((x, i) => grille.appendChild(el(`<div class="btq-revele" style="animation-delay:${i * .12}s">
      ${carteHtml(x.cardId, x.finish)}${x.neuve ? `<em>${t('packs.nouvelle')}</em>` : ''}${x.bulk ? `<em class="b">${t('packs.bulk')}</em>` : ''}</div>`)));
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
