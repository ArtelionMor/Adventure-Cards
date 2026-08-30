# Recompile AdventureCard.exe depuis launcher\Launcher.cs.
# Utilise le compilateur C# livre avec Windows : aucune installation necessaire.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (-not (Test-Path $csc)) { throw "csc.exe introuvable (.NET Framework 4 requis)." }

& $csc -nologo -optimize+ -target:exe -out:"$root\AdventureCard.exe" "$root\launcher\Launcher.cs"
Write-Host "AdventureCard.exe recompile."
