# game/src/ — le code du jeu

| Chemin | Rôle |
|---|---|
| `main.js` | **Point d'entrée** (≈ 120 lignes) : navigation entre les 4 écrans, bandeau du haut, tutoriel (une modale), sauvegarde automatique, Wake Lock, gains hors-ligne, la console `window.AC`. |
| `state.js` | **La sauvegarde** et les règles de progression hors combat : `save` (l'objet unique, muté en place), `persist`, `freshSave`, `gain`/`spend` (monnaies A/B/C), `team()`, `partyLevel()`, `upgradeChar`, `buySwitch`/`toggleSwitch`, `unlockChar`, `buyRosterSlot`. |
| `config/` | La **game config** (`balance.js`…) et les **registres** (`mechanics.js`) — `config/CLAUDE.md`. |
| `combat/` | Le **moteur**, le bot, les journaux (décisions + événements) — `combat/CLAUDE.md`. |
| `tools/` | L'**arène** de mesure et le montage de situations — `tools/CLAUDE.md`. |
| `ui/` | Les **écrans** — `ui/CLAUDE.md`. |

## Sens des dépendances (ne pas les inverser)
`ui/` → `combat/` → `config/` ; `tools/` → `combat/` + `config/` ; `config/` n'importe ni `combat/` ni `ui/`.
`combat/` n'a **aucun DOM**. `config/`, `combat/` et `tools/` tournent aussi sous Node (scripts) et dans les pages du builder.

## Où modifier quoi
| Je veux… | Je vais dans… |
|---|---|
| ajouter / changer une carte, un héros, un adversaire | le **Card Builder** (`builder/index.html`), pas le code |
| coder une mécanique nouvelle | `config/mechanics.js` (registre) + `combat/engine.js` (`case`) + `combat/ai.js` (valeur) |
| régler un coût, un timer, le bot, un plafond | `config/balance.js` |
| changer l'écran de combat | `ui/battle.js` (+ `styles.css`) |
| changer la carte du monde, un bâtiment, une rencontre | `config/world.js` (placement) et `ui/overworld.js` (dessin) |
| une icône | déposer `Icons/<Nom>.png` (`ui/icones.js` liste les noms) |
