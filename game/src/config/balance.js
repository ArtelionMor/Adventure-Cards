// GAME CONFIG — c'est ici que le game designer tune le jeu.
// Aucune valeur d'equilibrage ne doit vivre ailleurs que dans ce fichier.

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
      montecarlo: { misplay: 0, malin: true, rollouts: 10 }
    }
  },

  combat: {
    boardSize: 5,
    handMax: 8,
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

export const TUNING_NOTE =
  "Toutes ces valeurs sont provisoires : elles servent a rendre la boucle jouable, pas a etre justes.";
