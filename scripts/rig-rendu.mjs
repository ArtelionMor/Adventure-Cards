// Le rendu d'un clip, sans ecran : planche-contact PNG, GIF, WebM.
//
//   node scripts/rig-rendu.mjs <id> <clip> [--images 12] [--colonnes 4] [--taille 320]
//        [--gif] [--fps 20] [--webm] [--ecart] [--cadre x,y,cote] [--fond #f3ead8] [--sortie dossier]
//   node scripts/rig-rendu.mjs <id> --essai [--angle 15]
//
// Ouvre builder/rig/rendu.html dans le Chrome installe (scripts/lib/chrome.mjs), servi par
// un petit serveur local le temps du rendu : c'est le vrai code WebGL du jeu qui dessine.
// Sorties : art-sortie/rigs/<id>/<clip>-planche.png, <clip>.gif, <clip>.webm (art-sortie/
// est ignore par git). --cadre zoome sur un detail (en pixels de l'image source) : un
// mouvement de 1 % ne se voit pas sur le personnage entier. --ecart peint en magenta, sur
// chaque image de la planche, ce qui differe de la pose de repos : la ou le clip agit.
// --essai (sans clip) verifie le RIG : chaque os tourne seul de --angle degres, et la planche
// peint ce qu'il entraine (art-sortie/rigs/<id>/essai-os.png).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lanceChrome } from './lib/chrome.mjs';
import { serveur } from './lib/statique.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const [id, clip] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--gif', '--webm', '--ecart', '--essai'].includes(args[i - 1])));
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const essai = args.includes('--essai');
if (!id || (!clip && !essai)) {
  console.log('usage : node scripts/rig-rendu.mjs <id> <clip> [--images 12] [--colonnes 4] [--taille 320] [--gif] [--fps 20] [--webm] [--ecart] [--cadre x,y,cote] [--fond #f3ead8] [--sortie dossier]');
  process.exit(1);
}
const sortie = path.resolve(ROOT, opt('--sortie', path.join('art-sortie/rigs', id)));
fs.mkdirSync(sortie, { recursive: true });
const cadre = opt('--cadre', null) ? opt('--cadre').split(',').map(Number) : null;
const fond = opt('--fond', '#f3ead8');

const srv = await serveur(ROOT);
const chrome = await lanceChrome();
try {
  const page = await chrome.page(`${srv.url}/builder/rig/rendu.html?id=${encodeURIComponent(id)}`);
  const info = await page.evalue('window.rig.pret');
  if (essai) {
    const o = JSON.stringify({ angle: +opt('--angle', 15), taille: +opt('--taille', 260), colonnes: +opt('--colonnes', 4), fond, cadre });
    const f = path.join(sortie, 'essai-os.png');
    fs.writeFileSync(f, Buffer.from((await page.evalue(`window.rig.essai(${o})`)).split(',')[1], 'base64'));
    console.log('essai des os : ' + path.relative(ROOT, f));
  }
  if (clip && !info.clips[clip]) throw new Error(`clip inconnu « ${clip} » (clips : ${Object.keys(info.clips).join(', ') || 'aucun'})`);
  if (clip) {
  const o = JSON.stringify({ clip, images: +opt('--images', 12), colonnes: +opt('--colonnes', 4), taille: +opt('--taille', 320), fond, cadre, ecart: args.includes('--ecart') });
  const png = await page.evalue(`window.rig.planche(${o})`);
  const fPlanche = path.join(sortie, `${clip}-${args.includes('--ecart') ? 'ecart' : 'planche'}.png`);
  fs.writeFileSync(fPlanche, Buffer.from(png.split(',')[1], 'base64'));
  console.log('planche : ' + path.relative(ROOT, fPlanche));
  if (args.includes('--gif')) {
    const g = JSON.stringify({ clip, fps: +opt('--fps', 20), taille: +opt('--taille-gif', 360), fond, cadre });
    const f = path.join(sortie, `${clip}.gif`);
    fs.writeFileSync(f, Buffer.from(await page.evalue(`window.rig.gif(${g})`), 'base64'));
    console.log('gif : ' + path.relative(ROOT, f) + ` (${Math.round(fs.statSync(f).size / 1024)} Ko)`);
  }
  if (args.includes('--webm')) {
    const w = JSON.stringify({ clip, taille: +opt('--taille-gif', 360), fond, cadre });
    const f = path.join(sortie, `${clip}.webm`);
    fs.writeFileSync(f, Buffer.from(await page.evalue(`window.rig.webm(${w})`), 'base64'));
    console.log('webm : ' + path.relative(ROOT, f) + ` (${Math.round(fs.statSync(f).size / 1024)} Ko)`);
  }
  }
} catch (e) {
  console.log('✗ ' + e.message);
  process.exitCode = 1;
} finally {
  await chrome.ferme();
  await srv.ferme();
}
