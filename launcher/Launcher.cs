// Adventure Card - launcher Windows natif.
// Sert le dossier du jeu via un mini serveur HTTP local (TcpListener : aucun droit admin
// requis, contrairement a HttpListener qui demande une reservation d'URL), puis ouvre
// Edge en mode application. Se ferme quand la fenetre du jeu est fermee.
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

        TcpListener listener;
        Port = StartListener(out listener);
        if (Port == 0) { Console.Error.WriteLine("Aucun port libre."); Pause(); return 1; }

        Thread server = new Thread(delegate() { Serve(listener); });
        server.IsBackground = true;
        server.Start();

        string url = "http://127.0.0.1:" + Port + "/game/index.html";
        Console.WriteLine("Adventure Card");
        Console.WriteLine("Serveur local : " + url);
        Console.WriteLine("Racine        : " + Root);
        Console.WriteLine("Card Builder  : http://127.0.0.1:" + Port + "/builder/index.html");
        Console.WriteLine("Ferme la fenetre du jeu pour quitter.");

        Process browser = OpenBrowser(url);
        if (browser == null)
        {
            Console.WriteLine("Navigateur dedie introuvable : ouverture dans le navigateur par defaut.");
            try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
            Console.WriteLine("Appuie sur Entree pour arreter le serveur.");
            Console.ReadLine();
        }
        else
        {
            browser.WaitForExit();
        }
        Running = false;
        try { listener.Stop(); } catch { }
        return 0;
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
        for (int p = 7331; p < 7381; p++)
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

    static Process OpenBrowser(string url)
    {
        // Fenetre "app" (sans barre d'adresse) au format telephone : le jeu est concu portrait.
        string profile = Path.Combine(Path.GetTempPath(), "AdventureCardProfile");
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
