# Grammaire des paliers de niveau

Ce document dit **comment écrire les paliers d'une carte**, pourquoi, et comment le vérifier
sans les relire un par un (`node scripts/audit-paliers.mjs`). Il est écrit pour être lu par
un humain **ou par une autre IA** : tout ce qu'il faut pour écrire un palier valide y est.

## Le constat (7 octobre 2026)

La question du joueur à chaque montée de niveau : **« quelle carte a changé, qu'est-ce
qu'elle fait maintenant, et à quel point ça change mon archétype ? »**. Un palier
`+0/+1` ne répond à aucune des trois.

Mesuré avec `scripts/audit-paliers.mjs` avant la refonte des V2 :

| | cartes | paliers | part de « verbes » | cartes 100 % chiffres |
|---|---|---|---|---|
| V1 (les six premiers héros) | 60 | 173 | 4 % (Miracle) à 69 % (Athéna) | 19 sur 60 |
| V2, première version | 60 | 180 | 2 % | 56 sur 60 |

Les V2 avaient recopié les paliers par défaut du builder (2/5/10 : `+0/+1`, `+1/+0`, `+1/+2` ;
3/6/11 : effet +1, coût −1, effet +2). Côté V1, le héros Grenouille a **12 niveaux muets**
(rien ne change aux niveaux 4, 7, 8, 9, 12 à 17) et Miracle n'a aucun verbe sur 8 de ses 10 cartes.

## Les cinq sortes de palier

Un **palier de chiffre** se lit (stats, « effet + », coût −). Un **palier de verbe** se
raconte : la carte fait *autre chose*. Un niveau doit donner à raconter.

| Sorte | Fenêtre | Ce que le joueur voit | Comment l'écrire |
|---|---|---|---|
| **Éveil** | niv. 2–6 | un petit geste net | un peu de chiffre **ou** un mot-clé |
| **Verbe** | niv. 7–11 | la carte fait quelque chose de nouveau | `extra` sur un **autre moment** (râle, début/fin de tour, événement) |
| **Pivot** | niv. 12–16 | la carte change de rôle dans le deck | `aura`, `statique`, portée élargie, lien avec une autre espèce, « choisit les deux » |
| **Sommet** | niv. 17–20 | une règle qui se brise, un niveau = un sommet | sur 4 cartes du héros, une par niveau |

Règles de lecture (toutes vérifiées par l'audit) :

1. **Le chiffre accompagne le verbe, il ne le remplace pas.** Une carte a **au plus un**
   palier purement numérique (stats / effet + / coût) et **au moins un verbe**.
2. **Aucun niveau muet** de 2 à 20 : chaque niveau change au moins une carte du héros.
3. **Jamais plus de 3 cartes qui changent au même niveau** (base + switch confondus) : au-delà,
   le joueur ne sait plus ce qui a changé.
4. **Chaque héros a deux piles qui se jouent** (base et switch) : viser le même rythme de
   chaque côté, pour qu'un deck « tout base » et un deck « tout switch » sentent chaque niveau.
5. **Un seul palier par niveau et par carte**, avec un `text` écrit pour le joueur
   (« Râle d'agonie : revient dans ta main. »), pas « +1 ».
6. **Un coût ne tombe pas à 0 par accident** : la somme des paliers « coût » reste sous le coût
   de base, ou le design assume une carte gratuite.

## Les manières de faire monter une carte (le catalogue d'idées)

Chacune se code avec un palier existant — aucune ne demande de toucher au moteur.

- **Le palier qui change de moment.** Le cri de guerre devient aussi un râle d'agonie
  (« Pickpocket : pioche — et pioche encore quand il meurt »). `extra` + `slot: 'death'`.
- **Le palier qui change de portée.** « Un allié gagne +2/+0 » devient « et tous tes Chats aussi ».
  `extra` avec une cible plus large (`allyType:Chat`, `allAllies`).
- **Le palier qui décore la cible** (`previous` = « Lui ») : le sort qui renforce un allié lui
  donne **en plus** un mot-clé, de l'armure, un type.
- **Le mur qui se lève.** Un 0/4 à Provocation gagne Charge ou un déclencheur de fin de tour :
  la carte change de **rôle**, pas de taille.
- **L'œuf qui éclot.** Un râle d'agonie qui invoque une unité plus grosse (Œuf de Hibou → Hibou 3/3).
- **La boucle.** Un palier qui fait *revenir* la carte (râle d'agonie : `cree` la même carte).
- **La maîtrise : « Choisit les deux ».** Un sort écrit avec un `choisir` (A **ou** B) gagne
  au palier 12 le droit de faire les deux. Le joueur ne choisit plus : le sort *grandit*.
  (Curée, Songe : voir `scripts/lib/heros-v2-paliers.mjs`. Le palier est signalé sans effet par le builder
  si la carte n'a aucun `choisir`.)
- **Le lien d'espèce.** Un palier tardif qui donne un effet à *une autre espèce* (le Grand Loup
  renforce aussi les Chats) : investir dans un héros ouvre un pont, c'est une décision de **plan**.
- **L'effet statique** (sommets) : « tes sorts coûtent 1 de moins », « +1 dégât à tous tes dégâts »,
  « les sorts que tu joues retournent dans ta pioche ». Ce sont les paliers qui ont une saveur de règle.
- **L'effet en pile** (`aura`) : une aura qui s'**épaissit** (+0/+1 de plus, puis un mot-clé) plutôt
  qu'un nouveau chiffre sur la carte.

## Ce que le moteur accepte, et les pièges découverts

- **Une sorte de palier par entrée** : stats, **ou** mot-clé, **ou** coût, **ou** amp, **ou** aura,
  **ou** statique, **ou** extra, **ou** « les deux ». Le builder défait les autres champs dès
  qu'on change la sorte. Pour « +1/+1 **et** un nouveau moment » à un même niveau, écrire deux
  entrées de même niveau — l'audit le signale, parce que le joueur le lira comme un seul changement.
- **`amp` ne touche que `dmg`, `heal`, `buff`, `armor`** (`AMPLIFIABLE`, `mechanics.js`). Sur un
  sort qui pioche, renforce la main ou invoque, il ne fait rien (le builder le signale, l'audit aussi).
  Pour un effet de renfort de main, passer par un `extra` du même type.
- **`cost: -1` est plafonné à 0** par `resolveCard`. Trois paliers « coût −1 » sur une carte à 2
  en font un mort. L'audit le dit.
- **Les mots-clés ne vont qu'aux alliés** ; stats, aura et statique aussi. Un sort n'a que `amp`,
  `cost`, `extra` (sur `play`) et « les deux ».
- **Un palier ne pose pas de garde.** Une garde (« seulement si c'est un Chien ») s'écrit sur la
  carte (`card.gardes[slot]`) *avant* ; le palier ne fait que remplir le moment.
- ⚠ **Une garde n'a de sens que sur un événement qui a un sujet** : jouer un allié, attaquer,
  recevoir du renfort. « Quand tu perds une unité » **n'a pas de sujet** : y poser une garde de
  type (« seulement un Chien ») fait que le moment **ne part jamais**, sans un mot. Découvert
  sur Louve Alpha et Matriarche ; `validate.js` le signale maintenant en erreur bloquante.
- ⚠ **Un déclencheur qui se nourrit lui-même explose.** « Quand tu perds une unité, invoque un
  Chaton 1/1 » + une aura adverse −0/−1 qui tue chaque Chaton à son arrivée : chaque mort
  invoque, chaque invocation meurt. Avec **deux** invocations par mort, le plateau double à
  chaque étage (le garde-fou de profondeur est à 8) et la partie ne rend plus la main.
  Les paliers `aura` négatifs sur les **PV** adverses sont donc à proscrire tant que le plateau
  n'a pas de plafond de sécurité ; un malus d'**attaque** est sans danger (il plafonne à 0).

## Le calendrier d'un héros

15 niveaux de 2 à 16 × 2 piles (base, switch) = 15 paliers par pile, un par carte et par niveau,
plus quatre sommets (17, 18, 19, 20). Un héros V2 : **33 à 34 paliers**. Chaque carte reçoit un
Éveil, un Verbe, un Pivot, et les cartes d'arrivée reçoivent un Sommet. Les niveaux de chaque
fenêtre sont distribués en permutation entre les cinq cartes d'une pile (une carte n'est pas
« toujours niveau 2 »).

`scripts/lib/heros-v2-paliers.mjs` est la source des paliers des V2 (et leur tableau de lecture) ;
`scripts/gen-heros-v2.mjs` les applique au fichier de données (il écrase les six V2 : à ne relancer que pour repartir de zéro).

## L'outil : `scripts/audit-paliers.mjs`

```
node scripts/audit-paliers.mjs                 # tous les héros, lisible
node scripts/audit-paliers.mjs --hero dog2,cat2
node scripts/audit-paliers.mjs --json          # lisible par une machine
node scripts/audit-paliers.mjs --strict        # code de sortie 1 au moindre avertissement
```

Il rend, par héros : le nombre de paliers, la **part de verbes**, les cartes 100 % chiffres,
les niveaux muets ou surchargés ; puis la liste des cartes en faute (paliers par défaut laissés
tels quels, coût mort ou gratuit, Provocation + Élusif, palier sans effet, palier sans texte).
Les seuils de lecture sont en tête du fichier (`MAX_PAR_NIVEAU`, `MAX_NUMERIQUES`…). Il ne joue
aucune partie, il se lance donc sans la file de calcul.

Pour une IA qui reprend ce travail : lancer l'audit **avant** et **après** toute retouche de
paliers, et ne pas livrer tant que `--hero <les héros touchés>` ne rend pas 0 erreur / 0
avertissement. Les mesures de jeu restent `check-decks`, `matchups --taille 3`, `test-situations`.

## V1 : ce que l'audit dit des cartes d'origine (non modifiées)

- **Miracle (caméléon)** : 4 % de verbes, 8 cartes sur 10 sont des chiffres, rien ne change après
  le niveau 12. Transmigration n'a aucun palier. C'est le héros qui a le plus à gagner : le
  caméléon est le héros du **type** — « gagne Type : tous » (palier de mot-clé), une aura de
  type qui s'épaissit, « choisit les deux » sur Découverte (déjà là) étendu à Bipolarité.
- **Grenouille (Bulle)** : 12 niveaux muets (4, 7, 8, 9, 12 à 17). Cinq cartes changent aux
  niveaux 2, 3, 5 et 10 en même temps. Grand Crapaud et Fermier du Nénuphar sont les paliers
  par défaut recopiés. Idées : Têtard grandit à chaque début de tour (le renfort est déjà son
  moteur), Grand Crapaud gagne Venin ou une aura de Taunt.
- **Chien, Chat, Corbeau, Chouette** : 2 à 4 cartes 100 % chiffres chacune (Toutou Fidèle, Enragé,
  Griffure, Éclaireur, Grand Corbeau…) et des niveaux surchargés (jusqu'à 6 cartes qui changent au
  niveau 6 chez Athéna). Les déplacer d'un cran suffit souvent à dégager les niveaux muets.
- **Tu ne dois pas tout changer** : le but est que chaque niveau *se sente*, pas que tout soit
  un verbe. Les paliers de chiffre ont leur place sur les cartes qui servent de remplissage.
