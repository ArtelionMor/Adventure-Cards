// LE COMBAT GUIDE (docs/TUTORIEL.md) : des BULLES sur l'ecran de combat, une a la fois, pointees sur ce qu'il faut
// toucher. Les etapes et leurs textes sont dans config/guide.js ; ici, QUAND chacune se montre (son moment) et ce qui
// la termine. Rien ne bloque : une bulle ne prend aucun toucher (`pointer-events: none`), elle part quand le geste est
// fait — meme fait avant d'avoir ete dit — ou, pour une information, au bout de sa duree. La quete en cours dit si un
// combat est guide (`guide` dans config/quetes.js) ; ui/battle.js appelle `maj()` apres chaque rendu.
import { GUIDES } from '../config/guide.js';
import { canPlay, attackableTargets } from '../combat/engine.js';
import { queteCourante } from '../state.js';
import { el } from './shell.js';

/** Le guide de ce combat, s'il en a un : la quete en cours en demande un, et c'est son arene qu'on joue. */
export function guideDuCombat(node) {
  const q = queteCourante();
  if (!q || !q.guide || !GUIDES[q.guide] || !node || node.arene !== q.objectif.arene) return null;
  return GUIDES[q.guide];
}

const pretes = B => B.p.board.filter(u => u.canAttack && u.atk > 0 && attackableTargets(B, 'p', u).length);

/**
 * Cree le guide d'un combat. `acces` donne ce que les bulles pointent et l'etat de l'ecran : { racine, B, auto,
 * engage, noeud(cible) }, ou `noeud` rend le noeud de 'carte', 'unite', 'heros', 'fin', 'pioche' ou 'auto'.
 */
export function creeGuide(etapes, acces) {
  const faites = new Set();
  let montre = null;      // { etape, depuis (ms), tour (B.turnNo) }
  let pvE0 = null, cibleNoeud = null, minuterie = null, attente = null;
  const bulle = el('<div class="bt-guide hidden"><p></p></div>');

  // Le moment de chaque etape (elle peut se montrer) et ce qui la termine.
  const monTour = B => !B.over && B.turn === 'p' && !acces.auto();
  const peutPoser = B => B.p.hand.some(c => canPlay(B, 'p', c));
  const MOMENT = {
    poser: B => monTour(B) && peutPoser(B),
    attaque: B => monTour(B) && B.e.board.length > 0 && pretes(B).length > 0,
    heros: B => monTour(B) && B.e.board.length === 0 && pretes(B).length > 0,
    fin: B => monTour(B) && faites.has('poser') && !peutPoser(B) && !pretes(B).length,
    fatigue: B => !B.over && B.p.deck.length === 0,
    auto: B => !B.over && !acces.auto() && (faites.has('heros') || (faites.has('attaque') && B.p.turns >= 4))
  };
  const FINI = {
    poser: B => B.p.posees.length > 0,
    attaque: B => (B.evts || []).some(e => e.t === 'attaque' && e.camp === 'p'),
    heros: B => B.e.hp < pvE0,
    fin: B => !!montre && montre.etape.id === 'fin' && B.turnNo > montre.tour,
    fatigue: () => false,
    auto: () => acces.auto()
  };
  const ecoule = () => montre && montre.etape.dureeMs && Date.now() - montre.depuis >= montre.etape.dureeMs;

  function cache() {
    bulle.classList.add('hidden');
    if (cibleNoeud) cibleNoeud.classList.remove('guide-cible');
    cibleNoeud = null;
  }

  function place(noeud) {
    const r = acces.racine().getBoundingClientRect(), c = noeud.getBoundingClientRect();
    // Au-dessus de la cible, ou passe le plateau adverse ; en dessous seulement pour une cible tout en haut (le heros
    // adverse). En dessous de « Fin de tour », elle recouvrait le bouton de vitesse.
    const enBas = c.top - r.top > r.height * 0.25;
    bulle.classList.toggle('dessus', enBas);
    bulle.classList.toggle('dessous', !enBas);
    // La fleche vise le milieu de la cible, sans sortir de la bulle (une cible collee au bord droit).
    const x = Math.min(r.width - 34, Math.max(34, c.left + c.width / 2 - r.left));
    bulle.style.setProperty('--fleche', `${Math.round(x)}px`);
    if (enBas) { bulle.style.top = ''; bulle.style.bottom = `${Math.round(r.bottom - c.top + 12)}px`; }
    else { bulle.style.bottom = ''; bulle.style.top = `${Math.round(c.bottom - r.top + 12)}px`; }
  }

  function maj() {
    const B = acces.B();
    if (!B) return;
    if (!bulle.isConnected) acces.racine().appendChild(bulle);
    if (pvE0 === null) pvE0 = B.e.hp;
    // Les gestes deja faits ferment leur etape, dite ou non ; une information se ferme a la fin de sa duree.
    for (const e of etapes) if (!faites.has(e.id) && FINI[e.id](B)) faites.add(e.id);
    if (montre && (faites.has(montre.etape.id) || ecoule())) { faites.add(montre.etape.id); montre = null; }
    // L'etape montree reste tant que son moment dure ; sinon, la premiere dont le moment est venu.
    if (montre && !MOMENT[montre.etape.id](B)) montre = null;
    if (!montre) {
      const e = etapes.find(x => !faites.has(x.id) && MOMENT[x.id](B));
      if (e) {
        montre = { etape: e, depuis: Date.now(), tour: B.turnNo };
        clearTimeout(minuterie);
        if (e.dureeMs) minuterie = setTimeout(maj, e.dureeMs + 50);
      }
    }
    const noeud = montre && !acces.engage() && acces.noeud(montre.etape.cible);
    // Sa cible n'est pas encore la (une carte piochee vole encore vers la main) : rien ne redessinera l'ecran a son
    // arrivee, donc on regarde de nouveau un peu plus tard.
    clearTimeout(attente);
    if (montre && !noeud && !B.over) attente = setTimeout(maj, 250);
    if (!noeud) { cache(); return; }
    if (cibleNoeud !== noeud) { cache(); cibleNoeud = noeud; noeud.classList.add('guide-cible'); }
    bulle.querySelector('p').textContent = montre.etape.texte;
    bulle.classList.remove('hidden');
    place(noeud);
  }

  return {
    maj,
    // Pour la console (`AC.guide.etat()`) : ce qui est fait, ce qui est montre, et le moment de chaque etape.
    etat: () => { const B = acces.B(); return { faites: [...faites], montre: montre && montre.etape.id, moments: B ? Object.fromEntries(etapes.map(e => [e.id, MOMENT[e.id](B)])) : null }; },
    ferme() { clearTimeout(minuterie); clearTimeout(attente); cache(); bulle.remove(); }
  };
}
