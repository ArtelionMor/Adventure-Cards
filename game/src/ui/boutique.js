// L'ECRAN DE LA BOUTIQUE : la scene (ui/boutique-scene.js) prend tout l'ecran. Toute regle vient du noyau
// (`boutique/noyau/`, genere par scripts/gen-boutique.mjs) : cet ecran affiche et appelle ses moteurs, il ne calcule rien.
import { BOUTIQUE } from '../config/boutique.js';
import { CHAR_BY_ID } from '../config/characters.js';
import { ENCOUNTERS } from '../config/world.js';
import { auctionMeanPrice, listAuction } from '../boutique/noyau/engines/auction.js';
import { bulkClearHours, sendToBulk } from '../boutique/noyau/engines/bulk.js';
import { breakGrade, gradeCard, gradingCompany } from '../boutique/noyau/engines/grading.js';
import { nextBid, placeBid } from '../boutique/noyau/engines/market.js';
import { buyPremium, premiumRef } from '../boutique/noyau/engines/packs.js';
import { betterCopyFor, buyerReaction, instanceRef, instanceRefMax } from '../boutique/noyau/engines/pricing.js';
import { cancelShowcase, formatDuration, listShowcase, repriceShowcase, showcasePriceCap } from '../boutique/noyau/engines/showcase.js';
import { buyFurniture, canExpand, expandCost, expandShop, furniturePrice, inventaire, moveFurniture, poseOffert, sellFurniture, shopLevel, showcaseCapacity } from '../boutique/noyau/engines/shop.js';
import { checkSellable, hasFeature, swapCollectionOccupant } from '../boutique/noyau/state.js';
import { adversaireCourant, avanceDeMinutes, change, ctx, ecoute, partie } from '../boutique/partie.js';
import { save } from '../state.js';
import { arreteScene, choisisMeuble, lanceScene } from './boutique-scene.js';
import { ouvreDefi } from './defi.js';
import { ouvreTournoi } from './tournoi.js';
import { demandeNotifs } from './notifs.js';
import { t } from '../config/textes.js';
import { icone } from './icones.js';
import { curseurPrix, texteDePrix } from './prix.js';
import { $, asset, closeModal, court, el, fmtTime, modal, toast } from './shell.js';

const cfg = ctx.cfg;
// Plus d'onglets : le stock est la collection (ecran des Packs, ui/packs.js) et les ventes se lisent sur la scene (bulles des vitrines, bulk).
let racine = null;
let desabonne = null;

// ------------------------------------------------------------------ images
const SPRITES = new Map();
const SPRITES_HEROS = new Map();
// Le jeu ecrit « Félix », le catalogue « Felix » : un nom de heros se compare sans accent ni casse.
const cleHeros = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
for (const c of Object.values(CHAR_BY_ID)) {
  SPRITES_HEROS.set(cleHeros(c.name), c.sprite);
  for (const x of [...(c.cards || []), ...Object.values(c.switches || {})]) if (x?.id) SPRITES.set(x.id, x.sprite || c.sprite);
}
export const carteDef = id => ctx.index.cardById.get(id);
export const spriteDeCarte = id => SPRITES.get(id);
/** Le portrait d'un heros du noyau (« Felix ») : le catalogue du jeu l'ecrit parfois autrement (« Félix »). */
export const spriteDeHeros = hero => SPRITES_HEROS.get(cleHeros(hero));

export function carteHtml(cardId, finish = 'normal', grade = null, classe = '') {
  const c = carteDef(cardId);
  const couleur = BOUTIQUE.couleursRaretes[c.rarity] || '#999';
  return `<div class="btq-c ${finish === 'foil' ? 'foil' : ''} ${classe}" data-r="${c.rarity}" data-carte-id="${cardId}" data-finish="${finish}"${grade ? ` data-grade="${grade}"` : ''} style="--r:${couleur}"><img src="${asset(SPRITES.get(cardId))}" alt="${c.name}">${grade ? `<b class="btq-note">${grade}</b>` : ''}</div>`;
}
const or = n => `${icone('Coin', 14)}<b>${texteDePrix(n)}</b>`;

/** Le curseur de prix a la place de `place` ; `maj(prix)` est rappelee a chaque changement. */
function poseCurseur(place, cap, valeur, maj) {
  const c = curseurPrix({ cap, valeur, surChange: maj });
  place.replaceWith(c.el);
  return c;
}

// LE BOITIER D'UNE CARTE GRADEE (maquette du 31 octobre 2026) : l'entreprise, la carte, qui l'a fait grader et quand, et la note.
const rivalDe = n => BOUTIQUE.rivaux[n % BOUTIQUE.rivaux.length];
const leJoueur = () => CHAR_BY_ID[save.team.find(Boolean) || 'dog'];
// `atMs` est l'heure du noyau : une date se lit en remontant depuis maintenant.
const dateDe = atMs => new Date(Date.now() - (partie().nowMs - atMs)).toLocaleDateString('fr-FR');

export function boitierHtml(copie) {
  const { slab } = copie;
  const qui = slab.by === null ? leJoueur().name : rivalDe(slab.by).nom;
  return `<div class="slab">
    <div class="slab-tete"><span class="slab-nom">${gradingCompany(cfg, slab.company).name}</span><img src="${asset(BOUTIQUE.logosGrading[slab.company])}" alt="">
      <div class="slab-txt"><span>${carteDef(copie.cardId).name}</span><span>${qui}</span><span>${dateDe(slab.atMs)}</span></div>
      <b class="slab-note">${copie.grade}</b></div>
    ${carteHtml(copie.cardId, copie.finish)}
  </div>`;
}
/** Une copie en grand : dans son boitier si elle est gradee. */
const visuel = copie => (copie.slab ? boitierHtml(copie) : carteHtml(copie.cardId, copie.finish));

// ------------------------------------------------------------------ la scene
function majBarre() {
  const S = partie();
  const p = S.progression;
  $('#btqGems').innerHTML = `${icone('Gem', 14)}<b>${court(S.gems)}</b>`;
  $('#btqEchelle').textContent = `Niv. ${p.level} · ${ENCOUNTERS[adversaireCourant()]?.name || adversaireCourant()} ${p.wins}/${cfg.progression.ladder.winsToAdvance}`;
}

// La scene se redessine toute seule (ui/boutique-scene.js) : elle lit l'etat a chaque image.

// ------------------------------------------------------------------ onglet Stock
export function panneauStock(surChoix = null) {
  const S = partie();
  const stock = Object.values(S.instances).filter(i => i.location === 'stock').sort((a, b) => instanceRef(b, S, ctx) - instanceRef(a, S, ctx));
  const box = el(`<div><div class="btq-ligne"><h3>${stock.length} doubles</h3><span class="muted">${Object.keys(S.collection).length} / ${ctx.index.cardById.size} découvertes · ${Object.keys(S.foilCollection).length} foils</span></div><div class="btq-grille"></div></div>`);
  if (!stock.length) box.querySelector('.btq-grille').appendChild(el('<p class="muted">Ouvre des boosters : tes doubles arrivent ici.</p>'));
  for (const inst of stock) {
    const n = el(`<button class="btq-case-c">${carteHtml(inst.cardId, inst.finish, inst.grade)}<span>${court(Math.round(instanceRef(inst, S, ctx)))}</span></button>`);
    n.onclick = () => (surChoix ? surChoix(inst.id) : ficheCopie(inst.id));
    box.querySelector('.btq-grille').appendChild(n);
  }
  return box;
}

function ficheCopie(id, displayId = null) {
  const S = partie();
  const inst = S.instances[id];
  if (!inst) return;
  const c = carteDef(inst.cardId);
  const refMax = instanceRefMax(inst, S, ctx);
  const cap = showcasePriceCap(cfg, refMax);
  const prixBase = Math.min(refMax, cap);
  const box = el(`<div class="btq-fiche">
    <div class="btq-fiche-haut">${visuel(inst)}
      <div><h2>${c.name}</h2><p class="muted">${c.hero} · ${ctx.index.rarityById.get(c.rarity).name}${inst.finish === 'foil' ? ' · Foil' : ''}${inst.grade ? ` · Note ${inst.grade}` : ''}</p><p>Référence ${or(instanceRef(inst, S, ctx))}</p></div></div>
    <h3>Vitrine</h3>
    <div id="fPrix"></div>
    <div class="btq-ligne"><span id="fPrixV" class="btq-prix-gros"></span></div>
    <div class="btq-avis-liste" id="fAvis"></div>
    <button class="btn" id="fVitrine">Mettre en vitrine</button>
    <div id="fEncheres"><h3>Enchères</h3><div class="btq-puces" id="fDurees"></div></div>
    <div id="fGrading"><h3>${t('grading.choisir')}</h3><div class="btq-entreprises"></div></div>
    <h3>Autres</h3>
    <div class="btq-puces" id="fAutres"></div>
  </div>`);

  const prix = poseCurseur(box.querySelector('#fPrix'), cap, prixBase, v => {
    box.querySelector('#fPrixV').innerHTML = or(v);
    box.querySelector('#fAvis').innerHTML = avisHtml(inst, v);
  });
  const agit = r => { if (!r.ok) { toast(r.reason); return; } closeModal(); change(); };
  box.querySelector('#fVitrine').onclick = () => {
    const r = listShowcase(S, id, prix.prix(), ctx);
    // La carte va sur la vitrine dont on a touche la bulle (listShowcase prend la premiere libre).
    if (r.ok && displayId) { const l = S.showcase.find(x => x.instanceId === id); if (l) l.displayId = displayId; }
    agit(r);
  };
  // Vendre aux encheres se debloque apres avoir pu y acheter : sans slot, rien a proposer.
  if (S.progression.auctionSlots <= 0) box.querySelector('#fEncheres').remove();
  else for (const h of cfg.auction.durationsHours) {
    const b = el(`<button class="btq-puce">${h} h · ~${court(Math.round(auctionMeanPrice(cfg, refMax, h, 1)))}</button>`);
    b.onclick = () => agit(listAuction(S, id, h, ctx));
    box.querySelector('#fDurees').appendChild(b);
  }
  const autres = box.querySelector('#fAutres');
  const ajoute = (texte, f) => { const b = el(`<button class="btq-puce">${texte}</button>`); b.onclick = f; autres.appendChild(b); };
  ajoute(`Bulk · ${court(Math.round(instanceRef(inst, S, ctx)))}`, () => agit(sendToBulk(S, id)));
  if (hasFeature(S, cfg.grading.feature) && inst.grade === null) {
    const prixGrading = ctx.index.rarityById.get(c.rarity).gradingCost;
    for (const e of cfg.grading.companies) {
      const b = el(`<button class="btq-entreprise"><img src="${asset(BOUTIQUE.logosGrading[e.id])}" alt=""><span><b>${e.name}</b><em>${t('grading.loi', { n: e.mean, v: e.noteValue })}</em></span><span class="btq-prix">${or(prixGrading)}</span></button>`);
      b.onclick = () => {
        const r = gradeCard(S, id, ctx, e.id);
        if (!r.ok) { toast(r.reason); return; }
        closeModal(); change();
        toast(t('grading.parti', { d: formatDuration(cfg.grading.minutes) }));
      };
      box.querySelector('.btq-entreprises').appendChild(b);
    }
  } else box.querySelector('#fGrading').remove();
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
  return cfg.buyers.profiles.filter(b => S.progression.clients.includes(b.id)).map(b => {
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
    <div class="btq-fiche-haut">${visuel(inst)}
      <div><h2>${c.name}</h2><p class="muted">En vitrine à ${court(Math.round(l.price))}</p></div></div>
    <h3>Nouveau prix</h3>
    <div id="fPrix"></div>
    <div class="btq-ligne"><span id="fPrixV" class="btq-prix-gros"></span></div>
    <div class="btq-visages" id="fAvis"></div>
    <button class="btn" id="fChange">Changer le prix</button>
    <button class="btn alt" id="fRetire">Retirer de la vitrine</button>
  </div>`);
  const prix = poseCurseur(box.querySelector('#fPrix'), cap, l.price, v => {
    box.querySelector('#fPrixV').innerHTML = or(v);
    box.querySelector('#fAvis').innerHTML = visagesHtml(inst, v);
  });
  const agit = r => { if (!r.ok) { toast(r.reason); return; } closeModal(); change(); };
  box.querySelector('#fChange').onclick = () => agit(repriceShowcase(S, id, prix.prix(), ctx));
  box.querySelector('#fRetire').onclick = () => agit(cancelShowcase(S, id));
  modal(box);
}

// ------------------------------------------------------------------ l'ecran des encheres
// D'abord ACHETER (ouvert des le depart), puis VENDRE, qui se debloque en avancant dans la ligne de combats (economy.json). Acheter,
// c'est se placer sur un lot : la mise part de la bourse et revient si un concurrent passe devant ; a la fin du temps, le dernier
// en tete recoit la carte. Tout se decide dans le noyau (`engines/market`), ici on montre et on mise.
const estDepasse = lot => lot.engaged && lot.holder !== 'player';

/** Ce qui reste : « 1 h 12 », ou « 09:41 » sous l'heure. */
function tempsRestant(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const p = n => String(n).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)} h ${p(Math.floor(s / 60) % 60)}` : `${p(Math.floor(s / 60))}:${p(s % 60)}`;
}

// Le tableau du lot : la derniere mise de chacun, la plus haute d'abord et en vert.
function tableauDuLot(lot) {
  if (!lot.bids.length) return `<p class="muted ench-vide">${t('encheres.personne')}</p>`;
  const lignes = [...lot.bids].sort((a, b) => b.amount - a.amount).map(b => {
    const joueur = b.who === 'player';
    const qui = joueur ? { nom: t('encheres.toi'), image: leJoueur().sprite } : rivalDe(b.who);
    return `<li class="${b.amount === lot.price ? 'enTete' : ''}"><img src="${asset(qui.image)}" alt=""><span>${qui.nom}</span>${or(b.amount)}</li>`;
  });
  return `<ul class="ench-miseurs">${lignes.join('')}</ul>`;
}

function carteDeLot(S, lot) {
  const c = carteDef(lot.cardId);
  const prix = nextBid(lot, ctx);
  const moi = lot.holder === 'player';
  const reste = lot.endMs - S.nowMs;
  const n = el(`<article class="ench-lot ${moi ? 'tete' : ''} ${estDepasse(lot) ? 'depasse' : ''}">
    <div class="ench-visu">${visuel(lot)}</div>
    <div class="ench-info">
      <h4>${c.name}</h4>
      <div class="ench-badges"><span style="--r:${BOUTIQUE.couleursRaretes[c.rarity]}">${ctx.index.rarityById.get(c.rarity).name}</span>${lot.finish === 'foil' ? `<span class="foil">${t('encheres.foil')}</span>` : ''}</div>
      <div class="ench-fin">${t('encheres.finDans')}<time data-fin="${lot.endMs}" class="${reste <= cfg.market.lot.warnMinutes * 60000 ? 'urgent' : ''}">${tempsRestant(reste)}</time></div>
      ${moi ? `<div class="ench-miser tete"><span>${t('encheres.enTete')}</span><b>${court(lot.price)}</b>${icone('Coin', 18)}</div>`
    : `<button class="ench-miser ${S.gold < prix ? 'pauvre' : ''}"><span>${t('encheres.miser')}</span><b>${court(prix)}</b>${icone('Coin', 18)}</button>`}
    </div>
    ${tableauDuLot(lot)}
  </article>`);
  const miser = n.querySelector('button');
  if (miser) miser.onclick = () => {
    const r = placeBid(S, lot.id, ctx);
    if (!r.ok) toast(r.reason); else { change(); demandeNotifs(); }
  };
  return n;
}

function panneauEncheres() {
  const S = partie();
  const box = el(`<div class="btq-panneau"><h3>Acheter aux enchères</h3>
    <p class="muted">${t('encheres.offres')} <time data-fin="${S.market.nextRefreshMs}">${tempsRestant(S.market.nextRefreshMs - S.nowMs)}</time></p>
    <div class="btq-liste" id="lM"></div><div id="lP"></div>
    <h3>Tes enchères${S.progression.auctionSlots ? ` ${S.auctions.length}/${S.progression.auctionSlots}` : ''}</h3><div class="btq-liste" id="lE"></div></div>`);
  if (S.progression.auctionSlots <= 0) {
    box.querySelector('#lE').appendChild(el('<p class="muted">Une estrade d’enchères arrive avec l’agrandissement de la boutique.</p>'));
  } else if (!S.auctions.length) box.querySelector('#lE').appendChild(el('<p class="muted">Mets une carte en vente depuis ton stock.</p>'));
  for (const a of S.auctions) {
    const inst = a.item.kind === 'card' ? S.instances[a.item.instanceId] : null;
    const reste = (a.stepsTotal - a.stepsDone) * cfg.auction.stepMinutes;
    box.querySelector('#lE').appendChild(el(`<div class="btq-rang">${inst ? carteHtml(inst.cardId, inst.finish, inst.grade) : '<b>Premium</b>'}<span>${or(a.price)}</span><em>${formatDuration(reste)}</em></div>`));
  }
  if (!hasFeature(S, cfg.market.feature)) box.querySelector('#lM').appendChild(el('<p class="muted">Débloqué en avançant dans la ligne de combats.</p>'));
  else if (!S.market.lots.length) box.querySelector('#lM').appendChild(el(`<p class="muted">${t('encheres.rien')}</p>`));
  // Les lots ou l'on a mise d'abord, puis ceux qui finissent le plus tot.
  else for (const lot of [...S.market.lots].sort((a, b) => b.engaged - a.engaged || a.endMs - b.endMs)) box.querySelector('#lM').appendChild(carteDeLot(S, lot));
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

/** La page des encheres dans `conteneur`, vivante : renvoie de quoi l'arreter. */
function monteEncheres(conteneur) {
  // Chaque seconde, seuls les comptes a rebours bougent : redessiner ferait perdre un toucher en cours sur « Miser ».
  const signature = () => {
    const S = partie();
    return JSON.stringify([S.market.lots.map(l => [l.id, l.price, l.holder, l.endMs]), S.auctions.map(a => [a.price, a.stepsDone]), S.gold]);
  };
  let vue = '';
  const defile = () => conteneur.closest('.sheet') || conteneur;
  const dessine = () => {
    const haut = defile().scrollTop;
    vue = signature();
    conteneur.innerHTML = '';
    conteneur.appendChild(panneauEncheres());
    defile().scrollTop = haut;
  };
  dessine();
  return ecoute(e => {
    if (e.t !== 'seconde' && e.t !== 'change') return;
    if (e.t === 'change' || signature() !== vue) { dessine(); return; }
    for (const n of conteneur.querySelectorAll('time[data-fin]')) {
      const reste = +n.dataset.fin - partie().nowMs;
      n.textContent = tempsRestant(reste);
      n.classList.toggle('urgent', reste <= cfg.market.lot.warnMinutes * 60000);
    }
  });
}

export function renderEncheres() {
  quitte?.();
  quitte = monteEncheres($('#screen-encheres'));
}

/** Une enchere ou l'on s'est fait depasser : elle allume la pastille de la navigation. */
export const encheresADefendre = () => partie().market.lots.filter(estDepasse).length;

/** Les alertes, ou qu'on soit dans le jeu. */
export function alerteBoutique(e) {
  const nom = e.cardId ? carteDef(e.cardId)?.name : '';
  if (e.t === 'auctionOutbid') toast(t('alerte.depasse', { nom, n: court(e.refund) }));
  else if (e.t === 'auctionEnding') toast(t(e.holder ? 'alerte.finEnTete' : 'alerte.finDepasse', { nom, n: cfg.market.lot.warnMinutes }), 5000);
  else if (e.t === 'auctionWon') toast(t('alerte.gagnee', { nom }), 4000);
  else if (e.t === 'auctionLost') toast(t('alerte.perdue', { nom }));
  else if (e.t === 'gradeDone') toast(t('alerte.gradee', { nom, n: e.grade }), 4000);
}

export function quitteEncheres() {
  quitte?.();
  quitte = null;
}

// ------------------------------------------------------------------ onglet Decorer

/** Ce que le prochain agrandissement offre : « +1 présentoir, +1 table de jeu… » ('' au dernier niveau). */
function prochainSet(S) {
  const set = cfg.shopLayout.expansionSets[shopLevel(S.shop, cfg)];
  if (!set || !canExpand(S, cfg)) return '';
  return Object.entries(set).map(([id, n]) => `+${n} ${cfg.shopLayout.furniture.find(f => f.id === id)?.name.toLowerCase() ?? id}`).join(', ');
}

// ------------------------------------------------------------------ les widgets de la scene
// Un objet toujours utilisable (une vitrine, le tableau des encheres) a une BULLE : elle ouvre un widget par-dessus la scene, pas un onglet.

/** Agrandir d'un cote : ce que ca coute et ce que le niveau suivant offre, avant de payer. */
function ouvreAgrandir(axe) {
  const S = partie();
  if (!canExpand(S, cfg, axe)) { toast('La boutique ne peut plus grandir de ce côté.'); return; }
  const offre = prochainSet(S);
  const box = el(`<div class="btq-fiche"><h2>Agrandir la boutique</h2>
    <p class="muted">Niveau ${shopLevel(S.shop, cfg) + 1} : ${offre || 'rien de plus'}</p>
    <button class="btn" id="aGo">Agrandir · ${or(expandCost(S, cfg))}</button></div>`);
  box.querySelector('#aGo').onclick = () => {
    const r = expandShop(S, ctx, axe);
    if (!r.ok) { toast(r.reason); return; }
    closeModal(); change();
  };
  modal(box);
}

/** La bulle d'une vitrine vide : tes doubles ; en choisir un ouvre sa fiche (prix, vitrine, encheres...) pour CETTE vitrine. */
function ouvreWidgetVitrine(displayId) {
  const S = partie();
  const stock = Object.values(S.instances).filter(i => i.location === 'stock').sort((a, b) => instanceRef(b, S, ctx) - instanceRef(a, S, ctx));
  const box = el(`<div class="btq-fiche btq-vitrine-w">
    <div class="btq-ligne"><h3>${stock.length} doubles</h3><span class="muted">${Object.keys(S.collection).length} / ${ctx.index.cardById.size} découvertes · ${Object.keys(S.foilCollection).length} foils</span></div>
    <div class="btq-rangee"></div>
    <div class="btq-detail"></div>
  </div>`);
  const rangee = box.querySelector('.btq-rangee'), detail = box.querySelector('.btq-detail');
  if (!stock.length) { rangee.appendChild(el('<p class="muted">Ouvre des boosters : tes doubles arrivent ici.</p>')); modal(box); return; }

  const choisit = inst => {
    for (const n of rangee.children) n.classList.toggle('on', n.dataset.id === inst.id);
    const c = carteDef(inst.cardId);
    const refMax = instanceRefMax(inst, S, ctx);
    const cap = showcasePriceCap(cfg, refMax);
    detail.innerHTML = `<p class="btq-nomc"><b>${c.name}</b> <span class="muted">${c.hero} · ${ctx.index.rarityById.get(c.rarity).name}${inst.finish === 'foil' ? ' · Foil' : ''}${inst.grade ? ` · Note ${inst.grade}` : ''} · Référence ${or(instanceRef(inst, S, ctx))}</span></p>
      <div class="btq-place"></div>
      <div class="btq-ligne"><span class="btq-prix-gros"></span></div>
      <div class="btq-visages"></div>
      <button class="btn" id="fVitrine">Mettre en vitrine</button>`;
    const prix = poseCurseur(detail.querySelector('.btq-place'), cap, Math.min(refMax, cap), v => {
      detail.querySelector('.btq-prix-gros').innerHTML = or(v);
      detail.querySelector('.btq-visages').innerHTML = visagesHtml(inst, v);
    });
    const b = detail.querySelector('#fVitrine');
    b.disabled = !checkSellable(S, inst.id).ok;
    b.onclick = () => {
      const r = listShowcase(S, inst.id, prix.prix(), ctx);
      if (!r.ok) { toast(r.reason); return; }
      // La carte va sur la vitrine dont on a touche la bulle (listShowcase prend la premiere libre).
      const l = S.showcase.find(x => x.instanceId === inst.id);
      if (l && displayId) l.displayId = displayId;
      closeModal(); change();
    };
  };
  for (const inst of stock) {
    const n = el(`<button class="btq-case-c" data-id="${inst.id}">${carteHtml(inst.cardId, inst.finish, inst.grade)}<span>${court(Math.round(instanceRef(inst, S, ctx)))}</span></button>`);
    n.onclick = () => choisit(inst);
    rangee.appendChild(n);
  }
  choisit(stock[0]);
  modal(box);
}

/**
 * La bulle d'une estrade : une enchere y passe (la n-ieme estrade porte la n-ieme enchere en cours). Libre, on y choisit un double et une duree ;
 * occupee, on suit la carte : son prix qui monte et le temps qui reste.
 */
function ouvreWidgetEstrade(i) {
  const S = partie();
  const a = S.auctions[i];
  const box = el('<div class="btq-fiche btq-vitrine-w"></div>');
  if (a) {
    const inst = a.item.kind === 'card' ? S.instances[a.item.instanceId] : null;
    const reste = Math.max(0, a.stepsTotal - a.stepsDone) * cfg.auction.stepMinutes;
    box.innerHTML = `<div class="btq-fiche-haut">${inst ? visuel(inst) : ''}
      <div><h2>${inst ? carteDef(inst.cardId).name : 'Booster premium'}</h2>
        <p>Mise actuelle ${or(a.price)}</p><p class="muted">Référence ${or(a.ref)} · plafond ${or(a.cap)}</p>
        <p class="muted">${reste ? `Se termine dans ${formatDuration(reste)}` : 'Se termine'}</p></div></div>`;
    modal(box);
    return;
  }
  const stock = Object.values(S.instances).filter(x => x.location === 'stock').sort((p, q) => instanceRef(q, S, ctx) - instanceRef(p, S, ctx));
  box.innerHTML = `<div class="btq-ligne"><h3>Mettre aux enchères</h3><span class="muted">${stock.length} doubles</span></div><div class="btq-rangee"></div><div class="btq-detail"></div>`;
  const rangee = box.querySelector('.btq-rangee'), detail = box.querySelector('.btq-detail');
  if (!stock.length) { rangee.appendChild(el('<p class="muted">Ouvre des boosters : tes doubles arrivent ici.</p>')); modal(box); return; }
  const choisit = inst => {
    for (const n of rangee.children) n.classList.toggle('on', n.dataset.id === inst.id);
    const refMax = instanceRefMax(inst, S, ctx);
    detail.innerHTML = `<p class="btq-nomc"><b>${carteDef(inst.cardId).name}</b> <span class="muted">Référence ${or(instanceRef(inst, S, ctx))}</span></p>
      <p class="muted">Plus l'enchère dure, plus elle monte (prix moyen attendu).</p><div class="btq-puces"></div>`;
    for (const h of cfg.auction.durationsHours) {
      const b = el(`<button class="btq-puce">${h} h · ~${court(Math.round(auctionMeanPrice(cfg, refMax, h, 1)))}</button>`);
      b.onclick = () => { const r = listAuction(S, inst.id, h, ctx); if (!r.ok) { toast(r.reason); return; } closeModal(); change(); };
      detail.querySelector('.btq-puces').appendChild(b);
    }
  };
  for (const inst of stock) {
    const n = el(`<button class="btq-case-c" data-id="${inst.id}">${carteHtml(inst.cardId, inst.finish, inst.grade)}<span>${court(Math.round(instanceRef(inst, S, ctx)))}</span></button>`);
    n.onclick = () => choisit(inst);
    rangee.appendChild(n);
  }
  choisit(stock[0]);
  modal(box);
}

/** Tous les visages de clients, chacun avec ce qu'il penserait de ce prix (son profil décide). */
function visagesHtml(inst, prix) {
  const S = partie();
  return cfg.buyers.profiles.filter(b => S.progression.clients.includes(b.id)).map(b => {
    const p = BOUTIQUE.profils[b.id];
    const r = BOUTIQUE.reactions[buyerReaction(b, inst, prix, S, ctx)];
    return (p?.tetes || []).map(tete => `<span class="btq-visage" title="${r.texte}" style="--c:${p.couleur}"><img src="${BOUTIQUE.visage(tete)}" alt=""><i>${r.signe}</i></span>`).join('');
  }).join('');
}

/** La bulle du tableau : la page des encheres, en widget (elle vit tant qu'il est ouvert). */
function ouvreWidgetEncheres() {
  const conteneur = el('<div class="btq-widget"></div>');
  const stop = monteEncheres(conteneur);
  modal(conteneur, stop);
}

// (L'ex-onglet Heros est devenu la wishlist des Packs : ui/souhaits.js.)

// ------------------------------------------------------------------ l'ecran
// L'INVENTAIRE : les objets offerts par l'agrandissement et pas encore poses, en pastilles au bas de la scene (icone ronde + nom, une
// rangee qui defile). Chacun est « NEW » tant qu'il attend ; en toucher un le pose a la premiere place libre et le selectionne.
function majInventaire() {
  const zone = racine?.querySelector('.btq-inv');
  if (!zone) return;
  const reste = Object.entries(inventaire(partie(), ctx));
  zone.hidden = !reste.length;
  zone.innerHTML = '';
  for (const [type, n] of reste) {
    const v = BOUTIQUE.meubles[type], nom = cfg.shopLayout.furniture.find(f => f.id === type)?.name ?? type;
    const src = v?.fichier ? asset(v.fichier) : v ? asset(`${BOUTIQUE.dossierMeubles}${v.image}_SE.png`) : '';
    const b = el(`<button class="btq-pi"><i class="btq-new">NEW</i><span class="btq-pi-ico"><img src="${src}" alt=""></span><span>${nom}${n > 1 ? ` ×${n}` : ''}</span></button>`);
    b.onclick = () => {
      const r = poseOffert(partie(), type, ctx);
      if (!r.ok) { toast(r.reason); return; }
      change();
      choisisMeuble(r.value.id);
    };
    zone.appendChild(b);
  }
}

function surEvenement(e) {
  if (!racine?.isConnected) return;
  if (e.t === 'seconde') {
    majBarre();
  } else if (e.t === 'change') {
    majBarre();
    majInventaire();
  } else if (e.t === 'sale') {
    // Le noyau annonce la vente avant de retirer la carte : on lit l'etat juste apres.
    setTimeout(() => { if (racine?.isConnected) majBarre(); }, 0);
  } else if (e.t === 'heroUnlocked') toast(`${e.hero} rejoint tes héros !`);
}

export function renderBoutique() {
  const ecran = $('#screen-boutique');
  ecran.innerHTML = '';
  racine = el(`<div class="btq">
    <div class="btq-barre"><span id="btqGems"></span><span id="btqEchelle"></span></div>
    <div class="btq-monde"><canvas id="btqCanvas"></canvas><div class="btq-inv"></div></div>
  </div>`);
  ecran.appendChild(racine);
  majBarre();
  majInventaire();
  desabonne?.();
  desabonne = ecoute(surEvenement);
  lanceScene($('#btqCanvas'), {
    visuelCarte: id => SPRITES.get(id),
    estrade: ouvreWidgetEstrade,
    tournoi: ouvreTournoi,
    vitrine: (l, v) => { if (l) ficheVitrine(l.instanceId); else ouvreWidgetVitrine(v.id); },
    encheres: ouvreWidgetEncheres,
    agrandit: ouvreAgrandir,
    tourne: id => {
      const S = partie(), it = S.shop.items.find(i => i.id === id);
      if (!it) return;
      const r = moveFurniture(S, it.id, it.x, it.y, (it.dir + 1) % 4, ctx);
      if (!r.ok) toast(r.reason); else change();
    },
    // La boite de bulk de la scene : combien de cartes elle garde, et quand elle sera vide.
    bulk: () => { const S = partie(); toast(S.bulkBox.length ? `Bulk : ${S.bulkBox.length} cartes · ${cfg.bulk.salesPerHour} ventes par heure · vide dans ${formatDuration(bulkClearHours(S, ctx) * 60)}` : 'Le bulk est vide.'); },
    defi: ouvreDefi,
    deplace: (id, x, y, dir) => { const r = moveFurniture(partie(), id, x, y, dir, ctx); if (!r.ok) toast(r.reason); else change(); }
  });
}

export function quitteBoutique() {
  arreteScene();
  desabonne?.();
  desabonne = null;
}

/** Le recapitulatif au retour : ce qui s'est vendu, ce qu'on a gagne ou perdu aux encheres, ce qui revient du grading. */
export function montreResumeBoutique(r) {
  const vitrine = r.vendues.filter(v => v.canal !== 'bulk' && v.cardId);
  const bulk = r.vendues.filter(v => v.canal === 'bulk');
  const box = el(`<div class="btq-retour"><h2>${t('retour.titre')}</h2><p class="muted">${fmtTime(r.absenceMs)}${r.or ? ` · ${or(r.or)}` : ''}</p></div>`);
  const section = (titre, liste, legende) => {
    if (!liste.length) return;
    const g = el(`<div><h3>${titre}</h3><div class="btq-grille"></div></div>`);
    for (const x of liste.slice(0, BOUTIQUE.resumeCartesMax)) g.lastChild.appendChild(el(`<div class="btq-case-c">${carteHtml(x.cardId, 'normal', x.note ?? null)}<span>${legende(x)}</span></div>`));
    if (liste.length > BOUTIQUE.resumeCartesMax) g.appendChild(el(`<p class="muted">+${liste.length - BOUTIQUE.resumeCartesMax}</p>`));
    box.appendChild(g);
  };
  section(t('retour.vendues'), vitrine, x => court(Math.round(x.prix)));
  section(t('retour.gagnees'), r.gagnees, x => court(Math.round(x.prix)));
  if (r.gradees.length) {
    const g = el(`<div><h3>${t('retour.gradees')}</h3><div class="btq-boitiers"></div></div>`);
    for (const x of r.gradees.slice(0, BOUTIQUE.resumeCartesMax)) {
      const inst = partie().instances[x.instanceId];
      if (inst?.slab) g.lastChild.appendChild(el(boitierHtml(inst)));
    }
    box.appendChild(g);
  }
  section(t('retour.perdues'), r.perdues, () => '');
  if (bulk.length) box.appendChild(el(`<p>${t('retour.bulk', { n: bulk.length })} : ${or(bulk.reduce((s, x) => s + x.prix, 0))}</p>`));
  if (r.heros.length) box.appendChild(el(`<p>${t('retour.heros', { noms: r.heros.join(', ') })}</p>`));
  const b = el(`<button class="btn">${t('retour.merci')}</button>`);
  b.onclick = closeModal;
  box.appendChild(b);
  modal(box);
}

export const consoleBoutique = () => ({ etat: partie, avance: avanceDeMinutes, change, donne(n) { partie().gold += n; change(); } });
