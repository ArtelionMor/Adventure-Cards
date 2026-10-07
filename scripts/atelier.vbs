' L'ATELIER, AVEC SON SERVEUR — ce que lance le raccourci « Atelier » de la barre des taches.
'
' L'app installee par Chrome (l'Atelier, en PWA) ne sait lancer aucun programme : ouverte
' seule, elle tombe sur « site inaccessible » si personne n'a demarre scripts/devserver.js.
' Ce lanceur le fait a sa place : serveur deja la (l'exe, une console, un lancement
' precedent) = on le reutilise ; sinon on le demarre, sans fenetre, sur 127.0.0.1 (comme
' l'exe : Windows ne demande pas d'ouvrir le pare-feu), puis on ouvre l'app.
'
' Le serveur RESTE ouvert quand on ferme l'app : Chrome ne dit pas quand une app se ferme,
' et le prochain lancement le retrouve. Son journal : %LOCALAPPDATA%\adventure-card-serveur.log
'
' Pourquoi du VBScript : wscript.exe ne montre aucune fenetre, la ou PowerShell en fait
' clignoter une a chaque clic. Le raccourci est cree par scripts\raccourci-atelier.ps1.
'
'   wscript.exe atelier.vbs [id de l'app Chrome]
' Sans id, l'Atelier s'ouvre dans une fenetre d'app Chrome ordinaire.
Option Explicit

Const PORT = 7330
Const PAGE = "http://localhost:7330/builder/accueil.html"   ' localhost, jamais 127.0.0.1 : cf. CLAUDE.md

Dim sh, fso, racine, appId, node, chrome, i
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
racine = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
appId = ""
If WScript.Arguments.Count > 0 Then appId = WScript.Arguments(0)

' Le serveur repond-il ? /api/run n'existe que dans devserver.js (le serveur de repli de
' l'exe, lui, repond 404) : c'est le meme test que celui de l'exe.
Function Repond()
  Dim x
  Repond = False
  On Error Resume Next
  Set x = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  x.setTimeouts 1000, 1000, 1000, 1000
  x.open "GET", "http://127.0.0.1:" & PORT & "/api/run", False
  x.send
  If Err.Number = 0 Then Repond = (x.status = 200)
  On Error GoTo 0
End Function

If Not Repond() Then
  node = sh.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe")
  If Not fso.FileExists(node) Then node = "node"
  sh.CurrentDirectory = racine
  sh.Run "cmd /c set ADVENTURE_HOST=127.0.0.1&& """ & node & """ scripts\devserver.js >> ""%LOCALAPPDATA%\adventure-card-serveur.log"" 2>&1", 0, False
  For i = 1 To 60
    WScript.Sleep 250
    If Repond() Then Exit For
  Next
  If Not Repond() Then
    MsgBox "Le serveur de l'Atelier ne demarre pas." & vbCrLf & vbCrLf & _
      "Son journal : " & sh.ExpandEnvironmentStrings("%LOCALAPPDATA%\adventure-card-serveur.log"), _
      vbExclamation, "Atelier"
    WScript.Quit 1
  End If
End If

chrome = sh.ExpandEnvironmentStrings("%ProgramFiles%\Google\Chrome\Application\")
If appId <> "" And fso.FileExists(chrome & "chrome_proxy.exe") Then
  sh.Run """" & chrome & "chrome_proxy.exe"" --profile-directory=Default --app-id=" & appId, 1, False
Else
  sh.Run """" & chrome & "chrome.exe"" --app=" & PAGE, 1, False
End If
