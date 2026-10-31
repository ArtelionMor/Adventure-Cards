// GAME CONFIG — LA SCENE DE LA BOUTIQUE : ce qui se voit. L'economie (prix, attentes, meubles, couts) vit dans le noyau
// (game/src/boutique/noyau/, genere par scripts/gen-boutique.mjs), jamais ici.
const M = n => `Decor/Kenney Furniture Kit/${n}`;

export const BOUTIQUE = {
  sauvegardeToutesLesS: 5,
  resumeHorsLigneDesS: 60,    // absence au-dela de laquelle le resume s'ouvre au retour
  dossierPoses: 'Decor/Kenney Toon Characters/',
  dossierMeubles: 'Decor/Kenney Furniture Kit/',
  scene: {
    case: [110, 55],          // largeur et hauteur d'une case en isometrie (px, zoom 1)
    hauteurMur: 118,
    zoom: { depart: 0.52, min: 0.36, max: 1.5 },
    echelleClient: 0.66,
    vitesse: 1.9,             // cases par seconde
    clientsMax: 14,
    ambianceS: [3, 7],        // un visiteur de passage toutes les X a Y secondes
    regardeS: [3, 5],         // temps passe devant une vitrine
    avisS: 2.8,               // temps que reste affiche l'avis d'un client
    arriveeAvantVenteS: 14,   // l'acheteur arrive ce temps avant la vente
    tableS: [18, 32],         // temps passe assis a une table
    fouilleBulkS: [4, 7],
    foule: { base: 3, parEnchere: 3, finale: 3, max: 9 },   // qui se presse devant le tableau ; `finale` : en plus sur les derniers 10 %
    criS: [1.2, 3.2],         // entre deux encheres criees par la foule
    tailleCarte: 40,          // une carte posee sur un presentoir
    boite: [3, 2],            // la boite de bulk, dans la zone reservee
    tapisEntree: 'rugDoormat'
  },
  // Les meubles : leur image Kenney, leur echelle, et la hauteur de leur plateau (ou se pose une carte).
  meubles: {
    presentoir: { image: 'tableCloth', echelle: 0.82, dessus: 56 },
    tableJeu: { image: 'table', echelle: 0.82, dessus: 56 },
    etagere: { image: 'bookcaseOpen', echelle: 0.84 },
    etagereBasse: { image: 'bookcaseOpenLow', echelle: 0.84 },
    comptoir: { image: 'kitchenBar', echelle: 0.9 },
    banc: { image: 'benchCushion', echelle: 0.9 },
    canape: { image: 'loungeSofa', echelle: 0.8 },
    plante: { image: 'pottedPlant', echelle: 1 },
    lampe: { image: 'lampSquareFloor', echelle: 1 },
    tapis: { image: 'rugSquare', echelle: 0.52, plat: true },
    cartons: { image: 'cardboardBoxClosed', echelle: 0.9 },
    television: { image: 'televisionModern', echelle: 0.8 }
  },
  // Quatre choix de sol et de murs, gratuits : [case claire, case sombre] et [mur, plinthe].
  sols: [['#a6dd7c', '#97d26e'], ['#e7c79a', '#dcb985'], ['#b9c4e6', '#a9b6dd'], ['#efd3dc', '#e4c2cd']],
  murs: [['#7a8390', '#f2a65a'], ['#9c6b4e', '#f0cf8a'], ['#5c6f8c', '#a8d0ec'], ['#7c5a86', '#f2b6d0']],
  fond: '#17141f',
  tapisEncheres: ['#a7443f', '#973b37'],
  // Chaque profil a ses tetes et sa couleur.
  profils: {
    Timmy: { lettre: 'T', couleur: '#e4572e', tetes: ['maleAdventurer', 'femaleAdventurer'] },
    Johnny: { lettre: 'J', couleur: '#8e5bd0', tetes: ['femalePerson', 'maleAdventurer'] },
    Spike: { lettre: 'S', couleur: '#2f80c9', tetes: ['malePerson', 'femalePerson'] }
  },
  // Ce que les clients disent d'un prix (le seuil vit dans le noyau). Des emoji en attendant les icones du game designer.
  reactions: {
    bonneAffaire: { signe: '🤩', texte: 'Bonne affaire !', fond: '#34c759' },
    bonPrix: { signe: '🤔', texte: 'Bon prix', fond: '#f6c945' },
    tropCher: { signe: '😠', texte: 'Trop cher', fond: '#e8352e' },
    pasAssezRare: { signe: '🤨', texte: 'Pas assez rare', fond: '#f08a2c' }
  },
  couleursRaretes: { common: '#b9b2a3', rare: '#4f9bd9', epic: '#a35fd6', legendaire: '#eea82e', mythique: '#e4482e' }
};
