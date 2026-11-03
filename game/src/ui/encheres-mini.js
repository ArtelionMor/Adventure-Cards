// LE CARRE DE MISE (2 nov. 2026) : un petit panneau posé sur le bord de l'ecran, partout sauf sur l'ecran des encheres, pour surencherir sans y
// aller. Il montre les lots ou le joueur est engage (depasse d'abord) puis quelques autres lots ou il peut miser ; il se reduit en une pastille
// (le choix est retenu). Aucune regle : miser passe par `placeBid` du noyau.
import { t } from '../config/textes.js';
import { BOUTIQUE } from '../config/boutique.js';
import { nextBid, placeBid } from './../boutique/noyau/engines/market.js';
import { change, ctx, ecoute, partie } from '../boutique/partie.js';
import { carteDef, spriteDeCarte } from './boutique.js';
import { demandeNotifs } from './notifs.js';
import { icone } from './icones.js';
import { $, asset, court, el, toast } from './shell.js';

const M = BOUTIQUE.encheresMini;
const CLE = 'adventureCard.encheresMini.reduit';
let reduit = false;
try { reduit = localStorage.getItem(CLE) === '1'; } catch { /* stockage refuse : ouvert par defaut */ }

const mmss = ms => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const estDepasse = lot => lot.engaged && lot.holder !== 'player';

/** Les lots a montrer : ceux ou le joueur est engage (depasses en tete), puis d'autres ou il peut miser, `M.lots` au plus. */
function lotsAMontrer(S) {
  const vivants = S.market.lots.filter(l => S.nowMs < l.endMs);
  const mes = vivants.filter(l => l.engaged).sort((a, b) => estDepasse(b) - estDepasse(a) || a.endMs - b.endMs);
  const autres = vivants.filter(l => !l.engaged && S.collection[l.cardId] === undefined).sort((a, b) => a.endMs - b.endMs);
  return [...mes, ...autres].slice(0, M.lots);
}

export function installeEncheresMini({ ecranCourant }) {
  const noeud = el('<aside class="em" hidden></aside>');
  $('#app').appendChild(noeud);
  let signature = '';

  const dessine = () => {
    const S = partie();
    const lots = S.progression && lotsAMontrer(S);
    const visible = lots?.length && ecranCourant() !== 'encheres';
    noeud.hidden = !visible;
    if (!visible) { signature = ''; return; }
    const depasses = lots.filter(estDepasse).length;
    const sig = JSON.stringify([reduit, S.gold >= 1, lots.map(l => [l.id, l.price, l.holder, Math.floor((l.endMs - S.nowMs) / 1000)])]);
    if (sig === signature) return;
    signature = sig;
    noeud.className = `em ${reduit ? 'reduit' : ''} ${depasses ? 'alerte' : ''}`;
    if (reduit) {
      noeud.innerHTML = `<button class="em-pastille" aria-label="${t('ui.auctions')}">${icone('Farm', 26)}${depasses ? `<i>${depasses}</i>` : ''}</button>`;
      noeud.querySelector('button').onclick = () => { reduit = false; sauve(); signature = ''; dessine(); };
      return;
    }
    noeud.innerHTML = `<header><b>${t('ui.auctions')}</b><button class="em-reduit" aria-label="${t('ui.collapse')}">–</button></header><div class="em-liste"></div>`;
    noeud.querySelector('.em-reduit').onclick = () => { reduit = true; sauve(); signature = ''; dessine(); };
    for (const lot of lots) {
      const c = carteDef(lot.cardId), prix = nextBid(lot, ctx), moi = lot.holder === 'player';
      const ligne = el(`<div class="em-lot ${moi ? 'tete' : ''} ${estDepasse(lot) ? 'depasse' : ''}">
        <img src="${asset(spriteDeCarte(lot.cardId))}" alt="${c.name}">
        <div><span class="em-t">${mmss(lot.endMs - S.nowMs)}</span>
        ${moi ? `<div class="em-etat">${t('ui.leading', { p: court(lot.price) })}</div>`
          : `<button class="em-miser ${S.gold < prix ? 'pauvre' : ''}">${lot.engaged ? t('ui.raise') : t('ui.bid')} · ${court(prix)}</button>`}</div></div>`);
      const b = ligne.querySelector('button');
      if (b) b.onclick = () => { const r = placeBid(partie(), lot.id, ctx); if (!r.ok) toast(r.reason); else { change(); demandeNotifs(); } };
      noeud.querySelector('.em-liste').appendChild(ligne);
    }
  };
  const sauve = () => { try { localStorage.setItem(CLE, reduit ? '1' : '0'); } catch { /* tant pis */ } };

  ecoute(e => { if (e.t === 'seconde' || e.t === 'change') dessine(); });
  return { maj: () => { signature = ''; dessine(); } };
}
