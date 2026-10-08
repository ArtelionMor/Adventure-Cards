// Overworld : vue du dessus, deplacement libre, points d'interet.
// La progression est rythmee par les NIVEAUX REQUIS (barrieres + rencontres), pas par
// un decoupage en niveaux fermes : le monde entier est la des le prototype (GDD).
import { WORLD, TILE, TILE_COLOR, BLOCKED, buildMap, ENCOUNTERS } from '../config/world.js';
import { RELICS, RELIC_BY_ID } from '../config/relics.js';
import { CHAR_BY_ID } from '../config/characters.js';
import { save, persist, partyLevel, gain, spend } from '../state.js';
import { $, el, asset, toast, modal, closeModal, setContext } from './shell.js';
import { openBattle } from './battle.js';

const map = buildMap();
const cols = WORLD.cols, rows = WORLD.rows;
const tileAt = (x, y) =>
  (x < 0 || y < 0 || x >= cols || y >= rows) ? TILE.WATER : map[Math.floor(y) * cols + Math.floor(x)];

let cv, cx, running = false, last = 0;
const keys = new Set();
let stick = { x: 0, y: 0, active: false, id: null };
let near = null;

const imgCache = {};
function img(path) {
  if (!path) return null;
  if (!imgCache[path]) {
    const i = new Image();
    i.src = asset(path);
    imgCache[path] = i;
  }
  return imgCache[path];
}

function nodeSprite(n) {
  if (n.sprite) return n.sprite;
  if (n.type === 'fight' || n.type === 'boss') return ENCOUNTERS[n.enemy].sprite;
  if (n.type === 'chest') return 'UI/Vault.png';
  if (n.type === 'shop') return 'Machines/Coffee shop.png';
  return null;
}

// ------------------------------------------------------------------- init
export function initWorld() {
  cv = $('#worldCanvas');
  cx = cv.getContext('2d');
  resize();
  addEventListener('resize', resize);

  addEventListener('keydown', e => {
    keys.add(e.key.toLowerCase());
    if (e.key === 'Enter' || e.key === ' ') interact();
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  // LE JOYSTICK FLOTTANT : il naît la ou le doigt se pose, n'importe ou sur la carte, et
  // disparait quand on le leve. Le point de depart est le centre de la manette : on lit
  // ensuite de combien le doigt s'en est eloigne. Les boutons (« Entrer », « Marchander »)
  // sont des elements a part, au-dessus du canvas : toucher l'un d'eux ne pose pas de manette.
  const j = $('#joystick');
  const knob = j.querySelector('i');
  j.classList.add('hidden');
  const RAYON = 62;    // moitie du diametre de la manette (cf. `.joystick` dans styles.css)
  const COURSE = 40;   // eloignement du doigt pour la pleine vitesse (le bouton va jusque-la)
  const ZONE_MORTE = 0.12;
  const monde = $('#screen-world');
  let origine = null;
  const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx * COURSE}px, ${dy * COURSE}px)`; };
  cv.addEventListener('pointerdown', e => {
    if (stick.active || (e.pointerType === 'mouse' && e.button !== 0)) return;
    stick.active = true; stick.id = e.pointerId; cv.setPointerCapture(e.pointerId);
    const r = monde.getBoundingClientRect();
    origine = { x: e.clientX, y: e.clientY };
    j.style.left = (e.clientX - r.left - RAYON) + 'px';
    j.style.top = (e.clientY - r.top - RAYON) + 'px';
    setKnob(0, 0);
    j.classList.remove('hidden');
  });
  cv.addEventListener('pointermove', e => { if (stick.active && e.pointerId === stick.id) move(e); });
  const stop = e => {
    if (e && e.pointerId !== stick.id) return;
    stick.active = false; stick.id = null; stick.x = stick.y = 0;
    j.classList.add('hidden');
  };
  cv.addEventListener('pointerup', stop);
  cv.addEventListener('pointercancel', stop);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  function move(e) {
    let dx = (e.clientX - origine.x) / COURSE;
    let dy = (e.clientY - origine.y) / COURSE;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    setKnob(dx, dy);
    // Une manette qui bouge d'un pixel ne doit pas faire avancer le personnage.
    if (m < ZONE_MORTE) { stick.x = stick.y = 0; return; }
    stick.x = dx; stick.y = dy;
  }

  $('#interactBtn').onclick = interact;
}

function resize() {
  if (!cv) return;
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.floor(r.width * dpr);
  cv.height = Math.floor(r.height * dpr);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function startWorld() {
  if (running) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}
export function stopWorld() { running = false; }

// --------------------------------------------------------------- simulation
function blockedAt(x, y) {
  if (BLOCKED.has(tileAt(x, y))) return true;
  const lvl = partyLevel();
  for (const n of WORLD.nodes) {
    if (n.type !== 'gate') continue;
    if (lvl >= n.reqLevel) continue;
    if (Math.hypot(n.x + 0.5 - x, n.y + 0.5 - y) < 3) return true;
  }
  return false;
}

function step(dt) {
  const w = save.world;
  let dx = stick.x, dy = stick.y;
  if (keys.has('arrowleft') || keys.has('q') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('z') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  const m = Math.hypot(dx, dy);
  if (m > 1) { dx /= m; dy /= m; }

  const speed = 4.6; // tuiles par seconde
  const nx = w.px + dx * speed * dt;
  const ny = w.py + dy * speed * dt;
  // Deplacement axe par axe : on glisse le long des murs au lieu de rester coince.
  if (!blockedAt(nx, w.py)) w.px = nx;
  if (!blockedAt(w.px, ny)) w.py = ny;

  // point d'interet le plus proche
  near = null;
  let best = 1.6;
  for (const n of WORLD.nodes) {
    const d = Math.hypot(n.x + 0.5 - w.px, n.y + 0.5 - w.py);
    if (d < best) { best = d; near = n; }
    if (d < 6) save.world.seen[n.id] = true;
  }
  const btn = $('#interactBtn');
  const hint = $('#worldHint');
  if (near && near.type !== 'gate') {
    btn.classList.remove('hidden');
    btn.textContent = labelFor(near);
    hint.textContent = titleFor(near);
    hint.classList.add('on');
  } else {
    btn.classList.add('hidden');
    if (near && near.type === 'gate') {
      hint.textContent = partyLevel() >= near.reqLevel
        ? `${near.name} — le passage est ouvert`
        : `${near.name} — niveau ${near.reqLevel} requis (tu es niveau ${partyLevel()})`;
      hint.classList.add('on');
    } else hint.classList.remove('on');
  }
}

function labelFor(n) {
  if (n.type === 'chest') return save.world.cleared[n.id] ? 'Vide' : 'Ouvrir';
  if (n.type === 'shop') return 'Marchander';
  if (n.type === 'npc') return 'Parler';
  if (n.type === 'teleport') return 'Voyager';
  return save.world.cleared[n.id] ? 'Rejouer' : 'Combattre';
}
function titleFor(n) {
  const lvl = n.reqLevel ? ` · niveau ${n.reqLevel}` : '';
  return n.name + lvl;
}

// ------------------------------------------------------------------- rendu
function frame(t) {
  if (!running) return;
  const dt = Math.min((t - last) / 1000, 0.05);
  last = t;
  step(dt);
  draw(t);
  requestAnimationFrame(frame);
}

function draw(t) {
  const w = save.world;
  const W = cv.clientWidth, H = cv.clientHeight;
  const ts = WORLD.tile;
  const camx = w.px * ts - W / 2, camy = w.py * ts - H / 2;

  cx.fillStyle = '#131a20';
  cx.fillRect(0, 0, W, H);

  const x0 = Math.max(0, Math.floor(camx / ts)), x1 = Math.min(cols - 1, Math.ceil((camx + W) / ts));
  const y0 = Math.max(0, Math.floor(camy / ts)), y1 = Math.min(rows - 1, Math.ceil((camy + H) / ts));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const tl = map[y * cols + x];
      const sx = Math.round(x * ts - camx), sy = Math.round(y * ts - camy);
      // Base : sol de la region (l'arbre et le rocher poussent sur de l'herbe).
      const ground = tl === TILE.TREE || tl === TILE.ROCK ? TILE.GRASS : tl;
      cx.fillStyle = TILE_COLOR[ground];
      cx.fillRect(sx, sy, ts + 1, ts + 1);
      // Bruit de damier discret pour casser l'aplat.
      if ((x + y) % 2 === 0) { cx.fillStyle = 'rgba(0,0,0,.05)'; cx.fillRect(sx, sy, ts + 1, ts + 1); }

      if (tl === TILE.TREE) {
        cx.fillStyle = '#3c2b1d';
        cx.fillRect(sx + ts * .44, sy + ts * .55, ts * .12, ts * .3);
        cx.fillStyle = '#28502a';
        cx.beginPath(); cx.arc(sx + ts / 2, sy + ts * .46, ts * .34, 0, 7); cx.fill();
        cx.fillStyle = '#356b36';
        cx.beginPath(); cx.arc(sx + ts * .44, sy + ts * .4, ts * .24, 0, 7); cx.fill();
      } else if (tl === TILE.ROCK) {
        cx.fillStyle = '#6a6270';
        cx.beginPath();
        cx.moveTo(sx + ts * .2, sy + ts * .78);
        cx.lineTo(sx + ts * .38, sy + ts * .3);
        cx.lineTo(sx + ts * .62, sy + ts * .26);
        cx.lineTo(sx + ts * .82, sy + ts * .78);
        cx.closePath(); cx.fill();
      } else if (tl === TILE.WATER) {
        cx.fillStyle = 'rgba(255,255,255,.07)';
        const o = Math.sin((t / 600) + x * .7 + y * .5) * 3;
        cx.fillRect(sx + 6, sy + ts * .5 + o, ts - 12, 2);
      }
    }
  }

  // barrieres de niveau
  const lvl = partyLevel();
  for (const n of WORLD.nodes.filter(n => n.type === 'gate')) {
    const open = lvl >= n.reqLevel;
    const sx = n.x * ts - camx, sy = n.y * ts - camy;
    cx.save();
    cx.globalAlpha = open ? .25 : .8;
    cx.strokeStyle = open ? '#7fd6a6' : '#ff7a86';
    cx.lineWidth = 4;
    cx.setLineDash([10, 8]);
    cx.beginPath(); cx.arc(sx + ts / 2, sy + ts / 2, ts * 2.8, 0, 7); cx.stroke();
    cx.restore();
    label(cx, open ? n.name : `${n.name} · niv. ${n.reqLevel}`, sx + ts / 2, sy - 6);
  }

  // points d'interet et joueur, DU PLUS LOIN AU PLUS PROCHE : un batiment fait plusieurs
  // cases de haut, et le joueur qui passe derriere (au nord de sa porte) doit etre cache par
  // lui, pas dessine par-dessus. Chaque element dit ou sont ses PIEDS (`y`, en cases).
  // Les noms sont ecrits apres, tous ensemble : un nom ne doit jamais etre recouvert.
  const items = [], noms = [];
  for (const n of WORLD.nodes) {
    if (n.type === 'gate') continue;
    const sx = n.x * ts - camx, sy = n.y * ts - camy;
    const unites = tailleDe(n);
    // Un grand objet depasse de sa case de tous les cotes : on ne l'ecarte qu'une fois sorti
    // de l'ecran en entier. Les autres gardent la marge d'avant.
    const marge = unites ? unites * WORLD.unite * ts + 40 : 120;
    if (sx < -marge || sy < -120 || sx > W + marge || sy > H + marge) continue;
    // Les pieds d'un batiment sont sur sa porte (le centre de sa case) : le joueur qui se
    // tient devant la porte est devant lui, celui qui la franchit passe derriere.
    items.push({ y: n.y + (unites ? .5 : .92), draw: () => dessinePoint(n, sx, sy, t, unites, noms) });
  }
  const leader = CHAR_BY_ID[save.team.find(Boolean) || 'dog'];
  items.push({ y: w.py + .38, draw: () => {
    const px = w.px * ts - camx, py = w.py * ts - camy;
    cx.save();
    cx.globalAlpha = .35; cx.fillStyle = '#000';
    cx.beginPath(); cx.ellipse(px, py + ts * .38, ts * .3, ts * .11, 0, 0, 7); cx.fill();
    cx.restore();
    const pim = img(leader.sprite);
    const ps = ts * 1.35;
    if (pim && pim.complete && pim.naturalWidth) {
      cx.drawImage(pim, px - ps / 2, py + ts * .4 - ps + Math.sin(t / 220) * 2, ps, ps);
    }
  } });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  for (const l of noms) label(cx, l.text, l.x, l.y);
}

/** La taille d'un point d'interet en unites de personnage (cf. `WORLD.tailles`), ou 0 : il garde son dessin d'avant. */
function tailleDe(n) {
  return n.taille ?? WORLD.tailles[n.type] ?? 0;
}

// La zone VISIBLE d'une image (celle qui n'est pas transparente), en fractions de sa taille.
// La taille d'un batiment se mesure dessus, pas sur le fichier : une image a marges larges
// ferait sinon un batiment plus petit que son voisin, a taille egale. Mesure a 256 px, une
// fois par image.
const zonesVisibles = new Map();
function zoneVisible(im) {
  if (zonesVisibles.has(im)) return zonesVisibles.get(im);
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data;
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (d[(y * N + x) * 4 + 3] <= 20) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  // Image entierement transparente : on la prend en entier plutot que de diviser par zero.
  const z = x1 < 0 ? { x0: 0, y0: 0, x1: 1, y1: 1 } : { x0: x0 / N, y0: y0 / N, x1: (x1 + 1) / N, y1: (y1 + 1) / N };
  zonesVisibles.set(im, z);
  return z;
}

/** Dessine un point d'interet ; son nom est ajoute a `noms`, ecrit plus tard par-dessus tout. */
function dessinePoint(n, sx, sy, t, unites, noms) {
  const ts = WORLD.tile;
  const done = save.world.cleared[n.id];
  const im = img(nodeSprite(n));
  const pret = im && im.complete && im.naturalWidth;

  if (unites && pret) {
    // Un BATIMENT : sa hauteur visible vaut `unites` personnages, sa largeur suit, et le bas
    // du dessin se pose sur le bas de sa case (la porte). Il ne flotte pas.
    const z = zoneVisible(im);
    const sw = (z.x1 - z.x0) * im.naturalWidth, sh = (z.y1 - z.y0) * im.naturalHeight;
    const hh = unites * WORLD.unite * ts, ww = hh * sw / sh;
    const cxp = sx + ts / 2, bas = sy + ts;
    cx.save();
    cx.globalAlpha = .3;
    cx.fillStyle = '#000';
    cx.beginPath(); cx.ellipse(cxp, bas - ts * .08, ww * .42, ts * .22, 0, 0, 7); cx.fill();
    cx.restore();
    cx.drawImage(im, z.x0 * im.naturalWidth, z.y0 * im.naturalHeight, sw, sh, cxp - ww / 2, bas - hh, ww, hh);
    noms.push({ text: n.name + (n.reqLevel ? ` · niv.${n.reqLevel}` : ''), x: cxp, y: bas - hh - 4 });
    return;
  }

  const bob = Math.sin(t / 500 + n.x) * 3;
  cx.save();
  cx.globalAlpha = .3;
  cx.fillStyle = '#000';
  cx.beginPath(); cx.ellipse(sx + ts / 2, sy + ts * .92, ts * .34, ts * .12, 0, 0, 7); cx.fill();
  cx.restore();

  if (pret) {
    cx.save();
    if (done && (n.type === 'chest')) cx.globalAlpha = .4;
    const s = ts * (n.type === 'boss' ? 1.7 : 1.25);
    cx.drawImage(im, sx + ts / 2 - s / 2, sy + ts - s + bob, s, s);
    cx.restore();
  } else {
    cx.fillStyle = '#d8c6f0';
    cx.beginPath(); cx.arc(sx + ts / 2, sy + ts / 2 + bob, ts * .3, 0, 7); cx.fill();
  }
  if (n.type === 'teleport') {
    cx.strokeStyle = '#9ad7ff'; cx.lineWidth = 3;
    cx.beginPath(); cx.arc(sx + ts / 2, sy + ts / 2, ts * .5, 0, 7); cx.stroke();
  }
  noms.push({ text: n.name + (n.reqLevel ? ` · niv.${n.reqLevel}` : ''), x: sx + ts / 2, y: sy - 4 });
}

function label(ctx, text, x, y) {
  ctx.save();
  ctx.font = '600 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = 'rgba(15,12,20,.7)';
  ctx.fillRect(x - w / 2, y - 13, w, 15);
  ctx.fillStyle = '#efe6ff';
  ctx.fillText(text, x, y - 2);
  ctx.restore();
}

// -------------------------------------------------------------- interaction
function interact() {
  if (!near || $('#screen-world').classList.contains('hidden')) return;
  const n = near;
  if (n.type === 'fight' || n.type === 'boss') return doFight(n);
  if (n.type === 'chest') return doChest(n);
  if (n.type === 'shop') return doShop(n);
  if (n.type === 'npc') return doNpc(n);
  if (n.type === 'teleport') return doTeleport(n);
}

function doFight(n) {
  const lvl = partyLevel();
  if (n.reqLevel && lvl < n.reqLevel) {
    toast(`Niveau ${n.reqLevel} requis — tu es niveau ${lvl}. Ameliore un personnage a la Ferme.`);
    return;
  }
  stopWorld();
  openBattle(n, () => {
    startWorld();
    refreshTop();
  });
}

function doChest(n) {
  if (save.world.cleared[n.id]) { toast('Ce coffre est deja vide.'); return; }
  save.world.cleared[n.id] = true;
  gain('A', n.loot.A || 0);
  gain('C', n.loot.C || 0);
  persist();
  toast(`+${n.loot.A} Fanions · +${n.loot.C} Legumes`);
  refreshTop();
}

function doNpc(n) {
  const box = el(`<div>
    <h2>${n.name}</h2>
    <p>${n.dialog || '...'}</p>
  </div>`);
  const b = el('<button class="btn">Fermer</button>');
  b.onclick = closeModal;
  box.appendChild(b);
  modal(box);
}

function doShop(n) {
  const box = el(`<div>
    <h2>${n.name}</h2>
    <p class="muted">Des trouvailles d'explorateur. Payables en Fanions.</p>
    <div class="cardlist" id="shopList"></div>
  </div>`);
  const list = box.querySelector('#shopList');
  for (const r of RELICS) {
    const owned = save.relics.includes(r.id);
    const row = el(`
      <div class="gcard">
        <img class="port" src="${asset(r.sprite)}" alt="">
        <div>
          <div class="nm">${r.name}</div>
          <div class="tx">${r.text}</div>
        </div>
        <button class="btn ${owned ? 'ghost' : ''}" ${owned ? 'disabled' : ''}>${owned ? 'Acquis' : r.price + ' 🎏'}</button>
      </div>`);
    row.querySelector('button').onclick = () => {
      if (!spend('A', r.price)) { toast(`Il te manque ${r.price - save.cur.A} Fanions.`); return; }
      save.relics.push(r.id);
      persist();
      closeModal();
      toast(`${r.name} rejoint ton sac.`);
      refreshTop();
    };
    list.appendChild(row);
  }
  const b = el('<button class="btn ghost">Fermer</button>');
  b.onclick = closeModal;
  box.appendChild(b);
  modal(box);
}

function doTeleport(n) {
  const box = el(`<div>
    <h2>${n.name}</h2>
    <p class="muted">Retour instantane au point de depart.</p>
  </div>`);
  const go = el('<button class="btn">Voyager</button>');
  go.onclick = () => {
    save.world.px = WORLD.spawn.x + 0.5;
    save.world.py = WORLD.spawn.y + 0.5;
    persist();
    closeModal();
  };
  const b = el('<button class="btn ghost">Rester</button>');
  b.onclick = closeModal;
  box.appendChild(go);
  box.appendChild(b);
  modal(box);
}

// Le bandeau du haut est reconstruit par main.js ; on evite un import circulaire.
export let refreshTop = () => {};
export function setRefreshTop(fn) { refreshTop = fn; }
