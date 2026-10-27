// GAME CONFIG — c'est ici que le game designer tune le jeu.
// Aucune valeur d'equilibrage ne doit vivre ailleurs que dans ce fichier.
import { FEUILLE } from '../../data/feuille.data.js';
import { applique, appliqueDepart } from './feuille.js';

export const BALANCE = {
  version: '0.1.0',

  save: {
    key: 'adventure-card/save/v1',
    autosaveMs: 4000
  },

  progression: {
    // Le palier le plus haut qu'une carte peut porter (l'echelle `lvl` des paliers du builder). Le NIVEAU d'un heros,
    // lui, compte ses ameliorations (une par palier : `etapesDe` dans config/characters.js) et va plus haut.
    maxLevel: 20,
    // LA PUISSANCE (annexe de la spec « Refonte Overworld + Arenes », 16 octobre 2026) : un nombre qui mesure la
    // progression du joueur. Elle part de 0 (`base`, c'etait 100 par heros) et ne fait que monter : la somme des
    // points de tout ce qui est debloque ou ameliore, chaque type d'evenement valant `gains[type]` — la colonne
    // `increase_power` de l'onglet `~settings` (la feuille prevaut si elle change). `parAmelioration` = une
    // amelioration de heros (le « +10 power » du bouton Upgrade : un palier de carte, `card_level_up`).
    // Elle ne verrouille rien : la fiche d'arene affiche « puissance conseillee » (`power_needed`) a cote d'elle.
    // puissanceJoueur() = tout ce que le joueur possede ; puissanceEquipe() = les heros alignes (state.js).
    puissance: {
      base: 0,
      parAmelioration: 10,
      gains: {
        card_level_up: 10, health_up: 10, mana_max_up: 10, starting_armor_up: 10, starting_hand_cards: 10,
        extra_card_in_deck: 10, fatigue_cards_buff: 10,
        start_mana: 50,
        buff_attack_ally: 20, buff_defense_ally: 20,
        nouveauHeros: 15,       // « new hero »
        nouveauTrinket: 10,     // « new trinket » (les reliques du Sac)
        retourAfk: 50,          // « AFK return » — pas encore branche
        amelioration: 10,       // « upgrade » : amelioration generique (place d'equipe, joker du profil)
        premium: 75             // « premium » — pas encore branche
      }
    },
    // XP necessaire pour passer du niveau L au niveau L+1
    xpToNext: L => Math.round(30 + 18 * L + 4 * L * L),
    xpPerFight: 14,
    xpBossBonus: 40
  },

  costs: {
    // Monnaie C (les pieces) : passer du palier L au palier L+1. Une amelioration ne coute qu'une PART de ce prix :
    // le cout d'un palier se partage entre les etapes qui l'atteignent (`coutEtape` dans state.js).
    charUpgrade: L => Math.round(18 + 12 * L + 1.6 * L * L),
    // Monnaie B : debloquer une carte switch
    switchCard: 25,
    // Monnaie A : acheter un personnage (apres avoir battu son boss)
    charUnlock: 40,
    // Monnaie C : progression path des stats generales (slots equipables, parcelles...)
    rosterSlots: [0, 150, 400],      // cout pour passer a 2 puis 3 persos equipes — inutilise : les 3 places sont ouvertes (12 oct. 2026)
    // Monnaie C : ouvrir la case n+1 du champ de la Ferme (la grille, `farm.grille`). PROVISOIRE : reprend la
    // formule de l'ancienne parcelle, adoucie (une case vaut moins qu'une parcelle, et il y en a plus).
    farmCase: n => 15 + n * 20,
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
    // L'ECRAN DE CHARGEMENT (ui/chargement.js) : combien d'images il demande a la fois, et au bout de combien de
    // temps il laisse entrer quand meme (le reste continue de se charger derriere).
    chargement: { parallele: 8, maxMs: 30000 },
    // LES HEROS ANIMES (ui/rig-hero.js, ESSAI) : le portrait d'un heros qui a un rig (`game/data/rigs/`) joue son `idle` (et `taking_damage`
    // quand il perd des PV) au lieu de l'image fixe. A false : toujours l'image.
    rigsHeros: true,
    rigsGain: 2.5,       // exagere les mouvements des rigs (1 = tel quel : les clips sont calmes, ils se lisent mal a 40 px)
    rigsRemuants: true,  // PROVISOIRE : de temps en temps, un `hitting` ou un `walking` pour que le plateau vive
    rigsUnites: true,   // idem pour les cartes posees sur le plateau (leur illustration a un rig : `game/data/rigs/`)
    appuiLongMs: 400,       // au-dela de cette duree, le doigt pose LIT la carte au lieu d'agir
    toleranceDoigtPx: 10,   // un doigt qui glisse de plus que ca fait defiler, il ne lit ni n'agit

    // LES EFFETS DU COMBAT (ui/effets.js) : du ressenti, pas des regles. Tous les temps sont en
    // millisecondes a vitesse x1 ; le bouton x2 de la barre les divise. Decision du game
    // designer (8 octobre 2026) : les effets ont le droit d'ALLONGER le combat — le but est qu'on
    // comprenne ce qui se passe sans connaitre les cartes. Le mode auto attend donc la fin des
    // effets avant le coup suivant.
    fx: {
      // Les crans du bouton de vitesse (x1, x2, x4 ; pas de « sauter »). Tous les temps ci-dessous sont ceux de x1 :
      // x1 doit se LIRE (on comprend chaque coup), x2 et x4 les divisent (demande du game designer, 19 oct. 2026).
      vitesses: [1, 2, 4],
      fileMaxMs: 1200,          // en manuel, un film attend la fin du precedent, au plus ce temps (jamais de retard qui s'accumule)
      pauseApresMs: 320,        // en auto, le calme laisse apres les effets avant le coup suivant
      // L'ATTAQUE EN CINQ TEMPS (maquette du game designer, 19 oct. 2026) : l'attaquant RECULE (il prend son elan),
      // TIENT un instant, FONCE sur sa cible en laissant des remanences, reste COLLE pendant le coup (les chiffres
      // tombent), puis REVIENT a sa place. Remplace `elanMs` / `elanImpact` (un seul bond, trop nerveux).
      attaqueReculMs: 450,
      attaqueTenueMs: 220,
      attaqueChargeMs: 300,
      attaqueImpactMs: 420,
      attaqueRetourMs: 420,
      attaqueRemanences: 4,     // les doubles laisses derriere pendant la charge
      elanPart: 0.6,            // quelle part du trajet vers la cible l'attaquant parcourt (1 = jusqu'a son centre)
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
      // UNE CARTE QUI ARRIVE EN MAIN passe par le MILIEU, comme dans Hearthstone (game designer, 21 oct. 2026) : elle vole
      // de sa pioche (ou de son origine) au centre, s'y montre en grand, puis rejoint sa place dans la main. Chez
      // l'adversaire, un dos de carte. Plusieurs cartes d'un coup se montrent cote a cote.
      piocheMs: 380,            // le vol de la pioche jusqu'au centre
      piocheTenueMs: 700,       // la carte reste montree en grand au centre
      piocheVersMainMs: 380,    // puis elle rejoint sa place dans la main
      piocheDecalageMs: 80,     // entre deux cartes piochees ensemble
      metaOutMs: 260,           // METAMORPHOSE : les unites copiees se replient...
      metaTenueMs: 500,         // ...restent cachees...
      lancerMs: 380,            // le temps laisse AU MOINS au VFX qui PART d'une carte (ui/vfx.js) avant ses consequences
      lancerArriveePart: 0.75,  // ... et sinon la part de SA duree (mesuree) ecoulee quand il touche sa cible : les degats et
                                // les morts attendent l'arrivee du projectile (« les ennemis meurent avant que les animations
                                // ne se jouent », game designer, 21 oct. 2026)
      volMs: 340,               // la carte jouee vole de la main au centre
      tenueMs: 420,             // elle reste lisible au centre avant de se resoudre
      sortieMs: 240,            // puis elle rejoint sa destination (plateau ou defausse)
      // LES DECLENCHEMENTS (rale d'agonie, debut/fin de tour, regles « quand X ») : « il faut etre beaucoup plus lent sur
      // les triggers » (game designer, 20 oct. 2026). La suite attend toute la tenue de la carte-effet.
      effetVolMs: 450,          // une carte-effet part de son unite vers le centre
      effetTenueMs: 1500,       // elle reste lisible
      effetSortieMs: 350,       // puis disparait
      oeilPasMs: 140,           // « quand X » : chaque etape de l'oeil qui s'ouvre (5 etapes), avant la carte-effet
      popMs: 420,               // l'arrivee d'une unite (rebond)
      glisseMs: 240,            // les voisines d'une unite qui part (sa mort finie) ou qui arrive glissent a leur place
      anneauMs: 620,            // l'anneau d'un changement d'etat (bouclier, aura, armure, mana)
      // L'AURA (maquette du game designer, 21 oct. 2026) : quand son porteur arrive, une onde jaune part de lui et couvre
      // la bande du plateau ; les unites qu'elle touche VRAIMENT s'eclairent a son passage, puis la bande s'eteint.
      auraOndeMs: 700,          // l'onde s'etend du porteur jusqu'aux bords du plateau
      auraTenueMs: 300,         // la bande reste teintee
      auraSortieMs: 600,        // puis s'eteint
      auraPeriodeMs: 5000,
      vitesseRejeu: 8,          // « Revoir le combat » : un cran de vitesse de plus, qui n'existe que dans le rejeu      // et chaque porteur en jeu la rejoue a ce rythme (« une fois toutes les 5 s, on va essayer »)
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
      // LA MORT : apres le coup (`mortDelaiMs`), la carte s'assombrit et montre le crane (`mortMs`), puis vole vers la
      // defausse de son camp (`mortVolMs`) — un jeton, qui n'a pas de carte, s'efface sur place.
      mortDelaiMs: 260,
      mortMs: 520,
      mortVolMs: 650,
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
    // LE CHAMP EN GRILLE (spec du 16 octobre 2026) : le joueur pose ses legumes sur des cases. `cols` x `rows`
    // cases, dont `casesDeDepart` ouvertes ; les autres s'ouvrent dans l'ordre (`costs.farmCase`). PROVISOIRE.
    grille: { cols: 5, rows: 5 },
    casesDeDepart: 4,
    // Les legumes se TROUVENT dans la nature : les tiers <= `tierLibre` sont connus d'office, les autres
    // s'apprennent sur la carte (points « cueillette », config/world.js). PROVISOIRE.
    tierLibre: 2,
    startStallSlots: 2,
    maxStallSlots: 6,
    offlineCapMs: 12 * 60 * 60 * 1000 // plafond des gains hors-ligne
  },

  // LES ARENES (spec « Refonte Overworld + Arenes », 16 octobre 2026). Toutes ouvertes des le depart, au niveau 1 ;
  // chaque victoire fait monter l'arene d'un niveau, et l'adversaire applique alors son profil de progression
  // (config/ennemis.js) jusqu'a ce niveau. PROVISOIRE.
  arenes: {
    niveauParVictoire: 1,
    niveauMax: 40,            // le profil d'un ennemi s'arrete la (au-dela, l'arene garde son dernier niveau)
    decouverteTuiles: 6,      // a cette distance du batiment, l'arene apparait dans l'onglet « Arene »
    interactionTuiles: 1.6    // la porte : a cette distance, le bouton « Entrer » apparait
  },

  // PROVISOIRE (24 oct. 2026) — TOUT DEBLOQUE, EN ATTENDANT LA NOUVELLE CARTE DU MONDE. Tant que c'est vrai :
  //   - l'onglet « Arene » montre toutes les arenes, sans avoir a les decouvrir en marchant ;
  //   - tous les heros sont a toi (alignables, ameliorables) sans les recruter, dans une partie neuve comme dans une
  //     ancienne. Rien n'est ECRIT dans la sauvegarde (`possede`, state.js) : remis a false, chaque partie retrouve
  //     exactement les heros qu'elle a gagnes. Le tutoriel et les quetes lisent la sauvegarde, pas ce reglage : une
  //     quete qui offre un heros se fait toujours, et les places d'equipe restent celles du tutoriel (la console de
  //     triche sait le passer).
  // La console de triche peut le couper le temps d'une session. Remettre a false quand la carte est la.
  toutDebloque: true,

  // LA CONSOLE DE TRICHE hors combat (ui/triche.js) : monnaies, niveaux, combats, deblocages. `bouton` : son bouton dans
  // la barre du haut ; a false, elle ne s'ouvre plus que par la console du navigateur (`AC.console()`). PROVISOIRE : outil
  // du game designer, a couper avant une sortie.
  triche: {
    bouton: true
  },

  // LES DECKS ENREGISTRES : une equipe (heros, faces switch, cartes retirees) qu'on recharge d'un toucher avant un
  // combat, pour ne pas tout refaire a chaque adversaire. PROVISOIRE.
  // LE DEPART D'UNE PARTIE (docs/TUTORIEL.md) : les places d'equipe ouvertes, les monnaies, et les heros donnes (`null` =
  // les `starters` du builder : Pompon seul). Le tutoriel ouvre les autres places par ses quetes. Onglet « start » de la feuille.
  depart: {
    places: 1,
    monnaies: { A: 0, B: 0, C: 40, G: 0 },
    heros: null
  },

  decks: {
    max: 6,
    // Taille minimale d'un deck (GDD « EN REFLEXION », 16 octobre 2026) : en dessous, on ne peut pas combattre.
    tailleMin: 15
  },

  // LE PROFIL DU JOUEUR : 25 niveaux (config/profil.js dit ce que chacun rapporte), payes en XP de combat
  // (`rewards.xp` des rencontres, config/world.js). PROVISOIRE : la courbe.
  profil: {
    xpPourNiveau: L => Math.round(40 + 22 * L + 2 * L * L)   // XP pour passer du niveau L a L+1
  },

  // Cadence de deblocage des personnages : nombre de nouveaux persos rendus
  // disponibles a l'achat le jour N depuis la premiere partie (GDD).
  unlockCadence: [6, 4, 3, 2, 1, 1, 0, 1, 0, 1, 0, 1]
};

// LA FEUILLE GOOGLE (« Config Adventure-Cards », onglet « animations ») remplace les valeurs de `ui.fx` ci-dessus :
// `scripts/sync-feuille.mjs` (ou le bouton « Feuille » de l'Atelier) l'ecrit dans game/data/feuille.data.js.
// Ce qui est dans la feuille gagne ; une ligne absente laisse la valeur de ce fichier (voir config/feuille.js).
applique(BALANCE, FEUILLE.animations);
// L'onglet « start » (le depart d'une partie, la taille minimale d'un deck) : config/feuille.js, `appliqueDepart`.
appliqueDepart(BALANCE, FEUILLE.start);

export const TUNING_NOTE =
  "Toutes ces valeurs sont provisoires : elles servent a rendre la boucle jouable, pas a etre justes.";
