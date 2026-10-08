// LA FENETRE DE ZONE. Montrer une zone du combat — une defausse, l'exil, plus tard la pile
// de fatigue ou le Registre — comme le fait Arena : elle affiche ce qui est PERTINENT,
// ECLAIRE ce qu'on peut faire d'un geste et GRISE le reste, si bien qu'on lit la situation
// d'un coup d'oeil au lieu de chercher le sort qu'on peut relancer dans une liste.
//
// Elle ne sait rien du combat : on lui donne des groupes de cartes DEJA ETIQUETEES, elle les
// dessine. C'est l'appelant (ui/battle.js) qui sait ce qui est jouable, et c'est la meme
// fenetre qui servira a Charogne (lecture seule), a la pile de fatigue et au Registre.
//
// Trois etats pour une carte :
//   'on'  — eclairee : on peut la jouer d'un geste (un clic appelle `onChoix`) ;
//   'off' — grisee : sans objet ici (pas le mot-cle, pas assez de mana...) ;
//   'vue' — lue seulement : ni l'un ni l'autre, par exemple la defausse de l'adversaire.
import { keyId, keyLabel } from '../config/mechanics.js';
import { el, asset, modal, closeModal } from './shell.js';

/** Un mot-cle utile a lire sur une vignette : pas les types, qui noieraient la carte. */
const motsCles = c => (c.keys || []).filter(k => keyId(k) !== 'type' && keyId(k) !== 'type_tous').slice(0, 3);

function carteNode(x, gi) {
  const c = x.carte;
  // `data-geste` : la carte se touche par les gestes de l'ecran de combat (ui/gestes.js) —
  // un tap la joue si elle est eclairee, un appui long la lit. `g` et `i` disent laquelle.
  const n = el(`
    <div class="zcard ${c.type === 'spell' ? 'spell' : ''} ${x.etat}" data-geste="zone" data-g="${gi}" data-i="${x.i}">
      <div class="cost">${x.cout ?? c.cost}</div>
      ${c.sprite ? `<img src="${asset(c.sprite)}" alt="">` : ''}
      <div class="nm">${c.name}</div>
      <div class="tx">${c.text || ''}</div>
      ${motsCles(c).length ? `<div class="chips">${motsCles(c).map(k => `<span class="chip">${keyLabel(k)}</span>`).join('')}</div>` : ''}
      ${c.type === 'ally' ? `<div class="st">${c.atk}/${c.hp}</div>` : ''}
      ${x.note ? `<div class="note">${x.note}</div>` : ''}
    </div>`);
  return n;
}

/**
 * Ouvre la fenetre. `groupes` : [{ titre, cartes: [{ carte, i, cout?, etat, note? }] }], dans
 * l'ordre ou on veut les lire — `i` est la place de la carte dans sa zone. Ce qui se passe quand
 * on la touche n'est PAS ici : les cartes portent `data-geste="zone"`, `data-g` (le groupe) et
 * `data-i`, et c'est l'ecran de combat qui lit le geste (tap, appui long). `onClose` part quand
 * la fenetre se ferme, par un clic dehors ou par `closeModal()`.
 * Rend la feuille, pour que l'appelant puisse remettre le defilement quand il la redessine.
 */
export function ouvreZone({ titre, aide, groupes, onClose }) {
  const box = el(`<div class="zone"><h3>${titre}</h3>${aide ? `<p class="muted">${aide}</p>` : ''}</div>`);
  groupes.forEach((g, gi) => {
    const sec = el(`<section class="zgrp"><h4>${g.titre} <span class="n">${g.cartes.length}</span></h4></section>`);
    if (!g.cartes.length) sec.appendChild(el('<div class="src">Rien ici.</div>'));
    const grille = el('<div class="zcards"></div>');
    for (const x of g.cartes) {
      grille.appendChild(carteNode(x, gi));
    }
    if (g.cartes.length) sec.appendChild(grille);
    box.appendChild(sec);
  });
  const fermer = el('<button class="btn ghost">Fermer</button>');
  fermer.onclick = closeModal;
  box.appendChild(fermer);
  return modal(box, onClose || (() => {}));
}
