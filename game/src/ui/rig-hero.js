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

const rigs = new Map();   // sprite -> Promise<rig | null> (un personnage se charge une fois pour tous ses portraits)
export function rigDe(sprite) {
  if (!rigs.has(sprite)) {
    rigs.set(sprite, (async () => {
      for (const id of candidats(sprite)) {
        try {
          const r = await chargeRig(`/game/data/rigs/${id}/`);
          const origine = r.json.source?.origine;
          if (r.clips.idle && (!origine || origine === sprite)) return r;
        } catch { /* pas de dossier de ce nom */ }
      }
      return null;
    })());
  }
  return rigs.get(sprite);
}

const vivants = new Set();
let boucle = 0, avant = 0;
function image(t) {
  const dt = Math.min(0.1, (t - avant) / 1000); avant = t;
  for (const v of vivants) {
    if (!v.hote.isConnected) { vivants.delete(v); continue; }   // l'unite est partie ; si elle revient, animeImg la remet
    if (!v.canvas.isConnected) continue;   // son contenu est en cours de redessin
    const r = v.canvas.getBoundingClientRect();
    if (!r.width) continue;
    const d = Math.min(2, devicePixelRatio || 1), cote = Math.max(16, Math.round(r.width * d));
    if (v.canvas.width !== cote) v.canvas.width = v.canvas.height = cote;
    const a = v.a;
    a.avance(dt);
    if (a.clip && !a.clip.boucle && a.t >= a.clip.duree) a.joue('idle', { fondu: 0.15 });
    a.calcule();
    v.rendu.efface();
    v.rendu.dessine(a, { place: [0, 0], origine: [0, 0], echelle: cote / Math.max(...a.rig.taille) });
  }
  boucle = vivants.size ? requestAnimationFrame(image) : 0;
}

// `hote` : le noeud du heros ou de l'unite (il garde l'etat) ; `img` : son <img> du moment (une unite la refait quand son contenu
// change : le canvas est replace devant la nouvelle) ; `hp` : les PV montres. A appeler a chaque mise a jour du noeud.
export function animeImg(hote, img, sprite, hp, reglage) {
  if (!img || !sprite || !BALANCE.ui[reglage]) return;
  const st = hote.rigAnime;
  if (st && st.sprite === sprite) {
    if (st.canvas) { if (img.style.display !== 'none') { img.before(st.canvas); img.style.display = 'none'; } if (!vivants.has(st)) { vivants.add(st); if (!boucle) { avant = performance.now(); boucle = requestAnimationFrame(image); } } }
    if (st.a && hp < st.hp) st.a.joue('taking_damage', { fondu: 0.05 });
    st.hp = hp;
    return;
  }
  if (st?.canvas) { st.canvas.remove(); vivants.delete(st); }
  const nouveau = hote.rigAnime = { sprite, hp, hote, canvas: null, a: null, rendu: null };
  rigDe(sprite).then(rig => {
    if (!rig || hote.rigAnime !== nouveau || !hote.isConnected) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'rig';
    const rendu = creeRendu(canvas);
    if (!rendu) return;
    nouveau.canvas = canvas; nouveau.rendu = rendu;
    nouveau.a = creeAnimateur(rig).joue('idle', { fondu: 0, depuis: Math.random() * 2 });   // pas tous en phase
    const im = hote.querySelector('img');
    if (!im) return;
    im.before(canvas); im.style.display = 'none';
    vivants.add(nouveau);
    if (!boucle) { avant = performance.now(); boucle = requestAnimationFrame(image); }
  });
}

export const animeHero = (h, sprite, hp) => animeImg(h.n, h.img, sprite, hp, 'rigsHeros');
export const animeUnite = (n, u, hp) => animeImg(n, n.querySelector('img'), u.sprite, hp, 'rigsUnites');

// Un double d'un noeud (fantome de mort, elan, fantome du doigt) copie un canvas VIDE : on lui rend son image fixe.
export function sansRig(clone) {
  for (const c of clone.querySelectorAll('canvas.rig')) c.remove();
  for (const i of clone.querySelectorAll('img')) if (i.style.display === 'none') i.style.display = '';
  return clone;
}
