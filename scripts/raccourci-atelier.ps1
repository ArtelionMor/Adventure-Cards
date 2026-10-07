# LE RACCOURCI "ATELIER" — a epingler a la place de l'icone que Chrome a posee.
#
# Il lance scripts\atelier.vbs (demarre le serveur s'il ne tourne pas, puis ouvre l'app)
# et porte le MEME identifiant d'app Windows (AppUserModelID) que l'app Chrome : c'est ce
# qui range la fenetre de l'Atelier sous l'icone epinglee au lieu d'en ajouter une seconde.
#
#   powershell -ExecutionPolicy Bypass -File scripts\raccourci-atelier.ps1 [-Icone chemin.png|.ico]
#
# Sans -Icone, il prend le logo du repo (Icons\Icon.png), a defaut celle de l'app Chrome.
# Un PNG est converti en .ico. Le relancer avec une autre icone met le raccourci a jour. Ensuite (Windows 10 ne permet pas de le faire par script) :
# desepingler l'ancienne icone, puis menu Demarrer > "Atelier" > clic droit > Epingler
# a la barre des taches.
param([string]$Icone = '')
$ErrorActionPreference = 'Stop'

$racine = Split-Path -Parent $PSScriptRoot
$menu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$sortie = Join-Path $menu 'Atelier.lnk'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class Aumid {
  [StructLayout(LayoutKind.Sequential)] public struct PKEY { public Guid fmtid; public uint pid; }
  [StructLayout(LayoutKind.Sequential)] public struct PV { public ushort vt; public ushort r1, r2, r3; public IntPtr p; public IntPtr p2; }
  [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore {
    void GetCount(out uint c); void GetAt(uint i, out PKEY k);
    void GetValue(ref PKEY k, out PV v); void SetValue(ref PKEY k, ref PV v); void Commit();
  }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  static extern void SHGetPropertyStoreFromParsingName(string path, IntPtr bc, int flags, ref Guid iid, out IPropertyStore ps);
  static PKEY Cle = new PKEY { fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), pid = 5 };
  static IPropertyStore Ouvre(string path, int flags) {
    Guid iid = typeof(IPropertyStore).GUID; IPropertyStore ps;
    SHGetPropertyStoreFromParsingName(path, IntPtr.Zero, flags, ref iid, out ps); return ps;
  }
  public static string Lis(string path) {
    PV v; PKEY k = Cle; Ouvre(path, 0).GetValue(ref k, out v);
    return v.vt == 31 ? Marshal.PtrToStringUni(v.p) : null;
  }
  public static void Ecris(string path, string id) {
    IPropertyStore ps = Ouvre(path, 2);
    PV v = new PV { vt = 31, p = Marshal.StringToCoTaskMemUni(id) }; PKEY k = Cle;
    ps.SetValue(ref k, ref v); ps.Commit();
    Marshal.FreeCoTaskMem(v.p);
  }
}
'@

# L'app Chrome : son raccourci donne son id (dans les arguments), son icone et son AppUserModelID.
# Sans app installee, le lanceur ouvre une fenetre d'app Chrome ordinaire (--app=<adresse>) :
# ca marche aussi, simplement sans identifiant commun pour regrouper la fenetre.
$sh = New-Object -ComObject WScript.Shell
$chrome = Get-ChildItem (Join-Path $menu 'Applications Chrome') -Filter '*Atelier*.lnk' -ErrorAction SilentlyContinue | Select-Object -First 1
$appId = ''; $aumid = $null
if ($chrome) {
  $lnkChrome = $sh.CreateShortcut($chrome.FullName)
  if ($lnkChrome.Arguments -match '--app-id=(\S+)') { $appId = $Matches[1] }
  $aumid = [Aumid]::Lis($chrome.FullName)
} else {
  Write-Host "Pas d'app 'Atelier' installee par Chrome : le raccourci ouvrira une fenetre d'app ordinaire."
}
# L'icone est COPIEE a un endroit fixe, au nom sans accent : WScript.Shell lit et ecrit les
# chemins en ANSI, et le tiret long de "Adventure Card — Atelier.ico" y devenait un tiret
# simple (icone introuvable). Le raccourci ne depend plus ainsi ni de Chrome ni du fichier
# d'origine. Sans -Icone, on prend le .ico de l'app Chrome.
$logo = Join-Path $racine 'Icons\Icon.png'
if (-not $Icone -and (Test-Path $logo)) { $Icone = $logo }
if (-not $Icone) {
  $dossier = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data\Default\Web Applications\_crx_$appId"
  $ico = Get-ChildItem -LiteralPath $dossier -Filter '*.ico' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($ico) { $Icone = $ico.FullName }
}
$iconeFixe = Join-Path $env:LOCALAPPDATA 'adventure-card-atelier.ico'
# Un PNG (carre, de preference grand et transparent) est converti en .ico a plusieurs
# tailles : Windows prend 16 px dans un menu, 24-32 dans la barre des taches, 48-256 sur
# le bureau, et une seule image agrandie ou reduite par lui serait floue. Chaque taille
# est recalculee depuis l'original (bicubique), et rangee en PNG dans le .ico.
function PngVersIco([string]$png, [string]$ico) {
  Add-Type -AssemblyName System.Drawing
  $src = [System.Drawing.Image]::FromFile($png)
  try {
    $tailles = 16, 24, 32, 48, 64, 128, 256
    $images = foreach ($t in $tailles) {
      $bmp = New-Object System.Drawing.Bitmap $t, $t
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      # Une image pas carree est centree, sans etre deformee.
      $k = [Math]::Min($t / $src.Width, $t / $src.Height)
      $w = $src.Width * $k; $h = $src.Height * $k
      $g.DrawImage($src, ($t - $w) / 2, ($t - $h) / 2, $w, $h)
      $g.Dispose()
      $ms = New-Object System.IO.MemoryStream
      $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
      , $ms.ToArray()
    }
  } finally { $src.Dispose() }
  # Le format ICO : un en-tete, une entree de 16 octets par image, puis les images.
  $out = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter $out
  $bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$tailles.Count)
  $offset = 6 + 16 * $tailles.Count
  for ($i = 0; $i -lt $tailles.Count; $i++) {
    $t = $tailles[$i]; $octets = $images[$i]
    $bw.Write([byte]($t % 256)); $bw.Write([byte]($t % 256))   # 256 s'ecrit 0
    $bw.Write([byte]0); $bw.Write([byte]0)
    $bw.Write([UInt16]1); $bw.Write([UInt16]32)
    $bw.Write([UInt32]$octets.Length); $bw.Write([UInt32]$offset)
    $offset += $octets.Length
  }
  foreach ($octets in $images) { $bw.Write($octets) }
  $bw.Flush()
  [System.IO.File]::WriteAllBytes($ico, $out.ToArray())
}

if ($Icone) {
  $source = (Resolve-Path -LiteralPath $Icone).Path
  if ($source -match '\.png$') { PngVersIco $source $iconeFixe }
  else { Copy-Item -LiteralPath $source -Destination $iconeFixe -Force }
}

$lnk = $sh.CreateShortcut($sortie)
$lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$lnk.Arguments = ('"' + (Join-Path $racine 'scripts\atelier.vbs') + '" ' + $appId).Trim()
$lnk.WorkingDirectory = $racine
if (Test-Path $iconeFixe) { $lnk.IconLocation = $iconeFixe + ',0' }
$lnk.Description = "L'Atelier d'Adventure Card, avec son serveur"
$lnk.Save()
if ($aumid) { [Aumid]::Ecris($sortie, $aumid) }

Write-Host "Raccourci : $sortie"
Write-Host "  app Chrome : $(if ($appId) { $appId } else { "(aucune : fenetre d app ordinaire)" })"
Write-Host "  AppUserModelID : $(if ($aumid) { $aumid } else { '(aucun : la fenetre aura sa propre icone)' })"
Write-Host "  icone : $Icone (copiee dans $iconeFixe)"
Write-Host ''
Write-Host "Reste a faire a la main : desepingler l'ancienne icone, puis menu Demarrer > Atelier > clic droit > Epingler a la barre des taches."
