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

## Phase 3 — bloquée

Condition d'entrée **non remplie** : *Mage de l'étincelle* (`cat_claw`) cible toujours `randomEnemyAny` (héros **ou** unités) et garde **Charge**. Rien n'a été commencé (ni recherche de séquence, ni note de dix lignes, ni fiche S4).
