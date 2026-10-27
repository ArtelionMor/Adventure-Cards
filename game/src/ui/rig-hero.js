// LE HEROS ANIME dans le combat (ESSAI, 27 oct. 2026) : quand le portrait d'un heros a un rig (`game/data/rigs/<nom du png>/`,
// « Hero Cat 1.png » -> `hero-cat-1`), son <img> est remplace par un canvas WebGL qui joue `idle` en boucle, et `taking_damage`
// quand ses PV baissent. Sans rig (ou sans WebGL), le portrait reste l'image. Reglage : `BALANCE.ui.rigsHeros`.
import { BALANCE } from '../config/balance.js';
import { chargeRig, creeAnimateur } from '../rig/joueur.js';
import { creeRendu } from '../rig/rendu-webgl.js';

const idDe = sprite => String(sprite || '').split('/').pop().replace(/\.png$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const rigs = new Map();   // id -> Promise<rig | null> (un personnage se charge une fois pour tous ses portraits)
const charge = id => {
  if (!rigs.has(id)) rigs.set(id, chargeRig(`/game/data/rigs/${id}/`).then(r => (r.clips.idle ? r : null)).catch(() => null));
  return rigs.get(id);
};

const vivants = new Set();
let boucle = 0, avant = 0;
function image(t) {
  const dt = Math.min(0.1, (t - avant) / 1000); avant = t;
  for (const v of vivants) {
    if (!v.canvas.isConnected) { vivants.delete(v); continue; }
    const r = v.canvas.getBoundingClientRect();
    if (!r.width) continue;   // cache (autre ecran)
    const d = Math.min(2, devicePixelRatio || 1), cote = Math.round(r.width * d);
    if (v.canvas.width !== cote) { v.canvas.width = v.canvas.height = cote; }
    const a = v.a;
    a.avance(dt);
    if (a.clip && !a.clip.boucle && a.t >= a.clip.duree) a.joue('idle', { fondu: 0.15 });
    a.calcule();
    v.rendu.efface();
    v.rendu.dessine(a, { place: [0, 0], origine: [0, 0], echelle: cote / Math.max(...a.rig.taille) });
  }
  boucle = vivants.size ? requestAnimationFrame(image) : 0;
}

// Appele a chaque mise a jour du portrait (`majHero`) : `h` = { n, img, rigAnime? }, `hp` = les PV montres.
export function animeHero(h, sprite, hp) {
  if (!BALANCE.ui.rigsHeros) return;
  const st = h.rigAnime;
  if (st && st.sprite === sprite) {
    if (st.a && hp < st.hp) st.a.joue('taking_damage', { fondu: 0.05 });
    st.hp = hp;
    return;
  }
  if (st?.canvas) { st.canvas.remove(); vivants.delete(st); h.img.style.display = ''; }
  const nouveau = h.rigAnime = { sprite, hp, canvas: null, a: null, rendu: null };
  const id = idDe(sprite);
  if (!id) return;
  charge(id).then(rig => {
    if (!rig || h.rigAnime !== nouveau || !h.n.isConnected) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'rig';
    const rendu = creeRendu(canvas);
    if (!rendu) return;
    nouveau.canvas = canvas; nouveau.rendu = rendu;
    nouveau.a = creeAnimateur(rig).joue('idle', { fondu: 0 });
    h.img.before(canvas); h.img.style.display = 'none';
    vivants.add(nouveau);
    if (!boucle) { avant = performance.now(); boucle = requestAnimationFrame(image); }
  });
}
