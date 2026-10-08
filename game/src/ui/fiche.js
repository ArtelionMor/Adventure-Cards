// LES LIGNES DE LA FICHE (appui long sur une carte ou une unite) : chaque chose a son ICONE, son texte et sa SOURCE,
// comme la liste de bonus d'une carte de Hearthstone — « ce qui la modifie, et d'ou ca vient ». Demande du game
// designer (9 octobre 2026) : les pictogrammes de la vignette doivent pouvoir s'apprendre ici, et la liste de ce
// qui agit sur l'unite remplace les paliers de niveau (pas ce qu'il y a de plus utile en plein combat).
import { TRIGGERS, KEYWORDS, keyId, keyLabel, momentLabel, describeEffect, describeAura, describeStatic } from '../config/mechanics.js';
import { icone } from './icones.js';
import { iconeDeCle, iconeDeOp, iconeDeMoment } from './pictos.js';

/** Une ligne : une icone a gauche, un titre en gras, un texte, et d'ou ca vient (en retrait). */
export function ligneIco(nom, titre, texte, source) {
  const d = document.createElement('div');
  d.className = 'ln li';
  d.innerHTML = `<span class="lico">${icone(nom, 24)}</span><span class="ltx"><b>${titre}</b> ${texte || ''}${source ? ` <span class="src">— ${source}</span>` : ''}</span>`;
  return d;
}

/** Les mots-cles de `x` (hors types, qui sont des etiquettes) : icone, nom, ce que ca fait. */
function lignesDeMots(x) {
  const out = [];
  for (const k of x.keys || []) {
    const ic = iconeDeCle(k);
    if (!ic) continue;
    const def = KEYWORDS[keyId(k)];
    out.push(ligneIco(ic, keyLabel(k), def ? def.desc : '', 'sur la carte'));
  }
  return out;
}

/** Ce qu'une carte ou une unite FAIT : mots-cles, effets de chaque moment (un par ligne), aura, statiques. */
export function lignesDeFait(x) {
  const out = lignesDeMots(x);
  for (const slot of Object.keys(TRIGGERS)) {
    for (const e of x[slot] || []) {
      out.push(ligneIco(iconeDeMoment(slot) || iconeDeOp(e.op), momentLabel(slot, x), describeEffect(e)));
    }
  }
  if (x.aura) out.push(ligneIco('Aura', 'Aura', describeAura(x.aura), 'portée par elle'));
  for (const m of x.statics || []) out.push(ligneIco('Static', 'Effet continu', describeStatic(m), 'tant qu’elle est en jeu'));
  return out;
}

const signe = v => (v >= 0 ? '+' : '') + v;

/**
 * Les renforts reçus par l'unite `u` (camp `camp`), un par SOURCE, lus dans le recit du combat (`B.evts`).
 * Ce que le recit n'explique pas (si `evts` manque) tombe dans « Autres renforts ».
 */
export function lignesDeRenforts(B, u, camp, dAtk, dHp) {
  const groupes = new Map();
  let somA = 0, somH = 0;
  for (const e of B.evts || []) {
    if (e.t !== 'renfort' || !e.cible || e.cible.uid !== u.uid || e.cible.camp !== camp) continue;
    const nom = e.src ? e.src.nom : 'un effet';
    const cle = `${nom}|${e.atk}|${e.hp}|${e.cle || ''}`;
    const g = groupes.get(cle) || { nom, atk: e.atk || 0, hp: e.hp || 0, cle: e.cle, n: 0 };
    g.n++;
    groupes.set(cle, g);
    somA += e.atk || 0; somH += e.hp || 0;
  }
  const out = [];
  for (const g of groupes.values()) {
    const montant = `${signe(g.atk)}/${signe(g.hp)}`;
    const cle = g.cle ? ` · ${keyLabel(g.cle)}` : '';
    out.push(ligneIco(g.cle && iconeDeCle(g.cle) && !g.atk && !g.hp ? iconeDeCle(g.cle) : 'Buff', montant + cle, '', `${g.n > 1 ? g.n + ' × ' : ''}${g.nom}`));
  }
  if (dAtk - somA || dHp - somH) out.push(ligneIco('Buff', `${signe(dAtk - somA)}/${signe(dHp - somH)}`, '', 'autres renforts'));
  return out;
}
