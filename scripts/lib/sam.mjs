// LE DECOUPAGE AUTOMATIQUE (SAM 2) : le serveur du jeu envoie le PNG d'un personnage a une machine qui a
// une carte graphique (scripts/sam-serveur.py), et lui rend les regions trouvees. Meme logique que les
// renforts de calcul (lib/renforts.mjs) : une liste de machines designees par leur nom Tailscale, sondees a
// chaque demande, la premiere qui repond travaille ; une machine eteinte est simplement sautee.
//
// Les reglages vivent hors du repo (ils nomment des machines) : ~/.adventure-card/sam.json, edites dans la
// fenetre « Decoupe auto » de l'Atelier Rig & Anim (builder/rig/sam.js) :
//   exporter  : false = le calcul se fait sur la machine de ce serveur (127.0.0.1:port) ;
//               true  = il part vers les machines ci-dessous
//   reseau    : le reseau Tailscale (tailnet), ex. « tailc8e047.ts.net » : un nom de machine sans point est
//               complete en « <nom>.<reseau> » ; vide = le nom court tel quel (MagicDNS)
//   machines  : [ { nom, port, actif } ]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const FICHIER = process.env.ADVENTURE_SAM || join(homedir(), '.adventure-card', 'sam.json');
export const PORT = 7340;
const MACHINES_MAX = 8;
const NOM = /^[a-z0-9]([a-z0-9._-]{0,98}[a-z0-9])?$/i;
const RESEAU = /^[a-z0-9]([a-z0-9.-]{0,98}[a-z0-9])?$/i;

export const REGLAGES_DEFAUT = { exporter: false, reseau: '', points: 32, machines: [] };

/** Nettoie des reglages venus de la page : jamais un nom ou un port qui ne ressemble pas a une machine. */
export function valideReglages(r) {
  const o = { ...REGLAGES_DEFAUT };
  if (!r || typeof r !== 'object') return o;
  o.exporter = r.exporter === true;
  o.reseau = typeof r.reseau === 'string' && RESEAU.test(r.reseau.trim()) ? r.reseau.trim().replace(/^\.+|\.+$/g, '') : '';
  o.points = [16, 32, 48].includes(+r.points) ? +r.points : 32;
  o.machines = (Array.isArray(r.machines) ? r.machines : []).slice(0, MACHINES_MAX)
    .map(m => ({ nom: String(m?.nom || '').trim(), port: Math.round(+m?.port) || PORT, actif: m?.actif !== false }))
    .filter(m => NOM.test(m.nom) && m.port >= 1 && m.port <= 65535);
  return o;
}

export function lisReglages() {
  try { return valideReglages(JSON.parse(readFileSync(FICHIER, 'utf8'))); } catch { return { ...REGLAGES_DEFAUT }; }
}

export function ecrisReglages(r) {
  const v = valideReglages(r);
  mkdirSync(dirname(FICHIER), { recursive: true });
  writeFileSync(FICHIER, JSON.stringify(v, null, 2) + '\n', 'utf8');
  return v;
}

/** Les machines a essayer, dans l'ordre, avec leur adresse. */
export function cibles(reglages) {
  if (!reglages.exporter) return [{ nom: 'cette machine', url: `http://127.0.0.1:${PORT}` }];
  return reglages.machines.filter(m => m.actif).map(m => {
    const hote = reglages.reseau && !m.nom.includes('.') ? `${m.nom}.${reglages.reseau}` : m.nom;
    return { nom: m.nom, url: `http://${hote}:${m.port}` };
  });
}

/** Une machine repond-elle ? { ok, modele, charge, gpu } ou { ok: false, raison }. */
export async function sonde(url, delai = 3000) {
  try {
    const r = await fetch(url + '/etat', { signal: AbortSignal.timeout(delai) });
    if (!r.ok) return { ok: false, raison: 'HTTP ' + r.status };
    return await r.json();
  } catch (e) {
    return { ok: false, raison: e.cause?.code || e.name === 'TimeoutError' ? 'ne répond pas' : (e.message || 'injoignable') };
  }
}

/** L'etat des machines de la liste, pour la fenetre. */
export async function etat(reglages) {
  return Promise.all(cibles(reglages).map(async c => ({ ...c, etat: await sonde(c.url) })));
}

/** Envoie le PNG a la premiere machine qui repond. Rend { machine, largeur, hauteur, masques }. */
export async function segmente(png, reglages, { delai = 15 * 60 * 1000 } = {}) {
  const raisons = [];
  for (const c of cibles(reglages)) {
    const s = await sonde(c.url);
    if (!s.ok) { raisons.push(`${c.nom} : ${s.raison || 'injoignable'}`); continue; }
    const r = await fetch(`${c.url}/segmente?points=${reglages.points}`, { method: 'POST', body: png, signal: AbortSignal.timeout(delai) });
    const corps = await r.json().catch(() => ({}));
    if (!r.ok) { raisons.push(`${c.nom} : ${corps.erreur || 'HTTP ' + r.status}`); continue; }
    return { machine: c.nom, ...corps };
  }
  throw new Error(raisons.length ? 'Aucune machine n\'a pu découper : ' + raisons.join(' ; ') : 'Aucune machine à essayer (cocher au moins une machine active).');
}

/** `tailscale status --json` de CETTE machine (celle du serveur) : le CLI du PATH, sinon celui de Windows. */
function statutTailscale() {
  const exes = ['tailscale', 'C:\Program Files\Tailscale\tailscale.exe'];
  return new Promise((ok, ko) => {
    const essaie = i => {
      if (i >= exes.length) { ko(new Error('Tailscale introuvable sur la machine du serveur (commande « tailscale »)')); return; }
      execFile(exes[i], ['status', '--json'], { timeout: 10000, maxBuffer: 8 * 1024 * 1024 }, (e, sortie) => {
        if (e) { essaie(i + 1); return; }
        try { ok(JSON.parse(sortie)); } catch { ko(new Error('réponse de Tailscale illisible')); }
      });
    };
    essaie(0);
  });
}

/**
 * Les machines du reseau Tailscale, et lesquelles font tourner le serveur SAM : on lit la liste de Tailscale
 * puis on sonde chaque machine EN LIGNE sur le port donne (GET /etat). Rend { reseau, machines: [ { nom, os,
 * enLigne, sam } ] } ; `sam` = la reponse du serveur SAM, ou null.
 */
export async function detecte(port = PORT) {
  const st = await statutTailscale();
  const reseau = String(st.MagicDNSSuffix || '').replace(/^\.+|\.+$/g, '');
  const pairs = Object.values(st.Peer || {});
  const moi = st.Self ? [{ ...st.Self, __moi: true }] : [];
  const machines = await Promise.all([...moi, ...pairs].map(async p => {
    // le nom qui se RESOUT (mon-mien), pas celui qu'on affiche (Mon_Mien)
    const nom = String(p.DNSName || '').split('.')[0] || String(p.HostName || '').toLowerCase().replace(/_/g, '-');
    const ip = (p.TailscaleIPs || []).find(a => !a.includes(':'));
    let sam = null;
    if ((p.Online || p.__moi) && ip) {
      const e = await sonde(p.__moi ? `http://127.0.0.1:${port}` : `http://${ip}:${port}`, 2000);
      if (e.ok) sam = e;
    }
    return { nom, os: p.OS || '', enLigne: !!(p.Online || p.__moi), moi: !!p.__moi, sam };
  }));
  return { reseau, machines: machines.filter(m => NOM.test(m.nom)) };
}
