# Rig & Anim — le module d'animation squelettique 2D

Le module de l'Atelier qui anime les personnages chibi (contours noirs épais, ~2000 px,
fond transparent). **Le game designer** découpe les calques et place les os ; **Claude** est
l'animateur : on lui demande en langage naturel, il écrit `clips.json`, valide, regarde la
planche, corrige, livre un GIF. Le format : **`docs/ANIMATION_FORMAT.md`**.

## Les décisions (validées le 23 octobre 2026)

1. **Les fichiers** d'un personnage : `game/data/rigs/<id>/` — `source.png` (copie jamais
   touchée), `rig.json` (écrit par le game designer dans l'Atelier), `clips.json` (écrit par
   Claude), plus tard `calques/`, `masques/`. Deux JSON au lieu d'un : personne n'écrit dans
   le fichier de l'autre. L'export pour les jeux les fusionnera (phase 3).
2. **On rigge dans l'Atelier du PC** (`localhost:7330`), là où tourne le rendu sans écran.
   Sur le Pi, ça marche aussi, mais c'est un aller-retour par git.
3. **Le rendu sans écran sans dépendance** : le Chrome installé, piloté par le protocole
   DevTools (WebSocket natif de Node), pas Playwright (npm). Il rend avec le vrai code WebGL.
   GIF encodé maison ; WebM par l'enregistreur de Chrome.
4. **Le rendu des jeux** : WebGL 1, repli Canvas 2D rigide prévu (phase 3). Les deux jeux sont
   en DOM + Canvas 2D, sans WebGL ni bibliothèque. `game/src/rig/` n'importe rien hors de son
   dossier : il se copie tel quel dans Market Ultimatum.
5. **Le maillage de la phase 1** : une grille régulière découpée par l'alpha ; une
   triangulation qui suit le contour si la grille montre ses limites.
6. **Le crapaud roi** : pas d'image couronnée trouvée, on a pris `Frog/Frog Toad.png` (« on
   verra »). Les sources font 2000 px, pas 1024 : on travaille en pixels de la source.
7. **Les os du crapaud** sont posés provisoirement par Claude, à corriger dans l'Atelier. Pas
   de clignement en phase 1 : les yeux sont des disques noirs pleins, il faudra un calque de
   paupière (phase 2).
8. **La route `POST /api/rig`** (binaire, `game/data/rigs/<id>/…` seulement) est dans
   `scripts/devserver.js`, **pas** dans le repli C# de l'exe.
9. **Les seuils du validateur** sont dans le module (`SEUILS` de `game/src/rig/verifie.js`,
   surchargeables par `rig.json` → `verification`), pas dans `balance.js` : ce n'est pas de
   l'équilibrage.
10. **Un `CLAUDE.md` par dossier** (`game/src/rig/`, `builder/rig/`, `game/data/rigs/`).

## Les phases

**Phase 1 — la preuve (faite le 23 octobre 2026).** Import d'une image seule, maillage en
grille, poids automatiques, 4 os, l'idle procédural du crapaud, le rendu en planche et en
GIF, le validateur, le banc.
- `game/src/rig/` (squelette, clips, maillage, runtime, rendu WebGL, validateur) ;
- `builder/rig.html` (tuile « Rig & Anim » de l'accueil) : créer un personnage depuis une
  image du jeu ou un PNG, générer le maillage, poser les os à la souris, mode pose, lecture
  des clips (relus tout seuls), fondu, vérification, annuler/rétablir, enregistrer ;
- `scripts/rig-rendu.mjs` (planche, `--ecart`, `--gif`, `--webm`, `--cadre`),
  `scripts/rig-valide.mjs`, `scripts/rig-maille.mjs`, `scripts/test-rig.mjs`.

**Après la phase 1 (23 octobre 2026) : un bipède et un quadrupède.** Le **Lapin Bagarreur**
(bipède type, 13 os, idle de boxeur) et le **Chiot de Garde** (quadrupède assis, 14 os dont
bouclier, épée et cape, idle de garde), noms d'os types dans `ANIMATION_FORMAT.md` (2.1).
Ce qu'ils ont appris :
- les poids « à vol d'oiseau » faisaient tirer une oreille sur l'autre, et l'épaule du lapin
  suivait la queue à 56 % : les poids sont maintenant **géodésiques** (on marche sur le
  maillage) et **rapportés à l'épaisseur** de la partie traversée, avec une `portee` réglable
  par os et un seuil de 3 % retiré en douceur (une coupe nette faisait un pli) ;
- un poids faible loin d'un long os se voit (le bouclier qui tourne autour de sa base bougeait
  le casque) ;
- **en image seule, ce qui se touche bouge ensemble** : une tête qui touche un bouclier ne
  tourne que d'~1° sans étirer le contour au-delà de 5 %. Le chiot est donc très retenu ;
  c'est la phase 2 (les calques) qui lui rendra la tête qui penche, le bouclier qui bouge ;
- l'outil pour le voir : `scripts/rig-rendu.mjs <id> --essai` (chaque os tourne seul, la
  planche peint ce qu'il entraîne).

**Phase 2 — faite le 23 octobre 2026, en commençant par le chiot.**
- **Le découpage** (mode ✂ Calques de l'Atelier, `builder/rig/editeur-calques.js` ; opérations
  sans DOM dans `builder/rig/calques.js`, les mêmes en ligne de commande :
  `scripts/rig-decoupe.mjs`) : lasso polygonal et libre, lissage, « suivre le contour »
  (accroche au trait noir), « inclure le trait », « Extraire en calque » (maillé ou rigide sur
  un os), gomme et pinceau de restauration (depuis la source, jamais modifiée), panneau des
  calques (ordre par glisser-déposer, visibilité, verrou, renommer, dupliquer, fusionner vers le
  bas, supprimer, opacité d'aperçu), annuler/rétablir sur tout, pixels compris. Calques en PNG
  recadrés + le JSON.
- **Les zones à combler** : chaque extraction enregistre le trou (masque PNG) ; par zone :
  exporter le calque + son masque noir et blanc, réimporter le calque complété à la même place,
  **combler provisoirement** (les couleurs voisines, sans IA), marquer comblée. Le validateur
  avertit quand un calque peut bouger au-dessus d'une zone pas comblée, et dit de combien il y
  glisse dans un clip.
- **Le pinceau de poids** (mode 🎨 Poids), **l'IK à 2 os** (solveur analytique, cible, sens du
  pli ; fiche d'un os), le **fondu** entre clips (déjà là). Les os d'un calque maillé :
  `osPoids`, ou tous sauf ceux d'un calque rigide.
- **Le clignement** : les yeux en calques rigides `etirementLibre`, écrasés par un événement ;
  le trou comblé dessous tient lieu de paupière (pas besoin d'une paupière dessinée).
- **Le Chiot de Garde découpé** (par Claude, à reprendre dans l'Atelier si besoin) : `corps`,
  `tete`, `oeil_g`, `oeil_d`, `epee`, `bouclier` ; la tête se penche de 5° (contre ~1° en image
  seule), le bouclier se balance, il cligne.

Pas fait : un maillage qui **suit le contour** (chaque calque garde la grille, qui suffit) ; et
les zones du chiot ne sont comblées que **provisoirement** — à repeindre à l'inpainting, la plus
visible sous la tête (`corps/z3`).

Ce que le chiot a appris : deux tracés voisins presque confondus laissent un **ruban** sur le
calque d'origine, que le comblement épaissit en tache → faire chevaucher le second ; une coupe
dans le trait d'un objet lui en laisse un morceau qui reste en place quand il bouge ; le
comblement doit **remplacer** les pixels de la zone (pas s'y mélanger), sinon le bord de l'objet
extrait laisse un liseré ; et la pyramide se lit en bilinéaire, sinon elle remplit de carrés.

**Phase 3 — à faire.** Le runtime pour les jeux (chargement d'un export fusionné + atlas,
lecture et fondu, WebGL, repli Canvas 2D sans maillage), le **packer d'atlas** à l'export
avec réduction (2000 px → la taille affichée), une mesure à 60 i/s de plusieurs personnages
sur un téléphone moyen, et le reste du contrat d'animation : marche, surpris, en colère,
décidé, effrayé, content.

## Ce qui reste ouvert
- **Où** les personnages animés s'affichent dans Adventure Card (overworld, portraits de
  carte, écran d'arène) : à décider en phase 3.
- L'image du crapaud roi (une version couronnée ?).
