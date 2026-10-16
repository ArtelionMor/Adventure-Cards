# game/src/config/ — la game config et les registres

> Tout ce qui se **tune** vit ici (cartes mises à part : elles sont dans `../../data/`, écrites par le Card Builder).
> `mechanics.js` fait ≈ 1 560 lignes : **Grep** (`EFFECTS`, `KEYWORDS`, `TRIGGERS`, `EVENTS`, `STATICS`, `TARGETS`, `ZONES`, `COUNTERS`, `CARD_FILTERS`, `describe…`).
> Chaque fichier est importé par le moteur, l'interface **et** les pages du builder : pas de DOM, pas de `window`.

## Les fichiers

| Fichier | Rôle | Exports principaux |
|---|---|---|
| `balance.js` | **`BALANCE`** — toutes les valeurs d'équilibrage et de « toucher » : `save`, `progression` (dont `puissance` : base **0**, `parAmelioration`, et `gains` = la colonne `increase_power` de `~settings`), `arenes` (niveau par victoire, découverte, porte), `decks` (decks enregistrés, `tailleMin`), `profil` (`xpPourNiveau`), `farm.grille`/`casesDeDepart`/`tierLibre`, `costs` (`charUpgrade` : prix d'un palier, partagé entre ses étapes), `ai` (niveaux du bot), `ui` (appui long), `combat` (plafonds, `autoStepMs`, `maxTurns`, `handMax`, `boardSize`…), `simulation` (paliers), `farm`, `unlockCadence`. | `BALANCE`, `TUNING_NOTE` |
| `mechanics.js` | **Registre des mécaniques** : `EFFECTS`, `KEYWORDS`, `TRIGGERS`, `EVENTS`/`EVENT_WHO`/`EVENT_GARDES`, `STATICS`, `TARGETS`, `ZONES`, `COUNTERS`, `CARD_FILTERS`, + `cardCost`, `staticTotal`/`staticMin`, `describeEffect`/`describeAura`/`describeStatic`, `typesOf`/`estDuType`/`partageType`, `keyId`/`keyArg`/`hasKey`. Source de vérité de « est-ce que ça existe ? » : le moteur exécute, le builder propose. | voir le fichier |
| `textes.js` | **Les textes du jeu par clé** (`t('combat.tonTour')`, `t('deck.niveau', { n: 4 })` pour un trou `{n}`), pour la traduction à venir : un écran n'écrit jamais un mot en dur. Y sont : les mots du combat sans icône, et ceux de l'écran d'équipe (`deck.*`, les mots anglais de la maquette). | `t`, `TEXTES` |
| `familles.js` | **Les familles de héros** (une ou plusieurs espèces → une puce de tri et une section de l'écran d'équipe, couleurs `fond`/`cadre`) et **la rareté** de chaque héros (le liseré de sa vignette). Habillage, pas équilibrage. | `FAMILLES`, `RARETES`, `RARETE_DES_HEROS`, `familleDe`, `rareteDe` |
| `feuille.js` | Comment les lignes de la Google Sheet (`game/data/feuille.data.js`) se posent sur le jeu. **« animations »** → `BALANCE` : `ui.fx`, `ui.fx.fin` et `combat.autoStepMs` **seulement** (jamais un plafond ou une règle du combat), posé par `balance.js`. **« heroes »** (16 oct. 2026 : la feuille commande les **statistiques**, le builder les **cartes**) → nom, image (`Characters/<nom>.png`, refusée si absente de `sprites.js`), PV, mana max, archétype (`archetype`, lu par rien encore) des héros **et** des adversaires, par identifiant du jeu ; posé par `characters.js` sur `CHARACTER_DATA` au chargement, et par `tools/arene.js` sur un brouillon. `heroes_kin`/`is_hero` ne se posent sur rien (l'espèce range les familles). **« encounters »** → `power_needed` devient `reqPower` sur le point du monde qui porte ce combat (`world.js`) : une **puissance conseillée**, affichée par la fiche d'arène, plus un verrou ; `role`, `archetype`, `question`, `reponse`, `punit`, `heros_conseilles` → les fiches d'arène (`appliqueArenes`, `herosDepuisTexte` : les noms entre parenthèses désignent les héros). Une case vide laisse la valeur du builder / de `balance.js`. Pur : sert aussi à l'aperçu (`scripts/lib/feuille.mjs`). | `planifie`, `applique`, `planifieHeros`, `appliqueHeros`, `planifieRencontres`, `appliqueRencontres`, `reglePar`, `COLONNES_HEROS` |
| `characters.js` | Personnages et cartes — **logique seulement** (`resolveCard(carte, niveau)` applique les paliers ; `characterDeck`). Les données sont dans `../../data/characters.data.js`. **Amélioration** (12 oct. 2026) : `etapesDe(héros)` range les paliers des 10 cartes (switch comprises) par `lvl` puis par emplacement — une amélioration = une étape ; `niveauxDesCartes(héros, niveau)` donne le niveau de palier de chaque carte (ce que reçoit `resolveCard`), `niveauDePalier` l'équivalent « ancien niveau », `niveauDepuisAncien` la migration. C'est un affinage : toutes les étapes ≤ L faites = les cartes d'un ancien « niveau L », donc simulations, PNJ et Atelier (qui parlent en paliers) ne changent pas. | `CHARACTERS`, `CHAR_BY_ID`, `STARTERS`, `resolveCard`, `characterDeck`, `etapesDe`, `niveauMax`, `niveauxDesCartes`, `niveauDePalier`, `niveauDepuisAncien` |
| `npcs.js` | Adversaires (PNJ), **catalogue de cartes** (`cardCatalog`, `cardById`, `catalogCards`), `switchOf` (l'autre face d'une carte), `fatiguePile`, `npcSide`. | `NPCS`, `NPC_BY_ID`, `cardById`, `switchOf`, `fatiguePile`, `npcSide` |
| `world.js` | Overworld : carte **compacte en étoile** (16 oct. 2026 : 60 × 56, `hub` = la place, `version` = la carte, `vitesse`), points d'intérêt (`WORLD.nodes` : arènes `type: 'arena'` sur deux anneaux, cueillettes `forage`, coffres, boutique, PNJ, téléport ; plus de `gate` ni de niveau requis), **échelle des objets** (`unite`, `tailles` : `shop` et `arena` à 7), rencontres (`ENCOUNTERS` = l'ennemi **au niveau 1**, via `coteEnnemi`, + récompenses `RECOMPENSES`, XP comprise), génération du terrain (`buildMap` : chemins de la place vers chaque point, et entre voisines d'un même anneau). | `WORLD`, `ENCOUNTERS`, `TILE`, `buildMap` |
| `ennemis.js` | **Les ennemis des arènes** : `ENNEMIS_PROVISOIRES` (5 adversaires écrits ici en attendant le builder — un adversaire du builder de même id gagne), `ennemiDef`, et leurs **profils de progression** (schéma de l'onglet `progress_profile` : `{ id, level, upgrade, value }` ; l'onglet `enemy_progress_profile` de la feuille gagne s'il existe, sinon `PROFILS` provisoires : la rampe `~draft` + des rythmes « 1 sur X »). `coteEnnemi(id, niveau)` applique les améliorations cumulées (`cumulJusqua`) : `card_level`, `health_up`, `mana_max_up`, `starting_armor_up`, `starting_hand_cards`/`extra_cards_in_hand`, `start_mana` (→ `startMana`, lu par `makeSide`), `buff_attack_ally`/`buff_defense_ally` ; `fatigue_cards_buff` pas branché. | `ENNEMIS_PROVISOIRES`, `ennemiDef`, `PROFILS`, `PROFIL_DE`, `UNITES`, `lignesDuProfil`, `cumulJusqua`, `coteEnnemi` |
| `arenes.js` | **Les fiches d'arène** : par arène, son ennemi, son bâtiment (`Machines/`), `archetype`/`sousArchetype` (vocabulaire du CLAUDE.md racine), `role`, `question`, `reponse` (stratégie optimale), `punit`, `herosConseilles`, `typeDeck` ; `textesValides: false` (proposés, pas validés). L'onglet « encounters » de la feuille les remplace (`appliqueArenes`). | `ARENES`, `ARENE_PAR_ID`, `ARCHETYPES`, `SOUS_ARCHETYPES`, `libelleArchetype` |
| `profil.js` | **L'arbre du profil du joueur** : 25 niveaux, chacun → héros recrutable (éligibilité, comme un boss battu), place d'équipe, jokers de retrait. L'XP par niveau est dans `BALANCE.profil`. | `ARBRE_PROFIL`, `NIVEAU_MAX_PROFIL`, `recompensesDuNiveau` |
| `farm.js` | Mini-jeu de Ferme : cultures, prix (monnaie C). Plus de `reqLevel` : `estConnue(culture, découvertes)` (tiers ≤ `BALANCE.farm.tierLibre` d'office, les autres trouvés sur la carte). | `CROPS`, `CROP_BY_ID`, `estConnue` |
| `relics.js` | Objets à passifs trouvés dans l'overworld. | `RELICS`, `relicMods` |
| `validate.js` | **Règles de validation des cartes**, partagées entre le bandeau « À vérifier » du builder et `scripts/check-decks.mjs` ; `ignoreDe`/`bloque` pour les constats ignorés. | `validateData`, `bloque`, `ignoreDe`, `eachEffect`, `eachUnit`, `tierIssue` |
| `courbes.js` | Modèle des **courbes de progression** (rythmes, keyframes, la « dette » `ardoise`) — lu par `builder/courbes.html` et `scripts/test-courbes.mjs`. | `RYTHMES`, `FORMES`, `ECHELLES`, `profilVide`, `colonneVide`, `ardoise`… |

## Vocabulaire déclaré, pas encore codé (`implemented: false`) — **plus rien depuis le 12 octobre 2026**
Les six héros V3 sont **entièrement codés** (le Registre était le dernier, `docs/V3-HEROS.md`, « 5 bis »). Le mécanisme reste
pour la prochaine mécanique : on peut **déclarer** dans le registre (`EVENTS`, `COUNTERS`, `CARD_FILTERS`, `EFFECTS`,
`KEYWORDS`) une entrée avec `implemented: false` ; la validation dit alors « pas encore codé » sur la carte (sans bloquer) et elle
est **inerte** — jamais « toutes les cartes » (le `default` de `cardMatches` répondrait oui : chaque filtre déclaré a donc son
`case`, qui refuse). Coder = poser son `fireEvent` / son `staticTotal` / son `case`, puis retirer `implemented: false`.
⚠ **`cardMatches(carte, e, B)` prend le combat en 3ᵉ argument** (depuis le Registre) : un filtre qui lit l'état du combat
(`typeDuRegistre`) ne désigne rien sans lui — passe toujours `B` quand tu l'as.

## Ajouter / modifier
- **Une mécanique** : une entrée dans le registre de `mechanics.js` (`EFFECTS`/`KEYWORDS`/…) **+** son `case` dans `../combat/engine.js` **+** sa valeur pour le bot dans `../combat/ai.js` ; le builder la propose tout seul. Si elle vient de `docs/MECANIQUES-A-CODER.md`, retire son entrée de `customMechanics` (données).
- **Une valeur d'équilibrage** : dans `balance.js`, commentée en français — jamais ailleurs.
- **Une règle de validation** : dans `validate.js` (elle s'applique au builder et à `check-decks`).

## Tests
`test-triggers.mjs` (couture builder → moteur, registre), `test-courbes.mjs` (`courbes.js`), `check-decks.mjs` (validation sur les données réelles). Ce dossier est dans l'empreinte des renforts : `git pull` partout après un commit.

---

# Le détail

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

Un **bonus à plat** (`plus`, quatrième champ du mot-clé : `characteristique_variable:atk:handCards::1`)
s'ajoute au compteur, comme le `plus` d'un montant variable : « attaque = les cartes de ta main
+ 1 ». Sans lui, une carte dont la valeur peut tomber à 0 ne peut pas promettre « au moins 1 ».
Les cartes écrites avant lui n'ont que trois champs et valent `0` : rien ne bouge.

Piège à connaître : un compteur bouge **sans qu'aucune carte ne soit jouée** (le tour qui
avance, la main qui se remplit), alors que `refresh()` n'était appelé qu'aux événements de
plateau. D'où le `resolveDeaths(B)` au début de `beginTurn` — il rafraîchit puis ramasse
l'unité que le compteur vient de tuer. Un compteur ne doit jamais lire `atk`/`hp` : deux
caractéristiques variables se regarderaient en boucle.


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


## Ignorer un constat de validation
Une erreur de validation qui n'en est pas une pour le game designer s'**ignore**, avec une
raison : le bouton **Ignorer** sur la ligne du bandeau « À vérifier » du builder. Elle part
dans `CHARACTER_DATA.ignores` (`{ ou: 'carte:<id>', regle, pourquoi }`), donc avec les
cartes, dans les versions et dans le repo — et `check-decks.mjs` lit la même liste.

- Un constat ignoré **ne bloque plus** (ni « Appliquer au jeu », ni le code de sortie de
  `check-decks`) mais **reste affiché**, en retrait, avec sa raison et un bouton **Rétablir**.
  Ignorer n'est pas oublier. Côté code : ne filtre jamais sur `s.bad` seul, passe par
  `bloque(s)` (`validate.js`).
- `ou` est l'**identifiant** (`carte:<id>`, `pnj:<id>`) : renommer la carte ne fait pas
  revenir le constat. `regle` est un code stable quand la règle en déclare un (`cout-solo`,
  `deck-court`), sinon le **texte du constat** sans son « Proprio · Carte — » : on ignore
  alors CE constat-là, et s'il change avec la carte, il revient. C'est voulu.
- Seuls les constats rattachés à une carte ou un PNJ s'ignorent (les autres n'ont pas de
  bouton). Un ignore qui ne correspond plus à rien est signalé (« Retirer »).
- `cout-solo` vit dans `validate.js` (il était dans `check-decks`, que le builder ne voit
  pas) et lit la carte au niveau `{ niveau }` passé à `validateData` (5 par défaut, celui de
  `check-decks` sinon). Hors combat : « coûte 1 de moins par tour joué » n'y compte pas.
