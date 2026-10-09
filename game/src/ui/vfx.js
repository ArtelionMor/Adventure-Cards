// LES VFX DES CARTES : chaque carte a SA signature visuelle, UNIQUE, coherente avec ce qu'elle fait et QUAND.
//
// Une SIGNATURE dit ce qui s'anime a chaque moment de la vie de la carte, tout est facultatif :
//   - `lancer`    : ce qui PART de la carte quand on la joue (un eclair, des plumes, une langue…), vers `vers` ;
//                   `de` dit d'ou il part si ce n'est pas la carte (« ennemi » : du heros adverse, pour un vol) ;
//   - `arrivee`   : ce que la CIBLE subit (degats : griffures, boue, faisceau…) ; `soin` et `renfort` : idem pour
//                   un soin ou un renfort. A defaut, les etincelles par defaut ;
//   - `entree`    : l'arrivee de l'unite que la carte a posee (convocation, bulles, nuit…) ;
//   - `attaque`   : quand l'unite ATTAQUE (traînee, rémanence, crocs ou venin a l'impact : `quand: 'impact'`) ;
//   - `mort`      : quand l'unite MEURT (une ame, une explosion, un nuage de fumee…) ;
//   - `declenche` : quand son effet SE DECLENCHE sans qu'on la joue — `death` (rale d'agonie), `turnStart`,
//                   `turnEnd`, `regle` (« quand X alors Y ») — chacun est une sous-signature {lancer, arrivee, entree…} ;
//   - `aura`      : l'onde d'une aura, quand son porteur arrive (`cible: 'ennemis'` pour une aura qui frappe en face) ;
//                   le halo qui reste est du CSS (`.porte-aura`).
// Chaque entree est `[brique, options]`, ou une LISTE d'entrees jouees ensemble.
//
// `SIGNATURES` donne une signature A CHACUNE des 120 cartes des heros (base et switch), pensee carte par carte et
// toutes DIFFERENTES (`node scripts/test-vfx.mjs` le verifie). `signatureAuto` (calculee depuis les effets, les
// mots-cles et le theme du heros) reste en dessous : elle comble les moments qu'une signature ne dit pas, et sert
// a une carte qu'on ajouterait demain. La liste commentee est dans `docs/VFX-CARTES.md`.
// Tout est procedural (CSS/WAAPI, transform et opacity seulement) et facile a remplacer le jour ou le game
// designer livre ses dessins.
//
// `vers` (ce que vise un lancer qui n'a pas de cible designee) : 'ennemi' (le heros adverse), 'allies' (ton
// plateau), 'ennemis' (le plateau adverse), 'main' (ta main), 'pioche' (ta pioche), 'defausse', 'soi' (ton heros).
import { CHARACTERS } from '../config/characters.js';
import { icone } from './icones.js';

const C = {
  or: '#ffc46b', rouge: '#ff4d5e', vert: '#5fe08f', bleu: '#6ec1ff', violet: '#b57cff', blanc: '#ffffff',
  rose: '#ff8fb3', noir: '#2a2236', boue: '#6b8a3a', jaune: '#ffe45e', gris: '#b9b3c9', cyan: '#8fe9ff',
  beige: '#e8c98f', creme: '#f4ead2', orange: '#ffb347', sang: '#c0392b', lune: '#f4f0d8', magenta: '#ff5fa0',
  lilas: '#d8b3ff', poison: '#9b5fe0', menthe: '#9fffd0', ciel: '#9fe7ff'
};
const ARC = ['#ff4d5e', '#ffb347', '#ffe45e', '#5fe08f', '#6ec1ff', '#b57cff'];

// ============================================================ LES 120 SIGNATURES
export const SIGNATURES = {
  // ---- Médor (Chien, Gardien) : or et beige, pattes, os, sifflet, aboiements
  dog_pup: { entree: ['pattes', { couleur: C.beige, n: 4 }], mort: ['ame', { couleur: C.beige }],
    declenche: { death: { entree: [['aboiement', { couleur: C.or }], ['convocation', { couleur: C.beige }]] } } },
  dog_guard: { entree: ['convocation', { couleur: C.gris, lourd: true }], aura: ['halo', { couleur: C.beige, symbole: 'Health' }] },
  dog_growl: { lancer: ['notes', { couleur: C.or, n: 6 }], vers: 'allies', renfort: ['montee', { symbole: 'Buff', couleur: C.or, n: 2 }], entree: ['pattes', { couleur: C.beige, n: 3 }] },
  dog_lick: { lancer: ['pattes', { couleur: C.or, n: 7, chemin: true }], vers: 'allies', entree: ['descente', { couleur: '#a8e0ff' }] },
  dog_pack: { lancer: ['aboiement', { couleur: C.or, n: 2 }], vers: 'allies', entree: ['pattes', { couleur: '#d9a066', n: 5 }] },
  dog_bite: { entree: ['aboiement', { couleur: C.rouge, petit: true }], attaque: [['crocs', { quand: 'impact', petit: true }], ['trainee', { couleur: C.rouge }]] },
  dog_alpha: { entree: [['aboiement', { couleur: C.or, grand: true }], ['convocation', { couleur: C.or, lourd: true }]], lancer: ['halo', { couleur: C.or, symbole: 'Buff' }], vers: 'allies', renfort: ['montee', { symbole: 'Buff', couleur: C.or, n: 1 }] },
  dog_bone: { entree: ['os', { couleur: C.creme }] },
  dog_shield: { lancer: ['notes', { couleur: C.orange, n: 4, grosses: true }], vers: 'allies', renfort: ['montee', { symbole: 'Charge', couleur: C.orange, n: 2 }], entree: ['convocation', { couleur: C.orange }] },
  dog_bark: { lancer: ['aboiement', { couleur: C.or, n: 3 }], vers: 'allies', entree: ['convocation', { couleur: C.or, lourd: true }] },
  // ---- Felix (Chat, Mille coupures) : rose et violet, griffes, etoiles de magie, cartes
  cat_claw: { entree: ['griffures', { couleur: C.rose, n: 2 }], attaque: [['trainee', { couleur: C.rose }]],
    declenche: { regle: { lancer: ['etoiles', { couleur: C.rose, n: 4 }], vers: 'ennemi', arrivee: ['griffures', { couleur: C.rose, n: 1 }] } } },
  cat_alley: { entree: ['fumee', { couleur: '#9aa0b8' }], attaque: [['fantome', { couleur: '#9ad0ff' }], ['trainee', { couleur: '#ccd6ff' }]],
    declenche: { regle: { lancer: ['cartes', { couleur: C.rose, n: 1 }], vers: 'main' } } },
  cat_pounce: { arrivee: ['griffures', { couleur: C.magenta, n: 3, grand: true }] },
  cat_nine: { lancer: [['griffures', { couleur: C.magenta, n: 5 }], ['cartes', { couleur: C.rose, n: 7 }]], vers: 'main' },
  cat_shadow: { entree: ['etoiles', { couleur: C.violet, n: 8 }], lancer: ['cartes', { couleur: C.violet, n: 5 }], vers: 'pioche' },
  cat_scratch: { lancer: ['pattes', { couleur: C.rose, n: 8, chemin: true }], vers: 'ennemi', arrivee: ['griffures', { couleur: C.magenta, n: 4 }] },
  cat_hunt: { arrivee: ['pattes', { couleur: C.rose, n: 1, grand: true }] },
  cat_curio: { entree: ['etoiles', { couleur: C.bleu, n: 4 }],
    declenche: { regle: { lancer: ['montee', { symbole: 'Armor', couleur: C.bleu, n: 2 }], vers: 'soi' } } },
  cat_trap: { entree: ['convocation', { couleur: C.lilas, lourd: true }], attaque: [['trainee', { couleur: C.lilas }], ['fantome', { couleur: C.lilas }]],
    declenche: { regle: { lancer: ['cartes', { couleur: C.lilas, n: 1 }], vers: 'main', arrivee: ['griffures', { couleur: C.lilas, n: 2 }] } } },
  cat_king: { entree: [['etoiles', { couleur: C.or, n: 12 }], ['convocation', { couleur: C.violet, lourd: true }]], attaque: [['fantome', { couleur: C.or }], ['trainee', { couleur: C.or }]],
    declenche: { regle: { entree: ['etoiles', { couleur: C.violet, n: 5 }] } } },
  // ---- Corax (Corbeau, Filou) : noir et gris, plumes, becs, nuees, yeux, cartes volees
  crow_peck: { lancer: ['bec', { couleur: C.gris }], vers: 'ennemi', arrivee: ['plumes', { couleur: C.noir, n: 3 }] },
  crow_scout: { entree: ['yeux', { couleur: C.violet }], declenche: { regle: { lancer: ['cartes', { couleur: C.gris, n: 1 }], vers: 'main' } } },
  crow_murder: { lancer: ['nuee', { couleur: C.noir, n: 14 }], vers: 'ennemis', arrivee: ['plumes', { couleur: C.noir, n: 2 }] },
  crow_omen: { lancer: [['yeux', { couleur: C.or }], ['cartes', { couleur: C.violet, n: 10, melange: true }]], vers: 'pioche' },
  crow_raven: { entree: [['ombre_ailes', { couleur: '#1a1424' }], ['convocation', { couleur: C.noir, lourd: true }]],
    declenche: { regle: { lancer: ['cartes', { couleur: C.violet, n: 1 }], vers: 'main' } } },
  crow_thief: { entree: ['pieces', { couleur: C.or, n: 7 }], lancer: ['montee', { symbole: 'Mana', couleur: C.bleu, n: 2 }], vers: 'soi' },
  crow_curse: { lancer: ['yeux', { couleur: C.poison, un: true }], vers: 'ennemi', arrivee: ['faisceau', { couleur: C.poison }] },
  crow_feather: { entree: ['plume_douce', { couleur: C.noir, n: 3 }], declenche: { regle: { renfort: ['montee', { symbole: 'Buff', couleur: '#9b8fd0', n: 1 }] } } },
  crow_swarm: { entree: ['nuee', { couleur: C.noir, n: 5 }], declenche: { turnStart: { lancer: ['cartes', { couleur: C.gris, n: 2 }], vers: 'pioche' } } },
  crow_night: { lancer: [['nuit', { couleur: '#05030a', lourd: true }], ['nuee', { couleur: '#05030a', n: 20 }]], vers: 'ennemis' },
  // ---- Bulle (Grenouille, Venin) : vert et violet poison, langues, gouttes, boue, bulles
  frog_tad: { entree: ['bulles', { couleur: C.vert, n: 5 }] },
  frog_tongue: { lancer: ['langue', { couleur: C.rose }], vers: 'ennemi', arrivee: ['gouttes', { couleur: C.vert }], renfort: ['montee', { symbole: 'Buff', couleur: C.vert, n: 2 }] },
  frog_venom: { entree: ['gouttes', { couleur: C.poison }], attaque: [['gouttes', { couleur: C.poison, quand: 'impact' }]], renfort: ['bulles', { couleur: C.poison, n: 4 }] },
  frog_swamp: { lancer: ['boue', { couleur: C.boue }], vers: 'ennemis', arrivee: ['boue', { couleur: C.boue, petit: true }] },
  frog_toad: { entree: [['convocation', { couleur: '#8d8d8d', lourd: true }], ['fumee', { couleur: '#a89f8a' }]] },
  frog_prince: { entree: ['couronne', { couleur: C.or }], lancer: ['cartes', { couleur: C.vert, n: 2 }], vers: 'main',
    declenche: { regle: { lancer: ['halo', { couleur: C.or }], vers: 'main' } } },
  frog_spit: { entree: ['bulles', { couleur: C.menthe, n: 6 }], soin: ['montee', { symbole: 'Heal', couleur: C.vert, n: 3 }], renfort: ['gouttes', { couleur: C.menthe }] },
  frog_lily: { entree: ['nenuphar', { couleur: C.vert }], mort: ['ame', { couleur: C.vert }],
    declenche: { death: { lancer: ['montee', { symbole: 'Armor', couleur: C.bleu, n: 2 }], vers: 'soi', entree: ['bulles', { couleur: C.vert, n: 4 }] } } },
  frog_brew: { lancer: ['fiole', { couleur: C.poison }], vers: 'allies', renfort: ['gouttes', { couleur: C.poison, n: 8 }] },
  frog_leap: { lancer: ['bond', { couleur: C.vert }], vers: 'allies', renfort: ['montee', { symbole: 'Charge', couleur: C.vert, n: 2 }] },
  // ---- Athéna (Chouette, Contrôle) : or et violet de nuit, livres, regards, serres, constellations
  owl_study: { lancer: [['livre', { couleur: C.or }], ['cartes', { couleur: C.or, n: 1 }]], vers: 'main' },
  owl_scholar: { entree: ['livre', { couleur: C.violet }] },
  owl_gaze: { lancer: ['yeux', { couleur: C.or }], vers: 'ennemi', arrivee: ['faisceau', { couleur: C.or }] },
  owl_wisdom: { lancer: [['ombre_ailes', { couleur: '#20183a' }], ['serres', { couleur: C.or }]], vers: 'ennemi' },
  owl_night: { entree: [['constellation', { couleur: '#e8e0ff' }], ['nuit', { couleur: '#120a24', lourd: true }]], lancer: ['cartes', { couleur: C.violet, n: 8, melange: true }], vers: 'pioche' },
  owl_focus: { lancer: ['rafale', { couleur: '#e8e0ff', retour: true }], vers: 'ennemi' },
  owl_lecture: { entree: ['tourbillon', { couleur: C.cyan }], lancer: ['tourbillon', { couleur: C.cyan, retour: true }], vers: 'ennemi' },
  owl_watch: { entree: ['yeux', { couleur: '#9fd0ff' }], declenche: { regle: { lancer: ['cartes', { couleur: '#9fd0ff', n: 1 }], vers: 'main' } } },
  owl_storm: { lancer: ['orage', { couleur: C.or }], vers: 'ennemis' },
  owl_arch: { entree: ['couronne', { couleur: C.violet, grand: true, lourd: true }], declenche: { regle: { arrivee: ['faisceau', { couleur: C.violet }] } } },
  // ---- Miracle (Caméléon, Support) : cyan et arc-en-ciel, eclats de miroir, langues, hypnose
  fox_kit: { entree: ['eclats', { couleur: C.cyan, sens: 'dedans' }] },
  fox_dash: { lancer: ['fumee', { couleur: '#c9b6ff', grand: true }], vers: 'ennemi' },
  fox_snare: { entree: ['mouches', {}], lancer: ['langue', { couleur: '#ff7fb0' }], vers: 'ennemis', arrivee: ['eclats', { couleur: '#ff7fb0', petit: true }], renfort: ['montee', { symbole: 'Buff', couleur: C.cyan, n: 1 }] },
  fox_raid: { lancer: ['cartes', { couleur: C.cyan, n: 3, eventail: true }], vers: 'main' },
  fox_wild: { lancer: ['piece', { couleur: C.or }], vers: 'allies' },
  fox_cunning: { entree: ['arcenciel', {}], aura: ['halo', { couleur: C.cyan, symbole: 'Copy' }] },
  fox_ambush: { lancer: ['hypnose', { couleur: C.violet }], vers: 'ennemi' },
  fox_bandit: { lancer: ['langue', { couleur: '#ff4fa0', epaisseur: 13 }], vers: 'ennemi', arrivee: ['eclats', { couleur: '#ff4fa0' }] },
  fox_frenzy: { entree: ['tambour', { couleur: C.cyan }], declenche: { regle: { renfort: ['montee', { symbole: 'Buff', couleur: C.cyan, n: 1 }] } } },
  fox_king: { lancer: [['arcenciel', { grand: true }], ['facettes', {}]], vers: 'allies' },
  // ---- Croc (Chien, Meute) : rouge sang, lune, crocs, pattes qui courent
  dog2_cub: { entree: ['pattes', { couleur: C.rouge, n: 3, petit: true }], attaque: [['crocs', { quand: 'impact', petit: true, couleur: '#ffe0e0' }], ['trainee', { couleur: '#ff9a9a' }]] },
  dog2_hunt: { lancer: ['pattes', { couleur: C.rouge, n: 6, chemin: true }], vers: 'allies', renfort: ['montee', { symbole: 'Charge', couleur: C.rouge, n: 2 }] },
  dog2_beater: { entree: ['aboiement', { couleur: C.rouge }], declenche: { regle: { arrivee: ['pattes', { couleur: C.rouge, n: 1, grand: true }] } } },
  dog2_pack: { lancer: ['hurlement', { couleur: C.rouge }], vers: 'allies', entree: ['pattes', { couleur: C.rouge, n: 2 }] },
  dog2_alpha: { entree: ['lune', { couleur: C.lune, hurle: true }], lancer: ['halo', { couleur: C.rouge, symbole: 'Attack' }], vers: 'allies',
    attaque: [['crocs', { quand: 'impact', grand: true }], ['trainee', { couleur: C.rouge }]] },
  dog2_kami: { attaque: [['trainee', { couleur: C.orange }]], mort: ['explosion', { couleur: C.orange }],
    declenche: { death: { arrivee: ['explosion', { couleur: C.orange, petit: true }] } } },
  dog2_curee: { lancer: ['pattes', { couleur: C.sang, n: 8, chemin: true }], vers: 'ennemi', arrivee: ['crocs', { couleur: '#fff' }], renfort: ['montee', { symbole: 'Buff', couleur: C.rouge, n: 2 }] },
  dog2_queen: { entree: ['lune', { couleur: '#ffb0b0', petite: true }], attaque: [['trainee', { couleur: '#ffb0b0' }]],
    declenche: { regle: { renfort: ['montee', { symbole: 'Attack', couleur: C.rouge, n: 2 }] } } },
  dog2_feast: { lancer: ['crocs', { couleur: '#fff', grand: true, rouge: true }], vers: 'allies', arrivee: ['souffle', { couleur: C.sang }] },
  dog2_moon: { lancer: ['lune', { couleur: C.sang, grand: true, nuit: true }], vers: 'allies', renfort: ['montee', { symbole: 'Attack', couleur: C.sang, n: 2 }] },
  // ---- Mistigri (Chat, Maraudeur) : violet de nuit, fumee, pieces d'or, ombres
  cat2_kit: { entree: ['fumee', { couleur: '#8a7fb0', petit: true }], attaque: [['fantome', { couleur: '#8a7fb0' }], ['trainee', { couleur: '#b3a0ff' }]],
    declenche: { regle: { renfort: ['montee', { symbole: 'Attack', couleur: '#b3a0ff', n: 1 }] } } },
  cat2_stray: { entree: ['convocation', { couleur: '#c9a0ff' }], attaque: [['trainee', { couleur: '#c9a0ff' }]], mort: ['ame', { couleur: '#c9a0ff' }],
    declenche: { death: { lancer: ['cartes', { couleur: '#c9a0ff', n: 1 }], vers: 'main' } } },
  cat2_sneak: { lancer: ['spirale', { couleur: C.violet, n: 4 }], vers: 'allies', renfort: ['clignote', {}] },
  cat2_burglar: { entree: ['fumee', { couleur: '#556070' }], attaque: [['fantome', { couleur: '#8fa3c8' }], ['trainee', { couleur: '#8fa3c8' }]],
    declenche: { regle: { lancer: ['pieces', { couleur: C.or, n: 4 }], vers: 'soi' } } },
  cat2_lord: { entree: [['yeux', { couleur: C.or }], ['convocation', { couleur: C.violet, lourd: true }]], attaque: [['fantome', { couleur: C.violet }], ['trainee', { couleur: C.or }]],
    declenche: { regle: { arrivee: ['griffures', { couleur: C.violet, n: 3 }] } } },
  cat2_ghost: { entree: ['fumee', { couleur: '#3a3350' }], attaque: [['fantome', { couleur: '#3a3350' }]], mort: ['fumee', { couleur: '#3a3350', grand: true }],
    declenche: { death: { lancer: ['cartes', { couleur: C.rose, n: 1 }], vers: 'main' } } },
  cat2_matriarch: { entree: ['pattes', { couleur: '#ffb3d1', n: 6, petit: true }], declenche: { regle: { entree: ['fumee', { couleur: '#b3a0ff', petit: true }] } } },
  cat2_yowl: { lancer: [['lune', { couleur: C.lune, petite: true }], ['notes', { couleur: C.violet, n: 8 }]], vers: 'allies', renfort: ['montee', { symbole: 'Buff', couleur: C.violet, n: 1 }] },
  cat2_pick: { entree: ['fumee', { couleur: '#777766', petit: true }], attaque: [['trainee', { couleur: '#aaaabb' }]], lancer: ['cartes', { couleur: C.violet, n: 1 }], vers: 'main', de: 'pioche' },
  cat2_roof: { entree: ['couronne', { couleur: C.violet }], aura: ['halo', { couleur: C.violet, symbole: 'Attack' }], attaque: [['fantome', { couleur: '#d0c0ff' }], ['trainee', { couleur: '#d0c0ff' }]],
    declenche: { regle: { arrivee: ['griffures', { couleur: C.violet, n: 2 }] } } },
  // ---- Sirocco (Faucon, Rapace) : blanc et ciel, vent, piques, serres, plumes
  crow2_eaglet: { entree: ['plume_douce', { couleur: C.blanc, n: 3 }], lancer: ['rafale', { couleur: C.cyan }], vers: 'main', attaque: [['trainee', { couleur: C.cyan }]] },
  crow2_dive: { lancer: ['pique', { couleur: C.blanc }], vers: 'allies', renfort: ['montee', { symbole: 'Charge', couleur: C.cyan, n: 2 }] },
  crow2_hawk: { entree: ['cible', { couleur: C.ciel }] },
  crow2_gust: { lancer: ['vent', { couleur: C.cyan }], vers: 'allies', renfort: ['vent', { couleur: C.blanc }] },
  crow2_roc: { entree: [['ombre_ailes', { couleur: '#d8e6ff', clair: true }], ['convocation', { couleur: C.blanc, lourd: true }]],
    declenche: { regle: { lancer: ['plumes', { couleur: C.blanc, n: 3 }], vers: 'ennemi', arrivee: ['souffle', { couleur: C.blanc }] } } },
  crow2_sparrow: { entree: ['plume_douce', { couleur: '#d9a066', n: 2 }], lancer: ['cartes', { couleur: '#d9a066', n: 1 }], vers: 'main' },
  crow2_dart: { lancer: ['pique', { couleur: C.or }], vers: 'ennemi', arrivee: ['serres', { couleur: C.or }] },
  crow2_robin: { entree: ['etoiles', { couleur: '#ff7a5c', n: 6 }], declenche: { regle: { renfort: ['etoiles', { couleur: '#ff7a5c', n: 3 }] } } },
  crow2_cry: { lancer: ['ondes', { couleur: C.cyan, n: 5, rapide: true }], vers: 'main' },
  crow2_storm: { entree: ['eclair', { couleur: C.ciel }], lancer: ['eclair', { couleur: C.ciel }], vers: 'ennemi', arrivee: ['elec', { couleur: C.ciel }],
    attaque: [['trainee', { couleur: C.ciel }], ['elec', { couleur: C.ciel, quand: 'impact' }]] },
  // ---- Reinette (Grenouille, Marais) : vert tendre, nenuphars, frai, pluie, eclairs, couronnes
  frog2_spawn: { lancer: ['bulles', { couleur: C.vert, n: 10 }], vers: 'allies', entree: ['frai', { couleur: C.vert }] },
  frog2_croak: { entree: ['ondes', { couleur: C.vert }], declenche: { regle: { lancer: ['ondes', { couleur: C.vert, n: 2 }], vers: 'ennemi', arrivee: ['souffle', { couleur: C.vert }] } } },
  frog2_bull: { entree: [['convocation', { couleur: C.boue, lourd: true }], ['gonfle', { delai: 420 }]],
    declenche: { regle: { lancer: ['montee', { symbole: 'Armor', couleur: C.bleu, n: 3 }], vers: 'soi', renfort: ['gonfle', {}] } } },
  frog2_rain: { lancer: ['pluie', { couleur: C.cyan }], vers: 'allies', renfort: ['montee', { symbole: 'Buff', couleur: C.vert, n: 2 }] },
  frog2_elder: { entree: ['nenuphar', { couleur: '#3f7a4a' }],
    declenche: { turnStart: { lancer: ['bulles', { couleur: C.vert, n: 4 }], vers: 'allies', renfort: ['montee', { symbole: 'Buff', couleur: C.vert, n: 2 }] } } },
  frog2_pond: { entree: ['nenuphar', { couleur: C.vert, grand: true }], declenche: { turnStart: { entree: ['frai', { couleur: C.menthe }] } } },
  frog2_mud: { lancer: ['boue', { couleur: '#8a6b3a' }], vers: 'allies', renfort: ['gouttes', { couleur: '#8a6b3a' }] },
  frog2_queen: { entree: ['nenuphar', { couleur: '#ffb3d1', fleur: true }], declenche: { regle: { lancer: ['cartes', { couleur: '#ffb3d1', n: 1 }], vers: 'main' } } },
  frog2_leaper: { entree: ['elec', { couleur: C.jaune }], declenche: { regle: { arrivee: ['eclair', { couleur: C.jaune }] } } },
  frog2_king: { entree: [['couronne', { couleur: C.or, grand: true }], ['convocation', { couleur: C.vert, lourd: true }]],
    declenche: { regle: { lancer: ['halo', { couleur: C.or, symbole: 'Buff' }], vers: 'allies' } } },
  // ---- Morphée (Hibou, Veilleur) : lilas et bleu de nuit, plumes douces, horloges, sabliers, sommeil
  owl2_nest: { entree: ['plume_douce', { couleur: '#f0e6ff', n: 4 }], declenche: { turnEnd: { lancer: ['montee', { symbole: 'Armor', couleur: C.bleu, n: 1 }], vers: 'soi' } } },
  owl2_sand: { lancer: ['sablier', { couleur: C.or }], vers: 'ennemi', arrivee: ['gouttes', { couleur: C.beige, n: 10 }] },
  owl2_watch: { entree: ['horloge', { couleur: C.or }] },
  owl2_lull: { entree: [['notes', { couleur: '#c9b6ff', n: 3, lent: true }], ['zzz', { couleur: '#c9b6ff' }]] },
  owl2_elder: { entree: [['lune', { couleur: '#dfe7ff' }], ['convocation', { couleur: '#9fb6ff', lourd: true }]], declenche: { turnStart: { arrivee: ['faisceau', { couleur: '#bcd0ff' }] } } },
  owl2_egg: { entree: ['oeuf', { couleur: C.creme }], declenche: { turnStart: { renfort: ['oeuf', { couleur: C.creme, fele: true }] } } },
  owl2_dream: { lancer: [['zzz', { couleur: '#c9d6ff' }], ['bulles', { couleur: '#c9d6ff', n: 8 }]], vers: 'main' },
  owl2_clock: { entree: ['horloge', { couleur: '#d9a066' }], declenche: { turnEnd: { lancer: ['bec', { couleur: '#d9a066' }], vers: 'ennemi', arrivee: ['souffle', { couleur: '#d9a066' }] } } },
  owl2_pillow: { entree: ['plume_douce', { couleur: C.blanc, n: 10, gros: true }] },
  owl2_midnight: { lancer: [['nuit', { couleur: '#0d1630', lourd: true }], ['horloge', { couleur: '#e8eeff', grand: true, coups: 12 }]], vers: 'ennemi', arrivee: ['faisceau', { couleur: '#e8eeff' }] },
  // ---- Mirage (Caméléon, Imitateur) : arc-en-ciel, miroirs, masques, voiles, fleurs
  cam2_prism: { entree: ['arcenciel', {}], lancer: ['faisceau', { couleur: 'arcenciel' }], vers: 'allies', renfort: ['facettes', {}] },
  cam2_mirror: { lancer: [['eclats', { couleur: '#dff6ff' }], ['cartes', { couleur: '#dff6ff', n: 2 }]], vers: 'main' },
  cam2_choir: { entree: ['notes', { couleur: 'arcenciel', n: 6 }], aura: ['halo', { couleur: '#ff9fe0', symbole: 'Buff' }] },
  cam2_shed: { lancer: ['mue', { couleur: '#b8ffb0' }], vers: 'allies' },
  cam2_ball: { lancer: ['masques', { n: 3 }], vers: 'allies', renfort: ['confettis', {}] },
  cam2_bud: { entree: ['fleur', { couleur: '#ffb3d1', bouton: true }], declenche: { turnStart: { renfort: ['fleur', { couleur: C.rose }] } } },
  cam2_double: { lancer: ['eclats', { couleur: '#dff6ff', sens: 'dedans' }], vers: 'allies', entree: ['dedouble', {}] },
  cam2_veil: { lancer: ['voile', { couleur: 'arcenciel' }], vers: 'allies', renfort: ['clignote', {}] },
  cam2_mime: { entree: ['masques', { n: 1 }], declenche: { regle: { renfort: ['facettes', {}] } } },
  cam2_chimera: { entree: [['arcenciel', { grand: true }], ['convocation', { couleur: C.violet, lourd: true }]], aura: ['halo', { couleur: C.violet, symbole: 'Debuff', cible: 'ennemis' }] }
};

/** Ce que fait chaque brique, en une phrase (le wiki de l'Atelier l'affiche). */
export const BRIQUES_DOC = {
  eclair: "Un trait de foudre en zigzag de la carte vers la cible, avec un éclair blanc à l'arrivée.",
  griffures: 'Des stries obliques qui se tracent sur la cible.',
  plumes: "Des plumes qui tournoient de la carte vers la cible et s'y plantent.",
  langue: 'Un long trait rose qui claque sur la cible (la langue de la grenouille).',
  gouttes: 'Des gouttes qui coulent sur la cible (venin, croissance).',
  pluie: 'Une averse sur tout un plateau.',
  souffle: 'Un anneau net et des éclats qui partent de la cible.',
  faisceau: "Un faisceau vertical qui tombe du haut de l'écran sur la cible.",
  yeux: "Deux yeux (ou un seul) qui s'ouvrent : regard, présage, veille.",
  sablier: 'Un sablier qui se retourne sur la cible, avec du sable qui coule.',
  convocation: "Un anneau et un nuage d'éclats pour une unité qui arrive ; « lourd » fait trembler l'écran.",
  ondes: "Des ondes concentriques qui partent d'un point (cri, coassement).",
  nuit: "La nuit tombe : un voile sombre sur tout l'écran.",
  spirale: "Des points qui s'enroulent de la source vers la cible.",
  facettes: 'Des facettes de couleur qui tournent (caméléon, prisme, miroir).',
  pas: 'Des pas qui courent vers la cible.',
  bulles: 'Des bulles qui montent de la cible.',
  vent: 'Des colonnes de vent qui montent de la cible.',
  boue: "Une boule de boue qui grossit et s'étale sur la cible.",
  confettis: 'Des confettis dorés qui retombent.',
  trainee: 'Des traits de vitesse derrière une unité qui charge.',
  fantome: "Des images translucides laissées en arrière : l'unité passe à travers.",
  ame: "Une âme qui s'élève là où l'unité est morte.",
  halo: "L'onde d'une aura ou d'un renfort collectif : un anneau part du porteur et touche chacun, avec une petite icône.",
  montee: 'Des icônes qui montent de la cible (soin, renfort, armure, mana).',
  retour: 'Une carte qui vole de la cible vers ta main.',
  os: "Un os qui tournoie de la carte jusqu'à l'unité.",
  pattes: 'Des empreintes de pattes : autour de la cible, ou en piste jusqu\'à elle.',
  aboiement: "Une bulle d'aboiement en étoile qui éclate.",
  notes: 'Des notes de musique qui volent vers la cible (sifflet, clairon, concert, berceuse, chœur).',
  crocs: 'Deux mâchoires qui se referment sur la cible.',
  lune: "Une lune se lève en haut de l'écran (rouge pour la Lune de Sang), avec un hurlement.",
  hurlement: 'Une petite lune et un hurlement qui part de la carte.',
  etoiles: 'Des étoiles qui scintillent autour de la cible.',
  zzz: 'Des « z » de sommeil qui montent.',
  horloge: "Une horloge dont les aiguilles tournent ; à Minuit, douze coups sonnent.",
  oeuf: "Un œuf qui vacille et se fêle.",
  plume_douce: 'Des plumes douces qui tombent en se balançant.',
  nenuphar: "Une feuille de nénuphar qui s'ouvre sous l'unité (et parfois sa fleur).",
  elec: "Des étincelles électriques autour de la cible.",
  couronne: "Une couronne qui tombe sur l'unité.",
  pieces: "Des pièces d'or qui jaillissent (ou pleuvent).",
  masques: 'Des masques de bal qui tournoient vers chaque allié.',
  eclats: 'Des éclats de miroir qui jaillissent (ou se rassemblent).',
  arcenciel: "Un arc-en-ciel qui s'ouvre au-dessus de la cible (ou de tout le plateau).",
  livre: "Un livre qui s'ouvre dans une lueur dorée.",
  tourbillon: "Un tourbillon qui s'enroule autour de la cible, et peut l'emporter.",
  rafale: "Une rafale de vent qui balaie la cible, et peut l'emporter.",
  ombre_ailes: "L'ombre de grandes ailes qui passe sur tout l'écran.",
  fumee: 'Des bouffées de fumée.',
  cible: 'Un viseur qui se resserre sur la cible.',
  explosion: "Une explosion : éclair, éclats, fumée, l'écran tremble.",
  cartes: 'Des cartes qui volent (vers ta main, ta pioche…), en éventail ou en mélange.',
  bec: 'Un coup de bec qui file vers la cible.',
  nuee: 'Une nuée de petits oiseaux qui fond sur les cibles.',
  serres: "Des serres qui se referment sur la cible depuis le haut.",
  fiole: "Une fiole qui vole en cloche et éclabousse la cible.",
  bond: 'Une petite grenouille qui bondit jusqu\'à la cible.',
  constellation: "Des étoiles qui s'allument et se relient dans le ciel.",
  orage: "Le ciel s'assombrit et la foudre frappe chaque cible.",
  mouches: 'Des mouches qui bourdonnent… et disparaissent, gobées.',
  piece: 'Une pièce qui tourne sur elle-même (pile ou face) et file vers la cible.',
  hypnose: 'Des cercles hypnotiques qui tournent sur la cible.',
  tambour: 'Trois coups de tambour qui font trembler le plateau.',
  pique: "Un éclair blanc qui pique du haut de l'écran sur la cible.",
  frai: 'Une grappe d\'œufs de grenouille qui apparaissent.',
  gonfle: "L'unité se gonfle (la gorge du crapaud).",
  clignote: "L'unité devient transparente un instant.",
  dedouble: "L'unité se dédouble : deux reflets s'écartent d'elle.",
  voile: "Un voile de couleur descend sur la cible.",
  mue: 'La peau se détache en éclats et l\'unité file dans ta main.',
  fleur: "Une fleur qui éclot (ou un bouton qui s'ouvre).",
  descente: 'Des lueurs qui descendent du ciel sur la cible (un retour à la vie).'
};

/**
 * Les briques, construites sur l'API d'`effets.js` (`a`) : elles ne connaissent ni le moteur ni l'ecran, seulement
 * des POINTS (`{ x, y }` dans le repere de l'ecran de combat) et des RECTANGLES (`{ x, y, w, h }`), et parfois le
 * NOEUD de l'unite concernee (`noeud`). Chacune rend sa duree (ms, vitesse x1) pour que le film sache quand elle finit.
 */
export function creeBriques(a) {
  const { anime, T, ephemere, couche, F } = a;   // + a.apres, a.cloneUnite, a.rectMain, a.anneau, a.etincelles, a.eclair, a.secoueEcran
  const centre = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const alea = (min, max) => min + Math.random() * (max - min);
  const L = () => ({ w: couche().clientWidth || 360, h: couche().clientHeight || 640 });

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
  /** Un morceau de forme dans un conteneur (positionne en px dans le conteneur). */
  const bout = (x, y, w, h, style) => `<i style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${style}"></i>`;
  const tr = (p, w, h, extra = '') => `translate(${p.x - w / 2}px, ${p.y - h / 2}px) ${extra}`;

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

  /** Un objet (`html`, `w` x `h`) qui vole de `p` a `q` en cloche, en tournant. */
  function enCloche(p, q, w, h, html, { ms = 700, haut = 60, tours = 1, style = {} } = {}) {
    // Le sommet de la cloche reste dans l'ecran (le heros adverse est tout en haut : une cloche au-dessus sortirait).
    const m = { x: (p.x + q.x) / 2, y: Math.max(h + 6, Math.min(p.y, q.y) - haut) };
    const d = noeud('fx-v', { width: w + 'px', height: h + 'px', ...style }, html);
    anime(d, [
      { transform: tr(p, w, h, 'rotate(0deg) scale(.6)'), opacity: 0 },
      { transform: tr(m, w, h, `rotate(${180 * tours}deg) scale(1.2)`), opacity: 1, offset: .5 },
      { transform: tr(q, w, h, `rotate(${360 * tours}deg) scale(1)`), opacity: 1, offset: .9 },
      { transform: tr(q, w, h, `rotate(${360 * tours + 20}deg) scale(.6)`), opacity: 0 }
    ], { duration: T(ms), easing: 'ease-in-out' });
    vie(d, ms);
  }

  /** Une carte (dos) qui file de la cible vers le haut : l'unite retourne dans une main. */
  function carteQuiMonte(r) {
    const c = centre(r);
    const d = noeud('fx-v', { width: '24px', height: '32px', borderRadius: '4px', border: `2px solid ${C.or}`, background: 'rgba(54,44,71,.9)', boxShadow: `0 0 10px ${C.or}` });
    anime(d, [
      { transform: tr(c, 24, 32, 'scale(1.6)'), opacity: 0 },
      { transform: tr(c, 24, 32, 'scale(1.6)'), opacity: 1, offset: .2 },
      { transform: tr({ x: c.x, y: c.y - 130 }, 24, 32, 'scale(.7) rotate(-12deg)'), opacity: 0 }
    ], { duration: T(700), easing: 'ease-in' });
    vie(d, 700);
  }

  const etoileClip = 'polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)';
  const couleurDe = (couleur, i) => (couleur === 'arcenciel' ? ARC[i % ARC.length] : couleur);

  const briques = {
    // ------------------------------------------------ les briques de base
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
    griffures({ vers, couleur = C.rouge, n = 3, grand = false }) {
      for (const r of vers) {
        const c = centre(r), w = Math.max(30, r.w * (grand ? 1.1 : .8)), h = r.h * (grand ? .5 : .35);
        for (let i = 0; i < n; i++) {
          const o = (i - (n - 1) / 2) * Math.max(9, r.w * (grand ? .26 : .2));
          segment({ x: c.x - w / 2 + o, y: c.y - h }, { x: c.x + w / 2 + o, y: c.y + h }, { couleur, epaisseur: grand ? 6 : 4, ms: 260, delai: i * 70 });
        }
      }
      return 260 + n * 70;
    },
    plumes({ de, vers, couleur = C.noir, n = 6 }) {
      for (const r of vers) {
        const q = centre(r);
        for (let i = 0; i < n; i++) voyageur(de, { x: q.x + alea(-12, 12), y: q.y + alea(-12, 12) }, { couleur, taille: 11, ms: 460, delai: i * 45, courbe: 70, forme: '60% 40% 60% 40%', rot: alea(0, 90) });
        a.etincelles(r, couleur === C.noir ? '#8a7fa0' : couleur, 6);
      }
      return 460 + n * 45;
    },
    langue({ de, vers, couleur = C.rose, epaisseur = 9 }) {
      for (const r of vers) {
        const q = centre(r);
        segment(de, q, { couleur, epaisseur, ms: 360 });
        const s = epaisseur * 2.4;
        const b = noeud('fx-v', { width: s + 'px', height: s + 'px', background: couleur, borderRadius: '50%' });
        anime(b, [{ opacity: 0, transform: tr(q, s, s, 'scale(.2)') }, { opacity: 1, transform: tr(q, s, s, 'scale(1.2)'), offset: .5 }, { opacity: 0, transform: tr(q, s, s, 'scale(.8)') }], { duration: T(360), easing: 'ease-out' });
        vie(b, 360);
      }
      return 380;
    },
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
    pluie({ vers, couleur = C.cyan }) {
      for (const r of vers) {
        for (let i = 0; i < 18; i++) {
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
    souffle({ vers, couleur = C.blanc }) {
      for (const r of vers) { a.anneau(r, couleur, 2); a.etincelles(r, couleur, 8); }
      return 620;
    },
    faisceau({ vers, couleur = C.or }) {
      for (const r of vers) {
        const c = centre(r);
        const fond = couleur === 'arcenciel' ? `linear-gradient(90deg, ${ARC.join(', ')})` : `linear-gradient(180deg, transparent, ${couleur})`;
        const lueur = couleur === 'arcenciel' ? C.blanc : couleur;
        const d = noeud('fx-v', { left: (c.x - 12) + 'px', top: '0px', width: '24px', height: c.y + 'px', transformOrigin: '50% 0', background: fond, boxShadow: `0 0 18px ${lueur}`, borderRadius: '12px' });
        anime(d, [
          { transform: 'scaleY(0)', opacity: 0 },
          { transform: 'scaleY(1)', opacity: 1, offset: .35 },
          { transform: 'scaleY(1)', opacity: 0 }
        ], { duration: T(560), easing: 'ease-out' });
        vie(d, 560);
        a.eclair(r, lueur);
      }
      return 600;
    },
    yeux({ de, vers, couleur = C.or, un = false }) {
      const p = vers && vers[0] ? centre(vers[0]) : de;
      for (const dx of un ? [0] : [-16, 16]) {
        const w = un ? 34 : 22, h = un ? 18 : 12;
        const d = noeud('fx-v', { width: w + 'px', height: h + 'px', background: `radial-gradient(circle at 50% 50%, #120a1a 0 ${h * .35}px, #fff ${h * .38}px)`, borderRadius: '50%', boxShadow: `0 0 14px ${couleur}`, border: `3px solid ${couleur}` });
        const t = `translate(${p.x + dx - w / 2}px, ${p.y - h / 2}px)`;
        anime(d, [
          { transform: `${t} scaleY(0)`, opacity: 0 },
          { transform: `${t} scaleY(1.2)`, opacity: 1, offset: .25 },
          { transform: `${t} scaleY(1)`, opacity: 1, offset: .7 },
          { transform: `${t} scaleY(0)`, opacity: 0 }
        ], { duration: T(680), easing: 'ease-in-out' });
        vie(d, 680);
      }
      return 700;
    },
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
    convocation({ vers, couleur = C.blanc, lourd = false }) {
      for (const r of vers) {
        a.anneau(r, couleur, lourd ? 2 : 1);
        a.etincelles(r, couleur, lourd ? 12 : 7);
      }
      if (lourd) a.secoueEcran(F().ecranSecoussePx, F().ecranSecousseMs);
      return 560;
    },
    ondes({ de, vers, couleur = C.or, n = 3, rapide = false }) {
      const p = vers && vers[0] ? centre(vers[0]) : de;
      const pas = rapide ? 90 : 160;
      for (let i = 0; i < n; i++) {
        const d = noeud('fx-v', { width: '40px', height: '40px', border: `3px solid ${couleur}`, borderRadius: '50%', boxShadow: `0 0 10px ${couleur}` });
        anime(d, [
          { transform: tr(p, 40, 40, 'scale(.3)'), opacity: 0 },
          { transform: tr(p, 40, 40, 'scale(1.4)'), opacity: .9, offset: .3 },
          { transform: tr(p, 40, 40, 'scale(3.6)'), opacity: 0 }
        ], { duration: T(rapide ? 520 : 700), delay: T(i * pas), easing: 'ease-out' });
        vie(d, 700 + i * pas);
      }
      return 700 + n * pas;
    },
    nuit({ couleur = C.noir, lourd = false }) {
      const d = noeud('fx-v', { left: '0', top: '0', width: '100%', height: '100%', background: `radial-gradient(circle at 50% 50%, transparent 10%, ${couleur} 90%)` });
      anime(d, [{ opacity: 0 }, { opacity: lourd ? .85 : .6, offset: .35 }, { opacity: 0 }], { duration: T(1200), easing: 'ease-in-out' });
      vie(d, 1200);
      if (lourd) a.secoueEcran(F().ecranSecoussePx, F().ecranSecousseMs);
      return 1100;
    },
    spirale({ de, vers, couleur = C.violet, n = 6 }) {
      const q = vers && vers[0] ? centre(vers[0]) : de;
      for (let i = 0; i < n; i++) voyageur(de, q, { couleur, taille: 8, ms: 560, delai: i * 70, courbe: 90 });
      a.anneau({ x: q.x - 20, y: q.y - 20, w: 40, h: 40 }, couleur);
      return 560 + n * 70;
    },
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
    bulles({ vers, couleur = C.vert, n = 7 }) {
      for (const r of vers) {
        for (let i = 0; i < n; i++) {
          const x = r.x + r.w * Math.random(), s = alea(8, 16);
          const d = noeud('fx-v', { width: s + 'px', height: s + 'px', border: `2px solid ${couleur}`, borderRadius: '50%', background: 'rgba(255,255,255,.08)' });
          anime(d, [
            { transform: `translate(${x}px, ${r.y + r.h}px) scale(.5)`, opacity: 0 },
            { transform: `translate(${x + alea(-8, 8)}px, ${r.y + r.h * .4}px) scale(1)`, opacity: .9, offset: .5 },
            { transform: `translate(${x}px, ${r.y - 14}px) scale(1.2)`, opacity: 0 }
          ], { duration: T(700), delay: T(i * 70), easing: 'ease-out' });
          vie(d, 700 + i * 70);
        }
      }
      return 700 + n * 70;
    },
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
    boue({ de, vers, couleur = C.boue, petit = false }) {
      const s = petit ? 22 : 34;
      for (const r of vers) {
        const q = centre(r);
        const d = noeud('fx-v', { width: s + 'px', height: s + 'px', background: couleur, borderRadius: '50%', boxShadow: 'inset -6px -6px 0 rgba(0,0,0,.25)' });
        anime(d, [
          { transform: tr(de, s, s, 'scale(.4)'), opacity: 0 },
          { transform: tr(q, s, s, 'scale(1)'), opacity: 1, offset: .5 },
          { transform: tr(q, s, s, 'scale(2.2)'), opacity: .8, offset: .75 },
          { transform: tr(q, s, s, 'scale(2.6)'), opacity: 0 }
        ], { duration: T(700), easing: 'ease-in' });
        vie(d, 700);
        a.etincelles(r, couleur, 8);
      }
      return 720;
    },
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
    fantome({ noeud: n, de, vers, couleur = C.cyan }) {
      if (!n || !a.cloneUnite) return 0;
      const q = vers && vers[0] ? centre(vers[0]) : { x: de.x, y: de.y - 60 };
      for (let i = 1; i <= 3; i++) {
        const g = a.cloneUnite(n);
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
    halo({ de, vers, couleur = C.or, symbole = null }) {
      a.anneau({ x: de.x - 22, y: de.y - 22, w: 44, h: 44 }, couleur, 2);
      for (const r of vers || []) {
        const c = centre(r);
        const dist = Math.hypot(c.x - de.x, c.y - de.y);
        a.apres(Math.min(520, 120 + dist * 1.1), () => {
          a.anneau(r, couleur);
          if (!symbole) return;
          const d = noeud('fx-v', { color: couleur, filter: 'drop-shadow(0 0 3px rgba(0,0,0,.6))' }, icone(symbole, 20));
          anime(d, [{ transform: tr({ x: c.x, y: c.y }, 20, 20, 'scale(.3)'), opacity: 0 }, { transform: tr({ x: c.x, y: c.y - 16 }, 20, 20, 'scale(1.2)'), opacity: 1, offset: .4 }, { transform: tr({ x: c.x, y: c.y - 34 }, 20, 20, 'scale(1)'), opacity: 0 }], { duration: T(700), easing: 'ease-out' });
          vie(d, 700);
        });
      }
      return 1100;
    },
    montee({ vers, symbole = 'Buff', couleur = C.or, n = 3 }) {
      for (const r of vers) {
        for (let i = 0; i < n; i++) {
          const x = r.x + r.w * (n === 1 ? .5 : .2 + .6 * (i / (n - 1))) - 11;
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
      return 760 + n * 110;
    },
    retour({ vers }) {
      if (!a.rectMain) return 0;
      const m = centre(a.rectMain());
      for (const r of vers) {
        const c = centre(r);
        const d = noeud('fx-v', { width: '24px', height: '32px', borderRadius: '4px', border: `2px solid ${C.or}`, background: 'rgba(54,44,71,.9)', boxShadow: `0 0 10px ${C.or}` });
        anime(d, [{ transform: tr(c, 24, 32, 'scale(1.6)'), opacity: 0 }, { transform: tr(c, 24, 32, 'scale(1.6)'), opacity: 1, offset: .15 }, { transform: tr(m, 24, 32, 'scale(.7)'), opacity: 0 }], { duration: T(620), easing: 'ease-in-out' });
        vie(d, 620);
      }
      return 640;
    },

    // ------------------------------------------------ les briques des chiens
    os({ de, vers, couleur = C.creme }) {
      const html = bout(7, 4, 22, 6, `border-radius:3px;background:${couleur}`) + [[0, 0], [0, 6], [28, 0], [28, 6]].map(([x, y]) => bout(x, y, 8, 8, `border-radius:50%;background:${couleur}`)).join('');
      for (const r of vers) {
        enCloche(de, centre(r), 36, 14, html, { ms: 760, haut: 70, tours: 2, style: { filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))' } });
        a.apres(690, () => { a.anneau(r, couleur); a.etincelles(r, couleur, 6); });
      }
      return 900;
    },
    pattes({ de, vers, couleur = C.beige, n = 4, chemin = false, grand = false, petit = false }) {
      const s = grand ? 36 : petit ? 12 : 18;
      const html = bout(s * .22, s * .42, s * .56, s * .5, `border-radius:45% 45% 50% 50%;background:${couleur}`) +
        [[.02, .2], [.27, 0], [.53, 0], [.78, .2]].map(([x, y]) => bout(x * s, y * s, s * .2, s * .27, `border-radius:50%;background:${couleur}`)).join('');
      const pose = (p, ang, delai) => {
        const d = noeud('fx-v', { width: s + 'px', height: s + 'px', filter: `drop-shadow(0 0 3px ${couleur})` }, html);
        anime(d, [
          { transform: tr(p, s, s, `rotate(${ang}deg) scale(.3)`), opacity: 0 },
          { transform: tr(p, s, s, `rotate(${ang}deg) scale(1.15)`), opacity: 1, offset: .25 },
          { transform: tr(p, s, s, `rotate(${ang}deg) scale(1)`), opacity: 1, offset: .7 },
          { transform: tr(p, s, s, `rotate(${ang}deg) scale(1)`), opacity: 0 }
        ], { duration: T(700), delay: T(delai), easing: 'ease-out' });
        vie(d, 700 + delai);
      };
      let fin = 0;
      for (const r of vers) {
        const q = centre(r);
        if (chemin) {
          const ang = Math.atan2(q.y - de.y, q.x - de.x) * 180 / Math.PI + 90;
          for (let i = 0; i < n; i++) {
            const f = (i + 1) / (n + 1), cote = i % 2 ? 7 : -7;
            const rad = (ang - 90) * Math.PI / 180;
            pose({ x: de.x + (q.x - de.x) * f - Math.sin(rad) * cote, y: de.y + (q.y - de.y) * f + Math.cos(rad) * cote }, ang, i * 80);
          }
          fin = Math.max(fin, 700 + n * 80);
        } else {
          for (let i = 0; i < n; i++) pose(n === 1 ? q : { x: r.x + r.w * alea(.15, .85), y: r.y + r.h * alea(.2, .85) }, alea(-25, 25), i * 90);
          fin = Math.max(fin, 700 + n * 90);
        }
      }
      return fin;
    },
    aboiement({ de, vers, couleur = C.or, n = 1, grand = false, petit = false }) {
      const s = grand ? 96 : petit ? 40 : 62;
      const pts = [];
      for (let i = 0; i < 16; i++) { const ang = (i / 16) * Math.PI * 2, rr = i % 2 ? 30 : 50; pts.push(`${50 + Math.cos(ang) * rr}% ${50 + Math.sin(ang) * rr}%`); }
      const cibles = vers && vers.length ? vers.map(centre) : [de];
      for (const p of cibles) {
        for (let i = 0; i < n; i++) {
          const d = noeud('fx-v', { width: s + 'px', height: s + 'px', background: couleur, clipPath: `polygon(${pts.join(', ')})`, opacity: 0 });
          anime(d, [
            { transform: tr(p, s, s, 'scale(.2) rotate(0deg)'), opacity: 0 },
            { transform: tr(p, s, s, 'scale(1.1) rotate(10deg)'), opacity: .9, offset: .3 },
            { transform: tr(p, s, s, 'scale(1.5) rotate(18deg)'), opacity: 0 }
          ], { duration: T(560), delay: T(i * 200), easing: 'ease-out' });
          vie(d, 560 + i * 200);
        }
      }
      if (grand) a.secoueEcran(F().ecranSecoussePx * .6, F().ecranSecousseMs);
      return 560 + n * 200;
    },
    notes({ de, vers, couleur = C.or, n = 5, lent = false, grosses = false }) {
      const k = grosses ? 1.5 : 1;
      const ms = lent ? 1150 : 720;
      const cibles = vers && vers.length ? vers.map(centre) : [{ x: de.x, y: de.y - 80 }];
      for (let i = 0; i < n; i++) {
        const q = cibles[i % cibles.length];
        const col = couleurDe(couleur, i);
        const w = 16 * k, h = 24 * k;
        const html = bout(0, h - 8 * k, 10 * k, 8 * k, `border-radius:50%;background:${col};transform:rotate(-20deg)`) + bout(8 * k, 0, 2.5 * k, h - 4 * k, `background:${col}`) + bout(9 * k, 0, 7 * k, 7 * k, `border-radius:0 60% 0 60%;background:${col}`);
        const p0 = { x: de.x + alea(-14, 14), y: de.y + alea(-8, 8) };
        const m = { x: (p0.x + q.x) / 2 + (i % 2 ? 26 : -26), y: (p0.y + q.y) / 2 - 20 };
        const d = noeud('fx-v', { width: w + 'px', height: h + 'px', filter: `drop-shadow(0 0 4px ${col})` }, html);
        anime(d, [
          { transform: tr(p0, w, h, 'rotate(-10deg) scale(.4)'), opacity: 0 },
          { transform: tr(m, w, h, 'rotate(12deg) scale(1)'), opacity: 1, offset: .45 },
          { transform: tr(q, w, h, 'rotate(-6deg) scale(.9)'), opacity: 0 }
        ], { duration: T(ms), delay: T(i * 110), easing: 'ease-in-out' });
        vie(d, ms + i * 110);
      }
      return ms + n * 110;
    },
    crocs({ vers, couleur = '#ffffff', grand = false, petit = false, rouge = false }) {
      const w = grand ? 74 : petit ? 34 : 52, h = w * .32;
      const haut = 'polygon(0 0, 100% 0, 100% 35%, 92% 100%, 84% 35%, 75% 100%, 67% 35%, 58% 100%, 50% 35%, 42% 100%, 33% 35%, 25% 100%, 17% 35%, 8% 100%, 0 35%)';
      const bas = 'polygon(0 100%, 100% 100%, 100% 65%, 92% 0, 84% 65%, 75% 0, 67% 65%, 58% 0, 50% 65%, 42% 0, 33% 65%, 25% 0, 17% 65%, 8% 0, 0 65%)';
      for (const r of vers) {
        // Les machoires restent dans l'ecran, meme sur le heros d'en haut.
        const c = { x: centre(r).x, y: Math.max(centre(r).y, h * 1.8) };
        for (const [clip, sens] of [[haut, -1], [bas, 1]]) {
          const d = noeud('fx-v', { width: w + 'px', height: h + 'px', background: couleur, clipPath: clip, filter: 'drop-shadow(0 0 4px rgba(0,0,0,.7))' });
          const p = y => ({ x: c.x, y: c.y + sens * y });
          anime(d, [
            { transform: tr(p(h * 1.6), w, h), opacity: 0 },
            { transform: tr(p(h * 1.4), w, h), opacity: 1, offset: .25 },
            { transform: tr(p(h * .45), w, h), opacity: 1, offset: .55 },
            { transform: tr(p(h * .45), w, h), opacity: 0 }
          ], { duration: T(520), easing: 'ease-in' });
          vie(d, 520);
        }
        a.apres(290, () => { a.eclair(r, rouge ? C.sang : '#fff'); if (rouge) a.etincelles(r, C.sang, 10); });
      }
      return 560;
    },
    lune({ couleur = C.lune, grand = false, petite = false, nuit = false, hurle = false }) {
      const { w } = L();
      const s = grand ? 120 : petite ? 44 : 74;
      const p = { x: w / 2, y: grand ? 110 : 80 };
      if (nuit) briques.nuit({ couleur: '#1a0508', lourd: false });
      const d = noeud('fx-v', { width: s + 'px', height: s + 'px', borderRadius: '50%', background: `radial-gradient(circle at 38% 35%, #fff 0, ${couleur} 55%, ${couleur} 100%)`, boxShadow: `0 0 ${s / 2}px ${couleur}` });
      anime(d, [
        { transform: tr({ x: p.x, y: p.y + 50 }, s, s, 'scale(.6)'), opacity: 0 },
        { transform: tr(p, s, s, 'scale(1)'), opacity: 1, offset: .35 },
        { transform: tr(p, s, s, 'scale(1.04)'), opacity: 1, offset: .75 },
        { transform: tr(p, s, s, 'scale(1.1)'), opacity: 0 }
      ], { duration: T(1400), easing: 'ease-out' });
      vie(d, 1400);
      if (hurle) a.apres(380, () => briques.ondes({ de: p, vers: [], couleur, n: 3 }));
      return 1300;
    },
    hurlement({ de, vers, couleur = C.rouge }) {
      briques.lune({ couleur: C.lune, petite: true });
      briques.ondes({ de, vers: [], couleur, n: 4 });
      if (vers && vers.length) a.apres(500, () => vers.forEach(r => a.anneau(r, couleur)));
      return 1100;
    },

    // ------------------------------------------------ les briques des chats
    etoiles({ vers, couleur = C.or, n = 6 }) {
      for (const r of vers) {
        for (let i = 0; i < n; i++) {
          const s = alea(10, 18);
          const p = { x: r.x - 8 + Math.random() * (r.w + 16), y: r.y - 8 + Math.random() * (r.h + 16) };
          const d = noeud('fx-v', { width: s + 'px', height: s + 'px', background: couleur, clipPath: etoileClip, filter: `drop-shadow(0 0 4px ${couleur})` });
          const delai = Math.random() * 320;
          anime(d, [
            { transform: tr(p, s, s, 'scale(0) rotate(0deg)'), opacity: 0 },
            { transform: tr(p, s, s, 'scale(1.2) rotate(45deg)'), opacity: 1, offset: .4 },
            { transform: tr(p, s, s, 'scale(0) rotate(90deg)'), opacity: 0 }
          ], { duration: T(640), delay: T(delai), easing: 'ease-out' });
          vie(d, 640 + delai);
        }
      }
      return 980;
    },
    fumee({ vers, couleur = '#8a8fa0', n = 6, petit = false, grand = false }) {
      for (const r of vers) {
        const c = centre(r);
        const k = grand ? 1.8 : petit ? .6 : 1;
        for (let i = 0; i < n; i++) {
          const s = alea(18, 32) * k;
          const p = { x: c.x + alea(-r.w * .4, r.w * .4), y: c.y + alea(-r.h * .3, r.h * .3) };
          const d = noeud('fx-v', { width: s + 'px', height: s + 'px', borderRadius: '50%', background: `radial-gradient(circle, ${couleur} 0, transparent 70%)` });
          anime(d, [
            { transform: tr(p, s, s, 'scale(.4)'), opacity: 0 },
            { transform: tr({ x: p.x, y: p.y - 10 }, s, s, 'scale(1.2)'), opacity: .9, offset: .3 },
            { transform: tr({ x: p.x + alea(-10, 10), y: p.y - 34 }, s, s, 'scale(1.9)'), opacity: 0 }
          ], { duration: T(900), delay: T(i * 60), easing: 'ease-out' });
          vie(d, 900 + i * 60);
        }
      }
      return 900 + n * 60;
    },
    cartes({ de, vers, couleur = C.or, n = 3, eventail = false, melange = false }) {
      const q = vers && vers[0] ? centre(vers[0]) : { x: de.x, y: de.y + 120 };
      for (let i = 0; i < n; i++) {
        const d = noeud('fx-v', { width: '18px', height: '25px', borderRadius: '3px', border: `2px solid ${couleur}`, background: 'linear-gradient(135deg, #362c47, #211b2d)', boxShadow: `0 0 8px ${couleur}` });
        const frames = [{ transform: tr(de, 18, 25, 'scale(.4) rotate(0deg)'), opacity: 0 }];
        if (eventail) {
          const ang = (i - (n - 1) / 2) * 22;
          frames.push({ transform: tr({ x: de.x + (i - (n - 1) / 2) * 26, y: de.y - 12 }, 18, 25, `scale(1.4) rotate(${ang}deg)`), opacity: 1, offset: .4 });
          frames.push({ transform: tr({ x: de.x + (i - (n - 1) / 2) * 26, y: de.y - 12 }, 18, 25, `scale(1.4) rotate(${ang}deg)`), opacity: 1, offset: .6 });
        } else if (melange) {
          const ang = (i / n) * Math.PI * 2;
          frames.push({ transform: tr({ x: de.x + Math.cos(ang) * 38, y: de.y + Math.sin(ang) * 38 }, 18, 25, `scale(1.1) rotate(${i * 40}deg)`), opacity: 1, offset: .35 });
          frames.push({ transform: tr({ x: de.x + Math.cos(ang + 2) * 30, y: de.y + Math.sin(ang + 2) * 30 }, 18, 25, `scale(1.1) rotate(${i * 40 + 160}deg)`), opacity: 1, offset: .6 });
        } else {
          frames.push({ transform: tr({ x: (de.x + q.x) / 2 + alea(-20, 20), y: (de.y + q.y) / 2 - 20 }, 18, 25, `scale(1.1) rotate(${alea(-30, 30)}deg)`), opacity: 1, offset: .5 });
        }
        frames.push({ transform: tr(q, 18, 25, 'scale(.8) rotate(0deg)'), opacity: 0 });
        anime(d, frames, { duration: T(eventail || melange ? 900 : 620), delay: T(i * 60), easing: 'ease-in-out' });
        vie(d, (eventail || melange ? 900 : 620) + i * 60);
      }
      return (eventail || melange ? 900 : 620) + n * 60;
    },

    // ------------------------------------------------ les briques des oiseaux
    bec({ de, vers, couleur = C.gris }) {
      for (const r of vers) {
        const q = centre(r);
        const ang = Math.atan2(q.y - de.y, q.x - de.x) * 180 / Math.PI;
        const d = noeud('fx-v', { width: '26px', height: '14px', background: couleur, clipPath: 'polygon(0 0, 100% 50%, 0 100%, 18% 50%)', filter: `drop-shadow(0 0 4px ${couleur})` });
        anime(d, [
          { transform: tr(de, 26, 14, `rotate(${ang}deg) scale(.6)`), opacity: 0 },
          { transform: tr(de, 26, 14, `rotate(${ang}deg) scale(1.2)`), opacity: 1, offset: .2 },
          { transform: tr(q, 26, 14, `rotate(${ang}deg) scale(1)`), opacity: 1, offset: .85 },
          { transform: tr(q, 26, 14, `rotate(${ang}deg) scale(.4)`), opacity: 0 }
        ], { duration: T(380), easing: 'ease-in' });
        vie(d, 380);
        a.apres(320, () => { a.anneau(r, couleur); a.eclair(r, '#fff'); });
      }
      return 520;
    },
    nuee({ de, vers, couleur = C.noir, n = 12 }) {
      const cibles = vers && vers.length ? vers : [{ x: de.x - 20, y: de.y - 140, w: 40, h: 40 }];
      const vol = 'polygon(0 0, 50% 55%, 100% 0, 100% 35%, 50% 100%, 0 35%)';
      for (let i = 0; i < n; i++) {
        const r = cibles[i % cibles.length];
        const q = { x: r.x + r.w * alea(.15, .85), y: r.y + r.h * alea(.15, .85) };
        const p = { x: de.x + alea(-30, 30), y: de.y + alea(-16, 16) };
        const frames = [];
        for (let k = 0; k <= 6; k++) {
          const f = k / 6;
          const pt = { x: p.x + (q.x - p.x) * f + Math.sin(f * 7 + i) * 14, y: p.y + (q.y - p.y) * f - Math.sin(f * Math.PI) * 30 };
          frames.push({ transform: tr(pt, 16, 9, `scaleY(${k % 2 ? .35 : 1})`), opacity: k === 0 || k === 6 ? 0 : 1, offset: f });
        }
        const d = noeud('fx-v', { width: '16px', height: '9px', background: couleur, clipPath: vol, filter: 'drop-shadow(0 0 2px rgba(255,255,255,.5))' });
        anime(d, frames, { duration: T(760), delay: T(i * 35), easing: 'linear' });
        vie(d, 760 + i * 35);
      }
      for (const r of cibles) a.apres(700, () => a.anneau(r, couleur === C.noir ? C.gris : couleur));
      return 760 + n * 35;
    },
    serres({ vers, couleur = C.or }) {
      for (const r of vers) {
        const c = centre(r);
        for (let i = -1; i <= 1; i++) {
          segment({ x: c.x + i * 18, y: c.y - r.h * .75 }, { x: c.x + i * 6, y: c.y + r.h * .15 }, { couleur, epaisseur: 5, ms: 280, delai: 40 + Math.abs(i) * 50 });
        }
        a.apres(260, () => { a.eclair(r, couleur); a.etincelles(r, couleur, 8); });
      }
      return 520;
    },
    ombre_ailes({ couleur = '#1a1424', clair = false, lourd = false, vers }) {
      const { w, h } = L();
      const y = vers && vers[0] ? centre(vers[0]).y : h * .4;
      if (!clair) briques.nuit({ couleur, lourd });
      for (const [dy, delai] of [[-30, 0], [26, 90]]) {
        const d = noeud('fx-v', { width: '190px', height: '58px', borderRadius: '50%', background: couleur, opacity: 0 });
        anime(d, [
          { transform: tr({ x: -120, y: y + dy }, 190, 58, 'skewX(-30deg) scaleY(.6)'), opacity: 0 },
          { transform: tr({ x: w * .45, y: y + dy - 20 }, 190, 58, 'skewX(-24deg) scaleY(1)'), opacity: clair ? .45 : .8, offset: .5 },
          { transform: tr({ x: w + 120, y: y + dy }, 190, 58, 'skewX(-30deg) scaleY(.6)'), opacity: 0 }
        ], { duration: T(950), delay: T(delai), easing: 'ease-in-out' });
        vie(d, 950 + delai);
      }
      if (lourd) a.secoueEcran(F().ecranSecoussePx, F().ecranSecousseMs);
      return 1050;
    },
    pique({ vers, couleur = C.blanc }) {
      for (const r of vers) {
        const c = centre(r);
        const d = noeud('fx-v', { left: (c.x - 4) + 'px', top: '0px', width: '8px', height: '70px', borderRadius: '4px', background: `linear-gradient(180deg, transparent, ${couleur})`, boxShadow: `0 0 12px ${couleur}` });
        anime(d, [
          { transform: 'translateY(-80px)', opacity: 0 },
          { transform: 'translateY(-40px)', opacity: 1, offset: .15 },
          { transform: `translateY(${c.y - 70}px)`, opacity: 1, offset: .85 },
          { transform: `translateY(${c.y - 60}px) scaleY(.4)`, opacity: 0 }
        ], { duration: T(340), easing: 'ease-in' });
        vie(d, 340);
        a.apres(300, () => { a.anneau(r, couleur, 2); a.etincelles(r, couleur, 10); });
      }
      return 700;
    },
    cible({ vers, couleur = C.ciel }) {
      for (const r of vers) {
        const c = centre(r);
        const html = bout(0, 0, 60, 60, `border-radius:50%;border:2px solid ${couleur}`) + bout(28, -8, 4, 16, `background:${couleur}`) + bout(28, 52, 4, 16, `background:${couleur}`) + bout(-8, 28, 16, 4, `background:${couleur}`) + bout(52, 28, 16, 4, `background:${couleur}`) + bout(27, 27, 6, 6, `border-radius:50%;background:${couleur}`);
        const d = noeud('fx-v', { width: '60px', height: '60px', filter: `drop-shadow(0 0 4px ${couleur})` }, html);
        anime(d, [
          { transform: tr(c, 60, 60, 'scale(2.2) rotate(0deg)'), opacity: 0 },
          { transform: tr(c, 60, 60, 'scale(1) rotate(90deg)'), opacity: 1, offset: .6 },
          { transform: tr(c, 60, 60, 'scale(.9) rotate(90deg)'), opacity: 0 }
        ], { duration: T(760), easing: 'ease-out' });
        vie(d, 760);
        a.apres(460, () => a.eclair(r, couleur));
      }
      return 780;
    },

    // ------------------------------------------------ les briques des grenouilles
    fiole({ de, vers, couleur = C.poison }) {
      for (const r of vers) {
        enCloche(de, centre(r), 28, 28, `<span style="color:${couleur}">${icone('Venom', 28)}</span>`, { ms: 640, haut: 80, tours: 1 });
        a.apres(600, () => briques.gouttes({ vers: [r], couleur, n: 5 }));
      }
      return 1000;
    },
    bond({ de, vers, couleur = C.vert }) {
      for (const r of vers) {
        const q = centre(r);
        const frames = [];
        for (let k = 0; k <= 9; k++) {
          const f = k / 9, saut = (f * 3) % 1;
          frames.push({ transform: tr({ x: de.x + (q.x - de.x) * f, y: de.y + (q.y - de.y) * f - Math.sin(saut * Math.PI) * 36 }, 16, 12, `scale(${1 + Math.sin(saut * Math.PI) * .3}, ${1 - Math.sin(saut * Math.PI) * .2})`), opacity: k === 0 ? 0 : 1, offset: f });
        }
        const d = noeud('fx-v', { width: '16px', height: '12px', borderRadius: '50% 50% 40% 40%', background: couleur, boxShadow: `0 0 6px ${couleur}` });
        anime(d, frames, { duration: T(900), easing: 'linear' });
        vie(d, 900);
        a.apres(880, () => { a.anneau(r, couleur); a.etincelles(r, couleur, 6); });
      }
      return 1100;
    },
    nenuphar({ vers, couleur = C.vert, grand = false, fleur = false }) {
      for (const r of vers) {
        const c = centre(r);
        const s = (grand ? 1.4 : 1) * Math.max(44, r.w * .95);
        const p = { x: c.x, y: r.y + r.h * .82 };
        const d = noeud('fx-v', { width: s + 'px', height: s + 'px', borderRadius: '50%', background: `conic-gradient(from 200deg, transparent 0 34deg, ${couleur} 34deg 360deg)`, boxShadow: `inset 0 0 0 3px rgba(0,0,0,.18), 0 0 10px ${couleur}` });
        anime(d, [
          { transform: tr(p, s, s, 'scale(.1, .05)'), opacity: 0 },
          { transform: tr(p, s, s, 'scale(1, .42)'), opacity: .85, offset: .4 },
          { transform: tr(p, s, s, 'scale(1.05, .45)'), opacity: .85, offset: .75 },
          { transform: tr(p, s, s, 'scale(1.1, .48)'), opacity: 0 }
        ], { duration: T(1100), easing: 'ease-out' });
        vie(d, 1100);
        a.apres(200, () => briques.ondes({ de: p, vers: [], couleur, n: 2, rapide: true }));
        if (fleur) a.apres(380, () => briques.fleur({ vers: [{ x: c.x - 15, y: p.y - 30, w: 30, h: 30 }], couleur: '#ffb3d1' }));
      }
      return 1150;
    },
    frai({ vers, couleur = C.vert }) {
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < 9; i++) {
          const p = { x: c.x + Math.cos(i * 2.4) * (6 + i * 2.2), y: c.y + Math.sin(i * 2.4) * (6 + i * 2.2) };
          const d = noeud('fx-v', { width: '13px', height: '13px', borderRadius: '50%', border: `2px solid ${couleur}`, background: 'radial-gradient(circle, #1a2a1a 0 2.5px, rgba(255,255,255,.22) 3px)' });
          anime(d, [
            { transform: tr(p, 13, 13, 'scale(0)'), opacity: 0 },
            { transform: tr(p, 13, 13, 'scale(1.2)'), opacity: 1, offset: .3 },
            { transform: tr(p, 13, 13, 'scale(1)'), opacity: 1, offset: .75 },
            { transform: tr(p, 13, 13, 'scale(1.1)'), opacity: 0 }
          ], { duration: T(900), delay: T(i * 45), easing: 'ease-out' });
          vie(d, 900 + i * 45);
        }
      }
      return 1300;
    },
    gonfle({ noeud: n, delai = 0 }) {
      if (!n) return 0;
      a.apres(delai, () => anime(n, [
        { transform: 'scale(1)' }, { transform: 'scale(1.24)', offset: .25 }, { transform: 'scale(.95)', offset: .5 },
        { transform: 'scale(1.16)', offset: .72 }, { transform: 'scale(1)' }
      ], { duration: T(720), easing: 'ease-in-out', fill: 'none' }));
      return 720 + delai;
    },
    elec({ vers, couleur = C.jaune, n = 7 }) {
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + alea(-.3, .3);
          let p = { x: c.x + Math.cos(ang) * 10, y: c.y + Math.sin(ang) * 10 };
          for (let k = 1; k <= 3; k++) {
            const q = { x: c.x + Math.cos(ang) * (10 + k * 11) + alea(-6, 6), y: c.y + Math.sin(ang) * (10 + k * 11) + alea(-6, 6) };
            segment(p, q, { couleur, epaisseur: 2.5, ms: 200, delai: i * 45 + k * 25 });
            p = q;
          }
        }
        a.apres(60, () => a.eclair(r, couleur));
      }
      return 200 + n * 45 + 80;
    },
    couronne({ vers, couleur = C.or, grand = false, lourd = false }) {
      const w = grand ? 58 : 38, h = w * .7;
      for (const r of vers) {
        const c = centre(r);
        const bas = { x: c.x, y: r.y + h * .3 };
        const d = noeud('fx-v', { width: w + 'px', height: h + 'px', background: `linear-gradient(180deg, #fff6d0, ${couleur})`, clipPath: 'polygon(0 100%, 0 28%, 20% 60%, 35% 6%, 50% 52%, 65% 6%, 80% 60%, 100% 28%, 100% 100%)', filter: `drop-shadow(0 0 6px ${couleur})` });
        anime(d, [
          { transform: tr({ x: bas.x, y: bas.y - 90 }, w, h, 'rotate(-12deg)'), opacity: 0 },
          { transform: tr(bas, w, h, 'rotate(0deg) scale(1.1, .85)'), opacity: 1, offset: .45 },
          { transform: tr({ x: bas.x, y: bas.y - 8 }, w, h, 'rotate(4deg) scale(1)'), opacity: 1, offset: .6 },
          { transform: tr(bas, w, h, 'rotate(0deg) scale(1)'), opacity: 1, offset: .8 },
          { transform: tr(bas, w, h, 'scale(1.1)'), opacity: 0 }
        ], { duration: T(1100), easing: 'ease-out' });
        vie(d, 1100);
        a.apres(500, () => briques.etoiles({ vers: [{ x: bas.x - w / 2, y: bas.y - h / 2, w, h }], couleur: '#fff6d0', n: 5 }));
      }
      if (lourd) a.apres(480, () => a.secoueEcran(F().ecranSecoussePx, F().ecranSecousseMs));
      return 1150;
    },

    // ------------------------------------------------ les briques des chouettes et hiboux
    livre({ vers, couleur = C.or }) {
      for (const r of vers) {
        const c = centre(r);
        const lueur = noeud('fx-v', { width: '70px', height: '70px', borderRadius: '50%', background: `radial-gradient(circle, ${couleur} 0, transparent 65%)` });
        anime(lueur, [{ transform: tr(c, 70, 70, 'scale(.3)'), opacity: 0 }, { transform: tr({ x: c.x, y: c.y - 10 }, 70, 70, 'scale(1.3)'), opacity: .8, offset: .5 }, { transform: tr({ x: c.x, y: c.y - 20 }, 70, 70, 'scale(1.6)'), opacity: 0 }], { duration: T(900), easing: 'ease-out' });
        vie(lueur, 900);
        for (const [sens, origine] of [[-1, '100% 50%'], [1, '0 50%']]) {
          const p = { x: c.x + sens * 10, y: c.y };
          const d = noeud('fx-v', { width: '20px', height: '27px', background: '#fbf6e8', border: `2px solid ${couleur}`, borderRadius: sens < 0 ? '4px 1px 1px 4px' : '1px 4px 4px 1px', transformOrigin: origine });
          anime(d, [
            { transform: tr(p, 20, 27, 'scaleX(0)'), opacity: 0 },
            { transform: tr(p, 20, 27, 'scaleX(1)'), opacity: 1, offset: .35 },
            { transform: tr(p, 20, 27, 'scaleX(1)'), opacity: 1, offset: .75 },
            { transform: tr(p, 20, 27, 'scaleX(1) translateY(-6px)'), opacity: 0 }
          ], { duration: T(900), easing: 'ease-out' });
          vie(d, 900);
        }
        a.apres(320, () => briques.etoiles({ vers: [{ x: c.x - 25, y: c.y - 35, w: 50, h: 30 }], couleur, n: 4 }));
      }
      return 950;
    },
    tourbillon({ vers, couleur = C.cyan, n = 10, retour = false }) {
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2;
          const frames = [];
          for (let k = 0; k <= 6; k++) {
            const f = k / 6, ang = a0 + f * Math.PI * 3, rad = 40 * (1 - f) + 6;
            frames.push({ transform: tr({ x: c.x + Math.cos(ang) * rad, y: c.y + Math.sin(ang) * rad * .7 }, 7, 7), opacity: k === 0 || k === 6 ? 0 : .95, offset: f });
          }
          const d = noeud('fx-v', { width: '7px', height: '7px', borderRadius: '50%', background: couleur, boxShadow: `0 0 6px ${couleur}` });
          anime(d, frames, { duration: T(820), delay: T(i * 20), easing: 'ease-in' });
          vie(d, 820 + i * 20);
        }
        if (retour) a.apres(700, () => carteQuiMonte(r));
      }
      return retour ? 1400 : 900;
    },
    rafale({ de, vers, couleur = C.blanc, retour = false }) {
      for (const r of vers) {
        const q = centre(r);
        const dx = q.x - de.x, dy = q.y - de.y, long = Math.hypot(dx, dy) || 1, ux = dx / long, uy = dy / long;
        for (let i = -3; i <= 3; i++) {
          const p = { x: de.x - uy * i * 10, y: de.y + ux * i * 10 };
          const fin = { x: q.x - uy * i * 10 + ux * 30, y: q.y + ux * i * 10 + uy * 30 };
          voyageur(p, fin, { couleur, taille: 4, ms: 420, delai: Math.abs(i) * 30, courbe: 6 });
          segment(p, { x: p.x + ux * 40, y: p.y + uy * 40 }, { couleur, epaisseur: 2, ms: 300, delai: Math.abs(i) * 30, lueur: false });
        }
        a.apres(380, () => a.anneau(r, couleur));
        if (retour) a.apres(520, () => carteQuiMonte(r));
      }
      return retour ? 1250 : 700;
    },
    constellation({ couleur = '#e8e0ff', n = 7 }) {
      const { w, h } = L();
      const pts = [];
      for (let i = 0; i < n; i++) pts.push({ x: w * (.12 + .76 * (i / (n - 1))) + alea(-14, 14), y: h * alea(.08, .36) });
      pts.forEach((p, i) => {
        const d = noeud('fx-v', { width: '14px', height: '14px', background: couleur, clipPath: etoileClip, filter: `drop-shadow(0 0 6px ${couleur})` });
        anime(d, [
          { transform: tr(p, 14, 14, 'scale(0)'), opacity: 0 },
          { transform: tr(p, 14, 14, 'scale(1.3) rotate(45deg)'), opacity: 1, offset: .3 },
          { transform: tr(p, 14, 14, 'scale(1) rotate(45deg)'), opacity: 1, offset: .8 },
          { transform: tr(p, 14, 14, 'scale(0) rotate(90deg)'), opacity: 0 }
        ], { duration: T(1600), delay: T(i * 90), easing: 'ease-out' });
        vie(d, 1600 + i * 90);
        if (i) segment(pts[i - 1], p, { couleur, epaisseur: 1.5, ms: 1300, delai: 300 + i * 90 });
      });
      return 1600 + n * 90;
    },
    orage({ vers, couleur = C.or }) {
      briques.nuit({ couleur: '#05030a', lourd: false });
      const cibles = vers && vers.length ? vers : [];
      cibles.forEach((r, k) => {
        const q = centre(r);
        a.apres(250 + k * 90, () => {
          const pts = [{ x: q.x + alea(-30, 30), y: 0 }];
          for (let i = 1; i <= 4; i++) pts.push({ x: q.x + alea(-24, 24), y: q.y * (i / 5) });
          pts.push(q);
          pts.forEach((p, i) => { if (i) segment(pts[i - 1], p, { couleur, epaisseur: 5, ms: 260, delai: i * 30 }); });
          a.eclair(r, '#fff');
          a.etincelles(r, couleur, 10);
        });
      });
      a.apres(260, () => a.secoueEcran(F().ecranSecoussePx * 1.4, F().ecranSecousseMs * 1.4));
      return 1100;
    },
    zzz({ vers, couleur = '#c9b6ff' }) {
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < 3; i++) {
          const s = 12 + i * 5;
          const d = noeud('fx-v', { color: couleur, fontWeight: '900', fontSize: s + 'px', lineHeight: '1', textShadow: '0 0 6px rgba(0,0,0,.6)' }, 'z');
          anime(d, [
            { transform: `translate(${c.x + 8}px, ${c.y - 6}px) rotate(-10deg) scale(.4)`, opacity: 0 },
            { transform: `translate(${c.x + 18 + i * 6}px, ${c.y - 22 - i * 8}px) rotate(8deg) scale(1)`, opacity: 1, offset: .45 },
            { transform: `translate(${c.x + 30 + i * 10}px, ${c.y - 46 - i * 12}px) rotate(-6deg) scale(1.1)`, opacity: 0 }
          ], { duration: T(1100), delay: T(i * 220), easing: 'ease-out' });
          vie(d, 1100 + i * 220);
        }
      }
      return 1500;
    },
    horloge({ vers, couleur = C.or, grand = false, coups = 0 }) {
      const { w, h } = L();
      const s = grand ? 120 : 48;
      const ps = grand ? [{ x: w / 2, y: h * .42 }] : vers.map(centre);
      for (const p of ps) {
        const face = noeud('fx-v', { width: s + 'px', height: s + 'px', borderRadius: '50%', border: `3px solid ${couleur}`, background: 'rgba(10,8,15,.75)', boxShadow: `0 0 14px ${couleur}` },
          [0, 1, 2, 3].map(k => bout(s / 2 - 1.5 + Math.cos(k * Math.PI / 2) * (s / 2 - 8), s / 2 - 1.5 + Math.sin(k * Math.PI / 2) * (s / 2 - 8), 3, 3, `background:${couleur};border-radius:50%`)).join(''));
        const tourne = (longueur, epaisseur, tours) => {
          const d = noeud('fx-v', { width: epaisseur + 'px', height: longueur + 'px', background: couleur, borderRadius: epaisseur + 'px', transformOrigin: '50% 100%' });
          const t = deg => `translate(${p.x - epaisseur / 2}px, ${p.y - longueur}px) rotate(${deg}deg)`;
          anime(d, [{ transform: t(0), opacity: 0 }, { transform: t(0), opacity: 1, offset: .15 }, { transform: t(360 * tours), opacity: 1, offset: .85 }, { transform: t(360 * tours), opacity: 0 }], { duration: T(1300), easing: 'ease-in-out' });
          vie(d, 1300);
        };
        tourne(s * .4, 3, 2);
        tourne(s * .26, 4, grand ? 1 : .25);
        anime(face, [{ transform: tr(p, s, s, 'scale(.3)'), opacity: 0 }, { transform: tr(p, s, s, 'scale(1)'), opacity: 1, offset: .15 }, { transform: tr(p, s, s, 'scale(1)'), opacity: 1, offset: .85 }, { transform: tr(p, s, s, 'scale(1.15)'), opacity: 0 }], { duration: T(1300), easing: 'ease-out' });
        vie(face, 1300);
        for (let k = 0; k < coups; k++) a.apres(1050 + k * 70, () => a.anneau({ x: p.x - s / 2, y: p.y - s / 2, w: s, h: s }, couleur));
      }
      return 1300 + coups * 70;
    },
    oeuf({ vers, couleur = C.creme, fele = false }) {
      for (const r of vers) {
        const c = centre(r);
        const d = noeud('fx-v', { width: '30px', height: '38px', borderRadius: '50% 50% 46% 46% / 60% 60% 40% 40%', background: `radial-gradient(circle at 35% 30%, #fff 0, ${couleur} 60%)`, boxShadow: '0 2px 6px rgba(0,0,0,.4)', transformOrigin: '50% 100%' });
        anime(d, [
          { transform: tr(c, 30, 38, 'rotate(0deg) scale(.4)'), opacity: 0 },
          { transform: tr(c, 30, 38, 'rotate(-12deg) scale(1)'), opacity: 1, offset: .25 },
          { transform: tr(c, 30, 38, 'rotate(10deg)'), opacity: 1, offset: .45 },
          { transform: tr(c, 30, 38, 'rotate(-7deg)'), opacity: 1, offset: .62 },
          { transform: tr(c, 30, 38, 'rotate(0deg)'), opacity: 1, offset: .8 },
          { transform: tr(c, 30, 38, 'scale(1.05)'), opacity: 0 }
        ], { duration: T(1000), easing: 'ease-in-out' });
        vie(d, 1000);
        a.apres(480, () => {
          const pts = [{ x: c.x - 12, y: c.y }, { x: c.x - 5, y: c.y - 5 }, { x: c.x + 1, y: c.y + 3 }, { x: c.x + 7, y: c.y - 4 }, { x: c.x + 12, y: c.y + 1 }];
          pts.forEach((p, i) => { if (i) segment(pts[i - 1], p, { couleur: '#5b4a2e', epaisseur: 2, ms: 400, lueur: false }); });
          if (fele) a.etincelles(r, couleur, 8);
        });
      }
      return 1050;
    },
    plume_douce({ vers, couleur = C.blanc, n = 4, gros = false }) {
      const w = gros ? 13 : 8, h = gros ? 30 : 20;
      for (const r of vers) {
        for (let i = 0; i < n; i++) {
          const x = r.x + r.w * alea(.1, .9);
          const d = noeud('fx-v', { width: w + 'px', height: h + 'px', borderRadius: '50% 50% 50% 50% / 80% 80% 20% 20%', background: couleur, boxShadow: '0 0 4px rgba(0,0,0,.35)' });
          const y0 = r.y - 50, y1 = r.y + r.h * .8;
          anime(d, [
            { transform: `translate(${x}px, ${y0}px) rotate(-25deg)`, opacity: 0 },
            { transform: `translate(${x + 14}px, ${y0 + (y1 - y0) * .33}px) rotate(20deg)`, opacity: 1, offset: .3 },
            { transform: `translate(${x - 12}px, ${y0 + (y1 - y0) * .66}px) rotate(-18deg)`, opacity: 1, offset: .65 },
            { transform: `translate(${x + 6}px, ${y1}px) rotate(12deg)`, opacity: 0 }
          ], { duration: T(1300), delay: T(i * 140), easing: 'ease-in-out' });
          vie(d, 1300 + i * 140);
        }
      }
      return 1300 + n * 140;
    },

    // ------------------------------------------------ les briques des cameleons et des couleurs
    eclats({ vers, couleur = C.cyan, sens = 'dehors', petit = false }) {
      for (const r of vers) {
        const c = centre(r);
        const n = petit ? 6 : 10;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + alea(-.2, .2), dist = alea(30, 54) * (petit ? .7 : 1), s = alea(8, 14);
          const loin = { x: c.x + Math.cos(ang) * dist, y: c.y + Math.sin(ang) * dist };
          const [p0, p1] = sens === 'dedans' ? [loin, c] : [c, loin];
          const d = noeud('fx-v', { width: s + 'px', height: s + 'px', background: `linear-gradient(135deg, #fff, ${couleur})`, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)', filter: `drop-shadow(0 0 4px ${couleur})` });
          anime(d, [
            { transform: tr(p0, s, s, `rotate(0deg) scale(${sens === 'dedans' ? 1 : .4})`), opacity: 0 },
            { transform: tr({ x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }, s, s, 'rotate(180deg) scale(1.1)'), opacity: 1, offset: .5 },
            { transform: tr(p1, s, s, `rotate(360deg) scale(${sens === 'dedans' ? .3 : 1})`), opacity: 0 }
          ], { duration: T(620), delay: T(i * 20), easing: sens === 'dedans' ? 'ease-in' : 'ease-out' });
          vie(d, 620 + i * 20);
        }
        if (sens === 'dedans') a.apres(560, () => a.eclair(r, couleur));
      }
      return 700;
    },
    arcenciel({ vers, grand = false }) {
      const { w } = L();
      const cibles = grand || !vers || !vers.length ? [{ x: 0, y: (vers && vers[0] ? vers[0].y : 200), w, h: 60 }] : vers;
      for (const r of cibles) {
        const c = centre(r);
        const lw = grand ? w * .95 : Math.max(70, r.w * 1.4), lh = lw / 2;
        const bandes = `radial-gradient(circle at 50% 100%, transparent 44%, ${ARC[5]} 45% 52%, ${ARC[4]} 52% 59%, ${ARC[3]} 59% 66%, ${ARC[2]} 66% 73%, ${ARC[1]} 73% 80%, ${ARC[0]} 80% 87%, transparent 88%)`;
        const p = { x: c.x, y: c.y - lh / 2 + (grand ? 0 : 6) };
        const d = noeud('fx-v', { width: lw + 'px', height: lh + 'px', background: bandes, transformOrigin: '50% 100%' });
        anime(d, [
          { transform: tr(p, lw, lh, 'scale(.4, .1)'), opacity: 0 },
          { transform: tr(p, lw, lh, 'scale(1, 1)'), opacity: .85, offset: .4 },
          { transform: tr(p, lw, lh, 'scale(1.03, 1.03)'), opacity: .85, offset: .75 },
          { transform: tr(p, lw, lh, 'scale(1.08, 1.08)'), opacity: 0 }
        ], { duration: T(grand ? 1300 : 900), easing: 'ease-out' });
        vie(d, grand ? 1300 : 900);
      }
      if (grand) a.secoueEcran(F().ecranSecoussePx * .6, F().ecranSecousseMs);
      return grand ? 1300 : 900;
    },
    masques({ de, vers, n = 2 }) {
      const cs = [C.or, C.rose, C.cyan, C.violet];
      const cibles = vers && vers.length ? vers : [];
      let k = 0;
      for (const r of cibles) {
        for (let i = 0; i < n; i++, k++) {
          const col = cs[k % cs.length];
          const html = bout(0, 0, 34, 18, `border-radius:50% 50% 45% 45% / 60% 60% 40% 40%;background:${col};box-shadow:0 0 8px ${col}`) + bout(6, 5, 9, 6, 'border-radius:50%;background:#120a1a') + bout(19, 5, 9, 6, 'border-radius:50%;background:#120a1a');
          const q = { x: centre(r).x + (i - (n - 1) / 2) * 20, y: centre(r).y };
          const d = noeud('fx-v', { width: '34px', height: '18px' }, html);
          const m = { x: (de.x + q.x) / 2 + (k % 2 ? 30 : -30), y: Math.max(14, (de.y + q.y) / 2 - 30) };
          anime(d, [
            { transform: tr(de, 34, 18, 'rotate(0deg) scale(.4)'), opacity: 0 },
            { transform: tr(m, 34, 18, 'rotate(200deg) scale(1.2)'), opacity: 1, offset: .5 },
            { transform: tr(q, 34, 18, 'rotate(360deg) scale(1)'), opacity: 1, offset: .85 },
            { transform: tr(q, 34, 18, 'rotate(370deg) scale(1.2)'), opacity: 0 }
          ], { duration: T(900), delay: T(k * 80), easing: 'ease-in-out' });
          vie(d, 900 + k * 80);
        }
      }
      return 900 + k * 80;
    },
    mouches({ vers, couleur = '#1a1a1a' }) {
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < 6; i++) {
          const frames = [];
          for (let k = 0; k <= 6; k++) {
            const f = k / 6, p = k === 6 ? { x: c.x, y: c.y - r.h * .1 } : { x: c.x + alea(-r.w * .6, r.w * .6), y: c.y + alea(-r.h * .6, r.h * .3) };
            frames.push({ transform: tr(p, 5, 5, `scale(${k === 6 ? .2 : 1})`), opacity: k === 0 ? 0 : k === 6 ? 0 : 1, offset: f });
          }
          const d = noeud('fx-v', { width: '5px', height: '5px', borderRadius: '50%', background: couleur, boxShadow: '0 0 0 2px rgba(255,255,255,.35)' });
          anime(d, frames, { duration: T(1100), delay: T(i * 40), easing: 'linear' });
          vie(d, 1100 + i * 40);
        }
        a.apres(1050, () => a.anneau(r, '#ff7fb0'));
      }
      return 1250;
    },
    piece({ de, vers, couleur = C.or }) {
      for (const r of vers) {
        const q = centre(r);
        const html = bout(0, 0, 28, 28, `border-radius:50%;background:radial-gradient(circle at 40% 35%, #fff6d0 0, ${couleur} 55%);border:2px solid #b8862b;box-sizing:border-box`);
        const d = noeud('fx-v', { width: '28px', height: '28px', filter: `drop-shadow(0 0 5px ${couleur})` }, html);
        const frames = [];
        for (let k = 0; k <= 8; k++) {
          const f = k / 8, monte = f < .6 ? Math.sin((f / .6) * Math.PI) * 50 : 0;
          const p = f < .6 ? { x: de.x, y: de.y - monte } : { x: de.x + (q.x - de.x) * ((f - .6) / .4), y: de.y + (q.y - de.y) * ((f - .6) / .4) };
          frames.push({ transform: tr(p, 28, 28, `scaleX(${k % 2 ? .12 : 1})`), opacity: k === 0 ? 0 : 1, offset: f });
        }
        anime(d, frames, { duration: T(1000), easing: 'linear' });
        vie(d, 1000);
        a.apres(980, () => briques.facettes({ vers: [r] }));
      }
      return 1300;
    },
    hypnose({ vers, couleur = C.violet }) {
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < 4; i++) {
          const s = 22 + i * 16;
          const d = noeud('fx-v', { width: s + 'px', height: s + 'px', borderRadius: '50%', border: `3px dashed ${i % 2 ? '#fff' : couleur}`, boxShadow: `0 0 8px ${couleur}` });
          anime(d, [
            { transform: tr(c, s, s, 'rotate(0deg) scale(.3)'), opacity: 0 },
            { transform: tr(c, s, s, `rotate(${i % 2 ? -180 : 180}deg) scale(1)`), opacity: 1, offset: .4 },
            { transform: tr(c, s, s, `rotate(${i % 2 ? -360 : 360}deg) scale(.9)`), opacity: 1, offset: .8 },
            { transform: tr(c, s, s, `rotate(${i % 2 ? -420 : 420}deg) scale(.4)`), opacity: 0 }
          ], { duration: T(1200), delay: T(i * 60), easing: 'ease-in-out' });
          vie(d, 1200 + i * 60);
        }
      }
      return 1400;
    },
    tambour({ vers, couleur = C.cyan }) {
      for (let i = 0; i < 3; i++) {
        a.apres(i * 230, () => {
          for (const r of vers) { a.anneau(r, couleur, 1); a.etincelles(r, couleur, 3); }
          a.secoueEcran(3, 150);
        });
      }
      return 900;
    },
    voile({ vers, couleur = 'arcenciel' }) {
      for (const r of vers) {
        const c = centre(r);
        const w = r.w * 1.25, h = r.h * 1.35;
        const fond = couleur === 'arcenciel' ? `linear-gradient(180deg, ${ARC.map(x => x + '99').join(', ')})` : `linear-gradient(180deg, ${couleur}, transparent)`;
        const d = noeud('fx-v', { width: w + 'px', height: h + 'px', borderRadius: '10px', background: fond, transformOrigin: '50% 0' });
        anime(d, [
          { transform: tr(c, w, h, 'scaleY(0)'), opacity: 0 },
          { transform: tr(c, w, h, 'scaleY(1)'), opacity: .7, offset: .45 },
          { transform: tr(c, w, h, 'scaleY(1)'), opacity: .5, offset: .75 },
          { transform: tr(c, w, h, 'scaleY(1.05)'), opacity: 0 }
        ], { duration: T(950), easing: 'ease-out' });
        vie(d, 950);
      }
      return 950;
    },
    mue({ vers, couleur = '#b8ffb0' }) {
      briques.eclats({ vers, couleur, sens: 'dehors' });
      for (const r of vers) a.apres(420, () => carteQuiMonte(r));
      return 1150;
    },
    fleur({ vers, couleur = C.rose, bouton = false }) {
      const pw = bouton ? 7 : 11, ph = bouton ? 12 : 19;
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < 5; i++) {
          const d = noeud('fx-v', { width: pw + 'px', height: ph + 'px', borderRadius: '50% 50% 50% 50% / 70% 70% 30% 30%', background: couleur, transformOrigin: '50% 100%', boxShadow: `0 0 4px ${couleur}` });
          const t = s => `translate(${c.x - pw / 2}px, ${c.y - ph}px) rotate(${i * 72}deg) scale(${s})`;
          anime(d, [{ transform: t(0), opacity: 0 }, { transform: t(1.1), opacity: 1, offset: .45 }, { transform: t(1), opacity: 1, offset: .75 }, { transform: t(1.2), opacity: 0 }], { duration: T(1000), delay: T(i * 40), easing: 'ease-out' });
          vie(d, 1000 + i * 40);
        }
        const coeur = noeud('fx-v', { width: '8px', height: '8px', borderRadius: '50%', background: C.jaune });
        anime(coeur, [{ transform: tr(c, 8, 8, 'scale(0)'), opacity: 0 }, { transform: tr(c, 8, 8, 'scale(1.2)'), opacity: 1, offset: .4 }, { transform: tr(c, 8, 8, 'scale(1)'), opacity: 0 }], { duration: T(1000), easing: 'ease-out' });
        vie(coeur, 1000);
      }
      return 1200;
    },
    descente({ vers, couleur = '#a8e0ff' }) {
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < 3; i++) {
          const s = 14 - i * 3, x = c.x + (i - 1) * 12;
          const d = noeud('fx-v', { width: s + 'px', height: s + 'px', borderRadius: '50%', background: couleur, boxShadow: `0 0 14px ${couleur}` });
          anime(d, [
            { transform: `translate(${x - s / 2}px, ${Math.max(4, c.y - 120)}px) scale(.6)`, opacity: 0 },
            { transform: `translate(${x - 6 - s / 2}px, ${c.y - 50}px) scale(1)`, opacity: .9, offset: .55 },
            { transform: `translate(${c.x - s / 2}px, ${c.y}px) scale(.4)`, opacity: 0 }
          ], { duration: T(900), delay: T(i * 110), easing: 'ease-in' });
          vie(d, 900 + i * 110);
        }
        a.apres(950, () => a.anneau(r, couleur));
      }
      return 1200;
    },
    pieces({ vers, couleur = C.or, n = 6, pluie = false }) {
      for (const r of vers) {
        const c = centre(r);
        for (let i = 0; i < n; i++) {
          const d = noeud('fx-v', { width: '13px', height: '13px', borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, #fff6d0 0, ${couleur} 60%)`, border: '2px solid #b8862b', boxSizing: 'border-box' });
          const x = r.x + r.w * alea(.1, .9);
          const frames = pluie ? [
            { transform: tr({ x, y: r.y - 80 }, 13, 13, 'scaleX(1)'), opacity: 0 },
            { transform: tr({ x, y: r.y - 30 }, 13, 13, 'scaleX(.2)'), opacity: 1, offset: .3 },
            { transform: tr({ x, y: r.y + r.h * .5 }, 13, 13, 'scaleX(1)'), opacity: 1, offset: .75 },
            { transform: tr({ x, y: r.y + r.h * .7 }, 13, 13, 'scaleX(.3)'), opacity: 0 }
          ] : [
            { transform: tr(c, 13, 13, 'scaleX(1)'), opacity: 0 },
            { transform: tr({ x: c.x + (x - c.x) * .6, y: Math.max(10, c.y - alea(40, 70)) }, 13, 13, 'scaleX(.2)'), opacity: 1, offset: .45 },
            { transform: tr({ x, y: c.y + alea(0, 20) }, 13, 13, 'scaleX(1)'), opacity: 0 }
          ];
          anime(d, frames, { duration: T(800), delay: T(i * 55), easing: pluie ? 'ease-in' : 'ease-out' });
          vie(d, 800 + i * 55);
        }
        a.apres(200, () => a.etincelles(r, couleur, 5));
      }
      return 800 + n * 55;
    },
    explosion({ vers, couleur = C.orange, petit = false }) {
      for (const r of vers) {
        a.eclair(r, '#fff');
        a.anneau(r, couleur, petit ? 1 : 2);
        a.etincelles(r, couleur, petit ? 8 : 16);
        briques.fumee({ vers: [r], couleur: '#6b5b4a', n: petit ? 3 : 6, petit });
      }
      if (!petit) a.secoueEcran(F().ecranSecoussePx * 1.4, F().ecranSecousseMs);
      return 900;
    },
    clignote({ noeud: n }) {
      if (!n) return 0;
      anime(n, [{ opacity: 1 }, { opacity: .2, offset: .2 }, { opacity: 1, offset: .4 }, { opacity: .25, offset: .6 }, { opacity: 1 }], { duration: T(700), easing: 'linear', fill: 'none' });
      return 700;
    },
    dedouble({ noeud: n }) {
      if (!n || !a.cloneUnite) return 0;
      a.apres(380, () => {
        for (const sens of [-1, 1]) {
          const g = a.cloneUnite(n);
          if (!g) continue;
          g.style.boxShadow = `0 0 12px ${C.cyan}`;
          g.style.borderRadius = '10px';
          anime(g, [{ transform: 'translate(0,0)', opacity: .7 }, { transform: `translate(${sens * 44}px, -4px)`, opacity: .45, offset: .6 }, { transform: `translate(${sens * 60}px, -6px)`, opacity: 0 }], { duration: T(760), easing: 'ease-out' });
          vie(g, 760);
        }
      });
      return 1150;
    }
  };
  return briques;
}

// ============================================================ LA DERIVATION : ce qu'une carte non decrite ci-dessus montrerait
// Le THEME d'un heros (sa famille) : sa couleur, le projectile de ses degats directs, ce que la cible subit.
const THEMES = {
  Chien: { c: C.beige, proj: null, impact: 'souffle', ic: C.or },
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
      case 'draw': case 'cree': case 'renvoie_en_main':
        if (!s.lancer) { s.lancer = ['cartes', { couleur: th.c, n: 2 }]; s.vers = 'main'; }
        break;
      case 'melange_a_la_pioche':
        if (!s.lancer) { s.lancer = ['cartes', { couleur: C.bleu, n: 4, melange: true }]; s.vers = 'pioche'; }
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
      case 'prendre_le_controle':
        if (!s.lancer) { s.lancer = ['hypnose', { couleur: C.violet }]; s.vers = 'ennemi'; }
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
  const attaque = [];
  const cles = (card.keys || []).map(k => String(k).split(':')[0]);
  if (cles.includes('Charge')) attaque.push(['trainee', { couleur: th.c === C.blanc ? C.cyan : C.blanc }]);
  if (cles.includes('passe_murailles')) attaque.push(['fantome', { couleur: C.cyan }]);
  if (cles.includes('Venin')) attaque.push(['gouttes', { couleur: C.vert, quand: 'impact' }]);
  if (attaque.length) s.attaque = attaque;
  const declenche = {};
  if ((card.death || []).length) { s.mort = ['ame', { couleur: th.c }]; declenche.death = deOps(card.death, th); }
  if ((card.turnStart || []).length) declenche.turnStart = deOps(card.turnStart, th);
  if ((card.turnEnd || []).length) declenche.turnEnd = deOps(card.turnEnd, th);
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
/**
 * La signature d'une carte : ce qu'on en deduit, puis sa signature ecrite (`SIGNATURES`) par-dessus — moment par
 * moment, et pour `declenche`, declenchement par declenchement. `null` si on ne connait pas la carte.
 */
export function signatureDe(id) {
  if (!id) return null;
  if (memo.has(id)) return memo.get(id);
  const k = carteDe(id);
  if (!k && !SIGNATURES[id]) { memo.set(id, null); return null; }
  const auto = k ? signatureAuto(k.carte, k.espece) : {};
  const ecrite = SIGNATURES[id] || {};
  // Une signature ecrite qui dit son `lancer` dit aussi son `vers` (ils vont ensemble) : on ne garde pas celui du calcul.
  const base = ecrite.lancer ? { ...auto, vers: undefined, de: undefined } : auto;
  const sig = { ...base, ...ecrite, declenche: { ...(auto.declenche || {}), ...(ecrite.declenche || {}) } };
  memo.set(id, sig);
  return sig;
}
