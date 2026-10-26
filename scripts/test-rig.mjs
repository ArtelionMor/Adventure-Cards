// Le banc du rig (game/src/rig/) : squelette, IK, clips, maillage, validateur, decoupage en
// calques (builder/rig/calques.js), ecriture des JSON et des PNG,
// et les personnages de game/data/rigs/ (aucune erreur du validateur). Aucun navigateur :
// le rendu WebGL se juge sur les planches (scripts/rig-rendu.mjs).
//
//   node scripts/test-rig.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareSquelette, poseNeutre, mondeNeuf, calculeMonde, matricesDePeau, boutDe } from '../game/src/rig/squelette.js';
import { prepareClip, evalueClip, melange, fonctionDeCourbe } from '../game/src/rig/clip.js';
import { grilleDepuisImage, poidsAuto, prepareCalque, deforme, etirement, osDuCalque } from '../game/src/rig/mesh.js';
import { prepareRig, creeAnimateur } from '../game/src/rig/joueur.js';
import { verifieClips, verifieRig, zonesSousUnCalque } from '../game/src/rig/verifie.js';
import { formateJson } from '../builder/rig/json.js';
import { encodeGif } from '../builder/rig/gif.js';
import { decodePng, encodePng } from './lib/png.mjs';
import { regionsSous, unionRegions, regionContient, affineZones, affineParRegions } from '../builder/rig/sam.js';
import { valideReglages, cibles, REGLAGES_DEFAUT } from './lib/sam.mjs';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, ko = 0;
const test = (nom, f) => {
  try { const r = f(); if (r === false) throw new Error('faux'); ok++; }
  catch (e) { ko++; console.log('✗ ' + nom + ' : ' + e.message); }
};
const proche = (a, b, eps = 1e-6, quoi = '') => { if (Math.abs(a - b) > eps) throw new Error(`${quoi} ${a} ≠ ${b}`); };

// Un petit rig : une racine qui monte, un bras a droite, une main au bout du bras.
const RIG = {
  format: 'adventure-rig', version: 1, id: 't', source: { image: 's.png', largeur: 200, hauteur: 200 },
  os: [
    { id: 'racine', parent: null, x: 100, y: 180, angle: -90, longueur: 80 },
    { id: 'bras', parent: 'racine', x: 100, y: 100, angle: 0, longueur: 50 },
    { id: 'main', parent: 'bras', x: 150, y: 100, angle: 0, longueur: 20 },
  ],
  calques: [{ id: 'q', image: 's.png', os: 'bras', x: 100, y: 90, largeur: 50, hauteur: 20, ordre: 0 }],
};

// ------------------------------------------------------------------ squelette
test('au repos, le monde est la pose de repos', () => {
  const sq = prepareSquelette(RIG), m = calculeMonde(sq, poseNeutre(3), mondeNeuf(3));
  RIG.os.forEach((o, i) => { proche(m.x[i], o.x, 1e-9, o.id + '.x'); proche(m.y[i], o.y, 1e-9, o.id + '.y'); proche(m.a[i], o.angle, 1e-9, o.id + '.a'); });
});
test('au repos, les matrices de peau sont l\'identite', () => {
  const sq = prepareSquelette(RIG), p = matricesDePeau(sq, calculeMonde(sq, poseNeutre(3), mondeNeuf(3)));
  for (let i = 0; i < 3; i++) [1, 0, 0, 1, 0, 0].forEach((v, k) => proche(p[i * 6 + k], v, 1e-9));
});
test('un enfant suit la rotation de son parent (90° horaire)', () => {
  const sq = prepareSquelette(RIG), pose = poseNeutre(3);
  pose.rot[1] = 90;
  const m = calculeMonde(sq, pose, mondeNeuf(3));
  proche(m.x[2], 100, 1e-9, 'main.x'); proche(m.y[2], 150, 1e-9, 'main.y'); // le bras pointe vers le bas
  const [bx, by] = boutDe(sq, m, 2); proche(bx, 100, 1e-9); proche(by, 170, 1e-9);
});
test('x/y d\'un clip sont dans les axes de l\'image (meme sous un parent tourne au repos)', () => {
  const sq = prepareSquelette(RIG), pose = poseNeutre(3);
  pose.y[1] = 10; // racine a -90 : 10 px vers le bas a l'ecran, pas le long de la racine
  const m = calculeMonde(sq, pose, mondeNeuf(3));
  proche(m.x[1], 100, 1e-9); proche(m.y[1], 110, 1e-9);
});
test('l\'echelle ne se transmet pas : elle deplace l\'enfant, ne le grossit pas', () => {
  const sq = prepareSquelette(RIG), pose = poseNeutre(3);
  pose.sx[1] = 2;
  const m = calculeMonde(sq, pose, mondeNeuf(3));
  proche(m.x[2], 200, 1e-9, 'main poussee au bout du bras double'); proche(m.sx[2], 1, 1e-9, 'main pas grossie');
});
test('un parent inconnu et une boucle sont refuses', () => {
  let n = 0;
  try { prepareSquelette({ os: [{ id: 'a', parent: 'z' }] }); } catch { n++; }
  try { prepareSquelette({ os: [{ id: 'a', parent: 'b' }, { id: 'b', parent: 'a' }] }); } catch { n++; }
  return n === 2;
});

// ------------------------------------------------------------------ clips
const sq = prepareSquelette(RIG);
const evalue = (json, t) => evalueClip(sq, prepareClip(sq, json), t);
test('les cles : valeur exacte sur une cle, interpolee entre deux', () => {
  const c = { duree: 2, boucle: false, pistes: { bras: { rot: [{ t: 0, v: 0, courbe: 'lineaire' }, { t: 1, v: 10 }] } } };
  proche(evalue(c, 1).rot[1], 10); proche(evalue(c, 0.5).rot[1], 5); proche(evalue(c, 1.7).rot[1], 10, 1e-9, 'tenue apres la derniere');
});
test('en boucle, la derniere cle rejoint la premiere', () => {
  const c = { duree: 4, pistes: { bras: { rot: [{ t: 0, v: 0, courbe: 'lineaire' }, { t: 2, v: 10, courbe: 'lineaire' }] } } };
  proche(evalue(c, 3).rot[1], 5); proche(evalue(c, 4).rot[1], 0); proche(evalue(c, 5).rot[1], 5);
});
test('courbes : palier tient, douce part et arrive a plat, Bezier CSS', () => {
  const c = { duree: 2, boucle: false, pistes: { bras: { rot: [{ t: 0, v: 0, courbe: 'palier' }, { t: 1, v: 10 }] } } };
  proche(evalue(c, 0.99).rot[1], 0);
  const d = fonctionDeCourbe('douce');
  proche(d(0.5), 0.5, 1e-4); if (!(d(0.05) < 0.05 && d(0.95) > 0.95)) throw new Error('pas d\'ease');
  proche(fonctionDeCourbe([0, 0, 1, 1])(0.3), 0.3, 1e-4);
  return fonctionDeCourbe('inventee') === null;
});
test('sx/sy : facteur dans les pistes, decalage dans les modificateurs', () => {
  const c = { duree: 2, pistes: { bras: { sx: [{ t: 0, v: 1.1 }] } }, procedural: [{ type: 'sinus', os: 'bras', canal: 'sx', amplitude: 0.05, periode: 2, phase: 0.25 }] };
  proche(evalue(c, 0).sx[1], 1.15, 1e-9);
});
const CLIP_RICHE = {
  duree: 3, pistes: { bras: { rot: [{ t: 0, v: 0 }, { t: 1.2, v: 6 }, { t: 2.1, v: -3 }] } },
  procedural: [
    { type: 'sinus', os: 'racine', canal: 'rot', amplitude: 2, periode: 1.5, phase: 0.2 },
    { type: 'bruit', os: ['racine', 'bras'], canal: 'y', amplitude: 3, periode: 0.7, graine: 4 },
    { type: 'ressort', os: ['main'], source: 'bras', frequence: 2, amortissement: 0.3, gainY: 0.5 },
    { type: 'evenement', intervalle: [0.8, 1.4], graine: 9, pistes: { main: { rot: [{ t: 0, v: 0 }, { t: 0.2, v: 8 }, { t: 0.5, v: 0 }] } } },
  ],
};
test('un clip en boucle est periodique (cles, sinus, bruit, ressort, evenements)', () => {
  const c = prepareClip(sq, CLIP_RICHE);
  for (const t of [0, 0.37, 1.9, 2.99]) {
    const a = evalueClip(sq, c, t), b = evalueClip(sq, c, t + 3), z = evalueClip(sq, c, t - 6);
    for (const k of ['rot', 'x', 'y', 'sx', 'sy']) for (let i = 0; i < 3; i++) { proche(a[k][i], b[k][i], 1e-6, `${k}[${i}] t=${t}`); proche(a[k][i], z[k][i], 1e-6); }
  }
});
test('un clip est deterministe (meme graine, meme valeur)', () => {
  const a = evalueClip(sq, prepareClip(sq, CLIP_RICHE), 1.3).y[1], b = evalueClip(sq, prepareClip(sq, CLIP_RICHE), 1.3).y[1];
  return a === b && a !== 0;
});
test('le bruit reste dans son amplitude (a 25 % pres : Catmull-Rom deborde un peu)', () => {
  const c = prepareClip(sq, { duree: 10, procedural: [{ type: 'bruit', os: 'bras', canal: 'rot', amplitude: 2, periode: 0.5, graine: 1 }] });
  let m = 0; for (let t = 0; t < 10; t += 0.01) m = Math.max(m, Math.abs(evalueClip(sq, c, t).rot[1]));
  return m <= 2.5 && m > 1;
});
test('un ressort sur une source immobile ne bouge pas', () => {
  const c = prepareClip(sq, { duree: 2, procedural: [{ type: 'ressort', os: 'main', source: 'bras' }] });
  proche(evalueClip(sq, c, 0.7).rot[2], 0, 1e-9);
});
test('un ressort traine derriere sa source, puis la rattrape', () => {
  // le bras tourne de 10° d'un coup a t=1 ; la main doit d'abord rester en arriere (decalage negatif)
  const c = prepareClip(sq, { duree: 4, boucle: false, pistes: { bras: { rot: [{ t: 0, v: 0, courbe: 'palier' }, { t: 1, v: 10 }] } },
    procedural: [{ type: 'ressort', os: 'main', source: 'bras', frequence: 2, amortissement: 0.5 }] });
  const juste = evalueClip(sq, c, 1.02).rot[2], tard = evalueClip(sq, c, 3.9).rot[2];
  return juste < -8 && Math.abs(tard) < 0.3;
});
test('les evenements tombent dans leur intervalle (a l\'echelle pres) et partent', () => {
  const c = prepareClip(sq, { duree: 20, procedural: [{ type: 'evenement', intervalle: [2, 4], graine: 3, pistes: { main: { rot: [{ t: 0, v: 0 }, { t: 0.1, v: 5 }, { t: 0.3, v: 0 }] } } }] });
  const d = c.evenements[0].debuts;
  return d.length >= 5 && d.length <= 10 && d.every((t, i) => i === 0 || t - d[i - 1] > 1.5);
});
test('le fondu interpole chaque canal', () => {
  const a = poseNeutre(3), b = poseNeutre(3); b.rot[1] = 10; b.sx[1] = 2;
  const m = melange(a, b, 0.25); proche(m.rot[1], 2.5); proche(m.sx[1], 1.25);
});
test('l\'animateur fond d\'un clip a l\'autre puis lache l\'ancien', () => {
  const rig = prepareRig(RIG, { clips: { a: { duree: 1, pistes: { bras: { rot: [{ t: 0, v: 0 }] } } }, b: { duree: 1, pistes: { bras: { rot: [{ t: 0, v: 20 }] } } } } });
  const an = creeAnimateur(rig).joue('a').calcule();
  an.joue('b', { fondu: 0.4 }).avance(0.2).calcule();
  const milieu = an.pose.rot[1];
  an.avance(0.3).calcule();
  return milieu > 5 && milieu < 15 && an.avant === null && an.pose.rot[1] === 20;
});

// ------------------------------------------------------------------ maillage
// Une image 64 x 64 : un disque plein, cerne de noir.
const IMG = (() => {
  const W = 64, d = new Uint8ClampedArray(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const r = Math.hypot(x - 32, y - 32), o = (y * W + x) * 4;
    if (r < 20) { const noir = r > 16; d[o] = noir ? 0 : 120; d[o + 1] = noir ? 0 : 200; d[o + 2] = noir ? 0 : 90; d[o + 3] = 255; }
  }
  return { largeur: W, hauteur: W, data: d };
})();
const MESH = grilleDepuisImage(IMG, { pas: 8 });
test('la grille ne garde que les cases ou il y a de la matiere', () => {
  const xs = MESH.sommets.filter((_, i) => i % 2 === 0);
  return Math.min(...xs) >= 0 && Math.max(...xs) <= 64 && MESH.triangles.length / 3 < (64 / 8) ** 2 * 2 && MESH.triangles.length > 0;
});
test('la grille marque les triangles qui portent du contour, pas le centre', () => {
  const centre = MESH.triangles.findIndex((_, j) => j % 3 === 0 && [0, 1, 2].every(k => Math.hypot(MESH.sommets[MESH.triangles[j + k] * 2] - 32, MESH.sommets[MESH.triangles[j + k] * 2 + 1] - 32) < 9));
  return MESH.trait.length > 0 && centre >= 0 && !MESH.trait.includes(centre / 3);
});
const SQ_DISQUE = prepareSquelette({ os: [{ id: 'a', x: 32, y: 50, angle: -90, longueur: 18 }, { id: 'b', parent: 'a', x: 32, y: 32, angle: -90, longueur: 18 }] });
test('les poids automatiques font 1 et suivent l\'os le plus proche', () => {
  const W = poidsAuto(MESH, SQ_DISQUE);
  const sommes = W.every(w => { let s = 0; for (let j = 1; j < w.length; j += 2) s += w[j]; return Math.abs(s - 1) < 0.01; });
  const haut = MESH.sommets.findIndex((v, i) => i % 2 === 1 && v <= 16) - 1; // un sommet du haut (x, y)
  const w = W[haut / 2];
  return sommes && w[0] === 'b';
});
// Un « U » : deux bras separes par du vide, reunis en bas. A vol d'oiseau, le haut du bras
// droit est plus pres de l'os du bras gauche que du bas ; en marchant sur le mesh, non.
const U = (() => {
  const W = 64, d = new Uint8ClampedArray(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const plein = (y >= 48 && x >= 8 && x < 56) || (y >= 4 && ((x >= 8 && x < 24) || (x >= 40 && x < 56)));
    if (plein) d.set([100, 160, 90, 255], (y * W + x) * 4);
  }
  return { largeur: W, hauteur: W, data: d };
})();
const MESH_U = grilleDepuisImage(U, { pas: 4 });
const OS_U = [
  { id: 'base', x: 8, y: 56, angle: 0, longueur: 48 },
  { id: 'gauche', parent: 'base', x: 16, y: 44, angle: -90, longueur: 36 },
  { id: 'droite', parent: 'base', x: 48, y: 44, angle: -90, longueur: 36 },
];
const SQ_U = prepareSquelette({ os: OS_U });
const poidsEn = (W, x, y, os) => { const v = MESH_U.sommets.findIndex((s, i) => i % 2 === 0 && s === x && MESH_U.sommets[i + 1] === y) / 2; const w = W[v]; const k = w.indexOf(os); return k < 0 ? 0 : w[k + 1]; };
test('poids geodesiques : un bras ne tire pas sur l\'autre a travers le vide', () => {
  const geo = poidsAuto(MESH_U, SQ_U), vol = poidsAuto(MESH_U, SQ_U, { geodesique: false });
  // le bord interieur du bras droit, en haut : (40, 8)
  return poidsEn(geo, 40, 8, 'gauche') < poidsEn(vol, 40, 8, 'gauche') && poidsEn(geo, 40, 8, 'gauche') < 0.05;
});
test('la portee d\'un os l\'etend', () => {
  const sq2 = prepareSquelette({ os: OS_U.map(o => (o.id === 'gauche' ? { ...o, portee: 2 } : o)) });
  return poidsEn(poidsAuto(MESH_U, sq2), 16, 52, 'gauche') > poidsEn(poidsAuto(MESH_U, SQ_U), 16, 52, 'gauche');
});

test('deformer au repos rend le repos', () => {
  const mesh = { ...MESH, poids: poidsAuto(MESH, SQ_DISQUE) };
  const cal = prepareCalque({ id: 'c', mesh, largeur: 64, hauteur: 64 }, SQ_DISQUE, [64, 64]);
  const p = deforme(cal, matricesDePeau(SQ_DISQUE, calculeMonde(SQ_DISQUE, poseNeutre(2), mondeNeuf(2))));
  for (let i = 0; i < p.length; i++) proche(p[i], cal.repos[i], 1e-4);
});
test('etirement : identite, echelle, retournement', () => {
  const R = [0, 0, 10, 0, 0, 10];
  const e1 = etirement(R, R, 0, 1, 2), e2 = etirement(R, R.map(v => v * 1.1), 0, 1, 2), e3 = etirement(R, [0, 0, -10, 0, 0, 10], 0, 1, 2);
  proche(e1.s1, 1); proche(e1.s2, 1); proche(e2.s1, 1.1); proche(e2.s2, 1.1);
  return e3.det < 0;
});

// ------------------------------------------------------------------ validateur
const RIG_MESH = { format: 'adventure-rig', version: 1, source: { image: 's.png', largeur: 64, hauteur: 64 },
  os: [{ id: 'a', parent: null, x: 32, y: 50, angle: -90, longueur: 18 }, { id: 'b', parent: 'a', x: 32, y: 32, angle: -90, longueur: 18 }],
  calques: [{ id: 'c', image: 's.png', x: 0, y: 0, largeur: 64, hauteur: 64, mesh: { ...MESH, poids: poidsAuto(MESH, SQ_DISQUE) } }] };
const codes = (clips) => verifieClips(RIG_MESH, { format: 'adventure-rig-clips', clips }).constats.map(c => c.code);
test('un clip sage ne dit rien', () => codes({ i: { duree: 2, procedural: [{ type: 'sinus', os: 'b', canal: 'rot', amplitude: 1, periode: 1 }] } }).length === 0);
test('un sinus dont la periode ne divise pas la duree : couture-sinus', () => codes({ i: { duree: 2, procedural: [{ type: 'sinus', os: 'b', canal: 'rot', amplitude: 1, periode: 0.7 }] } }).includes('couture-sinus'));
test('une cle de fin differente du debut : la boucle saute', () => codes({ i: { duree: 2, pistes: { b: { rot: [{ t: 0, v: 0 }, { t: 1.9999, v: 20, courbe: 'palier' }] } } } }).includes('boucle-saute'));
test('une echelle forte : le contour s\'etire', () => codes({ i: { duree: 2, pistes: { b: { sx: [{ t: 0, v: 1 }, { t: 1, v: 1.3 }] } } } }).includes('etirement-trait'));
test('un os ou un canal inconnu, une courbe inventee', () => {
  const c = codes({ i: { duree: 2, pistes: { zz: { rot: [{ t: 0, v: 0 }] }, b: { tourne: [{ t: 0, v: 0 }], rot: [{ t: 0, v: 0, courbe: 'molle' }] } } } });
  return c.includes('os-inconnu') && c.includes('canal-inconnu') && c.includes('courbe-inconnue');
});
test('un triangle retourne', () => codes({ i: { duree: 2, boucle: false, pistes: { b: { sy: [{ t: 0, v: 1 }, { t: 1, v: -1 }] } } } }).includes('retourne'));
test('un calque rigide qui s\'ecarte de son parent : detache', () => {
  const r = { ...RIG, calques: [{ id: 'main', os: 'main', x: 150, y: 95, largeur: 20, hauteur: 10 }] };
  return verifieClips(r, { format: 'adventure-rig-clips', clips: { i: { duree: 1, pistes: { main: { x: [{ t: 0, v: 0 }, { t: 0.5, v: 12 }] } } } } }).constats.some(c => c.code === 'detache');
});
test('un rig sans format ni taille', () => verifieRig({ os: [] }).filter(c => c.code === 'format').length >= 2);

// ------------------------------------------------------------------ fichiers
test('formateJson : le texte se relit a l\'identique', () => {
  const o = { a: [1, 2, 3], b: { t: 0, v: 1 }, c: [{ t: 0, v: 0, courbe: [0.1, 0, 0.2, 1] }], d: 'é', e: null, f: [] };
  return JSON.stringify(JSON.parse(formateJson(o))) === JSON.stringify(o);
});
test('le PNG se relit (filtres compris)', () => {
  // un PNG RGBA 3 x 2 ecrit a la main, filtre « Sub » sur la 2e ligne
  const brut = Buffer.from([0, 255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 1, 10, 20, 30, 40, 1, 1, 1, 1, 1, 1, 1, 1]);
  const morceau = (nom, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); return Buffer.concat([l, Buffer.from(nom), d, Buffer.alloc(4)]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(3, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), morceau('IHDR', ihdr), morceau('IDAT', zlib.deflateSync(brut)), morceau('IEND', Buffer.alloc(0))]);
  const im = decodePng(png);
  return im.largeur === 3 && im.data[4 * 3] === 10 && im.data[4 * 4] === 11 && im.data[4 * 5 + 3] === 42;
});
test('le GIF a son en-tete, sa boucle, ses images', () => {
  const W = 8, a = new Uint8ClampedArray(W * W * 4).fill(255), b = a.slice(); b[0] = 0;
  const g = encodeGif([a, b], W, W);
  return String.fromCharCode(...g.slice(0, 6)) === 'GIF89a' && g[g.length - 1] === 0x3B && g.filter((v, i) => v === 0x2C && g[i - 8] === 0x21).length >= 2;
});

// ------------------------------------------------------------------ IK a 2 os
const RIG_IK = { os: [
  { id: 'hanche', x: 0, y: 0, angle: 90, longueur: 50 },
  { id: 'genou', parent: 'hanche', x: 0, y: 50, angle: 90, longueur: 50 },
  { id: 'cible', x: 0, y: 100, angle: 0, longueur: 10 },
], ik: [{ os: ['hanche', 'genou'], cible: 'cible', flexion: 1 }] };
const finDe = (rig, cx, cy) => {
  const sqk = prepareSquelette(rig), pose = poseNeutre(3);
  pose.x[2] = cx; pose.y[2] = cy - 100;
  const m = calculeMonde(sqk, pose, mondeNeuf(3));
  return { bout: boutDe(sqk, m, 1), genou: [m.x[1], m.y[1]] };
};
test('IK : la pointe du 2e os rejoint la cible', () => {
  const { bout } = finDe(RIG_IK, 30, 70);
  proche(bout[0], 30, 1e-6, 'x'); proche(bout[1], 70, 1e-6, 'y');
});
test('IK : « flexion » choisit le cote du genou', () => {
  const a = finDe(RIG_IK, 0, 80).genou[0], b = finDe({ ...RIG_IK, ik: [{ ...RIG_IK.ik[0], flexion: -1 }] }, 0, 80).genou[0];
  return Math.sign(a) === -Math.sign(b) && Math.abs(a) > 5;
});
test('IK : une cible hors de portee tend le membre vers elle', () => {
  const { bout } = finDe(RIG_IK, 0, 300);
  proche(bout[0], 0, 0.05); proche(bout[1], 100, 0.05);
});
test('IK mal formee : signalee, et ignoree par le moteur', () => {
  const r = { format: 'adventure-rig', source: { largeur: 10, hauteur: 10 }, os: RIG_IK.os, ik: [{ os: ['genou', 'hanche'], cible: 'cible' }, { os: ['hanche', 'genou'], cible: 'nulle' }] };
  return verifieRig(r).filter(c => c.code === 'ik').length === 2 && prepareSquelette(r).ik.length === 0;
});

// ------------------------------------------------------------------ le decoupage en calques
const CQ = await import('../builder/rig/calques.js');
// une image 40 x 40 : un disque rouge cerne de noir (r < 12), sur du transparent
const DISQUE = (() => {
  const W = 40, im = CQ.imageVide(W, W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const r = Math.hypot(x + 0.5 - 20, y + 0.5 - 20), o = (y * W + x) * 4;
    if (r < 12) im.data.set(r > 9 ? [0, 0, 0, 255] : [220, 40, 40, 255], o);
  }
  return im;
})();
test('masque d\'un polygone : la bonne aire, des bords doux', () => {
  const m = CQ.masquePolygone([[10, 10], [30, 10], [30, 30], [10, 30]], 40, 40);
  const aire = m.reduce((a, b) => a + b, 0);
  const m2 = CQ.masquePolygone([[10.5, 10], [30, 10], [30, 30], [10.5, 30]], 40, 40);
  return Math.abs(aire - 400) < 1 && m2[20 * 40 + 10] > 0.3 && m2[20 * 40 + 10] < 0.7;
});
test('lissage : chaque passe double les sommets', () => CQ.lisse([[0, 0], [10, 0], [10, 10]], 2).length === 12);
test('suivre le contour : le point s\'accroche au trait noir', () => {
  const [x, y] = CQ.accroche(DISQUE, 20, 20 - 14, 5);
  return Math.hypot(x - 20, y - 20) < 12 && Math.hypot(x - 20, y - 20) > 8.5;
});
test('inclure le trait : la selection gagne le cerne, pas au-dela', () => {
  const m = CQ.masquePolygone([[11, 11], [29, 11], [29, 29], [11, 29]].map(([x, y]) => [x + (x > 20 ? -1 : 1) * 1.5, y + (y > 20 ? -1 : 1) * 1.5]), 40, 40);
  const t = CQ.inclutTrait(m, DISQUE, 6);
  return t[20 * 40 + 9] === 1 && t[20 * 40 + 2] === 0; // le cerne (x = 9) oui, le vide (x = 2) non
});
test('extraire : rien ne se perd (nouveau + reste = original), le trou suit la matiere', () => {
  const m = CQ.masquePolygone([[0, 0], [20, 0], [20, 40], [0, 40]], 40, 40);
  const { nouveau, reste, trou } = CQ.extrait(DISQUE, m);
  for (let p = 0; p < 1600; p++) if (Math.abs(nouveau.data[p * 4 + 3] + reste.data[p * 4 + 3] - DISQUE.data[p * 4 + 3]) > 1) return false;
  return trou[20 * 40 + 15] === 1 && trou[1 * 40 + 1] === 0;
});
const rigDisque = () => ({ format: 'adventure-rig', version: 1, source: { image: 's.png', largeur: 40, hauteur: 40 },
  os: [{ id: 'a', x: 20, y: 35, angle: -90, longueur: 30 }, { id: 'b', parent: 'a', x: 20, y: 20, angle: 0, longueur: 10 }],
  calques: [{ id: 'corps', image: 's.png', ordre: 0, x: 0, y: 0, largeur: 40, hauteur: 40 }] });
test('extraire en calque : au-dessus, une zone a combler, la lignee', () => {
  const rig = rigDisque(), images = { corps: CQ.copieImage(DISQUE) }, masques = {};
  const z = CQ.extraitCalque(rig, images, masques, { depuis: 'corps', nom: 'moitie', masque: CQ.masquePolygone([[20, 0], [40, 0], [40, 40], [20, 40]], 40, 40), os: 'b' });
  const c = rig.calques.find(k => k.id === 'moitie');
  let doublon = false; try { CQ.extraitCalque(rig, images, masques, { depuis: 'corps', nom: 'moitie', masque: new Float32Array(1600).fill(1) }); } catch { doublon = true; }
  return c.ordre === 1 && c.de === 'corps' && c.os === 'b' && z.par === 'moitie' && masques['corps/' + z.id] && rig.calques[0].image === 'calques/corps.png' && doublon;
});
test('transférer : la zone passe des autres calques au calque visé, rien ne se perd', () => {
  const rig = rigDisque(), images = { corps: CQ.copieImage(DISQUE) }, masques = {};
  CQ.extraitCalque(rig, images, masques, { depuis: 'corps', nom: 'moitie', masque: CQ.masquePolygone([[20, 0], [40, 0], [40, 40], [20, 40]], 40, 40) });
  const total = p => images.corps.data[p * 4 + 3] + images.moitie.data[p * 4 + 3];
  const avant = total(20 * 40 + 15);
  const touches = CQ.transfereVers(rig, images, masques, { vers: 'moitie', masque: CQ.masquePolygone([[0, 0], [20, 0], [20, 40], [0, 40]], 40, 40) });
  let rien = false; try { CQ.transfereVers(rig, images, masques, { vers: 'moitie', masque: new Float32Array(1600) }); } catch { rien = true; }
  return touches.join() === 'corps' && images.moitie.data[(20 * 40 + 15) * 4 + 3] > 0 && images.corps.data[(20 * 40 + 15) * 4 + 3] === 0 && total(20 * 40 + 15) === avant && rien;
});
test('fusionner vers le bas rend l\'image d\'origine et retire la zone', () => {
  const rig = rigDisque(), images = { corps: CQ.copieImage(DISQUE) }, masques = {};
  CQ.extraitCalque(rig, images, masques, { depuis: 'corps', nom: 'moitie', masque: CQ.masquePolygone([[20, 0], [40, 0], [40, 40], [20, 40]], 40, 40) });
  CQ.fusionneVersLeBas(rig, images, masques, 'moitie');
  for (let o = 0; o < DISQUE.data.length; o++) if (Math.abs(images.corps.data[o] - DISQUE.data[o]) > 2) return false;
  return rig.calques.length === 1 && !(rig.calques[0].zones || []).length && !Object.keys(masques).length;
});
test('renommer un calque suit la lignee, les zones et leurs masques', () => {
  const rig = rigDisque(), images = { corps: CQ.copieImage(DISQUE) }, masques = {};
  const z = CQ.extraitCalque(rig, images, masques, { depuis: 'corps', nom: 'moitie', masque: CQ.masquePolygone([[20, 0], [40, 0], [40, 40], [20, 40]], 40, 40) });
  CQ.renommeCalque(rig, images, masques, 'corps', 'fond');
  CQ.renommeCalque(rig, images, masques, 'moitie', 'droite');
  const f = rig.calques.find(k => k.id === 'fond'), d = rig.calques.find(k => k.id === 'droite');
  return d.de === 'fond' && f.zones[0].par === 'droite' && masques['fond/' + z.id] && f.zones[0].masque === `masques/fond-${z.id}.png` && images.fond && images.droite;
});
test('combler provisoirement : pres de la matiere, pas au-dela', () => {
  const im = CQ.imageVide(40, 10), trou = new Float32Array(400);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 40; x++) { if (x < 10) im.data.set([0, 200, 0, 255], (y * 40 + x) * 4); else trou[y * 40 + x] = 1; }
  const out = CQ.comblePrevisoire(im, trou, 8);
  const a = x => out.data[(5 * 40 + x) * 4 + 3], g = x => out.data[(5 * 40 + x) * 4 + 1];
  return a(12) === 255 && g(12) > 150 && a(30) === 0;
});
test('enregistrer puis relire : chaque calque recadre, puis remis en place a l\'identique', () => {
  const rig = rigDisque(), images = { corps: CQ.copieImage(DISQUE) }, masques = {};
  CQ.extraitCalque(rig, images, masques, { depuis: 'corps', nom: 'moitie', masque: CQ.masquePolygone([[20, 0], [40, 0], [40, 40], [20, 40]], 40, 40) });
  const { json, fichiers } = CQ.pourEnregistrer(rig, images, masques);
  const parChemin = Object.fromEntries(fichiers.map(f => [f.chemin, f.image]));
  const m = json.calques.find(k => k.id === 'moitie');
  if (!(m.x >= 19 && m.largeur <= 13)) return false;
  const relu = CQ.depuisFichiers(json, c => parChemin[c] || (c === 's.png' ? DISQUE : null));
  // (la couleur d'un pixel tout a fait transparent ne compte pas : elle ne se voit pas)
  for (const id of ['corps', 'moitie']) for (let p = 0; p < 1600; p++) {
    const A = relu.images[id].data, B = images[id].data;
    if (A[p * 4 + 3] !== B[p * 4 + 3]) return false;
    if (B[p * 4 + 3] > 0) for (let c = 0; c < 3; c++) if (A[p * 4 + c] !== B[p * 4 + c]) return false;
  }
  return Object.keys(relu.masques).length === 1;
});
test('les os d\'un calque maille : sans ceux des calques rigides', () => {
  const rig = rigDisque(); rig.calques.push({ id: 'x', os: 'b' });
  return JSON.stringify(osDuCalque(rig, rig.calques[0])) === '["a"]' && JSON.stringify(osDuCalque({ ...rig, calques: [{ ...rig.calques[0], osPoids: ['b'] }] }, { osPoids: ['b'] })) === '["b"]';
});
test('zones : seul le calque qui a laisse le trou (et sa lignee) le recouvre', () => {
  const r = { source: { largeur: 100, hauteur: 100 }, os: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], calques: [
    { id: 'fond', ordre: 0, os: 'a', zones: [{ id: 'z1', x: 10, y: 10, largeur: 30, hauteur: 30, etat: 'a-combler', par: 'objet' }] },
    { id: 'objet', ordre: 1, os: 'b', de: 'fond' },
    { id: 'piece', ordre: 2, os: 'c', de: 'objet' },
    { id: 'voisin', ordre: 3, os: 'c' },
  ] };
  const z = zonesSousUnCalque(r).map(q => q.dessus).sort().join(',');
  const prov = zonesSousUnCalque({ ...r, calques: r.calques.map(k => k.id === 'fond' ? { ...k, zones: [{ ...k.zones[0], etat: 'provisoire' }] } : k) });
  const statiques = verifieRig({ ...r, format: 'adventure-rig', calques: r.calques.map(k => k.id === 'fond' ? { ...k, zones: [{ ...k.zones[0], etat: 'provisoire' }] } : k) }).filter(c => c.code === 'zone-a-combler');
  return z === 'objet,piece' && prov.length === 2 && statiques.length === 0;
});
test('PNG : ecrire puis relire rend les memes pixels', () => {
  const im = CQ.copieImage(DISQUE);
  const relu = decodePng(encodePng(im));
  for (let o = 0; o < im.data.length; o++) if (relu.data[o] !== im.data[o]) return false;
  return relu.largeur === 40;
});

// ------------------------------------------------------------------ decoupe auto (SAM)
{
  // deux regions : un grand carre 6x6 en (2,2), un petit 2x2 en (3,3) dedans
  const grand = { id: 0, aire: 36, x: 2, y: 2, w: 6, h: 6, bits: new Uint8Array(36).fill(1) };
  const petit = { id: 1, aire: 4, x: 3, y: 3, w: 2, h: 2, bits: new Uint8Array(4).fill(1) };
  const rond = { id: 2, aire: 3, x: 0, y: 0, w: 2, h: 2, bits: Uint8Array.from([1, 1, 1, 0]) };
  const regions = [grand, petit, rond];
  test('sam : une region contient ses pixels, pas ceux hors de sa boite', () => regionContient(grand, 2, 2) && regionContient(grand, 7, 7) && !regionContient(grand, 8, 8) && !regionContient(grand, 1, 2));
  test('sam : un bit a zero dans la boite n’est pas dans la region', () => regionContient(rond, 0, 0) && !regionContient(rond, 1, 1));
  test('sam : les regions sous un point, de la plus petite a la plus grande', () => regionsSous(regions, 3, 3).map(r => r.id).join() === '1,0');
  test('sam : un point sans region n’en trouve aucune', () => regionsSous(regions, 9, 9).length === 0);
  test('sam : l’union remplit la boite de chaque region choisie, sans rien d’autre', () => {
    const m = unionRegions(regions, [1, 2], 10, 10);
    let n = 0; for (const v of m) n += v;
    return n === 7 && m[3 * 10 + 3] === 1 && m[0] === 1 && m[1 * 10 + 1] === 0 && m[2 * 10 + 2] === 0;
  });
  test('sam : l’union ignore ce qui sort de l’image', () => unionRegions([{ id: 0, aire: 4, x: 8, y: 8, w: 4, h: 4, bits: new Uint8Array(16).fill(1) }], [0], 10, 10).reduce((a, v) => a + v, 0) === 4);
  // zones grossieres : image 20 x 10 ; region A = colonnes 0-9, region B = colonnes 10-19, toutes deux sur toute la hauteur
  const bits = (w, h) => new Uint8Array(w * h).fill(1);
  const A = { id: 0, aire: 100, x: 0, y: 0, w: 10, h: 10, bits: bits(10, 10) }, B = { id: 1, aire: 100, x: 10, y: 0, w: 10, h: 10, bits: bits(10, 10) };
  const tout = new Uint8Array(200).fill(1);
  const rect = (x0, y0, x1, y1) => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] });
  test('sam zones : une zone grossiere prend les regions qu’elle couvre, avec leurs bords exacts', () => {
    // la zone 0 deborde de 2 colonnes sur B, la zone 1 deborde de 2 colonnes sur A : chacune garde sa region
    const r = affineZones([A, B], [rect(0, 0, 12, 10), rect(8, 0, 20, 10)], 20, 10, tout);
    return r.pixels[0] === 100 && r.pixels[1] === 100 && r.masques[0][5] === 1 && r.masques[0][15] === 0 && r.masques[1][15] === 1;
  });
  test('sam zones : une region a cheval sur deux zones suit le trait dessine', () => {
    const grande = { id: 0, aire: 200, x: 0, y: 0, w: 20, h: 10, bits: bits(20, 10) };
    const r = affineZones([grande], [rect(0, 0, 10, 10), rect(10, 0, 20, 10)], 20, 10, tout);
    return r.pixels[0] === 100 && r.pixels[1] === 100 && r.masques[0][9] === 1 && r.masques[1][10] === 1;
  });
  test('sam zones : hors de toute zone, ou hors du personnage, rien n’est pris', () => {
    const peu = new Uint8Array(200); for (let y = 0; y < 10; y++) for (let x = 0; x < 5; x++) peu[y * 20 + x] = 1;
    const r = affineZones([A, B], [rect(0, 0, 20, 10)], 20, 10, peu);
    return r.pixels[0] === 50 && r.masques[0][7] === 0;
  });
  test('sam zones : deux zones qui se recouvrent, un pixel va a la plus petite', () => {
    const r = affineZones([], [rect(0, 0, 20, 10), rect(0, 0, 4, 10)], 20, 10, tout);
    return r.pixels[1] === 40 && r.pixels[0] === 160 && r.masques[0][2] === 0 && r.masques[1][2] === 1;
  });
  // parties faites de regions : image 20 x 10, A = colonnes 0-9, B = colonnes 10-19, I = un petit carre dans A
  const I = { id: 2, aire: 4, x: 3, y: 3, w: 2, h: 2, bits: new Uint8Array(4).fill(1) };
  test('sam IA : une partie prend les pixels de ses regions', () => {
    const r = affineParRegions([A, B], [[0], [1]], 20, 10, tout, 0);
    return r.pixels[0] === 100 && r.pixels[1] === 100 && r.etiq[5] === 0 && r.etiq[15] === 1;
  });
  test('sam IA : la plus petite region rangee l’emporte, une region non rangee est ignoree', () => {
    const a = affineParRegions([A, B, I], [[0], [1, 2]], 20, 10, tout, 0);
    const b = affineParRegions([A, B, I], [[0], [1]], 20, 10, tout, 0);   // I oubliee : ses pixels restent a A
    return a.etiq[3 * 20 + 3] === 1 && b.etiq[3 * 20 + 3] === 0 && a.pixels[1] === 104;
  });
  test('sam IA : le trait (pixels sans region) suit la partie voisine, dans la limite demandee', () => {
    const petite = { id: 0, aire: 4, x: 5, y: 3, w: 2, h: 2, bits: new Uint8Array(4).fill(1) };
    const r = affineParRegions([petite], [[0]], 20, 10, tout, 2);
    // 2x2 au depart, +8 au premier tour, +12 au second (un losange qui grandit)
    return r.pixels[0] === 24 && affineParRegions([petite], [[0]], 20, 10, tout, 1).pixels[0] === 12 && affineParRegions([petite], [[0]], 20, 10, tout, 0).pixels[0] === 4;
  });
  test('sam IA : une region citee par deux parties va a la premiere ; hors du personnage rien', () => {
    const peu = new Uint8Array(200); for (let y = 0; y < 10; y++) for (let x = 0; x < 5; x++) peu[y * 20 + x] = 1;
    const r = affineParRegions([A], [[0], [0]], 20, 10, peu, 0);
    return r.pixels[0] === 50 && r.pixels[1] === 0;
  });
  test('sam : des reglages venus de la page sont nettoyes (nom invalide, port fou, trop de machines)', () => {
    const r = valideReglages({ exporter: 'oui', reseau: 'tail.ts.net', points: 99, machines: [{ nom: 'mon-mien', port: 7340 }, { nom: '../x', port: 1 }, { nom: 'a b', port: 1 }, { nom: 'ok', port: 70000 }, { nom: 'pc', port: '7341', actif: false }] });
    return r.exporter === false && r.points === 32 && r.machines.length === 2 && r.machines[1].port === 7341 && r.machines[1].actif === false;
  });
  test('sam : sans export, le calcul reste sur cette machine', () => cibles({ ...REGLAGES_DEFAUT, machines: [{ nom: 'mon-mien', port: 7340, actif: true }] }).map(c => c.url).join() === 'http://127.0.0.1:7340');
  test('sam : le reseau Tailscale complete un nom court, pas un nom qui a deja un point', () => {
    const c = cibles({ exporter: true, reseau: 'tail.ts.net', points: 32, machines: [{ nom: 'mon-mien', port: 7340, actif: true }, { nom: 'pi.autre.net', port: 7341, actif: true }, { nom: 'off', port: 1, actif: false }] });
    return c.length === 2 && c[0].url === 'http://mon-mien.tail.ts.net:7340' && c[1].url === 'http://pi.autre.net:7341';
  });
}

// ------------------------------------------------------------------ les personnages du jeu
const dossier = path.join(ROOT, 'game/data/rigs');
for (const id of fs.existsSync(dossier) ? fs.readdirSync(dossier) : []) {
  const f = path.join(dossier, id, 'rig.json');
  if (!fs.existsSync(f)) continue;
  test(`personnage ${id} : aucune erreur du validateur`, () => {
    const rig = JSON.parse(fs.readFileSync(f, 'utf8'));
    const fc = path.join(dossier, id, 'clips.json');
    const clips = fs.existsSync(fc) ? JSON.parse(fs.readFileSync(fc, 'utf8')) : null;
    const erreurs = verifieClips(rig, clips).constats.filter(c => c.niveau === 'erreur');
    if (erreurs.length) throw new Error(erreurs.map(e => (e.clip ? e.clip + ' : ' : '') + e.message).join(' ; '));
  });
}

console.log(`${ok} tests passés, ${ko} échoué(s)`);
process.exit(ko ? 1 : 0);
