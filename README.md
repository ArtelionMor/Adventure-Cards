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

## Card Builder

Ouvre **`http://localhost:7330/builder/index.html`** (ou le lien affiche par `AdventureCard.exe`).
C'est la que se creent les personnages, leurs 5 cartes et la carte switch de chaque slot.

- **Appliquer au jeu** reecrit `game/data/characters.data.js` : recharge le jeu, c'est en place.
- Une mecanique qui n'existe pas encore se cree dans le builder avec sa description ; elle part
  dans **`docs/MECANIQUES-A-CODER.md`** avec la liste des cartes qui l'utilisent et l'endroit ou
  la coder. En attendant, le jeu affiche la carte mais ecrit « pas encore codee » dans le journal
  de combat, et `scripts/simulate.mjs` la signale — rien ne fait semblant de marcher.
- Tout se sauvegarde en brouillon local en continu ; Exporter / Importer JSON pour les allers-retours.

### Les cibles

Choisies par le joueur : une cible adverse, une unite adverse, un de tes allies.
Automatiques (donc utilisables sur un rale d'agonie ou un declencheur de tour, ou personne
n'est la pour choisir) : le heros adverse, ton heros, toutes les unites adverses, tous tes
allies, et quatre tirages au sort symetriques : **un ennemi au hasard** (unite ou heros),
**une unite adverse au hasard**, **un allie ou ton heros au hasard**, **un de tes allies au
hasard** (unite). Plus **elle-meme**, qui n'existe que sur un allie : un sort n'est
« lui-meme » de rien, le builder ne la propose donc pas sur un sort.

Les degats acceptent aussi les cibles alliees : se blesser soi-meme ou toucher un des siens
est un cout de carte assume, et le bot le compte bien comme un malus.

### Les moments ou une carte agit

| Moment | Quand | Sur quoi |
|---|---|---|
| **A la pose** | la carte est jouee | allie (cri de guerre) ou sort |
| **Rale d'agonie** | l'unite meurt | allie |
| **Debut de ton tour** | chaque tour, apres la pioche | allie |
| **Fin de ton tour** | chaque tour, avant de passer la main | allie |
| **Aura** | en continu tant qu'elle est en jeu | allie |

N'importe quel effet existant fonctionne sur n'importe lequel de ces moments : pour faire
« quand elle meurt, invoque deux chatons », il n'y a rien a coder, c'est de la config.
Un **palier de niveau** peut aussi debloquer n'importe lequel de ces moments : « niveau 5 :
gagne un rale d'agonie », « niveau 8 : gagne une aura +1 attaque ». Les paliers d'aura se
cumulent. Les moments proposes viennent du registre `TRIGGERS`, donc en ajouter un le fait
apparaitre partout dans le builder sans y toucher.
L'aura n'est pas un effet mais un modificateur (+/- attaque, +/- vie, mot-cle offert), applique
aux autres allies ou aux unites adverses, et retire des que l'unite quitte le plateau.

## Ou tuner le jeu

Tout l'equilibrage vit dans `game/src/config/` et nulle part ailleurs :

| Fichier | Contenu |
|---|---|
| `balance.js` | couts, timers, plafonds, cadence de deblocage |
| `mechanics.js` | registre des effets et mots-cles que le moteur sait executer |
| `characters.js` | logique des cartes (paliers, deck) — les **donnees** sont dans `game/data/characters.data.js`, ecrit par le builder |
| `world.js` | carte de l'overworld, points d'interet, niveaux requis, ennemis |
| `farm.js` | plants, temps de pousse, prix |
| `relics.js` | objets a passifs vendus par les marchands |

Banc d'essai d'equilibrage (bot contre bot sur toutes les rencontres) :

```bash
node scripts/simulate.mjs 200
```

Tests du moteur (rales d'agonie, auras, declencheurs de tour, paliers qui debloquent un
moment) — a relancer apres toute modification de `game/src/combat/` :

```bash
node scripts/test-triggers.mjs
```

Tests du bot (verifie qu'il valorise bien les rales, les auras et le recurrent) :

```bash
node scripts/test-ai.mjs
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
