// L'ECRAN DE LA BOUTIQUE : la scene (ui/boutique-scene.js) prend l'ecran, cinq onglets (ui/onglets.js) ouvrent un panneau sous elle. Toute regle vient du noyau
// (`boutique/noyau/`, genere par scripts/gen-boutique.mjs) : cet ecran affiche et appelle ses moteurs, il ne calcule rien.
import { BOUTIQUE } from '../config/boutique.js';
import { CHAR_BY_ID } from '../config/characters.js';
import { ENCOUNTERS } from '../config/world.js';
import { auctionMeanPrice, listAuction } from '../boutique/noyau/engines/auction.js';
import { bulkClearHours, sendToBulk, setBulkFilter, setBulkFilterProtectsVariants } from '../boutique/noyau/engines/bulk.js';
import { breakGrade, gradeCard } from '../boutique/noyau/engines/grading.js';
import { requiredCards, setHeroTier } from '../boutique/noyau/engines/heroUnlock.js';
import { upgradeCost, upgradeHero } from '../boutique/noyau/engines/heroUpgrade.js';
import { buyMarketCard, marketPrice } from '../boutique/noyau/engines/market.js';
import { boosterShopPrice, buyBooster, buyPremium, openBooster, openPremium, premiumRef } from '../boutique/noyau/engines/packs.js';
import { betterCopyFor, buyerReaction, instanceRef, instanceRefMax } from '../boutique/noyau/engines/pricing.js';
import { cancelShowcase, formatDuration, listShowcase, quoteShowcase, repriceShowcase, showcasePriceCap } from '../boutique/noyau/engines/showcase.js';
import { buyFurniture, canExpand, expandCost, expandShop, furniturePrice, moveFurniture, sellFurniture, showcaseCapacity } from '../boutique/noyau/engines/shop.js';
import { checkSellable, hasFeature, swapCollectionOccupant } from '../boutique/noyau/state.js';
import { adversaireCourant, avanceDeMinutes, change, ctx, ecoute, partie } from '../boutique/partie.js';
import { arreteScene, choisisMeuble, lanceScene, modeDeco } from './boutique-scene.js';
import { icone } from './icones.js';
import { creeOnglets } from './onglets.js';
import { $, asset, closeModal, court, el, fmtTime, modal, toast } from './shell.js';

const cfg = ctx.cfg;
const ONGLETS = [['boosters', 'Boosters'], ['stock', 'Stock'], ['ventes', 'Ventes'], ['deco', 'Décorer'], ['heros', 'Héros']];
let onglets = null;
let racine = null;
let desabonne = null;
let tirage = null;

// ------------------------------------------------------------------ images
const SPRITES = new Map();
const SPRITES_HEROS = new Map();
// Le jeu ecrit « Félix », le catalogue « Felix » : un nom de heros se compare sans accent ni casse.
const cleHeros = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
for (const c of Object.values(CHAR_BY_ID)) {
  SPRITES_HEROS.set(cleHeros(c.name), c.sprite);
  for (const x of [...(c.cards || []), ...Object.values(c.switches || {})]) if (x?.id) SPRITES.set(x.id, x.sprite || c.sprite);
}
const carteDef = id => ctx.index.cardById.get(id);

function carteHtml(cardId, finish = 'normal', grade = null, classe = '') {
  const c = carteDef(cardId);
  const couleur = BOUTIQUE.couleursRaretes[c.rarity] || '#999';
  return `<div class="btq-c ${finish === 'foil' ? 'foil' : ''} ${classe}" style="--r:${couleur}"><img src="${asset(SPRITES.get(cardId))}" alt="${c.name}">${grade ? `<b class="btq-note">${grade}</b>` : ''}</div>`;
}
const or = n => `${icone('Coin', 14)}<b>${court(Math.round(n))}</b>`;

// ------------------------------------------------------------------ la scene
function majBarre() {
  const S = partie();
  const p = S.progression;
  $('#btqOr').innerHTML = or(S.gold);
  $('#btqGems').innerHTML = `${icone('Gem', 14)}<b>${court(S.gems)}</b>`;
  $('#btqEchelle').textContent = `Niv. ${p.level} · ${ENCOUNTERS[adversaireCourant()]?.name || adversaireCourant()} ${p.wins}/${cfg.progression.ladder.winsToAdvance}`;
}

// La scene se redessine toute seule (ui/boutique-scene.js) : elle lit l'etat a chaque image.

// ------------------------------------------------------------------ onglet Boosters
function panneauBoosters() {
  const S = partie(), b = S.boosters;
  const box = el(`<div>
    <div class="btq-ligne"><h3 id="btqStock"></h3><span class="muted" id="btqProchain"></span></div>
    <div class="btq-tirage" id="btqTirage"></div>
    <button class="btn" id="btqOuvre" ${b.stock ? '' : 'disabled'}>Ouvrir un booster</button>
    <button class="btn alt" id="btqAchete">Acheter un booster · ${court(boosterShopPrice(S, ctx))}</button>
    <label class="btq-filtre">Filtre bulk : doubles sous <b id="btqSeuilV">${S.settings.bulkFilterThreshold}</b>
      <input type="range" id="btqSeuil" min="0" max="60" value="${S.settings.bulkFilterThreshold}"></label>
    <label class="btq-case"><input type="checkbox" id="btqProtege" ${S.settings.bulkFilterProtectVariants ? 'checked' : ''}> Garder les foils hors du filtre</label>
    <div id="btqPremium"></div>
  </div>`);
  if (tirage) box.querySelector('#btqTirage').innerHTML = tirage;
  box.querySelector('#btqOuvre').onclick = ouvreUn;
  box.querySelector('#btqAchete').onclick = () => {
    const r = buyBooster(S, ctx);
    if (!r.ok) toast(r.reason); else change();
  };
  box.querySelector('#btqSeuil').oninput = e => { setBulkFilter(S, Number(e.target.value)); box.querySelector('#btqSeuilV').textContent = e.target.value; };
  box.querySelector('#btqProtege').onchange = e => setBulkFilterProtectsVariants(S, e.target.checked);
  for (const [id, n] of Object.entries(b.premium)) {
    if (n <= 0) continue;
    const bouton = el(`<button class="btn alt">Ouvrir un premium (${n})</button>`);
    bouton.onclick = () => montreTirage(openPremium(S, id, ctx), cfg.premium.boosters.find(p => p.id === id).slots.length);
    box.querySelector('#btqPremium').appendChild(bouton);
  }
  return box;
}

// Chaque seconde, seuls le compteur et le bouton changent : redessiner rejouerait l'animation du tirage.
function majCompteurBoosters() {
  const b = partie().boosters;
  const stock = $('#btqStock');
  if (!stock) return;
  stock.textContent = `${b.stock} / ${cfg.boosters.storageCap} boosters`;
  $('#btqProchain').textContent = b.stock >= cfg.boosters.storageCap ? 'stock plein' : `prochain dans ${Math.ceil((cfg.boosters.intervalMinutes * 60000 - b.progressMs) / 1000)} s`;
  $('#btqOuvre').disabled = b.stock <= 0;
}

function ouvreUn() {
  montreTirage(openBooster(partie(), ctx), cfg.boosters.cardsPerBooster);
}

// Les derniers exemplaires crees sont ceux du tirage : on y lit ce qui est neuf, foil ou parti au bulk.
function montreTirage(r, n) {
  if (!r.ok) { toast(r.reason); return; }
  const S = partie();
  const ids = Array.from({ length: n }, (_, i) => S.nextInstanceId - n + i);
  tirage = ids.map((id, i) => {
    const inst = S.instances[id];
    const neuve = inst.location === 'collection';
    const bulk = inst.location === 'bulk';
    return `<div class="btq-revele ${bulk ? 'va-bulk' : ''}" style="animation-delay:${i * 0.18}s">${carteHtml(inst.cardId, inst.finish)}${neuve ? '<em>Nouvelle</em>' : ''}${bulk ? '<em class="b">Bulk</em>' : ''}</div>`;
  }).join('');
  change();
}

// ------------------------------------------------------------------ onglet Stock
function panneauStock() {
  const S = partie();
  const stock = Object.values(S.instances).filter(i => i.location === 'stock').sort((a, b) => instanceRef(b, S, ctx) - instanceRef(a, S, ctx));
  const box = el(`<div><div class="btq-ligne"><h3>${stock.length} doubles</h3><span class="muted">${Object.keys(S.collection).length} / ${ctx.index.cardById.size} découvertes · ${Object.keys(S.foilCollection).length} foils</span></div><div class="btq-grille"></div></div>`);
  if (!stock.length) box.querySelector('.btq-grille').appendChild(el('<p class="muted">Ouvre des boosters : tes doubles arrivent ici.</p>'));
  for (const inst of stock) {
    const n = el(`<button class="btq-case-c">${carteHtml(inst.cardId, inst.finish, inst.grade)}<span>${court(Math.round(instanceRef(inst, S, ctx)))}</span></button>`);
    n.onclick = () => ficheCopie(inst.id);
    box.querySelector('.btq-grille').appendChild(n);
  }
  return box;
}

function ficheCopie(id) {
  const S = partie();
  const inst = S.instances[id];
  if (!inst) return;
  const c = carteDef(inst.cardId);
  const refMax = instanceRefMax(inst, S, ctx);
  const cap = showcasePriceCap(cfg, refMax);
  const prixBase = Math.min(refMax, cap);
  const box = el(`<div class="btq-fiche">
    <div class="btq-fiche-haut">${carteHtml(inst.cardId, inst.finish, inst.grade)}
      <div><h2>${c.name}</h2><p class="muted">${c.hero} · ${ctx.index.rarityById.get(c.rarity).name}${inst.finish === 'foil' ? ' · Foil' : ''}${inst.grade ? ` · Note ${inst.grade}` : ''}</p><p>Référence ${or(instanceRef(inst, S, ctx))}</p></div></div>
    <h3>Vitrine</h3>
    <input type="range" id="fPrix" min="1" max="${Math.max(1, Math.round(cap))}" value="${Math.round(prixBase)}">
    <div class="btq-ligne"><span id="fPrixV"></span><span class="muted" id="fAttente"></span></div>
    <div class="btq-avis-liste" id="fAvis"></div>
    <button class="btn" id="fVitrine">Mettre en vitrine</button>
    <h3>Enchères</h3><div class="btq-puces" id="fDurees"></div>
    <h3>Autres</h3>
    <div class="btq-puces" id="fAutres"></div>
  </div>`);

  const prix = box.querySelector('#fPrix');
  const maj = () => {
    const q = quoteShowcase(S, id, Number(prix.value), ctx);
    box.querySelector('#fPrixV').innerHTML = or(Number(prix.value));
    box.querySelector('#fAttente').textContent = q.ok ? `environ ${q.value.label}` : '';
    box.querySelector('#fAvis').innerHTML = avisHtml(inst, Number(prix.value));
  };
  prix.oninput = maj;
  maj();
  const agit = r => { if (!r.ok) { toast(r.reason); return; } closeModal(); change(); };
  box.querySelector('#fVitrine').onclick = () => agit(listShowcase(S, id, Number(prix.value), ctx));
  for (const h of cfg.auction.durationsHours) {
    const b = el(`<button class="btq-puce">${h} h · ~${court(Math.round(auctionMeanPrice(cfg, refMax, h, 1)))}</button>`);
    b.onclick = () => agit(listAuction(S, id, h, ctx));
    box.querySelector('#fDurees').appendChild(b);
  }
  const autres = box.querySelector('#fAutres');
  const ajoute = (texte, f) => { const b = el(`<button class="btq-puce">${texte}</button>`); b.onclick = f; autres.appendChild(b); };
  ajoute(`Bulk · ${court(Math.round(instanceRef(inst, S, ctx)))}`, () => agit(sendToBulk(S, id)));
  if (hasFeature(S, cfg.grading.feature) && inst.grade === null) {
    ajoute(`Grader · ${ctx.index.rarityById.get(c.rarity).gradingCost}`, () => {
      const r = gradeCard(S, id, ctx);
      if (!r.ok) { toast(r.reason); return; }
      closeModal(); change(); ficheCopie(id);
    });
  }
  if (inst.grade !== null) {
    ajoute(`Casser la note · ${cfg.gems.sinks[cfg.grading.breakSink].cost} gems`, () => {
      const r = breakGrade(S, id, ctx);
      if (!r.ok) { toast(r.reason); return; }
      closeModal(); change(); ficheCopie(id);
    });
  }
  if (betterCopyFor(inst.cardId, S, ctx) === id) ajoute('Exposer dans la collection', () => agit(swapCollectionOccupant(S, inst.cardId, id)));
  if (!checkSellable(S, id).ok) box.querySelector('#fVitrine').disabled = true;
  modal(box);
}

// Ce que chaque profil penserait de ce prix : le joueur le voit avant de valider.
function avisHtml(inst, prix) {
  const S = partie();
  return cfg.buyers.profiles.map(b => {
    const r = BOUTIQUE.reactions[buyerReaction(b, inst, prix, S, ctx)];
    const p = BOUTIQUE.profils[b.id];
    return `<span class="btq-avis"><i style="background:${p.couleur}">${p.lettre}</i>${r.signe} ${r.texte}</span>`;
  }).join('');
}

// Changer le prix d'une carte en vitrine, ou la retirer. Toucher une vitrine de la scene ou sa ligne dans Ventes.
function ficheVitrine(id) {
  const S = partie();
  const inst = S.instances[id];
  const l = S.showcase.find(x => x.instanceId === id);
  if (!inst || !l) return;
  const c = carteDef(inst.cardId);
  const refMax = instanceRefMax(inst, S, ctx);
  const cap = showcasePriceCap(cfg, refMax);
  const box = el(`<div class="btq-fiche">
    <div class="btq-fiche-haut">${carteHtml(inst.cardId, inst.finish, inst.grade)}
      <div><h2>${c.name}</h2><p class="muted">En vitrine à ${court(Math.round(l.price))}</p><p class="muted">Se vend dans ${formatDuration(Math.max(0, l.sellAtMs - S.nowMs) / 60000)}</p></div></div>
    <h3>Nouveau prix</h3>
    <input type="range" id="fPrix" min="1" max="${Math.max(1, Math.round(cap))}" value="${Math.round(l.price)}">
    <div class="btq-ligne"><span id="fPrixV"></span><span class="muted" id="fAttente"></span></div>
    <div class="btq-avis-liste" id="fAvis"></div>
    <p class="muted">Changer le prix relance l'attente.</p>
    <button class="btn" id="fChange">Changer le prix</button>
    <button class="btn alt" id="fRetire">Retirer de la vitrine</button>
  </div>`);
  const prix = box.querySelector('#fPrix');
  const maj = () => {
    const v = Number(prix.value);
    const q = quoteShowcase(S, id, v, ctx);
    box.querySelector('#fPrixV').innerHTML = or(v);
    box.querySelector('#fAttente').textContent = q.ok ? `environ ${q.value.label}` : '';
    box.querySelector('#fAvis').innerHTML = avisHtml(inst, v);
  };
  prix.oninput = maj;
  maj();
  const agit = r => { if (!r.ok) { toast(r.reason); return; } closeModal(); change(); };
  box.querySelector('#fChange').onclick = () => agit(repriceShowcase(S, id, Number(prix.value), ctx));
  box.querySelector('#fRetire').onclick = () => agit(cancelShowcase(S, id));
  modal(box);
}

// ------------------------------------------------------------------ onglet Ventes
function panneauVentes() {
  const S = partie();
  const box = el(`<div>
    <h3>Vitrines ${S.showcase.length}/${showcaseCapacity(S, ctx)}</h3><div class="btq-liste" id="lV"></div>
    <h3>Bulk</h3><p class="muted">${S.bulkBox.length} cartes · ${cfg.bulk.salesPerHour} ventes par heure${S.bulkBox.length ? ` · vide dans ${formatDuration(bulkClearHours(S, ctx) * 60)}` : ''}</p>
  </div>`);
  for (const l of S.showcase) {
    const inst = S.instances[l.instanceId];
    if (!inst) continue;
    const n = el(`<button class="btq-rang">${carteHtml(inst.cardId, inst.finish, inst.grade)}<span>${or(l.price)}</span><em>${formatDuration(Math.max(0, l.sellAtMs - S.nowMs) / 60000)}</em></button>`);
    n.onclick = () => ficheVitrine(l.instanceId);
    box.querySelector('#lV').appendChild(n);
  }
  return box;
}

// ------------------------------------------------------------------ l'ecran des encheres
// Tout ce qui passe aux encheres : les cartes du joueur en vente, les mythiques a acheter, les boosters premium.
function panneauEncheres() {
  const S = partie();
  const box = el(`<div class="btq-panneau"><h3>Tes enchères ${S.auctions.length}/${S.progression.auctionSlots}</h3><div class="btq-liste" id="lE"></div>
    <h3>Mythiques aux enchères</h3><div class="btq-liste" id="lM"></div>
    <div id="lP"></div></div>`);
  if (!S.auctions.length) box.querySelector('#lE').appendChild(el('<p class="muted">Mets une carte en vente depuis ton stock.</p>'));
  for (const a of S.auctions) {
    const inst = a.item.kind === 'card' ? S.instances[a.item.instanceId] : null;
    const reste = (a.stepsTotal - a.stepsDone) * cfg.auction.stepMinutes;
    box.querySelector('#lE').appendChild(el(`<div class="btq-rang">${inst ? carteHtml(inst.cardId, inst.finish, inst.grade) : '<b>Premium</b>'}<span>${or(a.price)}</span><em>${formatDuration(reste)}</em></div>`));
  }
  if (!hasFeature(S, cfg.market.feature)) box.querySelector('#lM').appendChild(el('<p class="muted">Débloqué en avançant dans la ligne de combats.</p>'));
  else for (const id of S.market.offers) {
    const possede = S.collection[id] !== undefined;
    const n = el(`<div class="btq-rang">${carteHtml(id)}<span>${carteDef(id).hero}</span><button class="btq-puce" ${possede ? 'disabled' : ''}>${possede ? 'Déjà à toi' : court(marketPrice(id, S, ctx))}</button></div>`);
    n.querySelector('button').onclick = () => {
      const r = buyMarketCard(S, id, ctx);
      if (!r.ok) toast(r.reason); else change();
    };
    box.querySelector('#lM').appendChild(n);
  }
  if (hasFeature(S, 'premiumMarket')) {
    for (const p of cfg.premium.boosters) {
      const b = el(`<button class="btq-puce">Booster premium · ${court(Math.ceil(premiumRef(p.id, S, ctx) * cfg.premium.marketBuyMultiplier))}</button>`);
      b.onclick = () => {
        const r = buyPremium(S, p.id, ctx);
        if (!r.ok) toast(r.reason); else change();
      };
      box.querySelector('#lP').appendChild(b);
    }
  }
  return box;
}

let quitte = null;

export function renderEncheres() {
  const ecran = $('#screen-encheres');
  const dessine = () => { ecran.innerHTML = ''; ecran.appendChild(panneauEncheres()); };
  dessine();
  quitte?.();
  quitte = ecoute(e => { if (e.t === 'seconde' || e.t === 'change') dessine(); });
}

export function quitteEncheres() {
  quitte?.();
  quitte = null;
}

// ------------------------------------------------------------------ onglet Decorer
let meubleChoisi = null;

function panneauDeco() {
  const S = partie();
  const box = el(`<div>
    <div class="btq-ligne"><h3>Boutique ${S.shop.width} × ${S.shop.height}</h3>
      <button class="btq-puce" id="dAgrandir" ${canExpand(S, cfg) ? '' : 'disabled'}>${canExpand(S, cfg) ? `Agrandir · ${court(expandCost(S, cfg))}` : 'Taille maximale'}</button></div>
    <div id="dMeuble"></div>
    <p class="muted">Touche un meuble, puis glisse-le pour le déplacer.</p>
    <div id="dCatalogue"></div>
    <h3>Sol</h3><div class="btq-nuances" id="dSols"></div>
    <h3>Murs</h3><div class="btq-nuances" id="dMurs"></div>
  </div>`);
  box.querySelector('#dAgrandir').onclick = () => { const r = expandShop(S, ctx); if (!r.ok) toast(r.reason); else change(); };

  const it = meubleChoisi !== null ? S.shop.items.find(i => i.id === meubleChoisi) : null;
  if (it) {
    const def = cfg.shopLayout.furniture.find(f => f.id === it.type);
    const zone = box.querySelector('#dMeuble');
    zone.appendChild(el(`<div class="btq-ligne"><b>${def.name}</b></div>`));
    const b = el('<div class="btq-puces"></div>');
    const tourne = el('<button class="btq-puce">Tourner</button>');
    tourne.onclick = () => { const r = moveFurniture(S, it.id, it.x, it.y, (it.dir + 1) % 4, ctx); if (!r.ok) toast(r.reason); else change(); };
    b.appendChild(tourne);
    if (!it.offert) {
      const vend = el('<button class="btq-puce">Revendre</button>');
      vend.onclick = () => {
        const r = sellFurniture(S, it.id, ctx);
        if (!r.ok) { toast(r.reason); return; }
        meubleChoisi = null; choisisMeuble(null); change();
      };
      b.appendChild(vend);
    }
    zone.appendChild(b);
  }

  const cat = box.querySelector('#dCatalogue');
  for (const c of [...new Set(cfg.shopLayout.furniture.map(f => f.category))]) {
    cat.appendChild(el(`<h3>${c}</h3>`));
    const grille = el('<div class="btq-meubles"></div>');
    for (const def of cfg.shopLayout.furniture.filter(f => f.category === c)) {
      const v = BOUTIQUE.meubles[def.id];
      const prix = furniturePrice(def.id, S, ctx);
      const n = el(`<button class="btq-meuble"><img src="${asset(`${BOUTIQUE.dossierMeubles}${v.image}_SE.png`)}" alt=""><span>${def.name}</span><b>${court(prix)}</b></button>`);
      n.onclick = () => {
        const r = buyFurniture(S, def.id, ctx);
        if (!r.ok) { toast(r.reason); return; }
        meubleChoisi = r.value.id; choisisMeuble(r.value.id); change();
      };
      grille.appendChild(n);
    }
    cat.appendChild(grille);
  }
  const nuances = (id, liste, champ) => liste.forEach((c, i) => {
    const b = el(`<button class="${S.shop[champ] === i ? 'on' : ''}" style="background:linear-gradient(135deg, ${c[0]} 50%, ${c[1]} 50%)" aria-label="choix ${i + 1}"></button>`);
    b.onclick = () => { S.shop[champ] = i; change(); };
    box.querySelector(id).appendChild(b);
  });
  nuances('#dSols', BOUTIQUE.sols, 'floor');
  nuances('#dMurs', BOUTIQUE.murs, 'wall');
  return box;
}

// ------------------------------------------------------------------ onglet Heros
function panneauHeros() {
  const S = partie();
  const box = el('<div class="btq-heros"></div>');
  for (const hero of ctx.index.heroes) {
    const h = S.heroes[hero];
    const requises = requiredCards(hero, ctx);
    const faites = requises.filter(c => S.collection[c.id] !== undefined).length;
    const n = el(`<div class="btq-rang ${h.unlocked ? '' : 'verrou'}"><img src="${asset(SPRITES_HEROS.get(cleHeros(hero)))}" alt="">
      <div class="btq-nom"><b>${hero}</b><span class="muted">${h.unlocked ? `Niveau ${h.level}` : `${faites}/${requises.length} cartes`}</span></div>
      <div class="btq-tiers"></div></div>`);
    for (const t of cfg.tiers.list) {
      const b = el(`<button class="${h.tier === t.id ? 'on' : ''}">${t.id}</button>`);
      b.onclick = () => { setHeroTier(S, hero, t.id, ctx); change(); };
      n.querySelector('.btq-tiers').appendChild(b);
    }
    if (h.unlocked && h.level < cfg.heroes.maxLevel) {
      const b = el(`<button class="btq-puce">${court(upgradeCost(cfg, h.level))}</button>`);
      b.onclick = () => { const r = upgradeHero(S, hero, ctx); if (!r.ok) toast(r.reason); else change(); };
      n.appendChild(b);
    }
    box.appendChild(n);
  }
  return box;
}

// ------------------------------------------------------------------ l'ecran
const PANNEAUX = { boosters: panneauBoosters, stock: panneauStock, ventes: panneauVentes, deco: panneauDeco, heros: panneauHeros };

// Un onglet ouvre son panneau sous la scene ; le retoucher le ferme et rend toute la vue (`fermable`).
function creeOngletsBoutique() {
  return creeOnglets({
    fermable: true,
    onglets: ONGLETS.map(([id, nom]) => ({
      id, nom,
      rendu: corps => {
        const p = el('<div class="btq-panneau"></div>');
        p.appendChild(PANNEAUX[id]());
        corps.appendChild(p);
        if (id === 'boosters') majCompteurBoosters();
      }
    })),
    surChange: id => {
      tirage = null;
      meubleChoisi = null;
      modeDeco(id === 'deco');
    }
  });
}

function surEvenement(e) {
  if (!racine?.isConnected) return;
  if (e.t === 'seconde') {
    majBarre();
    if (onglets.courant() === 'ventes') onglets.redessine();
    if (onglets.courant() === 'boosters') majCompteurBoosters();
  } else if (e.t === 'change') {
    majBarre();
    onglets.redessine();
  } else if (e.t === 'sale') {
    // Le noyau annonce la vente avant de retirer la carte : on lit l'etat juste apres.
    setTimeout(() => { if (racine?.isConnected) majBarre(); }, 0);
  } else if (e.t === 'heroUnlocked') toast(`${e.hero} rejoint tes héros !`);
}

export function renderBoutique() {
  const ecran = $('#screen-boutique');
  ecran.innerHTML = '';
  racine = el(`<div class="btq">
    <div class="btq-barre"><span id="btqOr"></span><span id="btqGems"></span><span id="btqEchelle"></span></div>
    <div class="btq-monde"><canvas id="btqCanvas"></canvas></div>
  </div>`);
  onglets = creeOngletsBoutique();
  racine.appendChild(onglets.node);
  ecran.appendChild(racine);
  majBarre();
  desabonne?.();
  desabonne = ecoute(surEvenement);
  lanceScene($('#btqCanvas'), {
    visuelCarte: id => SPRITES.get(id),
    vitrine: l => { if (l) ficheVitrine(l.instanceId); else onglets.va('stock'); },
    encheres: () => document.querySelector('#nav [data-go=encheres]').click(),
    bulk: () => onglets.va('ventes'),
    choix: it => { meubleChoisi = it ? it.id : null; onglets.redessine(); },
    deplace: (id, x, y, dir) => { const r = moveFurniture(partie(), id, x, y, dir, ctx); if (!r.ok) toast(r.reason); else change(); }
  });
  modeDeco(false);
}

export function quitteBoutique() {
  arreteScene();
  desabonne?.();
  desabonne = null;
}

/** Le resume au retour : ce qui s'est vendu, sans rejouer la scene. */
export function montreResumeBoutique(r) {
  const nom = { showcase: 'en vitrine', auction: 'aux enchères', bulk: 'au bulk' };
  const detail = Object.entries(r.canaux).map(([k, n]) => `${n} ${nom[k]}`).join(', ');
  const box = el(`<div><h2>Ta boutique a tourné</h2><p class="muted">${fmtTime(r.absenceMs)} d'absence.</p>
    <p><b>${r.ventes}</b> ventes (${detail}) : ${or(r.or)}</p>
    ${r.heros.length ? `<p>Nouveaux héros : <b>${r.heros.join(', ')}</b></p>` : ''}</div>`);
  const b = el('<button class="btn">Merci</button>');
  b.onclick = closeModal;
  box.appendChild(b);
  modal(box);
}

export const consoleBoutique = () => ({ etat: partie, avance: avanceDeMinutes, change, donne(n) { partie().gold += n; change(); } });
