# game/src/combat/ — le moteur de combat, le bot et les journaux

> À lire avant d'ouvrir `engine.js` (≈ 2 000 lignes) ou `ai.js` (≈ 1 200) : ne les lis jamais en entier,
> **Grep** la fonction dont tu as besoin (les noms ci-dessous sont les bons points d'entrée).
> Aucun DOM ici : le moteur ne sait rien de l'écran. L'interface (`../ui/battle.js`) lit l'état et le rejoue.

## Les fichiers

| Fichier | Rôle | Points d'entrée |
|---|---|---|
| `engine.js` | **Le moteur.** État d'un combat (`B`), tours, jouer une carte, attaquer, effets, ciblage, morts, auras, événements « quand X alors Y ». | `createBattle`, `playCard`, `attack`, `endTurn`, `beginTurn`, `canPlay`, `needsTarget`, `needsChoice`, `legalTargets`, `attackableTargets`, `cloneBattle`, `refresh`, `depose`, `aurasSur`, `reprisesPossibles`, `carteDuCoup` |
| `ai.js` | **Le bot** (niveaux `naif` … `dur`, `montecarlo`) : choisit un coup par valeur ; sait dire pourquoi (`ecouteLesChoix`). | `botAction`, `coupsPossibles`, `evalue`, `meilleureBranche`, `ecouteLesChoix` |
| `journal.js` | **Journal de décisions** (JSONL, un fichier par combat) + **`joue()`, l'unique point d'entrée d'une action** (jeu, arène, scripts). | `joue`, `ouvreJournal`, `fermeJournal`, `nomDeFichier`, `texteJournal`, `VERSION` |
| `evenements.js` | **Le récit en données** (`B.evts`) : qui a fait quoi, avant/après, et la cause. Éteint par défaut. | `ouvreEvenements`, `evt`, `avec`, `refCarte`, `refUnite`, `refHeros`, `refSource`, `refCible`, `noteCoup`, `coupDe` |

Dans `engine.js`, les fonctions qui comptent (dans l'ordre du fichier) : `makeSide`, `draw`, `preleve`/`depose` (déplacer des
cartes), `reflete` (Miroir), `devientCopie`, `refresh` (dérivés + auras), `damageHero`/`damageUnit`, `resolveDeaths`,
`fireTrigger`/`fireEvent`, `beginTurn`/`endTurn`, `recipients` (ciblage), `resolveAmounts`, `applyEffects` (un `case` par effet),
`makeUnit`, `canPlay`, `playCard`, `attack`.

## Qui l'utilise, ce qu'il importe
- Importe `../config/` (`balance`, `mechanics`, `npcs`, `characters`) — **jamais** `../ui/`.
- Importé par `../ui/battle.js` (le jeu), `../tools/arene.js` et `situation.js` (mesures), `scripts/*.mjs`, `builder/balance.html`.
- **Le code de ce dossier est dans l'empreinte des renforts** (`scripts/lib/renforts.mjs`, fichiers `.js` seulement) : le modifier
  veut dire `git pull` sur le Pi et sur chaque renfort après le commit, sinon ils sont écartés des calculs.

## Tests à lancer après une modification ici
`node scripts/test-triggers.mjs` (721), `test-ai.mjs` (50), `simulate.mjs` (courbe), **`test-evenements.mjs`** (≈ 3 900, dont « le récit ne change
pas la partie »), `test-partage.mjs` (60) ; `test-journal.mjs` après un changement de `journal.js` (⚠ instable, voir `scripts/CLAUDE.md`).
Un nouvel effet qui change l'état d'une unité ou d'un héros **émet son événement** (`if (B.evts) evt(B, …)`).

## Règles de ce dossier (le détail est dans les sections ci-dessous)
- Une unité sépare `baseAtk/baseHp/baseKeys/damage` (l'état) de `atk/hp/maxHp/keys` (dérivés par `refresh()`) : **n'écris jamais dans les dérivés**.
- Tout passe par `recipients()` pour viser, `resolveAmounts()` pour un nombre, `cardCost()` pour un coût, `mainPleine()`/`plateauPlein()` pour les plafonds.
- Le moteur tire à `Math.random` sans graine : un test de comportement doit graîner `Math.random` (voir `scripts/test-evenements.mjs`).
- Aucune valeur d'équilibrage ici : `BALANCE` (`../config/balance.js`).

---

# Le détail, mécanique par mécanique

## Finir sa pioche, et la pile de fatigue
**Le deck ne se remélange pas** : une carte tirée ne revient pas d'elle-même, et la
défausse n'est jamais recyclée. Ce qui change, c'est ce qui arrive quand la pioche est
vide : on tire alors dans la **pile de fatigue** — « les cartes qu'on pioche quand on
essaie de piocher avec un deck vide ». Une carte au hasard, à chaque fois.

La pile se **définit** une seule fois pour tout le jeu (`CHARACTER_DATA.fatigue`) ; **chaque camp en a sa copie**
(voir « Ex-libris et la pile de fatigue par camp »), héros comme PNJ. Elle s'édite dans le builder, en tête de la liste des
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


## La main n'a plus de plafond
`BALANCE.combat.handMax` à **0** veut dire « pas de limite », comme `boardSize` pour le
plateau (décision du game designer, 8 octobre 2026) : une pioche, une pioche de fatigue, une
pioche ciblée, une création ou un retour en main ne rate plus faute de place. Tout passe par
`mainPleine()` dans `engine.js`, seul endroit qui répond à la question ; le bot lit
`placeEnMain()` (infini sans plafond) pour valoriser une pioche. Remettre un nombre rétablit
le plafond partout. La main de l'écran de combat défile à l'horizontale, elle n'a pas de limite
de largeur.

⚠ **C'est un changement d'équilibrage, pas de confort**, mesuré en trios (`simulate.mjs 60
--paliers 3,3,3`) : la médiane des deux boss monte (Capitaine Grenouille 40 → 47 %, Grand-Duc
17 → 22 %), le reste ne bouge pas au-delà du bruit. Les cartes qui comptent la main (Faucon
Chasseur, Piqué, Plongeon, Grand Rapace…) n'ont plus de borne haute.


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

**Quatre événements de plus** (briques communes de la V3, `docs/V3-HEROS.md`) : `defausse`
(une carte va de la **main** à la défausse *par un effet* — la jouer n'en est pas une),
`meule` (elle va de la **pioche** à la défausse), `exil` (elle quitte une **défausse** pour
l'exil) et `fatigue` (elle vient d'être piochée dans la pile de fatigue). Le camp est celui
**à qui est la carte**, pas celui qui joue l'effet : meuler l'adversaire fait entendre « quand
l'adversaire meule » à son voisin. `exil` porte des libellés à lui (`EVENTS[ev].labels`),
puisque « Quand tu as une carte exilée » ne se dit pas.

**Un événement peut avoir une CARTE pour sujet** (`EVENTS[ev].sujetCarte`, aujourd'hui
`fatigue` : la carte piochée). `fireEvent(B, camp, ev, sujets, carteSujet)` la pose sur le
combat (`B.sujetCarte`) le temps que les effets du moment se résolvent, et `resolveAmounts()`
la glisse dans le filtre de cartes **« la carte concernée »** (`quoi: 'sujet'`, comme un type
lu ou un montant variable) : « quand tu pioches dans la fatigue, la carte piochée coûte 2 de
moins » se dit sans une ligne de moteur en plus. Ni garde ni « Lui » sur ces événements — il
n'y a pas d'unité à regarder — et la validation refuse ce filtre sur un moment qui n'a pas de
carte pour sujet (il ne trouverait jamais rien).

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
disparaît (il n'a pas de carte), et, **si la main a un plafond** (`handMax` > 0), une main
pleine renvoie la carte à la défausse.

**Deux déplacements de plus, vers des paquets qui ne sont pas des zones de jeu** :
- `met_a_la_defausse` : depuis le **dessus de la pioche** c'est une *meule*, depuis la
  **main** une *défausse*. Chaque carte déclenche l'événement `meule` ou `defausse`, chez
  celui à qui elle est. L'ordre par défaut est « du dessus » (meuler, c'est prendre le dessus).
- `exile` : depuis la défausse, la main ou la pioche vers l'**exil** (`B[camp].exile`, une
  liste par camp). Les cartes exilées ne reviennent **jamais** ; seul le compteur
  `exileCards` les lit. Une carte qui quitte une **défausse** déclenche `exil` ; depuis la
  main ou la pioche, rien ne part (elle n'a pas quitté une défausse).

La carte reste chez son propriétaire (« exile la défausse adverse » exile **ses** cartes à lui).
L'exil et la défausse sont des destinations de `depose()` ; les événements, eux, sont dits
par l'effet qui déplace. Le journal écrit l'exil à côté de la défausse (`etat.<camp>.exil`),
et compte les cartes exilées parmi celles que l'adversaire a *vues*.

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

Une **troisième façon** : **« la carte de Lui »** (`choix: 'lui'`), celle de l'unité que
l'effet précédent a visée. Après une Copie, « Lui » est l'unité qui vient de se
transformer, et sa carte est le **modèle copié** : « devient une copie d'une unité, puis
crée une copie de la carte de Lui » met en main la carte qu'on vient d'imiter (Caméléon,
niveau 5). Cette carte est déjà en jeu, donc déjà résolue : `carteNeuve()` la recopie
telle quelle — sans son `inst` (c'est une carte neuve) — au lieu de la résoudre une
seconde fois. Comme la cible « Lui », elle ne désigne rien en premier effet.


## La carte Miroir
Le mot-clé **`miroir`** (la carte libre « Miroir », que le Caméléon génère) : **en main**,
la carte **devient** celle que l'adversaire vient de jouer, avec **1 mana de moins**
(jamais sous 0), et change à chaque nouvelle carte qu'il joue. Ce n'est pas un passif de
héros — décision du game designer : pas de passif pour l'instant, tout passe par des cartes.

- ⚠ **Elle ne change QUE quand l'adversaire joue** (`retiensJouee()` → `reflete()`, dans
  `playCard`). Un Miroir qui arrive en main — pioché, créé — arrive **vierge** et le reste
  jusqu'à la prochaine carte d'en face, même si l'adversaire a déjà joué avant. Vierge, il
  ne se joue pas (`canPlay`). C'est cette règle, et **pas un plafond**, qui ferme la boucle
  « Découverte reflétée à 0 mana qui crée un Miroir qui redevient Découverte » : un
  plafond serait arbitraire et incompréhensible pour le joueur. Une future carte « les
  Miroirs reflètent aussi tes cartes » la rouvrira, et c'est voulu : un combo infini rare,
  qui dépend de l'adversaire, n'est pas un problème. Le bot, lui, devra savoir s'arrêter.
- On la **réécrit sur place** (même objet) : son `inst` reste, le journal la suit carte par
  carte, et elle garde son mot-clé — renvoyée en main, elle reflète de nouveau. Le banc du
  journal compte donc tout exemplaire `miroir` sous le nom « Miroir ».
- `refletDe` dit quelle carte jouée elle reflète : elle n'est refaite que pour une
  nouvelle carte, sinon un renfort reçu en main s'effacerait.


## La Reprise (Flashback)  — la fenêtre de zone qui la montre est décrite dans `game/src/ui/CLAUDE.md`
Le mot-clé **`reprise`** laisse lancer un sort **depuis ta défausse**, au **coût normal**, **sans
carte à dépenser** ; il est ensuite **exilé** et ne revient jamais. Décision du game designer : c'est
un vrai Flashback, pas un Jump-start (qui aurait fait défausser une carte). `surSort: true` dans
`KEYWORDS` : un sort peut le porter, et un palier le donner — la validation refuse tout autre
mot-clé sur un sort, et la Reprise sur un allié (il ne fera rien).

- **Une source de plus pour jouer** : `playCard(B, k, index, target, choix, zone)`, `zone` valant
  `'main'` (défaut) ou `'defausse'` — `index` se lit alors dans la défausse. `canPlay(B, k, carte,
  zone)`, `cardCost(carte, B, k, zone)`, `reprisesPossibles(B, k)` et `carteDuCoup(B, k, a)` suivent.
  L'action `{ type: 'play', index, zone: 'defausse', … }` traverse `joue()`, `coupsPossibles` et
  l'écran ; `zone` n'est écrit que pour une Reprise, si bien que les coups d'avant gardent leur
  forme (le journal, lui, écrit toujours `zone` : `'main'` par défaut).
- **L'ordre compte** : payer, retirer de la défausse, **exiler AVANT les effets** (comme un sort part
  en défausse avant les siens), puis les effets, puis les événements `spell` **et** `reprise`.
  Conséquences voulues : un sort qui remélange sa défausse ne se reprend pas lui-même ; « les cartes
  jouées retournent dans ta pioche » (Impératrice) ne le renvoie jamais au deck, l'exil passe avant ;
  et une carte qui quitte une défausse pour l'exil déclenche aussi `exil`.
- **Une reprise EST un sort lancé** : `spellsGame` / `spellsTurn`, Mage de l'étincelle, Tempête de Patounes, Matou
  Invocateur la comptent. Le moment `reprise` (« quand tu lances un sort depuis ta défausse ») s'y ajoute.
- **Les statiques savent d'où part la carte** : `zone: 'defausse'` sur `cout_des_cartes` (« les cartes
  de ta défausse coûtent 1 de moins ») et sur `montant_des_effets` (« +1 puissance pour les sorts qui
  partent de la défausse » ; sa cible `tous` = tout ce que `AMPLIFIABLE` monte). Sans `zone`, un
  statique vaut partout, comme avant. `B.sourceZone` ne vit que le temps des effets du sort : les
  moments que ses événements déclenchent (`fireEvent` le vide) n'en profitent pas.
- **Le bot** voit les reprises : `coupsPossibles` (Monte-Carlo), `coupLeger` (rollouts) et les
  priorités de `decide` (où `playable` mêle la main et la défausse, avec leur `zone` ; `jouer(x,
  cible)` écrit le coup). Une reprise vaut le sort, sans coût de carte.

## Charogne et Appât  (V3, 10 octobre 2026 — `docs/V3-HEROS.md`, 4.3 et 4.3 bis)
Deux effets qui se complètent : l'**Appât** nourrit la défausse adverse, la **Charogne** la mange. Aucun des deux ne
touche à la pioche, à la main, au plateau adverses, ni à **ta** défausse.

- **`charogne`** (`n` : un montant du jeu, donc un compteur ou le statique `montant_des_effets` `cible: 'charogne'` ;
  `t` : qui dévore, `self` par défaut). Prend les `n` **dernières** cartes de `B[foe(k)].discard` (la fin du
  tableau : le dessus, et la défausse reste chronologique), les `depose(…, 'exil')`, émet `deplace` (`mode: 'exil'`,
  `via: 'charogne'`), tire **un `fireEvent('exil')` par carte** (avant le renfort), puis donne le renfort par un
  `buff` ordinaire rejoué sur ceux qui mangent (`applyEffects` avec `depart` : « Lui »). Les mots-clés sont ceux des
  **alliés** mangés dont `KEYWORDS[id].transmissible` ; chacun passe en +0/+0 après le renfort (un seul renfort,
  donc une seule fois « quand cette unité reçoit du renfort »). Personne pour dévorer (sort sans unité) ou défausse
  adverse vide : rien n'est mangé. Elle **rend ses destinataires** (`EFFETS_QUI_CHAINENT`).
- **`appat`** (`n`) : `copieDeFatigue(B, foe(k))` (la pile **de l'adversaire** — la sienne, par camp depuis Ex-libris —, au niveau de sa ligne) × `n`, poussées à la
  fin de `B[foe(k)].discard`. **Pas une pioche** : `B[camp].fatigue` (le plafond par tour) ne bouge pas. **Aucun**
  événement de jeu (ni `defausse`, ni `meule`, ni `exil`) ; le récit dit `deplace` `mode: 'appat'`.
- **Le bot** (`ai.js`) : `charogne` vaut 2 par carte des X dernières de la défausse adverse + 1 par mot-clé transmissible
  d'allié ; `appat` vaut 1,2 par carte s'il y a une Charogne à nourrir (`aDesCharognes`, ou la carte elle-même) et une
  pile non vide, moins 0,9 si l'adversaire montre une reprise dans la défausse (`reanimationEnFace`). `effectsValue` suit les
  appâts d'une même liste (`ctx.repas`) : « Appât 1, puis Charogne 2 » est lu avec la carte qu'il va fabriquer.
- **L'interface** : le journal dit « Appât » (`MODES.appat`, jamais caché : la défausse est publique), l'icône est `Exile` /
  `Create` (`pictos.js`, `effets.js`), le wiki rejoue les deux (`vfx-scenes.js`).

## La Toxine  (V3, 11 octobre 2026 — `docs/V3-HEROS.md`, 4.4)
Un **marqueur** posé sur une unité, qui la ronge : au début du tour de son contrôleur, avant sa pioche, elle perd 1 PV par
marqueur. À sa mort, ses marqueurs sautent sur une autre unité du même camp. Jamais sur un héros.

- **Le marqueur** : `u.tox` (un état, comme `damage` — pas dérivé par `refresh()`), initialisé par `makeUnit`. `devientCopie`
  (copie, switch) repart à neuf ; une unité renvoyée en main ou exilée n'existe plus ; une unité volée (`owner`) garde les siens.
- **Le tic** : `ticDeToxine(B, k)`, appelé par `commenceTour` **après** la remise à zéro des attaques et **avant** la pioche, suivi
  d'un `resolveDeaths` (une unité qui en meurt n'attaque jamais). Il n'est **pas** `damageUnit` : pas de source, donc pas de
  Venin ; le récit est un `degats` avec `toxine: true` (`bouclier: true` quand `u.shield` absorbe, qui tombe : les marqueurs
  restent). Il lit `staticTotal(B, k, 'toxine_brule_le_heros')` : 1 dégât au héros par marqueur et par porteur, Bouclier ou non.
- **Le saut** : en tête de `resolveDeaths`, **une fois tous les morts du lot retirés**, chaque mort qui portait des marqueurs les
  passe à une survivante du MÊME camp (`B[k].board`, déjà filtré), au hasard ; sinon ils disparaissent. Récit `toxineSaut`. Puis
  `unitToxinee` part pour chaque porteur, APRÈS `unitDies` (« quand une unité adverse qui porte une Toxine meurt »).
- **Les effets** : `toxine` (`t`, `v` ; amplifiable ; héros ignorés ; rend ses destinataires), `contagion` (`v`, `dmg` : les unités
  ADVERSES qui portent déjà des marqueurs ; `dmg` passe par un vrai `dmg`, donc par les statiques), `epidemie` (`v` sur chaque unité
  adverse, puis un `damageHero` par unité du total APRÈS la pose ; les marqueurs restent).
- **`montant_des_effets` `cible: 'toxine'`** : « tes Toxines en posent 1 de plus » — `toxine`, `epidemie` et `contagion`
  (`resolveAmounts` : `poseDesToxines`) ; une Contagion « dégâts seuls » (`v: 0`) ne pose rien et ses dégâts n'en reçoivent pas.
- **Le bot** (`ai.js`) : `effectValue` lit une Toxine comme des dégâts répartis dans le temps (~1,4 par marqueur, plafonné par
  `poids(u)` moins ce que ses marqueurs lui prennent déjà). `meurtDuTic(u)` (marqueurs ≥ PV, pas de Bouclier) : `unitThreat` ≈ 0,
  `meilleureAttaque` ne la frappe pas, et la nôtre ne « coûte » rien à perdre.
- **L'écran** : `.tox` (gemme verte, `majUnite`) ; la fiche dit « perdra N PV au début de son tour — et en mourra » ou « son
  bouclier absorbera le premier tour » ; le journal écrit `toxine` / `toxineSaut` ; `refUnite` et `uniteJson` portent `tox`.

## Ex-libris et la pile de fatigue par camp  (V3, 11 octobre 2026 — `docs/V3-HEROS.md`, 4.5)
Une carte qui **arrive dans ta défausse** — jouée, morte, meulée, défaussée, par n'importe quel chemin — laisse **un exemplaire**
dans ta pile de fatigue, une seule fois par carte. La pile devient **propre à chaque camp**.

- **La pile du camp** : `B[k].pile`, `null` tant que personne n'y a touché (le camp lit alors la pile commune `fatiguePile()`,
  exactement comme avant) ; la première écriture la copie en cartes-modèles **déjà résolues** (`pileModeles`). Un combat qui ne
  s'en sert pas ne paie rien, `cloneBattle` non plus. Lectures exportées : `nbFatigue(B, k)` (combien) et `pileDeFatigue(B, k)`
  (lesquelles, sans rien écrire) ; `peutAgir`, `carteDeFatigue`, `copieDeFatigue(B, k)`, le bot, l'écran et le journal passent par là.
- **Un seul point d'arrivée** : `versLaDefausse(B, camp, carte)` pousse dans la défausse puis `classe()`. Tout ce qui met une
  carte en défausse y passe : sort joué (classé **après** la ligne « joue »), allié mort (chez son **propriétaire**),
  `depose(…, 'defausse')`, switch d'une unité en sort, pioche qui déborde, `met_a_la_defausse` (classé après son récit).
  **Ce qui n'y passe pas ne laisse rien** : l'exil (Reprise, Charogne, `exile`) et le retour en pioche (Impératrice).
- **`carte.classee`** : le drapeau qui ferme la boucle (« une seule fois par carte »), écrit **sur la carte**. Une carte qui vient
  d'une pile (pioche de fatigue, Appât, `cree` de la pile) naît classée — elle y est déjà. Une carte neuve (créée, copiée par
  `carteNeuve`, reflet d'un Miroir via `retiensJouee`) ne l'est pas : c'est une autre carte, elle se classera à son tour.
- **Ce qui entre** (`modeleDePile`) : la carte du catalogue lue au niveau de son propriétaire (`ownerLevel`) — ni ses renforts ni
  son coût du moment. Hors catalogue : un instantané net de la carte.
- **Ce qui en sort** : `copieDeFatigue(B, k)`. Seule `carteDeFatigue` est une **pioche** (plafond par tour, événement `fatigue`) ;
  l'Appât (pile de l'adversaire) et `cree` avec `choix: 'fatigue'` n'en sont pas.
- **Annotation et Index n'ont plus d'effet à eux** : `renforce_les_cartes` avec `d_ou: 'fatigue'` (tout : `n: 99`) — écrit **en
  place** sur les modèles, via `paquetDe(…, fatigueOk)` — et `cree` avec `choix: 'fatigue'` (+ `atk`/`hp`, bonus que tout `cree` a
  maintenant). `fatigue` n'est **pas** une entrée de `ZONES` : une zone pour renforcer seulement, jamais prélevée.
- **Récit** : `classe` (`camp`, `carte`, `pile` = la taille après) ; `renfortCartes` porte `zone: 'fatigue'` ; le journal de décisions
  écrit `etat.<camp>.pileFatigue` (champ ajouté, `v` inchangé).
- **Le bot** (`ai.js`) : `faisable` lit la pile du bon camp (`nbFatigue` — celle de l'adversaire pour un Appât) ; une Annotation vaut ce que
  ses alliés rapportent (×0,25) ; `cardValue` donne +0,3 à une carte à Ex-libris pas encore classée. Il ne sait toujours pas que
  gagner la course à la fatigue est un plan.
- **Validation** : `ex-libris-risque` (**bloquant** : un `detruit`/`dmg` sur toutes les unités adverses ne porte pas Ex-libris) et
  `ex-libris-trop` (avertissement : plus de 2 cartes par héros).

## Le Pistage  (V3, 10 octobre 2026 — `docs/V3-HEROS.md`, 4.1)
« Piste N cartes » **marque** des cartes de la main adverse ; la marque ne fait rien seule : elle rend la carte plus
chère, la fait punir quand elle est jouée, la laisse se défausser ou se compter. Elle est écrite sur la CARTE.

- **La marque** : `card.pistee`. `piste` (`n`) tire **au hasard** parmi les cartes de `B[foe(k)].hand` qui n'en ont pas
  (99 = toute la main) et s'arrête au premier échec. `cloneBattle` et le journal (`carteJson`) la copient.
- **Elle quitte la carte quand elle quitte la main** : `depose()` l'efface pour toute destination autre que `'main'`
  (défausse, exil, pioche, plateau, main pleine), `jouerCarte` l'efface en retirant la carte de la main. Une carte
  renvoyée en main la garde ; Miroir (`reflete`) et switch dans la main (`autreFace`) la gardent ; une carte créée ou
  copiée (`carteNeuve`) n'en a jamais.
- **Le coût réel** : `cardMatches` répond `case 'pistee'` (le filtre), donc `cout_des_cartes` + `quoi: 'pistee'` passe par
  `cardCost` — main, bot, `canPlay` et affichage. Les statiques se cumulent (+2 et +1 = +3). Le compteur
  `cartesPistees` (lu **au moment où l'effet part**, donc après la marque de la même carte) compte la main adverse.
- **L'événement** `pistee` : `jouerCarte` le tire pour le camp qui joue la carte, **après le paiement et avant l'unité et
  les effets**, puis `resolveDeaths` ; si le héros meurt, la carte ne se résout pas. « Quand l'adversaire joue une carte
  pistée » = `on_pistee_foe`. Pas de sujet, donc pas de garde ni de « Lui ».
- **`pistage_a_la_pioche`** (statique, `qui: 'adversaire'`) : `pisteALaPioche()` marque la carte à la fin de `draw()` (pioche
  normale, pioche de fatigue) et de `drawMatching()` (pioche ciblée). Pas une carte créée, pas un renvoi en main.
- **Le bot** : `coutDePistage(B, k, carte)` (`ai.js`) = la somme des `on_pistee_foe` / `on_pistee_any` des unités ADVERSES lue
  de leur côté (`effectsValue`, contexte du camp adverse), moins les `on_pistee_self` des nôtres ; `cardValue` le retranche
  d'une carte pistée en main. Une marque `piste` vaut `0,4 + punitions de nos unités + 0,8 × le surcoût en mana de nos taxes`
  par carte marquable (`faisable` : il faut une carte libre en face).
- **Validation** : `pistage-sans-piste` (erreur bloquante) — une carte qui lit le pistage sans en poser.
- **L'écran** : `majCarte` pose `.patte` (`icone('Track')`) sur une carte de ta main pistée ; la main adverse s'écrit
  « Main N (K 🐾) » ; la fenêtre de zone a un groupe **« Main adverse (de dos) »** quand une carte y est pistée (`zone.js` :
  `x.dos`, jamais de `data-geste`, jamais un nom).

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
« Volte-Face » (ex-Bipolarité) vise n'importe quelle unité, et mal la lancer est censé pouvoir arranger
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

⚠ **Un paramètre de cible hors sujet ne compte pas** (`si` dans le registre). Le builder
remplit toute cible par une valeur par défaut (`newEffect`), et elle **reste dans la carte**
quand le champ ne s'affiche plus : un déplacement *depuis la défausse* garde un `t` « une
unité adverse ». `ciblesDe()` (moteur) et `faisable()` (bot, via `cibleCompte()`) l'ignorent
donc. Avant, Retrouvailles, Impératrice Nocturne ou Présage demandaient au joueur de pointer une
unité adverse pour rien, et devenaient **injouables** quand le plateau d'en face était vide.

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


## Choisir entre deux effets (ou trois)
`choisir` est le premier effet dont les **paramètres sont d'autres effets** (`a` et `b`,
type `effects`, et un **troisième choix `c` facultatif** — Découverte s'en sert). Tout ce
qui parcourt les branches passe par `branchesDe(e)` / `choixDeLaCarte(card)` /
`brancheChoisie(e, choix)` (`config/mechanics.js`) : `c` n'existe que s'il est rempli, si
bien que les cartes écrites avant lui restent des choix à deux, et une réponse inconnue
retombe sur la première branche. « Choisit les deux » fait partir **toutes** les
branches. Une seule branche part — et une branche est une **liste** : « inflige 2
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

**Ce que le bot doit devenir** (décision du game designer, 8 octobre 2026). Le niveau à
règles **joue tout ce qu'il peut dès qu'il peut** : c'est tenable tant que le jeu est très
simple, mais il va multiplier les erreurs à mesure que les cartes interagissent. Il devra
**évaluer la position** — ce qu'il y a en face, et si un coup sert à quelque chose. La
méthode voulue : **recenser les situations où il se trompe et les présenter une par une
au game designer**, qui dit comment chacune se traite. Le support naturel est le banc de
situations (une fiche par cas, « Que jouerait le bot ? »). Premier cas noté : jouer
Découverte pour créer un Miroir qui rejouera Découverte ne sert à rien — c'est le genre de
boucle sans gain que le bot doit savoir refuser, et qu'on ne règle **pas** par un plafond
(cf. « Philosophie de design »).


## Le journal de décisions de combat
`game/src/combat/journal.js` enregistre un combat de façon qu'on puisse, **pour chaque
décision**, reconstituer tout ce qui était possible et ce qui a été choisi. `B.log` dit ce
qui a été joué ; il ne dit jamais ce qui a été **écarté** — or c'est exactement ce qu'il
faut pour apprendre au bot à jouer comme le game designer (« tu avais ces sept coups, le
bot aurait pris celui-ci, tu as pris celui-là : pourquoi ? »).

**Un fichier par combat, au format JSONL** : une ligne = un objet JSON = un événement, avec
`t` (le type), `v` (la version du schéma) et `i` (son rang, à partir de 0). Un `debut`
(config, empreinte des données, les 15 cartes en entier, ordre de pioche, mains de départ),
N `decision`, un `fin`. **Ajouter un champ ne change pas `v`** ; renommer, supprimer ou
changer le sens d'un champ l'incrémente, et se note dans l'historique en bas du fichier.

Une **décision**, c'est une photo complète des deux camps *avant* l'action — main adverse et
ordre des pioches compris — plus `coupsLegaux` (tout ce qui était jouable, **une entrée par
carte ET par cible**, là où le bot n'en garde qu'une), `coup` (ce qui est parti),
`evaluationBot` et les lignes de `B.log` écrites depuis la décision précédente. Le bloc
`vue` dit à côté ce que celui qui décidait pouvait **savoir** : l'analyse ne doit reprocher
à un joueur que ce qu'il pouvait voir.

⚠ **`joue(B, k, action, controle, niveau)` est l'unique point d'entrée des actions** — le
jeu, l'arène et les scripts y passent tous, et `node scripts/test-partage.mjs` le vérifie
(un fichier qui demande son coup au bot et l'applique lui-même est refusé). Journal éteint,
`joue()` ne fait qu'appeler l'action : **zéro allocation, zéro copie**. C'est la condition
pour que l'idle d'un joueur ne paie pas un outil de game design.

⚠ **Deux identifiants, et ils ne se ressemblent pas.** `id` est celui de la carte (le même
pour les trois exemplaires de Morsure) ; **`inst`** est celui de l'**exemplaire**, posé par
`makeSide` au mélange et stable tout le combat. Sans lui, un journal qui dit « Morsure » ne
dit pas laquelle. Une carte **fabriquée** en combat (pile de fatigue, « Crée une carte ») et
une carte **copiée** (qui porterait l'identifiant de son modèle) en reçoivent un neuf,
préfixé par `c` — `instDe()` est le seul endroit qui répond, et il passe par l'**identité**
de l'objet, seule chose qui reste vraie entre deux cartes rigoureusement identiques.

⚠ **La ligne est figée avant que l'action parte.** `etat` tient des références vers les
effets des cartes, et l'action va modifier le combat : on sérialise donc la ligne d'abord,
puis on ajoute `ok` — ce que `playCard`/`attack` ont renvoyé — à la chaîne déjà close. Il
se range **à côté** de `coup`, pas dedans : le coup est ce qu'on a voulu faire, `ok` ce que
le moteur en a fait.

**`evaluationBot`, c'est ce qui rend le fichier utile.** Pour une décision du bot, c'est ce
que le mouchard (`ecouteLesChoix`) vient de noter — d'où le `coup` **brut** ajouté à côté de
chaque candidat, que `analyse-cartes` ignore et dont le journal a besoin. Pour une décision
**humaine**, `evalue(B, k, niveau)` (dans `ai.js`) rejoue la même réflexion sur une
`cloneBattle`, **sans** jouer le coup : c'est ce champ, et lui seul, qui permet de repérer
automatiquement les décisions où l'humain et le bot divergent. `ecouteLesChoix` rend
l'écouteur **précédent** — il n'y a qu'un mouchard, et deux outils peuvent vouloir écouter.

⚠ **`cloneBattle` ne copie jamais le journal** : il tient une WeakMap et une fonction (que
`structuredClone` refuse), et surtout une copie est une **hypothèse** — les milliers de
parties imaginées par le Monte-Carlo n'ont rien à faire dans le journal de la vraie partie.

⚠ **Une cible qui ne désigne rien s'écrit `null`.** Quand une carte demande une cible
qu'aucune unité ne peut remplir, le bot pointe le héros adverse et l'interface ne pointe
rien : le journal les écrit pareil, sinon le même coup s'écrirait de deux façons et ne se
retrouverait pas dans ses propres `coupsLegaux`.

⚠ **`B.logTotal` compte tout ce qui a été dit**, `B.log` ne garde que les 400 dernières
lignes : c'est la différence des deux qui dit lesquelles sont neuves. Sans ce compteur, un
combat de plus de 400 lignes perdrait ses premières phrases **sans le dire**.

**Activation.** Éteint par défaut. Dans le jeu : `?journal=1` dans l'adresse — et il se
**retient** (`localStorage`), sinon il faudrait le retaper à chaque ouverture de l'app
installée ; `?journal=0` l'éteint. Un **⏺ rouge** reste visible pendant le combat (une
partie ne s'enregistre pas dans le dos du joueur) et l'écran de résultat porte
« ⬇ Télécharger le journal de décisions ». Dans l'arène : `duel(a, b, { journal: true })`,
qui rend le fichier dans `journal`. Mesuré : **4 ko par décision**, soit 150 à 400 ko par
combat — le JSONL se compresse très bien, on n'optimisera qu'après une mesure réelle.

`node scripts/test-journal.mjs [parties]` est le banc : il joue des parties enregistrées et
relit chaque fichier — les `i` se suivent, le fichier commence par `debut` et finit par
`fin`, une `decision` par action tentée, chaque `coup` figure dans ses `coupsLegaux`, un
`inst` ne désigne jamais deux cartes, l'`etatFinal` concorde avec le vainqueur, et **aucune
ligne de `B.log` n'est perdue ni dupliquée** — il force pour ça un combat de plus de 400
lignes, le seul cas où le journal texte est tronqué.

⚠ **Ce banc est instable, et ce n'est pas nouveau** (mesuré le 8 octobre 2026 : environ un
passage sur trois échoue, avec ou sans changement de code). Deux vérifications tombent au
hasard des tirages : « le coup joué figure dans les coups légaux » sur une carte
**fabriquée** en combat (`inst` en `c…`), et « un combat de plus de 400 lignes a été joué »
quand aucune partie n'est assez longue. Un échec isolé de l'une de ces deux-là ne dit donc
rien du changement qu'on teste : relancer, et comparer au code d'avant si ça persiste. La
correction de fond est à faire (la cause du premier n'est pas trouvée).

**Pas encore fait, dans l'ordre prévu** : l'envoi automatique au serveur de l'Atelier
(`POST /api/journal`, un dossier `journaux/` sur le Pi, que lira la pipeline Python/SQL) ;
le script qui extrait les décisions humaines divergentes, triées par écart de note ; le
format de « coup du designer » qui transforme une décision annotée en cas de test du banc
du bot. ⚠ Le serveur refuse les options qui écrivent un fichier choisi par la page
(`--csv`, `--logs`) : faire sortir les journaux du simulateur depuis l'Atelier demandera
une décision, pas seulement du code.


## Les événements du combat (le récit en données)

**Les événements** (`game/src/combat/evenements.js`, émis par `engine.js`) racontent le combat en
**données** : `B.evts`, une liste d'objets JSON `{ i, tour, camp, cause, t, … }`. ⚠ **Éteints par
défaut** : `B.evts` n'existe que si on ouvre le combat avec `createBattle(…, { evenements: true })`
(l'interface le fera ; ni le bot, ni les simulations, ni l'aperçu d'un coup). Chaque point
d'émission commence par `if (B.evts)` : éteint, il ne construit rien et ne tire rien au hasard — un
combat raconté se joue **mot pour mot** comme un combat qui ne l'est pas (vérifié sur 60 parties
graines, `scripts/test-evenements.mjs`). `cloneBattle` **ne copie jamais** `evts` ni `evtCause`.

- **La cause** : chaque événement porte l'indice de celui qui l'a provoqué (`cause`, `null` pour un
  tour ou la fin). `joue` et `attaque` sont les racines ; `declenche` (râle d'agonie, début/fin de
  tour, « quand X alors Y ») ouvre un sous-arbre ; `choix` aussi. Une **mort** a pour cause **le
  dernier coup reçu** (`noteCoup`/`coupDe`, une `WeakMap`), pas l'action qui l'entourait : « meurt à
  la riposte ». `B.evtCause` est la cause en cours ; `avec(B, i, fn)` la pose le temps de `fn`.
  `playCard`, `attack` et `beginTurn` sont des **enveloppes** (`jouerCarte`, `attaquer`,
  `commenceTour`) qui la remettent en sortant, par où qu'on sorte.
- **Les photos** (`refCarte`, `refUnite`, `refHeros`, `refSource`, `refCible`) sont prises **au moment
  du fait** : une unité morte a quitté le plateau, son événement doit encore dire qui elle était.
- **Les types** : `tour`, `joue` (avec `paye`, `zone`, `cible`), `attaque`, `degats` (`avant`/`apres`/
  `perdu`, `riposte`, `bouclier`, `venin`, `armure`, `annule`), `soin`, `renfort` (et `renfortCartes`),
  `invoque` (`via` : carte, jeton, pose), `meurt`, `detruit`, `declenche` (`moment`), `choix`,
  `pioche` (`fatigue`, `perdue`, `cherchee`), `aVide`, `deplace` (`mode` : melange, renvoi, pose,
  meule, defausse, exil, cree, appat), `transforme` (copie, switch), `controle`, `cout`, `mana`, `armure`,
  `miroir`, `piste`, `toxine`/`toxineSaut`, `classe` (Ex-libris : une carte entre dans la pile de fatigue de son camp), `fin`.
- **Ce qui change un montant** : `degats` et `soin` portent `bonus` et `via` (les porteurs d'un effet
  statique « +1 aux dégâts » et ce qu'ils ont ajouté — `staticTotal` accepte maintenant un
  collecteur `via`) et `x` (« X = tes tours joués »). C'est le « ah oui, mais il y avait ça en plus ».
- **Les cartes de l'adversaire** : les événements disent tout (c'est ce qui rend un combat
  relisible après coup) ; c'est à l'**écran** de ne pas montrer en direct ce que l'adversaire pioche.
- **Banc** : `node scripts/test-evenements.mjs` (≈ 3 900 tests) — le duel de la maquette du game designer
  (un Chien 3/3 contre un Hibou 2/5 : 5 → 2 et 3 → 1), un râle d'agonie en chaîne, un sort, un montant
  modifié, et sur 60 parties entières : mêmes parties allumé/éteint, causes qui pointent en arrière,
  JSON pur, **rejouer les événements redonne les PV de fin**, toute unité morte ou en jeu est née d'un
  événement.
