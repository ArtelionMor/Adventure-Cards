// Un petit serveur de fichiers, le temps d'un rendu : la racine du projet, en lecture seule,
// sur un port libre de la boucle locale. Les modules ES ne se chargent pas en file://, et on
// ne veut pas dependre d'un devserver lance (ni de son cache de deux secondes).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.css': 'text/css; charset=utf-8' };

export function serveur(racine) {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(racine, rel);
      if (!f.startsWith(racine)) { res.writeHead(403).end(); return; }
      fs.readFile(f, (err, buf) => {
        if (err) { res.writeHead(404).end('introuvable : ' + rel); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(buf);
      });
    });
    s.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${s.address().port}`, ferme: () => new Promise(r => s.close(r)) }));
  });
}
