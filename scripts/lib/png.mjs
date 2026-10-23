// Lire et ecrire un PNG sous Node, sans dependance (zlib de Node + le (de)filtrage du format).
// Sert aux outils du rig (scripts/rig-*.mjs) : Node n'a pas de canvas pour toucher des pixels.
// Lecture : 8 bits par canal, non entrelace, en RGBA, RGB, niveaux de gris (avec ou sans
// alpha) et palette (avec tRNS) — ce que produisent nos outils de dessin. Ecriture : RGBA.

import zlib from 'node:zlib';
import fs from 'node:fs';

export function lisPng(chemin) { return decodePng(fs.readFileSync(chemin)); }

export function decodePng(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!sig.every((b, i) => buf[i] === b)) throw new Error('pas un PNG');
  let o = 8, W = 0, H = 0, prof = 0, type = 0, entrelace = 0, palette = null, trns = null;
  const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), nom = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
    if (nom === 'IHDR') { W = d.readUInt32BE(0); H = d.readUInt32BE(4); prof = d[8]; type = d[9]; entrelace = d[12]; }
    else if (nom === 'PLTE') palette = d;
    else if (nom === 'tRNS') trns = d;
    else if (nom === 'IDAT') idat.push(d);
    else if (nom === 'IEND') break;
    o += 12 + len;
  }
  if (prof !== 8) throw new Error(`PNG en ${prof} bits par canal : seul 8 est lu`);
  if (entrelace) throw new Error('PNG entrelacé : non lu');
  const canaux = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!canaux) throw new Error('type de couleur PNG inconnu : ' + type);
  const brut = zlib.inflateSync(Buffer.concat(idat));
  const ligne = W * canaux, px = Buffer.alloc(ligne * H);
  let prec = Buffer.alloc(ligne);
  for (let y = 0; y < H; y++) {
    const f = brut[y * (ligne + 1)], src = brut.subarray(y * (ligne + 1) + 1, (y + 1) * (ligne + 1));
    const cur = px.subarray(y * ligne, (y + 1) * ligne);
    for (let x = 0; x < ligne; x++) {
      const a = x >= canaux ? cur[x - canaux] : 0, b = prec[x], c = x >= canaux ? prec[x - canaux] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 255;
    }
    prec = cur;
  }
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const s = i * canaux, d = i * 4;
    if (type === 6) { data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; data[d + 3] = px[s + 3]; }
    else if (type === 2) { data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; data[d + 3] = 255; }
    else if (type === 0) { data[d] = data[d + 1] = data[d + 2] = px[s]; data[d + 3] = 255; }
    else if (type === 4) { data[d] = data[d + 1] = data[d + 2] = px[s]; data[d + 3] = px[s + 1]; }
    else { const k = px[s]; data[d] = palette[k * 3]; data[d + 1] = palette[k * 3 + 1]; data[d + 2] = palette[k * 3 + 2]; data[d + 3] = trns && k < trns.length ? trns[k] : 255; }
  }
  return { largeur: W, hauteur: H, data };
}

// Ecrire un PNG RGBA 8 bits (filtre « Sub » sur chaque ligne : compact pour des aplats).
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function morceau(nom, donnees) {
  const l = Buffer.alloc(4); l.writeUInt32BE(donnees.length);
  const corps = Buffer.concat([Buffer.from(nom, 'latin1'), donnees]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(corps));
  return Buffer.concat([l, corps, c]);
}
export function encodePng({ largeur: W, hauteur: H, data }) {
  const ligne = W * 4, brut = Buffer.alloc((ligne + 1) * H);
  for (let y = 0; y < H; y++) {
    const o = y * (ligne + 1), s = y * ligne;
    brut[o] = 1;
    for (let x = 0; x < ligne; x++) brut[o + 1 + x] = (data[s + x] - (x >= 4 ? data[s + x - 4] : 0)) & 255;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), morceau('IHDR', ihdr),
    morceau('IDAT', zlib.deflateSync(brut, { level: 9 })), morceau('IEND', Buffer.alloc(0))]);
}
export function ecrisPng(chemin, im) { fs.writeFileSync(chemin, encodePng(im)); }
