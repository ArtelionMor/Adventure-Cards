# BOT-CONTEXTE — comment le bot doit penser

> Document de contexte pour fabriquer un bot plus performant (`game/src/combat/ai.js`).
> Écrit le 4 novembre 2026 par le game designer (dictée) et Claude. **Version 1.**
> À placer dans `docs/` du dépôt. Il doit suffire à **n'importe quelle IA** (pas seulement Claude) pour comprendre
> l'intention : tout y est explicite, rien ne suppose une conversation antérieure.
> Les points marqués ❓ ne sont pas tranchés : ne pas les inventer, les remonter au game designer.
> Les points marqués ⚠ sont des blocages ou des dépendances hors du bot.
>
> **Périmètre strict.** Ce document sert à **construire le bot**. Le §5 mêle deux choses : le **plan visé** de chaque
> deck (matière pour le bot) et des **vœux de retouche de cartes** (« Retour au game designer », §7). Ces vœux sont un
> **backlog du game designer** : **ne jamais les appliquer** dans une mission de bot (ni cartes, ni builder, ni
> `characters.data.js`). Si un vœu bloque le bot, le dire, ne pas le contourner.

---

## 0. En une minute

Le bot actuel suit **la même séquence pour tous les decks** (victoire immédiate → développer → retirer → attaquer) et
note de la même façon un coup au visage et un échange, quel que soit son archétype. Il ne sait pas **dans quel
matchup il est**, donc il ne sait pas **quel rôle jouer**. Les symptômes observés :

1. Les decks **Combo** ne savent pas « installer puis exécuter » (exemple : le deck de Félix, le chat).
2. Les decks **Contrôle** dépensent des PV pour infliger des dégâts au mauvais moment, au lieu de pousser un maximum
   de dégâts dans la tête de l'adversaire une fois la partie sécurisée. ❓ voir §6, situation S3.
3. Les decks **Aggro** prennent des échanges (trades) au lieu de pousser dans la tête de l'adversaire.
4. Les decks **Aggro** utilisent leurs sorts pour gérer des cartes du joueur qui ne sont pas des menaces.

**Objectif :** apprendre au bot (a) à **identifier le matchup**, (b) à **en déduire son rôle**, (c) à **jouer son plan**
(un combo s'installe puis s'exécute). Le bot doit faire **tout pour gagner**, sans tricher.

## 1. Décisions actées

- **Le `misplay` est retiré pour l'instant** (décision du 4 nov. 2026). Mettre `misplay: 0` à **tous** les niveaux de
  `BALANCE.ai.niveaux` (`naif`, `simple`, `normal`, `dur`). Garder le mécanisme dans `ai.js` (`decide()`, le tirage
  `Math.random() < jeu.misplay`) : on le remettra **si et seulement si** on constate un bot trop performant (le
  game designer en doute). C'est une mesure conservatoire, pas un abandon. Le commenter dans `balance.js`.
  Effet de bord utile : sans `misplay`, le bot devient déterministe à état égal, donc reproductible en test.
- **Pas de triche** (décision du 22 sept. 2026) : le bot n'a pas le droit de lire la **main** de l'adversaire ni
  l'**ordre de sa pioche**. Voir §4 pour ce qu'il a le droit de savoir.
- **Pas de plafond arbitraire** (« X fois par tour ») pour couper une boucle : on ferme une boucle par une **règle de
  carte lisible**. Un combo infini rare n'est pas un problème ; **un bot qui ne sait pas s'arrêter** en est un.
- **Toute valeur qui se règle vit dans `game/src/config/`** (`BALANCE.ai`), commentée en français. Jamais en dur
  dans `ai.js`.
- **On ne mesure que des trios** (3 héros ou plus) : `matchups.mjs --taille 3`. Pas de solo ni de duo.
- Le bot joue **aussi le deck du joueur en mode Auto**, pas seulement les adversaires. Les plans de ce document
  valent donc pour les deux.

## 2. Vocabulaire (le sens exact dans ce jeu)

Référence complète : `CLAUDE.md` à la racine et les trois PDF de `docs/`. L'essentiel pour le bot :

- **Archétypes :** Aggro, Contrôle, Combo. Qualificatifs : Tempo, MidRange, Turbo, Hard, Soft, Pillow Fort, Fatigue
  (déjà portés par `ARCHETYPES` / `SOUS_ARCHETYPES` dans `config/arenes.js`).
- **Ressources.** Un archétype **convertit des ressources abondantes ou secondaires** (PV, cartes en main, cartes de la
  pioche) **en ressources critiques** (mana, tempo). Le **coût réel** d'une carte dépend donc de l'archétype.
- **Tour de résolution :** le tour où le deck est censé gagner (en tuant, par étouffement/lock, ou par victoire
  alternative). Une fois ce tour **atteint ou sécurisé**, l'archétype **sacrifie toutes les ressources qui ne lui
  servent plus**.
- **Pierre-feuille-ciseaux de la méta :** l'ordre des tours de résolution dicte qui bat qui. Format classique :
  **Aggro bat Contrôle, Contrôle bat Combo, Combo bat Aggro.** C'est un **diagnostic de la méta** (ce que donnent les
  cartes), **pas un objectif de réglage du bot** : si on règle le bot jusqu'à voir le cycle, on masque les défauts des
  cartes. Le bot se juge à sa **force** (§8).
- **Volatilité :** l'écart entre la réussite et l'échec d'un deck. Un deck volatil n'est pas faible, il n'exécute
  pas son plan de façon régulière.
- **Plan / Stratégie / Tactique / Technique :** le **plan** vise un tour de résolution et une régularité ; la
  **stratégie** choisit les verbes (« mettre de la pression », « nettoyer le board »…) ; la **tactique** est la
  compréhension du matchup **en cours de partie** (c'est le sujet de ce document) ; la **technique** (ordonner ses
  déclencheurs) n'existe pas dans ce jeu.
- **Timmy / Johnny / Spike :** le jeu est principalement équilibré pour **Spike**. Le bot joue comme un Spike.

## 3. Le modèle à implémenter

Quatre couches. Les trois premières décrivent, la quatrième agit. **Ne pas réécrire `ai.js` :** on garde
`cardValue`, `unitThreat`, `meilleureAttaque`, `effectsValue` et on **règle leurs coefficients** par une posture.

### 3.1 Le plan (donnée écrite par le game designer) — **seulement pour les decks Combo**

⚠ **Annoter à la main un plan par deck ne tient pas** : les valeurs bougent, les trios sont nombreux (84 combinaisons
de 3 héros parmi 9) et la boutique laisse le joueur composer son deck librement, alors que le mode Auto doit le
jouer. **Règle : le bot déduit tout ce qui se voit sur le plateau** (horloges, rôle, menaces : §3.2) **sans
annotation.** Une annotation n'est nécessaire que pour ce que le plateau ne montre pas : **l'horloge cachée d'un deck
Combo** (le payoff est en main ou en pioche). Les rôles ci-dessous servent donc de **vérité de référence pour les
tests**, et d'amorce pour les decks Combo, pas d'entrée obligatoire pour tout deck. Voir ❓ Q1.

Un plan par **deck**, pas seulement par héros. Champs proposés, à stocker avec les données du deck (feuille de
config ou builder), lisibles par une IA :

```
plan = {
  archetype:        'Aggro' | 'Contrôle' | 'Combo',
  sousArchetype:    'Tempo' | 'MidRange' | 'Turbo' | 'Hard' | 'Soft' | 'Pillow Fort' | 'Fatigue',
  tourResolution:   nombre visé (estimation), ou null si « fatigue »,
  roles: {          // le rôle de chaque carte DANS CE DECK
    moteur:     [ids],   // pièces qu'il faut avoir en jeu avant d'exécuter (ex. Mage de l'étincelle)
    carburant:  [ids],   // cartes à NE PAS dépenser une par une (ex. Griffure)
    payoff:     [ids],   // cartes qui exécutent (ex. Neuf Vies, Retrouvailles, Tempête de Patounes)
    protection: [ids],   // ce qu'on protège ou ce qui protège (ex. Grand-Père Lapin)
    techContre: { id: 'condition' }   // cartes de matchup (ex. Volée de Corbeaux : vs petits corps)
  },
  ressourcesSecondaires: ['pv','main','pioche'],  // ce que ce deck accepte de dépenser pour gagner
}
```

Le bot doit aussi savoir **l'estimer lui-même** (§3.2) : le plan écrit donne l'intention, l'estimation donne la réalité
de cette partie.

### 3.2 La lecture du matchup (la tactique)

À chaque décision, le bot calcule :

- **Son ETA** (tour de résolution estimé de son deck, vu l'état actuel : combien de tours avant de gagner s'il
  n'est pas dérangé).
- **L'ETA adverse** (idem, vu ce que l'adversaire a montré).
- **Son rôle** : le plus rapide est le **beatdown** (il pousse), l'autre est le **contrôle** (il gagne du temps, gère,
  stabilise). Un deck Combo qui n'a pas encore installé son moteur est en **installation**.

Le rôle peut **changer en cours de partie** (un contrôle qui a stabilisé devient le beatdown : c'est exactement le
« sacrifier ce qui ne sert plus » du tour de résolution).

Conséquence voulue : quand une carte est modifiée (Neuf Vies sera nerfée), le bot **recalcule** son ETA tout seul.
Il n'y a aucun réglage codé en dur sur une carte précise (**aucun identifiant de carte dans `ai.js`**).

**Une seule fonction de lecture de position**, `lectureDePosition(B, k)` → `{ monHorloge, saHorloge, role,
stabilise }`, utilisée par les règles **et** réutilisable comme **fonction d'évaluation** pour le Monte-Carlo.
`BALANCE.ai.niveaux` note que la troncature des rollouts a échoué faute d'une « vraie fonction d'évaluation » :
c'est celle-ci. Ne pas rebrancher la troncature dans cette mission ; garder la fonction réutilisable.

**L'horloge** = nombre de tours pour amener un héros à 0 avec les dégâts qui se voient (planche prête et à venir,
cartes jouables à la main de celui qui calcule, Provocations, armure). C'est une estimation, pas une simulation.
Pour les decks Combo, l'horloge cachée vient de la recherche de séquence (§3.4).

### 3.3 La posture (les coefficients)

Une posture (`beatdown`, `controle`, `installation`, `execution`) règle, dans `BALANCE.ai.postures`, au minimum :

| Coefficient | Beatdown | Contrôle | Installation (combo) |
|---|---|---|---|
| Poids du visage vs plateau (`meilleureAttaque`) | élevé | faible tant que non stabilisé, **maximal une fois sécurisé** | faible |
| Échange (trade) accepté | seulement si retire un bloqueur qui retarde mon ETA | oui, 1 pour 1 / 1 pour 2 | seulement pour protéger le moteur |
| Prix d'un PV (ressource critique ?) | bas (ressource à convertir) | **haut avant stabilisation**, bas après | **bas** (PV = carburant du combo) |
| Retenue d'un sort de retrait | garde pour ce qui retarde mon plan | garde pour les vraies menaces | **retient le carburant** |
| Définition de « menace » | ce qui bloque ou ralentit mon horloge | ce qui menace mon PV ou mon plan adverse | ce qui peut tuer mon moteur |

Les **valeurs** sont à proposer par Claude Code puis **mesurées** (§8), pas devinées. Elles vont dans
`BALANCE.ai.postures`.

### 3.4 Le combo : installer, retenir, exécuter

Un deck Combo « met en place une situation puis exécute ». Trois états :

1. **Installer :** poser les pièces `moteur`, protéger le moteur, **ne pas dépenser le `carburant`**.
2. **Retenir :** tant que la chaîne ne gagne pas (ou ne produit pas un avantage décisif), garder les cartes.
3. **Exécuter :** quand une **séquence gagnante** existe, la jouer **d'un trait**.

Pour exécuter, **généraliser l'étape « victoire immédiate »** de `decide()` : aujourd'hui elle compte seulement les
dégâts d'unités prêtes + les cartes de brûlure à la main. Il faut une **recherche bornée de séquence gagnante dans le
tour**, sur `cloneBattle` (exploration de l'ordre des cartes et des cibles, profondeur et budget bornés dans la
config), qui trouverait par exemple : *Ombre Feutrée → Neuf Vies → toutes les Griffures → un ping de Mage par sort*.
Le Monte-Carlo actuel **ne résout pas ça** : ses rollouts sont joués par le même bot à règles, qui ne connaît pas la
combo.

## 4. Ce que le bot a le droit de savoir (sans tricher)

Proposition par défaut ❓ (Q2 : à confirmer par le game designer) :

1. **Son propre plan et son deck**, en entier.
2. **L'archétype de l'adversaire tel que le joueur le voit** : la fiche d'arène (`config/arenes.js` :
   `archetype`, `sousArchetype`, `question`, `reponse`, `punit`). C'est de la connaissance de la méta (niveau
   stratégie) : un Spike la possède.
3. **Ce qu'il observe :** cartes jouées, plateau, défausse, PV, mana, cartes piochées par l'adversaire (le nombre,
   pas le contenu).

**Interdit :** la main adverse, l'ordre de sa pioche, les cartes qu'il n'a pas jouées.

## 5. Les decks

Convention : **Plan visé** = comment le bot doit jouer le deck selon l'intention du game designer. **État actuel** =
ce que les cartes permettent réellement aujourd'hui. Tout ce qui est sous « ⚠ Retour au game designer » est un
blocage ou un travail **de cartes**, pas de bot : ne pas le « contourner » par du code de bot.

Les noms des cartes viennent de `game/data/characters.data.js` (la dictée vocale en contenait des erreurs, corrigées
ici : « Lapro » = Lapereau, « Lapin Cosso » = Lapin Costaud, « Hulot » = Hulotte, « Index » = Ex-libris de la
Chancelière, « Patoun » = Tempête de Patounes).

### 5.1 Pompon (lapin1) — Aggro simple, deck de tutoriel

- **Plan visé :** poser des lapins **peu chers** (Lapereau 1/1, Lapin des Prés 1/1, qui sont fonctionnellement la même
  carte au départ ; Lapin Voleur 2/2 et Lapin Costaud 3/3 un peu plus statés), puis finir avec **Grand-Père Lapin**
  (5 mana, 5/5, ses autres unités gagnent +1/+1). Gagner en comprenant les échanges. **Aucune logique au-delà** : le
  but du deck est de **faire découvrir des façons de jouer**. Le bot reste simple.
- **À protéger :** Grand-Père Lapin (porte l'aura). Le bot ne l'expose pas gratuitement.
- **Évolution par niveau :** Lapereau gagne Charge + un râle d'agonie qui booste un autre allié (approche
  **agressive**) ; Lapin des Prés booste les autres et se booste lui-même en fin de tour (approche de **soutien**).
  ❓ le mot dicté était « offensive » : c'est sans doute « de soutien » par opposition à « agressive ».
- ⚠ **Retour au game designer :** au niveau 6, Grand-Père Lapin gagne **Provocation** : intéressant mais **dangereux**
  pour lui (il devient la cible forcée). Le bot ne peut pas le régler seul : à arbitrer côté carte.

### 5.2 Caramel (lapin2) — Gardien, deck de tutoriel

- Sensiblement similaire à Pompon, mais défensif (Provocation, endurance, Doyenne du Clapier 3/7 qui donne +0/+2).
  Même consigne : un deck simple pour découvrir le jeu, le bot reste simple.

### 5.3 Séléné (lapin3) — Go Wide, **deck Combo de tutoriel (combo à implémenter)**

- **Intention :** un deck Combo dans le tutoriel est **très valorisant** pour le joueur : il apprend ce qu'est une
  combinaison de deux cartes qui donne un avantage très supérieur.
- **Combo pressenti :** *une carte qui pose beaucoup de petits lapins* (Portée de Lapereaux, Lapine Mère, Reine de
  Pleine Lune…) **+ une carte qui booste ces lapins et leur donne Charge**.
- ⚠ **Retour au game designer :** **la combo n'existe pas dans le deck aujourd'hui** (le game designer ne la voit
  pas). Le bot ne peut pas jouer une combo qui n'est pas dans les cartes. **Concevoir la carte-payoff d'abord**
  (boost de masse + Charge), puis renseigner le plan (moteur / carburant / payoff). Candidats existants :
  Trèfle à Quatre Feuilles (+1/+0 à toutes les unités) est le plus proche, sans Charge.

### 5.4 Médor (dog) — Aggro résilient (« surstater ses adversaires »)

- **Plan visé :** (1) **assurer la présence sur le terrain** en permanence, (2) **survivre**, (3) **encaisser
  (cash-in)** avec des effets d'aura/de buff de masse. Le deck se joue autour de **deux cartes majeures** :
  **Retrouvailles** (réanime 5 alliés de la défausse, c'est-à-dire presque toujours tous) et **Meute** (cri de guerre :
  invoque un Chiot de Garde et un Toutou enragé).
- **Tenir le board :** Chiot de Garde (à sa mort, invoque un Grand Frère 2/2) suffit souvent.
- **Cash-in :** Chien de Berger (aura +0/+1 aux alliés ; au niveau 8 aussi de l'attaque), Chef de Bataillon (cri de
  guerre : gros bonus d'attaque, devrait donner Charge).
- **Retrouvailles = carte de timing :** « attendre le bon moment pour la lancer ». Le bot la retient tant que la
  défausse ne contient pas assez d'alliés pour que ça vaille le coup, puis la joue quand le plateau est vide ou
  dominé. La valeur d'un sort de réanimation dépend du **nombre et de la qualité des alliés de la défausse**.
- ⚠ **Retour au game designer / moteur :**
  - **Bug :** le **cri de guerre de Meute ne se déclenche pas** quand elle n'est pas posée depuis la main (cas
    Retrouvailles) ; l'intention est qu'il se déclenche. Sans correction, le plan central du deck est faux.
  - Toutou enragé (2/1 Charge à 2 mana) est sous-statée : à 1 mana, selon les règles du jeu.
  - Chiot de Garde est sous-staté (devrait coûter 1, à vérifier).
  - Chef de Bataillon est plus faible que son switch (Chien de Berger) : il devrait être **beaucoup** plus puissant.
  - Clairon de la Meute est inutile tant que Retrouvailles (son switch) est aussi forte.
  - Bataillon (sort) doit devenir une **unité**, sinon Retrouvailles ne le ramène pas.
  - Prince des cabots : bon, à garder.

### 5.5 Félix (cat) — **premier deck Combo** (étincelle + Neuf Vies)

C'est l'exemple de référence. **À lire attentivement.**

- **Plan visé (combo en trois temps) :**
  1. **Installer** Mage de l'étincelle (moteur : « dès que vous lancez un sort, inflige une blessure à un
     adversaire » ; 2 → 3 → 4 dégâts aux paliers 11, 14, 17) et Ombre Feutrée (« les sorts de votre main coûtent 1
     de moins ; en pratique jouée en 3/3 par le niveau »).
  2. **Retenir** les sorts (Griffure = carburant ; **ne pas les lancer un par un**).
  3. **Exécuter :** lancer **Neuf Vies** (son coût baisse de 1 par tour joué ; elle crée autant de Griffures que de
     tours joués) puis **spammer tous les sorts** : chaque sort déclenche le Mage. Avec Ombre Feutrée, on lance
     l'intégralité des Griffures **le tour où l'on lance Neuf Vies** : combo explosive.
- **Félix accepte de perdre des PV** pour y arriver : il **ne défend pas trop**, il « prend cher », il ne joue pas
  l'armure. Ses PV sont une **ressource secondaire** convertie en tempo. (Posture `installation`, prix du PV bas.)
- **Chat de Gouttière :** crée une Griffure quand il attaque. Aujourd'hui trop fort car c'est « un paquet de
  mots-clés » (Charge + Passe-Murailles + Élusif). Cible : retirer Charge et Élusif, peut-être Passe-Murailles ;
  1 d'attaque, plus d'endurance ; petite carte versatile qui génère des sorts.
- **Après le nerf de Neuf Vies**, le win rate de Félix s'effondrera **si le bot joue comme avant**. Le bot doit donc
  lire son nouvel ETA et décider **seul** d'installer / retenir / exécuter (§3.2 et §3.4).
- ⚠ **Retour au game designer / moteur :**
  - **Mage de l'étincelle** frappe **un adversaire aléatoire** (`randomEnemyAny` : héros **ou** unités). Intention :
    **le héros adverse seulement**. Sans ça, la combo ne marche pas. À corriger côté carte ; sinon le bot n'a rien
    à exécuter.
  - Mage de l'étincelle a **Charge**, sans sens dans le design de la carte : à retirer. Le thème « Charge » ne doit
    pas être celui des chats ; leur identité devrait être **Passe-Murailles**.
  - **Tempête de Patounes** (switch du Mage : X blessures, X = sorts lancés dans la partie) est un finisher de
    Neuf Vies ; il supplante le Mage presque entièrement. Risque de redondance : à regarder.
  - **Coup de Patte** (switch de Chat de Gouttière) n'est jamais joué ; devrait être un sort de **pioche**.
    Il double Ombre Feutrée (réduction de coût) : l'un doit être le switch de l'autre, ou l'un remplace l'autre.
  - **Chat Prudent** (switch de Griffure : armure quand on lance un sort) : bonne idée mal exécutée ; devrait
    échanger un peu de vitesse contre de la **stabilité** (beaucoup plus d'armure ou autre chose). Utile en matchup
    aggro. ❓ le game designer a aussi dit que Griffure ne devrait pas être dans le deck de Félix : à clarifier.
  - **Chat Souricier** (switch de Neuf Vies, 6 mana) : jamais joué ; devrait être le switch de Chat de Gouttière.
  - **Matou Invocateur** (switch d'Ombre Feutrée) : ni Charge ni Passe-Murailles ; il donne Charge aux chats et les
    booste fortement ; devrait être le switch de **Mage de l'étincelle**, un gros finisher.

### 5.6 Corax (crow) — Aggro à base de pioche, **identité absente**

- **Intention :** deck Aggro capable de gérer, dont les corbeaux sont renforcés quand le joueur **pioche** ; le
  **payoff ultime** est d'arriver à la **fatigue** (les cartes de fatigue ont été renforcées récemment : « des
  haymakers »).
- **État :** beaucoup de pioche (Corbeau Espion, Pie Glaneuse, Grand Corbeau, Mauvais Œil…) mais **presque aucun
  payoff** : le deck n'a **pas de direction** ni de mécanique forte qui le dirige.
- **Carte de matchup :** **Volée de Corbeaux** est excellente contre les lapins et très forte contre les chiens,
  inutile ailleurs ; c'est voulu. Le bot la retient s'il n'y a pas assez de petits corps en face
  (`techContre`).
- ⚠ **Retour au game designer :**
  - **Coup de Bec** « trop bizarre » : doit être retravaillé pour faire ce qu'on attend d'un deck aggro (il ne
    combote qu'avec Corneille Gourmande et Armée aux ailes noires).
  - **Présage** « ne fait rien en tant que tel » : il mélange 10 cartes **au hasard** dans la pioche ; avec les
    cartes tribales d'autres decks (ex. Trèfle à Quatre Feuilles de Séléné, Terrier Secret), on pioche des cartes
    mortes. Le game designer préfère **Armée aux ailes noires**.
  - Il faut des **payoffs au fait de piocher**. Tant qu'ils n'existent pas, **ne pas calibrer le bot sur Corax**.

### 5.7 Bulle (frog) — Turbo Aggro, **Têtard Glouton doit être le centre**

- **Plan visé :** **Têtard Glouton** (1/1, gagne +1/+1 de plus quand il reçoit du renfort) posé **dès le tour 1**,
  **toutes les cartes renforcent le Têtard**, et le Têtard est **quasi intouchable**.
- **État :** le Têtard n'est presque jamais présent, et meurt tout de suite : Sabotage (deck souris, 1 dégât pour 1
  mana) est un **contre parfait**. Le game designer n'a jamais gagné par le Têtard (toujours avec autre chose :
  Bulle + Médor, ou des lapins).
- **Hypothèse du bot ❓ (à valider) :** si l'adversaire a montré du retrait bon marché, ne pas concentrer tous les
  renforts sur un Têtard encore fragile.
- ⚠ **Retour au game designer :**
  - Ajouter au Têtard un mot-clé qui le **force à être pioché en début de partie** (qu'il y ait toujours un
    Têtard au tour 1).
  - **Coulée de Boue** (AoE) ne devrait pas exister dans un deck Turbo Aggro ; Crapaud-Rocher ne fait pas ce que le
    deck dit.
  - **Prince Grenouille** (switch du Têtard) fait ce qu'il faut mais **à 6 mana, la partie est déjà finie**.
  - Les cartes de gestion et de buff sont plus fortes sur d'autres cibles que le Têtard : à rééquilibrer.

### 5.8 Athéna (owl) — **Hard Control** qui doit aller à la **fatigue**

- **Plan visé :** contrôle réactif, ultra oppressif (1 pour 1, 1 pour 2) ; **l'archétype Chouette doit utiliser le
  mieux les cartes de fatigue et chercher à y arriver**. Posture `controle`, sous-archétype `Fatigue`.
- **État :** il fait l'inverse. **Impératrice Nocturne** (les cartes jouées retournent dans la pioche ; cri de
  guerre qui remélange la défausse) **retarde la fatigue** ; **Chouette Érudite** est une carte de combo, pas de
  contrôle. Au moment où le deck arrive à la fatigue, il perd.
- **Principe de design de la fatigue (à respecter par le bot et par les cartes) :** tant qu'on n'est pas arrivé au
  « tour fatidique », **les cartes du deck sont plus fortes que les cartes de fatigue** ; la 1ʳᵉ carte de fatigue
  est facile à gérer, la 2ᵉ plus dure, la 3ᵉ plus dure…, jusqu'à ce qu'elles **surclassent tout**. Le remélange
  du deck est un effet pour un deck **Combo ou Aggro**, pas pour la Chouette.
- **Modèle :** **Hulotte** (owl3) avec **Ex-libris** (Chancelière) est fantastique : « faire plus de cartes comme ça ».
- ⚠ **Retour au game designer :** reconcevoir Impératrice Nocturne et Chouette Érudite autour de la fatigue.

### 5.9 Miracle (cameleon) — Support tribal, **bloqué par des bugs**

- **Bugs à corriger avant tout travail de bot :**
  - Un Caméléon qui copie une carte du terrain doit copier **aussi ses buffs** et **déclencher son cri de guerre**.
  - **Volte-Face** doit fonctionner **même sur une carte sans switch** (elle échoue presque à chaque fois ; elle
    montre aussi la carte au lieu des stats).
- **Intention :** les cartes ont **tous les types** et devraient donc recevoir **tous les buffs**, mais ce n'est pas
  exploité.
- **Nouvelle mécanique proposée** (icônes de race en cours de création) : un Caméléon **choisit, à chaque situation,
  l'effet de la race qu'il copie** : chiens = Provocation + bonus d'attaque ; chats = génère des sorts ; corbeaux =
  pioche ; grenouilles = renfort ; chouettes = aide à détruire. Un deck **polyvalent et holistique**.
- **Conséquence bot :** le bot devra **choisir la branche** (`meilleureBranche` existe déjà). **Hors périmètre
  de la v1.** Ne pas coder le bot avant que les bugs et la mécanique soient arrêtés.

## 6. Les situations à tester (méthode du game designer)

Méthode décidée le 8 octobre : **recenser les situations où le bot se trompe et les présenter une par une**. Chaque
cas devient une fiche dans `docs/SITUATIONS-A-TESTER.md` + `game/data/situations.js` et un test dans
`scripts/test-ai.mjs`. Premières fiches à écrire (ne pas deviner les chiffres : monter les positions avec de
vraies cartes) :

- **S1 — Aggro, visage ou échange.** Un attaquant prêt, un plateau adverse sans Provocation avec une unité qui ne
  menace pas mon ETA. *Attendu :* aller au visage. *Contre-exemple :* trade.
- **S2 — Aggro, sorts.** Un sort de retrait en main, une seule unité adverse qui ne retarde pas mon plan.
  *Attendu :* retenir le sort (ou le jouer au visage s'il le peut). *Contre-exemple :* le gaspiller sur cette unité.
- **S3 — Contrôle et PV. ❓ Q3 : à recueillir.** Le game designer voit des Contrôles « sacrifier une partie de leur PV
  pour infliger des dégâts à l'adversaire alors qu'ils devraient pousser un maximum de dégâts dans sa tête ».
  On veut **un cas concret** (idéalement un journal de combat `?journal=1`) : quelle carte, quelle cible, quel
  moment. Hypothèse de travail : avant d'avoir stabilisé, le PV est une ressource critique ; après, tout part au
  visage.
- **S4 — Combo (Félix).** Mage de l'étincelle + Ombre Feutrée en jeu, Griffures en main, Neuf Vies jouable :
  *attendu :* exécuter la chaîne. Même main **sans** moteur sur le plateau : *attendu :* installer d'abord, ne pas
  dépenser le carburant.
- **S5 — Retrouvailles (Médor).** Défausse avec 1 allié contre 5 alliés : *attendu :* retenir, puis jouer.
- **S6 — Volée de Corbeaux (Corax).** Face à 3 petits corps contre 1 gros : *attendu :* jouer, puis retenir.

## 7. Dépendances hors du bot (à traiter par le game designer avant ou en parallèle)

1. **Bug Meute** (cri de guerre non déclenché hors main) — bloque le plan de Médor.
2. **Mage de l'étincelle** : cible héros seulement, sans Charge — bloque la combo de Félix.
3. **Caméléon** : copie des buffs + cri de guerre ; **Volte-Face** sans switch — bloque Miracle.
4. **Séléné** : la combo n'existe pas. **Corax** : pas de payoffs. **Bulle** : le Têtard n'est pas central.
   **Athéna** : cartes en contradiction avec la fatigue. Pour ces cinq decks, **le plan du bot ne peut pas être
   calibré** tant que les cartes ne sont pas arrêtées.
5. Rééquilibrage des cartes (§5) : **après** le bot. Ne pas nerfer **Neuf Vies** avant d'avoir mesuré (§8), pour ne pas
   confondre « la carte est trop faible » et « le bot joue mal ».

## 8. Plan de travail et critère de réussite

Ordre :

1. `misplay: 0` partout (§1).
2. Écrire les fiches de situations S1 à S6 (§6) et leurs tests dans `scripts/test-ai.mjs`.
3. Estimateur d'ETA + lecture du matchup (§3.2), lisibles par `ecouteLesChoix` (le bot **dit pourquoi**).
4. Postures dans `BALANCE.ai.postures` (§3.3) branchées sur `meilleureAttaque`, la retenue des sorts de retrait et
   `unitThreat`.
5. Mode combo + recherche de séquence gagnante bornée (§3.4).
6. Mesurer. **Critères de réussite (la force du bot, pas la forme de la méta) :**
   - **Non-régression et gain :** le nouveau niveau d'IA contre l'ancien (`normal`), **mêmes decks, côtés échangés**,
     au moins 200 parties par paire de decks de trio de référence ; aucun deck ne régresse (intervalle à 95 %).
   - **Les fiches S1 à S6 passent** (celles dont les cartes sont prêtes).
   - **Exécution du combo :** parmi les parties où le moteur d'un deck Combo est en jeu, la part où la chaîne part
     est mesurée avant/après ; et elle **suit** un changement du coût de Neuf Vies sans retouche du bot (preuve que
     le bot lit son horloge au lieu de répéter une habitude).
   - **Coût :** temps moyen par décision ≤ 1,2 × l'actuel hors recherche de séquence ; la recherche a son budget en
     config et son temps mesuré.
   - Le cycle Aggro > Contrôle > Combo > Aggro se **lit** ensuite dans la matrice, comme diagnostic des cartes.
7. Seulement ensuite : nerfs et rééquilibrage de cartes (§5, §7).

Règles du dépôt à respecter (cf. `CLAUDE.md`) : après toute modification de `game/src/combat/`, lancer
`node scripts/test-triggers.mjs`, `test-ai.mjs`, `simulate.mjs` et `test-rejeu.mjs` (+ `test-evenements.mjs` si le moteur
émet autre chose). Tout outil qui joue des parties passe par `enParallele()` (`scripts/lib/pool.mjs`). Le moteur
tire à `Math.random` : la recherche de séquence doit rester déterministe sous la graine du rejeu. Mettre à jour les
`CLAUDE.md` de dossier touchés.

## 9. Questions ouvertes (pour le game designer)

- **Q1 — Plan par héros ou par deck ?** Un joueur joue des **trios** (15 cartes) et Bulle + Médor est cité comme bonne
  combinaison. Le plan s'attache-t-il au héros (le bot compose celui du trio) ou au deck complet ? Les adversaires
  (`npcs`) ont-ils des plans propres ou reprennent-ils ceux des héros ?
- **Q2 — Savoir de l'adversaire :** valider le §4.
- **Q3 — Contrôle et PV :** un cas concret (S3).
- **Q4 — Griffure dans le deck de Félix ?** (§5.5)
- **Q5 — Hypothèse Bulle :** concentrer ou répartir les renforts selon le retrait montré par l'adversaire ? (§5.7)
