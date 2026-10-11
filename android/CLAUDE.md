# android/ — le widget Android « Atelier » (le seul morceau qui n'est pas du web)

> Une toute petite app **Java sans aucune bibliothèque** (pas d'AndroidX) qui pose sur l'écran d'accueil un widget montrant la file de calculs du Pi.
> Construire : `powershell -ExecutionPolicy Bypass -File scripts\build-widget.ps1` → `builder/telechargements/widget-atelier.apk`, puis commit, push, `git pull` sur le Pi.

## Les fichiers

| Chemin | Rôle |
|---|---|
| `app/src/main/java/com/adventurecard/atelier/WidgetFile.java` | Le widget : dessin (RemoteViews), cadence de rafraîchissement, garde du dernier état quand le Pi ne répond pas, boutons ■ ❚❚ ▶. |
| `…/Pi.java` | Les requêtes vers le Pi (`GET /api/run`, `POST /api/run/pause\|reprendre\|stop`) et la mémoire du dernier état lu. |
| `…/ReglagesActivity.java` | L'écran d'adresse du Pi (`atelier://config?url=…`) et le bouton « Tester ». |
| `app/src/main/AndroidManifest.xml` | Déclaration du widget et du lien profond. |
| `app/src/main/res/` | `layout/widget_file.xml` (la maquette `mockups/iPhone 17 - 1.png`/`- 2.png`), `drawable/` (barres, boutons, fond), `values/strings.xml`, `xml/widget_file_info.xml`, `mipmap-xxxhdpi/ic_launcher.png`. |
| `app/build.gradle`, `build.gradle`, `settings.gradle`, `gradle.properties`, `gradle/`, `gradlew*` | Gradle (plugin Android déclaré par `buildscript`, pour construire **hors ligne**). `versionCode` monte à chaque APK publiée. |

Les sorties de Gradle et les `.apk` sont dans `.gitignore` (sauf celui de `builder/telechargements/`). Rien de nouveau côté serveur : le widget lit les routes que la page « Lancer un calcul » utilise déjà.

---

# Le détail

## Le widget Android
`android/` est une **toute petite app Android native** — le seul morceau du projet qui
n'est pas du web : une app web ne peut pas poser de widget sur l'écran d'accueil. Elle
reproduit les maquettes `mockups/iPhone 17 - 1.png` et `- 2.png` : titre, barre de la
file entière (rouge pendant, verte à la fin), boutons ■ et ❚❚ / ▶, cinq lignes centrées
sur celle qui tourne (en jaune), « Analyser les résultats » à la fin.

- **En Java, sans aucune bibliothèque** (pas d'AndroidX, `android.useAndroidX=false`) :
  `RemoteViews`, `AlarmManager`, `HttpURLConnection` et `org.json` du framework suffisent,
  et l'APK fait quelques dizaines de Ko. Trois classes : `WidgetFile` (le widget),
  `Pi` (les requêtes), `ReglagesActivity` (l'adresse du Pi).
- **Rien de nouveau côté serveur** : il lit `GET /api/run` et envoie `POST
  /api/run/pause|reprendre|stop`, exactement comme la page et les notifications.
- **La cadence** : Android ne réveille un widget de lui-même que toutes les 30 min. Tant
  qu'une file tourne, `WidgetFile.planifie()` le redemande toutes les ~45 s (réveil
  inexact : Android peut le retarder quand le téléphone dort) et s'arrête à la fin de la
  file. Toucher le pied du widget l'actualise ; un bouton actualise après sa commande.
- **Quand le Pi ne répond pas, le widget garde ce qu'il savait.** Téléphone verrouillé,
  Android coupe le réseau aux apps (Doze), et au réveil Tailscale met quelques secondes à
  revenir : une requête à ce moment-là finit en « nom introuvable », qui ne dit rien de la
  file. `WidgetFile.garde()` affiche donc le **dernier état lu** (mémorisé par `Pi`) avec
  un avertissement orange dans le pied, et retente à 1, 2, 5 puis 15 min — au-delà, la
  mise à jour des 30 min prend le relais. Quand le réseau est bloqué par la veille
  (`reseauDisponible()`), il **essaie quand même** : la 1.1 renonçait d'avance, or Android
  dit aussi « pas de réseau » à une app qu'il range parmi les restreintes en arrière-plan
  (on n'ouvre jamais celle-ci) — le widget ne se connectait plus jamais. Cet avis ne sert
  plus qu'à formuler l'erreur. Le bouton « Tester » de l'app fait la même requête au
  premier plan : s'il répond et que le widget non, c'est ça. L'écran « Pi injoignable » n'apparaît plus
  que s'il n'a jamais rien lu.
- **Versions** : `versionCode` (`android/app/build.gradle`) monte à chaque APK publiée —
  Android refuse une mise à jour dont le numéro recule.
- **L'adresse** (`https://….ts.net`, par Tailscale) se règle sans rien taper : le bouton
  « Régler le widget » de l'accueil de l'Atelier (sur Android seulement) ouvre l'app avec
  `atelier://config?url=<son adresse>`. Elle n'est **jamais écrite dans le repo** (public).
- **S'installe sans Play Store ni mode développeur** : l'accueil de l'Atelier (sur
  Android) propose « 1. Télécharger l'app » — `builder/telechargements/widget-atelier.apk`,
  servi par le Pi avec le type `application/vnd.android.package-archive` (sans lui,
  Android garde un fichier quelconque) — puis « 2. Régler le widget ». Android demande
  seulement d'autoriser Chrome à installer une app, et Play Protect prévient qu'elle est
  inconnue. C'est le **seul `.apk` versionné** (exception dans `.gitignore`) : c'est lui
  que le Pi sert au téléphone.
- **Construire** : `powershell -ExecutionPolicy Bypass -File scripts\build-widget.ps1`
  construit et dépose l'APK au bon endroit ; puis commit, push, `git pull` sur le Pi.
  ⚠ Il est signé avec la **clé de débogage de ce PC** (`~/.android/debug.keystore`) : une
  mise à jour ne s'installe par-dessus que si elle porte la même signature, donc une
  construction depuis une autre machine obligerait à désinstaller l'app d'abord. À la main :
  `android\gradlew.bat -p android assembleDebug` (le JDK 17 d'Android
  Studio, via `JAVA_HOME`) → `android/app/build/outputs/apk/debug/app-debug.apk`. Le
  plugin Android est déclaré par `buildscript { classpath … }` et non par
  `plugins { id … version }` : la seconde forme cherche un marqueur de plugin absent du
  cache, et c'est ce qui permet de construire **hors ligne**. Les sorties de Gradle et
  les `.apk` sont dans `.gitignore`.
