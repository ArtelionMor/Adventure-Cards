# Adventure Card

Idle RPG mobile (F2P) : exploration overworld + combats de cartes + deckbuilding + mini-jeu de Ferme.

Avant de travailler sur ce projet, lis **`docs/GDD.md`** : c'est le document de conception à jour, avec toutes les mécaniques décidées (deckbuilding, monnaies, combat, architecture idle, art/anim) et les 2 seuls points encore réellement non tranchés (marqués ⚠ NON DÉCIDÉ dedans).

## Stack visée
- Prototype : PWA (HTML/JS vanilla, zéro dépendance), pour valider la boucle de jeu.
- Version finale : portage Godot ou Unity.

## Lancer le prototype
`AdventureCard.exe` à la racine (serveur local + fenêtre format téléphone).
Alternative dev : `node scripts/devserver.js` → http://localhost:7330/game/index.html

## Card Builder
`builder/index.html` (servi à `/builder/index.html`) — l'outil de game design pour les cartes,
sur le modèle du builder de build de Teliau's Toolbelt. Il écrit `game/data/characters.data.js`
et `docs/MECANIQUES-A-CODER.md` via `POST /api/write` (implémenté dans `scripts/devserver.js`
**et** dans `launcher/Launcher.cs` — modifier les deux).

**Quand l'utilisateur demande de coder une mécanique, lire d'abord `docs/MECANIQUES-A-CODER.md`.**
Le fichier dit ce qu'elle doit faire, quelles cartes l'utilisent et où l'implémenter. Une fois codée :
l'ajouter à `EFFECTS`/`KEYWORDS` dans `game/src/config/mechanics.js` et retirer son entrée de
`customMechanics` dans les données.

## Règle de travail
**Aucune valeur d'équilibrage en dehors de `game/src/config/`.** Le GDD dit que la
cadence de déblocage et les coûts sont pilotés par le game designer (l'utilisateur) :
tout ce qui se tune doit rester dans ces fichiers, commenté en français.
Après un changement d'équilibrage, faire tourner `node scripts/simulate.mjs`.
Après toute modification de `game/src/combat/`, faire tourner **les trois bancs** :
`node scripts/test-triggers.mjs` (32 tests : râles, auras, déclencheurs de tour, paliers qui
débloquent un moment, couture builder → moteur), `node scripts/test-ai.mjs` (7 tests : le bot
valorise-t-il ces mécaniques) et `node scripts/simulate.mjs` (la courbe de difficulté).

## Modèle de carte
Une carte porte des effets sur plusieurs **moments** (`TRIGGERS` dans `config/mechanics.js`) :
`play`, `death`, `turnStart`, `turnEnd`, plus `aura` qui est un modificateur continu et non
une liste d'effets. Ajouter un moment = l'ajouter dans `mechanics.js` **et** dans `engine.js`,
et le builder l'expose tout seul.

Les unités séparent `baseAtk`/`baseHp`/`baseKeys`/`damage` (l'état réel) de
`atk`/`hp`/`maxHp`/`keys` (dérivés, recalculés par `refresh()`). Ne jamais écrire dans les
dérivés : c'est ce qui garde les auras correctes quand elles tombent sur une unité blessée.

Un palier de niveau peut débloquer un effet sur n'importe quel moment (`{lvl, extra, slot}`)
ou donner une aura (`{lvl, aura}`, cumulative). `resolveCard` et `makeUnit` bouclent sur
`Object.keys(TRIGGERS)` : un moment ajouté au registre est transporté sans les modifier —
seul son point de déclenchement dans `engine.js` reste à écrire.

## Ciblage
Tout passe par `recipients()` dans `engine.js`, qui traduit une cible en destinataires
concrets (unites et/ou heros). Ajouter une cible = une entree dans `TARGETS` + un `case`
dans `recipients()`, jamais retoucher les effets un par un. Les drapeaux de `TARGETS` :
`pick` (le joueur la designe, sinon elle se resout seule), `random` (le bot la valorise un
peu moins), `allyOnly` (n'a de sens que portee par une unite, ex. « Elle-meme »).

## Le bot
`ai.js` garde les 4 priorités du GDD et ses 12 % de coups au hasard (voulus), mais choisit
maintenant par **valeur** et non par coût : `cardValue()` compte les râles (× 0.9, ils partent
presque toujours), les auras (× ce qu'elles multiplient) et le récurrent (× nombre de tours
espérés). `unitThreat()` fait l'inverse côté cible : tuer un porteur d'aura vaut cher, tuer
une unité à gros râle est un cadeau qu'on évite. Une mécanique pas encore codée vaut ~0 :
le bot ne surestime pas une carte qui ne fait rien.

## Dossiers
- `game/` — le prototype jouable. `src/config/` = game config, `src/combat/` = moteur + bot, `src/ui/` = écrans, `data/` = données générées par le builder.
- `builder/` — le Card Builder (page autonome, aucune dépendance).
- `launcher/` — source C# du lanceur Windows (compilé avec le csc.exe fourni par Windows, cf. `scripts/build-exe.ps1`).
- `scripts/` — serveur de dev, simulateur d'équilibrage, build de l'exe.
- `docs/GDD.md` — game design doc complet.
- `mockups/` — mockups de cartes (placeholders, pas la direction artistique finale).
- `Characters/` — sprites de personnages (animaux : chien, chat, corbeau, renard, grenouille, chouette, lapin, panda roux, paresseux...).
- `Machines/` — sprites de bâtiments/machines de production (fermes, ateliers...).
- `Ressources/` — sprites de ressources récoltées/produites, par tiers de rareté (1 à 6).
- `UI/` — sprites d'interface (pièces, coffre, arbre, dé...).
- `V2/` — itération plus récente d'assets (bâtiments, ressources, refs) — vérifier avec l'utilisateur si V2 remplace les dossiers ci-dessus ou les complète.
