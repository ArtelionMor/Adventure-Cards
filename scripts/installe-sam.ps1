# INSTALLE LE SERVEUR SAM SUR UNE MACHINE A CARTE GRAPHIQUE (mon-mien), UNE FOIS.
#
# A lancer SUR LA MACHINE, dans un PowerShell ouvert « en tant qu'administrateur » :
#
#   powershell -ExecutionPolicy Bypass -File "C:\Users\telia\Adventure-Cards\scripts\installe-sam.ps1"
#
# Ce que ca fait (rien d'autre) :
#   1. une regle de pare-feu ENTRANTE « Adventure Card SAM » : TCP 7340, uniquement depuis le tailnet
#      (100.64.0.0/10), pour le seul python.exe de l'environnement SAM ;
#   2. une tache planifiee « Adventure Card SAM » : a l'ouverture de SA session, elle lance le serveur
#      (scripts\sam-serveur.py, --hote tailscale : il n'ecoute que sur l'adresse Tailscale), cache, et le
#      relance toutes les 30 s s'il s'arrete (Tailscale pas encore connecte au demarrage, plantage).
#      Journal : %LOCALAPPDATA%\adventure-card-sam.log
#   3. elle la demarre tout de suite.
#
# Pour tout retirer : powershell -ExecutionPolicy Bypass -File installe-sam.ps1 -Retire
#
# ⚠ Le serveur se lance DEPUIS LA SESSION de l'utilisateur (tache « interactive ») : lance par SSH il
# mourrait a la deconnexion. Et la regle de pare-feu doit exister AVANT le premier demarrage : sinon Windows
# pose une question que personne ne voit, puis cree des regles BLOQUER qui l'emportent.
param(
  [string]$Env = "$env:USERPROFILE\sam2-env",
  [string]$Depot = "$env:USERPROFILE\Adventure-Cards",
  [string]$Modele = "$env:USERPROFILE\sam2_hiera_large.pt",
  [int]$Port = 7340,
  [switch]$Retire
)
$ErrorActionPreference = 'Stop'
$nom = 'Adventure Card SAM'

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Ce script demande un PowerShell ouvert en tant qu'administrateur."
}

if ($Retire) {
  Stop-ScheduledTask -TaskName $nom -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $nom -Confirm:$false -ErrorAction SilentlyContinue
  Get-NetFirewallRule -DisplayName $nom -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object { $_.CommandLine -match 'sam-serveur' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  'Serveur SAM retire (tache, regle de pare-feu, processus).'
  return
}

$python = Join-Path $Env 'Scripts\python.exe'
$script = Join-Path $Depot 'scripts\sam-serveur.py'
foreach ($f in $python, $script) { if (-not (Test-Path $f)) { throw "Introuvable : $f" } }

# 1. le pare-feu : le tailnet seulement, ce python seulement
Get-NetFirewallRule -DisplayName $nom -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName $nom -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port `
  -RemoteAddress '100.64.0.0/10' -Program $python -Profile Any | Out-Null
"Pare-feu : TCP $Port autorise depuis 100.64.0.0/10 pour $python"

# 2. la tache : a l'ouverture de session, cachee, relancee si elle s'arrete
$journal = Join-Path $env:LOCALAPPDATA 'adventure-card-sam.log'
$boucle = "while (`$true) { & '$python' '$script' --port $Port --hote tailscale --modele '$Modele' *>> '$journal'; Start-Sleep -Seconds 30 }"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -Command `"$boucle`""
$declencheur = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$reglages = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
Unregister-ScheduledTask -TaskName $nom -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $nom -Action $action -Trigger $declencheur -Principal $principal -Settings $reglages | Out-Null
"Tache planifiee « $nom » : a l'ouverture de session, journal $journal"

# 3. on la lance maintenant
Start-ScheduledTask -TaskName $nom
Start-Sleep -Seconds 8
try { $e = Invoke-RestMethod -Uri "http://$((& tailscale ip -4 | Select-Object -First 1)):$Port/etat" -TimeoutSec 5; "Le serveur repond : modele $($e.modele)" }
catch { "Le serveur ne repond pas encore (Tailscale connecte ? voir $journal) : $($_.Exception.Message)" }
