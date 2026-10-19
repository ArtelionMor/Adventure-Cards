# Graphical Assets/ — toutes les images du game designer

Rangées ici le 19 octobre 2026 (avant : `Characters/`, `Machines/`, `Ressources/`, `UI/`, `Icons/` à la racine, et `V2/`, supprimé).
Binaires : **inutile de les lire** pour travailler sur le code. Les originaux font ≈ 2000 px : le jeu affiche leurs **versions allégées**
(`game/vignettes/Graphical Assets/…`, WebP, `python scripts/gen-vignettes.py`), jamais les originaux quand une vignette existe.

| Dossier | Contenu | Qui s'en sert |
|---|---|---|
| `Characters/<Espèce>/` | **Les portraits** (PNG transparents ≈ 2000 px), **un sous-dossier par espèce** : `Big Bad Wolf`, `Birds` (Falcon, Robin), `Cameleon`, `Cat`, `Crow`, `Dog`, `Fox`, `Frog`, `Goat`, `Mouse`, `Octopus`, `Owl`, `Rabbit`, `Red Panda`, `Sloth`. Nommage : `Espèce.png` pour le modèle de base, `Espèce Variante.png` pour les autres (`Dog/Dog Cocker.png`, `Cat/Cat Witch.png`). Le dessin visible n'occupe que 55 à 75 % de la hauteur : le jeu mesure la **hauteur visible** (`zoneVisible`, `game/src/ui/overworld.js`). | portrait d'un héros, d'un adversaire ou d'une carte (choisi dans le Card Builder), carte du monde. Produits par `scripts/gen-art.py` (`--choisir` range le PNG dans le dossier de son espèce). |
| `Buildings/` | **Les bâtiments** (10 : `Bottle Maker`, `Candle Baba Yaga Hut`, `Carrot Farm`, `Coffee shop`, `Game Store`, `Nenuphar Farm`, `Nest Factory`, `Pillow Maker`, `Tennis ball Factory`, + un `.jpg` généré sans nom utile). Un bâtiment vaut **7 personnages** de hauteur visible (`WORLD.tailles`). | chaque **arène** (`batiment`, `config/arenes.js`), la boutique (`Coffee shop`, `config/world.js`), la Ferme (`config/farm.js`). |
| `Ressources/` | **Les ressources** : un sous-dossier par famille, rangé par tier de rareté (`Carrot/Carrot Tier 3.png`, `Black Lotus Card/Black Lotus Card Tier 1.png`) — Black Lotus Card, Bottle, Candle, Carrot, Coffee, Croissant, Nenuphar, Nest, Pillow, Sandwitch, Tennis Ball ; et à plat : `Bell`, `Belladona Flower`, `Black Lotus`, `Book`, `Calendar`, `Coin V2`, `Crystal`, `Discard`, `Exile`, `Gem`, `Hourglass`, `To Do List`, `Validate`. | la Ferme (`CROPS`, `config/farm.js`), le Sac (`ui/bag.js`). |
| `Old UI/` | Les anciens petits sprites d'**objets** (ex-`UI/`) : `Coin`, `Coins`, `Customer`, `Dead`, `Tree` (le Vieux Chêne), `Vault` (les coffres), `Warning Sign`, `Wooden dice`, `Worker`. | l'overworld (coffre, arbre), les reliques (`config/relics.js`), le Sac. ⚠ `UI/Chest.png` (l'image des cartes libres du builder) n'a **jamais existé** : 404 connu. |
| `Icons/` | **Les icônes d'interface** dessinées par le game designer, et `Icons/Kenney/` (pictogrammes de travail). | `game/src/ui/icones.js` — voir `Icons/CLAUDE.md`. |
| `CardBack/` | Les dos de carte (`CardBack Belladone`, `Cozy`, `Lotus`). | `ui/battle.js` (`DOS_DE_CARTE` : Cozy). |
| `Socials/` | Logos de messageries (`ON`/`OFF`), d'un autre projet. | rien. |
| `Kenney_Cursor/`, `Kenney_UI/`, `Kenney_board-game-icons/` | Packs **Kenney** (CC0) complets, déposés tels quels. | rien encore (`Icons/Kenney/` en est un extrait). |
| `Icon thumbnail.png` | Une vignette du logo. | rien. |

## La liste des images (`game/data/sprites.js`)
Un navigateur ne sait pas lire un dossier : `node scripts/gen-sprites.mjs` (ou « 🔄 Actualiser les images » dans le Card Builder, et son
double C# `GenereSprites()` de `launcher/Launcher.cs`) balaye `Characters/`, `Buildings/`, `Ressources/` et `Old UI/` **avec leurs
sous-dossiers** et écrit la liste ; un nom y contient donc son sous-dossier (`"Graphical Assets/Characters": ["Dog/Dog Cocker.png", …]`).
Après avoir déposé ou déplacé une image : relancer ce balayage (il refait aussi les vignettes), sinon le builder ne la propose pas.

## Chemins dans les données
Une carte, un héros ou un adversaire porte le **chemin complet** (`Graphical Assets/Characters/Dog/Dog Cocker.png`). La Google Sheet
(onglet `heroes`, colonne `sprite`) peut donner un **nom nu** (« Dog German Shepherd ») : `cheminPersonnage()` (`game/src/config/feuille.js`)
le cherche dans les sous-dossiers d'espèce. ⚠ **Déplacer ou renommer une image casse les chemins écrits** dans
`game/data/characters.data.js` (qui vit sur le Pi) et dans `game/src/config/` : les réécrire, puis relancer `gen-sprites`.
