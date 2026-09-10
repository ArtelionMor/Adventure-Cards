// Serveur de dev : sert la racine du projet sur http://localhost:7330
// (meme arborescence que le launcher .exe, pour que les chemins d'assets soient identiques).
//
// Expose aussi POST /api/write?path=<chemin relatif>, utilise par le Card Builder pour
// ecrire ses fichiers, POST /api/sprites, qui rebalaye les dossiers d'images et
// reecrit game/data/sprites.js (le bouton « Actualiser les images » du builder), et
// /api/run, qui lance un outil de mesure (page builder/lancer.html). Seuls les chemins
// et les scripts des listes blanches sont acceptes.
//
// ⚠ Le serveur ecoute sur TOUTES les interfaces : c'est ce qui permet au Pi de servir
// le telephone (Wi-Fi ou Tailscale). Ne jamais l'exposer a internet : /api/write ecrit
// et /api/run lance des scripts, sans aucun mot de passe.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 7330;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

// Le builder n'a le droit d'ecrire que la, et rien d'autre.
const WRITABLE = [/^game\/data\/[\w.-]+\.(js|json)$/, /^docs\/[\w.-]+\.md$/];
const canWrite = rel => WRITABLE.some(re => re.test(rel));

// Le balayage des dossiers d'images vit dans scripts/gen-sprites.mjs — une seule
// implementation, la meme liste en ligne de commande et depuis le builder. C'est un
// module ES, d'ou l'import dynamique (ce fichier-ci est en CommonJS).
const genereSprites = () => import('./gen-sprites.mjs').then(m => m.genereSprites());

// ------------------------------------------------------------------ /api/run
// Lancer un outil de mesure SUR LA MACHINE QUI SERT LA PAGE (le Pi) et lire sa sortie
// depuis un telephone. Le calcul tourne dans un processus a part et la page ne fait
// que demander ou il en est (GET) : un ecran qui se met en veille ne tue donc rien, on
// rouvre la page et on retrouve la sortie la ou elle en etait.
// Un seul calcul a la fois : deux mesures se voleraient les coeurs.
//
// La liste blanche : on ne lance QUE ces scripts. `brouillon` dit si l'outil peut
// mesurer le brouillon du builder — pas les bancs de test, qui s'appuient sur des
// cartes precises du fichier du jeu.
const OUTILS = {
  simulate: { fichier: 'scripts/simulate.mjs', brouillon: true },
  matchups: { fichier: 'scripts/matchups.mjs', brouillon: true },
  'check-decks': { fichier: 'scripts/check-decks.mjs', brouillon: true },
  'analyse-cartes': { fichier: 'scripts/analyse-cartes.mjs', brouillon: true },
  'test-triggers': { fichier: 'scripts/test-triggers.mjs', brouillon: false },
  'test-ai': { fichier: 'scripts/test-ai.mjs', brouillon: false }
};
// Des arguments courts, sans espace (on ne passe de toute facon pas par un shell).
// --csv et --logs sont refuses : ils ecriraient sur le serveur un fichier choisi par
// la page.
const ARG_OK = /^[\w.,:=+-]{1,80}$/;
const ARG_INTERDITS = ['--csv', '--logs'];
const SORTIE_MAX = 2000000;   // au-dela, on oublie le debut de la sortie
const CROCHET = pathToFileURL(path.join(__dirname, 'lib', 'brouillon.mjs')).href;

let calcul = null;   // le dernier lance, termine ou non

// `depuis` : ce que la page a deja recu (en caracteres depuis le debut du calcul). On
// ne renvoie que la suite, et `depuis` dans la reponse dit ou elle commence vraiment —
// si le debut a ete oublie entre-temps, la page le voit et repart de la.
function etatCalcul(depuis) {
  if (!calcul) return { id: null };
  const c = calcul;
  const i = Math.max(0, (Number(depuis) || 0) - c.oublie);
  return {
    id: c.id, outil: c.outil, args: c.args, brouillon: c.brouillon,
    debut: c.debut, fin: c.fin, code: c.code, enCours: !!c.proc,
    depuis: c.oublie + Math.min(i, c.sortie.length), longueur: c.oublie + c.sortie.length,
    texte: c.sortie.slice(i)
  };
}

function lanceCalcul(demande) {
  const outil = OUTILS[demande.outil];
  if (!outil) throw new Error('Outil inconnu : ' + demande.outil);
  const args = Array.isArray(demande.args) ? demande.args.map(String) : [];
  for (const a of args) {
    if (!ARG_OK.test(a)) throw new Error('Argument refuse : ' + a);
    if (ARG_INTERDITS.includes(a.split('=')[0])) throw new Error('Argument refuse sur le serveur : ' + a);
  }
  const id = Date.now().toString(36);
  // Le brouillon voyage avec la demande : c'est lui qu'on mesure, pas le fichier du
  // jeu. Un fichier par calcul — l'effacement du precedent ne doit pas tomber sur lui.
  let brouillon = null;
  if (demande.data && outil.brouillon) {
    brouillon = path.join(os.tmpdir(), 'adventure-card-brouillon-' + id + '.mjs');
    fs.writeFileSync(brouillon, 'export const CHARACTER_DATA = ' + JSON.stringify(demande.data) + ';\n', 'utf8');
  }
  const proc = spawn(process.execPath, ['--import', CROCHET, outil.fichier, ...args], {
    cwd: ROOT, env: { ...process.env, ADVENTURE_BROUILLON: brouillon || '' }, windowsHide: true
  });
  const c = calcul = {
    id, outil: demande.outil, args, brouillon: !!brouillon,
    debut: Date.now(), fin: null, code: null, proc, sortie: '', oublie: 0
  };
  const ajoute = texte => {
    c.sortie += texte;
    if (c.sortie.length > SORTIE_MAX) {
      const n = c.sortie.length - SORTIE_MAX;
      c.sortie = c.sortie.slice(n);
      c.oublie += n;
    }
  };
  const termine = code => {
    if (!c.proc) return;
    c.proc = null; c.code = code; c.fin = Date.now();
    if (brouillon) fs.rm(brouillon, { force: true }, () => {});
    console.log('calcul termine : ' + c.outil + ' (' + code + ', ' + Math.round((c.fin - c.debut) / 1000) + ' s)');
  };
  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');
  proc.stdout.on('data', ajoute);
  proc.stderr.on('data', ajoute);
  proc.on('error', e => { ajoute('\n[erreur] ' + e.message + '\n'); termine('erreur'); });
  proc.on('close', (code, signal) => termine(signal || code));
  console.log('calcul lance : ' + outil.fichier + ' ' + args.join(' ') + (brouillon ? ' (brouillon)' : ''));
}

const json = (res, code, obj) =>
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    .end(JSON.stringify(obj));

http.createServer((req, res) => {
  const [urlPath, query] = req.url.split('?');

  // « J'ai ajoute une image dans Characters/ » : on rebalaye et on rend la liste, que
  // le builder affiche sans rechargement. Rien a lire dans la requete.
  if (req.method === 'POST' && urlPath === '/api/sprites') {
    genereSprites().then(sprites => {
      console.log('sprites relus : ' + Object.entries(sprites).map(([k, v]) => k + ' ' + v.length).join(' · '));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(sprites));
    }).catch(e => res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(String(e && e.message || e)));
    return;
  }

  // Ou en est le calcul ? La page le demande toutes les secondes tant qu'il tourne.
  if (req.method === 'GET' && urlPath === '/api/run') {
    json(res, 200, etatCalcul(new URLSearchParams(query || '').get('depuis')));
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/run') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; });
    req.on('end', () => {
      if (calcul && calcul.proc) { json(res, 409, { erreur: 'Un calcul tourne deja : ' + calcul.outil }); return; }
      try {
        lanceCalcul(JSON.parse(body || '{}'));
        json(res, 200, etatCalcul(0));
      } catch (e) {
        json(res, 400, { erreur: e.message });
      }
    });
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/run/stop') {
    if (calcul && calcul.proc) calcul.proc.kill();
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/write') {
    const rel = decodeURIComponent(new URLSearchParams(query || '').get('path') || '').replace(/\\/g, '/');
    if (!canWrite(rel)) { res.writeHead(403).end('Chemin non autorise : ' + rel); return; }
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const file = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, body, 'utf8');
      console.log('ecrit : ' + rel + ' (' + body.length + ' caracteres)');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('ok');
    });
    return;
  }

  let rel = decodeURIComponent(urlPath);
  if (rel === '/') rel = '/game/index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('Not found: ' + rel); return; }
    // CACHE TRES COURT SUR LES SOURCES. Sans lui, chaque Web Worker de la page
    // d'equilibrage refait les 7 requetes du graphe de modules : seize ouvriers font
    // 112 requetes d'un coup, le navigateur n'ouvre que 6 connexions a la fois, et des
    // workers restent muets a attendre leurs modules. Deux secondes suffisent a servir
    // toute la grappe depuis le cache memoire, sans jamais gener l'edition : les
    // DONNEES du jeu, elles, restent en 'no-store' (le builder doit les relire fraiches,
    // et les pages qui veulent la derniere version ajoutent deja un « ?t= »).
    const donnees = rel.startsWith('/game/data/') || file.endsWith('.html');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': donnees ? 'no-store' : 'max-age=2'
    });
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log('Adventure Card dev  : http://localhost:' + PORT + '/game/index.html');
  console.log('Card Builder        : http://localhost:' + PORT + '/builder/index.html');
});
