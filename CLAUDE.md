# Adventure Card

Idle RPG mobile (F2P) : exploration overworld + combats de cartes + deckbuilding + mini-jeu de Ferme.

Avant de travailler sur ce projet, lis **`docs/GDD.md`** : c'est le document de conception à jour, avec toutes les mécaniques décidées (deckbuilding, monnaies, combat, architecture idle, art/anim) et les 2 seuls points encore réellement non tranchés (marqués ⚠ NON DÉCIDÉ dedans).

## Stack visée
- Prototype : PWA (HTML/JS vanilla, zéro dépendance), pour valider la boucle de jeu.
- Version finale : portage Godot ou Unity.

## Lancer le prototype
`AdventureCard.exe` à la racine (serveur local + fenêtre format téléphone).
Alternative dev : `node scripts/devserver.js` → http://localhost:7330/game/index.html

## Règle de travail
**Aucune valeur d'équilibrage en dehors de `game/src/config/`.** Le GDD dit que la
cadence de déblocage et les coûts sont pilotés par le game designer (l'utilisateur) :
tout ce qui se tune doit rester dans ces fichiers, commenté en français.
Après un changement d'équilibrage, faire tourner `node scripts/simulate.mjs`.

## Dossiers
- `game/` — le prototype jouable. `src/config/` = game config, `src/combat/` = moteur + bot, `src/ui/` = écrans.
- `launcher/` — source C# du lanceur Windows (compilé avec le csc.exe fourni par Windows, cf. `scripts/build-exe.ps1`).
- `scripts/` — serveur de dev, simulateur d'équilibrage, build de l'exe.
- `docs/GDD.md` — game design doc complet.
- `mockups/` — mockups de cartes (placeholders, pas la direction artistique finale).
- `Characters/` — sprites de personnages (animaux : chien, chat, corbeau, renard, grenouille, chouette, lapin, panda roux, paresseux...).
- `Machines/` — sprites de bâtiments/machines de production (fermes, ateliers...).
- `Ressources/` — sprites de ressources récoltées/produites, par tiers de rareté (1 à 6).
- `UI/` — sprites d'interface (pièces, coffre, arbre, dé...).
- `V2/` — itération plus récente d'assets (bâtiments, ressources, refs) — vérifier avec l'utilisateur si V2 remplace les dossiers ci-dessus ou les complète.
