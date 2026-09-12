// LES RENFORTS : d'autres machines qui jouent une partie des cases d'un calcul.
//
// Un calcul lance sur le Pi (une matrice, une courbe) est deja decoupe en taches
// independantes pour ses coeurs (scripts/lib/pool.mjs). Les renforts en prennent leur
// part EN MEME TEMPS : chaque PC fait tourner scripts/renfort.mjs, et la file de taches
// du Pi leur envoie des paquets de cases tant qu'il en reste. Meme logique que l'analyse
// par l'IA (scripts/lib/ia.mjs) : une liste de machines, sondees a chaque calcul, et une
// machine eteinte est simplement sautee.
//
// Deux garanties, sans lesquelles un renfort rendrait des chiffres FAUX sans le dire :
//   - le MEME CODE : chaque machine calcule une empreinte des fichiers que jouent les
//     taches (moteur, bot, config, arene, modules de taches) ; une machine dont
//     l'empreinte differe — un « git pull » oublie — est ecartee, avec la raison ;
//   - les MEMES CARTES : les donnees mesurees (le brouillon du builder, ou le fichier du
//     jeu) partent avec chaque paquet, en JSON. Le renfort ecrit lui-meme le module qu'il
//     charge : il n'execute jamais de code recu.
//
// La liste vit hors du repo (il est public) : ~/.adventure-card/calcul.json, editee dans
// la page « Lancer un calcul ». Sans elle, tout se joue sur la machine du calcul.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FICHIER = process.env.ADVENTURE_CALCUL || join(homedir(), '.adventure-card', 'calcul.json');
const MACHINES_MAX = 8;

/** Le port d'un renfort (scripts/renfort.mjs). */
export const PORT = 7331;

/**
 * LES MODULES DE TACHES qu'un renfort accepte de jouer : ceux qu'il a sur SON disque,
 * relus a chaque demande. Un outil de mesure ecrit demain est donc partage sans qu'on
 * ait a tenir une liste a jour ici — et sans rien relacher : un renfort ne charge jamais
 * que ses propres fichiers `scripts/lib/taches-*.mjs` (il n'execute aucun code recu), et
 * l'empreinte, qui les couvre tous, garantit que les deux machines ont les memes.
 */
export function modules() {
  return readdirSync(join(RACINE, 'scripts', 'lib'))
    .filter(f => /^taches-.+\.mjs$/.test(f)).map(f => f.slice(0, -4)).sort();
}

/** « Celui-la, tu sais le jouer ? » — la seule question que posent les trois appelants. */
export const moduleConnu = nom => modules().includes(nom);

export function machines() {
  try {
    const m = JSON.parse(readFileSync(FICHIER, 'utf8')).machines;
    if (Array.isArray(m)) return m;
  } catch { /* pas de fichier : pas de renfort */ }
  return [];
}

/** La liste editee dans la page. Verifiee champ par champ : elle part ensuite dans des requetes. */
export function enregistreMachines(liste) {
  if (!Array.isArray(liste)) throw new Error('Il faut une liste de machines.');
  if (liste.length > MACHINES_MAX) throw new Error(`${MACHINES_MAX} machines au plus.`);
  const propres = liste.map((m, i) => {
    const nom = String(m.nom || '').trim().slice(0, 40) || `Machine ${i + 1}`;
    const url = String(m.url || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\/[\w.-]+(:\d{1,5})?$/.test(url)) throw new Error(`Adresse invalide pour « ${nom} » : ${url || '(vide)'} — attendu http://nom-du-pc:${PORT}`);
    return { nom, url };
  });
  mkdirSync(dirname(FICHIER), { recursive: true });
  writeFileSync(FICHIER, JSON.stringify({ machines: propres }, null, 2), { mode: 0o600 });
  return propres;
}

/**
 * L'EMPREINTE du code qui joue les taches. Recalculee a chaque appel (quelques millisecondes) :
 * un renfort qui a fait « git pull » annonce tout de suite sa nouvelle version, sans
 * redemarrer. Les fins de ligne sont ramenees a \n — Windows et le Pi n'ont pas les memes.
 */
export function empreinte() {
  const fichiers = [];
  for (const d of ['game/src/combat', 'game/src/config', 'game/src/tools'])
    for (const f of readdirSync(join(RACINE, d)).filter(f => f.endsWith('.js')).sort()) fichiers.push(`${d}/${f}`);
  for (const m of modules()) fichiers.push(`scripts/lib/${m}.mjs`);
  return hache(fichiers);
}

/**
 * L'EMPREINTE DU RENFORT LUI-MEME — non pas le code qui JOUE, mais celui qui RECOIT.
 *
 * ⚠ Un « git pull » met les fichiers a jour SANS relancer le processus. Le renfort
 * annonce alors la bonne empreinte de calcul (elle se relit sur le disque) tout en
 * tournant sur son ancien code : il est accepte, puis refuse le paquet — c'est ce qui
 * est arrive le jour ou la liste des modules de taches a cesse d'etre ecrite a la main.
 * Comparee a ce qu'elle valait au demarrage, elle dit « relance-moi ».
 */
export function empreinteDuRenfort() {
  return hache(['scripts/renfort.mjs', 'scripts/lib/renforts.mjs', 'scripts/lib/pool.mjs',
    'scripts/lib/renfort-lot.mjs', 'scripts/lib/ouvrier.mjs']);
}

/** Le condense d'une liste de fichiers, fins de ligne ramenees a \n (Windows et le Pi). */
function hache(fichiers) {
  const h = createHash('sha256');
  for (const f of fichiers) h.update(`${f}\n${readFileSync(join(RACINE, f), 'utf8').replace(/\r\n/g, '\n')}\n`);
  return h.digest('hex').slice(0, 16);
}

// --------------------------------------------------------------- les donnees
/** Les cartes que mesure CE calcul — le brouillon si le serveur en a donne un — en JSON. */
export function donneesDuCalcul() {
  const f = process.env.ADVENTURE_BROUILLON || join(RACINE, 'game', 'data', 'characters.data.js');
  return extraitDonnees(readFileSync(f, 'utf8'));
}

/** « export const CHARACTER_DATA = {…}; » → l'objet. Le fichier est du JSON dans un module. */
export function extraitDonnees(texte) {
  const nom = texte.indexOf('CHARACTER_DATA');
  const egal = nom < 0 ? -1 : texte.indexOf('=', nom);
  const fin = texte.lastIndexOf(';');
  if (egal < 0 || fin < egal) throw new Error('fichier de données illisible');
  return JSON.parse(texte.slice(egal + 1, fin));
}

/** Le module qu'un renfort ecrit avec les donnees recues. */
export const moduleDeDonnees = d => `export const CHARACTER_DATA = ${JSON.stringify(d)};\n`;

// --------------------------------------------------------------- les machines
/** « Tu reponds, et tu as le meme code ? » — en quelques secondes au plus. */
export async function sonde(m, ms = 2500) {
  try {
    const r = await fetch(m.url + '/etat', { signal: AbortSignal.timeout(ms) });
    if (!r.ok) return { ok: false, pourquoi: `répond ${r.status}` };
    const e = await r.json();
    if (e.empreinte !== empreinte()) {
      return { ok: false, coeurs: e.coeurs, pourquoi: 'pas le même code (faire « git pull » sur cette machine)' };
    }
    // Les fichiers sont a jour, mais le processus tourne encore sur les anciens : il
    // refuserait le paquet. Mieux vaut le dire ici que le decouvrir a la premiere case.
    if (e.aRedemarrer) {
      return { ok: false, coeurs: e.coeurs, pourquoi: 'code mis à jour depuis son lancement : relancer le renfort sur cette machine' };
    }
    return { ok: true, coeurs: e.coeurs, machine: e.machine };
  } catch (e) {
    return { ok: false, pourquoi: e.name === 'TimeoutError' ? 'ne répond pas (éteinte ?)' : 'injoignable (renfort lancé ? pare-feu ?)' };
  }
}

/** Toutes les machines et ce qu'elles repondent — pour la page, et pour la file de taches. */
export async function statuts() {
  return Promise.all(machines().map(async m => ({ ...m, ...(await sonde(m)) })));
}

/**
 * Un PAQUET de taches joue par un renfort. Les resultats arrivent au fil de l'eau, une
 * ligne JSON chacun ({ k, r }, k = rang dans le paquet), et le renfort donne signe de vie
 * toutes les 10 s : un PC qu'on eteint ou qui s'endort en plein paquet ne bloque pas le
 * calcul plus d'une minute — ce qu'il n'a pas rendu repart ailleurs (pool.mjs).
 */
export async function joueLot(m, paquet, surResultat, silenceMax = 60_000) {
  const arret = new AbortController();
  let minuterie;
  const veille = () => { clearTimeout(minuterie); minuterie = setTimeout(() => arret.abort(), silenceMax); };
  veille();
  try {
    const r = await fetch(m.url + '/lot', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paquet), signal: arret.signal
    });
    if (!r.ok) throw new Error(`répond ${r.status} : ${(await r.text()).slice(0, 200)}`);
    let reste = '', fini = false;
    const lit = ligne => {
      if (!ligne.trim()) return;
      const d = JSON.parse(ligne);
      if (d.erreur) throw new Error(d.erreur);
      if (d.fin) fini = true;
      else if (d.k !== undefined) surResultat(d.k, d.r);
    };
    const decodeur = new TextDecoder();
    for await (const bout of r.body) {
      veille();
      reste += decodeur.decode(bout, { stream: true });
      const lignes = reste.split('\n');
      reste = lignes.pop();
      lignes.forEach(lit);
    }
    lit(reste + decodeur.decode());
    if (!fini) throw new Error('a coupé en route');
  } catch (e) {
    throw new Error(arret.signal.aborted ? 'plus de nouvelles depuis une minute (endormie ?)' : e.message);
  } finally {
    clearTimeout(minuterie);
  }
}
