# game/skins/ — l'habillage graphique de l'écran de combat (interchangeable)

> Un skin est une feuille de style **appliquée seulement pendant un combat** (`<html data-skin="…" data-combat>`, posé par `game/src/ui/skin.js`).
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
- Chaque règle d'un skin commence par `html[data-skin="<nom>"][data-combat]` : un skin n'a aucune prise sur la carte, la ferme, le deck et le sac.
- ⚠ **`border-image`** : `fill` se place **dans la partie « slice »**, avant le `/` (`28 28 46 fill / 7px 7px 11px stretch`). Après `stretch`, la déclaration est
  invalide et le navigateur n'en garde que les coins, sans le dire.
- ⚠ **Une animation CSS qui touche `transform` entre en conflit** avec celles du moteur (WAAPI) : `juice` n'anime que la propriété `translate` et exclut `.nouvelle`, `.targetable` et `.fx-carte`.
- ⚠ **Une police ne se charge pas par `@import`** dans une feuille de skin : une feuille qui attend le réseau bloque l'affichage. `skin.js` la demande en `media="print"` puis la bascule.
- La carte jouée (`.fx-carte`) **garde son contour de couleur** (doré, gris-rouge, vert, bleu, violet) : pas de cadre de bois, c'est le sens de ce contour.
- Pour ajouter un skin : une feuille `skins/<nom>.css` qui suit ce modèle, et son nom dans `SKINS` (`ui/skin.js`).
- `Kenney_UI/` (à la racine) garde les packs entiers téléchargés ; **seuls les sprites de `kenney/` sont versionnés**.
