// « Le game designer a-t-il déjà retouché ce rig ? » À lancer AVANT de commencer un sprite. Le Pi garde une sauvegarde datée de chaque
// enregistrement de l'Atelier (`~/.adventure-card/rig-sauvegardes/<id>/<AAAA-MM-JJ-HH-MM UTC>/`) : un rig qui en a une, ou dont les
// fichiers sont modifiés sur le Pi (pas encore commités), a été touché → on n'y met PAS la main.
//   node scripts/auto/deja-touche.mjs cameleon grenouille-cuisiniere …     (sortie 1 si l'un d'eux est touché)
//   node scripts/auto/deja-touche.mjs --tous                               (la liste de tous les rigs touchés)
import { spawnSync } from 'node:child_process';
const PI = process.env.ADVENTURE_PI || 'teliau@192.168.1.75';
const ids = process.argv.slice(2).filter(a => !a.startsWith('--'));
const sh = `cd ~/.adventure-card/rig-sauvegardes 2>/dev/null && for d in *; do echo "S $d $(ls $d | wc -l) $(ls $d | tail -1)"; done; cd ~/Adventure-Cards && git status --short game/data/rigs | cut -c4- | cut -d/ -f4 | sort -u | sed 's/^/M /'`;
const r = spawnSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', PI, sh], { encoding: 'utf8' });
if (r.status !== 0) { console.error('Pi injoignable : ' + (r.stderr || '').trim()); process.exit(2); }
const sauv = new Map(), modif = new Set();
for (const l of r.stdout.split('\n')) {
  const [t, id, n, der] = l.trim().split(' ');
  if (t === 'S' && id && id !== '*') sauv.set(id, { n: +n, der });
  if (t === 'M' && id) modif.add(id);
}
const touches = new Set([...sauv.keys(), ...modif]);
if (process.argv.includes('--tous')) { for (const id of [...touches].sort()) console.log(id, sauv.has(id) ? `${sauv.get(id).n} sauvegarde(s), dernière ${sauv.get(id).der} UTC` : '', modif.has(id) ? 'modifié sur le Pi' : ''); process.exit(0); }
let touche = false;
for (const id of ids) {
  const s = sauv.get(id), m = modif.has(id);
  if (s || m) touche = true;
  console.log(`${id} : ${s || m ? 'DÉJÀ TOUCHÉ — ne pas y mettre la main' : 'intact'}${s ? ` (${s.n} sauvegarde(s), dernière ${s.der} UTC)` : ''}${m ? ' (fichiers modifiés sur le Pi)' : ''}`);
}
process.exit(touche ? 1 : 0);
