# Packs d'assets pour la carte (overworld) — le choix à faire

Palier 7 de la spec « Refonte Overworld + Arènes » (16 octobre 2026).

**✅ DÉCIDÉ (game designer, 16 octobre 2026) : B+, Kenney Medieval RTS avec les contours juice.**

- **Le prototype** : `game/carte-packs.html` → <http://localhost:7330/game/carte-packs.html> (les quatre rendus côte à
  côte, trois cadrages). `?pack=actuel|tiny|rts|rts-contour&cadre=place|arenes|ensemble` montre un seul rendu à la taille
  d'un téléphone (390 × 720), pour les captures. Il dessine **le même coin de la carte** : la place centrale
  (`WORLD.hub`), le Marchand, les arènes du Chat (`f2`) et du Corbeau (`f3`). Si `src/config/world.js` a une place
  centrale, il prend la carte en direct ; sinon un instantané de la carte du 16 octobre, écrit dans la page.
- **Les captures** : `mockups/carte-packs/comparaison-place.png`, `comparaison-arenes.png`, `comparaison-ensemble.png`.
- **Les images** : `Decor/<pack>/` (seulement les tuiles utilisées, avec la licence du pack), listées par
  `scripts/gen-sprites.mjs` dans `game/data/sprites.js`.

## Les candidats

| | Pack | Style | Ce qu'il apporte | Ce qui manque |
|---|---|---|---|---|
| **A** | [Kenney Tiny Town](https://kenney.nl/assets/tiny-town) (v1.1, 130 tuiles 16 × 16) | Pixel art, contours sombres sur les objets | Herbe (3 variantes), terre avec bords et coins rentrants (chemins larges : parfait), arbres verts et d'automne, buissons, champignons | **Pas d'eau, pas de rocher, pas de neige** (dessinés dans le prototype en aplats à coins droits) ; la terre n'a pas de contour |
| **B** | [Kenney Medieval RTS](https://kenney.nl/assets/medieval-rts) (120 fichiers, 64 px + « Retina » 128 px, vectoriel) | Vectoriel plat, coins arrondis, sans contour | Herbe, eau, neige, sable, arbres (cyprès, sapins), rochers gris et bruns, buissons, souches, troncs | Les routes ne font **qu'une case** de large : nos chemins (3 cases) sont tracés par le prototype, aux couleurs du pack |
| **B+** | Le même que B | B, cerné de **3 px brun presque noir** (`#2a1a12`, celui du skin juice) | Chemins, eau, neige, arbres et rochers prennent le contour des bâtiments | Les bords de région très découpés (neige des Cimes) deviennent chargés |

Écartés : **Nature Kit** (des modèles 3D, pas du top-down 2D) ; **Roguelike RPG pack** (pixel art 16 px sans contour,
même famille que Tiny Town en moins proche des bâtiments) ; **Tower Defense (top-down)** (les mêmes aplats que Medieval
RTS, avec des transitions de terrain, mais un décor militaire et pas d'eau). Les deux derniers ont été téléchargés et
regardés, pas branchés.

## Licences (vérifiées sur kenney.nl le 16 octobre 2026)
Les deux packs sont sous **Creative Commons CC0 1.0** (domaine public : <https://creativecommons.org/publicdomain/zero/1.0/>),
d'après leur page officielle et le `License.txt` de l'archive (copié dans chaque dossier `Decor/<pack>/`). Usage commercial
permis, modification permise, **aucune attribution exigée**.

**Attribution (facultative, mais on la met dans les crédits du jeu) :**
> Décor de la carte : « Tiny Town » et « Medieval RTS » par Kenney (www.kenney.nl), CC0 1.0.

## Ce que montrent les captures
- **A — Tiny Town** colle à l'esprit « chemins de terre bordés d'herbe » et gère tout seul nos chemins larges ; ses objets
  ont un contour sombre, comme les bâtiments. Mais c'est du **pixel art à côté de bâtiments lisses en haute définition** :
  le mélange se voit à l'échelle du jeu. Il impose une case **multiple de 16** (48 au lieu de 46 : `WORLD.tile` à
  changer), sinon les pixels sont inégaux — à la vue d'ensemble (½), ils le sont déjà. Eau, rochers et neige seraient à
  dessiner nous-mêmes.
- **B — Medieval RTS** est de la même famille que les bâtiments (aplats, formes rondes, haute définition), sans texture —
  ce que le game designer a demandé après le refus des packs Kenney UI. Sans contour, le sol paraît plus « mobile
  générique » que les bâtiments.
- **B+ — Medieval RTS cerné** est le plus proche de la direction artistique juice (contour brun 3 px, aplats saturés) :
  le sol et les bâtiments parlent la même langue. Le contour est ajouté au rendu (une silhouette décalée), pas dans les
  images : il se règle d'un chiffre.

## Recommandation (retenue)
**B+ : Kenney Medieval RTS, avec les contours juice ajoutés au rendu.** Il est vectoriel (net à toute taille, donc aussi
au portage Godot), plat sans texture, il couvre l'eau, la neige, les arbres et les rochers, et le contour le raccorde aux
bâtiments. Son seul manque (les chemins larges) est déjà résolu par le tracé du prototype, qui suit nos cases.

## Ce que le prototype révèle, quel que soit le pack
- **Autour de la place, 63 % des cases sont du chemin** (cases x 25..44, y 20..37) : les corridors de 3 cases de l'étoile et
  de l'anneau se chevauchent. Avec n'importe quel pack, la place ressemble à un grand terrain vague. À régler dans
  `buildMap()` (chemins de 1 ou 2 cases, ou une vraie place pavée) **avant** d'habiller.
- **Les bords de région sont en escalier** (neige des Cimes, cases de neige isolées) : en aplats arrondis et cernés, ça se
  voit plus qu'en damier. À adoucir dans `buildMap()` si B+ est retenu.
- Aux jonctions de trois sols (neige, herbe, chemin), de petits coins d'herbe restent visibles : défaut du tracé du
  prototype, à reprendre au branchement.

## Si le choix est fait : la suite (pas commencée)
1. Brancher le pack choisi dans `draw()` (couches : herbe, bois, neige, eau, chemin, puis le décor trié avec les
   bâtiments), en reprenant le tracé par quarts de case de `game/carte-packs.html`.
2. Réduire les chemins dans `buildMap()` et adoucir les bords de région.
3. Recompiler `AdventureCard.exe` (`scripts/build-exe.ps1`) : `launcher/Launcher.cs` liste désormais les dossiers
   `Decor/` comme `scripts/gen-sprites.mjs`, mais l'exe n'a pas été recompilé.
4. Ajouter les crédits Kenney dans le jeu.
