# Mission Claude Code — les PV des héros, de la feuille jusqu'au combat

**À lancer AVANT la mission bot et AVANT l'outil d'impact** : tout le reste se mesure sur les PV réels. Si les PV
changent après, les mesures sont à refaire.

## Rôle
Lead Programmeur Gameplay / Tool. Tu corriges une chaîne de données, tu ne rééquilibres rien. Si quelque chose est
impossible ou dangereux, tu le dis au game designer tout de suite, en entier, sans chercher de solution.

## Décisions du game designer (4 nov. 2026)
- **La base de PV est 20, voulu.** (`BALANCE.combat.pvBase`.)
- Un héros peut avoir plus : un héros à 23 vaut **+3**, à 26 vaut **+6**. Deux héros à 23 et 26 jouent donc
  ensemble à **20 + 3 + 6 = 29 PV** en jeu. C'est la règle de `pvDeLEquipe` (`config/characters.js`) : **elle est
  juste, ne la change pas.**
- Les **PV max des arbres de progression** (`health_up`) doivent bel et bien s'appliquer en jeu.
- Cible de durée (pour plus tard, pas dans cette mission) : **niveau 200 atteint au jour 30.**

## Ce qui est constaté (à vérifier, ne pas croire sur parole)
1. Le Card Builder donne aux héros des PV de 20 à 32 (`dog` 32, `frog` 28, `cat` 26, `owl` 26, `crow` 24…).
2. L'onglet `heroes` de la feuille (`game/data/feuille.data.js`) a **`PV_Max: 20` pour les héros** (au moins dog, cat,
   crow, frog, owl). La règle du 16 oct. 2026 dit « la feuille commande les statistiques, une case vide laisse la
   valeur du builder » : ces 20 **écrasent** les PV du builder. Résultat : `pvDeLEquipe(dog, crow, frog)` donne 20 au
   lieu de 44. C'est la cause des combats « 20 contre 20 ».
3. `progress_profile` (lignes d'amélioration du joueur, par `deck_category`) **n'est lu par rien** : les `health_up`
   n'arrivent jamais en jeu. (`enemy_progress_profile`, lui, est lu par `config/ennemis.js`.)

## Travail

**1. Prouver, avant de toucher.** Écris un test (`scripts/test-*.mjs`, à ajouter au banc) qui affiche pour chaque héros :
PV du builder, PV après la feuille, PV de l'équipe pour quelques trios. Montre le 20 contre 44. Cas obligatoire :
**deux héros à 23 et 26 → 29** (en construisant ces héros dans le test, sans toucher aux vraies données).

**2. Les 20 de la feuille.** Tu ne modifies **pas** la Google Sheet ni `feuille.data.js` à la main (la feuille est au game
designer, `sync-feuille.mjs` tourne sur le Pi). Tu :
- listes exactement les cases `heroes.PV_Max` (et `Mana_Max`) qui valent la même chose que le défaut et écrasent une
  valeur différente du builder ;
- dis au game designer : « vide ces cases » **ou** « mets-y les vraies valeurs » ;
- ajoutes à `planifieHeros` / à l'aperçu de `sync-feuille.mjs --apercu` un **avertissement visible** quand une case de la
  feuille *baisse* les PV d'un héros par rapport au builder, pour que ça ne se reproduise pas en silence.
Ne choisis pas à sa place laquelle des deux sources gagne : c'est sa décision du 16 oct., rappelle-la lui.

**3. Brancher les lignes d'amélioration (`progress_profile`).** Lis `scripts/lib/feuille.mjs` (BRANCHES) et
`config/ennemis.js` (qui consomme déjà `enemy_progress_profile`) comme modèle. Pour le joueur :
- à quel moment une ligne s'applique (niveau du héros ? nombre de crans achetés ?) : **trouve ce que le code fait déjà**
  pour `puissance` (+10 par amélioration, `health_up` compris) et réutilise ce chemin ;
- `health_up` doit augmenter `stats.hp` du héros, donc entrer dans `pvDeLEquipe` et dans `buildPlayerSide`
  (`ui/battle.js`), et dans les outils de mesure (`campPerso` de `tools/arene.js`) pour que les simulations voient les
  mêmes PV que le jeu ;
- les autres lignes (`mana`, armure, main de départ…) : **recense seulement** ce que contient le fichier et ce que le
  moteur sait lire ; ne les branche pas sans accord (ce sont les leviers les plus forts du pilote d'impact).
- Toute valeur reste dans `BALANCE` ou dans la feuille, rien en dur.

**4. Mesurer ce que ça change, sans corriger.** Avec `scripts/matchups.mjs` et `scripts/simulate.mjs`, avant puis après :
longueur moyenne des parties (en tours), taux de victoire par deck, PV restants du vainqueur. Donne les chiffres au game
designer : **doubler les PV d'équipe change tout l'équilibrage**, et les adversaires (`npcs[].hp`) ne suivent pas
forcément. Ne rééquilibre rien.

## Ce que tu ne fais pas
Pas de changement de `pvBase`, de `pvDeLEquipe`, des cartes, des courbes d'amélioration, de `ai.js`. Pas d'écriture dans la
feuille. Pas de lignes d'amélioration nouvelles (c'est l'étape « générateur », après l'outil d'impact).

## Preuves attendues
Test vert (dont 23+26 → 29) · le avant/après des PV d'équipe par trio · liste des cases de la feuille en cause · un combat
réel (journal `?journal=1`) montrant les PV de départ des deux côtés et l'effet d'un `health_up` acheté · `test-triggers.mjs`
et `test-partage.mjs` toujours verts.

## Rapport final
Ce qui était cassé et pourquoi (une phrase par cause) · ce qui est corrigé · ce qui attend une décision du game
designer (les cases de la feuille ; les lignes autres que `health_up` ; les PV des adversaires) · l'avant/après chiffré.
