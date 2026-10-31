// L'ECRAN D'EQUIPE et la FICHE d'un heros — les maquettes « Deck Screen » et « Upgrade Deck Screen » du game designer
// (mockups/, Figma « La place du chat », 12 octobre 2026), plus les onglets du 31 octobre. Aucun texte de plus que la
// maquette : les mots viennent de config/textes.js, les pictogrammes de ui/icones.js.
//
// L'equipe : 3 heros (toutes les places sont ouvertes), un toucher change celui de la place.
// La collection : rangee par FAMILLE (config/familles.js), des puces pour n'en montrer que certaines.
// La fiche : deux onglets en bas de l'ecran, a portee du pouce (ui/onglets.js).
//   - Deck : les cinq emplacements du heros en grand, la carte jouee devant, son autre face derriere ; un toucher sur
//     celle de derriere (ou le bouton) la fait passer devant.
//   - Amelioration : on ameliore le HEROS, chaque amelioration ameliore UNE carte d'un palier (`etapesDe`) ; le carrousel
//     fait defiler ces etapes, la frise du bas les montre toutes, le bouton achete la prochaine.
import { BALANCE } from '../config/balance.js';
import { CHARACTERS, CHAR_BY_ID, resolveCard, etapesDe, niveauMax, niveauxDesCartes } from '../config/characters.js';
import { keyLabel } from '../config/mechanics.js';
import { FAMILLES, familleDe, rareteDe } from '../config/familles.js';
import { t } from '../config/textes.js';
import { cartesNouvelles, marqueVues } from '../boutique/partie.js';
import { save, persist, upgradeCost, upgradeChar, toggleSwitch, unlockChar, setTeamSlot, puissance, signale, possede } from '../state.js';
import { $, el, asset, toast, modal, closeModal, court } from './shell.js';
import { icone } from './icones.js';
import { ligneDePictos, pictosDe, iconeDeCle, iconeDeOp } from './pictos.js';
import { creeOnglets } from './onglets.js';
import { installeGestes } from './gestes.js';
import { ficheDeCarte, montreLecture, cacheLecture, fermeAuProchainToucher } from './fiche.js';
import { refreshTop } from './shell.js';

// LES CARTES NOUVELLES (sorties d'un booster, ou achetees) : une pastille rouge les signale sur la navigation, le heros, l'onglet Deck
// et la carte elle-meme ; ouvrir l'onglet Deck du heros les marque vues.
const HEROS_DE_CARTE = new Map(CHARACTERS.flatMap(c => [...c.cards, ...(c.switches || [])].filter(Boolean).map(x => [x.id, c.id])));
const nouvellesDe = id => cartesNouvelles().filter(x => HEROS_DE_CARTE.get(x) === id);
export const nombreDeNouvelles = () => cartesNouvelles().filter(x => possede(HEROS_DE_CARTE.get(x))).length;

// Les familles montrees (puces allumees). Vide = toutes, comme « Tous ».
const filtre = new Set();

export function renderDeck() {
  const root = $('#screen-deck');
  root.innerHTML = '';
  const wrap = el('<div class="deck"></div>');

  // ------------------------------------------------------------- l'equipe
  wrap.appendChild(panneauEquipe({ apres: () => { renderDeck(); refreshTop(); } }));

  // -------------------------------------------------------- la collection
  const coll = el('<div class="dk-panneau dk-coll"><div class="dk-puces"></div></div>');
  const familles = FAMILLES.filter(f => CHARACTERS.some(c => familleDe(c) === f));
  const puces = coll.querySelector('.dk-puces');
  const puce = (nom, on, faire) => {
    const b = el(`<button class="dk-puce ${on ? 'on' : ''}">${nom}</button>`);
    b.onclick = () => { faire(); renderDeck(); };
    puces.appendChild(b);
  };
  puce(t('deck.tous'), filtre.size === 0, () => filtre.clear());
  for (const f of familles) puce(f.nom, filtre.has(f.id), () => {
    if (filtre.has(f.id)) filtre.delete(f.id); else filtre.add(f.id);
    if (filtre.size === familles.length) filtre.clear();
  });

  for (const f of familles) {
    if (filtre.size && !filtre.has(f.id)) continue;
    const sec = el(`<div class="dk-dossier"><h3 class="dk-onglet">${f.nom}</h3><div class="dk-grille"></div></div>`);
    const grille = sec.querySelector('.dk-grille');
    for (const c of CHARACTERS.filter(c => familleDe(c) === f)) {
      const n = vignette(c);
      n.onclick = () => (possede(c.id) ? ficheHeros(c.id) : unlockSheet(c.id));
      grille.appendChild(n);
    }
    coll.appendChild(sec);
  }
  wrap.appendChild(coll);
  root.appendChild(wrap);
}

/**
 * LE PANNEAU D'EQUIPE, partage par l'ecran Deck et la fiche d'arene (ui/arene.js) : une vignette par place ouverte
 * (`save.rosterSlots`), un toucher change le heros de la place. `conseilles` : des identifiants de heros a mettre en
 * avant (la fiche d'arene) ; `apres()` est appele quand l'equipe a change, ou quand on ferme le choix sans changer.
 */
export function panneauEquipe({ conseilles = [], apres = () => {} } = {}) {
  const equipe = el(`<div class="dk-panneau"><h2 class="dk-titre">${t('deck.equipe')}</h2><div class="dk-ligne"></div></div>`);
  const ligne = equipe.querySelector('.dk-ligne');
  for (let i = 0; i < save.rosterSlots; i++) {
    const id = save.team[i];
    const n = id ? vignette(CHAR_BY_ID[id], conseilles) : el('<div class="dk-vig vide"></div>');
    n.onclick = () => choisirPourLaPlace(i, { conseilles, apres });
    ligne.appendChild(n);
  }
  return equipe;
}

/** La vignette d'un heros : ciel de sa famille, liseré de sa rarete, niveau, coche s'il est dans l'equipe. */
function vignette(c, conseilles = []) {
  const st = save.chars[c.id];
  const f = familleDe(c);
  const dans = save.team.includes(c.id);
  const a = possede(c.id);
  return el(`<div class="dk-vig ${a ? '' : 'verrou'} ${conseilles.includes(c.id) ? 'conseille' : ''}" style="--fond:${f.fond};--rar:${rareteDe(c)}">
    <img src="${asset(c.sprite)}" alt="">
    <div class="nm">${a ? c.name : t('deck.verrouille')}</div>
    <span class="dk-pastille">${a ? st.level : '-'}</span>
    ${a && dans ? `<span class="dk-coche">${icone('Check', 16)}</span>` : ''}
    ${a && nouvellesDe(c.id).length ? '<i class="pastille"></i>' : ''}
  </div>`);
}

// Changer le heros d'une place : la liste des heros possedes (les conseilles d'abord) ; celui qui est deja ailleurs
// dans l'equipe echange sa place (setTeamSlot). Pas de place vide : l'equipe garde ses heros.
function choisirPourLaPlace(place, { conseilles = [], apres = () => {} } = {}) {
  const box = el('<div class="dk-grille dk-choix"></div>');
  const ordre = [...CHARACTERS].sort((a, b) => conseilles.includes(b.id) - conseilles.includes(a.id));
  for (const c of ordre) {
    if (!possede(c.id)) continue;
    const n = vignette(c, conseilles);
    n.onclick = () => {
      const avant = save.team[place];
      const ailleurs = save.team.indexOf(c.id);
      setTeamSlot(place, c.id);
      if (ailleurs >= 0 && ailleurs !== place && avant) { save.team[ailleurs] = avant; persist(); }
      closeModal();
    };
    box.appendChild(n);
  }
  // Fermer le choix (toucher le fond, ou choisir) rend la main a l'ecran qui l'a ouvert.
  modal(box, apres).classList.add('dk-feuille');
}

function unlockSheet(id) {
  const c = CHAR_BY_ID[id];
  const st = save.chars[id];
  const cost = BALANCE.costs.charUnlock;
  const box = el(`<div>
    <h2>${c.name}</h2>
    <img src="${asset(c.sprite)}" style="width:110px;margin:0 auto;display:block">
    <p class="muted">${c.role}</p>
    <p class="muted">${st.bossBeaten
      ? `Disponible a l'achat : <b>${save.cur.A}/${cost}</b> Fanions.`
      : 'Bats son boss dans la ligne de combats pour rendre son achat possible.'}</p>
  </div>`);
  const buy = el(`<button class="btn" ${st.bossBeaten ? '' : 'disabled'}>Recruter (${cost} Fanions)</button>`);
  buy.onclick = () => {
    const r = unlockChar(id);
    if (r === 'poor') toast(`Il te manque ${cost - save.cur.A} Fanions.`);
    else if (r === 'boss') toast('Son boss n’est pas encore vaincu.');
    else { closeModal(); renderDeck(); toast(`${c.name} rejoint l’equipe !`); }
  };
  box.appendChild(buy);
  const b = el('<button class="btn ghost">Fermer</button>');
  b.onclick = closeModal;
  box.appendChild(b);
  modal(box);
}

// ------------------------------------------------------------------ la fiche d'un heros

// L'onglet ouvert : on passe d'un heros a l'autre sans le rechoisir.
let ongletFiche = 'deck';

/**
 * La fiche d'un heros : son en-tete, puis ses deux onglets. `vue` : l'etape que montre l'onglet Amelioration (par
 * defaut, la prochaine) ; `echange` : l'emplacement dont l'onglet Deck joue l'echange en s'ouvrant (une switch achetee).
 */
function ficheHeros(id, { onglet = ongletFiche, vue, echange } = {}) {
  const c = CHAR_BY_ID[id];
  const st = save.chars[id];
  const f = familleDe(c);
  const entete = el(`<div class="upg-haut">
    <div class="upg-tete">
      <img src="${asset(c.sprite)}" alt="">
      <div><div class="upg-nom">${c.name}</div><div class="upg-espece">${c.species}</div></div>
      <span class="upg-niv">${t('deck.niveau', { n: st.level })}</span>
    </div>
    <div class="upg-sep"></div>
  </div>`);
  const croix = el(`<button class="ong-fin" aria-label="${t('deck.fermer')}">${icone('Close', 24)}</button>`);
  croix.onclick = closeModal;
  const onglets = creeOnglets({
    entete, fin: croix,
    onglets: [
      { id: 'deck', nom: t('deck.ongletDeck'), pastille: nouvellesDe(id).length > 0, rendu: corps => pageDeck(corps, id, echange) },
      { id: 'amelioration', nom: t('deck.ongletAmelioration'), rendu: corps => pageAmelioration(corps, id, vue) }
    ],
    surChange: x => { ongletFiche = x; }
  });
  const box = el(`<div class="upg" style="--fond:${f.fond};--cadre:${f.cadre}"></div>`);
  box.appendChild(onglets.node);
  modal(box).classList.add('dk-feuille', 'upg-feuille');
  onglets.va(onglet);
}

// ------------------------------------------------------------------ l'onglet Deck

/** La carte d'un emplacement, sur la face `face` ('base' ou 'switch'), telle que le niveau du heros la laisse. */
function carteDeFace(heros, slot, face) {
  const def = face === 'switch' ? heros.switches[slot] : heros.cards[slot];
  const carte = resolveCard(def, niveauxDesCartes(heros, save.chars[heros.id].level)[face][slot]);
  carte.sprite = carte.sprite || heros.sprite;
  return carte;
}

/** Une face : le personnage, le cout, les chiffres, le nom et ce qu'elle fait (son mot-cle s'ecrit en toutes lettres). */
function faceDeCarte(carte, face, place, verrou = false) {
  const allie = carte.type === 'ally';
  const mot = (carte.keys || []).find(iconeDeCle);
  const capacite = pictosDe(carte, { max: 2 }).liste.map((p, i) =>
    `<span class="pc">${icone(p.nom, 16)}${p.n !== null ? `<b>${p.n}</b>` : ''}${i === 0 && mot ? `<b>${keyLabel(mot)}</b>` : ''}</span>`).join('');
  return el(`<div class="dk-face ${place} ${allie ? '' : 'sort'} ${verrou ? 'verrou' : ''}" data-face="${face}">
    <img class="dk-art" src="${asset(carte.sprite)}" alt="">
    <span class="upg-cout">${carte.cost}</span>
    ${allie ? `<span class="dk-stat a">${carte.atk}</span><span class="dk-stat h">${carte.hp}</span>` : ''}
    <div class="dk-bande"><div class="dk-nom">${carte.name}</div><div class="dk-capa">${capacite}</div></div>
  </div>`);
}

/** Un emplacement : la carte jouee devant, l'autre face derriere, et le bouton qui les echange. */
function paireDeCartes(heros, slot) {
  const st = save.chars[heros.id];
  const f = familleDe(heros);
  const alt = (heros.switches || [])[slot];
  const sw = !!(alt && st.switches[slot]);
  const retiree = ((save.retraits && save.retraits[heros.id]) || []).includes(slot);
  const neuve = nouvellesDe(heros.id).some(x => x === heros.cards[slot].id || x === alt?.id);
  const paire = el(`<div class="dk-paire ${retiree ? 'retiree' : ''}" data-slot="${slot}" style="--fond:${f.fond};--rar:${rareteDe(heros)}">${neuve ? '<i class="pastille"></i>' : ''}</div>`);
  paire.appendChild(faceDeCarte(carteDeFace(heros, slot, 'base'), 'base', sw ? 'derriere' : 'devant'));
  if (alt) {
    const verrou = !sw && !aLaSwitch(heros.id, slot);
    paire.appendChild(faceDeCarte(carteDeFace(heros, slot, 'switch'), 'switch', sw ? 'devant' : 'derriere', verrou));
    const bouton = el(`<button class="dk-swap ${verrou ? 'verrou' : ''}" aria-label="${t('deck.echanger')}">${icone(verrou ? 'Lock' : 'Switch', 20)}</button>`);
    bouton.onclick = () => echangeFaces(heros, paire);
    paire.appendChild(bouton);
  }
  return paire;
}

/** La face de derriere passe devant ; une switch pas encore achetee passe d'abord par son achat. */
function echangeFaces(heros, paire) {
  if (paire.classList.contains('echange')) return;
  const slot = +paire.dataset.slot;
  const st = save.chars[heros.id];
  if (!st.switches[slot] && !aLaSwitch(heros.id, slot)) {
    achatSwitch(heros.id, slot, () => ficheHeros(heros.id, { onglet: 'deck', echange: st.switches[slot] ? slot : null }));
    return;
  }
  toggleSwitch(heros.id, slot);
  const devant = paire.querySelector('.dk-face.devant');
  const derriere = paire.querySelector('.dk-face.derriere');
  devant.classList.replace('devant', 'derriere');
  derriere.classList.replace('derriere', 'devant');
  joueEchange(paire);
}

/**
 * L'ANIMATION DE L'ECHANGE (demande du game designer, 31 octobre 2026) : les faces ont deja pris leur place finale ; elles
 * repartent de l'ancienne, s'ecartent, se croisent quand elles sont le plus loin (c'est la que la carte PASSE DEVANT : un
 * saut de `zIndex`, invisible a cet instant) et se posent. `translate` et `filter` de la carte de derriere se lisent sur le
 * style, la seule place ou ils sont ecrits (⚠ `translate` y reste en %, le navigateur ne le convertit pas en px).
 */
function joueEchange(paire) {
  const vient = paire.querySelector('.dk-face.devant');
  const part = paire.querySelector('.dk-face.derriere');
  const { translate, filter } = getComputedStyle(part);
  const [dx, dy] = translate.split(' ');
  const loin = `calc(${dx} + 12%) calc(${dy} - 7%)`;   // la carte qui vient s'ecarte vers l'exterieur de la paire
  const pres = '-11% 5%';                              // celle qui part recule de l'autre cote
  const ecarte = 'ease-out', pose = 'cubic-bezier(.35, 1.35, .6, 1)';   // la pose depasse un peu sa place, et s'y cale
  const croise = .42;
  paire.classList.add('echange');
  const temps = { duration: BALANCE.ui.echangeCarteMs };
  vient.animate([
    { offset: 0, easing: ecarte, translate: `${dx} ${dy}`, rotate: '0deg', scale: 1, filter, zIndex: 1 },
    { offset: croise, translate: loin, rotate: '7deg', scale: 1.06, filter: 'none', zIndex: 1 },
    { offset: croise + .01, easing: pose, translate: loin, rotate: '7deg', scale: 1.06, filter: 'none', zIndex: 3 },
    { offset: 1, translate: '0% 0%', rotate: '0deg', scale: 1, filter: 'none', zIndex: 3 }
  ], temps);
  const fin = part.animate([
    { offset: 0, easing: ecarte, translate: '0% 0%', rotate: '0deg', scale: 1, filter: 'none', zIndex: 2 },
    { offset: croise, translate: pres, rotate: '-5deg', scale: .95, zIndex: 2 },
    { offset: croise + .01, easing: pose, translate: pres, rotate: '-5deg', scale: .95, zIndex: 1 },
    { offset: 1, translate: `${dx} ${dy}`, rotate: '0deg', scale: 1, filter, zIndex: 1 }
  ], temps);
  paire.querySelector('.dk-swap').animate({ rotate: ['0deg', '180deg'], easing: 'ease-in-out' }, temps);
  fin.onfinish = fin.oncancel = () => paire.classList.remove('echange');
}

/** Les cinq emplacements. Toucher ou maintenir une carte la lit ; toucher celle de derriere l'echange. */
function pageDeck(corps, id, echange) {
  const heros = CHAR_BY_ID[id];
  const grille = el('<div class="dk-cartes"></div>');
  heros.cards.forEach((_, slot) => grille.appendChild(paireDeCartes(heros, slot)));
  corps.appendChild(grille);

  const lis = n => montreLecture(ficheDeCarte(carteDeFace(heros, +n.closest('.dk-paire').dataset.slot, n.dataset.face)));
  // Le toucher qui referme une fiche ouverte d'un toucher ne doit pas rouvrir celle de la carte sur laquelle il tombe.
  let avale = false;
  const referme = () => {
    cacheLecture();
    avale = true;
    setTimeout(() => { avale = false; }, BALANCE.ui.appuiLongMs);
  };
  installeGestes(grille, {
    cible: '.dk-face',
    tap: n => {
      if (avale) return;
      if (n.classList.contains('derriere')) { echangeFaces(heros, n.closest('.dk-paire')); return; }
      lis(n);
      fermeAuProchainToucher(referme);
    },
    lire: lis,
    finLire: cacheLecture
  });
  if (echange != null) joueEchange(grille.querySelector(`.dk-paire[data-slot="${echange}"]`));
  const vues = nouvellesDe(id);
  if (vues.length) { marqueVues(vues); renderDeck(); }
}

// ------------------------------------------------------------------ l'onglet Amelioration

/** L'icone de ce qu'apporte un palier (la frise, et la ligne sous la carte). */
function iconeDePalier(p) {
  if (p.key) return iconeDeCle(p.key) || 'Buff';
  if (p.extra) return iconeDeOp(p.extra.op);
  if (p.aura) return 'Aura';
  if (p.statique) return 'Static';
  if (p.cost) return 'Mana';
  if (p.lesDeux) return 'Choice';
  return 'Buff';
}

/**
 * L'onglet Amelioration, ouvert sur l'etape `vue` (par defaut : la prochaine amelioration). Une etape faite est verte, la
 * prochaine orange (c'est celle du bouton), les suivantes grisees sur la frise.
 */
function pageAmelioration(corps, id, vue) {
  const c = CHAR_BY_ID[id];
  const st = save.chars[id];
  const etapes = etapesDe(c);
  const faites = st.level - 1;                 // les etapes 0 .. faites-1 sont faites
  const max = st.level >= niveauMax(c);
  let k = Math.max(0, Math.min(etapes.length - 1, vue ?? faites));

  const box = el(`<div class="upg-page">
    <div class="upg-carrousel">
      <button class="upg-fl g" aria-label="precedente"></button>
      <div class="upg-scene"></div>
      <button class="upg-fl d" aria-label="suivante"></button>
    </div>
    <div class="upg-piste"><div class="upg-frise"></div></div>
    <div class="upg-achat"></div>
  </div>`);

  // --- le carrousel : l'etape vue au centre, ses voisines de chaque cote
  const scene = box.querySelector('.upg-scene');
  const etat = i => (i < faites ? 'faite' : i === faites ? 'prochaine' : 'future');
  const dessine = () => {
    scene.innerHTML = '';
    for (const [i, place] of [[k - 1, 'g'], [k, 'centre'], [k + 1, 'd']]) {
      if (i < 0 || i >= etapes.length) { scene.appendChild(el(`<div class="upg-etape ${place} vide"></div>`)); continue; }
      scene.appendChild(carteDEtape(c, etapes[i], i, `${place} ${etat(i)}`, place === 'centre'));
    }
    box.querySelector('.upg-fl.g').disabled = k === 0;
    box.querySelector('.upg-fl.d').disabled = k === etapes.length - 1;
    box.querySelectorAll('.upg-noeud').forEach(n => n.classList.toggle('vue', +n.dataset.i === k));
    // La frise defile seule (scrollIntoView ferait aussi glisser la fiche, qui la contient).
    const vu = box.querySelector(`.upg-noeud[data-i="${k}"]`);
    const piste = box.querySelector('.upg-piste');
    if (vu) piste.scrollTo({ left: vu.offsetLeft + vu.offsetWidth / 2 - piste.clientWidth / 2, behavior: 'smooth' });
  };
  const va = d => { const n = Math.max(0, Math.min(etapes.length - 1, k + d)); if (n !== k) { k = n; dessine(); } };
  box.querySelector('.upg-fl.g').onclick = () => va(-1);
  box.querySelector('.upg-fl.d').onclick = () => va(1);
  // Le doigt qui glisse fait defiler, comme les fleches.
  let x0 = null;
  scene.addEventListener('pointerdown', ev => { x0 = ev.clientX; });
  scene.addEventListener('pointerup', ev => {
    if (x0 === null) return;
    const dx = ev.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) va(dx < 0 ? 1 : -1);
  });
  // Toucher une carte voisine l'amene au centre.
  scene.addEventListener('click', ev => {
    const e = ev.target.closest('.upg-etape');
    if (e && e.classList.contains('g')) va(-1);
    else if (e && e.classList.contains('d')) va(1);
  });

  // --- la frise : le depart (niveau 1), puis une etape par niveau
  const frise = box.querySelector('.upg-frise');
  frise.style.setProperty('--fait', faites);
  frise.appendChild(el('<div class="upg-noeud depart faite"><span class="ico-vide"></span><span class="upg-rond">1</span></div>'));
  etapes.forEach((e, i) => {
    const n = el(`<div class="upg-noeud ${etat(i)}" data-i="${i}">
      ${icone(iconeDePalier(e.paliers[0]), i === faites ? 22 : 18)}<span class="upg-rond">${i + 2}</span>
    </div>`);
    n.onclick = () => { k = i; dessine(); };
    frise.appendChild(n);
  });

  // --- le bouton : la prochaine amelioration, son prix, ce qu'elle rapporte
  const achat = box.querySelector('.upg-achat');
  if (!max) {
    const cout = upgradeCost(id);
    const gain = puissance(id, st.level + 1) - puissance(id);
    const b = el(`<button class="upg-bouton ${save.cur.C < cout ? 'pauvre' : ''}">
      <span>${t('deck.ameliorer')}</span>${icone('Coin', 23)}<b>${court(cout)}</b>
    </button>`);
    b.onclick = () => {
      const r = upgradeChar(id);
      if (r !== 'ok') { b.classList.remove('non'); void b.offsetWidth; b.classList.add('non'); return; }
      refreshTop(); renderDeck();
      ficheHeros(id, { onglet: 'amelioration' });
      const fait = document.querySelector(`#modal .upg-noeud[data-i="${faites}"]`);
      if (fait) fait.classList.add('gagne');
    };
    achat.appendChild(b);
    achat.appendChild(el(`<div class="upg-gain">${t('deck.puissance', { n: gain })}</div>`));
  }

  corps.appendChild(box);
  dessine();
}

/** Une etape en carte : la carte telle que ce palier la laisse, son nom, ce qu'il apporte, son niveau. */
function carteDEtape(heros, e, i, classes, centre) {
  const carte = resolveCard(e.carte, e.lvl);
  const st = save.chars[heros.id];
  // La face qu'on ne joue pas est pale ; c'est l'onglet Deck qui l'equipe.
  const equipee = (e.face === 'switch') === !!st.switches[e.slot];
  const p = e.paliers[0];
  return el(`<div class="upg-etape ${classes} ${equipee ? '' : 'hors'}">
    <div class="upg-face">
      <img src="${asset(carte.sprite || heros.sprite)}" alt="">
      <span class="upg-cout">${carte.cost}</span>
      <div class="upg-bas">
        ${carte.type === 'ally' ? `<span class="upg-stats"><b class="a">${carte.atk}</b>${icone('Attack', 10)}<b class="h">${carte.hp}</b></span>` : ''}
        ${ligneDePictos(carte, { taille: centre ? 22 : 14, max: centre ? 2 : 3 })}
      </div>
    </div>
    <div class="upg-carte-nom">${carte.name}</div>
    <div class="upg-apport">${icone(iconeDePalier(p), centre ? 24 : 18)}<span>${e.paliers.map(x => x.text).join(' · ')}</span></div>
    <span class="upg-pilule">${t('deck.niveau', { n: i + 2 })}</span>
  </div>`);
}

// Une carte switch s'achete une fois (monnaie B), ensuite on bascule librement.
function aLaSwitch(id, slot) {
  const st = save.chars[id];
  if (!st.bought) st.bought = [false, false, false, false, false];
  return st.bought[slot];
}

function achatSwitch(id, slot, done) {
  const c = CHAR_BY_ID[id];
  const cost = BALANCE.costs.switchCard;
  const alt = c.switches[slot];
  const box = el(`<div>
    <h2>${alt.name}</h2>
    <p class="muted">Carte switch pour le slot ${slot + 1} de ${c.name}.</p>
    <p>${alt.text || '—'}</p>
    <p class="muted">Cout : <b>${cost}</b> Sceaux (tu en as ${save.cur.B}).</p>
  </div>`);
  const buy = el('<button class="btn">Debloquer</button>');
  buy.onclick = () => {
    if (save.cur.B < cost) { toast(`Il te manque ${cost - save.cur.B} Sceaux.`); return; }
    save.cur.B -= cost;
    const st = save.chars[id];
    if (!st.bought) st.bought = [false, false, false, false, false];
    st.bought[slot] = true;
    st.switches[slot] = true;
    signale('switch');
    persist();
    closeModal();
    renderDeck();
    if (done) done();
    toast(`${alt.name} débloquée.`);
  };
  const b = el('<button class="btn ghost">Annuler</button>');
  b.onclick = () => { closeModal(); if (done) done(); };
  box.appendChild(buy);
  box.appendChild(b);
  modal(box);
}
