// Serveur de dev : sert la racine du projet sur http://localhost:7330
// (meme arborescence que le launcher .exe, pour que les chemins d'assets soient identiques).
//
// Expose aussi POST /api/write?path=<chemin relatif>, utilise par le Card Builder pour
// ecrire ses fichiers. Seuls les chemins de la liste blanche sont acceptes, et le
// serveur n'ecoute que sur la boucle locale.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 7330;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8'
};

// Le builder n'a le droit d'ecrire que la, et rien d'autre.
const WRITABLE = [/^game\/data\/[\w.-]+\.(js|json)$/, /^docs\/[\w.-]+\.md$/];
const canWrite = rel => WRITABLE.some(re => re.test(rel));

http.createServer((req, res) => {
  const [urlPath, query] = req.url.split('?');

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
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log('Adventure Card dev  : http://localhost:' + PORT + '/game/index.html');
  console.log('Card Builder        : http://localhost:' + PORT + '/builder/index.html');
});
