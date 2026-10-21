# Les cartes des adversaires

> 16 octobre 2026. **44 cartes libres** (`CHARACTER_DATA.library`, ids `adv_…`) pour les decks des 14 adversaires
> des arènes. Source : `scripts/lib/cartes-adversaires.mjs`, posées par `scripts/gen-heros-v3.mjs` (qui réécrit
> aussi les decks des 9 adversaires du builder) ; les decks des 5 adversaires provisoires sont dans
> `game/src/config/ennemis.js`. **Proposées, pas validées** par le game designer.

## Le principe
- **Une identité mécanique par adversaire**, tirée de sa fiche d'arène (`config/arenes.js` : la question qu'il pose,
  la réponse, ce qu'il punit). Chaque mécanique est portée par **2 à 4 cartes** de son deck, jamais une seule
  (cf. « Pool réduit »).
- **Les cartes s'ajoutent aux decks existants** : on garde les cartes génériques qui faisaient la base (Brutes,
  Éclairs, Souffles) et on remplace une partie des exemplaires. Taille des decks inchangée, sauf le Loup (8 → 10).
- **Paliers** : 2/5/10 pour un allié (+0/+1, +1/+0, +1/+2), 3/6/11 pour un sort (effet +1, coût -1, effet +2), ou
  « coût -1 au niveau 6 » pour un sort sans montant. C'est ce qui donne du sens à `card_level` dans les profils de
  progression des adversaires (onglet `enemy_progress_profile`).
- **Pas d'unité à 0 d'attaque**, pas de vol de carte, pas d'information cachée.

## Par adversaire

| Adversaire | Archétype | Identité | Cartes (coût, stats) |
|---|---|---|---|
| ~~**Lapin Chapardeur**~~ (`rabbit1`) — **remplacé le 21 oct. 2026 par les Souris du Potager** (`docs/TUTORIEL.md`, écrites par `scripts/gen-lapins.mjs`) ; ses cartes restent sans deck | Aggro Tempo, tutoriel | Des cartes lisibles, qui apprennent à frapper le héros | **Terrier** (2, 2/1 — Râle : invoque un Lapereau 1/1) · **Sauteur de haies** (3, 3/2 Passe-Murailles) · **Carotte volée** (1, sort — pioche 1, +1 mana au prochain tour) |
| **Chat de Ruelle** (`cat1`) | Aggro Turbo | La course aux dégâts : il ne regarde pas ton plateau | **Matou de gouttière** (2, 3/1 Charge — quand il attaque, 1 au héros adverse) · **Caïd du quartier** (4, 3/3 — le héros adverse subit 1 de plus) · **Course effrénée** (2, sort — +2/+0 et Charge à un allié, pioche 1) |
| **Corbeau Rieur** (`crow1`) | Aggro MidRange | La menace qui grandit : tue-la tôt | **Glaneur** (2, 1/2 — fin de tour : +1/+1) · **Nuée** (4, ?/3 — attaque = tes alliés en jeu +1) · **Rire moqueur** (2, sort — au choix : 3 à une unité adverse, ou +2/+2 à un allié) |
| **Grand Méchant Loup** (`wolf`) | Contrôle Soft (boss 1) | Prophylaxie : punit le joueur qui pose tout | **Hurlement** (3, sort — 2 à toutes les unités adverses, +2 armure) · **Mère de la meute** (5, 4/5 Provocation — quand l'adversaire joue un allié, 1 dégât à cet allié) · **Garde à fourrure** (3, 2/3 Provocation Bouclier) · **Flair** (1, sort — piste 2 cartes, pioche 1) |
| **Crapaud Baveux** (`frog1`) | Contrôle Hard | Venin et Toxine : quoi échanger ? | **Bave** (1, sort — 2 Toxines) · **Têtard venimeux** (1, 1/1 Venin — Râle : 1 Toxine au hasard) · **Roi du marais** (4, 3/4 — tes Toxines en posent 1 de plus ; une unité adverse toxinée meurt → pioche 1) |
| **Pieuvre Pirate** (`octo1`) | Contrôle Pillow Fort | Le mur : il faut passer par-dessus | **Ancre rouillée** (3, 2/5 Provocation — tes autres alliés +0/+1) · **Nuage d'encre** (5, 3/5 Provocation — l'adversaire n'attaque pas avec plus de 2 unités par tour) · **Coffre au trésor** (2, sort — +4 armure, pioche un allié) |
| **Capitaine Grenouille** (`frogboss`) | Contrôle Hard (boss 2) | Le 1-pour-1 qui revient : garde de quoi rejouer | **À l'abordage** (3, sort — détruit une unité adverse, Reprise) · **Canonnade** (4, sort — 3 à toutes les unités adverses) · **Quartier-maître** (3, 2/4 — +2 armure ; quand tu lances un sort depuis ta défausse, pioche 1) |
| **Renard des Neiges** (`fox1`) | Aggro Tempo | Il choisit qui bloque à ta place | **Bourrasque** (2, sort — renvoie une unité adverse en main) · **Renard de givre** (3, 3/2 Élusif — une unité adverse -2/-0) · **Meneur de traque** (4, 3/3 Charge — quand une de tes unités attaque, +1/+0) |
| **Grand-Duc** (`owlboss`) | Contrôle Hard (boss final) | Ses moteurs exigent une réponse | **Sentence** (5, sort — coûte 1 de moins par unité adverse ; détruit une unité adverse) · **Archiviste** (4, 2/5 — tu pioches 1 de plus par tour) · **Éclipse** (6, 5/6 — l'adversaire a 1 mana de moins par tour) |
| **Paresseux Bâtisseur** (`sloth1`) | Contrôle Pillow Fort | Se blinder, puis gagner avec le Chien de la fatigue | **Hamac** (2, 1/5 Provocation — fin de tour : soigne 2 ton héros) · **Grande sieste** (3, sort — +5 armure, tes alliés +0/+2) · **Coussin géant** (4, 2/6 Provocation — ton héros subit 1 de moins) |
| **Rouge-Gorge Fou** (`robin1`) | Aggro Turbo | Charges et brûlures, sans regarder | **Piqué** (1, sort — 2 au héros adverse, Reprise) · **Chant de l'aube** (2, 2/1 Charge — quand tu lances un sort, +1/+0) · **Kamikaze** (1, 2/1 Charge — Râle : 1 au héros adverse) |
| **Kitsune Farceur** (`panda1`) | Combo Turbo | Copier, refléter, enchaîner les sorts | **Illusion** (2, sort — crée un Miroir, pioche 1) · **Métamorphe** (3, 2/2 Type : tous — devient la copie d'une unité) · **Neuf Queues** (7, 5/5 — coûte 1 de moins par sort joué ; Râle : crée 2 sorts au hasard) |
| **Chèvre Têtue** (`goat1`) | Contrôle Fatigue | Pousser l'adversaire dans la fatigue | **Rumination** (2, sort — l'adversaire meule 2, +2 armure) · **Bouquetin obstiné** (3, 2/5 Provocation Ex-libris) · **Vieille bique** (5, 3/6 — quand l'adversaire pioche dans la fatigue, il perd 2 PV) · **Mange-tout** (2, 2/3 — quand l'adversaire meule, +1/+1) |
| **Pieuvre Robot** (`octo2`) | Aggro MidRange (examen) | Chaque mort en face la nourrit | **Tentacule mécanique** (2, 2/2 — quand une unité adverse meurt, +1/+1) · **Recycleuse** (4, 3/3 — Charogne 2) · **Chaîne de montage** (5, sort — pose 2 alliés au hasard de ta pioche) |

## Les mécaniques employées
- **Mots-clés** : Provocation, Charge, Venin, **Bouclier** (sa première carte), Élusif, Passe-Murailles, Type : tous,
  Reprise, Ex-libris, coût variable, caractéristique variable, Miroir (créé).
- **Effets** : dégâts, destruction, soin, renfort et affaiblissement, pioche, **pioche d'un allié** (jamais utilisée
  avant), armure, mana au prochain tour, création (précise et au hasard), copie, renvoi en main, pose depuis la
  pioche, meule de l'adversaire, Toxine, Charogne, Pistage, invocation, choix.
- **Moments** : à la pose, râle, fin de tour, et neuf événements dont quatre jamais utilisés avant
  (`on_ally_foe`, `on_meule_foe`, `on_fatigue_foe`, `on_unitDies_foe` côté adverse), avec une garde.
- **Statiques** : dégâts du héros (dans les deux sens), montant des Toxines, **limite d'attaques**, **pioche du
  tour**, **mana du tour** (ces trois-là jamais utilisés avant) ; une aura.
- **Pas employés** : Appât, Contagion, Épidémie, le Registre, l'exil, la pioche d'une carte précise, « les Toxines
  brûlent le héros », la prise de contrôle (privation trop forte), le switch (une carte libre n'a pas d'autre face).

## Mesure (16 oct. 2026)
`node scripts/simulate.mjs 10 --niveau 1 --paliers 3,3,3` : les 816 trios, héros niveau 1, arènes niveau 1, avant → après.
10 parties par trio : une case seule se lit à ± 30 points, la **médiane** est le chiffre à regarder.

| Adversaire | Médiane avant → après | Meilleur trio avant → après |
|---|---|---|
| Lapin, Chat, Rouge-Gorge | 100 → 100 | 100 → 100 |
| Corbeau | 100 → **80** | 100 → 100 |
| **Loup (boss 1)** | 50 → **10** | 100 → 90 |
| Crapaud | 60 → 60 | 100 → 100 |
| Pieuvre Pirate | 40 → 50 | 100 → 100 |
| Capitaine Grenouille | 0 → 0 | 60 → 30 |
| Renard | 50 → **70** | 100 → 100 |
| Grand-Duc | 0 → 0 | 40 → 30 |
| Paresseux | 60 → **80** | 100 → 100 |
| Kitsune | 100 → 90 | 100 → 100 |
| Chèvre | 80 → 90 | 100 → 100 |
| Pieuvre Robot | 40 → 40 | 100 → 100 |

Chaque arène garde au moins un trio gagnant. Le Loup se durcit nettement (Mère de la meute + Hurlement punissent
les plateaux larges, c'est sa question) ; le Renard et le Paresseux s'adoucissent (leurs nouvelles cartes remplacent
des Colosses et des Brutes).

## Ce qui reste ouvert
1. **Le bot ne pose jamais Nuage d'encre.** Il lit à l'envers les statiques qui imposent une **limite** (« pas plus de
   X ») : `staticsValue` (`combat/ai.js`) prend le `sens` absent pour « de moins », et juge donc la limite mauvaise pour
   celui qui l'impose. Le Hiboux de la domination du Grand-Duc (limite de cartes jouées) a le même défaut. Cas
   limite du bot, à trancher.
2. **Les profils de progression** donnent `card_level` à 5 adversaires seulement (ceux qui avaient des paliers). Avec
   ces cartes, tous en ont : `card_level` pourrait entrer dans les 9 autres profils.
3. **Les textes et les noms** sont des propositions ; les images reprennent les portraits existants.
