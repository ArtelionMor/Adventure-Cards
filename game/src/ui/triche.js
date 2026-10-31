// LA CONSOLE DE TRICHE HORS COMBAT (24 oct. 2026) : les commandes de `window.AC` (main.js) en boutons, pour le
// telephone — monnaies, niveau d'un heros, combat contre une arene a un niveau choisi, deblocages, tutoriel. Outil du
// game designer, pas du joueur : son bouton (barre du haut) n'existe que si `BALANCE.triche.bouton` est vrai ;
// sinon `AC.console()` l'ouvre quand meme. La triche DU COMBAT est a part (5 touchers sur « Tour N », ui/battle.js).
// ⚠ Tout ici ecrit la vraie sauvegarde (sauf « Tout debloque », qui ne change que le reglage, le temps de la session).
import { BALANCE } from '../config/balance.js';
import { CHARACTERS, CHAR_BY_ID, niveauMax } from '../config/characters.js';
import { ARENES, libelleArchetype } from '../config/arenes.js';
import { ENCOUNTERS } from '../config/world.js';
import { save, persist, etatArene, passeLeTutoriel, possede } from '../state.js';
import { el, closeModal, CURRENCY_NAME } from './shell.js';
import { icone } from './icones.js';
import { openBattle } from './battle.js';
import { noeudDeLArene, ouvreFicheArene } from './arene.js';

const MONNAIES = [['C', 100], ['C', 1000], ['G', 10], ['A', 50], ['B', 50]];

/**
 * Monte la console (une fois, au demarrage) : `nav.go(ecran)`, `nav.rafraichit()` (redessine l'ecran courant et la
 * barre du haut). Rend `ouvre()`, aussi branche sur `AC.console()`.
 */
export function installeTriche(nav) {
  const p = el(`<div class="triche globale">
    <div class="tr-tete"><b>Triche</b><span class="tr-res"></span><button class="tr-ferme">Fermer</button></div>
    <div class="tr-grille"></div></div>`);
  const grille = p.querySelector('.tr-grille'), res = p.querySelector('.tr-res');
  const dit = r => { res.textContent = r === undefined ? '' : String(r); };
  // Chaque bouton fait son action, dit ce qu'il a fait, puis redessine l'ecran du dessous (il reste visible).
  const bouton = (texte, fn, classe = '') => {
    const b = el(`<button class="${classe}"></button>`);
    b.textContent = texte;
    b.onclick = () => { try { dit(fn(b)); persist(); nav.rafraichit(); } catch (e) { dit(e.message); } };
    grille.appendChild(b);
    return b;
  };
  const titre = texte => grille.appendChild(el(`<div class="tr-titre">${texte}</div>`));
  const choix = (options, classe = 'large') => {
    const s = el(`<select class="${classe}"></select>`);
    for (const [v, l] of options) s.appendChild(new Option(l, v));
    grille.appendChild(s);
    return s;
  };

  // -------------------------------------------------------------- monnaies
  titre('Monnaies');
  for (const [k, n] of MONNAIES) bouton(`+${n} ${CURRENCY_NAME[k]}`, () => { save.cur[k] = (save.cur[k] || 0) + n; return `${CURRENCY_NAME[k]} : ${save.cur[k]}`; });

  // -------------------------------------------------------------- un heros
  titre('Héros');
  const heros = choix(CHARACTERS.map(c => [c.id, c.name]));
  const h = () => ({ c: CHAR_BY_ID[heros.value], st: save.chars[heros.value] });
  const niveau = d => () => {
    const { c, st } = h();
    st.level = Math.max(1, Math.min(niveauMax(c), d === 'max' ? niveauMax(c) : st.level + d));
    return `${c.name} : niveau ${st.level} / ${niveauMax(c)}`;
  };
  bouton('Niveau −1', niveau(-1));
  bouton('Niveau +1', niveau(1));
  bouton('Niveau max', niveau('max'));
  // Recruter / renvoyer touche la SAUVEGARDE (`owned`) : avec « Tout debloque », le heros reste alignable quand meme.
  bouton('Recruter / renvoyer', () => {
    const { c, st } = h();
    st.owned = !st.owned;
    if (!possede(c.id)) save.team = save.team.map(id => (id === c.id ? null : id));
    return `${c.name} : ${st.owned ? 'recruté' : 'renvoyé'}${BALANCE.toutDebloque ? ' (tout débloqué : toujours alignable)' : ''}`;
  }, 'large');

  // -------------------------------------------------------------- un combat
  titre('Combat');
  const arene = choix(ARENES.map(a => [a.id, `${(ENCOUNTERS[a.ennemi] || {}).name || a.id} · ${libelleArchetype(a)}`]));
  const niv = el('<select></select>');
  for (let i = 1; i <= BALANCE.arenes.niveauMax; i++) niv.appendChild(new Option(`Niveau ${i}`, i));
  grille.appendChild(niv);
  const point = () => noeudDeLArene(arene.value);
  // Combattre tout de suite, avec l'equipe alignee : la victoire PAIE et fait monter l'arene, comme une vraie.
  bouton('Combattre', () => {
    const n = point();
    if (!n) return 'pas de point du monde pour cette arène';
    ferme();
    openBattle({ ...n, niveau: Number(niv.value) }, () => nav.rafraichit());
  });
  bouton('Ouvrir sa fiche', () => {
    const n = point();
    if (!n) return 'pas de point du monde pour cette arène';
    const a = etatArene(arene.value);
    a.niveau = Math.max(a.niveau || 1, Number(niv.value));   // la fiche ne propose que les niveaux deja atteints
    ferme();
    ouvreFicheArene(n, { niveau: Number(niv.value), apres: () => nav.rafraichit() });
  });
  // Le niveau courant de l'arene : l'onglet « Arene » propose alors tous les niveaux jusqu'a lui.
  bouton('Arène à ce niveau', () => {
    const a = etatArene(arene.value);
    a.niveau = Number(niv.value);
    a.meilleur = Math.min(a.meilleur || 0, a.niveau - 1);
    return `${arene.value} : niveau ${a.niveau}`;
  });

  // -------------------------------------------------------------- deblocages
  titre('Déblocages');
  const td = () => `Tout débloqué : ${BALANCE.toutDebloque ? 'oui' : 'non'}`;
  bouton(td(), b => {
    BALANCE.toutDebloque = !BALANCE.toutDebloque;
    b.textContent = td();
    return 'jusqu’au rechargement (le réglage est dans balance.js)';
  }, 'large');
  bouton('Recruter tous les héros', () => { for (const c of CHARACTERS) save.chars[c.id].owned = true; return `${CHARACTERS.length} héros recrutés`; }, 'large');
  bouton('Passer le tutoriel', () => `${passeLeTutoriel()} quête(s) passée(s)`, 'large');
  bouton('+1 place', () => { save.rosterSlots = Math.min(3, save.rosterSlots + 1); return `${save.rosterSlots} place(s)`; });
  bouton('Toutes les arènes vues', () => {
    for (const a of ARENES) { const n = noeudDeLArene(a.id); if (n) save.world.seen[n.id] = true; }
    return 'vues (elles restent après « tout débloqué »)';
  }, 'large');

  const ferme = () => p.classList.remove('ouvert');
  const ouvre = () => { closeModal(); p.classList.add('ouvert'); };
  p.querySelector('.tr-ferme').onclick = ferme;
  document.getElementById('app').appendChild(p);

  if (BALANCE.triche.bouton) {
    const b = el(`<button id="topTriche" aria-label="Triche">${icone('Cheat', 18)}</button>`);
    b.onclick = () => (p.classList.contains('ouvert') ? ferme() : ouvre());
    document.querySelector('#topbar .monnaies').before(b);
  }
  return ouvre;
}
