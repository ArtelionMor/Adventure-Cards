// LES CLIPS : ce qu'un os fait au temps t. Le format est decrit pour un lecteur sans
// contexte dans docs/ANIMATION_FORMAT.md — toute regle ajoutee ici s'y ecrit aussi.
//
// Une pose se compose dans cet ordre, os par os et canal par canal :
//   1. les CLES de `pistes` (valeur absolue : rot/x/y = decalage du repos, sx/sy = facteur ;
//      sans piste, le neutre : 0, 0, 0, 1, 1) ;
//   2. + les modificateurs `sinus` et `bruit` (des decalages ajoutes, y compris sur sx/sy) ;
//   3. + les `evenement`s (des mini-clips de decalages, joues a des moments tires au hasard) ;
//   4. + les `ressort`s, qui regardent un os SOURCE dans le passe (calcule sans les ressorts)
//      et font trainer une chaine derriere lui.
//
// ⚠ Un clip qui BOUCLE est periodique de `duree`, partout : les cles s'enroulent (la derniere
// rejoint la premiere), le bruit et les evenements sont tires sur un cycle, et un sinus dont
// la periode ne divise pas la duree serait une marche a la couture — verifie.js le refuse.

import { CANAUX, poseNeutre, remetNeutre, mondeNeuf, calculeUn } from './squelette.js';

// ------------------------------------------------------------------ courbes
const COURBES = {
  lineaire: null,
  douce: [0.42, 0, 0.58, 1],
  entree: [0.42, 0, 1, 1],
  sortie: [0, 0, 0.58, 1],
  palier: 'palier',
};
export const NOMS_COURBES = Object.keys(COURBES);

// Une courbe de Bezier cubique au sens de CSS (cubic-bezier(x1, y1, x2, y2)) : u -> y.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s;
  const dX = s => (3 * ax * s + 2 * bx) * s + cx;
  const Y = s => ((ay * s + by) * s + cy) * s;
  return u => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let s = u;
    for (let k = 0; k < 6; k++) {
      const e = X(s) - u, d = dX(s);
      if (Math.abs(e) < 1e-6) return Y(s);
      if (Math.abs(d) < 1e-6) break;
      s -= e / d;
    }
    let lo = 0, hi = 1; s = u;
    for (let k = 0; k < 30; k++) {
      const x = X(s);
      if (Math.abs(x - u) < 1e-6) break;
      if (x < u) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return Y(s);
  };
}

export function fonctionDeCourbe(c) {
  if (c == null) c = 'douce';
  if (Array.isArray(c)) {
    if (c.length !== 4 || c.some(v => typeof v !== 'number')) return null;
    return bezier(...c);
  }
  if (!(c in COURBES)) return null;
  const d = COURBES[c];
  if (d === null) return u => u;
  if (d === 'palier') return u => (u >= 1 ? 1 : 0); // tient, puis prend la cle suivante PILE sur elle
  return bezier(...d);
}

// ------------------------------------------------------------------ hasard fixe
// Un hachage entier -> [-1, 1] : le meme bruit a chaque lecture, sur toutes les machines.
function hache(graine, k) {
  let h = (Math.imul(graine | 0, 0x9E3779B1) ^ Math.imul(k | 0, 0x85EBCA77)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297A2D39) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 4294967295 * 2 - 1;
}
function aleaDe(graine) {
  let k = 0;
  return () => (hache(graine, k++) + 1) / 2; // [0, 1]
}

// ------------------------------------------------------------------ cles
function compileCles(liste) {
  const cles = (liste || []).map(c => ({ t: +c.t, v: +c.v, f: fonctionDeCourbe(c.courbe) || (u => u) }));
  cles.sort((a, b) => a.t - b.t);
  return cles;
}

// Valeur d'une liste de cles au temps t. En boucle, le segment apres la derniere cle va
// rejoindre la premiere (decalee d'une duree) ; sinon on tient la premiere et la derniere.
function valeurCles(cles, t, duree, boucle) {
  const n = cles.length;
  if (n === 1) return cles[0].v;
  if (t < cles[0].t) {
    if (!boucle) return cles[0].v;
    const a = cles[n - 1], b = cles[0];
    const L = b.t + duree - a.t;
    if (L <= 1e-9) return b.v;
    return a.v + (b.v - a.v) * a.f((t + duree - a.t) / L);
  }
  if (t >= cles[n - 1].t) {
    if (!boucle) return cles[n - 1].v;
    const a = cles[n - 1], b = cles[0];
    const L = b.t + duree - a.t;
    if (L <= 1e-9) return a.v;
    return a.v + (b.v - a.v) * a.f((t - a.t) / L);
  }
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cles[m].t <= t) lo = m; else hi = m; }
  const a = cles[lo], b = cles[hi];
  return a.v + (b.v - a.v) * a.f((t - a.t) / (b.t - a.t));
}

// ------------------------------------------------------------------ compilation
const ids = v => (Array.isArray(v) ? v : [v]);

// Transforme le JSON d'un clip en structure prete a jouer. Les noms inconnus (os, canal,
// courbe) sont IGNORES ici, sans bruit : c'est verifie.js qui les dit. Le jeu ne doit pas
// planter sur un clip imparfait.
export function prepareClip(sq, json, nom = '') {
  const duree = Math.max(1e-3, +json.duree || 1);
  const boucle = json.boucle !== false;
  const os = id => sq.index.has(id) ? sq.index.get(id) : -1;

  const pistes = [];
  for (const [idOs, canaux] of Object.entries(json.pistes || {})) {
    const i = os(idOs);
    if (i < 0) continue;
    for (const [canal, liste] of Object.entries(canaux || {})) {
      if (!CANAUX.includes(canal) || !Array.isArray(liste) || !liste.length) continue;
      pistes.push({ i, canal, cles: compileCles(liste) });
    }
  }

  const mods = [], evenements = [], ressorts = [];
  for (const m of json.procedural || []) {
    if (m.type === 'sinus' || m.type === 'bruit') {
      if (!CANAUX.includes(m.canal)) continue;
      for (const id of ids(m.os)) {
        const i = os(id);
        if (i < 0) continue;
        const periode = Math.max(1e-3, +m.periode || 1);
        mods.push({
          type: m.type, i, canal: m.canal, amplitude: +m.amplitude || 0, periode,
          phase: +m.phase || 0, graine: m.graine | 0,
          // le bruit en boucle : un nombre entier de points sur le cycle
          n: boucle ? Math.max(1, Math.round(duree / periode)) : 0,
        });
      }
    } else if (m.type === 'evenement') {
      const pistesEvt = [];
      let fin = 0;
      for (const [idOs, canaux] of Object.entries(m.pistes || {})) {
        const i = os(idOs);
        if (i < 0) continue;
        for (const [canal, liste] of Object.entries(canaux || {})) {
          if (!CANAUX.includes(canal) || !Array.isArray(liste) || !liste.length) continue;
          const cles = compileCles(liste);
          fin = Math.max(fin, cles[cles.length - 1].t);
          pistesEvt.push({ i, canal, cles });
        }
      }
      const [mini, maxi] = Array.isArray(m.intervalle) ? m.intervalle.map(Number) : [2, 5];
      evenements.push({ pistes: pistesEvt, fin, debuts: planifie(duree, boucle, mini, maxi, m.graine | 0) });
    } else if (m.type === 'ressort') {
      const chaine = ids(m.os).map(os).filter(i => i >= 0);
      if (!chaine.length) continue;
      const src = m.source != null ? os(m.source) : sq.os[chaine[0]].parent;
      if (src < 0) continue;
      ressorts.push({
        chaine, src,
        ancetres: ancetresDe(sq, src),
        gain: m.gain == null ? 1 : +m.gain,
        gainX: +m.gainX || 0, gainY: +m.gainY || 0,
        decalage: m.decalage == null ? 0.04 : +m.decalage,
        noyau: noyau(+m.frequence || 2.5, m.amortissement == null ? 0.35 : +m.amortissement),
      });
    }
  }
  return { nom, duree, boucle, pistes, mods, evenements, ressorts, n: sq.os.length,
    _base: poseNeutre(sq.os.length), _monde: mondeNeuf(sq.os.length) };
}

// Les debuts d'un evenement. En boucle, des ecarts tires dans [mini, maxi] puis remis a
// l'echelle pour faire EXACTEMENT un cycle : le motif se repete sans couture.
function planifie(duree, boucle, mini, maxi, graine) {
  mini = Math.max(0.05, mini); maxi = Math.max(mini, maxi);
  const alea = aleaDe(graine * 7919 + 13);
  const tire = () => mini + (maxi - mini) * alea();
  const ecarts = [];
  let somme = 0;
  while (somme < duree) { const e = tire(); ecarts.push(e); somme += e; }
  if (boucle) {
    // le dernier ecart deborde : on garde le nombre d'evenements le plus proche
    if (ecarts.length > 1 && somme - duree > ecarts[ecarts.length - 1] / 2) { somme -= ecarts.pop(); }
    const k = duree / somme;
    const debuts = [];
    let t = alea() * ecarts[0] * k; // la phase du premier
    for (const e of ecarts) { debuts.push(t % duree); t += e * k; }
    return debuts.sort((a, b) => a - b);
  }
  const debuts = [];
  let t = tire();
  while (t < duree) { debuts.push(t); t += tire(); }
  return debuts;
}

function ancetresDe(sq, i) {
  const l = [];
  for (let k = i; k >= 0; k = sq.os[k].parent) l.unshift(k);
  return l;
}

// La reponse impulsionnelle d'un ressort amorti (gain statique 1), echantillonnee :
// suivre une valeur avec ce ressort, c'est la moyenner dans le passe avec ces poids. Une
// fonction pure du temps, donc periodique si la source l'est — pas d'etat, pas de derive.
function noyau(frequence, amortissement) {
  const z = Math.min(0.99, Math.max(0.05, amortissement));
  const w = 2 * Math.PI * Math.max(0.05, frequence);
  const wd = w * Math.sqrt(1 - z * z);
  const T = Math.min(3, 5 / (z * w));
  const K = 24;
  const taus = new Float64Array(K), poids = new Float64Array(K);
  let somme = 0;
  for (let k = 0; k < K; k++) {
    const tau = (k + 0.5) * T / K;
    taus[k] = tau;
    poids[k] = (w * w / wd) * Math.exp(-z * w * tau) * Math.sin(wd * tau) * T / K;
    somme += poids[k];
  }
  for (let k = 0; k < K; k++) poids[k] /= somme;
  return { taus, poids };
}

// ------------------------------------------------------------------ evaluation
function tempsDuClip(clip, t) {
  const d = clip.duree;
  return clip.boucle ? ((t % d) + d) % d : Math.min(Math.max(t, 0), d);
}

// La pose sans les ressorts : cles, sinus, bruit, evenements.
function poseDeBase(clip, tc, pose) {
  remetNeutre(pose);
  for (const p of clip.pistes) pose[p.canal][p.i] = valeurCles(p.cles, tc, clip.duree, clip.boucle);
  for (const m of clip.mods) {
    let v;
    if (m.type === 'sinus') {
      // ⚠ en boucle, on garde la periode ECRITE (verifie.js exige qu'elle divise la duree) :
      // l'arrondir en douce ferait mentir le fichier.
      v = m.amplitude * Math.sin(2 * Math.PI * (tc / m.periode + m.phase));
    } else {
      v = bruitPeriodique(m, tc, clip);
    }
    pose[m.canal][m.i] += v;
  }
  for (const e of clip.evenements) {
    for (const s of e.debuts) {
      let l = tc - s;
      if (clip.boucle && l < 0) l += clip.duree;
      if (l < 0 || l > e.fin) continue;
      for (const p of e.pistes) pose[p.canal][p.i] += valeurCles(p.cles, l, e.fin, false);
    }
  }
  return pose;
}

// Du bruit lisse (Catmull-Rom entre des valeurs tirees : continu en vitesse, il ne marque
// pas d'arret a chaque point). En boucle : N points sur le cycle, donc une periode effective
// de duree / N, et la valeur d'apres le dernier point est celle du premier.
function bruitPeriodique(m, tc, clip) {
  const u = m.n ? tc * m.n / clip.duree : tc / m.periode;
  const k = Math.floor(u), f = u - k, N = m.n;
  const p = j => hache(m.graine * 131 + 7, N ? ((j % N) + N) % N : j);
  const p0 = p(k - 1), p1 = p(k), p2 = p(k + 1), p3 = p(k + 2);
  const v = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  return v * m.amplitude;
}

// Le monde de l'os source d'un ressort au temps t (pose de base, ancetres seulement).
function sourceA(clip, r, t, sq) {
  const tc = tempsDuClip(clip, t);
  poseDeBase(clip, tc, clip._base);
  for (const i of r.ancetres) calculeUn(sq, clip._base, clip._monde, i);
  return [clip._monde.a[r.src], clip._monde.x[r.src], clip._monde.y[r.src]];
}

// La pose complete du clip au temps t (en secondes, enroule si le clip boucle).
export function evalueClip(sq, clip, t, pose) {
  pose = pose || poseNeutre(sq.os.length);
  const tc = tempsDuClip(clip, t);
  if (clip.ressorts.length) {
    // les ressorts d'abord : ils reutilisent la pose de travail du clip
    const decal = clip.ressorts.map(r => offsetsRessort(clip, r, t, sq));
    poseDeBase(clip, tc, pose);
    clip.ressorts.forEach((r, k) => r.chaine.forEach((i, j) => { pose.rot[i] += decal[k][j]; }));
  } else {
    poseDeBase(clip, tc, pose);
  }
  return pose;
}

function offsetsRessort(clip, r, t, sq) {
  const [a0, x0, y0] = sourceA(clip, r, t, sq);
  const { taus, poids } = r.noyau;
  let pa = a0, px = x0, py = y0;
  const out = [];
  r.chaine.forEach((_, j) => {
    const retard = j * r.decalage;
    let sa = 0, sx = 0, sy = 0;
    for (let k = 0; k < taus.length; k++) {
      const [a, x, y] = sourceA(clip, r, t - retard - taus[k], sq);
      sa += poids[k] * a; sx += poids[k] * x; sy += poids[k] * y;
    }
    out.push(r.gain * (sa - pa) + r.gainX * (sx - px) + r.gainY * (sy - py));
    pa = sa; px = sx; py = sy;
  });
  return out;
}

// Le fondu entre deux poses : chaque canal est interpole (w = 0 -> a, w = 1 -> b).
export function melange(a, b, w, out) {
  out = out || poseNeutre(a.rot.length);
  for (const c of CANAUX) {
    const A = a[c], B = b[c], O = out[c];
    for (let i = 0; i < A.length; i++) O[i] = A[i] + (B[i] - A[i]) * w;
  }
  return out;
}

export { tempsDuClip };
