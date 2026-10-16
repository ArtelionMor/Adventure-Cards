# docs/ — la conception (à lire, pas à explorer)

| Fichier | Contenu | Quand le lire |
|---|---|---|
| `GDD.md` | **Le game design doc** : piliers, boucle de jeu, deckbuilding, monnaies, combat, architecture idle, art. Les 2 seuls points ⚠ NON DÉCIDÉ y sont marqués, et une section ⚠ EN RÉFLEXION (taille du deck, places d'équipe, mana de départ, choix guidé de l'équipe, 16 oct. 2026). | Avant tout travail sur le jeu |
| `V3-HEROS.md` | Les six héros V3 : cartes, paliers, mécaniques à coder, **ordre de codage**, ce qui est ✅ codé. Garde les décisions du game designer. **Les 60 cartes sont dans `characters.data.js`** (`scripts/gen-heros-v3.mjs`, 10 octobre 2026), **Tout est codé** (Charogne, Appât, Pistage, Toxine, Ex-libris et le Registre, du 10 au 12 octobre) : les six héros jouent en entier (section « 5 bis »). | Avant de toucher à Reprise, Charogne, Appât, Pistage, Toxine, Ex-libris, Registre |
| `CARTES-ADVERSAIRES.md` | **Les 44 cartes des adversaires** (16 oct. 2026, ids `adv_…`, cartes libres) : l'identité mécanique de chaque adversaire d'arène, ses cartes, les mécaniques employées, ce qui reste ouvert. Proposées, pas validées. Source : `scripts/lib/cartes-adversaires.mjs`. | Avant de toucher au deck d'un adversaire |
| `GRAMMAIRE-DES-PALIERS.md` | Comment écrire les paliers d'une carte pour qu'une montée de niveau se sente. | Avant de toucher aux `tiers` d'une carte |
| `MECANIQUES-A-CODER.md` | **Généré par le Card Builder** (ne pas éditer à la main) : les mécaniques inventées, leurs cartes, où les coder. | Quand on te demande de coder une mécanique |
| `VFX-CARTES.md` | **Les VFX des cartes** : le modèle (une animation par moment), la famille visuelle de chaque héros, les règles du banc `test-vfx.mjs`, puis l'intention carte par carte. **Codé** dans `game/src/ui/vfx.js` : 180 signatures uniques (les 120 de la V1/V2 + les 60 de la V3), 71 briques. | Avant de toucher à l'animation d'une carte, ou après avoir ajouté une carte |
| `PACKS-CARTE.md` | **Le choix du pack d'assets de la carte** (palier 7 de la refonte overworld, 16 oct. 2026) : candidats, licences CC0 vérifiées, attribution, captures, recommandation. Le prototype : `game/carte-packs.html`. **Décidé : B+ (Medieval RTS + contours juice)**. | Avant de toucher au rendu du sol ou du décor de la carte |
| `PROMPTS-IMAGES-CARTES.md` | **Généré** (`python scripts/gen-art.py --liste <export> --prompts docs/PROMPTS-IMAGES-CARTES.md`) : pour chacune des 210 cartes, le prompt d'image à copier-coller dans Gemini, le nom du fichier et les portraits à joindre. Source : `scripts/art-sujets.json` (ne pas éditer ce fichier-ci). | Pour dessiner l'image d'une carte |
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
