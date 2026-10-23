# Le format d'animation (rig.json + clips.json)

Ce document suffit pour écrire un clip juste **du premier coup**, sans autre contexte. Le code
qui le lit est `game/src/rig/` (`clip.js` pour les clips) ; s'il dit autre chose que ce
document, c'est un bug d'un des deux.

Un personnage animé vit dans `game/data/rigs/<id>/` :

| Fichier | Écrit par | Contenu |
|---|---|---|
| `source.png` | l'Atelier, à la création | l'image d'origine, **jamais modifiée** |
| `rig.json` | le game designer, dans l'Atelier (`builder/rig.html`) | les os, les calques, les maillages et leurs poids |
| `clips.json` | **l'animateur (Claude)**, à la main | les animations |
| `calques/`, `masques/` | l'Atelier (mode ✂ Calques) ou `scripts/rig-decoupe.mjs` | les calques découpés (PNG recadrés), les masques des zones à combler (blanc = le trou) |

**On n'écrit jamais `rig.json` pour animer.** Un clip ne fait que *décaler* les os d'un rig
déjà posé. Si un os manque (pas de paupière, pas d'oreille), on le demande au game designer.

---

## 1. Les repères

- Les coordonnées sont des **pixels de l'image source**, `x` vers la droite, **`y` vers le
  bas**.
- Un angle est en **degrés**. `0` = vers la droite. **Positif = sens horaire à l'écran.** Un
  os qui monte a l'angle `-90`.
- Le temps est en **secondes**.

## 2. Le rig (`rig.json`), ce qu'il faut savoir pour animer

```json
{
  "format": "adventure-rig", "version": 1, "id": "crapaud", "nom": "Crapaud",
  "source": { "image": "source.png", "largeur": 2000, "hauteur": 2000 },
  "os": [
    { "id": "sol",   "parent": null,    "x": 520,  "y": 1610, "angle": 0,   "longueur": 760 },
    { "id": "corps", "parent": "sol",   "x": 950,  "y": 1480, "angle": -90, "longueur": 420 },
    { "id": "tete",  "parent": "corps", "x": 950,  "y": 1060, "angle": -90, "longueur": 480 }
  ],
  "calques": [ { "id": "tout", "image": "source.png", "ordre": 0, "mesh": { "…": "…" } } ]
}
```

- Chaque os est décrit **dans sa pose de repos, en coordonnées de l'image** : son origine
  (le pivot, `x`, `y`), sa direction (`angle`) et sa `longueur`. Un enfant **suit** son parent :
  tourner le corps fait tourner la tête avec lui.
- Un **calque** est une image dessinée par un maillage (`mesh`) : chaque sommet suit un ou
  plusieurs os selon ses **poids** (peau linéaire). Un calque sans `mesh` mais avec `"os"`
  est **rigide** : il suit cet os d'un bloc.
- Pour animer, il suffit de lire la liste `os` : leurs `id`, leur hiérarchie, où ils sont.
- `portee` (facultatif, 1 par défaut) ne sert qu'aux poids automatiques : à 1.5, l'os attire
  les sommets de 1,5 fois plus loin. `deforme: false` : l'os ne prend aucun sommet.

### 2.1 Les noms d'os types

Les mêmes noms d'un personnage à l'autre, pour qu'un clip se relise (et se recopie) d'un
rig à l'autre. **`_g` / `_d` = le côté gauche / droit de l'IMAGE** (pas du personnage) ;
**`_b`, `_c`** = le 2ᵉ, le 3ᵉ segment d'une chaîne (oreille, queue, cape).

| | Bipède (`lapin-bagarreur`) | Quadrupède assis (`chiot-de-garde`) |
|---|---|---|
| racine | `sol` : le long du sol, sous les pieds — il ne bouge pas, c'est lui qui **plante les pieds** | `sol` : idem, sous les pattes |
| corps | `bassin` → `torse` → `tete` | `bassin` → `dos` → `cou` → `tete` |
| membres | `bras_g`, `bras_d` (enfants du torse), `jambe_g`, `jambe_d` (enfants du bassin) | `patte_av_g`, `patte_av_d` (du dos), `patte_ar_g`, `patte_ar_d` (du bassin) |
| ce qui suit | `oreille_g` → `oreille_g_b`, `queue` → `queue_b` | `oreille_g`, `oreille_d`, `queue`, `cape` |
| accessoires | du nom de l'objet, enfant de ce qui le porte | `bouclier`, `epee` (enfants du `dos`) |

Un membre s'arrête **à la cheville** : le pied, au plus près de `sol`, reste planté quand le
corps bouge. Le crapaud (`crapaud`), plus ancien, a `sol`, `corps`, `tete`, `ventre`.

### 2.2 Ce qu'une image seule peut faire (un seul calque maillé)

Tant qu'un personnage n'est pas découpé en calques, **ce qui se touche bouge ensemble**.
Les parties séparées par du vide (les oreilles, le bout d'une queue, une antenne) peuvent
vivre à part ; deux parties qui se chevauchent (un poing devant la joue, un bouclier contre le
corps, une épée contre le casque) se déchirent dès qu'elles bougent l'une sans l'autre, et
le contour s'étire. Ordres de grandeur mesurés (étirement du contour par degré de rotation
d'un os, poids automatiques) : 2 % pour une oreille, 3 à 5 % pour une tête ou un buste
contre ce qui le touche, jusqu'à 10 % pour un bouclier qui chevauche le corps. Avec la limite
de 5 %, une tête n'y tourne que d'environ 1°. `node scripts/rig-rendu.mjs <id> --essai` montre
ce que chaque os entraîne.

### 2.3 Un personnage découpé en calques

Découpé (mode ✂ Calques de l'Atelier, ou `scripts/rig-decoupe.mjs`), chaque partie est un
calque qui bouge sans déchirer les autres : sur le Chiot de Garde, la tête passe de 5 % à 0 %
d'étirement par degré, et se penche de 5°. Ce qu'un calque porte dans `rig.json` :

| Champ | Sens |
|---|---|
| `image`, `x`, `y`, `largeur`, `hauteur` | son PNG (`calques/<id>.png`) et sa place dans la source |
| `ordre` | l'ordre de dessin : plus grand = devant |
| `os` | **rigide** : tout le calque suit cet os (un bouclier, un œil) ; sinon `mesh` (maillé) |
| `osPoids` | les os qui peuvent tirer ce calque maillé (sinon : tous, sauf ceux d'un calque rigide) |
| `de` | le calque d'où il a été extrait |
| `zones` | les **trous** que des extractions ont laissés dans ce calque : `{ id, x, y, largeur, hauteur, masque, par, etat }`, `par` = le calque extrait qui les recouvrait, `etat` = `a-combler`, `provisoire` (rempli par les couleurs voisines, sans IA) ou `comblee` (repeint dans un outil d'inpainting) |
| `etirementLibre` | le validateur ne juge pas son étirement (des yeux qui s'écrasent pour cligner) |
| `visible: false`, `verrou: true` | caché, protégé (édition) |

Ce que ça change pour animer :
- **Un calque rigide qui bouge découvre son trou** : quand la tête penche, la zone qu'elle
  recouvrait sur le corps se voit. Le validateur dit de combien elle glisse (`zone-a-combler`) :
  une zone `provisoire` tient quelques pixels de glissement, au-delà elle demande un vrai
  comblement (export → inpainting → réimport, dans l'Atelier). À dire au game designer, pas à
  régler en bridant l'animation si le mouvement est voulu.
- **Le clignement** : chaque œil est un calque rigide sur son os (`oeil_g`, `oeil_d`, pivot au
  centre de l'œil, `deforme: false`), marqué `etirementLibre` ; un `evenement` écrase son `sy`
  (décalage −0.88 en 0.07 s, tenu 0.05 s, rouvert en 0.12 s) et le trou comblé dessous tient
  lieu de paupière.

### 2.4 Les IK à 2 os

```json
"ik": [ { "id": "cuisse_g-tibia_g", "os": ["cuisse_g", "tibia_g"], "cible": "pied_g_ik", "flexion": 1 } ]
```
Les deux os de `os` (le second enfant du premier) plient pour que la **pointe du second**
rejoigne l'**origine** de l'os `cible`. On anime alors la cible (son `x`/`y`), pas les deux os :
leur rotation est recalculée à chaque image (elle remplace celle des clés). `flexion` : `1` ou
`-1`, le côté où plie l'articulation. La cible ne doit pas pendre sous la chaîne (souvent un
enfant de `sol` : un pied planté pendant que le bassin descend).

## 3. Les clips (`clips.json`)

```json
{
  "format": "adventure-rig-clips",
  "version": 1,
  "clips": {
    "idle": {
      "description": "ce que le clip montre, en une phrase (facultatif, pour les humains)",
      "duree": 8,
      "boucle": true,
      "pistes": { "<os>": { "<canal>": [ <clé>, <clé>, … ] } },
      "procedural": [ <modificateur>, … ]
    }
  }
}
```

- `duree` (obligatoire, en secondes) et `boucle` (défaut `true`). Un clip qui ne boucle pas
  (un « surpris ») **tient sa dernière pose** une fois fini ; le jeu le fond alors dans le clip
  suivant.
- Tout est **facultatif** sauf `duree` : un os qu'aucune piste ni aucun modificateur ne nomme
  reste dans sa pose de repos.

### 3.1 Les canaux

| Canal | Unité | Neutre | Sens |
|---|---|---|---|
| `rot` | degrés | `0` | ajouté à l'angle de repos ; positif = horaire |
| `x`, `y` | pixels | `0` | déplacement de l'origine, **dans les axes de l'image** (`y` positif = vers le bas), comme si le parent était au repos ; si le parent tourne, le déplacement tourne avec lui |
| `sx` | facteur | `1` | étire l'os **le long de lui-même** (de son origine vers son bout) |
| `sy` | facteur | `1` | étire l'os **en travers** |

⚠ **L'échelle ne se transmet pas aux enfants** : elle déplace leur point d'attache (un corps
qui s'allonge soulève la tête) mais ne les grossit pas.

⚠ **`sx`/`sy` dans `pistes` sont des FACTEURS** (`1.02` = +2 %) ; **dans les modificateurs et
les événements, tout est un DÉCALAGE ajouté** (`0.02` = +2 %, `0` = rien).

### 3.2 Les clés (`pistes`)

```json
"pistes": {
  "corps": {
    "sx":  [ { "t": 0, "v": 1 }, { "t": 1.6, "v": 1.012 }, { "t": 2.8, "v": 1 } ],
    "rot": [ { "t": 0, "v": 0, "courbe": "sortie" }, { "t": 0.4, "v": -3 } ]
  }
}
```

- Une clé = `t` (secondes, dans `[0, duree]`), `v` (valeur absolue du canal), et `courbe`
  (facultative) : la forme du segment **qui part de cette clé** vers la suivante.
- `courbe` : `"douce"` (**le défaut** : part et arrive en douceur), `"lineaire"`, `"entree"`
  (démarre lentement, arrive vite), `"sortie"` (démarre vite, arrive en douceur), `"palier"`
  (tient la valeur puis saute à la clé suivante), ou une Bézier CSS `[x1, y1, x2, y2]`
  (`[0.3, 1.4, 0.6, 1]` dépasse puis revient : un petit rebond).
- **En boucle, la dernière clé rejoint la première** en passant par la fin du cycle : pas
  besoin de répéter la clé `t = 0` à `t = duree`. Si on l'écrit quand même, elle doit valoir
  **la même chose** que la clé `t = 0`, sinon la boucle saute (le validateur le dit).
- Hors boucle : avant la première clé, on tient la première ; après la dernière, la dernière.

### 3.3 Les modificateurs procéduraux (`procedural`)

Ils s'**ajoutent** aux clés. `os` peut être un id ou une liste d'ids.

**`sinus`** — une oscillation régulière.
```json
{ "type": "sinus", "os": "corps", "canal": "rot", "amplitude": 0.5, "periode": 8, "phase": 0.1 }
```
`amplitude` dans l'unité du canal ; `periode` en secondes ; `phase` en **fraction de
période** (0 à 1 ; 0.25 = un quart de cycle d'avance). ⚠ **Dans un clip en boucle, la
période doit diviser la durée** (`duree / periode` entier : 8 s → 8, 4, 2.6666667, 2, 1.6…),
sinon la boucle saute : le validateur refuse et propose des périodes.

**`bruit`** — une dérive lisse, irrégulière, jamais deux fois pareille dans le cycle.
```json
{ "type": "bruit", "os": "tete", "canal": "rot", "amplitude": 0.7, "periode": 2.6666667, "graine": 11 }
```
`periode` = l'écart moyen entre deux « intentions » du mouvement. En boucle, le bruit
place un nombre entier de points sur le cycle (`round(duree / periode)`) : il boucle
toujours. Il peut déborder un peu son amplitude (~20 %). Changer `graine` donne un autre
tirage ; deux os avec la même graine bougent pareil (à éviter).

**`ressort`** — le suivi secondaire : une chaîne d'os qui **traîne derrière** un os source,
avec retard et dépassement (oreilles, cape, queue, antenne, tête qui suit le corps).
```json
{ "type": "ressort", "os": ["oreille1", "oreille1b"], "source": "tete",
  "frequence": 2.5, "amortissement": 0.35, "gain": 1, "gainX": 0, "gainY": 0.05, "decalage": 0.04 }
```
- `os` : la chaîne, **du plus proche de la source au plus loin**. Chaque maillon tourne.
- `source` : l'os suivi (défaut : le parent du premier maillon). La source est lue **sans
  les ressorts** (on ne chaîne pas deux ressorts).
- `frequence` (Hz, défaut 2.5) : plus bas = plus lourd, plus mou. `amortissement` (0 à 1,
  défaut 0.35) : bas = ça oscille longtemps, haut = ça rattrape sans rebondir.
- `gain` (défaut 1) : la part de la **rotation** de la source suivie avec retard (1 = la
  chaîne traîne exactement derrière la rotation de la source).
- `gainX`, `gainY` (degrés par pixel, défaut 0) : une **translation** de la source fait aussi
  tourner la chaîne (un corps qui monte fait retomber les oreilles). Le signe dépend du sens
  des os : essayer, regarder la planche, inverser si besoin.
- `decalage` (s, défaut 0.04) : retard de plus par maillon, pour l'onde le long de la chaîne.

**`evenement`** — un mini-clip joué à des moments tirés au hasard (clignement, déglutition,
petit coup d'œil).
```json
{ "type": "evenement", "intervalle": [3, 6], "graine": 5, "pistes": {
  "ventre": { "sy": [ { "t": 0, "v": 0, "courbe": "sortie" }, { "t": 0.18, "v": 0.02 }, { "t": 0.5, "v": 0 } ] }
} }
```
- `intervalle` : `[min, max]` secondes entre deux débuts. En boucle, les écarts sont mis à
  l'échelle pour faire **exactement** un cycle (le motif se répète sans couture).
- `pistes` : comme celles du clip, mais le temps part du **début de l'événement**, et les
  valeurs sont des **décalages** (commencer et finir à `0`).

### 3.4 L'ordre de composition

Pour chaque os et chaque canal : **clés** (ou le neutre) **+ sinus + bruit + événements +
ressorts**. Le résultat est une pose ; le jeu peut **fondre** deux poses (passer d'un clip à
l'autre en `fondu` secondes, canal par canal).

### 3.5 Les erreurs qui ne se voient pas en lisant

- Un nom d'os, de canal ou de courbe inconnu est **ignoré en jeu** (le jeu ne plante pas) :
  seul le validateur le dit. Toujours le lancer.
- Un clip en boucle dont un sinus ne divise pas la durée **saute** à la couture.
- `sx: 0.02` dans `pistes` écrase l'os à 2 % de sa taille (c'est un facteur là) : écrire
  `1.02`.

---

## 4. Le style d'animation (Adventure Card)

Les personnages sont des chibis à **contours noirs épais**. Le contour trahit tout.

- **Subtil par défaut.** On donne de la vie, on ne fait pas du Flash agité. Repères pour un
  idle : rotation d'un os ±0.5 à ±3°, respiration 1 à 1.5 % (`sx`/`sy`), déplacement
  ≤ 1.5 % de la taille de l'image. Un état (surpris, en colère) peut aller plus loin, mais
  par une **pose tenue**, pas par une agitation.
- **Le contour ne s'étire jamais visiblement** : le validateur refuse au-delà de **5 %**
  d'étirement d'un triangle qui porte du contour (10 % à l'intérieur). Préférer tourner
  que mettre à l'échelle, et garder `sx`/`sy` sous ~2 %.
- **Rien de parfaitement synchrone.** Chaque partie a sa phase (la `phase` d'un sinus, des
  clés décalées de 0.1–0.3 s : le ventre suit la poitrine d'un souffle), et **des durées
  inégales** : trois respirations de 2.8 / 2.6 / 2.6 s plutôt qu'un sinus de 2.67 s.
- **Anticipation** : avant un mouvement, un petit contre-mouvement (−0.4° avant +2°).
- **Chevauchement** : ce qui pend ou dépasse (oreilles, cape, chapeau, tête) suit avec un
  `ressort`.
- **Easing** : `douce` par défaut ; `sortie` pour un mouvement qui part vite et se pose.
- Un idle de **6 à 10 s** en boucle, avec du `bruit` et des `evenement`s, ne paraît jamais
  mécanique : on ne voit pas le cycle.

Le contrat d'animation du jeu, à terme : **idle, marche, surpris, en colère, décidé, effrayé,
content**. Pas d'animation de combat.

---

## 5. Le travail de l'animateur (la boucle de vérification)

Quand le game designer demande une animation (« fais l'idle du crapaud », « le marteau doit
peser plus lourd ») :

1. **Lire** `game/data/rigs/<id>/rig.json` (la liste `os`, pas les maillages) et le
   `clips.json` existant. Regarder `source.png` si besoin, et **l'essai des os**
   (`node scripts/rig-rendu.mjs <id> --essai`) : ce que chaque os entraîne dit ce qu'on peut
   bouger sans déchirer (cf. 2.2).
2. **Écrire** le clip dans `clips.json` (garder les autres clips).
3. **Valider** : `node scripts/rig-valide.mjs <id> <clip>` — corriger toute erreur, et lire
   les **mesures** (amplitude par os, déplacement, étirement du contour) : c'est là qu'on
   juge « subtil ».
4. **Regarder** : `node scripts/rig-rendu.mjs <id> <clip> --ecart` — une planche où ce qui
   bouge est peint en magenta, image par image (sur le personnage entier, 1 % ne se voit
   pas autrement) ; sans `--ecart`, la planche normale ; `--cadre x,y,cote` zoome sur un
   détail. Ouvrir le PNG et le regarder vraiment.
5. **Corriger**, revalider, re-regarder.
6. **Livrer le GIF** : `node scripts/rig-rendu.mjs <id> <clip> --gif` →
   `art-sortie/rigs/<id>/<clip>.gif`. L'Atelier (`builder/rig.html`, mode ▶ Lecture) relit
   `clips.json` tout seul : le game designer peut le voir jouer en direct.

`node scripts/test-rig.mjs` vérifie aussi que **tous** les personnages de
`game/data/rigs/` passent le validateur sans erreur.
