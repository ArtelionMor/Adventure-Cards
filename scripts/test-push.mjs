// BANC DES NOTIFICATIONS PUSH (scripts/lib/push.mjs).
//
// Le chiffrement ne se devine pas : un octet faux et le telephone jette le message sans
// rien dire. On rejoue donc l'EXEMPLE DE LA RFC 8291 (section 5) au bit pres, puis on
// verifie que le jeton VAPID est bien signe par la cle du serveur.
//   node scripts/test-push.mjs
import { createPublicKey, verify } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Un fichier de cles jetable : le banc ne doit pas toucher a ~/.adventure-card.
const dossier = mkdtempSync(join(tmpdir(), 'adventure-push-'));
process.env.ADVENTURE_PUSH = join(dossier, 'push.json');
const { chiffre, jeton, clePublique, abonne, abonnes, desabonne } = await import('./lib/push.mjs');

let ok = 0, ko = 0;
const verifie = (nom, cond) => { if (cond) ok++; else ko++; console.log(`  ${cond ? 'ok  ' : 'ECHEC'} ${nom}`); };

console.log('\nChiffrement (RFC 8291, section 5)');
const attendu = 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN';
const corps = chiffre(Buffer.from('V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24', 'base64url'), {
  p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg'
}, { privee: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', sel: 'DGv6ra1nlYgDCS1FRnbzlw' });
verifie('le message chiffre est celui de la RFC, octet pour octet', corps.toString('base64url') === attendu);

console.log('\nJeton VAPID (RFC 8292)');
const pub = Buffer.from(clePublique(), 'base64url');
verifie('la cle publique fait 65 octets et commence par 0x04', pub.length === 65 && pub[0] === 4);
const [entete, charge, signature] = jeton('https://fcm.googleapis.com').split('.');
const cle = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
verifie('la signature est valide pour la cle publique annoncee',
  verify('sha256', Buffer.from(entete + '.' + charge), { key: cle, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')));
const claims = JSON.parse(Buffer.from(charge, 'base64url').toString());
verifie('le jeton vise le service push et expire dans moins de 24 h',
  claims.aud === 'https://fcm.googleapis.com' && claims.exp - Date.now() / 1000 <= 24 * 3600 && claims.exp > Date.now() / 1000);
verifie('le sujet est une URL ou une adresse mailto', /^(https:|mailto:)/.test(claims.sub));

console.log('\nAbonnements');
abonne({ endpoint: 'https://exemple.test/a', keys: { p256dh: 'x', auth: 'y' } });
abonne({ endpoint: 'https://exemple.test/a', keys: { p256dh: 'x', auth: 'y' } });
verifie('un meme telephone ne s\'abonne qu\'une fois', abonnes() === 1);
let refuse = false;
try { abonne({ endpoint: 'http://pas-https', keys: { p256dh: 'x', auth: 'y' } }); } catch { refuse = true; }
verifie('un abonnement sans https est refuse', refuse);
desabonne('https://exemple.test/a');
verifie('un desabonnement l\'oublie', abonnes() === 0);

rmSync(dossier, { recursive: true, force: true });
console.log(`\n${ok} test(s) passe(s), ${ko} echec(s).`);
process.exit(ko ? 1 : 0);
