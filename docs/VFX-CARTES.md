# VFX des cartes — liste de travail

> Proposition (9 octobre 2026), à corriger carte par carte. **Codé le 9 octobre 2026** dans `game/src/ui/vfx.js` (60 signatures, 20 briques procédurales) : la liste ci-dessous reste la référence de l'intention, le code peut s'en écarter carte par carte. Chaque carte
> reçoit un effet de **lancer** (ce qui part de la carte) et un effet d'**arrivée** (ce que la
> cible subit). Les doublons sont voulus quand l'effet est le même ; quand on peut varier, on varie.
> Les noms de briques (en **gras**) sont définis en bas : une carte = un assemblage de briques.
> Les pictogrammes viennent du pack Kenney « Board Game Icons » (CC0, dans `Kenney_board-game-icons/`),
> cités par leur nom de fichier.

## Principes
1. **Un effet se lit sans texte.** Le symbole (pictogramme) apparaît au-dessus de la cible avec le chiffre,
   la couleur dit la nature (rouge dégâts, vert soin/croissance, bleu mana/armure, violet venin/ombre, or renfort).
2. **Chaque carte a sa signature** : une même brique (ex. « éclair ») change de forme selon le héros
   (griffes pour Felix, plumes pour Corax, langue pour Bulle…). C'est ce qui rend les cartes mémorables.
3. **Une carte qui a un effet « se montre » comme une carte** (demande du 9 octobre) : une carte-effet
   plus petite, au **contour différent** (comme Arena), pose son symbole puis disparaît. Ses contours :
   *lancer* = doré, *mort* = gris-rouge, *début de tour* = vert, *fin de tour* = bleu, *aura/statique* = violet.
4. Les durées viennent de la game config (`BALANCE.ui.fx`) et de la vitesse x1/x2/x4.

## Les briques (vocabulaire commun)
| Brique | Description | Pictogramme |
|---|---|---|
| **Éclair** | trait vif de la source à la cible, flash blanc à l'arrivée | `fire` / trait dessiné |
| **Griffures** | 3 stries obliques qui se tracent sur la cible | — (dessin CSS) |
| **Plumes** | 5-6 plumes qui tournoient vers la cible et se plantent | — |
| **Langue** | traînée rose élastique de la source à la cible, claque | — |
| **Spore / goutte** | gouttes vertes ou violettes qui coulent sur la cible | `flask_full` |
| **Pluie** | gouttes qui tombent sur tout un camp | — |
| **Aura** | anneau doux qui reste sous l'unité (couleur de l'effet) | — |
| **Pioche** | carte(s) qui glissent du deck vers la main | `card_add`, `cards_take` |
| **Mélange** | cartes qui se brassent et s'engouffrent dans le deck | `cards_shuffle` |
| **Mille-feuilles** | pile de cartes qui défile (recherche) | `cards_seek`, `cards_seek_top` |
| **Retour** | l'unité se replie en carte et file vers la main | `cards_return`, `card_lift` |
| **Création** | une carte apparaît dans un éclat et rejoint la main | `card_add` |
| **Copie** | l'unité se dédouble en miroir et prend l'aspect de l'autre | `cards_flip` |
| **Bascule** | la carte se retourne (autre face) | `card_flip`, `flip_head` |
| **Choix** | deux cartes-branches éventail, l'une s'illumine | `cards_fan` |
| **Destruction** | craquelures puis éclats, icône crâne | `skull`, `cards_skull` |
| **Armure** | écusson bleu qui se pose sur le héros | `shield`, `tag_shield` |
| **Mana** | cristaux bleus qui montent dans la jauge | — |
| **Sablier** | sablier qui se retourne, sable qui coule | `hourglass` |
| **Convocation** | cercle au sol, pop de l'unité, poussière | — |

## Médor — Chien, Gardien
- **Toutou Fidèle** (allié, râle d'agonie : invoque un Chien) — arrivée : **Convocation** (pop rond, aboiement visuel : 2 petits « ! »). Mort : carte-effet gris-rouge `skull` → un **Convocation** plus petit où il est tombé.
- **Molosse de Garde** (aura +0/+1) — arrivée : **Convocation** lourde (secousse de sol). Aura : anneau violet permanent qui s'allume chez chaque allié qui en profite, `tag_shield`.
- **Appel** (pose un toutou, +1/+1 aux alliés) — lancer : un **cor** (ondes concentriques dorées) ; arrivée : **Convocation** puis vague dorée qui traverse le plateau et pose « +1/+1 » sur chaque allié.
- **Rappel** (réanime 5 alliés de la défausse) — lancer : la **défausse** s'illumine, `cards_return` ; arrivée : 5 **Convocations** en cascade, les unités remontent du sol en brume bleutée.
- **Meute** (invoque un Toutou et un Enragé) — lancer : **hurlement** (trois ondes) ; arrivée : deux **Convocations** qui sautent de chaque côté, l'Enragé en rouge.

## Felix — Chat, Mille coupures
- **Griffure** (allié charge) — arrivée : **Convocation** rapide en bond (il atterrit, traînée). Charge : traînée de vitesse à l'attaque.
- **Chat de Gouttière** (charge, passe-murailles) — arrivée : sort d'un coin du plateau ; passe-murailles : l'unité devient **translucide** à l'attaque (fantôme).
- **Foudre** (2 dégâts) — lancer : **Éclair** jaune-blanc ; arrivée : flash, **griffures** électriques bleutées, secousse. Doublon voulu avec Envol/Vase *pour la mécanique*, mais forme distincte par héros.
- **Neuf Vies** (crée autant de Foudre que de tours joués) — lancer : 9 petites âmes de chat qui s'échappent en spirale ; arrivée : **Création** en rafale, chaque Foudre atterrit dans la main avec un `fire`.
- **Ombre Feutrée** (mélange à la pioche, statique) — lancer : silhouette violette qui se faufile dans le deck, **Mélange** ; statique : fine brume violette autour de la pioche.

## Corax — Corbeau, Filou
- **Coup de Bec** (2 dégâts, pioche 1) — lancer : **Plumes** noires en piqué ; arrivée : piqûre rouge + **Pioche** (une carte vole vers la main).
- **Éclaireur** (allié) — arrivée : **Convocation** par le haut (il plonge dans l'écran), plume qui tombe.
- **Envol** (2 dégâts) — lancer : **Plumes** en spirale ascendante puis retombée ; arrivée : grand coup d'aile (souffle blanc) sur la cible.
- **Présage** (mélange, pioche 2) — lancer : œil doré qui s'ouvre au centre ; arrivée : **Mélange** puis **Pioche** ×2 (cartes plus lumineuses).
- **Grand Corbeau** (6/6) — arrivée : **Convocation** majeure, ombre immense qui passe sur tout l'écran, cri (anneau de choc). Moment « Timmy ».

## Bulle — Grenouille, Venin
- **Têtard** — arrivée : petite **Convocation** dans une flaque (éclaboussure).
- **Langue Collante** (choisir) — lancer : **Choix** (deux cartes-branches) ; arrivée : **Langue** qui claque sur la cible choisie.
- **Grenouille** (venin, renfort) — arrivée : **Convocation** avec bulles ; renfort : **spore** verte ; venin : crâne violet à l'attaque (déjà « Venin »).
- **Vase** (2 dégâts) — lancer : boule de boue verte ; arrivée : éclaboussure qui **colle** (la cible grisonne un instant).
- **Grand Crapaud** (provocation) — arrivée : **Convocation** lourde, onde dans l'eau, croassement (trois ondes).

## Athéna — Chouette, Contrôle
- **Étude** (pioche 1, mana au prochain tour) — lancer : livre doré qui s'ouvre ; arrivée : **Pioche** + **Mana** qui monte en différé (cristal fantôme « ⧗ »).
- **Chouette Érudite** (allié, statique) — arrivée : **Convocation** douce, lunettes (deux cercles lumineux) ; statique : halo violet.
- **Regard Perçant** (4 dégâts) — lancer : deux **yeux** qui s'ouvrent dans l'ombre ; arrivée : faisceau doré, la cible est « clouée » (secousse figée) avant l'impact.
- **Chasse** (détruit) — lancer : ombre d'ailes qui plonge ; arrivée : **Destruction** (cible happée vers le haut, `skull`).
- **Impératrice nocturne** (8 mana, statique, mélange) — arrivée : nuit qui tombe sur tout le plateau (vignette sombre + étoiles) puis **Convocation** majeure. Moment « Timmy ».

## Miracle — Caméléon, Support
- **Caméléon** (copie) — arrivée : **Convocation** qui change de couleur ; **Copie** : l'unité se transforme en miroir de la cible.
- **Transmigration** (copie) — lancer : spirale arc-en-ciel entre deux unités ; arrivée : **Copie** (échange de peau).
- **Gobeur de mouche** (type : tous, choisir) — arrivée : **Convocation** ; **Choix** ; langue qui gobe une mouche (point) → gain.
- **Découverte** (choisir) — lancer : **Mille-feuilles** puis **Choix** (3 cartes qui se révèlent) ; arrivée : la carte choisie s'envole vers la main.
- **Bipolarité** (bascule) — lancer : pièce qui tourne ; arrivée : **Bascule** (`flip_head` / `flip_tails`) sur chaque carte concernée.

## Croc — Chien, Meute (Aggro Turbo)
- **Louveteau Affamé** (charge) — arrivée : **Convocation** par bond, salive (gouttes). Charge : traînée.
- **Traque** (renfort) — lancer : empreintes rouges qui courent vers la cible ; arrivée : « +a/+h » + anneau rouge.
- **Rabatteur** — arrivée : **Convocation** ; aboiement (ondes).
- **Meute Affamée** (invoque) — lancer : hurlement rouge ; arrivée : plusieurs **Convocations** en arc, yeux brillants.
- **Grand Loup** (charge, renfort) — arrivée : **Convocation** majeure, griffes qui déchirent le sol, hurlement de pleine lune. Moment « Timmy ».

## Mistigri — Chat, Maraudeur (Aggro Tempo)
- **Chaton Fureteur** — arrivée : petite **Convocation** par la gauche, queue qui fouette. Passe-murailles : translucide.
- **Matou Têtu** (râle d'agonie : crée une carte) — arrivée : **Convocation** ; mort : **Création** (une carte jaillit de la dépouille, `card_add`).
- **Griffes Sournoises** (renfort) — lancer : trois **griffures** dorées dans l'air ; arrivée : « +a/+h », griffes qui se gravent sur l'unité.
- **Cambrioleur** (charge, passe-murailles) — arrivée : silhouette qui se glisse dans le plateau (fondu depuis le bord) ; une pièce d'or qui tombe.
- **Grand Matou** — arrivée : **Convocation** majeure, pas lourds (secousses), rugissement.

## Sirocco — Faucon, Rapace (Aggro Tempo)
- **Aiglon** (charge, renforce les cartes) — arrivée : **Convocation** en piqué ; effet : les cartes de la main brillent chacune d'un petit « + ».
- **Piqué** (renfort) — lancer : **plumes** en piqué rapide ; arrivée : « +a/+h », traînée de vent.
- **Faucon Chasseur** (attaque = cartes en main) — arrivée : **Convocation** ; chiffre d'attaque qui bat comme un cœur à chaque carte de la main.
- **Courant Ascendant** (renfort) — lancer : colonne de vent qui monte du sol ; arrivée : « +a/+h » sur chaque unité visée, plumes qui s'élèvent.
- **Grand Rapace** — arrivée : **Convocation** majeure, envergure (ailes qui s'ouvrent à l'écran), cri.

## Reinette — Grenouille, Marais (Combo croissance)
- **Frai** (invoque) — lancer : grappe de bulles ; arrivée : **Convocations** minuscules qui éclosent une à une.
- **Hurleur du Marais** — arrivée : **Convocation** ; coassement (ondes vertes).
- **Crapaud-Buffle** (provocation) — arrivée : **Convocation** lourde, gonflement de la gorge (échelle qui pulse).
- **Pluie Fertile** (renfort) — lancer : nuage + **pluie** sur tout le plateau ; arrivée : « +a/+h » sur chaque unité visée, pousses vertes (`fire` remplacée par une feuille).
- **Doyen du Marais** (début de tour : renfort) — arrivée : **Convocation** ; début de tour : carte-effet verte → mousse qui pousse sur une unité.

## Morphée — Hibou, Veilleur (Contrôle Pillow Fort)
- **Nid Douillet** (provocation, fin de tour : armure 1) — arrivée : **Convocation** (duvet qui flotte) ; fin de tour : carte-effet bleue + **Armure**.
- **Sablier** (dégâts X) — lancer : **Sablier** qui se retourne ; arrivée : sable doré qui s'écoule sur la cible, chiffre qui grossit à mesure (X).
- **Veilleur** (provocation, 0/0 variable) — arrivée : **Convocation** (yeux qui s'ouvrent) ; chiffres qui montent d'un cran à chaque tour de son camp (`hourglass`).
- **Hibou Berceur** (statique) — arrivée : **Convocation** ; statique : notes de berceuse (ondes violettes) autour de lui.
- **Grand Veilleur** (provocation, début de tour : 2 dégâts) — arrivée : **Convocation** majeure ; début de tour : carte-effet verte + rayon de lune qui frappe.

## Mirage — Caméléon, Imitateur
- **Prisme** (type : tous, renfort) — arrivée : **Convocation** ; renfort : facettes de couleur qui tournent (arc-en-ciel).
- **Reflet** (crée) — lancer : miroir qui apparaît ; arrivée : **Création** (copie de carte en cristal).
- **Chœur Chromatique** (aura) — arrivée : **Convocation** ; aura : anneau arc-en-ciel sous chaque allié bénéficiaire.
- **Mue** (renvoie en main, réduit le coût) — lancer : peau qui se détache ; arrivée : **Retour** (unité → carte) puis `cards_return` et coût qui baisse (chiffre bleu qui descend).
- **Bal Masqué** (renfort) — lancer : masques qui tournoient ; arrivée : « +a/+h » sur chacun, confettis dorés.

## Les effets sans carte (états)
- **Bouclier** (mot-clé) : bulle bleue qui se brise à l'impact, `tag_shield`.
- **Provocation** : cadre bleu-gris qui pulse quand l'unité est ciblée à la place d'une autre.
- **Charge** : traînée de vitesse à l'arrivée.
- **Élusif** : l'unité devient légèrement transparente, la cible « glisse » hors du coup.
- **Venin** : goutte violette, `flask_full`, puis crâne.
- **Passe-murailles** : fantôme translucide.
- **Fatigue** (pile vide) : carte de la pioche qui se fissure, `cards_skull`.

## Ordre de codage proposé
1. **Carte-effet** (contour par type de moment) : débloque tous les « début/fin de tour » et « râle d'agonie ».
2. **Briques génériques** : Éclair, Plumes, Langue, Aura, Pioche, Mélange, Création, Retour, Convocation. À elles seules, elles couvrent une trentaine de cartes.
3. **Pictogrammes Kenney** à la place des textes (« Bloqué », « Armure », « Venin ») et sur les cartes (mots-clés, effets) : c'est ce qui permet de supprimer le texte des cartes sans changer leur taille.
4. **Moments « Timmy »** : Grand Corbeau, Impératrice nocturne, Grand Loup, Grand Rapace, Grand Matou, Grand Veilleur.
5. Le reste, carte par carte, selon ce qui te plaît.
