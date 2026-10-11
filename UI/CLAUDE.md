# UI/ — les petits sprites d'interface

12 PNG : `Bell`, `Calendar`, `Coin`, `Coins`, `Customer`, `Gem`, `To Do List`, `Tree` (le Vieux Chêne), `Vault` (les coffres), `Warning Sign`, `Wooden dice`, `Worker`.
Petits (≈ 200 px pour `Vault`/`Tree`), contrairement aux sprites de personnages.

- **Utilisés par** l'overworld (`Vault.png` = coffre, `Tree.png`), le Sac (`Coins.png`) et des cartes/objets.
- ⚠ **Ne pas confondre avec `Icons/`** : `UI/` = sprites d'**objets** affichés dans le monde ; `Icons/` = les **icônes d'interface** (`icone('Nom')`, `game/src/ui/icones.js`).
- `UI/Chest.png`, l'icône des cartes libres dans le builder, **n'existe pas** (404 connu).
- Liste dans `game/data/sprites.js` (générée : `node scripts/gen-sprites.mjs`). Binaires : inutile de les lire.
