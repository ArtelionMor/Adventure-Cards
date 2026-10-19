# game/src/ui/ — les écrans du jeu (JS vanilla, sans dépendance, format téléphone)

> Un module par écran ou par brique. **Pas de framework** : `el(html)` crée un nœud, `$('#id')` le retrouve (`shell.js`).
> Les gros fichiers : `battle.js` (≈ 1 220 lignes, l'écran de combat), `vfx.js` (≈ 1 600, les 71 briques et les 180 signatures), `effets.js` (≈ 780) et `overworld.js` (≈ 480). **Grep**, ne lis pas en entier.
> Le style de base est dans `../../styles.css` (sections commentées : combat, gestes, masque `.spot`, journal `.jr-*`, zone `.zcard`, fiche `.insp`) ; **l'habillage** (couleurs, cadres, polices) est un *skin* dans `../../skins/` (voir `skin.js` et `game/skins/CLAUDE.md`).

## Les fichiers

| Fichier | Rôle | Exports |
|---|---|---|
| `battle.js` | **L'écran de combat** (mise en page de la maquette « Combat Screen », 19 oct. 2026, voir « La mise en page du combat ») : coque persistante (`monteLaCoque` : haut adverse `heroNode('e')` + piles `pileNode`/`majPile` + éventail de dos `majEventail`, ligne du joueur, plateau de la main, onglets des bords, menu `ouvreMenu`), `render()` incrémental (`syncListe`), main à plat ou en éventail (`etaleLaMain`), mode Auto/Manuel (`loop`, `reprendLaMain`), action engagée + masque noir (`majFocus`), jouer/attaquer/viser (`tape`, `tapeUnite`, `designe`, `onCardClick`), **glisser-déposer** (`debutTir`, `bougeTir`, `lacheTir`), fenêtre de la défausse, lecture par appui long (`inspectNode`, `ficheCarte`, `teteFiche`), fin de combat (`finish`). Pose `data-carte` (l'id de la carte) sur chaque unité, que lisent les animations, et colore ses chiffres (`.plus` : attaque au-dessus de la carte, `.moins` : blessée). Porte la console de triche (`AC.triche`, 5 touchers sur « Tour N » dans le Menu). | `openBattle`, `buildPlayerSide` |
| `gestes.js` | **Tap = agir, appui long = lire, glisser = tirer** : écouteurs délégués (pointer events), tolérance de glissement ; le glisser (`glisse.debut/bouge/lache`) est facultatif, seul `#battle` le pose. Réglages dans `BALANCE.ui`. | `installeGestes` |
| `apercu.js` | **Aperçu d'un coup** sous chaque cible : joue le coup sur une copie du combat (`cloneBattle`) et compare avant/après. | `apercuAttaque`, `apercuCarte`, `pilule` |
| `effets.js` | **Les animations du combat** : lit les nouveaux événements de `B.evts` après chaque `render()` et joue, sur la couche `.fx` (jamais touchable), élan (un double de l'unité, le plateau coupe ce qui dépasse), éclair, secousse, chiffres flottants, carte jouée qui vole, pop d'invocation, fantôme de mort, anneaux, bannière de tour, auras (détectées par changement de chiffres). WAAPI, `setTimeout` (rien ne dépend de `requestAnimationFrame`), file bornée. Réglages : `BALANCE.ui.fx` (remplacés par la feuille Google, `config/feuille.js`). La carte d'une unité se lit sur l'événement (`ref.id`) ou, à défaut, sur son nœud (`data-carte`, posé par `battle.js`) : `idDe()`. Console : `AC.fx.ralenti`, `AC.fx.trace = console.log` (chaque brique jouée), `AC.fx.montre('crocs')`. | `creeFx` |
| `vfx.js` | **Les VFX par carte** : `SIGNATURES` donne à **chacune des 180 cartes** (base + switch) une signature écrite à la main, **toutes différentes**, dans la famille visuelle de son héros (`docs/VFX-CARTES.md`) ; `signatureDe(id)` la pose sur `signatureAuto` (calculée depuis les effets, mots-clés, moments), qui comble les moments non dits et anime une carte nouvelle. Une signature a un moment par champ : `lancer`/`arrivee`/`soin`/`renfort`/`entree`, `attaque` (traînée = Charge, fantôme = Passe-Murailles, venin à l'impact), `mort`, `declenche{death,turnStart,turnEnd,regle}`, `aura` ; chaque champ est `[brique, options]` ou une liste. `creeBriques(api)` = les **71 briques** procédurales (décrites dans `BRIQUES_DOC`). Banc : `node scripts/test-vfx.mjs` — ⚠ une carte ajoutée ou renommée le fait échouer tant qu'elle n'a pas sa signature. | `signatureDe`, `signatureAuto`, `SIGNATURES`, `creeBriques`, `BRIQUES_DOC` |
| `vfx-scenes.js` | Fabrique les **événements d'un moment d'une carte** (poser, attaquer, mourir, début/fin de tour, règle) pour les rejouer : wiki de l'Atelier et console de triche (`AC.triche.vfx(id, camp, moment)`). | `fabrique`, `momentsDe`, `fauxUnite` |
| `skin.js` | **Les skins** : choisit la feuille `game/skins/<nom>.css` (`juice` par défaut, `actuel` = aucune), la retient, charge la police du skin sans bloquer l'affichage et règle la couleur de la barre d'état du téléphone. Voir `game/skins/CLAUDE.md`. Console : `AC.skin('actuel')`. | `choisitSkin`, `skinSuivant`, `skinCourant`, `ecouteSkin`, `SKINS` |
| `fin.js` | **L'écran de fin de combat** : titre qui s'abat, récompenses qui défilent avec compteur, confettis (victoire), « Réessayer » (défaite) ; toucher l'écran le termine. `BALANCE.ui.fx.fin`. | `montreFin` |
| `journal.js` | **Journal graphique** : lit `B.evts` (`../combat/evenements.js`) et dessine des scènes (duel, carte jouée, tour, main de départ, fin) avec les conséquences en retrait ; onglets Tous/Toi/Adversaire ; ne reconstruit rien. | `creeJournal` |
| `combats.js` | **Les 5 derniers combats gardés** (`localStorage` `adventureCard.combats.v1`, à part de la sauvegarde). | `gardeCombat`, `listeCombats`, `chargeCombat` |
| `revue.js` | « Revoir le combat » : le journal sur un combat fini, tout révélé. | `ouvreRevue` |
| `pictos.js` | **Ce que fait une carte, sans texte** : `ligneDePictos(x)` rend une ligne d'icônes à hauteur fixe (mots-clés, moments, effets avec montant ; 4 au plus, le reste à l'appui long) — une carte garde donc **toujours la même taille**. Tables `CLES`, `OPS`, `MOMENTS` → noms d'icônes. | `ligneDePictos`, `pictosDe`, `iconeDeCle` |
| `fiche.js` | **Les lignes de la fiche** (appui long, maquette « Combat Screen Zoom on a card », 19 oct. 2026) : ce que la carte **fait** en `ligneEffet` (« icônes : texte », vert pour un effet, jaune pour un mot-clé) ; ce qui la **modifie** en `ligneSource` (portrait de la source, son nom et « (N fois) » en titre, le changement dessous : vert / rouge / grisé `eteint`), dont chaque **renfort avec sa source** (lue dans `B.evts`, sprite compris). | `ligneEffet`, `ligneSource`, `lignesDeFait`, `lignesDeRenforts` |
| `icones.js` | **Registre des icônes** : `icone('Nom', taille)` → `Graphical Assets/Icons/Nom.png` (sa version allégée si `vignettes.js` la liste : `urlIcone`), sinon le picto Kenney (`Graphical Assets/Icons/Kenney/`), sinon un signe. Ne jamais écrire un pictogramme en dur. Le dossier a changé le 19 oct. 2026 (`DOSSIER_ICONES`). | `icone`, `urlIcone`, `ICONES`, `DOSSIER_ICONES` |
| `zone.js` | **Fenêtre de zone** (défausse, exil, **ta pile de fatigue**, main adverse de dos) : cartes éclairées/grisées ; une carte `dos` n'a ni nom, ni coût, ni geste, seulement sa patte de pistage. Ne sait rien du combat. | `ouvreZone` |
| `overworld.js` | **La carte** : canvas, joystick flottant, points d'intérêt, tri du plus loin au plus proche (bâtiments, joueur **et décor** de `sol-carte.js` : le sol et le décor sont dessinés par lui), échelle des bâtiments. **Plus aucun verrou** (16 oct. 2026) : une **arène** (`type: 'arena'`) s'ouvre par « Entrer » → `ouvreFicheArene` (`arene.js`), son adversaire est dessiné devant la porte et son nom porte son niveau ; une **cueillette** (`forage`) fait connaître des cultures à la Ferme ; la découverte (`save.world.seen`) et la porte se règlent dans `BALANCE.arenes`. **Un tap sur le joueur** (court, sans glisser, sur son sprite : `surLeJoueur`) ouvre le Profil. | `initWorld`, `startWorld`, `stopWorld`, `refreshTop` |
| `sol-carte.js` | **Le sol et le décor de la carte** (pack B+, décidé le 16 octobre 2026, `docs/PACKS-CARTE.md`) : Kenney Medieval RTS + Foliage Pack (`Decor/`). Le contour brun juice (`CONTOUR`, ajouté au rendu) cerne le sol, les arbres et les rochers, **pas le feuillage** ni le **pied des troncs et des rochers** (décisions du game designer). Chemins, eau, neige et bois en **couches tracées par quarts de case** (coins arrondis, congés) ; feuillage **semé** au hasard fixe par case (`SEMIS` : fleurs, touffes, buissons, plus dense en lisière et dans les bois). Ne décide rien de la marche (`BLOCKED`). ≈ 1 ms par image. Aussi utilisé par `game/carte-packs.html`. | `creeSol`, `IMAGES_SOL`, `CONTOUR` |
| `arene.js` | **Les arènes** : la **fiche** en deux étapes dans une même fenêtre — l'ennemi (archétype, ce que le combat demande, stratégie optimale, ce qu'il punit, son deck, héros conseillés, « puissance conseillée — ta puissance », textes marqués provisoires) puis **l'équipe** (le panneau de `deck.js`, les héros conseillés étoilés, les **decks enregistrés** — un toucher recharge, deux touchers sur × oublient —, les **jokers de retrait** et la taille minimale du deck, « Combattre » → `openBattle({ ...point, niveau })`, mode auto par défaut) ; et **l'onglet Arène** (`renderArene`/`carteArene`, maquette « Arena Screen », 19 oct. 2026) : une carte par arène découverte — bâtiment en fond, ennemi en grand, nom, archétype, **signature** (la mécanique du deck, `config/arenes.js`), **équipe conseillée** avec l'état de chaque héros (Upgrade = recruté, Unlock = recrutable, Undiscovered), **choix du niveau** (flèches entre 1 et le niveau courant, niveaux battus cochés, récompense en Fanions au-dessus) ; toucher la carte ouvre la fiche **au niveau choisi** (`ouvreFicheArene(n, { niveau })`). Rejouer un niveau battu ne fait pas monter l'arène (`noteCombatArene(id, gagne, joue)`). Pas de `prompt`/`confirm`. | `ouvreFicheArene`, `renderArene`, `noeudDeLArene` |
| `profil.js` | **Le profil du joueur** (une fenêtre) : niveau, XP, puissance du joueur, places, jokers, et l'**arbre de 25 niveaux** (`config/profil.js`), le prochain niveau centré. Libellé neutre « Profil » (pas « plan »). | `ouvreProfil` |
| `deck.js` | **L'écran d'équipe** et **la fiche d'amélioration** — `panneauEquipe({ conseilles, apres })` est exporté : la fiche d'arène s'en sert (une vignette par place ouverte, `save.rosterSlots` ; le choix d'un héros rappelle `apres` en se fermant) — d'après les maquettes du game designer (`mockups/Deck Screen.png`, `Upgrade Deck Screen.png`, 12 oct. 2026) : l'équipe (3 vignettes, un toucher change le héros de la place), la collection rangée par famille (`config/familles.js`, puces de tri), la fiche (`ficheHeros`) dont le carrousel fait défiler les **étapes** d'amélioration (une carte à un palier, `etapesDe`), la frise de toutes les étapes, le bouton Upgrade (pièces, « +N power »). Le bouton switch (icône seule) équipe l'autre face d'un emplacement. **Aucun texte de plus que la maquette** : les mots viennent de `t('deck.…')`. Style : `styles.css`, section « deck » (habillage propre, indépendant du skin). | `renderDeck` |
| `farm.js` | Mini-jeu de Ferme (monnaie C) et gains hors-ligne. **Champ en grille** (16 oct. 2026, `BALANCE.farm.grille`) : une case vide → choisir le légume (seules les cultures **connues** : `estConnue`), une case mûre → récolter, la case fermée suivante → l'acheter (`costs.farmCase`). Plus de niveau requis. | `renderFarm`, `processFarm` |
| `bag.js` | Sac : monnaies, objets, **derniers combats**. | `renderBag` |
| `chargement.js` | **L'écran de chargement** (16 oct. 2026) : au démarrage (`chargeLeJeu().then(boot)` dans `main.js`), il charge **et décode** toutes les images de `sprites.js` (versions allégées) et les icônes (`imagesDesIcones` d'`icones.js`, qui note au passage celles qui n'existent pas), puis les **garde en mémoire** : un menu qui recrée ses `<img>` les reprend alors sans rien redemander au serveur (mesuré : 0 requête en passant par les 5 écrans). Réglages : `BALANCE.ui.chargement` (`parallele`, `maxMs` : au-delà, on entre quand même). | `chargeLeJeu` |
| `shell.js` | Helpers partagés : `$`, `el`, `asset` (**sert la version allégée** d'une image quand `data/vignettes.js` la liste : `/game/vignettes/…webp`, l'original sinon), `toast`, `modal`/`closeModal`, `fmtTime`, `court` (montant court : 12.5k), `CURRENCY_NAME`. La barre du haut montre toujours les pièces (C) et les gemmes (G) — le rappel contextuel de monnaie (`setContext`) a été retiré avec la maquette. | voir le fichier |

## Les invariants du combat (à respecter en y touchant)
- **`render()` ne reconstruit pas l'écran** : les enfants d'une unité/carte/héros sont en `pointer-events: none`, un élément touchable porte `data-geste`, les écouteurs sont sur `#battle` et `#modal` seulement.
- **Une action du joueur passe par `joueLeCoup` (= `joue()` de `../combat/journal.js`)**, jamais directement par `playCard`/`attack` (le banc `test-partage` le vérifie).
- **Pas de pictogramme en dur** : `icone('Nom')` (la liste des noms est dans `icones.js`).
- Pas de valeur d'équilibrage ici : `BALANCE` (`../config/balance.js`).
- Tester dans le navigateur intégré : voir la mémoire « Éprouver l'UI dans le navigateur intégré ». Le monde est piloté par `requestAnimationFrame` (rien ne bouge si le panneau est masqué).

---

# Le détail

## Le plateau, et la vue inspectée
**Le plateau n'a plus de plafond d'unités.** `BALANCE.combat.boardSize` à **0** veut dire
« pas de limite » : une invocation ne rate plus faute de place, un allié ne « reste plus
de côté », et un deck qui empile les jetons va jusqu'au bout de son idée. Remettre un
nombre dans ce champ rétablit le plafond partout — pose, invocation, jouabilité passent
toutes par `plateauPlein()` dans `engine.js`, seul endroit qui répond à la question.

⚠ **C'est un changement d'équilibrage, pas de confort** : la place libre profite surtout
à celui qui invoque. Sur `node scripts/simulate.mjs`, les deux boss ont nettement reculé
(médiane d'`owlboss` 35 % → 65 %, `frogboss` 65 % → 90 %). À relire avant de figer la
courbe.

C'est l'**affichage** qui encaisse, et il **ne défile jamais** — un plateau qui défile
cache la moitié du combat. Le plateau prend la hauteur de son contenu (`flex: 0 1 auto`)
jusqu'à un plafond, et au-delà `ajustePlateau()` (`ui/battle.js`) **retrécit les
vignettes** : il élargit le bloc de 1/échelle puis le réduit d'autant, si bien que les
retours à la ligne se calculent sur la largeur réelle. Deux détails qui l'ont mordu :
un bloc plus large que son plateau n'est **pas** centré par la grille (elle le recale au
bord de départ), d'où l'ancrage en haut à gauche et le replacement par la transformation ;
et « ça tient déjà » se **mesure** (`offsetHeight`) au lieu de se calculer, sinon des
lignes de hauteurs inégales feraient retrécir un plateau qui tenait.

**Maintenir une unité (ou une carte) la LIT**, en mode auto comme pendant le tour adverse :
lire ne coûte jamais un coup. La fiche dit ce qui la **modifie** en ce moment et **d'où**
ça vient (les auras nommées par leur porteur, les renforts reçus, la caractéristique
variable) — le plateau montre « 4/5 », la fiche explique pourquoi — puis ce qu'elle
**fait** (ses moments, son aura, ses statiques) et ses **paliers**, débloqués ou non.
Elle se redessine à chaque `render()` : maintenue pendant le mode auto, elle suit le combat
au lieu de mentir, et se ferme d'elle-même si l'unité meurt.


`aurasSur(B, k, u)` (`engine.js`) est ce qui rend la partie « d'où ça vient » possible :
le combat ne garde que le **total** des auras (`refresh()`), pas leurs porteurs. Elle
relit le plateau avec `auraPorte()`, **la même** règle de portée que `refresh()` — deux
copies de cette règle divergeraient fatalement.


## La mise en page du combat (maquettes du 19 octobre 2026)
Maquettes `mockups/Combat Screen.png`, `Combat Screen more than 3 cards.png`, `Combat Screen Zoom on a card.png`.
- **En haut, l'adversaire** (`.bt-haut`) : sa pioche (dos empilés + nombre) et sa défausse (la dernière carte assombrie +
  nombre) à gauche, son **médaillon** rond au centre (nom dedans, niveau de l'arène en pastille ; c'est lui la cible
  `data-geste="hero"`), ses PV dessous (`.bt-hpe`, hors du médaillon pour que le halo n'entoure que lui), sa main **de
  dos en éventail** en haut à droite (les cartes pendent depuis le haut, dos retournés : il les tient en face ; une carte
  pistée porte sa patte) et son mana dessous. Le dos des cartes : `DOS_DE_CARTE` (`Graphical Assets/CardBack/`).
- **Les bords** : onglets Menu (le tour, les 5 touchers de triche, le journal en texte), Registre (la fenêtre de zone),
  Log (le journal graphique, badge) à gauche ; Fin de tour et la vitesse (x1/x2) à droite. ⚠ Un bouton écrit à la
  verticale (`writing-mode`) prend la hauteur de son voisin : `.bt-onglet` a `height: max-content`.
- **En bas** : la ligne du joueur (avatar, nom, PV, bouton Auto/Manuel `#autoChip`), puis le plateau de la main
  (`.bt-basmain`) : le mana au-dessus, la main, et la pioche et la défausse **qui dépassent du bas** (coupées par le
  bord). Toucher une pile ou l'éventail adverse ouvre la fenêtre de zone ; la défausse (`#defBtn`) sautille et porte
  « ↺N » quand une Reprise attend.
- **La main ne défile plus** : à plat jusqu'à 3 cartes (`MAIN_A_PLAT`), en **éventail** au-delà (`etaleLaMain` : les
  cartes se chevauchent juste assez pour tenir, tournent par `rotate` et suivent un arc par la marge — `transform` et
  `translate` restent aux animations). Recalculée à chaque `render()` et quand la main change de largeur
  (`ResizeObserver`).
- **Le masque** (`#battle.spot`) éteint aussi les contrôles (`.bt-ctrl`), les PV adverses et les manas.

## Le glisser-déposer (demande du game designer, 19 octobre 2026)
En plus du toucher : on **tire une carte de la main**. `gestes.js` appelle `glisse.debut` quand le doigt glisse au-delà
de la tolérance (après un appui long aussi : la lecture se ferme et la carte part) ; `battle.js` refuse hors de son tour,
en Auto, ou si la carte n'est pas jouable (bulle qui dit pourquoi). Un **double** de la carte (`.tir-fantome`) suit le
doigt, au-dessus de lui ; la carte d'origine pâlit (`.tiree`).
- Une carte **à cible** (sans « Choisir ») engage l'action pendant le glissement : même masque, mêmes cibles éclairées,
  même aperçu que le toucher ; la cible survolée grossit (`.survol`). Lâchée **sur une cible légale**, elle se joue
  (`designe`) ; ailleurs, elle revient.
- Une carte **sans cible** (ou « Choisir », qui pose sa question au lâcher) se joue lâchée **au-dessus de la main**
  (`onCardClick`) ; lâchée sur la main, elle y revient sans rien coûter.
- Le coup passe par les mêmes fonctions que le toucher, donc par `joueLeCoup`. Le relâchement d'un glisser porte
  `ev.gesteGlisse` : l'écouteur « toucher le fond » l'ignore. La main et ses cartes sont en `touch-action: none` (sinon
  le navigateur prend le glissement pour un défilement et envoie `pointercancel`).
- Éprouvé dans le navigateur intégré (PointerEvent) : un sort à cible lâché sur le héros adverse (aperçu « 20 → 18 »,
  joué), lâché sur le plateau vide (revenu en main), une unité lâchée sur le plateau (posée).

## Les gestes du combat : tap = agir, appui long = lire
**Décision du game designer (8 octobre 2026).** Avant, un tap sur une unité ouvrait sa fiche
et attaquer demandait 3 touches ; c'est inversé. Tout passe par `ui/gestes.js`
(`installeGestes`) et ses deux réglages, `BALANCE.ui.appuiLongMs` (400) et
`toleranceDoigtPx` (10) — du « toucher », pas des règles de jeu.

- **Tap** (le doigt se lève avant 400 ms, sans glisser) : **agir**. Une carte jouable ou une
  unité prête **s'engage** ; en mode auto ou au tour adverse, le tap **ne fait rien** (on lit
  en maintenant). Un tap qui ne peut rien déclenche une bulle qui dit pourquoi (« Pas assez de
  mana (4 requis, 2 disponibles) », « a déjà attaqué ce tour »).
- **Appui long** : **lire**. La lecture (`#lecture`, créée à la demande dans `#app`) est
  **au-dessus de tout, y compris de la fenêtre de zone**, ne reçoit aucun toucher (le doigt qui
  lit reste sur sa carte) et se ferme au relâchement. Une unité s'y lit par `inspectNode`, une
  carte (main, défausse, exil) par `ficheCarte` ; les deux partagent `blocFait` et `blocPaliers`.
  Un doigt qui glisse de plus de la tolérance ne lit ni n'agit : c'est le défilement de la main.
- **L'action engagée** : `selCard` (une carte attend sa cible) ou `selUnit` (une unité attend
  sa victime). `#battle.spot` pose le **masque noir** : tout s'éteint (`filter`, **par
  élément** — les unités vivent dans `.bwrap`, qui a une transformation, et un élément ne
  passe pas au-dessus d'un calque quand son parent en a une) **sauf l'acteur et ses cibles**,
  en couleur et contourés (`.lit`, `.lit.acteur`). Un bandeau (`.bt-bandeau`, dans `.bt-mid`,
  entre les deux plateaux : il ne recouvre ni l'acteur ni les cibles) dit ce qu'on attend.
  Toucher une cible légale **joue** le coup ; toucher une autre unité prête change d'acteur ;
  **toucher le fond ou n'importe quoi d'autre annule**. Le héros adverse est une cible comme
  une autre, avec le même halo (il n'en avait aucun avant).
- **L'aperçu** (`ui/apercu.js`) : sous chaque cible, ce qui lui arriverait — « 6 → 4 », « 1/1 →
  3/3 », « bouclier brisé », ou l'icône `Graphical Assets/Icons/Dead.png` et « mort » quand le coup la tue.
  Quand c'est l'unité qui **attaque** qui ne survit pas à la riposte, l'icône et « riposte »
  s'ajoutent. ⚠ Il n'est **pas calculé par une formule** : il **joue le coup sur une copie du
  combat** (`cloneBattle`, comme le bot) et compare l'avant et l'après — Bouclier, Venin,
  Élusif, râles d'agonie et riposte sont donc ceux du moteur, sans copie de leurs règles. Un
  coup qui tire au hasard (« choisis au hasard parmi… ») peut tomber autrement : l'aperçu en
  montre **un** tirage. Éprouvé : l'attaque jouée ensuite a donné exactement l'aperçu.
- ⚠ **Le rendu ne reconstruit plus l'écran.** `render()` recréait tout à chaque pas : la main
  repartait à 0 de défilement (mesuré : 27 px → 0), et le nœud qu'un doigt tenait était
  **remplacé 750 ms plus tard** en mode auto, ce qui aurait coupé tout appui long. Maintenant
  `monteLaCoque()` crée **une fois par combat** les héros, plateaux, main et barre, et
  `syncListe()` met un nœud en correspondance avec chaque unité (clé `uid`) et chaque carte
  (clé : l'objet carte) ; le contenu d'un nœud n'est retouché que si sa signature (`_sig`) a
  changé. Deux règles à respecter en y touchant : **les enfants d'une unité, d'une carte ou d'un
  héros ne reçoivent aucun toucher** (`pointer-events: none`, sinon le doigt tient un enfant que
  `innerHTML` détruit), et un nouvel élément touchable se déclare par **`data-geste`**
  (`unit`, `hero`, `main`, `zone`) — les écouteurs sont posés une fois sur `#battle` et
  `#modal`, jamais sur l'élément. La fenêtre de zone ne se redessine que si sa signature change.
- **En Auto, toucher l'écran rend la main au joueur** (`reprendLaMain()`, décision du game
  designer, 8 octobre 2026) : un tap sur une carte, une unité ou le fond passe en Manuel et
  **ne fait que ça** (il n'agit pas en même temps : un tap distrait sur la fenêtre de la
  défausse ne doit pas relancer une Reprise). Ni les boutons, ni l'appui long, ni le
  défilement de la main ne comptent : on regarde jouer le bot et on lit ce qu'on ne comprend pas.
- **Fait depuis** (9-10 octobre 2026) : les **effets visuels** (`effets.js`, `vfx.js`), le skin `juice`, les cartes carrées sans nom
  sur la face (le nom se lit à l'appui long). **Pas fait** : aucune info sur la main de l'adversaire ; cibles tactiles de la
  fenêtre de défausse encore petites.


## La fenêtre de zone

**La fenêtre de zone** (`game/src/ui/zone.js`) montre une zone comme Arena : ce qui est pertinent,
**éclairé** (`on`) quand on peut agir d'un geste, **grisé** (`off`) quand ça n'a pas d'objet, lu
seulement (`vue`) sinon. Elle ne sait rien du combat : on lui donne des groupes de cartes déjà
étiquetées, et `ui/battle.js` décide de ce qui est jouable. Le bouton « Défausse N » de la barre
l'ouvre (il pulse « ↺N » quand une Reprise attend, à ton tour et en manuel) ; elle montre ta
défausse (la plus récente d'abord), ton exil s'il y en a un et la défausse adverse, et ne se redessine
que si ce qu'elle montre a changé. **Taper** un sort éclairé le joue comme une carte de la main
(choix de branche, puis masque et cible) ; **maintenir** n'importe quelle carte la lit ; `selZone` dit
d'où part la carte choisie. Elle montre aussi **ta pile de fatigue** (V3, Ex-libris : un groupe après ta défausse et ton exil — les cartes à Ex-libris éclairées, le
reste grisé, lecture seule ; le compteur de la barre dit « Fatigue N » une fois la pioche vide) et **le Registre** (un groupe « Le Registre
(N types) » : les cartes jouées par les deux camps, la plus récente d'abord, « ∞ Type : tous » en note ; ses types dans l'aide ; « Registre N »
sur le bouton de la défausse).


## Le journal graphique du combat
**Demande du game designer (8 octobre 2026).** Le journal texte (`B.log`, les 40 dernières
lignes, 32 % de l'écran) est remplacé par un **panneau qui s'ouvre et se ferme avec une
icône**, et qui montre les actions **sous forme de scènes** : le duel de deux unités avec leurs
valeurs avant (barrées) et après (en rouge), le sort et sa cible, l'invocation, la mort avec
`Graphical Assets/Icons/Dead.png`, les conséquences **en retrait sous leur cause**. Références : le journal de
Backpack Battle (sa version texte, « mal faite » aux yeux du game designer, en est le contre-
exemple) et sa propre maquette d'un duel (coût en haut à droite, attaque en bas à gauche, vie
barrée puis valeur en rouge, épées croisées au milieu). Trois usages à servir :
« je n'étais pas concentré, qu'est-ce qui s'est passé ? », « cette carte ne fait pas ça ? ah oui,
il y avait ça en plus », et — **en AFK** — « pourquoi je n'avance pas ? je regarde les logs de
ce match ». Donc : des **événements structurés avec leur cause** dans le moteur (ouverts à la
demande, comme le journal de décisions : zéro coût hors jeu), et les **derniers combats
gardés** pour qu'on puisse les revoir après coup. Les mêmes événements nourriront les effets
visuels.

Le **récit en données** (les événements, `B.evts`) est décrit dans `game/src/combat/CLAUDE.md` ; ce qui suit est la partie interface.

- **Le panneau** (`ui/journal.js`, codé) : l'icône de la barre l'ouvre et le ferme (badge = les scènes
  arrivées depuis la dernière ouverture) ; il tient entre le héros adverse et la barre. Une **scène**
  par racine d'événements : le **duel** (`attaque` → deux panneaux et les épées, comme la maquette du
  game designer : coût en haut à droite, attaque en bas à gauche, vie barrée puis valeur en rouge,
  icône « mort » par-dessus), la **carte jouée** et sa cible, le séparateur de **tour**, la **main de
  départ** (une scène par camp), la **fin** ; leurs conséquences en **retrait**, ligne par ligne. Onglets
  Tous / Toi / Adversaire. Il ne **reconstruit rien** : un événement qui arrive ne redessine que la
  scène de sa racine, et le défilement reste (collé en bas s'il y était). Le journal texte (`B.log`)
  n'est plus à l'écran : il reste pour les outils, et `⬇ texte` (en-tête du panneau) le télécharge.
- **Les icônes** (`ui/icones.js`) : `icone('Swords', 24)` rend `Graphical Assets/Icons/Swords.png` s'il existe, un
  **signe de remplacement** sinon (un 404 par icône absente, une fois), et prend la place du signe
  **tout seul** le jour où le fichier est déposé. **Ne jamais écrire un pictogramme en dur dans un
  écran.** La liste des noms (`ICONES`) est celle demandée au game designer le 8 octobre 2026 ; une
  icône inconnue s'affiche `[Nom]` (une faute de frappe se voit).
- **L'information cachée** : en direct (`revele: false`), ce que l'adversaire pioche ou crée dans sa
  main s'affiche « une carte » ; en revue, tout se lit.
- **Les combats gardés** (`ui/combats.js`) : les **5 derniers**, dans `localStorage`
  (`adventureCard.combats.v1`, **à part de la sauvegarde** qui s'écrit toutes les 4 s), avec leurs
  événements (les chemins d'images rangés dans une table : ~10 % gagnés). Mesuré : 58 Ko par combat
  en moyenne, 123 Ko au plus (jusqu'à 19 tours). Un stockage plein sacrifie les plus anciens, puis
  renonce **sans bruit**. On les **revoit** (`ui/revue.js`, même panneau, tout révélé) depuis l'écran de
  résultat (« Revoir le combat ») et depuis le **Sac** (« Derniers combats »).
- **Pas fait** : l'appui long sur une scène pour relire les cartes concernées (une photo n'est pas une
  carte vivante : il faudra retrouver la carte par son `id`) ; regrouper les scènes qui se répètent
  (« Foudre ×6 ») ; le rendu définitif (le game designer le juge « très Claude », trop générique : il
  dessine ses icônes, on y revient avec elles).


## L'overworld : joystick flottant et échelle des objets
- **Le joystick naît sous le doigt**, n'importe où sur l'écran de la carte (le canvas écoute ;
  les boutons « Entrer » / « Marchander » sont au-dessus, ils n'en posent pas), et disparaît
  au relâchement. Le point de départ est le centre de la manette ; zone morte 12 %, pleine
  vitesse à 40 px (`COURSE`), rayon dessiné 62 px (`RAYON`, repris de `.joystick` dans
  `styles.css`). ⚠ Le monde est piloté par `requestAnimationFrame` : **panneau navigateur
  masqué, plus rien ne bouge**, et un test de déplacement échoue sans le dire.
- **L'échelle** (`WORLD.unite`, `WORLD.tailles`, `config/world.js`) : **un personnage vaut 1,
  un bâtiment vaut 7** (décision du game designer, 8 octobre 2026 — « c'est la porte du
  bâtiment qui donne la mesure »). La hauteur dont on parle est la hauteur **visible** du
  dessin, mesurée sur l'image (`zoneVisible`, 256 px, une fois par image) : les marges
  transparentes d'un sprite ne comptent pas. `unite` (0,76 case) est la hauteur visible du
  chien dessiné à 1,35 case. Un type qui n'est pas dans `tailles` garde le dessin d'avant ; un
  point peut porter `taille` pour faire exception. ⚠ Une porte n'a pas la même proportion d'un
  sprite à l'autre : celle du Marchand fait ~1,6 personnage à 7 ; si on veut qu'elle en fasse
  1, il faut `taille: 4,5` sur ce point.
- **Du plus loin au plus proche** : les points d'intérêt et le joueur se dessinent triés par
  les **pieds** (un bâtiment les a sur sa porte, au centre de sa case), donc le joueur qui passe
  au nord de la porte est caché par le toit. Les noms s'écrivent après, par-dessus tout. Les
  bâtiments sont **traversables** : aucune collision n'a été ajoutée.
