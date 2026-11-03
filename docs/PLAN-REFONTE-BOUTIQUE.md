# Plan de la refonte « boutique » (décisions du 3 novembre 2026)

> Lot 0 (reconnaissance, aucun code). Branche `refonte-boutique`. Sources : GDD vivant v0.5 (§07b, §07c),
> Google Sheet « Config Adventure-Cards » (`~boutique_extensions`, `~boutique_heros`, `~boutique_raretes`),
> `CLAUDE.md` de chaque dossier. **Non lus** : Notion (connecteur non chargé dans cette session),
> l'onglet `~boutique_cartes` et `~boutique_glossaire` de la Sheet (lus au lot qui en a besoin).

## 1. État constaté

| Point | Constat |
|---|---|
| `core/` | `D:\tcg-card-tycoon_-marché-&-enchères\core` (dépôt git propre, 40d9bc9). ⚠ Son arbre de travail a des **modifications non commitées** (`config.ts`, `economy.json`, `grading.ts`, `heroUnlock.ts`, `market.ts`, `packs.ts`, `pricing.ts`, `progression.ts`, `shop.ts`…) : le noyau du jeu est généré **depuis cet arbre sale**. À commiter côté `core/` avant le lot 1. |
| Régénération | `node scripts/gen-boutique.mjs "<core>"` → 19 modules, 210 cartes, **diff vide** dans `game/src/boutique/noyau/`. Le noyau du jeu = `core/` tel quel. |
| Bancs (avant tout changement) | `test-triggers` 782 ✓, `test-ai` 53 ✓, `test-evenements` 2 699 ✓, `test-partage` 90 ✓, `test-quetes` 129 ✓, `test-rejeu` 242 ✓, `test-situations` 321 ✓, `test-vfx` 3 371 ✓. `simulate.mjs` : tourne (13 762 cases), aucune erreur. Non lancés : `test-journal` (instable, pas touché), `test-courbes`, `test-rig`, `matchups`/`check-decks` (aucune carte modifiée au lot 0). |
| Simulateur d'économie | ⚠ `scripts/sim-economie-boutique.mjs` **n'existe pas sur cette machine** (ni dans git, ni ailleurs sur C: ou D:). Il doit être sur le Pi ou sur mon-mien. Le noyau a son propre simulateur (`core/src/sim/`, `npm run sim`), mais pas les options `--config / --first / --wins / --profile / --days / --seeds` décrites. |
| Sheet | `~boutique_extensions` : 3 extensions (ext1 : 9 héros, ext2 : 6, ext3 : 6), `partie_a_niveau` = 1 partout, **aucune phase B** renseignée. `~boutique_raretes` : ids `legendaire` / `mythique`. `~boutique_heros` : `name_en`, `species_en` présents. |
| Verrou de vente | `core/src/state.ts` : `lockedByDeck`, `setDeck`, `checkSellable` (utilisés par `auction`, `bulk`, `showcase`, `sim/run.ts`). |
| Ligne d'adversaires | `core/config/economy.json` : `progression.ladder = { winsToAdvance: 10, levelMax: 4 }`. |

## 2. Réponses à mes questions (une seule trouvée seule)

1. **`core/`** : trouvé (voir ci-dessus). À confirmer que c'est le bon dépôt.
2–6 : **ouvertes**, voir §4. Je n'ai rien deviné.

## 3. Lots

Chaque lot : résumé, tests, reste ; je m'arrête et j'attends le feu vert. Un commit local par lot.

| Lot | Contenu | Où | Critères de sortie |
|---|---|---|---|
| 1. Noyau | Retrait du verrou de deck ; enchères sur doublons (`lotPool`, `placeBid`, `closeLot`, `validateConfig`) ; compteur de parties par carte + dernier deck (persistés) ; extensions A/B (6 déblocages, un booster par extension) ; retrait des Fanions/Sceaux ; renommage `legendaire→legendary`, `mythique→mythic`, `Contrôle→Control` ; profil de référence 2 × 30 min (8 h, 19 h) ; `winsToAdvance = 1`, plus de cooldown | `core/` puis `gen-boutique.mjs` ; adaptateurs dans `game/src/boutique/partie.js` | `validateConfig` ✓, tests de `core/` ✓, bancs ✓, mesures de référence retrouvées (ext. 2 phase A en 3 j médiane, 68–77 boosters/j, niveau 8/11/16/19 aux jours 7/14/30/60), **aucun profit garanti** démontré au simulateur |
| 2. Héros et upgrades | Menu sans équipe, masqués / grisés ; upgrade manuel puis batch (bouton flottant à deux états) ; fiche différentielle ; animations différées par héros ; offre de mise à niveau ; Power ; verrou du mode Auto | `game/src/ui/`, `config/`, `state.js` | Mockups `Level Up/`, petits écrans et ratios vérifiés dans le navigateur intégré |
| 3. Ligne et Power | Une victoire par marche ; adversaires distincts à force croissante ; niveau adverse aligné sur le Power ; calibrage par mesure (trios seulement) | `config/arenes.js`, `ennemis.js`, `core/meta` | Taux de victoire par écart de Power (`simulate.mjs`, `matchups.mjs --trio`) |
| 4. Clients | 10 clients en config, ordre d'arrivée, scène d'intro, fiche Shop (2 + / 1 −) ; `docs/ASSETS-CLIENTS.md` | `core/config/buyers.json`, `ui/` | |
| 5. Teliau | `game/src/config/teliau.js` : déclencheurs et seuils réglables ; valeurs de départ proposées | | |
| 6. Anglais | Externalisation vers `textes.js`, libellés `mechanics.js`, `describe…` ; `docs/TACHES-CARD-BUILDER.md` | | |
| 7. Analytics | Un événement par combat, agrégats par carte, JSON local | | |

**Tâches Card Builder** (je ne touche pas à `characters.data.js`) : `docs/TACHES-CARD-BUILDER.md`, créé au lot 1 (raretés proposées, renommage des doublons de noms, mythiques = switch) puis complété.

## 4. Questions ouvertes (réponse nécessaire avant le lot indiqué)

1. **Lot 1 — `core/`** : OK pour commiter d'abord ses modifications en cours (ou me dire de les laisser) ?
2. **Lot 1 — simulateur** : où est `scripts/sim-economie-boutique.mjs` (Pi ? mon-mien ?) — à rapatrier, ou je pars du simulateur du noyau ?
3. **Lot 2 — mode Auto** : « après le niveau 10 » = niveau des héros, niveau de l'adversaire, ou étape de la ligne ?
4. **Lot 2 — Power** : définition (somme des niveaux ? des paliers ? `puissanceEquipe` existe déjà dans `state.js`) ; « +10 Power » du mockup = par quoi ? **Prix de l'offre** de mise à niveau d'un nouveau héros.
5. **Lots 1 et 3 — ligne et déblocages** : forme et longueur de la ligne (spirale en 3 tours ? combien de marches par palier ?), et les 6 étapes exactes (extension 1 A = fin du tutoriel).
6. **Lot 4 — tutoriel** : `docs/TUTORIEL.md` est périmé. Je te propose un déroulé **avant** de toucher aux quêtes ; dis-moi si tu veux que je le rédige dès le lot 2.
7. **Lot 5 — Teliau** : seuils de « bloqué », récompenses, liste des aides (je propose des valeurs de départ au lot 5).

## 5. Risques et choses à savoir

- **Arbitrage sur les enchères** : enchérir sur ses propres doubles ouvre l'achat → grading → revente. Le lot 1 doit le **prouver impossible** au simulateur ; le garde-fou se règle en config (marge de l'enchère, frais, plancher de revente).
- **Renommage `legendaire/mythique`** : touche le noyau, la Sheet (`~boutique_raretes`), les données de cartes (`characters.data.js`, hors périmètre) et l'UI. Les cartes sont une tâche Card Builder ; tant qu'elles ne sont pas migrées, le jeu doit lire les deux (mapping de transition) — à décider au lot 1.
- **Tout l'arbre de travail est sale** (assets, scripts du lot rig) : je ne commite que mes fichiers.
- **Fins de ligne** : référence `i/` de `git ls-files --eol`.
