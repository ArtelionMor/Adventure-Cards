// LES EFFETS DU COMBAT : ce que le joueur VOIT arriver, pour qu'il comprenne sans connaitre les cartes.
//
// Le moteur resout un coup d'un bloc, puis `battle.js` redessine l'etat final. Ici on rejoue ce
// bloc comme un petit film a partir des evenements (`B.evts`, voir combat/evenements.js) : l'attaquant
// prend son elan, la cible encaisse, les chiffres s'envolent, l'unite tuee se brise. Les effets
// sont SUPERPOSES a l'ecran (la couche `.fx`, `pointer-events: none`) : ils ne bloquent aucun geste
// et ne changent jamais l'etat du jeu. Seuls `transform` et `opacity` sont animes (WAAPI).
//
// Le temps : chaque evenement recoit une heure de depart (`t`, en ms a vitesse x1) dans un
// meme « film » ; `reste()` dit combien de temps le film dure encore, et c'est ce que le mode auto
// attend avant le coup suivant. Tous les reglages sont dans `BALANCE.ui.fx` — rien en dur ici.
// Rien ne depend de `requestAnimationFrame` : les delais sont des `setTimeout`.
//
// Console : `AC.fx.ralenti = 8` ralentit tout (pour regarder un effet en capture),
// `AC.fx.vitesse` lit le cran de vitesse.
import { BALANCE } from '../config/balance.js';
import { keyLabel } from '../config/mechanics.js';
import { asset } from './shell.js';
import { icone } from './icones.js';

const F = () => BALANCE.ui.fx;
const CLE_VITESSE = 'adventureCard.fxVitesse';

// La couleur de chaque sorte de chiffre. Ce sont des teintes de travail, pas une direction artistique.
const COULEUR = {
  degats: '#ff4d5e', venin: '#b57cff', armure: '#9fb4d9', soin: '#5fe08f',
  renfort: '#ffc46b', neutre: '#e9e6f2', mana: '#6ec1ff'
};

export function creeFx(acces) {
  // acces : { racine(), couche(), unite(camp, uid), heros(camp) } — les noeuds vivants de l'ecran.
  const reglage = { ralenti: F().ralenti, vitesse: lisVitesse() };
  if (window.AC) window.AC.fx = reglage;

  let photos = new Map();    // « camp:uid » -> { rect, s, clone } : l'unite telle qu'elle etait au dernier rendu
  let fantomes = new Map();  // « camp:uid » -> noeud : une unite morte, laissee le temps de l'animation
  let minuteurs = new Set();
  let fin = 0;               // l'heure (Date.now) a laquelle le film en cours se termine
  let caches = new Set();    // les unites cachees le temps que leur carte arrive (reveles par `pop`)
  let auraAt = 0;            // quand les changements de chiffres sans cause se montrent (apres la carte qui les cause)
  let vu = 0;                // combien d'evenements ont deja ete joues

  const T = ms => ms * reglage.ralenti / reglage.vitesse;

  function lisVitesse() {
    try { const v = Number(localStorage.getItem(CLE_VITESSE)); return F().vitesses.includes(v) ? v : F().vitesses[0]; }
    catch { return F().vitesses[0]; }
  }

  const apres = (ms, fn) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, Math.max(0, T(ms)));
    minuteurs.add(id);
  };
  const marque = ms => { fin = Math.max(fin, Date.now() + T(ms)); };

  // ------------------------------------------------------------ geometrie
  /** Le rectangle d'un noeud, dans le repere de l'ecran de combat. */
  function rectDe(n) {
    const r = acces.racine().getBoundingClientRect();
    const b = n.getBoundingClientRect();
    return { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height };
  }
  /** L'echelle visuelle d'un noeud (les plateaux sont retrecis par `ajustePlateau`). */
  const echelleDe = n => (n.offsetWidth ? n.getBoundingClientRect().width / n.offsetWidth : 1) || 1;

  const cle = (camp, uid) => `${camp}:${uid}`;

  /** Le noeud qui represente une cible : le heros, l'unite vivante, ou son fantome. */
  function noeudDe(c) {
    if (!c) return null;
    if (c.k === 'heros' || c.uid === 'hero') return acces.heros(c.camp);
    return acces.unite(c.camp, c.uid) || fantomes.get(cle(c.camp, c.uid)) || null;
  }

  /** Photographie l'ecran AVANT un rendu : une unite qui va disparaitre doit pouvoir etre rejouee. */
  function photo() {
    const nv = new Map();
    for (const camp of ['p', 'e']) {
      for (const n of acces.unites(camp)) {
        const uid = Number(n.dataset.uid);
        const clone = n.cloneNode(true);
        clone.removeAttribute('data-geste');
        clone.classList.remove('sel', 'ready', 'lit', 'acteur', 'targetable');
        nv.set(cle(camp, uid), { rect: rectDe(n), s: echelleDe(n), clone, atk: Number(n.dataset.atk), hp: Number(n.dataset.hp) });
      }
    }
    photos = nv;
  }

  /** Un fantome : le noeud d'une unite morte, remis ou elle etait. */
  function faitFantome(camp, uid) {
    const k = cle(camp, uid);
    if (fantomes.has(k) || acces.unite(camp, uid)) return;
    const p = photos.get(k);
    if (!p) return;
    const g = p.clone.cloneNode(true);
    g.classList.add('fx-fantome');
    // L'enveloppeur porte la place (dans le repere de l'ecran) et les animations ; le fantome,
    // lui, garde la taille qu'il avait avant que le plateau ne le retrecisse.
    const env = document.createElement('div');
    env.className = 'fx-pos';
    Object.assign(env.style, { left: p.rect.x + 'px', top: p.rect.y + 'px', width: p.rect.w + 'px', height: p.rect.h + 'px' });
    g.style.cssText = `position:absolute;left:0;top:0;width:${p.rect.w / p.s}px;transform-origin:0 0;transform:scale(${p.s});margin:0`;
    env.appendChild(g);
    acces.couche().appendChild(env);
    fantomes.set(k, env);
  }

  function retireFantome(camp, uid) {
    const k = cle(camp, uid);
    const env = fantomes.get(k);
    if (env) { env.remove(); fantomes.delete(k); }
  }

  // ------------------------------------------------------------ briques
  // Un element de la couche est retire par un MINUTEUR, pas par `onfinish` : panneau masque ou
  // onglet en arriere-plan, les animations se figent et leur evenement de fin ne vient jamais.
  const ephemere = (d, ms) => apres(ms + 60, () => d.remove());
  const anime = (n, kf, opt) => n.animate(kf, { fill: 'both', ...opt });

  /** Un element pose sur la couche, au centre d'un rectangle. */
  function pose(classe, html, r, style) {
    const d = document.createElement('div');
    d.className = classe;
    if (html) d.innerHTML = html;
    d.style.left = (r.x + r.w / 2) + 'px';
    d.style.top = (r.y + r.h / 2) + 'px';
    if (style) Object.assign(d.style, style);
    acces.couche().appendChild(d);
    return d;
  }

  /** Un chiffre qui s'envole depuis une cible. `taille` 1 = normal, plus gros pour un gros coup. */
  function chiffre(r, texte, couleur, taille = 1, decalage = 0) {
    const f = F();
    const d = pose('fx-n', texte, r, { color: couleur, fontSize: `${Math.round(22 * taille)}px` });
    const dx = decalage;
    anime(d, [
      { transform: `translate(calc(-50% + ${dx}px), -30%) scale(.3)`, opacity: 0 },
      { transform: `translate(calc(-50% + ${dx}px), -60%) scale(1.45)`, opacity: 1, offset: .16 },
      { transform: `translate(calc(-50% + ${dx}px), -75%) scale(1)`, opacity: 1, offset: .32 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-75% - ${f.chiffreMontePx}px)) scale(.95)`, opacity: 0 }
    ], { duration: T(f.chiffreMs), easing: 'cubic-bezier(.2,.8,.3,1)' });
    ephemere(d, f.chiffreMs);
    marque(f.chiffreMs * .5);
  }

  /** L'eclair blanc sur une cible (une couche a part : pas de `filter` anime). */
  function eclair(r, couleur = '#fff') {
    const f = F();
    const d = pose('fx-flash', '', { x: r.x, y: r.y, w: r.w, h: r.h }, { background: couleur, left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    anime(d, [{ opacity: .9 }, { opacity: 0 }], { duration: T(f.flashMs), easing: 'ease-out' });
    ephemere(d, f.flashMs);
  }

  /** Les eclats qui partent du point d'impact. */
  function etincelles(r, couleur, n = F().etincelles) {
    const f = F();
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * .6;
      const dist = 22 + Math.random() * 22;
      const d = pose('fx-spark', '', r, { background: couleur });
      anime(d, [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px)) scale(.2)`, opacity: 0 }
      ], { duration: T(f.flashMs * 2), easing: 'cubic-bezier(.1,.7,.3,1)' });
      ephemere(d, f.flashMs * 2);
    }
  }

  /** Un anneau qui s'etend depuis une cible : le signe d'un changement d'etat (bouclier, aura, venin, armure...). */
  function anneau(r, couleur, fois = 1) {
    const f = F();
    for (let i = 0; i < fois; i++) {
      const d = pose('fx-anneau', '', r, { borderColor: couleur, boxShadow: `0 0 12px ${couleur}` });
      anime(d, [
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1.1)', opacity: .95, offset: .3 },
        { transform: 'translate(-50%,-50%) scale(2.4)', opacity: 0 }
      ], { duration: T(f.anneauMs), delay: T(i * f.anneauMs * .3), easing: 'ease-out' });
      ephemere(d, f.anneauMs * (1 + i * .3));
    }
    marque(f.anneauMs);
  }

  /** La banniere de changement de tour : elle traverse l'ecran. */
  function banniere(ev) {
    const f = F();
    const moi = ev.camp === 'p';
    const d = document.createElement('div');
    d.className = `fx-banniere ${moi ? 'moi' : 'eux'}`;
    d.textContent = moi ? 'Ton tour' : 'Tour adverse';
    const m = rectDe(acces.milieu());
    d.style.top = (m.y + m.h / 2) + 'px';
    acces.couche().appendChild(d);
    const total = f.banniereMs;
    anime(d, [
      { transform: 'translate(-50%,-50%) translateX(-120%) skewX(-12deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) translateX(0) skewX(-12deg)', opacity: 1, offset: .24, easing: 'ease-out' },
      { transform: 'translate(-50%,-50%) translateX(0) scale(1.04) skewX(-12deg)', opacity: 1, offset: .76 },
      { transform: 'translate(-50%,-50%) translateX(120%) skewX(-12deg)', opacity: 0 }
    ], { duration: T(total), easing: 'ease-in' });
    ephemere(d, total);
    marque(total);
  }

  /** Ce que gagne un heros : armure ou mana, au-dessus de lui. */
  function gainHeros(camp, texte, couleur) {
    const n = acces.heros(camp);
    if (!n) return;
    const r = rectDe(n);
    chiffre(r, texte, couleur, .9);
    anneau(r, couleur);
  }

  /** Une unite dont les chiffres ont bouge sans cause visible : une aura vient de se poser ou de tomber. */
  function auras(couverts) {
    const f = F();
    let rang = 0;
    for (const camp of ['p', 'e']) {
      for (const n of acces.unites(camp)) {
        const uid = Number(n.dataset.uid);
        const av = photos.get(cle(camp, uid));
        if (!av || couverts.has(cle(camp, uid))) continue;
        const da = Number(n.dataset.atk) - av.atk, dh = Number(n.dataset.hp) - av.hp;
        if (!da && !dh) continue;
        const bon = da + dh > 0;
        const c = bon ? COULEUR.renfort : COULEUR.venin;
        const texte = `${da >= 0 ? '+' : '−'}${Math.abs(da)}/${dh >= 0 ? '+' : '−'}${Math.abs(dh)}`;
        apres(auraAt + (rang++) * f.groupeMs, () => { const r = rectDe(n); chiffre(r, texte, c, .8); anneau(r, c); });
      }
    }
  }

  /** La secousse a amplitude decroissante (comme le short de reference). */
  function secoue(n, px, ms) {
    const s = echelleDe(n);
    const a = px / s;
    anime(n, [
      { transform: 'translateX(0)' }, { transform: `translateX(${-a}px)`, offset: .12 },
      { transform: `translateX(${a * .8}px)`, offset: .3 }, { transform: `translateX(${-a * .55}px)`, offset: .5 },
      { transform: `translateX(${a * .3}px)`, offset: .72 }, { transform: 'translateX(0)' }
    ], { duration: T(ms), easing: 'linear', fill: 'none' });
  }

  function secoueEcran(px, ms) {
    const r = acces.racine();
    anime(r, [
      { transform: 'translate(0,0)' }, { transform: `translate(${-px}px, ${px * .5}px)`, offset: .15 },
      { transform: `translate(${px * .8}px, ${-px * .4}px)`, offset: .35 }, { transform: `translate(${-px * .5}px, 0)`, offset: .6 },
      { transform: 'translate(0,0)' }
    ], { duration: T(ms), easing: 'linear', fill: 'none' });
  }

  /** L'elan : recul, bond vers la cible, retour. Rend le delai (ms, vitesse x1) jusqu'au coup. */
  function elan(src, cible) {
    const f = F();
    const n = noeudDe(src);
    const nc = noeudDe(cible);
    if (!n || !nc) return;
    const a = rectDe(n), b = rectDe(nc);
    const s = echelleDe(n);
    const dx = ((b.x + b.w / 2) - (a.x + a.w / 2)) * f.elanPart / s;
    const dy = ((b.y + b.h / 2) - (a.y + a.h / 2)) * f.elanPart / s;
    const n0 = n.style.zIndex;
    n.style.zIndex = 8;
    anime(n, [
      { transform: 'translate(0,0) scale(1)', offset: 0 },
      { transform: `translate(${-dx * .12}px, ${-dy * .12}px) scale(.94)`, offset: .22, easing: 'cubic-bezier(.5,0,.9,.4)' },
      { transform: `translate(${dx}px, ${dy}px) scale(1.15)`, offset: f.elanImpact, easing: 'ease-out' },
      { transform: 'translate(0,0) scale(1)', offset: 1 }
    ], { duration: T(f.elanMs), fill: 'none' });
    apres(f.elanMs, () => { n.style.zIndex = n0; });
  }

  // ------------------------------------------------------------ ce qu'on montre
  function coup(ev) {
    const f = F();
    const n = noeudDe(ev.cible);
    if (!n) return;
    const r = rectDe(n);
    const hero = ev.cible.k === 'heros';
    const perdu = ev.perdu || 0;
    const sorte = ev.venin ? 'venin' : 'degats';
    let texte, couleur = COULEUR[sorte];
    let taille = 1 + Math.min(perdu, 12) * .06;
    const venin = !!ev.venin;
    if (venin) { texte = 'Venin'; taille = 1.15; }
    else if (ev.annule) { texte = 'Annulé'; couleur = COULEUR.neutre; taille = .8; }
    else if (ev.bouclier) { texte = 'Bloqué'; couleur = COULEUR.armure; taille = .85; }
    else if (perdu > 0) texte = `−${perdu}`;
    else if ((ev.armure || 0) > 0) { texte = 'Armure'; couleur = COULEUR.armure; taille = .85; }
    else { texte = '0'; couleur = COULEUR.neutre; taille = .8; }
    chiffre(r, texte, couleur, taille);
    if (venin) anneau(r, COULEUR.venin, 2);
    if (ev.bouclier) anneau(r, '#cfe0ff');
    if (perdu > 0 || ev.bouclier) {
      eclair(r, ev.bouclier ? '#cfe0ff' : '#fff');
      etincelles(r, couleur);
      secoue(n, f.secoussePx * (hero ? .7 : 1) * (1 + Math.min(perdu, 8) * .08), f.secousseMs);
      if (perdu >= f.grosCoup) secoueEcran(f.ecranSecoussePx, f.ecranSecousseMs);
    }
    // Si l'armure a absorbe une part du coup, on le dit a cote du chiffre.
    if (perdu > 0 && (ev.armure || 0) > 0) chiffre(r, `Armure −${ev.armure}`, COULEUR.armure, .6, 0);
  }

  function soin(ev) {
    const n = noeudDe(ev.cible);
    if (!n || !(ev.soigne > 0)) return;
    const r = rectDe(n);
    chiffre(r, `+${ev.soigne}`, COULEUR.soin, 1);
    etincelles(r, COULEUR.soin, 5);
  }

  function renfort(ev, rang) {
    const n = noeudDe(ev.cible);
    if (!n) return;
    const r = rectDe(n);
    const morceaux = [];
    if (ev.atk) morceaux.push(`${ev.atk > 0 ? '+' : '−'}${Math.abs(ev.atk)}/`);
    else morceaux.push('+0/');
    morceaux.push(ev.hp ? `${ev.hp > 0 ? '+' : '−'}${Math.abs(ev.hp)}` : '+0');
    let texte = morceaux.join('');
    if (ev.cle) texte += ` ${keyLabel(ev.cle)}`;
    chiffre(r, texte, COULEUR.renfort, .85, rang * 0);
    etincelles(r, COULEUR.renfort, 5);
  }

  /** La mort : le fantome tremble, s'eclaire puis se brise. */
  function mort(ev) {
    const f = F();
    const u = ev.unite;
    const env = fantomes.get(cle(u.camp, u.uid));
    if (!env) return;
    const r = rectDe(env);
    eclair(r);
    etincelles(r, '#fff', 10);
    const ic = pose('fx-mort', icone('Dead', 46), r);
    anime(ic, [
      { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
      { transform: 'translate(-50%,-60%) scale(1.3)', opacity: 1, offset: .3 },
      { transform: 'translate(-50%,-110%) scale(1)', opacity: 0 }
    ], { duration: T(f.mortMs * 1.6), easing: 'ease-out' });
    ephemere(ic, f.mortMs * 1.6);
    anime(env, [
      { transform: 'scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'scale(1.18) rotate(-4deg)', opacity: 1, offset: .25 },
      { transform: 'scale(.7) rotate(9deg)', opacity: 0 }
    ], { duration: T(f.mortMs), easing: 'ease-in' });
    apres(f.mortMs, () => retireFantome(u.camp, u.uid));
  }

  /** Une carte jouee : elle part de la main (ou du heros adverse), se montre au centre, puis va a sa destination. */
  function carteJouee(ev) {
    const f = F();
    const c = ev.carte;
    const d = document.createElement('div');
    d.className = `hcard fx-carte${c.type === 'spell' ? ' spell' : ''}`;
    const cout = typeof ev.paye === 'number' ? ev.paye : c.cout;
    d.innerHTML = `<div class="cost">${cout}</div>${c.sprite ? `<img src="${asset(c.sprite)}" alt="">` : ''}<div class="nm">${c.nom}</div>${c.type === 'ally' ? `<div class="st">${c.atk}/${c.hp}</div>` : ''}`;
    const centre = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
    const o = centre(rectDe(ev.camp === 'p' ? acces.main() : acces.heros('e')));
    const m = centre(rectDe(acces.milieu()));
    const un = ev.carte.type === 'ally' ? [...acces.unites(ev.camp)].pop() : null;
    // Un allie va vers son plateau ; un sort, vers la defausse.
    const dest = centre(rectDe(un || acces.defausse(ev.camp)));
    acces.couche().appendChild(d);
    const tr = (p, s) => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${s})`;
    const total = f.volMs + f.tenueMs + f.sortieMs;
    anime(d, [
      { transform: tr(o, .55), opacity: 0 },
      { transform: tr(m, 1.55), opacity: 1, offset: f.volMs / total, easing: 'ease-in-out' },
      { transform: tr(m, 1.6), opacity: 1, offset: (f.volMs + f.tenueMs) / total, easing: 'ease-in' },
      { transform: tr(dest, .3), opacity: 0 }
    ], { duration: T(total), easing: 'cubic-bezier(.2,.8,.3,1)' });
    ephemere(d, total);
    marque(total);
  }

  /** L'arrivee d'une unite : elle rebondit, avec un petit nuage d'eclats. */
  function pop(camp, uid) {
    const f = F();
    const n = acces.unite(camp, uid);
    if (!n) return;
    n.style.visibility = '';
    caches.delete(n);
    anime(n, [
      { transform: 'scale(.15)', opacity: 0 },
      { transform: 'scale(1.3)', opacity: 1, offset: .55 },
      { transform: 'scale(.92)', offset: .78 },
      { transform: 'scale(1)', opacity: 1 }
    ], { duration: T(f.popMs), easing: 'ease-out', fill: 'none' });
    etincelles(rectDe(n), '#ffe8a8', 8);
  }

  // ------------------------------------------------------------ le film
  /**
   * Joue les evenements arrives depuis le dernier appel. A appeler apres chaque `render()`.
   * Rend la duree (ms) du film ajoute, a vitesse x1.
   */
  function joue(evts) {
    if (!evts || evts.length <= vu) { vu = Math.min(vu, evts ? evts.length : 0); return 0; }
    const f = F();
    const lot = evts.slice(vu);
    vu = evts.length;

    // Les unites qui meurent dans ce lot: on les garde a l'ecran (fantome) le temps de les
    // faire souffrir, puisque `syncListe` a deja retire leur noeud.
    for (const ev of lot) if (ev.t === 'meurt') faitFantome(ev.unite.camp, ev.unite.uid);
    acces.racine().style.setProperty('--fx-k', reglage.ralenti / reglage.vitesse);
    // Une unite qui arrive reste cachee jusqu'a ce que sa carte la depose (`pop`).
    for (const ev of lot) {
      if (ev.t !== 'invoque') continue;
      const n = acces.unite(ev.unite.camp, ev.unite.uid);
      if (n) { n.style.visibility = 'hidden'; caches.add(n); }
    }

    auraAt = 0;
    // Ceux dont un evenement du lot explique deja les chiffres : pas d'effet d'aura en plus.
    const couverts = new Set();
    for (const ev of lot) {
      if (['degats', 'soin', 'renfort'].includes(ev.t) && ev.cible && ev.cible.uid) couverts.add(cle(ev.cible.camp, ev.cible.uid));
      if (ev.t === 'invoque') couverts.add(cle(ev.unite.camp, ev.unite.uid));
      if (ev.t === 'transforme' || ev.t === 'controle') for (const u of ev.unites || (ev.unite ? [ev.unite] : [])) couverts.add(cle(u.camp, u.uid));
    }
    let t = 0;                      // l'horloge du film
    const impact = new Map();       // indice d'evenement -> heure du coup
    let groupe = null;              // le dernier groupe (meme cause, meme type) : { cause, t, type }
    const heure = ev => {           // quand un evenement « simple » joue : ensemble avec ses voisins de meme cause
      if (groupe && groupe.cause === ev.cause && groupe.type === ev.t) return groupe.t + f.groupeMs * (++groupe.n);
      groupe = { cause: ev.cause, type: ev.t, t, n: 0 };
      const at = t;
      t += f.cadenceMs;
      return at;
    };

    for (const ev of lot) {
      switch (ev.t) {
        case 'attaque': {
          apres(t, () => elan(ev.src, ev.cible));
          t += f.elanMs * f.elanImpact;
          groupe = null;
          impact.set(ev.i, t);
          break;
        }
        case 'degats': {
          let at;
          if (ev.riposte) { at = t; t += f.cadenceMs; }
          else if (ev.cause !== null && impact.has(ev.cause)) { at = impact.get(ev.cause); t = at + f.ripostePauseMs; }
          else at = heure(ev);
          impact.set(ev.i, at);
          apres(at, () => coup(ev));
          marque(at + f.secousseMs);
          break;
        }
        case 'joue': {
          apres(t, () => carteJouee(ev));
          t += f.volMs + f.tenueMs;
          if (!auraAt) auraAt = t;
          groupe = null;
          break;
        }
        case 'invoque': {
          const at = heure(ev);
          apres(at, () => pop(ev.unite.camp, ev.unite.uid));
          marque(at + f.popMs);
          break;
        }
        case 'tour': {
          apres(t, () => banniere(ev));
          t += f.banniereAvanceMs;
          groupe = null;
          break;
        }
        case 'armure': {
          if (!(ev.v > 0)) break;
          const at = heure(ev);
          apres(at, () => gainHeros(ev.camp, `+${ev.v} Armure`, COULEUR.armure));
          marque(at + f.chiffreMs * .5);
          break;
        }
        case 'mana': {
          if (!(ev.v > 0)) break;
          const at = heure(ev);
          apres(at, () => gainHeros(ev.camp, ev.promis ? `+${ev.v} Mana au prochain tour` : `+${ev.v} Mana`, COULEUR.mana));
          marque(at + f.chiffreMs * .5);
          break;
        }
        case 'soin': { const at = heure(ev); apres(at, () => soin(ev)); marque(at + f.chiffreMs * .5); break; }
        case 'renfort': { const at = heure(ev); apres(at, () => renfort(ev, 0)); marque(at + f.chiffreMs * .5); break; }
        case 'meurt': {
          const base = impact.has(ev.cause) ? impact.get(ev.cause) : t;
          const at = base + f.mortDelaiMs;
          apres(at, () => mort(ev));
          t = Math.max(t, at + f.mortMs * .5);
          marque(at + f.mortMs);
          break;
        }
        default: break;
      }
    }
    auras(couverts);
    marque(t);
    // Un fantome oublie (sa mort n'a pas ete jouee) ne reste pas : on le retire a la fin du film.
    apres(t + f.mortMs, () => { for (const n of caches) n.style.visibility = ''; caches.clear(); for (const [k, env] of fantomes) { env.remove(); fantomes.delete(k); } });
    return t;
  }

  return {
    photo, joue,
    /** Combien de temps (ms reelles) avant la fin du film en cours. */
    reste: () => Math.max(0, fin - Date.now()),
    get vitesse() { return reglage.vitesse; },
    /** Passe au cran de vitesse suivant (x1 -> x2 -> x1) et le retient. */
    cycleVitesse() {
      const v = F().vitesses;
      reglage.vitesse = v[(v.indexOf(reglage.vitesse) + 1) % v.length];
      try { localStorage.setItem(CLE_VITESSE, String(reglage.vitesse)); } catch { /* stockage refuse : tant pis */ }
      return reglage.vitesse;
    },
    /** Interrompt tout (nouveau combat, fin de combat). */
    vide() {
      for (const id of minuteurs) clearTimeout(id);
      minuteurs.clear();
      for (const env of fantomes.values()) env.remove();
      fantomes.clear();
      for (const n of caches) n.style.visibility = '';
      caches.clear();
      photos = new Map();
      fin = 0;
      vu = 0;
    }
  };
}
