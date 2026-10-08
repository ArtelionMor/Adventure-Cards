# docs/ — la conception (à lire, pas à explorer)

| Fichier | Contenu | Quand le lire |
|---|---|---|
| `GDD.md` | **Le game design doc** : piliers, boucle de jeu, deckbuilding, monnaies, combat, architecture idle, art. Les 2 seuls points ⚠ NON DÉCIDÉ y sont marqués. | Avant tout travail sur le jeu |
| `V3-HEROS.md` | Les six héros V3 : cartes, paliers, mécaniques à coder, **ordre de codage**, ce qui est ✅ codé. Garde les décisions du game designer. | Avant de toucher à Reprise, Charogne, Appât, Pistage, Toxine, Ex-libris, Registre |
| `GRAMMAIRE-DES-PALIERS.md` | Comment écrire les paliers d'une carte pour qu'une montée de niveau se sente. | Avant de toucher aux `tiers` d'une carte |
| `MECANIQUES-A-CODER.md` | **Généré par le Card Builder** (ne pas éditer à la main) : les mécaniques inventées, leurs cartes, où les coder. | Quand on te demande de coder une mécanique |
| `VFX-CARTES.md` | **Proposition de VFX carte par carte** (briques communes + signature par héros), avec les pictogrammes Kenney à utiliser. Rien n'est codé. | Avant de coder un effet visuel de carte |
| `SITUATIONS-A-TESTER.md` | Le texte des fiches du banc de situations (mêmes `id` que `game/data/situations.js`). | Avant de toucher au banc de situations |

---

# Le détail

## Les paliers de niveau
**`docs/GRAMMAIRE-DES-PALIERS.md`** — comment écrire les paliers d'une carte pour qu'une montée
de niveau **se sente** : cinq sortes (Éveil, Verbe, Pivot, Sommet), le chiffre accompagne le
verbe, aucun niveau muet de 2 à 20, jamais plus de 3 cartes qui changent au même niveau. À lire
avant de toucher aux `tiers` d'une carte, et **à relancer avant/après** :
`node scripts/audit-paliers.mjs [--hero a,b] [--json] [--strict]` (ne joue aucune partie : il
mesure la part de verbes, les niveaux muets, les coûts morts, les paliers par défaut recopiés).

⚠ **Une garde (`card.gardes[slot]`) n'a de sens que sur un événement qui a un sujet** (jouer un
allié, attaquer, recevoir du renfort). « Quand tu perds une unité » n'en a pas : une garde de type
y bloque le moment **pour toujours**, sans un mot. `validate.js` le signale en erreur bloquante.

⚠ **Un déclencheur qui se nourrit lui-même explose** quand le plateau n'a pas de plafond
(`boardSize` à 0) : « quand tu perds une unité, invoque un 1/1 » + une aura adverse −0/−1 = chaque
invocation meurt et en invoque une autre, et avec deux invocations par mort le plateau double à
chaque étage. Pas d'aura négative sur les PV adverses, pas de double invocation sur ce déclencheur.
