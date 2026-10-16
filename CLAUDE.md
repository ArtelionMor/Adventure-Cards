# Adventure Card

Idle RPG mobile (F2P) : exploration overworld + combats de cartes + deckbuilding + mini-jeu de Ferme.

Avant de travailler sur ce projet, lis **`docs/GDD.md`** : c'est le document de conception à jour, avec toutes les mécaniques décidées (deckbuilding, monnaies, combat, architecture idle, art/anim) et les 2 seuls points encore réellement non tranchés (marqués ⚠ NON DÉCIDÉ dedans), plus une réflexion ouverte (⚠ EN RÉFLEXION : taille du deck, places d'équipe, choix guidé).

**Les héros V3** (six nouveaux héros, leurs paliers, les mécaniques à coder et l'ordre du codage)
sont dans **`docs/V3-HEROS.md`** : à lire avant de toucher à Reprise, Charogne, Appât, Pistage, Toxine,
Ex-libris ou au Registre. Il dit ce qui est codé (✅) et ce qui reste, et garde les décisions du game
designer — ne pas rouvrir ce qui y est tranché.


## Vocabulaire : archétypes et niveaux de jeu
Quand on parle d'un deck ou de la façon de le jouer, ces mots ont **ce sens-là** — dans
les échanges, les docs, les commentaires et les analyses.

**Les archétypes.** La catégorisation, c'est **Combo**, **Aggro**, **Contrôle**. On peut
y adosser un qualificatif :

- **Tempo** — essaie de prendre l'adversaire de vitesse, avec un faible niveau
  d'interaction.
- **MidRange** — s'adapte à son adversaire.
- **Turbo** — ne se préoccupe pas de son adversaire.
- **Hard** — ne fait que de la gestion : il va chercher le 1 pour 1 ou le 1 pour 2.
- **Soft** — fait de la prophylaxie.
- **Pillow Fort** — se blinde, puis gagne par un autre moyen. **N'existe pas encore**
  dans le jeu : l'idée serait une carte du genre « si c'est votre 30ᵉ tour, gagnez la
  partie » (à garder sous `BALANCE.combat.maxTurns`, sinon elle ne partirait jamais).
- **Fatigue** — ne cherche qu'à aller à la Fatigue (la pile de fatigue, cf. « Finir sa
  pioche ») pour y profiter d'un avantage, même minime, et gagner.

**Technique, tactique, stratégie, plan** — quatre niveaux, du plus fin au plus large, à
ne pas confondre :

- **La technique** (micro) — l'habileté, physique ou mentale, à ordonner les
  interactions. **Elle est absente de ce jeu.** Exemple dans Magic : savoir que Tangle
  Wire peut s'engager elle-même, et ordonner les déclencheurs de son tour pour qu'elle
  perde son marqueur « temps » avant que son effet parte — et avoir ainsi un permanent
  de moins à engager que l'adversaire.
- **La tactique** (méso) — se joue **en partie** : comprendre l'environnement dans
  lequel la partie se déroule, comprendre le matchup, savoir ce qui se passe au niveau
  technique, et ordonner ses tours pour mener le match jusqu'à la victoire.
- **La stratégie** (pré-méta) — se joue **avant le match** : le prévoir, comprendre le
  méta-jeu dans lequel on se place, choisir les bonnes cartes (switcher ou non certaines
  cartes, prendre les bons trinkets), changer un héros pour un autre. Exemple : mettre
  Athéna à la place de Médor contre le Grand-Duc, parce qu'on sait qu'il faudra forcer
  une colère de Kamaji en menaçant avec une grosse créature.
- **Le plan** (méta-jeu) — se joue **sur la progression** : investir plus de ressources
  dans Médor parce qu'Athéna et Felix sont niveau 10 et lui niveau 6, qu'on perd donc
  les matchups où c'est lui qui est fort, et qu'on veut avancer dans le jeu.


## Philosophie de design : Timmy, Johnny, Spike
Le game designer juge une carte ou une mécanique avec la taxonomie de **Mark Rosewater**
(lead designer de Magic) — trois joueurs, à qui il faut donner ce qu'ils viennent chercher :

- **Timmy** veut des **gros tours** et des cartes impressionnantes : le hibou ou le corbeau
  à 8 mana, le sort qui fait un truc de fou (Métamorphose ultime : un board de petits chats
  qui deviennent tous la grosse matriarche). Lui permettre de **fabriquer un moment
  exceptionnel**, même s'il n'arrive qu'une fois sur cent : qu'il soit possible compte.
- **Johnny** cherche les **combos** : c'est lui qui trouvera « Griffure + Miroir +
  Découverte » et écrira qu'il a cassé la méta. On le laisse faire — un combo à 4-5 cartes
  qui tue d'un coup arrive trop rarement pour déranger la méta.
- **Spike** est le joueur compétitif qui optimise — le « niveau designer » : c'est pour lui
  que le jeu est **principalement équilibré**. Il ne jouera pas les combos de Johnny, qui ne
  sont pas ce qu'il y a de plus efficace.

Ce qui en découle, et qui vaut pour toute proposition :

- ⚠ **Pas de plafond arbitraire** (« X fois par tour ») pour couper une boucle : c'est
  restrictif et **incompréhensible pour le joueur**. On ferme une boucle par une **règle
  de carte lisible**, comme le font les autres jeux (cf. « La carte Miroir » : un Miroir
  arrive vierge). Les plafonds du moteur qui existent déjà (`maxRecyclageParTour`,
  `maxPiochesAVideParTour`, `maxTurns`) sont des coupe-circuits de dernière ligne.
- **Un combo infini n'est pas un problème** s'il est rare et dépend de l'adversaire. Ce qui
  en est un, c'est un **bot** qui ne sait pas s'arrêter (cf. « Le bot »).
- **Pas de passif de héros pour l'instant** : toute mécanique est **portée par une carte**
  (un mot-clé sur la carte, des cartes générées par d'autres).


## Stack visée
- Prototype : PWA (HTML/JS vanilla, zéro dépendance), pour valider la boucle de jeu.
- Version finale : portage Godot ou Unity.


## Lancer le prototype
`AdventureCard.exe` à la racine (fenêtre format téléphone), ou `node scripts/devserver.js` → http://localhost:7330/game/index.html
(**`localhost`, jamais `127.0.0.1`** : deux origines, deux `localStorage`). L'exe lance le même serveur que le Pi (`scripts/devserver.js`) quand Node est là, le
**réutilise** s'il tourne déjà, et se rabat sur son serveur intégré sinon. **L'Atelier installé par Chrome se prend sur le Pi**, pas sur `localhost` :
« Appliquer au jeu » y écrit les cartes **sur le Pi**, à rapatrier par git. Les pièges de l'exe (profil, verrou, fenêtre déjà ouverte) : `launcher/CLAUDE.md`.
Le serveur de prévisualisation de l'outil est déclaré dans `.claude/launch.json` (`adventure-card`, port 7330).

## Lire ce dépôt sans l'explorer
**Chaque dossier a son `CLAUDE.md`** : il dit à quoi sert le dossier, ce que fait **chaque fichier** (rôle, points d'entrée), qui l'utilise, quels tests lancer et quels pièges
éviter. **Lis-le avant d'ouvrir un fichier du dossier** — il est chargé tout seul dès que tu lis un fichier de ce dossier, mais mieux vaut le lire en premier.
- Les gros fichiers ne se lisent **jamais en entier** : `game/src/combat/engine.js` (≈ 2 000 l.), `game/src/combat/ai.js` (≈ 1 200), `game/src/config/mechanics.js` (≈ 1 560),
  `game/src/ui/battle.js` (≈ 1 030), `builder/index.html` (≈ 2 400), `builder/lancer.html` (≈ 1 300), `scripts/devserver.js` (≈ 900), `scripts/test-triggers.mjs` (≈ 3 600),
  `game/data/characters.data.js` (≈ 7 900) → **Grep** le nom d'une fonction (chaque `CLAUDE.md` donne les bons) puis Read avec `offset`/`limit`.
- Les images (`Characters/`, `Machines/`, `Ressources/`, `UI/`, `Icons/`, `V2/`, `mockups/`) sont des binaires : ne les ouvre que si la tâche porte sur ce qu'elles montrent.
- **Tiens ces `CLAUDE.md` à jour** : un fichier ajouté = une ligne dans la table de son dossier ; un invariant qui change = la section concernée. Un `CLAUDE.md` qui ment coûte plus de tokens que pas de `CLAUDE.md`.

## Carte du projet

| Dossier | Contenu | Détail |
|---|---|---|
| `game/` | **Le prototype jouable** (PWA, JS vanilla) : `index.html`, `styles.css`, `skins/` (l'habillage), `src/`, `data/`. | `game/CLAUDE.md` |
| `game/src/` | `main.js` (entrée, console `AC`), `state.js` (sauvegarde), + les quatre dossiers ci-dessous. | `game/src/CLAUDE.md` |
| `game/src/config/` | **Game config** (`balance.js` : tout ce qui se tune) et **registres** (`mechanics.js`), personnages, adversaires, monde, validation, courbes. | `game/src/config/CLAUDE.md` |
| `game/src/combat/` | **Moteur**, bot, journal de décisions, événements du combat. Pas de DOM. | `game/src/combat/CLAUDE.md` |
| `game/src/tools/` | L'**arène** de mesure (deck contre deck) et le montage des **situations**. | `game/src/tools/CLAUDE.md` |
| `game/src/ui/` | Les **écrans** : combat, overworld, deck, ferme, sac, journal graphique, gestes, icônes. | `game/src/ui/CLAUDE.md` |
| `game/data/` | Les données : **cartes** (écrites par le builder), situations, liste des sprites. | `game/data/CLAUDE.md` |
| `builder/` | **L'Atelier** : Card Builder, équilibrage, courbes, situations, lancer un calcul, versions (pages autonomes, PWA). | `builder/CLAUDE.md` |
| `scripts/` | Serveur de dev, outils de mesure, **bancs de test**, générateurs. | `scripts/CLAUDE.md` |
| `scripts/lib/` | Briques partagées : file de calcul, renforts, IA locale, versions, archives, push. | `scripts/lib/CLAUDE.md` |
| `launcher/` | Le lanceur Windows (`Launcher.cs` → `AdventureCard.exe`). | `launcher/CLAUDE.md` |
| `android/` | Le widget Android (Java, sans bibliothèque). | `android/CLAUDE.md` |
| `docs/` | La conception : GDD, héros V3, grammaire des paliers, mécaniques à coder, situations. | `docs/CLAUDE.md` |
| `Characters/` `Machines/` `Ressources/` `UI/` | Sprites (personnages, bâtiments, ressources, objets). | un `CLAUDE.md` chacun |
| `Decor/` | Packs d'assets **tiers** (Kenney, CC0) essayés pour le sol et le décor de la carte, **pas encore branchés** (`docs/PACKS-CARTE.md`). | `Decor/CLAUDE.md` |
| `Icons/` | Le logo et les **icônes d'interface** (`Dead.png`, + celles que dessine le game designer). | `Icons/CLAUDE.md` |
| `V2/` | Itération plus récente d'assets, **pas câblée**. | `V2/CLAUDE.md` |
| `mockups/` | Maquettes (cartes, widget). | `mockups/CLAUDE.md` |
| `combatLogs/` | Anciens exports de mesures (archives). | `combatLogs/CLAUDE.md` |
| `build/` | Sorties de compilation, ignorées par git (vide). | — |
| `Teliau_s Toolbelt/` | ⚠ **Hors sujet** : un autre projet (« Project Pet Passives », « site », « TLE Intention Tab », « Versioning JSON », `site-deploy.zip`) committé par erreur dans ce dépôt (≈ 270 fichiers). **Ne l'explore pas, ne le modifie pas** ; à sortir du dépôt si le game designer est d'accord. | — |
| racine | `CLAUDE.md` (ce fichier), `README.md`, `AdventureCard.exe`, `.gitignore`, `.claude/launch.json`. | — |

### Où aller pour…
| Je veux… | Je vais… |
|---|---|
| ajouter ou changer une carte, un héros, un adversaire | dans le **Card Builder** (`builder/index.html`) — jamais dans le code |
| coder une mécanique nouvelle | lire `docs/MECANIQUES-A-CODER.md`, puis `config/mechanics.js` + `combat/engine.js` + `combat/ai.js` |
| régler un coût, un timer, un plafond, le bot | `game/src/config/balance.js` |
| régler la game config dans la **Google Sheet** | [« Config Adventure-Cards »](https://docs.google.com/spreadsheets/d/1B01tuggXdbvqO3_7wh2YserIoDVnarMXCPXPaYbSGCY/edit) → page « Feuille » de l'Atelier (lien en haut) ou `scripts/sync-feuille.mjs` sur le Pi ; onglets branchés : `animations`, `heroes` (la feuille commande les **statistiques** des héros et adversaires, le builder les **cartes**), `encounters` (puissance requise) — `game/src/config/feuille.js` ; `~` = pas exporté |
| modifier l'écran de combat, les gestes, le journal graphique | `game/src/ui/` (+ `game/styles.css`) |
| changer l'aspect (couleurs, cadres, polices) ou une animation de carte | `game/skins/juice.css` ; `game/src/ui/vfx.js` (`SIGNATURES`, cf. `docs/VFX-CARTES.md`) |
| modifier la carte du monde, un bâtiment, une rencontre | `game/src/config/world.js` (placement) + `game/src/ui/overworld.js` (dessin) |
| mesurer l'équilibre | `scripts/matchups.mjs`, `simulate.mjs`, `check-decks.mjs`, `analyse-cartes.mjs` (ou `builder/balance.html`) |
| lancer un calcul depuis le téléphone, les renforts, l'IA locale | `builder/lancer.html` + `scripts/devserver.js` + `scripts/lib/` |
| ajouter une icône | déposer `Icons/<Nom>.png` (noms : `game/src/ui/icones.js`) |
| comprendre une décision de design | `docs/GDD.md`, `docs/V3-HEROS.md`, et la mémoire du projet |

## Taille d'équipe : jamais de solo, on ne mesure que les trios et plus
**Le joueur n'est jamais seul.** Une équipe fait au moins **3 héros** en partie ; un héros
seul (ou un duo) n'existe que dans le **tutoriel**, où le joueur apprend le jeu. Décision
du game designer (7 octobre 2026), qui vaut pour tout ce qui suit :

- **On ne teste, ne mesure et n'équilibre que des trios et plus.** Matrices, courbe de
  difficulté, analyses, mesures de fatigue : pas de solo ni de duo. Leurs résultats sont
  connus d'avance (en solo, 99 % des parties vont jusqu'à la pile de fatigue : 5 cartes par
  héros, c'est structurel) et ils ne disent rien de ce que vit un joueur.
- **Un chiffre solo ou duo ne justifie aucune modification de carte.** Un héros « faible
  seul » (Miracle, dont les effets « même type » veulent des coéquipiers) n'est pas un
  problème ; un héros « fort seul » non plus. Ce qui compte, c'est le héros **dans un trio**.
- **Conséquence pour le contenu : plus de héros, pas plus de cartes par héros.** Les
  seconds et troisièmes decks d'un archétype (un 2ᵉ chien, un 2ᵉ chat…) sont de nouveaux
  héros, pour des stratégies plus concentrées sans toucher à la règle des 5 + 5 cartes.
- **Dans les outils** : utiliser `--taille 3` (ou `--trio`) avec `matchups.mjs`, la puce
  **Trios** du builder, et des paliers à 3 héros ou plus pour `simulate.mjs`
  (`--paliers 3,3,3`). Les cases solo/duo restent dans le code, mais ne se lancent plus
  pour juger une carte. Les défauts actuels (`--taille` à 1 dans `matchups.mjs`, paliers
  1 → 3 dans `BALANCE.simulation`) **n'ont pas encore été alignés** sur cette règle.
- **« Injouable quand il part seul »** (règle `cout-solo` de `validate.js`) ne compte plus
  tant que la carte est jouable dans un trio : Neuf Vies et Minuit sont **ignorées** (cf.
  « Ignorer un constat »).


## Règle de travail
**Aucune valeur d'équilibrage en dehors de `game/src/config/`.** Le GDD dit que la
cadence de déblocage et les coûts sont pilotés par le game designer (l'utilisateur) :
tout ce qui se tune doit rester dans ces fichiers, commenté en français.
Après un changement d'équilibrage, faire tourner `node scripts/simulate.mjs` — il essaie
**toutes les combinaisons d'équipe** de la taille prévue par le palier, et c'est la
**pire** qui dit si une rencontre est un mur (la moyenne masquerait qu'une seule équipe
passe). Les paliers — combien de héros face à quelle rencontre, à quel niveau — sont du
game config : `BALANCE.simulation`. `--paliers 1,2,3` les surcharge le temps d'un essai,
`--csv f.csv` sort une ligne par combinaison.
Après un changement de **cartes**, faire tourner `node scripts/check-decks.mjs` (les
erreurs) et `node scripts/matchups.mjs` (l'équilibre entre decks) — voir « Outils ».
Après toute modification de `game/src/combat/`, faire tourner **les trois bancs** :
`node scripts/test-triggers.mjs` (769 tests ; ce qu'ils couvrent : `scripts/CLAUDE.md`), `node scripts/test-ai.mjs` (53 tests : le bot
valorise-t-il ces mécaniques) et `node scripts/simulate.mjs` (la courbe de difficulté).

Après toute modification de `game/src/combat/journal.js` (ou de ce qui enregistre un
combat), faire tourner `node scripts/test-journal.mjs` — il relit des combats enregistrés
ligne à ligne. Et `node scripts/test-partage.mjs`, qui vérifie en plus qu'aucune boucle de
partie n'applique un coup sans passer par `joue()`.

Après toute modification d'`engine.js` — surtout d'un point où il dit ce qui se passe —
(ou de `combat/evenements.js`), faire tourner aussi `node scripts/test-evenements.mjs` : il
vérifie que le récit en données ne change pas la partie et qu'il est complet (cf. « Le journal
graphique du combat »). Un nouvel effet qui change l'état d'une unité ou d'un héros doit
**émettre son événement** (`if (B.evts) evt(B, { t: '…', … })`) : sans lui, le journal du joueur
ment par omission, et ce banc le dit (les PV de fin ne se rejouent plus).

Après un changement de **cartes**, faire tourner aussi `node scripts/test-situations.mjs` :
les positions montées du banc de situations citent des cartes par identifiant, et une carte
renommée les fait jouer autre chose que ce qu'elles décrivent. Elles décrivent aussi le
**mana** du camp : une carte qui coûte plus cher rend une position injouable (« il y a un
choix à faire » échoue) — la fiche se corrige alors dans `game/data/situations.js` **et**
`docs/SITUATIONS-A-TESTER.md`. Et `node scripts/test-vfx.mjs` : chaque carte a **sa** signature
d'animation écrite dans `game/src/ui/vfx.js` (`SIGNATURES`, par identifiant) — une carte ajoutée
ou renommée le fait échouer tant qu'on ne lui en a pas écrit une (cf. `docs/VFX-CARTES.md`).

**Les cartes vivent sur le Pi.** Le game designer édite dans l'Atelier installé depuis le Pi,
donc « Appliquer au jeu » écrit `game/data/characters.data.js` **sur le Pi**, pas sur le PC.
Avant de modifier ce fichier ailleurs, vérifier que le Pi n'a pas d'écriture en attente
(`git status` là-bas) — sinon le `git pull` qui suivra entrera en conflit, ou on travaillera
sur de vieilles cartes. Après un commit poussé : `git pull` sur le Pi **et** sur chaque
renfort, sinon ils sont écartés des calculs (« pas le même code »). Le serveur du Pi n'a
besoin d'être relancé que si `scripts/devserver.js` ou ce qu'il importe a changé : les
outils, eux, partent dans un processus neuf à chaque calcul.

**Les fins de ligne sont mélangées, fichier par fichier** (une partie en CRLF, une partie en
LF). Un script qui réécrit un fichier du repo doit **garder les siennes** — normaliser en
`\n` pour chercher, remettre en CRLF avant d'écrire si le fichier l'était.
⚠ **La référence est la colonne `i/` de `git ls-files --eol`, pas `w/`** : `game/src/config/world.js`
et `game/index.html` sont en LF dans git mais en CRLF dans un dossier de travail (git ne le voit
pas tant qu'on n'y touche pas, grâce à son cache de dates). La première édition y réécrit alors
**tout le fichier** dans `git diff` : les remettre en LF avant de commiter.

Après toute modification de `game/src/config/courbes.js` (le modèle des courbes de
progression), faire tourner `node scripts/test-courbes.mjs` — il vérifie les six
promesses du modèle, dont deux qu'aucune relecture ne voit : qu'aucune ligne ne répète
la précédente sur tout l'horizon, et qu'un arrondi ne dérive pas sur 10 000 niveaux.

**Tout outil qui joue des parties se partage.** Un outil de mesure ne monte JAMAIS ses
propres workers : il découpe son travail en tâches et les donne à `enParallele()`
(`scripts/lib/pool.mjs`), avec un module `scripts/lib/taches-<nom>.mjs` qui expose
`prepare(contexte)` et `joue(tâche)`. C'est à cette condition qu'il tourne sur tous les
cœurs **et** sur ceux des renforts — et un renfort reconnaît le nouveau module tout seul
(la liste blanche, c'est le dossier). Deux contraintes à ne pas oublier : une tâche doit
être **indépendante** des autres, et son résultat doit voyager **en JSON** (ni `Map`, ni
`Set`, ni fonction — il traverse un `postMessage` puis le réseau). `node
scripts/test-partage.mjs` le vérifie : il échoue sur un `new Worker` hors du pool, sur un
outil qui joue des parties sans passer par la file, et sur un module de tâches qui rend
autre chose que du JSON.
