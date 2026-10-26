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

export const OLLAMA = 11434;
export const REGLAGES_DEFAUT = { exporter: false, reseau: '', points: 32, modele: '', reflexion: false, machines: [] };

/** Nettoie des reglages venus de la page : jamais un nom ou un port qui ne ressemble pas a une machine. */
export function valideReglages(r) {
  const o = { ...REGLAGES_DEFAUT };
  if (!r || typeof r !== 'object') return o;
  o.exporter = r.exporter === true;
  o.reseau = typeof r.reseau === 'string' && RESEAU.test(r.reseau.trim()) ? r.reseau.trim().replace(/^\.+|\.+$/g, '') : '';
  o.points = [16, 32, 48].includes(+r.points) ? +r.points : 32;
  o.reflexion = r.reflexion === true;
  o.modele = typeof r.modele === 'string' && /^[\w.:/@-]{1,120}$/.test(r.modele.trim()) ? r.modele.trim() : '';
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
    let sam = null, ia = null;
    if ((p.Online || p.__moi) && ip) {
      const hote = p.__moi ? '127.0.0.1' : ip;
      const [e, o] = await Promise.all([sonde(`http://${hote}:${port}`, 2000), fetch(`http://${hote}:${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) }).then(r => r.ok ? r.json() : null).catch(() => null)]);
      if (e.ok) sam = e;
      if (o?.models) ia = { modeles: o.models.map(m => m.name) };
    }
    return { nom, os: p.OS || '', enLigne: !!(p.Online || p.__moi), moi: !!p.__moi, sam, ia };
  }));
  return { reseau, machines: machines.filter(m => NOM.test(m.nom)) };
}

// ------------------------------------------------------------------ l'IA qui range les regions en parties (Ollama)
// SAM trouve les regions (par la couleur), un modele de vision qui tourne sur la meme machine dit lesquelles
// forment « la tete », « la queue »… On ne lui demande PAS de coordonnees (un petit modele les situe mal) : on lui
// montre les regions NUMEROTEES et il rend des numeros. Les machines sont celles de la liste (meme nom, port 11434).

function hotesOllama(reglages) {
  return cibles(reglages).map(c => ({ nom: c.nom, url: c.url.replace(/:\d+$/, ':' + OLLAMA) }));
}

/** Le premier Ollama qui repond : { nom, url, modeles: [noms] }. */
export async function ollama(reglages) {
  const raisons = [];
  for (const h of hotesOllama(reglages)) {
    try {
      const r = await fetch(h.url + '/api/tags', { signal: AbortSignal.timeout(3000) });
      if (!r.ok) { raisons.push(`${h.nom} : HTTP ${r.status}`); continue; }
      const d = await r.json();
      return { ...h, modeles: (d.models || []).map(m => m.name) };
    } catch { raisons.push(`${h.nom} : Ollama ne répond pas`); }
  }
  throw new Error('Aucun Ollama joignable (' + raisons.join(' ; ') + ')');
}

function lisJson(texte) {
  const t = String(texte || '').replace(/```(?:json)?/gi, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error("réponse de l'IA sans JSON : " + t.slice(0, 120));
  return JSON.parse(t.slice(a, b + 1));
}

/**
 * Range les regions numerotees d'une image en parties. `image` : PNG en base64 (les regions colorees et
 * numerotees) ; `parties` : les noms cherches. Rend { machine, modele, parties: { nom: [ids] } }.
 */
export async function classe({ image, parties }, reglages) {
  const o = await ollama(reglages);
  const modele = reglages.modele && o.modeles.includes(reglages.modele) ? reglages.modele
    : o.modeles.find(m => /qwen3\.5:9b/.test(m)) || o.modeles[0];
  if (!modele) throw new Error(o.nom + " n'a aucun modèle Ollama");
  const noms = (parties || []).map(String).filter(n => /^[\w -]{1,40}$/.test(n)).slice(0, 20);
  if (!noms.length) throw new Error('aucune partie à chercher');
  const consigne = 'Cette image montre un personnage de jeu découpé en régions colorées NUMÉROTÉES. '
    + 'Pour chaque partie ci-dessous, donne la liste des NUMÉROS des régions qui la composent (toutes celles qui en font partie, y compris les petites). '
    + 'Parties : ' + noms.join(', ') + ". Une région ne va que dans une seule partie ; omets une partie qui n'existe pas. "
    + 'Réponds UNIQUEMENT par un JSON : {"partie": [numeros]}.';
  // En FLUX : sans lui, fetch coupe une reponse qui met plus de 5 minutes a arriver (un gros modele qui reflechit) ;
  // en flux, les morceaux de reflexion arrivent au fil de l'eau et la connexion reste vivante.
  const r = await fetch(o.url + '/api/chat', {
    method: 'POST', signal: AbortSignal.timeout(40 * 60 * 1000),
    body: JSON.stringify({ model: modele, stream: true, think: reglages.reflexion === true, options: { temperature: 0.1, num_ctx: reglages.reflexion ? 16384 : 8192 }, messages: [{ role: 'user', content: consigne, images: [image] }] }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Ollama : HTTP ' + r.status); }
  let contenu = '', reste = '';
  const lecteur = r.body.getReader(), decode = new TextDecoder();
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    reste += decode.decode(value, { stream: true });
    let i;
    while ((i = reste.indexOf('\n')) >= 0) {
      const ligne = reste.slice(0, i).trim(); reste = reste.slice(i + 1);
      if (!ligne) continue;
      const j = JSON.parse(ligne);
      if (j.error) throw new Error('Ollama : ' + j.error);
      contenu += j.message?.content || '';
    }
  }
  const d = { message: { content: contenu } };
  const brut = lisJson(d.message?.content);
  const sortie = {};
  for (const [nom, ids] of Object.entries(brut)) {
    const liste = (Array.isArray(ids) ? ids : []).map(Number).filter(n => Number.isInteger(n) && n >= 0);
    if (liste.length) sortie[String(nom).trim()] = [...new Set(liste)];
  }
  if (!Object.keys(sortie).length) throw new Error("l'IA n'a rangé aucune région");
  return { machine: o.nom, modele, parties: sortie };
}
