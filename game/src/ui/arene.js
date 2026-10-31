// LES COMBATS : la fiche d'un adversaire et la ligne de combats.
//
// La FICHE d'une arene, en deux etapes dans la meme fenetre :
//   1. l'ennemi — nom, sprite, batiment, niveau de l'arene, archetype, ce que le combat demande, la strategie
//      optimale (au sens du projet : ce qui se decide AVANT le match), ce qu'il punit, son deck, les heros
//      conseilles, et la puissance conseillee a cote de celle de l'equipe (elle ne verrouille rien) ;
//   2. l'equipe — le panneau d'equipe de l'ecran Deck (ui/deck.js, `panneauEquipe`), les decks enregistres (un
//      toucher recharge un deck), la taille du deck et les jokers de retrait, puis « Combattre » -> `openBattle`
//      (mode auto par defaut, comme tout combat).
// On l'ouvre depuis LA LIGNE DE COMBATS (`renderArene`) : tous les combats a la suite, un adversaire a un niveau, le
// suivant au centre. La position vient de boutique/partie.js.
// Les mots viennent de config/textes.js (`arene.*`), les donnees de config/arenes.js et config/ennemis.js.
import { WORLD, ENCOUNTERS } from '../config/world.js';
import { ARENE_PAR_ID, libelleArchetype } from '../config/arenes.js';
import { coteEnnemi } from '../config/ennemis.js';
import { CHAR_BY_ID } from '../config/characters.js';
import { t } from '../config/textes.js';
import {
  save, persist, team, etatArene, areneDe, puissanceEquipe, tailleDuDeck, tailleMinDuDeck, retireCarte, rendCarte,
  enregistreDeck, chargeDeck, supprimeDeck, possede
} from '../state.js';
import { CONFIG } from '../boutique/noyau/donnees.js';
import { combatDeLaLigne, indexCourant, longueurLigne } from '../boutique/partie.js';
import { $, el, asset, toast, modal, closeModal } from './shell.js';
import { panneauEquipe } from './deck.js';
import { icone } from './icones.js';
import { openBattle } from './battle.js';

const COMBATS_PAR_ADVERSAIRE = CONFIG.progression.ladder.winsToAdvance;

/** Le point du monde qui porte une arene. */
export const noeudDeLArene = id => WORLD.nodes.find(n => n.type === 'arena' && n.arene === id) || null;

const echappe = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Ouvre la fiche de l'arene du point `n`. `avant()` est appele juste avant le combat,
 * `apres(gagne)` au retour du combat — ou a la fermeture de la fiche sans combattre (`gagne` = null).
 * `niveau` : le niveau a jouer (celui du combat touche dans la ligne) ; le niveau courant sinon.
 */
export function ouvreFicheArene(n, { avant = () => {}, apres = () => {}, niveau = null, enchaine = false } = {}) {
  const a = areneDe(n);
  if (!a) return;
  save.world.seen[n.id] = true;
  persist();
  presentation(n, a, { avant, apres, niveau, enchaine });
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
      ${heros.length ? `<div class="ar-heros">${heros.map(h => `<div class="ar-h ${possede(h.id) ? '' : 'absent'}"><img src="${asset(h.sprite)}" alt=""><span>${echappe(h.name)}</span></div>`).join('')}</div>`
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
  const min = tailleMinDuDeck();   // jamais plus que ce que les places ouvertes portent (le tutoriel)
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
    openBattle({ ...n, niveau: niveauJoue(a, cb), enchaine: cb.enchaine }, gagne => cb.apres(gagne));
  };
  box.appendChild(boutons);
  modal(box).classList.add('dk-feuille', 'ar-feuille');
}

// --------------------------------------------------------------- la ligne de combats
// Une piste qui monte de bas en haut : un point par combat, le courant en evidence, l'ennemi du point choisi en grand dans le
// fond avec ses infos. Toucher un point montre son ennemi ; on combat le courant, on rejoue un combat fait.
const AVANT = 12;     // combats deja faits montres sous le combat courant
const APRES = 30;     // combats a venir montres au-dessus
let choisi = null;

function point(i, cur) {
  const c = combatDeLaLigne(i);
  const etat = i < cur ? 'fait' : i === cur ? 'courant' : 'avenir';
  const nouveau = i % COMBATS_PAR_ADVERSAIRE === 0;
  const p = el(`<button class="lg-pt ${etat} ${nouveau ? 'nouveau' : ''} ${i === choisi ? 'choisi' : ''}" aria-label="${t('ligne.combat', { n: i + 1 })}">
    ${etat === 'fait' ? icone('Validate', 20) : `<span>${i + 1}</span>`}
  </button>`);
  p.onclick = () => { choisi = i; dessineLigne(); };
  return p;
}

/** Enchaine le combat suivant de la ligne, avec l'equipe en place. Une defaite ou « Arreter » ramene a la ligne. */
function combatSuivant() {
  const cur = indexCourant();
  const c = combatDeLaLigne(cur);
  const n = noeudDeLArene(c.arene);
  if (cur >= longueurLigne() || !n || tailleDuDeck() < tailleMinDuDeck()) { renderArene(); return; }
  openBattle({ ...n, niveau: c.niveau, enchaine: true }, g => (g ? combatSuivant() : renderArene()));
}

function dessineLigne() {
  const root = $('#screen-arene');
  const cur = indexCourant();
  const total = longueurLigne();
  const i = Math.min(total - 1, choisi ?? cur);
  const c = combatDeLaLigne(i);
  const a = ARENE_PAR_ID[c.arene];
  const n = noeudDeLArene(c.arene);
  const enc = ENCOUNTERS[a?.ennemi] || {};
  const ennemi = coteEnnemi(a?.ennemi, c.niveau) || enc;
  const avenir = i > cur;
  root.innerHTML = '';
  const ecran = el(`<div class="lg-ecran">
    <img class="lg-bat" src="${asset(a?.batiment || '')}" alt="">
    <img class="lg-ennemi" src="${asset(ennemi.sprite || enc.sprite || '')}" alt="">
    <div class="lg-rail"><div class="lg-points"></div></div>
    <div class="lg-infos">
      <div class="lg-num">${t('ligne.combat', { n: i + 1 })} / ${total}</div>
      <h2>${echappe(n?.name || c.arene)}</h2>
      <div class="ar-puces"><span class="ar-puce arch">${a ? echappe(libelleArchetype(a)) : ''}</span><span class="ar-puce">${t('arene.niveau', { n: c.niveau })}</span></div>
      <div class="lg-stats">${ennemi.hp ?? '?'} PV · ${(ennemi.deck || []).length} cartes</div>
      ${a?.signature ? `<div class="lg-sig">${icone(a.signature.icone, 22)}<span>${echappe(a.signature.texte)}</span></div>` : ''}
      <button class="btn lg-go" ${avenir || !n ? 'disabled' : ''}>${avenir ? t('ligne.verrou') : i < cur ? t('ligne.rejouer') : t('ligne.jouer')}</button>
    </div>
  </div>`);
  const points = ecran.querySelector('.lg-points');
  // Du plus loin au plus proche : le premier combat est en bas, on monte.
  for (let k = Math.min(total - 1, cur + APRES); k >= Math.max(0, cur - AVANT); k--) points.appendChild(point(k, cur));
  // Le combat courant lance la suite : chaque victoire enchaine le suivant. Un combat rejoue reste seul.
  if (n && !avenir) {
    ecran.querySelector('.lg-go').onclick = () => ouvreFicheArene(n, {
      niveau: c.niveau,
      enchaine: i === cur,
      apres: g => { choisi = null; if (g && i === cur) combatSuivant(); else renderArene(); }
    });
  }
  root.appendChild(ecran);
  const rail = ecran.querySelector('.lg-rail');
  const vise = ecran.querySelector('.lg-pt.choisi') || ecran.querySelector('.lg-pt.courant');
  if (vise) rail.scrollTop = vise.offsetTop - rail.clientHeight * 0.62;
}

/** L'onglet : la piste, sur le combat courant. */
export function renderArene() {
  choisi = null;
  dessineLigne();
}
