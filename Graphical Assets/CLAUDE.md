# Graphical Assets/ — toutes les images du game designer

Rangées ici le 19 octobre 2026 (avant : `Characters/`, `Machines/`, `Ressources/`, `UI/`, `Icons/` à la racine, et `V2/`, supprimé).
Binaires : **inutile de les lire** pour travailler sur le code. Les originaux font ≈ 2000 px : le jeu affiche leurs **versions allégées**
(`game/vignettes/Graphical Assets/…`, WebP, `python scripts/gen-vignettes.py`), jamais les originaux quand une vignette existe.

| Dossier | Contenu | Qui s'en sert |
|---|---|---|
| `Characters/<Espèce>/` | **Les portraits** (PNG transparents ≈ 2000 px), **un sous-dossier par espèce** : `Big Bad Wolf`, `Birds` (Falcon, Robin), `Cameleon`, `Cat`, `Crow`, `Dog`, `Fox`, `Frog`, `Goat`, `Mouse`, `Octopus`, `Owl`, `Rabbit`, `Red Panda`, `Sloth`. Nommage : `Espèce.png` pour le modèle de base, `Espèce Variante.png` pour les autres (`Dog/Dog Cocker.png`, `Cat/Cat Witch.png`). Le dessin visible n'occupe que 55 à 75 % de la hauteur : le jeu mesure la **hauteur visible** (`zoneVisible`, `game/src/ui/overworld.js`). | portrait d'un héros, d'un adversaire ou d'une carte (choisi dans le Card Builder), carte du monde. Produits par `scripts/gen-art.py` (`--choisir` range le PNG dans le dossier de son espèce). |
| `Cards/` | **Les illustrations des cartes** (PNG transparents 1024 px), **rangées en decks** depuis le 24 oct. 2026 : `<Espèce> Decks/<Espèce> Deck 1…3/` (un dossier par héros d'une espèce : `Cat Decks/Cat Deck 1/Griffure.png`) et `Opponent <Nom>/` (les cartes d'un adversaire). Un fichier au nom de la carte ; une même image peut être copiée dans plusieurs dossiers, et un même nom porter deux dessins (« Mauvais Oeil » de Corax et du chat 3). **Ranger, déplacer, renommer ne casse rien** : le jeu retrouve une image par son nom (`game/src/config/images.js`), le Card Builder signale ce qu'il ne sait pas trancher, et `node scripts/repare-images.mjs --ecrire` recolle le fichier des cartes pour de bon. Des noms de fichier diffèrent de celui de la carte (le dessin de « Lapin Têtu » s'appelle `Lapin Avocat.png`, celui d'« Impératrice Nocturne » `Chasse Nocturne.png` et celui de « Chasse Nocturne » `Chasse Nocturne-1.png`, celui de « Porte-Couleurs » `Coeur Chromatique.png`) : le chemin est écrit dans la carte, ça marche ; mais une recherche par le nom (`gen-lapins.mjs`, les illustrations attachées automatiquement) ne les trouve pas. | le champ `sprite` de chaque carte (`characters.data.js`) : la carte, son unité sur le plateau, sa fiche, le journal. Une carte **sans** image prend le portrait de son héros (`characterDeck`). |
| `Buildings/` | **Les bâtiments** (10 : `Bottle Maker`, `Candle Baba Yaga Hut`, `Carrot Farm`, `Coffee shop`, `Game Store`, `Nenuphar Farm`, `Nest Factory`, `Pillow Maker`, `Tennis ball Factory`, + un `.jpg` généré sans nom utile). Un bâtiment vaut **7 personnages** de hauteur visible (`WORLD.tailles`). | chaque **arène** (`batiment`, `config/arenes.js`), la boutique (`Coffee shop`, `config/world.js`), la Ferme (`config/farm.js`). |
| `Ressources/` | **Les ressources** : un sous-dossier par famille, rangé par tier de rareté (`Carrot/Carrot Tier 3.png`, `Black Lotus Card/Black Lotus Card Tier 1.png`) — Black Lotus Card, Bottle, Candle, Carrot, Coffee, Croissant, Nenuphar, Nest, Pillow, Sandwitch, Tennis Ball ; et à plat : `Bell`, `Belladona Flower`, `Black Lotus`, `Book`, `Calendar`, `Coin V2`, `Crystal`, `Discard`, `Exile`, `Gem`, `Hourglass`, `To Do List`, `Validate`. | la Ferme (`CROPS`, `config/farm.js`), le Sac (`ui/bag.js`). |
| `Old UI/` | Les anciens petits sprites d'**objets** (ex-`UI/`) : `Coin`, `Coins`, `Customer`, `Dead`, `Tree` (le Vieux Chêne), `Vault` (les coffres), `Warning Sign`, `Wooden dice`, `Worker`. | l'overworld (coffre, arbre), les reliques (`config/relics.js`), le Sac. ⚠ `UI/Chest.png` (l'image des cartes libres du builder) n'a **jamais existé** : 404 connu. |
| `Icons/` | **Les icônes d'interface** dessinées par le game designer, et `Icons/Kenney/` (pictogrammes de travail). | `game/src/ui/icones.js` — voir `Icons/CLAUDE.md`. |
| `CardBack/` | Les dos de carte (`CardBack Belladone`, `Cozy`, `Lotus`). | `ui/battle.js` (`DOS_DE_CARTE` : Cozy). |
| `Socials/` | Logos de messageries (`ON`/`OFF`), d'un autre projet. | rien. |
| `VFX/` | **Les particules des effets** : un extrait du « Particle Pack » Kenney (CC0, `License.txt`), réduit à 128 px, l'alpha renforcé (les originaux sont très pâles). Des textures **blanches** : la couleur est donnée par le CSS (`mask` sur un dégradé). | les briques de `game/src/ui/vfx.js` (`particule()` ; la gerbe de flammes `brasier` de l'Éclaireur Fou). |
| `Kenney_Cursor/`, `Kenney_UI/`, `Kenney_board-game-icons/`, `Kenney Particle/` | Packs **Kenney** (CC0) complets, déposés tels quels. | rien directement (`Icons/Kenney/` et `VFX/` en sont des extraits). |
| `Icon thumbnail.png` | Une vignette du logo. | rien. |

## La liste des images (`game/data/sprites.js`)
Un navigateur ne sait pas lire un dossier : `node scripts/gen-sprites.mjs` (ou « 🔄 Actualiser les images » dans le Card Builder, et son
double C# `GenereSprites()` de `launcher/Launcher.cs`) balaye `Characters/`, `Cards/`, `Buildings/`, `Ressources/` et `Old UI/` **avec leurs
sous-dossiers** et écrit la liste ; un nom y contient donc son sous-dossier (`"Graphical Assets/Characters": ["Dog/Dog Cocker.png", …]`).
Après avoir déposé ou déplacé une image : relancer ce balayage (il refait aussi les vignettes), sinon le builder ne la propose pas.

## Chemins dans les données
Une carte, un héros ou un adversaire porte le **chemin complet** (`Graphical Assets/Characters/Dog/Dog Cocker.png`). La Google Sheet
(onglet `heroes`, colonne `sprite`) peut donner un **nom nu** (« Dog German Shepherd ») : `cheminPersonnage()` (`game/src/config/feuille.js`)
le cherche dans les sous-dossiers d'espèce. ⚠ **Déplacer ou renommer une image casse les chemins écrits** dans
`game/data/characters.data.js` (qui vit sur le Pi) et dans `game/src/config/` : les réécrire, puis relancer `gen-sprites`.
