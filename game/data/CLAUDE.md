# game/data/ — les données du jeu (générées ou décrites, jamais de l'équilibrage)

> **Ne lis pas `characters.data.js` en entier** (≈ 7 900 lignes) : Grep l'id d'une carte (`"id": "…"`) ou regarde l'export de la page « Vue d'ensemble » du builder.

| Fichier | Rôle | Écrit par |
|---|---|---|
| `feuille.data.js` | **Généré** depuis la Google Sheet « Config Adventure-Cards » (onglets « animations » → `BALANCE.ui.fx`, « heroes » → statistiques des héros et adversaires, « encounters » → puissance requise des combats, via `config/feuille.js`) ; tout ce qui commence par `~` n'est pas exporté. Ne pas l'éditer à la main. ⚠ Il change les PV et le mana : il est dans l'empreinte des renforts (`git pull` partout après une synchro). | `scripts/sync-feuille.mjs` ou la page « Feuille » de l'Atelier (sur le Pi : commit puis `git pull`) |
| `characters.data.js` | **`CHARACTER_DATA`** : `characters` (héros, 5 cartes + switch, paliers), `library` (cartes libres), `npcs` (adversaires), `fatigue` (la pile), `ignores` (constats ignorés), `customMechanics` (mécaniques à coder), `starters`, `version`. | **Le Card Builder** (« Appliquer au jeu ») — et sur le Pi, c'est là qu'il écrit : vérifier `git status` là-bas avant de le modifier ici. |
| `situations.js` | Les positions du banc de situations (`SITUATIONS`, `FAMILLES`) ; les mêmes `id` que `docs/SITUATIONS-A-TESTER.md`. | À la main |
| `vignettes.js` | La liste des images qui ont une **version allégée** dans `game/vignettes/` (WebP, 512 px au plus ; même chemin, extension `.webp`) — `asset()` (`ui/shell.js`) les prend à la place des originaux. **Généré** : `python scripts/gen-vignettes.py` (lancé aussi par `gen-sprites.mjs`). | `scripts/gen-vignettes.py` |
| `sprites.js` | La liste des images de `Characters/`, `Machines/`, `Ressources/`, `UI/` et des packs `Decor/<pack>/` (`SPRITES`). **Généré** : `node scripts/gen-sprites.mjs` ou le bouton « 🔄 Actualiser les images » du builder. | `scripts/gen-sprites.mjs` |
| `adventure-card-data.json` | Un export local, **ignoré par git** (`.gitignore`). Ne pas s'en servir. | — |

## Règles
- Les **six héros V3** (`dog3`, `cat3`, `crow3`, `frog3`, `owl3`, `cameleon3`) ont été écrits par `scripts/gen-heros-v3.mjs` (comme les V2 par
  `gen-heros-v2.mjs`) ; `customMechanics` y porte 7 mécaniques **pas encore codées** (`docs/MECANIQUES-A-CODER.md`).
- Une carte ne s'écrit **jamais en dur dans le code** : on passe par le builder, qui réécrit `characters.data.js` (fins de ligne : celles du fichier).
- Avant d'éditer `characters.data.js` ailleurs que dans le builder : vérifier que le Pi n'a pas d'écriture en attente.

---

# Le détail

## Cartes libres et adversaires
Une carte n'est plus forcément dans le deck d'un personnage. `CHARACTER_DATA.library`
tient les **cartes libres** : des cartes sans deck, éditées dans le builder comme un
personnage de plus (fictif, sans statistiques ni switch — c'est ce qui permet de réutiliser
l'éditeur de carte tel quel). Elles servent aux adversaires, et un héros peut en reprendre une.

Une carte peut porter **sa propre image** (`sprite`), réglée dans l'éditeur de carte. Elle
gagne sur celle du personnage ou du PNJ qui la joue — c'est ce qui rend les cartes libres
lisibles : sans personnage dont hériter, elles n'avaient que le coffre comme repère. Sans
image propre, une carte prend celle de son porteur, comme avant.

`CHARACTER_DATA.npcs` tient les **adversaires** : statistiques, sprite, niveau des cartes,
niveau de jeu du bot (`ia`), et un deck qui **pioche dans le catalogue** — les cartes libres
*et* toutes les cartes des personnages (`cardCatalog()` dans `config/npcs.js`, le grand menu
déroulant du builder). Une ligne de deck s'écrit `{card: 'grunt1', n: 4}`.

`CHARACTER_DATA.fatigue` tient la **pile de fatigue** : les mêmes lignes de deck (avec un
`lvl` en plus), mais une seule pile **définie** pour tout le jeu (chaque camp en a sa copie en combat) — voir « Finir sa pioche »
et « Ex-libris et la pile de fatigue par camp ».

Le partage est net : `world.js` ne dit plus que **où** est la rencontre et **ce qu'elle
rapporte** ; tout ce qui est deck ou statistiques d'adversaire vient des données, donc du
builder. `ENCOUNTERS` est assemblé à partir des deux (`npcSide(id)` + les récompenses), et
garde exactement la forme qu'attendaient l'UI et les scripts. Une carte de deck introuvable
est ignorée à la résolution (le jeu ne casse pas) et signalée par la validation.
