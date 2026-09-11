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

**Les images disponibles** (le portrait d'un héros, d'un PNJ ou d'une carte) viennent de
`game/data/sprites.js`, la liste des fichiers de `Characters/`, `Machines/`, `Ressources/`
et `UI/`. Un navigateur ne sait pas lire un dossier : c'est le serveur qui les rebalaye,
sur `POST /api/sprites` — le bouton **🔄 Actualiser les images** de la fenêtre « Choisir un
sprite ». À faire après avoir déposé une image ; en ligne de commande, c'est le même
balayage avec `node scripts/gen-sprites.mjs`. La liste revient dans la réponse et remplace
celle qu'a la page : l'import de module, lui, est figé au chargement, comme
`CHARACTER_DATA`. Le balayage est écrit **deux fois** (`scripts/gen-sprites.mjs` pour le
serveur de dev, `GenereSprites()` dans `launcher/Launcher.cs` pour l'exe) : les deux
doivent produire le même fichier — même tri (ordinal, comme le `.sort()` de JavaScript),
même mise en forme, mêmes fins de ligne.

`builder/balance.html` — l'équilibrage, deux mesures qui répondent à deux questions
différentes. **La matrice** deck contre deck, jouée dans le navigateur (bot contre bot),
avec les cibles 33 / 50 / 66 et l'intervalle de confiance : « ce deck est-il plus fort que
celui-là ? ». Un deck n'est pas forcément un héros : les puces **Solos / Duos / Trios** montent
**toutes les équipes** de cette taille et les font s'affronter. Ce sont des
**combinaisons**, pas des arrangements — Médor&Felix et Felix&Médor donnent le même
paquet de cartes — donc six héros font 6 solos, **15** duos et **20** trios, soit 41
decks. L'en-tête du panneau annonce le coût (decks, cases, parties) avant qu'on lance.
Mesuré : 493 cases à 10 parties, bot `normal`, **7 s** sur 16 cœurs.

⚠ **Elle ne joue que les matchups qui peuvent vraiment se produire en partie**, et c'est
`possible()` qui tranche. Sans ce filtre elle jouait toutes les paires, donc aussi un duo
contre un solo ou un trio contre un duo, et la lecture annonçait « A&B écrase C » d'une
situation impossible — un bruit qui noie les vrais déséquilibres. Trois règles :

- **héros contre héros : même taille d'équipe** (1v1, 2v2, 3v3) ;
- **héros contre adversaire : la taille que le palier prescrit** pour cet adversaire.
  Ce sont **les mêmes paliers que la courbe de difficulté**, édités dans son panneau —
  d'où leur déclaration remontée tout en haut des réglages de la page. Les changer change
  donc les cases de la matrice, et le coût annoncé se recalcule à la frappe ;
- **adversaire contre adversaire : jamais.** Deux PNJ ne se rencontrent pas — cocher
  « Adversaires » tout seul ne mesure donc plus rien.

Une case interdite n'est **pas cachée** (ça, ce sont les puces « Afficher ») : elle n'est
**pas jouée**. Le tableau affiche « — », rien ne la compte dans la lecture, et un deck
qui n'a aucun adversaire possible est retiré de la liste plutôt qu'affiché en croix de
tirets. Les 41 decks ci-dessus font ainsi **351** cases entre eux au lieu de 1681.

**Deux réglages qu'il ne faut pas confondre**, et c'est pour ça qu'ils sont à deux
endroits différents. Les puces de la **barre du haut** (base/switch/mélange, Adversaires,
Solos/Duos/Trios) décident ce qui est **calculé** — les changer veut dire relancer. Les
puces **« Afficher »**, dans le panneau de la matrice, ne font que cacher des lignes et
des colonnes d'un tableau déjà obtenu : le redessin est instantané, rien n'est perdu, il
suffit de rallumer. Elles n'apparaissent que pour les familles réellement mesurées.

⚠ **On ne joue que le triangle.** `serie()` joue déjà la moitié des parties dans chaque
sens, donc « A contre B » et « B contre A » mesurent exactement la même chose : la
seconde n'apprend rien. La moitié sous la diagonale est **déduite** (`avecReflets`,
`taux = 1 - taux`, ce qui est exact) et **affichée comme telle** — pâlie, penchée, avec
une infobulle qui dit « case non jouée ». Le CSV, lui, ne contient que les cases
réellement mesurées, et la lecture (matchups sur cible, écrasants) compte chaque matchup
**une** fois au lieu de deux.

⚠ **La « force globale », elle, lit les reflets** — c'est la seule chose qui les lise.
Les mesures ne couvrent que le triangle : un deck n'y est `a` que face aux decks rangés
**après** lui, si bien que le dernier de la liste n'aurait aucun matchup et vaudrait 50 %
par défaut. Un reflet étant exact, la moyenne reste juste.

**La courbe de difficulté** : « le joueur passe-t-il ? » — toutes les
combinaisons d'équipe contre chaque adversaire, et c'est la **pire** qui dit si une
rencontre est un mur (une moyenne masquerait qu'une seule équipe passe). Ses **paliers**
(les N prochains adversaires se jouent à H héros au niveau L) s'éditent **dans la page**,
se gardent avec les autres réglages, et partent des valeurs de `BALANCE.simulation`.
Elle mesure le **brouillon** du builder quand il existe : on change une carte, on relance,
on lit tout de suite ce que ça donne.

`builder/overview.html` — la vue d'ensemble : toutes les cartes de tous les personnages,
plus (au choix) les **cartes libres** et les **decks des adversaires**, chacun avec sa
courbe de mana et ses cartes résolues à SON niveau,
résolues au niveau choisi (curseur), avec leurs paliers et le rapport points/mana. Elle lit
les données en direct, ne les écrit jamais, et sert à équilibrer. Son bouton
**⬇ Exporter JSON** sort toutes les cartes **résolues au niveau du curseur**, avec pour
chacune ce qu'elle **dit** (les effets écrits en clair par `describeEffect`) *et* ce
qu'elle **est** (les structures brutes) : le fichier de données seul ne donne que la
seconde moitié, illisible sans le registre. C'est le format à donner à relire — à
quelqu'un, ou à une IA.

⚠ **Piège d'import** : `CHARACTER_DATA` est un import de module, donc figé au chargement
de la page. Quand « Appliquer au jeu » réécrit le fichier, une page déjà ouverte garderait
l'ancienne version *sans le dire* — on croit alors qu'une carte modifiée ne change rien.
`relit()` **re-importe** donc le fichier avec une URL unique (`?t=` + horodatage), à
l'ouverture, à chaque message du builder, avant chaque mesure, et sur le bouton 🔄. Le badge
affiche l'heure de lecture : si elle est vieille, c'est qu'on regarde de vieilles cartes.

Les deux pages se synchronisent par `localStorage` + l'événement `storage`, qui ne se
déclenche que dans les **autres** fenêtres — c'est ce qui les fait vivre ensemble sur deux
écrans, sans serveur ni dépendance. La vue d'ensemble affiche le brouillon du builder tant
qu'il existe (badge orange), le fichier du jeu sinon (badge vert), et se recharge toute seule
quand « Appliquer au jeu » efface le brouillon. La clé `adventureCardBuilder.focus` porte
« ouvre cette carte » dans les deux sens : la carte sélectionnée dans le builder est surlignée
dans la vue, et cliquer une carte de la vue l'ouvre dans le builder. Un moment, un mot-clé ou
une cible ajoutés au registre y apparaissent tout seuls (elle passe par `TRIGGERS`,
`describeEffect` et `describeAura` de `config/mechanics.js`).

⚠ Un onglet du builder **ouvert avant** qu'une mécanique soit codée re-applique son état
d'origine quand on clique « Appliquer au jeu » : `customMechanics` se remplit à nouveau et
le fichier de données perd les corrections faites entre-temps. Recharger l'onglet (F5) avant
d'appliquer. Le moteur, lui, ne se laisse plus abuser : une mécanique inventée qui existe
pour de vrai dans `EFFECTS`/`KEYWORDS` est ignorée à la fusion (`dejaCodee`), sinon sa
version « à coder » écraserait la vraie et la carte ne ferait plus rien.

**Quand l'utilisateur demande de coder une mécanique, lire d'abord `docs/MECANIQUES-A-CODER.md`.**
Le fichier dit ce qu'elle doit faire, quelles cartes l'utilisent et où l'implémenter. Une fois codée :
l'ajouter à `EFFECTS`/`KEYWORDS` dans `game/src/config/mechanics.js` et retirer son entrée de
`customMechanics` dans les données.

## Lancer un calcul (sur le Pi, depuis le téléphone)
`builder/lancer.html` lance les outils de `scripts/` **sur la machine qui sert la page**
— le Pi, en pratique — et n'affiche que leur sortie : c'est ce qui rend l'équilibrage
possible depuis un téléphone, dont le navigateur est bien trop lent pour `balance.html`.
C'est `/api/run` de `scripts/devserver.js`, et lui seul : `launcher/Launcher.cs` ne l'a
**pas** (l'exe répond 404 et la page le dit). Contrairement à `/api/write`, il n'y a pas à
le doubler — sur le PC, on a les scripts en ligne de commande.

- **Liste blanche** (`OUTILS`, dans le serveur, et son miroir dans la page) : simulate,
  matchups, check-decks, analyse-cartes et les deux bancs. Arguments courts, sans espace ;
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

## L'Atelier : les outils en une app
`builder/accueil.html` réunit toutes les pages derrière des tuiles (builder, lancer un
calcul, vue d'ensemble, équilibrage, mécaniques à coder, jeu), avec l'état du moment :
un brouillon est-il en cours dans ce navigateur, où en est le dernier calcul du serveur.
`builder/manifest.webmanifest` en fait une **PWA installable** (« Atelier », portée `/` :
le jeu s'ouvre dans la même fenêtre). Toutes les pages du builder pointent vers ce
manifeste, donc on installe depuis n'importe laquelle. Les icônes (`builder/icons/`) sont
le dé de `UI/`, agrandi au plus proche voisin.

⚠ **Un navigateur n'installe qu'en HTTPS** (ou sur localhost). Sur le Pi, c'est
`tailscale serve --bg 7330` qui le donne : une adresse `https://<machine>.<tailnet>.ts.net`
avec un vrai certificat, que **seuls les appareils du tailnet** peuvent joindre. Surtout
pas Funnel, qui l'ouvrirait à internet. Le seul service worker, `builder/sw.js`, ne sert
qu'aux notifications : rien n'est mis en cache, le builder relit toujours des données
fraîches.

## Les notifications (un calcul avance, un calcul est fini)
Le serveur du Pi prévient le téléphone, **Atelier ouvert ou non** : « lancé », puis un
pourcentage à chaque dixième franchi (au plus une fois toutes les 20 s, sans sonner),
puis la fin — qui sonne, avec deux chiffres lus dans la sortie par `resumeCalcul()`
(`scripts/devserver.js` : matchups sur cible et écrasants, murs et combats offerts ; à
défaut la dernière ligne). Elles portent toutes le même tag : chacune remplace la
précédente au lieu de s'empiler. Toucher la notification ouvre « Lancer un calcul ».

Pour une **file**, la progression est celle de la file entière (« Trio vs Adversaires -
niv 4 · 25 % · calcul 4/20 »), et un point part aussi à chaque calcul fini. Les
notifications portent des **boutons** (deux au plus sur Android) : **Pause / Arrêter**
pendant, **Reprendre / Arrêter** en pause, **Analyser les résultats** à la fin — c'est
`builder/sw.js` qui les renvoie sur `/api/run/<action>` sans ouvrir l'app. Une app web ne
peut pas poser de **widget** sur l'écran d'accueil d'Android : cette notification en
tient lieu, et un vrai widget demandera une petite app native qui interroge le Pi.

C'est du **Web Push standard, sans dépendance** : `scripts/lib/push.mjs` chiffre le
message (RFC 8291) et signe un jeton VAPID (RFC 8292) avec `node:crypto`, puis le confie
au service push du navigateur (celui de Google, pour Chrome). `builder/sw.js` le reçoit
et l'affiche. On s'abonne sur l'accueil de l'Atelier (🔔 Activer, Tester, Couper), en
HTTPS seulement. `node scripts/test-push.mjs` rejoue l'exemple de la RFC **au bit près** :
un seul octet faux, et le téléphone jette le message sans rien dire.

⚠ **Les clés VAPID et les abonnements ne sont pas dans le repo** (il est public) : ils
vivent dans `~/.adventure-card/push.json` sur la machine du serveur, créé au premier
besoin. L'effacer invalide tous les abonnements ; l'accueil le détecte et repropose de
s'abonner. Une notification qui échoue ne gêne jamais le calcul : le serveur le note
dans son journal (`journalctl -u adventure-card` sur le Pi).

## L'analyse par une IA locale (Ollama)
« 🧠 Analyser les résultats » (page « Lancer un calcul », et le bouton de la notification
de fin, qui l'ouvre sur `#resultats`) donne le **récapitulatif de la dernière file** à un
modèle de langage qui tourne **à la maison** — aucun jeton payé, rien ne sort du tailnet.
Il rend trois parties : ce qui ressort, ce qui cloche, ce qu'il faut regarder ensuite. Il
ne décide rien : il lit plus vite que nous une pile de chiffres et montre du doigt.

- **Les machines, dans l'ordre** (`scripts/lib/ia.mjs`) : les PC à carte graphique
  d'abord, la machine du serveur (le Pi) en dernier recours. À chaque analyse on les
  **sonde** (`/api/tags` : répond-elle, a-t-elle le modèle ?) et la première prête fait
  le travail — un PC éteint est simplement sauté. La liste s'édite dans la page (« Machines
  d'analyse ») et vit dans `~/.adventure-card/ia.json` sur le serveur, **jamais dans le
  repo**. Par défaut : Ollama sur la machine du serveur, `qwen3.5:4b`.
- **`think: false`** : les modèles récents « réfléchissent à voix haute ». Mesuré sur le Pi
  (`qwen3.5:4b`, 3,5 jetons/s) : 1 286 jetons et 6 min pour une réponse de deux phrases,
  presque tout en réflexion. On la coupe.
- **Mesuré sur le PC** (RTX 3060 12 Go, `qwen3.5:9b`) : **15 à 20 s** par analyse, 43 à
  51 jetons/s, avec ou sans extraits. C'est lui qu'il faut en tête de liste.
- ⚠ **Un petit modèle lit mal ce qu'on ne lui répète pas.** Sans consigne précise, il
  lisait une hausse des taux comme des adversaires « plus résistants » (les taux sont ceux
  des héros), « niv N » comme le niveau des adversaires (c'est celui des héros), et
  proposait des tests avec des joueurs humains. La consigne dit le sens de chaque chiffre
  et ne permet que des suites faisables avec nos outils, et `demande()` rappelle le sens
  de « niv » **juste à côté des données**. Toute nouvelle sorte de ligne dans une file
  mérite sa phrase dans `CONSIGNE`.
- **Ce qu'on envoie dépend de la machine** : un PC reçoit les résumés **et des extraits
  des sorties** (le début, où est la matrice, et la fin, où sont les lectures ; 16 000 caractères au
  plus, **partagés entre les lignes** : une file courte part entière — avant, 2 500
  caractères de la fin par ligne, et l'IA ne pouvait citer aucune case ; le reste du
  contexte de 16 k est pour la réflexion) ;
  la machine du serveur ne reçoit que les résumés — sur le Pi, lire 3 000 jetons prendrait
  déjà des minutes. Et elle est **sautée tant qu'une file tourne** : elle garderait ses
  cœurs pour les calculs.
- **La consigne** (`CONSIGNE`) explique au modèle comment lire nos chiffres — les cibles
  33/50/66, l'écrasant, le bruit sous le ±, les murs et combats offerts — sinon il
  commente un 66 % comme un déséquilibre alors que c'est la cible.
- L'analyse tourne **à côté de la file** et vit dans `lot.analyse` (`POST
  /api/run/analyse`) ; une notification « Analyse prête » part à la fin.
- **Le modèle, mesuré** (même lot de test, réponses notées contre les vrais chiffres) :
  `qwen3.6:35b-a3b` **avec réflexion** est le seul sans erreur de fait sur trois essais
  (2 à 3 min sur le PC) ; `qwen3.5:9b` va vite (15-30 s) mais se trompe d'un essai à
  l'autre ; la réflexion n'aide pas le 9b (3 min, et il se trompe quand même) ;
  `nemotron-3.5-lightning` invente des chiffres. Le 35b est un **MoE** (3 milliards de
  paramètres actifs sur 35) : 23 Go, il déborde des 12 Go de la carte sur la mémoire vive
  et tient quand même ~30 jetons/s. La réflexion se règle **par machine** (la case 🤔,
  champ `reflexion` de `ia.json`).
- ⚠ **Le modèle ne sait rien du jeu qu'on ne lui dit pas.** La demande porte donc la liste
  des adversaires dans l'ordre du monde, avec le niveau où on les atteint et le palier où
  on les joue (`contexteDuJeu()`, lu dans `world.js` et `BALANCE.simulation`, même
  découpage que `simulate.mjs`) : sans elle, tous les modèles lisaient le Grand-Duc (boss
  du niveau 11) à 0 % pour des héros de niveau 5 comme un mur à corriger. Et quand seuls
  les résumés partent, la demande le dit — sinon il affirme qu'un adversaire « n'a pas été
  joué » au lieu d'avouer qu'il n'a pas sa colonne.
- **Le dialogue** : sous l'analyse, on lui **répond** — contester un chiffre, demander
  pourquoi (`POST /api/run/question`, `{ texte }`). La conversation entière (données
  comprises) reste sur le serveur (`lot.conversation`, jamais renvoyée à la page) et repart
  à chaque question, avec une consigne de relecture (`RELANCE`) : Ollama ne garde rien
  d'un appel à l'autre, et c'est ce qui permet à une autre machine de reprendre si la
  première s'est endormie. Une question à la fois, dix au plus.
- ⚠ **Une analyse finie ne se remplace que sur demande explicite** (`POST /api/run/analyse`
  avec `{ nouvelle: true }`, ce qu'envoie « Analyser à nouveau », après confirmation s'il y
  a une conversation). Sans ça, un appui de trop effaçait l'analyse et le dialogue — une
  question en attente de réponse s'est perdue ainsi. Et l'ouverture sur `#resultats`
  (notification, widget) lance bien l'analyse d'une file finie qui n'en a pas encore :
  `interroge()` rendait la main avant d'avoir l'état, et elle ne partait jamais.
- ⚠ **Un portable qui dort n'analyse rien.** mon-mien (Windows, « veille moderne ») reste
  joignable une dizaine de minutes après s'être endormi, puis Windows coupe le réseau ; et
  une réponse en cours au moment où il s'endort est coupée net. Pour qu'il serve de
  machine de calcul : ne jamais dormir sur secteur (`powercfg /change standby-timeout-ac 0`,
  et rabattre l'écran = ne rien faire).
- **Ouvrir un PC au Pi** : Ollama n'écoute que sur la machine elle-même par défaut. Sur
  le PC : `OLLAMA_HOST=0.0.0.0:11434` (variable d'environnement de l'utilisateur, puis
  relancer Ollama) **et** une règle de pare-feu entrante TCP 11434 limitée à
  `100.64.0.0/10` (les adresses Tailscale). Ollama n'a pas de mot de passe : sans cette
  limite, tout le Wi-Fi de la maison y aurait accès.

## Le widget Android
`android/` est une **toute petite app Android native** — le seul morceau du projet qui
n'est pas du web : une app web ne peut pas poser de widget sur l'écran d'accueil. Elle
reproduit les maquettes `mockups/iPhone 17 - 1.png` et `- 2.png` : titre, barre de la
file entière (rouge pendant, verte à la fin), boutons ■ et ❚❚ / ▶, cinq lignes centrées
sur celle qui tourne (en jaune), « Analyser les résultats » à la fin.

- **En Java, sans aucune bibliothèque** (pas d'AndroidX, `android.useAndroidX=false`) :
  `RemoteViews`, `AlarmManager`, `HttpURLConnection` et `org.json` du framework suffisent,
  et l'APK fait quelques dizaines de Ko. Trois classes : `WidgetFile` (le widget),
  `Pi` (les requêtes), `ReglagesActivity` (l'adresse du Pi).
- **Rien de nouveau côté serveur** : il lit `GET /api/run` et envoie `POST
  /api/run/pause|reprendre|stop`, exactement comme la page et les notifications.
- **La cadence** : Android ne réveille un widget de lui-même que toutes les 30 min. Tant
  qu'une file tourne, `WidgetFile.planifie()` le redemande toutes les ~45 s (réveil
  inexact : Android peut le retarder quand le téléphone dort) et s'arrête à la fin de la
  file. Toucher le pied du widget l'actualise ; un bouton actualise après sa commande.
- **Quand le Pi ne répond pas, le widget garde ce qu'il savait.** Téléphone verrouillé,
  Android coupe le réseau aux apps (Doze), et au réveil Tailscale met quelques secondes à
  revenir : une requête à ce moment-là finit en « nom introuvable », qui ne dit rien de la
  file. `WidgetFile.garde()` affiche donc le **dernier état lu** (mémorisé par `Pi`) avec
  un avertissement orange dans le pied, et retente à 1, 2, 5 puis 15 min — au-delà, la
  mise à jour des 30 min prend le relais. Quand le réseau est bloqué par la veille
  (`reseauDisponible()`), il **essaie quand même** : la 1.1 renonçait d'avance, or Android
  dit aussi « pas de réseau » à une app qu'il range parmi les restreintes en arrière-plan
  (on n'ouvre jamais celle-ci) — le widget ne se connectait plus jamais. Cet avis ne sert
  plus qu'à formuler l'erreur. Le bouton « Tester » de l'app fait la même requête au
  premier plan : s'il répond et que le widget non, c'est ça. L'écran « Pi injoignable » n'apparaît plus
  que s'il n'a jamais rien lu.
- **Versions** : `versionCode` (`android/app/build.gradle`) monte à chaque APK publiée —
  Android refuse une mise à jour dont le numéro recule.
- **L'adresse** (`https://….ts.net`, par Tailscale) se règle sans rien taper : le bouton
  « Régler le widget » de l'accueil de l'Atelier (sur Android seulement) ouvre l'app avec
  `atelier://config?url=<son adresse>`. Elle n'est **jamais écrite dans le repo** (public).
- **S'installe sans Play Store ni mode développeur** : l'accueil de l'Atelier (sur
  Android) propose « 1. Télécharger l'app » — `builder/telechargements/widget-atelier.apk`,
  servi par le Pi avec le type `application/vnd.android.package-archive` (sans lui,
  Android garde un fichier quelconque) — puis « 2. Régler le widget ». Android demande
  seulement d'autoriser Chrome à installer une app, et Play Protect prévient qu'elle est
  inconnue. C'est le **seul `.apk` versionné** (exception dans `.gitignore`) : c'est lui
  que le Pi sert au téléphone.
- **Construire** : `powershell -ExecutionPolicy Bypass -File scripts\build-widget.ps1`
  construit et dépose l'APK au bon endroit ; puis commit, push, `git pull` sur le Pi.
  ⚠ Il est signé avec la **clé de débogage de ce PC** (`~/.android/debug.keystore`) : une
  mise à jour ne s'installe par-dessus que si elle porte la même signature, donc une
  construction depuis une autre machine obligerait à désinstaller l'app d'abord. À la main :
  `android\gradlew.bat -p android assembleDebug` (le JDK 17 d'Android
  Studio, via `JAVA_HOME`) → `android/app/build/outputs/apk/debug/app-debug.apk`. Le
  plugin Android est déclaré par `buildscript { classpath … }` et non par
  `plugins { id … version }` : la seconde forme cherche un marqueur de plugin absent du
  cache, et c'est ce qui permet de construire **hors ligne**. Les sorties de Gradle et
  les `.apk` sont dans `.gitignore`.

## L'ordre des effets, dans le builder
L'ordre d'une liste d'effets **compte** — « Lui » et « Les autres unités du même type que
Lui » regardent l'effet juste au-dessus — et il n'était modifiable qu'en supprimant tout
pour recommencer. Chaque ligne porte donc **↑ ↓**, grisées aux extrémités. C'est
`effectList()` qui fait l'échange (elle seule sait où est la ligne) et `effectRow` qui
affiche les boutons quand on lui passe un `deplacer` : les moments d'une carte, ceux d'un
jeton et les deux branches d'un « Choisir » en héritent d'un coup.

## Déplacer les cartes dans le builder
Une vignette de carte se **glisse** : sur un autre slot (les deux cartes s'échangent, y
compris entre base et switch), ou sur une **ligne de personnage** dans la liste de gauche —
c'est la seule cible qui existe toujours, les slots des autres héros n'étant pas à l'écran.
Elle part alors dans son premier slot libre, et « Cartes libres » accepte tout.

Lâchée sur un **adversaire**, la carte n'est pas déplacée : le deck d'un PNJ ne possède
pas ses cartes, il les **désigne par identifiant** dans le catalogue. Le dépôt ajoute donc
une ligne de deck (ou un exemplaire de plus si elle y est déjà) et la carte reste chez son
propriétaire. Une carte sans identifiant est refusée avec un message : rien ne pourrait la
retrouver. Le bouton
**Dupliquer** copie la carte dans le premier slot libre du même personnage, ou dans les
cartes libres s'il est plein — et le dit.

## Cartes libres et adversaires
Une carte n'est plus forcément dans le deck d'un personnage. `CHARACTER_DATA.library`
tient les **cartes libres** : des cartes sans deck, éditées dans le builder comme un
personnage de plus (fictif, sans statistiques ni switch — c'est ce qui permet de réutiliser
l'éditeur de carte tel quel). Elles servent aux adversaires, et un héros peut en reprendre une.

Une carte peut porter **sa propre image** (`sprite`), réglée dans l'éditeur de carte. Elle
gagne sur celle du personnage ou du PNJ qui la joue — c'est ce qui rend les cartes libres
lisibles : sans personnage dont hériter, elles n'avaient que le coffre comme repère. Sans
image propre, une carte prend celle de son porteur, comme avant.

`CHARACTER_DATA.npcs` tient les **adversaires** : statistiques, sprite, niveau des cartes,
niveau de jeu du bot (`ia`), et un deck qui **pioche dans le catalogue** — les cartes libres
*et* toutes les cartes des personnages (`cardCatalog()` dans `config/npcs.js`, le grand menu
déroulant du builder). Une ligne de deck s'écrit `{card: 'grunt1', n: 4}`.

`CHARACTER_DATA.fatigue` tient la **pile de fatigue** : les mêmes lignes de deck (avec un
`lvl` en plus), mais une seule pile pour tout le jeu — voir « Finir sa pioche ».

Le partage est net : `world.js` ne dit plus que **où** est la rencontre et **ce qu'elle
rapporte** ; tout ce qui est deck ou statistiques d'adversaire vient des données, donc du
builder. `ENCOUNTERS` est assemblé à partir des deux (`npcSide(id)` + les récompenses), et
garde exactement la forme qu'attendaient l'UI et les scripts. Une carte de deck introuvable
est ignorée à la résolution (le jeu ne casse pas) et signalée par la validation.

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
`node scripts/test-triggers.mjs` (448 tests : râles, auras, déclencheurs de tour, paliers qui
débloquent un moment, couture builder → moteur, mana différé, mots-clés à paramètre, capacités
des jetons, cible « Lui », cibles par type, caractéristiques variables, montants variables, événements, pioche ciblée, Élusif/Passe-Murailles, réduction de coût, destruction, coût variable, effets statiques, compteurs de sorts, fin de pioche, pile de fatigue, création de carte (précise et au hasard), déplacements de zone (mélange, renvoi, pose), leur renfort et celui des cartes sur place, prise du dessus, complétion par la fatigue, événement de renfort, filtre « une carte précise », niveau du propriétaire, plafond de tours, types multiples, « Type : tous » (posé, offert, reçu d'une aura), copie, cibles sans camp, « chez qui » qui suit la cible ou tire au sort, prise de contrôle, choix entre deux effets, chaîne par type, type lu sur une carte, palier « Choisit les deux », deux cibles désignées, switch, sujet d'un événement, cibler depuis une branche, règles de validation qui lisent le registre, garde d'un moment), `node scripts/test-ai.mjs` (31 tests : le bot
valorise-t-il ces mécaniques) et `node scripts/simulate.mjs` (la courbe de difficulté).

## Finir sa pioche, et la pile de fatigue
**Le deck ne se remélange pas** : une carte tirée ne revient pas d'elle-même, et la
défausse n'est jamais recyclée. Ce qui change, c'est ce qui arrive quand la pioche est
vide : on tire alors dans la **pile de fatigue** — « les cartes qu'on pioche quand on
essaie de piocher avec un deck vide ». Une carte au hasard, à chaque fois.

C'est **une seule pile pour tout le jeu** (`CHARACTER_DATA.fatigue`), les deux camps y
tirent, héros comme PNJ. Elle s'édite dans le builder, en tête de la liste des
adversaires, comme un deck de PNJ : des lignes qui **désignent** une carte du catalogue,
avec ses exemplaires (qui pondèrent le tirage) et le **niveau** auquel elle sort — la
pile n'appartenant à personne, elle ne peut hériter du niveau de personne.
`fatiguePile()` (`config/npcs.js`) la déroule, `carteDeFatigue()` (`engine.js`) y tire.

**Elle ne s'épuise jamais** : chaque tirage en fabrique une copie. D'où le plafond
`BALANCE.combat.maxPiochesAVideParTour`, remis à zéro chaque tour : il remplace la
protection que donnait l'ancienne règle, sinon « sort à 0 mana qui fait piocher » se
rejouerait sans fin. Un deck épais reste un avantage — on tire ses bonnes cartes avant
d'en être réduit à la pile — mais ce n'est plus une condition de survie.

**Pile vide = l'ancienne règle, à l'identique**, et c'est l'état par défaut : on ne
pioche plus, un camp à sec joue ce qu'il a encore en main et sur le plateau, et quand
**plus personne ne peut rien faire** (`peutAgir()` : plus de pioche, rien de payable
même à plein mana, rien qui frappe), `beginTurn` arrête le combat et **le plus de PV
l'emporte** — égalité = match nul, que l'UI compte comme une défaite du joueur.

⚠ **Avec une pile non vide, `peutAgir()` est toujours vrai** : personne n'est jamais à
court de pioche, donc la fin « plus personne ne peut jouer » ne se déclenche plus et
c'est `BALANCE.combat.maxTurns` qui devient le vrai garde-fou. À surveiller quand la
pile se remplit : la longueur des combats est le premier chiffre à relire
(`node scripts/simulate.mjs` affiche le nombre de tours moyen).

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

## Mots-clés à paramètre
Un mot-clé simple s'écrit `"Taunt"` dans `keys` ; un mot-clé qui porte une valeur s'écrit
`"id:valeur"` (`"type:Chien"`). Ne compare jamais une entrée de `keys` à la main : passe par
`keyId` / `keyArg` / `hasKey` / `keyArgs` de `config/mechanics.js`. Un mot-clé à paramètre se
pose dans « Mots-clés » sur la carte (le builder affiche un champ de saisie à côté de la puce) ;
il n'apparaît pas dans les menus déroulants « mot-clé offert » (aura, renfort, palier), qui n'ont
pas de case où écrire la valeur.

Un mot-clé peut porter **plusieurs** paramètres (`characteristique_variable:atk:ownTurns:`) :
`keyFields` les rend rangés par nom en comblant les défauts, `keyFrom` les remballe, et une
entrée de `KEYWORDS` peut définir `text(champs)` pour se décrire elle-même sur la carte. Un
paramètre avec `si(champs)` n'apparaît dans le builder que quand il a un sens.

Le type est une simple étiquette : il ne fait rien seul. Ce qui le rend utile, c'est ce qui le
référence — la cible `sameTypeAllies` et la portée d'aura du même nom, toutes deux lues sur le
porteur de l'effet.

## Les types d'une carte
Une carte porte **autant de types qu'on veut** : un corbeau est « Corbeau » *et* « Oiseau »,
et répond aux deux. C'est le même mot-clé `type:` posé plusieurs fois — le moteur lisait
déjà toutes les valeurs (`keyArgs`), il ne manquait que le bouton **＋** du builder, qu'une
entrée `multiple: true` dans `KEYWORDS` suffit à faire apparaître.

Le mot-clé **« Type : tous »** (`type_tous`) est le cas limite : l'unité répond oui à
n'importe quelle étiquette sans en nommer aucune. Il ne se code **nulle part** dans le
moteur, et c'est la preuve que les types sont bien rangés : tout ce qui pose la question
passe par trois fonctions de `config/mechanics.js` — `typesOf` (les étiquettes),
`estDuType(x, t)` (« porte-t-elle celle-là ? ») et `partageType(a, b)` (« en ont-elles une
en commun ? »). Cibles par type, portée d'aura, compteurs et filtres de cartes en héritent
d'un coup, moteur **et** bot. Ne compare jamais un type à la main : ce serait le seul
endroit du jeu où « tous » ne vaudrait pas.

Deux règles que ces fonctions portent : une unité **sans** étiquette ne partage rien avec
personne (sinon « les alliés du même type » toucherait tout le plateau dès qu'aucune carte
n'est étiquetée), et « tous » partage avec quiconque en porte au moins une.

**Un type se donne** : posé sur la carte, offert par un renfort (`buff`), par un palier,
porté par un jeton, ou **donné par une aura** — les quatre menus « mot-clé offert »
proposent « Type : tous ». Un type reçu compte comme un type imprimé : cibles par type,
compteurs, filtres de cartes.

⚠ **Une seule exception, et elle empêche une boucle** : la **portée** d'une aura « aux
alliés du même type » se décide sur les types **imprimés** (`baseKeys`), pas sur les types
reçus. Sans elle, une aura « aux alliés du même type, donne Type : tous » élargirait sa
propre portée, et ce qu'une aura touche dépendrait de l'ordre des unités sur le plateau.
C'est la fonction `imprimee(u)` d'`engine.js`, utilisée par `auraPorte()` et par elle
seule — la règle de partage, elle, reste unique (`partageType`).

## Caractéristiques variables
`characteristique_variable` fait valoir l'attaque et/ou les PV d'une unité un **compteur**
(`COUNTERS` dans `config/mechanics.js` : tours joués, sorts joués, alliés d'un type, cartes
en main, **niveau du héros propriétaire**…). Ajouter un compteur = une entrée dans ce
registre — **sauf** s'il suit quelque chose que le combat ne compte pas encore : il faut alors le champ dans `makeSide` et son
incrément au bon endroit d'`engine.js` (c'est le cas de `spellsGame` / `spellsTurn`, remis
à zéro par `beginTurn` pour celui du tour).

`ownerLevel` est le seul compteur qui ne lit pas le combat mais **la carte** : son niveau
de résolution, posé par `resolveCard()`. C'est pourquoi le porteur (`u`) est passé partout
où un nombre se calcule — y compris `costDelta()`, qui passe la carte elle-même, et le bot,
qui la passe avant même de la poser. Un jeton hérite du niveau de qui l'invoque.

C'est une valeur **dérivée**, calculée dans `refresh()` comme une aura : elle monte et
descend sans jamais toucher aux dégâts subis, et une vie variable qui tombe à 0 tue l'unité
au prochain ramassage des morts. Les renforts reçus en combat s'ajoutent par-dessus le
compteur — c'est à ça que servent `printedAtk` / `printedHp`, qui gardent ce que la carte
annonçait en arrivant.

Piège à connaître : un compteur bouge **sans qu'aucune carte ne soit jouée** (le tour qui
avance, la main qui se remplit), alors que `refresh()` n'était appelé qu'aux événements de
plateau. D'où le `resolveDeaths(B)` au début de `beginTurn` — il rafraîchit puis ramasse
l'unité que le compteur vient de tuer. Un compteur ne doit jamais lire `atk`/`hp` : deux
caractéristiques variables se regarderaient en boucle.

## Événements (« quand X alors Y »)
Ce ne sont pas des mots-clés : ce sont des **moments** de plus. `EVENTS` × `EVENT_WHO`
génère 18 entrées dans `TRIGGERS` (`on_draw_self`, `on_spell_foe`, `on_unitDies_any`…),
donc tout ce qui transporte déjà un moment — `resolveCard`, `makeUnit`, les paliers, les
jetons, le bot — les transporte sans une ligne de plus.

Ajouter un événement = une entrée dans `EVENTS` + un appel à `fireEvent(B, camp, id)` au
bon endroit d'`engine.js` (aujourd'hui : `draw`, `damageHero`, `resolveDeaths`, la fin de
`playCard`, la fin d'`attack`, et `case 'buff'`). `fireEvent` **ne ramasse pas les morts** —
c'est le flux normal qui s'en charge, sinon on retirerait une unité du plateau au milieu
d'une liste en cours de parcours.

**« Quand cette unité reçoit du renfort »** (`renfort`) est le seul événement dont le
**sujet est une unité** et non un camp, et il montre comment en écrire d'autres :

- `EVENTS.renfort.soi` remplace le libellé « Quand tu… » du moment `self` — un événement
  à sujet ne se dit pas comme un événement de camp ;
- `fireEvent(B, camp, ev, sujets)` prend une **liste d'unités** en 4ᵉ argument : le moment
  `self` n'est alors écouté que par elles. Les variantes **adverse** et **n'importe qui**
  restent de camp (« une unité de ce côté-là l'a reçu »), et les entendent donc toutes ;
- il part pour le camp de l'**unité renforcée**, pas pour celui qui a joué la carte — un
  renfort peut tomber en face, par « Lui » ;
- **une fois par pile** : un renfort donné *par* un déclencheur de renfort ne relance pas
  l'événement (`B.renfortEnCours`), quelle qu'en soit la cible. Sans ça, « quand cette
  unité reçoit du renfort, +1/+1 sur elle-même » tournerait jusqu'au garde-fou de chaîne
  et la carte donnerait quatre fois ce qu'elle annonce ; et deux unités qui s'écoutent se
  relanceraient l'une l'autre.

Un renfort qui n'offre qu'un mot-clé (+0/+0) n'en est pas un, et une **aura** non plus —
elle modifie tant qu'elle dure, elle ne donne rien.

**Le SUJET d'un événement est « Lui »** pour les effets du moment : l'allié qu'on vient
de poser, l'unité qui vient d'attaquer, celle qui vient d'être renforcée. C'est ce qui
rend dicible « quand tu joues un allié, **les autres unités du même type que Lui**
gagnent +1/+1 » — sans ça la chaîne commencerait vide et le moment ne ferait rien. Le
registre le dit (`EVENTS[ev].sujet`), `fireEvent` passe les unités concernées et
`applyEffects` les prend comme point de départ de `last`.

**La GARDE d'un moment** — « oui, mais seulement si… ». L'événement dit ce qui se
produit, `EVENT_WHO` de quel côté, et la garde regarde le **sujet** : est-ce *cette*
unité (le porteur), une unité **d'un type**, une unité **du même type que le porteur** ?
`EVENT_GARDES` les liste, `gardePasse()` dans `engine.js` tranche, et un moment sans
garde part toujours — rien ne change pour les cartes déjà écrites.

⚠ Elle ne peut pas vivre dans l'identifiant du moment : `on_attack_self` est une **clé
du registre**, et un type écrit dedans (`on_attack_self:Chien`) ne s'y retrouverait plus
— `resolveCard` et `makeUnit` bouclent sur `Object.keys(TRIGGERS)`. Elle vit donc à côté,
dans `card.gardes[slot]`, écrite « id:valeur » comme un mot-clé. `momentLabel(slot, carte)`
est ce qui l'affiche : le builder, la vue d'ensemble et la fiche de combat y passent tous.

⚠ **Le sujet sert à deux choses qu'il ne faut pas confondre** : il dit qui est « Lui »
(tous les événements qui en ont un), et il **restreint l'écoute** au seul sujet — mais
pour le renfort seulement (« quand CETTE unité reçoit du renfort »), d'où le second
drapeau `ecouteLeSujet`. Sans cette distinction, « quand tu joues un allié » ne serait
entendu que par l'allié qu'on vient de poser, c'est-à-dire par personne d'utile.

Le garde-fou `B.eventDepth` (4 rebonds) est obligatoire : « quand tu pioches, pioche » se
rappellerait sans fin. Au-delà, la chaîne est coupée et le journal le dit. Un test du banc
vérifie que le combat ne se fige pas.

Le builder n'affiche pas 18 blocs : il montre les moments d'événement **qui portent
quelque chose**, plus un sélecteur « quand X alors Y » pour en ajouter un.

## Montants variables
N'importe quel **nombre** d'un effet peut valoir un compteur au lieu d'une valeur fixe :
`v: 3` devient `v: { src: 'alliesOfType', arg: 'Chien', plus: 0 }`. Ce n'est donc pas un
effet de plus — dégâts, soin, pioche, armure, mana, renfort et nombre d'invocations en
profitent d'un coup, et un effet qui gagnera un paramètre numérique en profitera aussi.

`resolveAmounts()` dans `engine.js` calcule ces nombres **une seule fois**, à l'entrée de
`applyEffects` (et de `autoTarget`), à partir de `numberParams(op)` lu dans le registre :
tout le reste du moteur ne voit que des nombres, comme avant. Ne lis jamais `e.v` sans être
passé par là. `plus` est le bonus à plat : le builder l'édite (le petit champ « + » à côté
du compteur, d'où « X = tes tours joués, +2 ») et les paliers « Amplifie les effets » s'y
**ajoutent** via `amplify()` — sans lui, un palier casserait le montant ou ne ferait rien.

⚠ **Un montant peut être un compteur : ne l'interpole jamais brut dans un texte** (`+${e.atk}`
donne `[object Object]`). Passe par `describeAmount()`, y compris dans les messages de
validation.

## Déplacer des cartes entre les zones
« Mélange dans la pioche », « Renvoie en main » et « Pose sur le plateau » sont **le même
geste** : prendre des cartes quelque part, les mettre ailleurs. Une seule liste de zones
(`ZONES` dans `config/mechanics.js` : main, défausse, pioche, plateau, créées), les mêmes
paramètres pour les trois (`paramsZone`), un seul chemin de moteur (`preleve()` puis
`depose()`). Ajouter une zone les sert donc toutes les trois d'un coup.

Deux règles tiennent tout l'ensemble :
1. **Une carte reste chez son propriétaire.** Renvoyer une unité adverse la met dans SA
   main à lui. Le choix « chez qui » ne sert qu'aux zones de paquet ; le plateau, lui, se
   désigne avec une cible ordinaire (`t`), qui dit déjà de quel côté on prend.
   « Chez qui » a **quatre** réponses, et deux ne se connaissent qu'au moment où l'effet
   part : « toi », « l'adversaire », **« son propriétaire »** (le camp de la *cible* de
   l'effet — c'est ce qui permet « l'unité ciblée devient une carte au hasard de la
   pioche de SON propriétaire ») et **« un joueur au hasard »** (pile ou face à chaque
   résolution). Un seul endroit répond côté moteur : `campDuPaquet()` dans `engine.js`.
   Les trois déplacements prennent dans un paquet et n'ont pas de cible à lire :
   « son propriétaire » y retombe sur le camp de celui qui joue la carte, et la
   validation le dit. Ce menu
   propose **toutes** les cibles du registre, sans liste blanche : c'est au designer de
   dire ce qu'il vise. Celles qui ne désignent qu'un héros ne prennent rien (un héros
   n'est pas une carte) — le moteur les ignore et la validation le dit, plutôt que de
   les cacher. Le registre donne juste la cible **par défaut** d'un effet neuf (`def`).
2. **Une unité prélevée sur le plateau ne meurt pas** : pas de râle d'agonie, pas de
   passage par la défausse. C'est ce qui sépare un rebond d'une destruction.

Ce que ça donne : « recycle ta défausse », « mélange les Chiens de ta main », « renvoie
une unité ciblée », « réanime un allié de la défausse » (depuis la défausse vers le
plateau), « triche de coût » (depuis la main vers le plateau), « cherche dans ta pioche »
(pioche vers main). Une carte posée sur le plateau n'est **pas jouée** : « À la pose » ne
part pas, même règle que pour un jeton invoqué. Un sort ne se pose pas, un jeton renvoyé
disparaît (il n'a pas de carte), et une main pleine renvoie la carte à la défausse.

**Le modèle de zones a été corrigé pour ça** : un allié en jeu n'est plus dans la défausse
(il l'était par simplification), sa carte voyage avec l'unité et n'y tombe qu'à sa mort.
Sans cette correction, « réanime un allié de ta défausse » ressusciterait une unité encore
vivante et « renvoie en main » dupliquerait la carte.

Le compteur `recycle` du camp, remis à zéro chaque tour, plafonne les retours vers la
pioche (`BALANCE.combat.maxRecyclageParTour`) : sans lui, « sort à 0 mana qui se remélange
et fait piocher » rouvrirait la boucle sans fin que la règle de non-remélange avait fermée.

**Comment on prend dans un paquet** est un paramètre de plus (`paramsOrdre`) : *au
hasard* (le défaut, et ce que faisait le moteur depuis toujours) ou *du dessus* — le
dessus d'un paquet est la **fin du tableau**, là où `draw()` va chercher. Et la case
**« Compléter avec la pile de fatigue »** fabrique les cartes qui manquent quand le paquet
n'en a pas assez, exactement comme une pioche à vide (même plafond par tour). Elle est
décochée par défaut : sans ça, un paquet vide se mettrait à produire des cartes tout seul
sur des cartes déjà écrites. `choisitDansPaquet()` (`engine.js`) est le seul endroit qui
répond « lesquelles, dans quel ordre, et que faire s'il en manque ».

**Renforcer sans déplacer** : `renforce_les_cartes` donne +X/+Y aux cartes d'un paquet
**là où elles sont** (main, pioche, défausse, chez soi ou en face). C'est le seul moyen de
renforcer un allié qui n'est pas encore en jeu — `buff` ne connaît que les unités du
plateau. Il partage tout avec les déplacements : le même filtre, le même « comment », le
même `renforceCartes()` qui écrit sur la carte. Une carte renforcée dans la pioche arrive
donc déjà grossie quand on la tire et qu'on la joue.

**« Et leur donne +X/+Y »** est un paramètre du déplacement, pas un effet à part : le
renfort va aux cartes **qu'on vient de déplacer**, donc pas de second filtre à régler ni
d'ambiguïté sur qui en profite (« remélange ta défausse dans ta pioche et donne-leur
+2/+2 »). Les trois destinations l'ont d'un coup, et c'est un nombre du jeu comme un
autre — le bouton « X » y met un compteur. `renforceDeplacees()` (`engine.js`) l'écrit
sur la **carte** (`atk`/`hp`), juste **avant** le dépôt : la carte reste grossie jusqu'à
ce qu'on la joue, une carte posée sur le plateau arrive déjà grossie, et `baseAtk`/`baseHp`
étant lus de la carte, les auras se cumulent par-dessus comme d'habitude. Un sort n'a ni
attaque ni vie et traverse sans rien recevoir (la validation le dit quand le filtre ne
peut prendre que des sorts). Le bot compte le bonus pour le camp **à qui sont les
cartes** : en donner à celles d'en face est un cadeau, pas un bon coup.

⚠ Un **sort** est mis à la défausse **avant** que ses effets partent (`playCard`) : un
sort qui remélange sa propre défausse peut donc se reprendre lui-même. C'est voulu et
visible en jeu — mais c'est le genre de détail qui rend un test instable si on l'oublie.

## Créer une carte
`cree` fait apparaître en main **n'importe quelle carte du catalogue** (les cartes libres
et celles des personnages). Ce n'est pas une pioche : le deck n'est
pas touché, et ça marche encore quand il est fini. C'est ce qui remplace les combos
« je pioche le sort qui pioche » — trop évidents, et cassés par la règle de pioche.

La carte se désigne de **deux façons**, et c'est le champ « Quelle carte » qui tranche :
- **une carte précise**, par son identifiant (paramètre `cardRef` du builder, le même
  grand menu que les decks de PNJ) ; le moteur passe par `cardById()` de `config/npcs.js` ;
- **une carte au hasard**, tirée dans le catalogue parmi celles que laisse passer un
  **filtre de cartes** (toutes, les alliés, les sorts, un type, un mot-clé — cf. plus bas).
  Le tirage est refait **à chaque exemplaire** : « 3 cartes au hasard », c'est trois
  tirages, pas trois copies. Le sac vient de `catalogCards()` (`config/npcs.js`), gardé
  en mémoire comme l'index — une carte sans identifiant n'y est pas.

Les deux vivent dans `paramsCarteCreee()` (`config/mechanics.js`), un seul bloc de
paramètres que partagent `cree` **et** la zone « Créées de toutes pièces » des trois
déplacements : « mélange deux sorts au hasard dans ta pioche » se dit sans une ligne de
moteur en plus. Un seul endroit répond « quelle carte apparaît ? » côté moteur :
`modeleCree()` dans `engine.js`. Le bot valorise un tirage un peu moins qu'une carte
choisie — il ne sait pas ce qui va tomber.

## Switcher une carte
Chaque slot d'un personnage porte **deux** cartes — la base et son switch — et c'est le
joueur qui équipe l'une ou l'autre hors combat. L'effet `switch` les échange **en
combat**. `switchOf(id)` (`config/npcs.js`) est le seul endroit qui répond « quelle est
l'autre face ? », et il répond **dans les deux sens** : une base rend son switch, un
switch rend sa base. Sans ça l'effet serait mort sur la moitié des cartes du jeu, celles
qu'on a justement équipées en switch. Une carte libre, un jeton ou une carte de PNJ
n'occupent aucun slot : ils n'ont pas d'autre face, et le journal le dit.

Il vise **où on veut** (le même bloc `paramsSource()` que les déplacements et la copie,
moins la zone « créées de toutes pièces » — on ne switche que ce qui existe) :

- dans un **paquet** (main, pioche, défausse, chez soi ou en face), la carte est
  remplacée **sur place** : elle ne change pas de zone et reste ainsi tout le combat ;
- sur le **plateau**, l'unité **devient** l'autre face — c'est exactement une copie,
  donc le même `devientCopie()` ;
- sauf si cette autre face est un **sort** : une unité ne peut pas en devenir un, alors
  elle quitte le plateau et le sort part à sa place, en se choisissant ses cibles tout
  seul (`autoTarget`, comme un râle d'agonie). Elle ne **meurt** pas pour autant : pas
  de râle, et la carte finit à la défausse de son propriétaire comme un sort joué.

⚠ **Le switch se fait CHEZ CELUI QU'ON VISE, et le sort part de son côté à lui.** Viser
une unité adverse, c'est donc lui jouer sa propre carte : si son autre face est un sort,
il en profite. **C'est voulu** (décision du game designer, pas un oubli de filtre) —
« Bipolarité » vise n'importe quelle unité, et mal la lancer est censé pouvoir arranger
l'adversaire. Le côté choisi est celui du **contrôleur** de l'unité, comme pour un râle
d'agonie ; sa carte, elle, retombe chez son **propriétaire**, comme partout ailleurs —
les deux ne diffèrent que sur une unité volée par « Prise de contrôle ».

Le bot lit un switch de plateau comme un échange (ce que vaut l'autre face moins ce que
vaut le corps remplacé, signe inversé en face) ; dans un paquet, il ne sait pas encore
quelle carte sera prise et s'en tient à une petite utilité.

## Copier une carte
`copie` fait qu'une unité **devient une autre carte** : ses statistiques, ses mots-clés,
son aura, ses moments, ses statiques. Elle repart à neuf — dégâts subis et renforts reçus
s'effacent — mais garde son identité de plateau : son `uid` (la fiche ouverte et les cibles
en cours la suivent), sa place dans la rangée, et le fait qu'elle ait déjà attaqué ce
tour-ci. La Charge du modèle compte, elle : sous cette forme, l'unité vient d'arriver.
Elle n'est **pas jouée** — « À la pose » ne part pas, même règle qu'un jeton invoqué.

L'effet pose **deux questions**, donc porte **deux cibles** : `t` dit *qui* devient une
copie (« Elle-même » pour un cri de guerre, « une unité ciblée » pour un sort) et le bloc
`paramsSource()` dit *de quoi* — exactement les mêmes zones et les mêmes filtres qu'un
déplacement (une unité en jeu via `tm`, une carte d'un paquet au hasard ou du dessus, une
carte du catalogue). Ajouter une zone sert donc la copie comme les trois déplacements.
Les deux menus proposent **toutes** les cibles (même règle que les déplacements ci-dessus) ;
seuls leurs défauts diffèrent : « Elle-même » pour l'une, « une unité adverse » pour l'autre.

Le modèle n'est **pas déplacé** : on le lit, on le laisse. Copier une carte de la main
adverse ne la lui prend pas, et la carte reste dans la pioche où on est allé la chercher —
c'est ce qui sépare une copie d'un vol. Un **jeton** n'a pas de carte : on copie alors ce
qu'il annonçait en arrivant (`carteDUnite()`). Un **sort** ne se copie pas sur une unité,
qui n'a alors ni attaque ni vie — le journal le dit. Et le modèle est lu **une seule
fois** : « tous tes alliés deviennent une copie d'une carte de ta pioche », c'est la même
carte pour tous, pas un tirage par unité.

⚠ **Le joueur ne désigne qu'UNE cible par carte**, et elle sert à toutes les cibles
`pick` de la carte, branches d'un « Choisir » comprises. Deux cibles désignées du **même
camp** sont une bonne carte (« soigne un allié ET renforce-le ») ; dans des **camps
opposés**, l'une des deux ne touchera jamais rien, quel que soit le clic — la validation
le signale comme bloquant. Le moteur ne se laisse plus abuser non plus : une cible qui
nomme un camp (`allyUnit`, `enemyUnit`, `enemyAny`) **refuse** une désignation de l'autre
côté, plutôt que de renforcer l'adversaire parce que le joueur a pointé là.

⚠ **Un effet peut désormais porter plusieurs cibles**, et plus rien ne lit `e.t` en dur :
`targetParams(op)` les demande au registre, `ciblesDe(e)` (`engine.js`) les déroule, et
`needsTarget` / `legalTargets` / `autoTarget` / la validation en passent toutes par là. Le
joueur, lui, n'en désigne **qu'une** : deux cibles `pick` sur le même effet reçoivent la
même désignation, et la validation le signale.

Le bot lit la copie comme un **échange** : ce que vaut le modèle moins ce que vaut le corps
remplacé, signe inversé sur une unité adverse (la transformer en pire est un retrait, lui
offrir mieux est un cadeau). Quand le modèle est un tirage au hasard dans le catalogue, il
ne tranche pas.

## Prendre le contrôle
`prendre_le_controle` fait passer une unité de l'autre côté du plateau. C'est la seule
mécanique du jeu qui sépare **de quel camp elle est** de **à qui elle appartient**, et
tout tient dans une fonction d'`engine.js` : `proprio(u, camp)`.

- Ce qui suit le **contrôleur** : les auras, les attaques, les cibles « tes alliés », et
  le **râle d'agonie** — c'est toi qui la commandes quand elle tombe.
- Ce qui suit le **propriétaire** : sa **carte**. À sa mort elle va dans SA défausse à
  lui ; renvoyée en main, mélangée dans une pioche, elle rentre chez lui aussi.

Le champ `owner` n'est écrit que par cet effet : tant que personne n'a rien volé, il
n'existe pas et la réponse reste « le camp sur le plateau duquel elle se trouve ». Une
unité volée arrive comme une unité qu'on vient de poser — elle n'attaque pas ce tour-ci,
sauf Charge. Le bot la lit comme un retrait **et** un corps : il paie presque deux fois
ce que vaut l'unité, et vise la plus gênante.

## Choisir entre deux effets
`choisir` est le premier effet dont les **paramètres sont d'autres effets** (`a` et `b`,
type `effects`). Une seule branche part — et une branche est une **liste** : « inflige 2
blessures au hasard PUIS répète sur le même type » est UN choix, pas deux. Le builder
l'édite avec le même bloc qu'un moment de carte (`effectList()`, extrait de
`triggerFields` pour être partagé), donc « + Ajouter un effet » y marche pareil.
`listeEffets()` lit indifféremment une liste ou l'objet unique des cartes écrites avant
que la branche en devienne une : aucune donnée à migrer.

- **Le joueur** répond quand il joue la carte : `needsChoice(card)` le dit à l'UI, qui
  ouvre une fenêtre à deux boutons **avant** de demander une cible, et
  `playCard(B, k, i, target, choix)` transporte la réponse. Une seule réponse pour toute
  la carte, comme il n'y a qu'une cible désignée.
- **Les cibles d'un « Choisir » sont dans ses branches**, et `needsTarget` /
  `legalTargets` / `canPlay` descendent dedans (`ciblesDeLaCarte(card, choix)`). Sans
  cette descente, une carte dont tout le contenu est dans un choix paraîtrait n'avoir
  aucune cible : elle partirait sans rien viser (un sort de dégâts retombant sur le héros
  adverse). La réponse étant donnée **avant** la désignation, on ne propose que les cibles
  de la branche retenue — et une carte reste jouable dès qu'**une** branche trouve une
  cible, l'autre serait-elle dans le vide.
- **Le bot** compare : le Monte-Carlo pousse **deux coups** (un par branche) et joue les
  parties jusqu'au bout ; le bot à règles prend `meilleureBranche()`, et `botAction`
  complète le coup à la sortie (`avecChoix`) plutôt que dans les sept endroits où
  `decide` construit une pose.
- **Personne pour choisir** (un râle d'agonie, un déclencheur de tour) : c'est la
  première branche qui part, et la validation le dit sur la carte.
- **Plus rien à choisir** : le palier **« Choisit les deux »** (`{lvl, lesDeux: true}`)
  fait partir les deux branches. `resolveCard` **déroule** alors la carte — chaque
  `choisir` est remplacé par ses deux listes bout à bout — donc le moteur, le bot et
  l'interface ne voient plus aucun choix à poser : il n'y en a plus. Le déroulé se fait
  avant l'amplification, si bien qu'un palier « Amplifie » sert les deux branches.

⚠ Une branche étant une **liste**, la copie profonde de `resolveCard` doit la copier
comme telle (`listeEffets(...).map(copyEffet)`) : un `{ ...branche }` en ferait un objet
à clés numériques et la branche disparaîtrait sans un mot. C'est aussi là que les cartes
écrites avant que la branche devienne une liste sont normalisées.

Un effet qui en contient d'autres oblige tout ce qui **inspecte** un effet à descendre
dedans : `eachSubEffect()` (`config/mechanics.js`) est ce parcours, et il sert à
`resolveCard` (l'amplification touche les deux branches, et la copie profonde empêche
qu'un palier modifie la définition), à la validation, au bot (« cette carte fait-elle des
dégâts ? ») et à `needsChoice`. Le builder édite une branche avec **le même** `effectRow`
que n'importe quel effet — et refuse d'imbriquer un « Choisir » dans un « Choisir »,
comme un jeton refuse d'invoquer un jeton.

⚠ **Le builder ne décrit plus les cartes lui-même.** Il avait sa propre copie de
`describeEffect`, qui avait fini par mentir — chaque effet ajouté au registre y manquait,
et l'aperçu affichait « Copie » ou « Choisir » au lieu de dire ce que fait la carte.
`describe()` délègue maintenant au moteur et ne garde que ce que le moteur ne peut pas
savoir : une mécanique inventée dans le brouillon.

## Filtres de cartes
`CARD_FILTERS` (`config/mechanics.js`) dit « quelles cartes » : toutes, les alliés, les
sorts, celles d'un type, celles portant un mot-clé, ou **une carte précise** désignée par
son identifiant (comme dans un deck de PNJ — c'est ce qui fait de « pose une carte de ta
pioche » un tuteur). `cardMatches(card, e)` tranche, `describeFilter(e)` l'écrit. Ajouter
un filtre = une entrée + un `case`.

Le bloc de champs qui va avec (« Lesquelles » + le champ que le filtre réclame) est
`paramsFiltre()`, et **les trois endroits qui filtrent des cartes l'utilisent** : les
déplacements de zone, « Réduit le coût » et l'effet statique sur le coût. Un filtre ajouté
les sert donc tous les trois d'un coup. Un filtre marqué `precise` est retiré des listes
« au hasard » : tirer au sort parmi une seule carte n'aurait pas de sens.

**Le type qu'un filtre vise peut être lu au lieu d'être écrit** (`TYPE_SOURCES`) : « crée
une carte du type d'une carte de ta main », « du type d'une unité en jeu chez
l'adversaire ». Trois champs remplacent le seul « Type visé » — d'où il vient, lequel
(s'il est écrit), chez qui (s'il est lu : toi, l'adversaire, les deux). Le type n'est
alors connu qu'au moment où l'effet part : `resolveAmounts()` le résout **au même endroit
et pour la même raison** qu'un montant variable, si bien que tout ce qui lit le filtre
ensuite ne voit qu'un type ordinaire. On tire au sort parmi les étiquettes présentes dans
la zone (une carte qui en porte deux compte deux fois ; « Type : tous » n'en nomme aucune
et n'en fournit donc pas).

⚠ **Les effets statiques n'y ont pas droit** (`paramsFiltre(..., typeLu = false)`) : un
statique est relu à chaque fois qu'on affiche un coût, et un type tiré au sort le ferait
clignoter. Le bot, lui, ne condamne pas une carte dont le type n'est pas encore connu —
`faisable()` la laisse passer.

`reduit_le_cout_de` est **ponctuel** : il touche les cartes déjà en main (la réduction leur
reste acquise pour le combat) et jamais celles piochées après. La version « aura », où le
coût baisserait tant qu'une unité est en jeu, demanderait que le coût devienne une valeur
dérivée comme `atk`/`hp` — elle n'est pas faite.

## Coût d'une carte
Il y a **deux** façons de bouger un coût, et elles se cumulent : `reduit_le_cout_de` réécrit
le `cost` de la carte en main (ponctuel, ci-dessus), et le mot-clé `cout_x_de_moins_de_plus`
le décale à chaque fois qu'on regarde la carte — son X est un montant du jeu comme un autre
(nombre fixe ou compteur), donc « coûte X de moins, X = tes tours joués » se dit sans une
ligne de moteur en plus. Le sens (`moins`/`plus`) est un paramètre du mot-clé plutôt qu'un
nombre négatif : un compteur ne sait pas descendre sous zéro.

`cardCost(card, B, k)` (`config/mechanics.js`) est le **seul** endroit qui répond « combien
coûte cette carte ? » — il additionne le coût imprimé, le mot-clé de la carte et les
effets statiques en jeu : `canPlay`, `playCard`, le bot et la main affichée y passent tous.
Ne lis jamais `card.cost` pour payer ou afficher — c'est le coût imprimé, pas celui du
moment. Hors combat (vitrine du deck) il n'y a pas de `B` : `cardCost` ne montre alors que
la part fixe, et jamais un compteur inventé.

## Effets statiques
« Les [trucs] sont affectés [comme ça] ». L'**aura** ne sait toucher qu'une chose : les
statistiques des unités en jeu. Un **effet statique** (`STATICS` dans `config/mechanics.js`,
champ `statics` d'une carte alliée ou d'un jeton) tient la même promesse — ça dure tant que
le porteur est là, ça disparaît avec lui — sur tout le reste : le coût des cartes en main,
les montants que les effets envoient, les dégâts subis par un héros, la pioche et le mana
de chaque tour.

Chaque entrée dit **qui** est visé (`qui` : le camp du porteur ou celui d'en face), dans
**quel sens** (`sens`) et **de combien** (`v`, un nombre du jeu — donc un compteur si on
veut). Le moteur ne parcourt jamais les plateaux lui-même : il appelle `staticTotal(B, k,
op, garde)` **à l'endroit exact où la valeur est lue** et repart avec un seul nombre —
`cardCost` pour le coût, `resolveAmounts` pour les montants, `damageHero` pour les PV du
héros, `beginTurn` pour la pioche et le mana. **Ajouter un effet statique = une entrée dans
le registre + un appel à `staticTotal` au bon endroit** ; le builder, le bot, les paliers et
les jetons le transportent sans une ligne de plus (`bon` et `poids` suffisent au bot à le
valoriser, dans les deux sens : imposer un malus à l'adversaire est un bonus pour soi).

⚠ **Un plafond ne s'additionne pas.** Les trois « limites par tour » (`limite_de_cartes_jouees`,
`nombre_d_attaques`, `nombre_de_cartes_piochees`) se composent par le **minimum** : deux
unités qui imposent « une carte par tour » ne font pas deux cartes. Elles passent donc par
`staticMin()` et non par `staticTotal()` — c'est la seule différence avec les autres
entrées du registre. Chaque camp compte ce qu'il a déjà fait ce tour-ci (`jouees`,
`attaques`, `piochees`, remis à zéro par `beginTurn`), et les plafonds sont lus là où la
question se pose : `canPlay` pour les cartes, `attackableTargets` pour les attaques (plus
aucune cible légale une fois atteint, donc le bot cesse d'en proposer), `draw` pour la
pioche — celle de début de tour comprise.

Un effet statique n'est pas forcément un **nombre**. « Les cartes retournent dans la
pioche » (`cartes_jouees_remelangees`) ne se dose pas : il est là ou il n'est pas. Il
garde donc les deux champs que `staticTotal` additionne (`sens`, `v`), figés et cachés du
builder, et le moteur teste simplement `> 0`.

Il montre aussi qu'**une carte part à la défausse à deux moments différents** : un **sort**
y va dès qu'il est joué (`playCard`), un **allié** seulement quand il meurt (`resolveDeaths`)
— sa carte voyage avec l'unité tant qu'elle tient le plateau, et la remélanger à la pose la
dupliquerait. Le champ « Quelles cartes » choisit l'un, l'autre ou les deux, et le moteur
lit le même statique aux deux endroits avec une garde différente (`m.quoi`). Un **jeton**
n'a pas de carte : il ne laisse rien. Et le **porteur qui meurt ne s'applique pas à
lui-même** — il a déjà quitté le plateau quand on ramasse les morts, et un statique
s'arrête avec son porteur.

Le plafond `maxRecyclageParTour` s'applique, et le sort part vers la pioche **avant** que
ses effets se résolvent, donc un sort qui pioche peut se retirer lui-même (même règle que
pour la défausse).

Contrairement à l'aura, ce n'est **pas** une valeur dérivée recalculée par `refresh()` :
rien n'est stocké, tout est additionné au moment de la lecture. C'est ce qui rend le coût
d'une carte enfin variable sans que `cost` devienne un champ dérivé.

Le builder les édite avec `effectRow`, le même éditeur que les effets — un registre
`{label, desc, params}` suffit, donc les paramètres conditionnels (`si`) et le bouton « X »
des montants variables marchent tels quels.

## Destruction
`detruit` ne compare rien : il met `damage` à `maxHp` comme le fait le Venin, et c'est
`resolveDeaths` qui ramasse — donc le râle d'agonie de la victime part normalement. Le
Bouclier ne protège pas (il absorbe une **perte de PV**, pas une destruction) et les héros
dans les destinataires sont ignorés. Conséquence assumée, identique à des dégâts mortels :
tant que la carte n'a pas fini de se résoudre, un soin sur « Lui » rattrape encore l'unité
détruite (c'est ce qui permet « détruis puis ranime »), et c'est testé comme tel.

## Renforcer, et affaiblir
`buff` **est** l'affaiblissement : ce sont les mêmes champs, les mêmes cibles, avec des
nombres qui peuvent descendre sous zéro. « -2/-2 à une unité adverse » n'a donc pas
d'effet à lui — les cibles adverses sont simplement dans la liste de `buff`.

Trois conséquences que le moteur assure déjà : l'attaque ne descend **jamais sous 0**
(`refresh` la borne), une vie tombée à 0 **tue** l'unité au prochain ramassage des morts
(comme des dégâts), et un **héros n'est jamais concerné** (`buff` ne garde que les unités).

⚠ **Un malus n'est pas un renfort** : l'événement « quand cette unité reçoit du renfort »
ne part que sur un vrai gain (`atk > 0 || hp > 0`). Le journal dit « Affaiblissement »
plutôt que « Renfort », et le bot **inverse le signe** sur une cible adverse — affaiblir
en face est bon, offrir un renfort en face est un cadeau.

## Ciblage
Tout passe par `recipients()` dans `engine.js`, qui traduit une cible en destinataires
concrets (unites et/ou heros). Ajouter une cible = une entree dans `TARGETS` + un `case`
dans `recipients()`, jamais retoucher les effets un par un. Les drapeaux de `TARGETS` :
`pick` (le joueur la designe, sinon elle se resout seule), `random` (le bot la valorise un
peu moins), `allyOnly` (n'a de sens que portee par une unite, ex. « Elle-meme »).

Une cible peut porter une valeur, écrite `id:valeur` comme un mot-clé (`allyType:Chien`) :
lis-la avec `targetId` / `targetArg` / `targetDef` / `targetLabel`, jamais en comparant `e.t`
à la main. `allyType` et `enemyType` filtrent par type sans rien demander au porteur — un sort
y a droit — là où `sameTypeAllies` lit le type du porteur et l'exclut du résultat.

**Les cibles sans camp** — `anyUnit` (« une unité, alliée ou adverse », désignée par le
joueur), `allUnits`, `randomUnit`, `anyType` — sont les seules où le camp ne fait pas
partie de la question. Toutes les autres obligent à choisir un côté avant de choisir une
unité. Deux conséquences dans le code :

- **`allUnits` n'épargne pas le porteur**, contrairement à `allAllies` (« hors porteur de
  l'effet ») : « toutes » veut dire toutes, c'est ce qu'on attend d'un balayage.
- **Le bot ne peut plus lire le signe sur le camp de la cible.** `CIBLES_MIXTES` dans
  `ai.js` est la troisième famille, à côté de `CIBLES_ENNEMIES` et `CIBLES_ALLIEES` :
  un balayage vaut ce qu'on gagne en face **moins** ce qu'on perd chez soi (un
  affaiblissement s'inverse alors tout seul, sans un cas de plus), et une cible désignée
  vaut ce qu'elle donne du bon côté — c'est `pickTarget` qui l'y envoie. Le « soutien »
  s'y lit désormais au **signe** de l'effet et non plus à sa cible : un renfort négatif
  est un affaiblissement, il n'a rien à faire sur nos propres unités. Hors combat
  (`autoTarget`, un râle d'agonie), c'est la nature de l'effet qui tranche : ce qui
  blesse part en face, le reste va chez soi.

La cible **`previousType`** (« Les autres unités du même type que Lui ») est la seule
dont le type n'est **pas écrit sur la carte** : c'est celui de l'unité que l'effet
précédent a visée. C'est ce qui rend dicible « inflige 2 blessures à une unité adverse au
hasard, **puis répète sur chaque unité du même type** » — le type n'est connu qu'une fois
le hasard tiré. Elle prend **dans le camp de « Lui »**, et ne le reprend pas (il vient de
recevoir l'effet) ; une unité sans étiquette ne partage rien, donc la chaîne s'arrête
d'elle-même. ⚠ Comme « Lui », elle ne désigne **rien en première position** — la
validation le signale alors comme bloquant, parce que l'effet ne partira jamais et que
rien, sur la carte, ne le laisse voir.

La cible `previous` (« Lui ») enchaîne deux effets sur la même chose : elle rend les
destinataires du dernier effet qui en avait — le jeton qu'on vient d'invoquer, l'unité
qu'on vient de frapper. Pioche, armure et mana n'ont pas de destinataire et ne coupent
donc pas la chaîne. Les morts n'étant ramassées qu'à la fin de la carte, « Lui » désigne
encore une unité mise à 0 PV par l'effet précédent (c'est ce qui permet de la sauver).

## Jetons invoqués
Un jeton est une unité comme une autre : `makeUnit` lit ses `keys` (type compris), son
`aura` et ses moments. Seul « À la pose » ne le suit pas — il n'est pas joué depuis la
main (`TOKEN_TRIGGERS` dans `config/mechanics.js` dit lesquels le suivent). Le builder
lui donne le même éditeur qu'à une carte, et s'arrête aux mots-clés pour un jeton qui
invoque un jeton, sinon l'éditeur s'emboîte à l'infini. Tout ce qui inspecte une carte
côté builder (validation, compteur « à coder », `MECANIQUES-A-CODER.md`) passe par
`eachEffect` / `eachUnit`, qui descendent dans les jetons : sans ça une mécanique non
codée se cache dans un jeton.

## Le plateau, et la vue inspectée
**Le plateau n'a plus de plafond d'unités.** `BALANCE.combat.boardSize` à **0** veut dire
« pas de limite » : une invocation ne rate plus faute de place, un allié ne « reste plus
de côté », et un deck qui empile les jetons va jusqu'au bout de son idée. Remettre un
nombre dans ce champ rétablit le plafond partout — pose, invocation, jouabilité passent
toutes par `plateauPlein()` dans `engine.js`, seul endroit qui répond à la question.

⚠ **C'est un changement d'équilibrage, pas de confort** : la place libre profite surtout
à celui qui invoque. Sur `node scripts/simulate.mjs`, les deux boss ont nettement reculé
(médiane d'`owlboss` 35 % → 65 %, `frogboss` 65 % → 90 %). À relire avant de figer la
courbe.

C'est l'**affichage** qui encaisse, et il **ne défile jamais** — un plateau qui défile
cache la moitié du combat. Le plateau prend la hauteur de son contenu (`flex: 0 1 auto`)
jusqu'à un plafond, et au-delà `ajustePlateau()` (`ui/battle.js`) **retrécit les
vignettes** : il élargit le bloc de 1/échelle puis le réduit d'autant, si bien que les
retours à la ligne se calculent sur la largeur réelle. Deux détails qui l'ont mordu :
un bloc plus large que son plateau n'est **pas** centré par la grille (elle le recale au
bord de départ), d'où l'ancrage en haut à gauche et le replacement par la transformation ;
et « ça tient déjà » se **mesure** (`offsetHeight`) au lieu de se calculer, sinon des
lignes de hauteurs inégales feraient retrécir un plateau qui tenait.

**Cliquer une unité ouvre sa fiche**, en mode auto comme pendant le tour adverse : lire
une unité ne coûte jamais un coup. Elle dit ce qui la **modifie** en ce moment et **d'où**
ça vient (les auras nommées par leur porteur, les renforts reçus, la caractéristique
variable) — le plateau montre « 4/5 », la fiche explique pourquoi — puis ce qu'elle
**fait** (ses moments, son aura, ses statiques) et ses **paliers**, débloqués ou non.
Elle se redessine à chaque `render()` : ouverte pendant le mode auto, elle suit le combat
au lieu de mentir, et se ferme d'elle-même si l'unité meurt.

Le clic n'**agit** que quand une action est déjà engagée — une carte qui attend sa cible,
une unité qui attend sa victime. Attaquer part donc du bouton de la fiche, où le joueur
voit enfin ce qu'il envoie au combat ; une cible illégale (une Provocation en travers) ne
fait pas perdre le clic, elle ouvre la fiche.

`aurasSur(B, k, u)` (`engine.js`) est ce qui rend la partie « d'où ça vient » possible :
le combat ne garde que le **total** des auras (`refresh()`), pas leurs porteurs. Elle
relit le plateau avec `auraPorte()`, **la même** règle de portée que `refresh()` — deux
copies de cette règle divergeraient fatalement.

## Le bot
`ai.js` garde les 4 priorités du GDD, mais choisit par **valeur** et non par coût :
`cardValue()` compte les râles (× 0.9, ils partent presque toujours), les auras (× ce
qu'elles multiplient), le récurrent (× nombre de tours espérés) et les effets statiques.
`unitThreat()` fait l'inverse côté cible : tuer un porteur d'aura vaut cher, tuer une unité
à gros râle est un cadeau qu'on évite. Une mécanique pas encore codée vaut ~0 : le bot ne
surestime pas une carte qui ne fait rien.

**Sa difficulté est une valeur d'équilibrage** : elle vit dans `BALANCE.ai` (`config/balance.js`),
jamais en dur dans `ai.js`. `misplay` = part de coups au hasard (le GDD en veut : c'est la
marge de progression du joueur) ; `malin` allume la lecture fine — sac à dos sur la main
(deux petites cartes valent souvent mieux qu'une grosse), meilleure attaque du plateau
entier plutôt que la première trouvée, abstention quand tout échange est perdant, retrait
gardé pour une vraie menace, et comparaison allié / sort d'utilité au lieu d'une priorité
Le niveau `montecarlo` ne suit aucune
règle : pour chaque coup possible il **finit la partie** N fois (`cloneBattle` + rollouts)
et garde celui qui gagne le plus souvent — imbattable par les autres (9 parties sur 10),
mais ~50 ms par décision, donc trop lent pour une grosse matrice.

⚠ **Trois raccourcis ont été essayés sur lui, un seul a survécu à la mesure** (le détail
chiffré est dans `BALANCE.ai.niveaux`) : l'**élimination progressive** des candidats gagne
un tiers du temps sans changer la force (50 % en duel direct, parties de même longueur) et
elle est active ; la **troncature** des rollouts et la **politique de rollout au hasard**
rendent le bot myope — il optimise l'estimation au lieu de chercher la victoire, les
parties passent de 13 à 38 tours et le tout finit **3× plus lent**. Leur code est en place
dans `ai.js` et débrayé dans la config : à ne retenter qu'avec une vraie fonction
d'évaluation. `montecarlo-exact` est le cran de sûreté, sans aucun raccourci.

Une rencontre choisit son niveau avec le champ `ia` (`world.js`) : les boss jouent `dur`,
les deux premiers combats `naif`. `botAction(B, k, 'dur')` force un niveau ponctuellement ;
sans rien, c'est `BALANCE.ai.defaut`.

**Le bot dit pourquoi**, si on le lui demande : `ecouteLesChoix(fn)` branche un mouchard,
éteint par défaut, que `botAction` nourrit à **chaque décision où il y avait un choix** —
les candidats, ce que chacun valait, celui qu'il a gardé. Deux précautions tiennent tout :
les coups joués **dans** un rollout de Monte-Carlo ne sont pas notés (`enSondage` : ce sont
des milliers de parties imaginaires, pas des décisions), et la décision elle-même (`decide`,
`coupCherche`) ne sait pas qu'on l'observe — `botAction` est la seule enveloppe qui note.

## Outils d'équilibrage
- `node scripts/check-decks.mjs [niveau] [parties]` — **les erreurs**. Deux passes : les
  règles du builder (via `game/src/config/validate.js`, partagé avec lui — une règle
  ajoutée là s'applique aux deux), puis de vraies parties pour trouver ce qui ne se produit
  jamais : carte qu'aucun mana ne peut payer, carte jamais posée, moment jamais déclenché.
  Les decks **base et switch** de chaque personnage y passent.
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
  `--taille 2` / `--taille 3` (ou `--trio`) pour toutes les équipes de 2 ou 3 héros,
  `--adversaires` pour ne jouer que **les équipes contre les adversaires** (équipes en
  lignes, PNJ en colonnes, ni équipe contre équipe ni PNJ contre PNJ — la ligne « Trio vs
  Adversaires - niv 4 » d'une file), `--bots` pour comparer les niveaux de bot entre eux,
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
  Les parties etant independantes, elles tournent **en parallele sur les coeurs** (un
  worker par coeur, `--jobs N` pour regler, `--jobs 1` pour desactiver) : 16 parties en
  5 s au lieu de 70. Chaque worker depouille sa part et renvoie ses compteurs, qui ne
  sont que des sommes.
  `--rollouts 30` affine l'écart (10 rollouts ne le mesurent qu'à 10 points près),
  `--persos`, `--pnj`, `--niv`, `--switch` choisissent le matchup, `--logs f.txt` écrit
  chaque décision (« T4 Médor — joue Meute 62 % devant : Rappel 55 %, — passer — 41 % »).
- **Tous les cœurs.** `matchups`, `simulate` (et `analyse-cartes`, à sa façon) jouent
  leurs cases en parallèle : `scripts/lib/pool.mjs`, une **file de travail** comme
  `builder/balance-worker.js` (chaque worker redemande une tâche dès qu'il a fini). Une
  tâche est une case ou une combinaison décrite par une **recette**, que le worker
  remonte lui-même (`lib/taches-matchups.mjs`, `lib/taches-courbe.mjs`) : un deck
  mélange est une fonction, il ne traverse pas un `postMessage`. Les résultats
  reviennent **dans l'ordre** : l'affichage n'a pas changé. `--jobs N` règle le nombre de
  workers (défaut : un par cœur), `--jobs 1` rejoue sans worker, pour déboguer. Mesuré
  sur le PC avec 3 workers (les cœurs du Pi, moins un) : matrice 400 parties/case en
  mélange 20 s → 8 s, courbe à 40 parties 16 s → 7 s.
- **La progression** passe par `scripts/lib/progression.mjs` : une ligne réécrite en
  terminal ; lancé par le serveur (variable `ADVENTURE_PROGRESSION`), des
  lignes-marqueurs `@@progression 12/351` que `/api/run` retire de la sortie et rend en
  chiffres — la barre de « Lancer un calcul », le pourcentage de l'Atelier. Un outil qui
  n'en émet pas reste simplement « en cours ».
- `game/src/tools/arene.js` — le socle commun (monter un camp, jouer une partie, une série,
  Wilson, les cibles 33/50/66). Il vit dans `game/` et pas dans `scripts/` **parce que la
  page du builder l'importe aussi** : une seule implémentation, donc les mêmes chiffres en
  ligne de commande et dans l'outil. Tout nouvel outil de mesure passe par là.

## Dossiers
- `game/` — le prototype jouable. `src/config/` = game config (dont `npcs.js`, qui résout
  les adversaires, le catalogue de cartes et la pile de fatigue, et `validate.js`, les règles de validation
  partagées avec le builder), `src/combat/` = moteur + bot, `src/tools/` = l'arène de mesure,
  `src/ui/` = écrans, `data/` = données générées par le builder.
- `builder/` — le Card Builder, `overview.html` (vue d'ensemble) et `balance.html`
  (matrice des matchups), `lancer.html` (lancer un calcul sur le serveur), `accueil.html` (l'Atelier, l'app qui les réunit). Pages autonomes : aucune dépendance, elles importent seulement
  les modules de `game/src/`.
- `launcher/` — source C# du lanceur Windows (compilé avec le csc.exe fourni par Windows, cf. `scripts/build-exe.ps1`).
- `scripts/` — serveur de dev, bancs de test, outils d'équilibrage (`check-decks`,
  `matchups`, `simulate`), `gen-sprites.mjs` (la liste des images), `lib/brouillon.mjs` (fait mesurer le brouillon aux outils), `lib/arene.mjs`
  (socle commun), build de l'exe.
- `docs/GDD.md` — game design doc complet.
- `mockups/` — mockups de cartes (placeholders, pas la direction artistique finale).
- `Characters/` — sprites de personnages (animaux : chien, chat, corbeau, renard, grenouille, chouette, lapin, panda roux, paresseux...).
- `Machines/` — sprites de bâtiments/machines de production (fermes, ateliers...).
- `Ressources/` — sprites de ressources récoltées/produites, par tiers de rareté (1 à 6).
- `UI/` — sprites d'interface (pièces, coffre, arbre, dé...).
- `V2/` — itération plus récente d'assets (bâtiments, ressources, refs) — vérifier avec l'utilisateur si V2 remplace les dossiers ci-dessus ou les complète.
