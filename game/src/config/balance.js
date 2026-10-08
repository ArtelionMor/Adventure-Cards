// GAME CONFIG — c'est ici que le game designer tune le jeu.
// Aucune valeur d'equilibrage ne doit vivre ailleurs que dans ce fichier.
import { FEUILLE } from '../../data/feuille.data.js';
import { applique } from './feuille.js';

export const BALANCE = {
  version: '0.1.0',

  save: {
    key: 'adventure-card/save/v1',
    autosaveMs: 4000
  },

  progression: {
    maxLevel: 20,
    // XP necessaire pour passer du niveau L au niveau L+1
    xpToNext: L => Math.round(30 + 18 * L + 4 * L * L),
    xpPerFight: 14,
    xpBossBonus: 40
  },

  costs: {
    // Monnaie C : ameliorer un personnage du niveau L au niveau L+1
    charUpgrade: L => Math.round(18 + 12 * L + 1.6 * L * L),
    // Monnaie B : debloquer une carte switch
    switchCard: 25,
    // Monnaie A : acheter un personnage (apres avoir battu son boss)
    charUnlock: 40,
    // Monnaie C : progression path des stats generales (slots equipables, parcelles...)
    rosterSlots: [0, 150, 400],      // cout pour passer a 2 puis 3 persos equipes
    farmPlot: n => 25 + n * 45,      // cout de la parcelle n+1
    stallSlot: n => 60 + n * 90      // cout du slot d'etale n+1
  },

  // LE BOT. Le GDD veut un bot qui joue regulierement mal : c'est la marge de
  // progression que recupere le joueur quand il reprend la main en mode manuel.
  // `misplay` = part de coups tires au hasard. `malin` allume la lecture fine :
  // mana bien depense (sac a dos sur la main), meilleure attaque du plateau entier,
  // retraits gardes pour ce qui en vaut la peine. L'eteindre rend le bot naif.
  //   Un combat peut demander un niveau precis : createBattle(p, e, { ia: 'dur' }).
  ai: {
    defaut: 'normal',
    niveaux: {
      naif: { misplay: 0.25, malin: false },
      simple: { misplay: 0.12, malin: false },   // le bot d'origine du GDD
      normal: { misplay: 0.08, malin: true },
      dur: { misplay: 0.03, malin: true },
      // Le seul qui CHERCHE au lieu de suivre des regles : pour chaque coup possible
      // il finit la partie `rollouts` fois et garde celui qui gagne le plus souvent.
      // Environ 50 ms par decision : confortable en jeu, trop lent pour une grosse
      // matrice de matchups (`node scripts/matchups.mjs ... --fort` l'utilise quand
      // on veut verifier un matchup precis avec une reference solide).
      // TROIS RACCOURCIS ONT ETE ESSAYES, UN SEUL A SURVECU A LA MESURE.
      //   elimination (garde) : la moitie du budget pour tous les coups, on ecarte la
      //     moitie des candidats, on recommence. Mesure : 0.78 s/partie contre 1.14 s,
      //     pour des parties de MEME longueur (13.3 tours) et 50 % en duel direct
      //     contre la version sans raccourci — meme force, un tiers de temps en moins.
      //   troncature (abandonne, laisse a 0) : jouer N tours puis estimer la position
      //     au lieu de finir la partie. Sur le papier ca divise le cout par 3 ; en vrai
      //     le bot devient MYOPE — il optimise l'estimation au lieu de chercher la
      //     victoire, les parties passent de 13 a 38 tours et le tout finit 3x PLUS
      //     LENT. A ne retenter qu'avec une vraie fonction d'evaluation.
      //   rolloutRapide (abandonne, laisse a false) : parties imaginees jouees par une
      //     politique au hasard. Meme probleme, meme conclusion.
      // Le code des trois est en place dans ai.js : il suffit de changer ces valeurs.
      montecarlo: { misplay: 0, malin: true, rollouts: 10, troncature: 0, rolloutRapide: false, elimination: true },
      // LE CRAN DE SURETE. Aucun raccourci : chaque coup recoit le meme budget et chaque
      // rollout finit vraiment la partie. C'est la reference quand on veut en avoir le
      // coeur net — un tiers plus lent, pas plus juste pour autant.
      'montecarlo-exact': { misplay: 0, malin: true, rollouts: 10, troncature: 0, rolloutRapide: false, elimination: false }
    }
  },

  // L'INTERFACE DE COMBAT. Ce ne sont pas des regles de jeu, mais le « toucher » : ce qui
  // fait qu'un geste se lit comme un tap (agir) ou comme un appui long (lire).
  ui: {
    appuiLongMs: 400,       // au-dela de cette duree, le doigt pose LIT la carte au lieu d'agir
    toleranceDoigtPx: 10,   // un doigt qui glisse de plus que ca fait defiler, il ne lit ni n'agit

    // LES EFFETS DU COMBAT (ui/effets.js) : du ressenti, pas des regles. Tous les temps sont en
    // millisecondes a vitesse x1 ; le bouton x2 de la barre les divise. Decision du game
    // designer (8 octobre 2026) : les effets ont le droit d'ALLONGER le combat — le but est qu'on
    // comprenne ce qui se passe sans connaitre les cartes. Le mode auto attend donc la fin des
    // effets avant le coup suivant.
    fx: {
      vitesses: [1, 2],         // les crans du bouton de vitesse (x1, x2) ; pas de « sauter »
      fileMaxMs: 1200,          // en manuel, un film attend la fin du precedent, au plus ce temps (jamais de retard qui s'accumule)
      pauseApresMs: 320,        // en auto, le calme laisse apres les effets avant le coup suivant
      elanMs: 460,              // l'attaquant : recul, elan, retour (duree totale)
      elanImpact: 0.58,         // a quelle fraction de l'elan le coup touche
      elanPart: 0.6,            // quelle part du trajet vers la cible l'attaquant parcourt
      cadenceMs: 380,           // entre deux coups distincts d'une meme action (6 Foudre de suite)
      ripostePauseMs: 300,      // entre le coup et la riposte
      groupeMs: 45,             // entre deux cibles du MEME effet (une zone touche « ensemble »)
      secousseMs: 420,          // la cible qui encaisse tremble (amplitude decroissante)
      secoussePx: 8,
      flashMs: 260,             // l'eclair blanc sur la cible
      etincelles: 7,            // les eclats a l'impact
      chiffreMs: 1100,          // un chiffre flottant
      chiffreMontePx: 48,
      grosCoup: 5,              // a partir de ce montant perdu, l'ecran entier tremble
      ecranSecousseMs: 320,
      ecranSecoussePx: 6,
      piocheMs: 380,            // une carte piochee glisse jusqu'a sa place
      piocheDecalageMs: 80,     // entre deux cartes piochees ensemble
      volMs: 340,               // la carte jouee vole de la main au centre
      tenueMs: 420,             // elle reste lisible au centre avant de se resoudre
      sortieMs: 240,            // puis elle rejoint sa destination (plateau ou defausse)
      effetVolMs: 260,          // une carte-effet (rale d'agonie, debut/fin de tour...) part de son unite vers le centre
      effetTenueMs: 520,        // elle reste lisible
      effetSortieMs: 200,       // puis disparait
      popMs: 420,               // l'arrivee d'une unite (rebond)
      anneauMs: 620,            // l'anneau d'un changement d'etat (bouclier, aura, armure, mana)
      banniereMs: 1000,         // la banniere « Ton tour » traverse l'ecran
      banniereAvanceMs: 900,    // ce que la banniere retarde le coup suivant (elle finit de sortir pendant)
      // L'ecran de fin (ui/fin.js) : pas affecte par x1/x2, toucher l'ecran le termine d'un coup.
      fin: {
        titreMs: 650,           // le titre « Victoire » / « Defaite » s'abat
        premierePauseMs: 500,   // le calme avant la premiere recompense
        recompenseMs: 700,      // entre deux recompenses qui defilent
        compteMs: 800,          // le compteur d'une recompense (0 -> N)
        confettis: 34,          // la pluie de la victoire
        confettiMs: 2600
      },
      mortDelaiMs: 260,         // entre le coup qui tue et la mort
      mortMs: 520,
      ralenti: 1                // x N sur tous les temps : pour regarder un effet en capture
    }
  },

  combat: {
    // COMBIEN D'UNITES TIENNENT SUR UN PLATEAU. 0 = pas de limite : une invocation ne
    // rate plus faute de place et un allie ne « reste plus de cote ». C'est l'interface
    // qui encaisse — l'ecran de combat descale les vignettes pour que tout tienne sans
    // defilement. Remettre un nombre ici retablit le plafond partout (pose, invocation,
    // jouabilite) sans toucher au moteur.
    boardSize: 0,
    // COMBIEN DE CARTES TIENNENT EN MAIN. 0 = pas de limite (meme convention que
    // `boardSize`) : une pioche, une creation ou un retour en main ne rate plus faute de
    // place, et une main ne « deborde » jamais. Decision du game designer (8 octobre
    // 2026). C'est un changement d'equilibrage, pas de confort : les cartes qui comptent
    // la main n'ont plus de borne haute. Remettre un nombre ici retablit le plafond
    // partout (pioche, fatigue, creation, retour en main) sans toucher au moteur.
    handMax: 0,
    maxManaCap: 10,
    autoStepMs: 750,        // rythme du mode auto (spectacle idle)
    // Combien de cartes peuvent au maximum retourner dans une pioche pendant UN tour.
    // Sans ce plafond, « sort a 0 mana qui se remelange et fait piocher » se rejoue sans
    // fin dans le meme tour — la regle de non-remelange fermait cette porte, l'effet
    // « Melange dans la pioche » la rouvre. On coupe, et le journal le dit.
    maxRecyclageParTour: 30,
    // Combien de fois un camp peut piocher dans la PILE DE FATIGUE pendant UN tour.
    // La pile ne s'epuise jamais (chaque tirage en fait une copie), donc sans ce
    // plafond « sort a 0 mana qui fait piocher » se rejouerait sans fin : c'est
    // exactement la boucle que fermait l'ancienne regle « pioche finie, plus rien ».
    maxPiochesAVideParTour: 20,
    // PLAFOND DE TOURS (les deux camps confondus), garde-fou de derniere ligne : le
    // combat s'arrete et celui qui a le plus de PV l'emporte. Depuis que le deck ne
    // se remelange plus, la partie se termine presque toujours bien avant.
    maxTurns: 100
  },

  // LA COURBE DE DIFFICULTE, telle que `node scripts/simulate.mjs` la mesure.
  // On ne teste plus une equipe figee mais TOUTES LES COMBINAISONS de heros possibles :
  // en jeu, le joueur monte l'equipe qu'il veut, et c'est la pire combinaison qui dit
  // si une rencontre est un mur.
  simulation: {
    // Combien de heros le joueur emmene face a quelle rencontre. La liste se lit dans
    // l'ordre du monde : chaque palier prend `rencontres` rencontres a partir de la ou
    // s'est arrete le precedent, et le DERNIER ramasse tout le reste (`rencontres: 0`).
    paliers: [
      { rencontres: 2, heros: 1, niveau: 1 },
      { rencontres: 2, heros: 2, niveau: 5 },
      { rencontres: 0, heros: 3, niveau: 8 }
    ],
    // Parties jouees par combinaison. C'est le curseur precision / duree : a 20, une
    // case se lit a +/- 20 points, ce qui suffit pour reperer un mur ou un combat
    // gagne d'avance ; monte a 100 pour juger un ecart fin.
    parties: 20,
    // Combinaisons tirees au hasard par palier, 0 = toutes. Six heros font 20 equipes
    // de trois ; dix en feraient 120, et la simulation deviendrait longue.
    equipesMax: 0
  },

  farm: {
    saleIntervalMs: 15 * 60 * 1000,  // une vente toutes les 15 min (GDD)
    startPlots: 2,
    maxPlots: 8,
    startStallSlots: 2,
    maxStallSlots: 6,
    offlineCapMs: 12 * 60 * 60 * 1000 // plafond des gains hors-ligne
  },

  // Cadence de deblocage des personnages : nombre de nouveaux persos rendus
  // disponibles a l'achat le jour N depuis la premiere partie (GDD).
  unlockCadence: [6, 4, 3, 2, 1, 1, 0, 1, 0, 1, 0, 1]
};

// LA FEUILLE GOOGLE (« Config Adventure-Cards », onglet « animations ») remplace les valeurs de `ui.fx` ci-dessus :
// `scripts/sync-feuille.mjs` (ou le bouton « Feuille » de l'Atelier) l'ecrit dans game/data/feuille.data.js.
// Ce qui est dans la feuille gagne ; une ligne absente laisse la valeur de ce fichier (voir config/feuille.js).
applique(BALANCE, FEUILLE.animations);

export const TUNING_NOTE =
  "Toutes ces valeurs sont provisoires : elles servent a rendre la boucle jouable, pas a etre justes.";
