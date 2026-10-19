// LES ARENES (spec « Refonte Overworld + Arenes », 16 octobre 2026).
//
// La FICHE d'une arene, en deux etapes dans la meme fenetre :
//   1. l'ennemi — nom, sprite, batiment, niveau de l'arene, archetype, ce que le combat demande, la strategie
//      optimale (au sens du projet : ce qui se decide AVANT le match), ce qu'il punit, son deck, les heros
//      conseilles, et la puissance conseillee a cote de celle de l'equipe (elle ne verrouille rien) ;
//   2. l'equipe — le panneau d'equipe de l'ecran Deck (ui/deck.js, `panneauEquipe`), les decks enregistres (un
//      toucher recharge un deck), la taille du deck et les jokers de retrait, puis « Combattre » -> `openBattle`
//      (mode auto par defaut, comme tout combat).
// On l'ouvre en entrant dans le batiment (ui/overworld.js) ou depuis l'onglet « Arene » (`renderArene`), qui
// montre une carte par arene DECOUVERTE (`save.world.seen`), sans avoir a marcher jusqu'a elle.
// Les mots viennent de config/textes.js (`arene.*`), les donnees de config/arenes.js et config/ennemis.js.
import { BALANCE } from '../config/balance.js';
import { WORLD, ENCOUNTERS } from '../config/world.js';
import { ARENES, libelleArchetype } from '../config/arenes.js';
import { coteEnnemi } from '../config/ennemis.js';
import { CHAR_BY_ID } from '../config/characters.js';
import { t } from '../config/textes.js';
import {
  save, persist, team, etatArene, areneDe, puissanceEquipe, tailleDuDeck, retireCarte, rendCarte,
  enregistreDeck, chargeDeck, supprimeDeck
} from '../state.js';
import { $, el, asset, toast, modal, closeModal } from './shell.js';
import { panneauEquipe } from './deck.js';
import { icone } from './icones.js';
import { openBattle } from './battle.js';

/** Le point du monde qui porte une arene. */
export const noeudDeLArene = id => WORLD.nodes.find(n => n.type === 'arena' && n.arene === id) || null;

const echappe = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Ouvre la fiche de l'arene du point `n`. `avant()` est appele juste avant le combat (la carte s'arrete),
 * `apres(gagne)` au retour du combat — ou a la fermeture de la fiche sans combattre (`gagne` = null).
 * `niveau` : le niveau a jouer (choisi dans l'onglet, un niveau deja battu se rejoue) ; le niveau courant sinon.
 */
export function ouvreFicheArene(n, { avant = () => {}, apres = () => {}, niveau = null } = {}) {
  const a = areneDe(n);
  if (!a) return;
  save.world.seen[n.id] = true;
  persist();
  presentation(n, a, { avant, apres, niveau });
}

/** Le niveau que la fiche fera jouer. */
const niveauJoue = (a, cb) => cb.niveau || etatArene(a.id).niveau;

// --------------------------------------------------------------- etape 1 : l'ennemi
function presentation(n, a, cb) {
  const niveau = niveauJoue(a, cb);
  const ennemi = coteEnnemi(a.ennemi, niveau) || ENCOUNTERS[a.ennemi] || {};
  const heros = a.herosConseilles.map(id => CHAR_BY_ID[id]).filter(Boolean);
  const box = el(`<div class="ar-fiche">
    <div class="ar-tete">
      <div class="ar-portrait"><img class="ar-bat" src="${asset(a.batiment)}" alt=""><img class="ar-ennemi" src="${asset(ennemi.sprite || '')}" alt=""></div>
      <div>
        <h2>${echappe(n.name)}</h2>
        <div class="ar-puces"><span class="ar-puce arch">${echappe(libelleArchetype(a))}</span><span class="ar-puce">${t('arene.niveau', { n: niveau })}</span></div>
        <div class="muted">${echappe(a.role || '')} · ${ennemi.hp ?? '?'} PV · ${(ennemi.deck || []).length} cartes</div>
      </div>
    </div>
    ${bloc(t('arene.question'), a.question)}
    ${bloc(t('arene.strategie'), a.reponse)}
    ${bloc(t('arene.punit'), a.punit)}
    ${bloc(t('arene.deck'), a.typeDeck)}
    <div class="ar-bloc"><h3>${t('arene.conseilles')}</h3>
      ${heros.length ? `<div class="ar-heros">${heros.map(h => `<div class="ar-h ${save.chars[h.id].owned ? '' : 'absent'}"><img src="${asset(h.sprite)}" alt=""><span>${echappe(h.name)}</span></div>`).join('')}</div>`
        : `<p class="muted">${t('arene.tousConseilles')}</p>`}
    </div>
    ${n.reqPower != null ? `<p class="ar-puissance">${t('arene.puissance', { r: n.reqPower, p: puissanceEquipe() })}</p>` : ''}
    ${a.textesValides ? '' : `<p class="ar-note">${t('arene.provisoire')}</p>`}
    <div class="ar-boutons"><button class="btn ghost" data-k="fermer">${t('arene.fermer')}</button><button class="btn" data-k="equipe">${t('arene.choisirEquipe')}</button></div>
  </div>`);
  box.querySelector('[data-k="fermer"]').onclick = () => { closeModal(); cb.apres(null); };
  box.querySelector('[data-k="equipe"]').onclick = () => choixEquipe(n, a, cb);
  modal(box).classList.add('dk-feuille', 'ar-feuille');
}

const bloc = (titre, texte) => (texte ? `<div class="ar-bloc"><h3>${titre}</h3><p>${echappe(texte)}</p></div>` : '');

// --------------------------------------------------------------- etape 2 : l'equipe
function choixEquipe(n, a, cb) {
  const encore = () => choixEquipe(n, a, cb);
  const box = el(`<div class="ar-fiche ar-equipe"><h2>${echappe(n.name)}</h2></div>`);
  box.appendChild(panneauEquipe({ conseilles: a.herosConseilles, apres: encore }));

  // Les decks enregistres : un toucher recharge, l'appui sur la croix oublie.
  const decks = el(`<div class="ar-bloc"><h3>${t('arene.decks')}</h3><div class="ar-decks"></div></div>`);
  const liste = decks.querySelector('.ar-decks');
  if (!(save.decks || []).length) liste.appendChild(el(`<p class="muted">${t('arene.aucunDeck')}</p>`));
  (save.decks || []).forEach((d, i) => {
    const p = el(`<div class="ar-deck"><button class="ar-deck-nom">${echappe(d.nom)}</button><button class="ar-deck-x" aria-label="oublier">×</button></div>`);
    p.querySelector('.ar-deck-nom').onclick = () => { if (chargeDeck(i)) encore(); };
    // Deux touchers pour oublier un deck : le premier demande, le second oublie (pas de boite de dialogue).
    const x = p.querySelector('.ar-deck-x');
    x.onclick = () => {
      if (!x.classList.contains('sur')) { x.classList.add('sur'); x.textContent = t('arene.oublier'); return; }
      supprimeDeck(i); encore();
    };
    liste.appendChild(p);
  });
  const plus = el(`<button class="btn ghost ar-plus">${t('arene.enregistrer')}</button>`);
  plus.onclick = () => {
    // Le nom : les heros du deck (on reconnait un deck a son equipe).
    const nom = team().map(id => CHAR_BY_ID[id].name).join(' + ');
    if (enregistreDeck(nom) === 'plein') toast(t('arene.decksPlein')); else encore();
  };
  decks.appendChild(plus);
  box.appendChild(decks);

  // La taille du deck et les jokers de retrait : un toucher retire une carte (un joker), un autre la remet.
  const taille = tailleDuDeck();
  const min = BALANCE.decks.tailleMin;
  const retraits = el(`<div class="ar-bloc"><h3>${t('arene.retraits', { n: save.profil.jokersRetrait || 0 })}</h3><div class="ar-cartes"></div></div>`);
  const cartes = retraits.querySelector('.ar-cartes');
  for (const id of team()) {
    const def = CHAR_BY_ID[id], st = save.chars[id];
    const out = (save.retraits && save.retraits[id]) || [];
    def.cards.forEach((base, slot) => {
      const carte = st.switches[slot] && def.switches[slot] ? def.switches[slot] : base;
      const retiree = out.includes(slot);
      const b = el(`<button class="ar-carte ${retiree ? 'retiree' : ''}"><img src="${asset(def.sprite)}" alt="">${echappe(carte.name)}</button>`);
      b.onclick = () => {
        if (retiree) rendCarte(id, slot);
        else if (retireCarte(id, slot) === 'joker') { toast(t('arene.pasDeJoker')); return; }
        encore();
      };
      cartes.appendChild(b);
    });
  }
  box.appendChild(retraits);

  const manque = Math.max(0, min - taille);
  box.appendChild(el(`<p class="ar-taille ${manque ? 'non' : ''}">${t('arene.taille', { n: taille })}${manque ? ' — ' + t('arene.manque', { n: manque, min }) : ''}</p>`));
  const boutons = el(`<div class="ar-boutons"><button class="btn ghost" data-k="retour">${t('arene.retour')}</button><button class="btn" data-k="go" ${manque ? 'disabled' : ''}>${t('arene.combattre')}</button></div>`);
  boutons.querySelector('[data-k="retour"]').onclick = () => presentation(n, a, cb);
  boutons.querySelector('[data-k="go"]').onclick = () => {
    if (manque) return;
    closeModal();
    cb.avant();
    // Le combat existant, inchange : le point du monde porte l'arene, le niveau est celui de l'arene.
    openBattle({ ...n, niveau: niveauJoue(a, cb) }, gagne => cb.apres(gagne));
  };
  box.appendChild(boutons);
  modal(box).classList.add('dk-feuille', 'ar-feuille');
}

// --------------------------------------------------------------- l'onglet « Arene »
// Une CARTE par arene decouverte (maquette « Arena Screen », 19 octobre 2026) : le batiment en fond, l'ennemi en
// grand, son nom, son archetype, la mecanique de son deck (`signature`, config/arenes.js), l'equipe conseillee (avec
// ce qu'il reste a faire pour chaque heros) et le CHOIX DU NIVEAU — fleches, niveaux battus coches, la recompense
// au-dessus. Toucher la carte ouvre la fiche au niveau choisi ; les fleches ne l'ouvrent pas.

// Le niveau choisi par arene, le temps de la session (au depart : le niveau courant, celui qu'on n'a pas encore battu).
const choisis = new Map();

/** Ou en est un heros conseille : recrute (« Upgrade »), recrutable (« Unlock »), ou pas encore decouvert. */
function statutHeros(h) {
  const st = save.chars[h.id] || {};
  if (st.owned) return { cl: 'ameliorer', mot: t('deck.ameliorer') };
  if (st.bossBeaten) return { cl: 'debloquer', mot: t('arene.debloquer') };
  return { cl: 'inconnu', mot: t('arene.inconnu') };
}

function carteArene(a, n) {
  const etat = etatArene(a.id);
  const max = Math.max(1, etat.niveau);
  if (!choisis.has(a.id) || choisis.get(a.id) > max) choisis.set(a.id, max);
  const enc = ENCOUNTERS[a.ennemi] || {};
  const heros = a.herosConseilles.map(id => CHAR_BY_ID[id]).filter(Boolean);
  const equipe = heros.length
    ? heros.map(h => {
      const s = statutHeros(h);
      return `<div class="arn-h ${s.cl}"><img src="${asset(h.sprite)}" alt=""><span>${echappe(h.name)}</span><em>${s.mot}</em></div>`;
    }).join('')
    : `<p>${t('arene.tousConseilles')}</p>`;
  const sig = a.signature ? `<div class="arn-sig">${icone(a.signature.icone, 30)}<span>${echappe(a.signature.texte)}</span></div>` : '';
  const c = el(`<div class="arn" role="button">
    <img class="arn-bat" src="${asset(a.batiment)}" alt="">
    <img class="arn-ennemi" src="${asset(enc.sprite || '')}" alt="">
    <div class="arn-droite">
      <h3>${echappe(n.name)}</h3>
      <div class="arn-corps">
        <div class="arn-gauche">
          <span class="arn-arch">${echappe(libelleArchetype(a))}</span>
          <div class="arn-equipe"><b>${t('arene.equipeConseillee')}</b>${equipe}</div>
        </div>
        <div class="arn-col">
          ${sig}
          <div class="arn-niv"></div>
        </div>
      </div>
    </div>
  </div>`);
  const niv = c.querySelector('.arn-niv');
  const dessine = () => {
    const k = choisis.get(a.id);
    const gain = enc.rewards ? enc.rewards.A : null;
    const pilule = (v, cl) => (v < 1 ? '<span class="arn-p vide"></span>'
      : `<span class="arn-p ${cl} ${v <= etat.meilleur ? 'battu' : ''} ${v > max ? 'ferme' : ''}">${cl === 'cur' ? t('deck.niveau', { n: v }) : v}${v <= etat.meilleur && cl !== 'cur' ? icone('Validate', 26) : ''}</span>`);
    niv.innerHTML = `
      ${gain != null ? `<div class="arn-gain">${icone('Fanion', 16)}<b>${gain}</b></div>` : ''}
      <div class="arn-rail"><i></i></div>
      <div class="arn-choix">
        <button class="arn-fl g" ${k <= 1 ? 'disabled' : ''} aria-label="niveau précédent"></button>
        <div class="arn-pilules">${pilule(k - 1, 'prec')}${pilule(k, 'cur')}${pilule(k + 1, 'suiv')}</div>
        <button class="arn-fl d" ${k >= max ? 'disabled' : ''} aria-label="niveau suivant"></button>
      </div>`;
    niv.querySelector('.g').onclick = ev => { ev.stopPropagation(); if (k > 1) { choisis.set(a.id, k - 1); dessine(); } };
    niv.querySelector('.d').onclick = ev => { ev.stopPropagation(); if (k < max) { choisis.set(a.id, k + 1); dessine(); } };
  };
  dessine();
  c.onclick = () => ouvreFicheArene(n, { niveau: choisis.get(a.id), apres: () => renderArene() });
  return c;
}

/** L'onglet : une carte par arene decouverte, dans l'ordre de config/arenes.js. */
export function renderArene() {
  const root = $('#screen-arene');
  root.innerHTML = '';
  const wrap = el(`<div class="pad ar-onglet"><h2>${t('arene.onglet')}</h2><div class="arn-liste"></div></div>`);
  const liste = wrap.querySelector('.arn-liste');
  const vues = ARENES.map(a => ({ a, n: noeudDeLArene(a.id) })).filter(x => x.n && save.world.seen[x.n.id]);
  if (!vues.length) liste.appendChild(el(`<p class="muted">${t('arene.vide')}</p>`));
  for (const { a, n } of vues) liste.appendChild(carteArene(a, n));
  root.appendChild(wrap);
}
