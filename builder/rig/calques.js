// LE DECOUPAGE EN CALQUES : les operations sur les pixels, sans DOM. L'Atelier
// (builder/rig.html) les appelle sur ses canvas, scripts/rig-decoupe.mjs sur des PNG lus par
// Node : une seule implementation, et le banc (scripts/test-rig.mjs) les eprouve.
//
// Une image = { largeur, hauteur, data: Uint8ClampedArray RGBA } a la TAILLE DE LA SOURCE
// (un calque en edition couvre toute l'image ; on ne le recadre qu'a l'enregistrement).
// Un masque = Float32Array largeur * hauteur, de 0 (dehors) a 1 (dedans), bords doux.

import { grilleDepuisImage, poidsAuto, osDuCalque } from '../../game/src/rig/mesh.js';
import { prepareSquelette } from '../../game/src/rig/squelette.js';

export const TRAIT = { alpha: 160, luminance: 70 };
const estTrait = (d, o) => d[o + 3] >= TRAIT.alpha && 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2] < TRAIT.luminance;

export const imageVide = (largeur, hauteur) => ({ largeur, hauteur, data: new Uint8ClampedArray(largeur * hauteur * 4) });
export const copieImage = im => ({ largeur: im.largeur, hauteur: im.hauteur, data: new Uint8ClampedArray(im.data) });

// ------------------------------------------------------------------ le trace
// Le lissage d'un trace ferme (Chaikin) : chaque passe coupe les coins au quart.
export function lisse(points, passes = 2) {
  let p = points;
  for (let k = 0; k < passes && p.length >= 3; k++) {
    const q = [];
    for (let i = 0; i < p.length; i++) {
      const [ax, ay] = p[i], [bx, by] = p[(i + 1) % p.length];
      q.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by], [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
    }
    p = q;
  }
  return p;
}

// « Suivre le contour » : le point le plus proche qui tombe sur le trait noir, dans un rayon.
// Rend le point d'origine s'il n'y a pas de trait autour.
export function accroche(im, x, y, rayon = 10) {
  const { largeur: W, hauteur: H, data } = im;
  let mieux = null, dm = Infinity;
  const x0 = Math.max(0, Math.floor(x - rayon)), x1 = Math.min(W - 1, Math.ceil(x + rayon));
  const y0 = Math.max(0, Math.floor(y - rayon)), y1 = Math.min(H - 1, Math.ceil(y + rayon));
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const d = (i - x) ** 2 + (j - y) ** 2;
    if (d < dm && d <= rayon * rayon && estTrait(data, (j * W + i) * 4)) { dm = d; mieux = [i + 0.5, j + 0.5]; }
  }
  return mieux || [x, y];
}

// Le masque d'un polygone, bords antialiases (4 x 4 echantillons par pixel, regle pair-impair).
export function masquePolygone(points, W, H) {
  const m = new Float32Array(W * H);
  if (points.length < 3) return m;
  const N = 4, part = 1 / (N * N);
  let ymin = Infinity, ymax = -Infinity;
  for (const [, y] of points) { if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
  const j0 = Math.max(0, Math.floor(ymin)), j1 = Math.min(H - 1, Math.ceil(ymax));
  for (let j = j0; j <= j1; j++) {
    for (let s = 0; s < N; s++) {
      const y = j + (s + 0.5) / N;
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
        if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (y - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.max(0, xs[k]), b = Math.min(W, xs[k + 1]);
        if (b <= a) continue;
        // les sous-colonnes dont le centre tombe dans [a, b)
        const c0 = Math.ceil(a * N - 0.5), c1 = Math.ceil(b * N - 0.5);
        for (let c = c0; c < c1; c++) { const i = c >> 2; if (i >= 0 && i < W) m[j * W + i] += part; }
      }
    }
  }
  for (let i = 0; i < m.length; i++) if (m[i] > 1) m[i] = 1;
  return m;
}

// « Inclure le trait » : le masque s'etend sur le trait noir qui le borde, de `largeur` pixels
// au plus. Un objet decoupe emporte ainsi TOUT son contour (sinon la moitie du trait resterait
// sur le calque du dessous, et se verrait des que l'objet bouge). Limite en distance : le
// trait continue autour des autres formes, il ne faut pas le suivre.
export function inclutTrait(masque, im, largeur = 8) {
  const { largeur: W, hauteur: H, data } = im;
  const m = new Float32Array(masque);
  let front = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (m[j * W + i] >= 0.5) front.push(j * W + i);
  for (let k = 0; k < largeur && front.length; k++) {
    const suivant = [];
    for (const p of front) {
      const i = p % W, j = (p - i) / W;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= W || b >= H) continue;
        const q = b * W + a;
        if (m[q] < 1 && estTrait(data, q * 4)) { m[q] = 1; suivant.push(q); }
      }
    }
    front = suivant;
  }
  return m;
}

// ------------------------------------------------------------------ extraire
// La selection devient un calque, retiree du calque d'origine. Rend { nouveau, reste, trou } :
// `trou` est le masque de ce qui a ete retire LA OU IL Y AVAIT DE LA MATIERE — la zone a
// combler du calque d'origine (rien a combler la ou il etait deja transparent).
export function extrait(im, masque) {
  const { largeur: W, hauteur: H, data } = im;
  const nouveau = imageVide(W, H), reste = imageVide(W, H), trou = new Float32Array(W * H);
  for (let p = 0, o = 0; p < W * H; p++, o += 4) {
    const m = masque[p], a = data[o + 3];
    nouveau.data[o] = reste.data[o] = data[o];
    nouveau.data[o + 1] = reste.data[o + 1] = data[o + 1];
    nouveau.data[o + 2] = reste.data[o + 2] = data[o + 2];
    nouveau.data[o + 3] = Math.round(a * m);
    reste.data[o + 3] = Math.round(a * (1 - m));
    if (a > 8) trou[p] = m;
  }
  return { nouveau, reste, trou };
}

// La boite de ce qui est visible (alpha > seuil) : [x, y, largeur, hauteur], ou null.
export function boiteAlpha(im, seuil = 0) {
  const { largeur: W, hauteur: H, data } = im;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (data[(j * W + i) * 4 + 3] > seuil) {
    if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j;
  }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}
export function boiteMasque(m, W, H, seuil = 0.01) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (m[j * W + i] > seuil) {
    if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j;
  }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

// Recadrer / replacer : un calque s'enregistre recadre sur sa boite, se travaille en entier.
export function recadre(im, [x, y, w, h]) {
  const out = imageVide(w, h);
  for (let j = 0; j < h; j++) out.data.set(im.data.subarray(((y + j) * im.largeur + x) * 4, ((y + j) * im.largeur + x + w) * 4), j * w * 4);
  return out;
}
export function replace(petit, x, y, W, H) {
  const out = imageVide(W, H);
  for (let j = 0; j < petit.hauteur; j++) {
    const yy = y + j;
    if (yy < 0 || yy >= H) continue;
    for (let i = 0; i < petit.largeur; i++) {
      const xx = x + i;
      if (xx < 0 || xx >= W) continue;
      const s = (j * petit.largeur + i) * 4, d = (yy * W + xx) * 4;
      out.data[d] = petit.data[s]; out.data[d + 1] = petit.data[s + 1]; out.data[d + 2] = petit.data[s + 2]; out.data[d + 3] = petit.data[s + 3];
    }
  }
  return out;
}

// Un masque en image noir et blanc (blanc = la zone), pour l'outil d'inpainting.
export function masqueEnImage(m, W, H, [x, y, w, h] = [0, 0, W, H]) {
  const out = imageVide(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = Math.round(m[(y + j) * W + x + i] * 255), o = (j * w + i) * 4;
    out.data[o] = out.data[o + 1] = out.data[o + 2] = v; out.data[o + 3] = 255;
  }
  return out;
}
export function imageEnMasque(im, x, y, W, H) {
  const m = new Float32Array(W * H);
  for (let j = 0; j < im.hauteur; j++) for (let i = 0; i < im.largeur; i++) {
    const xx = x + i, yy = y + j;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    m[yy * W + xx] = im.data[(j * im.largeur + i) * 4] / 255;
  }
  return m;
}

// ------------------------------------------------------------------ pinceaux
// Le poids d'un pinceau rond a `distance` de son centre : 1 au coeur, 0 au bord ; `durete`
// (0..1) = la part du rayon qui reste pleine.
const tache = (d, rayon, durete) => d >= rayon ? 0 : d <= rayon * durete ? 1 : 1 - (d - rayon * durete) / (rayon * (1 - durete) || 1);

// La gomme : baisse l'alpha. Rend la boite touchee [x, y, w, h] (pour annuler).
export function gomme(im, x, y, rayon, durete = 0.6, force = 1) {
  return pinceau(im, x, y, rayon, (o, w) => { im.data[o + 3] = Math.round(im.data[o + 3] * (1 - w * force)); });
}
// La restauration : ramene les pixels de l'image SOURCE (jamais modifiee).
export function restaure(im, source, x, y, rayon, durete = 0.6, force = 1) {
  return pinceau(im, x, y, rayon, (o, w) => {
    const k = w * force, d = im.data, s = source.data;
    for (let c = 0; c < 4; c++) d[o + c] = Math.round(d[o + c] + (s[o + c] - d[o + c]) * k);
  }, durete);
}
function pinceau(im, x, y, rayon, f, durete = 0.6) {
  const { largeur: W, hauteur: H } = im;
  const x0 = Math.max(0, Math.floor(x - rayon)), x1 = Math.min(W - 1, Math.ceil(x + rayon));
  const y0 = Math.max(0, Math.floor(y - rayon)), y1 = Math.min(H - 1, Math.ceil(y + rayon));
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const w = tache(Math.hypot(i + 0.5 - x, j + 0.5 - y), rayon, durete);
    if (w > 0) f((j * W + i) * 4, w);
  }
  return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

// Fusionner vers le bas : `dessus` pose sur `dessous` (alpha « par-dessus »). Rend une image neuve.
export function fusionne(dessous, dessus) {
  const out = copieImage(dessous), d = out.data, s = dessus.data;
  for (let o = 0; o < d.length; o += 4) {
    const as = s[o + 3] / 255, ad = d[o + 3] / 255, a = as + ad * (1 - as);
    if (a <= 0) continue;
    for (let c = 0; c < 3; c++) d[o + c] = Math.round((s[o + c] * as + d[o + c] * ad * (1 - as)) / a);
    d[o + 3] = Math.round(a * 255);
  }
  return out;
}

// ------------------------------------------------------------------ combler (provisoire)
// Un remplissage PROVISOIRE d'une zone a combler, sans IA : les couleurs voisines diffusees
// dans le trou (pyramide « pousser-tirer »), et seulement a moins de `distance` pixels de ce
// qui reste du calque — au-dela, on ne sait pas ce qu'il y avait derriere (le trou d'un
// bouclier deborde du corps), on laisse transparent. Ca suffit pour un objet qui bouge de
// quelques pixels ; le vrai comblement se fait dans un outil d'inpainting (export du masque).
export function comblePrevisoire(im, trou, distance = 32) {
  const { largeur: W, hauteur: H } = im;
  const out = copieImage(im), d = out.data;
  // ce qu'on connait : la matiere du calque hors du trou
  const connu = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) connu[p] = trou[p] < 0.5 && d[p * 4 + 3] > 200 ? 1 : 0;
  // la distance a ce qu'on connait (chanfrein 3-4, deux passes)
  const dist = new Float32Array(W * H).fill(1e9);
  for (let p = 0; p < W * H; p++) if (connu[p]) dist[p] = 0;
  const passe = (sens) => {
    const [ja, jb, js] = sens > 0 ? [0, H, 1] : [H - 1, -1, -1];
    const [ia, ib, is] = sens > 0 ? [0, W, 1] : [W - 1, -1, -1];
    for (let j = ja; j !== jb; j += js) for (let i = ia; i !== ib; i += is) {
      const p = j * W + i;
      for (const [di, dj, c] of [[-is, 0, 1], [0, -js, 1], [-is, -js, 1.414], [is, -js, 1.414]]) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= W || b >= H) continue;
        const v = dist[b * W + a] + c;
        if (v < dist[p]) dist[p] = v;
      }
    }
  };
  passe(1); passe(-1);
  // pousser-tirer : des moyennes de plus en plus grossieres de ce qu'on connait
  const niveaux = [];
  let w = W, h = H;
  let rgb = new Float32Array(W * H * 3), poids = new Float32Array(connu);
  for (let p = 0; p < W * H; p++) for (let c = 0; c < 3; c++) rgb[p * 3 + c] = d[p * 4 + c] * connu[p];
  niveaux.push({ w, h, rgb, poids });
  while (w > 1 || h > 1) {
    const w2 = Math.max(1, w >> 1), h2 = Math.max(1, h >> 1);
    const r2 = new Float32Array(w2 * h2 * 3), p2 = new Float32Array(w2 * h2);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const q = Math.min(h2 - 1, j >> 1) * w2 + Math.min(w2 - 1, i >> 1), s = j * w + i;
      p2[q] += poids[s];
      for (let c = 0; c < 3; c++) r2[q * 3 + c] += rgb[s * 3 + c];
    }
    w = w2; h = h2; rgb = r2; poids = p2;
    niveaux.push({ w, h, rgb, poids });
  }
  // tirer : chaque niveau prend sa couleur moyenne, ou celle du niveau au-dessus s'il n'a rien.
  // ⚠ Le niveau du dessus se lit en BILINEAIRE : au plus proche, le trou se remplissait de
  // carres (les yeux du Chiot de Garde, 23 oct. 2026).
  const lisHaut = (H2, i, j, c) => {
    const x = Math.max(0, Math.min(H2.w - 1, (i + 0.5) / 2 - 0.5)), y = Math.max(0, Math.min(H2.h - 1, (j + 0.5) / 2 - 0.5));
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(H2.w - 1, x0 + 1), y1 = Math.min(H2.h - 1, y0 + 1), fx = x - x0, fy = y - y0;
    const v = (a, b) => H2.col[(b * H2.w + a) * 3 + c];
    return (v(x0, y0) * (1 - fx) + v(x1, y0) * fx) * (1 - fy) + (v(x0, y1) * (1 - fx) + v(x1, y1) * fx) * fy;
  };
  let haut = null;
  for (let k = niveaux.length - 1; k >= 0; k--) {
    const n = niveaux[k], col = new Float32Array(n.w * n.h * 3);
    for (let j = 0; j < n.h; j++) for (let i = 0; i < n.w; i++) {
      const q = j * n.w + i;
      for (let c = 0; c < 3; c++) {
        const propre = n.poids[q] > 0 ? n.rgb[q * 3 + c] / n.poids[q] : null;
        const dessus = haut ? lisHaut(haut, i, j, c) : 0;
        const confiance = Math.min(1, n.poids[q] / (k === 0 ? 1 : 2));
        col[q * 3 + c] = propre == null ? dessus : propre * confiance + dessus * (1 - confiance);
      }
    }
    haut = { w: n.w, h: n.h, col };
  }
  for (let p = 0; p < W * H; p++) {
    if (trou[p] < 0.01 || dist[p] > distance) continue;
    const t = trou[p], fondu = Math.min(1, (distance - dist[p]) / 4); // un bord doux au bout
    // ⚠ Dans la zone, la couleur diffusee REMPLACE ce qui reste : le bord a demi transparent de
    // l'objet extrait (le noir d'un oeil) y laissait sinon un liseré, visible des que l'objet
    // bouge (le clignement du Chiot de Garde).
    const a = d[p * 4 + 3] / 255, cible = t > 0.02 ? fondu : 0;
    if (cible <= 0) continue;
    for (let c = 0; c < 3; c++) d[p * 4 + c] = Math.round(d[p * 4 + c] * (1 - cible) + haut.col[p * 3 + c] * cible);
    d[p * 4 + 3] = Math.round(255 * Math.max(a, cible));
  }
  return out;
}

// ------------------------------------------------------------------ le personnage entier
// Ces fonctions tiennent ensemble le rig (le JSON) et ses images : `images` = { idCalque:
// image a la taille de la source }, `masques` = { 'idCalque/idZone': masque }. En memoire, un
// calque couvre toute la source (x = y = 0, largeur, hauteur de la source) ; `pourEnregistrer`
// recadre chaque image sur sa boite et ecrit le rectangle dans le JSON.


const pasDe = rig => Math.max(8, Math.round(Math.max(rig.source.largeur, rig.source.hauteur) / 50));

// Les poids automatiques de tous les calques mailles (sauf ceux peints a la main) : a refaire
// quand un os bouge ET quand un calque rigide apparait (il retire son os aux autres).
export function recalculePoids(rig) {
  const sq = prepareSquelette(rig);
  for (const c of rig.calques || []) if (c.mesh && !c.mesh.poidsManuels) c.mesh.poids = poidsAuto(c.mesh, sq, { osPermis: osDuCalque(rig, c) });
}

// Le maillage d'un calque, refait sur son image (meme pas qu'avant, ou celui de la source).
export function mailleCalque(rig, images, id) {
  const c = rig.calques.find(k => k.id === id);
  const pas = c.mesh?.pas || pasDe(rig), manuels = c.mesh?.poidsManuels;
  c.mesh = grilleDepuisImage(images[id], { pas });
  if (manuels) delete c.mesh.poidsManuels; // un maillage neuf : les poids peints ne collent plus
  return c;
}

// « Extraire en calque » : la selection `masque` quitte le calque `depuis` et devient le calque
// `nom`, juste au-dessus. Le trou laisse dans `depuis` devient une ZONE A COMBLER. `os` : le
// nouveau calque est rigide sur cet os ; sans `os`, il est maille. Rend la zone.
export function extraitCalque(rig, images, masques, { depuis, nom, masque, os = null }) {
  const B = rig.calques.find(k => k.id === depuis);
  if (!B) throw new Error('calque inconnu : ' + depuis);
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(nom) || rig.calques.some(k => k.id === nom)) throw new Error('nom de calque vide ou déjà pris : ' + nom);
  const W = rig.source.largeur, H = rig.source.hauteur;
  const { nouveau, reste, trou } = extrait(images[depuis], masque);
  if (!boiteAlpha(nouveau, 8)) throw new Error('la sélection ne prend rien sur « ' + depuis + ' »');
  images[depuis] = reste; images[nom] = nouveau;
  B.image = `calques/${depuis}.png`;
  for (const k of rig.calques) if ((k.ordre || 0) > (B.ordre || 0)) k.ordre = (k.ordre || 0) + 1;
  // `de` : le calque d'ou il a ete extrait (le validateur suit cette lignee pour savoir qui
  // recouvre quel trou)
  const C = { id: nom, image: `calques/${nom}.png`, de: depuis, ordre: (B.ordre || 0) + 1, x: 0, y: 0, largeur: W, hauteur: H, ...(os ? { os } : {}) };
  rig.calques.push(C);
  let zone = null;
  const bt = boiteMasque(trou, W, H, 0.02);
  if (bt) {
    B.zones = B.zones || [];
    let n = 1; while (B.zones.some(z => z.id === 'z' + n)) n++;
    zone = { id: 'z' + n, masque: `masques/${depuis}-z${n}.png`, x: bt[0], y: bt[1], largeur: bt[2], hauteur: bt[3], etat: 'a-combler', par: nom };
    B.zones.push(zone);
    masques[`${depuis}/${zone.id}`] = trou;
  }
  if (B.mesh) mailleCalque(rig, images, depuis);
  if (!os) mailleCalque(rig, images, nom);
  recalculePoids(rig);
  return zone;
}

// Le comblement PROVISOIRE d'une zone (cf. comblePrevisoire). Le calque gagne de la matiere :
// son maillage se refait.
export function combleZone(rig, images, masques, calque, zoneId, distance = 32) {
  const B = rig.calques.find(k => k.id === calque), z = (B.zones || []).find(q => q.id === zoneId);
  const m = masques[`${calque}/${zoneId}`];
  if (!z || !m) throw new Error(`zone inconnue : ${calque}/${zoneId}`);
  images[calque] = comblePrevisoire(images[calque], m, distance);
  z.etat = 'provisoire';
  if (B.mesh) { mailleCalque(rig, images, calque); recalculePoids(rig); }
}

// Ce qu'on ecrit : le JSON (chaque calque recadre sur sa boite) et la liste des fichiers.
// `seulement` (facultatif) : les ids des calques dont l'image a change.
export function pourEnregistrer(rig, images, masques, seulement = null) {
  const json = JSON.parse(JSON.stringify(rig)), fichiers = [];
  for (const c of json.calques) {
    const im = images[c.id];
    if (!im) continue;
    const b = boiteAlpha(im, 0) || [0, 0, 1, 1];
    [c.x, c.y, c.largeur, c.hauteur] = b;
    if (c.image === (rig.source.image || 'source.png') && b[0] === 0 && b[1] === 0 && b[2] === rig.source.largeur && b[3] === rig.source.hauteur) continue;
    // un calque qui quitte la source reçoit son PNG recadré MAINTENANT, modifié ou non : sinon le JSON
    // pointerait vers un fichier qui n'existe pas (le sprite disparaissait de l'Atelier)
    const nouveau = c.image === (rig.source.image || 'source.png');
    if (nouveau) c.image = `calques/${c.id}.png`;
    if (nouveau || !seulement || seulement.includes(c.id)) fichiers.push({ chemin: c.image, image: recadre(im, b) });
    for (const z of c.zones || []) {
      const m = masques[`${c.id}/${z.id}`];
      if (m && (!seulement || seulement.includes(c.id))) fichiers.push({ chemin: z.masque, image: masqueEnImage(m, rig.source.largeur, rig.source.hauteur, [z.x, z.y, z.largeur, z.hauteur]) });
    }
  }
  return { json, fichiers };
}

// Et l'inverse : des images recadrees (lues sur le disque) remises a la taille de la source.
// `lis(chemin)` rend une image (ou null). Rend { rig, images, masques }, le rig en memoire.
export function depuisFichiers(rigJson, lis) {
  const rig = JSON.parse(JSON.stringify(rigJson));
  const W = rig.source.largeur, H = rig.source.hauteur, images = {}, masques = {};
  for (const c of rig.calques || []) {
    const im = lis(c.image || rig.source.image || 'source.png');
    if (!im) continue;
    images[c.id] = im.largeur === W && im.hauteur === H && !(c.x || c.y) ? copieImage(im) : replace(im, c.x || 0, c.y || 0, W, H);
    c.x = 0; c.y = 0; c.largeur = W; c.hauteur = H;
    for (const z of c.zones || []) { const m = lis(z.masque); if (m) masques[`${c.id}/${z.id}`] = imageEnMasque(m, z.x, z.y, W, H); }
  }
  return { rig, images, masques };
}

// ------------------------------------------------------------------ le panneau des calques
// Les operations du panneau, sur le rig en memoire et ses images (memes conventions que
// plus haut). Chacune rend la liste des calques dont l'IMAGE a change (a reecrire).

export function nomDeCalqueLibre(rig, base) {
  const ids = new Set(rig.calques.map(c => c.id));
  if (!ids.has(base)) return base;
  let k = 2; while (ids.has(`${base}-${k}`)) k++;
  return `${base}-${k}`;
}

export function renommeCalque(rig, images, masques, ancien, nouveau) {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(nouveau) || rig.calques.some(c => c.id === nouveau)) throw new Error('nom de calque vide ou déjà pris : ' + nouveau);
  const c = rig.calques.find(k => k.id === ancien);
  c.id = nouveau;
  if (c.image !== (rig.source.image || 'source.png')) c.image = `calques/${nouveau}.png`;
  images[nouveau] = images[ancien]; delete images[ancien];
  for (const z of c.zones || []) {
    z.masque = `masques/${nouveau}-${z.id}.png`;
    masques[`${nouveau}/${z.id}`] = masques[`${ancien}/${z.id}`]; delete masques[`${ancien}/${z.id}`];
  }
  for (const k of rig.calques) {
    if (k.de === ancien) k.de = nouveau;
    for (const z of k.zones || []) if (z.par === ancien) z.par = nouveau;
  }
  return [nouveau];
}

export function dupliqueCalque(rig, images, id) {
  const c = rig.calques.find(k => k.id === id);
  const nom = nomDeCalqueLibre(rig, id + '-copie');
  for (const k of rig.calques) if ((k.ordre || 0) > (c.ordre || 0)) k.ordre = (k.ordre || 0) + 1;
  const d = JSON.parse(JSON.stringify(c));
  Object.assign(d, { id: nom, image: `calques/${nom}.png`, ordre: (c.ordre || 0) + 1, de: id });
  delete d.zones;
  rig.calques.push(d);
  images[nom] = copieImage(images[id]);
  return [nom];
}

// Le calque juste en dessous (dans l'ordre de dessin), ou null.
export function calqueDessous(rig, id) {
  const c = rig.calques.find(k => k.id === id);
  return rig.calques.filter(k => (k.ordre || 0) < (c.ordre || 0)).sort((a, b) => (b.ordre || 0) - (a.ordre || 0))[0] || null;
}

// « Fusionner vers le bas » : le calque se pose sur celui du dessous et disparait. Les trous que
// ce calque avait laisses dans celui du dessous sont rebouches par ses pixels : leurs zones partent.
export function fusionneVersLeBas(rig, images, masques, id) {
  const c = rig.calques.find(k => k.id === id), b = calqueDessous(rig, id);
  if (!b) throw new Error('rien sous « ' + id + ' »');
  images[b.id] = fusionne(images[b.id], images[id]);
  if (b.image === (rig.source.image || 'source.png')) b.image = `calques/${b.id}.png`;
  b.zones = (b.zones || []).filter(z => { if (z.par === id) { delete masques[`${b.id}/${z.id}`]; return false; } return true; });
  retireCalque(rig, images, masques, id, b.id);
  if (b.mesh) mailleCalque(rig, images, b.id);
  recalculePoids(rig);
  return [b.id];
}

export function supprimeCalque(rig, images, masques, id) {
  const c = rig.calques.find(k => k.id === id);
  retireCalque(rig, images, masques, id, c.de || null);
  recalculePoids(rig);
  return [];
}

function retireCalque(rig, images, masques, id, heritier) {
  const c = rig.calques.find(k => k.id === id);
  for (const z of c.zones || []) delete masques[`${id}/${z.id}`];
  rig.calques = rig.calques.filter(k => k !== c);
  delete images[id];
  for (const k of rig.calques) if (k.de === id) { if (heritier) k.de = heritier; else delete k.de; }
}

// L'ordre de dessin, du fond vers le dessus : `ids` (tous les calques) devient 0, 1, 2…
export function reordonne(rig, ids) {
  ids.forEach((id, i) => { const c = rig.calques.find(k => k.id === id); if (c) c.ordre = i; });
  return [];
}

// Reimporter un calque complete dans un outil d'inpainting : `im` est l'image exportee (le
// rectangle `rect` de la source), remplie. Elle remplace ce rectangle du calque ; la zone passe
// « comblee ».
export function reimporteZone(rig, images, calque, zoneId, im, rect) {
  const [x, y, w, h] = rect;
  if (im.largeur !== w || im.hauteur !== h) throw new Error(`l'image fait ${im.largeur} × ${im.hauteur}, l'export faisait ${w} × ${h}`);
  const out = copieImage(images[calque]), W = out.largeur;
  for (let j = 0; j < h; j++) out.data.set(im.data.subarray(j * w * 4, (j + 1) * w * 4), ((y + j) * W + x) * 4);
  images[calque] = out;
  const c = rig.calques.find(k => k.id === calque);
  const z = (c.zones || []).find(q => q.id === zoneId);
  if (z) z.etat = 'comblee';
  if (c.image === (rig.source.image || 'source.png')) c.image = `calques/${calque}.png`;
  if (c.mesh) { mailleCalque(rig, images, calque); recalculePoids(rig); }
  return [calque];
}

// Le rectangle d'export d'une zone : la boite du calque, agrandie a la zone.
export function rectExport(rig, images, calque, zone) {
  const b = boiteAlpha(images[calque], 0) || [zone.x, zone.y, zone.largeur, zone.hauteur];
  const x0 = Math.min(b[0], zone.x), y0 = Math.min(b[1], zone.y);
  const x1 = Math.max(b[0] + b[2], zone.x + zone.largeur), y1 = Math.max(b[1] + b[3], zone.y + zone.hauteur);
  return [x0, y0, x1 - x0, y1 - y0];
}
