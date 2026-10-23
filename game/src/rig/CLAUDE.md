# game/src/rig/ — l'animation squelettique 2D (cœur et runtime)

> **Aucune dépendance, aucun import hors de ce dossier** : il se copie tel quel dans un autre jeu
> (Market Ultimatum). Pas de DOM sauf `rendu-webgl.js` et `chargeRig` (`fetch`, `Image`).
> Tourne aussi sous Node (validateur, scripts). Le format est décrit dans **`docs/ANIMATION_FORMAT.md`** :
> une règle ajoutée ici s'y écrit aussi. Le plan et les décisions : `docs/RIG-ANIM.md`.

| Fichier | Rôle | Exports |
|---|---|---|
| `squelette.js` | Les os : pose de repos (coordonnées de l'image) → pose locale, monde des os (FK), matrices de peau. Une échelle **ne se transmet pas** aux enfants (elle déplace leur attache). Les **IK à 2 os** (`rig.ik`, solveur analytique, `flexion`) se résolvent à la fin de `calculeMonde`, qui **retouche `pose.rot`** des deux os. | `prepareSquelette`, `poseNeutre`, `calculeMonde`, `matricesDePeau`, `boutDe`, `CANAUX` |
| `clip.js` | Un clip au temps t : clés (courbes `douce`/`lineaire`/`entree`/`sortie`/`palier`/Bézier CSS), `sinus`, `bruit` (Catmull-Rom, périodique en boucle), `evenement` (mini-clips à moments tirés, mis à l'échelle du cycle), `ressort` (noyau de réponse d'un ressort amorti : **fonction pure du temps**, pas d'état), fondu entre deux poses. | `prepareClip`, `evalueClip`, `melange`, `fonctionDeCourbe` |
| `mesh.js` | La grille d'un calque « image seule » (cases où l'image a de l'alpha, triangles « de trait » marqués), le quad d'un calque rigide, les poids automatiques (inverse de la distance **géodésique** — en marchant sur le mesh, jamais à travers le vide — rapportée à l'**épaisseur** de la partie que l'os traverse et à sa `portee`, puissance 2,5, lissés, seuil de 3 % retiré en douceur), la peau linéaire, l'étirement d'un triangle (valeurs singulières), `osDuCalque` (les os d'un calque maillé : son `osPoids`, sinon tous sauf ceux des calques rigides). | `grilleDepuisImage`, `quadDe`, `poidsAuto`, `osDuCalque`, `prepareCalque`, `deforme`, `etirement` |
| `joueur.js` | **Le runtime** : `prepareRig(rig, clips)`, `chargeRig(urlDuDossier)`, `creeAnimateur(rig)` → `joue(nom, { fondu })`, `avance(dt)`, `calcule(poseForcee?)` (sommets déformés par calque). Un rig préparé se partage entre instances. | `prepareRig`, `chargeRig`, `creeAnimateur` |
| `rendu-webgl.js` | Le rendu WebGL 1 : texture en puissance de 2 **avec mipmaps** (sans elles, un 2000 px affiché à 200 crénelle les contours), alpha prémultiplié, plusieurs personnages dans un canvas, une texture par image de calque (`rafraichit(image)` après un coup de gomme). | `creeRendu` |
| `verifie.js` | **Le validateur** (Atelier + `scripts/rig-valide.mjs`, une seule implémentation) : format, contour étiré (> 5 %), intérieur étiré (> 10 %), triangle retourné, calque rigide détaché de son parent, boucle qui saute, boucle qui cogne, sinus qui ne divise pas la durée, IK mal formée, **zones à combler** (statique : une zone pas comblée sous le calque qui l'a laissée et sa lignée `de` ; dans un clip : de combien ce calque glisse au-dessus, mesuré sur ses sommets **proches de la matière du dessous** — une moyenne sur toute la zone voyait une tête « glisser » de 28 px pour un penché de 5°) ; les calques `etirementLibre` sont dispensés ; plus les **mesures** (amplitude par os, déplacement, étirement, glissement sur les zones). | `verifieClips`, `verifieRig`, `zonesSousUnCalque`, `SEUILS` |

## Pièges
- **Un clip en boucle est périodique partout**, c'est voulu : le validateur exige qu'un `sinus` divise la durée plutôt que de l'arrondir en douce.
- Le validateur échantillonne à 30 instants par seconde : un événement plus court que ~0,1 s peut lui échapper.
- Les clips préparés gardent des tampons de travail (`_base`, `_monde`) : une évaluation ne doit pas en appeler une autre du même clip (ce n'est pas réentrant).
- Bancs : `node scripts/test-rig.mjs` après toute modification ici.
