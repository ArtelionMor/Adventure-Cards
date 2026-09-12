// Adventure Card - launcher Windows natif. Ouvre Edge en mode application sur le jeu et
// se ferme quand la fenetre du jeu est fermee.
//
// DEUX SERVEURS, ET IL PREFERE LE PREMIER :
//   1. scripts/devserver.js, le MEME que sur le Pi, lance ici quand Node est installe.
//      C'est lui qui apporte « Lancer un calcul », l'analyse par l'IA locale, les
//      renforts et les notifications - tout ce que le PC n'avait pas.
//   2. a defaut, le mini serveur HTTP integre ci-dessous (TcpListener : aucun droit admin
//      requis, contrairement a HttpListener qui demande une reservation d'URL). Il sert
//      les fichiers, /api/write et /api/sprites : le jeu et le builder marchent, les
//      calculs non - et builder/lancer.html le dit au lieu de rester muette.
// Reecrire /api/run en C# n'aurait aucun sens : il lance des scripts Node.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

static class Launcher
{
    static string Root;
    static int Port;
    static volatile bool Running = true;

    // Le port de scripts/devserver.js. Le meme que sur le Pi, pour qu'une adresse notee
    // quelque part marche des deux cotes.
    const int PortNode = 7330;
    static Process node;   // non nul seulement si c'est NOUS qui l'avons lance

    static readonly Dictionary<string, string> Mime = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        { ".html", "text/html; charset=utf-8" },
        { ".js",   "text/javascript; charset=utf-8" },
        { ".mjs",  "text/javascript; charset=utf-8" },
        { ".css",  "text/css; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" },
        { ".png",  "image/png" },
        { ".jpg",  "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".gif",  "image/gif" },
        { ".svg",  "image/svg+xml" },
        { ".webp", "image/webp" },
        { ".ico",  "image/x-icon" },
        { ".mp3",  "audio/mpeg" },
        { ".ogg",  "audio/ogg" },
        { ".wav",  "audio/wav" },
        { ".woff2","font/woff2" },
        { ".ttf",  "font/ttf" },
        { ".md",   "text/markdown; charset=utf-8" }
    };

    [STAThread]
    static int Main(string[] args)
    {
        // La racine web = le dossier qui contient game/. On remonte depuis l'exe.
        string exeDir = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
        Root = FindRoot(exeDir);
        if (Root == null)
        {
            Console.Error.WriteLine("Impossible de trouver le dossier 'game' a cote de l'executable.");
            Console.Error.WriteLine("Place AdventureCard.exe a la racine du projet Adventure-Cards.");
            Pause();
            return 1;
        }

        // Une fenetre fermee a la croix ne passe pas par la fin de Main : sans ca, un
        // devserver lance par nous survivrait au launcher et garderait le port.
        AppDomain.CurrentDomain.ProcessExit += delegate { ArreteNode(); };

        // 1. LE SERVEUR COMPLET. Deja en route (lance a la main) : on le reutilise tel
        //    quel. Sinon on le lance, si Node est installe.
        bool complet = false;
        if (File.Exists(Path.Combine(Root, "scripts", "devserver.js")))
        {
            if (ServeurComplet(PortNode))
            {
                Console.WriteLine("devserver.js deja en route sur le port " + PortNode + " : on le reutilise.");
                complet = true;
            }
            else
            {
                string exeNode = TrouveNode();
                if (exeNode == null)
                {
                    Console.WriteLine("Node introuvable : serveur integre (pas de « Lancer un calcul »).");
                }
                else
                {
                    Console.WriteLine("Demarrage de scripts/devserver.js ...");
                    complet = LanceNode(exeNode);
                    if (!complet) Console.WriteLine("devserver.js n'a pas repondu : repli sur le serveur integre.");
                }
            }
        }

        TcpListener listener = null;
        if (complet)
        {
            Port = PortNode;
        }
        else
        {
            Port = StartListener(out listener);
            if (Port == 0) { Console.Error.WriteLine("Aucun port libre."); Pause(); return 1; }
            Thread server = new Thread(delegate() { Serve(listener); });
            server.IsBackground = true;
            server.Start();
        }

        // « localhost » ET PAS « 127.0.0.1 » : ce sont deux origines differentes pour un
        // navigateur, donc deux localStorage. Le brouillon du builder, les reglages de
        // « Lancer un calcul » et l'autorisation des notifications sont ranges la : avec
        // 127.0.0.1, l'exe ne voyait pas le brouillon commence sous « node devserver.js ».
        string racine = "http://localhost:" + Port;
        string url = racine + "/game/index.html";
        Console.WriteLine("Adventure Card");
        Console.WriteLine("Jeu           : " + url);
        Console.WriteLine("Atelier       : " + racine + "/builder/accueil.html");
        Console.WriteLine("Card Builder  : " + racine + "/builder/index.html");
        Console.WriteLine(complet
            ? "Calculs       : " + racine + "/builder/lancer.html (analyse IA, renforts, notifications)"
            : "Calculs       : indisponibles sans Node - installe-le pour les avoir.");
        Console.WriteLine("Racine        : " + Root);
        Console.WriteLine("Ferme la fenetre du jeu pour quitter.");

        Process browser = OpenBrowser(url);
        bool suivi = false;
        if (browser != null)
        {
            // ⚠ ON NE SUIT PAS LE PROCESSUS QU'ON A LANCE. Edge passe la main a un autre
            // processus et sort aussitot (toujours quand une fenetre utilise deja ce
            // profil, souvent meme a froid) : attendre sa sortie couperait le serveur -
            // et depuis qu'il y en a un, le devserver avec - sous une fenetre de jeu
            // encore ouverte. On interroge le VERROU DU PROFIL, que Chromium garde ouvert
            // en exclusif tant qu'il tourne : c'est vrai pour Edge comme pour Chrome.
            for (int i = 0; i < 50 && !NavigateurOuvert(); i++) Thread.Sleep(200);  // il met un instant a paraitre
            suivi = NavigateurOuvert();
            while (NavigateurOuvert()) Thread.Sleep(1000);
        }
        if (!suivi)
        {
            if (browser == null)
            {
                Console.WriteLine("Navigateur dedie introuvable : ouverture dans le navigateur par defaut.");
                try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
            }
            else Console.WriteLine("Fenetre du jeu introuvable (pas de verrou de profil).");
            Console.WriteLine("Appuie sur Entree (ou ferme cette fenetre) pour arreter le serveur.");
            Console.ReadLine();
        }
        Running = false;
        try { if (listener != null) listener.Stop(); } catch { }
        ArreteNode();
        return 0;
    }

    // ------------------------------------------------------------- LE SERVEUR DE NODE

    /** Y a-t-il DEJA un devserver.js sur ce port ? On lui demande /api/run : le serveur
     *  integre repondrait 404, et n'importe quoi d'autre ne repondrait pas du HTTP -
     *  c'est ce qui le distingue d'un simple port ouvert. */
    static bool ServeurComplet(int port)
    {
        try
        {
            using (TcpClient c = new TcpClient())
            {
                IAsyncResult a = c.BeginConnect(IPAddress.Loopback, port, null, null);
                if (!a.AsyncWaitHandle.WaitOne(400)) return false;
                c.EndConnect(a);
                c.ReceiveTimeout = 2000;
                NetworkStream ns = c.GetStream();
                byte[] q = Encoding.ASCII.GetBytes("GET /api/run HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n");
                ns.Write(q, 0, q.Length);
                byte[] buf = new byte[32];
                int n = ns.Read(buf, 0, buf.Length);
                return n > 12 && Encoding.ASCII.GetString(buf, 0, n).StartsWith("HTTP/1.1 200");
            }
        }
        catch { return false; }
    }

    /** node.exe : le PATH d'abord (c'est la que l'installeur le met), puis les deux
     *  dossiers habituels - un exe lance depuis l'explorateur herite d'un PATH complet,
     *  mais autant ne pas en dependre. */
    static string TrouveNode()
    {
        string chemin = Environment.GetEnvironmentVariable("PATH");
        if (chemin != null)
        {
            foreach (string d in chemin.Split(';'))
            {
                if (d.Trim().Length == 0) continue;
                try
                {
                    string f = Path.Combine(d.Trim(), "node.exe");
                    if (File.Exists(f)) return f;
                }
                catch { }   // un PATH peut contenir des caracteres interdits dans un chemin
            }
        }
        string[] pistes =
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs\\node.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs\\node.exe")
        };
        foreach (string f in pistes) if (File.Exists(f)) return f;
        return null;
    }

    /** Lance scripts/devserver.js et attend qu'il reponde (20 s au plus : le port peut
     *  etre pris par autre chose, et Node sort alors tout seul). */
    static bool LanceNode(string exeNode)
    {
        ProcessStartInfo psi = new ProcessStartInfo(exeNode, "scripts/devserver.js");
        psi.WorkingDirectory = Root;
        psi.UseShellExecute = false;   // requis pour EnvironmentVariables, et garde la console
        psi.EnvironmentVariables["PORT"] = PortNode.ToString();
        // LOOPBACK. Sur le Pi le serveur ecoute partout (c'est ce qui sert le telephone) ;
        // ici il n'a que cette machine a servir, et Windows ne demande donc pas d'ouvrir
        // le pare-feu au premier lancement.
        psi.EnvironmentVariables["ADVENTURE_HOST"] = "127.0.0.1";
        // Sa banniere ferait doublon avec la notre, juste en dessous.
        psi.EnvironmentVariables["ADVENTURE_DISCRET"] = "1";
        try { node = Process.Start(psi); }
        catch { node = null; return false; }
        for (int i = 0; i < 100 && !node.HasExited; i++)
        {
            if (ServeurComplet(PortNode)) return true;
            Thread.Sleep(200);
        }
        ArreteNode();
        return false;
    }

    /** On tue l'ARBRE : un calcul en cours est un processus fils de devserver.js, et il
     *  garderait les coeurs de la machine. Un serveur qu'on n'a pas lance n'est pas a nous. */
    static void ArreteNode()
    {
        Process p = node;
        node = null;
        if (p == null) return;
        try
        {
            if (p.HasExited) return;
            ProcessStartInfo psi = new ProcessStartInfo("taskkill", "/PID " + p.Id + " /T /F");
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            Process.Start(psi).WaitForExit(5000);
        }
        catch { }
    }

    static string FindRoot(string start)
    {
        DirectoryInfo d = new DirectoryInfo(start);
        for (int i = 0; i < 5 && d != null; i++)
        {
            if (Directory.Exists(Path.Combine(d.FullName, "game"))) return d.FullName;
            d = d.Parent;
        }
        return null;
    }

    static int StartListener(out TcpListener listener)
    {
        // On demarre a 7332 : 7330 est a devserver.js, 7331 au renfort (scripts/renfort.mjs).
        for (int p = 7332; p < 7381; p++)
        {
            try
            {
                TcpListener l = new TcpListener(IPAddress.Loopback, p);
                l.Start();
                listener = l;
                return p;
            }
            catch (SocketException) { }
        }
        listener = null;
        return 0;
    }

    /** Le profil du navigateur du jeu : un dossier a nous, separe de celui de l'utilisateur. */
    static string Profil()
    {
        return Path.Combine(Path.GetTempPath(), "AdventureCardProfile");
    }

    /** La fenetre du jeu est-elle encore ouverte ? Chromium tient « lockfile » a la racine
     *  du profil en exclusif tant qu'il tourne : si on arrive a le prendre, il est parti. */
    static bool NavigateurOuvert()
    {
        string f = Path.Combine(Profil(), "lockfile");
        if (!File.Exists(f)) return false;
        try
        {
            using (File.Open(f, FileMode.Open, FileAccess.ReadWrite, FileShare.None)) { }
            return false;
        }
        catch (FileNotFoundException) { return false; }   // derive d'IOException : avant elle
        catch (IOException) { return true; }
        catch (UnauthorizedAccessException) { return true; }
        catch { return false; }
    }

    static Process OpenBrowser(string url)
    {
        // Fenetre "app" (sans barre d'adresse) au format telephone : le jeu est concu portrait.
        string profile = Profil();
        string flags = "--app=" + url
            + " --user-data-dir=\"" + profile + "\""
            + " --window-size=430,880"
            + " --no-first-run --no-default-browser-check --disable-features=Translate";

        string[] candidates =
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft\\Edge\\Application\\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft\\Edge\\Application\\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google\\Chrome\\Application\\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google\\Chrome\\Application\\chrome.exe")
        };
        foreach (string exe in candidates)
        {
            if (File.Exists(exe))
            {
                try { return Process.Start(new ProcessStartInfo(exe, flags) { UseShellExecute = false }); }
                catch { }
            }
        }
        return null;
    }

    static void Serve(TcpListener listener)
    {
        while (Running)
        {
            TcpClient client;
            try { client = listener.AcceptTcpClient(); }
            catch { return; }
            ThreadPool.QueueUserWorkItem(new WaitCallback(Handle), client);
        }
    }

    // Le Card Builder n'a le droit d'ecrire que la, et rien d'autre.
    static bool CanWrite(string rel)
    {
        rel = rel.Replace('\\', '/');
        return System.Text.RegularExpressions.Regex.IsMatch(rel, @"^game/data/[\w.-]+\.(js|json)$")
            || System.Text.RegularExpressions.Regex.IsMatch(rel, @"^docs/[\w.-]+\.md$");
    }

    // LES DOSSIERS D'IMAGES, rebalayes a la demande (« Actualiser les images » dans le
    // Card Builder). Le serveur de dev fait la meme chose en appelant
    // scripts/gen-sprites.mjs ; ici on est en C#, donc ce balayage est ecrit deux fois.
    // Les deux doivent produire le MEME fichier : meme ordre (ordinal, comme le .sort()
    // de JavaScript), meme mise en forme, memes fins de ligne.
    static readonly string[] SpriteFolders = { "Characters", "Machines", "Ressources", "UI" };
    static readonly string[] SpriteExt = { ".png", ".jpg", ".jpeg", ".webp", ".gif" };

    /** Balaye les dossiers, reecrit game/data/sprites.js, et rend le JSON de la liste. */
    static string GenereSprites()
    {
        StringBuilder json = new StringBuilder("{\n");
        bool premierDossier = true;
        foreach (string dossier in SpriteFolders)
        {
            string dir = Path.Combine(Root, dossier);
            if (!Directory.Exists(dir)) continue;
            List<string> noms = new List<string>();
            foreach (string f in Directory.GetFiles(dir))
            {
                string ext = Path.GetExtension(f).ToLowerInvariant();
                if (Array.IndexOf(SpriteExt, ext) >= 0) noms.Add(Path.GetFileName(f));
            }
            noms.Sort(StringComparer.Ordinal);
            if (!premierDossier) json.Append(",\n");
            premierDossier = false;
            json.Append("  ").Append(JsonTexte(dossier)).Append(": [");
            for (int i = 0; i < noms.Count; i++)
            {
                json.Append(i == 0 ? "\n" : ",\n").Append("    ").Append(JsonTexte(noms[i]));
            }
            json.Append(noms.Count == 0 ? "]" : "\n  ]");
        }
        json.Append("\n}");

        string contenu = "// Genere par scripts/gen-sprites.mjs — ne pas editer a la main.\n"
            + "export const SPRITES = " + json + ";\n";
        File.WriteAllText(Path.Combine(Root, "game", "data", "sprites.js"), contenu, new UTF8Encoding(false));
        return json.ToString();
    }

    /** Une chaine JSON entre guillemets : les noms de fichiers passent par la. */
    static string JsonTexte(string s)
    {
        StringBuilder b = new StringBuilder("\"");
        foreach (char c in s)
        {
            if (c == '"' || c == '\\') b.Append('\\').Append(c);
            else if (c < ' ') b.Append("\\u").Append(((int)c).ToString("x4"));
            else b.Append(c);
        }
        return b.Append('"').ToString();
    }

    static void Handle(object o)
    {
        using (TcpClient client = (TcpClient)o)
        using (NetworkStream ns = client.GetStream())
        {
            try
            {
                client.ReceiveTimeout = 5000;
                string requestLine = ReadLine(ns);
                if (string.IsNullOrEmpty(requestLine)) return;

                int length = 0;
                string header;
                while (!string.IsNullOrEmpty(header = ReadLine(ns)))
                {
                    if (header.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                        int.TryParse(header.Substring(15).Trim(), out length);
                }

                string[] parts = requestLine.Split(' ');
                if (parts.Length < 2) { Send(ns, 400, "text/plain", Encoding.UTF8.GetBytes("Bad request")); return; }

                string rawPath = parts[1];
                string query = "";
                int qm = rawPath.IndexOf('?');
                if (qm >= 0) { query = rawPath.Substring(qm + 1); rawPath = rawPath.Substring(0, qm); }

                // « J'ai ajoute une image » : on rebalaye les dossiers, on reecrit
                // game/data/sprites.js et on rend la liste au builder, qui l'affiche
                // sans rechargement. Rien a lire dans la requete.
                if (parts[0] == "POST" && rawPath == "/api/sprites")
                {
                    try
                    {
                        string liste = GenereSprites();
                        Console.WriteLine("sprites relus");
                        Send(ns, 200, "application/json; charset=utf-8", Encoding.UTF8.GetBytes(liste));
                    }
                    catch (Exception ex)
                    {
                        Send(ns, 500, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes(ex.Message));
                    }
                    return;
                }

                // Ecriture demandee par le Card Builder.
                if (parts[0] == "POST" && rawPath == "/api/write")
                {
                    string rel = "";
                    foreach (string pair in query.Split('&'))
                    {
                        if (pair.StartsWith("path=")) rel = Uri.UnescapeDataString(pair.Substring(5)).Replace('\\', '/');
                    }
                    if (!CanWrite(rel)) { Send(ns, 403, "text/plain", Encoding.UTF8.GetBytes("Chemin non autorise : " + rel)); return; }
                    byte[] body = ReadBody(ns, length);
                    string dest = Path.GetFullPath(Path.Combine(Root, rel.Replace('/', Path.DirectorySeparatorChar)));
                    if (!dest.StartsWith(Root, StringComparison.OrdinalIgnoreCase))
                    { Send(ns, 403, "text/plain", Encoding.UTF8.GetBytes("Forbidden")); return; }
                    Directory.CreateDirectory(Path.GetDirectoryName(dest));
                    File.WriteAllText(dest, Encoding.UTF8.GetString(body), new UTF8Encoding(false));
                    Console.WriteLine("ecrit : " + rel + " (" + body.Length + " octets)");
                    Send(ns, 200, "text/plain", Encoding.UTF8.GetBytes("ok"));
                    return;
                }

                string path = rawPath;
                path = Uri.UnescapeDataString(path).Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
                if (path.Length == 0) path = Path.Combine("game", "index.html");

                string full = Path.GetFullPath(Path.Combine(Root, path));
                if (!full.StartsWith(Root, StringComparison.OrdinalIgnoreCase))
                { Send(ns, 403, "text/plain", Encoding.UTF8.GetBytes("Forbidden")); return; }
                if (Directory.Exists(full)) full = Path.Combine(full, "index.html");
                if (!File.Exists(full))
                { Send(ns, 404, "text/plain", Encoding.UTF8.GetBytes("Not found: " + path)); return; }

                string type;
                if (!Mime.TryGetValue(Path.GetExtension(full), out type)) type = "application/octet-stream";
                Send(ns, 200, type, File.ReadAllBytes(full));
            }
            catch { }
        }
    }

    static byte[] ReadBody(NetworkStream ns, int length)
    {
        byte[] buf = new byte[length];
        int read = 0;
        while (read < length)
        {
            int n = ns.Read(buf, read, length - read);
            if (n <= 0) break;
            read += n;
        }
        return buf;
    }

    static string ReadLine(NetworkStream ns)
    {
        StringBuilder sb = new StringBuilder();
        int b;
        while ((b = ns.ReadByte()) != -1)
        {
            if (b == 10) break;
            if (b != 13) sb.Append((char)b);
        }
        return sb.ToString();
    }

    static void Send(NetworkStream ns, int code, string type, byte[] body)
    {
        string status = code == 200 ? "OK" : code == 404 ? "Not Found" : code == 403 ? "Forbidden" : "Bad Request";
        StringBuilder h = new StringBuilder();
        h.Append("HTTP/1.1 ").Append(code).Append(' ').Append(status).Append("\r\n");
        h.Append("Content-Type: ").Append(type).Append("\r\n");
        h.Append("Content-Length: ").Append(body.Length).Append("\r\n");
        h.Append("Cache-Control: no-store\r\n");
        h.Append("Connection: close\r\n\r\n");
        byte[] head = Encoding.UTF8.GetBytes(h.ToString());
        ns.Write(head, 0, head.Length);
        ns.Write(body, 0, body.Length);
        ns.Flush();
    }

    static void Pause()
    {
        Console.WriteLine("Appuie sur Entree pour fermer.");
        Console.ReadLine();
    }
}
