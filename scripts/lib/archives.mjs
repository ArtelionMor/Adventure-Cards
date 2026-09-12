// LES CALCULS RANGES : un calcul fini ne se refait plus.
//
// Une file terminee est ecrite sur le disque choisi — LA CLE USB DU PI, en pratique :
// les reglages de chaque ligne, sa sortie complete, son resume, et l'analyse de l'IA
// avec le dialogue. On la rouvre ensuite dans « Lancer un calcul » comme si elle venait
// de finir (relire une sortie, copier le recapitulatif, poser une question a l'IA) sans
// rejouer une seule partie. C'est ce qui rend une mesure consultable des mois plus tard :
// une matrice trio coute des dizaines de milliers de parties, elle ne vaut pas d'etre
// refaite pour relire un chiffre.
//
// UN DOSSIER PAR CALCUL, ET DES FICHIERS LISIBLES SANS L'ATELIER : la cle se rebranche
// sur un PC. `calcul.json` porte tout ce que le serveur doit retrouver,
// `recapitulatif.txt` se lit d'un coup d'oeil, et chaque `NN-....txt` est la sortie
// brute de la ligne, telle que le terminal l'a ecrite.
//
// LE REGLAGE VIT HORS DU REPO (il est public), comme les renforts et l'IA :
// ~/.adventure-card/archives.json, edite dans la page. Sans reglage, on prend la
// premiere cle montee (/media, /mnt) ; a defaut ~/.adventure-card/calculs — ranger ne
// doit jamais dependre d'une cle branchee.
//
// ⚠ UNE CLE DEBRANCHEE LAISSE SON DOSSIER DERRIERE ELLE : sous Linux, /media/… existe
// encore quand plus rien n'y est monte, et on remplirait la carte SD sans le voir. Le
// reglage garde donc le POINT DE MONTAGE, verifie a chaque ecriture : cle absente, rien
// n'est ecrit et on le dit.
import { readFile, writeFile, mkdir, readdir, stat, statfs, rm } from 'node:fs/promises';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';

const FICHIER = process.env.ADVENTURE_ARCHIVES || join(homedir(), '.adventure-card', 'archives.json');
const REPLI = join(homedir(), '.adventure-card', 'calculs');
const LOTS_MAX = 300;          // ce qu'on liste, du plus recent au plus ancien
const SORTIE_MAX = 4000000;    // par ligne : au-dela, on n'ecrit que la fin
// Les systemes de fichiers d'une cle ou d'un disque externe. Un tmpfs (/run) ou un
// montage reseau n'a rien a faire dans la liste proposee.
const AMOVIBLES = new Set(['vfat', 'exfat', 'ntfs', 'ntfs3', 'fuseblk', 'ext2', 'ext3', 'ext4', 'f2fs', 'btrfs', 'xfs', 'hfsplus']);
const RACINES = ['/media/', '/mnt/', '/run/media/'];

// ------------------------------------------------------------------ les disques
/** Ce qui est monte, lu dans /proc/mounts (rien sous Windows : la liste est vide). */
async function montages() {
  try {
    return (await readFile('/proc/mounts', 'utf8')).split('\n').filter(Boolean).map(l => {
      const [dev, point, type, options = ''] = l.split(' ');
      // Les espaces d'un nom de volume arrivent echappes (« /media/teliau/MA\040CLE »).
      return { dev, point: point.replace(/\\040/g, ' '), type, ro: options.split(',').includes('ro') };
    });
  } catch { return []; }
}

/** La place libre d'un dossier, en octets — ou rien si on ne peut pas la lire. */
async function place(chemin) {
  try {
    const s = await statfs(chemin);
    return { libre: s.bsize * s.bavail, total: s.bsize * s.blocks };
  } catch { return {}; }
}

/** Le montage qui porte ce chemin : le point le plus long qui le prefixe. */
function montageDe(chemin, liste) {
  const c = resolve(chemin);
  let gagnant = null;
  for (const m of liste) {
    if (c === m.point || c.startsWith(m.point.endsWith('/') ? m.point : m.point + '/')) {
      if (!gagnant || m.point.length > gagnant.point.length) gagnant = m;
    }
  }
  return gagnant;
}

/** Les cles et disques externes montes, celui qui a le plus de place libre en tete. */
export async function disques(liste) {
  const ms = liste || await montages();
  const gardes = ms.filter(m => AMOVIBLES.has(m.type) && RACINES.some(r => m.point.startsWith(r)));
  const avecPlace = await Promise.all(gardes.map(async m => ({ ...m, ...(await place(m.point)) })));
  return avecPlace.sort((a, b) => (b.libre || 0) - (a.libre || 0));
}

// ------------------------------------------------------------------ le reglage
function reglage() {
  try {
    const c = JSON.parse(readFileSync(FICHIER, 'utf8'));
    if (c && typeof c.dossier === 'string' && c.dossier) return c;
  } catch { /* pas de fichier : on choisira tout seul */ }
  return null;
}

/**
 * OU RANGER, et ce qu'on en sait. `choisi` : regle a la main ; `montage` : le point de
 * montage attendu ('' = le disque systeme) ; `monte` : y a-t-il quelque chose en ce moment ?
 */
export async function ouRanger() {
  const ms = await montages();
  const c = reglage();
  if (c) {
    const attendu = c.montage || '';
    const monte = !attendu || ms.some(m => m.point === attendu);
    return { dossier: c.dossier, choisi: true, montage: attendu, amovible: !!attendu, monte };
  }
  const d = (await disques(ms))[0];
  if (d && !d.ro) return { dossier: join(d.point, 'adventure-card', 'calculs'), choisi: false, montage: d.point, amovible: true, monte: true };
  return { dossier: REPLI, choisi: false, montage: '', amovible: false, monte: true };
}

/** Le dossier edite dans la page. On retient le point de montage qui le porte. */
export async function enregistreDossier(dossier) {
  dossier = String(dossier == null ? '' : dossier).trim();
  if (!dossier) {           // vide = on revient au choix automatique
    await rm(FICHIER, { force: true });
    return ouRanger();
  }
  if (dossier.length > 400) throw new Error('Chemin trop long.');
  if (!/^([/~]|[A-Za-z]:[\\/])/.test(dossier)) throw new Error('Il faut un chemin complet (ex. /media/teliau/CLE/adventure-card).');
  if (dossier.startsWith('~')) dossier = join(homedir(), dossier.slice(1));
  const ms = await montages();
  const m = montageDe(dossier, ms);
  // On ecrit vraiment pour verifier : un chemin faux ou en lecture seule doit se voir
  // maintenant, pas la nuit ou un calcul de trois heures se termine.
  try {
    await mkdir(dossier, { recursive: true });
    const essai = join(dossier, '.adventure-card-essai');
    await writeFile(essai, 'ok');
    await rm(essai, { force: true });
  } catch (e) {
    throw new Error(`Impossible d'écrire dans ${dossier} : ${e.message}`);
  }
  mkdirSync(dirname(FICHIER), { recursive: true });
  // Le montage n'est retenu que si ce n'est pas le disque systeme : c'est lui qui dira
  // « la cle n'est pas la » plus tard.
  const montage = m && m.point !== '/' ? m.point : '';
  writeFileSync(FICHIER, JSON.stringify({ dossier, montage }, null, 2), { mode: 0o600 });
  return ouRanger();
}

/** Le dossier ou ecrire, ou une erreur qui dit pourquoi on ne peut pas. */
async function dossierPret() {
  const ou = await ouRanger();
  if (ou.amovible && !ou.monte) {
    throw new Error(`${ou.montage} n'est pas monté : la clé est débranchée ou pas montée. Rien n'est écrit (ce serait sur la carte SD).`);
  }
  await mkdir(ou.dossier, { recursive: true });
  return ou;
}

// ------------------------------------------------------------------ ranger / relire
const deuxChiffres = n => String(n).padStart(2, '0');
const horodatage = t => {
  const d = new Date(t || Date.now());
  return `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}_${deuxChiffres(d.getHours())}h${deuxChiffres(d.getMinutes())}`;
};
const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).toLowerCase() || 'calcul';
const NOM_OK = /^[A-Za-z0-9_.-]{1,140}$/;

/** Le nom du dossier d'un calcul : date, heure, et son identifiant (il ne bouge pas). */
const nomDossier = lot => `${horodatage(lot.debut)}_${slug(lot.id)}`;

const titreLot = lot => lot.lignes.length === 1 ? lot.lignes[0].libelle
  : `${lot.lignes.length} calculs — ${lot.lignes[0].libelle} …`;

const duree = ms => { const s = Math.round((ms || 0) / 1000); return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + deuxChiffres(s % 60) + ' s'; };

/** Ce qu'on lit sur la cle branchee sur un PC, sans rien d'autre qu'un editeur de texte. */
function recapitulatif(c) {
  const t = [`Adventure Card — file du ${new Date(c.debut).toLocaleString('fr-FR')}`];
  const finis = c.lignes.filter(l => l.etat === 'fini').length;
  t.push(`${finis}/${c.lignes.length} calcul(s) terminé(s) en ${duree((c.fin || Date.now()) - c.debut - (c.pauseTotale || 0))}${c.arrete ? ' (file arrêtée)' : ''}`, '');
  for (const l of c.lignes) {
    t.push(`- ${l.libelle} : ${l.resume || l.etat}${l.fin && l.debut ? ` · ${duree(l.fin - l.debut - (l.pauseTotale || 0))}` : ''}`);
    if (l.fichier) t.push(`  sortie complète : ${l.fichier}`);
  }
  if (c.analyse && c.analyse.etat === 'fini') {
    t.push('', `Analyse (${c.analyse.machine} · ${c.analyse.modele} · ${duree(c.analyse.duree)}) :`, c.analyse.texte);
    for (const e of c.analyse.echanges || []) {
      t.push('', `Question : ${e.question}`, `Réponse : ${e.etat === 'fini' ? e.reponse : '(' + e.etat + ')'}`);
    }
  }
  return t.join('\n') + '\n';
}

/**
 * RANGE UNE FILE (et la remplace si elle etait deja la : l'analyse et le dialogue
 * arrivent apres la fin des calculs). Rend le dossier ecrit.
 */
export async function range(lot) {
  if (!lot || !lot.lignes || !lot.lignes.length) throw new Error('Rien à ranger.');
  const ou = await dossierPret();
  const dossier = join(ou.dossier, nomDossier(lot));
  await mkdir(dossier, { recursive: true });
  const lignes = [];
  for (const l of lot.lignes) {
    let sortie = l.sortie || '';
    if (sortie.length > SORTIE_MAX) sortie = sortie.slice(sortie.length - SORTIE_MAX);
    const fichier = sortie ? `${deuxChiffres(l.i + 1)}-${slug(l.libelle)}.txt` : null;
    if (fichier) await writeFile(join(dossier, fichier), sortie, 'utf8');
    lignes.push({ i: l.i, outil: l.outil, args: l.args || [], libelle: l.libelle, etat: l.etat, code: l.code,
      debut: l.debut, fin: l.fin, pauseTotale: l.pauseTotale || 0, resume: l.resume, fichier });
  }
  const c = {
    version: 1, id: lot.id, titre: titreLot(lot), debut: lot.debut, fin: lot.fin, arrete: !!lot.arrete,
    pauseTotale: lot.pauseTotale || 0, lignes, analyse: lot.analyse || null,
    // La conversation avec l'IA (les donnees comprises) : c'est elle qui permet de
    // reprendre le dialogue des mois plus tard, sur une autre machine.
    conversation: lot.conversation || null
  };
  await writeFile(join(dossier, 'calcul.json'), JSON.stringify(c, null, 2), 'utf8');
  await writeFile(join(dossier, 'recapitulatif.txt'), recapitulatif(c), 'utf8');
  return dossier;
}

/** Les calculs ranges, du plus recent au plus ancien — sans les sorties (elles sont grosses). */
export async function liste() {
  const ou = await ouRanger();
  if (ou.amovible && !ou.monte) return [];
  let noms;
  try { noms = await readdir(ou.dossier); } catch { return []; }
  const lots = [];
  for (const nom of noms) {
    if (!NOM_OK.test(nom)) continue;
    let c;
    try { c = JSON.parse(await readFile(join(ou.dossier, nom, 'calcul.json'), 'utf8')); }
    catch { continue; }   // pas un calcul range (ou ecrit a moitie) : on passe
    let taille = 0;
    try {
      for (const f of await readdir(join(ou.dossier, nom))) taille += (await stat(join(ou.dossier, nom, f))).size;
    } catch { /* la place prise n'est qu'une indication */ }
    lots.push({
      id: nom, titre: c.titre || nom, debut: c.debut, fin: c.fin, arrete: !!c.arrete, taille,
      total: (c.lignes || []).length, finis: (c.lignes || []).filter(l => l.etat === 'fini').length,
      duree: c.fin && c.debut ? c.fin - c.debut - (c.pauseTotale || 0) : null,
      analyse: !!(c.analyse && c.analyse.etat === 'fini'),
      echanges: ((c.analyse && c.analyse.echanges) || []).length,
      lignes: (c.lignes || []).map(l => ({ libelle: l.libelle, etat: l.etat, resume: l.resume }))
    });
  }
  return lots.sort((a, b) => (b.debut || 0) - (a.debut || 0)).slice(0, LOTS_MAX);
}

/** Un calcul range, sorties comprises — de quoi le remettre dans le serveur. */
export async function relit(id) {
  id = String(id || '');
  if (!NOM_OK.test(id) || id.includes('..')) throw new Error('Calcul inconnu : ' + id);
  const ou = await ouRanger();
  if (ou.amovible && !ou.monte) throw new Error(`${ou.montage} n'est pas monté : rebranche la clé.`);
  const dossier = join(ou.dossier, id);
  let c;
  try { c = JSON.parse(await readFile(join(dossier, 'calcul.json'), 'utf8')); }
  catch { throw new Error('Calcul introuvable sur le disque : ' + id); }
  for (const l of c.lignes || []) {
    l.sortie = '';
    if (l.fichier) { try { l.sortie = await readFile(join(dossier, l.fichier), 'utf8'); } catch { /* sortie perdue : le reste vaut encore */ } }
  }
  return { ...c, archive: id, dossier };
}

/** Ce que la page affiche : ou l'on range, ce qu'on peut proposer, et ce qui est deja la. */
export async function etat() {
  const ou = await ouRanger();
  const [pl, ds, lots] = await Promise.all([place(ou.dossier), disques(), liste()]);
  return { ...ou, ...pl, defaut: REPLI,
    disques: ds.map(d => ({ point: d.point, dev: d.dev, type: d.type, ro: d.ro, libre: d.libre, total: d.total })), lots };
}
