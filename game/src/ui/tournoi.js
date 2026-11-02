// LE TOURNOI, cote ecran (regles et etat : `boutique/tournoi.js`) : le widget qu'ouvre la bulle du tableau des defis — inscription,
// tableau des demi-finales et de la finale, lancement du match, resultat. Le match est un duel de client (`openBattle`, noeud `defi`).
import { BOUTIQUE } from '../config/boutique.js';
import { CHAR_BY_ID } from '../config/characters.js';
import { save, tailleDuDeck, tailleMinDuDeck } from '../state.js';
import { partie } from '../boutique/partie.js';
import { adversaireDuTour, elimines, etatTournoi, finDuMatch, inscrire, noeudDuMatch } from '../boutique/tournoi.js';
import { openBattle } from './battle.js';
import { montreFin } from './fin.js';
import { $, asset, closeModal, el, modal, toast } from './shell.js';

const T = BOUTIQUE.tournoi;
const echappe = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const visage = tete => `<img class="tn-v" src="${BOUTIQUE.visage(tete)}" alt="">`;
const TEXTE_ISSUE = {
  perdu1: 'Éliminé en demi-finale.',
  finale: 'Finaliste ! Tu repars avec :',
  victoire: 'Tu as gagné le tournoi ! Tu repars avec :'
};

/**
 * LE TABLEAU (maquette du 2 nov. 2026) : le joueur et son adversaire a gauche, les deux autres a droite, le lot au milieu ; un point jaune =
 * encore en course, une croix rouge = elimine (et son trait passe au gris). Il se montre des l'ouverture des inscriptions.
 */
function tableau(t) {
  const sorti = elimines(t);
  const moi = CHAR_BY_ID[save.team.find(Boolean)] ?? Object.values(CHAR_BY_ID)[0];
  // [clef de statut, image, nom, x, y] ; le joueur et adv[0] a gauche, adv[1] et adv[2] a droite.
  const places = [
    ['toi', asset(moi.sprite), 'Toi', 50, 62], [0, BOUTIQUE.visage(t.adv[0].tete), t.adv[0].nom, 50, 206],
    [1, BOUTIQUE.visage(t.adv[1].tete), t.adv[1].nom, 290, 62], [2, BOUTIQUE.visage(t.adv[2].tete), t.adv[2].nom, 290, 206]
  ];
  const R = 34;
  const traits = places.map(([k, , , x, y]) => {
    const g = x < 170, bord = g ? x + R : x - R, milieu = g ? 122 : 218, bout = g ? 146 : 194;
    return `<path d="M${bord} ${y} H${milieu} V134 H${bout}" fill="none" stroke="${sorti[k] ? '#b9b9b9' : '#1a1a1a'}" stroke-width="4" stroke-linejoin="round"/>`;
  }).join('');
  const joueurs = places.map(([k, img, nom, x, y], i) => {
    const g = x < 170, bord = g ? x + R : x - R;
    return `<clipPath id="tnc${i}"><circle cx="${x}" cy="${y}" r="${R}"/></clipPath>
      <circle cx="${x}" cy="${y}" r="${R}" fill="#fff3d8"/>
      <image href="${img}" x="${x - R}" y="${y - R}" width="${R * 2}" height="${R * 2}" clip-path="url(#tnc${i})" preserveAspectRatio="xMidYMid slice"${sorti[k] ? ' opacity=".45"' : ''}/>
      <circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="#1a1a1a" stroke-width="4"/>
      <text x="${x}" y="${y + R + 18}" text-anchor="middle" font-size="15" font-weight="800" fill="#2b1c1f">${echappe(nom)}</text>
      ${sorti[k] ? `<circle cx="${bord}" cy="${y}" r="10" fill="#e8352e" stroke="#1a1a1a" stroke-width="2.5"/><path d="M${bord - 4} ${y - 4} l8 8 m0 -8 l-8 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`
        : `<circle cx="${bord}" cy="${y}" r="9" fill="#ffd400" stroke="#1a1a1a" stroke-width="2.5"/>`}`;
  }).join('');
  return `<svg class="tn-svg" viewBox="0 0 340 262" role="img" aria-label="Tableau du tournoi">${traits}
    <circle cx="170" cy="134" r="27" fill="#fff3d8" stroke="#1a1a1a" stroke-width="4"/><text x="170" y="144" text-anchor="middle" font-size="30">🏆</text>${joueurs}</svg>`;
}

/** La fin d'un tournoi, en grand : le titre s'abat, le trophée tombe, les confettis (le gagnant), le tableau, les boosters qui défilent. */
export function celebre(r) {
  const t = etatTournoi();
  const gagne = r.issue === 'victoire';
  const racine = $('#app');
  const ferme = () => racine.querySelector('.fin.tournoi')?.remove();
  montreFin({
    racine, issue: gagne ? 'victoire' : 'defaite', classe: `tournoi ${r.issue}`,
    titre: { victoire: 'Champion !', finale: 'Finaliste', perdu1: 'Éliminé' }[r.issue],
    sousTitre: `<div class="tn-trophee">${{ victoire: '🏆', finale: '🥈', perdu1: '🎟️' }[r.issue]}</div>${tableau(t)}`,
    recompenses: r.n ? [{ label: 'Booster premium', n: r.n }] : [],
    boutons: [{ texte: gagne ? 'Génial !' : 'Continuer', primaire: true, onClick: ferme }]
  });
}

export function ouvreTournoi() {
  const S = partie();
  const t = etatTournoi();
  const box = el('<div class="tn"></div>');
  const recompenses = `Récompenses : demi-finale perdue ${T.recompenses.perdu1.n || 'rien'}, finale perdue ${T.recompenses.finale.n} booster premium, victoire ${T.recompenses.victoire.n}.`;
  if (t.etat === 'inscrit') {
    const final = t.tour === 2;
    const adv = t.adv[final ? t.autre : 0];
    box.innerHTML = `<h2>${final ? 'Finale' : 'Demi-finale'}</h2>
      ${tableau(t)}
      <p class="tn-vs">Contre <b>${echappe(adv.nom)}</b></p>
      <p class="muted">${recompenses}</p>
      <button class="btn" id="tnJoue">${final ? 'Jouer la finale' : 'Jouer la demi-finale'}</button>`;
    box.querySelector('#tnJoue').onclick = () => {
      if (tailleDuDeck() < tailleMinDuDeck()) { toast('Ton équipe est trop petite pour ce duel.'); return; }
      closeModal();
      openBattle(noeudDuMatch(adversaireDuTour()), gagne => {
        const r = finDuMatch(gagne === true);
        if (r.fini) celebre(r);
        else { toast('Demi-finale gagnée !'); ouvreTournoi(); }
      });
    };
  } else if (t.etat === 'ouvert') {
    box.innerHTML = `<h2>Tournoi ouvert !</h2>
      ${tableau(t)}
      <p class="muted">Quatre joueurs, deux tours. Inscription gratuite, ouverte encore <time id="tnReste">${mmss(t.finMs - S.nowMs)}</time>.</p>
      <p class="muted">${recompenses}</p>
      <button class="btn" id="tnInscris">S'inscrire</button>`;
    box.querySelector('#tnInscris').onclick = () => { if (inscrire()) { closeModal(); ouvreTournoi(); } };
  } else {
    box.innerHTML = `<h2>Tournoi</h2>
      ${t.dernier && t.adv ? tableau(t) : ''}
      ${t.dernier ? `<p>${TEXTE_ISSUE[t.dernier.issue]}${t.dernier.n ? ` <b>${t.dernier.n} booster premium</b>` : ''}</p>` : ''}
      <p class="muted">Prochain tournoi dans environ <time>${mmss(t.suivantMs - S.nowMs)}</time>. Reviens quand le tableau s'allume.</p>`;
  }
  modal(box);
}
