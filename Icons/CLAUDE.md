# Icons/ — les icônes d'interface (dessinées par le game designer)

- **`Icon.png`** : le logo du jeu (fond transparent). C'est de lui que `scripts/gen-icones.ps1` tire les icônes de l'Atelier (`builder/icons/`).
- **`Dead.png`** : l'icône « mort » (lapin gris aux yeux en croix), utilisée par l'aperçu d'un coup et par le journal graphique.
- **Les futures icônes du jeu** se déposent **ici**, sous le nom exact de la liste `ICONES` de `game/src/ui/icones.js` (`Log`, `Swords`, `Damage`, `Heal`, `Buff`, `Mana`, `Taunt`, …) : `icone('Nom')` prend le fichier **tout seul** dès qu'il existe, sans toucher au code ; tant qu'il manque, un signe de remplacement s'affiche (et un 404 par icône absente dans la console).
  Format voulu : PNG transparent, ≈ 512 × 512, couleurs plates et gros contour noir comme `Dead.png`, lisible à 16 px.
- **`Coin.png`**, **`Gem.png`** : la pièce et la gemme de la barre du haut et du bouton Upgrade, exportées de la maquette Figma du game designer (« La place du chat », 12 octobre 2026), fond rendu transparent.
- Les douze fichiers `Gmail`, `Google Messages`, `Instagram`, `Kick`, `LinkedIn`, `Messenger` (`ON`/`OFF`) et `Validate.png` viennent d'un autre projet : **le jeu ne les utilise pas**.

Pas de balayage automatique de ce dossier (il n'est pas dans `sprites.js`) : `icones.js` demande les fichiers par leur nom. Binaires : inutile de les lire.

## `Icons/Kenney/` — pictogrammes de travail
40 icônes du pack **Board Game Icons** de Kenney (CC0, `License.txt` à côté), blanches sur transparent, **teintables** (posées en masque CSS, elles prennent la `color` du texte). `ui/icones.js` les utilise tant que `Icons/<Nom>.png` (le dessin du game designer) n'existe pas : **déposer `Icons/<Nom>.png` suffit à remplacer un pictogramme de travail**, sans toucher au code (table `KENNEY` de `icones.js` pour le nom → fichier).
