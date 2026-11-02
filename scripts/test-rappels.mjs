// Banc des rappels du jeu (scripts/lib/rappels-jeu.mjs, push.mjs) : un message ne part que vers les abonnes de son application, un rappel part
// une fois et a son heure, la liste est remplacee a chaque envoi. Aucun reseau : `fetch` est remplace, les fichiers sont temporaires.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dossier = mkdtempSync(join(tmpdir(), 'rappels-'));
process.env.ADVENTURE_PUSH = join(dossier, 'push.json');
process.env.ADVENTURE_RAPPELS = join(dossier, 'rappels.json');

let ok = 0, ko = 0;
const verifie = (nom, cond) => { if (cond) { ok++; console.log('  ok   ' + nom); } else { ko++; console.log('  ECHEC ' + nom); } };

const { abonne, abonnes } = await import('./lib/push.mjs');
const { remplaceRappels, envoieLesEchus } = await import('./lib/rappels-jeu.mjs');

const envoyes = [];
globalThis.fetch = async (url) => { envoyes.push(String(url)); return { ok: true, status: 201, text: async () => '' };};

// Des cles de client valides (le chiffrement les lit) : une paire P-256 jetable.
import { createECDH, randomBytes } from 'node:crypto';
const cleClient = () => { const e = createECDH('prime256v1'); e.generateKeys(); return { p256dh: e.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') }; };
abonne({ endpoint: 'https://push.test/atelier', keys: cleClient() });
abonne({ endpoint: 'https://push.test/jeu', keys: cleClient(), app: 'jeu' });
verifie('deux abonnes, un par application', abonnes() === 2 && abonnes('jeu') === 1 && abonnes('atelier') === 1);

const maintenant = Date.now();
verifie('la liste est acceptee (les rappels invalides sont ecartes)', remplaceRappels([
  { id: 'a', quand: maintenant - 1000, titre: 'Fin', corps: 'x' },
  { id: 'b', quand: maintenant + 3600000, titre: 'Plus tard', corps: 'y' },
  { id: 5, quand: 1, titre: 'sans id texte' },
  { id: 'c', quand: 'demain', titre: 'sans heure' }
]) === 2);

const bilan = await envoieLesEchus(maintenant);
verifie('seul le rappel echu part', bilan.length === 1 && bilan[0].id === 'a');
verifie('il part vers l\'abonne du jeu, pas vers celui de l\'Atelier', envoyes.length === 1 && envoyes[0] === 'https://push.test/jeu');
verifie('un rappel parti ne repart pas', (await envoieLesEchus(maintenant + 1000)).length === 0);

remplaceRappels([{ id: 'a', quand: maintenant - 1000, titre: 'Fin', corps: 'x' }]);
verifie('renvoyer la meme liste ne le fait pas repartir', (await envoieLesEchus(maintenant + 2000)).length === 0);

remplaceRappels([{ id: 'b', quand: maintenant + 3600000, titre: 'Plus tard', corps: 'y' }]);
verifie('le rappel suivant part a son heure', (await envoieLesEchus(maintenant + 3600001)).length === 1);

remplaceRappels([{ id: 'vieux', quand: maintenant - 7 * 3600 * 1000, titre: 'Trop vieux', corps: '' }]);
const avant = envoyes.length;
await envoieLesEchus(maintenant);
verifie('un rappel manque de plus de 6 h ne part plus', envoyes.length === avant);

console.log(`\n${ok} test(s) passe(s), ${ko} echec(s).`);
process.exit(ko ? 1 : 0);
