# Decor/ — les packs d'assets tiers essayés pour la carte (overworld)

Un sous-dossier **par pack**, avec la licence d'origine (`License.txt`) et **seulement les images utilisées** par le prototype
`game/carte-packs.html`. **Rien du jeu ne s'en sert encore** : le choix du pack attend le game designer (`docs/PACKS-CARTE.md`).

| Dossier | Pack | Licence | Fichiers |
|---|---|---|---|
| `Kenney Tiny Town/` | [Tiny Town](https://kenney.nl/assets/tiny-town) v1.1, Kenney | CC0 1.0 | `tile_NNNN.png` (16 × 16) : herbe 0-2, arbres 3-4 / 15-16 / 27-28, buisson 5, champignon 29, terre 12-14 / 24-26 / 36-38 (bords) et 39-42 (coins rentrants) |
| `Kenney Medieval RTS/` | [Medieval RTS](https://kenney.nl/assets/medieval-rts), Kenney (version « Retina », 128 px) | CC0 1.0 | `medievalTile_NN.png` : herbe 57-58, eau 27, neige 29, terre 13 ; `medievalEnvironment_NN.png` : arbres 01-03 / 21, souche 04, tronc 05, rochers 07-08 / 14, buissons 12 / 19 |

- Listés par `scripts/gen-sprites.mjs` (`FOLDERS`) dans `game/data/sprites.js` — et par `launcher/Launcher.cs` (`SpriteFolders`) :
  un pack ajouté = une entrée dans **les deux** listes.
- Les archives complètes ne sont pas dans le dépôt : les retélécharger depuis la page du pack (lien « Continue without donating »).
- Attribution (facultative en CC0, prévue dans les crédits) : « Kenney (www.kenney.nl) ».
- Binaires : n'ouvre une image que si la tâche porte sur ce qu'elle montre.
