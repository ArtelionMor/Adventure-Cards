// LA SCENE DE LA BOUTIQUE : la boutique vue en isometrie, dessinee sur un canvas (maquettes mockups/Card Shop). Le plan vient
// du noyau (`state.shop`), les ventes aussi : ici, on ne decide que de la mise en scene. Le doigt deplace la vue, deux doigts
// (ou la molette) zooment. Clients : les personnages Kenney (BOUTIQUE.profils), qui marchent de case en case.
import { BOUTIQUE } from '../config/boutique.js';
import { buyerMultiplier } from '../boutique/noyau/engines/buyers.js';
import { buyerReaction } from '../boutique/noyau/engines/pricing.js';
import { doorX, footprint, isFree } from '../boutique/noyau/engines/shop.js';
import { ctx, ecoute, partie } from '../boutique/partie.js';
import { urlIcone } from './icones.js';
import { asset } from './shell.js';

const R = BOUTIQUE.scene;
const [TW, TH] = R.case;
const hasard = ([a, b]) => a + Math.random() * (b - a);
const parmi = l => l[Math.floor(Math.random() * l.length)];
const cfg = ctx.cfg;
const defDe = type => cfg.shopLayout.furniture.find(f => f.id === type);
const PROFILS = Object.keys(BOUTIQUE.profils);

let canvas = null, c2d = null, largeur = 0, hauteur = 0;
let cam = { x: 0, y: 0, z: R.zoom.depart };
let clients = [], gains = [];
let raf = 0, avant = 0, horloge = 0, prochaineAmbiance = 0, prochainCri = 0, dernierPlan = 0;
let desabonne = null;
let actions = {};
let deco = { actif: false, choisi: null, fantome: null };
let visuelDeCarte = () => null;

// ------------------------------------------------------------------ images
const images = new Map();
function image(chemin) {
  let i = images.get(chemin);
  if (!i) {
    i = new Image();
    i.src = chemin.startsWith('/') ? chemin : asset(chemin);
    images.set(chemin, i);
  }
  return i.complete && i.naturalWidth ? i : null;
}
const pose = (tete, nom) => image(`${BOUTIQUE.dossierPoses}${tete}_${nom}.png`);
const ANGLES = ['SE', 'SW', 'NW', 'NE'];
const imageMeuble = (nom, dir = 0) => image(`${BOUTIQUE.dossierMeubles}${nom}_${ANGLES[dir % 4]}.png`);

// ------------------------------------------------------------------ projection
const versEcran = (x, y) => [(x - y) * TW / 2, (x + y) * TH / 2];
const versGrille = (sx, sy) => {
  const wx = (sx - cam.x) / cam.z, wy = (sy - cam.y) / cam.z;
  return [(wx / (TW / 2) + wy / (TH / 2)) / 2, (wy / (TH / 2) - wx / (TW / 2)) / 2];
};

function borneCamera() {
  const s = partie().shop, marge = 90;
  const gauche = -s.height * TW / 2 * cam.z, droite = s.width * TW / 2 * cam.z;
  const bas = (s.width + s.height) * TH / 2 * cam.z;
  cam.x = Math.min(largeur - gauche - marge, Math.max(marge - droite, cam.x));
  cam.y = Math.min(hauteur + R.hauteurMur * cam.z - marge, Math.max(marge - bas, cam.y));
}

function centre() {
  const s = partie().shop;
  cam.z = R.zoom.depart;
  const [mx, my] = versEcran(s.width / 2, s.height / 2);
  cam.x = largeur / 2 - mx * cam.z;
  cam.y = hauteur / 2 - my * cam.z;
}

// ------------------------------------------------------------------ le plan : ou peut-on marcher
function casesPrises() {
  const s = partie().shop, prises = new Set();
  for (const it of s.items) {
    const def = defDe(it.type);
    if (!def || def.effect === 'tapis') continue;
    const f = footprint(def, it.dir);
    for (let i = 0; i < f.w; i++) for (let j = 0; j < f.h; j++) prises.add(`${it.x + i},${it.y + j}`);
  }
  prises.add(`${R.boite[0]},${R.boite[1]}`);
  return prises;
}

/** Plus court chemin de case en case, en largeur. Rend des centres de case ; [] si rien n'y mene. */
function chemin(de, vers, prises) {
  const s = partie().shop;
  const cle = (x, y) => `${x},${y}`;
  const viens = new Map([[cle(de[0], de[1]), null]]);
  const file = [de];
  while (file.length) {
    const [x, y] = file.shift();
    if (x === vers[0] && y === vers[1]) {
      const pas = [];
      for (let k = cle(x, y); k; k = viens.get(k)) { const [a, b] = k.split(',').map(Number); pas.unshift([a + 0.5, b + 0.5]); }
      return pas;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = cle(nx, ny);
      const dehors = nx < 0 || ny < 0 || nx >= s.width || ny >= s.height;
      if (dehors || viens.has(k) || (prises.has(k) && !(nx === vers[0] && ny === vers[1]))) continue;
      viens.set(k, cle(x, y));
      file.push([nx, ny]);
    }
  }
  return [];
}

function caseVoisine(it, prises, deja = []) {
  const def = defDe(it.type), f = footprint(def, it.dir);
  const autour = [];
  for (let i = 0; i < f.w; i++) autour.push([it.x + i, it.y + f.h], [it.x + i, it.y - 1]);
  for (let j = 0; j < f.h; j++) autour.push([it.x + f.w, it.y + j], [it.x - 1, it.y + j]);
  const s = partie().shop;
  return autour.find(([x, y]) => x >= 0 && y >= 0 && x < s.width && y < s.height && !prises.has(`${x},${y}`) && !deja.some(d => d && d[0] === x && d[1] === y)) || null;
}

// ------------------------------------------------------------------ les clients
function nouveauClient(profil, etapes, extra = {}) {
  const s = partie().shop;
  const c = { x: doorX(s) + 0.5, y: s.height + 0.9, profil, tete: parmi(BOUTIQUE.profils[profil].tetes), etapes, sens: 1, phase: Math.random() * 8, poseFixe: null, bulle: null, carte: null, marche: false, ...extra };
  clients.push(c);
  return c;
}

const entree = () => [doorX(partie().shop), partie().shop.height - 1];
const marcheVers = (vers, prises, depuis = entree()) => chemin(depuis, vers, prises).map(p => ({ aller: p }));
const finDeVisite = () => ({ partir: true });

function sortie(c, prises) {
  const s = partie().shop;
  const ici = [Math.max(0, Math.min(s.width - 1, Math.floor(c.x))), Math.max(0, Math.min(s.height - 1, Math.floor(c.y)))];
  return [...marcheVers(entree(), prises, ici), { aller: [doorX(s) + 0.5, s.height + 0.9] }];
}

const itemDe = id => partie().shop.items.find(i => i.id === id);

function acheteurs(prises) {
  const S = partie();
  for (const l of S.showcase) {
    const reste = (l.sellAtMs - S.nowMs) / 1000;
    if (reste > R.arriveeAvantVenteS || clients.some(c => c.vente === l.instanceId)) continue;
    const it = itemDe(l.displayId);
    const v = it && caseVoisine(it, prises);
    if (!v) continue;
    nouveauClient(l.buyer || parmi(PROFILS), [...marcheVers(v, prises), { avis: l.instanceId }, { attendVente: true }, finDeVisite()], { vente: l.instanceId });
  }
}

// Un visiteur va vers la carte qui correspond le mieux a son plan de jeu.
function vitrinePour(profil) {
  const S = partie();
  const buyer = cfg.buyers.profiles.find(b => b.id === profil);
  let meilleur = null, score = -Infinity;
  for (const l of S.showcase) {
    const card = ctx.index.cardById.get(S.instances[l.instanceId]?.cardId);
    const v = card ? buyerMultiplier(buyer, card, S, ctx) + Math.random() * 0.05 : -1;
    if (v > score) { score = v; meilleur = l; }
  }
  return meilleur;
}

function ambiance(t, prises) {
  if (t < prochaineAmbiance || clients.length >= R.clientsMax) return;
  prochaineAmbiance = t + hasard(R.ambianceS) * 1000;
  const S = partie();
  const profil = parmi(PROFILS);
  if (S.bulkBox.length && Math.random() < 0.3) {
    const pas = marcheVers([R.boite[0] - 1, R.boite[1]], prises);
    if (pas.length) nouveauClient(profil, [...pas, { pause: hasard(R.fouilleBulkS), pose: 'interact' }, finDeVisite()]);
    return;
  }
  const l = vitrinePour(profil);
  const it = l && itemDe(l.displayId);
  const v = it && caseVoisine(it, prises, clients.map(c => [Math.floor(c.x), Math.floor(c.y)]));
  if (v) {
    nouveauClient(profil, [...marcheVers(v, prises), { avis: l.instanceId }, { pause: hasard(R.regardeS), pose: 'think' }, finDeVisite()]);
    return;
  }
  // Rien en vitrine : il fait un tour et repart.
  const s = S.shop;
  const x = Math.floor(Math.random() * s.width), y = Math.floor(Math.random() * s.height);
  if (!prises.has(`${x},${y}`)) nouveauClient(profil, [...marcheVers([x, y], prises), { pause: 1.5, pose: 'think' }, finDeVisite()]);
}

// Les tables : deux joueurs par table, qui jouent un moment, puis repartent.
function tables(prises) {
  for (const it of partie().shop.items) {
    if (defDe(it.type)?.effect !== 'table') continue;
    for (const siege of [0, 1]) {
      const cle = `${it.id}:${siege}`;
      if (clients.some(c => c.siege === cle) || clients.length >= R.clientsMax) continue;
      const pris = clients.filter(c => String(c.siege).startsWith(`${it.id}:`)).map(c => c.placeSiege);
      const v = caseVoisine(it, prises, pris);
      if (!v) continue;
      const pas = marcheVers(v, prises);
      if (pas.length) nouveauClient(parmi(PROFILS), [...pas, { pause: hasard(R.tableS), jeu: it.id }, finDeVisite()], { siege: cle, placeSiege: v });
    }
  }
}

// La foule des encheres : elle grossit avec le nombre d'encheres et se presse sur les dernieres minutes.
function foule(t, prises) {
  const S = partie();
  const z = cfg.shopLayout.auctionZone;
  const finale = S.auctions.some(a => a.stepsDone / a.stepsTotal >= 0.9);
  const voulus = S.auctions.length ? Math.min(R.foule.max, R.foule.base + R.foule.parEnchere * (S.auctions.length - 1) + (finale ? R.foule.finale : 0)) : 0;
  const la = clients.filter(c => c.foule);
  if (la.length < voulus && clients.length < R.clientsMax + R.foule.max) {
    const libres = [];
    for (let j = 1; j < z.h; j++) {
      for (let i = 0; i < z.w; i++) {
        if (!prises.has(`${z.x + i},${z.y + j}`) && !la.some(c => c.placeFoule[0] === z.x + i && c.placeFoule[1] === z.y + j)) libres.push([z.x + i, z.y + j]);
      }
    }
    if (libres.length) {
      const v = parmi(libres);
      const pas = marcheVers(v, prises);
      if (pas.length) nouveauClient(parmi(PROFILS), [...pas, { foule: true }], { foule: true, placeFoule: v });
    }
  }
  if (!S.auctions.length) for (const c of la) { c.foule = false; c.etapes = [finDeVisite()]; }
}

// Quelqu'un crie une enchere : le prix en cours.
function criEnchere(t) {
  const S = partie();
  if (!S.auctions.length || t < prochainCri) return;
  prochainCri = t + hasard(R.criS) * 1000;
  const crieurs = clients.filter(c => c.foule && c.etapes[0]?.foule);
  if (!crieurs.length) return;
  const c = parmi(crieurs), a = parmi(S.auctions);
  c.bulle = { enchere: String(Math.round(a.price)), fin: t + 1500 };
  c.criJusqua = t + 1000;
}

function dit(c, inst, l, t) {
  const buyer = cfg.buyers.profiles.find(b => b.id === c.profil);
  if (buyer) c.bulle = { reaction: BOUTIQUE.reactions[buyerReaction(buyer, inst, l.price, partie(), ctx)], fin: t + R.avisS * 1000 };
}

// ------------------------------------------------------------------ le pas du monde
function avanceClients(dt, t, prises) {
  for (const c of [...clients]) {
    const e = c.etapes[0];
    c.marche = false;
    if (!e) { clients = clients.filter(x => x !== c); continue; }
    if (e.aller) {
      const dx = e.aller[0] - c.x, dy = e.aller[1] - c.y, d = Math.hypot(dx, dy), pas = R.vitesse * dt;
      if (d <= pas) { c.x = e.aller[0]; c.y = e.aller[1]; c.etapes.shift(); }
      else {
        c.x += dx / d * pas; c.y += dy / d * pas; c.marche = true;
        if (Math.abs(dx - dy) > 0.02) c.sens = dx - dy < 0 ? -1 : 1;
      }
    } else if (e.partir) {
      c.etapes = sortie(c, prises);
    } else if (e.avis !== undefined) {
      const S = partie();
      const l = S.showcase.find(x => x.instanceId === e.avis);
      if (l && S.instances[e.avis]) dit(c, S.instances[e.avis], l, t);
      c.etapes.shift();
    } else if (e.attendVente) {
      c.poseFixe = 'think';
      if (!partie().showcase.some(l => l.instanceId === c.vente)) { c.poseFixe = null; c.etapes.shift(); }
    } else if (e.pause !== undefined) {
      c.poseFixe = e.jeu ? (Math.sin(t / 1500 + c.phase) > 0 ? 'talk' : 'think') : e.pose || null;
      if ((e.pause -= dt) <= 0) { c.poseFixe = null; c.etapes.shift(); }
    }
    if (c.bulle && t > c.bulle.fin) c.bulle = null;
  }
  gains = gains.filter(g => t < g.fin);
}

function nomDePose(c, t) {
  if (c.marche) return `walk${Math.floor(t / 80 + c.phase) % 8}`;
  if (c.foule && c.etapes[0]?.foule) return t < (c.criJusqua || 0) ? `cheer${Math.floor(t / 200) % 2}` : Math.sin(t / 900 + c.phase) > 0.4 ? 'hold' : 'idle';
  if (c.carte) return 'hold';
  return c.poseFixe || 'idle';
}

// ------------------------------------------------------------------ le dessin
function losange(x, y, w, h) {
  const a = versEcran(x, y), b = versEcran(x + w, y), d = versEcran(x + w, y + h), e = versEcran(x, y + h);
  c2d.beginPath(); c2d.moveTo(...a); c2d.lineTo(...b); c2d.lineTo(...d); c2d.lineTo(...e); c2d.closePath();
}

function dessineSol(s) {
  const sol = BOUTIQUE.sols[s.floor] || BOUTIQUE.sols[0];
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      losange(x, y, 1.01, 1.01);
      c2d.fillStyle = sol[(x + y) % 2];
      c2d.fill();
    }
  }
  const z = cfg.shopLayout.auctionZone;
  for (let y = z.y; y < z.y + z.h; y++) {
    for (let x = z.x; x < z.x + z.w; x++) {
      losange(x, y, 1.01, 1.01);
      c2d.fillStyle = BOUTIQUE.tapisEncheres[(x + y) % 2];
      c2d.fill();
    }
  }
  // Le bord avant de la dalle, et le seuil de la porte.
  const [ax, ay] = versEcran(0, s.height), [bx, by] = versEcran(s.width, s.height), [cx, cy] = versEcran(s.width, 0);
  c2d.fillStyle = '#00000055';
  c2d.beginPath(); c2d.moveTo(ax, ay); c2d.lineTo(bx, by); c2d.lineTo(bx, by + 14); c2d.lineTo(ax, ay + 14); c2d.fill();
  c2d.fillStyle = '#00000033';
  c2d.beginPath(); c2d.moveTo(bx, by); c2d.lineTo(cx, cy); c2d.lineTo(cx, cy + 14); c2d.lineTo(bx, by + 14); c2d.fill();
  losange(doorX(s), s.height, 1, 0.9);
  c2d.fillStyle = (BOUTIQUE.murs[s.wall] || BOUTIQUE.murs[0])[1];
  c2d.fill();
}

function pan(ax, ay, bx, by, h, couleur) {
  c2d.fillStyle = couleur;
  c2d.beginPath(); c2d.moveTo(ax, ay); c2d.lineTo(bx, by); c2d.lineTo(bx, by - h); c2d.lineTo(ax, ay - h); c2d.fill();
}

function dessineMurs(s) {
  const [mur, plinthe] = BOUTIQUE.murs[s.wall] || BOUTIQUE.murs[0];
  const H = R.hauteurMur;
  const [ox, oy] = versEcran(0, 0), [rx, ry] = versEcran(s.width, 0), [lx, ly] = versEcran(0, s.height);
  pan(ox, oy, rx, ry, H, mur);
  pan(lx, ly, ox, oy, H, mur);
  pan(lx, ly, ox, oy, H, '#ffffff14');
  // Le liseré des maquettes, en haut et en bas des murs.
  c2d.strokeStyle = plinthe; c2d.lineWidth = 6; c2d.lineJoin = 'round';
  c2d.beginPath(); c2d.moveTo(lx, ly - H); c2d.lineTo(ox, oy - H); c2d.lineTo(rx, ry - H); c2d.stroke();
  c2d.lineWidth = 3;
  c2d.beginPath(); c2d.moveTo(lx, ly); c2d.lineTo(ox, oy); c2d.lineTo(rx, ry); c2d.stroke();
  // Des fenetres regulieres sur le mur du fond.
  for (let x = 5; x < s.width - 0.5; x += 3) {
    const [a, b] = versEcran(x, 0), [d, e] = versEcran(x + 1.6, 0);
    c2d.fillStyle = '#bfe6f7';
    c2d.beginPath(); c2d.moveTo(a, b - 30); c2d.lineTo(d, e - 30); c2d.lineTo(d, e - 92); c2d.lineTo(a, b - 92); c2d.closePath(); c2d.fill();
    c2d.strokeStyle = plinthe; c2d.lineWidth = 3; c2d.stroke();
  }
}

function dessineMeuble(it, alpha = 1) {
  const def = defDe(it.type), v = BOUTIQUE.meubles[it.type];
  if (!def || !v) return;
  const f = footprint(def, it.dir);
  const [cx, cy] = versEcran(it.x + f.w / 2, it.y + f.h / 2);
  const im = imageMeuble(v.image, it.dir);
  if (!im) return;
  const w = im.naturalWidth * v.echelle, h = im.naturalHeight * v.echelle;
  c2d.save();
  c2d.globalAlpha = alpha;
  if (v.plat) c2d.drawImage(im, cx - w / 2, cy - h / 2, w, h);
  else c2d.drawImage(im, cx - w / 2, cy + TH * 0.22 - h, w, h);
  c2d.restore();
}

function dessineCartePosee(l, it) {
  const S = partie(), inst = S.instances[l.instanceId], v = BOUTIQUE.meubles[it.type];
  if (!inst) return;
  const [cx, cy] = versEcran(it.x + 0.5, it.y + 0.5);
  const T = R.tailleCarte, x = cx - T / 2, y = cy - v.dessus - T + 18;
  const card = ctx.index.cardById.get(inst.cardId);
  c2d.fillStyle = '#fff8e8';
  c2d.strokeStyle = BOUTIQUE.couleursRaretes[card.rarity] || '#999';
  c2d.lineWidth = 3;
  c2d.beginPath(); c2d.roundRect(x, y, T, T, 6); c2d.fill(); c2d.stroke();
  const im = visuelDeCarte(inst.cardId);
  if (im) c2d.drawImage(im, x + 2, y + 2, T - 4, T - 4);
  if (inst.finish === 'foil') {
    c2d.fillStyle = `hsla(${(horloge / 12) % 360}, 90%, 70%, .35)`;
    c2d.beginPath(); c2d.roundRect(x, y, T, T, 6); c2d.fill();
  }
}

function dessineClient(c, t) {
  const [sx, sy] = versEcran(c.x, c.y);
  c2d.fillStyle = '#00000030';
  c2d.beginPath(); c2d.ellipse(sx, sy, 17, 8, 0, 0, Math.PI * 2); c2d.fill();
  const im = pose(c.tete, nomDePose(c, t));
  if (!im) return;
  const w = im.naturalWidth * R.echelleClient, h = im.naturalHeight * R.echelleClient;
  c2d.save();
  c2d.translate(sx, sy + 4);
  c2d.scale(c.sens, 1);
  c2d.drawImage(im, -w / 2, -h, w, h);
  c2d.restore();
  if (c.carte) {
    const vis = visuelDeCarte(c.carte), x = sx - 12 + c.sens * 14;
    c2d.fillStyle = '#fff8e8'; c2d.strokeStyle = '#4a342a'; c2d.lineWidth = 2;
    c2d.beginPath(); c2d.roundRect(x, sy - 46, 24, 24, 4); c2d.fill(); c2d.stroke();
    if (vis) c2d.drawImage(vis, x + 1, sy - 45, 22, 22);
  }
  const p = BOUTIQUE.profils[c.profil];
  c2d.fillStyle = p.couleur;
  c2d.beginPath(); c2d.arc(sx + 17, sy - h + 12, 7, 0, Math.PI * 2); c2d.fill();
  c2d.fillStyle = '#fff'; c2d.font = '800 9px sans-serif'; c2d.textAlign = 'center'; c2d.textBaseline = 'middle';
  c2d.fillText(p.lettre, sx + 17, sy - h + 12.5);
}

function bulle(x, y, l, h, fond) {
  c2d.fillStyle = fond; c2d.strokeStyle = '#2b1c1f'; c2d.lineWidth = 3;
  c2d.beginPath();
  c2d.roundRect(x - l / 2, y - h, l, h, 9);
  c2d.fill(); c2d.stroke();
  c2d.beginPath(); c2d.moveTo(x - 7, y - 1); c2d.lineTo(x, y + 9); c2d.lineTo(x + 7, y - 1); c2d.fill(); c2d.stroke();
  c2d.fillRect(x - 6, y - 4, 12, 4);
}

function bulleDePrix(l, it) {
  const v = BOUTIQUE.meubles[it.type];
  const [cx, cy] = versEcran(it.x + 0.5, it.y + 0.5);
  const y = cy - v.dessus - R.tailleCarte + 4;
  const texte = String(Math.round(l.price));
  c2d.font = '800 15px sans-serif';
  const w = c2d.measureText(texte).width + 34;
  bulle(cx, y, w, 26, '#ffffff');
  c2d.fillStyle = '#2b1c1f'; c2d.textAlign = 'left'; c2d.textBaseline = 'middle';
  c2d.fillText(texte, cx - w / 2 + 8, y - 13);
  const piece = image(urlIcone('Coin'));
  if (piece) c2d.drawImage(piece, cx + w / 2 - 22, y - 21, 16, 16);
}

function bullePlus(it) {
  const v = BOUTIQUE.meubles[it.type];
  const [cx, cy] = versEcran(it.x + 0.5, it.y + 0.5);
  const y = cy - v.dessus + 2;
  bulle(cx, y, 34, 32, '#e7f53a');
  c2d.fillStyle = '#2b1c1f'; c2d.font = '900 24px sans-serif'; c2d.textAlign = 'center'; c2d.textBaseline = 'middle';
  c2d.fillText('+', cx, y - 15);
}

function bulleClient(c) {
  const [sx, sy] = versEcran(c.x, c.y);
  const y = sy - 104;
  if (c.bulle.enchere) {
    c2d.font = '800 14px sans-serif';
    bulle(sx, y, c2d.measureText(c.bulle.enchere).width + 22, 26, '#ffd76a');
    c2d.fillStyle = '#2b1c1f'; c2d.textAlign = 'center'; c2d.textBaseline = 'middle';
    c2d.fillText(c.bulle.enchere, sx, y - 13);
    return;
  }
  const r = c.bulle.reaction;
  c2d.font = '800 11px sans-serif';
  bulle(sx, y, Math.max(44, c2d.measureText(r.texte).width + 14), 50, r.fond);
  c2d.textAlign = 'center'; c2d.textBaseline = 'middle';
  c2d.font = '24px sans-serif'; c2d.fillStyle = '#000';
  c2d.fillText(r.signe, sx, y - 32);
  c2d.font = '800 11px sans-serif'; c2d.fillStyle = '#fff';
  c2d.fillText(r.texte, sx, y - 10);
}

// Le tableau des encheres, sur le mur du fond : la carte en vente, son prix qui monte, le temps qui reste.
function dessineTableau(t) {
  const S = partie(), z = cfg.shopLayout.auctionZone;
  const [cx, cy] = versEcran(z.x + z.w / 2, 0);
  const W = 150, H = 92, x = cx - W / 2, y = cy - R.hauteurMur + 2;
  c2d.fillStyle = '#5e3b28'; c2d.strokeStyle = '#2b1c1f'; c2d.lineWidth = 4;
  c2d.beginPath(); c2d.roundRect(x, y, W, H, 8); c2d.fill(); c2d.stroke();
  c2d.fillStyle = '#ffd76a'; c2d.font = '800 12px sans-serif'; c2d.textAlign = 'center'; c2d.textBaseline = 'middle';
  c2d.fillText('ENCHÈRES', cx, y + 13);
  const a = S.auctions.length ? S.auctions[Math.floor(t / 4000) % S.auctions.length] : null;
  if (!a) {
    c2d.fillStyle = '#e8d5b5'; c2d.font = '700 10px sans-serif';
    c2d.fillText('Aucune vente en cours', cx, y + 52);
    return;
  }
  const inst = a.item.kind === 'card' ? S.instances[a.item.instanceId] : null;
  const im = inst && visuelDeCarte(inst.cardId);
  c2d.fillStyle = '#fff8e8';
  c2d.beginPath(); c2d.roundRect(x + 9, y + 25, 56, 56, 6); c2d.fill();
  if (im) c2d.drawImage(im, x + 11, y + 27, 52, 52);
  c2d.fillStyle = '#fff'; c2d.font = '800 19px sans-serif'; c2d.textAlign = 'left';
  c2d.fillText(String(Math.round(a.price)), x + 72, y + 44);
  c2d.fillStyle = '#e8d5b5'; c2d.font = '700 10px sans-serif';
  const reste = (a.stepsTotal - a.stepsDone) * cfg.auction.stepMinutes;
  c2d.fillText(reste >= 60 ? `${Math.floor(reste / 60)} h ${String(reste % 60).padStart(2, '0')}` : `${reste} min`, x + 72, y + 66);
}

function dessineBoite(S) {
  const im = imageMeuble('cardboardBoxOpen', 0);
  const [cx, cy] = versEcran(R.boite[0] + 0.5, R.boite[1] + 0.5);
  if (im) c2d.drawImage(im, cx - im.naturalWidth * 0.45, cy + 10 - im.naturalHeight * 0.9, im.naturalWidth * 0.9, im.naturalHeight * 0.9);
  c2d.fillStyle = '#fff'; c2d.font = '800 11px sans-serif'; c2d.textAlign = 'center'; c2d.textBaseline = 'middle';
  c2d.fillText(`Bulk ${S.bulkBox.length}`, cx, cy + 18);
}

function dessineDeco() {
  const s = partie().shop;
  c2d.strokeStyle = '#ffffff40'; c2d.lineWidth = 1;
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) { losange(x, y, 1, 1); c2d.stroke(); }
  const it = deco.choisi !== null ? itemDe(deco.choisi) : null;
  if (!it) return;
  const p = deco.fantome || it, f = footprint(defDe(it.type), p.dir);
  const libre = isFree(s, p.x, p.y, f.w, f.h, cfg, it.id);
  losange(p.x, p.y, f.w, f.h);
  c2d.fillStyle = libre ? '#39d36a70' : '#e8352e70'; c2d.fill();
  c2d.strokeStyle = libre ? '#39d36a' : '#e8352e'; c2d.lineWidth = 3; c2d.stroke();
}

function dessine(t) {
  const S = partie(), s = S.shop;
  c2d.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  c2d.fillStyle = BOUTIQUE.fond;
  c2d.fillRect(0, 0, largeur, hauteur);
  c2d.setTransform(cam.z * devicePixelRatio, 0, 0, cam.z * devicePixelRatio, cam.x * devicePixelRatio, cam.y * devicePixelRatio);
  dessineSol(s);
  dessineMurs(s);
  dessineTableau(t);
  if (deco.actif) dessineDeco();
  for (const it of s.items) if (defDe(it.type)?.effect === 'tapis') dessineMeuble(it);

  // Du plus loin au plus proche : les pieds de chacun disent qui passe devant.
  const scene = [];
  for (const it of s.items) {
    if (defDe(it.type)?.effect === 'tapis') continue;
    const montre = deco.fantome && deco.choisi === it.id ? { ...it, ...deco.fantome } : it;
    scene.push({ p: montre.x + montre.y + 1, f: () => {
      dessineMeuble(montre, deco.choisi === it.id ? 0.8 : 1);
      const l = S.showcase.find(x => x.displayId === it.id);
      if (l) dessineCartePosee(l, montre);
    } });
  }
  scene.push({ p: R.boite[0] + R.boite[1] + 1, f: () => dessineBoite(S) });
  for (const c of clients) scene.push({ p: c.x + c.y, f: () => dessineClient(c, t) });
  scene.sort((a, b) => a.p - b.p);
  for (const e of scene) e.f();

  // Les bulles passent par-dessus tout.
  for (const it of s.items) {
    if (defDe(it.type)?.effect !== 'vitrine') continue;
    const l = S.showcase.find(x => x.displayId === it.id);
    if (l) bulleDePrix(l, it);
    else if (!deco.actif) bullePlus(it);
  }
  for (const c of clients) if (c.bulle) bulleClient(c);
  for (const g of gains) {
    const a = 1 - (g.fin - t) / 1400;
    const [gx, gy] = versEcran(g.x, g.y);
    c2d.globalAlpha = 1 - a * a;
    c2d.font = '900 19px sans-serif'; c2d.textAlign = 'center'; c2d.textBaseline = 'middle';
    c2d.lineWidth = 4; c2d.strokeStyle = '#2b1c1f'; c2d.fillStyle = '#ffe14d';
    c2d.strokeText(`+${g.n}`, gx, gy - 60 - a * 46);
    c2d.fillText(`+${g.n}`, gx, gy - 60 - a * 46);
    c2d.globalAlpha = 1;
  }
}

function mesure() {
  const r = canvas.getBoundingClientRect();
  if (!r.width || (r.width === largeur && r.height === hauteur)) return;
  const premiere = !largeur;
  largeur = r.width; hauteur = r.height;
  canvas.width = Math.round(largeur * devicePixelRatio);
  canvas.height = Math.round(hauteur * devicePixelRatio);
  if (premiere) centre();
  borneCamera();
}

function boucle(t) {
  raf = requestAnimationFrame(boucle);
  const dt = Math.min(0.1, (t - avant) / 1000);
  avant = t;
  horloge = t;
  mesure();
  if (!largeur) return;
  const prises = casesPrises();
  if (t - dernierPlan > 1000) {
    dernierPlan = t;
    acheteurs(prises);
    tables(prises);
    foule(t, prises);
  }
  ambiance(t, prises);
  criEnchere(t);
  avanceClients(dt, t, prises);
  dessine(t);
}

function surEvenement(e) {
  if (e.t !== 'sale') return;
  const t = horloge;
  if (e.channel === 'showcase') {
    // Le noyau annonce la vente avant de retirer la carte : l'acheteur repart ensuite, la carte a la main.
    setTimeout(() => {
      const c = clients.find(x => x.vente && !x.carte && !partie().showcase.some(l => l.instanceId === x.vente));
      if (c) { c.carte = e.cardId; gains.push({ x: c.x, y: c.y, n: Math.round(e.price), fin: t + 1400 }); }
    }, 0);
  } else if (e.channel === 'auction') {
    const z = cfg.shopLayout.auctionZone;
    gains.push({ x: z.x + z.w / 2, y: 1, n: Math.round(e.price), fin: t + 1400 });
    for (const c of clients) if (c.foule) c.criJusqua = t + 1400;
  } else gains.push({ x: R.boite[0] + 0.5, y: R.boite[1] + 0.5, n: Math.round(e.price), fin: t + 1400 });
}

// ------------------------------------------------------------------ le doigt
const doigts = new Map();
let geste = null;

function surCase(sx, sy) {
  const s = partie().shop;
  // Un meuble depasse de sa case vers le haut : on regarde aussi un peu sous le doigt.
  for (const dy of [0, 26, 52]) {
    const [cx, cy] = versGrille(sx, sy + dy * cam.z);
    const x = Math.floor(cx), y = Math.floor(cy);
    for (const it of s.items) {
      const f = footprint(defDe(it.type), it.dir);
      if (x >= it.x && x < it.x + f.w && y >= it.y && y < it.y + f.h) return it;
    }
  }
  return null;
}

function touche(sx, sy) {
  const [fx, fy] = versGrille(sx, sy);
  const it = surCase(sx, sy);
  if (deco.actif) {
    deco.choisi = it ? it.id : null;
    deco.fantome = null;
    actions.choix?.(it);
    return;
  }
  if (it && defDe(it.type)?.effect === 'vitrine') {
    actions.vitrine?.(partie().showcase.find(l => l.displayId === it.id) || null);
    return;
  }
  if (Math.floor(fx) === R.boite[0] && Math.floor(fy) === R.boite[1]) { actions.bulk?.(); return; }
  const z = cfg.shopLayout.auctionZone;
  const [cx, cy] = versEcran(z.x + z.w / 2, 0);
  const wx = (sx - cam.x) / cam.z, wy = (sy - cam.y) / cam.z;
  const surTableau = Math.abs(wx - cx) < 80 && wy > cy - R.hauteurMur - 4 && wy < cy - R.hauteurMur + 100;
  if (surTableau || (fx >= z.x && fx < z.x + z.w && fy >= z.y && fy < z.y + z.h)) actions.encheres?.();
}

function debut(e) {
  try { canvas.setPointerCapture(e.pointerId); } catch { /* un doigt deja parti */ }
  doigts.set(e.pointerId, [e.offsetX, e.offsetY]);
  if (doigts.size === 2) {
    const [a, b] = [...doigts.values()];
    geste = { type: 'pince', d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z };
    return;
  }
  // En mode Decorer, on attrape n'importe quel meuble directement : il devient le meuble choisi.
  const it = deco.actif ? surCase(e.offsetX, e.offsetY) : null;
  if (it && it.id !== deco.choisi) { deco.choisi = it.id; deco.fantome = null; actions.choix?.(it); }
  geste = { type: it ? 'meuble' : 'vue', x: e.offsetX, y: e.offsetY, cx: cam.x, cy: cam.y, bouge: false };
}

function zoomVers(sx, sy, z) {
  const nz = Math.min(R.zoom.max, Math.max(R.zoom.min, z));
  const wx = (sx - cam.x) / cam.z, wy = (sy - cam.y) / cam.z;
  cam.z = nz;
  cam.x = sx - wx * nz;
  cam.y = sy - wy * nz;
  borneCamera();
}

function bouge(e) {
  if (!doigts.has(e.pointerId) || !geste) return;
  doigts.set(e.pointerId, [e.offsetX, e.offsetY]);
  if (geste.type === 'pince') {
    if (doigts.size < 2) return;
    const [a, b] = [...doigts.values()];
    zoomVers((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, geste.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / geste.d);
    return;
  }
  const dx = e.offsetX - geste.x, dy = e.offsetY - geste.y;
  if (Math.hypot(dx, dy) > 8) geste.bouge = true;
  if (!geste.bouge) return;
  if (geste.type === 'meuble') {
    const it = itemDe(deco.choisi);
    const [fx, fy] = versGrille(e.offsetX, e.offsetY);
    deco.fantome = { x: Math.floor(fx), y: Math.floor(fy), dir: it.dir };
  } else {
    cam.x = geste.cx + dx;
    cam.y = geste.cy + dy;
    borneCamera();
  }
}

function fin(e) {
  doigts.delete(e.pointerId);
  if (!geste) return;
  if (geste.type === 'meuble' && geste.bouge && deco.fantome) {
    actions.deplace?.(deco.choisi, deco.fantome.x, deco.fantome.y, deco.fantome.dir);
    deco.fantome = null;
  } else if (geste.type !== 'pince' && !geste.bouge) touche(e.offsetX, e.offsetY);
  if (!doigts.size) geste = null;
}

const molette = e => { e.preventDefault(); zoomVers(e.offsetX, e.offsetY, cam.z * (e.deltaY < 0 ? 1.1 : 0.9)); };

// ------------------------------------------------------------------ depuis l'ecran
export function lanceScene(noeud, { visuelCarte, ...gestes }) {
  arreteScene();
  canvas = noeud;
  c2d = canvas.getContext('2d');
  largeur = hauteur = 0;
  actions = gestes;
  visuelDeCarte = id => { const u = visuelCarte(id); return u ? image(u) : null; };
  avant = performance.now();
  prochaineAmbiance = avant + 600;
  desabonne = ecoute(surEvenement);
  canvas.addEventListener('pointerdown', debut);
  canvas.addEventListener('pointermove', bouge);
  canvas.addEventListener('pointerup', fin);
  canvas.addEventListener('pointercancel', fin);
  canvas.addEventListener('wheel', molette, { passive: false });
  raf = requestAnimationFrame(boucle);
}

export function arreteScene() {
  cancelAnimationFrame(raf);
  raf = 0;
  desabonne?.();
  desabonne = null;
  clients = [];
  gains = [];
  doigts.clear();
  geste = null;
  canvas = null;
}

// Le panneau vient de changer la hauteur de la scene : on recadre au prochain dessin, une fois la mise en page refaite.
const recadre = f => requestAnimationFrame(() => { if (canvas) { mesure(); f(); } });

export function modeDeco(actif) {
  deco = { actif, choisi: null, fantome: null };
  if (actif) recadre(centre);
}

/** Choisit un meuble et l'amene au milieu de la vue : un meuble qu'on vient d'acheter ne doit pas tomber sous le panneau. */
export function choisisMeuble(id) {
  deco.choisi = id;
  deco.fantome = null;
  recadre(() => {
    const it = itemDe(id);
    if (!it) return;
    const [wx, wy] = versEcran(it.x + .5, it.y + .5);
    cam.x = largeur / 2 - wx * cam.z;
    cam.y = hauteur / 2 - wy * cam.z;
    borneCamera();
  });
}

export const clientsDeLaScene = () => clients;
export const camera = () => cam;
