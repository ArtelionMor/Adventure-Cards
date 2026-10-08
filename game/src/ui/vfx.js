// LES VFX DES CARTES : chaque carte a SA signature visuelle, assemblee a partir de briques communes.
//
// Une SIGNATURE (`SIGNATURES[idDeLaCarte]`) dit trois choses, toutes facultatives :
//   - `lancer`  : ce qui PART de la carte quand on la joue (un eclair, des plumes, une langue…) vers `vers` ;
//   - `arrivee` : ce que la CIBLE subit (griffures, boue, faisceau…), a la place des etincelles par defaut ;
//   - `entree`  : l'arrivee d'une unite que cette carte a posee (convocation, bulles, nuit…).
// Chaque entree est `[brique, options]`. Une carte sans signature garde les effets generiques de `effets.js`.
// La liste, avec le raisonnement carte par carte, est dans `docs/VFX-CARTES.md`. Tout est procedural (CSS/WAAPI,
// transform et opacity seulement) et facile a remplacer le jour ou le game designer livre ses dessins.
//
// `vers` (ce que vise un lancer qui n'a pas de cible designee) : 'ennemi' (le heros adverse), 'allies' (ton
// plateau), 'ennemis' (le plateau adverse), 'main' (ta main), 'pioche' (ta pioche), 'defausse'.
import { icone } from './icones.js';

const C = {
  or: '#ffc46b', rouge: '#ff4d5e', vert: '#5fe08f', bleu: '#6ec1ff', violet: '#b57cff', blanc: '#ffffff',
  rose: '#ff8fb3', noir: '#2a2236', boue: '#6b8a3a', jaune: '#ffe45e', gris: '#b9b3c9', cyan: '#8fe9ff'
};

export const SIGNATURES = {
  // ---- Médor (Chien, Gardien)
  dog_pup:   { entree: ['convocation', { couleur: '#e8c98f' }] },
  dog_guard: { entree: ['convocation', { couleur: C.gris, lourd: true }] },
  dog_growl: { lancer: ['ondes', { couleur: C.or }], vers: 'allies', arrivee: ['souffle', { couleur: C.or }], entree: ['convocation', { couleur: '#e8c98f' }] },
  dog_lick:  { lancer: ['souffle', { couleur: C.bleu }], vers: 'allies', entree: ['convocation', { couleur: C.cyan }] },
  dog_pack:  { lancer: ['ondes', { couleur: C.rouge }], vers: 'allies', entree: ['convocation', { couleur: '#e8c98f' }] },
  // ---- Felix (Chat, Mille coupures)
  cat_claw:   { entree: ['convocation', { couleur: C.rose }] },
  cat_alley:  { entree: ['convocation', { couleur: C.violet }] },
  cat_pounce: { lancer: ['eclair', { couleur: C.jaune }], vers: 'ennemi', arrivee: ['griffures', { couleur: C.cyan }] },
  cat_nine:   { lancer: ['spirale', { couleur: C.violet, n: 9 }], vers: 'main' },
  cat_shadow: { lancer: ['spirale', { couleur: C.violet, n: 5 }], vers: 'pioche', entree: ['convocation', { couleur: C.violet }] },
  // ---- Corax (Corbeau, Filou)
  crow_peck:   { lancer: ['plumes', { couleur: C.noir, n: 6 }], vers: 'ennemi', arrivee: ['griffures', { couleur: C.rouge }] },
  crow_scout:  { entree: ['convocation', { couleur: C.gris }] },
  crow_murder: { lancer: ['plumes', { couleur: C.blanc, n: 8 }], vers: 'ennemi', arrivee: ['souffle', { couleur: C.blanc }] },
  crow_omen:   { lancer: ['yeux', { couleur: C.or }], vers: 'pioche' },
  crow_raven:  { entree: ['nuit', { lourd: true, couleur: C.noir }] },
  // ---- Bulle (Grenouille, Venin)
  frog_tad:    { entree: ['bulles', { couleur: C.vert }] },
  frog_tongue: { lancer: ['langue', { couleur: C.rose }], vers: 'ennemi', arrivee: ['gouttes', { couleur: C.vert }] },
  frog_venom:  { entree: ['convocation', { couleur: C.vert }], arrivee: ['gouttes', { couleur: C.vert }] },
  frog_swamp:  { lancer: ['boue', { couleur: C.boue }], vers: 'ennemi', arrivee: ['boue', { couleur: C.boue }] },
  frog_toad:   { entree: ['convocation', { couleur: C.vert, lourd: true }] },
  // ---- Athéna (Chouette, Contrôle)
  owl_study:   { lancer: ['spirale', { couleur: C.or, n: 6 }], vers: 'main' },
  owl_scholar: { entree: ['convocation', { couleur: C.violet }] },
  owl_gaze:    { lancer: ['yeux', { couleur: C.or }], vers: 'ennemi', arrivee: ['faisceau', { couleur: C.or }] },
  owl_wisdom:  { lancer: ['plumes', { couleur: C.noir, n: 5 }], vers: 'ennemi', arrivee: ['souffle', { couleur: C.noir }] },
  owl_night:   { entree: ['nuit', { lourd: true, couleur: '#120a24' }] },
  // ---- Miracle (Caméléon, Support)
  fox_kit:   { entree: ['facettes', {}] },
  fox_dash:  { lancer: ['spirale', { couleur: C.cyan, n: 7 }], vers: 'allies', arrivee: ['facettes', {}] },
  fox_snare: { entree: ['convocation', { couleur: C.vert }] },
  fox_raid:  { lancer: ['spirale', { couleur: C.or, n: 6 }], vers: 'main' },
  fox_wild:  { lancer: ['facettes', {}], vers: 'allies', arrivee: ['facettes', {}] },
  // ---- Croc (Chien, Meute)
  dog2_cub:    { entree: ['convocation', { couleur: C.rouge }] },
  dog2_hunt:   { lancer: ['pas', { couleur: C.rouge }], vers: 'allies', arrivee: ['souffle', { couleur: C.rouge }] },
  dog2_beater: { entree: ['convocation', { couleur: '#d9a066' }] },
  dog2_pack:   { lancer: ['ondes', { couleur: C.rouge }], vers: 'allies', entree: ['convocation', { couleur: C.rouge }] },
  dog2_alpha:  { entree: ['convocation', { couleur: C.rouge, lourd: true }] },
  // ---- Mistigri (Chat, Maraudeur)
  cat2_kit:     { entree: ['convocation', { couleur: C.rose }] },
  cat2_stray:   { entree: ['convocation', { couleur: C.rose }] },
  cat2_sneak:   { lancer: ['griffures', { couleur: C.or }], vers: 'allies', arrivee: ['griffures', { couleur: C.or }] },
  cat2_burglar: { entree: ['convocation', { couleur: C.violet }] },
  cat2_lord:    { entree: ['convocation', { couleur: C.rose, lourd: true }] },
  // ---- Sirocco (Faucon, Rapace)
  crow2_eaglet: { entree: ['convocation', { couleur: C.blanc }] },
  crow2_dive:   { lancer: ['plumes', { couleur: C.blanc, n: 4 }], vers: 'allies', arrivee: ['souffle', { couleur: C.blanc }] },
  crow2_hawk:   { entree: ['convocation', { couleur: C.gris }] },
  crow2_gust:   { lancer: ['vent', { couleur: C.cyan }], vers: 'allies', arrivee: ['vent', { couleur: C.cyan }] },
  crow2_roc:    { entree: ['convocation', { couleur: C.blanc, lourd: true }] },
  // ---- Reinette (Grenouille, Marais)
  frog2_spawn: { lancer: ['bulles', { couleur: C.vert }], vers: 'allies', entree: ['bulles', { couleur: C.vert }] },
  frog2_croak: { entree: ['ondes', { couleur: C.vert }] },
  frog2_bull:  { entree: ['convocation', { couleur: C.vert, lourd: true }] },
  frog2_rain:  { lancer: ['pluie', { couleur: C.cyan }], vers: 'allies', arrivee: ['gouttes', { couleur: C.vert }] },
  frog2_elder: { entree: ['convocation', { couleur: C.vert }], arrivee: ['gouttes', { couleur: C.vert }] },
  // ---- Morphée (Hibou, Veilleur)
  owl2_nest:  { entree: ['convocation', { couleur: C.bleu }] },
  owl2_sand:  { lancer: ['sablier', { couleur: C.or }], vers: 'ennemi', arrivee: ['sablier', { couleur: C.or }] },
  owl2_watch: { entree: ['yeux', { couleur: C.or }] },
  owl2_lull:  { entree: ['ondes', { couleur: C.violet }] },
  owl2_elder: { entree: ['nuit', { lourd: true, couleur: '#0d1630' }], arrivee: ['faisceau', { couleur: C.bleu }] },
  // ---- Mirage (Caméléon, Imitateur)
  cam2_prism:  { entree: ['facettes', {}] },
  cam2_mirror: { lancer: ['facettes', {}], vers: 'main' },
  cam2_choir:  { entree: ['facettes', {}] },
  cam2_shed:   { lancer: ['souffle', { couleur: C.cyan }], vers: 'allies' },
  cam2_ball:   { lancer: ['confettis', {}], vers: 'allies', arrivee: ['confettis', {}] }
};

/** Ce que fait chaque brique, en une phrase (le wiki de l'Atelier l'affiche). */
export const BRIQUES_DOC = {
  eclair: "Un trait de foudre en zigzag de la carte vers la cible, avec un éclair blanc à l'arrivée.",
  griffures: "Trois stries obliques qui se tracent sur la cible.",
  plumes: "Des plumes qui tournoient de la carte vers la cible et s'y plantent.",
  langue: "Un long trait rose qui claque sur la cible (la langue de la grenouille).",
  gouttes: "Des gouttes qui coulent sur la cible (venin, croissance).",
  pluie: "Une averse sur tout un plateau.",
  souffle: "Un anneau net et des éclats qui partent de la cible.",
  faisceau: "Un faisceau vertical qui tombe du haut de l'écran sur la cible.",
  yeux: "Deux yeux qui s'ouvrent (regard, présage, veilleur).",
  sablier: "Un sablier qui se retourne sur la cible, avec du sable qui coule.",
  convocation: "Un anneau et un nuage d'éclats pour une unité qui arrive ; « lourd » fait trembler l'écran.",
  ondes: "Des ondes concentriques qui partent d'un point (cor, hurlement, coassement, berceuse).",
  nuit: "La nuit tombe : un voile sombre sur tout l'écran.",
  spirale: "Des points qui s'enroulent de la source vers la cible (âmes, étude, transmigration).",
  facettes: "Des facettes de couleur qui tournent (caméléon, prisme, miroir).",
  pas: "Des pas qui courent vers la cible (traque).",
  bulles: "Des bulles qui montent de la cible.",
  vent: "Des colonnes de vent qui montent de la cible.",
  boue: "Une boule de boue qui grossit et s'étale sur la cible.",
  confettis: "Des confettis dorés qui retombent."
};

/**
 * Les briques, construites sur l'API d'`effets.js` (`a`) : elles ne connaissent ni le moteur ni l'ecran, seulement
 * des POINTS (`{ x, y }` dans le repere de l'ecran de combat) et des RECTANGLES (`{ x, y, w, h }`).
 * Chacune rend sa duree (ms, vitesse x1) pour que le film sache quand elle est finie.
 */
export function creeBriques(a) {
  const { anime, T, ephemere, couche, F } = a;
  const centre = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const alea = (min, max) => min + Math.random() * (max - min);

  /** Un element de la couche d'effets, place par son coin haut-gauche (en px). */
  const noeud = (classe, style = {}, html = '') => {
    const d = document.createElement('div');
    d.className = classe;
    d.innerHTML = html;
    Object.assign(d.style, { position: 'absolute', left: '0px', top: '0px', pointerEvents: 'none', willChange: 'transform, opacity' }, style);
    couche().appendChild(d);
    return d;
  };
  const vie = (d, ms) => ephemere(d, ms);

  /** Un segment de `p` a `q` : une barre qui s'etire de p vers q puis s'efface. */
  function segment(p, q, { couleur, epaisseur = 4, ms = 220, delai = 0, lueur = true }) {
    const dx = q.x - p.x, dy = q.y - p.y;
    const long = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const d = noeud('fx-v', {
      left: p.x + 'px', top: (p.y - epaisseur / 2) + 'px', width: long + 'px', height: epaisseur + 'px', background: couleur,
      borderRadius: epaisseur + 'px', transformOrigin: '0 50%', boxShadow: lueur ? `0 0 8px ${couleur}` : 'none'
    });
    anime(d, [
      { transform: `rotate(${ang}deg) scaleX(0)`, opacity: 1 },
      { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 1, offset: .3 },
      { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 1, offset: .7 },
      { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 0 }
    ], { duration: T(ms), delay: T(delai), easing: 'ease-out' });
    vie(d, ms + delai);
  }

  /** Une petite pastille qui voyage de `p` a `q` en passant par un point de controle (une courbe). */
  function voyageur(p, q, { couleur, taille = 8, ms = 420, delai = 0, courbe = 40, forme = '50%', rot = 0 }) {
    const c = { x: (p.x + q.x) / 2 + alea(-courbe, courbe), y: (p.y + q.y) / 2 + alea(-courbe, courbe) };
    const d = noeud('fx-v', { width: taille + 'px', height: taille * (forme === '50%' ? 1 : 2) + 'px', background: couleur, borderRadius: forme, boxShadow: `0 0 6px ${couleur}` });
    const t = pt => `translate(${pt.x - taille / 2}px, ${pt.y - taille / 2}px)`;
    anime(d, [
      { transform: `${t(p)} rotate(${rot}deg) scale(.4)`, opacity: 0 },
      { transform: `${t(c)} rotate(${rot + 90}deg) scale(1)`, opacity: 1, offset: .5 },
      { transform: `${t(q)} rotate(${rot + 200}deg) scale(.6)`, opacity: 0 }
    ], { duration: T(ms), delay: T(delai), easing: 'ease-in-out' });
    vie(d, ms + delai);
  }

  const briques = {
    /** Un trait de foudre en zigzag de la source a la cible. */
    eclair({ de, vers, couleur = C.jaune }) {
      for (const r of vers) {
        const q = centre(r);
        const pts = [de];
        for (let i = 1; i <= 3; i++) {
          const f = i / 4;
          pts.push({ x: de.x + (q.x - de.x) * f + alea(-22, 22), y: de.y + (q.y - de.y) * f + alea(-22, 22) });
        }
        pts.push(q);
        pts.forEach((p, i) => { if (i) segment(pts[i - 1], p, { couleur, epaisseur: 5, ms: 260, delai: i * 55 }); });
        a.eclair(r, '#fff');
      }
      return 420;
    },
    /** Trois stries obliques qui se tracent sur la cible. */
    griffures({ vers, couleur = C.rouge }) {
      for (const r of vers) {
        const c = centre(r), w = Math.max(30, r.w * .8);
        for (let i = 0; i < 3; i++) {
          const o = (i - 1) * Math.max(10, r.w * .22);
          segment({ x: c.x - w / 2 + o, y: c.y - r.h * .35 }, { x: c.x + w / 2 + o, y: c.y + r.h * .35 }, { couleur, epaisseur: 4, ms: 260, delai: i * 70 });
        }
      }
      return 520;
    },
    /** Des plumes qui tournoient de la source vers la cible. */
    plumes({ de, vers, couleur = C.noir, n = 6 }) {
      for (const r of vers) {
        const q = centre(r);
        for (let i = 0; i < n; i++) voyageur(de, { x: q.x + alea(-12, 12), y: q.y + alea(-12, 12) }, { couleur, taille: 11, ms: 460, delai: i * 45, courbe: 70, forme: '60% 40% 60% 40%', rot: alea(0, 90) });
        a.etincelles(r, couleur === C.noir ? '#8a7fa0' : couleur, 6);
      }
      return 460 + n * 45;
    },
    /** La langue de la grenouille : un trait rose qui claque sur la cible. */
    langue({ de, vers, couleur = C.rose }) {
      for (const r of vers) {
        const q = centre(r);
        segment(de, q, { couleur, epaisseur: 9, ms: 360 });
        const b = noeud('fx-v', { width: '22px', height: '22px', background: couleur, borderRadius: '50%', transform: `translate(${q.x - 11}px, ${q.y - 11}px)` });
        anime(b, [{ opacity: 0, transform: `translate(${q.x - 11}px, ${q.y - 11}px) scale(.2)` }, { opacity: 1, transform: `translate(${q.x - 11}px, ${q.y - 11}px) scale(1.2)`, offset: .5 }, { opacity: 0, transform: `translate(${q.x - 11}px, ${q.y - 11}px) scale(.8)` }], { duration: T(360), easing: 'ease-out' });
        vie(b, 360);
      }
      return 380;
    },
    /** Des gouttes qui coulent sur la cible (venin, croissance). */
    gouttes({ vers, couleur = C.vert, n = 6 }) {
      for (const r of vers) {
        for (let i = 0; i < n; i++) {
          const x = r.x + r.w * (.15 + .7 * (i / Math.max(1, n - 1)));
          const d = noeud('fx-v', { width: '6px', height: '10px', background: couleur, borderRadius: '50% 50% 60% 60%', boxShadow: `0 0 5px ${couleur}` });
          anime(d, [
            { transform: `translate(${x}px, ${r.y - 6}px)`, opacity: 0 },
            { transform: `translate(${x}px, ${r.y + r.h * .3}px)`, opacity: 1, offset: .35 },
            { transform: `translate(${x}px, ${r.y + r.h}px)`, opacity: 0 }
          ], { duration: T(620), delay: T(i * 60), easing: 'ease-in' });
          vie(d, 620 + i * 60);
        }
        a.anneau(r, couleur);
      }
      return 620 + n * 60;
    },
    /** Une averse sur tout un plateau. */
    pluie({ vers, couleur = C.cyan }) {
      for (const r of vers) {
        for (let i = 0; i < 16; i++) {
          const x = r.x + Math.random() * r.w;
          const d = noeud('fx-v', { width: '3px', height: '14px', background: couleur, borderRadius: '2px', opacity: 0 });
          anime(d, [
            { transform: `translate(${x}px, ${r.y - 30}px)`, opacity: 0 },
            { transform: `translate(${x}px, ${r.y + r.h * .4}px)`, opacity: .9, offset: .5 },
            { transform: `translate(${x}px, ${r.y + r.h}px)`, opacity: 0 }
          ], { duration: T(560), delay: T(Math.random() * 380), easing: 'ease-in' });
          vie(d, 940);
        }
      }
      return 940;
    },
    /** Un souffle : un anneau net et des eclats qui partent de la cible. */
    souffle({ vers, couleur = C.blanc }) {
      for (const r of vers) { a.anneau(r, couleur, 2); a.etincelles(r, couleur, 8); }
      return 620;
    },
    /** Un faisceau vertical qui tombe sur la cible. */
    faisceau({ vers, couleur = C.or }) {
      for (const r of vers) {
        const c = centre(r);
        const d = noeud('fx-v', { left: (c.x - 12) + 'px', top: '0px', width: '24px', height: c.y + 'px', transformOrigin: '50% 0', background: `linear-gradient(180deg, transparent, ${couleur})`, boxShadow: `0 0 18px ${couleur}`, borderRadius: '12px' });
        anime(d, [
          { transform: 'scaleY(0)', opacity: 0 },
          { transform: 'scaleY(1)', opacity: 1, offset: .35 },
          { transform: 'scaleY(1)', opacity: 0 }
        ], { duration: T(560), easing: 'ease-out' });
        vie(d, 560);
        a.eclair(r, couleur);
      }
      return 600;
    },
    /** Deux yeux qui s'ouvrent (regard, presage, veilleur). */
    yeux({ de, vers, couleur = C.or }) {
      const p = vers && vers[0] ? centre(vers[0]) : de;
      for (const dx of [-16, 16]) {
        const d = noeud('fx-v', { width: '22px', height: '12px', background: '#fff', borderRadius: '50%', boxShadow: `0 0 12px ${couleur}`, border: `3px solid ${couleur}` });
        const t = `translate(${p.x + dx - 11}px, ${p.y - 6}px)`;
        anime(d, [
          { transform: `${t} scaleY(0)`, opacity: 0 },
          { transform: `${t} scaleY(1.2)`, opacity: 1, offset: .25 },
          { transform: `${t} scaleY(1)`, opacity: 1, offset: .7 },
          { transform: `${t} scaleY(0)`, opacity: 0 }
        ], { duration: T(620), easing: 'ease-in-out' });
        vie(d, 620);
      }
      return 640;
    },
    /** Un sablier qui se retourne sur la cible, sable qui coule. */
    sablier({ vers, couleur = C.or }) {
      for (const r of vers) {
        const c = centre(r);
        const d = noeud('fx-v', { color: couleur }, icone('TurnStart', 44));
        const t = `translate(${c.x - 22}px, ${c.y - 22}px)`;
        anime(d, [
          { transform: `${t} rotate(0deg) scale(.4)`, opacity: 0 },
          { transform: `${t} rotate(0deg) scale(1)`, opacity: 1, offset: .25 },
          { transform: `${t} rotate(180deg) scale(1)`, opacity: 1, offset: .7 },
          { transform: `${t} rotate(180deg) scale(1.1)`, opacity: 0 }
        ], { duration: T(760), easing: 'ease-in-out' });
        vie(d, 760);
        a.etincelles(r, couleur, 6);
      }
      return 780;
    },
    /** Un nuage de couleur et une onde au sol : une unite qui arrive. `lourd` fait trembler l'ecran. */
    convocation({ vers, couleur = C.blanc, lourd = false }) {
      for (const r of vers) {
        a.anneau(r, couleur, lourd ? 2 : 1);
        a.etincelles(r, couleur, lourd ? 12 : 7);
      }
      if (lourd) a.secoueEcran(F().ecranSecoussePx, F().ecranSecousseMs);
      return 560;
    },
    /** Des ondes concentriques qui partent d'un point (cor, hurlement, coassement, berceuse). */
    ondes({ de, vers, couleur = C.or }) {
      const p = vers && vers[0] ? centre(vers[0]) : de;
      for (let i = 0; i < 3; i++) {
        const d = noeud('fx-v', { width: '40px', height: '40px', border: `3px solid ${couleur}`, borderRadius: '50%', boxShadow: `0 0 10px ${couleur}` });
        const t = `translate(${p.x - 20}px, ${p.y - 20}px)`;
        anime(d, [
          { transform: `${t} scale(.3)`, opacity: 0 },
          { transform: `${t} scale(1.4)`, opacity: .9, offset: .3 },
          { transform: `${t} scale(3.6)`, opacity: 0 }
        ], { duration: T(700), delay: T(i * 160), easing: 'ease-out' });
        vie(d, 700 + i * 160);
      }
      return 900;
    },
    /** La nuit tombe : un voile sombre sur tout l'ecran (opacite seulement). */
    nuit({ couleur = C.noir, lourd = false }) {
      const d = noeud('fx-v', { left: '0', top: '0', width: '100%', height: '100%', background: `radial-gradient(circle at 50% 50%, transparent 10%, ${couleur} 90%)` });
      anime(d, [{ opacity: 0 }, { opacity: lourd ? .85 : .6, offset: .35 }, { opacity: 0 }], { duration: T(1200), easing: 'ease-in-out' });
      vie(d, 1200);
      if (lourd) a.secoueEcran(F().ecranSecoussePx, F().ecranSecousseMs);
      return 1100;
    },
    /** Des points qui s'enroulent de la source vers la cible (ames, etude, transmigration). */
    spirale({ de, vers, couleur = C.violet, n = 6 }) {
      const q = vers && vers[0] ? centre(vers[0]) : de;
      for (let i = 0; i < n; i++) voyageur(de, q, { couleur, taille: 8, ms: 560, delai: i * 70, courbe: 90 });
      a.anneau({ x: q.x - 20, y: q.y - 20, w: 40, h: 40 }, couleur);
      return 560 + n * 70;
    },
    /** Des facettes de couleur qui tournent (cameleon, prisme, miroir). */
    facettes({ vers }) {
      const cs = [C.rouge, C.or, C.vert, C.cyan, C.violet];
      for (const r of vers) {
        const c = centre(r);
        cs.forEach((col, i) => {
          const d = noeud('fx-v', { width: '16px', height: '16px', background: col, boxShadow: `0 0 8px ${col}` });
          const ang = i * 72;
          const t = rad => `translate(${c.x - 8 + Math.cos((ang * Math.PI) / 180) * rad}px, ${c.y - 8 + Math.sin((ang * Math.PI) / 180) * rad}px)`;
          anime(d, [
            { transform: `${t(4)} rotate(0deg) scale(.3)`, opacity: 0 },
            { transform: `${t(26)} rotate(180deg) scale(1)`, opacity: 1, offset: .5 },
            { transform: `${t(34)} rotate(360deg) scale(.4)`, opacity: 0 }
          ], { duration: T(680), easing: 'ease-out' });
          vie(d, 680);
        });
      }
      return 700;
    },
    /** Des pas qui courent vers la cible (traque). */
    pas({ de, vers, couleur = C.rouge }) {
      const q = vers && vers[0] ? centre(vers[0]) : de;
      for (let i = 0; i < 7; i++) {
        const f = (i + 1) / 8;
        const p = { x: de.x + (q.x - de.x) * f + (i % 2 ? 6 : -6), y: de.y + (q.y - de.y) * f };
        const d = noeud('fx-v', { width: '9px', height: '9px', background: couleur, borderRadius: '50%', boxShadow: `0 0 5px ${couleur}` });
        anime(d, [{ transform: `translate(${p.x}px, ${p.y}px) scale(.3)`, opacity: 0 }, { transform: `translate(${p.x}px, ${p.y}px) scale(1)`, opacity: 1, offset: .3 }, { transform: `translate(${p.x}px, ${p.y}px) scale(1)`, opacity: 0 }], { duration: T(420), delay: T(i * 70) });
        vie(d, 420 + i * 70);
      }
      return 920;
    },
    /** Des bulles qui montent. */
    bulles({ vers, couleur = C.vert }) {
      for (const r of vers) {
        for (let i = 0; i < 7; i++) {
          const x = r.x + r.w * Math.random(), s = alea(8, 16);
          const d = noeud('fx-v', { width: s + 'px', height: s + 'px', border: `2px solid ${couleur}`, borderRadius: '50%' });
          anime(d, [
            { transform: `translate(${x}px, ${r.y + r.h}px) scale(.5)`, opacity: 0 },
            { transform: `translate(${x + alea(-8, 8)}px, ${r.y + r.h * .4}px) scale(1)`, opacity: .9, offset: .5 },
            { transform: `translate(${x}px, ${r.y - 14}px) scale(1.2)`, opacity: 0 }
          ], { duration: T(700), delay: T(i * 70), easing: 'ease-out' });
          vie(d, 700 + i * 70);
        }
      }
      return 1100;
    },
    /** Des colonnes de vent qui montent de la cible. */
    vent({ vers, couleur = C.cyan }) {
      for (const r of vers) {
        for (let i = 0; i < 5; i++) {
          const x = r.x + r.w * (.1 + .8 * (i / 4));
          const d = noeud('fx-v', { width: '3px', height: '26px', background: `linear-gradient(180deg, ${couleur}, transparent)`, borderRadius: '2px' });
          anime(d, [
            { transform: `translate(${x}px, ${r.y + r.h}px)`, opacity: 0 },
            { transform: `translate(${x}px, ${r.y + r.h * .4}px)`, opacity: .9, offset: .4 },
            { transform: `translate(${x}px, ${r.y - 24}px)`, opacity: 0 }
          ], { duration: T(560), delay: T(i * 60), easing: 'ease-out' });
          vie(d, 560 + i * 60);
        }
      }
      return 900;
    },
    /** Une boule de boue qui grossit et s'etale sur la cible. */
    boue({ de, vers, couleur = C.boue }) {
      for (const r of vers) {
        const q = centre(r);
        const d = noeud('fx-v', { width: '34px', height: '34px', background: couleur, borderRadius: '50%', boxShadow: 'inset -6px -6px 0 rgba(0,0,0,.25)' });
        const t = p => `translate(${p.x - 17}px, ${p.y - 17}px)`;
        anime(d, [
          { transform: `${t(de)} scale(.4)`, opacity: 0 },
          { transform: `${t(q)} scale(1)`, opacity: 1, offset: .5 },
          { transform: `${t(q)} scale(2.2)`, opacity: .8, offset: .75 },
          { transform: `${t(q)} scale(2.6)`, opacity: 0 }
        ], { duration: T(700), easing: 'ease-in' });
        vie(d, 700);
        a.etincelles(r, couleur, 8);
      }
      return 720;
    },
    /** Des confettis dores qui retombent. */
    confettis({ vers }) {
      const cs = [C.or, C.rouge, C.vert, C.cyan, C.violet];
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < 14; i++) {
          const d = noeud('fx-v', { width: '6px', height: '9px', background: cs[i % cs.length], borderRadius: '1px' });
          const dx = alea(-50, 50);
          anime(d, [
            { transform: `translate(${c.x}px, ${c.y}px) rotate(0deg)`, opacity: 1 },
            { transform: `translate(${c.x + dx}px, ${c.y - alea(20, 50)}px) rotate(200deg)`, opacity: 1, offset: .4 },
            { transform: `translate(${c.x + dx * 1.3}px, ${c.y + alea(30, 60)}px) rotate(420deg)`, opacity: 0 }
          ], { duration: T(820), easing: 'ease-out' });
          vie(d, 820);
        }
      }
      return 840;
    }
  };
  return briques;
}
