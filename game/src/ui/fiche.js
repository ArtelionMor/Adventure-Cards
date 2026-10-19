// LES LIGNES DE LA FICHE (appui long sur une carte ou une unite) : chaque chose a son ICONE, son texte et sa SOURCE,
// comme la liste de bonus d'une carte de Hearthstone — « ce qui la modifie, et d'ou ca vient ». Demande du game
// designer (9 octobre 2026) : les pictogrammes de la vignette doivent pouvoir s'apprendre ici, et la liste de ce
// qui agit sur l'unite remplace les paliers de niveau (pas ce qu'il y a de plus utile en plein combat).
//
// La mise en forme suit la maquette « Combat Screen Zoom on a card » (19 octobre 2026) : ce que la carte FAIT s'ecrit
// « icones : texte » (vert pour un effet, jaune pour un mot-cle) ; ce qui la MODIFIE s'ecrit sous le portrait de sa
// source, le nom de la source en titre et le changement dessous (vert s'il l'aide, rouge s'il la desservit).
import { TRIGGERS, keyLabel, momentLabel, describeEffect, describeAura, describeStatic } from '../config/mechanics.js';
import { icone } from './icones.js';
import { asset } from './shell.js';
import { iconeDeCle, iconeDeOp, iconeDeMoment } from './pictos.js';

const div = (cl, html) => {
  const d = document.createElement('div');
  d.className = cl;
  d.innerHTML = html;
  return d;
};

/** Une ligne de ce que fait la carte : ses icones (separees par des virgules), puis « : texte ». `ton` : effet / cle. */
export function ligneEffet(icones, texte, ton = 'effet') {
  return div(`fl ${ton}`, `<span class="fl-ico">${icones.filter(Boolean).map(n => icone(n, 26)).join('<i>,</i>')}</span><span class="fl-tx">: ${texte}</span>`);
}

/**
 * Une ligne de ce qui modifie l'unite : le portrait de la SOURCE (ou une icone, sans portrait), son nom en titre, et
 * le changement dessous. `ton` : bon (vert) ou mal (rouge) ; `eteint` : ce qui ne s'applique plus (grise).
 */
export function ligneSource({ sprite, ico, titre, texte, ton = 'bon', eteint = false }) {
  const tete = sprite ? `<img src="${asset(sprite)}" alt="">` : icone(ico || 'Buff', 28);
  return div(`fs ${ton}${eteint ? ' eteint' : ''}`, `<span class="fs-port">${tete}</span><span class="fs-tx"><b>${titre}</b><em>${texte}</em></span>`);
}

/** Les mots-cles de `x` (hors types, qui sont des etiquettes) : leur icone et leur NOM, rien de plus (le dessin de la
 *  carte dit deja le reste : la Provocation porte son bouclier de pierre). */
function lignesDeMots(x) {
  const out = [];
  for (const k of x.keys || []) {
    const ic = iconeDeCle(k);
    if (ic) out.push(ligneEffet([ic], keyLabel(k), 'cle'));
  }
  return out;
}

/**
 * Ce qu'une carte ou une unite FAIT, le plus court possible (« il y a trop de texte », game designer, 19 oct. 2026) :
 * le TEXTE de la carte quand le builder en a un (ecrit par le game designer, plus court que la description generee),
 * precede des icones de ses moments et de ses effets ; sinon une ligne par effet, generee. Puis ses mots-cles.
 */
export function lignesDeFait(x, texte = x.text) {
  const out = [];
  const icones = [];
  const genere = [];
  for (const slot of Object.keys(TRIGGERS)) {
    for (const e of x[slot] || []) {
      const ic = [iconeDeMoment(slot), iconeDeOp(e.op)].filter(Boolean);
      for (const n of ic) if (!icones.includes(n)) icones.push(n);
      genere.push(ligneEffet(ic, (slot === 'play' ? '' : `${momentLabel(slot, x)} : `) + describeEffect(e)));
    }
  }
  if (x.aura) { icones.push('Aura'); genere.push(ligneEffet(['Aura'], describeAura(x.aura))); }
  for (const m of x.statics || []) { if (!icones.includes('Static')) icones.push('Static'); genere.push(ligneEffet(['Static'], describeStatic(m))); }
  if (texte) out.push(ligneEffet(icones.slice(0, 3), texte));
  else out.push(...genere);
  return out.concat(lignesDeMots(x));
}

const signe = v => (v >= 0 ? '+' : '') + v;
const fois = n => (n > 1 ? ` (${n} fois)` : '');

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
    const g = groupes.get(cle) || { nom, sprite: e.src ? e.src.sprite : null, atk: e.atk || 0, hp: e.hp || 0, cle: e.cle, n: 0 };
    g.n++;
    groupes.set(cle, g);
    somA += e.atk || 0; somH += e.hp || 0;
  }
  const out = [];
  for (const g of groupes.values()) {
    const chiffres = g.atk || g.hp;
    const atk = g.atk * g.n, hp = g.hp * g.n;
    const texte = [chiffres ? `${signe(atk)}/${signe(hp)} : ${atk + hp >= 0 ? 'renfort' : 'affaiblissement'}` : '', g.cle ? `gagne ${keyLabel(g.cle)}` : '']
      .filter(Boolean).join(' · ');
    out.push(ligneSource({ sprite: g.sprite, ico: g.cle && iconeDeCle(g.cle) ? iconeDeCle(g.cle) : 'Buff', titre: g.nom + fois(g.n), texte, ton: atk + hp < 0 ? 'mal' : 'bon' }));
  }
  if (dAtk - somA || dHp - somH) {
    const a = dAtk - somA, h = dHp - somH;
    out.push(ligneSource({ ico: a + h < 0 ? 'Debuff' : 'Buff', titre: 'Autres renforts', texte: `${signe(a)}/${signe(h)}`, ton: a + h < 0 ? 'mal' : 'bon' }));
  }
  return out;
}
