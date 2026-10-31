// LE PROFIL DU JOUEUR (spec « Refonte Overworld + Arenes », 16 octobre 2026) : son niveau, son XP, sa puissance,
// et l'ARBRE de 25 niveaux (config/profil.js) — ce que chaque niveau rapporte, ce qui est deja acquis.
// On l'ouvre en touchant l'avatar de la barre du haut (main.js).
// Libelle neutre « Profil » / « Niveau du joueur » : le nom de cette progression n'est pas tranche.
import { CHAR_BY_ID } from '../config/characters.js';
import { NIVEAU_MAX_PROFIL, recompensesDuNiveau } from '../config/profil.js';
import { FONDS } from '../config/arenes.js';
import { t } from '../config/textes.js';
import { save, xpPourSuivant, puissanceJoueur, fondsDebloques, choisitFond } from '../state.js';
import { el, asset, modal, closeModal } from './shell.js';

/** Une recompense en une ligne (et l'image du heros quand c'en est un). */
function ligneRecompense(r) {
  if (r.type === 'heros') {
    const c = CHAR_BY_ID[r.id];
    return c ? `<span class="pf-rec"><img src="${asset(c.sprite)}" alt="">${t('profil.recHeros', { nom: c.name })}</span>` : '';
  }
  if (r.type === 'place') return `<span class="pf-rec">${t('profil.recPlace')}</span>`;
  if (r.type === 'joker') return `<span class="pf-rec">${t('profil.recJoker', { n: r.n || 1 })}</span>`;
  return '';
}

/**
 * LE FOND DES COMBATS (21 oct. 2026) : « celui de l'arene » (par defaut), puis un fond par lieu ; une arene gagnee
 * debloque le sien (`fondsDebloques`). Un toucher sur un fond debloque le garde pour tous les combats. La pastille de
 * couleur de chaque fond est dans styles.css (`.pf-fond i`), son vrai dessin dans skins/cozy.css.
 */
function choixDuFond() {
  const zone = el(`<div class="pf-fonds"><h3>${t('profil.fonds')}</h3><div class="pf-fonds-l"></div></div>`);
  const liste = zone.querySelector('.pf-fonds-l');
  const dessine = () => {
    const ok = fondsDebloques();
    const choisi = save.profil.fond || null;
    const tuile = (id, nom, libre) => `<button class="pf-fond${choisi === id ? ' on' : ''}${libre ? '' : ' verrou'}" data-fond="${id || ''}"${libre ? '' : ' disabled'}>
      <i></i><span>${nom}</span>${libre ? '' : `<small>${t('profil.fondVerrou')}</small>`}</button>`;
    liste.innerHTML = tuile(null, t('profil.fondArene'), true)
      + Object.entries(FONDS).map(([id, f]) => tuile(id, f.nom, ok.has(id))).join('');
  };
  liste.onclick = ev => {
    const b = ev.target.closest('.pf-fond');
    if (!b || b.disabled) return;
    if (choisitFond(b.dataset.fond || null)) dessine();
  };
  dessine();
  return zone;
}

export function ouvreProfil() {
  const p = save.profil;
  const besoin = xpPourSuivant();
  const box = el(`<div class="pf">
    <h2>${t('profil.titre')}</h2>
    <div class="pf-tete">
      <div class="pf-niv">${p.niveau}</div>
      <div class="pf-infos">
        <b>${t('profil.niveau', { n: p.niveau })}</b>
        <div class="pf-barre"><i style="width:${besoin ? Math.min(100, p.xp / besoin * 100) : 100}%"></i></div>
        <small>${besoin ? t('profil.xp', { x: p.xp, y: besoin }) : t('profil.max')}</small>
      </div>
    </div>
    <div class="pf-chiffres">
      <span>${t('profil.puissance', { n: puissanceJoueur() })}</span>
      <span>${t('profil.places', { n: save.rosterSlots })}</span>
      <span>${t('profil.jokers', { n: p.jokersRetrait || 0 })}</span>
    </div>
    <ol class="pf-arbre"></ol>
  </div>`);
  const arbre = box.querySelector('.pf-arbre');
  arbre.appendChild(el(`<li class="pf-n acquis"><span class="pf-rond">1</span><span class="pf-rec">${t('profil.depart')}</span></li>`));
  for (let n = 2; n <= NIVEAU_MAX_PROFIL; n++) {
    const etat = n <= p.niveau ? 'acquis' : n === p.niveau + 1 ? 'prochain' : '';
    arbre.appendChild(el(`<li class="pf-n ${etat}"><span class="pf-rond">${n}</span>${recompensesDuNiveau(n).map(ligneRecompense).join('')}</li>`));
  }
  box.insertBefore(choixDuFond(), arbre);
  const b = el(`<button class="btn">${t('arene.fermer')}</button>`);
  b.onclick = closeModal;
  box.appendChild(b);
  modal(box).classList.add('dk-feuille', 'pf-feuille');
  // Le prochain niveau se voit sans chercher.
  const vu = box.querySelector('.pf-n.prochain');
  if (vu) vu.scrollIntoView({ block: 'center' });
}
