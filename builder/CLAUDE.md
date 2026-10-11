# builder/ — l'Atelier : les outils de game design

> Des **pages autonomes** (HTML + JS inline, aucune dépendance) servies par `scripts/devserver.js`, qui importent seulement des modules de
> `game/src/`. Elles forment une PWA installable (« Atelier », portée `/`) ; **sur le PC, l'Atelier installé est celui du Pi** (`https://<machine>.<tailnet>.ts.net`) :
> « Appliquer au jeu » y écrit les cartes sur le **Pi**, à rapatrier par git.
> `index.html` fait ≈ 2 400 lignes, `lancer.html` ≈ 1 300, `balance.html` ≈ 1 000 : **ne les lis pas en entier**, Grep (`effectRow`, `effectList`, `applyToGame`, `relit`, `describe`).

## Les pages

| Fichier | Rôle | S'appuie sur |
|---|---|---|
| `accueil.html` | **L'Atelier** : tuiles vers toutes les pages, état du moment (brouillon en cours, dernier calcul), notifications. | `/api/run` |
| `index.html` | **Card Builder** : personnages, cartes (base + switch), adversaires, cartes libres, pile de fatigue ; validation (« À vérifier »), « Appliquer au jeu ». Brouillon dans `localStorage` (`adventureCardBuilder.v1`). | `config/mechanics.js`, `validate.js`, `POST /api/write` |
| `overview.html` | Vue d'ensemble de toutes les cartes (niveau au curseur, courbes de mana, export JSON). Lecture seule. | `config/`, `characters.data.js` |
| `balance.html` + `balance-worker.js` | **Équilibrage** dans le navigateur : matrice de matchups (workers), courbe de difficulté. | `tools/arene.js` |
| `courbes.html` | **Courbes de progression** (buffs d'adversaires). | `config/courbes.js` |
| `situations.html` | **Banc de situations** : monter une position et la jouer, « Que jouerait le bot ? ». | `tools/situation.js`, `data/situations.js` |
| `lancer.html` | **Lancer un calcul** sur le serveur : file, balayage, renforts, analyse IA, calculs rangés. | `/api/run*`, `/api/archives*` |
| `versions.html` | **Versions du jeu** : états nommés, diff, retour en arrière, mesures liées. | `/api/versions*`, `lib/diff-donnees.mjs` |
| `wiki.html` | **Wiki** : toutes les cartes (base + switch des héros, **puis** celles qui ne sont à aucun héros : la **pile de fatigue**, les **decks des adversaires** avec leur nombre d'exemplaires, les autres cartes libres — chips « Hors héros ») affichées comme en jeu (`game/styles.css`), avec pictogrammes, effets expliqués, paliers et **animation à jouer** sur une scène (un mini combat qui rejoue des événements fabriqués avec `ui/effets.js`) ; onglets Pictogrammes (légende), Animations (effets du combat + briques de VFX), Contours (carte jouée, râle d'agonie, début/fin de tour, règle). Chaque carte a un bouton ▶ par moment (poser, attaquer, mourir, début/fin de tour, règle). Sur téléphone, la scène est sous la liste : elle **flotte au-dessus de la page** le temps de l'animation, puis s'en va (toucher le voile la ferme). ⚠ Il rejoue le code **web** du jeu : si le jeu change de moteur graphique, l'aperçu ne suivra pas. Lecture seule. | `game/src/ui/{effets,vfx,vfx-scenes,pictos,fiche,icones}.js`, `config/characters.js`, `config/npcs.js` |
| `feuille.html` | **Feuille** : la game config se règle dans la Google Sheet « Config Adventure-Cards » ; « Voir les changements » (aperçu) puis « Appliquer au jeu » (écrit `game/data/feuille.data.js` **sur la machine du serveur**). Tout ce qui commence par `~` (onglet, colonne, ligne) n'est pas exporté. | `GET/POST /api/feuille`, `scripts/lib/feuille.mjs` |
| `sw.js` | Service worker : **notifications seulement**, aucun cache. | `scripts/lib/push.mjs` |
| `manifest.webmanifest` | La PWA « Atelier ». | `icons/` |
| `icons/` | Icônes de l'Atelier (tirées de `Icons/Icon.png` par `scripts/gen-icones.ps1`). | — |
| `telechargements/` | `widget-atelier.apk`, le **seul `.apk` versionné** (servi par le Pi). | `android/` |

Clés `localStorage` : `adventureCardBuilder.v1` (brouillon), `adventureCardBuilder.focus`, `adventureCardBalance.v1` (+ `.courbe`), `adventureCardCourbes.v1`, `adventureCardLancer.v1`.
Les pages se synchronisent entre fenêtres par l'événement `storage`.

## Règles
- Aucune valeur d'équilibrage ici (tout est dans `game/src/config/`) ; ces pages **décrivent** les cartes avec `describeEffect` du moteur, elles n'ont pas leur propre copie.
- `CHARACTER_DATA` est un import de module, figé au chargement : `relit()` le ré-importe avec `?t=` — ne contourne pas ça.
- Un onglet du builder ouvert **avant** qu'une mécanique soit codée doit être rechargé (F5) avant « Appliquer au jeu ».
- Les routes `POST /api/write` et `POST /api/sprites` existent **aussi dans `launcher/Launcher.cs`** (repli sans Node) : modifier les deux.

---

# Le détail

## Card Builder
`builder/index.html` (servi à `/builder/index.html`) — l'outil de game design pour les cartes,
sur le modèle du builder de build de Teliau's Toolbelt. Il écrit `game/data/characters.data.js`
et `docs/MECANIQUES-A-CODER.md` via `POST /api/write` (implémenté dans `scripts/devserver.js`
**et** dans `launcher/Launcher.cs` — modifier les deux). L'exe passe maintenant la main à
`devserver.js` quand Node est installé, donc la copie C# ne sert plus qu'au **repli** sans
Node : elle doit rester correcte, mais ce n'est plus elle qu'on exerce tous les jours.

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


## Les courbes de progression
`builder/courbes.html` — **de combien monte une stat, et à quels niveaux**. C'est l'outil
des **buffs d'adversaires** : la montée en difficulté des combats au fil des niveaux. Le
modèle vit dans `game/src/config/courbes.js` (la page l'importe, le banc aussi, et le
moteur le lira), et le banc est `node scripts/test-courbes.mjs`.

Un **profil** réunit des **colonnes** — une colonne, c'est une stat qui évolue (les PV
d'un ennemi, ses dégâts, son armure, le coût d'une carte). À chaque niveau, une ou
plusieurs colonnes **prennent leur tour** et changent de valeur ; les autres **répliquent**
la précédente. Chaque colonne porte deux objets **indépendants** :

- un **rythme** — *quand est-ce son tour ?* `1 sur X` (avec un cap optionnel en nombre de
  tours), `toujours` (1 sur 1), ou **des niveaux écrits à la main** (6, 14, 25) pour les
  événements rares qu'on place soi-même, où une fréquence serait une mauvaise abstraction ;
- une **courbe** — *quelle valeur à ce niveau-là ?* Des **keyframes** `(niveau, valeur)`
  interpolées deux à deux, chaque segment ayant sa **forme** (linéaire, ease-in, ease-out)
  et son **échelle** (additive : on ajoute des points ; proportionnelle : on multiplie, donc
  on interpole dans l'espace log). Après la dernière keyframe, un booléen : **prolonger** la
  pente du dernier segment, ou **boucler** le motif — décalé de la variation totale d'un
  cycle (additif) ou du ratio total (proportionnel), l'axe des niveaux avançant d'une
  longueur de cycle, ce qui fait **recoller** les cycles sans marche.

⚠ **Les deux ne se touchent jamais**, et c'est la règle qui tient tout le fichier : la
valeur d'une colonne est **toujours** celle de sa courbe au niveau où le tour tombe. Changer
un rythme **déplace** donc les valeurs sur l'axe des niveaux — il ne peut pas déformer la
courbe, ni faire dire à une colonne un nombre qui n'est pas sur la sienne. C'est aussi ce
qui la rend imperméable aux rythmes des **autres** colonnes : eux ne décident que le *quand*.

**La contrainte absolue : chaque ligne diffère de la précédente.** Un niveau qui ne change
rien est un niveau qui ne se sent pas. Tout le reste en découle — le tour unique à
distribuer par niveau, et le **tour forcé** (jaune dans l'aperçu) donné à la colonne la plus
en retard quand personne ne bougerait. Quand plus personne ne peut rien changer, la ligne se
répète : on ne l'invente pas, la validation le signale.

**La dette, une primitive pour deux répartitions** (`ardoise()`). « Rendre des choses
entières quand la cible, elle, ne tombe pas juste » : on garde la cible **réelle** au
compteur, on rend l'entier, et l'écart reste dû — jamais jeté, donc jamais de dérive.
Elle sert aux **tours** entre les colonnes (poids `1/X` normalisés, dette de départ
`0.5·w` pour centrer la phase, la plus créancière prend le tour et rembourse 1, égalité au
plus petit indice) **et** aux **points** entre les tours d'un segment. ⚠ Pour les valeurs,
on **arrondit la cible cumulée et on prend les différences** — jamais l'inverse : arrondir
l'increment ferait dériver la colonne de plusieurs points sur 40 niveaux, et une dérive ne
se voit pas, elle se constate trop tard.

⚠ **Le `X` d'un rythme est un poids RELATIF, pas une fréquence.** Les poids sont normalisés
parce qu'il faut bien qu'un niveau change quelque chose : deux colonnes à « 1 sur 4 »
alternent au lieu de laisser trois niveaux muets, et une colonne **seule** prend tous les
tours quel que soit son X. Pour que le demandé et l'effectif coïncident, il faut que les
`1/X` du profil fassent **1**. La page affiche le **rythme effectif** à côté du demandé
(« 1 sur 8 — effectif : 1 sur 6,5 ») : l'écart se voit au lieu de se deviner.

Une colonne **sort de la rotation** quand elle ne peut plus rien changer — son cap, sa liste
finie, sa courbe plate ou bloquée par son **plancher/plafond** — et les poids sont alors
**renormalisés sur celles qui restent** : les autres accélèrent d'autant. Les valeurs se
rangent au choix en **absolu** ou en **modificateur cumulé** depuis la valeur de départ.

**La validation** (même fonction pour le bandeau « À vérifier » et pour le banc) : un
segment de **K tours** et de **Δvaleur** points doit vérifier `|Δvaleur| ≥ K`, sinon des
tours rendront la valeur précédente. ⚠ **K est un nombre de TOURS, pas de niveaux** : 40
niveaux à 1 sur 8 font 5 tours. Le message nomme les **trois leviers** — « 20 tours pour 5
points d'écart, 15 tours seront plats : élargis la plage (3→23), espace le rythme (1 sur 8),
ou rallonge le segment ». Elle attrape aussi les keyframes non triées ou en double, une
échelle proportionnelle avec une keyframe à 0 ou à cheval sur le signe (un facteur ne change
pas de signe), une borne atteinte avant la dernière keyframe, et toutes les colonnes
épuisées avant la fin de l'horizon.

**L'aperçu est toujours visible**, c'est tout l'intérêt : la courbe continue en pointillés,
**l'escalier de ce qui sort vraiment**, les tours marqués dessus, les keyframes, et les
segments en faute surlignés — la même règle que le bandeau (`segmentsPlats()`), jamais une
seconde copie. En dessous, **toutes les colonnes superposées**, chacune à son échelle.
Les keyframes s'éditent **au clavier** (des champs de saisie : on tape des chiffres précis),
la souris ne servant qu'à sélectionner.

**Les sorties.** Le **TSV** se colle dans une feuille de calcul : une ligne d'en-tête, puis
une ligne par niveau, colonnes `id / level / stat…`, plusieurs profils à la suite. ⚠ Une
colonne qu'un profil n'utilise pas reste **vide**, pas à zéro — zéro est une valeur, le vide
dit « pas concerné », et une formule de feuille ne les lit pas pareil. Le **JSON**, lui, ne
contient que les keyframes et les rythmes, **jamais les valeurs développées** : le moteur
recalculera à la volée, parce qu'une table figée serait fausse le jour où on touche une
keyframe, et fausse sans le dire. Tout le reste vit dans le `localStorage` de ce navigateur,
comme le brouillon du builder.

⚠ **Ce qui part porte l'`id`, pas le nom**, et ce sont deux champs séparés comme pour une
colonne : le **nom** est pour nous (« Grand-Duc »), l'**id** pour les fichiers — la colonne
`id` du TSV, le champ du JSON, le nom du fichier téléchargé. C'est l'id que le moteur lira
pour retrouver son profil, donc un libellé avec espaces et accents n'y a pas sa place.
L'id **suit le nom** tant qu'on ne l'a pas écrit à la main (s'il vaut encore le nom d'avant,
personne n'y tient) : sans ça, renommer un profil ne changeait rien au fichier, et rien ne
le laissait voir. Et les boutons d'export emportent **ce profil** ou **tous** selon la puce
« Exporter » — une ligne sous la barre écrit noir sur blanc ce qui sortira et sous quel nom,
parce qu'un export qui n'emporte pas ce qu'on croit ne se remarque que trop tard.


## L'Atelier : les outils en une app
`builder/accueil.html` réunit toutes les pages derrière des tuiles (builder, lancer un
calcul, vue d'ensemble, équilibrage, versions, courbes de progression, mécaniques à coder, jeu), avec l'état du moment :
un brouillon est-il en cours dans ce navigateur, où en est le dernier calcul du serveur.
`builder/manifest.webmanifest` en fait une **PWA installable** (« Atelier », portée `/` :
le jeu s'ouvre dans la même fenêtre). Toutes les pages du builder pointent vers ce
manifeste, donc on installe depuis n'importe laquelle. Les icônes (`builder/icons/`) sont
le logo `Icons/Icon.png`, déclinées par `scripts/gen-icones.ps1` (transparentes pour
l'onglet et l'app, sur fond plein pour Android « maskable » et iOS, silhouette blanche pour
le badge de notification) : à relancer quand le logo change.

⚠ **Un navigateur n'installe qu'en HTTPS** (ou sur localhost). Sur le Pi, c'est
`tailscale serve --bg 7330` qui le donne : une adresse `https://<machine>.<tailnet>.ts.net`
avec un vrai certificat, que **seuls les appareils du tailnet** peuvent joindre. Surtout
pas Funnel, qui l'ouvrirait à internet. Le seul service worker, `builder/sw.js`, ne sert
qu'aux notifications : rien n'est mis en cache, le builder relit toujours des données
fraîches.


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
