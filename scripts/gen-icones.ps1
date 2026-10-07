# LES ICONES DE L'ATELIER — refaites a partir du logo (Icons\Icon.png, carre, fond transparent).
#
#   powershell -ExecutionPolicy Bypass -File scripts\gen-icones.ps1 [-Logo chemin.png]
#
# Cinq fichiers dans builder\icons, chacun pour un usage qui a ses propres regles :
#   atelier-192 / -512   l'icone "any" du manifeste et de l'onglet : le logo tel quel, transparent ;
#   atelier-maskable-512 Android decoupe l'icone (rond, goutte, carre arrondi) et ne garantit
#                        que le disque central de 80 % : le logo y est reduit, sur fond plein ;
#   atelier-apple-180    iOS remplit la transparence en noir : fond plein, comme le maskable ;
#   atelier-badge-96     la petite icone de la barre d'etat Android : Android n'en lit QUE la
#                        transparence, donc une silhouette blanche du logo.
# Le raccourci Windows a son propre .ico : scripts\raccourci-atelier.ps1.
param([string]$Logo = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$racine = Split-Path -Parent $PSScriptRoot
if (-not $Logo) { $Logo = Join-Path $racine 'Icons\Icon.png' }
$sortie = Join-Path $racine 'builder\icons'
$src = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $Logo).Path)

# Le fond des icones pleines : le degrade de l'Atelier (theme_color #0f1115 en bas).
$haut = [System.Drawing.Color]::FromArgb(255, 0x1b, 0x22, 0x30)
$bas = [System.Drawing.Color]::FromArgb(255, 0x0f, 0x11, 0x15)

function Icone([int]$taille, [double]$part, [bool]$fond, [string]$nom, [bool]$silhouette = $false) {
  $bmp = New-Object System.Drawing.Bitmap $taille, $taille
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  if ($fond) {
    $r = New-Object System.Drawing.Rectangle 0, 0, $taille, $taille
    $pinceau = New-Object System.Drawing.Drawing2D.LinearGradientBrush $r, $haut, $bas, 90.0
    $g.FillRectangle($pinceau, $r); $pinceau.Dispose()
  }
  $c = $taille * $part
  $k = [Math]::Min($c / $src.Width, $c / $src.Height)
  $w = $src.Width * $k; $h = $src.Height * $k
  $dest = New-Object System.Drawing.RectangleF ([float](($taille - $w) / 2)), ([float](($taille - $h) / 2)), ([float]$w), ([float]$h)
  $g.DrawImage($src, $dest)
  $g.Dispose()
  if ($silhouette) {
    # Blanc partout, et les traits NOIRS du dessin deviennent transparents : une silhouette
    # pleine ne montrait qu'une tache, les contours font reconnaitre les cartes.
    for ($y = 0; $y -lt $taille; $y++) { for ($x = 0; $x -lt $taille; $x++) {
      $p = $bmp.GetPixel($x, $y)
      $lum = [Math]::Max($p.R, [Math]::Max($p.G, $p.B))
      $a = [int]($p.A * [Math]::Min(1, [Math]::Max(0, ($lum - 40) / 60)))
      $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, 255, 255, 255))
    } }
  }
  $f = Join-Path $sortie $nom
  $bmp.Save($f, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  Write-Host "  $nom"
}

try {
  Write-Host "Icones de l'Atelier depuis $Logo :"
  Icone 192 1.00 $false 'atelier-192.png'
  Icone 512 1.00 $false 'atelier-512.png'
  Icone 512 0.60 $true  'atelier-maskable-512.png'
  Icone 180 0.84 $true  'atelier-apple-180.png'
  Icone 96  0.92 $false 'atelier-badge-96.png' $true
} finally { $src.Dispose() }
