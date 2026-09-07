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

`builder/balance.html` — l'équilibrage : la matrice deck contre deck, jouée dans le
navigateur (bot contre bot), avec les cibles 33 / 50 / 66 et l'intervalle de confiance.
Elle mesure le **brouillon** du builder quand il existe : on change une carte, on relance,
on lit tout de suite ce que ça donne.

`builder/overview.html` — la vue d'ensemble : toutes les cartes de tous les personnages,
plus (au choix) les **cartes libres** et les **decks des adversaires**, chacun avec sa
courbe de mana et ses cartes résolues à SON niveau,
résolues au niveau choisi (curseur), avec leurs paliers et le rapport points/mana. Elle lit
les données en direct, ne les écrit jamais, et sert à équilibrer.

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
Après un changement d'équilibrage, faire tourner `node scripts/simulate.mjs`.
Après un changement de **cartes**, faire tourner `node scripts/check-decks.mjs` (les
erreurs) et `node scripts/matchups.mjs` (l'équilibre entre decks) — voir « Outils ».
Après toute modification de `game/src/combat/`, faire tourner **les trois bancs** :
`node scripts/test-triggers.mjs` (295 tests : râles, auras, déclencheurs de tour, paliers qui
débloquent un moment, couture builder → moteur, mana différé, mots-clés à paramètre, capacités
des jetons, cible « Lui », cibles par type, caractéristiques variables, montants variables, événements, pioche ciblée, Élusif/Passe-Murailles, réduction de coût, destruction, coût variable, effets statiques, compteurs de sorts, fin de pioche, pile de fatigue, création de carte (précise et au hasard), déplacements de zone (mélange, renvoi, pose), leur renfort et celui des cartes sur place, prise du dessus, complétion par la fatigue, événement de renfort, filtre « une carte précise », niveau du propriétaire, plafond de tours), `node scripts/test-ai.mjs` (19 tests : le bot
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
aveugle aux alliés. Le niveau `montecarlo` ne suit aucune règle : pour chaque coup possible
il **finit la partie** N fois (`cloneBattle` + rollouts) et garde celui qui gagne le plus
souvent — ~50 ms par décision, imbattable par les autres (9 parties sur 10), trop lent pour
une grosse matrice.

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
  `--trio` pour les équipes de 3, `--bots` pour comparer les niveaux de bot entre eux,
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
  (matrice des matchups). Pages autonomes : aucune dépendance, elles importent seulement
  les modules de `game/src/`.
- `launcher/` — source C# du lanceur Windows (compilé avec le csc.exe fourni par Windows, cf. `scripts/build-exe.ps1`).
- `scripts/` — serveur de dev, bancs de test, outils d'équilibrage (`check-decks`,
  `matchups`, `simulate`), `lib/arene.mjs` (socle commun), build de l'exe.
- `docs/GDD.md` — game design doc complet.
- `mockups/` — mockups de cartes (placeholders, pas la direction artistique finale).
- `Characters/` — sprites de personnages (animaux : chien, chat, corbeau, renard, grenouille, chouette, lapin, panda roux, paresseux...).
- `Machines/` — sprites de bâtiments/machines de production (fermes, ateliers...).
- `Ressources/` — sprites de ressources récoltées/produites, par tiers de rareté (1 à 6).
- `UI/` — sprites d'interface (pièces, coffre, arbre, dé...).
- `V2/` — itération plus récente d'assets (bâtiments, ressources, refs) — vérifier avec l'utilisateur si V2 remplace les dossiers ci-dessus ou les complète.
