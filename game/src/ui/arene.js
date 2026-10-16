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
import { openBattle } from './battle.js';

/** Le point du monde qui porte une arene. */
export const noeudDeLArene = id => WORLD.nodes.find(n => n.type === 'arena' && n.arene === id) || null;

const echappe = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Ouvre la fiche de l'arene du point `n`. `avant()` est appele juste avant le combat (la carte s'arrete),
 * `apres(gagne)` au retour du combat — ou a la fermeture de la fiche sans combattre (`gagne` = null).
 */
export function ouvreFicheArene(n, { avant = () => {}, apres = () => {} } = {}) {
  const a = areneDe(n);
  if (!a) return;
  save.world.seen[n.id] = true;
  persist();
  presentation(n, a, { avant, apres });
}

// --------------------------------------------------------------- etape 1 : l'ennemi
function presentation(n, a, cb) {
  const etat = etatArene(a.id);
  const ennemi = coteEnnemi(a.ennemi, etat.niveau) || ENCOUNTERS[a.ennemi] || {};
  const heros = a.herosConseilles.map(id => CHAR_BY_ID[id]).filter(Boolean);
  const box = el(`<div class="ar-fiche">
    <div class="ar-tete">
      <div class="ar-portrait"><img class="ar-bat" src="${asset(a.batiment)}" alt=""><img class="ar-ennemi" src="${asset(ennemi.sprite || '')}" alt=""></div>
      <div>
        <h2>${echappe(n.name)}</h2>
        <div class="ar-puces"><span class="ar-puce arch">${echappe(libelleArchetype(a))}</span><span class="ar-puce">${t('arene.niveau', { n: etat.niveau })}</span></div>
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
    openBattle({ ...n, niveau: etatArene(a.id).niveau }, gagne => cb.apres(gagne));
  };
  box.appendChild(boutons);
  modal(box).classList.add('dk-feuille', 'ar-feuille');
}

// --------------------------------------------------------------- l'onglet « Arene »
/** L'onglet : une carte par arene decouverte, dans l'ordre de config/arenes.js. */
export function renderArene() {
  const root = $('#screen-arene');
  root.innerHTML = '';
  const wrap = el(`<div class="pad ar-onglet"><h2>${t('arene.onglet')}</h2><div class="ar-grille"></div></div>`);
  const grille = wrap.querySelector('.ar-grille');
  const vues = ARENES.map(a => ({ a, n: noeudDeLArene(a.id) })).filter(x => x.n && save.world.seen[x.n.id]);
  if (!vues.length) grille.appendChild(el(`<p class="muted">${t('arene.vide')}</p>`));
  for (const { a, n } of vues) {
    const etat = etatArene(a.id);
    const sprite = (ENCOUNTERS[a.ennemi] || {}).sprite || '';
    const c = el(`<button class="ar-flash ${etat.victoires ? 'battue' : ''}">
      <div class="ar-portrait"><img class="ar-bat" src="${asset(a.batiment)}" alt=""><img class="ar-ennemi" src="${asset(sprite)}" alt=""></div>
      <b>${echappe(n.name)}</b>
      <span class="ar-puce arch">${echappe(libelleArchetype(a))}</span>
      <span class="ar-statut">${t('arene.niveau', { n: etat.niveau })} · ${etat.meilleur ? t('arene.battue', { n: etat.meilleur }) : t('arene.jamais')}</span>
    </button>`);
    c.onclick = () => ouvreFicheArene(n, { apres: () => renderArene() });
    grille.appendChild(c);
  }
  root.appendChild(wrap);
}
