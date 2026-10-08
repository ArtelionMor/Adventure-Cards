// LES VFX DES CARTES : chaque carte a SA signature visuelle, COHERENTE AVEC CE QU'ELLE FAIT ET QUAND.
//
// Une SIGNATURE dit ce qui s'anime a chaque moment de la vie de la carte, tout est facultatif :
//   - `lancer`    : ce qui PART de la carte quand on la joue (un eclair, des plumes, une langue…), vers `vers` ;
//   - `arrivee`   : ce que la CIBLE subit (degats : griffures, boue, faisceau…) ; `soin` et `renfort` : idem pour
//                   un soin ou un renfort. A defaut, les etincelles par defaut ;
//   - `entree`    : l'arrivee de l'unite que la carte a posee (convocation, bulles, nuit…) ;
//   - `attaque`   : quand l'unite ATTAQUE (traînee de vitesse pour Charge, rémanence fantome pour Passe-Murailles,
//                   venin a l'impact) — une entree ou une LISTE d'entrees ;
//   - `mort`      : quand l'unite MEURT (une ame qui s'eleve…) ;
//   - `declenche` : quand son effet SE DECLENCHE sans qu'on la joue — `death` (rale d'agonie), `turnStart`,
//                   `turnEnd`, `regle` (« quand X alors Y ») — chacun est une sous-signature {lancer, arrivee, entree…} ;
//   - `aura`      : l'onde d'une aura, quand son porteur arrive (le halo qui reste est du CSS, `.porte-aura`).
// Chaque entree est `[brique, options]`.
//
// Les signatures sont DERIVEES de la carte (`signatureAuto` : ses effets, ses mots-cles, ses moments, le theme de son
// heros) : une carte dont le texte change change donc d'animation toute seule, et les 120 cartes (base et switch) en ont
// une. `SIGNATURES` ne garde que les ECARTS voulus par le game designer ; il gagne sur le calcul (`signatureDe`).
// La liste, avec le raisonnement carte par carte, est dans `docs/VFX-CARTES.md`. Tout est procedural (CSS/WAAPI,
// transform et opacity seulement) et facile a remplacer le jour ou le game designer livre ses dessins.
//
// `vers` (ce que vise un lancer qui n'a pas de cible designee) : 'ennemi' (le heros adverse), 'allies' (ton
// plateau), 'ennemis' (le plateau adverse), 'main' (ta main), 'pioche' (ta pioche), 'defausse', 'soi' (ton heros).
import { CHARACTERS } from '../config/characters.js';
import { icone } from './icones.js';

const C = {
  or: '#ffc46b', rouge: '#ff4d5e', vert: '#5fe08f', bleu: '#6ec1ff', violet: '#b57cff', blanc: '#ffffff',
  rose: '#ff8fb3', noir: '#2a2236', boue: '#6b8a3a', jaune: '#ffe45e', gris: '#b9b3c9', cyan: '#8fe9ff'
};

export const SIGNATURES = {
  // ---- Médor (Chien, Gardien)
  dog_pup:   { entree: ['convocation', { couleur: '#e8c98f' }], mort: ['ame', { couleur: '#e8c98f' }] },
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
  crow_murder: { lancer: ['plumes', { couleur: C.blanc, n: 8 }], vers: 'ennemis', arrivee: ['souffle', { couleur: C.blanc }] },
  crow_omen:   { lancer: ['yeux', { couleur: C.or }], vers: 'pioche' },
  crow_raven:  { entree: ['nuit', { lourd: true, couleur: C.noir }] },
  // ---- Bulle (Grenouille, Venin)
  frog_tad:    { entree: ['bulles', { couleur: C.vert }] },
  frog_tongue: { lancer: ['langue', { couleur: C.rose }], vers: 'ennemi', arrivee: ['gouttes', { couleur: C.vert }] },
  frog_venom:  { entree: ['convocation', { couleur: C.vert }], arrivee: ['gouttes', { couleur: C.vert }] },
  frog_swamp:  { lancer: ['boue', { couleur: C.boue }], vers: 'ennemis', arrivee: ['boue', { couleur: C.boue }] },
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
  cam2_ball:   { lancer: ['confettis', {}], vers: 'allies', arrivee: ['confettis', {}] },
  // ---- Les ECARTS voulus (cartes ou le calcul automatique ne dit pas assez)
  dog_alpha:  { lancer: ['halo', { couleur: C.or }], vers: 'allies', arrivee: ['montee', { symbole: 'Buff', couleur: C.or }], entree: ['convocation', { couleur: C.or, lourd: true }] },
  dog2_alpha: { lancer: ['halo', { couleur: C.rouge }], vers: 'allies', arrivee: ['montee', { symbole: 'Buff', couleur: C.rouge }], entree: ['convocation', { couleur: C.rouge, lourd: true }] },
  fox_king:   { lancer: ['facettes', {}], vers: 'allies' }
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
  confettis: "Des confettis dorés qui retombent.",
  trainee: "Des traits de vitesse derrière une unité qui charge (Charge).",
  fantome: "Des images translucides laissées en arrière : l'unité passe à travers (Passe-Murailles).",
  ame: "Une âme qui s'élève là où l'unité est morte (râle d'agonie).",
  halo: "L'onde d'une aura ou d'un renfort collectif : un anneau part du porteur et touche chaque allié.",
  montee: "Des icônes qui montent de la cible (soin, renfort, armure, mana).",
  retour: "Une carte qui vole de la cible vers ta main (une unité renvoyée)."
};

/**
 * Les briques, construites sur l'API d'`effets.js` (`a`) : elles ne connaissent ni le moteur ni l'ecran, seulement
 * des POINTS (`{ x, y }` dans le repere de l'ecran de combat) et des RECTANGLES (`{ x, y, w, h }`).
 * Chacune rend sa duree (ms, vitesse x1) pour que le film sache quand elle est finie.
 */
export function creeBriques(a) {
  const { anime, T, ephemere, couche, F } = a;   // + a.apres, a.cloneUnite, a.rectMain (voir effets.js)
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
    },
    /** Des traits de vitesse derriere une unite qui CHARGE (Charge). */
    trainee({ de, vers, couleur = C.blanc }) {
      const q = vers && vers[0] ? centre(vers[0]) : { x: de.x, y: de.y - 60 };
      const dx = q.x - de.x, dy = q.y - de.y, long = Math.hypot(dx, dy) || 1, ux = dx / long, uy = dy / long;
      for (let i = -2; i <= 2; i++) {
        const p = { x: de.x - uy * i * 9, y: de.y + ux * i * 9 };
        const l = 34 + (2 - Math.abs(i)) * 8;
        segment(p, { x: p.x - ux * l, y: p.y - uy * l }, { couleur, epaisseur: 2, ms: 320, delai: 30 + Math.abs(i) * 25, lueur: false });
      }
      return 460;
    },
    /** Des images qui restent en arriere, translucides : l'unite passe A TRAVERS (Passe-Murailles, Elusif). */
    fantome({ noeud, de, vers, couleur = C.cyan }) {
      if (!noeud || !a.cloneUnite) return 0;
      const q = vers && vers[0] ? centre(vers[0]) : { x: de.x, y: de.y - 60 };
      for (let i = 1; i <= 3; i++) {
        const g = a.cloneUnite(noeud);
        if (!g) continue;
        g.style.boxShadow = `0 0 12px ${couleur}`;
        g.style.borderRadius = '10px';
        const dx = (q.x - de.x) * i * .2, dy = (q.y - de.y) * i * .2;
        anime(g, [
          { transform: 'translate(0,0)', opacity: 0 },
          { transform: `translate(${dx}px, ${dy}px)`, opacity: .5 - i * .1, offset: .3 },
          { transform: `translate(${dx * 1.5}px, ${dy * 1.5}px)`, opacity: 0 }
        ], { duration: T(560), delay: T(i * 80), easing: 'ease-out' });
        vie(g, 560 + i * 80);
      }
      return 800;
    },
    /** Une ame qui s'eleve de l'endroit ou l'unite est morte. */
    ame({ vers, couleur = '#e9e6f2' }) {
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < 3; i++) {
          const s = 15 - i * 3, x = c.x + (i - 1) * 12;
          const d = noeud('fx-v', { width: s + 'px', height: s + 'px', borderRadius: '50%', background: couleur, boxShadow: `0 0 14px ${couleur}` });
          anime(d, [
            { transform: `translate(${x - s / 2}px, ${c.y}px) scale(.5)`, opacity: 0 },
            { transform: `translate(${x + 8 - s / 2}px, ${c.y - 32}px) scale(1)`, opacity: .9, offset: .4 },
            { transform: `translate(${x - 6 - s / 2}px, ${c.y - 84}px) scale(.6)`, opacity: 0 }
          ], { duration: T(950), delay: T(i * 130), easing: 'ease-out' });
          vie(d, 950 + i * 130);
        }
      }
      return 1100;
    },
    /** L'onde d'une AURA : un anneau part du porteur et touche chacun de ceux qu'il protege, l'un apres l'autre. */
    halo({ de, vers, couleur = C.or }) {
      a.anneau({ x: de.x - 22, y: de.y - 22, w: 44, h: 44 }, couleur, 2);
      for (const r of vers || []) {
        const c = centre(r);
        const dist = Math.hypot(c.x - de.x, c.y - de.y);
        a.apres(Math.min(520, 120 + dist * 1.1), () => a.anneau(r, couleur));
      }
      return 800;
    },
    /** Des icones qui MONTENT de la cible (soin, renfort, armure, mana). */
    montee({ vers, symbole = 'Buff', couleur = C.or, n = 3 }) {
      for (const r of vers) {
        for (let i = 0; i < n; i++) {
          const x = r.x + r.w * (.2 + .3 * i) - 11;
          const d = noeud('fx-v', { color: couleur, filter: 'drop-shadow(0 0 3px rgba(0,0,0,.6))' }, icone(symbole, 22));
          anime(d, [
            { transform: `translate(${x}px, ${r.y + r.h * .7}px)`, opacity: 0 },
            { transform: `translate(${x}px, ${r.y + r.h * .3}px)`, opacity: 1, offset: .35 },
            { transform: `translate(${x}px, ${r.y - 22}px)`, opacity: 0 }
          ], { duration: T(760), delay: T(i * 110), easing: 'ease-out' });
          vie(d, 760 + i * 110);
        }
        a.etincelles(r, couleur, 4);
      }
      return 1000;
    },
    /** Une carte qui vole de la cible vers ta main (une unite renvoyee). */
    retour({ vers }) {
      if (!a.rectMain) return 0;
      const m = centre(a.rectMain());
      for (const r of vers) {
        const c = centre(r);
        const d = noeud('fx-v', { width: '24px', height: '32px', borderRadius: '4px', border: `2px solid ${C.or}`, background: 'rgba(54,44,71,.9)', boxShadow: `0 0 10px ${C.or}` });
        const t = (p, s) => `translate(${p.x - 12}px, ${p.y - 16}px) scale(${s})`;
        anime(d, [{ transform: t(c, 1.6), opacity: 0 }, { transform: t(c, 1.6), opacity: 1, offset: .15 }, { transform: t(m, .7), opacity: 0 }], { duration: T(620), easing: 'ease-in-out' });
        vie(d, 620);
      }
      return 640;
    }
  };
  return briques;
}

// ============================================================ LA DERIVATION : une signature depuis la carte elle-meme
// Le THEME d'un heros (sa famille) : sa couleur, le projectile de ses degats directs, ce que la cible subit.
const THEMES = {
  Chien: { c: '#e8c98f', proj: null, impact: 'souffle', ic: C.or },
  Chat: { c: C.rose, proj: null, impact: 'griffures', ic: C.rose },
  Corbeau: { c: C.gris, proj: 'plumes', impact: 'souffle', ic: C.gris },
  Faucon: { c: C.blanc, proj: 'plumes', impact: 'souffle', ic: C.blanc },
  Grenouille: { c: C.vert, proj: 'boue', impact: 'gouttes', ic: C.vert },
  Chouette: { c: C.violet, proj: 'yeux', impact: 'faisceau', ic: C.or },
  Hibou: { c: C.bleu, proj: 'yeux', impact: 'faisceau', ic: C.bleu },
  Cameleon: { c: C.cyan, proj: 'spirale', impact: 'facettes', ic: C.cyan },
  defaut: { c: C.or, proj: null, impact: 'souffle', ic: C.or }
};

const ENNEMIS = ['allEnemyUnits', 'randomEnemyUnit', 'enemyUnits', 'enemyUnit', 'allUnits', 'randomEnemyAny'];
const ALLIES = ['allAllies', 'sameTypeAllies', 'otherAllies', 'allyUnit', 'randomAllyUnit', 'randomAllyAny', 'self'];

/** Ce qu'une LISTE D'EFFETS fait voir : un lancer, une arrivee, une entree — selon chaque effet et le theme. */
function deOps(ops, th) {
  const s = {};
  for (const e of ops || []) {
    const t = e.t || e.target;   // la cible d'un effet s'ecrit `t` dans les donnees des cartes
    const versEnnemis = ENNEMIS.includes(t), versAllies = ALLIES.includes(t), versToi = t === 'ownHero';
    switch (e.op) {
      case 'dmg':
        if (!s.lancer && th.proj) { s.lancer = [th.proj, { couleur: th.c }]; s.vers = versEnnemis ? 'ennemis' : 'ennemi'; }
        s.arrivee = s.arrivee || [th.impact, { couleur: th.ic }];
        if (!s.vers) s.vers = versEnnemis ? 'ennemis' : 'ennemi';
        break;
      case 'heal':
        s.soin = s.soin || ['montee', { symbole: 'Heal', couleur: C.vert }];
        break;
      case 'buff': case 'renforce_les_cartes':
        if (!s.lancer) {
          const tous = versAllies && t !== 'self' && t !== 'allyUnit' && t !== 'randomAllyUnit';
          s.lancer = tous ? ['halo', { couleur: C.or }] : ['ondes', { couleur: C.or }];
          s.vers = e.op === 'renforce_les_cartes' ? 'main' : 'allies';
        }
        s.renfort = s.renfort || ['montee', { symbole: 'Buff', couleur: C.or }];
        break;
      case 'armor':
        if (!s.lancer) { s.lancer = ['montee', { symbole: 'Armor', couleur: C.bleu }]; s.vers = 'soi'; }
        break;
      case 'mana': case 'mana_au_prochain_tour':
        if (!s.lancer) { s.lancer = ['montee', { symbole: 'Mana', couleur: C.bleu }]; s.vers = 'soi'; }
        break;
      case 'reduit_le_cout_de':
        if (!s.lancer) { s.lancer = ['montee', { symbole: 'Mana', couleur: C.bleu }]; s.vers = 'main'; }
        break;
      case 'draw':
        if (!s.lancer) { s.lancer = ['spirale', { couleur: th.c, n: 4 }]; s.vers = 'main'; }
        break;
      case 'cree':
        if (!s.lancer) { s.lancer = ['spirale', { couleur: th.c, n: 5 }]; s.vers = 'main'; }
        break;
      case 'melange_a_la_pioche':
        if (!s.lancer) { s.lancer = ['spirale', { couleur: C.bleu, n: 5 }]; s.vers = 'pioche'; }
        break;
      case 'summon': case 'pose_sur_le_plateau':
        s.entree = s.entree || ['convocation', { couleur: th.c }];
        if (!s.lancer) { s.lancer = ['ondes', { couleur: th.c }]; s.vers = 'allies'; }
        break;
      case 'detruit':
        if (t === 'allEnemyUnits' || t === 'allUnits') { s.lancer = ['nuit', { couleur: C.noir }]; s.vers = 'ennemis'; }
        else if (!s.lancer) { s.lancer = [th.proj || 'yeux', { couleur: th.c }]; s.vers = 'ennemi'; }
        s.arrivee = s.arrivee || ['faisceau', { couleur: C.violet }];
        break;
      case 'copie': case 'switch':
        s.lancer = s.lancer || ['facettes', {}]; s.vers = s.vers || 'allies';
        break;
      case 'renvoie_en_main':
        if (!s.lancer) { s.lancer = ['spirale', { couleur: th.c, n: 5 }]; s.vers = 'main'; }
        break;
      case 'prendre_le_controle':
        if (!s.lancer) { s.lancer = ['spirale', { couleur: C.violet, n: 7 }]; s.vers = 'allies'; }
        break;
      case 'choisir':
        s.lancer = s.lancer || ['yeux', { couleur: C.or }]; s.vers = s.vers || 'soi';
        break;
      default: break;
    }
    if (versToi && !s.vers) s.vers = 'soi';
  }
  return s;
}

/** La signature qu'on DEDUIT d'une carte : ses effets (a la pose, a la mort, en debut/fin de tour, sur evenement), ses mots-cles, son aura. */
export function signatureAuto(card, espece) {
  const th = THEMES[espece] || THEMES.defaut;
  const s = deOps(card.play, th);
  if (card.type === 'ally') s.entree = s.entree || ['convocation', { couleur: th.c, lourd: (card.cost || 0) >= 5 }];
  // Ce qu'elle fait QUAND ELLE ATTAQUE : ses mots-cles.
  const attaque = [];
  const cles = (card.keys || []).map(k => String(k).split(':')[0]);
  if (cles.includes('Charge')) attaque.push(['trainee', { couleur: th.c === C.blanc ? C.cyan : C.blanc }]);
  if (cles.includes('passe_murailles')) attaque.push(['fantome', { couleur: C.cyan }]);
  if (cles.includes('Venin')) attaque.push(['gouttes', { couleur: C.vert, quand: 'impact' }]);
  if (attaque.length) s.attaque = attaque;
  // Quand elle MEURT, puis ce que sa mort declenche.
  const declenche = {};
  if ((card.death || []).length) { s.mort = ['ame', { couleur: th.c }]; declenche.death = deOps(card.death, th); }
  if ((card.turnStart || []).length) declenche.turnStart = deOps(card.turnStart, th);
  if ((card.turnEnd || []).length) declenche.turnEnd = deOps(card.turnEnd, th);
  // Les regles « quand X alors Y » : tout champ `on_*` qui porte des effets.
  for (const [k, v] of Object.entries(card)) {
    if (k.startsWith('on_') && Array.isArray(v) && v.length) { declenche[k] = deOps(v, th); declenche.regle = declenche.regle || declenche[k]; }
  }
  if (Object.keys(declenche).length) s.declenche = declenche;
  if (card.aura) s.aura = ['halo', { couleur: th.c }];
  return s;
}

let index = null;
/** `id` -> { carte, espece } pour les 120 cartes (base et switch). */
function carteDe(id) {
  if (!index) {
    index = new Map();
    for (const h of CHARACTERS) for (const c of [...h.cards, ...(h.switches || [])]) index.set(c.id, { carte: c, espece: h.species });
  }
  return index.get(id) || null;
}

const memo = new Map();
/** La signature d'une carte : ce qu'on en deduit, puis les ECARTS voulus (`SIGNATURES`) par-dessus. `null` si on ne connait pas la carte. */
export function signatureDe(id) {
  if (!id) return null;
  if (memo.has(id)) return memo.get(id);
  const k = carteDe(id);
  if (!k && !SIGNATURES[id]) { memo.set(id, null); return null; }
  const auto = k ? signatureAuto(k.carte, k.espece) : {};
  const ecart = SIGNATURES[id] || {};
  const sig = { ...auto, ...ecart, declenche: { ...(auto.declenche || {}), ...(ecart.declenche || {}) } };
  memo.set(id, sig);
  return sig;
}
