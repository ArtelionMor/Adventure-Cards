# Mécaniques à coder

> Fichier généré le 11/10/2026 02:30:34 par `scripts/gen-heros-v3.mjs`, au format du Card Builder.
> Réécrit entièrement à chaque « Appliquer au jeu » — ne pas l'éditer à la main.

4 mécanique(s) inventée(s) dans le builder attendent d'être implémentées.
Tant qu'elles ne le sont pas, le jeu les affiche mais écrit « pas encore codée » dans le journal de combat.

> **Les six héros V3** (`docs/V3-HEROS.md`) portent toutes les mécaniques ci-dessous (Charogne, Appât, Pistage et Toxine, eux, sont codés). Le reste de leur vocabulaire — moments `typeNouveau` et `registre`, compteur `typesRegistre`, filtre `typeDuRegistre` — est déjà déclaré dans `game/src/config/mechanics.js` avec `implemented: false` : il est inerte, et la validation dit « pas encore codé » sur chaque carte qui s'en sert.

---

## `enregistre` — Le Registre enregistre une carte

**Type** : effet jouable (`play`)

**Ce qu'elle doit faire**

Le Registre enregistre N cartes AU HASARD de ta main, sans les jouer (elles restent en main). Un type déjà présent ne compte pas deux fois ; une carte « Type : tous » compte pour +1. Détail : docs/V3-HEROS.md, 4.6.

**Paramètres**

- `n` (number) — Cartes enregistrées · défaut `1`

**Utilisée par** : 

- Pastiche · « Greffier » (base, slot 1)
- Pastiche · « Greffier » (base, slot 1) — palier 7
- Pastiche · « Copiste » (switch, slot 1)
- Pastiche · « Copiste » (switch, slot 1) — palier 13

**Où la coder**

1. `game/src/config/mechanics.js` → ajouter `enregistre` dans `EFFECTS` avec ses params et `implemented: true`.
2. `game/src/combat/engine.js` → ajouter `case 'enregistre':` dans `applyEffects`.
3. `game/src/combat/ai.js` → si l'effet doit peser dans les décisions du bot, l'ajouter aux heuristiques.
4. Retirer l'entrée de `customMechanics` dans `game/data/characters.data.js` (ou passer `implemented: true`).

---

## `donne_type_du_registre` — Reçoit un type du Registre

**Type** : effet jouable (`play`)

**Ce qu'elle doit faire**

La cible reçoit un type du Registre tiré au hasard (« un »), ou chacun de ses types (« tous »). Un type reçu compte comme un type imprimé. Détail : docs/V3-HEROS.md, 4.6.

**Paramètres**

- `t` (target) — Qui reçoit · défaut `self`
- `quoi` (choice) — Combien de types · défaut `un`

**Utilisée par** : 

- Pastiche · « Bibliothécaire » (base, slot 2)
- Pastiche · « Bibliothécaire » (base, slot 2) — palier 8
- Pastiche · « Grand Registre » (base, slot 5)
- Pastiche · « Grand Registre » (base, slot 5) — palier 15
- Pastiche · « Mimétisme » (switch, slot 2)
- Pastiche · « Mimétisme » (switch, slot 2) — palier 12

**Où la coder**

1. `game/src/config/mechanics.js` → ajouter `donne_type_du_registre` dans `EFFECTS` avec ses params et `implemented: true`.
2. `game/src/combat/engine.js` → ajouter `case 'donne_type_du_registre':` dans `applyEffects`.
3. `game/src/combat/ai.js` → si l'effet doit peser dans les décisions du bot, l'ajouter aux heuristiques.
4. Retirer l'entrée de `customMechanics` dans `game/data/characters.data.js` (ou passer `implemented: true`).

---

## `relance_registre` — Relance des cartes du Registre

**Type** : effet jouable (`play`)

**Ce qu'elle doit faire**

Relance GRATUITEMENT des cartes du Registre, avec `autoTarget` : « par type » = pour chaque type nommé du Registre, une carte de ce type tirée au hasard (Rétrospective) ; « hasard » = N cartes du Registre au hasard. Une carte relancée n’est ni mise en défausse ni exilée (c’est une copie), mais entre au Registre. Une relance n’en relance JAMAIS une autre (règle lisible, pas un plafond). Les cartes sont lues avec le niveau de leur propriétaire. Détail : docs/V3-HEROS.md, 4.6.

**Paramètres**

- `mode` (choice) — Quelles cartes · défaut `parType`
- `n` (number) — Combien (mode « au hasard ») · défaut `1`

**Utilisée par** : 

- Pastiche · « Grand Registre » (base, slot 5)
- Pastiche · « Grand Registre » (base, slot 5) — palier 19
- Pastiche · « Rétrospective » (switch, slot 5)
- Pastiche · « Rétrospective » (switch, slot 5) — palier 15

**Où la coder**

1. `game/src/config/mechanics.js` → ajouter `relance_registre` dans `EFFECTS` avec ses params et `implemented: true`.
2. `game/src/combat/engine.js` → ajouter `case 'relance_registre':` dans `applyEffects`.
3. `game/src/combat/ai.js` → si l'effet doit peser dans les décisions du bot, l'ajouter aux heuristiques.
4. Retirer l'entrée de `customMechanics` dans `game/data/characters.data.js` (ou passer `implemented: true`).

---

## `cree_du_registre` — Crée une carte d’un type du Registre

**Type** : effet jouable (`play`)

**Ce qu'elle doit faire**

Crée en main N cartes au hasard parmi les cartes du catalogue qui portent un type du Registre. Détail : docs/V3-HEROS.md, 2.6 (Index du Registre, niveau 16).

**Paramètres**

- `n` (number) — Cartes créées · défaut `1`
- `lvl` (number) — Niveau de la carte · défaut `1`

**Utilisée par** : 

- Pastiche · « Index du Registre » (switch, slot 4)
- Pastiche · « Index du Registre » (switch, slot 4) — palier 16

**Où la coder**

1. `game/src/config/mechanics.js` → ajouter `cree_du_registre` dans `EFFECTS` avec ses params et `implemented: true`.
2. `game/src/combat/engine.js` → ajouter `case 'cree_du_registre':` dans `applyEffects`.
3. `game/src/combat/ai.js` → si l'effet doit peser dans les décisions du bot, l'ajouter aux heuristiques.
4. Retirer l'entrée de `customMechanics` dans `game/data/characters.data.js` (ou passer `implemented: true`).

