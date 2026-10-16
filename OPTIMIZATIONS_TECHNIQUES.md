# Rapport d'Optimisations Techniques - Adventure Card

Ce document recense les pistes d'optimisation identifiées après analyse du moteur de combat, de l'IA et du système de VFX.

## 1. Intelligence Artificielle & Simulation (Monte-Carlo)
Le bot utilise une approche Monte-Carlo (MCTS) qui est extrêmement gourmande en ressources.

### 🚩 Problème : Coût du clonage d'état
La fonction `simule` appelle `cloneBattle(B)` pour chaque itération de rollout. Le clonage profond d'objets complexes en JavaScript dans une boucle de plusieurs milliers d'itérations crée une pression énorme sur le Garbage Collector (GC) et ralentit l'exécution.
- **Optimisation :** Implémenter un système de **"State Diff"** ou de **"Undo"**. Au lieu de cloner tout l'état, on enregistre les modifications et on les annule après la simulation. Alternativement, utiliser des structures de données plus légères (TypedArrays) pour l'état du combat durant les rollouts.

### 🚩 Problème : Calculs redondants de valeur
`cardValue` et `effectValue` sont appelées répétitivement pour les mêmes cartes dans des contextes quasi identiques.
- **Optimisation :** **Mémoïsation**. Mettre en cache la valeur d'une carte pour un état de plateau donné. Tant que le nombre d'unités ou les types sur le plateau ne changent pas, la valeur heuristique d'une carte reste stable.

### 🚩 Problème : Complexité de `effectValue`
Le switch-case massif dans `effectValue` est parcouru à chaque évaluation.
- **Optimisation :** Remplacer le `switch` par un **registre de fonctions** (Map d'évaluateurs). Cela permettrait un accès en O(1) à la logique de valorisation de l'effet.

---

## 2. Système de VFX (Visuels)
Le système actuel repose sur la création dynamique de milliers de `div` HTML animées via WAAPI.

### 🚩 Problème : Pollution du DOM & Layout Thrashing
Chaque "brique" (étincelle, goutte, plume) crée un nouvel élément `div` via `document.createElement('div')` puis le supprime après quelques millisecondes. Cela provoque des recalculs de style et de layout fréquents.
- **Optimisation 1 : Object Pooling.** Créer un pool d'éléments `div` pré-alloués. Au lieu de créer/détruire, on récupère un élément inactif, on change ses propriétés et on le réinjecte.
- **Optimisation 2 : Passage au Canvas 2D.** Pour les effets à haute densité (comme `nuee`, `pluie`, `etoiles`), remplacer les `div` par un rendu sur un seul `<canvas>` superposé. Dessiner 20 particules sur un canvas est infiniment plus performant que de gérer 20 nœuds DOM.

---

## 3. Moteur de Combat & Performance JS

### 🚩 Problème : Recalculs de stats (`refresh`)
Le moteur utilise un pattern `refresh()` pour recalculer les stats dérivées (atk, hp) à chaque changement pour gérer proprement les auras.
- **Optimisation :** **Lazy Evaluation**. Ne recalculer les stats que lorsqu'une valeur est réellement demandée (getter), et seulement si un "flag de saleté" (`isDirty`) indique que les auras ou les renforts ont changé.

### 🚩 Problème : Créations d'objets en boucle
Dans `decide` et `botAction`, de nombreux objets temporaires (`{ c, i, zone }`) sont créés et jetés.
- **Optimisation :** Utiliser des **objets réutilisables** ou des tuples simples pour les candidats de coups afin de réduire la fragmentation mémoire.

## Résumé des gains attendus
| Zone | Optimisation | Gain estimé | Impact utilisateur |
| :--- | :--- | :--- | :--- |
| **IA** | State Diff / Undo | $\text{+++}$ | Temps de réflexion du bot $\downarrow$ |
| **VFX** | Canvas / Pooling | $\text{++}$ | Fluidité des animations (FPS) $\uparrow$ |
| **Moteur** | Lazy Stats | $\text{+}$ | CPU global $\downarrow$ |
| **IA** | Mémoïsation | $\text{++}$ | Réactivité du jeu $\uparrow$ |
