# scripts/ — serveur de dev, outils de mesure, bancs de test, générateurs

> Tout est du Node sans dépendance (`.mjs`) sauf `devserver.js` et les `.ps1`. Les briques partagées sont dans `lib/` (voir `lib/CLAUDE.md`).
> `devserver.js` fait ≈ 900 lignes et `test-triggers.mjs` ≈ 3 600 : **Grep**, ne les lis pas en entier.

## Le serveur
| Fichier | Rôle |
|---|---|
| `devserver.js` | **Le serveur** (le même sur le PC et sur le Pi, port 7330) : sert la racine du projet ; `POST /api/write` (le builder écrit `characters.data.js` et `docs/MECANIQUES-A-CODER.md`, avec photo automatique avant écrasement), `POST /api/sprites`, `/api/run*` (la file de calculs : pause/reprise/arrêt, analyse IA, dialogue), `/api/archives*` (calculs rangés), `/api/versions*` (versions du jeu), les routes push. Liste blanche des outils lançables : `OUTILS`. ⚠ écoute sur toutes les interfaces, sans mot de passe : ne jamais l'exposer à internet. |
| `sync-feuille.mjs` | **Le « patch » de la config** : lit la Google Sheet « Config Adventure-Cards » et écrit `game/data/feuille.data.js` (`--apercu` : dit ce qui changerait, n'écrit rien). **À lancer sur le Pi** (la clé du compte de service y est : `~/.adventure-card/google-sa.json`, hors dépôt). Onglets/colonnes/lignes en `~` ignorés. Même logique que `GET/POST /api/feuille`. |
| `renfort.mjs` | **Le renfort** (port 7331) : une machine qui joue une partie des cases d'un calcul du Pi. Voir `lib/CLAUDE.md`. |

## Les outils de mesure (tous passent par la file commune `lib/pool.mjs` : tous les cœurs **et** les renforts)
| Fichier | Rôle |
|---|---|
| `matchups.mjs` | Matrice deck contre deck (`--taille 3`/`--trio`, `--pnj`, `--adversaires`, `--archetypes`, `--mix`, `--fort`…). |
| `simulate.mjs` | **Courbe de difficulté** : toutes les équipes contre chaque rencontre du monde (`--paliers 3,3,3`). |
| `check-decks.mjs` | **Les erreurs** : règles de `config/validate.js` puis vraies parties (carte jamais jouée, moment jamais déclenché). |
| `analyse-cartes.mjs` | Ce que le bot a préféré, par carte, et pourquoi (écart contre le meilleur coup). |
| `audit-paliers.mjs` | Audit des paliers de niveau (aucune partie jouée) — voir `docs/GRAMMAIRE-DES-PALIERS.md`. |

## Les bancs de test (`node scripts/<nom>.mjs`)
| Banc | Ce qu'il garde | À lancer quand |
|---|---|---|
| `test-triggers.mjs` | **721 tests** du moteur : moments, auras, mécaniques, couture builder → moteur | tout changement de `game/src/combat/` ou du registre |
| `test-ai.mjs` | 50 : le bot valorise-t-il ces mécaniques | idem |
| `test-evenements.mjs` | ≈ 3 900 : le récit en données ne change pas la partie et est complet | tout changement d'`engine.js` |
| `test-partage.mjs` | 60 : les outils passent par la file commune ; une action passe par `joue()` | tout nouvel outil ou nouvelle boucle de partie |
| `test-journal.mjs` | ≈ 3 700 : le journal de décisions est relisible ⚠ **instable** (≈ 1 passage sur 3 échoue sur 2 vérifications aléatoires : un coup sur une carte *fabriquée*, un combat de plus de 400 lignes) | après `journal.js` |
| `test-situations.mjs` | 321 : chaque fiche de situation se monte | après un changement de **cartes** |
| `test-courbes.mjs` | 40 : les six promesses du modèle de courbes | après `config/courbes.js` |
| `test-vfx.mjs` | 2 936 : chaque carte des héros a **sa** signature de VFX (`ui/vfx.js`), toutes différentes, cohérentes avec ses moments (entrée, râle, tour, règle, attaque, aura), briques existantes et décrites, et **aucune qui ment** (traînée ⇔ Charge, fantôme ⇔ Passe-Murailles, venin ⇔ Venin, pièces ⇒ mana…). Aucune partie jouée. | après `ui/vfx.js`, et après avoir **ajouté ou renommé une carte** |
| `test-versions.mjs` | 44 : diff, restauration par entité, lecture des chiffres | après `lib/versions.mjs`, `diff-donnees.mjs`, `kpi.mjs` |
| `test-push.mjs` | l'exemple de la RFC 8291, au bit près | après `lib/push.mjs` |

## Les générateurs et outils ponctuels
| Fichier | Rôle |
|---|---|
| `gen-sprites.mjs` | Réécrit `game/data/sprites.js` (liste des images de `Characters/`, `Machines/`, `Ressources/`, `UI/`). **Doublé en C#** (`GenereSprites()` dans `launcher/Launcher.cs`) : les deux doivent produire le même fichier. |
| `gen-icones.ps1` | Décline `Icons/Icon.png` en icônes de l'Atelier (`builder/icons/`). |
| `gen-heros-v2.mjs` | Écrit les six héros V2 dans `characters.data.js` (⚠ écrase leurs retouches ; paliers dans `lib/heros-v2-paliers.mjs`). |
| `gen-heros-v3.mjs` | Écrit les **six héros V3** (`docs/V3-HEROS.md`) dans `characters.data.js` **et** déclare dans `customMechanics` les mécaniques pas encore codées, puis réécrit `docs/MECANIQUES-A-CODER.md` au format du builder (⚠ écrase leurs retouches ; paliers dans `lib/heros-v3-paliers.mjs`). À relancer **sur le Pi** si des cartes y sont en attente. |
| `dump-data.mjs` | One-shot historique : extraire les cartes codées en dur vers `characters.data.js`. |
| `build-exe.ps1` | Compile `launcher/Launcher.cs` en `AdventureCard.exe` (csc.exe de Windows). |
| `build-widget.ps1` | Construit l'APK du widget Android et le dépose dans `builder/telechargements/`. |

## Règles
- **Tout outil qui joue des parties se partage** (jamais de `new Worker` dans son coin) — voir « Règle de travail » du `CLAUDE.md` racine.
- Les scripts qui réécrivent un fichier du repo **gardent ses fins de ligne** (voir le `CLAUDE.md` racine).
- `--csv` et `--logs` sont refusés par le serveur (ils écriraient un fichier choisi par la page).

---

# Le détail

## Lancer un calcul (sur le Pi, depuis le téléphone)
`builder/lancer.html` lance les outils de `scripts/` **sur la machine qui sert la page**
— le Pi, en pratique — et n'affiche que leur sortie : c'est ce qui rend l'équilibrage
possible depuis un téléphone, dont le navigateur est bien trop lent pour `balance.html`.
C'est `/api/run` de `scripts/devserver.js`, et lui seul. **Il n'est pas doublé en C#** —
il lance des scripts Node, le réécrire n'aurait aucun sens : c'est `AdventureCard.exe` qui
lance `devserver.js` quand Node est là (cf. « Lancer le prototype »), et qui se rabat sur
son serveur intégré sinon — l'exe répond alors 404 et la page le dit.

- **Liste blanche** (`OUTILS`, dans le serveur, et son miroir dans la page) : simulate,
  matchups, check-decks, analyse-cartes et les bancs de test. Arguments courts, sans espace ;
  `--csv` et `--logs` sont refusés — ils écriraient sur le serveur un fichier choisi par
  la page.
- **Une file, un calcul à la fois.** On envoie une liste de calculs (`POST /api/run`,
  `{ lignes, data }`) — le même matchup du niveau 1 au 20, les trois tailles d'équipe,
  des outils différents — et ils passent l'un après l'autre, chacun dans son processus.
  Envoyer pendant que la file tourne met à la suite. La page les prépare : le
  **balayage** (niveau de … à … par pas de …, tailles d'équipe ; la config de trinket a
  sa place, grisée tant que les trinkets n'existent pas) et une liste « à lancer » pour
  enchaîner des outils. Chaque ligne garde sa sortie et un **résumé** (`resumeCalcul()`) :
  on la relit en la touchant (`GET /api/run/ligne?i=`), et « Copier le récapitulatif »
  met tous les résumés bout à bout.
- **Lancer depuis la ligne de commande** (une IA qui travaille sur le PC) : la même
  demande, puis `POST /api/versions/creer` et `POST /api/versions/lier` (`{ id, archive }`,
  l'archive se lit dans `GET /api/archives`) pour ranger les chiffres avec une version.
  ⚠ Envoyer le JSON **depuis un fichier écrit en UTF-8** (`curl --data-binary @f.json`) : un
  libellé accentué passé en argument par le terminal de Windows arrive abîmé
  (« h�ros ») et reste tel quel dans le calcul rangé.
- **Pause, reprise, arrêt** (`POST /api/run/pause`, `/reprendre`, `/stop` — aussi les
  boutons des notifications). Sur le Pi, la pause **fige** le processus (SIGSTOP : ses
  workers sont des fils du même processus, ils s'arrêtent avec lui) ; sous Windows, qui ne
  sait pas faire, elle laisse finir le calcul en cours et ne lance pas le suivant. Le
  temps affiché, et donc le « reste ~ », déduit les pauses.
- La page **interroge** le serveur (`GET /api/run?depuis=N` : la suite seulement) au lieu
  de garder une connexion ouverte : un téléphone qui se met en veille ne tue rien, on
  rouvre la page et la sortie reprend.
- **Le brouillon du builder part avec la demande.** Le serveur l'écrit dans un fichier
  temporaire, et les scripts le lisent à la place de `game/data/characters.data.js` grâce
  à `scripts/lib/brouillon.mjs` — un crochet de chargement (`node --import`, variable
  `ADVENTURE_BROUILLON`). **Aucun script n'a été modifié pour ça**, et les workers en
  héritent (ils reçoivent les options de Node). Les bancs de test, eux, lisent toujours
  le fichier : ils s'appuient sur des cartes précises.

⚠ Le serveur écoute sur **toutes les interfaces** — c'est ce qui sert le téléphone, en
Wi-Fi ou par Tailscale. Ne jamais l'exposer à internet : `/api/write` et `/api/run`
n'ont aucun mot de passe.


## Outils d'équilibrage
- `node scripts/check-decks.mjs [niveau] [parties]` — **les erreurs**. Deux passes : les
  règles du builder (via `game/src/config/validate.js`, partagé avec lui — une règle
  ajoutée là s'applique aux deux), puis de vraies parties pour trouver ce qui ne se produit
  jamais : carte qu'aucun mana ne peut payer, carte jamais posée, moment jamais déclenché.
  « Posée » se lit dans `B[camp].posees` (les noms des cartes **jouées**, tenus par
  `playCard`), **jamais dans la défausse** : meule, défausse volontaire, exil et main qui
  déborde y mettent ou en retirent des cartes que personne n'a jouées. C'est ce qui a révélé
  que « Métamorphose Ultime » n'est jamais jouée par le bot — un exemplaire débordait parfois de
  la main vers la défausse, et l'ancien contrôle y voyait une carte posée.
  Les constats ignorés (`CHARACTER_DATA.ignores`) s'affichent en gris et ne comptent pas.
  Les decks **base et switch** de chaque personnage y passent. Les paires se jouent
  **en parallèle**, sur les cœurs d'ici et ceux des renforts (`lib/taches-controle.mjs`).
- **`builder/balance.html`** — la même mesure **dans l'outil**, sur le brouillon en cours :
  on coche ce qu'on veut comparer (personnages base, switch, **mélange**, adversaires), le niveau, le
  nombre de parties et le bot, on lance, et la matrice se remplit case par case (la page
  rend la main entre deux cases, elle ne se fige pas). Deux lectures au choix, sans
  relancer la mesure : **par rapport aux cibles** (vert = sur une cible, donc un 33 %
  voulu vaut un 66 %) ou **par taux** (dégradé rouge → vert, la force brute : qui domine
  qui). La première juge l'équilibrage, la seconde se lit d'un coup d'œil.
- `node scripts/matchups.mjs [parties] [niveau]` — la même chose en ligne de commande,
  moitié des parties en commençant (l'avantage du premier tour est réel et mesuré).
  `--pnj` ajoute les adversaires à la matrice, `--mix` mélange base et switch, `--switch`
  ne prend que les switch.

  **Le mode « mélange » est celui qui ressemble au vrai jeu** : en partie, chaque slot est
  soit sa carte de base soit sa carte switch, donc « tout base » et « tout switch » ne sont
  que 2 decks sur les 32 montables par personnage. `campMelange()` rend une **fabrique** et
  non un camp : le tirage est refait à chaque partie, et le taux obtenu est la moyenne sur
  tous les decks possibles. `duel()` accepte indifféremment un camp ou une fabrique.
  Cible du designer : ~66 % quand on a le matchup, ~33 % quand on ne l'a pas, ~50 % sinon ;
  chaque case est rangée par rapport à ces cibles. Le ± affiché est l'intervalle de Wilson
  à 95 % — **ne jamais corriger un écart plus petit que lui**, c'est du bruit.
  `--taille 3` (ou `--trio`) pour toutes les équipes de 3 héros — **la seule taille qu'on
  mesure** (cf. « Taille d'équipe : jamais de solo »), `--taille 1` / `--taille 2` n'existent
  que pour le débogage,
  `--adversaires` pour ne jouer que **les équipes contre les adversaires** (équipes en
  lignes, PNJ en colonnes, ni équipe contre équipe ni PNJ contre PNJ — la ligne « Trio vs
  Adversaires - niv 4 » d'une file), `--archetypes` pour **type contre type** (chaque
  équipe aligne les deux héros d'un type — `dog` + `dog2`, le type étant l'id sans son
  chiffre final — et un troisième tiré au sort à chaque partie hors de ce type : le taux
  est la moyenne sur tous les coéquipiers possibles), `--bots` pour comparer les niveaux
  de bot entre eux,
  `--pair a,b --fort` pour rejuger un matchup suspect avec la référence Monte-Carlo.
- Ce que la matrice mesure vraiment : des decks **tels que le bot les joue**. Un deck que le
  bot ne sait pas piloter paraît faible. D'où `--fort` : si l'écart s'efface avec une
  meilleure référence, le problème était le bot, pas les cartes.
- **Exporter** : la page d'équilibrage sort la matrice en **CSV** (une ligne par matchup,
  point-virgule, virgule décimale — Excel français l'ouvre tel quel) et les **journaux**
  d'une partie témoin par matchup. En ligne de commande : `--csv fichier.csv` et
  `--logs fichier.txt`. L'écran de combat du jeu a aussi un bouton « ⬇ journal ».
  Un taux ne dit jamais *pourquoi* : c'est le journal qui le dit.
- `node scripts/analyse-cartes.mjs [parties] [niveau]` — **ce que le bot a préféré, et
  pourquoi**. Un taux de victoire dit qu'un deck gagne ; il ne dit jamais quelle carte a
  fait le travail ni laquelle est restée en main. L'outil écoute les décisions et sort,
  par carte : combien de fois elle était **jouable**, combien de fois **jouée**, et
  l'**écart** — combien de points de victoire elle perd, en moyenne, face au meilleur coup
  du moment (0 = elle valait le meilleur). Puis « cartes boudées » avec, pour chacune, **ce
  qu'il lui a préféré** et combien de fois.

  ⚠ Le chiffre à lire est l'**écart**, pas le taux brut d'un coup : celui-ci dit surtout si
  la position était gagnante, donc une bonne carte dans une partie perdue afficherait 0 %.
  Un écart nul avec zéro partie jouée n'est pas une contradiction — à égalité le bot garde
  le premier coup de sa liste, c'est l'ordre de la main qui tranche.

  La colonne **valeur** est le deuxième avis : ce qu'en pense `cardValue()`. Le Monte-Carlo
  cherche, la fonction de valeur suppose ; quand ils divergent nettement, l'outil le dit —
  et c'est `ai.js` qu'il faut relire, pas la carte.
  Les parties étant indépendantes, elles passent par la **file commune**
  (`lib/taches-analyse.mjs`) : tous les cœurs d'ici **et ceux des renforts**. Une tâche
  est une partie tant que ça reste raisonnable — le grain le plus fin, donc le mieux
  réparti entre des machines inégales. Chaque tâche dépouille sa part et rend des
  **compteurs**, et le total n'est qu'une somme : le résultat est le même qu'en un seul
  fil, au hasard des tirages près.
  `--rollouts 30` affine l'écart (10 rollouts ne le mesurent qu'à 10 points près),
  `--persos`, `--pnj`, `--niv`, `--switch` choisissent le matchup, `--logs f.txt` écrit
  chaque décision (« T4 Médor — joue Meute 62 % devant : Retrouvailles 55 %, — passer — 41 % »).
- **Tous les cœurs, partout.** `matchups`, `simulate`, `analyse-cartes` et `check-decks`
  jouent leurs cases en parallèle : `scripts/lib/pool.mjs`, une **file de travail** comme
  `builder/balance-worker.js` (chaque worker redemande une tâche dès qu'il a fini). Une
  tâche est une case ou une combinaison décrite par une **recette**, que le worker
  remonte lui-même (`lib/taches-matchups.mjs`, `-courbe`, `-analyse`, `-controle`) : un deck
  mélange est une fonction, il ne traverse pas un `postMessage`. Les résultats
  reviennent **dans l'ordre** : l'affichage n'a pas changé. `--jobs N` règle le nombre de
  workers (défaut : un par cœur), `--jobs 1` rejoue sans worker, pour déboguer. Mesuré
  sur le PC avec 3 workers (les cœurs du Pi, moins un) : matrice 400 parties/case en
  mélange 20 s → 8 s, courbe à 40 parties 16 s → 7 s.
- `node scripts/test-partage.mjs` — **le banc du partage** : chaque outil passe-t-il par
  la file de tâches commune ? Un outil qui joue dans son coin n'utilise ni les cœurs des
  renforts ni la file, et rien ne le dit — le calcul marche, il est juste trois fois trop
  lent. C'est arrivé à `analyse-cartes`, qui montait ses propres workers pendant que les
  PC regardaient.
- **La progression** passe par `scripts/lib/progression.mjs` : une ligne réécrite en
  terminal ; lancé par le serveur (variable `ADVENTURE_PROGRESSION`), des
  lignes-marqueurs `@@progression 12/351` que `/api/run` retire de la sortie et rend en
  chiffres — la barre de « Lancer un calcul », le pourcentage de l'Atelier. Un outil qui
  n'en émet pas reste simplement « en cours ».
- `game/src/tools/arene.js` — le socle commun (monter un camp, jouer une partie, une série,
  Wilson, les cibles 33/50/66). Il vit dans `game/` et pas dans `scripts/` **parce que la
  page du builder l'importe aussi** : une seule implémentation, donc les mêmes chiffres en
  ligne de commande et dans l'outil. Tout nouvel outil de mesure passe par là.


## Ce que couvre `test-triggers.mjs`

721 tests : Ex-libris et la pile de fatigue par camp (tous les chemins d'arrivée en défausse, une seule fois par carte, exil / Reprise / Impératrice sans effet, Annotation sur ma pile seulement, Index, Appât sur la pile adverse, niveau à l'entrée, validation), la Toxine (marqueur, tic avant la pioche, Bouclier, saut à la mort, lot de morts, copie/switch, vol, Contagion, Épidémie, statiques), le Pistage (marque, taxe, punition avant les effets, la marque qui quitte la main, statique de pioche, règle `pistage-sans-piste`), Charogne et Appât (les X dernières de la défausse adverse, exil, mots-clés transmissibles, un renfort, l'appât au-dessus), le vocabulaire V3 déclaré (inerte, « un seul sort » de `reduit_le_cout_de`, aura à deux mots-clés), la Reprise (exil avant les effets, coût et puissance selon la zone, événements, paliers, validation), main sans plafond, exil, meule et défausse, fatigue et carte concernée, bonus de la caractéristique variable, `t` laissé par le builder, cartes jouées comptées par le moteur, carte Miroir (reflet, arrivée vierge, boucle fermée sans plafond), choix à trois branches, « la carte de Lui », râles, auras, déclencheurs de tour, paliers qui
débloquent un moment, couture builder → moteur, mana différé, mots-clés à paramètre, capacités
des jetons, cible « Lui », cibles par type, caractéristiques variables, montants variables, événements, pioche ciblée, Élusif/Passe-Murailles, réduction de coût, destruction, coût variable, effets statiques, compteurs de sorts, fin de pioche, pile de fatigue, création de carte (précise et au hasard), déplacements de zone (mélange, renvoi, pose), leur renfort et celui des cartes sur place, prise du dessus, complétion par la fatigue, événement de renfort, filtre « une carte précise », niveau du propriétaire, plafond de tours, types multiples, « Type : tous » (posé, offert, reçu d'une aura), copie, cibles sans camp, « chez qui » qui suit la cible ou tire au sort, prise de contrôle, choix entre deux effets, chaîne par type, type lu sur une carte, palier « Choisit les deux », deux cibles désignées, switch, sujet d'un événement, cibler depuis une branche, règles de validation qui lisent le registre, garde d'un moment
