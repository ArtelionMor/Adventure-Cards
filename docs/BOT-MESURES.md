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
