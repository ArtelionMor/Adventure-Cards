# Le tutoriel des Lapins et le fil de quêtes

> Décidé avec le game designer le 21 octobre 2026. Ce document garde le **déroulé**, les **décisions**
> (les 14 défauts validés), les **cartes des trois Lapins** et la **spécification des quêtes**, puis ce
> qui est codé (✅) et ce qui reste (⏳). Ne pas rouvrir ce qui y est tranché.

## Pourquoi

Le jeu commençait avec Médor, Felix et Corax : trois héros à build, à cartes uniques, à mécaniques
croisées — beaucoup trop pour un premier contact. Le joueur commence maintenant avec **un seul Lapin**,
dont le deck est fait de créatures sans texte, puis débloque un 2ᵉ Lapin très proche, puis un 3ᵉ aux
effets plus particuliers, avant d'ouvrir les autres héros. Tout au long du jeu, un **fil de quêtes**
lui dit quoi faire.

## Le déroulé

Tout le tutoriel se joue dans **une seule arène, « Le Potager »** (le bâtiment Carrot Farm, `rabbit1`) :
chaque victoire la fait monter d'un niveau, et son ennemi grandit avec son profil de progression.

| Chapitre | Quêtes (une à la fois) | Ce qui s'ouvre |
|---|---|---|
| **1. Comprendre le jeu** | Gagner le combat guidé (poser une carte, attaquer, frapper le héros, le mana qui monte), puis un 2ᵉ sans aide (le mode auto) | Pompon seul, 1 place |
| **2. Un nouveau compagnon** | Recevoir Caramel, le mettre dans l'équipe, gagner à deux | 2ᵉ place |
| **3. Les golds** | Recevoir des golds (la victoire à deux), améliorer un Lapin (un palier s'allume), acheter une carte switch | Améliorations, switch |
| **4. Le dernier Lapin** | Battre le chef du Potager (niveau 4), recevoir Séléné, la mettre dans l'équipe, gagner à trois → **fin du tutoriel** | 3ᵉ place, tout le reste |

Après le tutoriel, le fil continue : recruter Médor, Felix, Corax (chacun la récompense d'une arène
précise), puis la Ferme (planter, vendre)…

## Les décisions (21 octobre 2026)

1. **« Golds » = les pièces (monnaie C).** La première fois, c'est une quête qui les donne : la Ferme
   n'arrive qu'après le tutoriel.
2. **Une carte switch coûte toujours des Sceaux (B).** La quête « Les golds » donne exactement le prix
   d'une switch (`BALANCE.costs.switchCard`). L'économie ne change pas.
3. **Pas de 4/4 pour 3** : il surclassait toutes les cartes à 3 du jeu (la meilleure fait 3/3 ou 2/4, et
   la Chancelière fait 4/4 pour **4**). Le Lapin Costaud fait **3/3 pour 3**.
4. **La 5ᵉ carte de Pompon est un second 1/1 pour 1** : il a presque toujours un coup au tour 1.
5. **Caramel** : la même courbe, mais l'endurance au lieu de l'attaque, et **Provocation** (le premier
   mot-clé). Sa 5 mana donne +0/+2 au lieu de +1/+1.
6. **Séléné** : les **moments** d'une carte (râle d'agonie, cri de guerre, début et fin de tour) et les
   premiers **sorts** ; une stratégie « Go Wide » (beaucoup de petites unités), latérale.
7. **Les Lapins gardent la règle des 5 + 5 cartes** (30 cartes, 30 signatures VFX). Le tutoriel n'en
   montre qu'une switch.
8. **L'ennemi du Potager devient des Souris** (`Graphical Assets/Characters/Mouse/`) au lieu du
   « Lapin Chapardeur » : Lapins contre Lapins serait confus. Les souris pillent le potager ; ses
   premiers niveaux ont peu de PV, son niveau 4 est le chef.
9. **Après le tutoriel, les Lapins restent dans le roster** et se mesurent comme les autres (d'où le 3).
10. **Médor, Felix et Corax ne sont plus distribués** : chacun est la récompense d'une quête après le
    tutoriel. Le reste de l'arbre du profil ne change pas.
11. **Les quêtes sont des données de game config** (`game/src/config/quetes.js` ; un onglet de la feuille
    plus tard). Seul le **fil principal** existe pour l'instant (pas de quêtes journalières).
12. **Affichage** : un bandeau sous la barre du haut (la quête, sa progression) ; le toucher y emmène
    (la fiche de l'arène, l'écran Deck, la Ferme) ; la récompense se récupère d'un tap. Aucune modale
    qui bloque.
13. **Pendant le tutoriel, seuls le Potager et l'écran Deck sont ouverts** ; la Ferme, le Sac et les
    autres arènes apparaissent quand une quête les présente.
14. **Une sauvegarde d'avant (celle du game designer) saute le tutoriel** : elle reçoit les trois Lapins
    et commence au fil d'après.

Le tutoriel se joue seul puis à deux — le seul endroit où le jeu l'autorise (« Taille d'équipe » du
`CLAUDE.md` racine). On y mesure donc **seulement** le taux de victoire de Pompon seul, puis de Pompon +
Caramel, contre le Potager niveau par niveau. À 5 cartes en solo, la pioche est vide vers le tour 3 : le
premier combat montre la pile de fatigue, et une bulle l'explique.

## Les cartes des trois Lapins

Toutes portent `type:Lapin`. Les jetons : **Lapereau** 1/1 et **Lapin de Garde** 2/2 Provocation.
Source : `scripts/gen-lapins.mjs` (cartes **et** paliers ; il réécrit les trois Lapins dans
`characters.data.js` — ⚠ à ne relancer que pour repartir de zéro, il écrase les retouches de l'Atelier).
Les paliers suivent `docs/GRAMMAIRE-DES-PALIERS.md` (Éveil 2-6, Verbe 7-11, Pivot 12-16, quatre
sommets 17-20) ; ils sont lisibles dans le script et dans l'Atelier.

### Pompon (`lapin1`) — le premier compagnon
*Aggro simple : poser, attaquer, grandir ensemble.* 20 PV, 5 de mana, 3 cartes en main.
Sprite `Rabbit/Rabbit.png`.

| Emplacement | Base | Switch |
|---|---|---|
| 1 | Lapereau — 1 · 1/1 | Lapereau Hardi — 1 · 2/1 |
| 2 | Lapin des Prés — 1 · 1/1 | Lapin Coureur — 1 · 1/1 Charge |
| 3 | Lapin de Garenne — 2 · 2/2 | Lapin Bagarreur — 2 · 3/1 |
| 4 | Lapin Costaud — 3 · 3/3 | Lapin Bondissant — 3 · 3/2 Charge |
| 5 | Grand-Père Lapin — 5 · 5/5, Aura : tes autres unités ont +1/+1 | Chef de Clapier — 5 · 4/4, Cri de guerre : tes autres unités gagnent +1/+1 |

La switch apprend la différence entre l'attaque et la vie, la Charge, et une aura contre un cri de guerre.

### Caramel (`lapin2`) — le gardien
*Tenir : l'endurance et la Provocation.* 24 PV, 5 de mana, 3 cartes en main.
Sprite `Rabbit/Rabbit English Lop.png`.

| Emplacement | Base | Switch |
|---|---|---|
| 1 | Lapin Nain — 1 · 1/2 | Lapin Angora — 1 · 1/1, Cri de guerre : ton héros gagne 2 PV |
| 2 | Gardien du Clapier — 1 · 1/2 Provocation | Lapin Sentinelle — 1 · 2/1 Provocation |
| 3 | Oreilles Tombantes — 2 · 1/3 Provocation | Lapin Têtu — 2 · 2/3 |
| 4 | Lapin de Grange — 3 · 2/4 | Lapin Cuirassé — 3 · 2/3 Bouclier |
| 5 | Doyenne du Clapier — 5 · 3/7 Provocation, Aura : tes autres unités ont +0/+2 | Grand Bélier — 5 · 4/6 Provocation, Cri de guerre : tes autres unités gagnent +0/+2 |

### Séléné (`lapin3`) — la portée
*Go Wide : les moments d'une carte et les sorts.* 22 PV, 5 de mana, 3 cartes en main.
Sprite `Rabbit/Rabbit Wherewolf.png`.

| Emplacement | Base | Switch |
|---|---|---|
| 1 | Lapine Prolifique — 1 · 1/1, Râle d'agonie : invoque un Lapereau 1/1 | Lapereau Farceur — 1 · 1/1, Râle d'agonie : 1 dégât à un ennemi au hasard |
| 2 | Festin de Trèfle — sort 1 : un de tes alliés gagne +2/+1 | Trèfle à Quatre Feuilles — sort 1 : tes unités gagnent +1/+0 |
| 3 | Portée de Lapereaux — sort 2 : invoque deux Lapereaux 1/1 | Terrier Secret — sort 2 : invoque un Lapin de Garde 2/2 Provocation |
| 4 | Lapin de Pleine Lune — 4 · 3/3, Début de ton tour : gagne +1/+1 | Lièvre de Mars — 4 · 2/2, Cri de guerre : invoque deux Lapereaux 1/1 |
| 5 | Reine du Terrier — 5 · 4/4, Fin de ton tour : invoque un Lapereau 1/1 | Lapin d'Éclipse — 5 · 4/4, Râle d'agonie : invoque trois Lapereaux 1/1 |

## Les Souris du Potager

L'arène garde son identifiant `rabbit1` (la feuille, le monde, les quêtes et une situation du banc le citent) ;
son adversaire devient **« Souris chapardeuses »** (sprite `Mouse/Mouse.png`, 10 PV, mana qui monte jusqu'à 5,
3 cartes en main, bot naïf). Écrites par `scripts/gen-lapins.mjs` (type `Souris`, paliers par défaut des
adversaires : c'est ce que lit `card_level` dans le profil de progression) ; le deck de `rabbit1` n'est plus dans
`scripts/lib/cartes-adversaires.mjs` (`gen-heros-v3.mjs` ne le réécrit plus). Des cartes **lisibles** — des corps sans
texte, une Provocation, un petit sort — et une seule « grosse » carte, le Chef de bande : une aura, comme le
Grand-Père de Pompon, vue de l'autre côté.

| Carte | Coût · stats | Effet | Exemplaires |
|---|---|---|---|
| Souriceau | 1 · 1/1 | — | 5 |
| Souris grise | 2 · 2/2 | — | 5 |
| Têtue | 2 · 1/3 | Provocation | 2 |
| Grignotage | sort 1 | 1 dégât à une unité adverse | 3 |
| Rat des greniers | 3 · 3/2 | — | 4 |
| Chef de bande | 5 · 4/4 | Aura : tes autres Souris ont +1/+0 | 1 |

Les niveaux 1 à 4 de l'arène (le chef au 4) viennent du profil de `rabbit1` dans l'onglet `enemy_progress_profile`
(niv. 2 : +3 PV ; 3 : cartes +1 palier ; 4 : +1 d'attaque à ses unités). Les anciennes cartes `adv_lapin_*` et
`card_bjidas` restent dans la bibliothèque, sans deck.

## Le combat guidé

Le premier combat du Potager (quête `potager1`, champ `guide: 'premierCombat'`) se joue **en manuel**, avec des
**bulles** : une à la fois, crème, pointée par une flèche sur ce qu'il faut toucher, la cible cerclée d'un anneau doré
qui pulse. Aucune ne bloque ni ne demande un toucher pour partir : une bulle d'action s'en va quand le geste est fait
(même fait avant d'être dit), une information au bout de 6 s ; elle se cache pendant une action engagée (le masque
noir). Le joueur peut passer en Auto quand il veut : les bulles d'action se taisent. Rejouer le combat (Réessayer)
relance le guide, tant que la quête n'est pas récupérée.

| Étape | Quand elle se montre | Ce qu'elle pointe | Ce qui la termine |
|---|---|---|---|
| Poser | à ton tour, une carte jouable | une carte jouable de la main | une carte posée |
| Attaque | une unité prête, des unités en face | ton unité prête | une attaque |
| Héros | une unité prête, plus personne en face | le héros adverse | ses PV qui baissent |
| Fin de tour | plus rien à poser ni à attaquer | « Fin de tour » | le tour suivant |
| Fatigue | ta pioche est vide | ta pioche | 6 s |
| Auto | après le héros frappé (ou au 4ᵉ tour) | le bouton Auto | 6 s, ou passer en Auto |

Textes et ordre : `game/src/config/guide.js` (`GUIDES`) ; moments et fins : `game/src/ui/guide.js` ; branché dans
`ui/battle.js` (`guideDuCombat`, `noeudDuGuide`, `guide.maj()` après chaque rendu). Console : `AC.guide.etat()`.

## Régler le tutoriel dans la feuille

Demande du game designer (21 oct. 2026) : tout le déroulé se modifie dans la Google Sheet « Config Adventure-Cards »,
puis une synchro (page « Feuille » de l'Atelier, ou `scripts/sync-feuille.mjs` sur le Pi). Un onglet qui a des lignes
**remplace** la valeur du code ; vide, le code garde la sienne. Une ligne invalide est **écartée** (le jeu ne s'y bloque
pas) et l'aperçu de la synchro dit pourquoi. Les colonnes « objectif », « id » et « cible » ont des listes déroulantes.

| Onglet | Une ligne = | Colonnes | Remplace |
|---|---|---|---|
| `quests` | une quête, **dans l'ordre du fil** (ajouter, retirer, réordonner des lignes change le fil) | `id`, `chapitre`, `titre`, `texte`, `objectif` (arene, equipe, victoire, ameliore, switch, plante, vend), `arene` + `niveau` (objectif arene), `heros` (objectif equipe), `n` (combien de fois), `equipe_min` (victoire avec au moins N héros), récompenses `pieces`, `sceaux`, `fanions`, `gemmes`, `heros_offert`, `places`, `guide` (le combat guidé), `fin_tutoriel` | `QUETES_DU_CODE` (`config/quetes.js`) |
| `tutorial_guide` | une bulle du combat guidé, dans l'ordre de priorité | `id` (poser, attaque, heros, fin, fatigue, auto), `guide`, `cible` (carte, unite, heros, fin, pioche, auto), `texte`, `duree_s` (une information : sa durée) | `GUIDES_DU_CODE` (`config/guide.js`) |
| `start` | une valeur de départ (`id`, `value`) | `places`, `pieces`, `sceaux`, `fanions`, `gemmes`, `heros_depart` (« lapin1 » ou une liste), `deck_minimum` | `BALANCE.depart`, `BALANCE.decks.tailleMin` |
| `heroes` | un héros ou un adversaire | (déjà là) PV, mana max, nom, image des trois Lapins et des Souris (`rabbit1`) | le builder |

Le moment d'une bulle et ce qui la termine restent dans le code (`ui/guide.js`) : on peut changer ses textes, son ordre,
sa cible et sa durée, ou en retirer, pas inventer une étape nouvelle. Une partie déjà commencée garde ses places et
ses monnaies : les valeurs de départ ne valent que pour une partie neuve.

## Les quêtes

### Le modèle (`game/src/config/quetes.js`)
Une liste ordonnée : le **fil principal**. Une quête :

```js
{ id, chapitre, titre, texte,
  objectif: { quoi, …, n },     // ce qu'il faut faire
  recompense: { C, B, A, G, xp, heros, place },
  finTutoriel: true }           // facultatif : la quête qui clôt le tutoriel
```

Les objectifs (`quoi`) sont de deux sortes :

- **un état**, relu dans la sauvegarde à chaque instant (une quête déjà remplie se termine toute seule) :
  `arene` (`arene`, `niveau` : le meilleur niveau battu de cette arène), `equipe` (`heros` est dans
  l'équipe), `equipe_n` (`n` héros dans l'équipe) ;
- **un événement**, compté à partir du moment où la quête commence (`save.quetes.compte`) : `ameliore`
  (une amélioration de héros), `switch` (une carte switch achetée), `victoire` (n'importe quel combat
  gagné), `plante` (un légume planté), `vend` (une vente de l'étal).

Le code signale les événements par `signale(quoi)` (`state.js`) : l'amélioration (`upgradeChar`), l'achat
d'une switch (`ui/deck.js`), la victoire (`ui/battle.js`), la Ferme (`ui/farm.js`).

### Les règles
- **Une seule quête à la fois.** Remplie, elle attend que le joueur **récupère** sa récompense (un tap
  sur le bandeau) ; la suivante commence alors.
- **Une quête qui offre un héros déjà possédé est sautée** (sans récompense) : un joueur qui a déjà
  Médor ne refait pas sa quête.
- Récompense `heros` : le héros est **possédé** tout de suite (pas de Fanions, pas de boss). `place` :
  une place d'équipe de plus (`save.rosterSlots`).
- La sauvegarde : `save.quetes = { courante, compte, faites }` (`courante` = l'identifiant de la quête en
  cours, `null` quand le fil est fini). Une partie neuve commence à la première ; une sauvegarde d'avant
  les quêtes reçoit les trois Lapins et commence au premier chapitre d'après le tutoriel (décision 14).

## Où on en est

- ✅ Ce document.
- ✅ Les 30 cartes des Lapins (`scripts/gen-lapins.mjs`) et leurs signatures VFX (`game/src/ui/vfx.js`).
- ✅ Le système de quêtes : `config/quetes.js` (le fil), `state.js` (`signale`, `queteCourante`,
  `recupereQuete`, migration), le bandeau (`ui/quetes.js`).
- ✅ Le départ : Pompon seul (`starters`), une place d'équipe (`rosterSlots: 1`), qui s'ouvrent par les quêtes.
- ✅ **Le bandeau éprouvé dans le jeu** (navigateur intégré, partie neuve) : Pompon seul combat (le minimum du deck
  suit les places : `tailleMinDuDeck`), la victoire remplit la quête, « Récupérer » donne la récompense, Caramel ouvre
  la 2ᵉ place de l'écran Deck, l'amélioration et l'achat d'une switch remplissent leurs quêtes ; le fil va jusqu'à Médor.
- ✅ **Le Potager en Souris** (voir « Les Souris du Potager » plus haut) : l'adversaire, ses 6 cartes, sa fiche, et
  la Google Sheet alignée (onglet `heroes`, ligne `rabbit1` : nom, sprite `Mouse` ; onglet `encounters` : les textes de
  la fiche) — `game/data/feuille.data.js` porte déjà ces valeurs, la synchro du Pi les redonnera telles quelles.
- **Mesure** (21 oct. 2026, 300 parties, le bot joue le joueur, profil de progression de `rabbit1` dans la feuille) —
  Pompon seul : 99,7 % (niv. 1), 99 % (2), 96 % (3), 59 % (4) ; Pompon + Caramel : 100 % (3), **86 % contre le chef**
  (4, la quête l'y envoie à deux) ; les trois Lapins : 92 % (4), 91 % (5). Avant les Souris (Lapin chapardeur) :
  98/97/94/63 en solo, 78 % au chef à deux. Les premiers combats se gagnent presque à coup sûr, le chef demande le duo.
- ⏳ **Les Lapins dans la META** : `matchups --taille 3` avec les 21 héros, pour vérifier qu'aucun Lapin ne surclasse
  (décision 9 : ils restent dans le roster).
- ✅ **Le combat guidé** (voir « Le combat guidé » plus haut) : éprouvé dans le navigateur intégré, les bulles
  s'enchaînent — poser, Fin de tour, attaque, héros, Auto.
- ⏳ **Les écrans qui s'ouvrent** au fil des quêtes (Ferme, Sac, autres arènes cachés pendant le tutoriel).
- ✅ **Tout le déroulé se règle dans la Google Sheet** (voir « Régler le tutoriel dans la feuille »), et les Lapins
  ont leur ligne dans l'onglet `heroes`.
- ⏳ Les images des cartes des Lapins (`scripts/art-sujets.json`, `gen-art.py`) : elles prennent le
  portrait de leur héros en attendant.
