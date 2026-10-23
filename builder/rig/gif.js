// Un encodeur GIF anime, sans dependance (le navigateur n'en a pas). Une palette commune a
// toutes les images (coupe medianne sur un histogramme a 5 bits par canal) : nos
// personnages sont en aplats, 255 couleurs suffisent et la palette ne « bave » pas d'une
// image a l'autre. Pas de tramage (il ferait grouiller les aplats). Fond plein : la
// transparence du GIF est a 1 bit, les bords antialiases y seraient cernes de gris.
//
//   const octets = encodeGif(images, largeur, hauteur, { delaiMs: 50 })
//   images : tableaux RGBA (Uint8ClampedArray), tous de la meme taille.

function palette(images, max = 254) {
  const histo = new Uint32Array(32768);
  for (const im of images) for (let i = 0; i < im.length; i += 4) histo[((im[i] >> 3) << 10) | ((im[i + 1] >> 3) << 5) | (im[i + 2] >> 3)]++;
  let boites = [[]];
  for (let k = 0; k < 32768; k++) if (histo[k]) boites[0].push(k);
  const canal = (k, c) => c === 0 ? k >> 10 : c === 1 ? (k >> 5) & 31 : k & 31;
  // ⚠ On coupe une boite au MILIEU de son etendue, pas a sa mediane de population : le fond
  // couvre la moitie de l'image, et une coupe a la mediane le laissait toujours avec le vert
  // du personnage (meme cote, a chaque coupe) — le crapaud sortait couleur fond.
  const etendues = b => [0, 1, 2].map(c => { let lo = 31, hi = 0; for (const k of b) { const v = canal(k, c); if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; });
  while (boites.length < max) {
    // la boite qui pese le plus : population fois etendue au carre (une couleur seule pese 0)
    let meilleure = -1, poids = 0;
    boites.forEach((b, i) => {
      if (b.length < 2) return;
      const e = Math.max(...etendues(b).map(([lo, hi]) => hi - lo));
      const p = b.reduce((s, k) => s + histo[k], 0) * e * e;
      if (p > poids) { poids = p; meilleure = i; }
    });
    if (meilleure < 0) break;
    const b = boites[meilleure];
    const e = etendues(b);
    const c = [0, 1, 2].reduce((m, k) => (e[k][1] - e[k][0] > e[m][1] - e[m][0] ? k : m), 0);
    const milieu = (e[c][0] + e[c][1]) / 2;
    boites.splice(meilleure, 1, b.filter(k => canal(k, c) <= milieu), b.filter(k => canal(k, c) > milieu));
  }
  const couleurs = [], vers = new Uint8Array(32768);
  boites.forEach((b, i) => {
    let r = 0, g = 0, bl = 0, n = 0;
    for (const k of b) { const w = histo[k]; r += canal(k, 0) * w; g += canal(k, 1) * w; bl += canal(k, 2) * w; n += w; vers[k] = i; }
    couleurs.push([Math.round(r / n * 255 / 31), Math.round(g / n * 255 / 31), Math.round(bl / n * 255 / 31)]);
  });
  return { couleurs, vers };
}

function lzw(indices, tailleMin) {
  const sortie = [];
  let acc = 0, nb = 0;
  const ecris = (code, taille) => { acc |= code << nb; nb += taille; while (nb >= 8) { sortie.push(acc & 255); acc >>= 8; nb -= 8; } };
  const effacer = 1 << tailleMin, fin = effacer + 1;
  let dico = new Map(), suivant = fin + 1, taille = tailleMin + 1;
  ecris(effacer, taille);
  let w = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], cle = w * 4096 + k;
    if (dico.has(cle)) { w = dico.get(cle); continue; }
    ecris(w, taille);
    if (suivant < 4096) { dico.set(cle, suivant++); if (suivant > (1 << taille) && taille < 12) taille++; }
    else { ecris(effacer, taille); dico = new Map(); suivant = fin + 1; taille = tailleMin + 1; }
    w = k;
  }
  ecris(w, taille);
  ecris(fin, taille);
  if (nb > 0) sortie.push(acc & 255);
  return sortie;
}

export function encodeGif(images, W, H, { delaiMs = 50 } = {}) {
  const { couleurs, vers } = palette(images);
  while (couleurs.length < 256) couleurs.push([0, 0, 0]);
  const o = [];
  const mot = v => o.push(v & 255, (v >> 8) & 255);
  o.push(...[...'GIF89a'].map(c => c.charCodeAt(0)));
  mot(W); mot(H); o.push(0xF7, 0, 0); // palette globale de 256 couleurs
  for (const c of couleurs) o.push(...c);
  o.push(0x21, 0xFF, 11, ...[...'NETSCAPE2.0'].map(c => c.charCodeAt(0)), 3, 1, 0, 0, 0); // en boucle
  const delai = Math.max(2, Math.round(delaiMs / 10));
  // Apres la premiere image, un pixel qui ne change pas d'indice devient TRANSPARENT (indice
  // 255, jamais pris par la palette) et l'image d'avant reste dessous (« ne pas effacer ») :
  // un idle subtil change peu de pixels, le fichier fond de moitie ou plus.
  const TROU = 255;
  let avant = null;
  for (const im of images) {
    const idx = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < im.length; i += 4, p++) idx[p] = vers[((im[i] >> 3) << 10) | ((im[i + 1] >> 3) << 5) | (im[i + 2] >> 3)];
    const ecrit = idx.slice();
    if (avant) for (let p = 0; p < idx.length; p++) if (idx[p] === avant[p]) ecrit[p] = TROU;
    o.push(0x21, 0xF9, 4, avant ? 0x05 : 0x04, delai & 255, delai >> 8, TROU, 0);
    o.push(0x2C); mot(0); mot(0); mot(W); mot(H); o.push(0);
    avant = idx;
    o.push(8);
    const donnees = lzw(ecrit, 8);
    for (let i = 0; i < donnees.length; i += 255) { const bloc = donnees.slice(i, i + 255); o.push(bloc.length, ...bloc); }
    o.push(0);
  }
  o.push(0x3B);
  return new Uint8Array(o);
}
