// Dessine le decor des fonds de combat (SVG) dans le style des personnages : des aplats, une ombre portee, un reflet, et
// un contour plus fin que celui des cartes. La clairiere (arbres, sol) et l'etang (nenuphars, eau).
// Usage : node scripts/gen-clairiere.mjs game/skins/cozy
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

// Un hasard fixe : le dessin ne change pas d'une generation a l'autre.
function hasard(graine) { let s = graine; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

/** Un contour festonne (une cime vue d'en haut) : n bosses autour d'un cercle de rayon R, chacune un arc vers l'exterieur. */
function feston(cx, cy, R, n, r, jeu = 0.12, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 + (r() - .5) * jeu;
    const rr = R * (1 + (r() - .5) * jeu);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i % n];
    const corde = Math.hypot(x1 - x0, y1 - y0);
    const rb = corde * (0.58 + r() * 0.08);
    d += ` A${rb.toFixed(1)} ${rb.toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d + 'Z';
}

/** Une etoile aux pointes arrondies (un sapin vu d'en haut). */
function etoile(cx, cy, Re, Ri, n, rot = 0) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? Ri : Re;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  return d + 'Z';
}

const svg = (vb, corps) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}">${corps}</svg>\n`;

// Le DECOR est moins cerne que ce qui se joue (demande du game designer, 21 oct. 2026 : « trop de details, baisser le
// niveau d'outline ») : un trait plus fin, vert tres sombre au lieu du brun presque noir des cartes, et rien a l'interieur
// des cimes qu'un reflet. Les cartes et les personnages gardent seuls le gros contour : ce sont eux qu'on doit voir.
const TRAIT_DECOR = '#1e4024';
const EPAISSEUR = 4;

/** Un feuillu : son ombre, sa cime (degrade), un reflet. `fruits` : quelques pommes, sans contour. */
function feuillu(graine, { cime, sombre, clair, fruits }) {
  const r = hasard(graine);
  const C = 108, R = 76;
  const forme = feston(C, C, R, 9, r);
  const reflet = feston(C - 16, C - 18, R * .55, 7, r, .2);
  let extras = '';
  if (fruits) {
    for (let i = 0; i < fruits.n; i++) {
      const a = (i / fruits.n) * Math.PI * 2 + r() * .6, d = 30 + r() * 30;
      const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
      extras += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${fruits.r}" fill="${fruits.c}"/>`;
    }
  }
  return svg(216, `
<defs><radialGradient id="g" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="${clair}"/><stop offset=".55" stop-color="${cime}"/><stop offset="1" stop-color="${sombre}"/></radialGradient></defs>
<path d="${forme}" transform="translate(7 11)" fill="#14301a" opacity=".32"/>
<path d="${forme}" fill="url(#g)" stroke="${TRAIT_DECOR}" stroke-width="${EPAISSEUR}" stroke-linejoin="round"/>
<path d="${reflet}" fill="${clair}" opacity=".55"/>
${extras}`);
}

/** Un sapin vu d'en haut : deux etoiles, la seconde plus claire et sans contour. */
function sapin(graine) {
  const r = hasard(graine);
  const C = 108;
  const rot = r() * Math.PI;
  return svg(216, `
<path d="${etoile(C, C, 82, 58, 9, rot)}" transform="translate(7 11)" fill="#14301a" opacity=".32"/>
<path d="${etoile(C, C, 82, 58, 9, rot)}" fill="#2f7d5c" stroke="${TRAIT_DECOR}" stroke-width="${EPAISSEUR}" stroke-linejoin="round"/>
<path d="${etoile(C - 6, C - 7, 50, 34, 9, rot + .35)}" fill="#46a077" opacity=".8"/>`);
}

/** Un buisson, plus petit, trois fleurs sans contour. */
function buisson(graine) {
  const r = hasard(graine);
  const C = 64, R = 42;
  const forme = feston(C, C, R, 7, r);
  let fleurs = '';
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r(), d = 12 + r() * 14;
    fleurs += fleur(C + Math.cos(a) * d, C + Math.sin(a) * d, 4.5, i % 2 ? '#ffd1dc' : '#fff');
  }
  return svg(128, `
<path d="${forme}" transform="translate(5 8)" fill="#14301a" opacity=".32"/>
<path d="${forme}" fill="#4a9a46" stroke="${TRAIT_DECOR}" stroke-width="${EPAISSEUR - 1}" stroke-linejoin="round"/>
<path d="${feston(C - 9, C - 10, R * .5, 6, r, .2)}" fill="#71c05c" opacity=".6"/>
${fleurs}`);
}

/** Une fleur : cinq petales, un coeur jaune, sans contour. */
function fleur(x, y, p, c) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    s += `<circle cx="${(x + Math.cos(a) * p).toFixed(1)}" cy="${(y + Math.sin(a) * p).toFixed(1)}" r="${(p * .75).toFixed(1)}" fill="${c}"/>`;
  }
  return s + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(p * .55).toFixed(1)}" fill="#ffcf3a"/>`;
}

/** Une touffe d'herbe : trois brins, un vert a peine plus sombre que le sol, sans contour. */
function touffe(x, y, k = 1) {
  const f = v => +v.toFixed(1);
  const brin = (dx, h, pen) => `M${f(x + dx - 3 * k)} ${y} Q${f(x + dx + pen * .3)} ${f(y - h * .6)} ${f(x + dx + pen)} ${f(y - h)} Q${f(x + dx + pen * .2 + 2 * k)} ${f(y - h * .5)} ${f(x + dx + 3 * k)} ${y}Z`;
  return `<path d="${brin(-7 * k, 14 * k, -6 * k)} ${brin(0, 19 * k, 1 * k)} ${brin(7 * k, 13 * k, 7 * k)}" fill="#4f8f3d"/>`;
}

/** La tuile du sol : trois touffes et deux fleurs, clairsemees (elle se repete). */
function sol() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" width="300" height="260"><g opacity=".55">`
    + touffe(40, 50, .9) + touffe(210, 95, .75) + touffe(120, 215, .8)
    + fleur(150, 40, 3.5, '#fff') + fleur(250, 200, 3, '#ffd1dc')
    + `</g></svg>\n`;
}

/** L'ETANG (fond de la Nenuphar Farm et du Bottle Maker) : une feuille de nenuphar vue d'en haut, l'encoche vers `a`. */
function nenuphar(graine, avecFleur) {
  const r = hasard(graine);
  const C = 64, R = 50;
  const a = r() * Math.PI * 2, ouv = .42;
  const p = ang => `${(C + Math.cos(ang) * R).toFixed(1)} ${(C + Math.sin(ang) * R).toFixed(1)}`;
  const feuille = `M${C} ${C} L${p(a + ouv / 2)} A${R} ${R} 0 1 1 ${p(a - ouv / 2)}Z`;
  let nervures = '';
  for (let i = 1; i <= 5; i++) {
    const b = a + ouv / 2 + i * (Math.PI * 2 - ouv) / 6;
    nervures += `<path d="M${C} ${C} L${(C + Math.cos(b) * R * .78).toFixed(1)} ${(C + Math.sin(b) * R * .78).toFixed(1)}" stroke="#7fc66a" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  let fleur = '';
  if (avecFleur) {
    for (let i = 0; i < 7; i++) {
      const b = (i / 7) * Math.PI * 2;
      fleur += `<ellipse cx="${(C + Math.cos(b) * 11).toFixed(1)}" cy="${(C + Math.sin(b) * 11).toFixed(1)}" rx="10" ry="6" fill="${i % 2 ? '#ffc2d4' : '#ff9fbc'}" transform="rotate(${(b * 180 / Math.PI).toFixed(0)} ${(C + Math.cos(b) * 11).toFixed(1)} ${(C + Math.sin(b) * 11).toFixed(1)})"/>`;
    }
    fleur += `<circle cx="${C}" cy="${C}" r="6" fill="#ffd34a"/>`;
  }
  return svg(128, `
<path d="${feuille}" transform="translate(4 7)" fill="#103a40" opacity=".3"/>
<path d="${feuille}" fill="#56a64a" stroke="${TRAIT_DECOR}" stroke-width="${EPAISSEUR - 1}" stroke-linejoin="round"/>
${nervures}${fleur}`);
}

/** La tuile de l'eau : quelques rides claires, sans contour (elle se repete). */
function eau() {
  const ride = (x, y, l) => `<path d="M${x - l} ${y} Q${x} ${y - l * .35} ${x + l} ${y}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 220" width="260" height="220"><g opacity=".22">`
    + ride(50, 40, 16) + ride(70, 48, 9) + ride(190, 110, 18) + ride(110, 180, 14) + ride(128, 187, 7)
    + `</g></svg>\n`;
}

const fichiers = {
  'nenuphar.svg': nenuphar(3, false),
  'nenuphar-fleur.svg': nenuphar(8, true),
  'eau.svg': eau(),
  'chene.svg': feuillu(11, { cime: '#3f8f3c', sombre: '#2a6a30', clair: '#74c35a' }),
  'chene2.svg': feuillu(29, { cime: '#4a9a40', sombre: '#2f7132', clair: '#86cf62' }),
  'pommier.svg': feuillu(47, { cime: '#459640', sombre: '#2c6c31', clair: '#7dc95e', fruits: { n: 4, r: 6, c: '#e8574f' } }),
  'sapin.svg': sapin(5),
  'buisson.svg': buisson(13),
  'sol.svg': sol()
};
for (const [nom, contenu] of Object.entries(fichiers)) fs.writeFileSync(path.join(OUT, nom), contenu);
console.log(Object.keys(fichiers).join(', '));
