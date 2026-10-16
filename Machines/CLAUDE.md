# Machines/ — les sprites de bâtiments et de machines de production

10 fichiers (PNG ≈ 2000 × 2000, sauf `Coffee shop.png` 1952 × 2170 et un `.jpg` généré sans nom utile) : `Bottle Maker`, `Candle Baba Yaga Hut`, `Carrot Farm`, `Coffee shop`, `Game Store`, `Nenuphar Farm`, `Nest Factory`, `Pillow Maker`, `Tennis ball Factory`.

- **Utilisés comme** bâtiments de l'overworld — chaque **arène** en est un (`batiment` dans `game/src/config/arenes.js` ; Pillow Maker ↔ Pillow Fort), le Marchand Ambulant est `Coffee shop.png` — et supports de la Ferme. **Échelle : un bâtiment vaut 7 personnages** de hauteur visible (`WORLD.tailles` dans `game/src/config/world.js`) ; la porte donne la mesure.
- Liste dans `game/data/sprites.js` (générée par `node scripts/gen-sprites.mjs`). Binaires : inutile de les lire.
- `V2/Buildings/` et `V2/Assets V2/` portent une itération plus récente de ces bâtiments (voir `V2/CLAUDE.md`).
