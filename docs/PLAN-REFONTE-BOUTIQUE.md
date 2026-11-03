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

## 3 bis. Lot 1 — fait (3 nov. 2026)
Noyau (`core/`, branche `refonte-boutique`, 56a21c1) puis régénération. Tests du noyau : 120 ✓. Banc du jeu : `scripts/test-boutique.mjs` (11 ✓).
- **Fait** : plus de verrou de deck ; doublons misables aux enchères (garde-fou `arbitrage-doublon`, facteur `ownedBuyMultiplier` 2,1) ; `plays` et `lastDeck` (`recordDeckPlayed`, branché sur la fin de chaque combat, rejeux exclus) ; phases A/B (`progression.extensions` / `switchExtensions`), 6 déblocages, un booster par extension (`openBooster(…, { extension })`), pitié par extension ; mythiques = switch (catalogue du noyau) ; `legendary`/`mythic`/`Control` partout ; profil 2 × 30 ; `winsToAdvance` = 1 ; sauvegarde du jeu en v6 avec migration (rien n'est retiré à un joueur existant).
- **Mesures** (`core/scripts/mesure-lot1.ts`) : extension 2 seule, phase A en **2,9 j** (neutre, réf. 3) et **4,6 j** avec un héros S (réf. 5–7), P90 8,2 j ; mythique du héros S en **5,9 j** médiane, **14 j** max (réf. 6–7 ; 14). Trio de départ : niveau **7,3 / 12 / 15,3 / 18** aux jours 7/14/30/60 (réf. 8 / 11 / 16 / 19). 70 boosters/jour.
- **Aucun profit garanti** (`core/scripts/sim-arbitrage.ts`, 300 lots × 5 limites × 3 reventes) : revente brute **jamais rentable** (0 % de victoires rentables) ; vitrine jamais ; **grading** : pas de profit garanti (pire cas −2 329), mais **espérance positive vers un prix de 3× la référence** (+160 par victoire, 50 % rentables, 26 victoires sur 300) — à surveiller, pas bloquant.
- **Limite connue** : l'écran des boosters ouvre encore « toutes extensions débloquées » ; **le choix du booster par extension dans l'UI n'est dans aucun lot** (à ajouter, lot 2 ou à part).
- **Le simulateur** `scripts/sim-economie-boutique.mjs` est recréé (l'original est introuvable) ; ses paramètres sont lisibles dans la Sheet (`~boutique_simulation`), les marches de la ligne dans `~boutique_progression`.

## 3 ter. Lot 2 — fait (3 nov. 2026)
Écran Deck sans équipe, héros cachés / grisés, Power, bouton flottant à deux états (`BALANCE.heros.lot`), fiche d'amélioration qui souligne ce qui change, animations rejouées à l'ouverture du héros, offre d'arrivée (prix = 50 % du prix à la main, `BALANCE.heros.offre.remise`), mode Auto verrouillé jusqu'à 10 adversaires battus (`BALANCE.heros.auto`). Banc : `scripts/test-heros.mjs` (30 ✓). **Vérifié dans le navigateur à 375 × 812 seulement** ; l'offre, le verrou Auto en combat et les autres ratios ne l'ont pas été. **Valeurs proposées, à régler** : lot débloqué après 4 adversaires, niveau de référence = 3ᵉ meilleur héros, remise 50 %. Les puissances requises de la Sheet (`encounters`) et la fiche d'arène sont calibrées sur l'ancienne formule du Power : lot 3.

## 3 quater. Lot 3 — fait (3 nov. 2026)
**Ligne** : 56 combats (14 adversaires × 4 tours, **une victoire chacun**), généré par `scripts/calibre-power.mjs --ligne` d'après **129 000 parties** de trios (24 trios × 2 parties par case, 14 adversaires × 16 niveaux × 12 niveaux de héros). Chaque combat porte son **niveau d'adversaire** et son **Power requis** (= celui d'un trio qui gagne une fois sur deux : 30 → 945). La fiche d'arène et la piste l'affichent. Copie lisible : Sheet, onglet `~boutique_ligne`.
**Ce que la mesure a montré** : les adversaires sont **très inégaux** — au niveau 1, sept demandent un trio de niveau 1 à 4 (Souris, Chat, Paresseux, Panda, Chèvre, Renard…) et sept un trio de niveau 6 à 12 (les trois boss, Rouge-Gorge, Pieuvre Robot, Loup…). Un même niveau d'adversaire ne veut donc rien dire d'un adversaire à l'autre : **la ligne aligne le Power, pas le niveau** (les niveaux d'adversaires montent en dents de scie, de 1 à 30). Les boss sont des **murs** (« examens ») : leur Power relève tout ce qui les suit, d'où des **paliers plats** (Power 340 du combat 10 au 15, 455 du 22 au 27, 800 du 45 au 51).
**Points à trancher** : (1) l'ordre des 14 adversaires dans le tour (celui de `core/config/meta.json`) ; trié par force il éviterait les paliers plats, mais il décale les déblocages du noyau ; (2) la rampe de 1 à 30 niveaux de héros sur 56 combats ; (3) les niveaux de héros au-delà de 30 (la mesure sature à 34) ; (4) la spirale Aggro / Contrôle / Combo des prix (non traitée). **Non mesuré** : le rythme du joueur sur cette ligne (le niveau moyen de héros qu'il a au combat N) — il dépend du prix des améliorations du jeu (`BALANCE.costs.charUpgrade`), pas de celui du noyau (100 × 1,35).

## 3 quinquies. Lot 4 — fait (3 nov. 2026)
Dix clients dans le noyau (`core/config/buyers.json`, branche `refonte-boutique`, 347a04f) : règles, arrivée (Timmy au départ ; Jenna au 1er palier d'arène ; Spike et Cipher au 2e ; Richie avec le grading ; Boris et Barnaby avec l'extension 2 ; Brock avec la première table ; Ada et Rook avec la première amélioration), fréquences (Richie 0,35 contre 1 pour Timmy). Le jeu : scène d'intro (`ui/client-intro.js`), visiteurs et avis limités aux clients arrivés, fiche « Shop » à 2 positifs + 1 négatif, sauvegarde v7. Liste des assets : `docs/ASSETS-CLIENTS.md`.
**À savoir** : (1) les **cartes flaguées** sont **provisoires** (catalogue de test du noyau : Timmy = coût ≥ 5, Jenna = Combo de coût 3-4 rare+, Spike = epic+ de coût ≤ 4) ; les colonnes `flag_timmy/jenna/spike` de `~boutique_cartes` sont vides, à remplir par toi (le chargeur lit `flag_*` et `flags`). (2) Les cartes jouées de Cipher se comptent par identifiant de **carte du jeu** ; le catalogue de test du noyau n'a pas toujours les mêmes identifiants (Lapins) : à unifier quand le catalogue du noyau sera celui du jeu. (3) `prix_ref_max` reste calculé sur les **dix** clients (arrivés ou non) : un client qui arrive plus tard ne rend pas un double acheté plus rentable (garde-fou `arbitrage-doublon`). (4) « Timmy achète sans préférence » : sa règle `flag` reste en plus de ses goûts, à retirer si tu veux qu'il n'ait vraiment aucune préférence au départ. **Non vérifié** : l'enchaînement des scènes d'intro quand plusieurs clients arrivent d'un coup (une par seconde de jeu, hors combat).

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

## 6. Décisions du 3 nov. 2026 (réponses du game designer)
2. Mode Auto : débloqué au **rang d'arène atteint après 10 ennemis vaincus** (lot 2). 3. **Power = 10 × somme des niveaux des héros** ; prix de l'offre de mise à niveau : à proposer au lot 2. 4. La progression distribue le contenu : **une nouveauté à chaque marche** ; marches inconnues dans la Sheet (`~boutique_progression`, 4 marches sans rien : 11 à 14).
