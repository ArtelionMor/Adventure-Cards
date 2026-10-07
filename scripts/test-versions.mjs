// Banc des VERSIONS DU JEU : node scripts/test-versions.mjs
//   - la comparaison (diff-donnees.mjs) : ce qui change se voit, ce qui ne change pas ne se voit pas ;
//   - le retour en arriere par entite : rejouer la restauration de TOUT ce qui differe redonne
//     l'original, octet pour octet (c'est la promesse qui rend le bouton « Rétablir cette carte » sûr) ;
//   - la lecture des chiffres des calculs (kpi.mjs) sur des sorties types ;
//   - le stockage (versions.mjs), dans un dossier temporaire — jamais ~/.adventure-card ;
//   - le serveur : les routes /api/versions, sur un port libre, avec le meme dossier temporaire.
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = mkdtempSync(join(tmpdir(), 'ac-versions-'));
process.env.ADVENTURE_VERSIONS = join(TMP, 'versions');   // AVANT d'importer le module

const { diff, restaureEntite, entites, aplati } = await import('./lib/diff-donnees.mjs');
const V = await import('./lib/versions.mjs');
const K = await import('./lib/kpi.mjs');

let ok = 0, ko = 0;
const test = async (nom, f) => {
  try { await f(); ok++; }
  catch (e) { ko++; console.log('ÉCHEC  ' + nom + '\n       ' + (e && e.message || e)); }
};
const egal = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'différent') + '\n  attendu : ' + JSON.stringify(b).slice(0, 300) + '\n  obtenu  : ' + JSON.stringify(a).slice(0, 300)); };
const vrai = (c, msg) => { if (!c) throw new Error(msg || 'faux'); };

const TEXTE = readFileSync(join(RACINE, 'game/data/characters.data.js'), 'utf8');
const D0 = V.lisFichier(TEXTE);
const copie = x => structuredClone(x);

// ---------------------------------------------------------------- le fichier
await test('le fichier de données fait l\'aller-retour sans perdre un octet', () => {
  egal(V.ecrisFichier(D0, TEXTE).replace(/\r\n/g, '\n'), TEXTE.replace(/\r\n/g, '\n'), 'ecrisFichier(lisFichier(x)) != x');
});
await test('les fins de ligne du modèle sont respectées', () => {
  const crlf = TEXTE.replace(/\r?\n/g, '\r\n');
  vrai(V.ecrisFichier(D0, crlf).includes('\r\n'), 'CRLF perdu');
  vrai(!V.ecrisFichier(D0, TEXTE.replace(/\r\n/g, '\n')).includes('\r'), 'CR ajouté');
});
await test('l\'empreinte ignore les fins de ligne', () => {
  egal(V.empreinte(TEXTE.replace(/\r?\n/g, '\r\n')), V.empreinte(TEXTE.replace(/\r\n/g, '\n')));
});
await test('un fichier qui n\'est pas des données est refusé', () => {
  let leve = false; try { V.lisFichier('const x = 1;'); } catch { leve = true; }
  vrai(leve, 'aurait dû refuser');
});

// ---------------------------------------------------------------- le diff
const premierHeros = D0.characters[0], premiereCarte = premierHeros.cards[0];
await test('deux états identiques ne diffèrent pas', () => egal(diff(D0, copie(D0)).total, 0));
await test('un coût modifié se lit « coût : 2 → 3 »', () => {
  const D = copie(D0); D.characters[0].cards[0].cost = (premiereCarte.cost ?? 0) + 1;
  const d = diff(D0, D);
  egal(d.total, 1, 'une seule entité');
  egal(d.entites[0].cle, 'carte:' + premiereCarte.id);
  vrai(/coût : \d+ → \d+/.test(d.entites[0].resume), 'résumé : ' + d.entites[0].resume);
});
await test('un palier ajouté se lit par son niveau', () => {
  const D = copie(D0); const c = D.characters[0].cards[0];
  c.tiers = [...(c.tiers || []), { lvl: 19, stats: { atk: 1, hp: 1 }, text: 'Sommet de test' }];
  const e = diff(D0, D).entites[0];
  vrai(/palier niv\. 19 ajouté — « Sommet de test »/.test(e.resume), e.resume);
});
await test('un palier retouché ne bouge pas les autres (clé = niveau, pas rang)', () => {
  const D = copie(D0); const c = D.characters.find(h => h.cards.some(x => (x.tiers || []).length >= 2)).cards.find(x => (x.tiers || []).length >= 2);
  const A = copie(D0); const base = A.characters.flatMap(h => h.cards).find(x => x.id === c.id);
  const retire = base.tiers.shift();   // on retire le 1er palier de l'ancien : les rangs glissent, les niveaux non
  const e = diff(A, D).entites.find(x => x.id === c.id);
  vrai(e && /palier niv\. \d+ ajouté/.test(e.resume) && !/modifié/.test(e.resume), 'devait être UN ajout : ' + (e && e.resume));
  vrai(retire.lvl !== undefined);
});
await test('une carte ajoutée / retirée / un héros ajouté sont vus', () => {
  const D = copie(D0); const retiree = D.characters[0].cards.pop();
  egal(diff(D0, D).entites.map(e => [e.cle, e.statut]), [['carte:' + retiree.id, 'retiree']]);
  const E = copie(D0); E.characters.push({ id: 'zz', name: 'Zed', cards: [], switches: [] });
  egal(diff(D0, E).entites.map(e => [e.cle, e.statut]), [['hero:zz', 'ajoutee']]);
});
await test('une carte déplacée de slot est dite déplacée, pas supprimée + ajoutée', () => {
  const D = copie(D0); const h = D.characters[0];
  [h.cards[0], h.cards[1]] = [h.cards[1], h.cards[0]];
  const d = diff(D0, D);
  vrai(d.entites.every(e => e.statut === 'deplacee'), JSON.stringify(d.entites.map(e => e.statut)));
});
await test('un réglage inconnu apparaît tout seul, sous son nom', () => {
  const D = copie(D0); D.nouveauReglage = { a: 1 };
  egal(diff(D0, D).entites[0].cle, 'reglage:nouveauReglage');
});

// ---------------------------------------------------------------- restaurer
// LA PROMESSE : restaurer, une à une, toutes les entités qui diffèrent redonne l'original.
function melange(D, graine) {
  let s = graine; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const E = copie(D);
  for (let n = 0; n < 12; n++) {
    const h = E.characters[Math.floor(r() * E.characters.length)];
    const liste = r() < .5 ? h.cards : h.switches;
    const c = liste[Math.floor(r() * liste.length)];
    const quoi = Math.floor(r() * 5);
    if (quoi === 0) c.cost = (c.cost || 0) + 1;
    else if (quoi === 1) c.tiers = [...(c.tiers || []), { lvl: 20, stats: { atk: 1, hp: 1 }, text: 't' + n }];
    else if (quoi === 2) c.name = c.name + '*';
    else if (quoi === 3) { const k = Math.floor(r() * liste.length); [liste[0], liste[k]] = [liste[k], liste[0]]; }
    else if (quoi === 4 && E.characters.length > 6) E.characters.splice(Math.floor(r() * E.characters.length), 1);
  }
  if (E.npcs && E.npcs.length) E.npcs.splice(0, 1);
  return E;
}
for (const graine of [1, 2, 3, 4, 5, 6, 7, 8]) {
  await test('restaurer toutes les entités qui diffèrent redonne l\'original (graine ' + graine + ')', () => {
    const M = melange(D0, graine);
    let courant = M;
    const aRestaurer = diff(D0, M).entites.sort((a, b) => (a.type === 'heros' ? 0 : 1) - (b.type === 'heros' ? 0 : 1) || (entites(D0)[a.cle]?.rang ?? 0) - (entites(D0)[b.cle]?.rang ?? 0));
    for (const e of aRestaurer) courant = restaureEntite(courant, D0, e.cle).donnees;
    const reste = diff(D0, courant);
    egal(reste.total, 0, 'il reste des différences : ' + reste.entites.map(e => e.cle + ' ' + e.resume).join(' | '));
    // ... et dans le même ordre (le diff, lui, ne voit pas l'ordre des héros) :
    egal(courant.characters.map(h => h.id), D0.characters.map(h => h.id), 'ordre des héros');
    egal((courant.npcs || []).map(n => n.id), (D0.npcs || []).map(n => n.id), 'ordre des adversaires');
  });
}
await test('rétablir UNE carte ne touche à rien d\'autre', () => {
  const M = copie(D0); M.characters[0].cards[0].cost += 1; M.characters[1].cards[0].name += '!';
  const r = restaureEntite(M, D0, 'carte:' + M.characters[0].cards[0].id).donnees;
  egal(diff(D0, r).entites.map(e => e.cle), ['carte:' + M.characters[1].cards[0].id]);
});
await test('rétablir un héros rend ses stats mais garde ses cartes actuelles', () => {
  const M = copie(D0); M.characters[0].name = 'Autre'; M.characters[0].cards[0].cost += 1;
  const r = restaureEntite(M, D0, 'hero:' + M.characters[0].id).donnees;
  egal(r.characters[0].name, D0.characters[0].name);
  egal(r.characters[0].cards[0].cost, M.characters[0].cards[0].cost, 'la carte ne devait pas bouger');
});
await test('annuler l\'ajout d\'une carte la retire', () => {
  const M = copie(D0); M.library = [...(M.library || []), { id: 'neuve', name: 'Neuve', cost: 1, type: 'ally', atk: 1, hp: 1 }];
  const r = restaureEntite(M, D0, 'carte:neuve').donnees;
  egal(diff(D0, r).total, 0);
});
await test('restaurer une entité inconnue des deux côtés est une erreur', () => {
  let leve = false; try { restaureEntite(D0, D0, 'carte:nexistepas'); } catch { leve = true; }
  vrai(leve);
});
await test('restaurer ne modifie pas ses arguments', () => {
  const M = melange(D0, 9); const avant = JSON.stringify(M), srcAvant = JSON.stringify(D0);
  let c = M; for (const e of diff(D0, M).entites) c = restaureEntite(c, D0, e.cle).donnees;
  egal(JSON.stringify(M) === avant && JSON.stringify(D0) === srcAvant, true, 'un argument a été modifié');
});

// ---------------------------------------------------------------- les chiffres d'un calcul
const SORTIE_MATCHUPS = `Matchups — 60 parties par paire, niveau 4, decks melanges base/switch, equipes de 3, bot « normal », 2 en parallele.
Chaque partie retire un slot sur deux.

                     | Médor+ Médor+ Felix+
-------------------------------------------
Médor+Felix+Corax    |  50%    60%    30%
Médor+Felix+Bulle    |  40%    50%    —
Felix+Corax+Bulle    |  70%    —      50%

  9 cases en 3 s.

  Precision : ±12% par case (Wilson 95 %). Un ecart plus petit que ca ne veut rien dire.
  Avantage de celui qui commence : 57% (50 % = aucun avantage).

  Lecture des matchups (hors miroirs) :

    sur une cible (33 / 50 / 66 ± 6%) : 2 / 3
      1 défavorable, 1 équilibré, 1 favorable

    2 matchup(s) ecrasant(s) — c'est la que l'equilibrage se joue :
      Médor+Felix+Corax bat Felix+Corax+Bulle 80% ± 10%
      Médor+Felix+Corax bat Médor+Felix+Bulle 77% ± 10%

  Force globale de chaque deck (moyenne de ses matchups) :

    Médor+Felix+Corax     67% ████████████████████
    Felix+Corax+Bulle     50% ███████████████
    Médor+Felix+Bulle     40% ████████████

    Une cible saine : tout le monde entre 45 % et 55 %.`;
await test('lisMatchups : en-tête, matrice, cases non jouées, lecture, écrasants, force, héros', () => {
  const m = K.lisMatchups(SORTIE_MATCHUPS);
  egal([m.parties, m.niveau, m.taille], [60, 4, 3]);
  egal(m.equipes, ['Médor+Felix+Corax', 'Médor+Felix+Bulle', 'Felix+Corax+Bulle']);
  egal(m.matrice, [[.5, .6, .3], [.4, .5, null], [.7, null, .5]]);
  egal([m.precision, m.avantage, m.sur_cible, m.repartition], [.12, .57, { n: 2, sur: 3 }, { defavorable: 1, equilibre: 1, favorable: 1 }]);
  egal(m.ecrasants.length, 2); egal(m.ecrasants[0], { gagnant: 'Médor+Felix+Corax', perdant: 'Felix+Corax+Bulle', taux: .8, marge: .1 });
  egal(m.force.map(f => f.taux), [.67, .5, .4]);
  egal(m.heros[0].nom, 'Corax', 'Corax = (67+50)/2 = 58,5 % devant Médor (53,5)');
});
await test('lisMatchups rend null quand il n\'y a pas de matrice', () => egal(K.lisMatchups('Courbe de difficulté\nrien'), null));
await test('lisMatchups survit aux séquences de terminal et aux lignes réécrites', () => {
  const m = K.lisMatchups('\x1b[2K12/351\r' + SORTIE_MATCHUPS.replace(/\n/g, '\r\n'));
  vrai(m && m.equipes.length === 3, 'matrice perdue');
});
const SORTIE_CARTES = `Analyse : 20 partie(s), bot « normal », 2 en parallèle.
  Médor&Felix&Corax (niveau 5, base) contre Lapin Chapardeur.

carte                      proposée   jouée  préférée    écart   valeur
-----------------------------------------------------------------------
Cri du Faucon                     2       2      100%        —     16.3
Foudre                          154      64       42%      3.5      3.0
Hiboux - Colère de Kamaji         6       1       17%     -1.2     -2.3

cartes boudées :`;
await test('lisAnalyseCartes : lignes, écart absent ou chiffré, valeurs négatives', () => {
  const a = K.lisAnalyseCartes(SORTIE_CARTES);
  egal(a.parties, 20); egal(a.cartes.length, 3);
  egal(a.cartes[0], { nom: 'Cri du Faucon', proposee: 2, jouee: 2, preferee: 1, ecart: null, valeur: 16.3 });
  egal([a.cartes[1].ecart, a.cartes[2].ecart, a.cartes[2].valeur], [3.5, -1.2, -2.3]);
  vrai(/Lapin Chapardeur/.test(a.contexte));
});
await test('kpiDuCalcul range chaque ligne selon son outil', () => {
  const k = K.kpiDuCalcul([{ outil: 'matchups', libelle: 'M', sortie: SORTIE_MATCHUPS, resume: 'r' }, { outil: 'analyse-cartes', libelle: 'A', sortie: SORTIE_CARTES }, { outil: 'simulate', libelle: 'S', resume: '0 mur' }]);
  vrai(k[0].matchups && k[1].cartes && !k[2].matchups && k[2].resume === '0 mur');
});

// ---------------------------------------------------------------- le stockage
let v1, v2;
await test('capture : une version nommée, avec stats et sans résumé de diff pour la première', async () => {
  const r = await V.capture({ texte: TEXTE, titre: 'V0.1 : base', description: 'point de départ' });
  vrai(r.nouvelle && r.version.type === 'nommee' && r.version.resume === null);
  vrai(r.version.stats.heros === D0.characters.length, 'stats.heros');
  v1 = r.version;
});
await test('capturer deux fois le même état ne duplique pas', async () => {
  const r = await V.capture({ texte: TEXTE.replace(/\n/g, '\r\n'), type: 'auto' });
  vrai(!r.nouvelle && r.version.id === v1.id, 'dupliqué');
});
await test('capture : une 2ᵉ version garde le nombre de changements depuis la précédente', async () => {
  const D = copie(D0); D.characters[0].cards[0].cost += 1; D.characters[1].cards[1].name += '!';
  const r = await V.capture({ texte: V.ecrisFichier(D, TEXTE), titre: 'V0.2 : deux cartes' });
  egal(r.version.resume.total, 2); egal(r.version.parent, v1.id);
  v2 = r.version;
});
await test('une photo auto est promue en version nommée quand on la nomme', async () => {
  const D = copie(D0); D.characters[2].cards[0].cost += 2;
  const a = await V.capture({ texte: V.ecrisFichier(D, TEXTE), type: 'auto', titre: 'photo' });
  vrai(a.version.type === 'auto');
  const p = await V.capture({ texte: V.ecrisFichier(D, TEXTE), titre: 'V0.3 : promue' });
  vrai(p.promue && p.version.type === 'nommee' && p.version.id === a.version.id);
});
await test('difference : par défaut contre la version NOMMÉE précédente', async () => {
  const d = await V.difference(v2.id);
  egal(d.de, v1.id); egal(d.total, 2);
});
await test('difference : contre l\'état courant, du passé vers le présent', async () => {
  const d = await V.difference(v2.id, 'courant', TEXTE);
  egal(d.total, 2, 'v2 -> fichier actuel : les deux cartes reviennent');
});
await test('difference de la toute première version : « première », pas une erreur', async () => {
  const d = await V.difference(v1.id); vrai(d.premiere === true);
});
await test('etatCourant : égal à une version, ou éloigné de la dernière nommée', async () => {
  const e = await V.etatCourant(TEXTE); egal(e.egale.id, v1.id);
  const D = copie(D0); D.characters[0].name += '?';
  const f = await V.etatCourant(V.ecrisFichier(D, TEXTE));
  vrai(f.egale === null && f.depuis && f.depuis.total >= 1, 'depuis');
});
await test('commentaires : ajouter, modifier, retirer ; vide refusé', async () => {
  const c = await V.commente(v2.id, 'carte:' + D0.characters[0].cards[0].id, 'trop cher ?');
  vrai((await V.lis(v2.id)).commentaires.length === 1);
  await V.modifieCommentaire(v2.id, c.id, 'trop cher ! (modifié)');
  egal((await V.lis(v2.id)).commentaires[0].texte, 'trop cher ! (modifié)');
  await V.retireCommentaire(v2.id, c.id);
  egal((await V.lis(v2.id)).commentaires.length, 0);
  let leve = false; try { await V.commente(v2.id, 'version', '   '); } catch { leve = true; } vrai(leve);
});
await test('renommer une photo auto la garde (elle devient nommée)', async () => {
  const D = copie(D0); D.characters[3].cards[0].cost += 3;
  const a = await V.capture({ texte: V.ecrisFichier(D, TEXTE), type: 'auto' });
  const r = await V.renomme(a.version.id, { titre: 'À garder' });
  egal(r.type, 'nommee');
});
await test('une version inconnue ou un id piégé est refusé', async () => {
  for (const id of ['v9999', '../x', '', 'V0001']) { let leve = false; try { await V.lis(id); } catch { leve = true; } vrai(leve, 'accepté : ' + id); }
});
await test('pourRestaurer : tout, ou une seule carte', async () => {
  const D = copie(D0); D.characters[0].cards[0].cost += 5; D.characters[1].cards[1].name = 'Zzz';
  const courant = V.ecrisFichier(D, TEXTE);
  const tout = await V.pourRestaurer(v1.id, null, courant);
  egal(V.empreinte(tout.texte), v1.empreinte);
  const une = await V.pourRestaurer(v1.id, 'carte:' + D0.characters[0].cards[0].id, courant);
  egal(diff(V.lisFichier(courant), V.lisFichier(une.texte)).total, 1);
  egal(diff(D0, V.lisFichier(une.texte)).entites.map(e => e.id), [D0.characters[1].cards[1].id]);
});
await test('supprimer refuse la version qui est l\'état actuel du jeu', async () => {
  let leve = false; try { await V.supprime(v1.id, TEXTE); } catch { leve = true; } vrai(leve);
  await V.supprime(v2.id, TEXTE);
  vrai(!(await V.liste()).some(x => x.id === v2.id), 'toujours là');
});
await test('la purge garde les nommées et les photos commentées', async () => {
  const avant = (await V.liste()).filter(x => x.type === 'nommee').length;
  for (let i = 0; i < V.AUTO_MAX + 5; i++) {
    const D = copie(D0); D.characters[0].cards[0].cost = 100 + i;
    await V.capture({ texte: V.ecrisFichier(D, TEXTE), type: 'auto' });
  }
  const l = await V.liste();
  egal(l.filter(x => x.type === 'nommee').length, avant, 'une nommée a été purgée');
  vrai(l.filter(x => x.type === 'auto').length <= V.AUTO_MAX, 'trop d\'autos : ' + l.filter(x => x.type === 'auto').length);
});

// ---------------------------------------------------------------- le serveur
await test('serveur : liste, création, commentaire, diff, retour (état identique) — sans toucher au fichier du jeu', async () => {
  const port = 7400 + Math.floor(Math.random() * 400);
  const srv = spawn(process.execPath, [join(RACINE, 'scripts/devserver.js')], { env: { ...process.env, PORT: String(port), ADVENTURE_HOST: '127.0.0.1', ADVENTURE_DISCRET: '1', ADVENTURE_VERSIONS: process.env.ADVENTURE_VERSIONS }, stdio: 'ignore' });
  const url = p => `http://127.0.0.1:${port}${p}`;
  const appelle = async (p, corps) => { const r = await fetch(url(p), corps ? { method: 'POST', body: JSON.stringify(corps) } : {}); return { code: r.status, d: await r.json() }; };
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(url('/api/versions')); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const avant = readFileSync(join(RACINE, 'game/data/characters.data.js'), 'utf8');
    const l = await appelle('/api/versions'); egal(l.code, 200); vrai(l.d.disponible && Array.isArray(l.d.versions));
    const c = await appelle('/api/versions/creer', { titre: 'V0.9 : test serveur' }); egal(c.code, 200);
    const id = c.d.version.id;
    egal((await appelle('/api/versions/commenter', { id, cible: 'version', texte: 'ok' })).code, 200);
    const df = await appelle(`/api/versions/diff?id=${id}&contre=courant`); egal(df.code, 200); egal(df.d.total, 0, 'créée à l\'instant : rien n\'a bougé');
    const rs = await appelle('/api/versions/restaurer', { id }); egal(rs.code, 200); vrai(rs.d.ok);
    egal(readFileSync(join(RACINE, 'game/data/characters.data.js'), 'utf8'), avant, 'le fichier du jeu a changé');
    egal((await appelle('/api/versions/restaurer', { id: 'v9999' })).code, 400);
    egal((await appelle('/api/versions/inconnu', {})).code, 400);
    const mjs = await fetch(url('/scripts/lib/diff-donnees.mjs')); vrai(/javascript/.test(mjs.headers.get('content-type')), 'type MIME des .mjs : ' + mjs.headers.get('content-type'));
  } finally { srv.kill(); }
});

rmSync(TMP, { recursive: true, force: true });
console.log(`\n${ok} test(s) passé(s), ${ko} échec(s).`);
process.exit(ko ? 1 : 0);
