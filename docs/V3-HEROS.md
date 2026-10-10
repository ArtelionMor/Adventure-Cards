# Héros V3 — conception (8 octobre 2026)

**Statut : conception seulement. Rien n'est codé, rien n'est dans `characters.data.js`.**
Ce document est la base de discussion : les cartes, leurs paliers, puis les mécaniques à coder.
Les sommets (niveaux 17 à 20) sont des brouillons : ils sont les plus faciles à jeter.

## 1. Ce qui est décidé

- Six nouveaux héros, un par espèce, chacun porté par **une mécanique neuve** : Patou (Pistage),
  Mélusine (Reprise), Morrigane (Charogne), Dendrobate (Toxine), Hulotte (Meule + Ex-libris),
  Pastiche (Registre).
- **Aucune unité à 0 d'attaque.** Toute carte qui lit le pistage en pose au moins un.
- Le pool reste réduit : pas d'information cachée, pas de vol de carte.
- **Reprise = Flashback** : au coût normal, sans défausser de carte, puis exil. Le **Grand Philtre n'a pas de Reprise**.
- **Appât** : Morrigane nourrit sa Charogne en fabriquant des copies de la **pile de fatigue adverse** dans la
  défausse adverse. Jamais de meule sur le vrai deck de l'adversaire (trop fort dans un pool réduit).
- **Charogne ne mange que les cartes de l'adversaire** : les dernières cartes de **sa** défausse, sans aucun
  choix. Ta propre défausse n'est jamais touchée, donc l'archétype se mélange avec n'importe quoi.
- **La main n'a plus de plafond** : on peut avoir autant de cartes en main qu'on veut.
- **Épidémie** pose 2 Toxines sur chaque unité adverse, puis chaque unité adverse blesse son contrôleur de ses Toxines.
- **Ex-libris avec vigilance** : jamais sur une gestion de masse, un finisseur ou un effet qui
  s'empile sans limite ; 2 cartes par héros au plus.
- **Morrigane est Aggro MidRange** : un Aggro qui s'adapte à ce que la partie lui offre et qui
  tient mieux la longueur qu'un Turbo.
- Les mécaniques sont partagées avec les héros existants par des **paliers** (section 3).
- Calendrier de chaque héros (`GRAMMAIRE-DES-PALIERS.md`) : **chaque niveau de 2 à 16 change
  exactement une carte par pile** (base, switch) ; chaque carte reçoit un Éveil (2-6), un Verbe
  (7-11) et un Pivot (12-16) ; **quatre sommets** (17, 18, 19, 20), un par niveau.
  Le tableau est vérifié par script (section 6).

## 2. Les six héros

Chaque carte est écrite pour un niveau de héros neuf ; les paliers sont cumulatifs.
« Statique » = effet statique, « Aura » = modificateur continu, « Piste » = pistage.

### 2.1 🐕 Patou — Contrôle Soft (le berger)

`dog3` · `Characters/Dog Cocker.png` · PV 30 · mana 7 · main 2.
Il ne tue pas le plus gros : il **taxe, punit et défausse** ce que l'adversaire veut jouer.
Les cartes pistées sont toujours choisies **au hasard** dans la main adverse.

| Pile | Coût | Carte | Stats | Texte |
|---|---|---|---|---|
| Base | 1 | Chien de Troupeau | 1/2 | Cri de guerre : piste une carte. Quand l'adversaire joue une carte pistée, tu gagnes 3 PV. |
| Base | 2 | Berger Vigilant | 2/3 | Cri de guerre : piste une carte. Les cartes pistées coûtent 2 de plus. |
| Base | 2 | Dressage | sort | Piste une carte. Inflige X dégâts à une unité adverse, X étant le nombre de cartes pistées. |
| Base | 4 | Patou | 3/5 Prov. | Cri de guerre : piste une carte. Quand l'adversaire joue une carte pistée, il perd 5 PV. |
| Base | 5 | Chasse au Loup | sort | Détruis une unité adverse. Piste deux cartes. |
| Switch | 2 | Chiot Pisteur | 2/3 | Cri de guerre : piste une carte. Quand l'adversaire joue une carte pistée, tes Chiens gagnent +1/+1. |
| Switch | 3 | Muselière | sort | Piste une carte, puis l'adversaire défausse une carte pistée. |
| Switch | 3 | Rottweiler | 3/3 | Cri de guerre : piste une carte. Quand l'adversaire joue une carte pistée, 3 dégâts à une unité adverse au hasard. |
| Switch | 4 | Battue | sort | Piste toute la main adverse. Pioche une carte. |
| Switch | 5 | Vieux Berger | 4/6 | Cri de guerre : piste une carte. Les cartes que l'adversaire pioche sont pistées. Les cartes pistées coûtent 1 de plus. |

<!-- paliers:Patou -->
| Pile | Carte | Éveil | Verbe | Pivot | Sommet |
|---|---|---|---|---|---|
| B | Chien de Troupeau | 2 · +0/+1 | 7 · Râle d'agonie : piste une carte. | 12 · Quand l'adversaire joue une carte pistée, pioche une carte. | 18 · Statique : les cartes que l'adversaire pioche sont pistées. |
| B | Berger Vigilant | 3 · +1/+0 | 8 · Fin de ton tour : piste une carte. | 13 · Aura : tes autres Chiens ont +0/+1. | 20 · Statique : l'adversaire ne peut jouer qu'une carte par tour. |
| B | Dressage | 4 · Effet +1 | 9 · Pioche aussi une carte. | 15 · Inflige aussi X dégâts au héros adverse. | |
| B | Patou | 5 · +0/+1 | 10 · Fin de ton tour : ton héros gagne 2 d'armure. | 16 · Aura : les unités adverses ont -1/-0. | 17 · Quand l'adversaire joue une carte pistée, détruis une de ses unités. |
| B | Chasse au Loup | 6 · Coût -1 | 11 · Pioche aussi une carte. | 14 · Piste aussi toute la main adverse. | |
| S | Chiot Pisteur | 2 · +0/+1 | 9 · Quand l'adversaire joue une carte pistée, tu gagnes aussi 3 PV. | 13 · Aura : tes autres Chiens ont +1/+0. | 19 · Quand l'adversaire joue une carte pistée, pioche une carte. |
| S | Muselière | 3 · Coût -1 | 7 · L'adversaire perd aussi 2 PV. | 15 · Il défausse aussi une carte au hasard. | |
| S | Rottweiler | 4 · +1/+0 | 10 · Râle d'agonie : 2 dégâts à une unité adverse au hasard. | 16 · Statique : l'adversaire n'attaque qu'avec 2 unités par tour. | |
| S | Battue | 5 · Coût -1 | 8 · Inflige aussi 1 dégât à une unité adverse au hasard par carte pistée. | 14 · L'adversaire défausse aussi une carte pistée. | |
| S | Vieux Berger | 6 · +0/+1 | 11 · Fin de ton tour : 1 dégât au héros adverse par carte pistée. | 12 · Quand l'adversaire joue une carte pistée, il perd 3 PV. | |

À regarder : Berger Vigilant et Vieux Berger se **cumulent** (+3 aux cartes pistées) ; Battue puis
Berger Vigilant mettent toute la main adverse à +2 pour un tour (la ligne de Johnny).

### 2.2 🐈 Mélusine — Combo (la sorcière)

`cat3` · `Characters/Cat Witch.png` · PV 25 · mana 8 · main 2.
Ses sorts ont **Reprise** (se relancent depuis la défausse, une fois, puis exil). Sa défausse est une
seconde main : elle la remplit, la réduit de coût, la renforce, et finit avec le Grand Philtre.

| Pile | Coût | Carte | Stats | Texte |
|---|---|---|---|---|
| Base | 1 | Étincelle | sort, Reprise | 2 dégâts à une unité adverse. |
| Base | 1 | Chaton Apprenti | 1/2 | Cri de guerre : défausse une carte, puis pioche une carte. |
| Base | 3 | Chaudron | 2/4 | Les cartes de ta défausse coûtent 1 de moins. |
| Base | 4 | Sorcière des Cendres | 3/4 | Cri de guerre : reprends un sort de ta défausse dans ta main. |
| Base | 6 | Grand Philtre | sort | Inflige à l'adversaire autant de dégâts que de cartes dans ta défausse. |
| Switch | 2 | Mauvais Œil | sort, Reprise | Donne -2/-2 à une unité adverse. |
| Switch | 2 | Divination | sort, Reprise | Pioche une carte. |
| Switch | 2 | Familier Affamé | 1/3 | Quand tu lances un sort depuis ta défausse, gagne +1/+1. |
| Switch | 3 | Chat Noir | 3/3 | Quand tu défausses une carte, 1 dégât au héros adverse. |
| Switch | 6 | Sabbat | 4/5 | Les sorts de ta défausse ont +1 puissance des sorts. |

<!-- paliers:Mélusine -->
| Pile | Carte | Éveil | Verbe | Pivot | Sommet |
|---|---|---|---|---|---|
| B | Étincelle | 2 · Effet +1 | 7 · Inflige aussi 1 dégât au héros adverse. | 13 · Réduit de 1 le coût d'un sort de ta main. | |
| B | Chaton Apprenti | 3 · +1/+0 | 8 · Râle d'agonie : défausse une carte, puis pioche une carte. | 15 · Quand tu défausses une carte, un sort de ta main coûte 1 de moins. | 17 · Statique : tes sorts coûtent 1 de moins. |
| B | Chaudron | 4 · +0/+1 | 9 · Fin de ton tour : 1 dégât à une unité adverse au hasard. | 14 · Statique : tes dégâts infligent 1 de plus. | 18 · Quand tu défausses une carte, pioche une carte. |
| B | Sorcière des Cendres | 5 · +1/+0 | 10 · Râle d'agonie : reprends un sort de ta défausse dans ta main. | 12 · Cri de guerre : reprends aussi un sort de ta défausse dans ta main. | |
| B | Grand Philtre | 6 · Coût -1 | 11 · Pioche aussi une carte. | 16 · Inflige aussi 3 dégâts à une unité adverse au hasard. | |
| S | Mauvais Œil | 3 · Coût -1 | 8 · Pioche aussi une carte. | 12 · Donne aussi -1/-1 à toutes les unités adverses du même type. | |
| S | Divination | 2 · Coût -1 | 7 · Gagne aussi 1 mana au prochain tour. | 14 · Réduit de 1 le coût de toutes les cartes de ta main. | |
| S | Familier Affamé | 4 · +0/+1 | 9 · Quand tu lances un sort depuis ta défausse, 1 dégât au héros adverse. | 13 · Quand tu défausses une carte, gagne +1/+0. | 20 · Quand tu lances un sort depuis ta défausse, invoque un Chat 2/2. |
| S | Chat Noir | 5 · +1/+0 | 10 · Quand tu lances un sort depuis ta défausse, pioche une carte. | 15 · Quand tu défausses une carte, un allié gagne +1/+1. | |
| S | Sabbat | 6 · Coût -1 | 11 · Début de ton tour : reprends un sort au hasard de ta défausse dans ta main. | 16 · Statique : les cartes de ta défausse coûtent 1 de moins. | 19 · Quand tu lances un sort depuis ta défausse, 2 dégâts à une unité adverse au hasard. |

À regarder : Reprise exile, donc **diminue le Philtre** : c'est la tension du héros, et le Philtre
lui-même n'a pas de Reprise. Morrigane mange les dernières cartes de la défausse adverse, donc les sorts que
Mélusine vient de lancer : un contre naturel et voulu. Le sommet 18 de Chaudron
(« quand tu défausses, pioche ») est à mesurer avec Chaton Apprenti, qui défausse déjà une carte.

### 2.3 🐦‍⬛ Morrigane — Aggro MidRange (la charognarde)

`crow3` · `Characters/Crow Skeleton.png` · PV 24 · mana 8 · main 2. Toutes ses cartes : `Oiseau`, `Corbeau`.
**Charogne X** : dévore les X **dernières cartes de la défausse adverse** (jamais les tiennes, sans aucun
choix) et les exile. L'unité gagne +1/+1 par carte et les mots-clés de combat des alliés qu'elle mange.
**Appât X** : met X cartes de la pile de fatigue **adverse** dans la défausse adverse. Ce sont des copies :
sa pioche, sa main et son plateau ne sont jamais touchés. Elles arrivent au dessus de la défausse,
donc une Charogne qui suit les mange en premier.

| Pile | Coût | Carte | Stats | Texte |
|---|---|---|---|---|
| Base | 1 | Corbeau Affamé | 2/1 | Cri de guerre : Charogne 1. |
| Base | 2 | Pie Voleuse | 2/2 | Cri de guerre : appât 2. Quand une carte est exilée d'une défausse, gagne +1/+0. |
| Base | 3 | Vautour | 3/2 Charge | Quand cette unité attaque, Charogne 1. |
| Base | 4 | Équarrisseur | 3/3 | Quand une unité adverse meurt, Charogne 1. |
| Base | 6 | Seigneur des Charognes | 4/5 | Cri de guerre : Charogne 4. |
| Switch | 2 | Charnier | sort | Appât 1, puis Charogne 2 : une unité alliée gagne +1/+1 par carte dévorée et leurs mots-clés. |
| Switch | 3 | Corbeau Squelette | 2/3 | Début de ton tour : Charogne 1. |
| Switch | 5 | Prince des Ossements | 4/4 | Quand une carte est exilée d'une défausse, 1 dégât au héros adverse. |
| Switch | 7 | Colosse d'Os | 5/5 | Cri de guerre : Charogne 5. |
| Switch | 1 | Rapace Maigre | 2/1 Charge | Cri de guerre : appât 1. Quand l'adversaire perd des PV, Charogne 1. |

<!-- paliers:Morrigane -->
| Pile | Carte | Éveil | Verbe | Pivot | Sommet |
|---|---|---|---|---|---|
| B | Corbeau Affamé | 2 · +0/+1 | 8 · Quand cette unité attaque, Charogne 1. | 13 · Quand l'adversaire perd des PV, Charogne 1. | 17 · Statique : tes Charognes dévorent 1 carte de plus. |
| B | Pie Voleuse | 3 · +0/+1 | 7 · Râle d'agonie : tes autres Oiseaux gagnent +1/+0. | 15 · Quand une carte est exilée d'une défausse, tes autres Oiseaux gagnent +1/+0. | |
| B | Vautour | 4 · +1/+0 | 9 · Cri de guerre : Charogne 1. | 14 · Aura : tes autres Oiseaux ont Charge. | |
| B | Équarrisseur | 5 · +1/+0 | 10 · Cri de guerre : Charogne 2. | 12 · Quand l'adversaire lance un sort, Charogne 1. | |
| B | Seigneur des Charognes | 6 · Coût -1 | 11 · Quand cette unité attaque, Charogne 2. | 16 · Aura : tes autres Oiseaux ont +1/+0. | 18 · Début de ton tour : Charogne 1. |
| S | Charnier | 2 · Coût -1 | 8 · Pioche aussi une carte. | 13 · L'unité gagne aussi Charge. | |
| S | Corbeau Squelette | 3 · +1/+0 | 7 · Quand cette unité attaque, Charogne 1. | 15 · Quand une carte est exilée d'une défausse, pioche une carte. | |
| S | Prince des Ossements | 4 · Coût -1 | 9 · Cri de guerre : Charogne 2. | 14 · Gagne Charge. | 19 · Quand une carte est exilée d'une défausse, l'adversaire défausse une carte au hasard. |
| S | Colosse d'Os | 5 · Coût -1 | 10 · Début de ton tour : Charogne 1. | 16 · Aura : tes autres Oiseaux ont +1/+1. | 20 · Quand une carte est exilée d'une défausse, gagne +1/+1. |
| S | Rapace Maigre | 6 · +1/+1 | 11 · Râle d'agonie : pioche une carte. | 12 · Quand tu attaques avec une unité, Charogne 1. | |

Retiré par rapport à la proposition précédente : Mort-de-Faim (trop fort), Pillage et Bûcher
(ils volent sa nourriture ou font de la gestion premium). **Nécromancie est mise de côté** pour un futur
héros réanimateur.

À regarder : Charogne dépend du cimetière **adverse**. Un Aggro qui tue ce qu'il voit (Vautour,
Équarrisseur) se nourrit de ses propres victimes, et ses mots-clés viennent de l'adversaire (elle mange
son Venin, sa Provocation). Pour ne pas rester à jeun contre un deck sans sorts et avec peu d'unités, les
trois cartes les moins chères **fabriquent la nourriture** (Rapace Maigre, Pie Voleuse, Charnier) :
Rapace au tour 1, Pie Voleuse au tour 2 en laisse deux de quoi faire manger Vautour ou Équarrisseur.
C'est sa propre défausse qui reste libre pour les autres héros.

⚠ Les cartes de l'Appât sont des **alliés de fatigue** (Chien Provocation, Rouge-Gorge Charge, Grenouille
Venin…). Elles nourrissent aussi la **récursion de l'adversaire** tant qu'elles sont dans sa défausse :
le Rappel de Médor ou l'Impératrice nocturne d'Athéna les remettraient en jeu. Le risque est limité
(Charogne les mange vite), mais il est réel : à surveiller en mesure.

### 2.4 🐸 Dendrobate — Contrôle Hard (le venin)

`frog3` · `Characters/Frog Venomous.png` · PV 28 · mana 7 · main 2.
Pas d'unité au-delà de 5 : à 7, on a dépassé le **tour de résolution** d'un contrôle. Tout ce qui est
posé arrive tôt et rend un 1 pour 1 ou un 1 pour 2.

| Pile | Coût | Carte | Stats | Texte |
|---|---|---|---|---|
| Base | 1 | Rainette Toxique | 1/2 | Cri de guerre : pose 1 Toxine sur une unité adverse. |
| Base | 2 | Dard Empoisonné | sort | Pose 3 Toxines sur une unité adverse. |
| Base | 3 | Sentinelle des Roseaux | 2/4 Prov. Venin | |
| Base | 4 | Poison Lent | sort | Détruis une unité adverse. Pose 3 Toxines sur une unité adverse au hasard. |
| Base | 5 | Dendrobate Royale | 3/5 | Aura : tes autres alliés ont Venin. |
| Switch | 1 | Têtard Toxique | 1/1 | Râle d'agonie : pose 1 Toxine sur une unité adverse au hasard. |
| Switch | 2 | Crapaud Cornu | 2/3 | Quand une unité adverse attaque, elle reçoit 1 Toxine. |
| Switch | 2 | Contagion | sort | Chaque unité adverse qui porte une Toxine en reçoit 1 de plus. |
| Switch | 3 | Collectionneur de Poisons | 2/4 | Quand une unité adverse qui porte une Toxine meurt, pioche une carte. |
| Switch | 5 | Épidémie | sort | Pose 2 Toxines sur chaque unité adverse. Puis chaque unité adverse inflige à son contrôleur autant de dégâts que de Toxines qu'elle porte. |

<!-- paliers:Dendrobate -->
| Pile | Carte | Éveil | Verbe | Pivot | Sommet |
|---|---|---|---|---|---|
| B | Rainette Toxique | 2 · +0/+1 | 8 · Râle d'agonie : pose 1 Toxine sur une unité adverse au hasard. | 14 · Début de ton tour : pose 1 Toxine sur une unité adverse au hasard. | 17 · Statique : tes Toxines en posent 1 de plus. |
| B | Dard Empoisonné | 3 · Effet +1 | 7 · Pose aussi 1 Toxine sur une autre unité adverse au hasard. | 13 · Pioche aussi une carte. | |
| B | Sentinelle des Roseaux | 4 · +1/+0 | 9 · Fin de ton tour : ton héros gagne 2 d'armure. | 12 · Aura : les unités adverses ont -1/-0. | |
| B | Poison Lent | 5 · Coût -1 | 10 · Soigne aussi ton héros de 4. | 15 · Pioche aussi une carte. | |
| B | Dendrobate Royale | 6 · +0/+1 | 11 · Quand une unité adverse meurt, ton héros gagne 2 d'armure. | 16 · Aura : tes autres alliés ont +0/+1 de plus. | 18 · Aura : tes autres alliés ont Bouclier. |
| S | Têtard Toxique | 4 · +0/+1 | 10 · Cri de guerre : pose 1 Toxine sur une unité adverse. | 13 · Râle d'agonie : invoque un Têtard 1/1. | |
| S | Crapaud Cornu | 2 · +1/+0 | 8 · Râle d'agonie : pose 2 Toxines sur une unité adverse au hasard. | 15 · Gagne Provocation. | 20 · Statique : au début de son tour, chaque unité adverse inflige à son contrôleur 1 dégât par Toxine qu'elle porte. |
| S | Contagion | 3 · Coût -1 | 7 · Pioche aussi une carte. | 12 · Inflige aussi 1 dégât à chaque unité adverse qui porte une Toxine. | |
| S | Collectionneur de Poisons | 5 · +0/+1 | 9 · Quand une de tes unités meurt, pose 1 Toxine sur une unité adverse au hasard. | 14 · Aura : tes autres alliés ont +0/+1. | 19 · Statique : tu pioches une carte de plus au début de ton tour. |
| S | Épidémie | 6 · Coût -1 | 11 · Pioche aussi une carte. | 16 · Soigne aussi ton héros de 6. | |

À regarder : **Épidémie est le finisseur** de Dendrobate (elle transforme le plateau empoisonné en
dégâts sur le héros ; les Toxines restent et continuent de tourner). Le sommet 20 de Crapaud Cornu
fait brûler le héros par **chaque** Toxine à chaque tour : c'est un brouillon fort, le premier à jeter.

### 2.5 🦉 Hulotte — Fatigue (la bibliothécaire)

`owl3` · `Characters/Owl Academic.png` · PV 27 · mana 9 · main 2.
Elle **meule** sa pioche pour atteindre la pile de fatigue avant l'adversaire, y renforce ses cartes,
et ses deux cartes **Ex-libris** s'y ajoutent une fois défaussées. Deux Ex-libris seulement : une
bombe qui se tire en boucle doit rester un corps ou de la valeur.

| Pile | Coût | Carte | Stats | Texte |
|---|---|---|---|---|
| Base | 1 | Lecture en diagonale | sort | Meule 3 cartes, pioche une carte. |
| Base | 2 | Archiviste | 2/3 | Cri de guerre : meule 2 cartes. |
| Base | 2 | Annotation | sort | Les cartes de ta pile de fatigue gagnent +1/+1. |
| Base | 3 | Veilleuse de Nuit | 2/4 | Quand tu pioches dans la fatigue, gagne +1/+1. |
| Base | 4 | Chancelière | 4/4 Prov. | Ex-libris. |
| Switch | 1 | Chouette Effraie | 2/1 Élusif | Cri de guerre : meule une carte. |
| Switch | 3 | Index | sort | Crée une carte au hasard de ta pile de fatigue : elle gagne +2/+2. |
| Switch | 4 | Marque-page | 2/5 Prov. | Tu pioches une carte de plus au début de ton tour. |
| Switch | 5 | Doyenne | 3/6 | Quand tu pioches dans la fatigue, la carte piochée coûte 2 de moins. |
| Switch | 6 | Grand Chancelier | 5/6 | Ex-libris. Quand tu pioches dans la fatigue, un allié gagne +1/+1. |

<!-- paliers:Hulotte -->
| Pile | Carte | Éveil | Verbe | Pivot | Sommet |
|---|---|---|---|---|---|
| B | Lecture en diagonale | 2 · Meule aussi 2 cartes. | 7 · Pioche aussi une carte. | 12 · Les cartes de ta pile de fatigue gagnent +1/+1. | |
| B | Archiviste | 3 · +0/+1 | 9 · Râle d'agonie : meule 2 cartes. | 14 · Début de ton tour : meule une carte. | 17 · Statique : tu as 1 mana de plus par tour. |
| B | Annotation | 4 · Coût -1 | 8 · Pioche une carte. | 13 · Les cartes de ta main gagnent aussi +1/+1. | 18 · Crée aussi une carte au hasard de ta pile de fatigue. |
| B | Veilleuse de Nuit | 5 · +1/+0 | 10 · Fin de ton tour : meule une carte. | 15 · Aura : tes autres alliés ont +0/+1. | 20 · Quand tu pioches dans la fatigue, tes alliés gagnent +1/+1. |
| B | Chancelière | 6 · +0/+1 | 11 · Cri de guerre : meule 2 cartes. | 16 · Quand tu pioches dans la fatigue, 2 dégâts au héros adverse. | 19 · Quand tu pioches dans la fatigue, la carte piochée gagne +1/+1. |
| S | Chouette Effraie | 2 · +0/+1 | 7 · Quand tu meules une carte, gagne +1/+0. | 15 · Aura : tes autres Oiseaux ont +1/+0. | |
| S | Index | 3 · Coût -1 | 9 · Pioche une carte. | 13 · Crée aussi une seconde carte de ta pile de fatigue : elle gagne +2/+2. | |
| S | Marque-page | 4 · +1/+0 | 10 · Fin de ton tour : meule une carte. | 14 · Quand tu pioches dans la fatigue, ton héros gagne 3 d'armure. | |
| S | Doyenne | 5 · +1/+0 | 11 · Cri de guerre : les cartes de ta pile de fatigue gagnent +1/+1. | 12 · Quand tu pioches dans la fatigue, 2 dégâts à une unité adverse au hasard. | |
| S | Grand Chancelier | 6 · Coût -1 | 8 · Cri de guerre : meule 3 cartes. | 16 · Aura : tes autres alliés ont +1/+1. | |

### 2.6 🦎 Pastiche — MidRange (l'usurpateur)

`cameleon3` · sprite : **à créer** (il n'existe qu'un `Cameleon.png`) · PV 25 · mana 8 · main 2.
Le **Registre** garde les types de toutes les cartes jouées par les deux camps. Une carte
« Type : tous » compte **toujours pour +1** (chacune). Dans ses effets, « partage un type » suit
`partageType` : un « Type : tous » dans le Registre fait donc partager à toute carte typée.

| Pile | Coût | Carte | Stats | Texte |
|---|---|---|---|---|
| Base | 2 | Greffier | 1/1 | Gagne +1/+1 pour chaque type différent dans le Registre. |
| Base | 3 | Bibliothécaire | 3/3 | Les cartes qui partagent un type avec une carte du Registre coûtent 1 de moins. |
| Base | 3 | Chroniqueur | 2/4 | Quand un type entre pour la première fois dans le Registre, pioche une carte. |
| Base | 4 | Spécimen | sort | Inflige X dégâts à une cible adverse (unité ou héros), X étant le nombre de types dans le Registre. |
| Base | 7 | Grand Registre | 6/6 | Cri de guerre : tes autres alliés reçoivent chaque type du Registre et +2/+2. |
| Switch | 1 | Copiste | 1/2 | Cri de guerre : le Registre enregistre une carte au hasard de ta main (elle reste en main). |
| Switch | 2 | Mimétisme | sort | Une unité alliée gagne +2/+2 et un type du Registre au hasard. |
| Switch | 4 | Archiviste Impitoyable | 3/4 | Quand l'adversaire joue une carte qui partage un type avec le Registre, il perd 1 PV. |
| Switch | 5 | Index du Registre | sort | Pioche autant de cartes que de types dans le Registre. |
| Switch | 8 | Rétrospective | sort | Pour chaque type du Registre, relance gratuitement une carte du Registre de ce type, au hasard. |

<!-- paliers:Pastiche -->
| Pile | Carte | Éveil | Verbe | Pivot | Sommet |
|---|---|---|---|---|---|
| B | Greffier | 2 · Coût -1 | 7 · Cri de guerre : le Registre enregistre une carte au hasard de ta main. | 14 · Quand tu joues une carte qui partage un type avec le Registre, pioche une carte. | |
| B | Bibliothécaire | 3 · +0/+1 | 8 · Cri de guerre : reçoit un type du Registre au hasard. | 13 · Statique : les cartes qui partagent un type avec le Registre coûtent 1 de moins de plus. | 17 · Statique : tes cartes coûtent 1 de moins. |
| B | Chroniqueur | 4 · +1/+0 | 9 · Râle d'agonie : pioche une carte. | 12 · Quand un type entre pour la première fois dans le Registre, gagne 1 mana au prochain tour. | 18 · Quand un type entre pour la première fois dans le Registre, pioche aussi une carte. |
| B | Spécimen | 5 · Effet +1 | 10 · Pioche aussi une carte. | 16 · Inflige aussi X dégâts à une autre cible adverse au hasard. | 20 · Inflige aussi X dégâts au héros adverse. |
| B | Grand Registre | 6 · Coût -1 | 11 · Quand un type entre pour la première fois dans le Registre, gagne +1/+1. | 15 · Début de ton tour : tes autres alliés reçoivent un type du Registre au hasard. | 19 · Cri de guerre : relance aussi une carte du Registre au hasard. |
| S | Copiste | 2 · +1/+0 | 9 · Quand un type entre pour la première fois dans le Registre, gagne +1/+1. | 13 · Début de ton tour : le Registre enregistre une carte au hasard de ta main. | |
| S | Mimétisme | 3 · Coût -1 | 7 · Pioche aussi une carte. | 12 · L'unité reçoit aussi un deuxième type du Registre. | |
| S | Archiviste Impitoyable | 4 · +1/+0 | 8 · Fin de ton tour : 1 dégât au héros adverse. | 14 · Aura : les unités adverses ont -1/-0. | |
| S | Index du Registre | 5 · Coût -1 | 10 · Soigne aussi ton héros de 4. | 16 · Crée aussi une carte au hasard d'un type du Registre. | |
| S | Rétrospective | 6 · Coût -1 | 11 · Pioche aussi une carte. | 15 · Relance aussi une carte du Registre au hasard. | |

À regarder : **Greffier** est un 1/1 qui devient 5/5 dès que le Registre a 4 types ; son coût de 2
est un point de réglage. **Rétrospective** relance aussi les cartes de l'adversaire, y compris ses
balayages : c'est le moment de Timmy, et il peut se retourner contre le plateau de Pastiche.

## 3. Retouches des héros existants

Règle suivie : on **remplace** un palier faible plutôt que d'en ajouter, pour ne pas surcharger un niveau.

### 3.1 Pistage

| Héros | Carte | Niveau | Palier | Note |
|---|---|---|---|---|
| Médor | Chien de Berger | 14 (nouveau) | Statique : les cartes pistées coûtent 1 de plus. Cri de guerre : piste une carte. | Deux entrées au même niveau (statique + extra) : l'audit le signalera, le joueur lit un seul texte. |
| Croc | Rabatteur | 14 (nouveau) | Quand l'adversaire joue une carte pistée, il perd 3 PV. Cri de guerre : piste une carte. | Son aura du 15 reste. |
| Croc | Louveteau Affamé | 14 → 15 | (inchangé) | Libère le 14 : Croc y avait déjà Curée. |

### 3.2 Reprise

| Héros | Carte | Niveau | Palier | Remplace |
|---|---|---|---|---|
| Felix | Coup de Patte | 12 | Gagne Reprise. | — (niveau libre) |
| Felix | Tempête de patounes | 13 | Gagne Reprise. | — (niveau libre) |
| Mistigri | Griffes Sournoises | 8 | Gagne Reprise. | « Pioche aussi une carte. » |
| Mistigri | Concert Nocturne | 13 | Gagne Reprise. | « Gagne 1 mana au prochain tour. » |
| Médor | Toute la Bande | 14 | Gagne Reprise. | — |
| Corax | Malédiction | 14 | Gagne Reprise. | — |
| Athéna | Regard Perçant | 14 | Gagne Reprise. | — |
| Morphée | Songe | 11 | Gagne Reprise. | « Gagne aussi 3 armures. » |
| Reinette | Pluie Fertile | 7 | Gagne Reprise. | « Soigne aussi ton héros de 3. » |

**Écartés par vigilance :** Foudre (Chat de Gouttière en crée à chaque attaque : chacune serait reprenable),
Neuf Vies, Minuit, Sablier, Colère d'Athéna, Nuit Sans Lune, Vase, Envol, Souffle (gestion de masse),
Chasse Nocturne (retrait premium), Métamorphose Ultime.

### 3.3 Meule, Ex-libris, pile de fatigue

| Héros | Carte | Niveau | Palier | Remplace |
|---|---|---|---|---|
| Athéna | Étude | 11 | Meule aussi 2 cartes. | « Coût −1 » (la carte coûte déjà 1) |
| Athéna | Chouette Érudite | 10 | Quand tu pioches dans la fatigue, gagne +1/+1. | « Gagne Élusif. » |
| Athéna | Guet | 16 (nouveau) | Gagne Ex-libris. | — |
| Morphée | Horloge Murale | 8 | Fin de ton tour : meule une carte. | « …ton héros gagne aussi 1 armure. » |
| Morphée | Grand Veilleur | 15 | Quand tu pioches dans la fatigue, 2 dégâts au héros adverse. | « …gagne aussi 2 armures. » |
| Morphée | Nid Douillet | 10 (nouveau) | Gagne Ex-libris. | — |

**Vigilance Ex-libris :** jamais sur de la gestion de masse, un finisseur, ou une aura de coût ou de
dégâts réduits qui s'empile (Chouette Érudite, Oreiller Géant, Hibou Berceur, Minuit, Sablier, Colère
d'Athéna sont écartés). Au plus 2 par héros. Une règle de validation `ex-libris-risque` le surveillera.

### 3.4 Toxine : textes de base réécrits (Bulle et Reinette)

| Héros | Carte | Nouveau texte de base |
|---|---|---|
| Bulle | Langue Collante | Choisis : pose 2 Toxines sur une unité adverse OU renforce une unité alliée. |
| Bulle | Grenouille | Venin. Cri de guerre : pose 1 Toxine sur une unité adverse. |
| Bulle | Grand Crapaud | Provocation. Début de ton tour : pose 1 Toxine sur une unité adverse au hasard. |
| Bulle | Vase | Pose 2 Toxines sur chaque unité adverse. |
| Bulle | Fermier du Nénuphar | Provocation. Quand une unité adverse attaque, elle reçoit 1 Toxine. |
| Reinette | Hurleur du Marais | Quand cette unité reçoit du renfort, pose 1 Toxine sur une unité adverse au hasard. |
| Reinette | Sauteur Électrique | Quand cette unité reçoit du renfort, pose 2 Toxines sur une unité adverse au hasard. |
| Reinette | Doyen du Marais | Début de ton tour : un de tes alliés au hasard gagne +1/+1 et une unité adverse au hasard reçoit 1 Toxine. |

Leurs **paliers existants** restent valables sauf ces textes à reformuler : Grenouille niv. 5
(« L'effet donne +1/+1 » devient « Effet +1 », une Toxine de plus), Hurleur niv. 8 et 15 et Sauteur niv. 9
(les mentions de « 2 dégâts » deviennent des Toxines). `toxine` doit être **amplifiable** (Langue
Collante, Vase, Dard Empoisonné lisent « Effet +1 »).
Reinette perd sa portée directe sur le héros (le Hurleur) ; elle gagne du contrôle.

### 3.5 V2 avec 0 d'attaque

| Carte | Aujourd'hui | Proposé |
|---|---|---|
| Étang Fécond (Reinette) | 0/3 Prov. | 1/3 Prov. |
| Nid Douillet (Morphée) | 0/4 Prov. | 1/4 Prov. |
| Œuf de Hibou (Morphée) | 0/3 Prov. | 1/3 Prov. |
| Faucon Chasseur (Sirocco) | 0/3, attaque = cartes en main | 1/3, attaque = cartes en main +1 (demande le champ « + » sur la caractéristique variable) |

Prince des cabots et Hibou Centenaire ne sont jamais à 0 en jeu (ils se comptent eux-mêmes, et les tours joués partent de 1).

## 4. Les mécaniques

Pour chacune : la règle telle que le joueur la lit, ce que ça change dans le moteur (les noms sont ceux
de `CLAUDE.md`), les cas limites, ce que fait le bot, et ce que voit l'interface. Taille : S/M/L.

### 4.0 Briques communes — CODÉES le 8 octobre 2026

**État :** tout le tableau ci-dessous est dans le moteur, **fenêtre de zone comprise** (livrée avec la
Reprise, 4.2) ; reste le **choix d'une carte à défausser par le joueur** (il arrive avec Mélusine :
aujourd'hui `met_a_la_defausse` depuis la main prend au hasard ou « du dessus »).
Le détail du code est dans `CLAUDE.md` (« Événements », « Déplacer des cartes entre les zones », « La
main n'a plus de plafond »). Écarts avec le plan ci-dessous :
- l'**exil a un effet** (`exile`, cinquième déplacement) : sans lui rien ne mettait de carte dans l'exil
  et la brique n'était pas testable par un vrai chemin de code ;
- la **brique « dernière défausse »** a disparu avec la nouvelle règle de Charogne (adversaire seulement) ;
- **deux corrections** que les briques ont forcées : le `t` laissé par le builder sur un déplacement hors
  plateau ne compte plus (Rappel, Impératrice nocturne, Presage… étaient injouables à plateau adverse
  vide), et `check-decks` lit `B[camp].posees` (cartes jouées) au lieu de la défausse.

⚠ **La main illimitée est un changement d'équilibrage, pas de confort** (comme le plateau sans plafond) :
les cartes qui comptent la main (Faucon Chasseur, Piqué, Plongeon, Grand Rapace, Index du Registre)
n'ont plus de borne haute. Mesuré en trios (`simulate.mjs 60 --paliers 3,3,3`, 220 équipes) : la médiane
des deux boss monte (Capitaine Grenouille 40 → 47 %, Grand-Duc 17 → 22 %), les sept autres rencontres ne
bougent pas au-delà du bruit (±3). La correction des cibles, mesurée seule, ne change rien.

| Brique | Détail | Sert à |
|---|---|---|
| **Zone d'exil** (S) | `B[camp].exile`, une liste par camp. Rien ne la lit pour l'instant sauf des compteurs ; `cloneBattle` et le journal la copient. | Reprise, Charogne |
| **« Met à la défausse »** (S) | Quatrième déplacement à côté de mélange, renvoi et pose (`ZONES`, `paramsZone`, `preleve`/`depose`). Zones d'origine : pioche, main. « Meule » est ce déplacement depuis le dessus de la pioche. | Hulotte, Morrigane, Mélusine |
| **Événements** (S) | `defausse` (une carte va de la main à la défausse par un effet), `meule` (de la pioche à la défausse), `exil` (une carte quitte une défausse pour l'exil), `fatigue` (une carte est piochée dans la fatigue). Camps `moi`/`foe`/`tous` générés par `EVENT_WHO`. | Chaudron, Chat Noir, Pie Voleuse, Prince… |
| **Cible « carte sujet »** (S) | `fatigue` donne pour sujet **la carte piochée** : filtre de cartes `sujet` pour `reduit_le_cout_de` et `renforce_les_cartes`. | Doyenne, Chancelière |
| **Caractéristique variable + « + »** (S) | Champ bonus fixe, comme `plus` pour les montants. | Faucon Chasseur, Greffier |
| **Main illimitée** (S) | `BALANCE.combat.handMax` à **0** = sans limite (même convention que `boardSize`) ; un seul endroit, `mainPleine()`, répond à la question. Aujourd'hui cinq endroits d'`engine.js` renvoient la carte à la défausse quand la main est à 8 (pioche, secours de fatigue, complétion, création de carte, pioche ciblée). À retirer. **Change aussi** le GDD (« main plafonnée à 8 cartes ») et `CLAUDE.md` (« une main pleine renvoie la carte à la défausse »). | tout |
| **Fenêtre de zone** (M, interface) | Voir 4.8. | Reprise, Hulotte, Registre (et lecture de Charogne) |

### 4.1 Pistage

**Règle.** « Piste N cartes » marque N cartes **au hasard** de la main adverse, parmi celles qui ne le
sont pas déjà. Une carte ne se pistre qu'une fois ; si plus aucune n'est disponible, **l'effet s'arrête
au premier échec** (« toute la main » = 99). La marque quitte la carte quand elle quitte la main.
Les cartes créées ou copiées ne sont pas pistées. Un Miroir ou une carte switchée **garde** sa marque
(réécriture sur place).

**Moteur.**
- Un drapeau `pistee` sur l'objet carte en main. `cloneBattle` et le journal le copient.
- Opérations : `piste` (`n`), et la défausse ciblée (Muselière, Battue) est le déplacement
  « met à la défausse » avec le filtre `pistee`.
- Taxe : `cout_des_cartes` gagne le filtre `quoi: 'pistee'`. `cardCost()` (le seul endroit qui répond
  « combien coûte cette carte ? ») l'additionne, donc la main, le bot et `canPlay` suivent.
- Punitions : événement `pistee`, parti dans `playCard` **après le paiement et avant les effets de
  la carte jouée**. « Quand l'adversaire joue une carte pistée » = `on_pistee_foe`. Pas de sujet,
  donc pas de garde.
- Statique `pistage_a_la_pioche` : à la fin de `draw()`, la carte piochée est marquée (lu via
  `staticTotal`, comme les autres statiques de pioche).
- Compteur `cartesPistees` : le nombre de cartes pistées dans la main adverse.
- Les effets statiques se **cumulent** (Berger +2, Vieux Berger +1 = +3).

**Règle de validation.** `pistage-sans-piste` (erreur bloquante) : une carte qui lit le pistage
(taxe, `pistee`, compteur) sans en poser au moins un, sur elle ou par un de ses paliers, est refusée.

**Bot.** Le bot « joue tout » jouerait la carte pistée en payant 5 PV : c'est un cas limite de plus à
présenter. Il lui faut un `coutDePistage(B, k, carte)` = surcoût en mana + espérance de ce que
coûtent les écouteurs adverses sur le plateau (PV, unités, cartes), à comparer avec la valeur de la
carte. Sans ça, Patou sera trop fort contre le bot.

**Interface.** Une patte 🐾 sur les cartes pistées, des deux côtés ; le coût affiché est le coût réel.

**Tests.** Piste une seule fois ; s'arrête au premier échec ; la marque suit/quitte la carte ; le
coût réel passe par `cardCost` ; l'événement part une fois, avant les effets ; une copie n'est pas pistée.
**Taille : M.**

### 4.2 Reprise (Flashback) — CODÉE le 8 octobre 2026

**État :** moteur, bot, journal, validation, builder et **fenêtre de zone** sont en place (détail dans
`CLAUDE.md`, « La Reprise (Flashback) et la fenêtre de zone »). Écarts avec le plan ci-dessous :
- `cout_des_cartes` et `montant_des_effets` portent un champ `zone` (`toutes` par défaut,
  `defausse`), plutôt qu'un filtre de cartes : « les cartes de ta défausse coûtent 1 de moins » ne
  change donc rien aux statiques existants. `montant_des_effets` gagne la cible `tous` (la puissance
  des sorts, pour Sabbat) ;
- l'événement `reprise` part **en plus** de `spell` (une reprise est un sort lancé) ;
- la fenêtre montre aussi ton exil et la défausse adverse, en lecture seule.
Éprouvé dans le vrai jeu (en donnant le mot-clé à « Coup de Sifflet » (ex-« Appel ») de Médor, en mémoire seulement) : la reprise
sans cible et avec cible, le bouton qui pulse, la carte éclairée, le sort exilé.

**Règle.** Un sort à Reprise peut être lancé **depuis ta défausse**, à son coût normal ; il est
**exilé** après, jamais remis en défausse. Une reprise **est** un sort lancé : elle nourrit
`spellsGame`/`spellsTurn`, Griffeur de doigt (ex-Griffure), Tempête de Patounes, Matou Invocateur (ex-Roi des Toits).

**Moteur.**
- Mot-clé `reprise` ; un drapeau `surSort` dans `KEYWORDS` autorise un mot-clé sur un sort (la
  validation « mot-clé posé sur un sort » en fait l'exception) et un palier `key` sur un sort.
- `playCard` accepte une source : `{ zone: 'main' | 'defausse', i }`. **Ordre :** retirer de la
  défausse → exiler (**avant** les effets, comme un sort part en défausse avant ses effets) → événements
  de sort → effets. Un sort qui remélange sa défausse ne peut donc pas se reprendre lui-même.
- `canPlay` et la liste des coups légaux (le bot, le journal) ajoutent les reprises possibles. Le
  journal gagne un champ `zone` (ajouter un champ ne change pas `v`).
- Nouveau moment `reprise` : « Quand tu lances un sort depuis ta défausse » (`on_reprise_self`), pour
  Familier, Chat Noir, Sabbat.
- `cardCost(card, B, k, zone)` : le filtre `quoi: 'defausse'` de `cout_des_cartes` (Chaudron, Sabbat).
  `montant_des_effets` gagne une condition de zone d'origine (Sabbat : +1 puissance), donc
  `resolveAmounts` lit `B.sourceZone`.
- Impératrice nocturne (`cartes_jouees_remelangees`) : les sorts n'arrivent plus en défausse, donc
  rien à reprendre ; et une reprise **exile avant** le remélange, donc elle ne retourne jamais dans la pioche.
- Seule **ta** défausse compte (les cartes d'un propriétaire restent chez lui).

**Interactions notables.** Charogne mange les sorts à Reprise de la défausse (pour Morrigane, c'est
un contre). Le Grand Philtre baisse quand on reprend (l'exil retire une carte de la défausse).

**Bot.** Les reprises entrent dans la liste des coups candidats ; leur valeur est celle du sort, sans
coût de carte.

**Interface.** Via la fenêtre de zone : la défausse s'ouvre, les sorts à Reprise payables sont
éclairés, les autres grisés ; toucher un sort éclairé le lance.

**Tests.** Un sort repris est exilé et ne revient pas ; un sort à Reprise lancé depuis la main va en
défausse ; pas de reprise d'un sort sans le mot-clé ; compteurs de sorts incrémentés ; un sort à
remélange ne se reprend pas ; ordre exil → effets. **Taille : M.**

### 4.3 Charogne

**Règle.** « Charogne X » : dévore les X **dernières cartes de la défausse adverse** — jamais les
tiennes, **sans aucun choix** — et les **exile**. Le dévoreur gagne +1/+1 par carte, plus les
**mots-clés de combat** des alliés mangés : Provocation, Charge, Venin, Bouclier, Élusif,
Passe-Murailles. Rien d'autre : ni types, ni effets, ni caractéristiques variables.

Ta défausse n'est jamais touchée : Reprise, Sorcière des Cendres ou une réanimation restent à toi, et
c'est ce qui permet de mélanger Morrigane avec n'importe quel autre héros. Il n'y a rien à demander
au joueur, rien à régler pour le bot, et l'idle reste fluide. Équarrisseur (« quand une unité
adverse meurt, Charogne 1 ») mange le plus souvent la carte de l'unité qu'il vient de voir mourir ;
ce n'est pas le cas si c'était un jeton (il n'a pas de carte), si un râle d'agonie défausse autre
chose ensuite, ou si Impératrice nocturne a détourné la carte vers la pioche.

**Moteur.**
- C'est un **déplacement de zone** du modèle existant (`preleve()` puis dépôt) : source = la défausse
  adverse, `ordre: dessus`, destination = l'**exil** (une zone de plus dans `ZONES`). Le dessus d'une
  défausse est la fin du tableau, et ce tableau est déjà chronologique : aucune brique de numérotation
  n'est nécessaire. Un test garde qu'aucune carte n'est insérée au milieu de `discard`.
- Opération `charogne` : `n` (un montant du jeu, donc un compteur est possible), destinataire (soi
  par défaut, `t` pour un sort).
- Drapeau `transmissible` dans `KEYWORDS`, posé sur les six mots-clés ci-dessus.
- Événement `exil` : parti **une fois par carte exilée**, avec les camps `moi`/`foe`/`tous` (la
  défausse d'où elle part). Une Reprise qui exile déclenche donc aussi Pie Voleuse et Prince des Ossements.
- Le gain est un **renfort** : l'événement « quand cette unité reçoit du renfort » part une fois par
  Charogne (pas une fois par carte).
- Statique `montant_des_effets` avec `cible: 'charogne'` (sommet 17 : +1 carte).
- Défausse adverse vide : l'effet ne fait rien.

**Interactions.** Un sort à Reprise que l'adversaire vient de lancer est la dernière carte de sa
défausse : une Charogne juste après le mange, donc lui prend sa Reprise (Équarrisseur au niveau 12 le
fait à chaque sort). Les sorts plus anciens sont à l'abri tant que des cartes plus récentes tombent.

**Bot.** `cardValue()` d'une Charogne = valeur des X dernières cartes de la défausse adverse (+2 par
carte, plus les mots-clés d'alliés mangeables) ; zéro si elle est vide, donc le bot la garde.

**Interface.** Aucun choix. La fenêtre de zone (4.8) peut éclairer les X dernières cartes adverses pour montrer ce qui va être mangé.

**Tests.** Mangé = exilé ; les X dernières de la défausse **adverse** ; jamais la tienne ; +1/+1 par
carte ; seuls les mots-clés transmissibles passent ; défausse adverse vide ; un jeton n'a pas de carte
à manger ; `discard` reste chronologique. **Taille : S à M.**

### 4.3 bis Appât

**Règle.** « Appât X » : X cartes tirées au hasard de la **pile de fatigue adverse** sont fabriquées
(des copies, à leur niveau de pile) et posées au dessus de la **défausse adverse**. C'est ce que tu
voulais dire par « meuler depuis la pile de fatigue » : on nourrit, on ne prive jamais.
- **La pioche, la main et le plateau adverses ne sont jamais touchés.** Aucune carte du vrai deck ne
  disparaît, et l'adversaire n'approche pas de sa fatigue plus vite.
- **Aucun événement ne part** (ni `defausse`, ni `meule`) : ce ne sont pas ses cartes qui tombent,
  elles apparaissent. Chat Noir ou Veilleuse de Nuit ne peuvent donc pas en profiter.
- **Ex-libris** : une carte appâtée qui est Ex-libris est déjà dans sa pile, rien de plus (une seule fois par carte).
- Pile adverse vide : l'effet ne fait rien.

**Ordre dans les cartes.** « Appât 1, puis Charogne 2 » (Charnier) mange d'abord l'appât puis une
carte **réelle** plus ancienne : le sort vaut +1/+1 sûr et +2/+2 si l'adversaire a joué quelque
chose. Rapace Maigre et Pie Voleuse n'ont qu'un appât : le repas viendra d'une autre carte. Le pire
cas (Corbeau Affamé tour 1, défausse vide) reste affamé, à dessein : seules les trois cartes les moins
chères nourrissent.

**Moteur.**
- Un déplacement de zone du modèle existant : source = **pile de fatigue adverse** (la même zone
  `fatigue` que pour Annotation et Index, 4.5), destination = défausse adverse, `ordre: hasard`.
- Tant que la pile n'est pas par camp, la source est la pile commune (`fatiguePile()`). Appât peut
  donc être codé avec Charogne, avant la pile par camp.
- Les copies sont neuves (`inst` en `c…`, comme pour toute carte fabriquée).

**Bot.** Valeur d'un appât = repas futurs pour ses Charognes − risque de récursion adverse
(0 si l'adversaire n'a ni réanimation sur lui ni sur la table). Le bot ne joue pas un appât seul s'il n'a
aucune Charogne dans la main, la pioche ou sur le plateau.

**Tests.** Appât ne touche ni la pioche, ni la main, ni le plateau ; les cartes arrivent au dessus ;
une Charogne qui suit les mange en premier ; pile vide → rien ; aucun événement `defausse`/`meule` ;
une carte déjà Ex-libris n'est pas ajoutée deux fois. **Taille : S.**

### 4.4 Toxine

**Règle.** Une unité porte des **marqueurs Toxine**. Au début du tour de son contrôleur, avant sa
pioche, elle **perd 1 PV par marqueur** (une perte de PV, pas des dégâts : le Venin n'y réagit pas).
Un **Bouclier** absorbe la première perte (un tour de Toxine, le Bouclier tombe). Quand elle meurt,
**ses marqueurs sautent** sur une autre unité du même camp, au hasard ; s'il n'y en a plus, ils
disparaissent. Jamais sur le héros.

**Moteur.**
- Champ `tox` sur l'unité, à côté de `damage` (pas une valeur dérivée de `refresh()`).
- `beginTurn` : après la remise à zéro des attaques et **avant** la pioche, chaque unité du camp subit
  `tox` (en passant par le Bouclier), puis `resolveDeaths`. Une unité qui meurt ainsi n'attaque jamais.
- `resolveDeaths` : les transferts se font **une fois que tous les morts du lot sont retirés**,
  vers les survivantes, puis la boucle de profondeur existante reprend si cela en tue d'autres.
- Opérations : `toxine` (cible, `v` amountable, **amplifiable**), `contagion` (cible : les unités qui
  portent déjà une Toxine) et `epidemie` (pose 2 Toxines sur chaque unité adverse, **puis** chaque unité adverse
  inflige à son contrôleur autant de dégâts que de Toxines qu'elle porte, par `damageHero` ; les Toxines
  **restent** et continuent de tourner). Garde d'événement `toxinee` : « l'unité qui meurt portait une
  Toxine » (lue **avant** le transfert).
- Statique `montant_des_effets`, `cible: 'toxine'` (sommet 17 de Dendrobate). Statique
  `toxine_brule_le_heros`, lu **au tic** de `beginTurn` (sommet 20 de Crapaud Cornu) : chaque unité inflige
  alors aussi 1 dégât à son contrôleur par Toxine. Les héros ne portent jamais de Toxine : ils reçoivent des dégâts.
- Une unité qui **change de forme** (copie, switch) repart à neuf : plus de Toxine. Une unité volée
  garde les siennes (elle les subit à son nouveau tour). Une unité renvoyée en main ou exilée les perd.
- Seul le marqueur **se déplace** à la mort ; les effets en créent de nouveaux (le total n'est donc pas constant).

**Bot.** Une unité avec Toxine vaut moins (sa vie restante réelle) et ne vaut plus la peine d'être
attaquée si elle meurt de toute façon. `unitThreat()` tient compte du tic.

**Interface.** Une pastille verte avec le nombre de marqueurs ; la fiche d'unité dit combien de PV
elle va perdre à son prochain tour.

**Tests.** Tic avant la pioche ; Bouclier absorbe un tour ; Venin non déclenché ; transfert à la mort
sur une survivante ; disparition sans survivante ; chaîne de morts ; copie/switch effacent ; Vase +
Toxine concentre sur la dernière unité ; Épidémie compte les marqueurs **après** la pose (2 par unité)
et les laisse en place ; le héros adverse ne porte jamais de marqueur. **Taille : M.**

### 4.5 Meule, défausse volontaire, Ex-libris

**Règle.**
- **Meuler** : la carte du dessus de la pioche va à la défausse. **Défausser** : une carte de la main
  va à la défausse (le joueur la choisit en manuel, le bot choisit sa moins utile).
- **Ex-libris** : quand une carte à Ex-libris arrive dans ta défausse, par n'importe quel chemin
  (jouée, morte, meulée, défaussée), **un exemplaire** entre dans ta **pile de fatigue** — une seule
  fois par carte.

**Moteur.**
- **La pile de fatigue devient propre à chaque camp.** À la création du camp (`makeSide`), il en
  reçoit une **copie** de la pile commune (`fatiguePile()`). Annotation, Index, Ex-libris travaillent
  sur **cette copie** : « tes cartes de fatigue ». C'est la seule façon de renforcer sans toucher
  l'adversaire, les PNJ compris. `carteDeFatigue()` lit la copie du camp ; `peutAgir()` aussi.
- Une zone `fatigue` de plus pour `renforce_les_cartes` (Annotation), et une source `fatigue` pour
  `cree` (Index : « crée une carte de ta pile, +2/+2 »).
- Mot-clé `ex_libris`. Validation `ex-libris-risque` : refusé sur une carte dont une branche
  est une gestion de masse (`detruit`/`dmg` sur toutes les unités adverses), et signalé au-delà de
  2 par héros.
- Les cartes ajoutées à la pile gardent leur niveau de résolution au moment de l'entrée.

**Bot.** Le bot défausse la carte de moindre `cardValue()`. Il ne sait pas encore qu'atteindre la
fatigue en premier est un plan : à écrire quand les cartes existent.

**Tests.** Meule déplace du dessus ; l'événement part ; Ex-libris entre une seule fois ; Annotation ne
touche que ma copie ; la pile de l'adversaire est intacte ; une carte exilée (Reprise) n'ajoute rien de plus ;
Impératrice (cartes qui retournent en pioche) n'ajoute rien. **Taille : L** (c'est le gros
changement : la pile devient par camp).

### 4.6 Registre

**Règle.** Le Registre est une liste, **partagée par les deux camps**, des cartes **jouées** pendant
le combat (sorts et alliés, depuis la main, par Reprise ou relancés). Il ne reçoit pas les jetons,
les cartes posées sur le plateau, ni les cartes créées sans être jouées. Un type compte une fois ; chaque
carte « Type : tous » compte pour **+1** et fait partager un type à toute carte typée.

**Moteur.**
- `B.registre = { cartes: [...], types: Set }`, vide au début. Une carte y est ajoutée à la fin de
  `playCard`, **après** ses effets (une carte ne se voit donc pas elle-même).
- Compteur `typesRegistre` (types nommés distincts + nombre de cartes « Type : tous »). Il passe par
  `COUNTERS`, donc caractéristiques variables, montants, bot et builder le lisent.
- Filtre de cartes `typeDuRegistre` (« partage un type avec une carte du Registre », via `partageType`).
- Source de type `registre` dans `TYPE_SOURCES` (Mimétisme, Index du Registre).
- Événement `typeNouveau` : « quand un type entre pour la première fois ». Une carte qui apporte deux
  types nouveaux le déclenche deux fois ; **une carte « Type : tous » le déclenche aussi** (elle
  ajoute 1 au compteur). Garde `registre` pour Greffier et Archiviste Impitoyable : « cette carte partage
  un type avec le Registre » (évaluée **avant** son inscription).
- `enregistre` (Copiste) : ajoute au Registre une carte au hasard de la main, sans la jouer.
- **Rétrospective** : pour chaque type nommé, tire une carte du Registre de ce type, puis les joue
  **gratuitement**, dans l'ordre, avec `autoTarget`. Les cartes sont lues avec **le niveau de leur
  propriétaire** (le Registre garde la carte résolue). Une carte relancée n'est ni mise en défausse
  ni exilée (c'est une copie), mais entre au Registre. **Rétrospective n'en relance jamais une autre**
  (règle lisible : pas de plafond arbitraire).
- Le Registre est lisible par le journal (`etat`) et copié par `cloneBattle`.

**Bot.** Un nouveau compteur à valoriser ; le bot évalue Rétrospective à l'espérance de la valeur
de ses tirages.

**Interface.** Une liste du Registre (types, avec une pastille pour chaque « Type : tous »), ouverte
depuis le combat.

**Tests.** Une carte jouée entre une fois ; les jetons n'entrent pas ; « Type : tous » compte +1 ;
`typeNouveau` n'est pas rejoué pour un type déjà là ; pas d'auto-référence ; Rétrospective ne se
relance pas ; niveaux de propriétaire conservés. **Taille : M.**

### 4.7 Règles transversales

- **Aucun plafond arbitraire** : chaque boucle se ferme par une règle lisible (Reprise exile ;
  une carte ne se pistre qu'une fois ; Ex-libris une seule fois par carte ; Rétrospective n'en
  relance pas d'autre ; la Toxine déplace et ne grossit pas par elle-même). Les coupe-circuits existants
  (`maxRecyclageParTour`, `maxPiochesAVideParTour`, `maxTurns`, `eventDepth`) restent derniers recours.
- **Un nouvel événement = une entrée de registre + un `fireEvent`** au bon endroit, comme décrit dans `CLAUDE.md`.
- Chaque mécanique ajoute une **règle de validation**, un **compteur** si besoin, et ses **tests** dans
  `test-triggers.mjs` ; le bot (`test-ai.mjs`) a un test par mécanique qu'il doit valoriser.

### 4.8 Fenêtre de zone (interface)

Aujourd'hui l'écran de combat n'affiche que deux compteurs (`Pioche N · Défausse N`,
`game/src/ui/battle.js:237`) et aucune zone ne s'ouvre. Il faut une fenêtre réutilisable, inspirée
d'Arena : **elle affiche ce qui est pertinent, éclaire ce qu'on peut choisir et grise le reste**.

| Appelant | Ce qui s'affiche | Éclairé | Grisé |
|---|---|---|---|
| Charogne (lecture seule) | la défausse adverse | ses X dernières cartes, celles qui vont être mangées | le reste |
| Reprise | ta défausse | sorts à Reprise payables | le reste |
| Pile de fatigue | ta pile personnelle | cartes Ex-libris | le reste |
| Pistage | la main adverse (dos des cartes) | pastilles 🐾 | — |
| Registre | types et cartes jouées | pastille « Type : tous » | — |

**Taille : M.** Aucune mécanique ne la requiert pour tourner, mais Reprise est
inutilisable à la main sans elle (il faut choisir le sort à lancer) ; pour Charogne elle ne fait que montrer ce qui va être mangé.

## 5. Ordre de codage proposé

1. ✅ Briques communes (4.0) : exil, « met à la défausse », main illimitée, événements, carte sujet, « + » de la caractéristique variable.
2. ✅ **Reprise** (4.2) et la fenêtre de zone.
3. **Charogne** (4.3) et l'**Appât** (4.3 bis, sur la pile de fatigue commune en attendant la pile par camp).
4. **Pistage** (4.1).
5. **Toxine** (4.4).
6. **Pile de fatigue par camp + Ex-libris** (4.5) — le plus invasif, donc après que le reste est stable.
7. **Registre** (4.6).
8. Bot, validations, audit ; puis `heros-v3-paliers.mjs` et `gen-heros-v3.mjs` (sur le modèle de la V2).
9. Mesures : `check-decks`, `matchups --taille 3`, `--archetypes`, `test-situations`.

## 6. Vérification du calendrier

Le tableau des paliers de chaque héros (section 2) est relu par script : par pile, les niveaux
Éveil sont une permutation de 2-6, les Verbes de 7-11, les Pivots de 12-16 ; les sommets sont
17, 18, 19, 20 une seule fois chacun ; chaque carte n'a qu'un palier purement numérique.
Résultat de la relecture du 8 octobre 2026 : les six héros passent (10 cartes chacun, jamais plus de
2 cartes qui changent au même niveau, sommets 17/18/19/20 une fois chacun). Ce contrôle ne remplace
pas `audit-paliers.mjs`, qui ne verra ces héros qu'une fois écrits dans les données.

## 7. Décisions du 8 octobre 2026 (réponses)

1. **Charogne** ne mange que les cartes de l'adversaire : les dernières de sa défausse, sans choix. (Corrigé
   dans la journée : d'abord « peu importe la défausse », puis exclusivement l'adversaire, pour que l'archétype
   se mélange avec n'importe quoi.)
2. **« Type : tous »** compte +1 dans le Registre et déclenche « quand un type entre pour la première fois ». Oui.
3. **Épidémie** : pose d'abord 2 Toxines sur chaque unité adverse, puis chaque unité adverse inflige à son contrôleur autant de blessures que de Toxines. Les Toxines restent.
4. **La main n'a pas de plafond.** Le plafond actuel (`handMax: 8`) est à retirer.
5. **Le Grand Philtre n'a pas de Reprise** (le sommet 18 est donné à Chaudron).

6. **Appât** : on ne meule jamais le vrai deck de l'adversaire. Morrigane fabrique des copies de la pile de fatigue adverse dans sa défausse (Rapace Maigre, Pie Voleuse, Charnier).

## 8. Questions ouvertes

1. **Main illimitée** : c'est un changement d'équilibrage (4.0). À mesurer dès que la brique existe.
2. **Sommet 20 de Crapaud Cornu** (chaque Toxine brûle aussi le héros) : brouillon fort, à jeter si besoin.
3. **Sommet 18 de Chaudron** (« quand tu défausses, pioche ») : à mesurer avec Chaton Apprenti.
4. **Sprite de Pastiche** : un nouveau caméléon à dessiner.
5. **Appât et récursion adverse** : les alliés de fatigue nourrissent aussi Rappel (Médor) et Impératrice nocturne (Athéna). À surveiller en mesure.
