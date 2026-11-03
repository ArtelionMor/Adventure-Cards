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
import { BOUTIQUE } from '../config/boutique.js';
import { BALANCE } from '../config/balance.js';
import { ctx as ctxBoutique, partie } from '../boutique/partie.js';
import { instanceRef } from '../boutique/noyau/engines/pricing.js';
import { metaMultiplier } from '../boutique/noyau/engines/meta.js';

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
  if (c.id) box.dataset.carte = c.id;    // l'onglet « Shop » de la fiche retrouve la carte dans la boutique par son identifiant
  box.appendChild(teteFiche({
    nom: c.name, sprite: c.sprite, cout, coutBase: c.cost, sort: c.type !== 'ally', atk: c.atk, hp: c.hp, maxHp: null,
    types: typesOf(c), note: '', adverse
  }));
  const bFait = blocFait(c, c.text);
  if (bFait) box.appendChild(bFait);
  return box;
}

// ------------------------------------------------------------------ l'onglet « Shop » (maquette du 2 nov. 2026)
// Une fiche a deux onglets : « Game » (ce que la carte fait, le contenu qu'on donne) et « Shop » (ce qu'elle vaut : son prix de reference,
// et ce que chaque client — Timmy, Johnny, Spike — en pense : une phrase ; le tenir montre sa matrice 2 x 2 et le detail). Il n'existe que pour une carte de la boutique.
const COULEURS_AVIS = ['#ff6a4a', '#ffa23a', '#ffe14d', '#cfff5a', '#8bff3a'];   // du pire au meilleur
const couleurDeTon = t => COULEURS_AVIS[Math.max(0, Math.min(COULEURS_AVIS.length - 1, Math.round(t * (COULEURS_AVIS.length - 1))))];
const entre01 = v => Math.max(0, Math.min(1, v));

/**
 * LES AXES D'UN CLIENT (`BOUTIQUE.avisClients`, a regler dans la game config) : chaque axe nomme une de ces mesures, de 0 a 1.
 * Ajouter une mesure = une ligne ici, puis le game designer la cite dans la config d'un client.
 */
const METRIQUES = {
  cout: (card, finish, grade, S) => (ctxBoutique.index.maxCost > 0 ? (card.cost ?? 0) / ctxBoutique.index.maxCost : 0),
  rarete: (card) => (ctxBoutique.index.rarityRank.get(card.rarity) ?? 0) / Math.max(1, ctxBoutique.cfg.rarities.length - 1),
  meta: (card, finish, grade, S) => entre01(0.5 + (metaMultiplier(card, S, ctxBoutique) - 1) * 2),
  variante: (card, finish, grade) => (grade ? 0.5 : 0) + (finish === 'foil' ? 0.5 : 0),
  extension: (card, finish, grade, S) => { const e = S.progression.extensions; return e.length > 1 ? Math.max(0, e.indexOf(card.extension)) / (e.length - 1) : 0; },
  // Les mesures des clients qui suivent le jeu du joueur (3 nov. 2026).
  nivHeros: (card, finish, grade, S) => { const m = Math.max(1, ...Object.values(S.heroes).filter(h => h.unlocked).map(h => h.level)); return entre01((S.heroes[card.hero]?.level ?? 1) / m); },
  retard: (card, finish, grade, S) => 1 - METRIQUES.nivHeros(card, finish, grade, S),
  nouveaute: (card, finish, grade, S) => { const p = S.progression.products; const i = p.findIndex(x => { const [e, ph] = x.split(':'); return card.extension === e && (ph === 'B') === card.isSwitch; }); return p.length > 1 && i >= 0 ? i / (p.length - 1) : (i >= 0 ? 1 : 0); },
  anciennete: (card, finish, grade, S) => 1 - METRIQUES.nouveaute(card, finish, grade, S),
  joue: (card, finish, grade, S) => { const m = Math.max(1, ...Object.values(S.plays ?? {})); return entre01(((S.plays ?? {})[card.id] ?? 0) / m); },
  prix: (card, finish, grade, S) => entre01(instanceRef({ cardId: card.id, finish, grade: grade ?? null, slab: null }, S, ctxBoutique) / Math.max(...ctxBoutique.cfg.rarities.map(r => r.priceCeil)))
};

/**
 * Ce qu'UN client pense de la carte : ses deux axes la placent dans une matrice 2 x 2 (haut / bas sur chacun), et chaque zone a sa phrase
 * (`BOUTIQUE.avisClients[client]` : `axes: [{ id, nom, seuil }, { … }]`, `phrases: { 'haut-bas': '…' }` — le premier mot est la zone du premier
 * axe —, `tons` facultatif : 0 mauvais … 1 excellent, par zone). Rend `{ zone, phrase, ton, tons, axes }` ou `null` (client sans config).
 */
function avisDuClient(profil, card, finish, grade, S) {
  const c = BOUTIQUE.avisClients?.[profil.id];
  if (!c) return null;
  const [ax, ay] = c.axes;
  const v = a => (METRIQUES[a.id] ? METRIQUES[a.id](card, finish, grade, S) : 0.5);
  const haut = (a) => v(a) >= (a.seuil ?? 0.5);
  const zone = `${haut(ax) ? 'haut' : 'bas'}-${haut(ay) ? 'haut' : 'bas'}`;
  const tonDe = z => c.tons?.[z] ?? ((z.startsWith('haut') ? 0.5 : 0) + (z.endsWith('haut') ? 0.5 : 0));
  const tons = Object.fromEntries(['bas-bas', 'haut-bas', 'bas-haut', 'haut-haut'].map(z => [z, tonDe(z)]));
  return { zone, phrase: c.phrases?.[zone] ?? '…', ton: tons[zone], tons, axes: [ax, ay], valeurs: [v(ax), v(ay)] };
}

/** La matrice 2 x 2 d'un client : l'axe 1 va vers la droite, l'axe 2 vers le haut. Chaque zone a sa couleur pleine ; celle de la carte est cernee et porte un point. */
function matrice(a) {
  const cases = [['bas-haut', 0, 0], ['haut-haut', 52, 0], ['bas-bas', 0, 52], ['haut-bas', 52, 52]];
  return `<svg class="fc-mat" viewBox="0 0 108 108" aria-label="${echappe(a.axes[0].nom)} × ${echappe(a.axes[1].nom)}">${cases.map(([z, x, y]) => {
    const c = couleurDeTon(a.tons[z]), ici = z === a.zone;
    return `<rect x="${x + 2}" y="${y + 2}" width="52" height="52" rx="9" style="fill:${ici ? c : `color-mix(in srgb, ${c} 55%, #fff3d8)`}" stroke="#170b12" stroke-width="${ici ? 4 : 2.5}"/>${ici ? `<circle cx="${x + 28}" cy="${y + 28}" r="12" style="fill:${c}" stroke="#170b12" stroke-width="4"/><circle cx="${x + 28}" cy="${y + 28}" r="5" fill="#fff"/>` : ''}`;
  }).join('')}</svg>`;
}
const echappe = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Le detail d'un client, montre tant qu'on tient son visage : qui il est, sa matrice, la place de la carte sur chacun de ses axes, sa phrase. */
function detailClient(profil, a, tete) {
  const c = BOUTIQUE.avisClients?.[profil.id] ?? {};
  const pct = v => Math.round(entre01(v) * 100);
  const [x, y] = a.valeurs;
  return el(`<div class="fc-detail" style="--c:${couleurDeTon(a.ton)}">
    <div class="fc-d-tete">${tete ? `<img class="fc-face" src="${BOUTIQUE.visage(tete)}" alt="">` : ''}<div><b>${echappe(profil.id)}</b><span>${echappe(c.qui ?? '')}</span></div></div>
    <div class="fc-d-corps">${matrice(a)}<ul>
      <li><b>${echappe(a.axes[0].nom)}</b> (→) <em>${pct(x)} %</em></li>
      <li><b>${echappe(a.axes[1].nom)}</b> (↑) <em>${pct(y)} %</em></li>
    </ul></div>
    <p class="fc-d-phrase">${echappe(a.phrase)}</p></div>`);
}

/** Le contenu de l'onglet « Shop » : le nom, puis une phrase par client (son visage, ce qu'il en dit). Tenir un visage montre son detail. `null` hors boutique. */
function ongletShop(cardId, finish, grade, nom) {
  const S = partie();
  const card = S && ctxBoutique.index.cardById.get(cardId);
  if (!card) return null;
  const prix = Math.round(instanceRef({ cardId, finish, grade: grade ?? null, slab: null }, S, ctxBoutique));
  const box = el('<div class="insp fiche fi-shop"></div>');
  box.appendChild(el(`<div class="fc-nom">${echappe(nom)}</div>`));
  const avis = el('<div class="fc-avis"></div>');
  // Les trois clients arrives aux avis les plus tranches : idealement deux positifs et un negatif (3 nov. 2026).
  const donnes = ctxBoutique.cfg.buyers.profiles.filter(p => S.progression.clients.includes(p.id))
    .map(profil => ({ profil, a: avisDuClient(profil, card, finish, grade, S) })).filter(x => x.a);
  const tranche = x => Math.abs(x.a.ton - 0.5);
  const par = (l) => [...l].sort((u, v) => tranche(v) - tranche(u));
  const choisis = [...par(donnes.filter(x => x.a.ton > 0.5)).slice(0, 2), ...par(donnes.filter(x => x.a.ton < 0.5)).slice(0, 1)];
  for (const x of par(donnes)) if (choisis.length < 3 && !choisis.includes(x)) choisis.push(x);
  for (const { profil, a } of choisis) {
    const tete = BOUTIQUE.profils[profil.id]?.tetes[0];
    const l = el(`<div class="fc-avis-l" style="--c:${couleurDeTon(a.ton)}">
      ${tete ? `<img class="fc-face" src="${BOUTIQUE.visage(tete)}" alt="${profil.id}" draggable="false">` : ''}
      <p class="fc-phrase">${echappe(a.phrase)}</p><span class="fc-i" aria-hidden="true">i</span></div>`);
    const detail = detailClient(profil, a, tete);
    let t = null;
    const ferme = () => { clearTimeout(t); detail.remove(); };
    {
      const face = l;                               // toute la ligne se tient, pas seulement le visage
      face.addEventListener('pointerdown', () => { clearTimeout(t); t = setTimeout(() => box.appendChild(detail), BALANCE.ui.appuiLongMs); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) face.addEventListener(ev, ferme);
      face.addEventListener('contextmenu', e => e.preventDefault());
    }
    avis.appendChild(l);
  }
  box.appendChild(avis);
  return { box, prix };
}

/**
 * LE PANNEAU DE LECTURE (combat, ecran Deck, boutique) : flotte au-dessus de tout, y compris d'une fenetre. Maquette du 2 nov. 2026 : la carte en
 * GRAND deborde a gauche, le panneau a droite, et ses deux onglets « Game » et « Shop » debordent au-dessus (le dernier ouvert est retenu ; le
 * badge de la carte montre son cout, ou son prix sur « Shop »). Il RESTE ouvert quand le doigt se leve : il se ferme au prochain appui AILLEURS sur
 * l'ecran (cet appui est avale : il ne joue rien dessous) ; les onglets, eux, se touchent. `surFerme` : appele quand l'appui le ferme (l'ecran
 * qui le tient oublie sa lecture). `cardId`, `finish`, `grade` : de quoi retrouver la carte pour « Shop » (par defaut `contenu.dataset.carte`).
 */
let ongletFiche = 'jeu';
let ecouteFermeture = null;
export function montreLecture(contenu, { cardId = contenu.dataset?.carte, finish = 'normal', grade = null, surFerme = null } = {}) {
  let p = $('#lecture');
  if (!p) {
    p = el('<div id="lecture" class="lecture hidden"></div>');
    $('#app').appendChild(p);
  }
  const sheet = el('<div class="sheet"></div>');
  const art = contenu.querySelector?.('.fi-carte');
  const shop = cardId && art ? ongletShop(cardId, finish, grade, contenu.querySelector('.nm')?.textContent ?? '') : null;
  if (shop) {
    sheet.classList.add('fc');
    const badge = art.querySelector('.cost');
    const coutImprime = badge?.innerHTML;
    const onglets = el('<div class="fc-onglets"><button data-o="jeu">Game</button><button data-o="shop">Shop</button></div>');
    const corps = el('<div class="fc-corps"></div>');
    const va = o => {
      ongletFiche = o;
      corps.replaceChildren(o === 'shop' ? shop.box : contenu);
      if (badge) { badge.classList.toggle('prix', o === 'shop'); badge.innerHTML = o === 'shop' ? `${shop.prix}${icone('Coin', 20)}` : coutImprime; }
      for (const b of onglets.children) b.classList.toggle('on', b.dataset.o === o);
    };
    for (const b of onglets.children) b.onclick = () => va(b.dataset.o);
    const panneau = el('<div class="fc-panneau"></div>');
    panneau.append(onglets, corps);
    const gauche = el('<div class="fc-art"></div>');
    gauche.appendChild(art);                         // la carte quitte l'en-tete du « Game » : elle est a gauche, en grand
    sheet.append(gauche, panneau);
    va(ongletFiche);
  } else sheet.appendChild(contenu);
  p.replaceChildren(sheet);
  p.classList.remove('hidden');
  p.classList.add('persiste');
  // Le prochain appui hors de la fiche la ferme et ne va pas plus loin. Pose au tour suivant : l'appui qui l'ouvre n'est pas le prochain.
  if (ecouteFermeture) document.removeEventListener('pointerdown', ecouteFermeture, true);
  ecouteFermeture = ev => {
    if (ev.target.closest?.('#lecture .sheet')) return;
    ev.stopPropagation();
    ev.preventDefault();
    cacheLecture();
    surFerme?.();
  };
  setTimeout(() => { if (ecouteFermeture) document.addEventListener('pointerdown', ecouteFermeture, true); }, 0);
}

export function cacheLecture() {
  if (ecouteFermeture) { document.removeEventListener('pointerdown', ecouteFermeture, true); ecouteFermeture = null; }
  const p = $('#lecture');
  if (p) { p.classList.add('hidden'); p.classList.remove('persiste'); p.replaceChildren(); }
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
