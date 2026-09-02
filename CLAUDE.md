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
Elle part alors dans son premier slot libre, et « Cartes libres » accepte tout. Le bouton
**Dupliquer** copie la carte dans le premier slot libre du même personnage, ou dans les
cartes libres s'il est plein — et le dit.

## Cartes libres et adversaires
Une carte n'est plus forcément dans le deck d'un personnage. `CHARACTER_DATA.library`
tient les **cartes libres** : des cartes sans deck, éditées dans le builder comme un
personnage de plus (fictif, sans statistiques ni switch — c'est ce qui permet de réutiliser
l'éditeur de carte tel quel). Elles servent aux adversaires, et un héros peut en reprendre une.

`CHARACTER_DATA.npcs` tient les **adversaires** : statistiques, sprite, niveau des cartes,
niveau de jeu du bot (`ia`), et un deck qui **pioche dans le catalogue** — les cartes libres
*et* toutes les cartes des personnages (`cardCatalog()` dans `config/npcs.js`, le grand menu
déroulant du builder). Une ligne de deck s'écrit `{card: 'grunt1', n: 4}`.

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
`node scripts/test-triggers.mjs` (205 tests : râles, auras, déclencheurs de tour, paliers qui
débloquent un moment, couture builder → moteur, mana différé, mots-clés à paramètre, capacités
des jetons, cible « Lui », cibles par type, caractéristiques variables, montants variables, événements, pioche ciblée, Élusif/Passe-Murailles, réduction de coût, destruction, coût variable, effets statiques, compteurs de sorts, fin de pioche, création de carte, plafond de tours), `node scripts/test-ai.mjs` (17 tests : le bot
valorise-t-il ces mécaniques) et `node scripts/simulate.mjs` (la courbe de difficulté).

## Finir sa pioche, et la fin de partie
**Le deck ne se remélange pas.** Quand il est vide, on ne pioche plus — ni fatigue, ni
défausse recyclée. Deux raisons, et les deux comptent :
1. sans ça, « sort à 0 mana qui fait piocher » se rejoue en boucle sans fin ;
2. surtout, un deck plus épais devient un **avantage**. C'est ce qui récompense le joueur
   qui emmène 2 ou 3 compagnons, au lieu de lui faire sentir que diluer son deck est puni.

Un camp à sec ne perd pas : il joue ce qu'il a encore en main et sur le plateau. Quand
**plus personne ne peut rien faire** (`peutAgir()` : plus de pioche, rien de payable même
à plein mana, rien qui frappe), `beginTurn` arrête le combat et **le plus de PV l'emporte**
— égalité = match nul, que l'UI compte comme une défaite du joueur. `BALANCE.combat.maxTurns`
reste en garde-fou de dernière ligne pour le cas où les deux camps peuvent agir sans fin.

**Conséquence à surveiller** : un héros seul a 5 cartes et en tire 4 d'entrée ; face à un
PNJ de 10 à 15 cartes, il n'a plus rien à jouer très vite. Les decks des adversaires (donc
la taille des premiers combats) sont le curseur, et ils s'éditent dans le builder.

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
en main…). Ajouter un compteur = une entrée dans ce registre — **sauf** s'il suit quelque
chose que le combat ne compte pas encore : il faut alors le champ dans `makeSide` et son
incrément au bon endroit d'`engine.js` (c'est le cas de `spellsGame` / `spellsTurn`, remis
à zéro par `beginTurn` pour celui du tour).

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
`playCard`, la fin d'`attack`). `fireEvent` **ne ramasse pas les morts** — c'est le flux
normal qui s'en charge, sinon on retirerait une unité du plateau au milieu d'une liste en
cours de parcours.

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
passé par là. `plus` est le bonus à plat que les paliers « Amplifie les effets » nourrissent
via `amplify()` — sans lui, un palier casserait le montant ou ne ferait rien.

## Créer une carte
`cree` fait apparaître en main **n'importe quelle carte du catalogue** (les cartes libres
et celles des personnages), par son identifiant. Ce n'est pas une pioche : le deck n'est
pas touché, et ça marche encore quand il est fini. C'est ce qui remplace les combos
« je pioche le sort qui pioche » — trop évidents, et cassés par la règle de pioche.
Le builder l'édite avec un paramètre de type `cardRef` (le même grand menu que les decks
de PNJ) ; le moteur passe par `cardById()` de `config/npcs.js`.

## Filtres de cartes
`CARD_FILTERS` (`config/mechanics.js`) dit « quelles cartes » : toutes, les alliés, les
sorts, celles d'un type, celles portant un mot-clé. `cardMatches(card, e)` tranche,
`describeFilter(e)` l'écrit. La réduction de coût s'en sert ; tout ce qui voudra désigner
un paquet de cartes s'en servira aussi. Ajouter un filtre = une entrée + un `case`.

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

## Outils d'équilibrage
- `node scripts/check-decks.mjs [niveau] [parties]` — **les erreurs**. Deux passes : les
  règles du builder (via `game/src/config/validate.js`, partagé avec lui — une règle
  ajoutée là s'applique aux deux), puis de vraies parties pour trouver ce qui ne se produit
  jamais : carte qu'aucun mana ne peut payer, carte jamais posée, moment jamais déclenché.
  Les decks **base et switch** de chaque personnage y passent.
- **`builder/balance.html`** — la même mesure **dans l'outil**, sur le brouillon en cours :
  on coche ce qu'on veut comparer (personnages base, switch, **mélange**, adversaires), le niveau, le
  nombre de parties et le bot, on lance, et la matrice se remplit case par case (la page
  rend la main entre deux cases, elle ne se fige pas). Les couleurs disent tout de suite ce
  qui est sur une cible, entre deux, ou écrasant.
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
- `game/src/tools/arene.js` — le socle commun (monter un camp, jouer une partie, une série,
  Wilson, les cibles 33/50/66). Il vit dans `game/` et pas dans `scripts/` **parce que la
  page du builder l'importe aussi** : une seule implémentation, donc les mêmes chiffres en
  ligne de commande et dans l'outil. Tout nouvel outil de mesure passe par là.

## Dossiers
- `game/` — le prototype jouable. `src/config/` = game config (dont `npcs.js`, qui résout
  les adversaires et le catalogue de cartes, et `validate.js`, les règles de validation
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
