// LES ONGLETS DU BAS : un panneau, et ses onglets en intercalaires qui pendent sous lui, a portee du pouce (demande du
// game designer, 31 octobre 2026 : ses maquettes de la boutique, « Packs & Binders » / « Cards », les mettaient en haut).
// Ne sait rien de ce qu'il montre : la fiche d'un heros (ui/deck.js) et la boutique (ui/boutique.js) s'en servent.
//
//   const o = creeOnglets({ onglets: [{ id: 'deck', nom: 'Deck', rendu: corps => corps.appendChild(...) }, ...] });
//   parent.appendChild(o.node);
//   o.va('deck');               // APRES l'avoir pose dans la page : `rendu` peut mesurer ce qu'il dessine
//
// Style : styles.css, section « onglets du bas ». Il prend la hauteur de son parent ; le corps defile, pas les onglets.
import { el } from './shell.js';

/**
 * `onglets` : `[{ id, nom, rendu(corps), pastille }]` ; `rendu` est rappele a chaque ouverture de l'onglet, sur un corps vide ;
 * `pastille` : un point rouge sur l'onglet, jusqu'a ce qu'on l'ouvre.
 * `entete` (facultatif) : un noeud pose au-dessus du corps, qui ne defile pas et reste d'un onglet a l'autre.
 * `fin` (facultatif) : un noeud pose au bout de la rangee d'onglets (la croix de la fiche d'un heros).
 * `fermable` : retoucher l'onglet ouvert le ferme et replie le panneau (ce que fait la boutique : `va(null)`).
 * `surChange(id)` : l'onglet ouvert change ; appele AVANT `rendu`, qui voit donc l'etat que l'ecran vient de remettre a zero.
 * Rend `{ node, va, courant, redessine }` ; `redessine()` refait l'onglet ouvert sans perdre son defilement.
 */
export function creeOnglets({ onglets, entete = null, fin = null, fermable = false, surChange = () => {} }) {
  const node = el('<div class="ong replie"><div class="ong-page"><div class="ong-corps"></div></div><div class="ong-barre" role="tablist"></div></div>');
  const corps = node.querySelector('.ong-corps');
  const barre = node.querySelector('.ong-barre');
  if (entete) corps.before(entete);
  barre.style.setProperty('--n', onglets.length);   // le texte retrecit avec le nombre d'onglets

  let courant = null;
  const dessine = () => {
    corps.replaceChildren();
    const o = onglets.find(x => x.id === courant);
    if (o) o.rendu(corps);
  };
  const va = id => {
    if (id === courant) return;
    courant = id;
    node.classList.toggle('replie', id === null);
    for (const b of barre.querySelectorAll('.ong-tab')) {
      b.classList.toggle('on', b.dataset.id === id);
      b.setAttribute('aria-selected', b.dataset.id === id);
      if (b.dataset.id === id) b.querySelector('.pastille')?.remove();
    }
    surChange(id);
    dessine();
    corps.scrollTop = 0;
  };
  const redessine = () => {
    const haut = corps.scrollTop;
    dessine();
    corps.scrollTop = haut;
  };

  for (const o of onglets) {
    const b = el(`<button class="ong-tab" role="tab" data-id="${o.id}">${o.nom}${o.pastille ? '<i class="pastille"></i>' : ''}</button>`);
    b.onclick = () => va(fermable && courant === o.id ? null : o.id);
    barre.appendChild(b);
  }
  if (fin) barre.appendChild(fin);

  return { node, va, courant: () => courant, redessine };
}
