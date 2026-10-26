# scripts/lib/ — les briques partagées des scripts et du serveur

> Modules purs ou presque, importés par `scripts/devserver.js`, `scripts/renfort.mjs` et les outils. Aucun n'a de dépendance externe.

## Le calcul réparti (file de tâches, renforts)
| Fichier | Rôle |
|---|---|
| `pool.mjs` | **`enParallele(module, contexte, tâches)`** : file de travail sur tous les cœurs + les renforts (paquets qui rapetissent vers la fin ; un renfort qui lâche ne perd rien). |
| `ouvrier.mjs` | Un worker du pool : charge le module de tâches, le prépare une fois, joue les tâches reçues. |
| `renforts.mjs` | Côté Pi : la liste des machines, leur sondage, l'**empreinte du code** (`empreinte()`, fichiers `.js` de `game/src/{combat,config,tools}` + `taches-*.mjs` + `game/data/feuille.data.js`, qui change les PV et le mana), l'envoi des paquets (`joueLot`). |
| `renfort-lot.mjs` | Côté renfort : un paquet joué dans un processus neuf, avec le crochet du brouillon. |
| `taches-matchups.mjs` / `taches-courbe.mjs` / `taches-analyse.mjs` / `taches-controle.mjs` | Les **modules de tâches** (`prepare(contexte)` + `joue(tâche)`, résultat en JSON) de `matchups`, `simulate`, `analyse-cartes`, `check-decks`. Un nouveau `taches-*.mjs` est reconnu tout seul par les renforts. |
| `progression.mjs` | La barre de progression d'un calcul (terminal, ou ligne-marqueur `@@progression` pour le serveur). |
| `brouillon.mjs` | Crochet de chargement : fait mesurer le **brouillon du builder** aux outils sans les modifier (`ADVENTURE_BROUILLON`). |

## L'Atelier : calculs rangés, versions, IA, notifications
| Fichier | Rôle |
|---|---|
| `archives.mjs` | Les **calculs rangés** sur la clé USB du Pi (dossier par calcul, rouvrir, commenter). |
| `versions.mjs` | Les **versions du jeu** (photos de `characters.data.js`, filet automatique, restauration par entité). |
| `diff-donnees.mjs` | La différence entre deux états des données, par identité et par clé (module pur, partagé avec `builder/versions.html`). |
| `kpi.mjs` | Relit la **sortie texte** d'un calcul pour en tirer des chiffres (⚠ parsing : doit suivre le format des outils ; `test-versions.mjs`). |
| `ia.mjs` | L'**analyse par une IA locale** (Ollama) : machines, consigne, dialogue. |
| `feuille.mjs` | **La Google Sheet « Config Adventure-Cards »** : jeton d'un compte de service signé avec `node:crypto` (clé `~/.adventure-card/google-sa.json`, projet Google Cloud `adventure-c`, feuille partagée en lecteur), lecture des onglets (valeurs brutes), règle du `~`, aperçu et écriture de `game/data/feuille.data.js`. Utilisé par `scripts/sync-feuille.mjs` et `/api/feuille`. |
| `push.mjs` | Web Push sans dépendance (RFC 8291/8292, `node:crypto`). Clés et abonnements dans `~/.adventure-card/push.json`, **jamais dans le repo**. |
| `chrome.mjs` | Piloter le Chrome/Edge/Chromium installé **sans écran et sans dépendance** (protocole DevTools, WebSocket natif de Node ≥ 22, profil jetable, WebGL par SwiftShader) : `lanceChrome()`, `page(url)`, `evalue(expr)`. `ADVENTURE_CHROME` pour un autre exécutable. |
| `statique.mjs` | Un serveur de fichiers en lecture seule sur un port libre de la boucle locale, le temps d'un rendu (sans cache). |
| `png.mjs` | Lire un PNG sous Node (8 bits, RGBA/RGB/gris/palette) et en écrire (RGBA : `encodePng`, `ecrisPng`) : les outils du rig touchent des pixels. |
| `publie-images.mjs` | **Les images du PC jusqu'au Pi** (« Actualiser les images » dans l'Atelier du Pi) : `publieImages()` côté PC (appelé par le renfort), `recupereImages()` côté Pi (appelé par `/api/sprites`). Voir « Les images du PC » plus bas. |
| `sam.mjs` | **La découpe automatique (SAM 2)** : les réglages (`~/.adventure-card/sam.json` : `exporter`, `reseau` = le tailnet qui complète un nom court en `nom.reseau`, `points`, `machines` [{ nom, port, actif }]), `valideReglages` (noms, ports, 8 machines au plus), `cibles` (sans export : `127.0.0.1:7340` ; avec : les machines actives), `sonde`/`etat` (`GET /etat`) `segmente` (le PNG part à la **première machine qui répond**) et `detecte` (`tailscale status --json` de la machine du serveur, puis `GET /etat` du port SAM sur chaque machine en ligne ; le nom gardé est celui du **DNS** : `mon-mien`, pas `Mon_Mien`). Appelé par les routes `/api/sam*` de `devserver.js` ; la machine fait tourner `scripts/sam-serveur.py`. |
| `rig-fichiers.mjs` | Écrire un JSON du rig avec la mise en forme de l'Atelier (`builder/rig/json.js`), en gardant ses fins de ligne. |

## Données de génération
| Fichier | Rôle |
|---|---|
| `heros-v2-paliers.mjs` | Les paliers des six héros V2 (utilisé par `scripts/gen-heros-v2.mjs`). |
| `cartes-adversaires.mjs` | Les **44 cartes des adversaires** (`CARTES_ADVERSAIRES`) et les decks des 9 adversaires du builder (`DECKS_ADVERSAIRES`), utilisés par `scripts/gen-heros-v3.mjs` (conception : `docs/CARTES-ADVERSAIRES.md`). |
| `heros-v3-paliers.mjs` | Les paliers des six héros V3, recopiés de `docs/V3-HEROS.md` niveau par niveau (utilisé par `scripts/gen-heros-v3.mjs`). |

## Règles
- Réglages et secrets des machines : `~/.adventure-card/` (`calcul.json`, `ia.json`, `archives.json`, `push.json`, `versions/`) — **jamais dans le repo** (il est public).
- Un module de tâches rend du **JSON pur** (ni `Map`, ni `Set`, ni fonction) : il traverse un `postMessage` puis le réseau. `test-partage.mjs` le vérifie.

---

# Le détail

## Les calculs rangés (la clé USB du Pi)
Un calcul fini **ne se refait plus** : quand une file se termine, le serveur l'écrit sur
le disque choisi — la clé USB branchée sur le Pi — et la page la **rouvre** telle quelle.
Une matrice trio, c'est des dizaines de milliers de parties : elle ne vaut pas d'être
rejouée pour relire un chiffre trois semaines plus tard.

- **Un dossier par calcul**, lisible sans l'Atelier (la clé se rebranche sur un PC) :
  `calcul.json` (ce que le serveur doit retrouver), `recapitulatif.txt` (les résumés,
  l'analyse et le dialogue, en clair) et un `NN-….txt` par ligne — la sortie brute, telle
  que le terminal l'a écrite.
- **Rouvrir** (`POST /api/archives/charger`) remet ce calcul dans la file affichée, sans
  rejouer une partie : on relit les sorties ligne par ligne, on copie le récapitulatif, et
  l'**IA reprend le dialogue** là où il s'était arrêté — la conversation entière part avec
  le calcul. Refusé tant qu'une file tourne (elle serait remplacée).
- **Ranger n'est jamais bloquant** : une clé absente ou pleine se journalise, comme une
  notification refusée. Le rangement est réécrit quand l'analyse se termine et à chaque
  question, sinon la clé garderait les chiffres sans ce qu'on en a dit.
- **Où** : `~/.adventure-card/archives.json` sur la machine du serveur, **jamais dans le
  repo**, édité dans « Lancer un calcul » (« Où ranger »). Sans réglage, on prend la
  première clé montée (`/media`, `/mnt`, `/run/media`) ; à défaut `~/.adventure-card/calculs`
  — ranger ne doit pas dépendre d'une clé branchée.
- Comme `/api/run`, ce n'est **pas doublé en C#** : l'exe sans Node n'a pas ces routes, et
  la page cache alors la section entière.

⚠ **Une clé débranchée laisse son dossier derrière elle** : sous Linux, `/media/…` existe
encore quand plus rien n'y est monté, et on remplirait la carte SD sans le voir. Le réglage
garde donc le **point de montage**, vérifié dans `/proc/mounts` à chaque écriture : clé
absente, rien n'est écrit et la page le dit.

⚠ **Raspberry Pi OS Lite ne monte rien tout seul** (pas de bureau, pas d'automontage) : la
clé demande une ligne dans `/etc/fstab` (par `UUID`, avec `nofail`), sinon elle est branchée
sans être là.


## Les versions du jeu (retour en arrière, commentaires, mesures)
`builder/versions.html` — **des états nommés des cartes** (« V0.3 : Modification Chat & Archétype
Oiseau »), avec ce qui a changé, ce qu'on en dit, les chiffres de la mesure qui lui correspond, et
le moyen d'y revenir. Une **version est une photo complète** de `game/data/characters.data.js` ; le
« qu'est-ce qui a changé ? » **n'est jamais stocké**, il se recalcule en comparant deux photos
(`scripts/lib/diff-donnees.mjs`, module pur importé par la page et le serveur) — par **identité**
(un héros, une carte, un adversaire, la fatigue) et par **clé** (un palier se retrouve par son
niveau, une ligne de deck par sa carte), jamais par ligne de texte.

- **Stockage** (`scripts/lib/versions.mjs`) : `~/.adventure-card/versions/` (`ADVENTURE_VERSIONS`),
  **jamais dans le repo** ; un dossier par version, `version.json` (titre, commentaires, mesures)
  + `donnees.js` (le fichier tel quel : on peut le recopier à la main dans `game/data/`).
- **Le filet de sécurité** : `POST /api/write` sur `characters.data.js` garde d'abord l'état qu'il
  va écraser, en **photo automatique** (une fois par état : même empreinte = rien d'ajouté ; 60 au
  plus, les nommées et les commentées ne sont jamais purgées). C'est ce qui aurait sauvé les six
  V2 effacées par un onglet périmé du builder. Il ne bloque jamais l'écriture.
- ⚠ **Il n'y a PAS de garde contre l'onglet périmé** (refuser d'écrire si le builder est parti d'une
  vieille lecture) : le builder lit le fichier par import de module, pas en texte, il faudrait
  modifier `applyToGame`. Le filet récupère l'ancien état, il n'empêche pas l'écrasement.
- **Revenir en arrière** (`POST /api/versions/restaurer`) : tout le jeu, ou **un seul élément**
  (`cle` = `carte:<id>`, `hero:<id>`, `pnj:<id>`, `fatigue`, `reglage:<nom>`). Le serveur calcule
  d'abord (une erreur n'écrit rien), photographie l'état actuel, puis écrit. Rétablir un héros rend
  ses statistiques et garde ses cartes (elles ont leur propre entrée) ; un héros retiré revient
  avec toutes les siennes. Propriété testée : rétablir un à un tout ce qui diffère redonne
  l'original, ordre compris.
- **Les mesures** (`scripts/lib/kpi.mjs`) : « Lier un calcul » relit la **sortie texte** d'un calcul
  rangé (`matchups` → matrice, force, écrasants, taux par héros ; `analyse-cartes` → cartes
  préférées/boudées) et garde les chiffres **avec la version** : le calcul peut quitter la clé.
  ⚠ C'est du **parsing de texte** : si un outil change sa mise en forme, `kpi.mjs` doit suivre —
  `node scripts/test-versions.mjs` rejoue des sorties types et casse si ça dérive.
- Pas doublé en C# (Node seulement, comme `/api/run`) : sans Node la page le dit.
- Banc : `node scripts/test-versions.mjs` (44 tests, dossier temporaire, serveur sur port libre,
  ne touche ni `~/.adventure-card` ni le fichier du jeu).
- Une IA qui reprend ce travail : **« Copier le journal des changements »** sort en Markdown le
  titre, la description, les changements, les commentaires et les mesures d'une version.


## Les renforts : les PC calculent aussi
Un calcul lancé sur le Pi **ne tourne plus seulement sur le Pi** : chaque PC qui fait
tourner `node scripts/renfort.mjs` en prend sa part, **en même temps**, case par case —
même une seule ligne de file se partage entre toutes les machines. Pour mémoire, le PC
fixe fait seul une matrice trois fois plus vite que le Pi (31 s contre 99 s).

- **Même logique que l'analyse** : une liste de machines (« Machines de calcul
  (renforts) » dans « Lancer un calcul », `~/.adventure-card/calcul.json`, jamais dans le
  repo), sondées à chaque calcul (`GET /etat` du renfort) ; une machine éteinte est
  sautée. La sortie du calcul dit qui a aidé (« Renforts : PC (16 cœurs) · écartés : … »)
  et combien de cases chacun a jouées (« Répartition : … »).
- ⚠ **Une machine se désigne par son nom Tailscale, et ce nom peut changer** — renommer un
  PC sous Windows renomme sa machine Tailscale. Le Pi ne trouve plus alors le nom écrit
  dans ses réglages, et la sortie dit seulement « injoignable (renfort lancé ? pare-feu ?) »
  alors que le renfort tourne. Premier réflexe : depuis le Pi, `curl http://<nom>:7331/etat`
  (« Could not resolve host » = c'est le nom), et `tailscale status` pour le nom actuel.
  Le même nom sert à l'**analyse par l'IA** (`~/.adventure-card/ia.json`, port 11434) :
  les deux réglages sont à corriger ensemble. Arrivé le 8 octobre 2026 (le PC fixe,
  renommé) : aucun calcul n'avait plus de renfort PC, et l'analyse ne passait plus par lui.
- **Une seule file** (`enParallele()`, `scripts/lib/pool.mjs`) : les cœurs du Pi et les
  renforts y puisent. Un renfort reçoit des **paquets** taillés sur ses cœurs (deux tâches
  par cœur au plus), qui rapetissent vers la fin pour qu'aucune machine ne garde les
  dernières cases pendant que les autres attendent. Ses résultats reviennent au fil de
  l'eau (une ligne JSON par tâche), avec un signe de vie toutes les 10 s.
- ⚠ **Un renfort qui lâche ne perd rien** : ce qu'il n'a pas rendu revient dans la file
  (une minute sans nouvelles = perdu), et c'est pour ça qu'un worker du Pi sans travail
  **attend** au lieu de s'arrêter tant que des cases sont dehors. Testé : un renfort coupé
  en plein calcul, le calcul finit complet.
- ⚠ **Le même code et les mêmes cartes, sinon des chiffres faux sans le dire.** Une
  empreinte des fichiers que jouent les tâches (`game/src/combat`, `config`, `tools`,
  `scripts/lib/taches-*.mjs`, fins de ligne ramenées à `\n` — Windows et le Pi n'ont pas
  les mêmes) doit être celle du Pi : un PC pas à jour est écarté (« pas le même code (git
  pull) »), et c'est revérifié à chaque paquet. Les cartes mesurées (le brouillon, ou le
  fichier du jeu) partent **en JSON** avec chaque paquet ; le renfort écrit lui-même le
  module et joue le paquet dans un processus neuf (`scripts/lib/renfort-lot.mjs`, avec le
  crochet du brouillon). Il n'exécute jamais de code reçu et ne joue que les modules de sa
  liste blanche — **celle-ci se découvre toute seule** : ce sont les
  `scripts/lib/taches-*.mjs` qu'il a sur son disque (`modules()`), relus à chaque demande.
  Un outil écrit demain est donc partagé sans qu'on tienne une liste à jour, et sans rien
  relâcher : il ne charge jamais que ses propres fichiers, et l'empreinte les couvre tous.
- ⚠ **Un `git pull` ne relance pas le renfort**, et c'est le piège qui suit le précédent :
  le processus tourne toujours sur son ancien code alors qu'il annonce la **bonne**
  empreinte de calcul — elle se relit sur le disque. Il était donc accepté, puis refusait
  le paquet (« module refusé »), et le calcul finissait sans lui. Il compare maintenant le
  code **qui reçoit** (`renfort.mjs`, `renforts`, `pool`, `renfort-lot`, `ouvrier` :
  `empreinteDuRenfort()`) à ce qu'il valait à son lancement, le dit dans `/etat`
  (`aRedemarrer`) et refuse d'avance : la page affiche « relancer le renfort sur cette
  machine » au lieu d'un paquet perdu. Sur un PC : arrêter puis relancer la tâche
  planifiée — **depuis la session de l'utilisateur**, jamais par SSH (elle mourrait à la
  déconnexion). Modifier des cartes ou le moteur, en revanche, ne demande qu'un `git pull`.
- **Ouvrir un PC** : comme pour Ollama, une règle de pare-feu entrante TCP 7331 limitée à
  `100.64.0.0/10`, et le renfort lancé à l'ouverture de session. Il faut Node et le
  projet à jour sur le PC. Sans ça, qui joint le port peut occuper ses cœurs.
- **Tout ce qui joue des parties passe par la file** : `matchups`, `simulate`,
  `analyse-cartes` et `check-decks`. Les bancs, eux, ne jouent pas de séries — ce sont des
  tests, ils restent sur place. `--jobs 1` rejoue sans worker ni renfort.


## Les images du PC : « Actualiser les images » depuis l'Atelier du Pi
Le game designer dépose ses images **sur le PC**, mais l'Atelier qu'il ouvre est **celui du Pi** : le bouton ne
relisait que les dossiers du Pi, et une image neuve n'y apparaissait jamais (25 oct. 2026). Git sert de transport :

1. le serveur du Pi (`/api/sprites`) appelle `POST /images/publie` du **renfort du PC** — l'adresse est dans
   `~/.adventure-card/images.json` (`{ "pc": "http://monpc:7331" }`, hors du dépôt) ; sans ce fichier, rien ne
   change (c'est le cas du PC lui-même) ;
2. le PC (`publieImages`) : refuse s'il a des commits pas poussés (ils partiraient avec) ou une fusion en cours,
   se met à jour (`fetch` + avance rapide), refait la liste et les vignettes (`gen-sprites.mjs`), puis commite
   **seulement** les images de `Graphical Assets/{Characters,Cards,Buildings,Ressources,Old UI,Icons,CardBack}`,
   les packs `Decor/`, `game/data/{sprites,vignettes}.js` et `game/vignettes/` (`git commit --pathspec-from-file` :
   le reste de l'index n'est pas pris ; une archive `.rar` posée à côté non plus), et pousse ;
3. le Pi tire (`git pull --ff-only` : ses cartes en attente ne gênent pas, le commit ne les touche pas), puis
   relit ses dossiers **sans refaire les vignettes** (elles arrivent du PC ; refaites ici, un autre Pillow
   donnerait d'autres octets, et le prochain tirage serait bloqué).

Chaque étape s'affiche dans la barre du Card Builder (« Le PC range ses images… », « Vignettes (PC) : 12 / 283 »,
« Le Pi récupère les images… »), et le bilan dans le message de fin (`majSprites.message`). **Rien ne bloque le
bouton** : PC éteint (« PC injoignable »), commits pas poussés, tirage refusé — il le dit, puis relit les
dossiers du Pi comme avant. ⚠ Le renfort doit tourner sur le PC **et être relancé** après un changement de
`publie-images.mjs` ou `gen-sprites.mjs` (ils sont dans `empreinteDuRenfort()`) ; un vieux renfort répond 404,
et le message le dit. ⚠ Qui joint le port 7331 peut donc faire pousser les images du PC : le pare-feu le limite
au tailnet.

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
