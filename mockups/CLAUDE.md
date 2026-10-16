# mockups/ — des maquettes (références visuelles, pas du code)

| Fichier | Ce que c'est |
|---|---|
| `Carte Mockup.png`, `Carte Mockup-1.png` | Maquettes de carte (mascotte chien pastel) : **placeholders**, pas la direction artistique finale. |
| `iPhone 17 - 1.png`, `iPhone 17 - 2.png` | Les maquettes du **widget Android** : « Simulations en cours » puis « Simulations terminées » (`android/`). |
| `Deck Screen.png` | L'**écran d'équipe** (12 oct. 2026) : barre du haut (avatar, nom, niveau du joueur, pièces, gemmes), panneau « Equipe » (3 héros avec leur niveau), puis la collection filtrée par famille (puces Tous / Chiens / Chats / Corbeaux), une section par famille, coche verte = dans l'équipe, case grise « Locked » = pas encore recruté. Cible de `game/src/ui/deck.js`. |
| `Upgrade Deck Screen.png` | L'**écran d'amélioration** d'un héros, en surimpression (12 oct. 2026) : en-tête (portrait, nom, famille, niveau du héros), carrousel de ses cartes (flèches, carte voisine estompée), la carte au centre avec son effet du prochain palier, la frise des paliers (numérotés, icône de ce que chacun apporte), bouton « Upgrade » avec son coût et « +N power ». Cible de `heroSheet` dans `deck.js`. |

Aucun code ne les lit. Binaires : n'ouvre une image que si la tâche porte sur ce qu'elle montre.
