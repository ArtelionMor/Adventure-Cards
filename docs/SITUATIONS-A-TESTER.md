# Situations à tester

« Je ne veux pas avoir à jouer pour arriver aux situations à tester. »

Ce fichier liste les **positions qui valent d'être vues** — pas des parties, des
*instants*. Chacune est un point de décision où quelque chose se joue : soit le bot y est
probablement faux (et c'est ce que le journal de décisions doit capturer), soit une
mécanique y a un piège qu'aucune relecture ne voit, soit c'est un mur de la courbe de
difficulté qu'il faut regarder de près.

C'est le **contenu du banc de situations** — chaque fiche existe aussi en données dans
`game/data/situations.js`, et se monte d'un clic dans **Atelier ▸ Situations**
(`builder/situations.html`). Les deux fichiers portent les mêmes `id` et doivent rester
d'accord : `node scripts/test-situations.mjs` vérifie que chaque fiche se monte, qu'elle
laisse vraiment un choix à faire, et qu'elle se joue jusqu'au bout.

## Comment se lit une situation

```
SETUP   équipe (niveau) contre adversaire · tour N
        toi     : PV / mana disponible · main : … · plateau : …
        en face : PV · plateau : …
QUESTION  ce qu'il faut décider
REGARDE   ce qu'on vérifie, et ce qui serait un mauvais signe
```

Sauf mention contraire, **niveau 8** partout : c'est le palier du GAME CONFIG pour les
rencontres tardives (`BALANCE.simulation.paliers`), donc le niveau auquel les chiffres de
`simulate` sont mesurés. Les PV des adversaires sont ceux des données.

---

# A. Les décisions où le bot est probablement faux

Ce sont **les plus rentables** : c'est exactement ce que le journal cherche — une
décision où tu joues autrement que lui, et où tu as une raison de le faire.

## A1 — L'ordre des attaques, et l'aura qui le change

```
SETUP   Médor&Athena (8) contre Grand-Duc · tour 11 (le tien)
        toi     : 24 PV / 2 mana · main : Molosse de Garde [2]
                  plateau : Toutou Fidèle 5/6, Enragé 3/2, Alpha 3/4 (11 d'attaque)
        en face : 12 PV · plateau : Chien-Rempart 3/6 Provocation
QUESTION  Le Rempart a 6 PV, riposte 3, et il faut passer par lui.
          Sans le Molosse : Toutou (5) + Alpha (3) le tuent, l'Enragé (3) passe.
          Avec le Molosse d'abord (+1/+1 aux autres) : le Toutou passe à 6 et le tue
          TOUT SEUL, et 8 d'attaque partent au visage.
REGARDE   Mesuré : la première ligne laisse l'adversaire à 9 PV et abîme tout le
          plateau ; la seconde le laisse à 4 PV, ne perd personne et ajoute un corps
          4/5. Deux mana font un facteur deux. `malin` prétend choisir « la meilleure
          attaque du plateau entier plutôt que la première trouvée » — mais il faut
          d'abord voir que poser une aura AVANT d'attaquer débloque une répartition
          qui n'existait pas. Mauvais signe : il attaque, puis pose le Molosse.
```

⚠ **Toutes les défenses du jeu ont Provocation.** Le Colosse, le Rempart, la Brute, le
Paresseux : pas une seule créature défensive des cartes libres ne laisse passer. « Je
tape le visage plutôt que le plateau » n'est donc presque jamais une question dans ce
jeu — c'est un fait de design qu'il vaut mieux connaître avant d'écrire des cartes qui
en dépendent. Ce qui existe, c'est **comment répartir** (ci-dessus) et **comment
contourner** (A5).

## A2 — Garder le retrait pour la vraie menace

```
SETUP   Athena&Bulle (8) contre Capitaine Grenouille · tour 6
        toi     : 20 PV / 4 mana · main : Chasse (détruit une unité), Grenouille
                  plateau : Têtard 1/1 Élusif — sans lui, Grenouille (« renforce un
                  allié ») n'aurait aucune cible et le choix n'existerait pas
        en face : 60 PV · plateau : Lapin-Brute 3/4 Provocation
QUESTION  Chasse maintenant sur une Brute 3/4, ou la garder ? Son deck contient
          3 Lapin-Colosse 8/8 Provocation+Bouclier et une Pieuvre Mécanique.
REGARDE   C'est LA situation que le réglage `malin` prétend gérer (« retrait gardé pour
          une vraie menace »). Vérifie qu'il ne brûle pas Chasse sur un 3/4. Et regarde
          ce que `evaluationBot` a mis comme note aux deux coups — l'écart dit s'il a
          hésité ou s'il n'a même pas vu la question.
```

## A3 — Le balayage symétrique, et son timing

```
SETUP   Corax&Felix (8) contre Renard des Neiges · tour 9
        toi     : 15 PV / 5 mana · main : Nuit Sans Lune, Coup de Bec
                  plateau : Éclaireur 3/3, Plume Noire 1/1 (elle grossit en piochant)
        en face : 30 PV · plateau : Corbeau-Éclaireur Fou 5/1 ×2, Lapin-Colosse 8/8
QUESTION  Nuit Sans Lune détruit TOUT (les tiens aussi) et te soigne 6. Tu es derrière
          au plateau mais tes deux unités ne sont pas rien. Maintenant, ou dans un tour ?
REGARDE   Le bot lit une cible mixte comme « ce qu'on gagne en face moins ce qu'on perd
          chez soi » (`CIBLES_MIXTES`). Il ne sait pas que les Éclaireurs Fous se
          détruisent tout seuls en fin de tour : attendre coûte 0. S'il balaye
          maintenant, il paie deux unités pour rien — c'est une erreur qui se raconte,
          et c'est exactement le genre de commentaire qui a de la valeur.
```

## A4 — Deux petites cartes ou une grosse

```
SETUP   Médor seul (8) contre Crapaud Baveux · tour 5
        toi     : 28 PV / 5 mana · main : Alpha [5], Molosse de Garde [2], Appel [3]
        en face : 32 PV · plateau : Paresseux-Garde 1/4 Provocation
QUESTION  Alpha 3/4 (+1/+1 aux autres, mais il n'y a personne), ou Molosse 4/5 + Appel
          (qui pose un Toutou 5/6 ET donne +1/+1) ?
REGARDE   `malin` fait un sac à dos sur la main pour ça. Sur cette position la réponse
          est franche (Molosse+Appel écrase Alpha) : si le bot prend Alpha, le sac à dos
          ne marche pas, ou `cardValue()` surévalue le cri de guerre d'Alpha dans le vide.
```

## A5 — Passe-Murailles contre une Provocation

```
SETUP   Felix seul (8) contre Pieuvre Pirate · tour 7
        toi     : 18 PV / 4 mana · plateau : Piège à Souris 1/6 Passe-Murailles Charge,
                  Chat de Gouttière 1/2 Passe-Murailles Élusif
        en face : 14 PV · plateau : Lapin-Colosse 8/8 Provocation Bouclier,
                  Paresseux-Garde 1/4 Provocation
QUESTION  Deux Provocations en face, deux unités qui les ignorent. 2 au visage par tour,
          14 PV : sept tours. Ou tu construis.
REGARDE   Que le bot voie bien que la Provocation ne s'applique pas
          (`attackableTargets` le sait). Et que le Piège à Souris pioche + 2 dégâts à
          chaque attaque — donc attaquer est presque toujours juste ici. Un bot qui
          reste planté sur cette position se voit tout de suite.
```

## A6 — Le mana flottant du premier tour

```
SETUP   Corax seul (8) contre Corbeau Rieur · tour 1
        toi     : 24 PV / 1 mana · main : Coup de Bec [1], Éclaireur [2]
        en face : 26 PV · plateau vide
QUESTION  Coup de Bec (3 au visage, pioche 2) tour 1, ou garder le mana et poser
          l'Éclaireur au tour 2 ?
REGARDE   La question la plus banale du jeu, et celle qu'on rejoue le plus souvent. Si
          le bot brûle systématiquement son 1-drop de tempo au tour 1, ça se voit sur
          l'écart moyen dans `analyse-cartes` — mais c'est ici qu'on comprend pourquoi.
```

---

# B. Les mécaniques dont le piège ne se voit qu'en jouant

Celles-là, il faut les **voir une fois**. Elles sont toutes documentées comme
pièges dans `CLAUDE.md` — reste à savoir si elles sont *jouables*, pas si elles sont
correctes.

## B1 — Bipolarité sur une unité adverse

```
SETUP   Miracle seul (8) contre Capitaine Grenouille · tour 6
        toi     : 20 PV / 2 mana · main : Bipolarité [2]
        en face : plateau : Chien-Rempart 3/6 Provocation
QUESTION  Le switch se fait CHEZ CELUI QU'ON VISE. Si l'autre face du Rempart est un
          sort, c'est l'adversaire qui en profite.
REGARDE   C'est une décision de game design assumée, pas un bug — mais il faut la vivre
          pour trancher si « mal la lancer arrange l'adversaire » est amusant ou juste
          punitif. Les cartes de PNJ n'ont pas d'autre face : vérifie que le journal dit
          bien « n'a pas d'autre face » au lieu de ne rien faire en silence.
```

## B2 — Voler un Colosse

```
SETUP   Miracle&Athena (8) contre Grand-Duc · tour 10
        toi     : 16 PV / 3 mana · main : Captif dans le miroir [3]
        en face : 70 PV · plateau : Lapin-Colosse 8/8 Provocation Bouclier,
                  Chien-Rempart 3/6
QUESTION  Prendre le contrôle du Colosse : tu enlèves la Provocation d'en face ET tu
          gagnes un 8/8 à Bouclier. Le bot « paie presque deux fois ce que vaut
          l'unité » — donc il devrait adorer.
REGARDE   Le Colosse volé n'attaque pas ce tour-ci (pas de Charge). Et à sa mort, sa
          carte part dans la défausse de SON propriétaire, pas la tienne. Regarde aussi
          ce que ça vaut vraiment contre 70 PV : un 8/8 volé, c'est 9 tours.
```

## B3 — Métamorphose ultime

```
SETUP   Miracle&Médor (8) contre Renard des Neiges · tour 8
        toi     : 22 PV / 1 mana · main : Métamorphose ultime [1]
                  plateau : Toutou Fidèle 5/6, Enragé 3/2, Prince Foufi, Alpha 3/4
        en face : plateau : Lapin-Colosse 8/8
QUESTION  1 mana : tous tes alliés deviennent une copie du Colosse adverse. Quatre 8/8.
QUESTION  (bis) Ou tu copies ton propre Toutou Fidèle, pour quatre râles d'agonie.
REGARDE   Le modèle est lu UNE fois : c'est la même carte pour tous. Les unités copiées
          gardent leur `uid` et le fait d'avoir déjà attaqué — donc si elles ont déjà
          frappé ce tour, la Charge du modèle ne les relance pas. À 1 mana, est-ce que
          cette carte est simplement cassée ?
```

## B4 — Prince Foufi dans le vide

```
SETUP   Médor seul (8) contre Lapin Chapardeur · tour 3
        toi     : 30 PV / 2 mana · main : Prince Foufi [2] (attaque et vie = tes Chiens)
                  plateau : vide
        en face : plateau : Lapin-Rongeur 1/2
QUESTION  Le poser sur un plateau vide : il vaut 0/0 et meurt au prochain ramassage.
          Le poser après un Appel : il vaut 2/2, puis grandit.
REGARDE   Une caractéristique variable qui tombe à 0 tue l'unité, et le compteur bouge
          sans qu'on joue (`resolveDeaths` au début de `beginTurn`). Vérifie que le bot
          ne pose pas un 0/0 dans le vide — et que le journal montre bien pourquoi il
          est mort, via le bloc « ce qui la modifie » de la fiche.
```

## B5 — Le Chien de la fatigue

```
SETUP   n'importe quelle équipe (8) · TES tours 3, puis 9, puis 15
        main : Chien de la fatigue [7] (Provocation, attaque et vie = tes tours joués,
               cri de guerre : -7/-7 sur elle-même)
QUESTION  Combien vaut-il vraiment en arrivant ?
REGARDE   Mesuré : à ton tour 3 il **meurt en arrivant**, à ton tour 9 c'est un **2/2**,
          à ton tour 15 un **8/8**. Autrement dit `tours − 7`, pour 7 mana. Avant ton
          14ᵉ tour c'est une carte qui coûte 7 et ne rend presque rien. Elle est dans la
          **pile de fatigue**, donc elle sortira pour les DEUX camps, et surtout elle
          sort quand une pioche est finie — c'est-à-dire tard, donc au moment où elle
          commence à valoir quelque chose. C'est peut-être exactement ce que tu voulais :
          à confirmer en la voyant tomber.
```

## B6 — Finir sa pioche

```
SETUP   Athena&Corax (8) contre Grand-Duc · tour 14
        toi     : 12 PV · pioche : 1 carte · défausse : 14
        en face : 40 PV · pioche : 8
QUESTION  Le tour prochain tu tires dans la pile de fatigue. Six cartes possibles, toutes
          différentes, au hasard. Est-ce que c'est une ressource ou une punition ?
REGARDE   ⚠ Avec une pile non vide, `peutAgir()` est TOUJOURS vrai : la fin « plus
          personne ne peut jouer » ne se déclenche plus, et c'est `maxTurns` (100) qui
          devient le vrai garde-fou. Le premier chiffre à relire est la longueur des
          combats. Regarde aussi le plafond `maxPiochesAVideParTour` (20) : il se voit
          dans le journal texte.
```

## B7 — L'Impératrice qui ne s'épuise jamais

```
SETUP   Athena seule (8) contre Pieuvre Pirate · tour 12
        toi     : 20 PV / 10 mana · plateau : Impératrice nocturne 7/7
                  (les cartes jouées retournent dans ta pioche, +1 pioche par tour)
        main : Étude [1], Regard Perçant [2]
QUESTION  Tes sorts reviennent en pioche. Ta pioche ne se vide plus. Tu pioches 2 par
          tour. Est-ce que la partie se termine un jour ?
REGARDE   Le plafond `maxRecyclageParTour` (30) est la seule chose qui ferme la boucle,
          et il est généreux. Ajoute Grand Corbeau (tu pioches quand l'adversaire
          pioche) et regarde le nombre de tours. Si ça touche 100 tours, l'archétype
          Fatigue est cassé avant d'exister.
```

## B8 — Neuf Vies : à quel tour devient-elle jouable ?

```
SETUP   Felix seul (8) contre Crapaud Baveux · tes tours 5, puis 8, puis 10, puis 14
        main : Neuf Vies [15] (coûte X+1 de moins, X = tes tours joués)
QUESTION  Quand devient-elle payable, et que vaut-elle à ce moment-là ?
REGARDE   Mesuré : **9 mana au tour 5, 6 au tour 8, 4 au tour 10, 0 au tour 14** — et
          elle crée autant de Foudres que de tours joués. Avec 8 mana, elle part vers
          ton 6ᵉ-7ᵉ tour ; à partir du 14ᵉ elle est gratuite et crée 14 cartes, ce qui
          dépasse la main max (8) — le reste part à la défausse. Vérifie aussi le cumul
          des réductions : Ombre Feutrée (statique, sorts −1) + Coup de Patte (ponctuel)
          se cumulent-ils ? `cardCost` est censé être le seul endroit qui répond.
```

## B9 — Type : tous, et la chaîne par type

```
SETUP   Miracle seul (8) contre Grand-Duc · tour 7
        toi     : plateau : Maître du camouflage 5/8 (donne « Type : tous » à tes AUTRES
                  alliés), Caméléon 2/2, Toutou Fidèle 5/6
        main : Coup de langue [2] (5 dégâts à une unité + à toutes du même type)
        en face : plateau : Chien-Rempart 3/6, Lapin-Colosse 8/8, Lapin-Colosse 8/8
QUESTION  Les Colosses sont « Lapin », le Rempart est « Chien ». Coup de langue sur un
          Colosse touche l'autre Colosse. Sur le Rempart, il ne touche que lui.
REGARDE   ⚠ La portée d'une aura « du même type » se décide sur les types IMPRIMÉS, pas
          sur les types reçus — sinon le Maître élargirait sa propre portée. Vérifie que
          « Type : tous » reçu compte bien pour les CIBLES mais pas pour la portée.
          C'est la règle la plus subtile du moteur, et la seule façon de la voir est de
          la jouer.
```

## B10 — Rappel sur une défausse vide

```
SETUP   Médor seul (8) contre Chat de Ruelle · tour 5 puis tour 12
        main : Rappel [5] (réanime 5 alliés de ta défausse)
QUESTION  Tour 5, défausse presque vide : 5 mana pour rien ou presque. Tour 12,
          défausse pleine : cinq corps d'un coup.
REGARDE   Une carte dont la valeur dépend entièrement du tour. Est-ce que le bot la
          garde ? `cardValue()` ne regarde pas la défausse. C'est un candidat évident
          pour « le bot la joue trop tôt » — et ça se mesure dans `analyse-cartes`
          (écart), mais ça se COMPREND ici.
```

---

# C. Les murs de la courbe

`node scripts/simulate.mjs` dit : Grand-Duc **0 % à 40 %** (médiane 15 %), Capitaine
Grenouille **5 % à 80 %** (médiane 50 %). Ce sont les deux seuls endroits où la courbe
n'est pas plate. La question n'est pas « est-ce dur ? » mais **« est-ce que c'est le bot
qui est nul, ou est-ce que c'est vraiment un mur ? »** — et seul un humain qui joue la
position peut répondre.

⚠ **Ne choisis pas ton équipe sur le nom que `simulate` affiche.** Deux passages de
suite donnent « Médor&Corax&Bulle 0 % » puis « Médor&Felix&Bulle 0 % », et « Médor&Felix&
Athena 40 % » puis « Médor&Athena&Miracle 40 % ». À 20 parties par combinaison, l'écart
est dans le bruit : ce qui est stable, c'est **0 % en bas, 40 % en haut, 15 % de médiane**.
Ce qui est stable aussi : les bonnes équipes contiennent **Athena**, et c'est son mana
(10, contre 7 ou 8 aux autres) qui fait la différence — elle seule monte au plafond du
Grand-Duc.

## C1 — Grand-Duc, du premier tour

```
SETUP   Médor&Corax&Bulle (8) — 84 PV, 8 mana — contre Grand-Duc · tour 1
        en face : 105 PV, 10 mana, bot `dur`
                  deck : 5 Rempart 3/6, 5 Colosse 8/8 Bouclier, 4 Souffle (4 dégâts à
                  toutes tes unités), 3 Ralliement, 3 Fiole, 3 Colère de Kamaji
                  (détruit tout), 1 Hiboux de la domination
QUESTION  Joue-la en manuel, du début. Tu as 84 PV cumulés contre 105, et en face un
          deck qui balaye trois fois et se blinde derrière des Provocations.
REGARDE   C'est **le** test du journal : si tu passes à 40 % là où le bot fait 0 %,
          l'écart entre ton coup et `choixBot` sur chaque décision est exactement ce
          qu'il faut pour corriger `ai.js`. Si tu perds aussi, c'est la carte
          « Hiboux de la domination » et les 3 Kamaji qu'il faut regarder, pas le bot.
```

## C2a / C2b — Grand-Duc, juste après un Kamaji

```
SETUP   Deux fiches jumelles, à monter l'une après l'autre :
        (a) Médor&Athena&Miracle (8) — 83 PV, plafond 10 — contre Grand-Duc · tour 20
        (b) Médor&Corax&Bulle    (8) — 84 PV, plafond  8 — contre Grand-Duc · tour 20
        toi     : 18 PV · 10 tours joués · plateau : vide · main : 3 cartes
        en face : 75 PV · 10 tours joués · plateau : vide
        ⚠ C'est au 20ᵉ tour, pas au 12ᵉ : avant le 8ᵉ tour de chacun, les deux équipes
        ont le même mana (un cristal par tour), et la comparaison ne mesurerait rien.
QUESTION  Colère de Kamaji vient de tout détruire des deux côtés. Qui reconstruit le
          plus vite ?
REGARDE   Le vrai combat contre ce boss est là, après chaque balayage — et c'est le
          seul endroit où l'on verra si les 2 mana d'écart expliquent tout l'écart
          0 %/40 %. Même PV (83 contre 84), même main, même plateau vide : la seule
          variable est le mana et les cartes. Si (a) reconstruit et (b) non, la réponse
          est le **plan** (monter Athena de niveau), pas la tactique.
```

## C3 — Hiboux de la domination en jeu

```
SETUP   n'importe quelle équipe (8) contre Grand-Duc · tour 9
        en face : plateau : Hiboux de la domination 8/8
                  (tu ne joues pas plus d'1 carte par tour, tes cartes coûtent +1)
QUESTION  Une carte par tour, à +1 de coût, contre un boss à 105 PV. Est-ce que c'est
          une position ou une condamnation ?
REGARDE   C'est un plafond statique, composé par le MINIMUM. Vérifie que le bot cesse
          bien de proposer une 2ᵉ carte (`canPlay` le sait) — et surtout, demande-toi
          si cette carte a sa place dans le deck d'un boss qu'on affronte au niveau 8.
```

## C4 — La Pieuvre Mécanique

```
SETUP   Corax&Felix (8) contre Capitaine Grenouille · tour 10
        en face : plateau : Pieuvre Mécanique 4/4 Provocation
                  (+4/+4 à chaque fois que SON héros perd des PV)
QUESTION  Tout ce que tu envoies au visage la fait grossir. Elle est en Provocation,
          donc tu dois passer par elle.
REGARDE   Est-ce qu'il existe une réponse dans le jeu ? Chasse (détruit), Exclusion
          (renvoie en main), Captif dans le miroir (vol). Si les trois sont chez Athena
          et Miracle, c'est une contrainte de **stratégie** (avant le match) et pas de
          tactique — donc un choix d'équipe, ce qui est sain. Si aucune ne suffit, c'est
          un mur.
```

---

# D. Les archétypes, et ce qui leur manque

Là, on ne teste pas une position mais **une idée de deck**. Une partie complète, en
manuel, avec des commentaires au fil de l'eau.

## D1 — Médor turbo (Aggro Turbo)

Tout base sauf le slot 4 en switch (Appel de la meute). Ne se préoccupe pas de
l'adversaire : pose, renforce, frappe. **À tester contre Grand-Duc** : est-ce que Turbo
bat un Pillow Fort avant qu'il se blinde, ou est-ce que les trois Kamaji suffisent à le
tuer ? C'est le matchup qui dit si l'archétype existe.

## D2 — Felix combo (Combo)

Ombre Feutrée (sorts −1) + Griffure (1 dégât par sort lancé) + Neuf Vies (N Foudres) +
Roi des Toits (un Chat par sort). **La question** : combien de mana faut-il pour que la
chaîne parte, et est-ce que le deck survit jusque-là ? Un Combo qui a besoin du tour 9
contre un Aggro est un Combo qui n'existe pas.

## D3 — Athena contrôle (Contrôle Hard)

Chasse, Colère d'Athéna, Exclusion, Maître du tourbillon : ne fait que de la gestion,
cherche le 1 pour 1. **La question** : avec quoi gagne-t-elle ? Archichouette (3 dégâts
par pioche) est la seule condition de victoire — c'est donc un Contrôle qui vire Pillow
Fort. Vérifie que ça tient sous `maxTurns`.

## D4 — Fatigue, si ça existe

Impératrice nocturne + Grand Corbeau : ta pioche ne se vide jamais, la sienne si. Sauf
que la pile de fatigue est **commune aux deux camps** et ne s'épuise pas — donc
l'adversaire à sec pioche quand même. **La question** : y a-t-il un avantage, même
minime, à aller à la fatigue en premier ? Si non, l'archétype Fatigue est impossible
dans les règles actuelles, et ça se décide maintenant, pas après avoir écrit les cartes.

## D5 — Pillow Fort, qui n'existe pas

Le GDD le dit : il manque une carte du genre « si c'est votre 30ᵉ tour, gagnez la
partie » — à garder sous `maxTurns`. **À tester d'abord** : monte Athena + les
Provocations des cartes libres et regarde combien de tours tu tiens contre chaque
adversaire. Si tu tiens 30 tours contre le Grand-Duc, la carte est jouable. Sinon, il
faut d'abord de la survie, et la carte de victoire ne sert à rien.

---

# Le banc, et ce qu'il fait

**Atelier ▸ Situations.** On choisit une fiche, on monte la position, on joue les deux
camps — les deux mains sont visibles, c'est un banc, pas une partie. Chaque action pose
un point sur la frise : on revient en arrière, on essaie autre chose, et la suite
précédente est effacée (elle n'a plus de sens).

⚠ **Revenir en arrière RESTAURE, ça ne REJOUE pas.** Le moteur tire à `Math.random` sans
graine : les tirages qui suivront seront d'autres tirages. C'est exactement ce qu'on
veut — le but n'est pas de revoir la même chose, c'est d'essayer autre chose au même
point. Le corollaire : une ligne mesurée une fois n'est pas une mesure. Pour un chiffre,
c'est `builder/balance.html` ou `scripts/matchups.mjs`.

**« 🤔 Que jouerait le bot ? »** répond sans jouer le coup : sur une copie du combat,
avec les candidats et leur note. C'est la raison d'être de tout ça — comparer ton choix
au sien AVANT de trancher, pas après.

**Modifier une fiche** ouvre son JSON : on change les cartes, les PV, le mana, le tour,
on remonte. Le format est commenté en tête de `game/data/situations.js`. Une fiche qui
mérite d'être gardée se recopie dans ce fichier — et le banc la contrôlera désormais.

Deux détails qui décident si une position est jouable, et que le montage règle seul :
les unités du camp qui a la main sont **prêtes à attaquer** (sinon « tu as 11 d'attaque »
ne veut rien dire), et le mana suit la **courbe du jeu** — un cristal par tour joué,
plafonné. Une fiche qui veut autre chose le dit.

**Pas encore fait**, et c'est le palier suivant : les branches (repartir d'un tour passé
en gardant les deux essais côte à côte), les commentaires sur un tour, et la sauvegarde
d'une situation. ⚠ Enregistrer le **journal de décisions** depuis le banc demande une
décision de conception, pas seulement du code : `inst` identifie une carte par son
objet, et un retour en arrière recrée tous les objets (`cloneBattle`) — chaque carte y
gagnerait un identifiant neuf et le fichier deviendrait illisible. Il faudra soit
rattacher les identifiants après restauration, soit n'enregistrer qu'une ligne sans
retour arrière.
