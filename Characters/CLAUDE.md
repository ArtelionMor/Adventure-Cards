# Characters/ — les sprites de personnages (animaux)

46 PNG transparents, ≈ 2000 × 2000 px chacun (le dessin visible n'occupe que 55 à 75 % de la hauteur : le **jeu mesure la hauteur visible**, pas celle du fichier — voir `game/src/ui/overworld.js`, `zoneVisible`).
Nommage : `Espèce.png` pour le modèle de base, `Espèce Variante.png` pour les autres (`Dog.png`, `Dog Cocker.png`, `Cat Witch.png`, `Owl Snow.png`, `Big Bad Wolf.png`, `Big Bad Wolf Mythic.png`, `Cameleon.png`…).
Espèces : chien, chat, corbeau, renard, grenouille, hibou, lapin, panda roux, paresseux, pieuvre, chèvre, faucon, rouge-gorge, loup, caméléon.

- **Utilisés comme** portrait d'un héros, d'un adversaire (PNJ) ou d'une carte, choisis dans le Card Builder (fenêtre « Choisir un sprite »), et dessinés sur la carte du monde.
- **La liste vient de `game/data/sprites.js`** (générée) : après avoir déposé une image, relancer `node scripts/gen-sprites.mjs` ou le bouton « 🔄 Actualiser les images » du builder. Les `.md` sont ignorés par le balayage (filtre sur l'extension).
- Binaires : **inutile de les lire** pour travailler sur le code.
