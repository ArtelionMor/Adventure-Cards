# game/src/ — le code du jeu

| Chemin | Rôle |
|---|---|
| `main.js` | **Point d'entrée** (≈ 120 lignes) : navigation entre les 5 écrans (dont l'onglet **Arène**), l'avatar du bandeau qui ouvre le **Profil**, bandeau du haut, tutoriel (une modale), sauvegarde automatique, Wake Lock, gains hors-ligne, la console `window.AC`. |
| `state.js` | **La sauvegarde** et les règles de progression hors combat : `save` (l'objet unique, muté en place), `persist`, `freshSave`, `gain`/`spend` (monnaies A/B/C/G), `team()`, `partyLevel()` (niveau de **palier** de l'équipe, l'échelle des rencontres), `coutEtape`/`upgradeCost`/`upgradeChar` (une amélioration = un palier), `puissance`/`puissanceEquipe`, `verrouDe(point)` (le verrou d'un point du monde : puissance d'équipe si la Google Sheet en donne une — `reqPower`, onglet « encounters » —, niveau `reqLevel` sinon), `buySwitch`/`toggleSwitch`, `unlockChar`, `buyRosterSlot` (inutilisé : les 3 places sont ouvertes). Sauvegarde **v2** (12 oct. 2026) : le niveau d'un héros compte ses améliorations ; une v1 est migrée au chargement (`niveauDepuisAncien`), et une place vide de l'équipe se remplit. **v3** (16 oct. 2026, spec « Overworld + Arènes ») : `arenes` (`etatArene`, `noteCombatArene(id, gagne, joue)` : une victoire au niveau courant monte l'arène d'un niveau, un niveau déjà battu rejoué ne la monte pas), `decks` enregistrés (`enregistreDeck`, `chargeDeck`, `supprimeDeck`), `fondsDebloques()` (le fond de chaque arène gagnée, relu sur `arenes`, rien de gardé) et `choisitFond(f)` (`profil.fond` : le fond de tous les combats, `null` = celui de l'arène), `retraits` (cartes retirées par joker : `retireCarte`/`rendCarte`, `tailleDuDeck`), `profil` (`gagneXp`, `xpPourSuivant` : l'arbre de `config/profil.js`), `puissanceJoueur` (tout ce qui est possédé, base 0) à côté de `puissanceEquipe` (les héros alignés), `decouvreCultures` (cueillette), `areneDe`. Migrations : `migreFerme` (les parcelles deviennent les premières cases de la grille, sans perte), `migreMonde` (une position faite sur une autre carte — `WORLD.version` — repart de l'apparition). `verrouDe` ne sert plus en jeu (plus de verrou). |
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
| une icône | déposer `Graphical Assets/Icons/<Nom>.png` (`ui/icones.js` liste les noms) |
