# Mission Claude Code — l'outil de courbes d'impact

**À lancer SEULEMENT quand la mission bot (`PROMPT-CLAUDE-CODE-BOT.md`) est terminée et validée par le game designer.**
Si ce n'est pas le cas, arrête-toi et dis-le : les poids mesurés dépendent du bot.

## Rôle
Tu es Lead Tool Programmeur avec une tête de game designer. L'outil doit durer, être relançable à chaque changement de
bot ou de cartes, et être utilisable par une IA qui n'est pas Claude (donc un contexte écrit, explicite, sans implicite).
Si une tâche est impossible ou dangereuse, tu le dis au game designer tout de suite, en entier, sans chercher de solution.

## À lire d'abord
1. `docs/IMPACT-SPEC.md` (la spec : `SPEC-OUTIL-IMPACT.md` du projet, à y copier telle quelle si absente) — **c'est la référence, elle prime sur ce prompt.**
2. `PILOTE-IMPACT.md` : la preuve de principe et ses résultats (24 mesures à retrouver).
3. `CLAUDE.md` racine (règle « tout outil qui joue des parties se partage »), `scripts/CLAUDE.md`, `scripts/lib/CLAUDE.md`.
4. `scripts/lib/pool.mjs`, `scripts/lib/renforts.mjs`, `scripts/renfort.mjs`, `scripts/lib/taches-matchups.mjs` (le modèle à suivre),
   `game/src/tools/arene.js`.

## Objectif
Livrer `scripts/impact.mjs`, `scripts/lib/taches-impact.mjs`, `docs/IMPACT-MESURES.md` et `game/data/impact/`, tels que décrits dans la spec.

## Ce que tu ne fais pas
- Tu ne modifies aucune carte, aucune donnée du jeu, ni `ai.js`.
- Tu n'écris pas le générateur de lignes d'amélioration.
- Pas de `new Worker` hors du pool ; pas de bot `montecarlo*` ; pas de chiffre sans intervalle.
- Tu ne lances aucun calcul de plus de 2 h sans l'accord du game designer.

## Étapes (chacune se termine par un état vérifiable avant de passer à la suivante)

**Étape 1 — Le module de tâches et la mesure d'un cran.**
`taches-impact.mjs` : `prepare` / `joue`, JSON pur, graine commune, cran appliqué sur `structuredClone` des données.
Validation des crans contre le registre (champ inconnu = échec). Un seul champ varie par bras. Cran « sans effet
observable » = échec bruyant (c'est ainsi qu'on saura si `mana max` est lu par le moteur : **rapporte la réponse**).
*Preuve :* 1 cran du pilote retrouvé à l'intervalle près, en 1 fil puis avec `--jobs` plein : chiffres **identiques**.

**Étape 2 — Le chef (`impact.mjs`) : plans, agrégation, contrôles.**
Plan JSON → tâches (cran × adversaire × lot de ~50 parties) → agrégation (écart moyen, écart-type des écarts, IC 95 %,
log-cotes). Bras de base mis en cache. Contrôles nuls (autres graines) et contrôles intercalés (§12 de la spec).
Écriture non destructive dans `game/data/impact/`. Progression `@@progression`. Reprise (`--reprend`).
*Preuve :* les 24 mesures du pilote retrouvées ; ≥ 50 contrôles nuls, ≤ 10 % hors intervalle ; `test-partage.mjs` passe.

**Étape 3 — Échelles, chemins, panel équilibré.**
Échelles de crans (marginal et cumulé), chemins (somme des marginaux vs cumulé), panel construit automatiquement
(équipe entre 35 % et 65 %), refus d'un bot `montecarlo*`.
*Preuve :* une échelle réelle (attaque d'une petite carte 1→6) et une échelle de coût mesurées, tables Markdown écrites.

**Étape 4 — Débit, estimation, étude de variabilité (§13).**
Banc de débit de 2 minutes, estimation de durée avant lancement (±30 %), confirmation au-delà de 2 h, allocation
adaptative (`--precision`). Puis l'étude de variabilité sur l'échantillon de 10 crans × équipes × niveaux {5,10,20,35}.
Sur les trois machines (Pi, `mon-mien`, Mac) si prêtes ; sinon dis lesquelles manquent.
*Preuve :* rapport « l'effet d'un cran dépend-il de l'équipe / du niveau ? » avec chiffres, et plan de couverture proposé.

**Étape 5 — Le contexte pour les autres IA.**
`docs/IMPACT-MESURES.md` : format du plan, format du résultat, commandes, comment lire une table, pièges (graines,
empreintes, 409 des renforts, saturation à 66 %). Relu comme si tu ne connaissais rien du projet.

## Rapport final
Ce qui marche (preuves), ce qui ne marche pas, le débit mesuré, la réponse sur `mana max`, la variabilité équipe/niveau,
le temps estimé du plan complet, et **ce qui est resté à décider** par le game designer.
