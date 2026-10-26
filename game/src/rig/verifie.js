// LE VALIDATEUR : ce qu'un oeil verrait de travers dans une animation, dit avec des chiffres.
// Utilise par l'editeur (bandeau « À vérifier ») et par scripts/rig-valide.mjs — une seule
// implementation, jamais une copie.
//
// Un constat = { niveau: 'erreur' | 'alerte', code, message, clip?, t?, os?, calque? }.
// Les codes : format, os-inconnu, canal-inconnu, courbe-inconnue, couture-sinus, etirement,
// etirement-trait, retourne, detache, boucle-saute, boucle-cogne, sans-poids, ik,
// zone-a-combler (un calque peut bouger, ou bouge, au-dessus d'un trou pas encore comble).

import { CANAUX, calculeMonde, matricesDePeau, mondeNeuf, poseNeutre } from './squelette.js';
import { prepareRig } from './joueur.js';
import { evalueClip, fonctionDeCourbe } from './clip.js';
import { deforme, etirement } from './mesh.js';

// Les seuils : ce qui se voit. Un fichier rig.json peut les surcharger (`verification`).
export const SEUILS = {
  etirementTrait: 0.05,   // un triangle qui porte du contour noir : 5 % au plus, dans tous les sens
  etirementMax: 0.10,     // un triangle sans contour : 10 %
  detache: 0.006,         // un calque rigide qui s'ecarte de son parent : 0,6 % de la taille de l'image
  couture: 1.0,           // un saut a la couture d'une boucle, en pixels de la source
  cogne: 3,               // une acceleration a la couture plus de 3 fois la plus forte du clip
  parSeconde: 30,         // echantillons par seconde de clip (au moins 48 par clip)
  glisseProvisoire: 6,    // un calque qui glisse de plus de 6 px sur une zone comblee provisoirement
};

const TYPES = ['sinus', 'bruit', 'ressort', 'evenement'];

export function verifieRig(rigJson) {
  const c = [];
  const err = (code, message, extra) => c.push({ niveau: 'erreur', code, message, ...extra });
  const ale = (code, message, extra) => c.push({ niveau: 'alerte', code, message, ...extra });
  if (rigJson.format !== 'adventure-rig') err('format', 'format attendu : "adventure-rig"');
  if (!rigJson.source?.largeur || !rigJson.source?.hauteur) err('format', 'source.largeur / source.hauteur manquants');
  const ids = new Set();
  for (const o of rigJson.os || []) {
    if (!o.id) err('format', 'un os sans id');
    if (ids.has(o.id)) err('format', 'os en double : ' + o.id, { os: o.id });
    ids.add(o.id);
  }
  for (const o of rigJson.os || []) {
    if (o.parent != null && !ids.has(o.parent)) err('os-inconnu', `parent inconnu « ${o.parent} »`, { os: o.id });
  }
  try { prepareRig(rigJson, null); } catch (e) { err('format', e.message); return c; }
  const calIds = new Set();
  for (const k of rigJson.calques || []) {
    if (calIds.has(k.id)) err('format', 'calque en double : ' + k.id, { calque: k.id });
    calIds.add(k.id);
    if (!k.mesh && !k.os) ale('sans-poids', 'calque ni attaché à un os, ni maillé : il ne bougera pas', { calque: k.id });
    if (k.os && !ids.has(k.os)) err('os-inconnu', `os inconnu « ${k.os} »`, { calque: k.id });
    if (k.mesh) {
      const n = (k.mesh.sommets || []).length / 2;
      const p = k.mesh.poids || [];
      if (p.length && p.length !== n) err('format', `${p.length} poids pour ${n} sommets`, { calque: k.id });
      let sans = 0;
      const inconnus = new Set();
      p.forEach(w => { if (!w || !w.length) sans++; for (let j = 0; j < (w || []).length; j += 2) if (!ids.has(w[j])) inconnus.add(w[j]); });
      if (!p.length && n) ale('sans-poids', 'mesh sans poids : il ne bougera pas (« Calculer les poids »)', { calque: k.id });
      else if (sans) ale('sans-poids', `${sans} sommets sans poids`, { calque: k.id });
      for (const i of inconnus) err('os-inconnu', `poids vers un os inconnu « ${i} »`, { calque: k.id });
    }
    for (const z of k.zones || []) {
      if (!z.id || !(z.largeur > 0) || !(z.hauteur > 0)) err('format', `zone mal formée sur « ${k.id} » (id, x, y, largeur, hauteur)`, { calque: k.id });
    }
  }
  const osDe = new Map((rigJson.os || []).map(o => [o.id, o]));
  for (const ik of rigJson.ik || []) {
    const nom = ik.id || (ik.os || []).join('-');
    const [a, b] = ik.os || [];
    if (!osDe.has(a) || !osDe.has(b)) { err('ik', `IK « ${nom} » : il faut deux os existants (« os »: [premier, second])`); continue; }
    if (osDe.get(b).parent !== a) err('ik', `IK « ${nom} » : « ${b} » doit être l'enfant de « ${a} »`);
    if (!osDe.has(ik.cible)) { err('ik', `IK « ${nom} » : cible inconnue « ${ik.cible} »`); continue; }
    for (let o = ik.cible; o != null; o = osDe.get(o)?.parent) if (o === a) { err('ik', `IK « ${nom} » : la cible ne peut pas pendre sous la chaîne (elle bougerait avec elle)`); break; }
  }
  // une alerte par zone pas encore comblee (une zone comblee provisoirement ne dit rien ici :
  // c'est la mesure d'un clip qui dira si elle se decouvre)
  const parZone = new Map();
  for (const z of zonesSousUnCalque(rigJson)) {
    if (z.etat === 'provisoire') continue;
    const k = z.dessous + '/' + z.zone;
    if (!parZone.has(k)) parZone.set(k, { ...z, dessus: [], os: new Set() });
    parZone.get(k).dessus.push(z.dessus); z.os.forEach(o => parZone.get(k).os.add(o));
  }
  for (const z of parZone.values()) ale('zone-a-combler', `la zone « ${z.zone} » de « ${z.dessous} » est à combler, et « ${z.dessus.join('», «')} » peu${z.dessus.length > 1 ? 'vent' : 't'} bouger au-dessus (os « ${[...z.os].join('», «')} ») : le trou se verra — l'exporter pour l'inpainting, ou la combler provisoirement`,
    { calque: z.dessous, zone: z.zone });
  return c;
}

const recouvre = (a, b) => a.x < b.x + b.largeur && b.x < a.x + a.largeur && a.y < b.y + b.hauteur && b.y < a.y + a.hauteur;
const rect = (k, W, H) => ({ x: k.x || 0, y: k.y || 0, largeur: k.largeur || W, hauteur: k.hauteur || H });
// Les os qui tirent un calque dans un rectangle : l'os d'un calque rigide, ou ceux des poids
// des sommets qui y tombent (au-dela de 10 %).
function osDansLeRect(k, r) {
  if (!k.mesh) return new Set(k.os ? [k.os] : []);
  const s = new Set(), S = k.mesh.sommets || [], P = k.mesh.poids || [];
  for (let v = 0; v < S.length / 2; v++) {
    const x = S[v * 2], y = S[v * 2 + 1];
    if (x < r.x || y < r.y || x > r.x + r.largeur || y > r.y + r.hauteur) continue;
    const w = P[v] || [];
    for (let j = 0; j + 1 < w.length; j += 2) if (w[j + 1] > 0.1) s.add(w[j]);
  }
  return s;
}
// Les zones pas encore comblees, le calque qui les recouvre et qu'un os peut bouger sans le
// calque du dessous (des os qu'il n'a pas, dans la zone) : rend
// [{ zone, etat, dessous, dessus, os: [...] }]. « Qui recouvre » = le calque extrait de ce
// trou (`par` de la zone) et ce qu'on a extrait de lui ensuite (`de`, la lignee) : un
// calque voisin dont seul le rectangle touche la zone n'est pas dessus.
export function zonesSousUnCalque(rigJson) {
  const W = rigJson.source?.largeur, H = rigJson.source?.hauteur;
  const calques = (rigJson.calques || []).filter(k => k.visible !== false);
  const parId = new Map(calques.map(k => [k.id, k]));
  const descend = (A, par) => { for (let k = A, n = 0; k && n < 50; k = parId.get(k.de), n++) if (k.id === par) return true; return false; };
  const out = [];
  for (const B of calques) for (const z of B.zones || []) {
    if (z.etat === 'comblee') continue;
    const osB = osDansLeRect(B, z);
    for (const A of calques) {
      if ((A.ordre || 0) <= (B.ordre || 0) || A === B || !recouvre(rect(A, W, H), z)) continue;
      if (z.par && !descend(A, z.par)) continue;
      const libres = [...osDansLeRect(A, z)].filter(o => !osB.has(o));
      if (libres.length) out.push({ zone: z.id, etat: z.etat || 'a-combler', dessous: B.id, dessus: A.id, os: libres });
    }
  }
  return out;
}

// Le format d'un clip, sans le jouer.
function verifieFormatClip(rig, nom, clip, c) {
  const err = (code, message, extra) => c.push({ niveau: 'erreur', code, message, clip: nom, ...extra });
  const ale = (code, message, extra) => c.push({ niveau: 'alerte', code, message, clip: nom, ...extra });
  const duree = +clip.duree;
  if (!(duree > 0)) err('format', '« duree » manquante ou nulle (en secondes)');
  const boucle = clip.boucle !== false;
  const osOk = id => rig.sq.index.has(id);
  const verifiePistes = (pistes, ou, fin) => {
    for (const [os, canaux] of Object.entries(pistes || {})) {
      if (!osOk(os)) { err('os-inconnu', `${ou} : os inconnu « ${os} »`, { os }); continue; }
      for (const [canal, cles] of Object.entries(canaux || {})) {
        if (!CANAUX.includes(canal)) { err('canal-inconnu', `${ou} : canal inconnu « ${canal} » (${CANAUX.join(', ')})`, { os }); continue; }
        if (!Array.isArray(cles) || !cles.length) { err('format', `${ou} : ${os}.${canal} doit être une liste de clés`, { os }); continue; }
        let avant = -Infinity;
        for (const k of cles) {
          if (typeof k.t !== 'number' || typeof k.v !== 'number') err('format', `${ou} : ${os}.${canal} : une clé sans t ou v numérique`, { os });
          if (k.t < avant) ale('format', `${ou} : ${os}.${canal} : clés pas triées par t (elles le seront)`, { os });
          if (fin != null && (k.t < 0 || k.t > fin + 1e-9)) ale('format', `${ou} : ${os}.${canal} : clé à t=${k.t} hors de [0, ${fin}]`, { os });
          if (k.courbe != null && !fonctionDeCourbe(k.courbe)) err('courbe-inconnue', `${ou} : ${os}.${canal} : courbe inconnue ${JSON.stringify(k.courbe)}`, { os });
          avant = k.t;
        }
      }
    }
  };
  verifiePistes(clip.pistes, 'pistes', duree);
  (clip.procedural || []).forEach((m, j) => {
    const ou = `procedural[${j}] (${m.type})`;
    if (!TYPES.includes(m.type)) { err('format', `${ou} : type inconnu (${TYPES.join(', ')})`); return; }
    if (m.type === 'sinus' || m.type === 'bruit') {
      for (const os of [].concat(m.os)) if (!osOk(os)) err('os-inconnu', `${ou} : os inconnu « ${os} »`, { os });
      if (!CANAUX.includes(m.canal)) err('canal-inconnu', `${ou} : canal inconnu « ${m.canal} »`);
      if (!(m.periode > 0)) err('format', `${ou} : « periode » manquante (en secondes)`);
      if (typeof m.amplitude !== 'number') err('format', `${ou} : « amplitude » manquante`);
      if (m.type === 'sinus' && boucle && duree > 0 && m.periode > 0) {
        const k = duree / m.periode;
        if (Math.abs(k - Math.round(k)) > 1e-3) {
          const prop = [1, 2, 3, 4, 5, 6, 8].map(q => +(duree / q).toFixed(4)).join(', ');
          err('couture-sinus', `${ou} : la période ${m.periode} s ne divise pas la durée ${duree} s, la boucle sauterait (périodes possibles : ${prop}…)`);
        }
      }
    } else if (m.type === 'ressort') {
      const chaine = [].concat(m.os);
      for (const os of chaine) if (!osOk(os)) err('os-inconnu', `${ou} : os inconnu « ${os} »`, { os });
      if (m.source != null && !osOk(m.source)) err('os-inconnu', `${ou} : source inconnue « ${m.source} »`);
      if (m.source != null && chaine.includes(m.source)) err('format', `${ou} : la source ne peut pas être dans la chaîne`);
      if (m.source == null && osOk(chaine[0]) && rig.sq.os[rig.sq.index.get(chaine[0])].parent < 0) err('format', `${ou} : « ${chaine[0]} » n'a pas de parent : donner « source »`);
    } else if (m.type === 'evenement') {
      if (!Array.isArray(m.intervalle) || m.intervalle.length !== 2 || !(m.intervalle[0] > 0) || m.intervalle[1] < m.intervalle[0]) err('format', `${ou} : « intervalle » = [min, max] en secondes`);
      verifiePistes(m.pistes, ou, null);
    }
  });
}

// Joue chaque clip et mesure. Rend { constats, mesures: { nomClip: {...} } }.
export function verifieClips(rigJson, clipsJson, { seuils = {}, clips: seulement = null } = {}) {
  const S = { ...SEUILS, ...(rigJson.verification || {}), ...seuils };
  const constats = verifieRig(rigJson);
  if (constats.some(c => c.niveau === 'erreur' && c.code === 'format')) return { constats, mesures: {} };
  const rig = prepareRig(rigJson, clipsJson);
  if (clipsJson && clipsJson.format !== 'adventure-rig-clips') constats.push({ niveau: 'erreur', code: 'format', message: 'clips.json : format attendu « adventure-rig-clips »' });
  const mesures = {};
  const taille = Math.max(...rig.taille);
  for (const [nom, json] of Object.entries(clipsJson?.clips || {})) {
    if (seulement && !seulement.includes(nom)) continue;
    const avant = constats.length;
    verifieFormatClip(rig, nom, json, constats);
    if (constats.slice(avant).some(c => c.niveau === 'erreur' && c.code !== 'couture-sinus')) continue;
    mesures[nom] = mesureClip(rig, nom, S, taille, constats);
  }
  return { constats, mesures };
}

function mesureClip(rig, nom, S, taille, constats) {
  const clip = rig.clips[nom];
  const sq = rig.sq, n = sq.os.length;
  const pose = poseNeutre(n), monde = mondeNeuf(n);
  let peau = new Float64Array(n * 6);
  const N = Math.max(48, Math.ceil(clip.duree * S.parSeconde));
  const h = clip.duree / N;
  const amp = sq.os.map(b => ({ os: b.id, rot: 0, x: 0, y: 0, sx: 0, sy: 0 }));
  const pire = rig.calques.map(c => ({ calque: c.id, trait: 0, autre: 0, tTrait: 0, tAutre: 0, deplacement: 0 }));
  // un calque `etirementLibre` (des yeux qui s'ecrasent pour cligner) n'est pas juge sur son etirement
  const libre = new Set((rig.json.calques || []).filter(k => k.etirementLibre).map(k => k.id));
  // les zones a combler sous un calque qui peut bouger : on mesure de combien il bouge PAR
  // RAPPORT au calque du dessous, au-dessus de la zone
  const indexCalque = new Map(rig.calques.map((c, k) => [c.id, k]));
  const dansRect = (cal, z) => { const l = []; for (let v = 0; v < cal.n; v++) { const x = cal.repos[v * 2], y = cal.repos[v * 2 + 1]; if (x >= z.x && y >= z.y && x <= z.x + z.largeur && y <= z.y + z.hauteur) l.push(v); } return l; };
  const zonesVues = zonesSousUnCalque(rig.json).map(z => {
    // un calque `etirementLibre` (des yeux qui clignent) decouvre son trou EXPRES : le comblement
    // y tient lieu de paupiere
    if (libre.has(z.dessus)) return null;
    const zj = (rig.json.calques.find(k => k.id === z.dessous).zones || []).find(q => q.id === z.zone);
    const kA = indexCalque.get(z.dessus), kB = indexCalque.get(z.dessous);
    if (kA == null || kB == null) return null;
    // ⚠ Seuls comptent les sommets du dessus PRES DE LA MATIERE du dessous : le trou d'une tete
    // couvre toute la tete, mais il ne se decouvre qu'au cou, la ou le corps continue. Une
    // moyenne sur toute la zone voyait la tete « glisser » de 28 px pour un penche de 5°.
    const A = rig.calques[kA], B = rig.calques[kB], pas = (rig.json.calques.find(k => k.id === z.dessous).mesh?.pas) || 20;
    const vB = dansRect(B, zj);
    const pres = new Set(vB.map(v => Math.floor(B.repos[v * 2] / pas) + ',' + Math.floor(B.repos[v * 2 + 1] / pas)));
    const proche = v => { const cx = Math.floor(A.repos[v * 2] / pas), cy = Math.floor(A.repos[v * 2 + 1] / pas); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (pres.has((cx + i) + ',' + (cy + j))) return true; return false; };
    let vA = dansRect(A, zj).filter(proche);
    if (!vA.length) return null;
    return { ...z, kA, kB, vA, vB, pire: 0, t: 0 };
  }).filter(Boolean);
  const vus = new Set();
  const signale = (cle, constat) => { if (vus.has(cle)) return; vus.add(cle); constats.push({ clip: nom, ...constat }); };

  // les sommets de tous les calques a un instant (copie)
  const sommetsA = t => {
    evalueClip(sq, clip, t, pose);
    calculeMonde(sq, pose, monde);
    peau = matricesDePeau(sq, monde, peau);
    return rig.calques.map(c => Float32Array.from(deforme(c, peau, new Float32Array(c.n * 2))));
  };
  const osDominant = (cal, v) => {
    let best = -1, w = 0;
    for (let k = 0; k < 4; k++) if (cal.osW[v * 4 + k] > w) { w = cal.osW[v * 4 + k]; best = cal.osIdx[v * 4 + k]; }
    return best >= 0 ? sq.os[best].id : null;
  };

  let accMax = 0;
  const pistes = [];
  for (let s = 0; s <= N; s++) {
    const t = s * h;
    const som = sommetsA(t);
    pistes.push(som);
    for (let i = 0; i < n; i++) {
      const a = amp[i];
      a.rot = Math.max(a.rot, Math.abs(pose.rot[i])); a.x = Math.max(a.x, Math.abs(pose.x[i])); a.y = Math.max(a.y, Math.abs(pose.y[i]));
      a.sx = Math.max(a.sx, Math.abs(pose.sx[i] - 1)); a.sy = Math.max(a.sy, Math.abs(pose.sy[i] - 1));
    }
    rig.calques.forEach((cal, k) => {
      const P = som[k], R = cal.repos, T = cal.indices, p = pire[k];
      for (let v = 0; v < cal.n; v++) {
        const d = Math.hypot(P[v * 2] - R[v * 2], P[v * 2 + 1] - R[v * 2 + 1]);
        if (d > p.deplacement) p.deplacement = d;
      }
      for (let j = 0; j < T.length / 3; j++) {
        // une LAMELLE (triangle de contour de moins de 2,5 px de haut au repos) se retourne au moindre souffle sans que rien ne se voie :
        // on ne le juge pas (un maillage qui suit un contour en fabrique beaucoup)
        const ia = T[j * 3], ib = T[j * 3 + 1], ic = T[j * 3 + 2];
        {
          const ux = R[ib * 2] - R[ia * 2], uy = R[ib * 2 + 1] - R[ia * 2 + 1], vx = R[ic * 2] - R[ia * 2], vy = R[ic * 2 + 1] - R[ia * 2 + 1];
          const plusLong = Math.max(Math.hypot(ux, uy), Math.hypot(vx, vy), Math.hypot(vx - ux, vy - uy));
          if (Math.abs(ux * vy - vx * uy) < 2.5 * plusLong) continue;   // hauteur < 2,5 px : une lamelle de contour, pas un triangle
        }
        const { s1, s2, det } = etirement(R, P, T[j * 3], T[j * 3 + 1], T[j * 3 + 2]);
        const cx = (R[T[j * 3] * 2] + R[T[j * 3 + 1] * 2] + R[T[j * 3 + 2] * 2]) / 3;
        const cy = (R[T[j * 3] * 2 + 1] + R[T[j * 3 + 1] * 2 + 1] + R[T[j * 3 + 2] * 2 + 1]) / 3;
        const ou = { calque: cal.id, t: +t.toFixed(3), os: osDominant(cal, T[j * 3]), x: Math.round(cx), y: Math.round(cy) };
        if (det <= 0) { signale('retourne:' + cal.id, { niveau: 'erreur', code: 'retourne', message: `triangle retourné vers (${ou.x}, ${ou.y}) à t=${ou.t} s (os ${ou.os})`, ...ou }); continue; }
        const e = Math.max(Math.abs(s1 - 1), Math.abs(s2 - 1));
        if (libre.has(cal.id)) continue;
        if (cal.trait[j]) { if (e > p.trait) { p.trait = e; p.tTrait = t; p.ouTrait = ou; } }
        else if (e > p.autre) { p.autre = e; p.tAutre = t; p.ouAutre = ou; }
      }
    });
  }
  // accelerations (le clip est enroule : la case 0 voit la fin du cycle avant elle)
  const acc = (A, B, C) => {
    let m = 0;
    A.forEach((a, k) => { for (let v = 0; v < a.length; v++) m = Math.max(m, Math.abs(A[k][v] - 2 * B[k][v] + C[k][v])); });
    return m / (h * h);
  };
  for (let s = 1; s < N; s++) accMax = Math.max(accMax, acc(pistes[s - 1], pistes[s], pistes[s + 1]));

  pire.forEach(p => {
    if (p.trait > S.etirementTrait) signale('trait:' + p.calque, { niveau: 'erreur', code: 'etirement-trait',
      message: `contour étiré de ${(p.trait * 100).toFixed(1)} % (max ${S.etirementTrait * 100} %) vers (${p.ouTrait.x}, ${p.ouTrait.y}) à t=${p.ouTrait.t} s, os ${p.ouTrait.os}`, ...p.ouTrait });
    if (p.autre > S.etirementMax) signale('autre:' + p.calque, { niveau: 'alerte', code: 'etirement',
      message: `intérieur étiré de ${(p.autre * 100).toFixed(1)} % (max ${S.etirementMax * 100} %) vers (${p.ouAutre.x}, ${p.ouAutre.y}) à t=${p.ouAutre.t} s, os ${p.ouAutre.os}`, ...p.ouAutre });
  });

  // les calques rigides qui s'ecartent de leur parent
  const json = rig.json.calques || [];
  for (const cj of json) {
    if (cj.mesh || !cj.os || !sq.index.has(cj.os)) continue;
    const b = sq.os[sq.index.get(cj.os)];
    if (b.parent < 0) continue;
    let pireD = 0, tD = 0;
    for (let s = 0; s <= N; s++) {
      evalueClip(sq, clip, s * h, pose); calculeMonde(sq, pose, monde); peau = matricesDePeau(sq, monde, peau);
      const o = b.parent * 6;
      const ex = peau[o] * b.x0 + peau[o + 2] * b.y0 + peau[o + 4], ey = peau[o + 1] * b.x0 + peau[o + 3] * b.y0 + peau[o + 5];
      const d = Math.hypot(monde.x[b.i] - ex, monde.y[b.i] - ey);
      if (d > pireD) { pireD = d; tD = s * h; }
    }
    if (pireD > S.detache * taille) signale('detache:' + cj.id, { niveau: 'erreur', code: 'detache', calque: cj.id, os: b.id, t: +tD.toFixed(3),
      message: `le calque « ${cj.id} » s'écarte de ${pireD.toFixed(1)} px de son parent « ${sq.os[b.parent].id} » à t=${tD.toFixed(2)} s (max ${(S.detache * taille).toFixed(1)} px) : un trou se verra à l'articulation` });
  }

  // les zones decouvertes : de combien le calque du dessus glisse sur celui du dessous
  for (let s = 0; s <= N; s++) {
    const som = pistes[s];
    for (const z of zonesVues) {
      // le plus grand glissement d'un sommet du dessus, par rapport au deplacement moyen du dessous
      const P = som[z.kA], R = rig.calques[z.kA].repos, PB = som[z.kB], RB = rig.calques[z.kB].repos;
      let bx = 0, by = 0;
      for (const v of z.vB) { bx += PB[v * 2] - RB[v * 2]; by += PB[v * 2 + 1] - RB[v * 2 + 1]; }
      if (z.vB.length) { bx /= z.vB.length; by /= z.vB.length; }
      for (const v of z.vA) {
        const d = Math.hypot(P[v * 2] - R[v * 2] - bx, P[v * 2 + 1] - R[v * 2 + 1] - by);
        if (d > z.pire) { z.pire = d; z.t = s * h; }
      }
    }
  }
  // une alerte par zone : le calque qui glisse le plus. Une zone comblee provisoirement ne
  // previent qu'au-dela de `glisseProvisoire` pixels (le remplissage couvre les petits glissements).
  const pireParZone = new Map();
  for (const z of zonesVues) { const k = z.dessous + '/' + z.zone; if (!pireParZone.has(k) || z.pire > pireParZone.get(k).pire) pireParZone.set(k, z); }
  for (const z of pireParZone.values()) {
    const seuil = z.etat === 'provisoire' ? S.glisseProvisoire : S.couture;
    if (z.pire > seuil) signale('zone:' + z.dessous + z.zone, { niveau: 'alerte', code: 'zone-a-combler', calque: z.dessous, t: +z.t.toFixed(3),
      message: `« ${z.dessus} » glisse de ${z.pire.toFixed(1)} px au-dessus de la zone « ${z.zone} » de « ${z.dessous} », ${z.etat === 'provisoire' ? 'comblée seulement provisoirement' : 'pas encore comblée'} (à t=${z.t.toFixed(2)} s)` });
  }

  // la couture
  let saut = 0, cogne = 0;
  if (clip.boucle) {
    const fin = sommetsA(clip.duree - 1e-4), debut = pistes[0];
    fin.forEach((f, k) => { for (let v = 0; v < f.length; v++) saut = Math.max(saut, Math.abs(f[v] - debut[k][v])); });
    if (saut > S.couture) signale('saute', { niveau: 'erreur', code: 'boucle-saute', t: clip.duree,
      message: `la boucle saute de ${saut.toFixed(1)} px entre la fin et le début (une clé de fin différente de celle de t=0 ?)` });
    cogne = acc(sommetsA(-h), pistes[0], pistes[1]);
    if (accMax > 0 && cogne > S.cogne * accMax && cogne > 50) signale('cogne', { niveau: 'alerte', code: 'boucle-cogne', t: 0,
      message: `la boucle change brusquement de vitesse à la couture (accélération ${Math.round(cogne)} contre ${Math.round(accMax)} au plus dans le clip)` });
  }

  const r2 = x => Math.round(x * 100) / 100, r4 = x => Math.round(x * 10000) / 10000;
  return {
    duree: clip.duree, boucle: clip.boucle, echantillons: N + 1,
    os: amp.filter(a => a.rot || a.x || a.y || a.sx || a.sy).map(a => ({ os: a.os, rot: r2(a.rot), x: r2(a.x), y: r2(a.y), sx: r4(a.sx), sy: r4(a.sy) })),
    calques: pire.map(p => ({ calque: p.calque, deplacementMax: r2(p.deplacement), etirementTrait: r2(p.trait * 100), etirementInterieur: r2(p.autre * 100), ...(libre.has(p.calque) ? { etirementLibre: true } : {}) })),
    zones: zonesVues.map(z => ({ zone: z.zone, dessous: z.dessous, dessus: z.dessus, etat: z.etat, glisse: r2(z.pire) })),
    couture: { saut: r2(saut), acceleration: Math.round(cogne), accelerationMax: Math.round(accMax) },
  };
}
