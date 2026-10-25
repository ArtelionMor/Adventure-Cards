// Pose un squelette TYPE (noms d'os et hiérarchie de docs/ANIMATION_FORMAT.md 2.1) sur chaque
// sprite de Graphical Assets/Characters/, sans regarder l'image : les os sont placés d'après
// la boite de ce qui est visible, a la louche. Le game designer n'a plus qu'a les deplacer
// dans l'Atelier (Rig & Anim), puis « Generer le mesh » / « Calculer les poids ».
//
//   node scripts/rig-squelettes-types.mjs [--ecrire] [--espece "Cat"]
//
// Sans --ecrire : liste ce qui serait cree. Ne touche JAMAIS un personnage qui a deja un dossier
// dans game/data/rigs/ (ni ceux de EXISTANTS, qui vivent peut-etre ailleurs).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lisPng } from './lib/png.mjs';
import { ecrisJson } from './lib/rig-fichiers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'Graphical Assets/Characters');
const OUT = path.join(ROOT, 'game/data/rigs');
const args = process.argv.slice(2);
const ECRIRE = args.includes('--ecrire');
const ESPECE = (i => i >= 0 ? args[i + 1] : null)(args.indexOf('--espece'));

// Quel squelette pour quelle espece (une devinette : a corriger ici puis relancer sur un dossier vide).
const QUADRUPEDE = new Set(['Dog', 'Fox', 'Goat', 'Big Bad Wolf', 'Cat']);
// Ids deja pris (rigges a la main, ou en cours dans l'Atelier) : on n'y touche pas.
const EXISTANTS = new Set(['crapaud', 'lapin-bagarreur', 'chiot-de-garde', 'cameleon']);
// Les sources deja riggees sous un autre nom.
const SOURCES_PRISES = new Set(['Graphical Assets/Characters/Frog/Frog Toad.png', 'Graphical Assets/Characters/Cameleon/Cameleon.png']);

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const r = Math.round;

// Boite de ce qui est visible
function boite(img) {
  const { largeur: W, hauteur: H, data } = img;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Les os, en fractions de la boite (fx, fy) ; angle en degres (-90 = vers le haut), longueur en fraction de la hauteur.
function os(b, quad) {
  const P = (fx, fy) => [r(b.x + fx * b.w), r(b.y + fy * b.h)];
  const o = (id, parent, fx, fy, angle, lg) => { const [x, y] = P(fx, fy); return { id, parent, x, y, angle, longueur: r(lg * b.h) }; };
  const sol = { id: 'sol', parent: null, ...(([x, y]) => ({ x, y }))(P(0.1, 0.96)), angle: 0, longueur: r(b.w * 0.8) };
  const tete = [
    o('tete', quad ? 'cou' : 'torse', 0.5, quad ? 0.46 : 0.5, -90, 0.3),
    o('oreille_g', 'tete', 0.35, 0.2, -120, 0.15),
    o('oreille_d', 'tete', 0.65, 0.2, -60, 0.15),
  ];
  if (!quad) return [
    sol,
    o('bassin', 'sol', 0.5, 0.88, -90, 0.08),
    o('torse', 'bassin', 0.5, 0.8, -90, 0.2),
    ...tete,
    o('bras_g', 'torse', 0.35, 0.68, 160, 0.14),
    o('bras_d', 'torse', 0.65, 0.68, 20, 0.14),
    o('jambe_g', 'bassin', 0.4, 0.88, 100, 0.09),
    o('jambe_d', 'bassin', 0.6, 0.88, 80, 0.09),
    o('queue', 'bassin', 0.7, 0.82, -30, 0.14),
  ];
  return [
    sol,
    o('bassin', 'sol', 0.5, 0.88, -90, 0.08),
    o('dos', 'bassin', 0.5, 0.8, -90, 0.16),
    o('cou', 'dos', 0.5, 0.64, -90, 0.12),
    ...tete,
    o('patte_av_g', 'dos', 0.38, 0.7, 100, 0.2),
    o('patte_av_d', 'dos', 0.62, 0.7, 80, 0.2),
    o('patte_ar_g', 'bassin', 0.3, 0.88, 100, 0.08),
    o('patte_ar_d', 'bassin', 0.7, 0.88, 80, 0.08),
    o('queue', 'bassin', 0.8, 0.82, -20, 0.14),
  ];
}

let faits = 0, saute = 0;
for (const espece of fs.readdirSync(SRC)) {
  const dossierE = path.join(SRC, espece);
  if (!fs.statSync(dossierE).isDirectory() || (ESPECE && espece !== ESPECE)) continue;
  for (const f of fs.readdirSync(dossierE).filter(n => n.toLowerCase().endsWith('.png'))) {
    const origine = `Graphical Assets/Characters/${espece}/${f}`;
    const nom = f.replace(/\.png$/i, '');
    const id = slug(nom);
    if (EXISTANTS.has(id) || SOURCES_PRISES.has(origine) || fs.existsSync(path.join(OUT, id))) { saute++; continue; }
    const img = lisPng(path.join(dossierE, f));
    const b = boite(img);
    if (b.w <= 0) { console.log('image vide : ' + origine); continue; }
    const quad = QUADRUPEDE.has(espece);
    const rig = {
      format: 'adventure-rig', version: 1, id, nom,
      source: { image: 'source.png', largeur: img.largeur, hauteur: img.hauteur, origine },
      os: os(b, quad),
      calques: [{ id: 'tout', image: 'source.png', ordre: 0, x: 0, y: 0, largeur: img.largeur, hauteur: img.hauteur }],
      ik: [],
    };
    console.log(`${ECRIRE ? 'cree' : 'creerait'} ${id} (${quad ? 'quadrupede' : 'bipede'}, ${img.largeur}x${img.hauteur})`);
    faits++;
    if (!ECRIRE) continue;
    const d = path.join(OUT, id);
    fs.mkdirSync(d, { recursive: true });
    fs.copyFileSync(path.join(dossierE, f), path.join(d, 'source.png'));
    ecrisJson(path.join(d, 'rig.json'), rig);
    ecrisJson(path.join(d, 'clips.json'), { format: 'adventure-rig-clips', version: 1, clips: {} });
  }
}
console.log(`${faits} personnage(s) ${ECRIRE ? 'créé(s)' : 'à créer'}, ${saute} déjà pris.`);
