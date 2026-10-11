# launcher/ — le lanceur Windows (`AdventureCard.exe`)

> Un seul fichier : `Launcher.cs` (≈ 540 lignes, C# du framework de Windows). `scripts/build-exe.ps1` le compile avec le `csc.exe` fourni par Windows
> et dépose `AdventureCard.exe` **à la racine du projet**. L'exe ne contient aucun fichier du jeu : il lit le dossier tel qu'il est (rien à recompiler quand le jeu change).

## Ce qu'il fait
1. Cherche Node : s'il est là, il lance (ou **réutilise**, si `/api/run` répond déjà) `scripts/devserver.js` sur `127.0.0.1:7330` ; sinon il se rabat sur son **serveur intégré** (ports 7332+ ; `/api/write` et `/api/sprites` seulement — `/api/run` répond 404).
2. Ouvre Edge (ou Chrome) en mode `--app` sur `http://localhost:7330/game/index.html`, profil dans `%TEMP%\AdventureCardProfile`.
3. Attend la fermeture de la fenêtre en interrogeant le **verrou du profil** (`lockfile`) — jamais le processus du navigateur —, puis arrête le serveur qu'il a lancé (l'arbre entier).

## Pièges
- **Relancer l'exe quand une fenêtre du jeu est déjà ouverte ne la recharge pas** (Chromium la remet au premier plan) : fermer la fenêtre, ou F5.
- `/api/write` et le balayage des sprites (`GenereSprites()`) existent **ici et dans `scripts/devserver.js` / `scripts/gen-sprites.mjs`** : les modifier ensemble, ils doivent produire le même fichier (même tri ordinal, mêmes fins de ligne).
- Adresse `localhost`, jamais `127.0.0.1` : ce sont deux origines, donc deux `localStorage`.

---

# Le détail (lancer le prototype)

## Lancer le prototype (le détail)
`AdventureCard.exe` à la racine (fenêtre format téléphone). Alternative dev :
`node scripts/devserver.js` → http://localhost:7330/game/index.html

**L'exe ne sert plus les fichiers lui-même quand il peut faire mieux** : il lance
`scripts/devserver.js` — le serveur du Pi — et ouvre la fenêtre dessus. C'est ce qui donne
sur le PC tout ce qui ne vivait que sur le Pi : « Lancer un calcul », l'analyse par l'IA
locale, les renforts, les notifications. Il le lance sur **127.0.0.1** (`ADVENTURE_HOST`),
donc Windows ne demande pas d'ouvrir le pare-feu, et il le **tue en partant** (l'arbre
entier : un calcul en cours est un processus fils). Un `devserver.js` déjà lancé à la main
est reconnu (`/api/run` répond 200) et **réutilisé**, pas doublé.

Sans Node, il se rabat sur son **serveur intégré** (le C# de `launcher/Launcher.cs`, ports
7332+ — 7330 est à `devserver.js`, 7331 au renfort) : le jeu et le builder marchent,
`/api/run` répond 404 et `builder/lancer.html` le dit.

**L'Atelier installé par Chrome se prend sur le Pi** (`https://<machine>.<tailnet>.ts.net`,
cf. « L'Atelier »), pas sur `localhost:7330` : une app web ne sait lancer aucun programme,
et celle de `localhost` tombe sur « site inaccessible » dès qu'aucun serveur ne tourne sur
le PC. Le Pi, lui, sert en permanence et se relance au démarrage. Conséquence à garder en
tête : « Appliquer au jeu » écrit alors les cartes **sur le Pi**, à rapatrier par git.

⚠ **L'adresse est `localhost`, jamais `127.0.0.1`** : ce sont deux origines différentes
pour un navigateur, donc deux `localStorage`. Le brouillon du builder, les réglages de
« Lancer un calcul » et l'autorisation des notifications sont rangés là — en `127.0.0.1`,
l'exe ne voyait pas le brouillon commencé sous `node scripts/devserver.js`.

⚠ **On ne suit pas le processus du navigateur** pour savoir quand quitter : Edge passe la
main à un autre processus et sort aussitôt, si bien qu'attendre sa sortie couperait le
serveur sous une fenêtre encore ouverte. C'est le **verrou du profil** qu'on interroge
(`lockfile`, que Chromium garde ouvert en exclusif tant qu'il tourne).
