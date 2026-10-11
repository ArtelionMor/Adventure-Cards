# game/src/tools/ — l'arène de mesure et le montage des situations

> Deux petits modules **sans DOM** : les pages du builder (`balance.html`, `situations.html`) et les scripts de `scripts/` les importent,
> donc une seule implémentation, les mêmes chiffres partout. Ce dossier est dans l'empreinte des renforts.

| Fichier | Rôle | Points d'entrée |
|---|---|---|
| `arene.js` | **L'arène** : monter un camp (`campPerso`, `campMelange` = fabrique de decks mélangés, `campPnj`, `campDeCartes`), jouer un duel (`duel`) ou une série (`serie`, moitié des parties dans chaque sens), intervalle de Wilson, cibles 33/50/66 (`CIBLES`, `TOLERANCE`), CSV et journaux de matrice. Tout nouvel outil de mesure passe par là. | `duel`, `serie`, `wilson`, `campPerso`, `campMelange`, `campPnj`, `matriceCsv`, `journauxTexte`, `lecture` |
| `situation.js` | **Monter une position de toutes pièces** (PV, mana, mains, plateaux, défausse, tour) à partir d'une fiche de `../../data/situations.js`. Une unité posée n'est pas jouée (`depose`). | `situationParId`, `monteSituation` |

## Qui l'utilise
`arene.js` ← `scripts/matchups.mjs`, `simulate.mjs`, `check-decks.mjs`, `analyse-cartes.mjs`, les `scripts/lib/taches-*.mjs`, `builder/balance.html` + `balance-worker.js`.
`situation.js` ← `builder/situations.html`, `scripts/test-situations.mjs`.

## Tests
`node scripts/test-situations.mjs` (321) après avoir touché aux cartes ; `node scripts/test-partage.mjs` : tout fichier qui demande un coup au bot doit l'appliquer par `joue()` (`../combat/journal.js`).

---

# Le détail

## Le banc de situations
`builder/situations.html` — **monter une position de toutes pièces et la jouer**, sans
jouer les tours d'avant. C'est ce qui rend le journal de décisions utilisable : il ne vaut
que par les décisions intéressantes qu'on y met, et les atteindre depuis le tour 1 relevait
de la chance.

Trois fichiers, et la séparation compte : `game/data/situations.js` **décrit** les positions
(de la donnée, pas de l'équilibrage), `game/src/tools/situation.js` les **monte**, la page
les **joue**. Le texte qui les explique — la question posée, ce qu'on regarde — est dans
`docs/SITUATIONS-A-TESTER.md`, et les deux portent les mêmes `id`.

**Une position se décrit par côté** : `heros` (ou `pnj`), `pv`, `mana`, `tours`, `main`,
`plateau`, `defausse`, `pioche`. Le format est commenté en tête de `situations.js`. Le
bouton **✎ Modifier** de la page ouvre ce JSON : on change une carte, on remonte, et on
recopie la fiche dans le fichier si elle mérite d'être gardée.

⚠ **Une unité posée n'est PAS jouée.** Le montage passe par `depose()` et non par
`playCard` : « À la pose » ne part pas. Sans ça, décrire « Appel en jeu » invoquerait un
Toutou en plus et le plateau obtenu ne serait pas celui qu'on a écrit. C'est pour ce seul
usage que `depose` et `refresh` sont exportés du moteur.

⚠ **Une carte citée est prise dans la pioche** quand elle s'y trouve : une main de trois
cartes est un deck qui en a trois de moins, comme en vraie partie. Une carte absente du
deck est fabriquée depuis le catalogue — c'est un banc, on l'accepte.

⚠ **Deux valeurs par défaut décident si la position est jouable**, et elles ne vont pas de
soi. Les unités du camp qui a la main sont **prêtes à attaquer** (une unité qu'on vient de
déposer arrive fraîche : sans ça, « tu as 11 d'attaque » ne se joue pas). Et le mana suit
la **courbe du jeu** — un cristal par tour joué, plafonné : donner le mana plein ferait
d'une fiche « tour 1 » un tour 1 à dix mana, garder celui du montage en ferait un tour 11
à un mana.

⚠ **`main` se dit de trois façons** : une liste (exactement ces cartes), un nombre (autant
de cartes de la pioche), ou **rien du tout** — et « rien » veut dire *une main normale*,
pas une main vide. C'est ce qu'il faut à une fiche qu'on joue depuis le tour 1. `[]` est la
main vide.

**Revenir en arrière RESTAURE, ça ne REJOUE pas.** Chaque action pose un instantané
(`cloneBattle`) ; on revient dessus, on essaie autre chose, et la suite précédente est
effacée. Mais le moteur tire à `Math.random` sans graine : les tirages qui suivront seront
d'autres tirages. C'est le but — on ne veut pas revoir la même chose, on veut essayer autre
chose au même point. Corollaire : **une ligne jouée une fois n'est pas une mesure**, c'est
`balance.html` ou `matchups.mjs` qui donnent des chiffres.

**« 🤔 Que jouerait le bot ? »** répond sans jouer le coup (`evalue()` sur une copie), avec
les candidats et leur note. C'est la raison d'être du banc : comparer son choix au sien
AVANT de trancher. ⚠ **Le niveau de bot se choisit, et ce n'est pas cosmétique** : le bot à
règles ne note que les *cartes* (une attaque ressort « — »), là où `montecarlo` finit la
partie pour chaque coup et donne un pourcentage à tous, attaques comprises. C'est la seule
référence qui juge un **ordre d'attaques**. ⚠ Et une position **déjà perdue rend 0 % partout** :
le Monte-Carlo n'y distingue plus rien, donc une fiche qui veut tester un choix doit être
réglée au point où il compte encore.

`node scripts/test-situations.mjs` est le banc : chaque fiche se monte sans souci, la
position obtenue est celle qu'on a décrite, il y a vraiment un choix à faire, et la partie
va jusqu'au bout depuis là. **À relancer après avoir touché aux cartes** — une carte
renommée dans le builder fait jouer une position qui n'est pas celle qu'on croit, et rien
d'autre ne le dit.
