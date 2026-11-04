# Pilote — courbes d'impact des améliorations (4 nov. 2026)

**But :** vérifier par la mesure l'intuition « un cran de stat vaut beaucoup à 0 et de moins en moins ensuite »,
avant de construire des lignes d'amélioration jusqu'au niveau 200.

## Méthode (jetable : à refaire proprement dans `scripts/`, avec `enParallele()`)

- Une amélioration = **un cran sur une métrique d'une carte** (ou du camp), toutes choses égales par ailleurs.
- Mesure : variation du taux de victoire d'une équipe de 3 héros contre **24 trios adverses fixes**, niveau de
  palier 10 des deux côtés, bot `normal` (avant tout travail sur le bot), **3 600 parties par bras**, côtés
  alternés. Les deux bras (avant / après) utilisent **les mêmes tirages** (graine commune) : l'écart est mesuré
  partie par partie, d'où des intervalles étroits. Intervalles ci-dessous : 95 %.
- Trois équipes testées : T1 = Médor, Corax, Bulle (taux de base 66 %) ; T2 = Athéna, Croc, Reinette (52 %) ;
  T3 = Félix, Mistigri, Sirocco (50 %).

## Résultats (variation du taux de victoire, en points)

| Cran | Δ (points) | ± |
|---|---|---|
| Chiot de Garde (1/2, coût 2) : coût 2→1 | +2,08 | 0,68 |
| Ombre Feutrée (2/2, coût 2) : coût 2→1 | +2,47 | 0,75 |
| Chouette Érudite (coût 4, −1 aux cartes de la main) : coût 4→3 | **+5,14** | 0,87 |
| Étude (coût 1) : coût 1→0 | +1,28 | 0,60 |
| Griffure (coût 1) : coût 1→0 | +1,22 | 0,55 |
| Grand Corbeau (coût 7) : coût 7→6 | −0,75 | 0,47 |
| Impératrice Nocturne (coût 8) : coût 8→7 | −0,22 | 0,33 |
| Impératrice Nocturne : coût 8→6 | −0,92 | 0,54 |
| Chiot de Garde (1/2) : attaque +1 | +0,89 | 0,46 |
| Chat de Gouttière (1/2) : attaque +1 | +1,69 | 0,59 |
| Mage de l'étincelle (2/2) : attaque +1 | +0,61 | 0,44 |
| Grand Corbeau (6/6) : attaque +1 | +0,06 | 0,19 |
| Grand Corbeau (6/6) : PV +1 | −0,03 | 0,12 |
| Chiot de Garde : PV +1 | +0,50 | 0,43 |
| Chat de Gouttière : PV +1 | +0,86 | 0,43 |
| Griffure : dégâts 2→3 | +1,47 | 0,40 |
| Regard Perçant : dégâts 4→5 | −0,06 | 0,33 |
| Corbeau Espion (2/2, pioche en attaquant) : +Charge | **+2,81** | 0,83 |
| Grand Corbeau (6/6) : +Charge | +1,17 | 0,45 |
| **Héros : PV +1** | **+1,47** | 0,39 |
| Héros : PV +3 | +3,67 | 0,61 |
| Héros : PV +6 | +6,97 | 0,83 |
| **Héros : 1 carte de départ en plus** | **+6,81** | 1,37 |
| Héros : mana max 10→11 | 0,00 exact | — |

## Ce que ça dit

- **Confirmé :** le cran de stat s'effondre quand la carte est grosse (attaque +1 : +1,7 sur un 1/2, +0,06 sur un
  6/6) ; réduire le coût d'une carte à 7 ou 8 mana ne change rien (−0,2 à −0,9, dans le bruit ou légèrement négatif).
- **Contredit :** « Charge pèse peu sur une petite unité ». Charge vaut +2,8 sur le Corbeau Espion (2/2) et +1,2 sur
  le Grand Corbeau (6/6) : l'Espion pioche **quand il attaque**, Charge le fait attaquer tout de suite. L'impact
  d'un mot-clé dépend du **déclencheur de la carte**, pas de sa taille.
- **Des pics dépendants de la carte :** Chouette Érudite 4→3 vaut +5,1, plus que toute amélioration de stat. Une
  carte qui réduit le coût des autres est un levier à part. Il faut un **indicateur de sensibilité par carte**.
- **Les PV du héros ne sont pas « accessoires » :** avec 20 PV de base, 1 PV vaut +1,5 point (autant qu'un dégât de
  plus sur Griffure), et c'est à peu près linéaire jusqu'à +6 (+7 points). Une **carte de départ en plus vaut
  +6,8 points** : un levier à rationner très fortement.
- **À vérifier :** le mana max 10→11 donne exactement 0,00 sur 3 600 parties. Soit le plafond n'est jamais atteint
  avant la fin des parties (cohérent avec « le mana max n'a presque aucun effet au-delà de 10 »), soit le champ est
  ignoré par le moteur. Ne pas conclure avant d'avoir regardé.

## Limites

- Un seul niveau de palier (10), trois équipes, un bot qui ne joue pas bien les combos (l'impact des cartes de
  combo est **sous-estimé**) : **refaire la mesure après le travail sur le bot**.
- Taux de victoire saturant : l'équipe T1 à 66 % compresse les écarts. Préférer une échelle en log-cotes (type Elo)
  et des adversaires choisis pour garder l'équipe testée près de 50 %.
- Un cran isolé ne dit rien des **cumuls** (le deuxième +1 d'attaque sur la même carte vaut moins que le premier) :
  il faut mesurer des échelles de crans, pas des crans seuls.
