# game/skins/ — l'habillage graphique du jeu (interchangeable)

> Un skin est une feuille de style appliquée par `game/src/ui/skin.js` (`<html data-skin="…">`). Elle redéfinit les variables de
> couleur de `styles.css` et habille le combat, la barre du haut, la navigation, le deck, la ferme et le sac — **pas la carte
> (overworld)**, dont les éléments (bulle d'indice, manette, bouton « Entrer ») gardent ceux de `styles.css`.
> `actuel` = aucune feuille : le violet nuit et or d'origine. La mise en page ne change jamais, seulement les couleurs et les bordures.

| Fichier | Rôle |
|---|---|
| `juice.css` | **Le skin par défaut** (10 octobre 2026). Style « jeu mobile vivant » (référence : Chainsaw Juice King) : **aucune texture ni image, tout en CSS** — contour brun presque noir de 3 px partout, aplats saturés, relief des boutons (liseré clair en haut, ombre pleine en bas, ils s'enfoncent), chiffres blancs cernés, damier vert discret ; cartes **carrées** à cadre de couleur (bleu = allié, rouge = adversaire, or = Provocation, violet = sort), personnage qui déborde du cadre, nom absent de la face. Police « Lilita One » (OFL) chargée par `skin.js`. |

Deux skins faits avec les packs Kenney (`parchemin`, `bonbon`, des images en 9-slice) ont existé : le game designer les a
écartés (« des textures partout »), ils sont dans l'historique git (commit `886d781`).

## Comment ça marche
- `ui/skin.js` : `AC.skin()` (liste + courant), `AC.skin('actuel')` ; le choix est retenu (`localStorage` `adventureCard.skin`,
  défaut `juice`). Le panneau de triche (5 touchers sur « Tour N ») a un bouton « Skin : … » qui les fait tourner. Le skin règle
  aussi la couleur de la barre d'état du téléphone (`theme-color`).
- **Les couleurs se posent sur une LISTE d'éléments** (`:is(#topbar, #nav, #screen-farm, #screen-deck, #screen-bag, #battle, #modal,
  #toasts, .lecture, .triche)`), **jamais sur `<html>`** : les éléments de la carte portent du texte clair sur fond sombre et
  deviendraient illisibles. **Un écran de plus = une ligne de plus dans cette liste.**
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
- `Kenney_UI/` (à la racine, non versionné) garde les packs Kenney téléchargés ; rien ne les utilise plus.
