// LA CONSOLE DE TRICHE HORS COMBAT (24 oct. 2026) : les commandes de `window.AC` (main.js) en boutons, pour le
// telephone — monnaies, temps, encheres, boutique, niveau d'un heros, combat contre une arene a un niveau choisi, deblocages,
// tutoriel, sauvegarde. Outil du
// game designer, pas du joueur : son bouton (barre du haut) n'existe que si `BALANCE.triche.bouton` est vrai ;
// sinon `AC.console()` l'ouvre quand meme. La triche DU COMBAT est a part (5 touchers sur « Tour N », ui/battle.js).
// ⚠ Tout ici ecrit la vraie sauvegarde (sauf « Tout debloque », qui ne change que le reglage, le temps de la session).
import { BALANCE } from '../config/balance.js';
import { CHARACTERS, CHAR_BY_ID, niveauMax } from '../config/characters.js';
import { ARENES, libelleArchetype } from '../config/arenes.js';
import { ENCOUNTERS } from '../config/world.js';
import { save, persist, etatArene, passeLeTutoriel, possede, rechargeAvec, sauvegardeBrute } from '../state.js';
import { addCopy } from '../boutique/noyau/state.js';
import { nextBid, openLotNow } from '../boutique/noyau/engines/market.js';
import { ladderFinished, recordWin } from '../boutique/noyau/engines/progression.js';
import { avanceDeMinutes, change, ctx, partie, sauve, simuleAbsence } from '../boutique/partie.js';
import { el, closeModal, CURRENCY_NAME } from './shell.js';
import { icone } from './icones.js';
import { openBattle } from './battle.js';
import { noeudDeLArene, ouvreFicheArene } from './arene.js';

const MONNAIES = [['C', 100], ['C', 1000], ['G', 10], ['A', 50], ['B', 50]];
const AVANCES = [['+10 min', 10], ['+1 h', 60], ['+8 h', 480], ['+24 h', 1440]];
const VARIANTES = [['', 'Variante au hasard'], ['normale', 'Normale'], ['foil', 'Foil'], ['gradee', 'Gradée'], ['foilGradee', 'Foil gradée']];
const CLE_POINT = 'adventureCard.triche.point';
const INSTANT = 0.001;   // en minutes : assez pour que le noyau traite ce qu'on vient de lui poser

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
  // Une action de la boutique : les ecrans de la boutique suivent `change()`.
  const boutique = (texte, fn, classe) => bouton(texte, b => { const r = fn(b); change(); return r; }, classe);
  // Ce qui ne se rattrape pas demande un second toucher, sans boite de dialogue (comme « Abandonner »).
  const deuxFois = (texte, fn) => {
    let arme = 0;
    return bouton(texte, b => {
      if (Date.now() - arme > 3000) {
        arme = Date.now();
        b.textContent = 'Toucher encore pour confirmer';
        setTimeout(() => { b.textContent = texte; }, 3000);
        return '';
      }
      return fn();
    }, 'large danger');
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

  // -------------------------------------------------------------- le temps de la boutique
  titre('Temps');
  for (const [nom, minutes] of AVANCES) bouton(nom, () => { avanceDeMinutes(minutes); return `${nom} passé`; });
  bouton('Absence de 8 h', () => { ferme(); if (!simuleAbsence(480)) { ouvre(); return 'rien ne s’est passé en 8 h'; } }, 'large');

  // -------------------------------------------------------------- les encheres
  titre('Enchères');
  const rarete = choix([['', 'Rareté au hasard'], ...ctx.cfg.market.rarities.map(r => [r, ctx.index.rarityById.get(r).name])], '');
  const variante = choix(VARIANTES, '');
  boutique('Ajouter', () => {
    const v = variante.value;
    const force = { rarity: rarete.value || undefined };
    if (v) { force.foil = v.startsWith('foil'); force.graded = v !== 'normale' && v !== 'foil'; }
    const id = openLotNow(partie(), ctx, force);
    return id ? `${ctx.index.cardById.get(id).name} aux enchères` : 'aucune carte manquante à proposer';
  });
  const lots = () => partie().market.lots;
  boutique('Un rival surenchérit', () => {
    for (const l of lots()) { l.maxRival = Math.max(l.maxRival, nextBid(l, ctx)); l.nextRivalMs = partie().nowMs; }
    avanceDeMinutes(INSTANT);
    return `${lots().length} lot(s) relancé(s)`;
  }, 'large');
  boutique('Plus que 11 min', () => {
    for (const l of lots()) l.endMs = partie().nowMs + (ctx.cfg.market.lot.warnMinutes + 1) * 60000;
    return 'l’alerte part dans une minute sur les lots où tu as misé';
  });
  boutique('Finir les lots', () => {
    const n = lots().length;
    for (const l of lots()) l.endMs = partie().nowMs;
    avanceDeMinutes(INSTANT);
    return `${n} lot(s) terminé(s)`;
  });
  boutique('Tirage suivant', () => {
    const S = partie();
    avanceDeMinutes(Math.max(0, S.market.nextRefreshMs - S.nowMs) / 60000 + INSTANT);
    return `${lots().length} lot(s) en cours`;
  });

  // -------------------------------------------------------------- la boutique
  titre('Boutique');
  boutique('+5 boosters', () => { const b = partie().boosters; b.stock += 5; return `${b.stock} boosters`; });
  boutique('+1 premium', () => {
    const { premium } = partie().boosters, id = ctx.cfg.premium.boosters[0].id;
    premium[id] = (premium[id] ?? 0) + 1;
    return `${premium[id]} premium`;
  });
  boutique('+50 gems', () => { partie().gems += 50; return `${partie().gems} gems`; });
  const donne = finish => () => {
    const S = partie();
    const ids = Object.keys(S.collection);
    if (!ids.length) return 'ouvre d’abord un booster';
    const id = ids[Math.floor(Math.random() * ids.length)];
    addCopy(S, id, finish);
    if (finish === 'foil') S.foilCollection[id] = true;
    return `${ctx.index.cardById.get(id).name} dans le stock`;
  };
  boutique('Un double', donne('normal'));
  boutique('Un double foil', donne('foil'));
  boutique('Finir le grading', () => {
    const q = partie().gradingQueue, n = q.length;
    for (const g of q) g.doneMs = partie().nowMs;
    avanceDeMinutes(INSTANT);
    return `${n} carte(s) revenue(s)`;
  });
  const avancer = () => {
    const p = partie().progression, avant = `${p.level}/${p.opponentIndex}`;
    while (`${p.level}/${p.opponentIndex}` === avant && !ladderFinished(partie(), ctx)) recordWin(partie(), ctx);
    return p;
  };
  boutique('Adversaire suivant', () => { const p = avancer(); return `niveau ${p.level}, adversaire ${p.opponentIndex + 1}`; }, 'large');
  boutique('Tous les paliers', () => {
    const p = partie().progression, steps = ctx.cfg.progression.steps;
    while (p.stepIndex < steps.length && p.level < 2) avancer();
    return `${p.stepIndex} / ${steps.length} paliers`;
  }, 'large');

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

  // -------------------------------------------------------------- la sauvegarde
  titre('Sauvegarde');
  const brute = () => { sauve(); return sauvegardeBrute(); };
  bouton('Point de retour', () => {
    localStorage.setItem(CLE_POINT, JSON.stringify(brute()));
    return `point posé à ${new Date().toLocaleTimeString('fr-FR')}`;
  });
  bouton('Y revenir', () => {
    const point = JSON.parse(localStorage.getItem(CLE_POINT));
    if (!point) return 'aucun point de retour';
    rechargeAvec(point.jeu, point.boutique);
    return 'on y retourne';
  });
  bouton('Copier', b => { navigator.clipboard?.writeText(JSON.stringify(brute())); return 'sauvegarde copiée'; });
  deuxFois('Effacer la boutique', () => { rechargeAvec(brute().jeu, null); return 'boutique effacée'; });
  deuxFois('Tout effacer et repartir de zéro', () => { rechargeAvec(); return 'sauvegarde effacée'; });

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
