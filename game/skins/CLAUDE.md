# game/skins/ — l'habillage graphique du jeu (interchangeable)

> Un skin est une feuille de style appliquée par `game/src/ui/skin.js` (`<html data-skin="…">`). Elle redéfinit les variables de
> couleur de `styles.css` et habille le combat, la barre du haut, la navigation, le deck, la ferme et le sac — **pas la carte
> (overworld)**, dont les éléments (bulle d'indice, manette, bouton « Entrer ») gardent ceux de `styles.css`.
> `actuel` = aucune feuille : le violet nuit et or d'origine. La mise en page ne change jamais, seulement les couleurs et les bordures.

| Fichier | Rôle |
|---|---|
| `juice.css` | **La base** de `cozy` (défaut du 10 au 21 octobre 2026 ; se choisit encore seul, `AC.skin('juice')`). Style « jeu mobile vivant » (référence : Chainsaw Juice King) : **aucune texture ni image, tout en CSS** — contour brun presque noir de 3 px partout, aplats saturés, relief des boutons (liseré clair en haut, ombre pleine en bas, ils s'enfoncent), chiffres blancs cernés, damier vert discret ; cartes **carrées** à cadre de couleur (bleu = allié, rouge = adversaire, or = Provocation, violet = sort), personnage qui déborde du cadre, nom absent de la face. Police « Lilita One » (OFL) chargée par `skin.js`. |
| `cozy.css` | **Le skin par défaut** (21 oct. 2026, après un regard de directeur artistique) : une **variante** de juice, chargée par-dessus (`<html data-skin="juice" data-variante="cozy">`), qui ne touche que le **combat** et ne change ni la mise en page ni les animations. Une table de bois éclairée d'en haut au lieu du damier, deux tapis de feutre cousus (rose adverse, sauge à toi), un contour prune, les personnages en **autocollants** (liseré blanc + ombre), la carte injouable en couleur (seul son coût grisé), le mana en un seul compteur (pastilles masquées), le dos de carte en **motif CSS** (l'image poussée hors de sa boîte par `object-position`), des onglets crème, Nunito pour le texte. `AC.skin('cozy')` / `AC.skin('juice')` pour comparer. **Les fonds du combat** (`#battle[data-fond]`, posé par `ui/battle.js` à l'ouverture : `fondDuCombat` de `ui/skin.js`) : `clairiere`, `prairie`, `nuit`, `etang`, `pastel` (un bloc chacun, qui redessine le fond et les deux plateaux) et `bois` (sans bloc : la table de cozy). **Chaque arène a le sien** (`fond`, `config/arenes.js`) et **une arène gagnée le débloque** : le joueur peut le garder pour tous ses combats (Profil). `AC.fond('nuit')` le force pour essayer (retenu, `localStorage` `adventureCard.fond`), `AC.fond(null)` l'oublie. Les fonds n'existent que dans **cozy** : sous juice, l'attribut ne fait rien. |
| `cozy/` | Le **décor des fonds** (clairière : `chene`, `chene2`, `pommier`, `sapin`, `buisson`, `sol` ; étang : `nenuphar`, `nenuphar-fleur`, `eau`), en SVG dans le style des personnages mais **moins cerné que les cartes** (le décor reste calme, seul ce qui se joue a le gros contour) : `chene`, `chene2`, `pommier`, `sapin`, `buisson`, `sol` (la tuile du sol, 300 × 260). Écrits par `scripts/gen-clairiere.mjs` (le régénérer écrase une retouche à la main). Cités par `cozy.css` en `url("cozy/…")` (relatifs à la feuille). |

Deux skins faits avec les packs Kenney (`parchemin`, `bonbon`, des images en 9-slice) ont existé : le game designer les a
écartés (« des textures partout »), ils sont dans l'historique git (commit `886d781`).

## Comment ça marche
- `ui/skin.js` : `AC.skin()` (liste + courant), `AC.skin('actuel')` ; le choix est retenu (`localStorage` `adventureCard.skin`,
  défaut `cozy` ; un skin choisi une fois reste retenu). Le panneau de triche (5 touchers sur « Tour N ») a un bouton « Skin : … » qui les fait tourner. Le skin règle
  aussi la couleur de la barre d'état du téléphone (`theme-color`).
- **Les couleurs se posent sur une LISTE d'éléments** (`:is(#topbar, #nav, #screen-farm, #screen-deck, #screen-bag, #battle, #modal,
  #toasts, .lecture, .triche, .revue)`), **jamais sur `<html>`** : les éléments de la carte portent du texte clair sur fond sombre et
  deviendraient illisibles. **Un écran de plus = une ligne de plus dans cette liste.** Et une fenêtre posée hors de ces éléments (comme `.revue`, dans `#app`) doit aussi poser sa propre `color: var(--ink)` : sinon elle hérite la couleur de texte du thème d'origine, calculée plus haut (le journal de « Revoir le combat » était blanc sur crème, 21 oct. 2026).
- Les règles sont imbriquées sous `html[data-skin="juice"]` (CSS nesting, Chrome 112+ / Safari 16.5+ / Firefox 117+).
- ⚠ **`:is()` prend la spécificité de son membre le plus fort** : une liste qui contient `.jr-onglets button` écrase
  les variantes plus simples (`.btn` vert, `.autochip` violet…). Pour une base commune, utiliser `:where()`.
- ⚠ **Une animation CSS sur `transform` entre en conflit** avec celles du moteur (WAAPI, `ui/effets.js`) : `juice` n'anime que la
  propriété `translate` et exclut `.nouvelle`, `.targetable` et `.fx-carte`.
- ⚠ **Pas de `@import` de police** dans une feuille de skin : une feuille qui attend le réseau bloque l'affichage. `skin.js` la
  demande en `media="print"` puis la bascule en `all`.
- ⚠ Si on réutilise `border-image` : `fill` se place **dans la partie « slice »**, avant le `/` (`28 28 46 fill / 7px 7px 11px
  stretch`) ; après `stretch`, la déclaration est invalide et le navigateur ne garde que les coins, sans le dire.
- La carte jouée (`.fx-carte`) et les cartes-effets **gardent leur contour de couleur** (doré, gris-rouge, vert, bleu, violet :
  `styles.css`) : c'est le sens de ce contour.
- **Cartes carrées** : `--carte` (unités) et `--carte-main` (main) donnent la taille ; `.plus` / `.moins` sur les chiffres sont
  posés par `ui/battle.js` (attaque au-dessus de la carte, vie blessée). Seul ce qui peut agir bouge et brille.
- Pour ajouter un skin : une feuille `skins/<nom>.css` et une ligne dans `SKINS_DEF` (`ui/skin.js`).
- Une **variante** (`base: 'juice'` dans `SKINS_DEF`) garde la feuille de sa base et pose la sienne **après** : ses règles sont
  imbriquées sous `html[data-skin="juice"][data-variante="<nom>"]` (un attribut de plus, donc elles gagnent sans `!important`).
  `juice.css` ne sait rien d'elle ; une règle de juice que la variante ne réécrit pas s'applique telle quelle.
- `Kenney_UI/` (à la racine, non versionné) garde les packs Kenney téléchargés ; rien ne les utilise plus.
