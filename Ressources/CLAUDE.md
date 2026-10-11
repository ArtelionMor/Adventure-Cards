# Ressources/ — les sprites de ressources récoltées ou produites

≈ 67 PNG, rangés **par famille et par tier de rareté (1 à 6)** : `<Famille> Tier <n>.png` (`Carrot Tier 3.png`, `Black Lotus Tier 1.png`, `Candle Tier 2.png`…).
Familles : Black Lotus, Bottle, Candle, Carrot, Coffee, Croissant, Nenuphar, Nest, Pillow, Sandwitch, Tennis Ball ; plus `Belladona Flower.png` (nouveau, non suivi par git) et `Coin V2.png`.

- **Utilisés par** la Ferme (`game/src/config/farm.js` : `CROPS`, prix proportionnel à la rareté) et le Sac (`game/src/ui/bag.js`).
- Liste dans `game/data/sprites.js` (générée : `node scripts/gen-sprites.mjs`). Binaires : inutile de les lire.
