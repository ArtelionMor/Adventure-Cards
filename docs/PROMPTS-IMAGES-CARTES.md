# Prompts des images de cartes

> **Généré** par `python scripts/gen-art.py --liste <export.json> --prompts <ce fichier>` à partir de
> `scripts/art-sujets.json` (le sujet de chaque carte, à corriger là-bas puis regénérer ce fichier).

**Pour chaque carte :**
1. Dans Gemini, joins toujours les MÊMES 10 images, SÉPARÉES (jamais en une planche : Gemini l'éditerait) :
   `python scripts/gen-art.py --references` les range dans `art-sortie/references-style/`. Puis colle le prompt du bloc.
2. Télécharge l'image et nomme-la comme indiqué (`Fichier`), dans un même dossier.
3. `python scripts/gen-art.py --detourer <dossier>` retire le rose (sans Figma ni Icons8) → `art-sortie/detoure/`.
   Il signale les rendus à refaire : sujet coupé par le cadre, fond pas uni, zone rose gardée.
4. Copie le PNG dans `Characters/`, puis `node scripts/gen-sprites.mjs`, et règle le sprite de la carte dans le Card Builder.

✅ = la carte a déjà un portrait dans `Characters/` (le prompt est là au cas où on le refait).

## Médor (Chien) — Gardien — tient la ligne / Appelle la meute

### Chiot de Garde  ·  allié 1/2, 2 mana  ·  base  ·  ✅ portrait déjà là
> Râle d'agonie : Invoque un Grand Frère 2/2

```
Dans ce style graphique, sur fond rose, dessine un chiot de garde, berger allemand, avec un haut bonnet à poils noir de garde royal et une veste rouge.
```

Fichier : `Dog Chiot de Garde.png`

### Chien de Berger  ·  allié 1/2, 2 mana  ·  base  ·  ✅ portrait déjà là
> Provocation, tes autres alliés ont +0/+1.

```
Dans ce style graphique, sur fond rose, dessine un border collie berger avec une casquette à carreaux et une houlette.
```

Fichier : `Dog Chien de Berger.png`

### Coup de Sifflet  ·  sort, 3 mana  ·  base  ·  ✅ portrait déjà là
> Invoque un Chiot de Garde. Donne +1/+1  à tes alliés.

```
Dans ce style graphique, sur fond rose, dessine le personnage de garde en train de donner un coup de sifflet.
```

Fichier : `Dog Coup de Sifflet.png`

### Retrouvailles  ·  sort, 6 mana  ·  base
> Réanime 5 alliés de ta défausse.

```
Dans ce style graphique, sur fond rose, dessine un chien au regard ému avec un collier en forme de cœur.
```

Fichier : `Dog Retrouvailles.png`

### Meute  ·  allié 2/2, 4 mana  ·  base
> Cri de guerre : invoque un Chiot de Garde et un Toutou enragé.

```
Dans ce style graphique, sur fond rose, dessine un chiot de garde et un petit toutou hargneux côte à côte.
```

Fichier : `Dog Meute.png`

### Toutou enragé  ·  allié 2/1, 2 mana  ·  switch  ·  ✅ portrait déjà là
> Charge.

```
Dans ce style graphique, sur fond rose, dessine un petit chien hargneux aux yeux rouges et aux dents serrées.
```

Fichier : `Dog Toutou enragé.png`

### Chef de Meute  ·  allié 3/3, 5 mana  ·  switch  ·  ✅ portrait déjà là
> Cri de guerre : +1/+1 a tes autres allies.

```
Dans ce style graphique, sur fond rose, dessine un labrador qui est un commandant genre Napoléon.
```

Fichier : `Dog Chef de Meute.png`

### Prince des cabots  ·  allié 0/0, 2 mana  ·  switch  ·  ✅ portrait déjà là
> Force et Vie égales au nombre de Chien sur le terrain

```
Dans ce style graphique, sur fond rose, dessine un Chien Shiba qui est un prince.
```

Fichier : `Dog Prince des cabots.png`

### Clairon de la Meute  ·  allié 1/1, 3 mana  ·  switch
> Donne +2/+0 et Charge à vos alliés

```
Dans ce style graphique, sur fond rose, dessine ce personnage en train de souffler au clairon.
```

Fichier : `Dog Clairon de la Meute.png`

### Toute la Bande  ·  sort, 5 mana  ·  switch
> Invoque un Chef de Meute, un Toutou enragé et un Chiot de Garde.

```
Dans ce style graphique, sur fond rose, dessine un labrador commandant, un chiot de garde et un petit toutou hargneux côte à côte.
```

Fichier : `Dog Toute la Bande.png`

## Felix (Chat) — Mille coupures

### Mage de l'étincelle  ·  allié 2/2, 3 mana  ·  base  ·  ✅ portrait déjà là
> Dès que vous lancez un sort, inflige une blessure à un adversaire

```
Dans ce style graphique, sur fond rose, dessine un chat mage orange avec un chapeau pointu étoilé et une baguette.
```

Fichier : `Cat Mage de l'étincelle.png`

### Chat de Gouttière  ·  allié 1/2, 2 mana  ·  base  ·  ✅ portrait déjà là
> Charge. Quand tu attaques avec une unité : Crée une Griffure

```
Dans ce style graphique, sur fond rose, dessine un chat de gouttière tigré à l'oreille déchirée.
```

Fichier : `Cat Chat de Gouttière.png`

### Griffure  ·  sort, 1 mana  ·  base
> Inflige 2 degats a une unité adverse.

```
Dans ce style graphique, sur fond rose, dessine un chat aux longues griffes argentées bien aiguisées.
```

Fichier : `Cat Griffure.png`

### Neuf Vies  ·  sort, 15 mana  ·  base
> Crée autant de carte "Griffure" que de tour joués.

```
Dans ce style graphique, sur fond rose, dessine un chat avec une auréole dorée et neuf petits cœurs autour du cou.
```

Fichier : `Cat Neuf Vies.png`

### Ombre Feutree  ·  allié 2/2, 2 mana  ·  base
> Les sorts de votre main coûtent 1 de moins.

```
Dans ce style graphique, sur fond rose, dessine un chat fantôme ectoplasme bleu.
```

Fichier : `Cat Ombre Feutree.png`

### Tempête de Patounes  ·  sort, 3 mana  ·  switch
> Inflige X blessures, X étant le nombre sorts lancés cette partie.

```
Dans ce style graphique, sur fond rose, dessine un chat aux énormes pattes rondes avec des coussinets roses.
```

Fichier : `Cat Tempête de Patounes.png`

### Coup de Patte  ·  sort, 1 mana  ·  switch
> Inflige 1 degat.

```
Dans ce style graphique, sur fond rose, dessine un chat espiègle avec une patte levée, le coussinet rose bien visible.
```

Fichier : `Cat Coup de Patte.png`

### Chat Prudent  ·  allié 1/1, 2 mana  ·  switch
> Quand tu lances un sort : Gagnez un armure

```
Dans ce style graphique, sur fond rose, dessine un chat prudent avec un casque de vélo et un petit bouclier.
```

Fichier : `Cat Chat Prudent.png`

### Chat Souricier  ·  allié 1/6, 6 mana  ·  switch
> Charge. Passe-Murailles. Quand vous attaquez, piochez une carte et infligez 2 blessures à un adversaire aléatoire.

```
Dans ce style graphique, sur fond rose, dessine un chat avec une tenue de flûtier.
```

Fichier : `Cat Chat Souricier.png`

### Matou Invocateur  ·  allié 2/3, 5 mana  ·  switch
> Charge. Passe-Murailles. Quand vous lancez un sort, invoquez un Chat 1/1 qui mélange un sort à votre pioche quand il meurt.

```
Dans ce style graphique, sur fond rose, dessine un gros matou en cape de magicien violette et chapeau haut-de-forme.
```

Fichier : `Cat Matou Invocateur.png`

## Corax (Corbeau) — Filou — pioche et degats directs

### Coup de Bec  ·  sort, 1 mana  ·  base
> Inflige 2 degats au heros adverse et pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un corbeau avec un très grand bec pointu, l'air rusé.
```

Fichier : `Crow Coup de Bec.png`

### Corbeau Espion  ·  allié 2/2, 2 mana  ·  base
> Quand tu attaques avec une unité, pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un corbeau espion en trench-coat et chapeau mou, avec une loupe.
```

Fichier : `Crow Corbeau Espion.png`

### Volée de Corbeaux  ·  sort, 4 mana  ·  base
> Inflige 2 degats a toutes les unites adverses.

```
Dans ce style graphique, sur fond rose, dessine trois petits corbeaux noirs côte à côte.
```

Fichier : `Crow Volée de Corbeaux.png`

### Présage  ·  sort, 4 mana  ·  base
> Mélange 10 cartes au hasard dans votre pioche. Pioche 2 cartes.

```
Dans ce style graphique, sur fond rose, dessine un corbeau mystique avec un turban étoilé et un éventail de cartes de tarot.
```

Fichier : `Crow Présage.png`

### Grand Corbeau  ·  allié 6/6, 7 mana  ·  base
> Quand l'adversaire pioche une carte, vous aussi.

```
Dans ce style graphique, sur fond rose, dessine un énorme corbeau majestueux avec une petite couronne de plumes.
```

Fichier : `Crow Grand Corbeau.png`

### Pie Glaneuse  ·  allié 2/2, 2 mana  ·  switch
> Cri de guerre : +2 mana ce tour, puis Piochez une carte

```
Dans ce style graphique, sur fond rose, dessine une pie voleuse avec un collier de perles et une sacoche débordant de bijoux.
```

Fichier : `Crow Pie Glaneuse.png`

### Mauvais Œil  ·  sort, 3 mana  ·  switch
> Inflige 5 degats à une unité adverse.

```
Dans ce style graphique, sur fond rose, dessine un corbeau avec un grand œil rouge brillant, l'air menaçant.
```

Fichier : `Crow Mauvais Œil.png`

### Corneille Gourmande  ·  allié 1/1, 2 mana  ·  switch
> Gagne +1/+1 à chaque fois que tu pioches une carte.

```
Dans ce style graphique, sur fond rose, dessine une corneille ronde et gourmande avec une serviette autour du cou.
```

Fichier : `Crow Corneille Gourmande.png`

### Nid de Corbeaux  ·  allié 1/2, 4 mana  ·  switch
> Cri de guerre : invoque un Corbeau avec "Quand vous piochez une carte, gagne +1/+1". Au début du tour, mélange 2 cartes à ta pioche.

```
Dans ce style graphique, sur fond rose, dessine une corneille maman avec trois petits corbeaux sur le dos.
```

Fichier : `Crow Nid de Corbeaux.png`

### Nuit Sans Lune  ·  sort, 4 mana  ·  switch
> Détruit toutes les unités

```
Dans ce style graphique, sur fond rose, dessine un corbeau noir avec une cape étoilée de nuit, seuls ses yeux jaunes brillent.
```

Fichier : `Crow Nuit Sans Lune.png`

## Bulle (Grenouille) — Venin — use l’adversaire

### Têtard Glouton  ·  allié 1/1, 1 mana  ·  base
> Gagne +1/+1 de plus quand reçoit du renfort.

```
Dans ce style graphique, sur fond rose, dessine un gros têtard goulu avec une serviette autour du cou.
```

Fichier : `Frog Têtard Glouton.png`

### Langue Collante  ·  sort, 2 mana  ·  base
> Choisir : Inflige 2 degats a une unite OU Renforce une unité alliée.

```
Dans ce style graphique, sur fond rose, dessine une grenouille avec une très longue langue rose qui dépasse.
```

Fichier : `Frog Langue Collante.png`

### Grenouille Venimeuse  ·  allié 2/2, 3 mana  ·  base
> Renforce une unité ciblée.

```
Dans ce style graphique, sur fond rose, dessine une grenouille bleu vif aux taches jaune fluo, l'air méchant.
```

Fichier : `Frog Grenouille Venimeuse.png`

### Coulée de Boue  ·  sort, 3 mana  ·  base
> Inflige 2 degats a toutes les unites adverses.

```
Dans ce style graphique, sur fond rose, dessine une grenouille couverte de boue brune.
```

Fichier : `Frog Coulée de Boue.png`

### Crapaud-Rocher  ·  allié 4/6, 5 mana  ·  base
> Provocation.

```
Dans ce style graphique, sur fond rose, dessine un énorme crapaud tout en verrues avec de la mousse sur le dos, comme un rocher.
```

Fichier : `Frog Crapaud-Rocher.png`

### Prince Grenouille  ·  allié 6/6, 6 mana  ·  switch
> Quand il est renforcé, donne +1/+1 à toutes les cartes de la main. Cri de guerre : Crée deux Têtards et les ajoutent à votre main.

```
Dans ce style graphique, sur fond rose, dessine une grenouille princière avec une petite couronne dorée et une cape.
```

Fichier : `Frog Prince Grenouille.png`

### Guérisseuse Gluante  ·  allié 3/3, 3 mana  ·  switch
> Cri de guerre : Soigne une allié de 10 PV et lui donne +1/+1.

```
Dans ce style graphique, sur fond rose, dessine une grenouille guérisseuse avec un bonnet d'infirmière et une trousse de soins.
```

Fichier : `Frog Guérisseuse Gluante.png`

### Grenouille Nourrice  ·  allié 2/5, 2 mana  ·  switch
> Provocation. Râle d'agonie : 3 points d’armure, Crée et pose un Têtard.

```
Dans ce style graphique, sur fond rose, dessine une grosse grenouille maternelle avec un petit têtard dans un lange.
```

Fichier : `Frog Grenouille Nourrice.png`

### Élixir Venimeux  ·  sort, 2 mana  ·  switch
> Donne +2/+2 à un allié et Venin.

```
Dans ce style graphique, sur fond rose, dessine une grenouille alchimiste avec une fiole d'élixir vert.
```

Fichier : `Frog Élixir Venimeux.png`

### Saut  ·  sort, 1 mana  ·  switch
> Un allie gagne +1/+1 et Charge.

```
Dans ce style graphique, sur fond rose, dessine une grenouille avec de gros ressorts sous les pattes.
```

Fichier : `Frog Saut.png`

## Athena (Chouette) — Controle — mana et cartes

### Étude  ·  sort, 1 mana  ·  base
> Pioche une carte et gagne 1 mana au prochain tour.

```
Dans ce style graphique, sur fond rose, dessine une chouette à lunettes rondes avec un livre.
```

Fichier : `Owl Étude.png`

### Chouette Érudite  ·  allié 3/5, 4 mana  ·  base
> Toutes les cartes de ta main coûtent 1 de moins.

```
Dans ce style graphique, sur fond rose, dessine une chouette érudite avec un mortier de docteur sur la tête et un parchemin.
```

Fichier : `Owl Chouette Érudite.png`

### Regard Perçant  ·  sort, 3 mana  ·  base
> Inflige 4 degats.

```
Dans ce style graphique, sur fond rose, dessine une chouette aux yeux immenses et perçants.
```

Fichier : `Owl Regard Perçant.png`

### Chasse Nocturne  ·  sort, 4 mana  ·  base
> Détruit une unité adverse.

```
Dans ce style graphique, sur fond rose, dessine une chouette chasseuse avec un masque de ninja noir.
```

Fichier : `Owl Chasse Nocturne.png`

### Impératrice Nocturne  ·  allié 7/7, 8 mana  ·  base
> Les cartes jouées retournent dans ta pioche. Cri de guerre : remélange toutes les cartes de ta défausse dans ta pioche.

```
Dans ce style graphique, sur fond rose, dessine une chouette impératrice avec une couronne dorée et une grande cape étoilée violette.
```

Fichier : `Owl Impératrice Nocturne.png`

### Bourrasque  ·  sort, 3 mana  ·  switch
> Renvoie une unité adverse dans la main de son propriétaire.

```
Dans ce style graphique, sur fond rose, dessine une chouette aux plumes ébouriffées par le vent.
```

Fichier : `Owl Bourrasque.png`

### Chouette Tourbillon  ·  allié 2/2, 4 mana  ·  switch
> Cri de guerre : Renvoie une unité dans la main de son propriétaire.

```
Dans ce style graphique, sur fond rose, dessine une chouette aux yeux en spirale.
```

Fichier : `Owl Chouette Tourbillon.png`

### Chouette Stoïque  ·  allié 2/2, 5 mana  ·  switch
> Quand vous perdez des points de vie, piochez une carte.

```
Dans ce style graphique, sur fond rose, dessine une chouette stoïque, les ailes croisées, avec un petit pansement sur la tête.
```

Fichier : `Owl Chouette Stoïque.png`

### Colère d'Athéna  ·  sort, 8 mana  ·  switch
> Détruit toutes les unités adverses.

```
Dans ce style graphique, sur fond rose, dessine une chouette en armure de déesse grecque avec un casque à crête.
```

Fichier : `Owl Colère d'Athéna.png`

### Archichouette  ·  allié 8/8, 8 mana  ·  switch
> Quand un joueur pioche une carte, l'adversaire perd trois points de vie.

```
Dans ce style graphique, sur fond rose, dessine une énorme chouette de mage suprême avec un chapeau pointu étoilé et un bâton.
```

Fichier : `Owl Archichouette.png`

## Miracle (Cameleon) — Support Tribal - Améliore et soutien

### Cameleon  ·  allié 1/1, 3 mana  ·  base  ·  ✅ portrait déjà là
> Cri de guerre : Devient la copie d'une carte sur le terrain.

```
Dans ce style graphique, sur fond rose, dessine un petit caméléon vert tout simple.
```

Fichier : `Cameleon Cameleon.png`

### Tour de Passe-Passe  ·  sort, 2 mana  ·  base
> L'unité ciblé se transforme en une carte au hasard de la pioche de son propriétaire.

```
Dans ce style graphique, sur fond rose, dessine un caméléon magicien en haut-de-forme avec une baguette étoilée.
```

Fichier : `Cameleon Tour de Passe-Passe.png`

### Gobeur de Mouches  ·  allié 2/2, 3 mana  ·  base
> Choisir : Inflige une blessure à une unité adverse au hasard, répète sur chaque unité adverse du même type. OU Donne +1/+1 à une unité allié et répète sur chaque unité alliée du même type.

```
Dans ce style graphique, sur fond rose, dessine un caméléon gourmand avec une serviette autour du cou et une mouche sur le nez.
```

Fichier : `Cameleon Gobeur de Mouches.png`

### Découverte  ·  sort, 2 mana  ·  base
> Choisir : Crée une carte du type d'une carte sur le terrain OU à la défausse OU un Miroir.

```
Dans ce style graphique, sur fond rose, dessine un caméléon explorateur avec un chapeau de fouilles et une loupe.
```

Fichier : `Cameleon Découverte.png`

### Volte-Face  ·  sort, 2 mana  ·  base
> Switch une unité.

```
Dans ce style graphique, sur fond rose, dessine un caméléon avec un masque de théâtre souriant d'un côté et grincheux de l'autre.
```

Fichier : `Cameleon Volte-Face.png`

### Maître du Camouflage  ·  allié 3/4, 3 mana  ·  switch
> Donne à tes autres alliés "A tout les types d'unités"

```
Dans ce style graphique, sur fond rose, dessine un caméléon avec un foulard de ninja et des feuilles collées sur le corps.
```

Fichier : `Cameleon Maître du Camouflage.png`

### Hypnose  ·  sort, 5 mana  ·  switch
> Prend le contrôle d'une unité adverse.

```
Dans ce style graphique, sur fond rose, dessine un caméléon aux yeux en spirale hypnotiques avec une montre à gousset.
```

Fichier : `Cameleon Hypnose.png`

### Coup de Langue  ·  sort, 2 mana  ·  switch
> Inflige 2 blessures à une unité et à toutes les unités du même type.

```
Dans ce style graphique, sur fond rose, dessine un caméléon avec une longue langue enroulée comme un fouet.
```

Fichier : `Cameleon Coup de Langue.png`

### Porte-Couleurs  ·  allié 4/4, 5 mana  ·  switch
> Quand vous jouez un allié, les alliés du même type gagnent +1/+1.

```
Dans ce style graphique, sur fond rose, dessine un caméléon porte-drapeau en uniforme avec un étendard multicolore.
```

Fichier : `Cameleon Porte-Couleurs.png`

### Métamorphose Ultime  ·  sort, 5 mana  ·  switch
> Choisissez une unité. Toutes vos unités deviennent des copies de cette unité.

```
Dans ce style graphique, sur fond rose, dessine un énorme caméléon arc-en-ciel majestueux avec une couronne.
```

Fichier : `Cameleon Métamorphose Ultime.png`

## Croc (Chien) — Meute — Aggro Turbo : charge, frappe le héros, sacrifie

### Louveteau Affamé  ·  allié 2/1, 1 mana  ·  base
> Charge.

```
Dans ce style graphique, sur fond rose, dessine un louveteau maigre et affamé avec une gamelle vide.
```

Fichier : `Dog Louveteau Affamé.png`

### Traque  ·  sort, 2 mana  ·  base
> Un allié gagne +2/+1 et Charge.

```
Dans ce style graphique, sur fond rose, dessine un chien de chasse à l'oreille dressée et au museau pointu.
```

Fichier : `Dog Traque.png`

### Rabatteur  ·  allié 2/3, 3 mana  ·  base
> Quand une de tes unités Chien attaque, inflige 1 dégât au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine un chien rabatteur avec une casquette de chasseur et un cor de chasse.
```

Fichier : `Dog Rabatteur.png`

### Meute Affamée  ·  sort, 4 mana  ·  base
> Invoque trois Louveteaux 2/1 avec Charge.

```
Dans ce style graphique, sur fond rose, dessine trois louveteaux gris côte à côte, l'air affamé.
```

Fichier : `Dog Meute Affamée.png`

### Loup Hurleur  ·  allié 5/4, 6 mana  ·  base
> Charge. Cri de guerre : tes autres Chiens gagnent +1/+0.

```
Dans ce style graphique, sur fond rose, dessine un grand loup gris à la fourrure hérissée, la tête levée.
```

Fichier : `Dog Loup Hurleur.png`

### Chiot Pétard  ·  allié 1/1, 1 mana  ·  switch
> Charge. Râle d'agonie : inflige 2 dégâts au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine un chiot avec des bâtons de dynamite sanglés sur le dos.
```

Fichier : `Dog Chiot Pétard.png`

### Curée  ·  sort, 3 mana  ·  switch
> Choisis : inflige au héros adverse 1 dégât par Chien que tu contrôles, +1 — OU tes Chiens gagnent +1/+1.

```
Dans ce style graphique, sur fond rose, dessine un chien avec un énorme os dans la gueule.
```

Fichier : `Dog Curée.png`

### Louve Vengeresse  ·  allié 3/3, 4 mana  ·  switch
> Charge. Quand tu perds une unité, gagne +1/+1.

```
Dans ce style graphique, sur fond rose, dessine une louve avec une cicatrice sur l'œil et des peintures de guerre.
```

Fichier : `Dog Louve Vengeresse.png`

### Festin  ·  sort, 1 mana  ·  switch
> Détruit un de tes alliés. Pioche une carte. Inflige 2 dégâts au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine un chien gourmand avec une serviette au cou et une cuisse de poulet.
```

Fichier : `Dog Festin.png`

### Lune de Sang  ·  sort, 5 mana  ·  switch
> Tes Chiens gagnent +2/+0 et Charge.

```
Dans ce style graphique, sur fond rose, dessine un loup aux yeux rouges lumineux avec un croissant de lune rouge sur le front.
```

Fichier : `Dog Lune de Sang.png`

## Mistigri (Chat) — Maraudeur — Aggro Tempo : des Chats rapides, qui reviennent

### Chaton Fureteur  ·  allié 1/1, 1 mana  ·  base
> Charge. Passe-Murailles. Quand tu lances un sort, gagne +1/+0.

```
Dans ce style graphique, sur fond rose, dessine un chaton avec un masque de voleur.
```

Fichier : `Cat Chaton Fureteur.png`

### Matou Têtu  ·  allié 3/2, 3 mana  ·  base
> Charge. Râle d'agonie : recrée un Matou Têtu dans ta main.

```
Dans ce style graphique, sur fond rose, dessine un vieux matou balafré aux oreilles déchirées, l'air têtu.
```

Fichier : `Cat Matou Têtu.png`

### Griffes Sournoises  ·  sort, 2 mana  ·  base
> Un allié gagne +2/+0 et Passe-Murailles.

```
Dans ce style graphique, sur fond rose, dessine un chat avec des gants noirs d'où dépassent des griffes.
```

Fichier : `Cat Griffes Sournoises.png`

### Cambrioleur  ·  allié 2/3, 3 mana  ·  base
> Charge. Passe-Murailles. Quand il attaque, gagne 1 mana ce tour.

```
Dans ce style graphique, sur fond rose, dessine un chat cambrioleur avec un bonnet de voleur, un masque et un sac de butin.
```

Fichier : `Cat Cambrioleur.png`

### Parrain des Ruelles  ·  allié 5/5, 6 mana  ·  base
> Charge. Passe-Murailles. Quand il attaque, inflige 2 dégâts au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine un gros chat parrain en costume rayé et chapeau mou.
```

Fichier : `Cat Parrain des Ruelles.png`

### Ombre Furtive  ·  allié 2/1, 1 mana  ·  switch
> Élusif. Passe-Murailles. Râle d'agonie : crée une Griffure dans ta main.

```
Dans ce style graphique, sur fond rose, dessine un chat noir tout en ombre aux yeux jaunes fendus.
```

Fichier : `Cat Ombre Furtive.png`

### Mère des Chatons  ·  allié 2/4, 4 mana  ·  switch
> Quand tu perds une unité, invoque un Chaton 1/1 avec Passe-Murailles.

```
Dans ce style graphique, sur fond rose, dessine une chatte maternelle avec trois chatons sur le dos.
```

Fichier : `Cat Mère des Chatons.png`

### Concert Nocturne  ·  sort, 3 mana  ·  switch
> Tes Chats gagnent +1/+1 et Passe-Murailles.

```
Dans ce style graphique, sur fond rose, dessine un chat chanteur avec un petit nœud papillon et un micro.
```

Fichier : `Cat Concert Nocturne.png`

### Tire-Laine  ·  allié 2/1, 2 mana  ·  switch
> Charge. Cri de guerre : pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un chat pickpocket avec une casquette de gavroche et une montre à gousset.
```

Fichier : `Cat Tire-Laine.png`

### Roi des Toits  ·  allié 4/6, 6 mana  ·  switch
> Charge. Passe-Murailles. Tes autres Chats ont +1/+0. Quand tu lances un sort, inflige 1 dégât au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine un chat roi avec une couronne cabossée et une cape déchirée.
```

Fichier : `Cat Roi des Toits.png`

## Sirocco (Faucon) — Rapace — Aggro Tempo : une main pleine, des coups qui comptent

### Aiglon  ·  allié 2/1, 2 mana  ·  base
> Charge. Cri de guerre : les cartes de ta main gagnent +1/+0.

```
Dans ce style graphique, sur fond rose, dessine un jeune aiglon au duvet hérissé avec un petit foulard rouge.
```

Fichier : `Falcon Aiglon.png`

### Piqué  ·  sort, 2 mana  ·  base
> Un allié gagne +X/+0 et Charge, X étant le nombre de cartes dans ta main.

```
Dans ce style graphique, sur fond rose, dessine un faucon avec des lunettes d'aviateur et un casque de pilote.
```

Fichier : `Falcon Piqué.png`

### Faucon Avare  ·  allié 0/3, 3 mana  ·  base
> Son attaque est égale au nombre de cartes dans ta main.

```
Dans ce style graphique, sur fond rose, dessine un faucon avare qui serre un éventail de cartes à jouer contre lui.
```

Fichier : `Falcon Faucon Avare.png`

### Sergent des nuées  ·  allié 2/2, 3 mana  ·  base
> Tes Oiseaux gagnent +2/+1.

```
Dans ce style graphique, sur fond rose, dessine un faucon sergent avec une casquette d'officier et un sifflet.
```

Fichier : `Falcon Sergent des nuées.png`

### Oiseau-Roc  ·  allié 5/5, 6 mana  ·  base
> Quand tu pioches une carte, inflige 1 dégât au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine un oiseau géant légendaire aux plumes dorées.
```

Fichier : `Falcon Oiseau-Roc.png`

### Moineau Messager  ·  allié 1/1, 1 mana  ·  switch
> Élusif. Cri de guerre : pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un petit moineau avec une sacoche de facteur et une lettre dans le bec.
```

Fichier : `Falcon Moineau Messager.png`

### Serres Plongeantes  ·  sort, 1 mana  ·  switch
> Inflige X dégâts à une unité adverse, X étant le nombre de cartes dans ta main.

```
Dans ce style graphique, sur fond rose, dessine un faucon aux grosses serres acérées.
```

Fichier : `Falcon Serres Plongeantes.png`

### Rouge-Gorge Chanceux  ·  allié 1/3, 2 mana  ·  switch
> Quand tu pioches une carte, un de tes alliés au hasard gagne +1/+0.

```
Dans ce style graphique, sur fond rose, dessine un rouge-gorge à la poitrine orange avec un trèfle à quatre feuilles.
```

Fichier : `Falcon Rouge-Gorge Chanceux.png`

### Cri du Faucon  ·  sort, 2 mana  ·  switch
> Les cartes de ta main gagnent +2/+2.

```
Dans ce style graphique, sur fond rose, dessine un faucon avec un porte-voix.
```

Fichier : `Falcon Cri du Faucon.png`

### Faucon Tempête  ·  allié 4/3, 5 mana  ·  switch
> Charge. Élusif. Cri de guerre : inflige X dégâts au héros adverse, X étant le nombre de cartes dans ta main.

```
Dans ce style graphique, sur fond rose, dessine un faucon gris foncé aux yeux électriques.
```

Fichier : `Falcon Faucon Tempête.png`

## Reinette (Grenouille) — Marais — Combo croissance : chaque renfort déclenche quelque chose

### Frai  ·  sort, 2 mana  ·  base
> Invoque deux Têtards 1/1.

```
Dans ce style graphique, sur fond rose, dessine un amas de frai transparent avec deux petits têtards.
```

Fichier : `Frog Frai.png`

### Coasseur  ·  allié 1/3, 2 mana  ·  base
> Quand cette unité reçoit du renfort, inflige 2 dégâts au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine une grenouille avec un énorme sac vocal gonflé.
```

Fichier : `Frog Coasseur.png`

### Crapaud-Buffle  ·  allié 2/5, 4 mana  ·  base
> Provocation. Quand cette unité reçoit du renfort, gagne 3 armures et +1/+1.

```
Dans ce style graphique, sur fond rose, dessine une grenouille-taureau trapue et cuirassée avec un anneau de nez.
```

Fichier : `Frog Crapaud-Buffle.png`

### Pluie Fertile  ·  sort, 3 mana  ·  base
> Tous tes alliés gagnent +1/+1.

```
Dans ce style graphique, sur fond rose, dessine une grenouille avec un parapluie en feuille et de petites pousses sur la tête.
```

Fichier : `Frog Pluie Fertile.png`

### Doyen du Marais  ·  allié 3/5, 5 mana  ·  base
> Début de ton tour : un de tes alliés au hasard gagne +1/+1.

```
Dans ce style graphique, sur fond rose, dessine une très vieille grenouille avec une longue barbe de mousse et un bâton.
```

Fichier : `Frog Doyen du Marais.png`

### Étang Fécond  ·  allié 0/3, 2 mana  ·  switch
> Provocation. Début de ton tour : invoque un Têtard.

```
Dans ce style graphique, sur fond rose, dessine une grenouille endormie avec un petit nénuphar sur la tête et deux têtards sur le dos.
```

Fichier : `Frog Étang Fécond.png`

### Bain de Boue  ·  sort, 2 mana  ·  switch
> Tes Têtards gagnent +2/+2.

```
Dans ce style graphique, sur fond rose, dessine un têtard tout couvert de boue avec une serviette sur la tête.
```

Fichier : `Frog Bain de Boue.png`

### Reine des Nénuphars  ·  allié 2/2, 3 mana  ·  switch
> Quand cette unité reçoit du renfort, crée un Têtard dans ta main.

```
Dans ce style graphique, sur fond rose, dessine une grenouille reine avec une couronne de fleurs de nénuphar roses.
```

Fichier : `Frog Reine des Nénuphars.png`

### Sauteur Électrique  ·  allié 2/2, 3 mana  ·  switch
> Quand cette unité reçoit du renfort, inflige 2 dégâts à un ennemi au hasard.

```
Dans ce style graphique, sur fond rose, dessine une grenouille jaune électrique aux cheveux dressés.
```

Fichier : `Frog Sauteur Électrique.png`

### Roi Crapaud  ·  allié 6/6, 7 mana  ·  switch
> Provocation. Quand cette unité reçoit du renfort, tes autres alliés gagnent +1/+1.

```
Dans ce style graphique, sur fond rose, dessine un énorme crapaud roi avec une grande couronne et un manteau d'hermine.
```

Fichier : `Frog Roi Crapaud.png`

## Morphée (Hibou) — Veilleur — Contrôle Pillow Fort : le temps joue pour lui

### Nid Douillet  ·  allié 0/4, 2 mana  ·  base
> Provocation. Fin de ton tour : ton héros gagne 1 armure.

```
Dans ce style graphique, sur fond rose, dessine un hibou dodu avec un bonnet de nuit, dans un petit nid douillet.
```

Fichier : `Owl Nid Douillet.png`

### Sablier  ·  sort, 3 mana  ·  base
> Inflige au héros adverse autant de dégâts que de tours que tu as joués.

```
Dans ce style graphique, sur fond rose, dessine un hibou avec un grand sablier.
```

Fichier : `Owl Sablier.png`

### Hibou Centenaire  ·  allié 0/0, 5 mana  ·  base
> Provocation. Attaque et vie égales au nombre de tours que tu as joués.

```
Dans ce style graphique, sur fond rose, dessine un très vieux hibou aux plumes blanches et aux sourcils broussailleux avec une canne.
```

Fichier : `Owl Hibou Centenaire.png`

### Hibou Berceur  ·  allié 2/6, 4 mana  ·  base
> Les cartes de l'adversaire coûtent 1 de plus.

```
Dans ce style graphique, sur fond rose, dessine un hibou aux yeux mi-clos avec un petit mobile d'étoiles.
```

Fichier : `Owl Hibou Berceur.png`

### Grand Veilleur  ·  allié 4/9, 7 mana  ·  base
> Provocation. Début de ton tour : inflige 2 dégâts à un ennemi au hasard.

```
Dans ce style graphique, sur fond rose, dessine un immense hibou veilleur en cape à capuche avec une lanterne.
```

Fichier : `Owl Grand Veilleur.png`

### Œuf de Hibou  ·  allié 0/3, 1 mana  ·  switch
> Provocation. Début de ton tour : gagne +1/+1.

```
Dans ce style graphique, sur fond rose, dessine un gros œuf tacheté avec deux petits yeux ronds.
```

Fichier : `Owl Œuf de Hibou.png`

### Songe  ·  sort, 2 mana  ·  switch
> Choisis : pioche une carte — OU gagne 3 mana au prochain tour.

```
Dans ce style graphique, sur fond rose, dessine un hibou endormi avec un bonnet de nuit.
```

Fichier : `Owl Songe.png`

### Coucou  ·  allié 1/5, 3 mana  ·  switch
> Fin de ton tour : inflige 1 dégât au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine un hibou dans une petite horloge à coucou.
```

Fichier : `Owl Coucou.png`

### Oreiller Géant  ·  allié 2/8, 5 mana  ·  switch
> Provocation. Les dégâts subis par ton héros sont réduits de 1.

```
Dans ce style graphique, sur fond rose, dessine un hibou assis sur un énorme oreiller.
```

Fichier : `Owl Oreiller Géant.png`

### Minuit  ·  sort, 14 mana  ·  switch
> Coûte 1 de moins par tour que tu as joué. Inflige 18 dégâts au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine un hibou avec une grande horloge dont les aiguilles marquent minuit.
```

Fichier : `Owl Minuit.png`

## Mirage (Cameleon) — Imitateur — Support : donne à chacun le type qu’il lui faut

### Prisme  ·  allié 1/3, 2 mana  ·  base
> Type : tous. Cri de guerre : un allié gagne Type : tous.

```
Dans ce style graphique, sur fond rose, dessine un caméléon dont le corps est un prisme de verre arc-en-ciel.
```

Fichier : `Cameleon Prisme.png`

### Reflet  ·  sort, 3 mana  ·  base
> Crée 2 Miroirs.

```
Dans ce style graphique, sur fond rose, dessine un caméléon avec un miroir de poche.
```

Fichier : `Cameleon Reflet.png`

### Chœur Chromatique  ·  allié 3/4, 4 mana  ·  base
> Type : tous. Tes autres alliés qui ont un type gagnent +1/+1.

```
Dans ce style graphique, sur fond rose, dessine un caméléon chanteur de chœur avec une partition.
```

Fichier : `Cameleon Chœur Chromatique.png`

### Mue  ·  sort, 2 mana  ·  base
> Renvoie un de tes alliés en main. Tes alliés en main coûtent 1 de moins.

```
Dans ce style graphique, sur fond rose, dessine un caméléon avec une vieille peau pendue comme un manteau sur le dos.
```

Fichier : `Cameleon Mue.png`

### Bal Masqué  ·  sort, 5 mana  ·  base
> Tous tes alliés gagnent +1/+1 et Type : tous.

```
Dans ce style graphique, sur fond rose, dessine un caméléon avec un masque vénitien et une cape à plumes.
```

Fichier : `Cameleon Bal Masqué.png`

### Bourgeon  ·  allié 1/2, 1 mana  ·  switch
> Type : tous. Début de ton tour : gagne +1/+0.

```
Dans ce style graphique, sur fond rose, dessine un tout jeune caméléon aux couleurs pastel avec un bourgeon de fleur sur la tête.
```

Fichier : `Cameleon Bourgeon.png`

### Doublure  ·  sort, 3 mana  ·  switch
> Invoque deux Doubles 2/2 avec Type : tous.

```
Dans ce style graphique, sur fond rose, dessine deux caméléons identiques côte à côte.
```

Fichier : `Cameleon Doublure.png`

### Voile Chromatique  ·  sort, 2 mana  ·  switch
> Un allié gagne +0/+3 et Élusif.

```
Dans ce style graphique, sur fond rose, dessine un caméléon sous un voile irisé translucide.
```

Fichier : `Cameleon Voile Chromatique.png`

### Mime  ·  allié 2/3, 3 mana  ·  switch
> Type : tous. Quand tu joues un allié, il gagne +1/+0 et Type : tous.

```
Dans ce style graphique, sur fond rose, dessine un caméléon mime avec un béret et un maquillage blanc.
```

Fichier : `Cameleon Mime.png`

### Chimère  ·  allié 5/6, 6 mana  ·  switch
> Type : tous. Les unités adverses ont -1/-0.

```
Dans ce style graphique, sur fond rose, dessine un caméléon chimère à tête de lion, avec des ailes de papillon et une queue de dragon.
```

Fichier : `Cameleon Chimère.png`

## Patou (Chien) — Berger — Contrôle Soft : taxe, punit et défausse ce que l’adversaire veut jouer

### Chien de Troupeau  ·  allié 1/2, 1 mana  ·  base
> Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, tu gagnes 3 PV.

```
Dans ce style graphique, sur fond rose, dessine un chien de troupeau avec un petit mouton blanc.
```

Fichier : `Dog Chien de Troupeau.png`

### Berger Vigilant  ·  allié 2/3, 2 mana  ·  base
> Cri de guerre : piste une carte. Les cartes pistées coûtent 2 de plus.

```
Dans ce style graphique, sur fond rose, dessine un chien berger en cape de laine avec une grosse houlette et une longue-vue.
```

Fichier : `Dog Berger Vigilant.png`

### Dressage  ·  sort, 2 mana  ·  base
> Piste une carte. Inflige X dégâts à une unité adverse, X étant le nombre de cartes pistées.

```
Dans ce style graphique, sur fond rose, dessine un chien dressé avec une médaille autour du cou.
```

Fichier : `Dog Dressage.png`

### Patou  ·  allié 3/5, 4 mana  ·  base
> Provocation. Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, il perd 5 PV.

```
Dans ce style graphique, sur fond rose, dessine un grand patou blanc des Pyrénées avec un collier à pointes.
```

Fichier : `Dog Patou.png`

### Chasse au Loup  ·  sort, 5 mana  ·  base
> Détruis une unité adverse. Piste deux cartes.

```
Dans ce style graphique, sur fond rose, dessine un chien en tenue de louvetier avec un cor de chasse.
```

Fichier : `Dog Chasse au Loup.png`

### Chiot Pisteur  ·  allié 2/3, 2 mana  ·  switch
> Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, tes Chiens gagnent +1/+1.

```
Dans ce style graphique, sur fond rose, dessine un chiot avec une loupe et un gros nez.
```

Fichier : `Dog Chiot Pisteur.png`

### Muselière  ·  sort, 3 mana  ·  switch
> Piste une carte, puis l’adversaire défausse une carte pistée.

```
Dans ce style graphique, sur fond rose, dessine un chien avec une muselière métallique, l'air penaud.
```

Fichier : `Dog Muselière.png`

### Rottweiler  ·  allié 3/3, 3 mana  ·  switch
> Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, 3 dégâts à une unité adverse au hasard.

```
Dans ce style graphique, sur fond rose, dessine un rottweiler musclé au collier clouté.
```

Fichier : `Dog Rottweiler.png`

### Battue  ·  sort, 4 mana  ·  switch
> Piste toute la main adverse. Pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un chien rabatteur avec une crécelle et un drapeau.
```

Fichier : `Dog Battue.png`

### Vieux Berger  ·  allié 4/6, 5 mana  ·  switch
> Cri de guerre : piste une carte. Les cartes que l’adversaire pioche sont pistées. Les cartes pistées coûtent 1 de plus.

```
Dans ce style graphique, sur fond rose, dessine un vieux chien de berger gris avec un bonnet de laine, une écharpe et une canne.
```

Fichier : `Dog Vieux Berger.png`

## Mélusine (Chat) — Sorcière — Combo : ses sorts se relancent depuis la défausse, sa défausse est une seconde main

### Étincelle  ·  sort, 1 mana  ·  base
> Reprise. Inflige 2 dégâts à une unité adverse.

```
Dans ce style graphique, sur fond rose, dessine un chat sorcier avec une baguette étincelante.
```

Fichier : `Cat Étincelle.png`

### Chaton Apprenti  ·  allié 1/2, 1 mana  ·  base
> Cri de guerre : défausse une carte, puis pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un chaton apprenti sorcier avec un chapeau trop grand.
```

Fichier : `Cat Chaton Apprenti.png`

### Chaudron  ·  allié 2/4, 3 mana  ·  base
> Les cartes de ta défausse coûtent 1 de moins.

```
Dans ce style graphique, sur fond rose, dessine une chatte sorcière avec un petit chaudron noir.
```

Fichier : `Cat Chaudron.png`

### Sorcière des Cendres  ·  allié 3/4, 4 mana  ·  base
> Cri de guerre : reprends un sort de ta défausse dans ta main.

```
Dans ce style graphique, sur fond rose, dessine une chatte sorcière en robe gris cendre.
```

Fichier : `Cat Sorcière des Cendres.png`

### Grand Philtre  ·  sort, 6 mana  ·  base
> Inflige à l’adversaire autant de dégâts que de cartes dans ta défausse.

```
Dans ce style graphique, sur fond rose, dessine un chat alchimiste avec un énorme philtre violet dans un ballon de verre.
```

Fichier : `Cat Grand Philtre.png`

### Mauvais Œil  ·  sort, 2 mana  ·  switch
> Reprise. Donne -2/-2 à une unité adverse.

```
Dans ce style graphique, sur fond rose, dessine un chat noir avec un grand œil mystique dessiné sur la poitrine.
```

Fichier : `Cat Mauvais Œil.png`

### Divination  ·  sort, 2 mana  ·  switch
> Reprise. Pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un chat voyant avec un turban et une boule de cristal.
```

Fichier : `Cat Divination.png`

### Familier Affamé  ·  allié 1/3, 2 mana  ·  switch
> Quand tu lances un sort depuis ta défausse, gagne +1/+1.

```
Dans ce style graphique, sur fond rose, dessine un petit chat familier maigre avec un minuscule chapeau de sorcière.
```

Fichier : `Cat Familier Affamé.png`

### Chat Noir  ·  allié 3/3, 3 mana  ·  switch
> Quand tu défausses une carte, 1 dégât au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine un chat noir de sorcière aux yeux verts avec un petit balai.
```

Fichier : `Cat Chat Noir.png`

### Sabbat  ·  allié 4/5, 6 mana  ·  switch
> Les sorts de ta défausse ont +1 puissance des sorts.

```
Dans ce style graphique, sur fond rose, dessine trois chats sorciers avec des chapeaux pointus et des balais, côte à côte.
```

Fichier : `Cat Sabbat.png`

## Morrigane (Corbeau) — Charognarde — Aggro MidRange : dévore la défausse adverse, tient mieux la longueur qu’un Turbo

### Corbeau Affamé  ·  allié 2/1, 1 mana  ·  base
> Cri de guerre : Charogne 1.

```
Dans ce style graphique, sur fond rose, dessine un corbeau maigre et affamé avec une arête de poisson.
```

Fichier : `Crow Corbeau Affamé.png`

### Pie Voleuse  ·  allié 2/2, 2 mana  ·  base
> Cri de guerre : appât 2. Quand une carte est exilée d’une défausse, gagne +1/+0.

```
Dans ce style graphique, sur fond rose, dessine une pie noire et blanche avec un anneau brillant dans le bec.
```

Fichier : `Crow Pie Voleuse.png`

### Vautour  ·  allié 3/2, 3 mana  ·  base
> Charge. Quand cette unité attaque, Charogne 1.

```
Dans ce style graphique, sur fond rose, dessine un vautour au cou pelé, l'air sinistre.
```

Fichier : `Crow Vautour.png`

### Équarrisseur  ·  allié 3/3, 4 mana  ·  base
> Quand une unité adverse meurt, Charogne 1.

```
Dans ce style graphique, sur fond rose, dessine un corbeau avec un tablier de cuir et une pelle.
```

Fichier : `Crow Équarrisseur.png`

### Seigneur des Charognes  ·  allié 4/5, 6 mana  ·  base
> Cri de guerre : Charogne 4.

```
Dans ce style graphique, sur fond rose, dessine un grand corbeau seigneur avec une couronne d'os et une cape de plumes noires.
```

Fichier : `Crow Seigneur des Charognes.png`

### Charnier  ·  sort, 2 mana  ·  switch
> Appât 1, puis Charogne 2 : une unité alliée gagne +1/+1 par carte dévorée et leurs mots-clés.

```
Dans ce style graphique, sur fond rose, dessine un petit corbeau avec un os dans les serres.
```

Fichier : `Crow Charnier.png`

### Corbeau Squelette  ·  allié 2/3, 3 mana  ·  switch
> Début de ton tour : Charogne 1.

```
Dans ce style graphique, sur fond rose, dessine un corbeau squelette aux os blancs et aux orbites bleues lumineuses.
```

Fichier : `Crow Corbeau Squelette.png`

### Prince des Ossements  ·  allié 4/4, 5 mana  ·  switch
> Quand une carte est exilée d’une défausse, 1 dégât au héros adverse.

```
Dans ce style graphique, sur fond rose, dessine un jeune corbeau prince avec une couronne d'os et une cape rouge.
```

Fichier : `Crow Prince des Ossements.png`

### Colosse d’Os  ·  allié 5/5, 7 mana  ·  switch
> Cri de guerre : Charogne 5.

```
Dans ce style graphique, sur fond rose, dessine un colosse fait d'os assemblés en forme de corbeau géant, les yeux rouges.
```

Fichier : `Crow Colosse d’Os.png`

### Rapace Maigre  ·  allié 2/1, 1 mana  ·  switch
> Charge. Cri de guerre : appât 1. Quand l’adversaire perd des PV, Charogne 1.

```
Dans ce style graphique, sur fond rose, dessine un rapace décharné aux plumes ébouriffées et aux côtes visibles.
```

Fichier : `Crow Rapace Maigre.png`

## Dendrobate (Grenouille) — Venin — Contrôle Hard : des Toxines, un 1 pour 1 ou un 1 pour 2, aucune unité au-delà de 5

### Rainette Toxique  ·  allié 1/2, 1 mana  ·  base
> Cri de guerre : pose 1 Toxine sur une unité adverse.

```
Dans ce style graphique, sur fond rose, dessine une petite rainette dendrobate bleue aux motifs noirs.
```

Fichier : `Frog Rainette Toxique.png`

### Dard Empoisonné  ·  sort, 2 mana  ·  base
> Pose 3 Toxines sur une unité adverse.

```
Dans ce style graphique, sur fond rose, dessine une grenouille avec une sarbacane.
```

Fichier : `Frog Dard Empoisonné.png`

### Sentinelle des Roseaux  ·  allié 2/4, 3 mana  ·  base
> Provocation. Venin.

```
Dans ce style graphique, sur fond rose, dessine une grenouille sentinelle avec une lance de roseau et un casque en feuille.
```

Fichier : `Frog Sentinelle des Roseaux.png`

### Poison Lent  ·  sort, 4 mana  ·  base
> Détruis une unité adverse. Pose 3 Toxines sur une unité adverse au hasard.

```
Dans ce style graphique, sur fond rose, dessine une grenouille avec une fiole de poison vert et un petit sablier.
```

Fichier : `Frog Poison Lent.png`

### Dendrobate Royale  ·  allié 3/5, 5 mana  ·  base
> Aura : tes autres alliés ont Venin.

```
Dans ce style graphique, sur fond rose, dessine une grenouille dendrobate aux couleurs vives avec une couronne dorée et une fine cape rouge.
```

Fichier : `Frog Dendrobate Royale.png`

### Têtard Toxique  ·  allié 1/1, 1 mana  ·  switch
> Râle d’agonie : pose 1 Toxine sur une unité adverse au hasard.

```
Dans ce style graphique, sur fond rose, dessine un petit têtard violet et vert aux yeux malicieux.
```

Fichier : `Frog Têtard Toxique.png`

### Crapaud Cornu  ·  allié 2/3, 2 mana  ·  switch
> Quand une unité adverse attaque, elle reçoit 1 Toxine.

```
Dans ce style graphique, sur fond rose, dessine un crapaud cornu avec de petites cornes de lézard et des verrues, l'air grognon.
```

Fichier : `Frog Crapaud Cornu.png`

### Contagion  ·  sort, 2 mana  ·  switch
> Chaque unité adverse qui porte une Toxine en reçoit 1 de plus.

```
Dans ce style graphique, sur fond rose, dessine une grenouille enrhumée avec un mouchoir et le nez rouge.
```

Fichier : `Frog Contagion.png`

### Collectionneur de Poisons  ·  allié 2/4, 3 mana  ·  switch
> Quand une unité adverse qui porte une Toxine meurt, pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine une grenouille collectionneuse avec plusieurs petites fioles colorées et une loupe.
```

Fichier : `Frog Collectionneur de Poisons.png`

### Épidémie  ·  sort, 5 mana  ·  switch
> Pose 2 Toxines sur chaque unité adverse. Puis chaque unité adverse inflige à son contrôleur autant de dégâts que de Toxines qu’elle porte.

```
Dans ce style graphique, sur fond rose, dessine une grenouille avec un masque de médecin de la peste.
```

Fichier : `Frog Épidémie.png`

## Hulotte (Hibou) — Bibliothécaire — Fatigue : meule sa pioche pour atteindre la fatigue avant l’adversaire, et y range ses Ex-libris

### Lecture en diagonale  ·  sort, 1 mana  ·  base
> Meule 3 cartes, pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine une hulotte avec un livre sous l'aile et des lunettes de lecture.
```

Fichier : `Owl Lecture en diagonale.png`

### Archiviste  ·  allié 2/3, 2 mana  ·  base
> Cri de guerre : meule 2 cartes.

```
Dans ce style graphique, sur fond rose, dessine un hibou archiviste à lunettes avec un tampon et une pile de dossiers.
```

Fichier : `Owl Archiviste.png`

### Annotation  ·  sort, 2 mana  ·  base
> Les cartes de ta pile de fatigue gagnent +1/+1.

```
Dans ce style graphique, sur fond rose, dessine un hibou avec une plume d'oie et un petit carnet.
```

Fichier : `Owl Annotation.png`

### Veilleuse de Nuit  ·  allié 2/4, 3 mana  ·  base
> Quand tu pioches dans la fatigue, gagne +1/+1.

```
Dans ce style graphique, sur fond rose, dessine une hulotte avec un bonnet de nuit et une bougie.
```

Fichier : `Owl Veilleuse de Nuit.png`

### Chancelière  ·  allié 4/4, 4 mana  ·  base
> Provocation. Ex-libris.

```
Dans ce style graphique, sur fond rose, dessine une chouette chancelière avec des lunettes de lecture et une toge noire.
```

Fichier : `Owl Chancelière.png`

### Chouette Effraie  ·  allié 2/1, 1 mana  ·  switch
> Élusif. Cri de guerre : meule une carte.

```
Dans ce style graphique, sur fond rose, dessine une chouette effraie au visage blanc en forme de cœur.
```

Fichier : `Owl Chouette Effraie.png`

### Index  ·  sort, 3 mana  ·  switch
> Crée une carte au hasard de ta pile de fatigue : elle gagne +2/+2.

```
Dans ce style graphique, sur fond rose, dessine un hibou avec un petit tiroir de fiches de catalogue.
```

Fichier : `Owl Index.png`

### Marque-page  ·  allié 2/5, 4 mana  ·  switch
> Provocation. Tu pioches une carte de plus au début de ton tour.

```
Dans ce style graphique, sur fond rose, dessine un hibou avec un énorme livre et un marque-page à la patte.
```

Fichier : `Owl Marque-page.png`

### Doyenne  ·  allié 3/6, 5 mana  ·  switch
> Quand tu pioches dans la fatigue, la carte piochée coûte 2 de moins.

```
Dans ce style graphique, sur fond rose, dessine une vieille chouette doyenne avec une toge, un mortier et des lunettes.
```

Fichier : `Owl Doyenne.png`

### Grand Chancelier  ·  allié 5/6, 6 mana  ·  switch
> Ex-libris. Quand tu pioches dans la fatigue, un allié gagne +1/+1.

```
Dans ce style graphique, sur fond rose, dessine un grand chancelier hibou avec un chapeau à plumes, une cape de velours et une chaîne dorée.
```

Fichier : `Owl Grand Chancelier.png`

## Pastiche (Cameleon) — Usurpateur — MidRange : le Registre garde les types de toutes les cartes jouées

### Greffier  ·  allié 0/0, 2 mana  ·  base
> Gagne +1/+1 pour chaque type différent dans le Registre.

```
Dans ce style graphique, sur fond rose, dessine un caméléon greffier avec une perruque de juge et une plume.
```

Fichier : `Cameleon Greffier.png`

### Bibliothécaire  ·  allié 3/3, 3 mana  ·  base
> Les cartes qui partagent un type avec une carte du Registre coûtent 1 de moins.

```
Dans ce style graphique, sur fond rose, dessine un caméléon bibliothécaire à lunettes avec une pile de livres.
```

Fichier : `Cameleon Bibliothécaire.png`

### Chroniqueur  ·  allié 2/4, 3 mana  ·  base
> Quand un type entre pour la première fois dans le Registre, pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un caméléon chroniqueur avec un chapeau de reporter et un carnet.
```

Fichier : `Cameleon Chroniqueur.png`

### Spécimen  ·  sort, 4 mana  ·  base
> Inflige X dégâts à une cible adverse (unité ou héros), X étant le nombre de types dans le Registre.

```
Dans ce style graphique, sur fond rose, dessine un caméléon fâché avec une étiquette de musée autour du cou.
```

Fichier : `Cameleon Spécimen.png`

### Grand Registre  ·  allié 6/6, 7 mana  ·  base
> Cri de guerre : tes autres alliés reçoivent chaque type du Registre et +2/+2.

```
Dans ce style graphique, sur fond rose, dessine un énorme caméléon avec un gros livre-registre.
```

Fichier : `Cameleon Grand Registre.png`

### Copiste  ·  allié 1/2, 1 mana  ·  switch
> Cri de guerre : le Registre enregistre une carte au hasard de ta main (elle reste en main).

```
Dans ce style graphique, sur fond rose, dessine un caméléon moine copiste avec une plume et un encrier.
```

Fichier : `Cameleon Copiste.png`

### Mimétisme  ·  sort, 2 mana  ·  switch
> Une unité alliée gagne +2/+2 et un type du Registre au hasard.

```
Dans ce style graphique, sur fond rose, dessine un caméléon aux motifs de feuilles, presque invisible.
```

Fichier : `Cameleon Mimétisme.png`

### Archiviste Impitoyable  ·  allié 3/4, 4 mana  ·  switch
> Quand l’adversaire joue une carte qui partage un type avec le Registre, il perd 1 PV.

```
Dans ce style graphique, sur fond rose, dessine un caméléon archiviste au regard glacial avec des lunettes pointues et un tampon rouge.
```

Fichier : `Cameleon Archiviste Impitoyable.png`

### Index du Registre  ·  sort, 5 mana  ·  switch
> Pioche autant de cartes que de types dans le Registre.

```
Dans ce style graphique, sur fond rose, dessine un caméléon avec une règle et une pile de fiches.
```

Fichier : `Cameleon Index du Registre.png`

### Rétrospective  ·  sort, 8 mana  ·  switch
> Pour chaque type du Registre, relance gratuitement une carte du Registre de ce type, au hasard.

```
Dans ce style graphique, sur fond rose, dessine un caméléon avec un vieux cadre portrait de ses ancêtres.
```

Fichier : `Cameleon Rétrospective.png`

## Cartes libres

### Miroir  ·  sort, 0 mana  ·  carte libre
> Miroir : en main, devient la dernière carte jouée par l'adversaire, avec 1 mana de moins.

```
Dans ce style graphique, sur fond rose, dessine un miroir ovale à cadre doré orné.
```

Fichier : `Miroir.png`

### Lapin - Rongeur  ·  allié 1/2, 1 mana  ·  carte libre

```
Dans ce style graphique, sur fond rose, dessine un petit lapin brun avec une carotte.
```

Fichier : `Lapin - Rongeur.png`

### Lapin - Chapardeur  ·  allié 2/2, 2 mana  ·  carte libre
> Passe-Murailles

```
Dans ce style graphique, sur fond rose, dessine un lapin chapardeur avec un masque noir et un sac.
```

Fichier : `Lapin - Chapardeur.png`

### Lapin - Brute  ·  allié 3/4, 3 mana  ·  carte libre
> Provocation. Fin du tour, soigne 1 à elle-même.

```
Dans ce style graphique, sur fond rose, dessine un gros lapin musclé aux oreilles tombantes, l'air brutal.
```

Fichier : `Lapin - Brute.png`

### Lapin - Colosse  ·  allié 8/8, 8 mana  ·  carte libre
> Provocation.

```
Dans ce style graphique, sur fond rose, dessine un lapin gigantesque aux oreilles droites, avec une cicatrice.
```

Fichier : `Lapin - Colosse.png`

### Paresseux - Garde  ·  allié 1/4, 2 mana  ·  carte libre
> Provocation. Cri de guerre : donne +2/+2 à un allié.

```
Dans ce style graphique, sur fond rose, dessine un paresseux garde avec un casque et un petit bouclier.
```

Fichier : `Paresseux - Garde.png`

### Chien - Rempart  ·  allié 3/6, 4 mana  ·  carte libre
> Provocation.

```
Dans ce style graphique, sur fond rose, dessine un gros bouledogue en armure de chevalier avec un bouclier.
```

Fichier : `Chien - Rempart.png`

### Corbeau - Eclaireur Fou  ·  allié 5/1, 2 mana  ·  carte libre
> Charge. Se détruit à la fin du tour.

```
Dans ce style graphique, sur fond rose, dessine un corbeau éclaireur aux yeux exorbités avec un bandeau rouge.
```

Fichier : `Corbeau - Eclaireur Fou.png`

### Éclair  ·  sort, 1 mana  ·  carte libre
> 3 blessures.

```
Dans ce style graphique, sur fond rose, dessine un éclair jaune vif en zigzag.
```

Fichier : `Éclair.png`

### Loup - Souffle  ·  sort, 3 mana  ·  carte libre
> 4 degats à toutes les unités adverses.

```
Dans ce style graphique, sur fond rose, dessine un grand loup gris aux joues gonflées.
```

Fichier : `Loup - Souffle.png`

### Chien - Fiole  ·  sort, 2 mana  ·  carte libre
> Rend 5 PV. Pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un chien avec une fiole de potion rouge.
```

Fichier : `Chien - Fiole.png`

### Lapin - Ralliement  ·  sort, 2 mana  ·  carte libre
> +1/+1 à tous les alliés. Pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un lapin avec un drapeau et un clairon.
```

Fichier : `Lapin - Ralliement.png`

### Grenouille - Princesse Venimeuse  ·  allié 1/1, 2 mana  ·  carte libre
> Venin.

```
Dans ce style graphique, sur fond rose, dessine une princesse grenouille avec une couronne et une robe de bal violette.
```

Fichier : `Grenouille - Princesse Venimeuse.png`

### Lapin - Lapin Garou  ·  allié 1/1, 3 mana  ·  carte libre
> Début de ton tour : gagne +2/+2 et Provocation.

```
Dans ce style graphique, sur fond rose, dessine un lapin-garou, mi-lapin mi-loup-garou, aux crocs pointus et aux yeux jaunes.
```

Fichier : `Lapin - Lapin Garou.png`

### Hiboux - Colère de Kamaji  ·  sort, 5 mana  ·  carte libre
> Détruit toutes les unités

```
Dans ce style graphique, sur fond rose, dessine un énorme hibou mage aux yeux flamboyants, l'air furieux.
```

Fichier : `Hiboux - Colère de Kamaji.png`

### Hiboux - Assassin Royale  ·  allié 1/1, 4 mana  ·  carte libre

```
Dans ce style graphique, sur fond rose, dessine une chouette assassin royale avec une capuche noire, une dague et une petite couronne.
```

Fichier : `Hiboux - Assassin Royale.png`

### Chien - Sergent  ·  allié 3/3, 4 mana  ·  carte libre
> +1/+0 à toutes les unités alliés.

```
Dans ce style graphique, sur fond rose, dessine un chien sergent avec un casque d'instructeur militaire, des galons et un sifflet.
```

Fichier : `Chien - Sergent.png`

### Chat - Griffes  ·  sort, 3 mana  ·  carte libre
> Inflige 1 blessure à trois reprises, à des adversaires au hasard.

```
Dans ce style graphique, sur fond rose, dessine un chat aux longues griffes argentées, l'air féroce.
```

Fichier : `Chat - Griffes.png`

### Chien de la fatigue  ·  allié 1/1, 7 mana  ·  carte libre
> Gagne +1/+1 pour chaque tour passés cette partie. Cri de guerre : Gagne -7/-7.

```
Dans ce style graphique, sur fond rose, dessine un vieux chien épuisé aux cernes profonds avec un bonnet de nuit.
```

Fichier : `Chien de la fatigue.png`

### Chat de la fatigue  ·  allié 2/2, 4 mana  ·  carte libre
> Cri de guerre : Inflige X blessures où X est le nombre de sorts lancés cette partie.

```
Dans ce style graphique, sur fond rose, dessine un chat exténué aux énormes cernes avec une tasse de café vide.
```

Fichier : `Chat de la fatigue.png`

### Corbeau de la fatigue  ·  allié 1/1, 4 mana  ·  carte libre
> Elusif. Cri de guerre : Draine X PV à l'adversaire. X est le nombre de cartes dans la défausse.

```
Dans ce style graphique, sur fond rose, dessine un corbeau épuisé aux yeux mi-clos et aux cernes sombres.
```

Fichier : `Corbeau de la fatigue.png`

### Grenouille de la fatigue  ·  allié 2/2, 4 mana  ·  carte libre
> Venin. Donne +2/+2 à un allié et Venin.

```
Dans ce style graphique, sur fond rose, dessine une grenouille fatiguée aux cernes avec un petit sac de couchage.
```

Fichier : `Grenouille de la fatigue.png`

### Chouette de la fatigue  ·  allié 2/2, 6 mana  ·  carte libre
> Détruit une unité adverse

```
Dans ce style graphique, sur fond rose, dessine une chouette épuisée aux yeux fermés avec un bonnet de nuit.
```

Fichier : `Chouette de la fatigue.png`

### Faucon de la fatigue  ·  allié 2/2, 5 mana  ·  carte libre
> Cri de guerre : Remélange une carte de votre défausse à votre deck, lui donne +2/+2

```
Dans ce style graphique, sur fond rose, dessine un faucon fatigué aux ailes pendantes.
```

Fichier : `Faucon de la fatigue.png`

### Rouge Gorge de la Fatigue  ·  allié 2/1, 3 mana  ·  carte libre
> Quand tu attaques avec une unité, pioche une carte.

```
Dans ce style graphique, sur fond rose, dessine un rouge-gorge épuisé avec une énorme tasse de café.
```

Fichier : `Rouge Gorge de la Fatigue.png`

### Loup - Louveteau  ·  allié 1/1, 2 mana  ·  carte libre
> Râle d'agonie : Pioche une carte et inflige 1 blessure à toutes les unités adverses.

```
Dans ce style graphique, sur fond rose, dessine un louveteau en colère aux poils hérissés.
```

Fichier : `Loup - Louveteau.png`

### Chat - Dompteur de foudre  ·  allié 1/1, 3 mana  ·  carte libre
> Ajoute "Éclair" à la main.

```
Dans ce style graphique, sur fond rose, dessine un chat dompteur avec des gants en caoutchouc, un chapeau de dompteur et un éclair en laisse.
```

Fichier : `Chat - Dompteur de foudre.png`

### Jeune Faucon  ·  allié 1/1, 1 mana  ·  carte libre
> Donne +1/+1 à toutes les cartes de la main.

```
Dans ce style graphique, sur fond rose, dessine un jeune faucon à duvet avec un petit bandeau.
```

Fichier : `Jeune Faucon.png`

### Hiboux de la domination  ·  allié 8/8, 8 mana  ·  carte libre
> Votre adversaire ne peut pas jouer plus d'une carte par tour. Toutes ses cartes coûtent un de plus.

```
Dans ce style graphique, sur fond rose, dessine un énorme hibou dictateur aux yeux rouges avec une cape noire.
```

Fichier : `Hiboux de la domination.png`

### Pieuvre Mécanique  ·  allié 4/4, 6 mana  ·  carte libre
> Quand tu perds des PV, cette carte gagne +2/+2. Début de ton tour : perds 1 point de vie.

```
Dans ce style graphique, sur fond rose, dessine une pieuvre mécanique en métal riveté avec des engrenages.
```

Fichier : `Pieuvre Mécanique.png`

