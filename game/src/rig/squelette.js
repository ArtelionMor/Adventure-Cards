// LE SQUELETTE : des os, leur pose de repos, et les transformations du monde.
//
// Les coordonnees sont celles de l'IMAGE SOURCE, en pixels, y vers le BAS. Un angle est en
// degres, 0 = vers la droite, positif = sens HORAIRE a l'ecran (c'est ce que donne y vers le
// bas). Un os qui monte a donc l'angle -90.
//
// Le fichier rig.json decrit chaque os dans sa pose de repos, EN COORDONNEES DE L'IMAGE
// (origine x, y, angle, longueur) : c'est ce que l'editeur manipule a la souris. On en deduit
// ici la pose locale (relative au parent), qui est ce que les clips decalent.
//
// Ce module ne depend de rien (ni DOM, ni autre fichier hors de game/src/rig/) : le dossier
// se copie tel quel dans un autre jeu.

export const CANAUX = ['rot', 'x', 'y', 'sx', 'sy'];
export const NEUTRE = { rot: 0, x: 0, y: 0, sx: 1, sy: 1 };

const RAD = Math.PI / 180;

// Range les os parents d'abord (l'ordre du fichier n'est pas une promesse) et fige ce qui ne
// change jamais : index du parent, pose de repos locale, matrice inverse du repos.
// Rend { os: [...], index: Map(id -> i), ordre: [i...] }. Lance une erreur lisible si
// l'arbre est faux (parent inconnu, boucle) : verifie.js le dit plus en detail.
export function prepareSquelette(rig) {
  const liste = rig.os || [];
  const index = new Map();
  liste.forEach((o, i) => {
    if (index.has(o.id)) throw new Error('os en double : ' + o.id);
    index.set(o.id, i);
  });
  const ordre = [];
  const etat = new Array(liste.length).fill(0); // 0 pas vu, 1 en cours, 2 range
  const visite = i => {
    if (etat[i] === 2) return;
    if (etat[i] === 1) throw new Error('boucle dans les parents de ' + liste[i].id);
    etat[i] = 1;
    const p = liste[i].parent;
    if (p != null) {
      if (!index.has(p)) throw new Error('parent inconnu « ' + p + ' » pour ' + liste[i].id);
      visite(index.get(p));
    }
    etat[i] = 2;
    ordre.push(i);
  };
  liste.forEach((_, i) => visite(i));

  const os = liste.map((o, i) => {
    const parent = o.parent == null ? -1 : index.get(o.parent);
    return {
      id: o.id, i, parent,
      x0: +o.x || 0, y0: +o.y || 0, a0: +o.angle || 0, longueur: +o.longueur || 0,
      deforme: o.deforme !== false,
      // la portee de l'os pour les poids automatiques (2 = il attire de deux fois plus loin)
      portee: o.portee > 0 ? +o.portee : 1,
      // remplis plus bas, une fois le parent connu
      tx: 0, ty: 0, r: 0, cosP: 1, sinP: 0,
    };
  });
  for (const i of ordre) {
    const b = os[i];
    if (b.parent < 0) { b.tx = b.x0; b.ty = b.y0; b.r = b.a0; continue; }
    const p = os[b.parent];
    const c = Math.cos(-p.a0 * RAD), s = Math.sin(-p.a0 * RAD);
    const dx = b.x0 - p.x0, dy = b.y0 - p.y0;
    b.tx = c * dx - s * dy;
    b.ty = s * dx + c * dy;
    b.r = b.a0 - p.a0;
    // Un decalage x/y d'un clip est ecrit dans les axes de l'IMAGE (au repos du parent) :
    // on le ramene dans le repere du parent avec la rotation inverse de son repos.
    b.cosP = c; b.sinP = s;
  }
  // le sous-arbre de chaque os, dans l'ordre de calcul (l'IK recalcule ce qui pend sous un os)
  const sousArbre = os.map(() => []);
  for (const i of ordre) for (let k = os[i].parent; k >= 0; k = os[k].parent) sousArbre[k].push(i);
  // LES IK A 2 OS : `os` = [le premier, le second, enfant du premier], `cible` = un os dont
  // l'ORIGINE est le point a atteindre (on anime la cible, l'IK plie le membre). `flexion`
  // = 1 ou -1 : de quel cote plie l'articulation. Une IK mal formee est ignoree ici
  // (verifie.js la signale).
  const ik = [];
  for (const c of rig.ik || []) {
    const [a, b] = (c.os || []).map(id => index.get(id));
    const cible = index.get(c.cible);
    if (a == null || b == null || cible == null || os[b].parent !== a) continue;
    if (cible === a || cible === b || sousArbre[a].includes(cible)) continue;
    ik.push({ id: c.id || c.os.join('-'), a, b, cible, flexion: c.flexion < 0 ? -1 : 1 });
  }
  return { os, index, ordre, sousArbre, ik };
}

// Une pose = cinq tableaux, un par canal, une case par os. Les valeurs sont ABSOLUES pour la
// pose (rot en degres ajoutes au repos, x/y en pixels ajoutes, sx/sy en facteurs).
export function poseNeutre(n) {
  return {
    rot: new Float64Array(n), x: new Float64Array(n), y: new Float64Array(n),
    sx: new Float64Array(n).fill(1), sy: new Float64Array(n).fill(1),
  };
}

export function remetNeutre(pose) {
  pose.rot.fill(0); pose.x.fill(0); pose.y.fill(0); pose.sx.fill(1); pose.sy.fill(1);
  return pose;
}

// Le monde d'un os : position, angle (degres), echelle PROPRE (sx le long de l'os, sy en
// travers). ⚠ L'echelle ne se transmet PAS aux enfants : elle deplace leur point
// d'attache (un corps qui respire souleve la tete) mais ne les grossit pas. C'est ce qui
// evite le cisaillement d'une echelle non uniforme heritee a travers une rotation.
export function mondeNeuf(n) {
  return { x: new Float64Array(n), y: new Float64Array(n), a: new Float64Array(n),
    sx: new Float64Array(n), sy: new Float64Array(n) };
}

// ⚠ Une IK RETOUCHE `pose.rot` des deux os de sa chaine (c'est la rotation qui atteint la
// cible) : la pose rendue est celle qu'on voit.
export function calculeMonde(sq, pose, monde) {
  for (const i of sq.ordre) calculeUn(sq, pose, monde, i);
  for (const k of sq.ik || []) resousIK(sq, pose, monde, k);
  return monde;
}

// Le solveur analytique a 2 os (loi des cosinus). La longueur du premier segment est la
// distance de son origine a celle du second (un coude decale de l'axe marche aussi).
function resousIK(sq, pose, monde, { a, b, cible, flexion }) {
  const ax = monde.x[a], ay = monde.y[a], bx = monde.x[b], by = monde.y[b];
  const tx = monde.x[cible], ty = monde.y[cible];
  const L1 = Math.hypot(bx - ax, by - ay), L2 = sq.os[b].longueur * monde.sx[b];
  if (L1 < 1e-6 || L2 < 1e-6) return;
  const d = Math.min(L1 + L2 - 1e-6, Math.max(Math.abs(L1 - L2) + 1e-6, Math.hypot(tx - ax, ty - ay)));
  const vers = Math.atan2(ty - ay, tx - ax);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const dir1 = vers - flexion * alpha;
  pose.rot[a] += (dir1 - Math.atan2(by - ay, bx - ax)) / RAD;
  calculeUn(sq, pose, monde, a);
  for (const i of sq.sousArbre[a]) calculeUn(sq, pose, monde, i);
  const dir2 = Math.atan2(ty - monde.y[b], tx - monde.x[b]);
  pose.rot[b] += (dir2 - monde.a[b] * RAD) / RAD;
  calculeUn(sq, pose, monde, b);
  for (const i of sq.sousArbre[b]) calculeUn(sq, pose, monde, i);
}

export function calculeUn(sq, pose, monde, i) {
  const b = sq.os[i];
  const dx = pose.x[i], dy = pose.y[i];
  if (b.parent < 0) {
    monde.x[i] = b.tx + dx;
    monde.y[i] = b.ty + dy;
    monde.a[i] = b.r + pose.rot[i];
  } else {
    const p = b.parent;
    const lx = b.tx + b.cosP * dx - b.sinP * dy;
    const ly = b.ty + b.sinP * dx + b.cosP * dy;
    const ax = lx * monde.sx[p], ay = ly * monde.sy[p];
    const c = Math.cos(monde.a[p] * RAD), s = Math.sin(monde.a[p] * RAD);
    monde.x[i] = monde.x[p] + c * ax - s * ay;
    monde.y[i] = monde.y[p] + s * ax + c * ay;
    monde.a[i] = monde.a[p] + b.r + pose.rot[i];
  }
  monde.sx[i] = pose.sx[i];
  monde.sy[i] = pose.sy[i];
}

// La matrice de peau d'un os : emmene un point de l'image AU REPOS la ou l'os l'emporte.
// Affine au format canvas [a, b, c, d, e, f] : x' = a x + c y + e, y' = b x + d y + f.
export function matricesDePeau(sq, monde, out) {
  const n = sq.os.length;
  out = out || new Float64Array(n * 6);
  for (let i = 0; i < n; i++) {
    const b = sq.os[i];
    const c = Math.cos(monde.a[i] * RAD), s = Math.sin(monde.a[i] * RAD);
    const c0 = Math.cos(-b.a0 * RAD), s0 = Math.sin(-b.a0 * RAD);
    // M = T(p) R(a) S(sx, sy) R(-a0) T(-p0)
    const sx = monde.sx[i], sy = monde.sy[i];
    // R(a) S : colonnes (c sx, s sx) et (-s sy, c sy)
    const m00 = c * sx, m10 = s * sx, m01 = -s * sy, m11 = c * sy;
    // ... fois R(-a0)
    const a = m00 * c0 + m01 * s0;
    const bb = m10 * c0 + m11 * s0;
    const cc = -m00 * s0 + m01 * c0;
    const d = -m10 * s0 + m11 * c0;
    const o = i * 6;
    out[o] = a; out[o + 1] = bb; out[o + 2] = cc; out[o + 3] = d;
    out[o + 4] = monde.x[i] - (a * b.x0 + cc * b.y0);
    out[o + 5] = monde.y[i] - (bb * b.x0 + d * b.y0);
  }
  return out;
}

// Le bout d'un os dans le monde (pour dessiner, et pour l'IK plus tard).
export function boutDe(sq, monde, i) {
  const b = sq.os[i];
  const c = Math.cos(monde.a[i] * RAD), s = Math.sin(monde.a[i] * RAD);
  const L = b.longueur * monde.sx[i];
  return [monde.x[i] + c * L, monde.y[i] + s * L];
}
