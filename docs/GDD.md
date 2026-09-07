# Adventure Card — Game Design Doc

Idle RPG mobile (F2P) avec exploration overworld et combats de cartes. Nom de travail : **Adventure Card**. Univers narratif pas encore posé — sera construit au fur et à mesure, ce n'est pas bloquant.

Roadmap technique : prototype **PWA** d'abord (pour valider la boucle), portage **Godot ou Unity** ensuite pour le produit final.

Convention de ce doc : tout est décidé sauf les 2 points marqués **⚠ NON DÉCIDÉ**.
Les sections marquées **✅ implémenté** existent et tournent dans le prototype ; les autres sont de la conception pas encore codée.

## État du prototype (31/08/2026)

Le prototype est jouable de bout en bout : `AdventureCard.exe` à la racine ouvre le jeu dans une fenêtre au format téléphone.

| Brique | État |
|---|---|
| Overworld déplaçable, points d'intérêt, barrières à niveau requis | ✅ jouable |
| Combat de cartes, mode auto + mode manuel | ✅ jouable |
| 6 personnages × (5 cartes + 5 switch) | ✅ jouable |
| Ferme : parcelles, étale, vente 15 min, gains hors-ligne | ✅ jouable |
| Monnaies A/B/C, relics, sauvegarde locale, Wake Lock | ✅ jouable |
| **Card Builder** (outil de game design) | ✅ utilisable — voir plus bas |
| Tutoriel réel, son, DA, monétisation | pas commencé |

**Ce qui se tune** vit dans `game/src/config/` (coûts, timers, cadence de déblocage, monde, ferme, relics) et **les cartes** dans `game/data/characters.data.js`, écrit par le Card Builder. Trois bancs d'essai : `scripts/simulate.mjs` (courbe de difficulté), `scripts/test-triggers.mjs` (moteur), `scripts/test-ai.mjs` (bot).

## Piliers

- **Idle d'abord** : le joueur doit pouvoir poser son téléphone et regarder, ou revenir plus tard récupérer ses gains. Le combat manuel est une option, pas un prérequis.
- **La stratégie vit dans le deckbuilding** : le choix des personnages et de leur config de cartes porte la profondeur du jeu, pas la manipulation en combat.
- **Personnage = exploration + combat** : chaque personnage influence à la fois ses stats de combat et ses capacités en overworld.
- **Lisibilité économique** : une activité = une monnaie = un usage.

## Boucle de jeu

Overworld (explorer) → Combat (s'affronter, auto ou manuel) → Base/Ferme (farmer) → Meta (dépenser les monnaies : persos, cartes switch, upgrades) → retour à l'overworld, qui a changé.

## Overworld ✅ implémenté

Vue du dessus, 2D, façon **Don't Starve**. Rencontres d'ennemis, PNJ, marchands exclusifs, téléporteurs à débloquer. Structure de campagne façon **AFK Journey**.

- Le monde complet est construit **dès le prototype** (pas de version "couloir" réduite).
- Les chemins sont **verrouillés par un niveau de personnage requis** pour rythmer la progression.
- Des objets à passifs façon **relics de Slay the Spire** sont trouvés en explorant l'overworld — pas des cartes, pas une monnaie.
- Des légumes (monnaie C) peuvent être cachés dans des coffres en overworld pour pousser à l'exploration.

*Réserve du prototype* : le niveau requis est appliqué sur les rencontres elles-mêmes, ce qui est le vrai verrou. Les barrières visuelles posées en travers des chemins se contournent encore en passant par les zones ouvertes — à durcir quand le level design du monde sera fait pour de bon.

## Deckbuilding & personnages ✅ implémenté

- Un deck = **3 personnages**, chacun avec **5 cartes** fixes en nombre → **15 cartes** mélangées dans un **paquet unique** en combat (façon **Slay the Spire**, pas de paquets séparés par personnage).
- Le nombre de personnages **équipables en même temps** est lui-même une progression : **1 → 2 → 3**, débloquée via un progression path alimenté par la monnaie C (voir Monnaies).
- Les **3 premiers personnages** sont distribués pendant le **tutoriel** ; le joueur ne peut au tout début en équiper qu'un seul à la fois.
- Chaque slot de carte peut être remplacé par une **carte switch** (1 alternative par slot → 5 switch possibles par personnage). Objectif de design : chaque switch montre une autre facette de la mécanique de jeu de cartes propre à ce personnage. Une fois la switch achetée (monnaie B), le joueur bascule librement entre les deux faces.
- Un personnage peut être **amélioré** (monnaie C) : l'upgrade modifie la puissance de ses cartes via des **paliers de niveau cumulatifs** (voir Anatomie de carte). Le niveau d'un personnage vient **uniquement** de la monnaie C dépensée — il n'y a pas d'XP de combat.
- Les stats d'un personnage jouent sur deux plans (brainstorm volontairement ouvert, liste non figée) :
  - Combat : PV, mana max, nombre de cartes en main au début du combat.
  - Général (façon hyper-casual) : vitesse, nombre de personnages équipables (1→2→3), nombre de plants simultanés à la Ferme, nombre de plantes vendables en même temps... débloqués via le progression path (monnaie C).
- **Déblocage d'un personnage** : la monnaie A est distribuée en explorant l'overworld. Elle débloque l'**option d'acheter** un personnage une fois son boss vaincu (le boss gate l'éligibilité, la monnaie A gate l'achat effectif). Le joueur peut **économiser** sa monnaie A plutôt que de la dépenser sur un perso dont le style ne lui plaît pas, pour débloquer instantanément un futur perso préféré sans le re-grind.
- **Cadence de déblocage des personnages** (nombre de nouveaux persos disponibles) : 6 le jour 1, puis 4, 3, 2, 1/jour, puis 1 tous les 2 jours — gérée via une game config par le game designer (l'utilisateur).

## Anatomie de carte ✅ implémenté

Confirmé par mockups (`Carte Mockup.png` / `Carte Mockup-1.png`, placeholders — DA définitive pas encore faite) :

- Portrait du personnage + pastille "Level N" = niveau du **personnage propriétaire** de la carte (pas de la carte isolément).
- Coût en mana (encart en haut à droite).
- Type de carte via tag coloré : **Ally** (stats attaque/vie) ou **Spell** (effet à texte) — d'autres types possibles, non confirmés.
- Ligne de stats/effet de base.
- **Paliers de niveau verrouillés** ("Unlock at level X") : **cumulatifs**. Niveaux de référence repris des mockups : 2/5/10 pour un Ally, 3/6/11 pour un Spell — les valeurs exactes des mockups fournis étaient fausses et ont été refaites.

### Les moments où une carte agit

Une carte ne fait pas qu'une chose au moment où on la pose. Elle porte des effets sur plusieurs **moments** :

| Moment | Quand | Sur quoi |
|---|---|---|
| **À la pose** | la carte est jouée | allié (cri de guerre) ou sort |
| **Râle d'agonie** | l'unité meurt, quelle qu'en soit la cause | allié |
| **Début de ton tour** | chaque tour, après la pioche | allié |
| **Fin de ton tour** | chaque tour, avant de passer la main | allié |
| **Aura** | en continu tant qu'elle est en jeu | allié |

L'aura n'est pas un effet mais un **modificateur** (± attaque, ± vie, mot-clé offert) porté sur *tes autres alliés* ou sur *les unités adverses*, retiré dès que l'unité quitte le plateau. Les valeurs négatives permettent des auras de debuff.

N'importe quel effet fonctionne sur n'importe quel moment. Un **palier de niveau** peut aussi débloquer un moment entier : « niveau 5 : gagne un râle d'agonie », « niveau 8 : gagne une aura +1 attaque » (les paliers d'aura se cumulent).

### Les cibles

Désignées par le joueur : une cible adverse (unité ou héros), une unité adverse, un de tes alliés.
Automatiques — donc utilisables sur un râle d'agonie ou un déclencheur de tour, où personne n'est là pour choisir : le héros adverse, ton héros, toutes les unités adverses, tous tes alliés, **un ennemi au hasard**, **une unité adverse au hasard**, **un allié ou ton héros au hasard**, **un de tes alliés au hasard**, et **elle-même** (réservée aux alliés : un sort n'est « lui-même » de rien).

Les dégâts acceptent aussi les cibles alliées : se blesser soi-même est un coût de carte assumé.

## Card Builder ✅ implémenté

Outil de game design servi à `/builder/index.html`, sur le modèle du builder de build de Teliau's Toolbelt. C'est là que se créent les personnages, leurs 5 cartes et la carte switch de chaque slot — plus aucune carte n'est écrite dans le code.

- « Appliquer au jeu » réécrit `game/data/characters.data.js` : recharger le jeu suffit.
- Un panneau « À vérifier » signale les cartes incohérentes : palier qui ne fait rien sur sa carte, mot-clé posé sur un sort, cible impossible, mécanique manquante.
- **Mécanique qui n'existe pas encore** : elle se crée dans le builder avec sa description, et part dans `docs/MECANIQUES-A-CODER.md` avec la liste des cartes qui l'utilisent et l'endroit où la coder. En attendant, le jeu affiche la carte mais écrit « pas encore codée » dans le journal de combat, et le simulateur la signale — **rien ne fait semblant de marcher**.

## Monnaies & progression ✅ implémenté

Principe directeur : une activité → une monnaie → un usage. Les monnaies ne s'affichent **pas** en permanence dans une barre — elles vivent dans l'inventaire et remontent seulement de façon contextuelle (ex. "5/16 needed to unlock this"). Nombre total de monnaies volontairement laissé flexible.

| Monnaie | Collecte | Usage |
|---|---|---|
| **A** (Fanions) | Distribuée en explorant l'overworld | Débloque l'achat d'un personnage une fois son boss vaincu ; économisable pour débloquer instantanément un futur perso préféré |
| **B** (Sceaux) | ⚠ NON DÉCIDÉ — "butin de combat" n'était qu'une proposition de Claude, jamais confirmée. Le prototype l'implémente ainsi **à titre de test jouable**, ça ne vaut pas décision | Débloque une carte switch pour un personnage (ça, c'est décidé) |
| **C (shards/légumes)** | Mini-jeu de Ferme : planter des plants, les vendre à l'étale. Une vente arrive toutes les 15 min et achète ce qui est en vente (prix ∝ rareté). Légumes cachables dans des coffres en overworld | Améliore la puissance d'un personnage (paliers cumulatifs) **et** alimente le progression path de stats générales (mana max, PV, slots équipables 1→2→3, slots de Ferme...) |
| **Monnaie dure** | ⚠ NON DÉCIDÉ — pure proposition de Claude, jamais engagée | Accélération, cosmétique... (spéculatif) |

## Combat ✅ implémenté

**Règles du prototype** : mana qui monte de 1 par tour jusqu'au plafond du personnage, 5 emplacements d'unités par camp, main plafonnée à 8 cartes. **La défausse n'est jamais remélangée** : une carte tirée ne revient pas. Quand la pioche est vide, on tire à la place une carte au hasard dans la **pile de fatigue** — une liste unique, éditée dans le Card Builder, qui ne s'épuise pas. C'est elle qui rend un deck de 5 cartes jouable quand le joueur n'a encore qu'un personnage équipé, sans faire du deck épais une simple jauge de survie. Pile laissée vide : on ne pioche plus du tout, et quand plus personne ne peut jouer c'est le plus de PV qui l'emporte.

**Mots-clés** : Provocation (doit être attaquée en premier), Charge (attaque dès son arrivée), Venin (détruit toute unité qu'elle blesse), Bouclier (absorbe la première perte de PV).

**Mode auto** : un bot joue le deck de 15 cartes. Les cartes doivent rester évaluables simplement. Priorité de décision du bot :
1. Chercher la victoire immédiate si possible.
2. Sinon, se développer.
3. Sinon, freiner la progression de l'adversaire.
4. Sinon, jouer une carte au hasard.

Le bot va donc régulièrement mal jouer — **c'est voulu**, ça laisse une vraie marge de progression au joueur manuel. Il conserve 12 % de coups pris au hasard.

À l'intérieur de ces priorités, il choisit par **valeur** et non par coût en mana : un râle d'agonie compte parce qu'il part même si l'unité meurt, une aura compte pour ce qu'elle multiplie, un déclencheur de tour compte plusieurs fois. Côté cible, il coupe les auras adverses en priorité et évite d'offrir un gros râle à l'adversaire. Une mécanique pas encore codée vaut zéro : il ne surestime pas une carte qui ne fait rien.

**Mode manuel** : le joueur engagé reprend la main sur les combats difficiles. Même aux commandes, le joueur doit pouvoir être **arrêté par la difficulté** — il y aura toujours un palier qu'il ne peut pas franchir sans revenir progresser (deck, niveaux) d'abord. Vérifié en simulation : le Grand Méchant Loup, le Capitaine Grenouille et le Grand-Duc sont infranchissables tant que l'équipe n'a pas grandi.

## Architecture idle ✅ implémenté

Deux régimes :

- **Foreground (spectacle)** : le joueur laisse l'app ouverte et l'écran allumé (façon Clash of Critters). Faisable en PWA via la **Screen Wake Lock API** (`navigator.wakeLock.request('screen')`), bien supportée (Chrome/Android, Safari iOS 16.4+), tant que l'onglet reste actif au premier plan. Il faut ré-acquérir le verrou quand l'onglet regagne la visibilité.
- **Background / app fermée** : pas de simulation temps réel fiable en PWA (throttling/suspension OS, surtout iOS). On calcule un **offline earning** classique à partir d'un timestamp de sortie et d'une formule appliquée au retour. Plafonné à 12 h dans le prototype.

## Art & animation

- Overworld en vue du dessus, 2D, façon Don't Starve.
- Anim des personnages : contrainte économique de prod façon "Chainsaw Juiceking" (limiter le nombre de persos × modes d'animation à produire), pas un vrai flip book/stop-motion.
- **Contrat d'animation par personnage** : `idle`, `marche`, `surpris`, `en colère`, `décidé`, `effrayé`, `content`. Les personnages **ne s'affrontent pas visuellement en combat** — pas d'animations d'attaque, le combat se résout via l'UI de cartes.
- Mockups de cartes actuels = placeholders (mascotte chien pastel). DA définitive pas encore faite, l'utilisateur va s'en occuper.
- *Prototype* : l'overworld est rendu en formes géométriques et les sprites existants servent de placeholders. Aucune direction artistique n'y est engagée.

## Monétisation

Reportée volontairement — pas nécessaire pour la phase de prototype actuelle.

## Points vraiment non décidés

- ⚠ Collecte précise de la monnaie B (le "butin de combat" n'est qu'une hypothèse non confirmée — le prototype la teste, ça ne la valide pas).
- ⚠ Existence/usage d'une monnaie dure F2P (pure spéculation, jamais engagée).

## Prochains chantiers possibles

Aucun n'est engagé — c'est une liste d'options, pas un plan.

- Un vrai tutoriel (les 3 persos distribués, le premier combat guidé) — aujourd'hui c'est une simple modale.
- Durcir le level design de l'overworld pour que les barrières de niveau ne se contournent plus.
- Écrire les cartes des 6 personnages pour de bon dans le Card Builder, maintenant que les moments et les cibles existent.
- Équilibrage : les valeurs actuelles rendent la boucle jouable, elles ne sont pas justes.
- Son, direction artistique, monétisation.

Tout le reste dans ce document est une décision actée par le game designer (l'utilisateur) au 31/08/2026.
