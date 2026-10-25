# Mécaniques à coder

> Fichier généré par le Card Builder le 25/10/2026 23:24:23.
> Réécrit entièrement à chaque « Appliquer au jeu » — ne pas l'éditer à la main.

2 mécanique(s) inventée(s) dans le builder attendent d'être implémentées.
Tant qu'elles ne le sont pas, le jeu les affiche mais écrit « pas encore codée » dans le journal de combat.

---

## `doubler_un_effet` — Doubler un effet

**Type** : mot-clé porté par une unité (`keys`)

**Ce qu'elle doit faire**

Double un trigger (cri de guerre, râle d'agonie, effet de fin de tour, de début de tour, trigger de pioche, d'attaque...)

**Utilisée par** : aucune carte pour l'instant.

**Où la coder**

1. `game/src/config/mechanics.js` → ajouter `doubler_un_effet` dans `KEYWORDS` avec `implemented: true`.
2. `game/src/combat/engine.js` → gérer le comportement (voir `Taunt` dans `attackableTargets`, `Venin` dans `damageUnit`, `Charge` dans `makeUnit`).
3. Retirer l'entrée de `customMechanics` dans `game/data/characters.data.js` (ou passer `implemented: true`).

---

## `choisir_dans_le_deck_ou_le_cimetiere` — Choisir dans le deck ou le cimetière

**Type** : effet jouable (`play`)

**Ce qu'elle doit faire**

Permet de sélectionner une carte dans le deck ou dans le cimetière (Prenez une carte de votre cimetière pour la mettre sur le terrain ou prenez une carte de votre deck pour la mettre dans votre main, ou l'un ou l'autre)

**Utilisée par** : aucune carte pour l'instant.

**Où la coder**

1. `game/src/config/mechanics.js` → ajouter `choisir_dans_le_deck_ou_le_cimetiere` dans `EFFECTS` avec ses params et `implemented: true`.
2. `game/src/combat/engine.js` → ajouter `case 'choisir_dans_le_deck_ou_le_cimetiere':` dans `applyEffects`.
3. `game/src/combat/ai.js` → si l'effet doit peser dans les décisions du bot, l'ajouter aux heuristiques.
4. Retirer l'entrée de `customMechanics` dans `game/data/characters.data.js` (ou passer `implemented: true`).

