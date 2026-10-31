# Decor/ — les packs d'assets tiers

**La boutique** dessine ses meubles et ses clients avec `Kenney Furniture Kit/` et `Kenney Toon Characters/`. Les trois autres packs servaient à la carte du monde, retirée le 31 oct. 2026 : ils ne servent plus.

Un sous-dossier **par pack**, avec la licence d'origine (`License.txt`) et **seulement les images utilisées**. Le jeu dessine la carte
avec **Medieval RTS + Foliage Pack** (`game/src/ui/sol-carte.js`, décision du game designer du 16 octobre 2026, `docs/PACKS-CARTE.md`) ;
**Tiny Town** a été essayé et écarté : seul le prototype `game/carte-packs.html` s'en sert encore.

| Dossier | Pack | Licence | Fichiers |
|---|---|---|---|
| `Kenney Furniture Kit/` | [Furniture Kit](https://kenney.nl/assets/furniture-kit), Kenney (rendus `Isometric`) | CC0 1.0 | `<meuble>_<NE,NW,SE,SW>.png`, chargés par `ui/boutique-scene.js` ; un meuble ajouté = ses 4 images + une ligne de `BOUTIQUE.meubles` + une ligne de `shopLayout.furniture` dans le noyau |
| `Kenney Toon Characters/` | [Toon Characters](https://kenney.nl/assets/toon-characters-1), Kenney | CC0 1.0 | `<personnage>_<pose>.png` (idle, walk0-7, cheer, think, talk, hold…) |
| `Kenney Tiny Town/` | [Tiny Town](https://kenney.nl/assets/tiny-town) v1.1, Kenney | CC0 1.0 | `tile_NNNN.png` (16 × 16) : herbe 0-2, arbres 3-4 / 15-16 / 27-28, buisson 5, champignon 29, terre 12-14 / 24-26 / 36-38 (bords) et 39-42 (coins rentrants) |
| `Kenney Foliage Pack/` | [Foliage Pack](https://kenney.nl/assets/foliage-pack), Kenney (version « Default size ») | CC0 1.0 | `foliagePack_NNN.png` : fleurs 001-003 / 062, sapins 004-005 / 036, arbres ronds 006-010 / 037-041, arbres d'automne 012-016, touffes 018-021, sapins enneigés 027-032, buissons 049-052, rochers 053-058, rochers enneigés 059-061 |
| `Kenney Medieval RTS/` | [Medieval RTS](https://kenney.nl/assets/medieval-rts), Kenney (version « Retina », 128 px) | CC0 1.0 | `medievalTile_NN.png` : herbe 57-58, eau 27, neige 29, terre 13 ; `medievalEnvironment_NN.png` : arbres 01-03 / 21, souche 04, tronc 05, rochers 07-08 / 14, buissons 12 / 19 |

- Listés par `scripts/gen-sprites.mjs` (`FOLDERS`) dans `game/data/sprites.js` — et par `launcher/Launcher.cs` (`SpriteFolders`) :
  un pack ajouté = une entrée dans **les deux** listes.
- ⚠ **Foliage Pack : prendre le dossier `PNG/Default size`, pas `PNG/Retina`** — le second numérote ses fichiers **décalés d'un cran**
  (son `foliagePack_001` est la fleur rouge, `062` dans l'autre) : une fleur demandée y sort en arbre d'automne. Medieval RTS, lui,
  vient de `PNG/Retina` (même numérotation que `Default size`).
- ⚠ Medieval RTS pose une **ombre presque transparente** (opacité 26/255) sous ses arbres et ses buissons : `sol-carte.js` l'ignore
  pour mesurer un objet et pour le cerner (`OPAQUE`), sinon le contour entoure l'ombre au lieu du pied.
- Les archives complètes ne sont pas dans le dépôt : les retélécharger depuis la page du pack (lien « Continue without donating »).
- Attribution (facultative en CC0, prévue dans les crédits) : « Kenney (www.kenney.nl) ».
- Binaires : n'ouvre une image que si la tâche porte sur ce qu'elle montre.
