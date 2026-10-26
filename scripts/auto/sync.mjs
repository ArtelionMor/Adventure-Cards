// RAPATRIE les personnages decoupes par le lot (scripts/auto/lot.py, qui tourne sur mon-mien) : copie leurs fichiers de rig
// et leur rapport, verifie qu'on n'ecrase le travail de personne, controle avec test-rig, tient a jour la liste de ce qui
// est a verifier (docs/RIG-AUTO-A-VERIFIER.md) et, avec --pousse, commite et pousse.
//
//   node scripts/auto/sync.mjs [--pousse] [--machine telia@100.79.166.73] [--distant C:/Users/telia]
//
// Sortie : une ligne JSON { vivant, battement, faits, a_verifier, echecs, ignores, en_cours, nouveaux, conflits, test } — c'est ce
// que lit la routine horaire. Code de sortie 0 meme s'il y a des problemes (ils sont dans le JSON).
//
// ⚠ Un personnage dont le rig a CHANGE sur GitHub depuis le depart du lot (quelqu'un l'a decoupe, maille ou anime sur le Pi)
// n'est jamais ecrase : il est range dans « conflits ».

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const MACHINE = opt('--machine', 'telia@100.79.166.73');
const DISTANT = opt('--distant', 'C:/Users/telia');
const sh = (cmd, a, o = {}) => spawnSync(cmd, a, { encoding: 'utf8', cwd: ROOT, timeout: 600000, ...o });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-auto-'));

const sortie = { vivant: false, battement: null, faits: 0, a_verifier: 0, echecs: 0, ignores: 0, en_cours: null, nouveaux: [], conflits: [], test: null, erreur: null };
const fin = () => { console.log(JSON.stringify(sortie)); process.exit(0); };

// 1. l'etat du lot
const r = sh('scp', ['-q', `${MACHINE}:${DISTANT}/auto/etat.json`, path.join(tmp, 'etat.json')]);
if (r.status !== 0) { sortie.erreur = 'mon-mien injoignable ou pas d\'etat.json : ' + (r.stderr || '').trim().slice(0, 200); fin(); }
const etat = JSON.parse(fs.readFileSync(path.join(tmp, 'etat.json'), 'utf8'));
sortie.battement = etat._battement || null; sortie.en_cours = etat._courant || null;
sortie.vivant = !!sortie.battement && (Date.now() - new Date(sortie.battement).getTime()) < 20 * 60 * 1000;
for (const [id, e] of Object.entries(etat)) {
  if (id.startsWith('_')) continue;
  if (e.statut === 'fait') sortie.faits++; else if (e.statut === 'a_verifier') sortie.a_verifier++;
  else if (e.statut === 'echec') sortie.echecs++; else if (e.statut === 'ignore') sortie.ignores++;
}

// 2. ce qui est deja rapatrie
const fSync = path.join(ROOT, 'art-sortie', 'auto', 'synchro.json');
fs.mkdirSync(path.dirname(fSync), { recursive: true });
const synchro = fs.existsSync(fSync) ? JSON.parse(fs.readFileSync(fSync, 'utf8')) : {};

// 3. le rig est-il toujours « brut » sur GitHub ? (une seule calque, pas de maillage, pas de clip)
sh('git', ['fetch', '-q']);
const sha = t => createHash('sha1').update(String(t).split(String.fromCharCode(13)).join('')).digest('hex');
synchro._hash = synchro._hash || {};   // le contenu de rig.json tel que NOUS l'avons pousse : s'il a change, quelqu'un y a travaille
function brutSurGithub(id) {
  const rig = sh('git', ['show', `origin/master:game/data/rigs/${id}/rig.json`]);
  if (rig.status !== 0) return true;                       // pas encore sur GitHub : rien a ecraser
  if (synchro._hash[id] && sha(rig.stdout) === synchro._hash[id]) return true;   // c'est encore notre resultat, intact
  try {
    const j = JSON.parse(rig.stdout);
    if ((j.calques || []).length !== 1 || (j.calques || []).some(c => c.mesh)) return false;
  } catch { return false; }
  const clips = sh('git', ['show', `origin/master:game/data/rigs/${id}/clips.json`]);
  if (clips.status === 0) { try { if (Object.keys(JSON.parse(clips.stdout).clips || {}).length) return false; } catch { return false; } }
  return true;
}

// 4. copier ce qui est nouveau
for (const [id, e] of Object.entries(etat)) {
  if (id.startsWith('_') || !['fait', 'a_verifier'].includes(e.statut)) continue;
  if (synchro[id] === e.fin && fs.existsSync(path.join(ROOT, 'game/data/rigs', id, 'calques'))) continue;
  if (!brutSurGithub(id)) { sortie.conflits.push(id); continue; }
  const dest = path.join(ROOT, 'game/data/rigs', id), rapp = path.join(ROOT, 'art-sortie/auto', id);
  fs.mkdirSync(rapp, { recursive: true });
  // les calques d'une ancienne passe sont retires : un rig n'a que ceux de la derniere
  fs.rmSync(path.join(dest, 'calques'), { recursive: true, force: true });
  fs.rmSync(path.join(dest, 'masques'), { recursive: true, force: true });
  const a = sh('scp', ['-q', '-r', `${MACHINE}:${DISTANT}/Adventure-Cards/game/data/rigs/${id}/*`, dest + '/']);
  const b = sh('scp', ['-q', '-r', `${MACHINE}:${DISTANT}/auto/sortie/${id}/*`, rapp + '/']);
  if (a.status !== 0) { sortie.erreur = `copie de ${id} : ` + (a.stderr || '').trim().slice(0, 200); continue; }
  synchro[id] = e.fin; sortie.nouveaux.push(id);
  try { synchro._hash[id] = sha(fs.readFileSync(path.join(dest, 'rig.json'), 'utf8')); } catch { /* pas de rig */ }
}
fs.writeFileSync(fSync, JSON.stringify(synchro, null, 1));

// 5. controle
if (sortie.nouveaux.length) {
  const t = sh('node', ['scripts/test-rig.mjs']);
  const m = /(\d+) tests passés, (\d+) échoué/.exec(t.stdout || '');
  sortie.test = m ? { ok: +m[1], ko: +m[2], echecs: (t.stdout.match(/^✗ .*$/gm) || []).slice(0, 5) } : { erreur: (t.stderr || '').slice(0, 200) };
}

// 6. la liste de ce qui est a verifier
const lignes = ['# Rig auto : ce qu\'il faut vérifier', '',
  `> Généré par \`scripts/auto/sync.mjs\` le ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Le lot tourne sur mon-mien (\`scripts/auto/lot.py\`) ; chaque personnage est **découpé en calques rigides** (un par partie), reçoit des os et 4 animations de base. **Rien n'est parfait** : ce fichier dit ce qui a été signalé.`, '',
  `Faits sans signalement : **${sortie.faits}** · à vérifier : **${sortie.a_verifier}** · échecs : **${sortie.echecs}** · ignorés (déjà travaillés) : **${sortie.ignores}**` + (sortie.en_cours ? ` · en cours : \`${sortie.en_cours}\`` : ''), '',
  '| Personnage | Statut | Parties | Points à voir |', '|---|---|---|---|'];
for (const [id, e] of Object.entries(etat).sort()) {
  if (id.startsWith('_')) continue;
  let parties = '', points = '';
  try {
    const rap = JSON.parse(fs.readFileSync(path.join(ROOT, 'art-sortie/auto', id, 'rapport.json'), 'utf8'));
    parties = (rap.parties || []).map(p => p.nom).join(', ');
    points = (rap.problemes || []).map(p => (p.gravite === 'erreur' ? '❌ ' : '⚠ ') + p.texte.replace(/\|/g, '/')).join(' ; ');
  } catch { /* pas de rapport */ }
  if (e.statut === 'echec') points = `échec (${e.etape}) : ${(e.erreur || '').replace(/\s+/g, ' ').slice(-140)}`;
  if (e.statut === 'ignore') points = e.raison;
  if (sortie.conflits.includes(id)) points = '⛔ modifié sur GitHub depuis le départ du lot : NON écrasé. ' + points;
  lignes.push(`| ${id} | ${e.statut} | ${parties} | ${points} |`);
}
fs.writeFileSync(path.join(ROOT, 'docs', 'RIG-AUTO-A-VERIFIER.md'), lignes.join('\n') + '\n');

// 7. pousser
if (args.includes('--pousse') && sortie.nouveaux.length) {
  const chemins = [...sortie.nouveaux.map(i => `game/data/rigs/${i}`), 'docs/RIG-AUTO-A-VERIFIER.md'];
  sh('git', ['add', '--', ...chemins]);
  const c = sh('git', ['commit', '-q', '-m', `Rig auto : ${sortie.nouveaux.length} personnage(s) découpé(s) et animé(s) (${sortie.nouveaux.join(', ')})\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`]);
  sh('git', ['pull', '--rebase', '--autostash', '-q']);
  const p = sh('git', ['push', '-q']);
  if (p.status !== 0) sortie.erreur = 'push : ' + (p.stderr || '').trim().slice(0, 200);
} else if (args.includes('--pousse')) {
  sh('git', ['add', '--', 'docs/RIG-AUTO-A-VERIFIER.md']);
  if (sh('git', ['diff', '--cached', '--quiet']).status !== 0) {
    sh('git', ['commit', '-q', '-m', 'Rig auto : mise à jour de la liste à vérifier\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>']);
    sh('git', ['pull', '--rebase', '--autostash', '-q']); sh('git', ['push', '-q']);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
fin();
