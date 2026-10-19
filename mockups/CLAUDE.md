# mockups/ — des maquettes (références visuelles, pas du code)

| Fichier | Ce que c'est |
|---|---|
| `Carte Mockup.png`, `Carte Mockup-1.png` | Maquettes de carte (mascotte chien pastel) : **placeholders**, pas la direction artistique finale. |
| `iPhone 17 - 1.png`, `iPhone 17 - 2.png` | Les maquettes du **widget Android** : « Simulations en cours » puis « Simulations terminées » (`android/`). |
| `carte-packs/comparaison-*.png` | Les captures du **prototype comparatif des packs de carte** (`game/carte-packs.html`, 16 oct. 2026) : actuel, Tiny Town, Medieval RTS, Medieval RTS cerné, sur trois cadrages (`place`, `arenes`, `ensemble`). Voir `docs/PACKS-CARTE.md`. |
| `carte-packs/jeu-depart.jpg`, `jeu-bois.jpg` | Le jeu avec le pack retenu (B+ et son feuillage), au départ et dans le bois — sur la carte d'avant la refonte du 16 octobre. |
| `Deck Screen.png` | L'**écran d'équipe** (12 oct. 2026) : barre du haut (avatar, nom, niveau du joueur, pièces, gemmes), panneau « Equipe » (3 héros avec leur niveau), puis la collection filtrée par famille (puces Tous / Chiens / Chats / Corbeaux), une section par famille, coche verte = dans l'équipe, case grise « Locked » = pas encore recruté. Cible de `game/src/ui/deck.js`. |
| `Upgrade Deck Screen.png` | L'**écran d'amélioration** d'un héros, en surimpression (12 oct. 2026) : en-tête (portrait, nom, famille, niveau du héros), carrousel de ses cartes (flèches, carte voisine estompée), la carte au centre avec son effet du prochain palier, la frise des paliers (numérotés, icône de ce que chacun apporte), bouton « Upgrade » avec son coût et « +N power ». Cible de `heroSheet` dans `deck.js`. |
| `Arena Screen.png` (et `Deck Arena.png`, la même) | L'**onglet Arène** et la **barre de navigation** (19 oct. 2026) : une carte par arène (bâtiment en fond, ennemi en grand, nom, archétype, mécanique du deck, équipe conseillée avec Unlock / Upgrade / Undiscovered, choix du niveau avec la récompense et les niveaux battus cochés) ; navigation en 5 dessins, l'écran actif en grande tuile jaune. Cible de `renderArene` (`ui/arene.js`). |
| `Combat Screen.png`, `Combat Screen more than 3 cards.png` | L'**écran de combat** (19 oct. 2026) : adversaire en haut (piles, médaillon, main de dos en éventail, mana), onglets Menu / Registre / Log à gauche, Fin de tour et x2 à droite, ligne du joueur avec Auto, plateau de la main (mana, main, pioche et défausse qui dépassent du bas) ; à plat jusqu'à 3 cartes, en éventail au-delà. Cible de `monteLaCoque` (`ui/battle.js`). |
| `Combat Screen Zoom on a card.png` | La **fiche d'appui long** (19 oct. 2026) : la carte en grand, nom, attaque et vie, puce Type (une couleur par type), ce qu'elle fait (« icônes : texte »), un trait, ce qui la modifie sous le portrait de chaque source. Cible de `inspectNode` / `ficheCarte` et `ui/fiche.js`. |

Aucun code ne les lit. Binaires : n'ouvre une image que si la tâche porte sur ce qu'elle montre.
