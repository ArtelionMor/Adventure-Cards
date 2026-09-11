// LE RENFORT : cette machine joue une partie des cases d'un calcul lance sur le Pi.
//
//   node scripts/renfort.mjs            (port 7331 ; ADVENTURE_RENFORT_PORT pour un autre)
//   node scripts/renfort.mjs --jobs 8   (sinon un worker par coeur)
//
// La file de taches du Pi (scripts/lib/pool.mjs, via scripts/lib/renforts.mjs) lui envoie
// des PAQUETS : un module de taches de la liste blanche, son contexte, les donnees
// mesurees et les taches elles-memes. Chaque paquet se joue dans un processus neuf
// (scripts/lib/renfort-lot.mjs), le crochet du brouillon pointe sur les donnees recues —
// exactement comme un calcul lance par le serveur mesure un brouillon. Les resultats
// repartent au fil de l'eau, une ligne JSON par tache, et un signe de vie toutes les 10 s.
//
// ⚠ Il ecoute sur toutes les interfaces : une regle de pare-feu doit le limiter a
// Tailscale (100.64.0.0/10), comme Ollama. Il n'execute jamais de code recu — modules en
// liste blanche, donnees en JSON qu'il reecrit lui-meme — mais qui le joint peut occuper
// ses coeurs.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORT as PORT_DEFAUT, MODULES, empreinte, moduleDeDonnees } from './lib/renforts.mjs';
import { nombreDeJobs } from './lib/pool.mjs';

const PORT = Number(process.env.ADVENTURE_RENFORT_PORT) || PORT_DEFAUT;
const JOBS = nombreDeJobs();
const LOT = fileURLToPath(new URL('./lib/renfort-lot.mjs', import.meta.url));
const CROCHET = new URL('./lib/brouillon.mjs', import.meta.url).href;
const CORPS_MAX = 50 * 1024 * 1024;
let occupe = 0;

const heure = () => new Date().toLocaleTimeString('fr-FR');
const json = (res, code, d) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(d));
};

function litCorps(req) {
  return new Promise((ok, ko) => {
    const bouts = [];
    let n = 0;
    req.on('data', b => {
      n += b.length;
      if (n > CORPS_MAX) { ko(new Error('paquet trop gros')); req.destroy(); } else bouts.push(b);
    });
    req.on('end', () => ok(Buffer.concat(bouts).toString('utf8')));
    req.on('error', ko);
  });
}

/** Les donnees recues, ecrites en module — une fois par version des cartes. */
function fichierDeDonnees(donnees) {
  const texte = moduleDeDonnees(donnees);
  const f = join(tmpdir(), `adventure-card-renfort-${createHash('sha256').update(texte).digest('hex').slice(0, 16)}.mjs`);
  if (!existsSync(f)) writeFileSync(f, texte, 'utf8');
  return f;
}

async function lot(req, res) {
  let p;
  try { p = JSON.parse(await litCorps(req)); } catch (e) { json(res, 400, { erreur: 'paquet illisible : ' + e.message }); return; }
  if (!MODULES.includes(p.module)) { json(res, 400, { erreur: 'module refusé : ' + p.module }); return; }
  if (!Array.isArray(p.taches) || !p.taches.length) { json(res, 400, { erreur: 'aucune tâche' }); return; }
  if (!p.donnees || typeof p.donnees !== 'object') { json(res, 400, { erreur: 'données manquantes' }); return; }
  // Le code a pu changer entre la sonde et ce paquet (un « git pull » en plein calcul).
  if (p.empreinte && p.empreinte !== empreinte()) { json(res, 409, { erreur: 'pas le même code que le Pi (git pull ?)' }); return; }

  const debut = Date.now();
  occupe++;
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
  const env = { ...process.env, ADVENTURE_BROUILLON: fichierDeDonnees(p.donnees), ADVENTURE_RENFORT_JOBS: String(JOBS) };
  delete env.ADVENTURE_PROGRESSION;   // la sortie de l'enfant ne doit porter que des resultats
  const enfant = spawn(process.execPath, ['--import', CROCHET, LOT], { env, windowsHide: true });

  // Des LIGNES entieres seulement : le signe de vie ne doit jamais tomber au milieu d'un resultat.
  let reste = '', erreurs = '';
  enfant.stdout.setEncoding('utf8');
  enfant.stdout.on('data', t => {
    reste += t;
    const fin = reste.lastIndexOf('\n');
    if (fin >= 0) { res.write(reste.slice(0, fin + 1)); reste = reste.slice(fin + 1); }
  });
  enfant.stderr.on('data', b => { erreurs = (erreurs + b).slice(-2000); });
  const vie = setInterval(() => res.write('{"vivant":true}\n'), 10_000);
  // Le Pi a coupe (calcul arrete, Pi redemarre) : inutile de continuer a jouer pour personne.
  res.on('close', () => { if (!res.writableEnded) enfant.kill(); });

  enfant.on('close', code => {
    clearInterval(vie);
    occupe--;
    if (reste.trim()) res.write(reste.endsWith('\n') ? reste : reste + '\n');
    // La ligne qui dit ce qui a echoue (« TypeError: … »), pas la version de Node que
    // Node ajoute toujours a la fin d'un plantage.
    const lignes = erreurs.split('\n').map(l => l.trim()).filter(l => l && !/^Node\.js v\d/.test(l));
    const derniere = (lignes.find(l => /^\w*Error\b|^Error:/.test(l)) || lignes.pop() || '').slice(0, 300);
    res.end(code === 0 ? '{"fin":true}\n' : JSON.stringify({ erreur: `le paquet a échoué (code ${code}) : ${derniere}` }) + '\n');
    console.log(`${heure()} · ${p.taches.length} ${p.module === 'taches-courbe' ? 'combinaisons' : 'cases'} en `
      + `${Math.round((Date.now() - debut) / 1000)} s${code === 0 ? '' : ' — ÉCHEC : ' + derniere}`);
  });
  enfant.stdin.end(JSON.stringify({ module: p.module, contexte: p.contexte || {}, taches: p.taches }));
}

const serveur = http.createServer((req, res) => {
  const chemin = req.url.split('?')[0];
  if (req.method === 'GET' && chemin === '/etat') {
    json(res, 200, { machine: hostname(), empreinte: empreinte(), coeurs: JOBS, occupe });
    return;
  }
  if (req.method === 'POST' && chemin === '/lot') {
    lot(req, res).catch(e => { try { json(res, 500, { erreur: e.message }); } catch { /* reponse deja partie */ } });
    return;
  }
  json(res, 404, { erreur: 'inconnu' });
});

serveur.listen(PORT, () => {
  console.log(`Renfort de ${hostname()} : ${JOBS} coeurs, port ${PORT}, code ${empreinte()}.`);
  console.log('Il attend les cases que lui envoie le Pi. Ctrl+C pour l\'arreter.');
});
