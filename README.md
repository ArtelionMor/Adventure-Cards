# Adventure Card

Idle RPG mobile (F2P) avec exploration overworld et combats de cartes.
Nom de travail : **Adventure Card**. Univers/theme pas encore arrete.

## Lancer le jeu

Double-clique **`AdventureCard.exe`** a la racine du projet.
Il demarre un petit serveur local et ouvre le jeu dans une fenetre au format telephone.
Ferme la fenetre pour tout arreter. Aucune installation, aucune dependance.

En dev, si tu preferes ton navigateur :

```bash
node scripts/devserver.js
```

puis http://localhost:7330/game/index.html

Pour recompiler le lanceur apres modification de `launcher/Launcher.cs` :

```bash
powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1
```

## Ou tuner le jeu

Tout l'equilibrage vit dans `game/src/config/` et nulle part ailleurs :

| Fichier | Contenu |
|---|---|
| `balance.js` | couts, timers, plafonds, cadence de deblocage |
| `characters.js` | les 6 personnages, leurs 5 cartes + 5 cartes switch, les paliers de niveau |
| `world.js` | carte de l'overworld, points d'interet, niveaux requis, ennemis |
| `farm.js` | plants, temps de pousse, prix |
| `relics.js` | objets a passifs vendus par les marchands |

Banc d'essai d'equilibrage (bot contre bot sur toutes les rencontres) :

```bash
node scripts/simulate.mjs 200
```

Console de debug dans le jeu (F12) : `AC.fight('wolf')`, `AC.give('C', 500)`,
`AC.level('dog', 8)`, `AC.teleport(52, 36)`.

## Resume rapide
- Deckbuilding : 3 personnages x 5 cartes = deck de 15 cartes (melange unique, facon Slay the Spire)
- Combat : mode auto (idle, bot) et mode manuel (combats difficiles)
- Idle hybride : offline earnings + auto-battle foreground (ecran allume, facon Clash of Critters)
- Overworld facon Don't Starve, structure de campagne facon AFK Journey
- Roadmap : prototype PWA -> portage Godot/Unity, F2P

## Doc de conception
`docs/GDD.md` — game design doc complet et a jour.

## Dossiers
- `game/` : le prototype jouable (PWA, vanilla JS, zero dependance)
- `launcher/` : source C# du lanceur Windows
- `scripts/` : serveur de dev, simulateur d'equilibrage, build de l'exe
- `mockups/` : mockups de cartes (placeholders, DA a venir)
- `Characters/`, `Machines/`, `Ressources/`, `UI/`, `V2/` : sprites
