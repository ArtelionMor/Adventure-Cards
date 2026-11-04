# Mesures du bot (mission « le bot lit sa position », 4 nov. 2026)

Banc : `node scripts/bench-bot.mjs <niveau A> <niveau B> [--parties N] [--json f.json]` — voir l'en-tête du script.
Les mêmes decks des deux côtés, **côtés échangés** (A joue D contre B qui joue O, puis A joue O contre B qui joue D), le camp qui commence alterne.
Le taux d'un deck est celui de A dans toutes les parties où ce deck est en jeu ; intervalle de Wilson à 95 %.
Trios de référence et parties : `BALANCE.ai.bench`. Niveau des cartes : 10. Decks **mélangés** base / switch (le cas réel).
`misplay` est à **0 partout** depuis cette mission (mesure conservatoire, cf. `balance.js`) : le bot est déterministe à état égal.

## Mesure de départ (phase 0) — `normal` contre `normal`, 100 parties par paire et par sens

6 trios → 21 paires, 3 600 parties décisives sur 3 600. Doit faire ≈ 50 % : c'est le cas.

| Deck de référence | Taux de A | ± 95 % |
|---|---|---|
| Médor + Corax + Bulle | 46,9 % | 2,9 |
| Félix + Athéna + Médor | 54,1 % | 2,9 |
| Bulle + Corax + Félix | 48,9 % | 2,9 |
| Athéna + Félix + Corax | 51,8 % | 2,9 |
| Médor + Bulle + Athéna | 50,4 % | 2,9 |
| Félix + Corax + Miracle | 52,1 % | 2,9 |
| **Moyenne** | **50,4 %** | **1,6** |

(Les écarts par deck sont du bruit : A et B sont le même bot.) Longueur moyenne : 12,3 tours.

**Temps par décision** (`botAction` seul, moteur exclu, machine au repos, 16 workers) : **0,205 ms** sur 133 357 décisions. Un premier passage fait pendant
que `simulate.mjs` tournait donnait 0,41 ms : la mesure de temps ne vaut que sur une machine au repos.

## Bancs de départ (avant toute modification d'`ai.js`)

| Banc | Résultat |
|---|---|
| `test-triggers.mjs` | 782 passés, 0 échec |
| `test-ai.mjs` | 53 passés, 0 échec |
| `test-rejeu.mjs` | 242 passés, 0 échec |
| `test-evenements.mjs` | 2 699 passés, 0 échec |
| `test-journal.mjs` | non lancé (instable, connu) |
| `simulate.mjs` | 13 762 cases, 275 240 parties, 264 s, aucun blocage moteur. Pire équipe par rencontre : rabbit1 75 %, cat1 10 %, crow1 10 %, wolf 5 %, frog1 20 %, octo1 25 %, frogboss 5 %, fox1 50 %, owlboss 5 %, sloth1 70 %, robin1 0 %, panda1 60 %, goat1 55 %, octo2 20 % (médiane : 60 à 100 %). Lancé **avec** `misplay` d'origine. |

## Phase 2 — `lecture` contre `normal` (même banc, mêmes decks, côtés échangés)

`node scripts/bench-bot.mjs lecture normal --parties 150` : 5 400 parties décisives (150 par paire et par sens), niveau 10.

| Deck de référence | Taux de `lecture` | ± 95 % |
|---|---|---|
| Médor + Corax + Bulle | 49,9 % | 2,4 |
| Félix + Athéna + Médor | 49,7 % | 2,4 |
| Bulle + Corax + Félix | 48,7 % | 2,4 |
| Athéna + Félix + Corax | 49,1 % | 2,4 |
| Médor + Bulle + Athéna | 48,5 % | 2,4 |
| Félix + Corax + Miracle | 49,8 % | 2,4 |
| **Moyenne** | **49,2 %** | **1,3** |

**Lecture : neutre.** Aucun deck ne régresse (tous les intervalles contiennent 50 %), mais **il n'y a pas de gain mesurable** contre `normal`. Temps par décision : 0,235 ms contre 0,205 (×1,15, sous le plafond de ×1,2). Longueur moyenne : 12,0 tours.

Ablations (50 parties par sens, ± 2,3 — à lire avec prudence) : `echange` du beatdown à **0** (« tuer une unité qui ne gêne pas ne rapporte rien ») → **47,4 %** (100 parties, ± 1,6) : *c'est le seul réglage qui fait perdre* ; à 0,5 ou 1 → 50,7 à 50,8 % ; `visage` 1 → 51,7 %, 1,6 → 50,7 %, 2,2 → 49,7 % (bruit) ; `timing.remplissage` 0 (retrait de la retenue de Retrouvailles) → 46,4 % mais avec le `echange` à 0 : non concluant seul. Les valeurs retenues (visage 1,6, echange 0,5) sont dans `BALANCE.ai.postures`.

Bancs après la phase 2 : `test-triggers` 782, `test-ai` 59, `test-rejeu` 242, `test-evenements` 2 689, `test-partage` 108, `test-situations` 415 — tous verts. `simulate.mjs` : 231 s, aucun blocage ; il joue `normal` (inchangé), la courbe ne bouge pas au bruit près.

## Phase 3 — débloquée le 4 nov. 2026

*Mise à jour : le game designer a autorisé la retouche, et le Mage de l'étincelle (`cat_claw`) frappe maintenant le **héros adverse** (`enemyHero`) et n'a plus Charge (texte et signature VFX suivent). La condition d'entrée est remplie ; rien n'est commencé.* Condition d'entrée **qui n'était pas remplie** : *Mage de l'étincelle* (`cat_claw`) cible toujours `randomEnemyAny` (héros **ou** unités) et garde **Charge**. Rien n'a été commencé (ni recherche de séquence, ni note de dix lignes, ni fiche S4).

## Balayage des coefficients (14 400 parties par réglage, `lecture` contre `normal`, ± 0,8)

Fait avec le Mac en renfort (`--surcharge` voyage dans le contexte des tâches). Réglage de départ (visage 1,6, échange 0,5, stabilise 5) : **49,4 %**.

| Changement | Moyenne |
|---|---|
| beatdown `visage` 1,3 / 2,2 | 49,1 % / 49,9 % |
| beatdown `echange` 0,25 / 1 | 50,2 % / 50,5 % |
| contrôle `visage.stable` 1,2 / 2,6 | 49,4 % / 49,1 % |
| contrôle `visage.instable` 0,7 | 49,8 % |
| `stabilise` 3 / 8 | 49,8 % / 49,6 % |
| `retraitAvantCorps` 0 / 2 | 49,8 % / 49,7 % |

**Conclusion : aucun réglage de ces coefficients ne bouge la force du bot** sur les six trios de référence (tout reste entre 49,1 et 50,5 %). Les trois branchements de la mission corrigent les symptômes des fiches S1, S2, S5, S6 sans changer le taux de victoire : les défauts qui coûtent des parties sont ailleurs (ou ces trios ne les exposent pas). Pour mémoire, le Monte-Carlo bat le bot à règles 9 fois sur 10 (`BALANCE.ai`) : la marge existe, mais elle vient de la recherche, pas de coefficients. Pistes (hors mission, non commencées) : `lectureDePosition` comme fonction d'évaluation d'une recherche courte ; mesurer sur des trios choisis pour exposer Aggro / Contrôle / Combo.

**S7** (même carte, deux matchups) : fiches S7a / S7b écrites avec Griffure (`cat_pounce`) ; S7a passe, **S7b échoue** (`normal` comme `lecture`) : le bot développe avant de retirer, et un Chiot de Garde vaut plus que la menace d'un Lapin Nain. `retraitAvantCorps` a été essayé pour ça : sans effet, laissé à 0. S8, S9, S10 : fiches vides.

**Le Mac** (`teliaus-macbook-pro`, 12 cœurs) sert de renfort depuis le 4 nov. : copie du code dans `~/ac-renfort`, `caffeinate -i node scripts/renfort.mjs`, déclaré dans `~/.adventure-card/calcul.json`. Le même banc de 5 400 parties passe de plusieurs minutes à quelques secondes. Après toute modification du code mesuré, il faut le réenvoyer (voir la mémoire du projet).

## La recherche courte (niveau `recherche`) — essai du 4 nov. 2026, à la demande du game designer

**Principe.** Pour chaque coup possible (jusqu'à `recherche.maxCoups`), le bot copie le combat, joue le coup, joue **le reste de son tour** avec le bot `lecture`, puis **note la position avant de passer** : avance en PV (armure comprise), en corps, en cartes en main, plus l'écart des deux horloges de `lectureDePosition` (`noteDePosition`). Il garde le coup le mieux noté (à égalité, le moins cher). Il **ne joue jamais le tour adverse** : pas besoin de sa main ni de sa pioche. Ce n'est ni le Monte-Carlo (qui clone le vrai combat et finit la partie) ni la troncature des rollouts abandonnée ; la mission interdisait de rebrancher celle-ci, c'est donc un essai demandé explicitement. Fuite connue et mineure : pendant le tour imaginé, une pioche ou une création *de mon propre côté* lit l'ordre réel de ma pioche.

**Résultat : le premier vrai gain.** `node scripts/bench-bot.mjs recherche normal --parties 150` (5 400 parties, ± 1,3, Mac en renfort) :

| Contre | Moyenne de `recherche` |
|---|---|
| `normal` (poids de départ) | 60,3 % (chaque deck de 59,7 à 60,9 %) |
| `normal` (poids retenus) | **61,9 %** |
| `lecture` (100 parties/sens) | 62,0 % |
| `normal`, **cinq trios jamais utilisés pour régler** | **57,6 % ± 1,9** (de 53,6 à 61,8 %) |

**Coût : 7 ms par décision** (contre 0,2 ms pour `normal`), soit ≈ 0,7 s de réflexion par combat sur ce PC — sans importance en jeu, mais à remesurer sur un téléphone avant de l'y brancher.

**Balayage des poids de la note** (100 à 150 parties/sens, ± 1,6 à 1,3) : sans terme d'horloge 57,9 % contre 60,2 % avec (**c'est `lectureDePosition` qui rapporte**, +2 points) ; PV 0,3 → 61,7 % / 1,4 → 56,9 % ; corps 0,5 → 57,2 % / 1,8 → 61,6 % ; main 0 → 58,4 % / 1,2 → 59,6 %. Combinaisons : 59,4 à 61,2 % (le plateau est dans le bruit). Retenus : PV 0,3, corps 1,8, main 1, horloge 8.

**Les fiches S2, S5, S6 échouent au niveau `recherche`** (`BOT_NIVEAU=recherche node scripts/test-ai.mjs`) : elle joue Griffure sur le Têtard, Retrouvailles avec un seul allié, la Volée dans le vide — et gagne pourtant plus que `lecture`, qui les passe. Ces fiches écrivent l'intention du game designer, la note mesure autre chose : **à trancher ensemble** (soit les fiches sont trop strictes, soit la note de position ne voit pas le coût d'opportunité de garder une carte).

**Branché sur le pilote automatique du joueur le 4 nov. 2026** (`BALANCE.ai.auto = 'recherche'`, lu par `ui/battle.js`) ; les adversaires gardent le niveau de leur rencontre (`ia`, sinon `defaut` = `normal`). Vérifié dans le navigateur : un combat entier en 90 décisions, 2 ms en moyenne par décision. Rejeu vérifié avec ce niveau (242 tests). Le niveau `recherche` pourrait servir le mode Auto du joueur et les adversaires les plus forts.

## Phase 3 — point 1 : la recherche de séquence gagnante (faite) et ses mesures

`sequenceGagnante(B, k)` (`ai.js`) : recherche en profondeur, sur des copies du combat, d'une suite de coups de MON tour qui tue le héros adverse. Aucun nom de carte : elle essaie. **La porte** : au moins `sequence.minSorts` (2) sorts jouables. **Le budget** : `sequence.noeuds` (100) coups essayés, profondeur 14. Deux élagages : deux coups identiques ne sont essayés qu'une fois, et une carte qui peut viser le héros n'est pas essayée sur une unité sans Provocation. Elle remplace rien : elle passe **avant** le reste dans `decide()` et dans `recherche`. Activée par le drapeau `sequence` des niveaux `lecture` et `recherche` (pas `normal` ni `dur`).

Toutes ces mesures ont tourné sur **mon-mien (chef, 8 cœurs) + le Mac (12 cœurs)**, pas sur le PC de travail.

| `lecture` contre `normal`, 5 trios dont 3 avec Félix, 400 parties/sens (10 000 parties, ± 1,0) | Moyenne | Temps/décision | Parties « moteur en jeu » où une suite est trouvée |
|---|---|---|---|
| sans la recherche | 50,5 % | 0,11 ms | — |
| 100 nœuds | 51,1 % | 8,8 ms | 27,6 % |
| 300 nœuds | 50,8 % | 18,8 ms | 28,7 % |
| 1 000 nœuds | 51,2 % | 37,7 ms | 30,7 % |

**Lecture : la recherche ne change pas le taux de victoire de `lecture` contre `normal`** (écarts de 0,3 à 0,7 point, dans le bruit de ± 1,0) ; plus de budget ne rapporte rien. ⚠ Un premier essai à 200 parties/sens donnait 53,4 % contre 48,9 % : c'était du **bruit**, il ne faut pas décider sur 200 parties par sens. Retenu : 100 nœuds.

`recherche` contre `normal` (200 parties/sens, ± 1,4) : **59,9 %** sans la séquence, **62,1 %** avec (+2,2, à la limite du bruit), 12,8 ms par décision ; une suite est trouvée dans 47 % des parties où le Mage est en jeu. Les 5 000 parties de la ligne « poids retenus » plus haut (61,9 %) ont été jouées **avant** la séquence.

**S4a (exécuter)** passe pour `lecture` et `recherche`. Le test refait la position avec Neuf Vies à 40 de base : plus de victoire ce tour-là, sans toucher au bot. Sur des parties entières (3 trios, 150 parties/sens, coût de base de Neuf Vies changé **en mémoire** par `--surcharge` `cartes`, jamais dans les données) : suite trouvée dans **38 %** des parties à moteur quand Neuf Vies coûte 8, **21 %** à 15, 25 % à 30, 20 % à 40 (± 6). La chaîne suit le coût quand il baisse ; quand il monte, le plancher d'environ 20 % vient des autres létaux que la recherche trouve (ce ne sont pas tous des Neuf Vies).

**Ce qui n'est PAS fait :** le point 2 (retenir) attend ton accord sur la note ci-dessous ; **S4b** (installer avant d'exécuter) échoue donc à tous les niveaux, comme prévu.

Bancs (sur mon-mien) : `test-triggers` 782, `test-ai` 63, `test-rejeu` 242, `test-evenements` 2 680, `test-partage` 108, `test-situations` 501, `test-vfx` 3 368, `test-pv` : verts.

## Phase 3, point 2 — la note de retenue (À VALIDER : rien n'est codé)

**Question :** comment le bot décide de *ne pas dépenser* un carburant (Griffure) tant que la chaîne n'est pas prête, sans règle par carte ?
1. Il a déjà le moyen de répondre « puis-je gagner CE tour ? » : `sequenceGagnante`. On le pose une deuxième fois, sur le tour d'**après**.
2. Pour chaque coup non létal qu'il envisage (jouer une carte, surtout un sort), on fabrique deux copies : **A** = le coup joué, puis fin de tour ; **B** = rien joué, fin de tour.
3. Dans chacune on passe au tour suivant **de lui seulement** : mana au maximum +1, ses unités prêtes, sa main telle quelle. Il ne pioche pas (il ne connaît pas l'ordre de sa pioche) et l'adversaire ne joue pas (sa main est cachée).
4. On lance `sequenceGagnante` dans A et dans B. **Retenir** = B trouve une suite gagnante et pas A : dépenser ce coup détruit le combo. **Installer** = c'est A qui en trouve une et pas B : poser le moteur (Mage, Ombre Feutrée) crée le combo du tour suivant.
5. Rien ne cite une carte : Griffure est retenue parce que, dépensée, la chaîne de Neuf Vies ne tue plus ; le Mage est posé parce que, sans lui, elle ne tue pas.
6. Si ni A ni B ne trouve de suite : le bot joue comme avant (aucun changement hors combo).
7. **Coût :** deux recherches de plus, seulement quand la porte de `BALANCE.ai.sequence` est ouverte (≥ 2 sorts jouables) ; budget propre dans la config (`sequence.nœudsAttente`).
8. **Risque honnête :** on suppose que l'adversaire ne gêne pas d'ici là. Un moteur qu'il détruit entre-temps fait perdre un tour : on le règle par un seuil (`sequence.patience` : ne retenir que si l'adversaire n'a pas de pression, lue sur son horloge) — pas par un plafond de tours.
9. **Mesure prévue :** S4b (installer avant d'exécuter), la part des parties où le moteur est en jeu et où la chaîne part (aujourd'hui 24 à 32 %), et le coût de Neuf Vies changé dans une copie des données pour l'essai.
10. **Arrêt volontaire :** je n'implémente pas sans ton accord (consigne de la mission).

## Idées d'entraînement du game designer (4 nov. 2026) — backlog, rien n'est codé
Les exercices d'un mentor de TCG compétitif : (a) il s'arrête dans la partie et demande à l'entraîné de **deviner sa main** (1 à 4 cartes) ; (b) on **rejoue le tour avec une autre pioche** (« que ferais-tu si tu avais pioché ça plutôt que ça ? ») ; (c) l'entraîné **demande une carte** (« quelle carte voudrais-tu piocher ? », « quelles cartes te donneraient un avantage ? »). Liens : (a) est la lecture des signaux de BOT-CONTEXTE §10.2 (S8) — à valider *bot contre bot* ; (b) et (c) demandent seulement de copier le combat et de remplacer la carte du dessus de la pioche, ce que `cloneBattle` et la recherche du bot savent déjà faire : « quelle carte me donnerait un avantage » = essayer chaque carte du deck comme prochaine pioche et classer par la note de la recherche. Peut être un outil de test pour le bot, un mode entraînement pour le joueur, ou les deux : à décider avec toi.
