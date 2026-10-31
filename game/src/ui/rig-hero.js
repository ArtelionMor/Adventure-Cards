// LES PERSONNAGES ANIMES du combat (ESSAI, 27 oct. 2026) : quand l'image d'un portrait de heros ou d'une unite du plateau a un rig
// (`game/data/rigs/<nom du png>/`), son <img> est remplace par un canvas WebGL qui joue `idle` en boucle, et `taking_damage` quand
// ses PV baissent. Sans rig, sans clip `idle` ou sans WebGL, l'image reste. Reglages : `BALANCE.ui.rigsHeros` / `rigsUnites`.
//
// Le png -> le dossier : son nom sans accent, en minuscules, avec des tirets (« Hero Cat 1.png » -> `hero-cat-1`) ; un nom deja pris
// par un autre deck est prefixe du dossier du deck (`scripts/rig-squelettes-types.mjs`) : on essaie les deux, et le dossier doit
// citer ce png comme origine (`source.origine`).
import { BALANCE } from '../config/balance.js';
import { chargeRig, creeAnimateur } from '../rig/joueur.js';
import { creeRendu } from '../rig/rendu-webgl.js';

const slug = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const candidats = sprite => {
  const p = String(sprite || '').replace(/\.png$/i, '').split('/');
  const nom = p.pop(), deck = p.pop();
  return [...new Set([slug(nom), slug((deck || '') + ' ' + nom)])].filter(Boolean);
};

// Une meme illustration rangee dans plusieurs dossiers (le deck complet de chaque adversaire) n'a de rig que dans UNE copie :
// `game/data/rigs-alias.json` (ecrit par `scripts/rig-alias.mjs`) renvoie les autres chemins vers lui.
let alias;
const aliasDe = () => alias || (alias = fetch('/game/data/rigs-alias.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})));

const rigs = new Map();   // sprite -> Promise<rig | null> (un personnage se charge une fois pour tous ses portraits)
export function rigDe(sprite) {
  if (!rigs.has(sprite)) {
    rigs.set(sprite, (async () => {
      const renvoi = (await aliasDe())[sprite];
      for (const id of renvoi ? [renvoi] : candidats(sprite)) {
        try {
          const r = await chargeRig(`/game/data/rigs/${id}/`);
          const origine = r.json.source?.origine;
          if (r.clips.idle && (renvoi || !origine || origine === sprite)) return r;
        } catch { /* pas de dossier de ce nom */ }
      }
      return null;
    })());
  }
  return rigs.get(sprite);
}

// UN SEUL contexte WebGL pour tous les personnages (les navigateurs n'en gardent qu'une quinzaine : au-dela, le plus ancien est perdu) :
// chacun est dessine dans ce canvas (COTE px), puis recopie dans le canvas 2D de son noeud. Les textures sont partagees aussi.
const COTE = 256;
let partage;
const rendu = () => partage === undefined ? (partage = creeRendu(Object.assign(document.createElement('canvas'), { width: COTE, height: COTE }), { maxCote: BALANCE.ui.rigsTexture })) : partage;
export const renduPartage = rendu;

// Un nouveau combat repart de zero : les personnages d'avant ne sont plus la, leur memoire graphique se rend. Sans ca, les
// textures s'accumulent de combat en combat jusqu'a saturer un telephone. La boucle aussi repart proprement.
export function videPersonnages() {
  vivants.clear();
  if (boucle) cancelAnimationFrame(boucle);
  boucle = 0;
  if (partage) partage.oublie();
}

// Contexte WebGL perdu (memoire du telephone, application en arriere-plan) : le canvas resterait vide. On rend l'image
// fixe au personnage, et l'animation revient avec le contexte.
function repli(v, oui) {
  if (!!v.repli === oui) return;
  v.repli = oui;
  const im = v.hote.querySelector('img');
  if (!oui && im && !v.canvas.isConnected) im.before(v.canvas);
  v.canvas.style.display = oui ? 'none' : '';
  if (im) im.style.display = oui ? '' : 'none';
}

const vivants = new Set();
let boucle = 0, avant = 0;
function image(t) {
  const dt = Math.min(0.1, (t - avant) / 1000); avant = t;
  for (const v of vivants) {
    if (!v.hote.isConnected) { vivants.delete(v); continue; }   // l'unite est partie ; si elle revient, animeImg la remet
    if (partage.perdu || partage.sature) { repli(v, true); continue; }
    repli(v, false);
    if (!v.canvas.isConnected) continue;   // son contenu est en cours de redessin
    // Une erreur sur un personnage lui rend son image : elle ne doit pas couper la boucle de tous les autres.
    try { dessineUn(v, dt); } catch (e) { console.warn('rig', v.sprite, e); vivants.delete(v); repli(v, true); }
  }
  boucle = vivants.size ? requestAnimationFrame(image) : 0;
}

function dessineUn(v, dt) {
  const r = v.canvas.getBoundingClientRect();
  if (!r.width) return;
  const d = Math.min(2, devicePixelRatio || 1), cote = Math.max(16, Math.round(r.width * d));
  if (v.canvas.width !== cote) v.canvas.width = v.canvas.height = cote;
  const a = v.a;
  a.avance(dt);
  if (a.clip && !a.clip.boucle && a.t >= a.clip.duree) a.joue('idle', { fondu: 0.15 });
  // PROVISOIRE (essai) : de temps en temps, un petit mouvement en plus, pour que le plateau vive
  if (BALANCE.ui.rigsRemuants && a.clip.boucle && (v.reveil = (v.reveil ?? 1 + Math.random() * 4) - dt) < 0) {
    v.reveil = 3 + Math.random() * 4;
    const l = ['hitting', 'walking', 'idle'].filter(n => a.rig.clips[n]);
    if (l.length) a.joue(l[Math.floor(Math.random() * l.length)], { fondu: 0.15 });
  }
  a.calcule();
  const R = rendu();
  R.efface();
  R.dessine(a, { place: [0, 0], origine: [0, 0], echelle: COTE / Math.max(...a.rig.taille) });
  v.ctx.clearRect(0, 0, cote, cote);
  v.ctx.drawImage(R.canvas, 0, 0, COTE, COTE, 0, 0, cote, cote);
}

// `hote` : le noeud du heros ou de l'unite (il garde l'etat) ; `img` : son <img> du moment (une unite la refait quand son contenu
// change : le canvas est replace devant la nouvelle) ; `hp` : les PV montres. A appeler a chaque mise a jour du noeud.
export function animeImg(hote, img, sprite, hp, reglage) {
  if (!img || !sprite || !BALANCE.ui[reglage]) return;
  const st = hote.rigAnime;
  if (st && st.sprite === sprite) {
    if (st.canvas) { if (img.style.display !== 'none' && !st.repli) { img.before(st.canvas); img.style.display = 'none'; } if (!vivants.has(st)) { vivants.add(st); if (!boucle) { avant = performance.now(); boucle = requestAnimationFrame(image); } } }
    // Tous les personnages n'ont pas ce clip (un sort n'a que idle et play) : `joue` leverait une erreur, a chaque rendu.
    if (hp < st.hp) joueSur(hote, 'taking_damage');
    st.hp = hp;
    return;
  }
  if (st?.canvas) { st.canvas.remove(); vivants.delete(st); }
  const nouveau = hote.rigAnime = { sprite, hp, hote, canvas: null, a: null, ctx: null };
  rigDe(sprite).then(rig => {
    if (!rig || hote.rigAnime !== nouveau || !hote.isConnected) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'rig';
    canvas.style.animationDelay = `${-Math.random() * 3}s`;   // le souffle de la carte (styles.css) : pas tous ensemble
    if (!rendu()) return;
    nouveau.canvas = canvas; nouveau.ctx = canvas.getContext('2d');
    nouveau.a = creeAnimateur(rig).joue('idle', { fondu: 0, depuis: Math.random() * 2 });
    nouveau.a.gain = BALANCE.ui.rigsGain || 1;   // pas tous en phase
    const im = hote.querySelector('img');
    if (!im) return;
    im.before(canvas); im.style.display = 'none';
    vivants.add(nouveau);
    if (!boucle) { avant = performance.now(); boucle = requestAnimationFrame(image); }
  });
}

// Joue un clip sur le noeud (l'unite ou le heros) s'il a un personnage anime : `hitting` quand il attaque. Il revient a `idle` tout seul.
export function joueSur(noeud, clip) {
  const a = noeud?.rigAnime?.a;
  if (a && a.rig.clips[clip]) a.joue(clip, { fondu: clip === 'taking_damage' ? 0.05 : 0.08 });
}

// Le double d'une unite qui bondit (l'elan de l'attaque, ui/effets.js) : un canvas a lui, qui rejoue le personnage de l'original.
export function animeClone(clone, original, clip = 'hitting') {
  const st = original?.rigAnime;
  const im = clone.querySelector('img');
  if (!st?.a || !im) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'rig';
  if (!rendu()) return;
  const a = creeAnimateur(st.a.rig);
  a.gain = st.a.gain;
  if (a.rig.clips[clip]) a.joue(clip, { fondu: 0.05 });
  const v = { sprite: st.sprite, hp: 0, hote: clone, canvas, a, ctx: canvas.getContext('2d'), reveil: Infinity };
  im.before(canvas); im.style.display = 'none';
  vivants.add(v);
  if (!boucle) { avant = performance.now(); boucle = requestAnimationFrame(image); }
}

export const animeHero = (h, sprite, hp) => animeImg(h.n, h.img, sprite, hp, 'rigsHeros');
export const animeUnite = (n, u, hp) => animeImg(n, n.querySelector('img'), u.sprite, hp, 'rigsUnites');

// Un double d'un noeud (fantome de mort, elan, fantome du doigt) copie un canvas VIDE : on lui rend son image fixe.
export function sansRig(clone) {
  for (const c of clone.querySelectorAll('canvas.rig')) c.remove();
  for (const i of clone.querySelectorAll('img')) if (i.style.display === 'none') i.style.display = '';
  return clone;
}
