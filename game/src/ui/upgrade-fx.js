// LE « JUS » D'UNE AMELIORATION (3 nov. 2026, mockups/Level Up/) : une explosion de flammes sur la carte, la pastille de niveau qui jaillit en grand,
// la fiche qui tremble, le telephone qui vibre, les pieces qui partent et le « +10 Power » qui monte. Tout est dessine en WAAPI + `setTimeout`
// (rien ne depend de `requestAnimationFrame`, comme `effets.js`) sur une couche posee dans `<body>`, jamais touchable. Les reglages sont dans
// `BALANCE.ui.upgradeFx` : durees, force du tremblement, motif de vibration, nombre d'etincelles.
import { BALANCE } from '../config/balance.js';
import { icone } from './icones.js';

const F = () => BALANCE.ui.upgradeFx;
const hasard = (a, b) => a + Math.random() * (b - a);
const choix = l => l[Math.floor(Math.random() * l.length)];

/** Une vibration du telephone (Android ; l'iPhone ne sait pas) : un motif en millisecondes, ou rien si le jeu les coupe. */
export function vibre(motif) {
  try { if (BALANCE.ui.haptique !== false) navigator.vibrate?.(motif); } catch { /* pas de vibration : tant pis */ }
}

/** La couche des effets : tout y est pose en `position: fixed`, puis retire. */
function couche() {
  const n = document.createElement('div');
  n.className = 'upg-fx';
  document.body.appendChild(n);
  return n;
}
const centreDe = node => { const r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.width, h: r.height }; };
const finir = (n, ms) => setTimeout(() => n.remove(), ms + 80);

/** Le tremblement : une suite de secousses qui s'amortissent, sur `translate` (la fiche garde son `transform`). */
export function secoue(node, { ms = F().shakeMs, px = F().shakePx } = {}) {
  if (!node) return;
  const n = 12;
  const kf = [{ translate: '0 0', offset: 0 }];
  for (let i = 1; i < n; i++) {
    const a = px * (1 - i / n);
    kf.push({ translate: `${(i % 2 ? -1 : 1) * a * hasard(.7, 1)}px ${hasard(-.5, .5) * a}px`, offset: i / n });
  }
  kf.push({ translate: '0 0', offset: 1 });
  node.animate(kf, { duration: ms, easing: 'linear' });
}

/** L'explosion : un flash, trois boules de feu, un anneau et des etincelles qui retombent. Centree sur `node`. */
export function explose(node, { n = F().etincelles, ms = F().explosionMs } = {}) {
  const { x, y, l, h } = centreDe(node);
  const taille = Math.max(l, h);
  const c = couche();
  const pose = (css, kf, opts) => {
    const e = document.createElement('i');
    e.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;will-change:transform,opacity;${css}`;
    c.appendChild(e);
    e.animate(kf, { fill: 'forwards', ...opts });
    return e;
  };
  // Le flash blanc-jaune, puis les boules de feu orange et rouge qui gonflent et s'eteignent.
  pose(`width:${taille * 1.5}px;height:${taille * 1.5}px;margin:${-taille * .75}px 0 0 ${-taille * .75}px;border-radius:50%;background:radial-gradient(circle,#fffbe0 0 25%,#ffd23f 50%,transparent 72%)`,
    [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.1)', opacity: .95, offset: .35 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: ms * .6, easing: 'ease-out' });
  for (let i = 0; i < 3; i++) {
    const d = taille * hasard(.7, 1.1);
    pose(`width:${d}px;height:${d}px;margin:${-d / 2}px 0 0 ${-d / 2}px;border-radius:50%;filter:blur(${d * .08}px);background:radial-gradient(circle,#ffb347 0 30%,#ff5a1f 58%,rgba(180,20,10,.55) 76%,transparent 78%)`,
      [{ transform: `translate(${hasard(-8, 8)}px,${hasard(-8, 8)}px) scale(.15)`, opacity: 0 },
        { transform: `translate(${hasard(-taille * .25, taille * .25)}px,${hasard(-taille * .3, taille * .1)}px) scale(1)`, opacity: .9, offset: .4 },
        { transform: `translate(${hasard(-taille * .3, taille * .3)}px,${-taille * .35}px) scale(1.35)`, opacity: 0 }], { duration: ms * hasard(.8, 1), delay: i * 40, easing: 'ease-out' });
  }
  pose(`width:${taille}px;height:${taille}px;margin:${-taille / 2}px 0 0 ${-taille / 2}px;border-radius:50%;border:5px solid #fff3b0;box-sizing:border-box`,
    [{ transform: 'scale(.3)', opacity: .95 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: ms * .7, easing: 'cubic-bezier(.1,.7,.3,1)' });
  // Les etincelles : parties en tous sens, elles retombent (la gravite est dans la derniere cle).
  for (let i = 0; i < n; i++) {
    const a = hasard(0, Math.PI * 2), d = taille * hasard(.45, 1.15), s = hasard(5, 14);
    const couleur = choix(['#ffd23f', '#ff9f1c', '#ff4d2e', '#fff3b0', '#ffffff']);
    const forme = Math.random() < .35 ? 'clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)' : 'border-radius:50%';
    pose(`width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;background:${couleur};box-shadow:0 0 ${s}px ${couleur};${forme}`,
      [{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(1) rotate(${hasard(-200, 200)}deg)`, opacity: 1, offset: .55 },
        { transform: `translate(${Math.cos(a) * d * 1.15}px,${Math.sin(a) * d * 1.15 + taille * .35}px) scale(.2) rotate(${hasard(-300, 300)}deg)`, opacity: 0 }],
      { duration: ms * hasard(.7, 1.15), delay: hasard(0, 70), easing: 'cubic-bezier(.15,.6,.4,1)' });
  }
  finir(c, ms * 1.3 + 150);
}

/** La grosse pastille rouge du nouveau niveau, qui jaillit au centre de `node` (maquette : le « 5 » en grand), puis se pose. */
export function pastilleGeante(node, texte, { ms = F().pastilleMs } = {}) {
  const { x, y, l, h } = centreDe(node);
  const d = Math.max(54, Math.min(l, h) * .62);
  const c = couche();
  const e = document.createElement('b');
  e.textContent = texte;
  e.className = 'upg-grosse';
  e.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${d}px;height:${d}px;margin:${-d / 2}px 0 0 ${-d / 2}px;font-size:${d * .62}px`;
  c.appendChild(e);
  e.animate([
    { transform: 'scale(0) rotate(-25deg)', opacity: 0 },
    { transform: 'scale(1.45) rotate(6deg)', opacity: 1, offset: .22 },
    { transform: 'scale(.92) rotate(-3deg)', opacity: 1, offset: .38 },
    { transform: 'scale(1.08) rotate(0)', opacity: 1, offset: .5 },
    { transform: 'scale(1) rotate(0)', opacity: 1, offset: .78 },
    { transform: 'scale(.4) translate(60%,-90%)', opacity: 0 }
  ], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  finir(c, ms);
}

/**
 * CE QUI CHANGE, EN GRAND (retour du game designer, 3 nov. 2026) : au centre de `node`, l'icone de chaque changement (une attaque de plus, un cout qui
 * baisse, un effet qui grossit, un mot-cle gagne…) avec sa valeur, qui jaillissent l'une apres l'autre, tiennent un instant et s'envolent. `items` :
 * `[{ icone: 'Attack', texte: '+1' }]` ; `texte` peut etre « 2 → 3 » (l'ancienne valeur, la nouvelle).
 */
export function changementGeant(node, items, { ms = F().changementMs } = {}) {
  const { x, y } = centreDe(node);
  const c = couche();
  const rang = document.createElement('div');
  rang.className = 'upg-chgs';
  rang.style.cssText = `position:fixed;left:${x}px;top:${y}px;transform:translate(-50%,-50%)`;
  c.appendChild(rang);
  items.forEach((it, i) => {
    const e = document.createElement('div');
    e.className = 'upg-chg';
    e.innerHTML = `<span class="rond">${icone(it.icone, 74)}</span>${it.texte ? `<b>${it.texte}</b>` : ''}`;
    rang.appendChild(e);
    e.animate([
      { transform: 'scale(0) rotate(-30deg)', opacity: 0 },
      { transform: 'scale(1.4) rotate(7deg)', opacity: 1, offset: .22 },
      { transform: 'scale(.94) rotate(-3deg)', opacity: 1, offset: .38 },
      { transform: 'scale(1.06) rotate(0)', opacity: 1, offset: .5 },
      { transform: 'scale(1) rotate(0)', opacity: 1, offset: .8 },
      { transform: 'scale(.45) translate(40%,-120%)', opacity: 0 }
    ], { duration: ms, delay: i * 140, easing: 'ease-out', fill: 'forwards' });
    // Le rond de l'icone bat une fois, comme un coeur : c'est lui qu'on doit lire.
    e.querySelector('.rond').animate([{ scale: 1 }, { scale: 1.18, offset: .5 }, { scale: 1 }], { duration: 520, delay: i * 140 + ms * .25, easing: 'ease-in-out' });
  });
  finir(c, ms + items.length * 140);
}

/** Un petit texte qui monte et s'efface (« +10 Power »), depuis `node`. */
export function texteQuiMonte(node, texte, { ms = F().texteMs, classe = '' } = {}) {
  const { x, y, h } = centreDe(node);
  const c = couche();
  const e = document.createElement('b');
  e.textContent = texte;
  e.className = `upg-monte ${classe}`;
  e.style.cssText = `position:fixed;left:${x}px;top:${y - h * .1}px;transform:translateX(-50%)`;
  c.appendChild(e);
  e.animate([
    { transform: 'translate(-50%,10px) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,-14px) scale(1.25)', opacity: 1, offset: .25 },
    { transform: 'translate(-50%,-70px) scale(1)', opacity: 0 }
  ], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  finir(c, ms);
}

/** Des pieces qui partent de `de` vers `vers` (le prix qui s'envole), en eventail. */
export function piecesQuiVolent(de, vers, { n = F().pieces, ms = F().piecesMs, src = '' } = {}) {
  const a = centreDe(de), b = centreDe(vers);
  const c = couche();
  for (let i = 0; i < n; i++) {
    const e = document.createElement(src ? 'img' : 'i');
    if (src) e.src = src;
    e.className = 'upg-piece';
    e.style.cssText = `position:fixed;left:${a.x}px;top:${a.y}px;width:22px;height:22px;margin:-11px 0 0 -11px`;
    c.appendChild(e);
    const mx = a.x + (b.x - a.x) * .45 + hasard(-70, 70), my = Math.min(a.y, b.y) - hasard(30, 90);
    e.animate([
      { transform: 'translate(0,0) scale(.5)', opacity: 0 },
      { transform: `translate(${mx - a.x}px,${my - a.y}px) scale(1.1) rotate(160deg)`, opacity: 1, offset: .45 },
      { transform: `translate(${b.x - a.x}px,${b.y - a.y}px) scale(.55) rotate(360deg)`, opacity: .9 }
    ], { duration: ms, delay: i * 45, easing: 'cubic-bezier(.3,.1,.5,1)', fill: 'forwards' });
  }
  finir(c, ms + n * 45);
}

/** Un « pop » de ressort : `node` gonfle puis se cale (le niveau qui change, la carte qui vient d'etre amelioree). */
export function pop(node, { fort = 1.14, ms = 420 } = {}) {
  node?.animate([{ scale: 1 }, { scale: fort, offset: .35 }, { scale: .96, offset: .65 }, { scale: 1 }], { duration: ms, easing: 'ease-out' });
}

/** Un halo qui bat autour de `node` (la carte ameliorée brille un instant). */
export function brille(node, { ms = 900 } = {}) {
  node?.animate([
    { filter: 'brightness(1) drop-shadow(0 0 0 rgba(255,210,63,0))' },
    { filter: 'brightness(1.5) drop-shadow(0 0 14px rgba(255,210,63,.95))', offset: .25 },
    { filter: 'brightness(1.1) drop-shadow(0 0 8px rgba(255,210,63,.5))', offset: .6 },
    { filter: 'brightness(1) drop-shadow(0 0 0 rgba(255,210,63,0))' }
  ], { duration: ms, easing: 'ease-out' });
}
