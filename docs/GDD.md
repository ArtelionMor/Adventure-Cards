# Adventure Card — Game Design Doc

Idle RPG mobile (F2P) avec exploration overworld et combats de cartes. Nom de travail : **Adventure Card**. Univers narratif pas encore posé — sera construit au fur et à mesure, ce n'est pas bloquant.

Roadmap technique : prototype **PWA** d'abord (pour valider la boucle), portage **Godot ou Unity** ensuite pour le produit final.

Convention de ce doc : tout est décidé sauf les 2 points marqués **⚠ NON DÉCIDÉ**.

## Piliers

- **Idle d'abord** : le joueur doit pouvoir poser son téléphone et regarder, ou revenir plus tard récupérer ses gains. Le combat manuel est une option, pas un prérequis.
- **La stratégie vit dans le deckbuilding** : le choix des personnages et de leur config de cartes porte la profondeur du jeu, pas la manipulation en combat.
- **Personnage = exploration + combat** : chaque personnage influence à la fois ses stats de combat et ses capacités en overworld.
- **Lisibilité économique** : une activité = une monnaie = un usage.

## Boucle de jeu

Overworld (explorer) → Combat (s'affronter, auto ou manuel) → Base/Ferme (farmer) → Meta (dépenser les monnaies : persos, cartes switch, upgrades) → retour à l'overworld, qui a changé.

## Overworld

Vue du dessus, 2D, façon **Don't Starve**. Rencontres d'ennemis, PNJ, marchands exclusifs, téléporteurs à débloquer. Structure de campagne façon **AFK Journey**.

- Le monde complet est construit **dès le prototype** (pas de version "couloir" réduite).
- Les chemins sont **verrouillés par un niveau de personnage requis** pour rythmer la progression.
- Des objets à passifs façon **relics de Slay the Spire** sont trouvés en explorant l'overworld — pas des cartes, pas une monnaie.
- Des légumes (monnaie C) peuvent être cachés dans des coffres en overworld pour pousser à l'exploration.

## Deckbuilding & personnages

- Un deck = **3 personnages**, chacun avec **5 cartes** fixes en nombre → **15 cartes** mélangées dans un **paquet unique** en combat (façon **Slay the Spire**, pas de paquets séparés par personnage).
- Le nombre de personnages **équipables en même temps** est lui-même une progression : **1 → 2 → 3**, débloquée via un progression path alimenté par la monnaie C (voir Monnaies).
- Les **3 premiers personnages** sont distribués pendant le **tutoriel** ; le joueur ne peut au tout début en équiper qu'un seul à la fois.
- Chaque slot de carte peut être remplacé par une **carte switch** (1 alternative par slot → 5 switch possibles par personnage). Objectif de design : chaque switch montre une autre facette de la mécanique de jeu de cartes propre à ce personnage.
- Un personnage peut être **amélioré** (monnaie C) : l'upgrade modifie la puissance de ses cartes via des **paliers de niveau cumulatifs** (voir Anatomie de carte).
- Les stats d'un personnage jouent sur deux plans (brainstorm volontairement ouvert, liste non figée) :
  - Combat : PV, mana max, nombre de cartes en main au début du combat.
  - Général (façon hyper-casual) : vitesse, nombre de personnages équipables (1→2→3), nombre de plants simultanés à la Ferme, nombre de plantes vendables en même temps... débloqués via le progression path (monnaie C).
- **Déblocage d'un personnage** : la monnaie A est distribuée en explorant l'overworld. Elle débloque l'**option d'acheter** un personnage une fois son boss vaincu (le boss gate l'éligibilité, la monnaie A gate l'achat effectif). Le joueur peut **économiser** sa monnaie A plutôt que de la dépenser sur un perso dont le style ne lui plaît pas, pour débloquer instantanément un futur perso préféré sans le re-grind.
- **Cadence de déblocage des personnages** (nombre de nouveaux persos disponibles) : 6 le jour 1, puis 4, 3, 2, 1/jour, puis 1 tous les 2 jours — gérée via une game config par le game designer (l'utilisateur).

## Anatomie de carte

Confirmé par mockups (`Carte Mockup.png` / `Carte Mockup-1.png`, placeholders — DA définitive pas encore faite) :

- Portrait du personnage + pastille "Level N" = niveau du **personnage propriétaire** de la carte (pas de la carte isolément).
- Coût en mana (encart en haut à droite).
- Type de carte via tag coloré : **Ally** (stats attaque/vie) ou **Spell** (effet à texte) — d'autres types possibles, non confirmés.
- Ligne de stats/effet de base.
- **Paliers de niveau verrouillés** ("Unlock at level X") : débloquent un mot-clé/effet, un bonus de stats plat, ou une version augmentée de l'effet, **de façon cumulative** (ex. observé sur les mockups : paliers 2/5/10 pour un Ally, 3/6/11 pour un Spell — mais les valeurs exactes des mockups fournis sont fausses et seront corrigées).

## Monnaies & progression

Principe directeur : une activité → une monnaie → un usage. Les monnaies ne s'affichent **pas** en permanence dans une barre — elles vivent dans l'inventaire et remontent seulement de façon contextuelle (ex. "5/16 needed to unlock this"). Nombre total de monnaies volontairement laissé flexible.

| Monnaie | Collecte | Usage |
|---|---|---|
| **A** | Distribuée en explorant l'overworld | Débloque l'achat d'un personnage une fois son boss vaincu ; économisable pour débloquer instantanément un futur perso préféré |
| **B** | ⚠ NON DÉCIDÉ — "butin de combat" n'était qu'une proposition de Claude, jamais confirmée | Débloque une carte switch pour un personnage (ça, c'est décidé) |
| **C (shards/légumes)** | Mini-jeu de Ferme : planter des plants, les vendre à l'étale. Une vente arrive toutes les 15 min et achète ce qui est en vente (prix ∝ rareté). Légumes cachables dans des coffres en overworld | Améliore la puissance d'un personnage (paliers cumulatifs) **et** alimente le progression path de stats générales (mana max, PV, slots équipables 1→2→3, slots de Ferme...) |
| **Monnaie dure** | ⚠ NON DÉCIDÉ — pure proposition de Claude, jamais engagée | Accélération, cosmétique... (spéculatif) |

## Combat

**Mode auto** : un bot joue le deck de 15 cartes. Les cartes doivent rester évaluables simplement (dégâts, soin, buff, mots-clés type Taunt/Charge). Priorité de décision du bot :
1. Chercher la victoire immédiate si possible.
2. Sinon, se développer.
3. Sinon, freiner la progression de l'adversaire.
4. Sinon, jouer une carte au hasard.

Le bot va donc régulièrement mal jouer — **c'est voulu**, ça laisse une vraie marge de progression au joueur manuel.

**Mode manuel** : le joueur engagé reprend la main sur les combats difficiles. Même aux commandes, le joueur doit pouvoir être **arrêté par la difficulté** — il y aura toujours un palier qu'il ne peut pas franchir sans revenir progresser (deck, niveaux) d'abord.

## Architecture idle

Deux régimes :

- **Foreground (spectacle)** : le joueur laisse l'app ouverte et l'écran allumé (façon Clash of Critters). Faisable en PWA via la **Screen Wake Lock API** (`navigator.wakeLock.request('screen')`), bien supportée (Chrome/Android, Safari iOS 16.4+), tant que l'onglet reste actif au premier plan. Il faut ré-acquérir le verrou quand l'onglet regagne la visibilité.
- **Background / app fermée** : pas de simulation temps réel fiable en PWA (throttling/suspension OS, surtout iOS). On calcule un **offline earning** classique à partir d'un timestamp de sortie et d'une formule appliquée au retour.

## Art & animation

- Overworld en vue du dessus, 2D, façon Don't Starve.
- Anim des personnages : contrainte économique de prod façon "Chainsaw Juiceking" (limiter le nombre de persos × modes d'animation à produire), pas un vrai flip book/stop-motion.
- **Contrat d'animation par personnage** : `idle`, `marche`, `surpris`, `en colère`, `décidé`, `effrayé`, `content`. Les personnages **ne s'affrontent pas visuellement en combat** — pas d'animations d'attaque, le combat se résout via l'UI de cartes.
- Mockups de cartes actuels = placeholders (mascotte chien pastel). DA définitive pas encore faite, l'utilisateur va s'en occuper.

## Monétisation

Reportée volontairement — pas nécessaire pour la phase de prototype actuelle.

## Points vraiment non décidés

- ⚠ Collecte précise de la monnaie B (le "butin de combat" n'est qu'une hypothèse non confirmée).
- ⚠ Existence/usage d'une monnaie dure F2P (pure spéculation, jamais engagée).

Tout le reste dans ce document est une décision actée par le game designer (l'utilisateur) au 30/08/2026.
