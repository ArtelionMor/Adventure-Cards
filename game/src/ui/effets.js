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
// `AC.fx.vitesse` lit le cran de vitesse, `AC.fx.trace = console.log` dit chaque brique de VFX jouee.
import { BALANCE } from '../config/balance.js';
import { cardById } from '../config/npcs.js';
import { asset } from './shell.js';
import { icone, urlIcone, OEIL } from './icones.js';
import { ligneDePictos, iconeDeCle } from './pictos.js';
import { creeBriques, signatureDe } from './vfx.js';
import { t as texte } from '../config/textes.js';

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
  let enElan = new Set();    // les unites dont un double fait l'elan a leur place (cachees le temps du bond)
  let caches = new Set();    // les unites cachees le temps que leur carte arrive (reveles par `pop`)
  let auraAt = 0;            // quand les changements de chiffres sans cause se montrent (apres la carte qui les cause)
  let vu = 0;                // combien d'evenements ont deja ete joues
  let film = 0;              // le numero du film en cours (chaque `joue` en ouvre un)
  let pvTenus = new Map();   // « camp:uid » -> { camp, uid, film } : les PV que l'ecran garde jusqu'a l'impact (`montrePv`)

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
        // L'uid tel que le moteur le donne (« u12 ») : un `Number()` ici donnait NaN, aucune photo ne se retrouvait, et
        // une unite morte disparaissait sans son animation.
        const uid = n.dataset.uid;
        const clone = n.cloneNode(true);
        clone.removeAttribute('data-geste');
        clone.classList.remove('sel', 'ready', 'lit', 'acteur', 'targetable');
        // La taille se lit sur la mise en page (taille de la carte x echelle du plateau), pas sur le rectangle affiche : une
        // unite photographiee pendant son « pop » d'arrivee laissait un fantome de 14 px.
        const b = rectDe(n);
        const u = parseFloat(n.parentElement && n.parentElement.style.getPropertyValue('--u')) || 1;
        const w = n.offsetWidth * u, h = n.offsetHeight * u;
        const rect = w ? { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h } : b;
        nv.set(cle(camp, uid), { rect, s: w ? u : echelleDe(n), clone, atk: Number(n.dataset.atk), hp: Number(n.dataset.hp) });
      }
    }
    photos = nv;
  }

  /** Un DOUBLE d'une unite vivante, pose sur la couche d'effets (que le plateau ne coupe pas) a l'endroit exact de l'original. */
  function cloneUnite(n) {
    const a = rectDe(n), sc = echelleDe(n);
    const g = n.cloneNode(true);
    g.removeAttribute('data-geste');
    g.classList.remove('sel', 'ready', 'lit', 'acteur', 'targetable');
    const env = document.createElement('div');
    env.className = 'fx-pos';
    Object.assign(env.style, { left: a.x + 'px', top: a.y + 'px', width: a.w + 'px', height: a.h + 'px' });
    // `cssText` REMPLACE le style en ligne : si l'original est cache (`visibility`), son double ne l'est pas.
    g.style.cssText = `position:absolute;left:0;top:0;width:${a.w / sc}px;transform-origin:0 0;transform:scale(${sc});margin:0`;
    env.appendChild(g);
    acces.couche().appendChild(env);
    return env;
  }

  /**
   * UNE UNITE QUI ARRIVE ne prend pas de place avant d'apparaitre (`.arrivante`, `display: none`) : cachee mais en place,
   * elle poussait deja ses voisines (21 oct. 2026). `montre` la rend, et ses voisines glissent (`acces.change`).
   */
  function cache(n) { n.classList.add('arrivante'); caches.add(n); }
  function montre(n) {
    const fait = () => { n.style.visibility = ''; n.classList.remove('arrivante'); caches.delete(n); };
    if (acces.change && n.classList.contains('arrivante')) acces.change(n.dataset.side, fait); else fait();
  }
  /**
   * LES PV DESCENDENT A L'IMPACT (game designer, 21 oct. 2026 : « on voit les PV de l'ennemi descendre avant que
   * l'animation ne soit finie ») : le rendu montre l'etat du moteur, deja frappe. Un film garde donc a l'ecran les PV
   * d'AVANT de chaque heros ou unite qu'il touche (`acces.pv`), et chaque coup ou soin pose ses PV d'APRES quand il tombe.
   */
  const clePv = c => (!c ? null : c.k === 'heros' || c.uid === 'hero' ? { camp: c.camp, uid: 'hero' } : c.uid ? { camp: c.camp, uid: c.uid } : null);
  function montrePv(ev) {
    const c = clePv(ev.cible);
    if (c && typeof ev.apres === 'number' && pvTenus.has(cle(c.camp, c.uid)) && acces.pv) acces.pv(c.camp, c.uid, ev.apres);
  }
  /** Une unite morte a fini de mourir : sa place se libere sur le plateau (ui/battle.js). */
  const libere = u => { if (acces.libere) acces.libere(u.camp, u.uid); };

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

  /**
   * L'OEIL QUI S'OUVRE (maquette du game designer, 20 oct. 2026) : une regle « quand X » se declenche — l'oeil, ferme sur
   * le bord haut de sa carte (ui/battle.js), s'ouvre LA OU IL EST, etape par etape (`oeilPasMs` chacune : ferme, 25, 50,
   * 75 %, ouvert), reste ouvert le temps que la carte-effet se montre (`ouvertMs`), puis se referme. L'etape est notee
   * sur le noeud (`data-oeil`) : la carte redessinee entre-temps la reprend. Sans oeil sur la carte (unite morte), rien.
   */
  function oeil(ev, ouvertMs) {
    const f = F();
    const etape = k => {
      const n = noeudDe(ev.src);
      if (!n || !n.dataset) return;
      n.dataset.oeil = k;
      const img = n.querySelector('.oeil-carte img');
      if (img) img.src = urlIcone(OEIL[k]);
      if (k === OEIL.length - 1 && img) anime(img, [{ transform: 'scale(1)' }, { transform: 'scale(1.2)', offset: .4 }, { transform: 'scale(1)' }], { duration: T(f.oeilPasMs * 3), fill: 'none' });
    };
    OEIL.forEach((_, k) => apres(k * f.oeilPasMs, () => etape(k)));
    const ferme = (OEIL.length - 1) * f.oeilPasMs + ouvertMs;
    for (let k = OEIL.length - 2; k >= 0; k--) apres(ferme + (OEIL.length - 2 - k) * f.oeilPasMs, () => etape(k));
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
    // Pas de mot : le portrait de celui qui joue, sur une bande verte (toi) ou rouge (l'adversaire).
    const portrait = acces.heros(ev.camp) && acces.heros(ev.camp).querySelector('img');
    d.innerHTML = `${portrait ? `<img class="fx-ban-img" src="${portrait.getAttribute('src')}" alt="">` : ''}<span class="fx-ban-txt">${texte(moi ? 'combat.tonTour' : 'combat.tourAdverse')}</span>${icone('TurnStart', 30)}`;
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

  /**
   * L'ONDE D'UNE AURA (maquette du game designer, 21 oct. 2026) : une onde part du porteur et couvre la bande du plateau,
   * DERRIERE les cartes ; chaque unite que l'aura touche vraiment (`touches`, la regle du moteur) s'eclaire quand l'onde
   * l'atteint, les autres non ; puis la bande s'eteint. Elle se pose sur le plateau des unites touchees (celui d'en face
   * pour une aura qui vise les ennemis) ; la couleur est celle de la signature (`aura`, ui/vfx.js), jaune sinon.
   */
  function ondeAura(n, touches, couleur = '#ffd23a', { bloque = true } = {}) {
    const f = F();
    const camp = touches.length ? touches[0].dataset.side : n.dataset.side;
    const plateau = acces.plateau(camp);
    const rp = rectDe(plateau), r = rectDe(n);
    const c = { x: r.x + r.w / 2 - rp.x, y: r.y + r.h / 2 - rp.y };
    const R = Math.max(...[[0, 0], [rp.w, 0], [0, rp.h], [rp.w, rp.h]].map(([x, y]) => Math.hypot(x - c.x, y - c.y)));
    const total = f.auraOndeMs + f.auraTenueMs + f.auraSortieMs;
    // La bande : un calque DANS le plateau, apres son bloc d'unites, et derriere lui (`.fx-aura`, styles.css).
    const bande = document.createElement('div');
    bande.className = 'fx-aura';
    bande.style.setProperty('--c', couleur);
    bande.innerHTML = `<i style="left:${c.x - R}px;top:${c.y - R}px;width:${2 * R}px;height:${2 * R}px"></i>`;
    plateau.appendChild(bande);
    anime(bande.firstChild, [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: .8 }], { duration: T(f.auraOndeMs), easing: 'cubic-bezier(.2,.7,.4,1)' });
    anime(bande, [{ opacity: 1 }, { opacity: 1, offset: (f.auraOndeMs + f.auraTenueMs) / total }, { opacity: 0 }], { duration: T(total) });
    ephemere(bande, total);
    // Les unites touchees s'eclairent quand l'onde les atteint.
    for (const t of touches) {
      const rt = rectDe(t);
      const d = Math.hypot(rt.x + rt.w / 2 - rp.x - c.x, rt.y + rt.h / 2 - rp.y - c.y);
      apres(f.auraOndeMs * Math.min(1, d / R), () => {
        const v = pose('fx-aura-voile', '', rectDe(t), { width: rt.w + 'px', height: rt.h + 'px' });
        v.style.setProperty('--c', couleur);
        anime(v, [{ opacity: 0 }, { opacity: .85, offset: .3 }, { opacity: 0 }], { duration: T(f.auraTenueMs + f.auraSortieMs), easing: 'ease-out' });
        ephemere(v, f.auraTenueMs + f.auraSortieMs);
      });
    }
    // Le pouls ne retient pas le combat : l'action suivante n'attend pas une onde qui revient toutes les 5 s.
    if (bloque) marque(total);
  }

  /** Les unites qu'une aura touche vraiment (ou, sans combat — le wiki —, toutes les autres de son camp). */
  const touchesDe = n => (acces.sousAura
    ? acces.sousAura(n.dataset.side, n.dataset.uid).map(x => acces.unite(x.camp, x.uid)).filter(Boolean)
    : acces.unites(n.dataset.side).filter(x => x !== n));
  /** La couleur de l'aura d'une unite : celle de sa signature (`aura`, ui/vfx.js), jaune sinon. */
  const couleurAura = id => { const s = signatureDe(id); return (liste(s && s.aura).map(([, o]) => o || {}).find(o => o.couleur) || {}).couleur; };

  // LE POULS DES AURAS (game designer, 21 oct. 2026 : « une fois toutes les 5 secondes, on va essayer ») : chaque porteur
  // en jeu (`.porte-aura`) rejoue son onde a ce rythme (`auraPeriodeMs`, en VRAIES secondes : x2 et x4 n'y changent rien,
  // c'est un fond, pas un evenement du combat ; le ralenti de la console, si). Son
  // propre minuteur, hors de la file des films : `vide()` ne l'arrete pas, et l'onde ne retient pas le combat.
  function pouls() {
    setTimeout(pouls, Math.max(1000, F().auraPeriodeMs * reglage.ralenti));
    if (document.hidden) return;
    try {
      for (const camp of ['p', 'e']) {
        for (const n of acces.unites(camp)) {
          if (n.classList.contains('porte-aura') && n.style.visibility !== 'hidden' && !caches.has(n)) ondeAura(n, touchesDe(n), couleurAura(n.dataset.carte), { bloque: false });
        }
      }
    } catch { /* l'ecran n'est pas monte (pas de combat) : rien a faire */ }
  }
  setTimeout(pouls, F().auraPeriodeMs);

  /** Une unite dont les chiffres ont bouge sans cause visible : une aura vient de se poser ou de tomber. */
  function auras(couverts) {
    const f = F();
    let rang = 0;
    for (const camp of ['p', 'e']) {
      for (const n of acces.unites(camp)) {
        const uid = n.dataset.uid;   // « u12 », comme dans `photo()` (un `Number()` ne retrouvait aucune photo)
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

  /** Les temps d'une attaque (ms a x1) : quand le coup touche, et quand l'attaquant est revenu a sa place. */
  function dureesAttaque() {
    const f = F();
    const impact = f.attaqueReculMs + f.attaqueTenueMs + f.attaqueChargeMs;
    return { impact, total: impact + f.attaqueImpactMs + f.attaqueRetourMs };
  }

  /**
   * L'ATTAQUE EN CINQ TEMPS (maquette du game designer, 19 oct. 2026) : l'attaquant RECULE en grossissant un peu (il
   * prend son elan), TIENT, FONCE sur sa cible en laissant des remanences, reste COLLE le temps du coup, puis REVIENT.
   */
  function elan(src, cible) {
    const f = F();
    const n = noeudDe(src);
    const nc = noeudDe(cible);
    if (!n || !nc) return;
    const a = rectDe(n), b = rectDe(nc);
    // Le plateau coupe ce qui depasse (`overflow: hidden`) : une unite vivante ne bondit donc pas
    // elle-meme, c'est un DOUBLE pose sur la couche d'effets, qui n'est coupee par rien.
    const vivant = src.k === 'unite' && n === acces.unite(src.camp, src.uid);
    let porteur = n, env = null;
    if (vivant) {
      if (caches.has(n)) return;   // sa carte n'a pas fini d'arriver
      env = cloneUnite(n);
      n.style.visibility = 'hidden';
      enElan.add(n);
      porteur = env;
    }
    const s = vivant ? 1 : echelleDe(n);
    const dx = ((b.x + b.w / 2) - (a.x + a.w / 2)) * f.elanPart / s;
    const dy = ((b.y + b.h / 2) - (a.y + a.h / 2)) * f.elanPart / s;
    const d = dureesAttaque();
    const o = ms => Math.min(1, ms / d.total);
    const recul = `translate(${-dx * .2}px, ${-dy * .2}px) scale(1.08)`;
    const colle = `translate(${dx}px, ${dy}px) scale(1.12)`;
    const n0 = porteur.style.zIndex;
    porteur.style.zIndex = 8;
    anime(porteur, [
      { transform: 'translate(0,0) scale(1)', offset: 0, easing: 'ease-out' },
      { transform: recul, offset: o(f.attaqueReculMs) },
      { transform: recul, offset: o(f.attaqueReculMs + f.attaqueTenueMs), easing: 'cubic-bezier(.55,0,1,.6)' },
      { transform: colle, offset: o(d.impact) },
      { transform: colle, offset: o(d.impact + f.attaqueImpactMs), easing: 'ease-in-out' },
      { transform: 'translate(0,0) scale(1)', offset: 1 }
    ], { duration: T(d.total), fill: 'none' });
    // Les REMANENCES : des doubles fixes laisses le long de la charge, qui s'effacent.
    const k = vivant ? Math.max(0, Math.round(f.attaqueRemanences || 0)) : 0;
    for (let i = 1; i <= k; i++) {
      const p = i / (k + 1);
      apres(f.attaqueReculMs + f.attaqueTenueMs + f.attaqueChargeMs * p, () => {
        if (!n.isConnected) return;
        const g = cloneUnite(n);
        g.style.visibility = 'visible';
        g.firstElementChild.style.visibility = 'visible';
        g.style.zIndex = 7;
        const x = -dx * .2 + (dx * 1.2) * p, y = -dy * .2 + (dy * 1.2) * p;
        anime(g, [
          { transform: `translate(${x}px, ${y}px) scale(1.1)`, opacity: .55 },
          { transform: `translate(${x}px, ${y}px) scale(1.1)`, opacity: 0 }
        ], { duration: T(f.attaqueImpactMs), easing: 'ease-out' });
        ephemere(g, f.attaqueImpactMs);
      });
    }
    apres(d.total, () => {
      porteur.style.zIndex = n0;
      if (env) { env.remove(); if (enElan.delete(n)) n.style.visibility = ''; }
    });
  }

  // ------------------------------------------------------------ ce qu'on montre
  // LES VFX PAR CARTE (ui/vfx.js) : la signature d'une carte (`SIGNATURES[id]`) assemble des briques. `lance` en joue une.
  const briques = creeBriques({ anime, T, ephemere, couche: () => acces.couche(), F, eclair, anneau, etincelles, secoueEcran, apres, cloneUnite, rectMain: () => rectDe(acces.main()) });
  // LES MEMES BRIQUES « A BLANC » : elles ne dessinent rien (une couche hors de la page, aucune animation, aucun minuteur)
  // et rendent seulement leur duree. Le film s'en sert pour savoir, AVANT de jouer un lancer, quand il arrivera sur sa
  // cible : ses consequences (degats, morts) tombent a ce moment-la, pas pendant qu'il vole encore.
  const aBlanc = document.createElement('div');
  const rien = () => {};
  const mesure = creeBriques({ anime: () => ({}), T, ephemere: rien, couche: () => aBlanc, F, eclair: rien, anneau: rien, etincelles: rien,
    secoueEcran: rien, apres: rien, cloneUnite: () => document.createElement('div'), rectMain: () => rectDe(acces.main()) });
  // Une mesure par moment de signature et par nombre de cibles : une brique « a blanc » cree quand meme ses images (et un
  // 404 pour une icone pas encore dessinee) — on ne la remesure pas a chaque carte jouee.
  const durees = new Map();
  /** La duree (ms a x1) d'un moment de signature, sans le jouer ; 0 si on ne sait pas. */
  function dureeDe(e, vers, de) {
    const k = JSON.stringify(e) + '|' + (vers ? vers.length : 0);
    if (durees.has(k)) return durees.get(k);
    let ms = 0;
    for (const [nom, o] of liste(e)) {
      try { ms = Math.max(ms, (mesure[nom] && mesure[nom]({ de: de || centreDe(rectDe(acces.milieu())), vers, ...(o || {}) })) || 0); } catch { /* une brique qui veut un vrai noeud : on garde le minimum */ }
    }
    aBlanc.textContent = '';
    durees.set(k, ms);
    return ms;
  }
  /** Quand les consequences d'un lancer tombent : au moins `lancerMs`, sinon a l'arrivee mesuree du projectile. */
  const arriveeDe = (e, vers, de) => Math.max(F().lancerMs, dureeDe(e, vers, de) * F().lancerArriveePart);
  function lance(brique, options, vers, de) {
    const b = briques[brique];
    if (!b) return 0;
    const d = de || centreDe(rectDe(acces.milieu()));
    const ms = b({ de: d, vers, ...(options || {}) }) || 0;
    if (reglage.trace) reglage.trace(brique, options);   // console : `AC.fx.trace = console.log` dit quelle brique joue
    marque(ms);
    return ms;
  }
  const centreDe = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  /** Une entree de signature (`[brique, options]`) ou une LISTE d'entrees, toujours rendue en liste. */
  const liste = e => (!e ? [] : Array.isArray(e[0]) ? e : [e]);
  /** Joue toutes les entrees d'un moment ; `extra` s'ajoute aux options (le noeud de l'unite concernee, par exemple). */
  function lanceTout(e, vers, de, extra) {
    let ms = 0;
    for (const [nom, o] of liste(e)) ms = Math.max(ms, lance(nom, { ...(o || {}), ...(extra || {}) }, vers, de));
    return ms;
  }

  /**
   * La carte d'une unite (son `id`), pour retrouver sa signature : l'evenement la porte s'il la connait, sinon on la
   * lit sur son noeud (`data-carte`, pose par l'ecran), vivant ou photographie avant sa mort.
   */
  function idDe(ref) {
    if (!ref) return null;
    if (ref.id) return ref.id;
    const n = acces.unite(ref.camp, ref.uid);
    if (n && n.dataset.carte) return n.dataset.carte;
    const p = photos.get(cle(ref.camp, ref.uid));
    return (p && p.clone.dataset.carte) || null;
  }

  /** D'ou part le lancer d'une carte : la carte au centre, sauf si sa signature dit autre chose (`de`). */
  function pointDe(sig, ev) {
    const autre = ev.camp === 'p' ? 'e' : 'p';
    const n = sig.de === 'ennemi' ? acces.heros(autre) : sig.de === 'pioche' ? (ev.camp === 'p' ? acces.pioche() : acces.heros('e')) : null;
    return n ? centreDe(rectDe(n)) : undefined;
  }
  // Console : `AC.fx.montre('eclair')` joue une brique du centre vers le heros adverse (ou `'plumes', { n: 9 }`), pour la regarder seule.
  // Elle vise la premiere unite adverse (le heros s'il n'y en a pas) ; les briques qui animent une unite (gonfle,
  // clignote, dedouble, fantome) prennent ta premiere unite.
  // Console : `AC.fx.aura()` rejoue l'onde d'aura de ta premiere unite (`AC.fx.aura('e', 2)` : la troisieme d'en face), qu'elle
  // ait une aura ou non — pour regarder qui elle eclaire et regler `auraOndeMs` / `auraTenueMs` / `auraSortieMs`.
  reglage.aura = (camp = 'p', i = 0) => {
    const n = acces.unites(camp)[i];
    if (!n) return 'aucune unite a cette place';
    const touches = touchesDe(n);
    ondeAura(n, touches, couleurAura(n.dataset.carte));
    return `${touches.length} unite(s) touchee(s)`;
  };
  reglage.montre = (nom, options) => {
    const cible = acces.unites('e')[0] || acces.heros('e');
    return lance(nom, { noeud: acces.unites('p')[0] || null, ...(options || {}) }, [rectDe(cible)], centreDe(rectDe(acces.milieu())));
  };

  /** Ce que vise le lancer d'une carte : sa cible designee, sinon la zone que dit sa signature (`vers`). */
  function visees(sig, ev) {
    if (ev.cible) { const n = noeudDe(ev.cible); if (n) return [rectDe(n)]; }
    const camp = ev.camp, autre = camp === 'p' ? 'e' : 'p';
    const rect = n => (n ? [rectDe(n)] : []);
    switch (sig.vers) {
      case 'soi': return rect(acces.heros(camp));
      case 'allies': return rect(acces.plateau(camp));
      case 'ennemis': return rect(acces.plateau(autre));
      case 'main': return rect(camp === 'p' ? acces.main() : acces.heros('e'));
      case 'pioche': return rect(camp === 'p' ? acces.pioche() : acces.heros('e'));
      case 'defausse': return rect(acces.defausse(camp));
      default: return rect(acces.heros(autre));
    }
  }

  function coup(ev, sig) {
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
    if (venin) { texte = icone('Venom', 30); taille = 1.15; }
    else if (ev.annule) { texte = icone('Cancel', 26); couleur = COULEUR.neutre; taille = .8; }
    else if (ev.bouclier) { texte = icone('Shield', 28); couleur = COULEUR.armure; taille = .85; }
    else if (perdu > 0) texte = `−${perdu}`;
    else if ((ev.armure || 0) > 0) { texte = icone('Armor', 26); couleur = COULEUR.armure; taille = .85; }
    else { texte = '0'; couleur = COULEUR.neutre; taille = .8; }
    chiffre(r, texte, couleur, taille);
    if (venin) anneau(r, COULEUR.venin, 2);
    if (ev.bouclier) anneau(r, '#cfe0ff');
    if (perdu > 0 || ev.bouclier) {
      eclair(r, ev.bouclier ? '#cfe0ff' : '#fff');
      const ns = ev.src && ev.src.uid ? noeudDe(ev.src) : null;   // le coup part de son auteur s'il est sur le plateau
      if (sig && sig.arrivee) lanceTout(sig.arrivee, [r], ns ? centreDe(rectDe(ns)) : undefined, { noeud: n }); else etincelles(r, couleur);
      secoue(n, f.secoussePx * (hero ? .7 : 1) * (1 + Math.min(perdu, 8) * .08), f.secousseMs);
      if (perdu >= f.grosCoup) secoueEcran(f.ecranSecoussePx, f.ecranSecousseMs);
    }
    // Si l'armure a absorbe une part du coup, on le dit a cote du chiffre.
    if (perdu > 0 && (ev.armure || 0) > 0) chiffre(r, `−${ev.armure}${icone('Armor', 16)}`, COULEUR.armure, .6, 0);
  }

  function soin(ev, sig) {
    const n = noeudDe(ev.cible);
    if (!n || !(ev.soigne > 0)) return;
    const r = rectDe(n);
    chiffre(r, `+${ev.soigne}${icone('Heal', 22)}`, COULEUR.soin, 1);
    const art = sig && (sig.soin || sig.arrivee);
    if (art) lanceTout(art, [r], undefined, { noeud: n }); else etincelles(r, COULEUR.soin, 5);
  }

  function renfort(ev, rang, sig) {
    const n = noeudDe(ev.cible);
    if (!n) return;
    const r = rectDe(n);
    const morceaux = [];
    if (ev.atk) morceaux.push(`${ev.atk > 0 ? '+' : '−'}${Math.abs(ev.atk)}/`);
    else morceaux.push('+0/');
    morceaux.push(ev.hp ? `${ev.hp > 0 ? '+' : '−'}${Math.abs(ev.hp)}` : '+0');
    let texte = morceaux.join('');
    const ic = ev.cle && iconeDeCle(ev.cle);
    if (ic) texte += icone(ic, 20);
    chiffre(r, texte, COULEUR.renfort, .85, rang * 0);
    const art = sig && (sig.renfort || sig.arrivee);
    if (art) lanceTout(art, [r], undefined, { noeud: n }); else etincelles(r, COULEUR.renfort, 5);
  }

  /**
   * LA MORT (maquette du game designer, 19 oct. 2026) : la carte s'assombrit et son personnage laisse place au CRANE
   * (`mortMs`), puis elle VOLE jusqu'a la defausse de son camp en retrecissant (`mortVolMs`), qui sursaute en la
   * recevant. Un jeton n'a pas de carte : il s'efface sur place.
   */
  function mort(ev) {
    const f = F();
    const u = ev.unite;
    const env = fantomes.get(cle(u.camp, u.uid));
    if (!env) { libere(u); return; }
    const r = rectDe(env);
    eclair(r);
    const sg = signatureDe(idDe(u));
    if (sg && sg.mort) lanceTout(sg.mort, [r]);
    const carte = env.firstElementChild;
    if (carte) carte.classList.add('fx-morte');
    const crane = document.createElement('div');
    crane.className = 'fx-crane';
    crane.innerHTML = icone('Dead', Math.round(r.w * .62));
    env.appendChild(crane);
    anime(crane, [
      { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.2)', opacity: 1, offset: .5 },
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }
    ], { duration: T(Math.min(f.mortMs, 420)), easing: 'ease-out' });
    apres(f.mortMs, () => {
      const dest = u.jeton ? null : acces.defausse(u.camp);
      if (!dest) {
        anime(env, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.8)' }], { duration: T(f.mortVolMs), easing: 'ease-in' });
        apres(f.mortVolMs, () => { retireFantome(u.camp, u.uid); libere(u); });
        return;
      }
      const b = rectDe(dest);
      const tx = (b.x + b.w / 2) - (r.x + r.w / 2), ty = (b.y + b.h / 2) - (r.y + r.h / 2);
      const sc = Math.max(.2, Math.min(1, b.w / r.w));
      anime(env, [
        { transform: 'translate(0,0) scale(1) rotate(0deg)' },
        { transform: `translate(${tx * .15}px, ${ty * .15 - 18}px) scale(1.05) rotate(-6deg)`, offset: .2 },
        { transform: `translate(${tx}px, ${ty}px) scale(${sc}) rotate(0deg)` }
      ], { duration: T(f.mortVolMs), easing: 'cubic-bezier(.45,0,.7,1)' });
      apres(f.mortVolMs, () => {
        retireFantome(u.camp, u.uid);
        libere(u);
        anime(dest, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: .4 }, { transform: 'scale(1)' }], { duration: T(260), fill: 'none' });
      });
    });
  }

  /** La carte complete (ses effets) depuis le catalogue : la photo de l'evenement n'a que ses mots-cles. */
  function definition(c) {
    try { return cardById(c.id) || c; } catch { return c; }
  }

  /**
   * UNE CARTE ARRIVE EN MAIN (demande du game designer, 21 oct. 2026) : elle VOLE depuis l'endroit d'ou elle vient — la
   * pioche pour une pioche, la defausse, le plateau, la source de l'effet pour une carte creee — jusqu'a sa place dans la
   * main, et n'y apparait qu'en arrivant (`main-cachee`). Chez l'adversaire, un dos de carte vole vers son eventail.
   */
  function origineEnMain(ev) {
    const centreDu = n => (n ? rectDe(n) : rectDe(acces.milieu()));
    if (ev.t === 'pioche' || ev.de === 'pioche') return centreDu(acces.piocheDe ? acces.piocheDe(ev.camp) : acces.pioche());
    if (ev.de === 'defausse') return centreDu(acces.defausse(ev.camp));
    if (ev.de === 'plateau' && (ev.unites || [])[0]) {
      const u = ev.unites[0], p = photos.get(cle(u.camp, u.uid));
      if (p) return p.rect;
    }
    const src = ev.src && noeudDe(ev.src);
    return centreDu(src || null);
  }
  /**
   * Le vol d'une carte vers la main, en TROIS TEMPS (« comme Hearthstone », 21 oct. 2026) : de son origine au CENTRE
   * (`piocheMs`), montree en grand (`piocheTenueMs`), puis jusqu'a sa place (`piocheVersMainMs`). `rang` / `nb` : sa place
   * parmi les cartes arrivees ensemble, qui se montrent cote a cote. Un dos adverse ne rejoint l'eventail qu'en arrivant.
   */
  const dureeVersLaMain = f => f.piocheMs + f.piocheTenueMs + f.piocheVersMainMs;
  function versLaMain(ev, n, rang = 0, nb = 1) {
    const f = F();
    const finVol = () => {
      if (n) n.classList.remove('main-cachee');
      else if (acces.dosEnVol) acces.dosEnVol(-1);
    };
    const o = centreDe(origineEnMain(ev));
    const cible = n || (acces.mainDe ? acces.mainDe(ev.camp) : null);
    if (!cible) { finVol(); return; }
    const r = rectDe(cible);
    const d = document.createElement('div');
    if (n) {
      // Ta carte : son double, a sa taille, sans sa rotation d'eventail.
      d.className = n.className.replace(/\b(nouvelle|main-cachee|sel|no|visante|tiree)\b/g, '') + ' fx-vers-main';
      d.innerHTML = n.innerHTML;
      Object.assign(d.style, { width: n.offsetWidth + 'px', height: n.offsetHeight + 'px' });
    } else {
      // L'adversaire : un dos de carte, de la taille d'une de ses cartes en main. `bt-dos` : le MEME dos que son eventail,
      // que le skin dessine (le motif de cozy, le contour de juice) — sa propre classe le laissait en image brute.
      d.className = 'bt-dos fx-dos-vole';
      d.innerHTML = `<img src="${asset(acces.dos ? acces.dos() : '')}" alt="">`;
    }
    // `animation: none` : le double d'une carte jouable garderait le sautillement du skin (`juice-hop`) pendant son vol.
    Object.assign(d.style, { position: 'absolute', left: '0px', top: '0px', pointerEvents: 'none', animation: 'none' });
    acces.couche().appendChild(d);
    const w = d.offsetWidth || 40, h = d.offsetHeight || 52;
    const fin = { x: r.x + r.w / 2, y: n ? r.y + r.h / 2 : r.y + r.h * .35 };
    // Au centre : la largeur d'une carte jouee montree en grand, ou moins si les cartes arrivees ensemble ne tiennent pas.
    const m = centreDe(rectDe(acces.milieu()));
    const largeur = acces.racine().getBoundingClientRect().width * .94, ecart = 8;
    const s = Math.min(170 / w, (largeur - (nb - 1) * ecart) / (nb * w));
    const c = { x: m.x + (rang - (nb - 1) / 2) * (w * s + ecart), y: m.y };
    const pos = (p, sc, rot = 0) => `translate(${p.x - w / 2}px, ${p.y - h / 2}px) scale(${sc}) rotate(${rot}deg)`;
    const total = Math.max(1, dureeVersLaMain(f));
    anime(d, [
      { transform: pos(o, .35, -12), opacity: .4, easing: 'cubic-bezier(.2,.8,.3,1)' },
      { transform: pos(c, s, 0), opacity: 1, offset: f.piocheMs / total },
      { transform: pos(c, s * 1.04, 0), opacity: 1, offset: (f.piocheMs + f.piocheTenueMs) / total, easing: 'cubic-bezier(.5,0,.6,1)' },
      { transform: pos(fin, 1, 0), opacity: 1 }
    ], { duration: T(total) });
    apres(total, () => { d.remove(); finVol(); });
  }

  /** Une carte jouee : elle part de la main (ou du heros adverse), se montre au centre, puis va a sa destination. */
  function carteJouee(ev) {
    const f = F();
    const c = ev.carte;
    const d = document.createElement('div');
    d.className = `hcard fx-carte lancer${c.type === 'spell' ? ' spell' : ''}`;
    const cout = typeof ev.paye === 'number' ? ev.paye : c.cout;
    const def = definition(c);   // le texte d'effet ne s'affiche QUE sur la carte qu'on joue (pas en main, pas sur le terrain)
    d.innerHTML = `<div class="cost">${cout}</div>${c.sprite ? `<img src="${asset(c.sprite)}" alt="">` : ''}<div class="nm">${c.nom}</div>${ligneDePictos(def, { taille: 18, max: 4 })}<div class="tx">${def.text || ''}</div>${c.type === 'ally' ? `<div class="st">${c.atk}/${c.hp}</div>` : ''}`;
    const centre = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
    const o = centre(rectDe(ev.camp === 'p' ? acces.main() : acces.heros('e')));
    const m = centre(rectDe(acces.milieu()));
    const un = ev.carte.type === 'ally' ? [...acces.unites(ev.camp)].pop() : null;
    // Un allie va vers son plateau ; un sort, vers la defausse. Une unite qui n'est pas encore apparue ne prend pas de
    // place (`arrivante`) : on mesure celle qu'elle va prendre, sans la montrer (la mesure ne peint rien).
    const ou = n => {
      if (!n.classList.contains('arrivante')) return rectDe(n);
      n.classList.remove('arrivante');
      const r = rectDe(n);
      n.classList.add('arrivante');
      return r;
    };
    const dest = centre(un ? ou(un) : rectDe(acces.defausse(ev.camp)));
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

  // LA CARTE-EFFET : ce qu'une unite fait SANS qu'on joue de carte (rale d'agonie, debut/fin de tour, « quand X alors Y »)
  // se montre comme une carte, au CONTOUR DIFFERENT (comme Arena) : gris-rouge pour la mort, vert pour le debut de
  // ton tour, bleu pour la fin, violet pour une regle « quand ». Ses pictogrammes sont ceux de ce qu'elle a provoque.
  const MOMENT_EFFET = { death: ['mort', 'Deathrattle'], turnStart: ['debut', 'TurnStart'], turnEnd: ['fin', 'TurnEnd'] };
  const ICONE_EVT = {
    degats: e => ['Damage', e.perdu > 1 ? e.perdu : null], soin: e => ['Heal', e.soigne > 1 ? e.soigne : null],
    renfort: () => ['Buff', null], invoque: () => ['Summon', null], pioche: () => ['Draw', null], piste: () => ['Track', null], toxine: () => ['Venom', null], toxineSaut: () => ['Venom', null], classe: () => ['Fatigue', null], registre: () => ['Registry', null],
    armure: e => ['Armor', e.v > 1 ? e.v : null], mana: e => ['Mana', e.v > 1 ? e.v : null],
    detruit: () => ['Destroy', null], controle: () => ['Control', null],
    transforme: e => [e.mode === 'copie' ? 'Copy' : 'Switch', null],
    deplace: e => [{ melange: 'Shuffle', cree: 'Create', appat: 'Create', exil: 'Exile', meule: 'Mill', defausse: 'Mill', renvoi: 'Return' }[e.mode] || 'Trigger', null]
  };
  function carteEffet(ev, enfants) {
    const f = F();
    const [classe, momentIcone] = MOMENT_EFFET[ev.moment] || ['regle', String(ev.moment).startsWith('on_') ? 'Watch' : 'Trigger'];
    const vus = new Set();
    const pics = [];
    for (const e of enfants) {
      const fn = ICONE_EVT[e.t];
      if (!fn) continue;
      const [nom, n] = fn(e);
      if (!vus.has(nom + n)) { vus.add(nom + n); pics.push(`<span class="pc">${icone(nom, 18)}${n !== null ? `<b>${n}</b>` : ''}</span>`); }
    }
    const u = ev.src;
    const d = document.createElement('div');
    d.className = `hcard fx-carte effet ${classe}`;
    d.innerHTML = `${u.sprite ? `<img src="${asset(u.sprite)}" alt="">` : ''}<div class="nm">${u.nom}</div><div class="pic"><span class="pc">${icone(momentIcone, 20)}</span>${pics.slice(0, 3).join('')}</div>`;
    const centre = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
    const noeud = noeudDe(u);
    const o = noeud ? centre(rectDe(noeud)) : centre(rectDe(acces.milieu()));
    const m = centre(rectDe(acces.milieu()));
    acces.couche().appendChild(d);
    const tr = (p, s) => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${s})`;
    const total = f.effetVolMs + f.effetTenueMs + f.effetSortieMs;
    anime(d, [
      { transform: tr(o, .5), opacity: 0 },
      { transform: tr(m, 1.35), opacity: 1, offset: f.effetVolMs / total, easing: 'ease-in-out' },
      { transform: tr(m, 1.4), opacity: 1, offset: (f.effetVolMs + f.effetTenueMs) / total, easing: 'ease-in' },
      { transform: tr(m, .6), opacity: 0 }
    ], { duration: T(total), easing: 'cubic-bezier(.2,.8,.3,1)' });
    ephemere(d, total);
    marque(total);
  }

  /** METAMORPHOSE (copie) : les unites touchees se REPLIENT et disparaissent, puis REVIENNENT transformees (le noeud montre deja leur nouveau visage). */
  function metamorphose(unites) {
    const f = F();
    for (const u of unites) {
      const n = acces.unite(u.camp, u.uid);
      if (!n || caches.has(n)) continue;   // pas encore la : son pop la montrera
      lance('souffle', { couleur: '#8fe9ff' }, [rectDe(n)]);
      anime(n, [{ transform: 'scale(1) rotate(0deg)', opacity: 1 }, { transform: 'scale(.15) rotate(25deg)', opacity: 0 }], { duration: T(f.metaOutMs), easing: 'ease-in', fill: 'forwards' });
      apres(f.metaOutMs, () => { n.getAnimations().forEach(an => an.cancel()); n.style.visibility = 'hidden'; caches.add(n); });
      apres(f.metaOutMs + f.metaTenueMs, () => pop(u.camp, u.uid, { entree: ['facettes', {}] }));
    }
  }

  /** SWITCH d'une unite : elle se retourne comme une carte et montre son autre face. */
  function retourne(unite) {
    const n = acces.unite(unite.camp, unite.uid);
    if (!n) return;
    anime(n, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)', offset: .5 }, { transform: 'scaleX(1)' }], { duration: T(460), easing: 'ease-in-out', fill: 'none' });
    lance('facettes', {}, [rectDe(n)]);
  }

  /** Ce que fait l'unite qui ATTAQUE, selon sa carte (traînee, fantome, venin…). */
  function lanceAttaque(nom, options, ev) {
    const n = noeudDe(ev.src), nc = noeudDe(ev.cible);
    if (!n || !nc) return;
    lance(nom, { ...(options || {}), noeud: n }, [rectDe(nc)], centreDe(rectDe(n)));
  }

  /** L'arrivee d'une unite : elle rebondit, avec un petit nuage d'eclats. */
  function pop(camp, uid, sig) {
    const f = F();
    const n = acces.unite(camp, uid);
    if (!n) return;
    montre(n);
    // Le rectangle AVANT le rebond : mesure apres, il etait celui d'une carte a 15 % de sa taille, et toute animation
    // d'arrivee (la gerbe de flammes de l'Eclaireur Fou…) restait dans la carte au lieu d'en sortir (21 oct. 2026).
    const r = rectDe(n);
    anime(n, [
      { transform: 'scale(.15)', opacity: 0 },
      { transform: 'scale(1.3)', opacity: 1, offset: .55 },
      { transform: 'scale(.92)', offset: .78 },
      { transform: 'scale(1)', opacity: 1 }
    ], { duration: T(f.popMs), easing: 'ease-out', fill: 'none' });
    if (sig && sig.entree) lanceTout(sig.entree, [r], undefined, { noeud: n }); else etincelles(r, '#ffe8a8', 8);
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
    const mesMorts = lot.filter(ev => ev.t === 'meurt').map(ev => ev.unite);
    for (const u of mesMorts) faitFantome(u.camp, u.uid);
    acces.racine().style.setProperty('--fx-k', reglage.ralenti / reglage.vitesse);
    // Les cartes qui arrivent en MAIN (ta main) : chaque evenement retrouve SA carte parmi les nouvelles (par exemplaire,
    // sinon par nom), qui reste cachee jusqu'a ce que son vol l'y depose (`versLaMain`).
    const enMain = new Map();   // indice d'evenement -> [noeuds] (une carte par carte deplacee)
    const mesMains = [];
    {
      const libres = acces.nouvellesEnMain ? acces.nouvellesEnMain() : [];
      const prend = c => {
        let i = c.inst ? libres.findIndex(x => x.dataset.inst === c.inst) : -1;
        if (i < 0) i = libres.findIndex(x => x.dataset.nom === c.nom);
        return i < 0 ? null : libres.splice(i, 1)[0];
      };
      for (const ev of lot) {
        const cartes = ev.t === 'pioche' && !ev.perdue ? [ev.carte] : ev.t === 'deplace' && ev.vers === 'main' ? (ev.cartes || []) : null;
        if (!cartes) continue;
        const noeuds = ev.camp === 'p' ? cartes.map(prend) : cartes.map(() => null);
        for (const n of noeuds) if (n) { n.classList.remove('nouvelle'); n.classList.add('main-cachee'); mesMains.push(n); }
        // Chez l'adversaire, l'eventail ne montre pas encore les dos qui volent (`versLaMain` les y rend un a un).
        if (ev.camp !== 'p' && acces.dosEnVol) acces.dosEnVol(noeuds.length);
        enMain.set(ev.i, noeuds);
      }
    }
    // Une unite qui arrive reste cachee jusqu'a ce que sa carte la depose (`pop`).
    const mesCaches = [];
    for (const ev of lot) {
      if (ev.t !== 'invoque') continue;
      const n = acces.unite(ev.unite.camp, ev.unite.uid);
      if (n) { cache(n); mesCaches.push(n); }
    }
    // Les PV de ceux que ce film frappe ou soigne restent ceux d'AVANT jusqu'a l'impact (`montrePv`). Deja tenus par un
    // film precedent, ils gardent ce qu'il montre : ses coups a lui les feront descendre d'abord.
    const monFilm = ++film;
    for (const ev of lot) {
      if (ev.t !== 'degats' && ev.t !== 'soin') continue;
      const c = clePv(ev.cible);
      if (!c || typeof ev.avant !== 'number' || !acces.pv) continue;
      const k = cle(c.camp, c.uid);
      if (!pvTenus.has(k)) acces.pv(c.camp, c.uid, ev.avant);
      pvTenus.set(k, { ...c, film: monFilm });
    }
    // Sans elles, le plateau se remet a l'echelle (ui/battle.js l'avait mesure avec).
    if (acces.ajuste) for (const camp of ['p', 'e']) acces.ajuste(camp);

    // La file : un film qui arrive pendant qu'un autre joue attend la fin du precedent (les chiffres ne
    // se melangent pas), mais jamais plus de `fileMaxMs` : l'ecran ne traine pas derriere le joueur.
    const retard = Math.min(f.fileMaxMs, Math.max(0, (fin - Date.now()) * reglage.vitesse / reglage.ralenti));
    auraAt = retard;
    // Ceux dont un evenement du lot explique deja les chiffres : pas d'effet d'aura en plus.
    const couverts = new Set();
    for (const ev of lot) {
      if (['degats', 'soin', 'renfort'].includes(ev.t) && ev.cible && ev.cible.uid) couverts.add(cle(ev.cible.camp, ev.cible.uid));
      if (ev.t === 'invoque') couverts.add(cle(ev.unite.camp, ev.unite.uid));
      if (ev.t === 'transforme' || ev.t === 'controle') for (const u of ev.unites || (ev.unite ? [ev.unite] : [])) couverts.add(cle(u.camp, u.uid));
    }
    const sigs = new Map();         // indice d'une carte jouee -> sa signature (ui/vfx.js), pour ce qu'elle cause
    let t = retard;                 // l'horloge du film
    const impact = new Map();       // indice d'evenement -> heure du coup
    const finMorts = new Map();     // « camp:uid » -> quand sa mort est finie (la carte a rejoint sa defausse)
    let groupe = null;              // le dernier groupe (meme cause, meme type) : { cause, t, type }
    let libre = t;                  // quand l'ecran est libre pour l'action suivante (attaquant revenu, morts rangees)
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
          // Une attaque attend que la precedente soit revenue a sa place : on suit un coup a la fois.
          t = Math.max(t, libre);
          const da = dureesAttaque();
          apres(t, () => elan(ev.src, ev.cible));
          // Ce que SA CARTE fait quand elle attaque : traînee de vitesse (Charge), rémanence fantome (Passe-Murailles), venin a l'impact.
          const sa = signatureDe(idDe(ev.src));
          if (sa && sa.attaque) {
            const liste = Array.isArray(sa.attaque[0]) ? sa.attaque : [sa.attaque];
            const tImpact = t + da.impact;
            const tCharge = t + f.attaqueReculMs + f.attaqueTenueMs;
            for (const [nom, opt] of liste) apres(opt && opt.quand === 'impact' ? tImpact : tCharge, () => lanceAttaque(nom, opt, ev));
          }
          libre = t + da.total;
          marque(libre);
          t += da.impact;
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
          apres(at, () => { montrePv(ev); coup(ev, sigs.get(ev.cause)); });
          marque(at + f.secousseMs);
          break;
        }
        case 'joue': {
          t = Math.max(t, libre);
          apres(t, () => carteJouee(ev));
          t += f.volMs + f.tenueMs;
          // Un ALLIE : son unite n'apparait qu'une fois la carte arrivee sur le plateau (sinon on la voyait avant la fin
          // du vol, 21 oct. 2026) — son lancer et ses effets viennent apres.
          if (ev.carte.type === 'ally') t += f.sortieMs;
          // Sa signature : ce qui PART de la carte, des qu'elle s'est montree au centre.
          const sig = signatureDe(ev.carte.id);
          if (sig) {
            sigs.set(ev.i, sig);
            if (sig.lancer) { apres(t, () => lanceTout(sig.lancer, visees(sig, ev), pointDe(sig, ev))); t += arriveeDe(sig.lancer, visees(sig, ev), pointDe(sig, ev)); }
          }
          if (auraAt === retard) auraAt = t;
          groupe = null;
          break;
        }
        case 'declenche': {
          // Un RALE D'AGONIE attend que son unite ait fini de mourir (sa carte a rejoint la defausse et sa place est
          // liberee) : sinon le jeton qu'il invoque apparaissait pendant qu'elle mourait encore (21 oct. 2026).
          if (ev.moment === 'death' && ev.src) {
            const fm = finMorts.get(cle(ev.src.camp, ev.src.uid));
            if (fm) t = Math.max(t, fm);
          }
          // Les pictogrammes viennent de ce que ce declenchement a provoque (ses enfants dans le recit).
          const enfants = lot.filter(e => e.cause === ev.i);
          // Une regle « quand X » : l'oeil de sa carte s'ouvre D'ABORD (lentement : « il faut etre beaucoup plus lent sur
          // les triggers », game designer), puis la carte-effet dit ce qu'elle fait ; l'oeil se referme apres.
          const veille = String(ev.moment).startsWith('on_');
          const ouvre = veille ? OEIL.length * f.oeilPasMs : 0;
          if (veille) apres(t, () => oeil(ev, f.effetVolMs + f.effetTenueMs + f.effetSortieMs));
          t += ouvre;
          apres(t, () => carteEffet(ev, enfants));
          // Et l'animation de CE moment-la, propre a la carte : son rale d'agonie, son debut de tour, sa regle.
          const sg = signatureDe(idDe(ev.src));
          const sub = sg && sg.declenche && (sg.declenche[ev.moment] || (String(ev.moment).startsWith('on_') ? sg.declenche.regle : null));
          if (sub) {
            sigs.set(ev.i, sub);
            if (sub.lancer) apres(t + f.effetVolMs, () => {
              const n = noeudDe(ev.src);
              // Un coup tire au hasard vise sa VRAIE victime : le lancer va la ou les degats tombent, pas vers le heros par defaut.
              const touches = /^ennemis?$/.test(sub.vers || '') ? enfants.filter(e => e.t === 'degats' && e.cible).map(e => noeudDe(e.cible)).filter(Boolean).map(rectDe) : [];
              lanceTout(sub.lancer, touches.length ? touches : visees(sub, ev), n ? centreDe(rectDe(n)) : undefined);
            });
          }
          // La suite attend que la carte-effet ait ete LUE (toute sa tenue), puis l'arrivee de son lancer (parti a `effetVolMs`).
          t += f.effetVolMs + Math.max(f.effetTenueMs + (sub && sub.lancer ? f.lancerMs * .6 : 0), sub && sub.lancer ? arriveeDe(sub.lancer, visees(sub, ev)) : 0);
          if (veille) marque(t + f.effetSortieMs + OEIL.length * f.oeilPasMs);
          groupe = null;
          break;
        }
        case 'invoque': {
          const at = heure(ev);
          apres(at, () => pop(ev.unite.camp, ev.unite.uid, sigs.get(ev.cause)));
          // L'action suivante (une attaque — Charge —, une carte, le tour) attend la fin de son animation d'arrivee : sinon
          // l'Eclaireur Fou attaquait en pleine gerbe de flammes (« laisse un peu le temps aux choses », 21 oct. 2026).
          const sigE = sigs.get(ev.cause), nE = acces.unite(ev.unite.camp, ev.unite.uid);
          if (sigE && sigE.entree && nE) libre = Math.max(libre, at + dureeDe(sigE.entree, [rectDe(nE)]));
          // Une unite a AURA : son onde couvre le plateau et n'eclaire que ceux qu'elle touche vraiment (`ondeAura`) ; le
          // halo qui reste est du CSS (`.halo-aura`). La signature (`aura`) n'en donne que la couleur.
          const own = signatureDe(idDe(ev.unite));
          if (own && own.aura) {
            apres(at + f.popMs * .7, () => {
              const n = acces.unite(ev.unite.camp, ev.unite.uid);
              if (!n) return;
              ondeAura(n, touchesDe(n), couleurAura(idDe(ev.unite)));
            });
            marque(at + f.popMs * .7 + f.auraOndeMs + f.auraTenueMs + f.auraSortieMs);
          }
          marque(at + f.popMs);
          break;
        }
        case 'transforme': {
          if (ev.mode === 'copie' && (ev.unites || []).length) {
            apres(t, () => metamorphose(ev.unites));
            t += f.metaOutMs + f.metaTenueMs + f.popMs * .5;
          } else if (ev.mode === 'switch' && ev.unite) {
            apres(t, () => retourne(ev.unite));
            t += 460;
          }
          groupe = null;
          break;
        }
        case 'tour': {
          t = Math.max(t, libre);
          apres(t, () => banniere(ev));
          t += f.banniereAvanceMs;
          groupe = null;
          break;
        }
        case 'armure': {
          if (!(ev.v > 0)) break;
          const at = heure(ev);
          apres(at, () => gainHeros(ev.camp, `+${ev.v}${icone('Armor', 22)}`, COULEUR.armure));
          marque(at + f.chiffreMs * .5);
          break;
        }
        case 'mana': {
          if (!(ev.v > 0)) break;
          const at = heure(ev);
          apres(at, () => gainHeros(ev.camp, `+${ev.v}${icone('Mana', 22)}${ev.promis ? icone('TurnStart', 18) : ''}`, COULEUR.mana));
          marque(at + f.chiffreMs * .5);
          break;
        }
        case 'pioche':
        case 'deplace': {
          const noeuds = enMain.get(ev.i);
          if (!noeuds) break;
          // Plusieurs cartes d'un coup (la main de depart, « pioche 3 ») partent l'une apres l'autre et se montrent cote a
          // cote au centre : le groupe (meme cause, meme camp) les compte, et chacune lit le total en partant.
          if (!(groupe && groupe.cause === ev.cause && groupe.type === 'main' && groupe.camp === ev.camp)) {
            t = Math.max(t, libre);
            groupe = { cause: ev.cause, type: 'main', camp: ev.camp, t, n: 0 };
          }
          const g = groupe;
          for (const n of noeuds) {
            const rang = g.n++;
            const at = g.t + rang * f.piocheDecalageMs;
            apres(at, () => versLaMain(ev, n, rang, g.n));
            // Le centre est pris jusqu'a ce que la carte le quitte ; l'action suivante attend qu'elle soit dans la main.
            t = Math.max(t, at + f.piocheMs + f.piocheTenueMs);
            libre = Math.max(libre, at + dureeVersLaMain(f));
            marque(at + dureeVersLaMain(f));
          }
          break;
        }
        case 'soin': { const at = heure(ev); apres(at, () => { montrePv(ev); soin(ev, sigs.get(ev.cause)); }); marque(at + f.chiffreMs * .5); break; }
        case 'renfort': { const at = heure(ev); apres(at, () => renfort(ev, 0, sigs.get(ev.cause))); marque(at + f.chiffreMs * .5); break; }
        case 'meurt': {
          const base = impact.has(ev.cause) ? impact.get(ev.cause) : t;
          const at = base + f.mortDelaiMs;
          apres(at, () => mort(ev));
          finMorts.set(cle(ev.unite.camp, ev.unite.uid), at + f.mortMs + f.mortVolMs);
          // La suite attend que la carte morte ait rejoint sa defausse : on la voit partir.
          libre = Math.max(libre, at + f.mortMs + f.mortVolMs);
          t = Math.max(t, at + f.mortMs * .5);
          marque(at + f.mortMs + f.mortVolMs);
          break;
        }
        default: break;
      }
    }
    auras(couverts);
    t = Math.max(t, libre);
    marque(t);
    // Un fantome oublie (sa mort n'a pas ete jouee) ne reste pas : on le retire a la fin du film. Seulement CEUX DE CE
    // FILM : le film suivant a souvent deja commence, et balayer tous les fantomes effacait ses morts avant leur crane.
    // Pareil pour les unites cachees : seulement CELLES DE CE FILM — montrer tout `caches` faisait apparaitre le jeton du
    // film suivant (un rale d'agonie) avant que son unite ait fini de mourir.
    apres(t + f.mortMs, () => {
      for (const n of mesCaches) if (caches.has(n)) montre(n);
      for (const n of mesMains) n.classList.remove('main-cachee');
      for (const u of mesMorts) { retireFantome(u.camp, u.uid); libere(u); }
      // Les PV que CE film tenait reviennent a ceux du moteur (un film suivant qui les a repris les rendra lui-meme).
      for (const [k, p] of pvTenus) if (p.film === monFilm) { pvTenus.delete(k); acces.pv(p.camp, p.uid, null); }
    });
    return t;
  }

  return {
    photo, joue, reglage, montre: (nom, options) => reglage.montre(nom, options),
    /** Combien de temps (ms reelles) avant la fin du film en cours. */
    reste: () => Math.max(0, fin - Date.now()),
    get vitesse() { return reglage.vitesse; },
    /**
     * Passe au cran de vitesse suivant (x1 -> x2 -> x4 -> x1) et le retient. `rejeu` : « Revoir le combat » a un cran de
     * plus (`vitesseRejeu`, x8), qui n'existe que la et ne se retient pas.
     */
    cycleVitesse(rejeu = false) {
      const v = rejeu && F().vitesseRejeu ? [...F().vitesses, F().vitesseRejeu] : F().vitesses;
      reglage.vitesse = v[(v.indexOf(reglage.vitesse) + 1) % v.length];
      if (!F().vitesses.includes(reglage.vitesse)) return reglage.vitesse;
      try { localStorage.setItem(CLE_VITESSE, String(reglage.vitesse)); } catch { /* stockage refuse : tant pis */ }
      return reglage.vitesse;
    },
    /** En sortant d'un rejeu : un cran qui lui est propre (x8) redevient la vitesse retenue. */
    remetVitesse() { if (!F().vitesses.includes(reglage.vitesse)) reglage.vitesse = lisVitesse(); },
    /** Les `n` premiers evenements sont deja passes (un rejeu qui saute a un tour) : on ne les joue pas. */
    saute(n) { vu = n; },
    /** Interrompt tout (nouveau combat, fin de combat). */
    vide() {
      for (const id of minuteurs) clearTimeout(id);
      minuteurs.clear();
      for (const env of fantomes.values()) env.remove();
      fantomes.clear();
      for (const n of caches) { n.style.visibility = ''; n.classList.remove('arrivante'); }
      caches.clear();
      for (const n of enElan) n.style.visibility = '';
      enElan.clear();
      if (acces.dosEnVol) acces.dosEnVol(-Infinity);   // plus aucun dos en vol : l'eventail montre toute la main
      for (const p of pvTenus.values()) acces.pv(p.camp, p.uid, null);   // et les PV, ceux du moteur
      pvTenus = new Map();
      photos = new Map();
      fin = 0;
      vu = 0;
    }
  };
}
