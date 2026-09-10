// LES NOTIFICATIONS PUSH DE L'ATELIER — sans dependance, avec node:crypto.
//
// Le serveur du Pi previent le telephone quand un calcul avance ou se termine, meme
// Atelier ferme. C'est le Web Push standard : le telephone s'abonne (builder/sw.js et
// l'accueil de l'Atelier), le serveur chiffre un petit message pour lui seul (RFC 8291,
// « aes128gcm ») et le confie au service push de son navigateur (celui de Google pour
// Chrome), en prouvant qui il est avec une cle VAPID (RFC 8292).
//
// LES CLES ET LES ABONNEMENTS NE SONT PAS DANS LE REPO — il est public. Ils vivent dans
// ~/.adventure-card/push.json, cree au premier besoin (ADVENTURE_PUSH pour un autre
// chemin : c'est ce que fait le banc de test). Effacer ce fichier invalide tous les
// abonnements ; l'accueil de l'Atelier le voit et se reabonne tout seul.
import { generateKeyPairSync, createPrivateKey, createECDH, randomBytes, hkdfSync, createCipheriv, sign } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const FICHIER = process.env.ADVENTURE_PUSH || join(homedir(), '.adventure-card', 'push.json');
// Le « sujet » VAPID : de quoi joindre l'expediteur si ses messages posent probleme. La
// RFC accepte une URL, ce qui evite de publier une adresse.
const SUJET = 'https://github.com/ArtelionMor/Adventure-Cards';
const b64u = b => Buffer.from(b).toString('base64url');

let etat = null;

function sauve() {
  mkdirSync(dirname(FICHIER), { recursive: true });
  writeFileSync(FICHIER, JSON.stringify(etat, null, 2), { mode: 0o600 });
}

function charge() {
  if (etat) return etat;
  try { etat = JSON.parse(readFileSync(FICHIER, 'utf8')); } catch { etat = null; }
  if (!etat || !etat.cle) {
    // La cle VAPID : une paire P-256. Le navigateur recoit la publique en brut (65
    // octets, 0x04 || x || y) au moment de s'abonner.
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const jwk = publicKey.export({ format: 'jwk' });
    const brute = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);
    etat = { cle: { publique: b64u(brute), privee: privateKey.export({ format: 'pem', type: 'pkcs8' }) }, abonnements: [] };
    sauve();
  }
  return etat;
}

export function clePublique() { return charge().cle.publique; }
export function abonnes() { return charge().abonnements.length; }

export function abonne(a) {
  if (!a || typeof a.endpoint !== 'string' || !a.endpoint.startsWith('https://') || !a.keys || !a.keys.p256dh || !a.keys.auth)
    throw new Error('Abonnement invalide');
  const e = charge();
  e.abonnements = e.abonnements.filter(x => x.endpoint !== a.endpoint);
  e.abonnements.push({ endpoint: a.endpoint, keys: { p256dh: a.keys.p256dh, auth: a.keys.auth }, depuis: Date.now() });
  sauve();
}

export function desabonne(endpoint) {
  const e = charge();
  e.abonnements = e.abonnements.filter(x => x.endpoint !== endpoint);
  sauve();
}

/** Le jeton VAPID (RFC 8292) : un JWT ES256, signe par la cle du serveur, pour UN service push. */
export function jeton(aud) {
  const entete = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const corps = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUJET }));
  const signature = sign('sha256', Buffer.from(entete + '.' + corps),
    { key: createPrivateKey(charge().cle.privee), dsaEncoding: 'ieee-p1363' });
  return `${entete}.${corps}.${b64u(signature)}`;
}

/**
 * Le message chiffre pour un abonne (RFC 8291) : un seul enregistrement aes128gcm,
 * precede de son en-tete (sel, taille d'enregistrement, cle ephemere du serveur).
 * `essai` fixe la cle ephemere et le sel — pour le banc de test, qui rejoue l'exemple
 * de la RFC au bit pres ; en vrai, les deux sont tires au hasard a chaque message.
 */
export function chiffre(message, keys, essai = {}) {
  const clientPub = Buffer.from(keys.p256dh, 'base64url');
  const secret = Buffer.from(keys.auth, 'base64url');
  const ecdh = createECDH('prime256v1');
  if (essai.privee) ecdh.setPrivateKey(Buffer.from(essai.privee, 'base64url')); else ecdh.generateKeys();
  const serveurPub = ecdh.getPublicKey();
  const partage = ecdh.computeSecret(clientPub);
  const sel = essai.sel ? Buffer.from(essai.sel, 'base64url') : randomBytes(16);

  const info = Buffer.concat([Buffer.from('WebPush: info\0'), clientPub, serveurPub]);
  const ikm = Buffer.from(hkdfSync('sha256', partage, secret, info, 32));
  const cek = Buffer.from(hkdfSync('sha256', ikm, sel, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, sel, Buffer.from('Content-Encoding: nonce\0'), 12));

  const c = createCipheriv('aes-128-gcm', cek, nonce);
  // 0x02 : « dernier enregistrement », sans remplissage.
  const code = Buffer.concat([c.update(Buffer.concat([Buffer.from(message), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const entete = Buffer.alloc(21);
  sel.copy(entete, 0);
  entete.writeUInt32BE(4096, 16);
  entete[20] = serveurPub.length;
  return Buffer.concat([entete, serveurPub, code]);
}

/**
 * Envoie `donnees` (un petit objet, lu par builder/sw.js) a tous les abonnes. `sujet`
 * (en-tete Topic) fait qu'un message pas encore livre est REMPLACE par le suivant du meme
 * sujet : un telephone reste hors ligne une heure ne recoit pas vingt pourcentages en
 * rafale. Un abonnement que le service push declare mort (404, 410) est oublie. Rend ce
 * qui s'est passe, pour que le bouton « Tester » puisse le dire.
 */
export async function notifie(donnees, { urgence = 'normal', sujet } = {}) {
  const e = charge();
  const message = JSON.stringify(donnees);
  const bilan = { envoyees: 0, erreurs: [] };
  const morts = [];
  await Promise.all(e.abonnements.map(async a => {
    try {
      const r = await fetch(a.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `vapid t=${jeton(new URL(a.endpoint).origin)}, k=${e.cle.publique}`,
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          TTL: '3600',
          Urgency: urgence,
          ...(sujet ? { Topic: sujet } : {})
        },
        body: chiffre(message, a.keys)
      });
      if (r.ok) bilan.envoyees++;
      else if (r.status === 404 || r.status === 410) morts.push(a.endpoint);
      else bilan.erreurs.push(`${r.status} ${(await r.text()).slice(0, 160)}`);
    } catch (err) {
      bilan.erreurs.push(err.message);
    }
  }));
  if (morts.length) {
    e.abonnements = e.abonnements.filter(a => !morts.includes(a.endpoint));
    sauve();
    bilan.oublies = morts.length;
  }
  return bilan;
}
