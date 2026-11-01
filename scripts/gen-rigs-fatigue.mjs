// Pose les OS et écrit les CLIPS des 14 sprites de la pile de fatigue (Graphical Assets/Cards/Fatigue/), d'après
// l'image regardée une à une (1er nov. 2026) : un dossier `game/data/rigs/fatigue-<espèce>/` par sprite, avec un seul
// calque `tout` (non découpé : le game designer le découpe dans l'Atelier, `builder/rig.html`), puis `rig-maille.mjs`
// pour le maillage et les poids de ce calque et `auto/calme.mjs` pour tenir les clips sous la limite d'étirement.
//   node scripts/gen-rigs-fatigue.mjs [--ecrire] [--refaire] [--clips]
// `--clips` : réécrit SEULEMENT `clips.json` (à pleine amplitude, puis calmés) des rigs existants, sans toucher aux os ni aux calques :
//   à lancer après que le game designer a découpé un personnage (des calques séparés se laissent animer bien plus qu'un seul).
// Sans --ecrire : dit ce qu'il ferait. ⚠ Ne touche JAMAIS un rig déjà découpé (plus d'un calque) : le travail du game
// designer est dans l'Atelier. `--refaire` ne réécrit que ceux qui n'ont encore que le calque `tout`.
// Clips : `idle` (6 s, en boucle), `hitting` (0,9 s) et `taking_damage` (0,7 s) — les mêmes noms que le lot automatique.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { lisPng } from './lib/png.mjs';
import { ecrisJson } from './lib/rig-fichiers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'game/data/rigs');
const args = process.argv.slice(2);
const ECRIRE = args.includes('--ecrire'), REFAIRE = args.includes('--refaire'), CLIPS = args.includes('--clips');

// os : [id, parent, x, y, angle (° ; -90 = vers le haut), longueur, rôle]
//   rôle : 'corps' (respire, se penche), 'tete' (suit le corps), 'libre' (flamme, oreille, queue, aile… : suit avec retard),
//          'tourne' (le cadran du Paresseux : tourne lentement).
// face : -1 le personnage regarde à gauche, 1 à droite, 0 de face (il s'élance alors vers le bas de l'image).
const SOL = (x, y, l) => ['sol', null, x, y, 0, l, 'sol'];
const PERSOS = {
  dog: { nom: 'Chien', face: -1, os: [
    SOL(40, 950, 900),
    ['corps', 'sol', 560, 840, -90, 260, 'corps'],
    ['tete', 'corps', 420, 640, -125, 260, 'tete'],
    ['oreille_g', 'tete', 235, 430, -110, 170, 'libre'],
    ['oreille_d', 'tete', 350, 380, -88, 160, 'libre'],
    ['flamme', 'corps', 520, 500, -45, 520, 'libre'],
    ['queue', 'corps', 760, 700, -35, 230, 'libre']] },
  cat: { nom: 'Chat', face: 0, os: [
    SOL(60, 950, 880),
    ['corps', 'sol', 520, 820, -90, 200, 'corps'],
    ['tete', 'corps', 540, 600, -90, 420, 'tete'],
    ['oreille_g', 'tete', 450, 270, -100, 170, 'libre'],
    ['oreille_d', 'tete', 790, 270, -60, 170, 'libre'],
    ['patte', 'corps', 420, 720, 90, 180, 'libre'],
    ['flamme_g', 'corps', 230, 640, -150, 220, 'libre'],
    ['flamme_d', 'corps', 880, 640, -30, 220, 'libre']] },
  rabbit: { nom: 'Lapin', face: 0, os: [
    SOL(80, 960, 860),
    ['corps', 'sol', 500, 820, -90, 230, 'corps'],
    ['tete', 'corps', 500, 570, -90, 220, 'tete'],
    ['oreille_g', 'tete', 410, 340, -100, 300, 'libre'],
    ['oreille_d', 'tete', 560, 330, -55, 330, 'libre'],
    ['echarpe', 'corps', 600, 600, -20, 200, 'libre'],
    ['flamme_g', 'corps', 130, 800, -90, 380, 'libre'],
    ['flamme_d', 'corps', 880, 820, -90, 400, 'libre']] },
  raven: { nom: 'Corbeau', face: 0, os: [
    SOL(100, 960, 800),
    ['corps', 'sol', 500, 660, -90, 200, 'corps'],
    ['tete', 'corps', 430, 520, -90, 230, 'tete'],
    ['aile_a', 'corps', 800, 780, -80, 420, 'libre'],
    ['aile_b', 'aile_a', 850, 360, -140, 380, 'libre'],
    ['aile_c', 'aile_b', 560, 130, 170, 330, 'libre']] },
  robin: { nom: 'Rouge-gorge', face: 0, os: [
    SOL(80, 980, 860),
    ['corps', 'sol', 500, 880, -90, 230, 'corps'],
    ['tete', 'corps', 490, 610, -90, 380, 'tete'],
    ['capuche', 'tete', 700, 250, -50, 220, 'libre'],
    ['aile_g', 'corps', 330, 760, -165, 210, 'libre'],
    ['aile_d', 'corps', 700, 740, -15, 210, 'libre'],
    ['echarpe_g', 'corps', 150, 860, -150, 200, 'libre'],
    ['echarpe_d', 'corps', 890, 860, -30, 200, 'libre']] },
  toad: { nom: 'Grenouille', face: -1, os: [
    SOL(60, 960, 880),
    ['corps', 'sol', 560, 820, -90, 250, 'corps'],
    ['tete', 'corps', 430, 580, -100, 300, 'tete'],
    ['crete', 'tete', 560, 330, -30, 380, 'libre'],
    ['bulle_g', 'corps', 160, 720, -90, 360, 'libre'],
    ['bras_d', 'corps', 740, 740, 70, 170, 'libre']] },
  cameleon: { nom: 'Caméléon', face: -1, os: [
    SOL(40, 980, 900),
    ['corps', 'sol', 620, 720, -90, 150, 'corps'],
    ['tete', 'corps', 450, 560, -140, 300, 'tete'],
    ['queue', 'corps', 760, 650, 30, 260, 'libre'],
    ['queue_b', 'queue', 900, 830, 150, 220, 'libre'],
    ['crete', 'corps', 700, 330, -20, 300, 'libre'],
    ['volute', 'corps', 110, 880, -20, 300, 'libre']] },
  sloth: { nom: 'Paresseux', face: 0, os: [
    SOL(70, 960, 860),
    ['cadran', 'sol', 500, 540, -90, 430, 'tourne'],
    ['corps', 'sol', 480, 790, -90, 230, 'corps'],
    ['tete', 'corps', 450, 540, -95, 300, 'tete'],
    ['cape_g', 'corps', 330, 690, 150, 170, 'libre'],
    ['cape_d', 'corps', 590, 700, 60, 200, 'libre'],
    ['bras_g', 'corps', 340, 650, 100, 120, 'libre'],
    ['bras_d', 'corps', 550, 650, 80, 120, 'libre']] },
  goat: { nom: 'Chèvre', face: 0, os: [
    SOL(80, 960, 880),
    ['corps', 'sol', 520, 830, -90, 150, 'corps'],
    ['tete', 'corps', 560, 700, -90, 300, 'tete'],
    ['corne_g', 'tete', 400, 500, -170, 280, 'libre'],
    ['corne_d', 'tete', 800, 520, -20, 250, 'libre'],
    ['flamme_g', 'tete', 200, 320, -90, 230, 'libre'],
    ['flamme_d', 'tete', 850, 280, -90, 260, 'libre'],
    ['queue', 'corps', 250, 650, -170, 120, 'libre'],
    ['patte', 'corps', 540, 800, 100, 150, 'libre']] },
  mice: { nom: 'Souris', face: 0, os: [
    SOL(30, 990, 950),
    ['corps', 'sol', 520, 900, -90, 300, 'corps'],
    ['tete', 'corps', 500, 820, -90, 170, 'tete'],
    ['oreille_g', 'tete', 400, 690, -130, 130, 'libre'],
    ['oreille_d', 'tete', 620, 650, -50, 150, 'libre'],
    ['etage_1', 'corps', 520, 520, -90, 300, 'libre'],
    ['etage_2', 'etage_1', 520, 230, -90, 140, 'libre'],
    ['queue_g', 'corps', 100, 330, -90, 200, 'libre'],
    ['queue_d', 'corps', 940, 270, -100, 150, 'libre']] },
  octopus: { nom: 'Pieuvre', face: 0, os: [
    SOL(30, 970, 940),
    ['corps', 'sol', 520, 800, -90, 200, 'corps'],
    ['tete', 'corps', 500, 580, -90, 340, 'tete'],
    ['panache', 'tete', 620, 150, -40, 230, 'libre'],
    ['tentacule_g', 'corps', 260, 640, -140, 320, 'libre'],
    ['tentacule_hd', 'corps', 760, 340, -30, 300, 'libre'],
    ['tentacule_d', 'corps', 850, 630, 20, 280, 'libre'],
    ['tentacule_bas', 'corps', 700, 860, 10, 250, 'libre']] },
  owl: { nom: 'Chouette', face: 0, os: [
    SOL(60, 990, 880),
    ['corps', 'sol', 600, 860, -90, 150, 'corps'],
    ['tete', 'corps', 580, 710, -90, 300, 'tete'],
    ['flamme_g', 'corps', 300, 600, -100, 450, 'libre'],
    ['flamme_c', 'corps', 560, 400, -90, 280, 'libre'],
    ['flamme_d', 'corps', 900, 520, -100, 350, 'libre'],
    ['aile_g', 'corps', 330, 770, 170, 230, 'libre'],
    ['aile_d', 'corps', 840, 770, 10, 200, 'libre']] },
  wolf: { nom: 'Loup', face: -1, os: [
    SOL(30, 980, 940),
    ['corps', 'sol', 620, 780, -90, 300, 'corps'],
    ['tete', 'corps', 430, 570, -175, 380, 'tete'],
    ['machoire', 'tete', 350, 740, 160, 250, 'libre'],
    ['criniere', 'corps', 700, 330, -60, 350, 'libre'],
    ['queue', 'corps', 950, 700, -20, 150, 'libre']] },
  falcon: { nom: 'Faucon', face: 1, os: [
    SOL(500, 990, 300),
    ['corps', 'sol', 330, 280, 45, 450, 'corps'],
    ['tete', 'corps', 640, 600, 60, 250, 'tete'],
    ['aile_g', 'corps', 320, 520, -115, 450, 'libre'],
    ['aile_d', 'corps', 800, 520, -60, 380, 'libre'],
    ['griffes', 'corps', 500, 740, 120, 130, 'libre'],
    ['traine', 'corps', 300, 200, -135, 300, 'libre']] }
};
const FICHIER = { dog: 'Dog', cat: 'Cat', rabbit: 'Rabbit', raven: 'Raven', robin: 'Robin', toad: 'Toad', cameleon: 'Cameleon',
  sloth: 'Sloth', octopus: 'Octopus', goat: 'Goat', mice: 'Mice', owl: 'Owl', wolf: 'Wolf', falcon: 'Falcon' };

const cle = (t, v, courbe) => (courbe ? { t, v, courbe } : { t, v });

// --- les clips : générés d'après les rôles (les noms d'os, eux, sont ceux de la table ci-dessus) ---
function clips(p) {
  const os = p.os.map(([id, parent, , , , , role]) => ({ id, parent, role }));
  const de = r => os.filter(o => o.role === r).map(o => o.id);
  const libres = os.filter(o => o.role === 'libre');
  const tete = de('tete')[0], corps = de('corps')[0], tourne = de('tourne')[0];
  const dx = p.face, dy = p.face === 0 ? 1 : 0;       // ce vers quoi le personnage s'élance
  // les os libres, regroupés en chaînes (un os et son enfant libre) : un ressort par chaîne
  const chaines = [];
  for (const o of libres) {
    const enfantDeLibre = libres.find(l => l.id === o.parent);
    if (enfantDeLibre) chaines.find(c => c.includes(o.parent))?.push(o.id); else chaines.push([o.id]);
  }
  const sourceDe = ch => os.find(o => o.id === ch[0]).parent;

  // IDLE — 6 s : il respire, la tête dodeline, ce qui pend traîne avec retard, de façon inégale.
  const idle = { description: 'Repos : le corps respire, la tête dodeline, ce qui flotte (flammes, oreilles, queue…) suit en décalé.',
    duree: 6, boucle: true, pistes: {}, procedural: [] };
  if (corps) {
    idle.pistes[corps] = {
      y: [cle(0, 0), cle(2.7, -5), cle(4.3, 0)],
      rot: [cle(0, -0.6), cle(3, 0.8)]
    };
  }
  if (tete) {
    idle.procedural.push({ type: 'sinus', os: tete, canal: 'rot', amplitude: 1.2, periode: 3, phase: 0.12 });
    idle.procedural.push({ type: 'bruit', os: tete, canal: 'rot', amplitude: 0.7, periode: 2, graine: 11 });
  }
  if (tourne) idle.procedural.push({ type: 'sinus', os: tourne, canal: 'rot', amplitude: 2.2, periode: 6, phase: 0 });
  chaines.forEach((ch, i) => {
    idle.procedural.push({ type: 'ressort', os: ch, source: sourceDe(ch), frequence: 2 + (i % 3) * 0.3, amortissement: 0.3, gain: 1, gainY: 0.05, decalage: 0.05 });
    idle.procedural.push({ type: 'sinus', os: ch[0], canal: 'rot', amplitude: 3 + (i % 2), periode: i % 2 ? 3 : 2, phase: (i * 0.17) % 1 });
  });

  // HITTING — 0,9 s : il recule d'un cran, puis s'élance et revient.
  const hitting = { description: 'Il se ramasse, s\'élance vers l\'adversaire, puis revient en place.', duree: 0.9, boucle: false, pistes: {}, procedural: [] };
  if (corps) hitting.pistes[corps] = {
    x: [cle(0, 0), cle(0.22, -dx * 14, 'sortie'), cle(0.4, dx * 58, 'entree'), cle(0.9, 0)],
    y: [cle(0, 0), cle(0.22, -dy * 12, 'sortie'), cle(0.4, dy * 46, 'entree'), cle(0.9, 0)],
    rot: [cle(0, 0), cle(0.22, -dx * 2.5), cle(0.4, dx * 3.5), cle(0.9, 0)]
  };
  if (tete) hitting.pistes[tete] = { rot: [cle(0, 0), cle(0.22, -dx * 4), cle(0.4, dx * 6), cle(0.9, 0)] };
  chaines.forEach((ch, i) => hitting.procedural.push({ type: 'ressort', os: ch, source: sourceDe(ch), frequence: 2.2, amortissement: 0.3, gain: 1.4, gainX: 0, gainY: 0.05, decalage: 0.04 + (i % 2) * 0.01 }));

  // TAKING_DAMAGE — 0,7 s : un sursaut, il encaisse et se reprend.
  const degats = { description: 'Il encaisse : un sursaut en arrière, la tête qui part de côté, puis il se reprend.', duree: 0.7, boucle: false, pistes: {}, procedural: [] };
  if (corps) degats.pistes[corps] = {
    x: [cle(0, 0), cle(0.1, dx * -26 || 22, 'sortie'), cle(0.3, dx * -8 || -8), cle(0.7, 0)],
    y: [cle(0, 0), cle(0.1, dy * -20, 'sortie'), cle(0.3, dy * 6), cle(0.7, 0)],
    rot: [cle(0, 0), cle(0.1, 3.5, 'sortie'), cle(0.3, -1.2), cle(0.7, 0)]
  };
  if (tete) degats.pistes[tete] = { rot: [cle(0, 0), cle(0.1, -7, 'sortie'), cle(0.3, 2.5), cle(0.7, 0)] };
  chaines.forEach(ch => degats.procedural.push({ type: 'ressort', os: ch, source: sourceDe(ch), frequence: 2.6, amortissement: 0.3, gain: 1.3, gainX: 0, gainY: 0.04, decalage: 0.04 }));

  return { format: 'adventure-rig-clips', version: 1, clips: { idle, hitting, taking_damage: degats } };
}

const lis = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const faits = [];
for (const [cleP, p] of Object.entries(PERSOS)) {
  const id = `fatigue-${cleP}`;
  const origine = `Graphical Assets/Cards/Fatigue/Fatigue ${FICHIER[cleP]}.png`;
  const dossier = path.join(OUT, id);
  const existant = lis(path.join(dossier, 'rig.json'));
  if (CLIPS) {
    if (!existant) { console.log(`${id} : pas de rig`); continue; }
    if (ECRIRE) {
      // ⚠ les os ont pu être déplacés dans l'Atelier : on relit les ids, on ne réécrit que les clips dont les os existent encore
      ecrisJson(path.join(dossier, 'clips.json'), clips(p));
      faits.push(id);
    } else console.log(`réécrirait les clips de ${id}`);
    continue;
  }
  if (existant && (existant.calques || []).length > 1) { console.log(`${id} : déjà découpé, je n'y touche pas`); continue; }
  if (existant && !REFAIRE) { console.log(`${id} : existe (--refaire pour le reposer)`); continue; }
  const img = lisPng(path.join(ROOT, origine));
  const rig = {
    format: 'adventure-rig', version: 1, id, nom: `${p.nom} de la fatigue`,
    source: { image: 'source.png', largeur: img.largeur, hauteur: img.hauteur, origine },
    os: p.os.map(([oid, parent, x, y, angle, longueur]) => ({ id: oid, parent, x, y, angle, longueur })),
    calques: [{ id: 'tout', image: 'source.png', ordre: 0, x: 0, y: 0, largeur: img.largeur, hauteur: img.hauteur }],
    ik: []
  };
  faits.push(id);
  if (!ECRIRE) { console.log(`créerait ${id} (${rig.os.length} os)`); continue; }
  fs.mkdirSync(dossier, { recursive: true });
  fs.copyFileSync(path.join(ROOT, origine), path.join(dossier, 'source.png'));
  ecrisJson(path.join(dossier, 'rig.json'), rig);
  ecrisJson(path.join(dossier, 'clips.json'), clips(p));
}
if (ECRIRE) {
  for (const id of faits) {
    // maillage + poids du calque `tout`, puis clips calmés jusqu'à ce que le validateur se taise
    for (const cmd of (CLIPS ? [['scripts/auto/calme.mjs', id]] : [['scripts/rig-maille.mjs', id], ['scripts/auto/calme.mjs', id]])) {
      const r = spawnSync(process.execPath, cmd, { cwd: ROOT, encoding: 'utf8' });
      const sortie = (r.stdout + r.stderr).trim().split('\n').slice(-1)[0];
      console.log(`${id} · ${path.basename(cmd[0])} : ${sortie}`);
    }
  }
}
console.log(`${faits.length} personnage(s) ${ECRIRE ? 'écrit(s)' : 'à écrire'}.`);
