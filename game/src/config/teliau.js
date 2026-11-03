// TELIAU, L'AIDE DU JOUEUR BLOQUE (refonte boutique, lot 5, 3 nov. 2026). Le game designer est dans le jeu sous ce nom : il parle quand le joueur est
// coince. TOUT est ici et PROVISOIRE (valeurs de depart proposees, a regler) ; les textes sont dans `textes.js` (`teliau.*`).
//
// Quatre aides :
//   - `prix` : une bulle quand le prix choisi en vitrine est trop cher (des clients arrives le trouvent trop cher, ou l'attente estimee est longue) ;
//   - `duelFacile` : un duel facile, tres recompense, offert au joueur bloque ;
//   - `remplace` : l'adversaire du combat courant est remplace par un autre, que le joueur peut battre ;
//   - le blocage lui-meme (`bloque`) : defaites de suite, ou temps de jeu sans progres dans la ligne.
// Le temps compte en MINUTES DE JEU (l'application ouverte), jamais en absence : revenir apres une nuit ne declenche rien.
export const TELIAU = {
  nom: 'Teliau',
  tete: 'teliau',

  // Le prix trop cher : au moins `clientsTropCher` clients arrives l'estiment trop cher, OU l'attente moyenne depasse `attenteMaxMin` (12 h).
  prix: { clientsTropCher: 2, attenteMaxMin: 720 },

  // Le joueur est BLOQUE sur le combat courant de la ligne : `defaitesDeSuite` defaites depuis son dernier progres, ou `tempsSansProgresMin`
  // minutes de jeu sans avancer.
  bloque: { defaitesDeSuite: 3, tempsSansProgresMin: 20 },

  // Le DUEL FACILE : Teliau t'affronte avec une equipe au `ratioNiveau` de ta meilleure combinaison. Victoire = les `recompense`.
  // Au plus `parJour` par jour, et `attenteMin` minutes de jeu entre deux.
  duelFacile: { ratioNiveau: 0.4, recompense: { booster: 'premium_standard', n: 1, pieces: 300 }, attenteMin: 20, parJour: 3 },

  // Le REMPLACEMENT de l'adversaire : plus severe que le blocage (`defaitesDeSuite` defaites, ou `tempsSansProgresMin` minutes). Le nouvel
  // adversaire demande `marge` fois le Power de l'equipe (0,9 : un peu moins que ce qu'elle vaut).
  remplace: { defaitesDeSuite: 6, tempsSansProgresMin: 45, marge: 0.9 }
};
