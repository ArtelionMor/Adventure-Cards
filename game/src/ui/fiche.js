// LES LIGNES DE LA FICHE (appui long sur une carte ou une unite) : chaque chose a son ICONE, son texte et sa SOURCE,
// comme la liste de bonus d'une carte de Hearthstone — « ce qui la modifie, et d'ou ca vient ». Demande du game
// designer (9 octobre 2026) : les pictogrammes de la vignette doivent pouvoir s'apprendre ici, et la liste de ce
// qui agit sur l'unite remplace les paliers de niveau (pas ce qu'il y a de plus utile en plein combat).
//
// La mise en forme suit la maquette « Combat Screen Zoom on a card » (19 octobre 2026) : ce que la carte FAIT s'ecrit
// « icones : texte » (vert pour un effet, jaune pour un mot-cle) ; ce qui la MODIFIE s'ecrit sous le portrait de sa
// source, le nom de la source en titre et le changement dessous (vert s'il l'aide, rouge s'il la desservit).
import { TRIGGERS, keyLabel, momentLabel, describeEffect, describeAura, describeStatic, typesOf } from '../config/mechanics.js';
import { couleurDuType } from '../config/familles.js';
import { icone } from './icones.js';
import { $, el, asset } from './shell.js';
import { iconeDeCle, iconeDeOp, iconeDeMoment } from './pictos.js';

const div = (cl, html) => {
  const d = document.createElement('div');
  d.className = cl;
  d.innerHTML = html;
  return d;
};

/** Une ligne de ce que fait la carte : ses icones (separees par des virgules), puis « : texte ». `ton` : effet / cle. */
export function ligneEffet(icones, texte, ton = 'effet') {
  return div(`fl ${ton}`, `<span class="fl-ico">${icones.filter(Boolean).map(n => icone(n, 32)).join('<i>,</i>')}</span><span class="fl-tx">: ${texte}</span>`);
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
 * Le texte de la carte ne parle que de sa version de base : chaque palier debloque qui ajoute un effet a sa propre ligne.
 * Sans ca, ses icones se collaient devant un texte qui n'en disait rien (le crane du Lapin Soldat devant « Provocation. »).
 */
export function lignesDeFait(x, texte = x.text) {
  const carte = x.card || x;
  const paliers = texte ? (carte.tiers || []).filter(t => carte.unlocked?.includes(t.lvl) && (t.extra || t.aura)) : [];
  const dePalier = slot => paliers.filter(t => t.extra && (TRIGGERS[t.slot] ? t.slot : 'play') === slot).length;
  const out = [];
  const icones = [];
  const genere = [];
  for (const slot of Object.keys(TRIGGERS)) {
    const effets = x[slot] || [];
    effets.forEach((e, i) => {
      const ic = [iconeDeMoment(slot), iconeDeOp(e.op)].filter(Boolean);
      if (i < effets.length - dePalier(slot)) for (const n of ic) if (!icones.includes(n)) icones.push(n);
      genere.push(ligneEffet(ic, (slot === 'play' ? '' : `${momentLabel(slot, x)} : `) + describeEffect(e)));
    });
  }
  if (x.aura) {
    if (carte.auraImprimee !== false) icones.push('Aura');
    genere.push(ligneEffet(['Aura'], describeAura(x.aura)));
  }
  for (const m of x.statics || []) { if (!icones.includes('Static')) icones.push('Static'); genere.push(ligneEffet(['Static'], describeStatic(m))); }
  // Un texte qui ne fait que nommer un mot-cle (« Provocation. ») : sa ligne de mot-cle le dit deja.
  const repete = icones.length === 0 && (x.keys || []).some(k => keyLabel(k).toLowerCase() === String(texte).replace(/[.\s]+$/, '').toLowerCase());
  if (texte && !repete) out.push(ligneEffet(icones.slice(0, 3), texte));
  else if (!texte) out.push(...genere);
  for (const t of paliers) {
    const ic = t.aura ? ['Aura'] : [iconeDeMoment(TRIGGERS[t.slot] ? t.slot : 'play'), iconeDeOp(t.extra.op)];
    out.push(ligneEffet(ic, t.text || (t.aura ? describeAura(t.aura) : describeEffect(t.extra))));
  }
  return out.concat(lignesDeMots(x));
}

/** Le fond de la puce « Type » : une part de couleur par type, en biais (config/familles.js, `couleurDuType`). */
function fondDesTypes(types) {
  const k = types.length;
  const parts = types.map((t, i) => `${couleurDuType(t)} ${(i * 100 / k).toFixed(1)}% ${((i + 1) * 100 / k).toFixed(1)}%`);
  return `linear-gradient(135deg, ${parts.join(', ')})`;
}

/** L'en-tete : la carte en grand (cout, dessin), le nom, l'attaque et la vie, les types, une ligne d'etat. */
export function teteFiche({ nom, sprite, cout, coutBase, sort, atk, hp, maxHp, plus, moins, types, note, adverse = false }) {
  const stats = sort ? '<span class="fi-sort">Sort</span>'
    : `<span class="a${plus ? ' plus' : ''}">${atk}</span>${icone('Attack', 24)}<span class="h${moins ? ' moins' : ''}">${hp}${maxHp != null ? '/' + maxHp : ''}</span>${icone('Health', 24)}`;
  return el(`
    <div class="fi-tete">
      <div class="fi-carte${sort ? ' spell' : ''}${adverse ? ' adverse' : ''}">
        ${cout != null ? `<div class="cost" ${coutBase != null && coutBase !== cout ? `title="coût de base ${coutBase}"` : ''}>${cout}</div>` : ''}
        ${sprite ? `<img src="${asset(sprite)}" alt="">` : ''}
      </div>
      <div class="fi-id">
        <div class="nm">${nom}</div>
        <div class="fi-stats">${stats}</div>
        ${types.length ? `<span class="fi-type" style="background:${fondDesTypes(types)}">Type : ${types.join(' & ')}</span>` : ''}
        ${note ? `<div class="src">${note}</div>` : ''}
      </div>
    </div>`);
}

/** Ce qu'une carte ou une unite FAIT : son texte (ou ses effets) puis ses mots-cles. */
export function blocFait(x, texte) {
  const lignes = lignesDeFait(x, texte);
  if (!lignes.length) return null;
  const n = el('<section class="fi-fait"></section>');
  lignes.forEach(l => n.appendChild(l));
  return n;
}

/** La fiche d'une CARTE : `cout` est celui du moment (en combat, `cardCost` ; hors combat, le cout imprime). */
export function ficheDeCarte(c, { cout = c.cost, adverse = false } = {}) {
  const box = el('<div class="insp fiche"></div>');
  box.appendChild(teteFiche({
    nom: c.name, sprite: c.sprite, cout, coutBase: c.cost, sort: c.type !== 'ally', atk: c.atk, hp: c.hp, maxHp: null,
    types: typesOf(c), note: '', adverse
  }));
  const bFait = blocFait(c, c.text);
  if (bFait) box.appendChild(bFait);
  return box;
}

/**
 * LE PANNEAU DE LECTURE : flotte au-dessus de tout, y compris d'une fenetre, ne recoit aucun toucher (le doigt qui lit
 * reste sur sa carte). Partage par le combat et l'ecran Deck.
 */
export function montreLecture(contenu) {
  let p = $('#lecture');
  if (!p) {
    p = el('<div id="lecture" class="lecture hidden"></div>');
    $('#app').appendChild(p);
  }
  const sheet = el('<div class="sheet"></div>');
  sheet.appendChild(contenu);
  p.replaceChildren(sheet);
  p.classList.remove('hidden');
}

export function cacheLecture() {
  const p = $('#lecture');
  if (p) { p.classList.add('hidden'); p.replaceChildren(); }
}

/** Une fiche ouverte d'un toucher (pas d'un appui) : elle se ferme au prochain toucher, ou qu'il tombe. */
export function fermeAuProchainToucher(fermer = cacheLecture) {
  setTimeout(() => document.addEventListener('pointerdown', () => fermer(), { capture: true, once: true }), 0);
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
