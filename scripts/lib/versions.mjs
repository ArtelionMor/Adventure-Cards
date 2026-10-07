// LES VERSIONS DU JEU : un etat nomme des cartes, avec ce qui a change, ce qu'on en a dit,
// la mesure qui lui correspond — et le moyen de revenir en arriere.
//
// CE QUE C'EST. Une « version » est une photographie COMPLETE de `game/data/characters.data.js`
// (le fichier que le Card Builder reecrit), plus un titre ecrit par le designer
// (« V0.3 : Modification Chat & Archétype Oiseau »), des commentaires, et des calculs ranges
// (`archives.mjs`) dont on a lu les chiffres. Le « qu'est-ce qui a change ? » n'est JAMAIS
// stocke : il se recalcule en comparant deux photos (`diff-donnees.mjs`), donc il ne ment pas.
//
// DEUX SORTES DE VERSIONS.
//   - `nommee`  : le designer a dit « c'est une version ». C'est ce qu'on lit et qu'on commente.
//   - `auto`    : le serveur a pris une photo juste AVANT d'ecraser le fichier (« Appliquer au
//                 jeu » du builder, retour en arriere…) — le filet de securite. Le jour ou un
//                 onglet perime du builder a efface six heros, le fichier d'avant n'existait plus
//                 nulle part. Une photo auto n'est prise que si cet etat-la n'est PAS deja garde
//                 (meme empreinte), et les plus vieilles sont purgees (AUTO_MAX) — jamais une nommee.
//
// OU. `~/.adventure-card/versions/` sur la machine du serveur (ADVENTURE_VERSIONS pour changer),
// JAMAIS dans le repo : il est public, et les commentaires sont du travail en cours. Un dossier par
// version, lisible sans l'Atelier : `version.json` (titre, commentaires, chiffres) et `donnees.js`
// (le fichier tel quel — on peut le recopier a la main dans game/data/ en cas de coup dur).
//
// ⚠ PAS DOUBLE EN C# : comme /api/run et les calculs ranges, ces routes n'existent qu'avec Node
// (devserver.js). L'exe sans Node n'a pas de versions, et la page cache alors tout.
import { readFile, writeFile, mkdir, readdir, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { diff, restaureEntite } from './diff-donnees.mjs';
import { kpiDuCalcul } from './kpi.mjs';
import { relit as relitCalcul } from './archives.mjs';

const RACINE = () => process.env.ADVENTURE_VERSIONS || join(homedir(), '.adventure-card', 'versions');
export const AUTO_MAX = 60;                 // photos automatiques gardees (les nommees ne sont jamais purgees)
const NOM_OK = /^v\d{4,}$/;
const ENTETE = 'export const CHARACTER_DATA = ';

// ------------------------------------------------------------------ le fichier de donnees
/** Les fins de ligne ramenees a \n : Windows et le Pi n'ont pas les memes, l'empreinte doit etre la meme. */
const normalise = t => String(t).replace(/\r\n/g, '\n');
export const empreinte = texte => createHash('sha1').update(normalise(texte)).digest('hex').slice(0, 12);

/** Le module de donnees -> l'objet. Le fichier est du JSON apres l'en-tete : aller-retour sans perte. */
export function lisFichier(texte) {
  const t = normalise(texte);
  const i = t.indexOf(ENTETE);
  if (i < 0) throw new Error('Ce n\'est pas un fichier de données du jeu (« export const CHARACTER_DATA = » introuvable).');
  const fin = t.lastIndexOf('};');
  const corps = t.slice(i + ENTETE.length, fin >= 0 ? fin + 1 : undefined);
  try { return JSON.parse(corps); }
  catch (e) { throw new Error('Données illisibles (JSON invalide) : ' + e.message); }
}

/** L'objet -> le fichier, avec l'en-tete et les fins de ligne du fichier `modele`. */
export function ecrisFichier(donnees, modele) {
  const m = normalise(modele || '');
  const i = m.indexOf(ENTETE);
  const entete = i >= 0 ? m.slice(0, i) : '// DONNEES DE JEU — genere et re-ecrit par le Card Builder (/builder/).\n';
  const texte = entete + ENTETE + JSON.stringify(donnees, null, 2) + ';\n';
  return /\r\n/.test(modele || '') ? texte.replace(/\n/g, '\r\n') : texte;
}

// ------------------------------------------------------------------ le disque
const dossier = id => join(RACINE(), id);
async function ecritAtomique(chemin, contenu) {
  const tmp = chemin + '.tmp';
  await writeFile(tmp, contenu, 'utf8');
  await rename(tmp, chemin);
}
async function lisVersion(id) {
  if (!NOM_OK.test(String(id || ''))) throw new Error('Version inconnue : ' + id);
  try { return JSON.parse(await readFile(join(dossier(id), 'version.json'), 'utf8')); }
  catch { throw new Error('Version introuvable : ' + id); }
}
const ecrisVersion = v => ecritAtomique(join(dossier(v.id), 'version.json'), JSON.stringify(v, null, 2));
async function texteDe(id) {
  if (!NOM_OK.test(String(id || ''))) throw new Error('Version inconnue : ' + id);
  return readFile(join(dossier(id), 'donnees.js'), 'utf8');
}

/** Toutes les versions, de la plus ancienne a la plus recente (sans les photos). */
async function toutes() {
  let noms;
  try { noms = await readdir(RACINE()); } catch { return []; }
  const vs = [];
  for (const n of noms) {
    if (!NOM_OK.test(n)) continue;
    try { vs.push(JSON.parse(await readFile(join(RACINE(), n, 'version.json'), 'utf8'))); } catch { /* dossier a moitie ecrit */ }
  }
  return vs.sort((a, b) => a.rang - b.rang);
}

const idDuRang = (rang) => 'v' + String(rang).padStart(4, '0');

// ------------------------------------------------------------------ creer / capturer
/**
 * Garde cet etat des donnees. Si le meme etat est deja garde (meme empreinte), on ne duplique
 * pas : on le PROMEUT en version nommee quand un titre est donne, sinon on le rend tel quel.
 * `type` : 'nommee' | 'auto'. Rend { version, nouvelle }.
 */
export async function capture({ texte, titre = '', description = '', type = 'nommee', source = 'manuelle' }) {
  lisFichier(texte);   // refuse ce qui n'est pas un fichier de donnees : une photo illisible ne sert a rien
  const emp = empreinte(texte);
  const vs = await toutes();
  const deja = vs.find(v => v.empreinte === emp);
  if (deja) {
    if (type === 'nommee' && deja.type !== 'nommee') {
      deja.type = 'nommee'; deja.titre = titre || deja.titre; deja.description = description || deja.description; deja.source = source;
      await ecrisVersion(deja);
      return { version: deja, nouvelle: false, promue: true };
    }
    return { version: deja, nouvelle: false };
  }
  await mkdir(RACINE(), { recursive: true });
  const rang = (vs.length ? vs[vs.length - 1].rang : 0) + 1;
  const id = idDuRang(rang);
  const d = lisFichier(texte);
  const precedente = vs.length ? vs[vs.length - 1] : null;
  let resume = null;
  if (precedente) {
    try { const df = diff(lisFichier(await texteDe(precedente.id)), d); resume = { depuis: precedente.id, total: df.total, parType: df.parType }; } catch { /* le resume n'est qu'une indication */ }
  }
  const v = {
    id, rang, type, titre: titre || (type === 'auto' ? 'Photo automatique' : `V0.${rang}`), description, source,
    cree: Date.now(), empreinte: emp, parent: precedente ? precedente.id : null,
    stats: { heros: (d.characters || []).length, cartes: (d.characters || []).reduce((n, h) => n + (h.cards || []).length + (h.switches || []).length, 0), adversaires: (d.npcs || []).length },
    resume, commentaires: [], calculs: []
  };
  await mkdir(dossier(id), { recursive: true });
  await ecritAtomique(join(dossier(id), 'donnees.js'), texte);
  await ecrisVersion(v);
  await purge();
  return { version: v, nouvelle: true };
}

/** Garde les AUTO_MAX photos automatiques les plus recentes ; ne touche jamais une version nommee. */
async function purge() {
  const autos = (await toutes()).filter(v => v.type === 'auto' && !(v.commentaires || []).length && !(v.calculs || []).length);
  const trop = autos.length - AUTO_MAX;
  for (let i = 0; i < trop; i++) await rm(dossier(autos[i].id), { recursive: true, force: true });
}

/** Le filet de securite : appele AVANT d'ecraser le fichier de donnees. Ne leve jamais. */
export async function sauvegardeAvantEcriture(ancienTexte, nouveauTexte, source = 'ecriture') {
  try {
    if (!ancienTexte) return null;
    if (nouveauTexte !== undefined && empreinte(ancienTexte) === empreinte(nouveauTexte)) return null;   // rien ne change
    const r = await capture({ texte: ancienTexte, type: 'auto', source,
      titre: 'Avant ' + (source === 'retour' ? 'un retour en arrière' : 'une écriture') + ' · ' + new Date().toLocaleString('fr-FR') });
    return r.version;
  } catch (e) { console.log('sauvegarde auto impossible : ' + e.message); return null; }
}

// ------------------------------------------------------------------ lire
/** La liste pour la page : chaque version avec son resume, du plus recent au plus ancien. */
export async function liste() {
  const vs = await toutes();
  return vs.map(v => ({ ...v, commentaires: undefined, nbCommentaires: (v.commentaires || []).length,
    calculs: (v.calculs || []).map(c => ({ archive: c.archive, titre: c.titre, lieLe: c.lieLe })) })).reverse();
}

/** Une version, commentaires et chiffres compris. */
export async function lis(id) { return lisVersion(id); }

/** La photo d'une version, en objet. */
export async function donnees(id) { return lisFichier(await texteDe(id)); }

/**
 * Ce qui a change entre deux etats. `contre` : un id, ou 'courant' (le fichier du jeu maintenant,
 * passe en `texteCourant`). Par defaut on compare a la version nommee precedente.
 */
export async function difference(id, contre, texteCourant) {
  const vs = await toutes();
  const v = vs.find(x => x.id === id);
  if (!v) throw new Error('Version inconnue : ' + id);
  let baseId = null, baseDonnees = null;
  if (contre === 'courant') {
    if (texteCourant === undefined) throw new Error('État courant indisponible.');
    return { de: id, vers: 'courant', ...diff(lisFichier(await texteDe(id)), lisFichier(texteCourant)) };   // du passe vers le present
  }
  if (contre && contre !== 'precedente') baseId = contre;
  else {
    const avant = vs.filter(x => x.rang < v.rang && x.type === 'nommee');
    baseId = avant.length ? avant[avant.length - 1].id : null;
  }
  if (baseId) baseDonnees = await donnees(baseId);
  if (!baseDonnees) return { de: null, vers: id, premiere: true, entites: [], total: 0, parType: {} };
  return { de: baseId, vers: id, ...diff(baseDonnees, await donnees(id)) };
}

/** Ou en est le fichier du jeu : identique a une version ? sinon, de combien s'en eloigne-t-il ? */
export async function etatCourant(texteCourant) {
  const vs = await toutes();
  const emp = empreinte(texteCourant);
  const egale = vs.find(v => v.empreinte === emp) || null;
  let depuis = null;
  const nommees = vs.filter(v => v.type === 'nommee');
  const derniere = nommees.length ? nommees[nommees.length - 1] : null;
  if (!egale && derniere) {
    try { const d = diff(await donnees(derniere.id), lisFichier(texteCourant)); depuis = { id: derniere.id, titre: derniere.titre, total: d.total, parType: d.parType }; } catch { /* indication seulement */ }
  }
  return { empreinte: emp, egale: egale ? { id: egale.id, titre: egale.titre, type: egale.type } : null, depuis, versions: vs.length };
}

// ------------------------------------------------------------------ ecrire
/** Renomme une version ou change sa description. */
export async function renomme(id, { titre, description }) {
  const v = await lisVersion(id);
  if (titre !== undefined) v.titre = String(titre).trim().slice(0, 200) || v.titre;
  if (description !== undefined) v.description = String(description).slice(0, 20000);
  if (v.type === 'auto' && titre) v.type = 'nommee';   // lui donner un nom, c'est la garder
  await ecrisVersion(v);
  return v;
}

/** Ajoute un commentaire. `cible` : 'version' ou la cle d'une entite (« carte:cat2_kit », « hero:dog2 »…). */
export async function commente(id, cible, texte) {
  texte = String(texte || '').trim().slice(0, 20000);
  if (!texte) throw new Error('Commentaire vide.');
  const v = await lisVersion(id);
  const c = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), cible: String(cible || 'version').slice(0, 200), texte, at: Date.now() };
  (v.commentaires = v.commentaires || []).push(c);
  await ecrisVersion(v);
  return c;
}
export async function retireCommentaire(id, commentaireId) {
  const v = await lisVersion(id);
  v.commentaires = (v.commentaires || []).filter(c => c.id !== commentaireId);
  await ecrisVersion(v);
}
export async function modifieCommentaire(id, commentaireId, texte) {
  const v = await lisVersion(id);
  const c = (v.commentaires || []).find(x => x.id === commentaireId);
  if (!c) throw new Error('Commentaire introuvable.');
  c.texte = String(texte || '').trim().slice(0, 20000) || c.texte; c.modifie = Date.now();
  await ecrisVersion(v);
  return c;
}

/**
 * Lie un calcul RANGE a une version : on relit ses sorties (matrices, analyse des cartes…) et on
 * garde les chiffres AVEC la version — le calcul peut disparaitre de la cle, les chiffres restent.
 */
export async function lieCalcul(id, archiveId) {
  const v = await lisVersion(id);
  const c = await relitCalcul(archiveId);
  const kpi = kpiDuCalcul(c.lignes);
  v.calculs = (v.calculs || []).filter(x => x.archive !== archiveId);
  v.calculs.push({ archive: archiveId, titre: c.titre || archiveId, debut: c.debut || null, fin: c.fin || null, lieLe: Date.now(), kpi });
  await ecrisVersion(v);
  return v.calculs[v.calculs.length - 1];
}
export async function delieCalcul(id, archiveId) {
  const v = await lisVersion(id);
  v.calculs = (v.calculs || []).filter(x => x.archive !== archiveId);
  await ecrisVersion(v);
}

/** Supprime une version. Refuse celle qui correspond au fichier du jeu : ce serait perdre le present. */
export async function supprime(id, texteCourant) {
  const v = await lisVersion(id);
  if (texteCourant !== undefined && empreinte(texteCourant) === v.empreinte)
    throw new Error('Cette version est l\'état actuel du jeu : la supprimer ne garderait rien nulle part.');
  await rm(dossier(id), { recursive: true, force: true });
}

// ------------------------------------------------------------------ revenir en arriere
/**
 * Calcule le fichier qu'il faudrait ecrire pour revenir a `id` — sans l'ecrire. Le serveur fait
 * la photo de securite, ecrit, et la page affiche `fait`.
 * Sans `cle` : tout le fichier. Avec `cle` (« carte:cat2_kit ») : seulement cette entite.
 */
export async function pourRestaurer(id, cle, texteCourant) {
  const texte = await texteDe(id);
  if (!cle) return { texte, fait: 'tout le jeu est revenu à cette version' };
  const r = restaureEntite(lisFichier(texteCourant), lisFichier(texte), cle);
  return { texte: ecrisFichier(r.donnees, texteCourant), fait: r.fait };
}

export const _pourLesTests = { RACINE, toutes };
