// GAME CONFIG — LES ARENES (spec « Refonte Overworld + Arenes », 16 octobre 2026).
//
// Une arene = un batiment de la carte du monde, un ennemi (config/ennemis.js) et sa FICHE : ce qu'il faut savoir
// avant le match (son archetype, ce que le combat te demande, la strategie qui le bat, ce qu'il punit, les heros
// conseilles). Vocabulaire : celui du CLAUDE.md racine (archetypes Combo / Aggro / Controle et leurs
// qualificatifs ; la fiche parle de STRATEGIE, le niveau qui se joue avant le match).
//
// Les textes viennent de l'onglet « encounters » de la feuille (colonnes `role`, `archetype`, `question`,
// `reponse`, `punit`, `heros_conseilles`) : ils sont recopies ici en valeurs par defaut, et la feuille les
// remplace des qu'elle est synchronisee (config/feuille.js, `appliqueArenes`). ⚠ Ce sont des textes PROPOSES,
// pas valides par le game designer : la fiche les marque « provisoires » (`textesValides: false`).
//
// La place d'une arene sur la carte est dans config/world.js (le point d'interet qui porte `arene: <id>`).
import { FEUILLE } from '../../data/feuille.data.js';
import { CHARACTERS } from './characters.js';
import { appliqueArenes } from './feuille.js';

export const ARCHETYPES = ['Aggro', 'Contrôle', 'Combo'];
export const SOUS_ARCHETYPES = ['Tempo', 'MidRange', 'Turbo', 'Hard', 'Soft', 'Pillow Fort', 'Fatigue'];

// Le batiment de chaque arene : thème libre pour l'instant, rapproche de l'archetype quand c'est evident
// (Pillow Maker <-> Pillow Fort). Les sprites sont dans Machines/ (le Coffee shop reste la boutique).
const B = n => `Machines/${n}.png`;

/** Les arenes, dans l'ordre de l'onglet « Arene ». `ennemi` = l'identifiant de config/ennemis.js. PROVISOIRE. */
export const ARENES = [
  { id: 'rabbit1', ennemi: 'rabbit1', batiment: B('Carrot Farm'), role: 'tutoriel', archetype: 'Aggro', sousArchetype: 'Tempo',
    question: 'Tu sais jouer tes cartes et frapper le héros ?', reponse: "N'importe quel trio", punit: 'Passer son tour sans rien poser',
    herosConseilles: [], typeDeck: 'Petits lapins, Passe-Murailles, Éclair, Lapin Garou qui grandit' },
  { id: 'cat1', ennemi: 'cat1', batiment: B('Tennis ball Factory'), role: 'apprentissage', archetype: 'Aggro', sousArchetype: 'Turbo',
    question: 'Tu tiens une course aux dégâts ?', reponse: 'Provocation, soin, bloquer tôt', punit: 'Ignorer son plateau pour taper le héros',
    herosConseilles: ['dog', 'dog3', 'frog'], typeDeck: 'Éclaireur Fou 5/1 Charge, Éclair, Griffes, Paresseux' },
  { id: 'crow1', ennemi: 'crow1', batiment: B('Nest Factory'), role: 'apprentissage', archetype: 'Aggro', sousArchetype: 'MidRange',
    question: "Tu tues la menace avant qu'elle grandisse ?", reponse: 'Retrait ciblé : dégâts directs, destruction', punit: 'Laisser vivre ce qui grandit, attendre',
    herosConseilles: ['crow', 'owl'], typeDeck: 'Jeune Faucon qui renforce la main, Brute, Paresseux' },
  { id: 'wolf', ennemi: 'wolf', batiment: B('Candle Baba Yaga Hut'), role: 'examen (boss 1)', archetype: 'Contrôle', sousArchetype: 'Soft',
    question: 'Tu sais ne pas tout poser ?', reponse: 'Unités à 5 PV et plus, garder des cartes, rejouer après le Souffle', punit: 'Un plateau large de petites unités',
    herosConseilles: ['dog', 'owl'], typeDeck: 'Souffle (4 à toutes tes unités), Remparts, Éclaireurs, Ralliement' },
  { id: 'frog1', ennemi: 'frog1', batiment: B('Nenuphar Farm'), role: 'respiration (la recrue brille)', archetype: 'Contrôle', sousArchetype: 'Hard',
    question: 'Tu sais quoi échanger contre un Venin ?', reponse: 'Petits corps et jetons pour prendre le Venin, sorts pour le retirer', punit: 'Attaquer un Venin avec sa grosse unite',
    herosConseilles: ['cameleon', 'cat'], typeDeck: 'Princesse Venimeuse, Paresseux, Brute, Sergent, Fiole' },
  { id: 'octo1', ennemi: 'octo1', batiment: B('Bottle Maker'), role: 'apprentissage', archetype: 'Contrôle', sousArchetype: 'Pillow Fort',
    question: 'Tu passes un mur ?', reponse: 'Passe-Murailles, Élusif, dégâts directs au héros, Fatigue', punit: 'Attaquer les Provocations une par une',
    herosConseilles: ['crow', 'cat2', 'owl3'], typeDeck: 'Brutes et Paresseux en Provocation, Colosse 8/8, Souffle' },
  { id: 'frogboss', ennemi: 'frogboss', batiment: B('Nenuphar Farm'), role: 'examen (boss 2)', archetype: 'Contrôle', sousArchetype: 'Hard',
    question: 'Tu gardes de quoi rejouer apres un plateau rasé ?', reponse: "Main pleine, râles d'agonie, cartes rejouées depuis la défausse", punit: 'Tout poser avant la Colère de Kamaji',
    herosConseilles: ['cat3', 'crow3'], typeDeck: 'Venin, Remparts, Colosses, Souffle, Colère de Kamaji, Pieuvre Mécanique' },
  { id: 'fox1', ennemi: 'fox1', batiment: B('Game Store'), role: 'respiration (la recrue brille)', archetype: 'Aggro', sousArchetype: 'Tempo',
    question: 'Tu choisis bien qui bloque ?', reponse: 'Venin contre les Colosses, Provocation contre les Éclaireurs', punit: 'Bloquer un Colosse avec une unité qui compte',
    herosConseilles: ['frog', 'frog2', 'frog3'], typeDeck: 'Éclaireurs Fous, Colosses 8/8, Souffle, Brutes' },
  { id: 'owlboss', ennemi: 'owlboss', batiment: B('Candle Baba Yaga Hut'), role: 'examen final (boss 3)', archetype: 'Contrôle', sousArchetype: 'Hard',
    question: 'Tu sais forcer ses reponses ?', reponse: 'Menacer pour faire partir une Colère, puis jouer le vrai plan ; tenir la duree', punit: 'Tout miser sur un seul plateau',
    herosConseilles: ['owl', 'cat3', 'owl3'], typeDeck: '3 Colères de Kamaji, 4 Souffles, soins, Colosses, 105 PV' },
  // Les cinq ennemis provisoires (config/ennemis.js) : textes ecrits par Claude, a relire.
  { id: 'sloth1', ennemi: 'sloth1', batiment: B('Pillow Maker'), role: 'apprentissage', archetype: 'Contrôle', sousArchetype: 'Pillow Fort',
    question: 'Tu sais gagner contre quelqu\'un qui ne fait que se protéger ?', reponse: 'Passe-Murailles, Élusif, dégâts directs ; frapper son héros plutôt que ses murs', punit: 'Échanger une à une contre ses Provocations pendant que son chien grandit',
    herosConseilles: ['crow', 'cat2'], typeDeck: 'Paresseux et Remparts en Provocation, Fioles, un Chien de la fatigue qui grandit' },
  { id: 'robin1', ennemi: 'robin1', batiment: B('Nest Factory'), role: 'apprentissage', archetype: 'Aggro', sousArchetype: 'Turbo',
    question: 'Tu survis aux quatre premiers tours ?', reponse: 'Provocations tôt, soins, unités a 2 PV et plus', punit: 'Garder ses cartes pour plus tard',
    herosConseilles: ['dog', 'dog3', 'frog2'], typeDeck: 'Éclaireurs Fous, Rouges-Gorges en Charge, Éclairs, Pique' },
  { id: 'panda1', ennemi: 'panda1', batiment: B('Game Store'), role: 'respiration', archetype: 'Combo', sousArchetype: 'Turbo',
    question: 'Tu sais couper un combo avant qu\'il parte ?', reponse: 'Retirer la pièce qui copie (Prisme, Chœur) des qu\'elle arrive', punit: 'Laisser ses unités se repondre tour apres tour',
    herosConseilles: ['crow', 'owl'], typeDeck: 'Prismes, Miroirs, Chœurs du cameleon Mirage, Rafles, Éclairs' },
  { id: 'goat1', ennemi: 'goat1', batiment: B('Bottle Maker'), role: 'apprentissage', archetype: 'Contrôle', sousArchetype: 'Fatigue',
    question: 'Tu sais finir avant la pile de fatigue ?', reponse: 'Mettre la pression des le début, ne pas tirer la partie en longueur', punit: 'Un deck lent qui veut jouer la duree',
    herosConseilles: ['dog2', 'cat2'], typeDeck: 'Nids et Berceuses de Morphée, Paresseux, Fioles — un deck court' },
  { id: 'octo2', ennemi: 'octo2', batiment: B('Tennis ball Factory'), role: 'examen', archetype: 'Aggro', sousArchetype: 'MidRange',
    question: 'Tu sais jouer contre quelqu\'un qui s\'adapte ?', reponse: 'Varier les menaces ; garder un retrait pour sa Pieuvre Mécanique', punit: 'Tout investir dans une seule grosse unite',
    herosConseilles: ['cat3', 'owl3', 'crow3'], typeDeck: 'Pieuvre Mécanique, Brutes, Vautours et Équarrisseurs de Morrigane, Souffle' }
].map(a => ({ textesValides: false, ...a }));

export const ARENE_PAR_ID = Object.fromEntries(ARENES.map(a => [a.id, a]));

// La feuille (onglet « encounters ») remplace ces textes des qu'elle est synchronisee.
appliqueArenes(ARENES, FEUILLE.encounters, CHARACTERS);

/** « Aggro · Tempo », pour l'affichage. */
export const libelleArchetype = a => [a.archetype, a.sousArchetype].filter(Boolean).join(' · ');
