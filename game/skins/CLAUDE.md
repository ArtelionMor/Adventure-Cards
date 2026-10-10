# game/skins/ — l'habillage graphique de l'écran de combat (interchangeable)

> Un skin est une feuille de style (`<html data-skin="…">`, posé par `game/src/ui/skin.js`). `parchemin` et `bonbon` n'agissent **que pendant un combat** (`data-combat`) ; `juice` habille aussi la barre du haut, la navigation, le deck, la ferme et le sac — **pas la carte (overworld)**, dont les éléments restent ceux de `styles.css`.
> Elle redéfinit les variables de couleur de `styles.css` et habille cartes, unités, boutons et fenêtres avec des sprites Kenney en 9-slice
> (`border-image`) ou en pur CSS (`juice`). `actuel` = aucune feuille : le violet nuit et or d'origine. La mise en page ne change pas.

| Fichier | Rôle |
|---|---|
| `juice.css` | **Vif, façon jeu mobile « vivant »** (référence : Chainsaw Juice King) : aucune texture ni image, tout en CSS — contour brun presque noir de 3 px partout, aplats saturés, relief des boutons (liseré clair en haut, ombre pleine en bas), chiffres blancs cernés, damier vert, cartes à cadre de couleur (bleu = allié, rouge = adversaire, or = Provocation, violet = sort), unités qui respirent. **Défaut.** Police « Lilita One » (OFL) chargée par `skin.js`. |
| `parchemin.css` | **Clair et chaud, matière** : papier quadrillé, cadres de bois, boutons crème, bandeau rouge (pack « UI Pack - Adventure »). |
| `bonbon.css` | **Clair et chaud, vif** : cadres jaunes épais, boutons gloss, fond pêche (pack « UI Pack »). |
| `kenney/` | Les sprites utilisés (copiés des packs, résolution « Double ») et les deux `License-*.txt`. **CC0** : aucun crédit à donner. |

## Comment ça marche
- `ui/skin.js` : `AC.skin()` (liste + courant), `AC.skin('bonbon')` ; le choix est retenu (`localStorage` `adventureCard.skin`, défaut `juice`).
  Le panneau de triche (5 touchers sur « Tour N ») a un bouton « Skin : … » qui les fait tourner.
- Chaque règle de `parchemin` et `bonbon` commence par `html[data-skin="<nom>"][data-combat]` (aucune prise hors combat). `juice` porte ses couleurs sur une liste d'éléments (`:is(#topbar, #nav, #screen-farm, #screen-deck, #screen-bag, #battle, #modal, …)`) : **ajouter un écran = l'ajouter à cette liste**, et ne jamais mettre les couleurs sur `html`, sinon les éléments de la carte (qui portent du texte clair sur fond sombre) deviennent illisibles.
- ⚠ **`border-image`** : `fill` se place **dans la partie « slice »**, avant le `/` (`28 28 46 fill / 7px 7px 11px stretch`). Après `stretch`, la déclaration est
  invalide et le navigateur n'en garde que les coins, sans le dire.
- ⚠ **Une animation CSS qui touche `transform` entre en conflit** avec celles du moteur (WAAPI) : `juice` n'anime que la propriété `translate` et exclut `.nouvelle`, `.targetable` et `.fx-carte`.
- ⚠ **Une police ne se charge pas par `@import`** dans une feuille de skin : une feuille qui attend le réseau bloque l'affichage. `skin.js` la demande en `media="print"` puis la bascule.
- **Cartes carrées (juice)** : la face d'une unité ou d'une carte de la main est un carré (`--carte`, `--carte-main`), le personnage déborde du cadre, le nom n'y est pas écrit (appui long), les pictogrammes sont en bas à gauche et les chiffres en bas à droite (attaque verte au-dessus de la carte, vie rouge si blessée : `.plus`/`.moins` posés par `battle.js`). Seul ce qui peut agir bouge et brille.
- La carte jouée (`.fx-carte`) **garde son contour de couleur** (doré, gris-rouge, vert, bleu, violet) : pas de cadre de bois, c'est le sens de ce contour.
- Pour ajouter un skin : une feuille `skins/<nom>.css` qui suit ce modèle, et son nom dans `SKINS` (`ui/skin.js`).
- `Kenney_UI/` (à la racine) garde les packs entiers téléchargés ; **seuls les sprites de `kenney/` sont versionnés**.
