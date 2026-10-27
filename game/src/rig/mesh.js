// LES MESHES : la toile triangulee d'un calque, ses poids, et sa deformation.
//
// Un calque se dessine TOUJOURS par un mesh. Trois cas, du plus simple au plus riche :
//   - calque rigide (`os` sans `mesh`) : un quadrilatere, tout le poids sur cet os ;
//   - mesh en GRILLE (`mesh.type = "grille"`) : une grille reguliere de `pas` pixels, dont on
//     ne garde que les cases ou l'image a de la matiere (alpha). Robuste et simple : les bords
//     de case tombent dans le transparent, ce qui ne se voit pas ;
//   - (phase 2) mesh qui suit le contour.
//
// Les sommets sont en pixels de l'IMAGE SOURCE (pas du calque) : c'est le repere des os. Les
// coordonnees de texture s'en deduisent par la position du calque dans la source.
//
// Pas de DOM ici : les pixels arrivent en { largeur, hauteur, data (RGBA) }, qu'ils viennent
// d'un canvas (navigateur) ou du decodeur PNG des scripts (Node).

// Un pixel « de trait » : opaque et sombre. Les contours noirs epais des personnages sont
// ce qui trahit un etirement : verifie.js les surveille plus severement que l'interieur.
export const TRAIT = { alpha: 160, luminance: 70 };

// La grille. `rect` (facultatif) limite la recherche a un rectangle de l'image.
// Rend { type, pas, sommets: [x0, y0, ...], triangles: [a, b, c, ...], trait: [indices] }.
export function grilleDepuisImage(img, { pas = 0, alphaMin = 8, decalage = [0, 0] } = {}) {
  const { largeur: W, hauteur: H, data } = img;
  if (!pas) pas = Math.max(8, Math.round(Math.max(W, H) / 50));
  // la boite de ce qui est visible
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] > alphaMin) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { type: 'grille', pas, sommets: [], triangles: [], trait: [] };
  // une case de marge, et une grille calee sur le pas (les sommets tombent sur des entiers)
  x0 = Math.max(0, Math.floor(x0 / pas) * pas - pas); y0 = Math.max(0, Math.floor(y0 / pas) * pas - pas);
  const nx = Math.ceil((x1 + 1 - x0) / pas) + 1, ny = Math.ceil((y1 + 1 - y0) / pas) + 1;

  const garde = new Uint8Array(nx * ny), traitCase = new Uint8Array(nx * ny);
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) {
    // la case, elargie d'un pixel : une case qui ne touche la matiere que par son bord la garde
    const ax = x0 + cx * pas - 1, ay = y0 + cy * pas - 1;
    let matiere = 0, sombres = 0;
    for (let y = Math.max(0, ay); y < Math.min(H, ay + pas + 2); y++) {
      for (let x = Math.max(0, ax); x < Math.min(W, ax + pas + 2); x++) {
        const o = (y * W + x) * 4, a = data[o + 3];
        if (a > alphaMin) matiere++;
        if (a >= TRAIT.alpha && 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2] < TRAIT.luminance) sombres++;
      }
    }
    garde[cy * nx + cx] = matiere > 0 ? 1 : 0;
    traitCase[cy * nx + cx] = sombres >= pas * 0.5 ? 1 : 0;
  }

  const idx = new Map(), sommets = [], triangles = [], trait = [];
  const sommet = (gx, gy) => {
    const k = gy * (nx + 1) + gx;
    if (!idx.has(k)) { idx.set(k, sommets.length / 2); sommets.push(x0 + gx * pas + decalage[0], y0 + gy * pas + decalage[1]); }
    return idx.get(k);
  };
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) {
    if (!garde[cy * nx + cx]) continue;
    const a = sommet(cx, cy), b = sommet(cx + 1, cy), c = sommet(cx + 1, cy + 1), d = sommet(cx, cy + 1);
    // diagonales alternees : pas de biais d'orientation dans la deformation
    const t0 = triangles.length / 3;
    if ((cx + cy) % 2) triangles.push(a, b, c, a, c, d); else triangles.push(a, b, d, b, c, d);
    if (traitCase[cy * nx + cx]) trait.push(t0, t0 + 1);
  }
  return { type: 'grille', pas, sommets, triangles, trait };
}

// Le quadrilatere d'un calque rigide.
export function quadDe(calque) {
  const x = calque.x || 0, y = calque.y || 0, w = calque.largeur, h = calque.hauteur;
  return { type: 'quad', sommets: [x, y, x + w, y, x + w, y + h, x, y + h], triangles: [0, 1, 2, 0, 2, 3], trait: [0, 1] };
}

function distSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  let u = L2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
  u = Math.max(0, Math.min(1, u));
  const qx = ax + u * dx - px, qy = ay + u * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}

// Les poids automatiques : chaque sommet suit les os les plus proches (inverse de la
// distance a la puissance `puissance`), puis on lisse sur le mesh (`lissage` passes) pour
// qu'aucun pli ne marque la frontiere entre deux os. On garde les `max` plus forts.
// Rend un tableau par sommet : [idOs, poids, idOs, poids, ...] (arrondi).
//
// La distance est GEODESIQUE (`geodesique`, par defaut) : elle se mesure en marchant sur le
// mesh, donc a travers la matiere de l'image et jamais a travers le vide. Une oreille ne
// tire plus sur l'autre, une patte sur sa voisine, si du transparent les separe. Ce qui se
// CHEVAUCHE (un poing devant la joue) reste lie : c'est le travail des calques (phase 2) ou
// de la `portee` d'un os (rig.json, 1 par defaut : a 1.5, l'os attire de 1,5 fois plus loin).
//
// La distance est aussi RAPPORTEE A L'EPAISSEUR (`epaisseur`, par defaut) de la partie que l'os
// traverse : la profondeur moyenne du mesh le long de l'os (distance au bord de l'image). Sans
// ca, au bord d'une partie large (la tete, le buste), un os fin mais proche gagnait : l'epaule
// du Lapin Bagarreur suivait la queue a 56 %, le bord de sa tete l'oreille (23 oct. 2026).
//
// ⚠ Une puissance FAIBLE etale la transition entre deux os, et c'est ce qui menage les
// contours : mesure sur l'idle du crapaud (23 oct. 2026), contour etire de 5 % a la
// puissance 4, 3,6 % a 2,5 ; lisser davantage a la puissance 4 aggravait au contraire.
export function poidsAuto(mesh, sq, { puissance = 2.5, lissage = 6, max = 4, seuil = 0.03, osPermis = null, geodesique = true, epaisseur = true } = {}) {
  const n = mesh.sommets.length / 2;
  if (!n) return [];   // un maillage vide (calque minuscule : « bras » d'1 px) : sans sommet, la recherche du plus proche plantait et bloquait le calcul de TOUS les calques
  const os = sq.os.filter(b => b.deforme && (!osPermis || osPermis.includes(b.id)));
  if (!os.length) return new Array(n).fill(null).map(() => []);
  const RAD = Math.PI / 180;
  const S = mesh.sommets;
  const segs = os.map(b => [b.x0, b.y0, b.x0 + Math.cos(b.a0 * RAD) * b.longueur, b.y0 + Math.sin(b.a0 * RAD) * b.longueur]);
  const pas = mesh.pas || 10, eps = pas * 0.5;

  // voisins par les aretes des triangles
  const voisins = Array.from({ length: n }, () => new Set());
  const T = mesh.triangles;
  for (let t = 0; t < T.length; t += 3) {
    const [a, b, c] = [T[t], T[t + 1], T[t + 2]];
    voisins[a].add(b).add(c); voisins[b].add(a).add(c); voisins[c].add(a).add(b);
  }
  const vois = voisins.map(v => [...v]);

  const directes = segs.map(s => {
    const d = new Float64Array(n);
    for (let v = 0; v < n; v++) d[v] = distSegment(S[v * 2], S[v * 2 + 1], ...s);
    return d;
  });
  const distances = geodesique ? directes.map(d => geodesiques(d, vois, S, pas * 1.5)) : directes;

  // l'epaisseur de chaque os : la profondeur (distance au bord du mesh) des sommets qui le
  // touchent, en moyenne ; jamais moins d'un pas. Rapportee a la moyenne des os, pour que
  // `eps` garde son sens en pixels.
  let rayons = os.map(() => 1);
  if (epaisseur && T.length) {
    const prof = profondeurs(T, vois, S, n);
    const r = directes.map(d => {
      let s = 0, k = 0;
      for (let v = 0; v < n; v++) if (d[v] <= pas) { s += prof[v]; k++; }
      return Math.max(pas, k ? s / k : pas);
    });
    const moy = r.reduce((a, b) => a + b, 0) / r.length;
    rayons = r.map(x => x / moy);
  }

  let W = [];
  for (let v = 0; v < n; v++) {
    const w = os.map((b, j) => 1 / Math.pow(distances[j][v] / (b.portee * rayons[j]) + eps, puissance));
    const somme = w.reduce((a, b) => a + b, 0);
    W.push(w.map(x => x / somme));
  }
  for (let k = 0; k < lissage; k++) {
    W = W.map((w, v) => {
      const vs = vois[v];
      if (!vs.length) return w;
      return w.map((x, j) => 0.5 * x + 0.5 * vs.reduce((s, u) => s + W[u][j], 0) / vs.length);
    });
  }
  return W.map(w => {
    // ⚠ Un poids faible LOIN de son os se voit : 1 % d'un bouclier qui tourne autour de sa base
    // deplace de plusieurs pixels un contour a 700 px de la (le casque du Chiot de Garde).
    // On RETIRE `seuil` a chaque poids (jamais en dessous de 0), puis on renormalise : une
    // coupe nette a la place faisait un pli la ou le poids franchit le seuil (crapaud : 5,3 %).
    const m = Math.max(...w);
    const tri = w.map((x, j) => [x === m ? x : Math.max(0, x - seuil), j]).sort((a, b) => b[0] - a[0]).slice(0, max).filter(e => e[0] > 0.002);
    const s = tri.reduce((a, e) => a + e[0], 0);
    const out = [];
    for (const [x, j] of tri) out.push(os[j].id, Math.round(x / s * 1000) / 1000);
    return out;
  });
}

// La profondeur de chaque sommet : sa distance (en marchant sur le mesh) au bord le plus
// proche. Une arete du bord n'appartient qu'a un triangle.
function profondeurs(T, vois, S, n) {
  const compte = new Map();
  const cle = (a, b) => (a < b ? a * n + b : b * n + a);
  for (let t = 0; t < T.length; t += 3) for (const [a, b] of [[T[t], T[t + 1]], [T[t + 1], T[t + 2]], [T[t + 2], T[t]]]) {
    const k = cle(a, b); compte.set(k, (compte.get(k) || 0) + 1);
  }
  const bord = new Float64Array(n).fill(Infinity);
  for (const [k, c] of compte) if (c === 1) { bord[Math.floor(k / n)] = 0; bord[k % n] = 0; }
  return geodesiques(bord, vois, S, 0);
}

// Dijkstra a sources multiples : les sommets a moins de `seuil` de l'os partent de leur
// distance a l'os, les autres l'atteignent en marchant d'arete en arete. Un sommet qu'on ne
// peut pas atteindre (un ilot de l'image) garde la distance a vol d'oiseau.
function geodesiques(directe, vois, S, seuil) {
  const n = directe.length, d = new Float64Array(n).fill(Infinity);
  const tas = [];
  const pousse = (v, x) => {
    tas.push([x, v]);
    let i = tas.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (tas[p][0] <= tas[i][0]) break; [tas[p], tas[i]] = [tas[i], tas[p]]; i = p; }
  };
  const tire = () => {
    const h = tas[0], fin = tas.pop();
    if (tas.length) {
      tas[0] = fin;
      let i = 0;
      for (;;) {
        const a = 2 * i + 1, b = a + 1;
        let m = i;
        if (a < tas.length && tas[a][0] < tas[m][0]) m = a;
        if (b < tas.length && tas[b][0] < tas[m][0]) m = b;
        if (m === i) break;
        [tas[m], tas[i]] = [tas[i], tas[m]]; i = m;
      }
    }
    return h;
  };
  let proche = 0;
  for (let v = 0; v < n; v++) {
    if (directe[v] < directe[proche]) proche = v;
    if (directe[v] <= seuil) { d[v] = directe[v]; pousse(v, d[v]); }
  }
  if (!tas.length) { d[proche] = directe[proche]; pousse(proche, d[proche]); }
  while (tas.length) {
    const [x, v] = tire();
    if (x > d[v]) continue;
    for (const u of vois[v]) {
      const y = x + Math.hypot(S[u * 2] - S[v * 2], S[u * 2 + 1] - S[v * 2 + 1]);
      if (y < d[u]) { d[u] = y; pousse(u, y); }
    }
  }
  for (let v = 0; v < n; v++) if (d[v] === Infinity) d[v] = directe[v];
  return d;
}

// Les os qui peuvent prendre les sommets d'un calque maille : son `osPoids` s'il est ecrit ;
// sinon tous ceux qui deforment, SAUF ceux qui portent un autre calque rigide — l'os du
// bouclier ne sert qu'au calque du bouclier, il ne doit pas tirer sur le corps derriere.
export function osDuCalque(rig, calque) {
  if (Array.isArray(calque.osPoids) && calque.osPoids.length) return calque.osPoids;
  const rigides = new Set((rig.calques || []).filter(c => c !== calque && !c.mesh && c.os).map(c => c.os));
  return (rig.os || []).filter(o => o.deforme !== false && !rigides.has(o.id)).map(o => o.id);
}

// Compile un calque pour le jeu : sommets du repos, UV, indices, et 4 poids par sommet en
// tableaux plats (os inconnus ignores, poids renormalises).
export function prepareCalque(calque, sq, tailleSource) {
  const mesh = calque.mesh || quadDe(calque);
  const n = mesh.sommets.length / 2;
  const repos = Float32Array.from(mesh.sommets);
  const uv = new Float32Array(n * 2);
  const cx = calque.x || 0, cy = calque.y || 0;
  const lw = calque.largeur || tailleSource[0], lh = calque.hauteur || tailleSource[1];
  for (let v = 0; v < n; v++) { uv[v * 2] = (repos[v * 2] - cx) / lw; uv[v * 2 + 1] = (repos[v * 2 + 1] - cy) / lh; }
  const osIdx = new Int16Array(n * 4).fill(-1), osW = new Float32Array(n * 4);
  const rigide = calque.mesh ? -1 : (sq.index.has(calque.os) ? sq.index.get(calque.os) : -1);
  for (let v = 0; v < n; v++) {
    if (!calque.mesh) { osIdx[v * 4] = rigide; osW[v * 4] = rigide >= 0 ? 1 : 0; continue; }
    const p = (mesh.poids && mesh.poids[v]) || [];
    let k = 0, s = 0;
    for (let j = 0; j + 1 < p.length && k < 4; j += 2) {
      if (!sq.index.has(p[j])) continue;
      osIdx[v * 4 + k] = sq.index.get(p[j]); osW[v * 4 + k] = +p[j + 1]; s += +p[j + 1]; k++;
    }
    for (let j = 0; j < k; j++) osW[v * 4 + j] /= s || 1;
  }
  const trait = new Uint8Array(mesh.triangles.length / 3);
  for (const t of mesh.trait || []) if (t < trait.length) trait[t] = 1;
  return { id: calque.id, image: calque.image, n, repos, uv, indices: Uint16Array.from(mesh.triangles), osIdx, osW, trait,
    pose: new Float32Array(n * 2) };
}

// La peau lineaire : chaque sommet = somme des matrices de ses os, ponderees. Un sommet sans
// poids reste au repos (un mesh sans poids ne bouge pas, il ne disparait pas).
// `pose` : le tableau de sortie (un par instance quand plusieurs personnages partagent le rig).
export function deforme(cal, peau, pose = cal.pose) {
  const { n, repos, osIdx, osW } = cal;
  for (let v = 0; v < n; v++) {
    const x = repos[v * 2], y = repos[v * 2 + 1];
    let X = 0, Y = 0, W = 0;
    for (let k = 0; k < 4; k++) {
      const b = osIdx[v * 4 + k];
      if (b < 0) continue;
      const w = osW[v * 4 + k], o = b * 6;
      X += w * (peau[o] * x + peau[o + 2] * y + peau[o + 4]);
      Y += w * (peau[o + 1] * x + peau[o + 3] * y + peau[o + 5]);
      W += w;
    }
    if (W > 0) { pose[v * 2] = X / W; pose[v * 2 + 1] = Y / W; }
    else { pose[v * 2] = x; pose[v * 2 + 1] = y; }
  }
  return pose;
}

// L'etirement d'un triangle entre le repos et la pose : les deux valeurs singulieres de
// l'application affine qui l'emmene. 1 et 1 = indeforme ; [1.05, 0.97] = 5 % d'allongement
// dans une direction, 3 % d'ecrasement dans l'autre. Le determinant negatif = retourne.
export function etirement(repos, pose, a, b, c) {
  const ux = repos[b * 2] - repos[a * 2], uy = repos[b * 2 + 1] - repos[a * 2 + 1];
  const vx = repos[c * 2] - repos[a * 2], vy = repos[c * 2 + 1] - repos[a * 2 + 1];
  const px = pose[b * 2] - pose[a * 2], py = pose[b * 2 + 1] - pose[a * 2 + 1];
  const qx = pose[c * 2] - pose[a * 2], qy = pose[c * 2 + 1] - pose[a * 2 + 1];
  const det0 = ux * vy - vx * uy;
  if (Math.abs(det0) < 1e-9) return { s1: 1, s2: 1, det: 1 };
  // A = [p q] * inverse([u v])
  const i00 = vy / det0, i01 = -vx / det0, i10 = -uy / det0, i11 = ux / det0;
  const a00 = px * i00 + qx * i10, a01 = px * i01 + qx * i11;
  const a10 = py * i00 + qy * i10, a11 = py * i01 + qy * i11;
  const det = a00 * a11 - a01 * a10;
  // valeurs singulieres d'une 2x2
  const E = (a00 + a11) / 2, F = (a00 - a11) / 2, G = (a10 + a01) / 2, Hh = (a10 - a01) / 2;
  const Q = Math.sqrt(E * E + Hh * Hh), R = Math.sqrt(F * F + G * G);
  return { s1: Q + R, s2: Math.abs(Q - R), det };
}
