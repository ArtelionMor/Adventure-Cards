// LES IMAGES DU PC, JUSQU'AU PI : ce que fait « Actualiser les images » dans l'Atelier du Pi.
//
// Le game designer depose ses images sur le PC (Graphical Assets/), mais l'Atelier qu'il ouvre est
// celui du Pi : son bouton « Actualiser » ne relisait que les dossiers du Pi, et une image neuve
// n'y apparaissait jamais. Git sert de transport, comme pour tout le reste du depot :
//
//   1. le Pi demande au PC de PUBLIER ses images (POST /images/publie du renfort, scripts/renfort.mjs) :
//      le PC se met a jour (fetch + avance rapide), reecrit la liste et les vignettes
//      (scripts/gen-sprites.mjs), commite SEULEMENT les images, la liste et les vignettes, et pousse ;
//   2. le Pi TIRE (git pull --ff-only), puis relit ses dossiers comme avant.
//
// Rien d'autre ne part : le commit est fait avec la liste exacte des fichiers (`git commit -- <fichiers>`),
// donc le travail en cours du PC (code, cartes, fichiers deja indexes) reste ou il est. Et la
// synchro est facultative : sans ~/.adventure-card/images.json (le PC, l'exe), ou PC eteint, le
// bouton relit les dossiers de la machine, comme avant, et le dit.
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOLDERS, genereSpritesEnFond } from '../gen-sprites.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Ce qui part : les dossiers que balaye la liste des images, plus les images d'interface que
// gen-vignettes.py allege aussi (sinon game/data/vignettes.js citerait des vignettes absentes),
// la liste, et les vignettes. Seulement des IMAGES : une archive (.rar) deposee a cote reste sur le PC.
const DOSSIERS = [...FOLDERS, 'Graphical Assets/Icons', 'Graphical Assets/CardBack'];
const LISTES = ['game/data/sprites.js', 'game/data/vignettes.js'];
const VIGNETTES = 'game/vignettes';
const EST_IMAGE = /\.(png|jpe?g|webp|gif)$/i;

/** git, dans le depot, en chemins litteraux (un nom d'image avec « * » ou « [ » n'est pas un motif). */
function git(args, entree) {
  return new Promise((ok, ko) => {
    const p = execFile('git', ['--literal-pathspecs', ...args], { cwd: RACINE, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (e, out, err) => {
      if (e) ko(new Error(((err || '').trim().split(/\r?\n/).filter(Boolean).slice(-2).join(' — ')) || e.message));
      else ok(out);
    });
    if (entree !== undefined) p.stdin.end(entree);
  });
}
const nul = t => t.split('\0').filter(Boolean);
const entier = async args => Number((await git(args)).trim()) || 0;

// --------------------------------------------------------------- cote PC
/**
 * Publie les images de CETTE machine : `progres({ phase, fait, total })` au fil de l'eau
 * (« maj », « dossiers », « vignettes », « commit », « envoi »). Rend
 * `{ commit, ajoutees, retirees, modifiees, deplacees, message }` — `commit` vaut null s'il n'y avait rien a envoyer.
 * `essai` : tout sauf le commit et l'envoi (dit ce qui partirait).
 */
export async function publieImages(progres = () => {}, { essai = false } = {}) {
  progres({ phase: 'maj', fait: 0, total: 0 });
  // Un rebase ou une fusion a moitie faits : on n'y touche pas.
  const dotgit = (await git(['rev-parse', '--git-dir'])).trim();
  for (const f of ['MERGE_HEAD', 'rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD']) {
    if (existsSync(join(RACINE, dotgit, f))) throw new Error('le dépôt du PC est au milieu d\'une fusion ou d\'un rebase : à finir d\'abord');
  }
  // Se mettre a jour AVANT de commiter : un commit pose sur un depot en retard ne se pousserait pas.
  await git(['fetch', '--quiet']);
  const enAvance = await entier(['rev-list', '--count', '@{u}..HEAD']);
  // Des commits pas encore pousses partiraient avec les images : c'est a l'utilisateur de les envoyer (ou non).
  if (enAvance) throw new Error(`le PC a ${enAvance} commit(s) pas encore poussé(s) : les pousser d'abord (ils partiraient avec les images)`);
  if (await entier(['rev-list', '--count', 'HEAD..@{u}'])) {
    try { await git(['merge', '--ff-only', '--quiet', '@{u}']); } catch (e) { throw new Error('le PC ne peut pas se mettre à jour (git pull) : ' + e.message); }
  }

  // La liste et les vignettes, comme « Actualiser » sur le PC.
  await genereSpritesEnFond(p => progres(p.phase === 'fini' ? { phase: 'commit', fait: 0, total: 0 } : p));

  // Ce qui a change dans ces dossiers. Les chemins des vignettes sont « game/vignettes/<chemin de l'image>.webp ».
  const tout = [...DOSSIERS, ...LISTES, VIGNETTES];
  const nouveaux = nul(await git(['ls-files', '-z', '--others', '--exclude-standard', '--', ...tout]));
  const retires = new Set(nul(await git(['ls-files', '-z', '--deleted', '--', ...tout])));
  const changes = nul(await git(['ls-files', '-z', '--modified', '--', ...tout])).filter(f => !retires.has(f));
  const garde = f => LISTES.includes(f) || EST_IMAGE.test(f);
  const fichiers = [...new Set([...nouveaux, ...retires, ...changes])].filter(garde).sort();
  // Le compte, pour le message : les images seulement (pas leurs vignettes), et une image qui a
  // change de dossier compte comme deplacee, pas comme une retiree plus une ajoutee.
  const source = f => !f.startsWith(VIGNETTES + '/') && EST_IMAGE.test(f);
  const plus = nouveaux.filter(source), moins = [...retires].filter(source);
  const nomsPartis = new Map();
  for (const f of moins) nomsPartis.set(basename(f), (nomsPartis.get(basename(f)) || 0) + 1);
  let deplacees = 0;
  for (const f of plus) { const n = nomsPartis.get(basename(f)); if (n) { deplacees++; nomsPartis.set(basename(f), n - 1); } }
  const bilan = {
    ajoutees: plus.length - deplacees, retirees: moins.length - deplacees, deplacees,
    modifiees: changes.filter(source).length, fichiers: fichiers.length
  };
  const resume = [bilan.ajoutees && `${bilan.ajoutees} ajoutée(s)`, bilan.deplacees && `${bilan.deplacees} déplacée(s)`,
    bilan.retirees && `${bilan.retirees} retirée(s)`, bilan.modifiees && `${bilan.modifiees} modifiée(s)`].filter(Boolean).join(', ');
  if (!fichiers.length) return { commit: null, ...bilan, message: 'aucune image nouvelle sur le PC' };
  if (essai) return { commit: null, essai: true, ...bilan, liste: fichiers, message: `${resume || fichiers.length + ' fichier(s)'} — essai : rien d'envoyé` };

  progres({ phase: 'commit', fait: 0, total: 0 });
  const liste = fichiers.join('\0');
  await git(['add', '-A', '--pathspec-from-file=-', '--pathspec-file-nul'], liste);
  // `commit -- <fichiers>` (ici : --pathspec-from-file) ne prend QUE ces fichiers, meme si d'autres sont indexes.
  await git(['commit', '--quiet', '-m', `Images depuis l'Atelier : ${resume || 'listes et vignettes'}`, '--pathspec-from-file=-', '--pathspec-file-nul'], liste);
  const commit = (await git(['rev-parse', '--short', 'HEAD'])).trim();
  progres({ phase: 'envoi', fait: 0, total: 0 });
  try { await git(['push', '--quiet']); } catch (e) { throw new Error(`commit ${commit} fait sur le PC, mais pas poussé : ${e.message}`); }
  return { commit, ...bilan, message: `${resume || 'listes et vignettes'} (commit ${commit})` };
}

// --------------------------------------------------------------- cote Pi
// D'ou viennent les images : ~/.adventure-card/images.json, hors du depot (il est public), comme calcul.json.
//   { "pc": "http://monpc:7331" }   — le renfort de la machine ou le game designer depose ses images.
const CONFIG = process.env.ADVENTURE_IMAGES || join(homedir(), '.adventure-card', 'images.json');
export function sourceDesImages() {
  try { return JSON.parse(readFileSync(CONFIG, 'utf8')).pc || null; } catch { return null; }
}

/**
 * Le PC publie, puis cette machine tire. `progres` recoit les phases du PC prefixees « pc- », puis « tirer ».
 * Rend `{ tire, message }` : `tire` dit si des fichiers sont arrives (les vignettes viennent alors du PC).
 * Ne leve jamais : un PC eteint ou un tirage refuse deviennent un message, et le bouton relit quand meme.
 */
export async function recupereImages(progres = () => {}) {
  const pc = sourceDesImages();
  if (!pc) return { tire: false, message: null };
  const avant = (await git(['rev-parse', 'HEAD'])).trim();
  let dePC = '';
  progres({ phase: 'pc-maj', fait: 0, total: 0 });
  try {
    // Le PC repond une ligne JSON par etape, puis { fin } ou { erreur } (comme /lot du renfort).
    const r = await fetch(pc + '/images/publie', { method: 'POST', signal: AbortSignal.timeout(15 * 60_000) });
    if (!r.ok) throw new Error(r.status === 404 ? 'renfort du PC à relancer (il ne connaît pas encore « publier les images »)' : `le PC répond ${r.status}`);
    const lecteur = r.body.getReader(), dec = new TextDecoder();
    let reste = '', fin = null;
    for (;;) {
      const { value, done } = await lecteur.read();
      if (done) break;
      reste += dec.decode(value, { stream: true });
      const lignes = reste.split('\n'); reste = lignes.pop();
      for (const l of lignes) {
        if (!l.trim()) continue;
        const m = JSON.parse(l);
        if (m.erreur) throw new Error(m.erreur);
        if (m.fin) fin = m; else if (m.phase) progres({ ...m, phase: 'pc-' + m.phase });
      }
    }
    if (!fin) throw new Error('le PC a coupé avant la fin');
    dePC = 'PC : ' + fin.message;
  } catch (e) {
    const injoignable = e.name === 'TimeoutError' || /fetch failed|ECONNREFUSED|EHOSTUNREACH|ENOTFOUND/.test(String(e.cause && e.cause.code || e.message));
    dePC = injoignable ? 'PC injoignable (éteint, ou renfort pas lancé) : seules les images déjà sur le Pi' : 'PC : ' + e.message;
  }
  // On tire meme si le PC n'a rien envoye cette fois : une publication d'avant attend peut-etre encore.
  progres({ phase: 'tirer', fait: 0, total: 0 });
  try {
    await git(['pull', '--ff-only', '--quiet']);
  } catch (e) {
    return { tire: false, message: `${dePC} · le Pi n'a pas pu tirer : ${e.message}` };
  }
  const apres = (await git(['rev-parse', 'HEAD'])).trim();
  if (apres === avant) return { tire: false, message: dePC };
  // Un tirage peut amener autre chose que des images (du code pousse depuis le PC) : le serveur, lui, tourne
  // encore sur l'ancien.
  const touches = nul(await git(['diff', '-z', '--name-only', avant, apres]));
  const serveur = touches.some(f => f === 'scripts/devserver.js' || f === 'scripts/gen-sprites.mjs' || f.startsWith('scripts/lib/'));
  return { tire: true, message: `${dePC} · le Pi a tiré ${touches.length} fichier(s)${serveur ? ' — le serveur du Pi est à relancer (son code a changé)' : ''}` };
}
