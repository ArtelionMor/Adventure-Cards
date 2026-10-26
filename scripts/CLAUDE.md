# scripts/ — serveur de dev, outils de mesure, bancs de test, générateurs

> Tout est du Node sans dépendance (`.mjs`) sauf `devserver.js`, les `.ps1` et `gen-art.py` (Python : Pillow, numpy, scipy). Les briques partagées sont dans `lib/` (voir `lib/CLAUDE.md`).
> `devserver.js` fait ≈ 900 lignes et `test-triggers.mjs` ≈ 3 600 : **Grep**, ne les lis pas en entier.

## Le serveur
| Fichier | Rôle |
|---|---|
| `devserver.js` | **Le serveur** (le même sur le PC et sur le Pi, port 7330) : sert la racine du projet ; `POST /api/write` (le builder écrit `characters.data.js` et `docs/MECANIQUES-A-CODER.md`, avec photo automatique avant écrasement), `POST /api/sprites` (en fond : `GET /api/sprites/etat` dit où il en est, pour la barre de chargement du Card Builder ; **sur le Pi, va d'abord chercher les images du PC** — `lib/publie-images.mjs`, réglage `~/.adventure-card/images.json`), `/api/run*` (la file de calculs : pause/reprise/arrêt, analyse IA, dialogue), `/api/archives*` (calculs rangés), `/api/versions*` (versions du jeu), `/api/sam*` (la découpe automatique : relaie le PNG d'un personnage à une machine à carte graphique, `lib/sam.mjs`), `GET/POST /api/rig` (les personnages animés de `game/data/rigs/`, PNG compris ; liste blanche `RIG_FICHIERS`, pas doublée en C#), les routes push. Liste blanche des outils lançables : `OUTILS`. ⚠ écoute sur toutes les interfaces, sans mot de passe : ne jamais l'exposer à internet. |
| `sync-feuille.mjs` | **Le « patch » de la config** : lit la Google Sheet « Config Adventure-Cards » et écrit `game/data/feuille.data.js` (`--apercu` : dit ce qui changerait, n'écrit rien). **À lancer sur le Pi** (la clé du compte de service y est : `~/.adventure-card/google-sa.json`, hors dépôt). Onglets/colonnes/lignes en `~` ignorés. Même logique que `GET/POST /api/feuille`. |
| `renfort.mjs` | **Le renfort** (port 7331) : une machine qui joue une partie des cases d'un calcul du Pi. Voir `lib/CLAUDE.md`. Il **publie aussi les images** du PC quand l'Atelier du Pi les actualise (`POST /images/publie`, `?essai=1` pour voir sans rien envoyer) : `lib/publie-images.mjs`. |

## Les outils de mesure (tous passent par la file commune `lib/pool.mjs` : tous les cœurs **et** les renforts)
| Fichier | Rôle |
|---|---|
| `matchups.mjs` | Matrice deck contre deck (`--taille 3`/`--trio`, `--pnj`, `--adversaires`, `--archetypes`, `--mix`, `--fort`…). |
| `simulate.mjs` | **Courbe de difficulté** : toutes les équipes contre chaque rencontre du monde (`--paliers 3,3,3`). `--niveau 1` force le niveau des héros sur tous les paliers (« toutes les arènes faisables au niveau 1 ») ; `--arene N` joue les ennemis au niveau d'arène N (profil de `config/ennemis.js`). |
| `check-decks.mjs` | **Les erreurs** : règles de `config/validate.js` puis vraies parties (carte jamais jouée, moment jamais déclenché). |
| `analyse-cartes.mjs` | Ce que le bot a préféré, par carte, et pourquoi (écart contre le meilleur coup). |
| `audit-paliers.mjs` | Audit des paliers de niveau (aucune partie jouée) — voir `docs/GRAMMAIRE-DES-PALIERS.md`. |

## Les bancs de test (`node scripts/<nom>.mjs`)
| Banc | Ce qu'il garde | À lancer quand |
|---|---|---|
| `test-triggers.mjs` | **769 tests** du moteur : moments, auras, mécaniques, couture builder → moteur | tout changement de `game/src/combat/` ou du registre |
| `test-ai.mjs` | 53 : le bot valorise-t-il ces mécaniques | idem |
| `test-evenements.mjs` | ≈ 3 900 : le récit en données ne change pas la partie et est complet | tout changement d'`engine.js` |
| `test-partage.mjs` | 60 : les outils passent par la file commune ; une action passe par `joue()` | tout nouvel outil ou nouvelle boucle de partie |
| `test-journal.mjs` | ≈ 3 700 : le journal de décisions est relisible ⚠ **instable** (≈ 1 passage sur 3 échoue sur 2 vérifications aléatoires : un coup sur une carte *fabriquée*, un combat de plus de 400 lignes) | après `journal.js` |
| `test-rejeu.mjs` | ≈ 120 (20 parties) / ≈ 240 (40) : un combat enregistré (`combat/rejeu.js`) et rejoué après un passage par JSON finit **exactement** comme l'original (vainqueur, tours, PV, plateaux, mains, défausses, récit), aussi coupé au début d'un tour puis repris ; dans les conditions du jeu (bot au vrai hasard, aperçus joués à blanc, journal de décisions allumé une partie sur deux) | après `combat/` ou `ui/battle.js` (enregistrement) |
| `test-situations.mjs` | 321 : chaque fiche de situation se monte | après un changement de **cartes** |
| `test-quetes.mjs` | ≈ 130 : le fil de quêtes est valide (identifiants, objectifs, héros et arènes qui existent, un héros donné avant d'être demandé), une partie neuve déroule le tutoriel jusqu'au bout, une sauvegarde d'avant les quêtes le saute, la taille minimale du deck suit les places ; « tout débloqué » (`BALANCE.toutDebloque`) rend les héros alignables sans rien écrire ni toucher au tutoriel, et « passer le tutoriel » (la triche) finit sur Médor. Aucune partie jouée. | après `config/quetes.js`, les quêtes de `state.js`, `possede` ou `passeLeTutoriel` |
| `test-courbes.mjs` | 40 : les six promesses du modèle de courbes | après `config/courbes.js` |
| `test-vfx.mjs` | 2 938 : chaque carte des héros a **sa** signature de VFX (`ui/vfx.js` ; une carte d'adversaire peut en avoir une, son identifiant est cherché dans le catalogue), toutes différentes, cohérentes avec ses moments (entrée, râle, tour, règle, attaque, aura), briques existantes et décrites, et **aucune qui ment** (traînée ⇔ Charge, fantôme ⇔ Passe-Murailles, venin ⇔ Venin, pièces ⇒ mana…). Aucune partie jouée. | après `ui/vfx.js`, et après avoir **ajouté ou renommé une carte** |
| `test-versions.mjs` | 44 : diff, restauration par entité, lecture des chiffres | après `lib/versions.mjs`, `diff-donnees.mjs`, `kpi.mjs` |
| `test-images.mjs` | 11 : les chemins d'images (`config/images.js`) — nom retrouvé, voisines qui tranchent, ambigu signalé et pas deviné dans le builder, illustration attachée par le nom, validation ; puis **aucune image introuvable** dans `characters.data.js`. | après `config/images.js`, et après avoir **rangé, déplacé ou renommé des images** |
| `test-push.mjs` | l'exemple de la RFC 8291, au bit près | après `lib/push.mjs` |
| `test-rig.mjs` | 53 + 1 par personnage : squelette, IK à 2 os (atteint la cible, côté du pli, hors de portée, mal formée), (repos, rotation transmise, échelle non transmise, x/y dans les axes de l'image), clips (clés, boucle, courbes, périodicité de tout un clip, ressort, événements, fondu), maillage et poids (géodésiques : un bras ne tire pas l'autre à travers le vide ; la portée ; les os d'un calque maillé), étirement, le découpage (masque d'un polygone, lissage, accroche, inclure le trait, extraire sans rien perdre, extraire en calque, fusionner vers le bas, renommer, combler provisoirement, enregistrer puis relire), les zones à combler (la lignée), chaque code du validateur, JSON, PNG, GIF ; puis **chaque personnage de `game/data/rigs/` passe le validateur sans erreur**. | après `game/src/rig/`, `builder/rig/`, et après avoir écrit un clip |

## Les générateurs et outils ponctuels
| Fichier | Rôle |
|---|---|
| `gen-sprites.mjs` | Réécrit `game/data/sprites.js` (liste des images de `Graphical Assets/{Characters,Cards,Buildings,Ressources,Old UI}/`, **sous-dossiers compris**, et des packs `Decor/<pack>/`), puis lance `gen-vignettes.py` (`vignettes()` en ligne de commande, `genereSpritesEnFond(progres)` pour le serveur : sans bloquer, en lisant ses lignes `@@progression k/n` : `python3` puis `python`, le premier qui importe Pillow — le `python3` du Microsoft Store est sauté ; sans Python ni Pillow, il le dit et le jeu garde les originaux). **Doublé en C#** (`GenereSprites()` dans `launcher/Launcher.cs`) : les deux doivent produire le même fichier — ⚠ le serveur intégré de l'exe (sans Node) ne refait pas les vignettes. |
| `gen-vignettes.py` | **Les versions allégées des images** (Python + Pillow) : pour chaque image de `sprites.js` dans `Graphical Assets/{Characters,Cards,Buildings,Ressources,Old UI}/`, une copie WebP de 512 px au plus côté dans `game/vignettes/`, et leur liste dans `game/data/vignettes.js` ; plus les grandes images d'interface (≥ 100 Ko) de `Graphical Assets/Icons/` et `Graphical Assets/CardBack/`, à 256 px (`INTERFACE`). Seules les images nouvelles ou modifiées sont refaites (`--tout` : tout). **Une vignette dont l'original a disparu est gardée** tant que `sprites.js` liste l'image (un rangement sur le disque ne vide pas la liste d'un coup). ~21 Mo pour ~545 images. **Fait le ménage** : une vignette qu'aucune image ne réclame plus (image rangée ailleurs) est retirée. Encodage WebP en `method=4` : en 6, une carte prenait 3,3 s au lieu de 0,05 s (121 cartes = 7 min d'attente sur « Actualiser les images »). |
| `gen-art.py` + `art-sujets.json` | **L'image d'une carte, du nom au PNG détouré** (Python). Lit l'export « cartes-niveau-N-….json » de l'Atelier (`--liste`), écrit le prompt (gabarit « Dans le style graphique des images, sur un fond rose, dessine… » + portraits de `Graphical Assets/Characters/` en références), demande des variantes à l'API Gemini (`GEMINI_API_KEY`, API Interactions, modèle `gemini-nano-banana-2.1`), **détoure le rose en local** (remplace Icons8) et signale les rendus ratés (sujet coupé, fond pas uni, zone rose gardée). Sorties dans `art-sortie/<id>/` (ignoré par git) + `planche-NN.png` ; `--choisir "<carte>" <n>` copie le PNG dans `Graphical Assets/Characters/<dossier de l'espèce>/<Espèce> <Carte>.png`. `--etat`, `--a-blanc` (prompts sans appel), `--verifier` (autocontrôle sans réseau), `--prompts f.md` (écrit **tous** les prompts à copier-coller : `docs/PROMPTS-IMAGES-CARTES.md`), `--detourer <fichier|dossier>` (détoure des images prises à la main dans Gemini, sans API), `--references` (range les **10 mêmes images de référence, SÉPARÉES**, dans `art-sortie/references-style/` : dans Gemini, « + », Importer des fichiers, Ctrl+A). ⚠ Le gabarit est **exactement** « Dans ce style graphique, sur fond rose, dessine … » : toute consigne ajoutée (« autocollant », « de face », « marge »…) a fait dériver le style. ⚠ **Jamais de planche** (les références fondues en une image) : avec UNE image jointe Gemini la modifie (il repeint le fond et pose le personnage dessus, planche rose ou blanche) ; avec PLUSIEURS il crée une image neuve d'après leur style. Un navigateur ne copie qu'une image à la fois, et coller 10 fichiers (lanceur Windows `Set-Clipboard`) n'a pas marché dans Gemini : on joint par le dialogue de fichiers, ou par un Gem (10 fichiers de connaissances, à tester). Le **sujet** de chaque carte se décide à la main dans `art-sujets.json` (clé = id) : sans sujet, la carte est sautée. N'écrit jamais `characters.data.js`. ⚠ La requête n'a pas encore été éprouvée avec une vraie clé. |
| `gen-clairiere.mjs` | **Le décor des fonds de combat** — l'étang (`nenuphar`, `nenuphar-fleur`, `eau`) et la clairière (maquette du skin `cozy`, 21 oct. 2026) : dessine en SVG, dans le style des personnages (aplats, reflet, ombre portée) mais **moins cerné que les cartes** (« trop de détails », game designer : trait vert sombre de 4, rien dans les cimes, touffes et fleurs sans contour), les cimes vues d'en haut (`chene`, `chene2`, `pommier` : contour festonné ; `sapin` : étoile), un `buisson` fleuri et la tuile du sol (`sol.svg` : touffes et fleurs). Hasard à graine fixe : le même dessin à chaque fois. `node scripts/gen-clairiere.mjs game/skins/cozy`. Des **bouche-trous** : le dessin final viendrait de `gen-art.py`. |
| `repare-images.mjs` | **Après un rangement des images** : recolle les chemins de `characters.data.js` (`--ecrire` ; sans, il dit ce qu'il ferait) et attache leur illustration aux cartes qui n'en ont pas quand leur deck contient un fichier à leur nom. Pour un cas douteux il pèse deux indices : le **dossier du deck** (compte double) et le **même dessin** qu'avant (git `HEAD`, compte simple) — un fichier renommé ou deux noms intervertis gardent leur dessin, un nouveau dessin posé exprès dans le deck l'emporte. ⚠ `characters.data.js` vit sur le Pi : `git status` là-bas d'abord. |
| `gen-icones.ps1` | Décline `Graphical Assets/Icons/Icon.png` en icônes de l'Atelier (`builder/icons/`). |
| `gen-heros-v2.mjs` | Écrit les six héros V2 dans `characters.data.js` (⚠ écrase leurs retouches ; paliers dans `lib/heros-v2-paliers.mjs`). |
| `gen-lapins.mjs` | Écrit les **trois Lapins du tutoriel** (Pompon, Caramel, Séléné : 5 + 5 cartes et leurs paliers, `docs/TUTORIEL.md`) dans `characters.data.js`, en tête des héros, et le départ d'une partie (`starters` = Pompon seul), et **les Souris du Potager** (l'adversaire `rabbit1` : 6 cartes `adv_souris_*`, son deck). Chaque carte prend son illustration : une image à son nom sous `Graphical Assets/Cards/`, sous-dossiers compris (de préférence `Rabbit Decks/`), sinon celle qu'elle avait si elle existe encore, sinon le portrait du héros. ⚠ Écrase leurs retouches faites dans l'Atelier : à relancer **sur le Pi** si des cartes y sont en attente. |
| `gen-heros-v3.mjs` | Écrit aussi les **44 cartes des adversaires** (cartes libres `adv_…`) et les decks des 9 adversaires du builder (`lib/cartes-adversaires.mjs`, `docs/CARTES-ADVERSAIRES.md`). Écrit les **six héros V3** (`docs/V3-HEROS.md`) dans `characters.data.js` **et** déclare dans `customMechanics` les mécaniques pas encore codées (aucune depuis le 12 octobre : le Registre était la dernière), puis réécrit `docs/MECANIQUES-A-CODER.md` au format du builder (⚠ écrase leurs retouches ; paliers dans `lib/heros-v3-paliers.mjs`). À relancer **sur le Pi** si des cartes y sont en attente. |
| `dump-data.mjs` | One-shot historique : extraire les cartes codées en dur vers `characters.data.js`. |
| `build-exe.ps1` | Compile `launcher/Launcher.cs` en `AdventureCard.exe` (csc.exe de Windows). |
| `build-widget.ps1` | Construit l'APK du widget Android et le dépose dans `builder/telechargements/`. |
| `rig-valide.mjs` | **Le validateur d'animation** : `node scripts/rig-valide.mjs <id> [clip…] [--json]` — erreurs, alertes et **mesures** (amplitude par os, déplacement, étirement du contour, couture). Sortie 1 s'il y a une erreur. |
| `rig-rendu.mjs` | **Le rendu d'un clip sans écran** (Chrome installé, `lib/chrome.mjs` + `lib/statique.mjs`, page `builder/rig/rendu.html`) : `node scripts/rig-rendu.mjs <id> <clip> [--images 12] [--ecart] [--gif] [--webm] [--cadre x,y,cote]` → `art-sortie/rigs/<id>/` (ignoré par git). `--ecart` peint en magenta ce qui a bougé depuis le repos. `<id> --essai [--angle 15]` (sans clip) **vérifie le rig** : chaque os tourne seul, la planche peint ce qu'il entraîne (`essai-os.png`). ≈ 5 s. |
| `rig-squelettes-types.mjs` | **Un squelette type par sprite, sans regarder l'image** : crée `game/data/rigs/<id>/` (source, `rig.json` avec les os types bipède ou quadrupède posés à la louche d'après la boîte visible, un calque `tout` non maillé, `clips.json` vide) pour chaque PNG de `Graphical Assets/Characters/` **et `Cards/`** (sous-dossiers compris ; un nom déjà pris est préfixé du dossier du deck) qui n'a pas de dossier. `--ecrire` (sinon à blanc), `--dossier <chemin>`, `--nettoie` (retire d'abord les squelettes bruts — ni maillage ni clip — dont l'image n'existe plus). Quadrupède reconnu au nom : regex `QUADRUPEDE`. Ne touche jamais un dossier existant. Reste au game designer : déplacer les os, puis « Générer le mesh » et « Calculer les poids » dans l'Atelier. |
| `rig-repare-calques.mjs` | Recolle les calques dont le PNG manque (`calques/<id>.png` cité par `rig.json` mais absent : bug d'enregistrement de l'Atelier corrigé le 26 oct. 2026, le sprite disparaissait) en recoupant `source.png`. `--ecrire` (sinon à blanc). Ignore les calques découpés à la main (`de`, `os`). |
| `sam-serveur.py` | **Le serveur de découpe automatique** (Python, SAM 2 de Meta, port 7340) : tourne sur une machine à **carte graphique** (mon-mien : RTX 3070 8 Go ; 5 à 12 s par personnage), reçoit le PNG d'un personnage (`POST /segmente?points=32`) et rend ses régions (un masque PNG recadré par région, du plus grand au plus petit) ; `GET /etat` pour le sonder. `--hote tailscale` n'écoute **que** sur l'adresse Tailscale de la machine (`127.0.0.1` par défaut). Installation : `python -m venv sam2-env`, `pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cu128`, `pip install git+https://github.com/facebookresearch/sam2.git opencv-python pillow numpy` (le modèle, ~900 Mo, se télécharge au 1er appel dans `~/.adventure-card/`). C'est `/api/sam*` de `devserver.js` (via `lib/sam.mjs`) qui l'appelle, jamais la page ; l'Atelier : `builder/rig/sam.js`. ⚠ **À lancer depuis la session de l'utilisateur**, jamais par SSH (il mourrait à la déconnexion), avec une **règle de pare-feu entrante TCP 7340 limitée à `100.64.0.0/10`** créée *avant* (sinon Windows demande, personne ne répond, et il crée des règles BLOQUER). Pour **essayer sans pare-feu** : `ssh -L 7340:127.0.0.1:7340 <machine> "…python sam-serveur.py"` puis réglage « Exporter » décoché. ⚠ SAM voit des **régions par la couleur** (oreille, casque, bouclier, cape…), pas « la tête » ni « le corps » : on regroupe en cliquant. |
| `installe-sam.ps1` | **Installe le serveur SAM sur la machine à carte graphique, une fois** (PowerShell **administrateur**, sur la machine) : règle de pare-feu entrante « Adventure Card SAM » (TCP 7340, `100.64.0.0/10`, ce `python.exe` seulement) **avant** tout, puis tâche planifiée « Adventure Card SAM » (à l'ouverture de **sa** session, cachée, relancée toutes les 30 s si elle s'arrête ; journal `%LOCALAPPDATA%dventure-card-sam.log`), démarrée tout de suite. `-Retire` défait tout. Paramètres : `-Env` (défaut `~\sam2-env`), `-Depot` (`~\Adventure-Cards`), `-Modele`, `-Port`. |
| `rig-maille.mjs` | Maille les calques d'un personnage et refait leurs poids (`--pas 40`, `--poids-seuls`, `--calque <id>`, `--forcer` pour refaire aussi des poids peints à la main) : les mêmes fonctions que les boutons de l'Atelier. |
| `rig-decoupe.mjs` | **Le découpage en ligne de commande** (`builder/rig/calques.js`) : `extrait --depuis <calque> --nom <nouveau> --poly "x,y …" [--contour R] [--lissage N] [--trait L] [--os <os>]`, `comble --calque <c> [--zone z1] [--distance 32]` (provisoire), `etat`. Lit et écrit les PNG du dossier du personnage. ⚠ Deux tracés voisins presque confondus laissent un **ruban** sur le calque d'origine, que le comblement épaissit en tache (le Chiot de Garde) : faire chevaucher le second tracé sur le premier (ce qui est déjà extrait ne se reprend pas). |

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

769 tests : le Registre (une carte jouée y entre une fois, ni jeton ni carte posée ou créée, « Type : tous » +1 une fois par carte, `typeNouveau` par type, `registre` avant l'inscription, le coût par filtre, Greffier, Copiste, Mimétisme, Rétrospective — gratuite, copie, cartes adverses, jamais une relance, allié relancé), Ex-libris et la pile de fatigue par camp (tous les chemins d'arrivée en défausse, une seule fois par carte, exil / Reprise / Impératrice sans effet, Annotation sur ma pile seulement, Index, Appât sur la pile adverse, niveau à l'entrée, validation), la Toxine (marqueur, tic avant la pioche, Bouclier, saut à la mort, lot de morts, copie/switch, vol, Contagion, Épidémie, statiques), le Pistage (marque, taxe, punition avant les effets, la marque qui quitte la main, statique de pioche, règle `pistage-sans-piste`), Charogne et Appât (les X dernières de la défausse adverse, exil, mots-clés transmissibles, un renfort, l'appât au-dessus), le vocabulaire V3 déclaré (inerte, « un seul sort » de `reduit_le_cout_de`, aura à deux mots-clés), la Reprise (exil avant les effets, coût et puissance selon la zone, événements, paliers, validation), main sans plafond, exil, meule et défausse, fatigue et carte concernée, bonus de la caractéristique variable, `t` laissé par le builder, cartes jouées comptées par le moteur, carte Miroir (reflet, arrivée vierge, boucle fermée sans plafond), choix à trois branches, « la carte de Lui », râles, auras, déclencheurs de tour, paliers qui
débloquent un moment, couture builder → moteur, mana différé, mots-clés à paramètre, capacités
des jetons, cible « Lui », cibles par type, caractéristiques variables, montants variables, événements, pioche ciblée, Élusif/Passe-Murailles, réduction de coût, destruction, coût variable, effets statiques, compteurs de sorts, fin de pioche, pile de fatigue, création de carte (précise et au hasard), déplacements de zone (mélange, renvoi, pose), leur renfort et celui des cartes sur place, prise du dessus, complétion par la fatigue, événement de renfort, filtre « une carte précise », niveau du propriétaire, plafond de tours, types multiples, « Type : tous » (posé, offert, reçu d'une aura), copie, cibles sans camp, « chez qui » qui suit la cible ou tire au sort, prise de contrôle, choix entre deux effets, chaîne par type, type lu sur une carte, palier « Choisit les deux », deux cibles désignées, switch, sujet d'un événement, cibler depuis une branche, règles de validation qui lisent le registre, garde d'un moment
