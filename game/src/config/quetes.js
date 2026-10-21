// GAME CONFIG — LE FIL DE QUETES (docs/TUTORIEL.md, 21 octobre 2026).
//
// Une liste ORDONNEE : le fil principal. Une seule quete a la fois ; remplie, elle attend que le joueur RECUPERE sa
// recompense (un toucher sur le bandeau), puis la suivante commence. Le tutoriel en est le debut (chapitres 1 a 4,
// jusqu'a la quete `finTutoriel`), le reste guide la suite du jeu.
//
// Une quete : { id, chapitre, titre, texte, objectif, recompense, finTutoriel? }
//   objectif — deux sortes (state.js, `progresQuete`) :
//     un ETAT, relu dans la sauvegarde a chaque instant (une quete deja remplie se termine toute seule) :
//       { quoi: 'arene', arene, niveau }   le meilleur niveau battu de cette arene atteint `niveau`
//       { quoi: 'equipe', heros }          ce heros est dans l'equipe
//     un EVENEMENT, compte a partir du moment ou la quete commence (`signale` dans state.js) :
//       { quoi: 'victoire', n, equipe? }   n combats gagnes (avec au moins `equipe` heros alignes)
//       { quoi: 'ameliore', n }            n ameliorations de heros
//       { quoi: 'switch', n }              n cartes switch achetees
//       { quoi: 'plante', n }              n legumes plantes a la Ferme
//       { quoi: 'vend', n }                n ventes de l'etal
//   recompense — { C, B, A, G } (monnaies), `heros` (il est POSSEDE tout de suite : ni Fanions ni boss), `place`
//     (une place d'equipe de plus). Une quete qui offre un heros deja possede est SAUTEE, sans recompense.
// PROVISOIRE : les textes et les montants (a regler par le game designer ; un onglet de la feuille plus tard).

export const QUETES = [
  // ---------------------------------------------------------------- Chapitre 1 : comprendre le jeu (Pompon seul)
  { id: 'potager1', chapitre: 1, titre: 'Les souris du potager',
    texte: 'Des souris pillent le potager ! Entre dans le Potager et chasse-les avec Pompon.',
    objectif: { quoi: 'arene', arene: 'rabbit1', niveau: 1 }, recompense: { C: 10 } },
  { id: 'potager2', chapitre: 1, titre: 'Elles reviennent',
    texte: 'Les souris reviennent, plus nombreuses. Gagne encore au Potager : essaie le mode Auto, il joue pour toi.',
    objectif: { quoi: 'arene', arene: 'rabbit1', niveau: 2 }, recompense: { heros: 'lapin2', place: 1 } },

  // ---------------------------------------------------------------- Chapitre 2 : un nouveau compagnon
  { id: 'caramel', chapitre: 2, titre: 'Un nouveau compagnon',
    texte: 'Caramel te rejoint ! Dans l’écran Deck, mets-le dans ton équipe.',
    objectif: { quoi: 'equipe', heros: 'lapin2' }, recompense: { C: 10 } },
  { id: 'duo', chapitre: 2, titre: 'À deux',
    texte: 'Pompon et Caramel mélangent leurs cartes en un seul paquet. Gagne au Potager avec les deux.',
    objectif: { quoi: 'arene', arene: 'rabbit1', niveau: 3 }, recompense: { C: 60 } },

  // ---------------------------------------------------------------- Chapitre 3 : les golds
  { id: 'ameliore', chapitre: 3, titre: 'Plus fort',
    texte: 'Tu as des pièces : dans l’écran Deck, touche un Lapin et améliore-le. Une de ses cartes change.',
    objectif: { quoi: 'ameliore', n: 1 }, recompense: { B: 25 } },
  { id: 'switch', chapitre: 3, titre: 'L’autre face',
    texte: 'Chaque carte a une autre face : sa switch. Achète-en une avec tes Sceaux, puis passe de l’une à l’autre quand tu veux.',
    objectif: { quoi: 'switch', n: 1 }, recompense: { C: 20 } },

  // ---------------------------------------------------------------- Chapitre 4 : le dernier Lapin
  { id: 'chef', chapitre: 4, titre: 'Le chef des souris',
    texte: 'Le chef des souris garde le Potager. Bats-le !',
    objectif: { quoi: 'arene', arene: 'rabbit1', niveau: 4 }, recompense: { heros: 'lapin3', place: 1 } },
  { id: 'selene', chapitre: 4, titre: 'Le trio',
    texte: 'Séléné te rejoint : mets-la dans ton équipe.',
    objectif: { quoi: 'equipe', heros: 'lapin3' }, recompense: { C: 20 } },
  { id: 'trio', chapitre: 4, titre: 'Trois Lapins',
    texte: 'Gagne un combat avec tes trois Lapins. Ensuite, toutes les arènes t’attendent.',
    objectif: { quoi: 'victoire', n: 1, equipe: 3 }, recompense: { C: 50 }, finTutoriel: true },

  // ---------------------------------------------------------------- Apres le tutoriel
  { id: 'medor', chapitre: 5, titre: 'Médor',
    texte: 'Un chien de garde attend à l’Usine de balles. Gagne là-bas et il te suivra.',
    objectif: { quoi: 'arene', arene: 'cat1', niveau: 1 }, recompense: { heros: 'dog' } },
  { id: 'felix', chapitre: 5, titre: 'Felix',
    texte: 'Un chat traîne près du Nid. Gagne là-bas et il te suivra.',
    objectif: { quoi: 'arene', arene: 'crow1', niveau: 1 }, recompense: { heros: 'cat' } },
  { id: 'plante', chapitre: 6, titre: 'La Ferme',
    texte: 'Les pièces poussent à la Ferme : plantes-y un légume.',
    objectif: { quoi: 'plante', n: 1 }, recompense: { C: 20 } },
  { id: 'vend', chapitre: 6, titre: 'Au marché',
    texte: 'Pose tes récoltes sur l’étal : une vente passe toutes les quinze minutes.',
    objectif: { quoi: 'vend', n: 1 }, recompense: { C: 30 } },
  // Le Loup est un mur tant que l'equipe n'a pas grandi (GDD, « Mode manuel ») : sa quete vient apres la Ferme.
  { id: 'corax', chapitre: 7, titre: 'Corax',
    texte: 'Un corbeau guette la cabane du Grand Méchant Loup. Bats le Loup et il te suivra.',
    objectif: { quoi: 'arene', arene: 'wolf', niveau: 1 }, recompense: { heros: 'crow' } }
];

export const QUETE_PAR_ID = Object.fromEntries(QUETES.map(q => [q.id, q]));
