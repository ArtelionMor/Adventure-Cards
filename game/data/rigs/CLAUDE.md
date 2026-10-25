# game/data/rigs/ — les personnages animés

> Un dossier par personnage (`<id>/`, minuscules, chiffres, `-`, `_`). Format : **`docs/ANIMATION_FORMAT.md`**.
> Écrit par l'Atelier (`builder/rig.html`, route `POST /api/rig`) et par les scripts `scripts/rig-*.mjs`.

| Fichier (dans `<id>/`) | Qui l'écrit | Contenu |
|---|---|---|
| `source.png` | l'Atelier, à la création | l'image d'origine, copiée de `Graphical Assets/…` (chemin dans `rig.json` → `source.origine`) ; **jamais modifiée** |
| `rig.json` | **le game designer** (Atelier) ; `scripts/rig-maille.mjs` | os, calques, maillages et poids |
| `clips.json` | **Claude**, à la main | les animations ; l'Atelier le relit tout seul quand il change |
| `calques/<calque>.png` | l'Atelier (✂ Calques) ou `scripts/rig-decoupe.mjs` | un calque découpé, **recadré** sur sa matière (sa place : `x`, `y` du calque) |
| `masques/<calque>-<zone>.png` | idem | le masque d'une zone à combler (blanc = le trou laissé par une extraction) |

| Personnage | Image | Os | Clips |
|---|---|---|---|
| `crapaud` | `Characters/Frog/Frog Toad.png` (2000 px) | `sol` (le bas, pattes plantées), `corps`, `tete`, `ventre` — **provisoires**, posés par Claude le 23 oct. 2026, à corriger dans l'Atelier | `idle` (8 s) |
| `lapin-bagarreur` | `Cards/Lapin Bagarreur.png` (1024 px) | **le bipède type** (13 os) : `sol`, `bassin` → `torse` → `tete` → `oreille_g`/`_b`, `oreille_d`/`_b` ; `bras_g`, `bras_d`, `jambe_g`, `jambe_d`, `queue` — provisoires (Claude, 23 oct.) | `idle` (4,8 s : garde de boxeur) |
| `chiot-de-garde` | `Cards/Chiot de Garde.png` (1024 px) | **le quadrupède type, assis** (16 os) : `sol`, `bassin` → `dos` → `cou` → `tete` → `oreille_g`, `oreille_d`, `oeil_g`, `oeil_d` ; `patte_av_g`/`_d` (du dos), `patte_ar_g`/`_d` (du bassin), `bouclier`, `epee`, `cape` (du dos) — provisoires. **Découpé en 6 calques** (23 oct. 2026, par Claude, `scripts/rig-decoupe.mjs`) : `corps` (maillé), `tete` (maillée : cou, tête, oreilles), `oeil_g`, `oeil_d` (rigides, `etirementLibre` : ils clignent), `epee`, `bouclier` (rigides). 5 zones **comblées provisoirement** (à repeindre à l'inpainting ; la plus visible est sous la tête, `corps/z3`). | `idle` (9 s : de garde, la tête qui se penche, le clignement) |

**335 autres personnages** (un par sprite de `Characters/` et de `Cards/`, 26 oct. 2026 ; id = nom du fichier sans accents) ont un **squelette type non posé** (`scripts/rig-squelettes-types.mjs`, 25 oct. 2026) : les os ont les bons noms et la bonne hiérarchie mais sont placés à la louche, sans maillage ni clip ; le game designer les place dans l'Atelier.

Les noms d'os types et ce qu'une image seule peut bouger : `docs/ANIMATION_FORMAT.md` (2.1, 2.2).

⚠ Renommer un os dans l'Atelier ne renomme pas les clips qui le citent : `node scripts/rig-valide.mjs <id>` le dit (`os-inconnu`).
⚠ Après avoir déplacé des os à la main dans `rig.json`, refaire les poids : `node scripts/rig-maille.mjs <id> --poids-seuls`.
