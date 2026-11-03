// GAME CONFIG — LA SCENE DE LA BOUTIQUE : ce qui se voit. L'economie (prix, attentes, meubles, couts) vit dans le noyau
// (game/src/boutique/noyau/, genere par scripts/gen-boutique.mjs), jamais ici.
const M = n => `Decor/Kenney Furniture Kit/${n}`;
const H = n => `Graphical Assets/Characters/${n}.png`;

export const BOUTIQUE = {
  sauvegardeToutesLesS: 5,
  resumeHorsLigneDesS: 60,    // absence au-dela de laquelle le recapitulatif s'ouvre au retour
  resumeCartesMax: 10,        // cartes montrees par section du recapitulatif
  // Les concurrents des encheres d'achat, de faux joueurs en attendant le jeu en ligne : leur nom et leur avatar. Ce qu'ils misent
  // vit dans le noyau.
  rivaux: [
    { nom: 'f4ke_t3liau', image: H('Hero Cat 2') },
    { nom: 'Blue_Plane', image: H('Opponent Raven') },
    { nom: 'popular_player', image: H('Hero Dog 3') },
    { nom: 'mamie_chouette', image: H('Hero Owl 2') },
    { nom: 'baron.grenouille', image: H('Opponent Captain Frog') },
    { nom: 'xX_DamePie_Xx', image: H('Opponent Robin') },
    { nom: 'renard_filou', image: H('Opponent Snow Fox') },
    { nom: 'La_Taupe', image: H('Opponent Mouse') },
    { nom: 'cap_mulot', image: H('Hero Rabbit 3') },
    { nom: 'kitsune42', image: H('Opponent Kitsune') }
  ],
  // Le logo de chaque entreprise de grading, en attendant ceux du game designer. Leur nom et leur facon de noter vivent dans le noyau.
  logosGrading: { owl: H('Hero Owl 1'), frog: H('Hero Frog 1'), rabbit: H('Hero Rabbit 1') },
  dossierPoses: 'Decor/Kenney Toon Characters/',
  // Un client dessiné par le game designer vit dans son propre dossier (poses `<tête>_<pose>.png`, 96 × 128, pieds en bas).
  // (un sous-dossier par client, rangé par le game designer le 2 nov. 2026 ; « Jena » est celui de Jenna)
  dossierDe: Object.fromEntries(['ada', 'barnaby', 'boris', 'brock', 'cipher', 'jenna', 'richie', 'rook', 'spike', 'timmy']
    .map(t => [t, `Graphical Assets/Clients/${t === 'jenna' ? 'Jena' : t[0].toUpperCase() + t.slice(1)}/`])),
  // Le visage de chaque client (fiche de prix) : `Graphical Assets/Clients/Clients Thumbnails/`, allégé en 160 px par python (voir scripts/CLAUDE.md).
  visage: tete => `/game/vignettes/Clients/${tete}.webp`,
  // Nombre d'images du cycle de marche d'un client dessine (8 par defaut, comme les Kenney) : on en a retire qui boitaient.
  imagesDeMarche: { ada: 5, barnaby: 7, boris: 7, brock: 4, cipher: 7, jenna: 7, richie: 7, rook: 6, spike: 7, timmy: 5 },
  dossierMeubles: 'Decor/Kenney Furniture Kit/',
  // Retires du catalogue (leurs chaises sont maintenant celles de la table de jeu) ; un exemplaire deja pose reste dessine.
  meublesRetires: ['banc'],
  // L'ANIMATION D'UN DUEL de deux clients a une table de jeu (`Graphical Assets/Furnitures/Duel Animation/1…7.png`, 2305 x 2180 chacune,
  // decoupees autour des cartes par `scripts/gen-duel-frames.py` dans `game/vignettes/Duel/`). Les images se jouent dans l'ordre, une pause
  // table nue, puis ca recommence. `echelle` : px du monde par px d'image ; `dx`, `dy` : decalage du centre du tas de cartes par rapport au
  // centre de la case de la table (a regler a l'oeil si le dessin ne tombe pas au milieu du plateau).
  duel: { images: 7, dossier: '/game/vignettes/Duel/', echelle: 0.09, dx: 10, dy: -26, msParImage: 380, pauseMs: 2200 },
  // LE TOURNOI du tableau des defis (`boutique/tournoi.js`) : un tournoi a quatre, s'ouvre de temps en temps. Delais en secondes.
  tournoi: {
    premierS: [60, 240],       // avant le premier tournoi d'une partie
    delaiS: [600, 1500],       // entre la fin d'un tournoi (ou des inscriptions manquees) et le suivant
    inscriptionS: 900,         // les inscriptions restent ouvertes ce temps
    // Le gain depend du tour atteint : demi-finale perdue, finale perdue, tournoi gagne.
    recompenses: { perdu1: { booster: 'premium_standard', n: 0 }, finale: { booster: 'premium_standard', n: 1 }, victoire: { booster: 'premium_standard', n: 2 } }
  },
  // LE CARRE DE MISE (`ui/encheres-mini.js`) : le panneau pose sur le bord de l'ecran pour surencherir sans ouvrir les encheres.
  encheresMini: { lots: 3 },
  // Le DEFI d'un client : de temps en temps, un client s'assoit a une table vide, une bulle au-dessus de la tete, et attend un adversaire.
  defi: {
    delaiS: [180, 720],       // entre la fin d'un defi (relevé ou parti) et le suivant : 3 a 12 minutes, au hasard
    attenteS: 300,            // il attend ce temps avant de repartir, defi sans reponse
    recompense: { booster: 'premium_standard', n: 1 }
  },
  scene: {
    poseAssise: 'sit',        // la pose assise `<tete>_sit.png` (scripts/gen-clients-assis.py, depuis les "<Nom> Sitted" du game designer) ; null : mains devant (`hold`)
    assis: 0,                 // un client assis est decale de ce nombre de px vers le bas (negatif : releve) ; 0 depuis qu'il a sa pose assise
    largeurCaseImage: 440,    // largeur de la case dans un dessin rectifie (scripts/rectifie-meuble.py, `--largeur`)
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
  // Les meubles : leur image Kenney (`image` : une par orientation) ou un dessin du game designer (`fichier` : une seule image pour
  // toutes les orientations, rectifiee par scripts/rectifie-meuble.py, bas = coin avant de la case), leur echelle, et la hauteur de leur plateau (ou se pose une carte).
  // Echelle d'un dessin rectifie : 1 = il remplit sa case (une table) ; une chaise est plus petite que sa case (0.33, d'apres la maquette du game designer). `dessus` : hauteur du plateau au-dessus du sol.
  meubles: {
    presentoir: { fichier: 'Graphical Assets/Furnitures/Rectifies/table-presentoir.png', echelle: 1, dessus: 38 },
    tableJeu: {
      fichier: 'Graphical Assets/Furnitures/Rectifies/table-jeu.png', echelle: 1, dessus: 38,
      // Ses deux chaises (maquette « Playing Table ») : `x`, `y` = leur place dans la case de la table, `devant` = dessinee APRES le
      // client assis (la chaise du bas), `miroir`, `sens` = le cote ou le client regarde (1 = vers la droite de l'ecran), `acces` = la case d'ou il vient s'asseoir.
      sieges: [
        { fichier: 'Graphical Assets/Furnitures/Rectifies/chaise-top-down.png', echelle: 0.33, x: 0.0, y: 0.5, sens: 1, leve: -14, acces: [-1, 0] },
        { fichier: 'Graphical Assets/Furnitures/Rectifies/chaise.png', assise: 'Graphical Assets/Furnitures/Rectifies/chaise-assise.png', dossier: 'Graphical Assets/Furnitures/Rectifies/chaise-dossier.png', echelle: 0.25, x: 1.0, y: 0.5, dy: 12, devant: true, sens: -1, acces: [1, 0] }
      ]
    },
    // Les objets de l'agrandissement (sprites provisoires : un meuble Kenney et un repere (`badge`), en attendant ceux du game designer).
    estrade: { image: 'tableRound', echelle: 0.9, badge: '🔨' },
    rayon: { image: 'bookcaseOpen', echelle: 0.84, badge: '📦' },
    posteGrading: { image: 'cabinetTelevision', echelle: 0.84, badge: '⭐' },
    affiche: { image: 'books', echelle: 0.9, badge: '📢' },
    cafe: { image: 'kitchenBar', echelle: 0.9, badge: '☕' },
    defis: { image: 'televisionModern', echelle: 0.8, badge: '⚔️' },
    etagere: { image: 'bookcaseOpen', echelle: 0.84 },
    etagereBasse: { image: 'bookcaseOpenLow', echelle: 0.84 },
    comptoir: { image: 'kitchenBar', echelle: 0.9 },
    banc: { fichier: 'Graphical Assets/Furnitures/Rectifies/chaise.png', echelle: 0.25 },
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
    Timmy: { lettre: 'T', couleur: '#e4572e', tetes: ['timmy'] },
    Jenna: { lettre: 'J', couleur: '#8e5bd0', tetes: ['jenna'] },
    Spike: { lettre: 'S', couleur: '#2f80c9', tetes: ['spike'] },
    Ada: { lettre: 'A', couleur: '#e8a21c', tetes: ['ada'] },
    Barnaby: { lettre: 'B', couleur: '#3aa76d', tetes: ['barnaby'] },
    Boris: { lettre: 'O', couleur: '#7a5a3a', tetes: ['boris'] },
    Cipher: { lettre: 'C', couleur: '#2aa7c9', tetes: ['cipher'] },
    Brock: { lettre: 'K', couleur: '#c94a6a', tetes: ['brock'] },
    Rook: { lettre: 'R', couleur: '#6a6a78', tetes: ['rook'] },
    Richie: { lettre: 'H', couleur: '#d4af37', tetes: ['richie'] }
  },
  // LES DIX CLIENTS, a leur arrivee (ui/client-intro.js) : « ce qu'il cherche » et « ce qu'il achete en priorite » ; rien sur le bulk. `apresTable` : Brock.
  clients: {
    Timmy: { cherche: 'Big, spectacular cards', prioritaire: 'Anything: he is not picky' },
    Jenna: { cherche: 'Combo pieces and odd finds', prioritaire: 'The cards flagged for her' },
    Spike: { cherche: 'Cards that win games', prioritaire: 'Strong cards of the current meta' },
    Ada: { cherche: 'The power of your best hero', prioritaire: 'Cards of your highest-level hero' },
    Barnaby: { cherche: 'The latest products', prioritaire: 'Cards of the newest set you unlocked' },
    Boris: { cherche: 'Old school', prioritaire: 'Cards of the oldest products' },
    Cipher: { cherche: 'What you actually play', prioritaire: 'The cards you play the most' },
    Brock: { cherche: 'A game, then a deal', prioritaire: 'Buys right after a game at a table', apresTable: true },
    Rook: { cherche: 'The heroes you neglect', prioritaire: 'Cards of your least upgraded heroes' },
    Richie: { cherche: 'Shiny and rare', prioritaire: 'Foils and rare cards' }
  },
  // La couleur de chaque rang de la wishlist des heros (la tier list de reference du game designer).
  rangs: { S: '#ff7f7f', A: '#ffbf7f', B: '#ffff7f', C: '#7fff7f', D: '#7fbfff', N: '#cdb88f' },
  // CE QUE LES CLIENTS PENSENT D'UNE CARTE (onglet « Shop » de la fiche, `ui/fiche.js`). Chaque client juge sur DEUX axes qui lui sont propres :
  // la carte tombe dans une matrice 2 x 2 (haut / bas sur chaque axe, au `seuil` de l'axe, 0,5 par defaut) et chaque zone a SA phrase.
  // `axes` : deux de `cout`, `rarete`, `meta` (la performance de la carte dans la meta), `variante` (gradee / foil), `extension` (recente ?), `prix` ;
  // `nom` est ce qui s'affiche. `phrases` : la cle est `<zone du 1er axe>-<zone du 2e>` (`haut-bas` : haut sur le 1er, bas sur le 2e) ; `tons`
  // (facultatif) : 0 (il deteste) a 1 (il adore) par zone — la couleur —, sinon 0 / 0,5 / 1 selon les deux zones hautes. PHRASES PROVISOIRES.
  avisClients: {
    Timmy: {
      qui: 'Wants big turns that tell a story.',
      axes: [{ id: 'cout', nom: 'Cost' }, { id: 'rarete', nom: 'Rarity' }],
      phrases: { 'haut-haut': 'Huge AND rare: the card of a legendary turn!', 'haut-bas': 'Big cost, but plain… it might still make some noise.', 'bas-haut': 'Rare, but tiny: no spectacle.', 'bas-bas': 'Small and common: nothing to tell.' }
    },
    Jenna: {
      qui: 'Looks for cards that will make a combo.',
      axes: [{ id: 'meta', nom: 'Performance', seuil: 0.5 }, { id: 'cout', nom: 'Cost' }],
      phrases: { 'haut-haut': 'Too obvious, but sturdy: not for my combos.', 'haut-bas': 'Efficient and light: one more piece for my engine.', 'bas-haut': 'Ignored by the meta and pricey: a challenge for me!', 'bas-bas': 'Nobody wants it… I’ll find a use for it.' }
    },
    Spike: {
      qui: 'Plays to win, buys what performs.',
      axes: [{ id: 'meta', nom: 'Performance' }, { id: 'rarete', nom: 'Rarity' }],
      phrases: { 'haut-haut': 'Strong AND rare: I’ll pay full price.', 'haut-bas': 'Strong and easy to find: I want several copies.', 'bas-haut': 'Rare, but weak: I leave it to collectors.', 'bas-bas': 'Weak and common: no interest.' }
    }
,
    Ada: {
      qui: 'Follows your best hero.',
      axes: [{ id: 'nivHeros', nom: 'Hero level' }, { id: 'rarete', nom: 'Rarity' }],
      phrases: { 'haut-haut': 'My best hero\u2019s rare card? Sold.', 'haut-bas': 'A common, but my best hero uses it.', 'bas-haut': 'Rare, but not for my best hero.', 'bas-bas': 'Not my hero, not rare. Pass.' }
    },
    Barnaby: {
      qui: 'Wants the newest product.',
      axes: [{ id: 'nouveaute', nom: 'Newness' }, { id: 'prix', nom: 'Price', seuil: 0.3 }],
      phrases: { 'haut-haut': 'Brand new and valuable!', 'haut-bas': 'New and cheap: I\u2019ll take a few.', 'bas-haut': 'Old and pricey: no thanks.', 'bas-bas': 'Old and cheap: not for me.' }
    },
    Boris: {
      qui: 'Old school: the oldest products.',
      axes: [{ id: 'anciennete', nom: 'Age' }, { id: 'rarete', nom: 'Rarity' }],
      phrases: { 'haut-haut': 'A rare classic. Now we\u2019re talking.', 'haut-bas': 'An old common, with a story.', 'bas-haut': 'Rare, but too new for me.', 'bas-bas': 'New and common. Never.' }
    },
    Cipher: {
      qui: 'Buys what you play.',
      axes: [{ id: 'joue', nom: 'Played' }, { id: 'meta', nom: 'Performance', seuil: 0.5 }],
      phrases: { 'haut-haut': 'You play it, it wins: I need it.', 'haut-bas': 'You play it a lot, even if it is weak.', 'bas-haut': 'Strong, but you never play it.', 'bas-bas': 'Unplayed and weak.' }
    },
    Brock: {
      qui: 'Shops after a game at a table.',
      axes: [{ id: 'cout', nom: 'Cost' }, { id: 'meta', nom: 'Performance', seuil: 0.5 }],
      phrases: { 'haut-haut': 'Big and strong: a great table card.', 'haut-bas': 'Big but weak: fun at a table.', 'bas-haut': 'Cheap and strong: easy to learn.', 'bas-bas': 'Cheap and weak: filler.' }
    },
    Rook: {
      qui: 'Buys for the heroes you neglect.',
      axes: [{ id: 'retard', nom: 'Neglect' }, { id: 'rarete', nom: 'Rarity' }],
      phrases: { 'haut-haut': 'A rare card of a hero nobody levels!', 'haut-bas': 'A neglected hero\u2019s card: fair.', 'bas-haut': 'Rare, but the hero is already strong.', 'bas-bas': 'No interest.' }
    },
    Richie: {
      qui: 'Foils and rares only.',
      axes: [{ id: 'rarete', nom: 'Rarity' }, { id: 'variante', nom: 'Foil / graded', seuil: 0.5 }],
      phrases: { 'haut-haut': 'Rare AND shiny: take my money.', 'haut-bas': 'Rare, but plain. Meh.', 'bas-haut': 'Shiny, but too common.', 'bas-bas': 'Plain and common: no.' }
    }
  },
  // Ce que les clients disent d'un prix (le seuil vit dans le noyau). Des emoji en attendant les icones du game designer.
  reactions: {
    bonneAffaire: { signe: '🤩', texte: 'Bonne affaire !', fond: '#34c759' },
    bonPrix: { signe: '🤔', texte: 'Bon prix', fond: '#f6c945' },
    tropCher: { signe: '😠', texte: 'Trop cher', fond: '#e8352e' },
    pasAssezRare: { signe: '🤨', texte: 'Pas assez rare', fond: '#f08a2c' }
  },
  // L'OUVERTURE D'UN BOOSTER (ui/packs.js). `raretes` : une rarete citee arrive DE DOS et se retourne avec son effet ; les autres
  // arrivent de face, sans rien. `particules` : leur nombre ; `portee` : jusqu'ou elles volent (px).
  ouverture: {
    heros: { base: 'dog', premium: 'crow' },     // le dessin sur le booster, en attendant le sien
    bordTapPart: 0.3,                            // un toucher dans ce dernier tiers de l'ecran, de chaque cote, va de ce cote ; au milieu : collection
    veilleMs: 2000,                              // sans geste, la carte retournee se balance entre « collection » et « vente »
    balanceMs: 2400,                             // un aller-retour du balancement
    ligneDechirure: 14,                          // ou le haut se detache, en % de la hauteur
    seuilDechirure: .55,                         // le doigt a parcouru cette part de la largeur : le booster s'ouvre
    gerbeDechirure: 18,
    dechirureMs: 420,
    sortieMs: 620,
    retourneMs: 460,
    jetteMs: 240,
    particules: ['star_06', 'spark_05', 'star_01', 'magic_02', 'spark_01', 'star_08', 'magic_05', 'flare_01'],
    raretes: {
      rare: { particules: 18, portee: 170 },
      epic: { particules: 34, portee: 210, rayons: true },
      legendary: { particules: 60, portee: 260, rayons: true, secousse: true },
      mythic: { particules: 90, portee: 300, rayons: true, secousse: true }
    }
  },
  couleursRaretes: { common: '#b9b2a3', rare: '#4f9bd9', epic: '#a35fd6', legendary: '#eea82e', mythic: '#e4482e' }
};
