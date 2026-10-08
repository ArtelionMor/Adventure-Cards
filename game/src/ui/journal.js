// LE JOURNAL GRAPHIQUE DU COMBAT. Il lit les EVENEMENTS du moteur (combat/evenements.js) et les
// montre en SCENES : un duel avec les valeurs avant (barrees) et apres (en rouge), une carte et sa
// cible, et sous chaque cause ses consequences, en retrait. Trois usages a servir (game designer,
// 8 octobre 2026) : « je n'etais pas concentre, qu'est-ce qui s'est passe ? », « cette carte ne
// fait pas ca ? ah oui, il y avait ca en plus », et en AFK « pourquoi je n'avance pas ? je regarde
// les logs de ce match ».
//
// Ce module ne sait RIEN du combat : on lui donne une fonction qui rend la liste des evenements
// (celle du combat en cours, qui grandit, ou celle d'un combat garde), il la dessine. Il se met a
// jour SANS rien reconstruire : un evenement qui arrive ne redessine que la scene a laquelle il
// appartient (sa racine), et le defilement reste ou il etait.
//
// ⚠ L'INFORMATION CACHEE. Les evenements disent TOUT (c'est ce qui rend un combat relisible
// apres coup) ; c'est ici qu'on decide de ne pas montrer EN DIRECT ce que l'adversaire pioche ou
// cree dans sa main (`revele: false`). Une fois le combat fini, tout se lit.
import { TRIGGERS } from '../config/mechanics.js';
import { el, asset } from './shell.js';
import { icone } from './icones.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sgn = v => (v > 0 ? '+' : '') + v;
const pl = (n, mot) => `${n} ${mot}${Math.abs(n) > 1 ? 's' : ''}`;

// ------------------------------------------------------------------- les pieces
const nom = r => `<b>${esc(r && r.nom)}</b>`;
const sprite = r => (r && r.sprite ? `<img class="jr-sp" src="${asset(r.sprite)}" alt="">` : '<span class="jr-sp vide"></span>');

/** Une carte, en petit : son cout, son dessin, son nom. */
function miniCarte(r, cout) {
  return `<span class="jr-mc ${r.type === 'spell' ? 'sort' : 'allie'}"><i>${cout ?? r.cout ?? ''}</i>${sprite(r)}<b>${esc(r.nom)}</b></span>`;
}
const cartes = liste => liste.map(c => miniCarte(c)).join(' ');
/** Une carte qu'on n'a pas le droit de voir (la main de l'adversaire, en direct). */
const carteCachee = n => `<span class="jr-mc cache"><i>?</i><b>${n > 1 ? n + ' cartes' : 'une carte'}</b></span>`;
/** Une unite, en petit : son dessin, son nom, ses chiffres. */
const miniUnite = r => `<span class="jr-mu">${sprite(r)}${nom(r)}<small>${r.atk}/${r.hp}</small></span>`;
/** Ce qu'une designation montre : un heros, une unite, une carte. */
const miniRef = r => (!r ? '' : r.k === 'carte' ? miniCarte(r) : r.k === 'unite' ? miniUnite(r) : `<span class="jr-mu">${sprite(r)}${nom(r)}</span>`);

/**
 * Un PANNEAU du duel, comme la maquette du game designer : le dessin au centre, le cout en haut a
 * droite, l'attaque en bas a gauche, la vie en bas a droite — l'ancienne barree, la nouvelle en
 * rouge dessous. Un mort porte l'icone « mort » par-dessus.
 */
function panneau(r, { avant, apres, mort, bouclier }) {
  const change = apres !== avant;
  return `<div class="jr-u ${mort ? 'mort' : ''}">
    ${sprite(r)}
    ${r.cout !== null && r.cout !== undefined && r.k === 'unite' ? `<span class="co">${r.cout}</span>` : ''}
    ${r.k === 'unite' ? `<span class="a">${r.atk}</span>` : ''}
    <span class="h">${change ? `<s>${avant}</s><b>${Math.max(0, apres)}</b>` : `<em>${avant}</em>`}</span>
    ${mort ? `<span class="dead">${icone('Dead', 44)}</span>` : ''}
    ${bouclier ? `<span class="bq">${icone('Shield', 20)}</span>` : ''}
    <span class="nm">${esc(r.nom)}</span>
  </div>`;
}

// ------------------------------------------------------------ une ligne par evenement
const MODES = {
  melange: ['Shuffle', 'Remélange dans la pioche'], renvoi: ['Return', 'Renvoi en main'],
  pose: ['Summon', 'Pose sur le plateau'], meule: ['Mill', 'Meule'], defausse: ['Discard', 'Défausse'],
  exil: ['Exile', 'Exil'], cree: ['Create', 'Création']
};

/** Le moment (« Râle d'agonie », « Début de ton tour »...) d'un declencheur, et son icone. */
function momentDe(e) {
  const t = TRIGGERS[e.moment];
  const label = t ? t.label : e.moment;
  const ic = e.moment === 'death' ? 'Deathrattle' : e.moment === 'turnStart' ? 'TurnStart' : e.moment === 'turnEnd' ? 'TurnEnd' : 'Trigger';
  return [ic, label];
}

/**
 * La ligne d'un evenement : [icone, html]. `ctx.revele` dit si on peut montrer ce que
 * l'adversaire a en main. Un type inconnu rend son nom : un evenement ajoute au moteur sans etre
 * ecrit ici se VOIT au lieu de disparaitre.
 */
function ligneDe(e, ctx) {
  const cache = !ctx.revele && e.camp === 'e';
  switch (e.t) {
    case 'degats': {
      const src = e.src ? nom(e.src) : 'Un effet';
      const puces = [];
      if (e.venin) puces.push('<span class="puce">Venin</span>');
      if (e.armure) puces.push(`<span class="puce">${e.armure} absorbé par l'armure</span>`);
      if (e.bonus) puces.push(`<span class="puce plus">${sgn(e.bonus)}${e.via ? ' · ' + e.via.map(x => esc(x.nom)).join(', ') : ''}</span>`);
      if (e.x) puces.push(`<span class="puce">X = ${esc(e.x)}</span>`);
      let txt;
      if (e.annule) txt = `${src} vise ${nom(e.cible)} : dégâts annulés`;
      else if (e.bouclier) txt = `${nom(e.cible)} encaisse ${pl(e.n, 'dégât')} avec son bouclier`;
      else txt = `${src} ${e.riposte ? 'riposte' : 'inflige'} <span class="mal">${e.perdu}</span> à ${nom(e.cible)} <small>${e.avant} → ${e.apres}</small>`;
      return [e.riposte ? 'Counter' : 'Damage', txt + puces.join('')];
    }
    case 'soin': {
      // Un soin qui ne soigne rien (deja au maximum) se dit discretement : le taire laisserait croire qu'il n'a pas eu lieu.
      if (!e.soigne && !e.bonus) return ['Heal', `<small>${nom(e.cible)} est déjà au maximum</small>`];
      const src = e.src && e.src.nom !== e.cible.nom ? `${nom(e.src)} · ` : '';
      return ['Heal', `${src}${nom(e.cible)} <span class="bien">+${e.soigne}</span> PV <small>${e.avant} → ${e.apres}</small>${e.bonus ? `<span class="puce plus">${sgn(e.bonus)}</span>` : ''}`];
    }
    case 'renfort': {
      const neg = e.atk < 0 || e.hp < 0;
      const cle = e.cle ? ` et gagne <span class="puce">${esc(e.cle)}</span>` : '';
      return [neg ? 'Debuff' : 'Buff', `${nom(e.cible)} <span class="${neg ? 'mal' : 'bien'}">${sgn(e.atk)}/${sgn(e.hp)}</span>${cle}${e.src ? ` <small>(${esc(e.src.nom)})</small>` : ''}`];
    }
    case 'renfortCartes':
      return ['Buff', `<span class="bien">${sgn(e.atk)}/${sgn(e.hp)}</span> pour ${cartes(e.cartes)}`];
    case 'invoque': {
      const par = e.via === 'jeton' && e.src ? ` <small>(${esc(e.src.nom)})</small>` : e.via === 'pose' ? ' <small>(posé sur le plateau)</small>' : '';
      return ['Summon', `${miniUnite(e.unite)} arrive${par}`];
    }
    case 'meurt':
      return ['Dead', `${nom(e.unite)} meurt${e.unite.jeton ? ' <small>(jeton)</small>' : ''}`];
    case 'detruit':
      return ['Destroy', `${nom(e.cible)} est détruit${e.src ? ` <small>(${esc(e.src.nom)})</small>` : ''}`];
    case 'declenche': {
      const [ic, label] = momentDe(e);
      return [ic, `${esc(label)} · ${nom(e.src)}`];
    }
    case 'choix':
      return ['Trigger', `Choix : ${esc(e.texte)}`];
    case 'pioche': {
      if (e.perdue) return ['Discard', `Main pleine : ${cache ? carteCachee(1) : miniCarte(e.carte)} part à la défausse`];
      if (e.fatigue) return ['Fatigue', `Pile de fatigue · ${cache ? carteCachee(1) : miniCarte(e.carte)}`];
      return ['Draw', `${e.cherchee ? 'Pioche ciblée' : 'Pioche'} · ${cache ? carteCachee(1) : miniCarte(e.carte)}`];
    }
    case 'aVide':
      return ['Fatigue', e.fatigue ? 'Plus de pioche : on tire dans la pile de fatigue' : 'Plus aucune carte à piocher'];
    case 'deplace': {
      const [ic, label] = MODES[e.mode] || ['Trigger', e.mode];
      const secret = !ctx.revele && e.camp === 'e' && (e.mode === 'cree' || (e.mode === 'renvoi' && e.de === 'main'));
      return [ic, `${label} · ${secret ? carteCachee(e.cartes.length) : cartes(e.cartes)}`];
    }
    case 'transforme': {
      if (e.mode === 'copie') return ['Copy', `${esc(e.de.join(', '))} devient une copie de ${miniCarte(e.modele)}`];
      if (e.paires) return ['Switch', `Switch : ${esc(e.paires.join(', '))}`];
      return ['Switch', `${esc(e.de)} devient ${e.unite ? miniUnite(e.unite) : miniCarte(e.sort)}`];
    }
    case 'controle':
      return ['Control', `Prend le contrôle de ${e.unites.map(miniUnite).join(' ')}`];
    case 'cout':
      return ['Mana', `${cartes(e.cartes)} ${e.cartes.length > 1 ? 'coûtent' : 'coûte'} ${e.v} de moins`];
    case 'mana':
      return ['Mana', `Mana <span class="${e.v >= 0 ? 'bien' : 'mal'}">${sgn(e.v)}</span>${e.promis ? ' <small>(au prochain tour)</small>' : e.statique ? ' <small>(effet statique)</small>' : ''}`];
    case 'armure':
      return ['Armor', `Armure <span class="bien">${sgn(e.v)}</span>`];
    case 'miroir':
      return ['Mirror', `Un Miroir devient ${cache ? carteCachee(1) : miniCarte(e.carte)}`];
    case 'joue':
      return ['Trigger', `Joue ${miniCarte(e.carte, e.paye)}`];
    case 'attaque':
      return ['Swords', `${miniRef(e.src)} attaque ${miniRef(e.cible)}`];
    case 'tour':
      return ['TurnStart', `Tour de ${nom(e)}`];
    case 'fin':
      return ['Victory', 'Fin du combat'];
    default:
      return ['Trigger', `<small>[${esc(e.t)}]</small>`];
  }
}

/** Une ligne, et sous elle ses consequences en retrait. `sauf` : des indices a ne pas redire (deja dans le duel). */
function noeud(i, ctx, sauf) {
  const e = ctx.L[i];
  const [ic, html] = ligneDe(e, ctx);
  const sous = (ctx.enfants.get(i) || []).filter(j => !sauf || !sauf.has(j));
  return `<div class="jr-l t-${e.t}"><div class="jr-t">${icone(ic, 22)}<span>${html}</span></div>${
    sous.length ? `<div class="jr-sous">${sous.map(j => noeud(j, ctx)).join('')}</div>` : ''}</div>`;
}

// ------------------------------------------------------------------ les scenes
/** Le DUEL : deux panneaux et les epees, puis tout ce que le coup a provoque. */
function sceneAttaque(i, ctx) {
  const a = ctx.L[i];
  const kids = (ctx.enfants.get(i) || []).map(j => ctx.L[j]);
  const coup = kids.find(e => e.t === 'degats' && !e.riposte);
  const rip = kids.find(e => e.t === 'degats' && e.riposte);
  const mortDe = ref => !!ref && kids.some(e => e.t === 'meurt' && e.unite.uid === ref.uid);
  const gauche = panneau(a.src, { avant: a.src.hp, apres: rip ? rip.apres : a.src.hp, mort: mortDe(a.src) });
  const droite = a.cible
    ? panneau(a.cible, { avant: coup ? coup.avant : a.cible.hp, apres: coup ? coup.apres : a.cible.hp, mort: mortDe(a.cible), bouclier: !!(coup && coup.bouclier) })
    : '';
  const sauf = new Set([coup, rip].filter(Boolean).map(e => e.i));
  const sous = (ctx.enfants.get(i) || []).filter(j => !sauf.has(j));
  const puces = coup ? [
    coup.venin ? '<span class="puce">Venin</span>' : '',
    coup.armure ? `<span class="puce">${coup.armure} absorbé par l'armure</span>` : ''
  ].join('') : '';
  return `<div class="jr-duel">${gauche}<div class="jr-mid">${icone('Swords', 40)}${puces}</div>${droite}</div>${
    sous.length ? `<div class="jr-sous">${sous.map(j => noeud(j, ctx)).join('')}</div>` : ''}`;
}

/** Une carte jouee : elle, sa cible, et ce qu'elle a fait. */
function sceneJoue(i, ctx) {
  const e = ctx.L[i];
  const sous = ctx.enfants.get(i) || [];
  const reprise = e.zone === 'defausse' ? ' <span class="puce">Reprise</span>' : '';
  return `<div class="jr-joue">${miniCarte(e.carte, e.paye)}${e.cible ? `<span class="fl">→</span>${miniRef(e.cible)}` : ''}${reprise}</div>${
    sous.length ? `<div class="jr-sous">${sous.map(j => noeud(j, ctx)).join('')}</div>` : ''}`;
}

function sceneTour(i, ctx) {
  const e = ctx.L[i];
  const n = Math.ceil(e.tour / 2);
  const sous = ctx.enfants.get(i) || [];
  return `<div class="jr-tour">${sprite(e.camp === 'p' ? ctx.heros.p : ctx.heros.e)}<span>Tour ${n} · ${esc(e.nom)}</span><small>${e.mana} mana</small></div>${
    sous.length ? `<div class="jr-sous">${sous.map(j => noeud(j, ctx)).join('')}</div>` : ''}`;
}

function sceneFin(i, ctx) {
  const e = ctx.L[i];
  const gagne = e.gagnant === 'p';
  const nul = e.gagnant === 'draw';
  return `<div class="jr-fin ${gagne ? 'gagne' : nul ? 'nul' : 'perdu'}">${icone(gagne ? 'Victory' : 'Defeat', 36)}<span>${
    gagne ? 'Victoire' : nul ? 'Match nul' : 'Défaite'}</span><small>${e.pv.p} PV contre ${e.pv.e} PV</small></div>`;
}

/** La MAIN DE DEPART : les pioches d'avant le premier tour, d'un camp, en une seule scene. */
function sceneDepart(i, ctx) {
  const e = ctx.L[i];
  const liste = ctx.departs[e.camp].map(j => ctx.L[j]);
  const cache = !ctx.revele && e.camp === 'e';
  return `<div class="jr-joue">${icone('Draw', 22)}<span>Main de départ</span>${cache ? carteCachee(liste.length) : liste.map(x => miniCarte(x.carte)).join(' ')}</div>`;
}

/** La scene d'une RACINE (un evenement sans cause) et de tout ce qui en decoule. */
function scene(i, ctx) {
  const e = ctx.L[i];
  if (e.t === 'pioche' && e.tour === 0) return sceneDepart(i, ctx);
  switch (e.t) {
    case 'attaque': return sceneAttaque(i, ctx);
    case 'joue': return sceneJoue(i, ctx);
    case 'tour': return sceneTour(i, ctx);
    case 'fin': return sceneFin(i, ctx);
    default: return noeud(i, ctx);
  }
}

// ------------------------------------------------------------------- le panneau
/**
 * Le panneau du journal. Options :
 *   evts()    la liste des evenements (elle peut grandir entre deux `maj()`) ;
 *   heros     { p, e } : de quoi dessiner l'en-tete d'un tour (un sprite chacun) ;
 *   revele    montrer ce que l'adversaire a en main ? (non en direct, oui en revue) ;
 *   titre     le titre du panneau ;
 *   onFerme   appele quand on le ferme (la croix) — `ferme()` le declenche aussi.
 * Rend { n, ouvre, ferme, bascule, ouvert, maj, nonLus, extra }.
 */
export function creeJournal({ evts, heros = {}, revele = false, titre = 'Journal du combat', onFerme = null, ferme = true }) {
  const n = el(`
    <div class="jr hidden">
      <div class="jr-tete">
        <h4>${esc(titre)}</h4>
        <div class="jr-onglets"><button data-f="all" class="on">Tous</button><button data-f="p">Toi</button><button data-f="e">Adversaire</button></div>
        <span class="jr-extra"></span>
        ${ferme ? `<button class="jr-x" aria-label="Fermer le journal">${icone('Close', 22)}</button>` : ''}
      </div>
      <div class="jr-corps f-all"></div>
    </div>`);
  const corps = n.querySelector('.jr-corps');
  const ctx = { L: [], enfants: new Map(), revele, heros, departs: { p: [], e: [] } };
  const racine = [], noeuds = new Map(), sales = new Set();
  let vu = 0, ouvert = false, luJusque = 0;

  /** Range les nouveaux evenements : qui est le parent de qui, et quelle racine est touchee. */
  function indexe() {
    const L = evts() || [];
    ctx.L = L;
    for (let i = vu; i < L.length; i++) {
      const c = L[i].cause;
      // Les pioches d'avant le premier tour ne font qu'une scene par camp : la main de depart.
      if (L[i].t === 'pioche' && L[i].tour === 0 && (c === null || c === undefined)) {
        const d = ctx.departs[L[i].camp];
        d.push(i);
        racine[i] = d[0];
        sales.add(d[0]);
        continue;
      }
      racine[i] = c === null || c === undefined ? i : racine[c];
      if (c !== null && c !== undefined) {
        if (!ctx.enfants.has(c)) ctx.enfants.set(c, []);
        ctx.enfants.get(c).push(i);
      }
      sales.add(racine[i]);
    }
    vu = L.length;
  }

  /** Redessine les seules scenes dont un evenement vient d'arriver, sans bouger le defilement. */
  function range() {
    if (!sales.size) return;
    const bas = corps.scrollHeight - corps.scrollTop - corps.clientHeight < 48;
    for (const i of [...sales].sort((a, b) => a - b)) {
      let s = noeuds.get(i);
      if (!s) {
        s = el('<div class="jr-s"></div>');
        noeuds.set(i, s);
        corps.appendChild(s);
      }
      s.dataset.camp = ctx.L[i].camp || '';
      s.className = `jr-s r-${ctx.L[i].t}`;
      s.innerHTML = scene(i, ctx);
    }
    sales.clear();
    if (bas) corps.scrollTop = corps.scrollHeight;
  }

  const api = {
    n,
    ouvert: () => ouvert,
    maj() { indexe(); if (ouvert) range(); },
    ouvre() { ouvert = true; n.classList.remove('hidden'); indexe(); range(); corps.scrollTop = corps.scrollHeight; luJusque = ctx.L.length; },
    ferme() { ouvert = false; n.classList.add('hidden'); luJusque = ctx.L.length; if (onFerme) onFerme(); },
    bascule() { if (ouvert) api.ferme(); else api.ouvre(); },
    /** Combien de scenes nouvelles depuis la derniere ouverture : pour le badge de l'icone. */
    nonLus() {
      if (ouvert) return 0;
      return ctx.L.slice(luJusque).filter(e => (e.cause === null || e.cause === undefined) && e.t !== 'tour' && e.t !== 'fin').length;
    },
    /** Un element a ranger dans l'en-tete (le telechargement du journal texte, par exemple). */
    extra: noeud => n.querySelector('.jr-extra').appendChild(noeud),
    revele: v => { ctx.revele = v; for (const i of noeuds.keys()) sales.add(i); if (ouvert) range(); }
  };
  n.querySelectorAll('.jr-onglets button').forEach(b => {
    b.onclick = () => {
      n.querySelectorAll('.jr-onglets button').forEach(x => x.classList.toggle('on', x === b));
      corps.className = `jr-corps f-${b.dataset.f}`;
    };
  });
  const x = n.querySelector('.jr-x');
  if (x) x.onclick = () => api.ferme();
  return api;
}
