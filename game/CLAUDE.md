# game/ — le prototype jouable (PWA, HTML/JS vanilla, zéro dépendance)

> On y entre par `index.html` → `src/main.js`. Format **téléphone** (≈ 375 × 812 ; `#app` plafonné à 520 px de large).
> Lancer : `AdventureCard.exe` (racine) ou `node scripts/devserver.js` → `http://localhost:7330/game/index.html` (**`localhost`, jamais `127.0.0.1`** : deux origines, deux `localStorage`).

| Chemin | Rôle |
|---|---|
| `index.html` | La coquille (53 lignes) : `#topbar` (héros, niveau, rappel de monnaie), `#screens` (4 écrans : `screen-world`, `screen-farm`, `screen-deck`, `screen-bag`), `#nav` (barre du bas), et trois calques `#battle`, `#modal`, `#toasts`. |
| `styles.css` | **Le seul style** (≈ 29 Ko, ≈ 360 lignes, sections commentées : top bar, nav, écrans, joystick, panneaux, ferme, deck, carte de jeu, **combat**, gestes, masque `.spot`, journal `.jr-*`, fenêtre de zone, fiche `.insp`, modale, toasts). Palette = variables `:root` (le violet nuit d'origine, skin « actuel »). L'habillage vit dans `skins/` : `juice` est le défaut (10 octobre 2026). |
| `src/` | Le code : `main.js`, `state.js`, et `config/` (équilibrage + registres), `combat/` (moteur + bot + journaux), `tools/` (arène, situations), `ui/` (écrans). Voir `src/CLAUDE.md`. |
| `data/` | Les données (cartes écrites par le builder, situations, liste des sprites). Voir `data/CLAUDE.md`. |
| `skins/` | **L'habillage du combat**, interchangeable (`juice` par défaut, `parchemin`, `bonbon`, `actuel`) : feuilles de style (`juice` en pur CSS) + sprites Kenney (CC0) pour les deux autres. Voir `skins/CLAUDE.md`. |

## Console de debug (F12, ou `javascript_tool` du navigateur intégré)
`window.AC` : `AC.fight('wolf')` (lance un combat contre une rencontre de `ENCOUNTERS`), `AC.give('C', 500)`, `AC.go('farm')`, `AC.teleport(x, y)`, `AC.level('dog', 5)`, `AC.save`, `AC.persist()`.
⚠ Une victoire **crédite la sauvegarde** : voir la mémoire « Éprouver l'UI dans le navigateur intégré » pour tester sans la salir.

## Règles
- **Aucune valeur d'équilibrage hors de `src/config/`** ; aucune carte en dur (le builder les écrit).
- La sauvegarde est dans `localStorage` (clé `BALANCE.save.key`), écrite toutes les `autosaveMs` ; les combats gardés ont leur propre clé (`src/ui/combats.js`).
