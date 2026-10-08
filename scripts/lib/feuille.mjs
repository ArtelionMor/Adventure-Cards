// LIRE LA GOOGLE SHEET « Config Adventure-Cards » ET L'ECRIRE DANS LE JEU.
//
// La feuille est lue avec un COMPTE DE SERVICE (Google Cloud, projet `adventure-c`) : une cle JSON posee
// SUR LE PI, hors du depot (`~/.adventure-card/google-sa.json`, droits 600, jamais commitee), et la feuille
// partagee en LECTEUR avec l'adresse du compte. Aucune dependance : le jeton se signe avec `crypto`.
//
// Regle de la feuille (decision du game designer, 9 octobre 2026) : tout ce qui commence par « ~ » — un
// onglet, une colonne, une ligne dont l'identifiant commence par « ~ » — n'est PAS exporte.
//
// Ce que ca produit : `game/data/feuille.data.js` (`FEUILLE = { synchro, feuille, <onglet>: [lignes] }`), que
// `game/src/config/balance.js` pose sur `BALANCE.ui.fx` (voir `game/src/config/feuille.js`).
// Utilise par `scripts/sync-feuille.mjs` (ligne de commande) et par `/api/feuille` (page « Feuille » de l'Atelier).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FICHIER = path.join(RACINE, 'game', 'data', 'feuille.data.js');
export const ID_FEUILLE = process.env.ADVENTURE_FEUILLE || '1B01tuggXdbvqO3_7wh2YserIoDVnarMXCPXPaYbSGCY';
const CLE = process.env.ADVENTURE_GOOGLE_CLE || path.join(os.homedir(), '.adventure-card', 'google-sa.json');

let jeton = null;   // { valeur, expire }

/** Le jeton d'acces du compte de service (valable une heure, garde en memoire). */
async function jetonAcces() {
  if (jeton && jeton.expire > Date.now() + 60000) return jeton.valeur;
  if (!fs.existsSync(CLE)) throw new Error(`pas de cle Google sur cette machine (${CLE}) : la synchronisation se fait depuis le Pi`);
  const k = JSON.parse(fs.readFileSync(CLE, 'utf8'));
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const tete = b64({ alg: 'RS256', typ: 'JWT' });
  const corps = b64({ iss: k.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', aud: k.token_uri, iat: now, exp: now + 3600 });
  const signature = crypto.sign('RSA-SHA256', Buffer.from(tete + '.' + corps), k.private_key).toString('base64url');
  const r = await fetch(k.token_uri, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${tete}.${corps}.${signature}` })
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Google a refuse la cle : ' + (j.error_description || j.error || r.status));
  jeton = { valeur: j.access_token, expire: Date.now() + 3500 * 1000 };
  return jeton.valeur;
}

async function api(url) {
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + await jetonAcces() } });
  const j = await r.json();
  if (!r.ok) throw new Error('Google Sheets : ' + ((j.error && j.error.message) || r.status));
  return j;
}

const exporte = nom => !String(nom).trim().startsWith('~');

/**
 * Lit la feuille. Rend `{ onglets: { nom: [ { colonne: valeur } ] }, ignores: [noms d'onglets en ~] }`.
 * Les valeurs sont brutes (nombres en nombres, pas de « 0,58 » de locale francaise).
 */
export async function lisLaFeuille() {
  const meta = await api(`https://sheets.googleapis.com/v4/spreadsheets/${ID_FEUILLE}?fields=sheets.properties.title`);
  const noms = meta.sheets.map(s => s.properties.title);
  const gardes = noms.filter(exporte);
  const ignores = noms.filter(n => !exporte(n));
  const onglets = {};
  if (gardes.length) {
    const plages = gardes.map(n => `ranges=${encodeURIComponent("'" + n.replace(/'/g, "''") + "'")}`).join('&');
    const j = await api(`https://sheets.googleapis.com/v4/spreadsheets/${ID_FEUILLE}/values:batchGet?${plages}&valueRenderOption=UNFORMATTED_VALUE`);
    j.valueRanges.forEach((vr, i) => { onglets[gardes[i]] = convertis(vr.values || []); });
  }
  return { onglets, ignores };
}

/** Une grille (premiere ligne = en-tetes) -> des objets, sans colonne ni ligne en « ~ » ni ligne vide. */
export function convertis(grille) {
  if (!grille.length) return [];
  const tetes = grille[0].map(String);
  const colonnes = tetes.map((t, i) => ({ t: t.trim(), i })).filter(c => c.t && exporte(c.t));
  const lignes = [];
  for (const row of grille.slice(1)) {
    const o = {};
    for (const c of colonnes) if (row[c.i] !== undefined && row[c.i] !== '') o[c.t] = row[c.i];
    // une ligne dont l'identifiant commence par « ~ » n'est pas exportee ; une ligne sans identifiant non plus
    if (o.id === undefined || !exporte(o.id)) continue;
    lignes.push(o);
  }
  return lignes;
}

/** Ce que le jeu contient AUJOURD'HUI : la ligne `FEUILLE` ecrite par la derniere synchro, et `BALANCE.ui.fx` effectif. */
function etatDuJeu() {
  const script = `
    import { BALANCE } from ${JSON.stringify(pathToFileURL(path.join(RACINE, 'game/src/config/balance.js')).href)};
    import { FEUILLE } from ${JSON.stringify(pathToFileURL(FICHIER).href)};
    process.stdout.write(JSON.stringify({ fx: BALANCE.ui.fx, feuille: FEUILLE }));`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }));
}

/**
 * Compare la feuille a ce que le jeu a. `plan` : une entree par ligne (voir `planifie`), `retires` : les
 * identifiants que la derniere synchro avait et que la feuille n'a plus (leur valeur retombe a celle de balance.js).
 */
export async function apercu() {
  const { planifie } = await import(pathToFileURL(path.join(RACINE, 'game/src/config/feuille.js')).href);
  const lue = await lisLaFeuille();
  const jeu = etatDuJeu();
  const plan = planifie(jeu.fx, lue.onglets.animations || []).map(({ objet, ...p }) => p);
  const ids = new Set((lue.onglets.animations || []).map(l => String(l.id)));
  const retires = (jeu.feuille.animations || []).map(l => String(l.id)).filter(id => !ids.has(id));
  const sansEffet = Object.keys(lue.onglets).filter(n => n !== 'animations');
  return { onglets: Object.keys(lue.onglets), ignores: lue.ignores, sansEffet, plan, retires, lue };
}

/** Ecrit `game/data/feuille.data.js`. Les fins de ligne sont celles du fichier s'il existe (LF sinon). */
export function ecris(onglets) {
  const objet = { synchro: new Date().toISOString(), feuille: ID_FEUILLE, ...onglets };
  const source = `// FICHIER GENERE par scripts/sync-feuille.mjs (ou le bouton « Feuille » de l'Atelier) : ne pas l'editer a la main.
// Il vient de la Google Sheet « Config Adventure-Cards ». Les onglets, colonnes et lignes en « ~ » ne sont pas exportes.
// Les valeurs de l'onglet « animations » remplacent celles de BALANCE.ui.fx (game/src/config/feuille.js).
export const FEUILLE = ${JSON.stringify(objet, null, 2)};
`;
  const crlf = fs.existsSync(FICHIER) && fs.readFileSync(FICHIER, 'utf8').includes('\r\n');
  fs.writeFileSync(FICHIER, crlf ? source.replace(/\n/g, '\r\n') : source, 'utf8');
  return FICHIER;
}

/** Synchronise : lit, ecrit, et rend l'apercu de ce qui a change. */
export async function synchronise() {
  const a = await apercu();
  ecris(a.lue.onglets);
  return a;
}
