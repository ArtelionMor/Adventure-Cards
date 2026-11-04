# Mission Claude Code — le bot lit sa position et joue son rôle (v1)

À coller tel quel dans Claude Code, ouvert à la racine du dépôt `Adventure-Cards`.
Avant : placer `BOT-CONTEXTE.md` dans `docs/`.

---

## Rôle

Tu es Lead Gameplay Programmeur et Lead Tool Programmeur sur Adventure Card. Tu es indépendant : si une tâche est
impossible ou dangereuse, tu reviens vers moi **immédiatement, en entier et sans détour**, sans proposer de solution.
Tout ce qui se règle vit dans `game/src/config/` (`BALANCE.ai`), commenté en français. Aucun identifiant de carte
dans `ai.js`.

## À lire d'abord, dans cet ordre

1. `CLAUDE.md` (racine), en particulier « Vocabulaire », « Philosophie de design », « Règle de travail ».
2. `game/src/combat/CLAUDE.md`, section « Le bot ».
3. `docs/BOT-CONTEXTE.md` en entier : c'est la spécification. Les §5 et §7 contiennent des **vœux de retouche de
   cartes qui ne sont pas à faire**.
4. `scripts/CLAUDE.md` et `game/src/tools/CLAUDE.md` (outils de mesure, `duel`, `serie`).
5. `docs/SITUATIONS-A-TESTER.md` (format des fiches).

`ai.js` (≈ 1 400 lignes) ne se lit jamais en entier : grep `decide`, `meilleureAttaque`, `unitThreat`, `cardValue`,
`coupsPossibles`, `cloneBattle`.

## Objectif

Aujourd'hui le bot suit la même séquence pour tous les decks et note de la même façon un coup au visage et un
échange. Il doit **lire sa position** (qui est en avance, qui doit pousser, qui doit gagner du temps) et **jouer le
rôle qui en découle**, sans tricher (jamais la main adverse ni l'ordre de sa pioche), pour **gagner le plus souvent
possible**. Symptômes à faire disparaître :
- l'Aggro prend des échanges au lieu de pousser au visage ;
- l'Aggro gaspille ses sorts de retrait sur des unités qui ne retardent pas son plan ;
- le Contrôle dépense ses PV au mauvais moment (cas à préciser : voir S3) ;
- le Combo ne sait pas installer puis exécuter.

## Ce que tu ne fais pas

- Aucune modification de cartes, d'héros ou d'adversaires (`characters.data.js`, builder, feuille).
- Aucune modification des règles du moteur (`engine.js`). Si tu crois qu'un changement est nécessaire : **arrête-toi
  et dis-le**.
- Pas de réécriture d'`ai.js` : tu ajoutes une couche de lecture et tu **règles les coefficients** de
  `cardValue`, `unitThreat` et `meilleureAttaque`.
- Pas de remise en route du `misplay`, ni de la troncature des rollouts Monte-Carlo.
- Pas de plafond arbitraire (« X fois par tour ») pour couper une boucle.
- Pas de phase 4 sans mon accord.

## Phase 0 — Base de mesure (avant toute modification d'`ai.js`)

1. Lance les bancs et note les résultats de départ : `test-triggers`, `test-ai`, `simulate`, `test-rejeu`,
   `test-evenements`. `test-journal.mjs` est connu pour être instable : n'enquête pas dessus.
2. Mets `misplay: 0` à **tous** les niveaux de `BALANCE.ai.niveaux`. Garde le mécanisme dans `ai.js`. Commente
   pourquoi (mesure conservatoire, à remettre seulement si le bot est jugé trop fort).
3. Crée un banc de force `scripts/bench-bot.mjs` (suivant la règle « tout outil qui joue des parties se partage » :
   `scripts/lib/pool.mjs` + un module `scripts/lib/taches-bench-bot.mjs`). `duel` accepte déjà un niveau d'IA par
   camp (`opts.p` / `opts.e`). Il fait jouer l'IA A contre l'IA B sur des trios de référence, **côtés échangés**, et
   rend taux de victoire et intervalle de Wilson (`wilson` existe) par paire de decks et en moyenne. Sortie JSON
   et tableau lisible.
4. Écris dans `docs/BOT-MESURES.md` la mesure de départ : `normal` contre lui-même (doit être ≈ 50 %), et le temps
   moyen par décision.

**Livrable de phase 0 :** commit « bot : base de mesure, misplay à 0 ». Aucun changement de comportement hors
`misplay`.

## Phase 1 — Fiches de situations (les tests d'abord)

Écris dans `docs/SITUATIONS-A-TESTER.md` et `game/data/situations.js`, puis dans `scripts/test-ai.mjs`, les fiches
**S1, S2, S5, S6** de `BOT-CONTEXTE.md` §6, avec de **vraies cartes** (vérifie leurs identifiants : ne devine pas).
Elles doivent **échouer** avant ta modification (montre-le) et passer après. **S3** attend un cas concret de ma
part : n'invente pas de fiche, pose une fiche « à recueillir » dans le fichier. **S4** (combo) attend la phase 3.

## Phase 2 — Lecture de position et postures (Aggro / Contrôle)

1. Écris `lectureDePosition(B, k)` → `{ monHorloge, saHorloge, role, stabilise }` (définitions : `BOT-CONTEXTE.md`
   §3.2). Fonction pure (ne modifie pas `B`), sans identifiant de carte, réutilisable comme fonction d'évaluation.
   Paramètres dans `BALANCE.ai.lecture` (avec un interrupteur `actif`).
2. Ajoute un niveau d'IA `lecture` (copie de `normal` + lecture activée). **Garde `normal` et `dur` tels quels** : ce
   sont tes références de mesure.
3. Branche les **postures** (`BALANCE.ai.postures`, §3.3 du document) sur trois points seulement :
   - `meilleureAttaque` : poids du visage contre un échange ;
   - la retenue d'un sort de retrait : « menace » devient « ce qui retarde mon horloge » en posture beatdown ;
   - le prix d'un PV pour les cartes qui coûtent des PV (cherche dans `config/mechanics.js` les effets de perte de
     PV du héros qui joue : ne devine pas), haut avant stabilisation et bas après, selon le rôle.
4. Propose des valeurs de départ **raisonnées et commentées** dans la config.
5. Mesure avec `bench-bot` : `lecture` contre `normal`, mêmes decks, côtés échangés, au moins 200 parties par paire.

**Critères d'acceptation :** S1, S2, S5, S6 passent ; aucun deck ne régresse (intervalle à 95 %) ; moyenne
rapportée ; temps par décision ≤ 1,2 × le départ ; tous les bancs verts ; `grep` des identifiants de cartes dans
`ai.js` : rien de nouveau. Mets à jour `game/src/combat/CLAUDE.md`.

**Livrable :** commit + `docs/BOT-MESURES.md` mis à jour avec le tableau.

## Phase 3 — Combo : installer, retenir, exécuter

**Condition d'entrée :** vérifie que *Mage de l'étincelle* (`cat_claw`) ne cible plus un adversaire aléatoire
(`randomEnemyAny`) mais le héros adverse. **Si ce n'est pas le cas, ne commence pas : dis-le-moi et passe à la fin.**

1. **Exécuter.** Généralise l'étape « victoire immédiate » de `decide()` en une **recherche bornée de séquence
   gagnante dans le tour** sur `cloneBattle` : ordre des cartes et cibles, profondeur et budget de nœuds en config,
   déterministe sous la graine du rejeu, jamais sur le vrai `B`. Elle ne se déclenche que si une porte peu chère le
   permet (mana disponible, nombre de sorts en main ; à toi de proposer). Elle doit trouver la chaîne
   *Ombre Feutrée → Neuf Vies → Griffures → un ping de Mage par sort* sans connaître ces noms.
2. **Retenir.** Avant de coder, écris-moi une note de dix lignes : comment le bot décide de **ne pas dépenser** un
   carburant (ex. Griffure) tant que la chaîne n'est pas prête, sans règle par carte. **Arrête-toi et attends mon
   accord** avant de l'implémenter.
3. Fiche S4 + mesure de l'exécution du combo (§8 du document) : part des parties où le moteur est en jeu et où la
   chaîne part, avant/après ; puis refais la mesure avec le coût de base de Neuf Vies changé temporairement dans une
   copie des données pour l'essai (jamais commité).

## Phase 4 — Ne pas commencer

Réglage automatique des coefficients de `BALANCE.ai.lecture` et `postures` par auto-jeu (même infrastructure que
`matchups.mjs`) pour qu'ils se recalent après chaque changement de cartes. **Ne l'implémente pas** : dans ton
rapport final, dis seulement si l'architecture de la phase 2 le permet et ce qu'il manquerait.

## Rapport final (un seul message)

1. Ce qui a changé (fichiers), en dix lignes maximum.
2. Le tableau de mesures (départ / après), les intervalles, le temps par décision.
3. Ce qui est bloqué et pourquoi.
4. Les écarts avec ce prompt, s'il y en a, et la raison.
5. Les questions qu'il te reste.

Ne résume pas tes étapes.
