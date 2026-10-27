// LE JOUEUR : charge un personnage (rig.json + clips.json + images), joue ses clips, fond
// l'un dans l'autre, et rend les sommets deformes de chaque calque, prets a dessiner.
//
// Un `rig` prepare se partage entre toutes les instances du meme personnage ; chaque
// `animateur` a son temps, son clip et ses propres tampons de sommets.

import { prepareSquelette, poseNeutre, mondeNeuf, calculeMonde, matricesDePeau } from './squelette.js';
import { prepareClip, evalueClip, melange } from './clip.js';
import { prepareCalque, deforme } from './mesh.js';

export const FORMAT_RIG = 'adventure-rig';
export const FORMAT_CLIPS = 'adventure-rig-clips';

// Prepare un personnage a partir de ses deux JSON (deja lus). Les calques sont ranges dans
// l'ordre de dessin (`ordre` croissant = dessine en premier = au fond).
export function prepareRig(rigJson, clipsJson) {
  const sq = prepareSquelette(rigJson);
  const taille = [rigJson.source?.largeur || 1024, rigJson.source?.hauteur || 1024];
  const calques = (rigJson.calques || [])
    .filter(c => c.visible !== false)
    .slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
    .map(c => prepareCalque(c, sq, taille));
  const clips = {};
  for (const [nom, c] of Object.entries(clipsJson?.clips || {})) clips[nom] = prepareClip(sq, c, nom);
  return { json: rigJson, clipsJson, sq, calques, clips, taille };
}

// Lit un personnage depuis son dossier (URL qui finit par « / »). Rend le rig prepare et
// les images de ses calques (une seule si tout vient de source.png).
export async function chargeRig(base, { frais = false } = {}) {
  const q = frais ? '?t=' + Date.now() : '';
  const lis = async f => { const r = await fetch(base + f + q); if (!r.ok) throw new Error(f + ' : ' + r.status); return r.json(); };
  const rigJson = await lis('rig.json');
  let clipsJson = { format: FORMAT_CLIPS, version: 1, clips: {} };
  try { clipsJson = await lis('clips.json'); } catch { /* pas encore de clip */ }
  const rig = prepareRig(rigJson, clipsJson);
  const noms = [...new Set(rig.calques.map(c => c.image || rigJson.source?.image || 'source.png'))];
  const images = {};
  await Promise.all(noms.map(n => new Promise((ok, ko) => {
    const im = new Image();
    im.onload = () => { images[n] = im; ok(); };
    im.onerror = () => ko(new Error('image introuvable : ' + n));
    im.src = base + n + q;
  })));
  rig.images = images;
  return rig;
}

export function creeAnimateur(rig) {
  const n = rig.sq.os.length;
  const poseA = poseNeutre(n), poseB = poseNeutre(n), pose = poseNeutre(n);
  const monde = mondeNeuf(n);
  let peau = new Float64Array(n * 6);
  const sommets = rig.calques.map(c => new Float32Array(c.n * 2));
  const a = {
    rig, clip: null, t: 0, vitesse: 1, gain: 1,
    // le clip qu'on quitte, pendant un fondu
    avant: null, tAvant: 0, fondu: 0, fonduEcoule: 0,
    pose, monde, sommets,
    // Joue un clip. `fondu` (s) : le temps de passer de l'ancien au nouveau.
    joue(nom, { fondu = 0.25, depuis = 0 } = {}) {
      const c = rig.clips[nom];
      if (!c) throw new Error('clip inconnu : ' + nom);
      if (a.clip && fondu > 0) { a.avant = a.clip; a.tAvant = a.t; a.fondu = fondu; a.fonduEcoule = 0; }
      else a.avant = null;
      a.clip = c; a.t = depuis;
      return a;
    },
    avance(dt) {
      dt *= a.vitesse;
      a.t += dt;
      if (a.avant) { a.tAvant += dt; a.fonduEcoule += dt; if (a.fonduEcoule >= a.fondu) a.avant = null; }
      return a;
    },
    // Calcule la pose du moment, le monde des os et les sommets de chaque calque.
    // `poseForcee` (facultatif) remplace le clip : c'est le mode pose de l'editeur.
    calcule(poseForcee) {
      if (poseForcee) {
        for (const k of ['rot', 'x', 'y', 'sx', 'sy']) pose[k].set(poseForcee[k]);
      } else if (!a.clip) {
        for (const k of ['rot', 'x', 'y']) pose[k].fill(0);
        pose.sx.fill(1); pose.sy.fill(1);
      } else if (a.avant) {
        evalueClip(rig.sq, a.avant, a.tAvant, poseA);
        evalueClip(rig.sq, a.clip, a.t, poseB);
        const u = Math.min(1, a.fonduEcoule / a.fondu);
        melange(poseA, poseB, u * u * (3 - 2 * u), pose);
      } else {
        evalueClip(rig.sq, a.clip, a.t, pose);
      }
      // `gain` : exagere la pose par rapport au repos (un jeu qui veut des mouvements plus lisibles a petite taille ; 1 = tel quel)
      if (a.gain !== 1 && !poseForcee) for (let i = 0; i < n; i++) { pose.rot[i] *= a.gain; pose.x[i] *= a.gain; pose.y[i] *= a.gain; pose.sx[i] = 1 + (pose.sx[i] - 1) * a.gain; pose.sy[i] = 1 + (pose.sy[i] - 1) * a.gain; }
      calculeMonde(rig.sq, pose, monde);
      peau = matricesDePeau(rig.sq, monde, peau);
      rig.calques.forEach((c, k) => deforme(c, peau, sommets[k]));
      return a;
    },
  };
  return a;
}
