// L'ECRAN D'EQUIPE et la FICHE D'AMELIORATION d'un heros — les maquettes « Deck Screen » et « Upgrade Deck Screen »
// du game designer (mockups/, Figma « La place du chat », 12 octobre 2026). Aucun texte de plus que la maquette :
// les mots viennent de config/textes.js, les pictogrammes de ui/icones.js.
//
// L'equipe : 3 heros (toutes les places sont ouvertes), un toucher change celui de la place.
// La collection : rangee par FAMILLE (config/familles.js), des puces pour n'en montrer que certaines.
// La fiche : on ameliore le HEROS, chaque amelioration ameliore UNE carte d'un palier (`etapesDe`) ; le carrousel
// fait defiler ces etapes, la frise du bas les montre toutes, le bouton achete la prochaine.
import { BALANCE } from '../config/balance.js';
import { CHARACTERS, CHAR_BY_ID, resolveCard, etapesDe, niveauMax } from '../config/characters.js';
import { FAMILLES, familleDe, rareteDe } from '../config/familles.js';
import { t } from '../config/textes.js';
import { save, persist, upgradeCost, upgradeChar, toggleSwitch, unlockChar, setTeamSlot, puissance, signale } from '../state.js';
import { $, el, asset, toast, modal, closeModal, court } from './shell.js';
import { icone } from './icones.js';
import { ligneDePictos, iconeDeCle, iconeDeOp } from './pictos.js';
import { refreshTop } from './overworld.js';

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
      n.onclick = () => (save.chars[c.id].owned ? ficheHeros(c.id) : unlockSheet(c.id));
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
  return el(`<div class="dk-vig ${st.owned ? '' : 'verrou'} ${conseilles.includes(c.id) ? 'conseille' : ''}" style="--fond:${f.fond};--rar:${rareteDe(c)}">
    <img src="${asset(c.sprite)}" alt="">
    <div class="nm">${st.owned ? c.name : t('deck.verrouille')}</div>
    <span class="dk-pastille">${st.owned ? st.level : '-'}</span>
    ${st.owned && dans ? `<span class="dk-coche">${icone('Check', 16)}</span>` : ''}
  </div>`);
}

// Changer le heros d'une place : la liste des heros possedes (les conseilles d'abord) ; celui qui est deja ailleurs
// dans l'equipe echange sa place (setTeamSlot). Pas de place vide : l'equipe garde ses heros.
function choisirPourLaPlace(place, { conseilles = [], apres = () => {} } = {}) {
  const box = el('<div class="dk-grille dk-choix"></div>');
  const ordre = [...CHARACTERS].sort((a, b) => conseilles.includes(b.id) - conseilles.includes(a.id));
  for (const c of ordre) {
    if (!save.chars[c.id].owned) continue;
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
      : 'Bats son boss dans l’overworld pour rendre son achat possible.'}</p>
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

// ------------------------------------------------------------------ la fiche d'amelioration

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
 * La fiche d'un heros, ouverte sur l'etape `vue` (par defaut : la prochaine amelioration). Une etape faite est
 * verte, la prochaine orange (c'est celle du bouton), les suivantes grisees sur la frise.
 */
function ficheHeros(id, vue) {
  const c = CHAR_BY_ID[id];
  const st = save.chars[id];
  const f = familleDe(c);
  const etapes = etapesDe(c);
  const faites = st.level - 1;                 // les etapes 0 .. faites-1 sont faites
  const max = st.level >= niveauMax(c);
  let k = Math.max(0, Math.min(etapes.length - 1, vue ?? faites));

  const box = el(`<div class="upg" style="--fond:${f.fond};--cadre:${f.cadre}">
    <div class="upg-tete">
      <img src="${asset(c.sprite)}" alt="">
      <div><div class="upg-nom">${c.name}</div><div class="upg-espece">${c.species}</div></div>
      <span class="upg-niv">${t('deck.niveau', { n: st.level })}</span>
    </div>
    <div class="upg-sep"></div>
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
      ficheHeros(id);
      const fait = document.querySelector(`#modal .upg-noeud[data-i="${faites}"]`);
      if (fait) fait.classList.add('gagne');
    };
    achat.appendChild(b);
    achat.appendChild(el(`<div class="upg-gain">${t('deck.puissance', { n: gain })}</div>`));
  }

  modal(box).classList.add('dk-feuille', 'upg-feuille');
  dessine();
}

/** Une etape en carte : la carte telle que ce palier la laisse, son nom, ce qu'il apporte, son niveau. */
function carteDEtape(heros, e, i, classes, centre) {
  const carte = resolveCard(e.carte, e.lvl);
  const st = save.chars[heros.id];
  const alt = e.face === 'base' ? (heros.switches || [])[e.slot] : heros.cards[e.slot];
  // La face qu'on ne joue pas est pale ; un toucher sur le pictogramme « switch » l'equipe.
  const equipee = (e.face === 'switch') === !!st.switches[e.slot];
  const p = e.paliers[0];
  const n = el(`<div class="upg-etape ${classes} ${equipee ? '' : 'hors'}">
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
    ${centre && alt && !equipee ? `<button class="upg-switch">${icone('Switch', 18)}</button>` : ''}
  </div>`);
  const sw = n.querySelector('.upg-switch');
  if (sw) sw.onclick = ev => {
    ev.stopPropagation();
    if (e.face === 'switch' && !aLaSwitch(heros.id, e.slot)) { achatSwitch(heros.id, e.slot, () => ficheHeros(heros.id, i)); return; }
    toggleSwitch(heros.id, e.slot);
    renderDeck();
    ficheHeros(heros.id, i);
  };
  return n;
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
    toast(`${alt.name} debloquee.`);
  };
  const b = el('<button class="btn ghost">Annuler</button>');
  b.onclick = () => { closeModal(); if (done) done(); };
  box.appendChild(buy);
  box.appendChild(b);
  modal(box);
}
