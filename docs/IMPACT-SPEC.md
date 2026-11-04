# Spec — l'outil de courbes d'impact (`scripts/impact.mjs`)

**Statut :** à faire APRÈS le travail sur le bot (`BOT-CONTEXTE.md`) : on entraîne/règle d'abord le bot, puis on lance l'outil. Les poids mesurés dépendent du bot : chaque
résultat est donc rangé avec l'empreinte du bot qui l'a produit, et se refait en une commande quand le bot change.

**Pour qui :** Claude Code (ou toute IA qui lit ce fichier). Tout est dit ici ; le pilote qui a servi de preuve de
principe est `PILOTE-IMPACT.md`.

## 1. Ce que l'outil répond

> « Quand je donne **un cran** (+1 sur une métrique d'une carte, ou sur le camp), de combien monte le taux de
> victoire de l'équipe qui le reçoit ? »

La réponse sert à une chose : choisir, pour chaque héros, les ~200 crans de sa ligne d'amélioration pour que
**chaque niveau pèse à peu près la même chose** (ou suive une courbe voulue). Ce n'est pas un outil d'équilibrage
de cartes.

## 2. Ce qui existe déjà et qu'on réutilise (ne rien réécrire)

- `scripts/lib/pool.mjs` : la file de tâches, cœurs locaux **et renforts** (PC `mon-mien`, Mac, via Tailscale,
  `scripts/renfort.mjs`, port 7331). Un nouveau module de tâches est reconnu **tout seul** par les renforts
  (la liste blanche, c'est le dossier `scripts/lib/taches-*.mjs`).
- `game/src/tools/arene.js` : `campPerso`, `duel`, `serie`, `wilson`. Tout nouvel outil de mesure passe par là.
- `scripts/lib/progression.mjs` : la barre de progression (`@@progression n/N`).
- `scripts/test-partage.mjs` : doit passer (pas de `new Worker` hors du pool, résultats en JSON pur).
- `scripts/reveille.mjs` : réveiller `mon-mien` et le Mac (depuis une machine du même réseau local).

## 3. Les fichiers à créer

| Fichier | Rôle |
|---|---|
| `scripts/impact.mjs` | Le chef : lit un **plan** (JSON), le découpe en tâches, les envoie au pool, agrège, écrit le résultat. |
| `scripts/lib/taches-impact.mjs` | Le module de tâches : `prepare(ctx)` et `joue(tache)`. JSON pur en entrée et en sortie. |
| `docs/IMPACT-MESURES.md` | Le **contexte lisible par n'importe quelle IA** : format du plan, format du résultat, comment lancer, comment lire, pièges. Écrit pour une IA qui n'est pas Claude. |
| `game/data/impact/` | Les résultats (un fichier par série, jamais écrasé), plus `index.json`. |

## 4. Une mesure, précisément

Un **cran** est décrit en JSON, jamais en fonction :

```json
{ "id": "chiot-cout-2-1", "cible": {"carte": "Chiot de Garde", "champ": "cost"}, "de": 2, "a": 1 }
{ "id": "heros-pv-+3",    "cible": {"camp": "hp"},   "delta": 3 }
{ "id": "depart-+1",      "cible": {"camp": "hand"}, "delta": 1 }
```

- Champs de carte admis : coût, attaque, PV, dégâts d'un effet, valeur d'un effet, mot-clé ajouté/retiré
  (liste fermée, validée contre le registre du moteur ; un champ inconnu fait échouer le plan, jamais ignoré).
- Champs de camp : `hp`, `mana` (max), `hand` (cartes de départ), `draw`, `armor` si le moteur les porte.
- **Vérification obligatoire avant toute série :** le cran est-il vraiment lu par le moteur ? Le pilote a trouvé
  « mana max 10→11 = 0,00 exact » : soit vrai, soit le champ est ignoré. L'outil doit **échouer bruyamment** si
  un cran appliqué ne change aucun état de départ observable (contrôle sur 1 partie : l'état avant/après diffère).

### Le protocole (celui du pilote, à ne pas affaiblir)

1. **Équipe testée** E (3 héros, niveau de palier N) et **panel d'adversaires** P (trios fixes, listés dans le plan).
2. Pour chaque adversaire et chaque partie `k` : une **graine** `s = f(adversaire, k)` ; `Math.random` est remplacé
   par un générateur à graine (`mulberry32`) **dans la tâche**, rétabli à la fin. Le bras « avant » et le bras
   « après » utilisent la **même graine** (nombres aléatoires communs) : l'écart se mesure partie par partie.
3. Les côtés alternent (qui commence), la moitié des parties dans chaque sens.
4. Résultat de la tâche : pour chaque partie, `gagne` avant/après (0/1) — pas un taux. L'agrégation (écart moyen,
   écart-type des écarts, intervalle à 95 %) se fait dans `impact.mjs`.
5. Un **bras de base** est calculé une fois par (équipe, niveau, panel, bot, version des cartes) et réutilisé.
6. Le cran n'est appliqué que sur **la copie des données** de la tâche (`structuredClone`), jamais sur le jeu.

Grain d'une tâche : (cran × adversaire × lot de ~50 parties). Indépendantes, reprenables, JSON.

## 5. Échelles, pas crans isolés

Un cran seul ne dit rien du cumul. Le plan sait exprimer une **échelle** : le même champ, valeurs successives
(`attaque 1→2→3→…→8`, `coût 4→3→2→1→0`) ; l'outil mesure chaque marche **depuis la marche précédente** (écart
marginal) **et** depuis l'origine (écart cumulé). C'est la courbe d'impact d'une métrique.

Il mesure aussi des **chemins** : la ligne réelle d'un héros appliquée cran par cran, pour vérifier que la somme
des écarts marginaux ≈ l'écart cumulé (non-additivité = mesure à reprendre sur le chemin).

## 6. Choix des adversaires (le piège statistique)

À 66 % de base, les écarts sont compressés ; à 50 % ils sont maximaux. L'outil :
- accepte un panel explicite, **ou** construit un panel « équilibré » : adversaires dont le taux de l'équipe E est
  entre 35 % et 65 % (pré-mesure de 100 parties par adversaire, résultat rangé) ;
- exprime les écarts en **points** *et* en **log-cotes** (`ln(p/(1-p))`, lisible en Elo) ; la ligne d'amélioration
  se règle sur la log-cote.
- rapporte pour chaque mesure : taux de base, panel, nombre de parties, intervalle. **Pas de chiffre sans son
  intervalle.**

## 7. Sorties

`game/data/impact/<date>-<série>.json`, jamais écrasé :
```json
{ "empreinte": {"bot": "<hash ai.js + BALANCE.ai>", "cartes": "<hash characters.data.js>", "moteur": "<hash combat/>"},
  "equipe": [...], "niveau": 10, "bot": "normal", "panel": [...], "parties_par_bras": 3600,
  "mesures": [ { "id": "...", "cran": {...}, "base": 0.664, "delta": 0.0208, "ic95": 0.0068, "logcote": 0.092 } ] }
```
Plus un tableau Markdown par héros (`docs/IMPACT-<heros>.md`) : une ligne par carte × métrique × marche, trié par
impact, avec une colonne **« sensibilité de la carte »** (le plus gros écart marginal de la carte) — c'est la
lecture qui sert à la discussion carte par carte avec le game designer.

## 8. Lancer, surveiller, reprendre

- `node scripts/impact.mjs plan.json [--jobs N] [--reprend <fichier>]`. Même sortie en un fil (`--jobs 1`) ou sur
  les trois machines, aux tirages près (graines communes → **exactement** les mêmes chiffres, c'est à tester).
- Reprise après arrêt d'un renfort : ce qui n'est pas revenu retourne dans la file (déjà géré par le pool).
- Avant un long calcul : sonder les renforts (`renforts.statuts()`), dire lesquels sont prêts, **ne pas** attendre
  silencieusement une machine endormie (la réveiller est une action du game designer ou de `reveille.mjs`).
- Les renforts exigent le **même code** (un `git pull` en plein calcul donne une erreur 409) : l'outil affiche
  l'empreinte du code et refuse un renfort différent.

## 9. Critères de réussite

1. Le pilote est **reproduit** par l'outil : les 24 mesures de `PILOTE-IMPACT.md` retrouvées à l'intervalle près.
2. Un calcul sur trois machines et un calcul sur un cœur donnent des résultats **identiques** (mêmes graines).
3. Un cran que le moteur ignore fait échouer le plan avec un message clair.
4. `test-partage.mjs` passe. Aucun `new Worker` dans l'outil.
5. `docs/IMPACT-MESURES.md` permet à une autre IA (pas Claude) de construire un plan et de lire un résultat sans
   rien demander.
6. Temps : une série « un héros, ses 10 cartes, 4 métriques, échelles de 6 marches » ≈ 240 mesures × 3 600
   parties ; le temps mesuré est donné dans le rapport final, et le nombre de parties par bras est un paramètre.

## 10. Ce que l'outil ne fait pas (volontairement)

- Il ne **modifie aucune carte** ni aucune donnée du jeu.
- Il ne **génère pas** la ligne d'amélioration : il fournit la table de poids. Le générateur (budget par niveau,
  choix des crans, rythmes) est une étape suivante, discutée avec le game designer sur les tables.
- Il ne juge pas si une carte est « trop forte » : un cran mesuré n'est pas un souhait d'équilibrage.
- Il ne touche pas à `ai.js`.

## 11. Décisions du game designer (4 nov. 2026)

- **Une seule valeur varie à la fois** par mesure. Un plan qui change deux champs dans un même bras est refusé.
- **Couverture visée : toutes les équipes, tous les niveaux** (voir §13 : le coût oblige à l'atteindre par étapes).
- **Groupe de contrôle** : voir §12.
- **Pas de Monte-Carlo.** Le jeu n'utilise pas ce bot : l'outil **refuse** les niveaux `montecarlo` et
  `montecarlo-exact` (message clair), et ne mesure qu'avec le niveau de bot réellement joué dans le jeu
  (aujourd'hui `normal`, demain `lecture`). Trop lent de toute façon.
- **Ordre** : entraîner le bot → lancer l'outil. L'empreinte du bot est rangée avec chaque résultat.
- Le game designer fait tourner les trois machines ; on peut prendre le temps de bien tester l'outil, sans excès.

## 12. Groupe de contrôle

Deux sortes, toutes deux dans le plan par défaut :

1. **Contrôle nul (A/A).** Des « crans » qui ne changent rien (`"cran": null`), joués avec **d'autres graines** que
   le bras de base. Leur écart doit être ≈ 0 et rester dans l'intervalle annoncé dans ~95 % des cas. Ça vérifie que
   les intervalles sont honnêtes : si 1 contrôle sur 5 sort de son intervalle, la méthode est fausse, pas le jeu.
2. **Contrôles intercalés.** Tous les ~20 crans mesurés, un contrôle nul et un **cran de référence connu** (par
   exemple « héros PV +3 », mesuré +3,7 par le pilote) sont rejoués. Une dérive (code différent sur un renfort,
   machine capricieuse, donnée périmée) se voit tout de suite et invalide les mesures encadrées.

Le rapport donne : nombre de contrôles, part qui sort de l'intervalle, écart-type observé des contrôles nuls (c'est le
**plancher de bruit** : aucune mesure en dessous n'est interprétée).

## 13. Couverture et coût — à lire avant de lancer « tout »

Ordre de grandeur (pilote : ~80 parties/s sur 2 cœurs à niveau 10 ; disons ~300/s sur les trois machines, **à
mesurer** par un banc de 2 minutes au début de chaque série) :

| Plan | Parties | Durée estimée |
|---|---|---|
| 1 cran, 1 équipe, 1 niveau, 3 600 parties | 3,6 k | ~12 s |
| 240 crans d'un héros, 1 équipe, 1 niveau | ~860 k | ~50 min |
| idem sur toutes les équipes (84 trios de 9 héros) et 7 niveaux | ~500 M | ~20 jours |

Donc « toutes les équipes × tous les niveaux × tous les crans » au pas de 3 600 parties n'est pas faisable. Ce que
l'outil fait pour atteindre la couverture quand même :
- **Il mesure d'abord la variabilité**, pas la valeur : sur un échantillon stratifié de crans (10 crans de types
  différents) × toutes les équipes contenant le héros (28 trios) × niveaux {5, 10, 20, 35}, il calcule combien l'écart
  d'un cran change d'une équipe/niveau à l'autre. Si la variation est faible devant l'intervalle, un cran se mesure
  sur un **sous-ensemble** d'équipes et de niveaux, et l'effet pour les autres s'obtient par modèle (écart ~ cran +
  équipe + niveau). Si elle est forte, le plan plein est justifié et le temps est annoncé avant lancement.
- **Allocation adaptative** : on arrête un cran quand son intervalle est plus étroit que la précision demandée
  (`--precision 0.4`), au lieu de 3 600 parties partout. La plupart des crans « sans effet » se règlent vite.
- **Estimation du temps avant lancement** (banc de débit + nombre de parties prévu) et confirmation du game designer
  au-delà de 2 h.

## 14. Critères de réussite ajoutés

7. Les contrôles nuls sortent de leur intervalle dans ≤ 10 % des cas (95 % attendus dedans), sur ≥ 50 contrôles.
8. Un plan avec deux champs variant dans un même bras, ou un bot `montecarlo*`, est refusé avec un message clair.
9. Le banc de débit et l'estimation de durée s'affichent avant toute série, et l'estimation est à ±30 % de la réalité.
