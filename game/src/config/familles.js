// LES FAMILLES DE HEROS et leur RARETE : ce que montre l'ecran d'equipe (maquette « Deck Screen », 12 octobre 2026).
// Pas de l'equilibrage : de l'habillage et du rangement, regles par le game designer.
//
// Une famille regroupe une ou plusieurs ESPECES (le champ `species` d'un heros, ecrit par le builder) : c'est
// elle qui fait une puce de tri (« Chiens ») et une section de l'ecran. Elle donne aussi les couleurs de la
// carte d'un heros : `fond` (le ciel derriere le personnage) et `cadre` (le liseré interieur de la grande
// carte de l'ecran d'amelioration). Un heros dont l'espece n'est dans aucune famille tombe dans la derniere.
export const FAMILLES = [
  { id: 'chiens',      nom: 'Chiens',      especes: ['Chien'],              fond: '#ffbfbf', cadre: '#ff5252' },
  { id: 'chats',       nom: 'Chats',       especes: ['Chat'],               fond: '#bff9ff', cadre: '#29b6d6' },
  { id: 'corbeaux',    nom: 'Corbeaux',    especes: ['Corbeau', 'Faucon'],  fond: '#ddd0ff', cadre: '#8a5cf0' },
  { id: 'grenouilles', nom: 'Grenouilles', especes: ['Grenouille'],         fond: '#c2ffbf', cadre: '#3fbf3a' },
  { id: 'hiboux',      nom: 'Hiboux',      especes: ['Chouette', 'Hibou'],  fond: '#ffe6b3', cadre: '#f2a81d' },
  { id: 'cameleons',   nom: 'Caméléons',   especes: ['Cameleon'],           fond: '#ffd3f1', cadre: '#e05cb8' }
];

// La rarete d'un heros : la couleur du liseré de sa vignette. Lue sur la maquette : Medor et Felix en gris,
// Croc et Mistigri en bleu, les troisiemes de chaque famille en violet. Un heros absent de la table est commun.
export const RARETES = {
  commun: '#747474',
  rare: '#3f86dd',
  epique: '#da3fdd'
};
export const RARETE_DES_HEROS = {
  dog: 'commun', cat: 'commun', crow: 'commun', frog: 'commun', owl: 'commun', cameleon: 'commun',
  dog2: 'rare', cat2: 'rare', crow2: 'rare', frog2: 'rare', owl2: 'rare', cameleon2: 'rare',
  dog3: 'epique', cat3: 'epique', crow3: 'epique', frog3: 'epique', owl3: 'epique', cameleon3: 'epique'
};

/** La famille d'un heros (l'objet de `FAMILLES`). */
export const familleDe = heros => FAMILLES.find(f => f.especes.includes(heros.species)) || FAMILLES[FAMILLES.length - 1];

/** La couleur de rarete d'un heros. */
export const rareteDe = heros => RARETES[RARETE_DES_HEROS[heros.id]] || RARETES.commun;
