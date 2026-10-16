// LE SOL ET LE DECOR DE LA CARTE — le pack « B+ » (decision du game designer, 16 octobre 2026 ; docs/PACKS-CARTE.md).
// Kenney Medieval RTS (herbe, eau, neige, arbres, rochers) + Kenney Foliage Pack (fleurs, touffes, buissons, arbres
// ronds et d'automne, sapins enneiges), tous deux CC0, et tout ce qui est dessine CERNE du contour brun presque noir
// des batiments et du skin juice. Le contour n'est pas dans les images : il est ajoute au rendu (`CONTOUR`).
// « Rajoute du foliage, c'est trop terne sinon » (le game designer, meme jour) : l'herbe libre est semee de fleurs, de
// touffes et de buissons, plus dense en lisiere des chemins et dans les bois.
//
// Les chemins, l'eau, la neige et le bois sombre sont des COUCHES tracees par quarts de case (le pack n'a que des
// routes d'une case de large ; les notres en font trois) : coins saillants arrondis, conges dans les coins rentrants.
// Ce n'est que du dessin : rien ici ne decide ou l'on peut marcher (BLOCKED, config/world.js).
//
// Utilise par draw() (ui/overworld.js) et par le prototype game/carte-packs.html.

import { TILE as T } from '../config/world.js';

const RTS = 'Decor/Kenney Medieval RTS/', FOL = 'Decor/Kenney Foliage Pack/';
const tuileRts = n => `${RTS}medievalTile_${n}.png`;
const envRts = n => `${RTS}medievalEnvironment_${String(n).padStart(2, '0')}.png`;
const fol = n => `${FOL}foliagePack_${String(n).padStart(3, '0')}.png`;

/**
 * Le contour : 3 px, le brun des batiments et de juice.css. `null` = sans contour (le pack B). Il cerne le sol (chemins, eau,
 * neige), les arbres et les rochers — PAS le feuillage (fleurs, touffes, buissons, troncs) : decision du game designer du
 * 16 octobre 2026. Le PIED d'un tronc ou d'un rocher n'est pas cerne non plus : il sort du sol au lieu d'y etre pose.
 */
export const CONTOUR = { ep: 3, couleur: '#2a1a12' };

// Les couleurs du pack (relevees sur ses tuiles) : la route, sa bordure sans contour, l'ecume de l'eau, le bord de la neige.
const TERRE = '#d9a24d', BORD_TERRE = '#219853', BORD_EAU = '#e9f8ff', BORD_NEIGE = '#bfe3f2', HERBE = '#27ae60';
const CAILLOUX = ['#c48a3a', '#e8b766'];

// LE DECOR. Chaque entree : [image, hauteur VISIBLE en cases] (les marges transparentes ne comptent pas).
const ARBRES = {
  herbe: [[fol(6), 1.5], [fol(7), 1.5], [fol(8), 1.45], [fol(9), 1.5], [fol(10), 1.6], [fol(37), 1.4], [fol(38), 1.5],
    [fol(39), 1.4], [fol(40), 1.45], [fol(41), 1.55], [envRts(1), 1.45], [envRts(21), 1.3]],
  bois: [[envRts(3), 1.5], [envRts(2), 1.0], [fol(4), 1.5], [fol(5), 1.6], [fol(36), 1.5], [fol(12), 1.5], [fol(13), 1.5],
    [fol(15), 1.5], [fol(16), 1.6]],
  neige: [[fol(27), 1.5], [fol(28), 1.6], [fol(29), 1.5], [fol(30), 1.4], [fol(31), 1.5], [fol(32), 1.5]]
};
const ROCHERS = {
  herbe: [[envRts(7), .6], [envRts(8), .6], [envRts(14), .55], [fol(53), .7], [fol(55), .65], [fol(56), .7], [fol(57), .55], [fol(58), .65]],
  neige: [[fol(59), .7], [fol(60), .55], [fol(61), .65]]
};
const BUISSONS = [[fol(49), .55], [fol(50), .42], [fol(51), .42], [fol(52), .3], [envRts(12), .45], [envRts(19), .45]];
const FLEURS = [[fol(1), .5], [fol(2), .5], [fol(3), .5], [fol(62), .5]];
const TOUFFES = [[fol(18), .45], [fol(19), .45], [fol(20), .45], [fol(21), .4]];
// (La petite souche du pack, medievalEnvironment_04, se lisait comme une flamme : ecartee.)
const DIVERS = [[envRts(5), .24]];

// LE FEUILLAGE SEME sur une case libre (ni chemin, ni eau, ni point d'interet a cote), par sol : la part des cases qui
// recoivent un buisson, une fleur (parfois deux), une touffe, une souche ou un tronc. En lisiere d'un chemin, les touffes
// et les fleurs sont plus nombreuses (`lisiere` s'ajoute).
const SEMIS = {
  herbe: { buisson: .09, fleur: .14, touffe: .18, divers: .015 },
  bois: { buisson: .14, fleur: .04, touffe: .24, divers: .03 },
  neige: { rocher: .04 },
  lisiere: { fleur: .12, touffe: .2 }
};

/** Toutes les images du pack : a precharger. */
export const IMAGES_SOL = [...new Set([
  tuileRts(27), tuileRts(29), tuileRts(57), tuileRts(58),
  ...[ARBRES.herbe, ARBRES.bois, ARBRES.neige, ROCHERS.herbe, ROCHERS.neige, BUISSONS, FLEURS, TOUFFES, DIVERS].flat().map(e => e[0])
])];

// Hasard fixe par case : le meme dessin a chaque image.
const hasard = (x, y, k = 0) => ((((x * 73856093) ^ (y * 19349663) ^ (k * 83492791)) >>> 0) % 1000) / 1000;
const choisis = (liste, x, y, k) => liste[Math.floor(hasard(x, y, k) * liste.length)];

/**
 * Le sol d'une carte.
 * `tuile(x, y)` : le code TILE d'une case (hors de la carte : ce que la carte veut, l'eau pour le jeu).
 * `points` : les points d'interet `{ x, y, grand }` ; on ne seme rien sur eux (un `grand` = un batiment : sa facade aussi).
 * `img(chemin)` : une image (chargee ou en cours) ; rien n'est dessine tant qu'elle n'est pas prete.
 * `contour` : `CONTOUR` par defaut, `null` pour le pack sans contour.
 */
export function creeSol({ tuile, points = [], img, contour = CONTOUR }) {
  const pret = chemin => { const i = img(chemin); return i && i.complete && i.naturalWidth ? i : null; };
  const estTerre = (x, y) => { const t = tuile(x, y); return t === T.PATH || t === T.SAND; };
  const estEau = (x, y) => tuile(x, y) === T.WATER;
  // Le sol sous un arbre ou un rocher : celui de ses voisins (bois sombre, neige), l'herbe sinon.
  const solSous = (x, y) => {
    const t = tuile(x, y);
    if (t !== T.TREE && t !== T.ROCK && t !== T.BUSH) return t;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const v = tuile(x + dx, y + dy);
      if (v === T.DARK || v === T.SNOW) return v;
    }
    return T.GRASS;
  };
  // Une couche du dessous (neige, bois, eau) passe SOUS la case de chemin qui la touche : sinon les deux arrondissent
  // leurs coins l'un contre l'autre et laissent voir l'herbe entre eux.
  const voisin = (est, x, y) => est(x + 1, y) || est(x - 1, y) || est(x, y + 1) || est(x, y - 1);
  const dessous = est => (x, y) => est(x, y) || ((estTerre(x, y) || estEau(x, y)) && voisin(est, x, y));
  const estNeige = dessous((x, y) => solSous(x, y) === T.SNOW);
  const estBois = dessous((x, y) => solSous(x, y) === T.DARK);
  const coucheEau = (x, y) => estEau(x, y) || (estTerre(x, y) && voisin(estEau, x, y));

  // Les clairieres : rien n'est seme sur un point d'interet ni devant ; un batiment garde aussi sa facade.
  const libre = new Set();
  for (const p of points) {
    const [ax, bx, ay, by] = p.grand ? [-2, 2, -3, 1] : [-1, 1, -1, 1];
    for (let dy = ay; dy <= by; dy++) for (let dx = ax; dx <= bx; dx++) libre.add((p.x + dx) + ',' + (p.y + dy));
  }

  // Motifs (eau, neige) : une toile par taille, un motif par contexte.
  const motifs = new Map();
  function motif(ctx, chemin, taille) {
    const im = pret(chemin);
    if (!im) return null;
    const cle = chemin + '|' + taille;
    let m = motifs.get(cle);
    if (!m || m.ctx !== ctx) {
      const c = document.createElement('canvas');
      c.width = c.height = Math.max(1, Math.round(taille));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      m = { ctx, pat: ctx.createPattern(c, 'repeat') };
      motifs.set(cle, m);
    }
    return m.pat;
  }

  function dessine(ctx, vue) {
    const { x0, x1, y0, y1, ts, camx, camy, t = 0 } = vue;
    const herbe = [pret(tuileRts(57)), pret(tuileRts(58))];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const sx = Math.round(x * ts - camx), sy = Math.round(y * ts - camy);
      const im = herbe[hasard(x, y, 1) < .5 ? 0 : 1];
      if (im) ctx.drawImage(im, sx, sy, ts + 1, ts + 1);
      else { ctx.fillStyle = HERBE; ctx.fillRect(sx, sy, ts + 1, ts + 1); }
    }
    const ep = contour ? contour.ep : Math.max(2, ts * .07);
    const bord = b => (contour ? contour.couleur : b);
    couche(ctx, estBois, vue, { fond: 'rgba(0,52,30,.28)' });
    const neige = motif(ctx, tuileRts(29), ts * 2);
    if (neige) neige.setTransform(new DOMMatrix().translate(-camx % (ts * 2), -camy % (ts * 2)));
    couche(ctx, estNeige, vue, { fond: neige || '#e7f9ff', bord: bord(BORD_NEIGE), ep });
    // L'eau derive doucement (6 px par seconde) : la carte n'est pas une photo.
    const eau = motif(ctx, tuileRts(27), ts * 2);
    if (eau) eau.setTransform(new DOMMatrix().translate((-camx + t / 1000 * 6) % (ts * 2), -camy % (ts * 2)));
    couche(ctx, coucheEau, vue, { fond: eau || '#a6e1f5', bord: bord(BORD_EAU), ep });
    couche(ctx, estTerre, vue, { fond: TERRE, bord: bord(BORD_TERRE), ep });
    // Quelques cailloux au milieu des chemins (jamais au bord : ils deborderaient des coins arrondis).
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!estTerre(x, y) || hasard(x, y, 6) > .22 || !(estTerre(x + 1, y) && estTerre(x - 1, y) && estTerre(x, y + 1) && estTerre(x, y - 1))) continue;
      ctx.fillStyle = CAILLOUX[hasard(x, y, 7) < .6 ? 0 : 1];
      ctx.beginPath();
      ctx.ellipse(x * ts - camx + ts * (.2 + hasard(x, y, 8) * .6), y * ts - camy + ts * (.2 + hasard(x, y, 9) * .6), ts * .07, ts * .045, 0, 0, 7);
      ctx.fill();
    }
  }

  /**
   * Les objets d'une case (arbres, rochers, feuillage), a trier avec les batiments et le joueur : chacun dit ou sont
   * ses pieds (`pieds`, en cases depuis le haut de la case). Vide tant que les images ne sont pas pretes.
   */
  function objets(x, y, ts) {
    const out = [];
    // `cerne` : l'objet prend le contour (arbres, rochers) ; le feuillage, non. `piedLibre` : sauf sous son pied (arbres, rochers).
    const pose = (entree, k, decale = .3, cerne = false, piedLibre = false) => {
      const im = pret(entree[0]);
      if (!im) return;
      const dx = (hasard(x, y, k + 10) - .5) * ts * decale * 2, dy = (hasard(x, y, k + 20) - .5) * ts * .3;
      out.push({ im, haut: entree[1] * ts, dx, dy, pieds: .92 + dy / ts, cerne, piedLibre });
    };
    const t = tuile(x, y), sol = solSous(x, y);
    const nom = sol === T.DARK ? 'bois' : sol === T.SNOW ? 'neige' : 'herbe';
    if (t === T.TREE) { pose(choisis(ARBRES[nom], x, y, 2), 0, .12, true, true); return out; }
    if (t === T.ROCK) { pose(choisis(ROCHERS[nom === 'neige' ? 'neige' : 'herbe'], x, y, 2), 0, .15, true, true); return out; }
    if (t === T.BUSH) { pose(choisis(BUISSONS, x, y, 2), 0); return out; }
    if (t !== T.GRASS && t !== T.DARK && t !== T.SNOW) return out;
    if (libre.has(x + ',' + y)) return out;
    const s = SEMIS[nom], l = voisin(estTerre, x, y) ? SEMIS.lisiere : {};
    if (s.rocher && hasard(x, y, 3) < s.rocher) pose(choisis(ROCHERS.neige, x, y, 4), 1, .3, true, true);
    if (s.buisson && hasard(x, y, 3) < s.buisson) pose(choisis(BUISSONS, x, y, 4), 1);
    const fleur = (s.fleur || 0) + (l.fleur || 0), touffe = (s.touffe || 0) + (l.touffe || 0);
    if (hasard(x, y, 5) < fleur) {
      pose(choisis(FLEURS, x, y, 6), 2);
      if (hasard(x, y, 7) < .4) pose(choisis(FLEURS, x, y, 8), 3);
    }
    if (hasard(x, y, 9) < touffe) pose(choisis(TOUFFES, x, y, 11), 4);
    if (s.divers && hasard(x, y, 12) < s.divers) pose(choisis(DIVERS, x, y, 13), 5);
    return out;
  }

  /** Dessine un objet rendu par `objets()` sur la case dont le coin haut-gauche est (sx, sy) a l'ecran. */
  function dessineObjet(ctx, o, sx, sy, ts) {
    const z = zoneVisible(o.im);
    const sw = (z.x1 - z.x0) * o.im.naturalWidth, sh = (z.y1 - z.y0) * o.im.naturalHeight;
    const h = Math.round(o.haut), w = Math.round(h * sw / sh);
    const x = sx + ts / 2 - w / 2 + o.dx, y = sy + ts * o.pieds - h;
    if (contour && o.cerne) {
      const ep = contour.ep;
      ctx.drawImage(cerne(o.im, w, h, ep, contour.couleur, o.piedLibre), x - ep, y - ep, w + ep * 2, h + ep * 2);
    } else {
      ctx.drawImage(o.im, z.x0 * o.im.naturalWidth, z.y0 * o.im.naturalHeight, sw, sh, x, y, w, h);
    }
  }

  return { dessine, objets, dessineObjet, estTerre, estEau };
}

// --------------------------------------------------------------------------- les couches
// Chaque case de la couche est dessinee par QUARTS : un quart regarde ses deux voisins de son cote et la diagonale.
// `e` gonfle la forme vers l'exterieur (la bordure = la forme gonflee, dessinee sous la forme normale). Tout se
// remplit d'un seul trait : les formes se fondent.
function quartDeTour(a0, a1) {
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  return delta < 0;
}
function traceCouche(path, est, x0, x1, y0, y1, ts, camx, camy, e) {
  const q = ts / 2, r = ts * .42;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!est(x, y)) continue;
    const sx = x * ts - camx, sy = y * ts - camy, cxp = sx + q, cyp = sy + q;
    for (const dy of [-1, 1]) for (const dx of [-1, 1]) {
      const v = est(x, y + dy), h = est(x + dx, y), d = est(x + dx, y + dy);
      if (!v && !h) {
        // Coin saillant : un quart de disque centre au milieu de la case.
        const a0 = dx < 0 ? Math.PI : 0, a1 = dy < 0 ? -Math.PI / 2 : Math.PI / 2;
        path.moveTo(cxp, cyp);
        path.arc(cxp, cyp, q + e, a0, a1, quartDeTour(a0, a1));
        path.closePath();
        continue;
      }
      const qx0 = dx < 0 ? sx : cxp, qy0 = dy < 0 ? sy : cyp;
      let rx0 = qx0, ry0 = qy0, rx1 = qx0 + q, ry1 = qy0 + q;
      if (!h) { if (dx < 0) rx0 -= e; else rx1 += e; }
      if (!v) { if (dy < 0) ry0 -= e; else ry1 += e; }
      path.rect(rx0, ry0, rx1 - rx0, ry1 - ry0);
      if (v && h && !d) {
        // Coin rentrant : la couche mord le coin de la case diagonale, en arrondi (un conge).
        const X = dx < 0 ? sx : sx + ts, Y = dy < 0 ? sy : sy + ts;
        const rr = r - e, a0 = Math.atan2(-dy, 0), a1 = Math.atan2(0, -dx);
        path.moveTo(X, Y);
        path.lineTo(X + dx * r, Y);
        path.lineTo(X + dx * r, Y + dy * (r - rr));
        path.arc(X + dx * r, Y + dy * r, rr, a0, a1, quartDeTour(a0, a1));
        path.lineTo(X, Y + dy * r);
        path.closePath();
      }
    }
  }
}
function couche(ctx, est, vue, { fond, bord, ep = 0 }) {
  const { x0, x1, y0, y1, ts, camx, camy } = vue;
  if (bord) {
    const p = new Path2D();
    traceCouche(p, est, x0 - 1, x1 + 1, y0 - 1, y1 + 1, ts, camx, camy, ep);
    ctx.fillStyle = bord; ctx.fill(p);
  }
  const p = new Path2D();
  traceCouche(p, est, x0 - 1, x1 + 1, y0 - 1, y1 + 1, ts, camx, camy, 0);
  ctx.fillStyle = fond; ctx.fill(p);
}

// --------------------------------------------------------------------------- images
// La zone VISIBLE d'une image (comme zoneVisible() dans overworld.js) : les marges transparentes ne comptent pas, ni l'OMBRE
// presque transparente que Medieval RTS pose sous ses arbres et ses buissons (opacite 26/255) : sans quoi le contour et le
// pied se calent sur l'ombre et non sur le tronc.
const OPAQUE = 64;
const zones = new Map();
function zoneVisible(im) {
  if (zones.has(im)) return zones.get(im);
  const N = 128, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data;
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (d[(y * N + x) * 4 + 3] <= OPAQUE) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const z = x1 < 0 ? { x0: 0, y0: 0, x1: 1, y1: 1 } : { x0: x0 / N, y0: y0 / N, x1: (x1 + 1) / N, y1: (y1 + 1) / N };
  zones.set(im, z);
  return z;
}

// Une image cernee d'un contour plein, a la taille ou on la dessine (une toile par image et par taille). `piedLibre` : pas de
// contour au PIED de l'image (son dernier dixieme, `PIED`) — le pied d'un tronc ou d'un rocher entre dans le sol.
const PIED = .1;
const cernes = new Map();
function cerne(im, w, h, ep, couleur, piedLibre = false) {
  const cle = im.src + '|' + w + '|' + h + '|' + ep + '|' + couleur + '|' + piedLibre;
  if (cernes.has(cle)) return cernes.get(cle);
  const z = zoneVisible(im), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.ceil((w + ep * 2) * dpr), H = Math.ceil((h + ep * 2) * dpr);
  const src = [z.x0 * im.naturalWidth, z.y0 * im.naturalHeight, (z.x1 - z.x0) * im.naturalWidth, (z.y1 - z.y0) * im.naturalHeight];
  const sil = document.createElement('canvas'); sil.width = W; sil.height = H;
  const gs = sil.getContext('2d');
  gs.drawImage(im, ...src, ep * dpr, ep * dpr, w * dpr, h * dpr);
  // La silhouette ne garde que les pixels franchement opaques : 16 copies decalees d'une ombre a 10 % la rendraient pleine.
  const px = gs.getImageData(0, 0, W, H), d = px.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > OPAQUE ? 255 : 0;
  gs.putImageData(px, 0, 0);
  gs.globalCompositeOperation = 'source-in';
  gs.fillStyle = couleur; gs.fillRect(0, 0, W, H);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    g.drawImage(sil, Math.cos(a) * ep * dpr, Math.sin(a) * ep * dpr);
  }
  // Le pied : le contour s'efface sur le dernier dixieme de la hauteur et dessous (une base arrondie, comme celle des sapins,
  // remonte au-dessus de la derniere ligne). L'image est dessinee par-dessus : seul le contour disparait.
  if (piedLibre) g.clearRect(0, (ep + h * (1 - PIED)) * dpr, W, H);
  g.drawImage(im, ...src, ep * dpr, ep * dpr, w * dpr, h * dpr);
  cernes.set(cle, c);
  return c;
}
