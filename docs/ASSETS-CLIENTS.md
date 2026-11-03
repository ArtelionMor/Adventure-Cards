# Assets des clients à produire (refonte boutique, lot 4, 3 nov. 2026)

> Claude ne produit aucun visuel. Cette liste dit ce qui **existe déjà**, ce que le jeu **utilise** et ce qui **manque** pour que les dix clients
> aient leur place : l'arrivée, la fiche « Shop », la scène d'intro (un zoom sur le client, puis une carte « à la Borderlands »).
> Les noms de fichiers suivent `Graphical Assets/Clients/<Nom>/` (`BOUTIQUE.dossierDe`, `config/boutique.js`).

## Ce qui existe (dix clients + Teliau)
Timmy, Jenna (dossier `Jena/`), Spike, Ada, Barnaby, Boris, Cipher, Brock, Rook, Richie : chacun a ses poses de scène (`idle`, `walk0…`, `talk`,
`think`, `hold`, `show`, `interact`, `cheer0/1`, `sit`), un dessin `Nom.png`, un dessin assis `Nom Sitted.png` et un `Thumbnail Nom.png`
(`Clients Thumbnails/`, allégé en 160 px dans `game/vignettes/Clients/`). Teliau n'a que `Teliau.png`, `Teliau Sitted.png` et `Teliau Icon.png`.

## À produire, par priorité

### 1. La scène d'intro (nouvelle, `ui/client-intro.js`) — 10 clients
| Asset | Où | Notes |
|---|---|---|
| **Portrait d'entrée** de chaque client, buste, grand format (≥ 600 px de haut), fond transparent | le zoom : aujourd'hui, la vignette de 160 px agrandie à 150 px dans un rond | La vignette suffit pour un test, pas pour le zoom : un portrait net, avec **une expression d'arrivée** (sourire, curiosité). |
| **Cadre de la carte client** « à la Borderlands » (nom en grand, deux lignes de texte, bandeau) | `.cl-carte` (CSS crème provisoire) | Un seul gabarit, teinté par la couleur du client (`BOUTIQUE.profils[id].couleur`). |
| **Pose « tape-à-l'œil »** (le client se présente : bras levé, nom qui s'affiche) | optionnel, remplacerait le portrait | Même format que les poses de scène. |

### 2. Les icônes
| Asset | Notes |
|---|---|
| Un **pictogramme par client** (≈ 48 px) : ce qu'il cherche en un symbole (étoile pour Timmy, engrenage pour Jenna, trophée pour Spike, couronne pour Ada, nouveauté pour Barnaby, vieux livre pour Boris, cartes jouées pour Cipher, dés pour Brock, héros en retard pour Rook, diamant pour Richie) | Aujourd'hui : une lettre colorée (`lettre`, `couleur`). |
| Les quatre **réactions** (bonne affaire, bon prix, trop cher, pas assez rare) | Aujourd'hui des emoji (`BOUTIQUE.reactions`). |

### 3. La fiche « Shop » d'une carte
| Asset | Notes |
|---|---|
| **Visage de chaque client en deux humeurs** : content et mécontent (le jeu choisit 2 positifs et 1 négatif parmi les clients arrivés) | Aujourd'hui, le même visage avec un fond vert à rouge. |
| La **matrice 2 × 2** de chaque client : un fond léger par zone | Aujourd'hui dessinée en SVG. |

### 4. Les poses manquantes
| Client | Pose | Pourquoi |
|---|---|---|
| **Brock** | pose « sort d'une partie » (cartes en main, content ou dépité) | il n'arrive qu'après une partie jouée à une table |
| **Cipher** | pose « regarde ton deck » | il achète ce que tu joues le plus |
| **Ada**, **Rook** | pose « inspecte un héros » | ils arrivent avec les premières améliorations |
| **Richie** | pose « loupe » (examine un foil) | foils et rares |
| Tous | une pose **assise en train de jouer** (carte jouée sur la table, `sit` + `show`) | les deux clients qui jouent à une table de jeu |

### 5. Teliau (lot 5)
La bulle utilise aujourd'hui `Thumbnail Teliau.png`. À produire : portraits expressifs (conseille, inquiet, encourageant, joueur), pose « fait signe », icône pour la barre, et son visage en duel (cercle de l'adversaire).

## Ce que le jeu fera du reste
Les dix têtes sont déjà branchées (`BOUTIQUE.profils`, `tetes`), les poses de scène aussi ; un client sans asset retombe sur sa vignette. Rien de
ce qui précède ne bloque le jeu : tout se remplace en posant le fichier au même chemin (puis `python scripts/gen-vignettes.py`).
