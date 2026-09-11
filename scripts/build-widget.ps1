# CONSTRUIRE L'APP DU WIDGET ANDROID, et la deposer la ou l'Atelier la propose au
# telechargement (builder/telechargements/widget-atelier.apk).
#
#   powershell -ExecutionPolicy Bypass -File scripts\build-widget.ps1
#
# Il faut Android Studio sur le PC (son JDK 17 via JAVA_HOME, et le SDK Android). Ensuite :
# commit + push, puis `git pull` sur le Pi — c'est lui qui sert l'app au telephone.
#
# ⚠ L'app est signee avec la cle de debogage de CE PC (~/.android/debug.keystore). Une
# mise a jour ne s'installe par-dessus l'ancienne que si elle porte la meme signature :
# construire depuis une autre machine obligerait a desinstaller l'app d'abord.
$ErrorActionPreference = 'Stop'
$racine = Split-Path $PSScriptRoot -Parent

& "$racine\android\gradlew.bat" -p "$racine\android" assembleDebug --console=plain
if ($LASTEXITCODE) { throw "La construction de l'app a echoue." }

$cible = Join-Path $racine 'builder\telechargements'
New-Item -ItemType Directory -Force $cible | Out-Null
Copy-Item "$racine\android\app\build\outputs\apk\debug\app-debug.apk" "$cible\widget-atelier.apk" -Force
"widget-atelier.apk : {0:N0} Ko, dans builder\telechargements\" -f ((Get-Item "$cible\widget-atelier.apk").Length / 1KB)
