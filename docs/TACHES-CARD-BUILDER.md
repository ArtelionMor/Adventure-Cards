# Tâches pour le Card Builder (refonte boutique, 3 nov. 2026)

> Ce que Claude **ne fait pas** : les cartes vivent sur le Pi et s'éditent dans le Card Builder. Cette liste grossit à chaque lot.
> Source : Sheet « Config Adventure-Cards », onglet `~boutique_cartes` (colonnes `rarete_proposee`, `name_en`).

## Lot 1 — raretés : les mythiques deviennent des cartes switch (proposition provisoire)
Le **catalogue économique du noyau** (`core/config/catalog.test.json`) applique déjà la proposition. Les cartes du jeu (`characters.data.js`)
n'ont pas à porter ces raretés tant que le rééquilibrage n'est pas fait ; à reporter quand tu le décideras. Pour chaque héros : la switch la plus
rare passe mythique, l'ancienne mythique de base prend sa rareté.

| Héros | Mythique avant (base) → nouvelle rareté | Nouvelle mythique (switch) |
|---|---|---|
| Pompon | Grand-Père Lapin → epic | Chef de Clapier |
| Caramel | Doyenne du Clapier → epic | Grand Bélier |
| Séléné | Reine de Pleine Lune → epic | Lapin d'Éclipse |
| Médor | Retrouvailles → epic | Chef de Bataillon |
| Felix | Neuf Vies → epic | Chat Souricier |
| Corax | Grand Corbeau → rare | Armée aux ailes noires (⚠ jugée trop faible pour l'être) |
| Bulle | Crapaud-Rocher → epic | Prince Grenouille |
| Athena | Impératrice Nocturne → legendary | Colère d'Athéna |
| Miracle | Gobeur de Mouches → epic | Hypnose |
| Croc | Éclaireur Hurleur → epic | Lune de Sang |
| Mistigri | Parrain des Ruelles → epic | Maître Espion |
| Sirocco | Oiseau Blindé → epic | Corbeau Tempête |
| Reinette | Doyen du Marais → legendary | Roi Crapaud |
| Morphée | Grand Veilleur → legendary | Incarnation de Minuit |
| Mirage | Danseur de Gala → epic | Chimère |
| Patou | Enquête → epic | Agent W |
| Mélusine | Grand Philtre → epic | Sabbat |
| Morrigane | Seigneur des Charognes → legendary | Colosse d'Os |
| Dendrobate | Dendrobate Royale → epic | Épidémie |
| Hulotte | Chancelière → epic | Grand Chancelier |
| Pastiche | Caméléon Juge → legendary | Rétrospective |

À vérifier par la mesure (hors lot) : les mythiques doivent retourner les parties (Retrouvailles demande le bon timing) ; l'Éclaireur Fou (`rush1`) met trop de pression trop vite.

## Doublons de noms (à corriger dans le Builder, déjà corrigés dans la Sheet)
Gardien des Rayons, Complice, Maléfice, Jeune Caméléon.

## Identifiants (au lot 6, quand les textes passeront en anglais)
- Les noms anglais des cartes : colonne `name_en` de `~boutique_cartes`.
- L'archétype « Contrôle » s'écrit `Control` dans le noyau ; s'il est écrit en dur sur des cartes du Builder, le renommer.
- Les textes figés des cartes se régénèrent dans le Builder : ajouté ici au lot 6.

## Lot 6 — passage à l'anglais : ce qui reste dans les DONNÉES (à faire dans le Card Builder, ou dans la Sheet)
Le code de l'interface est en anglais ; ce qui vient des **données** ne l'est pas encore, et se lit à l'écran :
- **Les noms de cartes** (colonne `name_en` de `~boutique_cartes`, 210 cartes) : « Lapereau Farceur », « Souris – Souriceau », « Corbeau Espion », « Chiot de Garde »…
- **Les noms d'adversaires** (« Souris chapardeuses », « Chat de ruelle »…) et les **noms des héros accentués** (« Félix » / Felix, « Athéna » / Athena) ; les descriptions (`role`) des héros.
- **Les types de créature** (« Type : Souris », « Type : Chien »…) : valeurs du mot-clé `type:` sur chaque carte — table dans `~boutique_glossaire` (Souris → Mouse, Chien → Dog…).
- **Les textes figés des cartes** (cri de guerre, râle…) : ils se régénèrent d'après `describeEffect` (déjà en anglais pour les effets les plus courants) ; une carte dont le texte est écrit à la main dans le Builder reste française.
- **Les fiches d'arène** (`role`, `question`, `reponse`, `punit`, `signature`) : onglet `encounters` de la Sheet et `config/arenes.js` ; les libellés « Aggro · Turbo » viennent de la même source.
- **Les identifiants de rareté et d'archétype** dans les cartes du jeu (`characters.data.js`) ne sont pas touchés.
