# game/ — le prototype jouable (PWA, HTML/JS vanilla, zéro dépendance)

> On y entre par `index.html` → `src/main.js`. Format **téléphone** (≈ 375 × 812 ; `#app` plafonné à 520 px de large).
> Lancer : `AdventureCard.exe` (racine) ou `node scripts/devserver.js` → `http://localhost:7330/game/index.html` (**`localhost`, jamais `127.0.0.1`** : deux origines, deux `localStorage`).

| Chemin | Rôle |
|---|---|
| `index.html` | La coquille (≈ 57 lignes) : `#topbar` (héros, niveau, monnaies ; **toucher l'avatar ouvre le Profil**), `#screens` (5 écrans : `screen-world`, `screen-arene`, `screen-farm`, `screen-deck`, `screen-bag`), `#nav` (barre du bas, 5 dessins sans texte, maquette « Arena Screen » du 19 oct. 2026 : Ferme, **Arène**, Carte, Deck, Sac — icône `Shop` ; `main.js` pose les icônes depuis `data-ico`), trois calques `#battle`, `#modal`, `#toasts`, et l'**écran de chargement** `#chargement` (retiré par `src/ui/chargement.js` quand les images sont prêtes). |
| `styles.css` | **Le seul style** (≈ 29 Ko, ≈ 360 lignes, sections commentées : top bar, nav, écrans, joystick, panneaux, ferme, deck, onglets du bas, carte de jeu, **combat**, gestes, masque `.spot`, journal `.jr-*`, fenêtre de zone, fiche `.insp`, modale, toasts). Palette = variables `:root` (le violet nuit d'origine, skin « actuel »). ⚠ `#app` est une grille à 4 lignes (barre, bandeau de quête, écrans, navigation) et **chaque bande a sa ligne** (`grid-row`) : sans ça, le bandeau masqué quand le fil de quêtes est fini faisait tomber les écrans dans une ligne de 0 px (carte et onglet Arène vides, 24 oct. 2026). L'habillage vit dans `skins/` : `cozy` est le défaut (21 octobre 2026), posé sur `juice` (10 octobre 2026). |
| `src/` | Le code : `main.js`, `state.js`, et `config/` (équilibrage + registres), `combat/` (moteur + bot + journaux), `tools/` (arène, situations), `ui/` (écrans). Voir `src/CLAUDE.md`. |
| `data/` | Les données (cartes écrites par le builder, situations, liste des sprites). Voir `data/CLAUDE.md`. |
| `vignettes/` | **Les versions allégées des sprites** (16 oct. 2026) : une copie WebP de 512 px au plus côté par image de `Graphical Assets/{Characters,Cards,Buildings,Ressources,Old UI}/` (même chemin sous `vignettes/`), et de 256 px pour les grandes images d'interface de `Graphical Assets/Icons/` et `Graphical Assets/CardBack/` (~7 Mo en tout, contre ~220 Mo d'originaux en 2000 px). **Générées** par `python scripts/gen-vignettes.py` (Pillow), listées dans `data/vignettes.js` ; le jeu les prend d'office (`asset`, `src/ui/shell.js`), l'écran de chargement les précharge. Ne pas les éditer : refaire depuis l'original. |
| `skins/` | **L'habillage du combat**, interchangeable (`cozy` par défaut — une variante de `juice` posée par-dessus, avec le fond de combat de chaque arène —, `juice`, `actuel` = aucun), en pur CSS (les skins Kenney `parchemin` et `bonbon` ont été retirés). Voir `skins/CLAUDE.md`. |

## Console de debug (F12, ou `javascript_tool` du navigateur intégré)
`window.AC` : `AC.fight('wolf')` (lance un combat contre une rencontre de `ENCOUNTERS`), `AC.give('C', 500)`, `AC.go('farm')`, `AC.teleport(x, y)`, `AC.level('dog', 5)`, `AC.save`, `AC.persist()`, `AC.console()` (ouvre la console de triche).
**La console de triche en boutons** (24 oct. 2026, `src/ui/triche.js`) : le bouton rond à gauche des monnaies, dans la barre du haut (tant que `BALANCE.triche.bouton`) — monnaies, niveau d'un héros, recruter/renvoyer, combat contre une arène à un niveau choisi (direct ou par sa fiche), niveau d'une arène, « Tout débloqué » le temps d'une session, recruter tous les héros, passer le tutoriel, +1 place, toutes les arènes vues. Celle **du combat** reste à part (5 touchers sur « Tour N »).
`AC.boutique` : `etat()`, `avance(minutes)`, `donne(or)`.
**Tout débloqué** (provisoire, `BALANCE.toutDebloque`, en attendant la nouvelle carte) : toutes les arènes dans l'onglet Arène et tous les héros alignables, **sans rien écrire dans la sauvegarde**.
⚠ Une victoire **crédite la sauvegarde** : voir la mémoire « Éprouver l'UI dans le navigateur intégré » pour tester sans la salir.

## Règles
- **Aucune valeur d'équilibrage hors de `src/config/`** ; aucune carte en dur (le builder les écrit).
- La sauvegarde est dans `localStorage` (clé `BALANCE.save.key`), écrite toutes les `autosaveMs` ; les combats gardés ont leur propre clé (`src/ui/combats.js`).
