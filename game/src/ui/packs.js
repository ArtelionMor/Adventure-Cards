// L'ECRAN DES PACKS (31 octobre 2026, a la place du Sac) : ouvrir ses boosters, comme dans Pokemon TCG Pocket. Le booster en
// grand, on le DECHIRE d'un doigt sur son haut, les cartes sortent et se passent une a une, de la moins rare a la plus rare ; une
// carte rare arrive de dos, et la retourner est le moment du tirage (rayons, particules Kenney, nom de la rarete). Puis le resume.
// Aucune regle ici : le tirage vient du noyau (`openBooster`, `openPremium`), les reglages de `BOUTIQUE.ouverture`.
import { BOUTIQUE } from '../config/boutique.js';
import { CHAR_BY_ID } from '../config/characters.js';
import { t } from '../config/textes.js';
import { sendToBulk, setBulkFilter, setBulkFilterProtectsVariants } from '../boutique/noyau/engines/bulk.js';
import { buyPremium, bulkEligible, openBooster, openPremium, premiumShopPrice } from '../boutique/noyau/engines/packs.js';
import { hasFeature } from '../boutique/noyau/state.js';
import { instanceRef } from '../boutique/noyau/engines/pricing.js';
import { listShowcase } from '../boutique/noyau/engines/showcase.js';
import { change, ctx, ecoute, partie } from '../boutique/partie.js';
import { DOS_DE_CARTE } from './battle.js';
import { carteDef, carteHtml, panneauStock, spriteDeCarte } from './boutique.js';
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
    montreResume(racine, tirage, { ferme, encore: () => { ferme(); ouvre(); }, tous: () => { ferme(); ouvreTous(); } });
  }

  function ferme() {
    racine.remove();
    ouverture = null;
    if (ecran) dessine();
  }
}

/**
 * Le resume d'un tirage dans `racine` (qui porte un `.pk-bandeau` et un `.pk-bas-ecran`) : la grille des cartes, puis « Encore un »,
 * « Ouvrir tous (N) » (s'il reste au moins deux boosters) et « Terminer ». `x.sort` dit ce que la carte est devenue (bulk, vitrine).
 */
function montreResume(racine, tirage, { ferme, encore, tous, titre = t('packs.resume') }) {
  racine.querySelector('.pk-bandeau').textContent = titre;
  const bas = racine.querySelector('.pk-bas-ecran');
  const grille = el(`<div class="pk-resume ${tirage.length > 6 ? 'beaucoup' : tirage.length > 3 ? 'large' : ''}"></div>`);
  tirage.forEach((x, i) => grille.appendChild(el(`<div class="btq-revele" style="animation-delay:${Math.min(i, 24) * .06}s">
    ${carteHtml(x.cardId, x.finish)}${x.neuve ? `<em>${t('packs.nouvelle')}</em>` : ''}${x.sort === 'bulk' ? `<em class="b">${t('packs.bulk')}</em>` : ''}${x.sort === 'vitrine' ? `<em class="b">${t('packs.vitrine')}</em>` : ''}</div>`)));
  bas.before(grille);
  const reste = partie().boosters.stock;
  // Les trois actions (3 nov. 2026, boutons refaits) : un gros bouton dore « Open another », puis « Open all (N) » en vert et « Done » en creme, cote a cote.
  const un = el(`<button class="pk-b pk-b-or"><span>${t('packs.encore')}</span><small>${reste} / ${partie().boosters.stock + 0 > 0 ? cfg.boosters.storageCap : cfg.boosters.storageCap}</small></button>`);
  un.disabled = reste <= 0;
  un.onclick = encore;
  const ligne = el('<div class="pk-b-ligne"></div>');
  if (reste >= 2) {
    const b = el(`<button class="pk-b pk-b-vert"><span>${t('packs.ouvrirTous', { n: reste })}</span></button>`);
    b.onclick = tous;
    ligne.appendChild(b);
  }
  const fini = el(`<button class="pk-b pk-b-creme"><span>${t('packs.terminer')}</span></button>`);
  fini.onclick = ferme;
  ligne.appendChild(fini);
  bas.append(un, ligne);
}

/**
 * OUVRIR TOUS : tous les boosters du stock d'un coup, sans la mise en scene. Les cartes ne se rangent pas une par une : le filtre de bulk
 * (le curseur de l'ecran des Packs) envoie ce qu'il doit au bulk, le reste reste dans la collection. Le resume montre tout, la plus rare d'abord.
 */
function ouvreTous() {
  if (ouverture) return;
  const S = partie();
  const n = S.boosters.stock;
  if (n <= 0) { toast(t('packs.vide')); return; }
  const rang = id => cfg.rarities.findIndex(r => r.id === id);
  const tirage = [];
  let ouverts = 0;
  for (let k = 0; k < n; k++) {
    if (!openBooster(S, ctx).ok) break;   // le filtre de bulk s'applique tout seul
    ouverts++;
    for (const x of lisTirage(cfg.boosters.cardsPerBooster)) { x.sort = x.bulk ? 'bulk' : undefined; tirage.push(x); }
  }
  change();
  tirage.sort((a, b) => rang(b.def.rarity) - rang(a.def.rarity) || (b.finish === 'foil') - (a.finish === 'foil'));
  const racine = el('<div class="pk-ouv"><div class="pk-bandeau"></div><div class="pk-bas-ecran"></div></div>');
  ouverture = racine;
  $('#app').appendChild(racine);
  const ferme = () => { racine.remove(); ouverture = null; if (ecran) dessine(); };
  montreResume(racine, tirage, { ferme, encore: () => { ferme(); ouvre(); }, tous: () => { ferme(); ouvreTous(); }, titre: t('packs.tirageDe', { n: ouverts }) });
}

// ------------------------------------------------------------------ l'ecran
let ecran = null;
let quitte = null;

// LE CARROUSEL DES BOOSTERS (maquette du 2 nov. 2026) : le booster de base, puis le premium ; des fleches (ou un glissé) passent de l'un a
// l'autre. Un booster en stock s'ouvre en le touchant ; sans stock, une case en pointilles compte le temps avant le suivant ; un premium
// qu'on n'a pas se rachete (« Buy for »). Sous le carrousel, la COLLECTION (les doubles : l'ex-onglet Stock de la boutique).
let courant = 0;           // l'indice du booster montre
let aDuStock = null;       // le booster de base est-il en stock ? (le carrousel se redessine quand ca change)

const listeBoosters = () => [{ premium: null }, ...cfg.premium.boosters.map(p => ({ premium: p.id }))];
const mmss = s => `${Math.floor(s / 60)}min${String(s % 60).padStart(2, '0')}`;

/** Un booster du carrousel : le paquet (a toi : on le touche pour l'ouvrir), la case en pointillés (plus de stock) ou le paquet a racheter. */
function slideDe(b) {
  const S = partie();
  const possede = b.premium ? (S.boosters.premium[b.premium] ?? 0) : S.boosters.stock;
  if (possede > 0) {
    const n = el(`<div class="pk-vitrine" role="button" aria-label="${t('packs.ouvrir')}">${paquet(!!b.premium)}${b.premium ? `<b class="pk-n">${possede}</b>` : ''}</div>`);
    n.onclick = () => { if (!glisse) ouvre(b.premium); };
    return n;
  }
  if (!b.premium) return el('<div class="pk-vide"><b id="pkSuivant"></b></div>');
  const n = el(`<div class="pk-vitrine achat">${paquet(true)}<button class="pk-achete"></button></div>`);
  const x = n.querySelector('.pk-achete');
  const debloque = hasFeature(S, 'premiumMarket');
  x.textContent = debloque ? t('packs.achetePremium', { n: court(premiumShopPrice(S, b.premium, ctx)) }) : t('packs.premiumBientot');
  x.disabled = !debloque;
  x.onclick = () => { const r = buyPremium(S, b.premium, ctx); if (!r.ok) toast(r.reason); else { change(); dessineCarrousel(); majCompteur(); } };
  return n;
}

/** Tous les boosters sont posés côte à côte : celui du milieu en plein, ses voisins qui dépassent, plus petits et assombris. */
function dessineCarrousel() {
  const S = partie(), liste = listeBoosters();
  courant = Math.min(courant, liste.length - 1);
  const zone = ecran.querySelector('.pk-carrousel');
  zone.innerHTML = '';
  aDuStock = S.boosters.stock > 0;
  liste.forEach((b, i) => {
    const slide = el('<div class="pk-slide"></div>');
    slide.appendChild(slideDe(b));
    slide.onclick = ev => { if (i !== courant && !glisse) { ev.stopPropagation(); va(i); } };
    zone.appendChild(slide);
  });
  for (const [sens, glyphe] of [[-1, '‹'], [1, '›']]) {
    const f = el(`<button class="pk-fleche ${sens < 0 ? 'g' : 'd'}" aria-label="${sens < 0 ? t('ui.previous') : t('ui.next')}">${glyphe}</button>`);
    f.onclick = () => va(courant + sens);
    zone.appendChild(f);
  }
  place();
  majCompteur();
}

/** Place chaque booster par rapport au courant (le CSS anime le changement) ; le fond de l'écran suit. */
function place() {
  const zone = ecran?.querySelector('.pk-carrousel');
  if (!zone) return;
  const liste = listeBoosters();
  [...zone.querySelectorAll('.pk-slide')].forEach((s, i) => {
    s.style.setProperty('--i', i - courant);
    s.classList.toggle('centre', i === courant);
  });
  zone.querySelector('.pk-fleche.g').hidden = courant <= 0;
  zone.querySelector('.pk-fleche.d').hidden = courant >= liste.length - 1;
  $('#screen-packs').dataset.fond = liste[courant].premium ? 'premium' : 'base';
}

function va(n) {
  const nouveau = Math.max(0, Math.min(listeBoosters().length - 1, n));
  if (nouveau === courant) return;
  courant = nouveau;
  place();
}

// Chaque seconde, seuls le compteur et le temps avant le prochain booster changent : le booster reste en place.
function majCompteur() {
  const S = partie(), b = S.boosters;
  if (!ecran) return;
  if ((b.stock > 0) !== aDuStock) { dessineCarrousel(); return; }
  ecran.querySelector('#pkStock').textContent = t('packs.stock', { n: b.stock, max: cfg.boosters.storageCap });
  const reste = Math.ceil((cfg.boosters.intervalMinutes * 60000 - b.progressMs) / 1000);
  ecran.querySelector('#pkProchain').textContent = b.stock >= cfg.boosters.storageCap ? t('packs.plein') : t('packs.prochain', { n: reste });
  const tous = ecran.querySelector('#pkTous');
  tous.hidden = b.stock < 2 || courant !== 0;
  tous.textContent = t('packs.ouvrirTous', { n: b.stock });
  const v = ecran.querySelector('#pkSuivant');
  if (v) v.textContent = t('packs.suivant', { t: mmss(reste) });
}

/** La collection sous le carrousel : les doubles, comme l'ancien onglet Stock (toucher une carte ouvre sa fiche : vitrine, bulk, grading…). */
function dessineCollection() {
  if (!ecran) return;
  const zone = ecran.querySelector('.pk-collection');
  zone.innerHTML = '';
  zone.appendChild(panneauStock());
}

function dessine() {
  const S = partie();
  const racine = $('#screen-packs');
  racine.innerHTML = '';
  ecran = el(`<div class="pk">
    <div class="pk-compte"><b id="pkStock"></b><span id="pkProchain"></span></div>
    <button class="pk-souhaits" id="pkSouhaits" aria-label="Souhaits">★</button>
    <div class="pk-carrousel"></div>
    <button class="pk-tous" id="pkTous" hidden></button>
    <div class="pk-collection"></div>
    <div class="pk-actions">
      <label class="btq-filtre">${t('packs.filtre')} <b id="pkSeuilV">${S.settings.bulkFilterThreshold}</b>
        <input type="range" id="pkSeuil" min="0" max="60" value="${S.settings.bulkFilterThreshold}"></label>
      <label class="btq-case"><input type="checkbox" id="pkProtege" ${S.settings.bulkFilterProtectVariants ? 'checked' : ''}> ${t('packs.garderFoils')}</label>
    </div>
  </div>`);
  racine.appendChild(ecran);
  ecran.querySelector('#pkSouhaits').onclick = ouvreSouhaits;
  ecran.querySelector('#pkTous').onclick = ouvreTous;
  ecran.querySelector('#pkSeuil').oninput = e => { setBulkFilter(S, Number(e.target.value)); ecran.querySelector('#pkSeuilV').textContent = e.target.value; };
  ecran.querySelector('#pkProtege').onchange = e => setBulkFilterProtectsVariants(S, e.target.checked);
  // Glisser le carrousel passe au booster voisin ; un glissé n'ouvre pas le booster (`glisse`).
  const zone = ecran.querySelector('.pk-carrousel');
  let x0 = null;
  zone.onpointerdown = ev => { x0 = ev.clientX; glisse = false; };
  zone.onpointermove = ev => { if (x0 !== null && Math.abs(ev.clientX - x0) > 12) glisse = true; };
  zone.onpointerup = ev => {
    if (x0 === null) return;
    const dx = ev.clientX - x0;
    x0 = null;
    if (Math.abs(dx) < 50) { setTimeout(() => { glisse = false; }, 0); return; }
    const n = Math.max(0, Math.min(listeBoosters().length - 1, courant + (dx < 0 ? 1 : -1)));
    va(n);
    setTimeout(() => { glisse = false; }, 0);
  };
  zone.onpointercancel = () => { x0 = null; glisse = false; };
  dessineCarrousel();
  dessineCollection();
}
let glisse = false;

export function renderPacks() {
  // Les particules se chargent d'avance : la premiere gerbe ne doit pas sortir vide.
  for (const nom of O.particules) new Image().src = texture(nom);
  dessine();
  quitte?.();
  quitte = ecoute(e => {
    if (e.t === 'seconde' && !ouverture) majCompteur();
    else if (e.t === 'change' && !ouverture) { dessineCollection(); if (ecran) majCompteur(); }
  });
}

export function quittePacks() {
  quitte?.();
  quitte = null;
  ecran = null;
}
