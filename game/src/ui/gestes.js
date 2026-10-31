// LES GESTES DU COMBAT : un TAP agit (jouer, attaquer, designer), un APPUI LONG lit. Un seul
// endroit decide lequel des deux c'est, pour l'ecran de combat comme pour la fenetre de zone.
//
// Tout passe par la DELEGATION : les ecouteurs sont poses une fois sur un element qui ne bouge
// pas (`#battle`, `#modal`), et un element touchable se declare avec `data-geste`. C'est ce qui
// permet a l'ecran de se redessiner pendant qu'un doigt est pose — et en mode auto il se
// redessine toutes les `autoStepMs`, donc un appui long de 400 ms serait coupe en route si les
// ecouteurs vivaient sur l'element touche. Le geste se souvient du noeud touche, pas de sa place
// a l'ecran.
//
// Un doigt qui glisse de plus de `tolerance` pixels ne lit ni n'agit. Si l'ecran le veut (`glisse`), il TIRE le
// noeud touche : c'est le glisser-deposer d'une carte de la main (demande du game designer, 19 octobre 2026) ; sinon
// c'est un defilement, et le navigateur envoie `pointercancel`.
import { BALANCE } from '../config/balance.js';

/**
 * Pose les gestes sur `racine`. Les rappels recoivent le noeud `[data-geste]` touche :
 *   tap(noeud)    — le doigt s'est leve avant l'appui long, sans bouger ;
 *   lire(noeud)   — l'appui long a commence (le doigt est toujours pose) ;
 *   finLire()     — le doigt s'est leve (ou a glisse) : on referme ce qu'on a ouvert ;
 *   glisse        — facultatif, le glisser-deposer : `debut(noeud, ev)` dit s'il accepte de tirer ce noeud (sinon le
 *                   glissement ne fait rien), puis `bouge(ev)` a chaque pas et `lache(ev, annule)` au relachement.
 *                   Un relachement qui termine un glisser porte `ev.gesteGlisse = true` (l'ecran n'y voit pas un
 *                   « toucher le fond »).
 *   cible        — facultatif, le selecteur des noeuds touchables : un ecran hors combat pose ses gestes sur ses propres
 *                  noeuds sans `data-geste`, que les ecouteurs du combat (poses sur `#modal`) prendraient pour les leurs.
 */
export function installeGestes(racine, { tap, lire, finLire, glisse = null, cible = '[data-geste]' }) {
  const ms = BALANCE.ui.appuiLongMs, tolerance = BALANCE.ui.toleranceDoigtPx;
  let g = null;
  const noeud = ev => (ev.target.closest ? ev.target.closest(cible) : null);

  racine.addEventListener('pointerdown', ev => {
    if (g || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    const n = noeud(ev);
    if (!n) return;
    g = { n, id: ev.pointerId, x: ev.clientX, y: ev.clientY, long: false, bouge: false };
    g.t = setTimeout(() => { if (g) { g.long = true; lire(g.n); } }, ms);
  });

  racine.addEventListener('pointermove', ev => {
    if (!g || ev.pointerId !== g.id) return;
    if (g.tire) { glisse.bouge(ev); return; }
    if (g.bouge) return;
    if (Math.hypot(ev.clientX - g.x, ev.clientY - g.y) <= tolerance) return;
    g.bouge = true;
    clearTimeout(g.t);
    // Lire puis glisser : on referme la lecture et on tire la carte (on peut lire avant de jouer).
    if (g.long) { finLire(); g.long = false; }
    if (glisse && glisse.debut(g.n, ev)) { g.tire = true; glisse.bouge(ev); }
  });

  const fin = (ev, annule) => {
    if (!g || ev.pointerId !== g.id) return;
    clearTimeout(g.t);
    const s = g;
    g = null;
    if (s.tire) { ev.gesteGlisse = true; glisse.lache(ev, annule); return; }
    if (s.long) { if (!s.bouge) finLire(); return; }
    if (!annule && !s.bouge) tap(s.n);
  };
  racine.addEventListener('pointerup', ev => fin(ev, false));
  racine.addEventListener('pointercancel', ev => fin(ev, true));
  // L'appui long ouvre sinon le menu du navigateur (« enregistrer l'image »).
  racine.addEventListener('contextmenu', ev => ev.preventDefault());
}
