// Genere game/data/sprites.js : la liste des sprites disponibles, pour que le
// Card Builder puisse proposer un portrait sans que tu tapes un chemin a la main.
// A relancer apres avoir ajoute des images :  node scripts/gen-sprites.mjs
//
// Le bouton « 🔄 Actualiser les images » du builder fait exactement ca, sans quitter
// l'outil : le serveur de dev appelle `genereSprites()` ci-dessous. Une seule
// implementation du balayage, donc la meme liste des deux cotes. (Le launcher .exe,
// lui, est en C# et refait ce balayage dans `launcher/Launcher.cs` — les deux serveurs
// exposent `POST /api/sprites`, comme ils exposent deja `POST /api/write`.)
import { readdirSync, writeFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// `Decor/...` : les packs d'assets tiers essayes pour la carte (docs/PACKS-CARTE.md), un dossier par pack.
export const FOLDERS = ['Characters', 'Machines', 'Ressources', 'UI', 'Decor/Kenney Tiny Town', 'Decor/Kenney Medieval RTS', 'Decor/Kenney Foliage Pack'];

/** Ce que contiennent les dossiers d'images, ici et maintenant. */
export function scanSprites() {
  const out = {};
  for (const f of FOLDERS) {
    const dir = join(root, f);
    if (!existsSync(dir)) continue;
    out[f] = readdirSync(dir).filter(n => /\.(png|jpg|jpeg|webp|gif)$/i.test(n)).sort();
  }
  return out;
}

/** Balaye les dossiers, reecrit game/data/sprites.js, et rend la liste obtenue. */
export function genereSprites() {
  const out = scanSprites();
  writeFileSync(
    join(root, 'game/data/sprites.js'),
    `// Genere par scripts/gen-sprites.mjs — ne pas editer a la main.\nexport const SPRITES = ${JSON.stringify(out, null, 2)};\n`,
    'utf8'
  );
  vignettes();
  return out;
}

/**
 * Les VERSIONS ALLEGEES des images (scripts/gen-vignettes.py, Python + Pillow) : seules les nouvelles ou modifiees
 * sont refaites. Sans Python ou sans Pillow, on le dit et on continue : le jeu prend alors les originaux.
 */
export function vignettes() {
  for (const py of ['python3', 'python']) {
    const r = spawnSync(py, [join(root, 'scripts', 'gen-vignettes.py')], { cwd: root, encoding: 'utf8', timeout: 600000 });
    if (r.error) continue;                       // cet executable n'existe pas ici : on essaie le suivant
    if (r.status !== 0) console.warn('gen-vignettes.py :', (r.stderr || '').trim().split(/\r?\n/).pop());
    else console.log((r.stdout || '').trim());
    return r.status === 0;
  }
  console.warn('gen-vignettes.py : Python introuvable, les images restent en taille originale.');
  return false;
}

// Lance en ligne de commande : on ecrit et on dit ce qu'on a trouve.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = genereSprites();
  console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.length}`).join(' · '));
}
