# Recompile AdventureCard.exe depuis launcher\Launcher.cs.
# Utilise le compilateur C# livre avec Windows : aucune installation necessaire.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (-not (Test-Path $csc)) { throw "csc.exe introuvable (.NET Framework 4 requis)." }

# L'exe est peut-etre EN TRAIN DE TOURNER (csc ne peut alors pas ecrire dessus). Un code
# de retour non nul d'un programme externe ne declenche pas $ErrorActionPreference : sans
# ce test, le script annoncait « recompile » sur un echec et on gardait l'ancien exe.
& $csc -nologo -optimize+ -target:exe -out:"$root\AdventureCard.exe" "$root\launcher\Launcher.cs"
if ($LASTEXITCODE -ne 0) { throw "csc.exe a echoue (code $LASTEXITCODE) - AdventureCard.exe n'a PAS ete recompile (l'exe tourne-t-il encore ?)." }
Write-Host "AdventureCard.exe recompile."
