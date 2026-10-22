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
// Les images du game designer sont rangees dans `Graphical Assets/` (19 octobre 2026), les personnages par espece
// (`Graphical Assets/Characters/Dog/Dog Cocker.png`), les illustrations des cartes a plat dans `Graphical Assets/Cards/`
// (22 octobre 2026, un fichier au nom de la carte) : chaque dossier est balaye AVEC ses sous-dossiers, et un nom
// de la liste peut donc contenir un `/` (« Dog/Dog Cocker.png »). `Decor/...` : les packs d'assets tiers essayes pour
// la carte (docs/PACKS-CARTE.md), un dossier par pack. `Graphical Assets/Icons` et `CardBack` n'y sont pas : ce
// sont des images d'interface, pas des portraits (scripts/gen-vignettes.py les allege a part).
export const FOLDERS = [
  'Graphical Assets/Characters', 'Graphical Assets/Cards', 'Graphical Assets/Buildings', 'Graphical Assets/Ressources', 'Graphical Assets/Old UI',
  'Decor/Kenney Tiny Town', 'Decor/Kenney Medieval RTS', 'Decor/Kenney Foliage Pack'
];

/** Les images d'un dossier et de ses sous-dossiers, en chemins relatifs avec des `/`. */
function images(dir, prefixe = '') {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...images(join(dir, e.name), prefixe + e.name + '/'));
    else if (/\.(png|jpg|jpeg|webp|gif)$/i.test(e.name)) out.push(prefixe + e.name);
  }
  return out;
}

/** Ce que contiennent les dossiers d'images, ici et maintenant. Tri ordinal (comme `StringComparer.Ordinal` en C#). */
export function scanSprites() {
  const out = {};
  for (const f of FOLDERS) {
    const dir = join(root, f);
    if (!existsSync(dir)) continue;
    out[f] = images(dir).sort();
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
    // Cet executable n'existe pas ici, ou n'a pas Pillow : on essaie le suivant. (Sous Windows, `python3` est souvent
    // le raccourci du Microsoft Store, qui existe mais repond « Python est introuvable ».)
    if (spawnSync(py, ['-c', 'import PIL'], { encoding: 'utf8' }).status !== 0) continue;
    const r = spawnSync(py, [join(root, 'scripts', 'gen-vignettes.py')], { cwd: root, encoding: 'utf8', timeout: 600000 });
    if (r.error) continue;
    if (r.status !== 0) console.warn('gen-vignettes.py :', (r.stderr || '').trim().split(/\r?\n/).pop());
    else console.log((r.stdout || '').trim());
    return r.status === 0;
  }
  console.warn('gen-vignettes.py : Python ou Pillow introuvable, les images restent en taille originale.');
  return false;
}

// Lance en ligne de commande : on ecrit et on dit ce qu'on a trouve.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = genereSprites();
  console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.length}`).join(' · '));
}
