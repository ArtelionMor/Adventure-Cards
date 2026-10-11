# builder/telechargements/ — ce que l'Atelier propose à télécharger

`widget-atelier.apk` : l'app du widget Android, construite par `scripts/build-widget.ps1` depuis `android/`. C'est **le seul `.apk` versionné** (exception dans `.gitignore`) :
c'est lui que le Pi sert au téléphone, avec le type `application/vnd.android.package-archive` (sans lui, Android garde un fichier quelconque). Binaire : ne pas le lire.
⚠ Signé avec la clé de débogage de ce PC : une mise à jour ne s'installe par-dessus que si elle porte la même signature.
