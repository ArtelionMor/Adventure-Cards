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

  combat: {
    boardSize: 5,
    handMax: 8,
    maxManaCap: 10,
    autoStepMs: 750,        // rythme du mode auto (spectacle idle)
    fatigueBase: 1          // degats de fatigue, +1 par pioche a vide
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
