# Graphical Assets/Icons/ — les icônes d'interface (dessinées par le game designer)

- **`Icon.png`** : le logo du jeu (fond transparent). C'est de lui que `scripts/gen-icones.ps1` tire les icônes de l'Atelier (`builder/icons/`).
- **`Dead.png`** : l'icône « mort » (lapin gris aux yeux en croix), utilisée par l'aperçu d'un coup et par le journal graphique.
- **Les futures icônes du jeu** se déposent **ici**, sous le nom exact de la liste `ICONES` de `game/src/ui/icones.js` (`Log`, `Swords`, `Damage`, `Heal`, `Buff`, `Mana`, `Taunt`, …) : `icone('Nom')` prend le fichier **tout seul** dès qu'il existe, sans toucher au code ; tant qu'il manque, un signe de remplacement s'affiche (et un 404 par icône absente dans la console).
  Format voulu : PNG transparent, ≈ 512 × 512, couleurs plates et gros contour noir comme `Dead.png`, lisible à 16 px.
- **`Coin.png`**, **`Gem.png`** : la pièce et la gemme de la barre du haut et du bouton Upgrade, exportées de la maquette Figma du game designer (« La place du chat », 12 octobre 2026), fond rendu transparent.
- **`Arena.png`, `Farm.png`, `Map.png`, `Icon Deck.png`, `Shop.png`** : la barre de navigation (19 oct. 2026). **`Validate.png`** : la coche d'un niveau d'arène battu.
- **Les dessins du combat (20 oct. 2026)** : **`Eye/`** — l'œil des règles « quand X », en 5 étapes (`Eye Close`, `Eye 25%`, `Eye 50%`, `Eye 75%`, `Eye Open`) : fermé sur la carte, il s'ouvre quand sa règle se déclenche ; **`Poison.png`** — le Venin ; **`Shield.png`** — le Bouclier (picto du mot-clé et badge sur la carte) ; **`Fog/`** — les quatre bandes de brume d'Élusif (`White`, `Grey`, `Dark Grey`, `Dark Fog`). Le râle d'agonie prend `Dead.png`. Les noms qui ne collent pas à `ICONES` passent par `FICHIERS` dans `icones.js`. `boxicons_shield-alt-2-filled.svg` n'est pas utilisé.
- Les douze fichiers `Gmail`, `Google Messages`, `Instagram`, `Kick`, `LinkedIn`, `Messenger` (`ON`/`OFF`) viennent d'un autre projet (copies de `Graphical Assets/Socials/`) : **le jeu ne les utilise pas**.

Pas de balayage automatique de ce dossier (il n'est pas dans `sprites.js`) : `icones.js` demande les fichiers par leur nom (`DOSSIER_ICONES`). Les grandes (≥ 100 Ko) ont une vignette de 256 px (`scripts/gen-vignettes.py`, `INTERFACE`). Binaires : inutile de les lire.

## `Graphical Assets/Icons/Kenney/` — pictogrammes de travail
40 icônes du pack **Board Game Icons** de Kenney (CC0, `License.txt` à côté), blanches sur transparent, **teintables** (posées en masque CSS, elles prennent la `color` du texte). `ui/icones.js` les utilise tant que `Graphical Assets/Icons/<Nom>.png` (le dessin du game designer) n'existe pas : **déposer `Graphical Assets/Icons/<Nom>.png` suffit à remplacer un pictogramme de travail**, sans toucher au code (table `KENNEY` de `icones.js` pour le nom → fichier).
