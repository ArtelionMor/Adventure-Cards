// Serveur de dev : sert la racine du projet sur http://localhost:7330
// (meme arborescence que le launcher .exe, pour que les chemins d'assets soient identiques).
//
// Expose aussi POST /api/write?path=<chemin relatif>, utilise par le Card Builder pour
// ecrire ses fichiers, POST /api/sprites, qui rebalaye les dossiers d'images et
// reecrit game/data/sprites.js (le bouton « Actualiser les images » du builder), et
// /api/run, qui lance un outil de mesure (page builder/lancer.html). Seuls les chemins
// et les scripts des listes blanches sont acceptes.
//
// ⚠ Le serveur ecoute sur TOUTES les interfaces : c'est ce qui permet au Pi de servir
// le telephone (Wi-Fi ou Tailscale). Ne jamais l'exposer a internet : /api/write ecrit
// et /api/run lance des scripts, sans aucun mot de passe. ADVENTURE_HOST restreint
// l'ecoute a une adresse — c'est ce que passe AdventureCard.exe (127.0.0.1), qui n'a
// que sa propre machine a servir et evite ainsi la demande de pare-feu de Windows.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 7330;
// ⚠ SANS VARIABLE, ON NE PASSE PAS D'ADRESSE DU TOUT (undefined) : Node ecoute alors en
// double pile (« :: », IPv4 comprise), exactement comme avant. Un « 0.0.0.0 » ecrit ici
// serait une regression silencieuse : il ne prend pas IPv6, et sur le Pi « localhost »
// resout d'abord ::1 — tailscale serve n'aurait plus rien a proxyfier.
const HOTE = process.env.ADVENTURE_HOST || undefined;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  // Sans ce type, Android garde l'app du widget comme un fichier quelconque au lieu de
  // proposer de l'installer.
  '.apk': 'application/vnd.android.package-archive'
};

// Le builder n'a le droit d'ecrire que la, et rien d'autre.
const WRITABLE = [/^game\/data\/[\w.-]+\.(js|json)$/, /^docs\/[\w.-]+\.md$/];
const canWrite = rel => WRITABLE.some(re => re.test(rel));

// Le balayage des dossiers d'images vit dans scripts/gen-sprites.mjs — une seule
// implementation, la meme liste en ligne de commande et depuis le builder. C'est un
// module ES, d'ou l'import dynamique (ce fichier-ci est en CommonJS).
const genereSprites = () => import('./gen-sprites.mjs').then(m => m.genereSprites());

// ------------------------------------------------------------------ /api/run
// Lancer des outils de mesure SUR LA MACHINE QUI SERT LA PAGE (le Pi) et lire leur
// sortie depuis un telephone. Chaque calcul tourne dans un processus a part et la page
// ne fait que demander ou il en est (GET) : un ecran qui se met en veille ne tue donc
// rien, on rouvre la page et on retrouve la sortie la ou elle en etait.
//
// UNE FILE, PAS UN CALCUL : la page envoie une liste de calculs (des « lignes » — le
// meme matchup du niveau 1 au niveau 20, ou des outils differents) et ils passent l'un
// apres l'autre. Un seul a la fois : deux mesures se voleraient les coeurs. Envoyer
// pendant que la file tourne met les nouveaux calculs a la suite.
//
// La liste blanche : on ne lance QUE ces scripts. `brouillon` dit si l'outil peut
// mesurer le brouillon du builder — pas les bancs de test, qui s'appuient sur des
// cartes precises du fichier du jeu.
// `journaux` : l'outil sait ecrire le detail de ce qu'il a joue (`--logs`). C'est LE
// SERVEUR qui choisit le fichier, jamais la page — c'est ce qui leve l'interdit sur
// `--logs` (cf. ARG_INTERDITS) sans rien relacher : la page ne nomme aucun chemin.
// Un taux ne dit jamais POURQUOI ; le journal, si. On les produit donc toujours, et ils
// sont ranges avec le calcul, a relire ou a exporter des mois plus tard.
const OUTILS = {
  simulate: { fichier: 'scripts/simulate.mjs', brouillon: true, nom: 'Courbe de difficulté' },
  matchups: { fichier: 'scripts/matchups.mjs', brouillon: true, journaux: true, nom: 'Matrice des matchups' },
  'check-decks': { fichier: 'scripts/check-decks.mjs', brouillon: true, nom: 'Contrôle des decks' },
  'analyse-cartes': { fichier: 'scripts/analyse-cartes.mjs', brouillon: true, journaux: true, nom: 'Analyse des cartes' },
  'test-triggers': { fichier: 'scripts/test-triggers.mjs', brouillon: false, nom: 'Banc du moteur' },
  'test-ai': { fichier: 'scripts/test-ai.mjs', brouillon: false, nom: 'Banc du bot' },
  'test-partage': { fichier: 'scripts/test-partage.mjs', brouillon: false, nom: 'Banc du partage' },
  'test-journal': { fichier: 'scripts/test-journal.mjs', brouillon: false, nom: 'Banc du journal' },
  'test-situations': { fichier: 'scripts/test-situations.mjs', brouillon: false, nom: 'Banc des situations' }
};

// Les notifications (scripts/lib/push.mjs) : un module ES, d'ou l'import dynamique. Une
// notification qui echoue ne doit jamais gener un calcul : on le journalise, c'est tout.
const push = () => import('./lib/push.mjs');
const notifie = (donnees, opts) => push().then(p => p.notifie(donnees, opts))
  .then(b => { if (b.erreurs.length) console.log('notification refusee : ' + b.erreurs.join(' | ')); return b; })
  .catch(e => console.log('notification impossible : ' + e.message));

// CE QU'ON MET DANS LA NOTIFICATION DE FIN : deux ou trois chiffres lus dans la sortie,
// pas un rapport — le rapport est dans la page. Chaque outil a sa phrase ; a defaut, la
// derniere ligne (celle des bancs dit deja « 31 test(s) passe(s), 0 echec(s) »).
function resumeCalcul(c) {
  const lignes = c.sortie.replace(/\x1b\[[\d;?]*[A-Za-z]/g, '').split('\n')
    .map(l => l.slice(l.lastIndexOf('\r') + 1).trim()).filter(Boolean);
  const derniere = (lignes[lignes.length - 1] || '').slice(0, 140);
  // Les lignes « - ... » qui suivent un titre de section (« Murs — ... »).
  const sousLignes = titre => {
    const i = lignes.findIndex(l => l.startsWith(titre));
    let n = 0;
    if (i >= 0) for (let k = i + 1; k < lignes.length && lignes[k].startsWith('- '); k++) n++;
    return n;
  };
  if (c.outil === 'matchups') {
    // Equipes contre adversaires : la moyenne, la pire et la meilleure equipe.
    const contre = lignes.map(l => /^Contre les adversaires : (.*)$/.exec(l)).find(Boolean);
    if (contre) return contre[1];
    const cible = lignes.map(l => /^sur une cible.*:\s*(\d+)\s*\/\s*(\d+)/.exec(l)).find(Boolean);
    const ecrases = lignes.map(l => /^(\d+) matchup\(s\) ecrasant/.exec(l)).find(Boolean);
    if (cible) return `${cible[1]}/${cible[2]} matchups sur une cible · ${ecrases ? ecrases[1] : 0} écrasant(s)`;
  }
  if (c.outil === 'simulate') {
    const murs = sousLignes('Murs'), offerts = sousLignes('Combats offerts');
    const bloquees = lignes.map(l => /^(\d+) case\(s\) bloquee/.exec(l)).find(Boolean);
    return (murs || offerts ? `${murs} mur(s), ${offerts} combat(s) offert(s)` : 'Aucun mur, aucun combat offert')
      + (bloquees ? ` · ${bloquees[1]} case(s) bloquée(s)` : '');
  }
  return derniere;
}

// L'ANALYSE DES RESULTATS (scripts/lib/ia.mjs) : un modele de langage local lit le
// recapitulatif de la derniere file. Elle tourne a cote, sans bloquer la file ; son etat
// vit dans `lot.analyse`, que la page et l'accueil lisent avec le reste. Quand elle est
// prete, une notification le dit (c'est souvent plusieurs minutes sur le Pi seul).
const ia = () => import('./lib/ia.mjs');

async function lanceAnalyse({ nouvelle = false } = {}) {
  if (!lot) throw new Error('Aucune file à analyser.');
  if (lot.analyse && lot.analyse.etat === 'encours') return;   // deja en route
  // Une analyse finie ne se remplace que sur demande EXPLICITE (« Analyser a nouveau »,
  // qui envoie { nouvelle: true }) : un appui de trop ou une page rouverte l'effacaient,
  // et le dialogue avec elle — une question en attente de reponse s'est perdue ainsi.
  if (lot.analyse && lot.analyse.etat === 'fini' && !nouvelle) return;
  if (!lot.lignes.some(l => l.resume)) throw new Error('Rien de terminé à analyser pour l\'instant.');
  const cible = lot;
  const m = await ia();
  // Un calcul tourne : la machine du serveur garde ses coeurs pour lui.
  const { machine, essais } = await m.premiereDisponible({ sansLocale: lotActif() });
  if (!machine) throw new Error('Aucune machine d\'analyse disponible — ' + essais.join(' · '));
  cible.analyse = { etat: 'encours', machine: machine.nom, modele: machine.modele, debut: Date.now(), essais };
  cible.conversation = null;
  console.log(`analyse lancee sur ${machine.nom} (${machine.modele})`);
  m.analyse(machine, cible).then(r => {
    cible.analyse = { ...cible.analyse, etat: 'fini', texte: r.texte, duree: r.duree, vitesse: r.vitesse, avecExtraits: r.avecExtraits, echanges: [] };
    // La conversation (les donnees comprises, ~20 Ko) reste ici : elle repart avec chaque
    // question du dialogue, mais pas dans chaque /api/run que la page interroge.
    cible.conversation = { machine, messages: r.messages };
    range(cible);   // l'analyse fait partie du calcul range : on le reecrit
    console.log(`analyse terminee en ${Math.round(r.duree / 1000)} s`);
    // La premiere vraie phrase, sans les titres ni la mise en forme, pour la notification.
    const phrase = r.texte.replace(/[*#_`]/g, '').split('\n').map(s => s.trim())
      .filter(s => s && !/^(ce qui ressort|ce qui cloche|à regarder ensuite)\s*:?$/i.test(s))[0] || '';
    notifie({ titre: 'Analyse prête', corps: phrase.slice(0, 140), tag: 'calcul', bruyante: true, url: 'lancer.html#resultats' },
      { urgence: 'high', sujet: 'calcul' });
  }).catch(e => {
    cible.analyse = { ...cible.analyse, etat: 'echec', erreur: e.message };
    console.log('analyse impossible : ' + e.message);
  });
}

// LE DIALOGUE avec l'analyse : le designer conteste un chiffre ou demande pourquoi, l'IA
// relit les donnees et repond. Une question a la fois, dix au plus — chacune renvoie la
// conversation entiere, qui finirait par deborder du contexte du modele.
const ECHANGES_MAX = 10;
async function poseQuestion(texte) {
  const cible = lot, a = lot && lot.analyse;
  texte = String(texte || '').trim();
  if (!a || a.etat !== 'fini' || !cible.conversation) throw new Error('Pas d\'analyse terminée à laquelle répondre.');
  if (!texte) throw new Error('La question est vide.');
  if (texte.length > 2000) throw new Error('2 000 caractères au plus.');
  if (a.echanges.some(x => x.etat === 'encours')) throw new Error('L\'IA n\'a pas encore répondu à la question précédente.');
  if (a.echanges.length >= ECHANGES_MAX) throw new Error(`${ECHANGES_MAX} échanges au plus : relance une analyse pour repartir à neuf.`);
  const m = await ia();
  // La machine de l'analyse d'abord : elle a le modele en memoire. Si elle s'est endormie
  // entre-temps, la premiere prete de la liste reprend la conversation.
  let machine = cible.conversation.machine;
  if (!(await m.sonde(machine)).ok) {
    const p = await m.premiereDisponible({ sansLocale: lotActif() });
    if (!p.machine) throw new Error('Aucune machine d\'analyse disponible — ' + p.essais.join(' · '));
    machine = p.machine;
  }
  const echange = { question: texte, etat: 'encours', machine: machine.nom, modele: machine.modele, debut: Date.now() };
  a.echanges.push(echange);
  m.repond(machine, cible.conversation.messages, texte).then(r => {
    Object.assign(echange, { etat: 'fini', reponse: r.texte, duree: r.duree });
    // « Analyser a nouveau » a pu repartir de zero entre-temps : ne pas lui greffer
    // la fin de l'ancienne conversation.
    if (cible.analyse === a) cible.conversation = { machine, messages: r.messages };
    range(cible);   // la question et sa reponse partent aussi sur la cle
    // Une reponse longue (un gros modele qui reflechit) : on previent, la page est
    // peut-etre fermee.
    if (r.duree > 60000) notifie({ titre: 'L\'IA t\'a répondu', corps: r.texte.replace(/[*#_`]/g, '').slice(0, 140), tag: 'calcul', bruyante: true, url: 'lancer.html#resultats' },
      { urgence: 'high', sujet: 'calcul' });
  }).catch(e => Object.assign(echange, { etat: 'echec', erreur: e.message }));
}

// LES CALCULS RANGES (scripts/lib/archives.mjs) : une file finie part sur la cle USB du
// serveur — sorties completes, resumes, analyse de l'IA et dialogue. On la ROUVRE
// ensuite ici comme si elle venait de finir, au lieu de rejouer des heures de parties
// pour relire un chiffre. Ranger ne doit JAMAIS gener un calcul : une cle debranchee ou
// pleine se journalise et rien de plus, comme une notification refusee.
const archives = () => import('./lib/archives.mjs');

// LES VERSIONS DU JEU (scripts/lib/versions.mjs) : des photos nommees de characters.data.js,
// leurs differences, les commentaires, les chiffres de la mesure associee, et le retour en
// arriere. Rangees HORS du repo (~/.adventure-card/versions). Comme /api/run : Node seulement,
// pas double en C# — l'exe sans Node n'a pas ces routes et la page le dit.
const versions = () => import('./lib/versions.mjs');
const FICHIER_DONNEES = 'game/data/characters.data.js';
const lisDonnees = () => { try { return fs.readFileSync(path.join(ROOT, FICHIER_DONNEES), 'utf8'); } catch { return ''; } };

function range(cible) {
  if (!cible || !cible.lignes.length) return;
  archives().then(a => a.range(cible))
    .then(d => console.log('calcul range : ' + d))
    .catch(e => console.log('archivage impossible : ' + e.message));
}

/** Rouvrir un calcul range : il redevient `lot`, fini, avec son analyse et son dialogue. */
async function chargeArchive(id) {
  if (lotActif()) throw new Error('Un calcul tourne : arrête ou attends la fin de la file avant de rouvrir un calcul rangé.');
  const c = await (await archives()).relit(id);
  const lignes = (c.lignes || []).map((l, i) => ({
    outil: l.outil, args: l.args || [], libelle: l.libelle, brouillon: null,
    etat: l.etat, debut: l.debut, fin: l.fin, code: l.code, proc: null, sortie: l.sortie || '', oublie: 0,
    progression: null, resume: l.resume, pauseTotale: l.pauseTotale || 0, pauseDepuis: null, i, id: c.id + '-' + i,
    // Le journal range redevient telechargeable tel quel : `relit` en a donne le chemin
    // complet. `journalTemp: false` — il n'est pas a nous, on ne l'effacera pas.
    journal: l.journal || null, journalTemp: false
  }));
  if (!lignes.length) throw new Error('Ce calcul rangé est vide.');
  // Une analyse « en cours » rangee (le serveur s'est arrete au milieu) ne reprendra
  // jamais : on repart sans elle plutot que d'afficher un sablier eternel.
  const analyse = c.analyse && c.analyse.etat !== 'encours' ? c.analyse : null;
  lot = {
    id: c.id, lignes, debut: c.debut, fin: c.fin || Date.now(), pause: false, arrete: !!c.arrete,
    pauseTotale: c.pauseTotale || 0, pauseDepuis: null, brouillons: new Set(), dixiemes: 10, derniereNotif: Date.now(),
    analyse, conversation: analyse ? c.conversation || null : null, archive: c.archive,
    commentaire: c.commentaire || ''
  };
  if (analyse && !Array.isArray(analyse.echanges)) analyse.echanges = [];
  // Plus rien ne tourne : la page repart de la file (etatCalcul rend « id: null »).
  calcul = null;
  console.log(`calcul rouvert : ${c.archive} (${lignes.length} ligne(s))`);
  return resumeLot();
}

// Des arguments courts, sans espace (on ne passe de toute facon pas par un shell).
// --csv et --logs sont refuses : ils ecriraient sur le serveur un fichier choisi par
// la page.
const ARG_OK = /^[\w.,:=+-]{1,80}$/;
const ARG_INTERDITS = ['--csv', '--logs'];
const SORTIE_MAX = 2000000;   // au-dela, on oublie le debut de la sortie
const CROCHET = pathToFileURL(path.join(__dirname, 'lib', 'brouillon.mjs')).href;
// La PAUSE suspend le processus du calcul (SIGSTOP ; ses workers sont des fils du meme
// processus, ils s'arretent avec lui) — ce que Linux sait faire, pas Windows. Sur
// Windows, la pause laisse finir le calcul en cours et ne lance pas le suivant.
const PAUSE_IMMEDIATE = process.platform !== 'win32';
const LIGNES_MAX = 200;
const duree = ms => { const s = Math.round(ms / 1000); return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s'; };

// LA FILE. `lot` : la file en cours (ou la derniere), une liste de « lignes » ; chaque
// ligne est un calcul, avec sa sortie et son etat (attente, encours, fini, echec,
// arrete, annule). `calcul` : la ligne qui tourne, ou la derniere lancee — c'est elle
// que la page suit en direct.
let lot = null;
let calcul = null;
const lotActif = () => !!(lot && !lot.fin);

// Le temps de calcul, pauses deduites : c'est lui qui donne un « reste ~ » honnete.
const ecoule = x => (x.debut ? (x.fin || Date.now()) - x.debut - x.pauseTotale - (x.pauseDepuis ? Date.now() - x.pauseDepuis : 0) : 0);

function resumeLot() {
  if (!lot) return null;
  const faites = lot.lignes.filter(l => l.fin).length;
  const c = calcul && calcul.proc ? calcul : null;
  const part = c && c.progression && c.progression.total ? c.progression.fait / c.progression.total : 0;
  return {
    id: lot.id, total: lot.lignes.length, faites, actif: lotActif(), pause: lot.pause, arrete: lot.arrete,
    pauseImmediate: PAUSE_IMMEDIATE, debut: lot.debut, fin: lot.fin, ecoule: ecoule(lot),
    progression: lot.lignes.length ? (faites + part) / lot.lignes.length : 0,
    analyse: lot.analyse || null,
    commentaire: lot.commentaire || '',
    lignes: lot.lignes.map(l => ({ i: l.i, outil: l.outil, libelle: l.libelle, etat: l.etat, resume: l.resume,
      duree: l.fin ? ecoule(l) : null, journal: !!(l.journal && fs.existsSync(l.journal)) }))
  };
}

// `depuis` : ce que la page a deja recu (en caracteres depuis le debut de la ligne). On
// ne renvoie que la suite, et `depuis` dans la reponse dit ou elle commence vraiment —
// si le debut a ete oublie entre-temps, la page le voit et repart de la.
function etatCalcul(depuis) {
  if (!calcul) return { id: null, lot: resumeLot() };
  const c = calcul;
  const i = Math.max(0, (Number(depuis) || 0) - c.oublie);
  return {
    id: c.id, outil: c.outil, args: c.args, libelle: c.libelle, brouillon: !!c.brouillon,
    debut: c.debut, fin: c.fin, code: c.code, enCours: !!c.proc, enPause: !!(lot && lot.pause && c.proc),
    ecoule: ecoule(c), progression: c.progression,
    depuis: c.oublie + Math.min(i, c.sortie.length), longueur: c.oublie + c.sortie.length,
    texte: c.sortie.slice(i), lot: resumeLot()
  };
}

// Les boutons des notifications (builder/sw.js les renvoie sur /api/run/<action>).
const ACTIONS_EN_COURS = [{ action: 'pause', title: '⏸ Pause' }, { action: 'stop', title: '■ Arrêter' }];
const ACTIONS_EN_PAUSE = [{ action: 'reprendre', title: '▶ Reprendre' }, { action: 'stop', title: '■ Arrêter' }];

/**
 * La demande de la page, en lignes verifiees. Elle envoie soit `{ lignes: [...], data }`
 * (une file), soit l'ancienne forme `{ outil, args, data }` (une file d'une ligne).
 */
function nouvellesLignes(demande) {
  const brutes = Array.isArray(demande.lignes) ? demande.lignes : [{ outil: demande.outil, args: demande.args, libelle: demande.libelle }];
  if (!brutes.length) throw new Error('File vide');
  if (brutes.length + (lotActif() ? lot.lignes.length : 0) > LIGNES_MAX) throw new Error(`Trop de calculs dans la file (${LIGNES_MAX} au plus)`);
  const lignes = brutes.map(b => {
    const outil = OUTILS[b.outil];
    if (!outil) throw new Error('Outil inconnu : ' + b.outil);
    const args = Array.isArray(b.args) ? b.args.map(String) : [];
    for (const a of args) {
      if (!ARG_OK.test(a)) throw new Error('Argument refuse : ' + a);
      if (ARG_INTERDITS.includes(a.split('=')[0])) throw new Error('Argument refuse sur le serveur : ' + a);
    }
    const libelle = String(b.libelle || (outil.nom + (args.length ? ' ' + args.join(' ') : ''))).slice(0, 120);
    return { outil: b.outil, args, libelle, avecBrouillon: outil.brouillon };
  });
  // Le brouillon voyage avec la demande : c'est lui qu'on mesure, pas le fichier du jeu.
  // Un fichier par envoi, efface a la fin de la file.
  let brouillon = null;
  if (demande.data && lignes.some(l => l.avecBrouillon)) {
    brouillon = path.join(os.tmpdir(), 'adventure-card-brouillon-' + Date.now().toString(36) + '.mjs');
    fs.writeFileSync(brouillon, 'export const CHARACTER_DATA = ' + JSON.stringify(demande.data) + ';\n', 'utf8');
  }
  return lignes.map(l => ({
    outil: l.outil, args: l.args, libelle: l.libelle, brouillon: l.avecBrouillon ? brouillon : null,
    etat: 'attente', debut: null, fin: null, code: null, proc: null, sortie: '', oublie: 0,
    progression: null, resume: null, pauseTotale: 0, pauseDepuis: null, journal: null, journalTemp: false
  }));
}

/** Ajoute des calculs : ils demarrent une nouvelle file, ou se mettent a la suite de celle qui tourne. */
function ajouteALaFile(demande) {
  const lignes = nouvellesLignes(demande);
  const nouvelle = !lotActif();
  if (nouvelle) {
    // Les journaux de la file PRECEDENTE ne servent plus : on les efface ici, et pas a
    // la fin de la file — entre les deux, on les telecharge et on les relit.
    // ⚠ SEULEMENT LES TEMPORAIRES. Le journal d'un calcul ROUVERT vit dans son dossier
    // range : l'effacer detruirait l'archive que l'on vient de relire.
    if (lot) for (const l of lot.lignes) if (l.journal && l.journalTemp) fs.rm(l.journal, { force: true }, () => {});
    lot = { id: Date.now().toString(36), lignes: [], debut: Date.now(), fin: null, pause: false, arrete: false,
      pauseTotale: 0, pauseDepuis: null, brouillons: new Set(), dixiemes: 0, derniereNotif: 0, commentaire: '' };
  }
  for (const l of lignes) {
    l.i = lot.lignes.length;
    l.id = lot.id + '-' + l.i;
    lot.lignes.push(l);
    if (l.brouillon) lot.brouillons.add(l.brouillon);
  }
  console.log(`file ${lot.id} : ${lignes.length} calcul(s) ajoute(s), ${lot.lignes.length} en tout`);
  if (nouvelle) {
    const n = lot.lignes.length;
    notifie({ titre: n > 1 ? `File de ${n} calculs lancée` : `${OUTILS[lignes[0].outil].nom} : lancé`,
      corps: lignes[0].libelle + (lignes[0].brouillon ? ' · brouillon' : ''), tag: 'calcul', actions: ACTIONS_EN_COURS },
      { sujet: 'calcul' });
  }
  if (!(calcul && calcul.proc) && !lot.pause) suivante();
}

function suivante() {
  if (!lot || lot.fin || lot.pause) return;
  const l = lot.lignes.find(x => x.etat === 'attente');
  if (l) lanceLigne(l); else finLot();
}

// LES NOTIFICATIONS DE PROGRESSION (scripts/lib/push.mjs). Toutes portent le meme tag :
// sur le telephone, chacune remplace la precedente au lieu de s'empiler. Elles partent a
// chaque dixieme de la FILE franchi (ou a chaque calcul fini, `force`), jamais plus d'une
// fois toutes les 20 s, sans sonner, avec Pause et Arreter.
function annonceAvancement(force) {
  if (!lot || lot.fin || lot.pause || !calcul || !calcul.proc) return;
  const r = resumeLot();
  const dixiemes = Math.floor(r.progression * 10);
  if (!force && (dixiemes <= lot.dixiemes || dixiemes >= 10)) return;
  if (Date.now() - lot.derniereNotif < 20000) return;
  lot.dixiemes = Math.max(lot.dixiemes, dixiemes);
  lot.derniereNotif = Date.now();
  const pct = Math.floor(r.progression * 100);
  const reste = r.progression > 0.02 ? ` · reste ~${duree(r.ecoule / r.progression - r.ecoule)}` : '';
  notifie(r.total > 1
    ? { titre: calcul.libelle, corps: `${pct} % · calcul ${r.faites + 1}/${r.total}${reste}`, tag: 'calcul', actions: ACTIONS_EN_COURS }
    : { titre: `${OUTILS[calcul.outil].nom} : ${pct} %`, corps: `${calcul.libelle}${reste}`, tag: 'calcul', actions: ACTIONS_EN_COURS },
  { sujet: 'calcul' });
}

// LA FIN DE LA FILE : elle sonne, et propose « Analyser les resultats ». Une file d'un
// seul calcul se dit comme avant (« Banc du bot : termine — 31 test(s) passe(s) »).
function finLot() {
  lot.fin = Date.now();
  if (lot.pauseDepuis) { lot.pauseTotale += lot.fin - lot.pauseDepuis; lot.pauseDepuis = null; }
  for (const f of lot.brouillons) fs.rm(f, { force: true }, () => {});
  const n = lot.lignes.length;
  const finis = lot.lignes.filter(l => l.etat === 'fini').length;
  const echecs = lot.lignes.filter(l => l.etat === 'echec').length;
  let titre, corps;
  if (n === 1) {
    const l = lot.lignes[0], nom = OUTILS[l.outil].nom;
    titre = l.etat === 'fini' ? `${nom} : terminé` : l.etat === 'arrete' ? `${nom} : arrêté` : `${nom} : échec (${l.code})`;
    corps = `${l.resume || l.libelle} · ${duree(ecoule(lot))}`;
  } else {
    titre = lot.arrete ? 'Simulations arrêtées' : `Simulations terminées${echecs ? ` · ${echecs} échec(s)` : ''}`;
    corps = `${finis}/${n} calculs en ${duree(ecoule(lot))}`;
  }
  console.log(`file ${lot.id} terminee : ${finis}/${n}${lot.arrete ? ' (arretee)' : ''}`);
  range(lot);   // sur la cle, pour ne jamais avoir a refaire ces parties
  notifie({ titre, corps, tag: 'calcul', bruyante: true, url: 'lancer.html#resultats',
    actions: finis ? [{ action: 'analyser', title: 'Analyser les résultats' }] : [] }, { urgence: 'high', sujet: 'calcul' });
}

function pauseFile() {
  if (!lotActif() || lot.pause) return;
  lot.pause = true;
  lot.pauseDepuis = Date.now();
  const tourne = calcul && calcul.proc;
  if (PAUSE_IMMEDIATE && tourne) { calcul.proc.kill('SIGSTOP'); calcul.pauseDepuis = Date.now(); }
  const r = resumeLot();
  notifie({ titre: 'En pause', corps: `${tourne ? calcul.libelle : 'avant le calcul suivant'} · ${Math.floor(r.progression * 100)} % · ${r.faites}/${r.total}`
    + (tourne && !PAUSE_IMMEDIATE ? ' (le calcul en cours va jusqu\'au bout)' : ''), tag: 'calcul', actions: ACTIONS_EN_PAUSE }, { sujet: 'calcul' });
}

function reprendFile() {
  if (!lotActif() || !lot.pause) return;
  lot.pause = false;
  lot.pauseTotale += Date.now() - lot.pauseDepuis;
  lot.pauseDepuis = null;
  if (calcul && calcul.proc && calcul.pauseDepuis) {
    calcul.pauseTotale += Date.now() - calcul.pauseDepuis;
    calcul.pauseDepuis = null;
    calcul.proc.kill('SIGCONT');
  }
  if (!(calcul && calcul.proc)) suivante();
  lot.derniereNotif = 0;
  annonceAvancement(true);
}

function arreteFile() {
  if (!lotActif()) return;
  lot.arrete = true;
  if (lot.pause) { lot.pause = false; lot.pauseTotale += Date.now() - lot.pauseDepuis; lot.pauseDepuis = null; }
  for (const l of lot.lignes) if (l.etat === 'attente') l.etat = 'annule';
  if (calcul && calcul.proc) {
    // Un processus suspendu ne recoit pas son arret tant qu'on ne l'a pas relance.
    if (calcul.pauseDepuis) { calcul.pauseTotale += Date.now() - calcul.pauseDepuis; calcul.pauseDepuis = null; calcul.proc.kill('SIGCONT'); }
    calcul.proc.kill();   // termine() -> suivante() -> plus rien en attente -> finLot()
  } else {
    finLot();
  }
}

function lanceLigne(c) {
  const outil = OUTILS[c.outil];
  // LE JOURNAL DE COMBAT. Le chemin est choisi ICI, par le serveur : `c.args` reste ce
  // que la page a demande (c'est lui qu'on archive et qu'on rejoue), et `--logs` n'entre
  // que dans la ligne de commande. Le fichier vit dans le repertoire temporaire jusqu'a
  // ce que `range()` le copie a cote du calcul.
  if (outil.journaux) { c.journal = path.join(os.tmpdir(), `adventure-card-journal-${c.id}.txt`); c.journalTemp = true; }
  const args = c.journal ? [...c.args, '--logs', c.journal] : c.args;
  // ADVENTURE_PROGRESSION : les scripts ecrivent leur avancement en lignes-marqueurs
  // (scripts/lib/progression.mjs) au lieu d'une ligne de terminal reecrite sur place.
  const proc = spawn(process.execPath, ['--import', CROCHET, outil.fichier, ...args], {
    cwd: ROOT, env: { ...process.env, ADVENTURE_BROUILLON: c.brouillon || '', ADVENTURE_PROGRESSION: '1' }, windowsHide: true
  });
  c.proc = proc;
  c.etat = 'encours';
  c.debut = Date.now();
  calcul = c;
  const suitProgression = () => annonceAvancement(false);
  // L'outil annonce ou il a ecrit son journal (« 103 decisions detaillees dans … »). Ce
  // chemin est un temporaire DU SERVEUR : il n'a aucun sens pour qui lit la page depuis un
  // telephone, et il finissait dans le resume et dans la notification de fin. On le remplace
  // par ce qu'il faut vraiment savoir — le journal se telecharge sous la file.
  const sansChemin = texte => (c.journal ? texte.split(c.journal).join('le journal de combat') : texte);
  const garde = texte => {
    c.sortie += texte;
    if (c.sortie.length > SORTIE_MAX) {
      const n = c.sortie.length - SORTIE_MAX;
      c.sortie = c.sortie.slice(n);
      c.oublie += n;
    }
  };
  // La sortie arrive par morceaux quelconques : on la recoupe en LIGNES pour reconnaitre
  // les marqueurs « @@progression 12/351 », qu'on retire du texte et qu'on garde en
  // chiffres. Un bout de ligne pas encore termine attend la suite — un lecteur par flux,
  // sinon une ligne d'erreur pourrait se glisser au milieu d'une ligne normale.
  const lecteur = () => {
    let reste = '';
    return {
      lit(texte) {
        const lignes = (reste + texte).split('\n');
        reste = lignes.pop();
        let net = '';
        for (const l of lignes) {
          const m = /^@@progression (\d+)\/(\d+)\s*$/.exec(l);
          if (m) { c.progression = { fait: Number(m[1]), total: Number(m[2]) }; suitProgression(); }
          else net += sansChemin(l) + '\n';
        }
        if (net) garde(net);
      },
      vide() { if (reste) garde(reste); reste = ''; }
    };
  };
  const sortieStd = lecteur(), erreurs = lecteur();
  const termine = code => {
    if (!c.proc) return;
    sortieStd.vide(); erreurs.vide();
    c.proc = null; c.code = code; c.fin = Date.now();
    if (c.pauseDepuis) { c.pauseTotale += c.fin - c.pauseDepuis; c.pauseDepuis = null; }
    c.etat = code === 0 ? 'fini' : (lot.arrete || String(code).startsWith('SIG')) ? 'arrete' : 'echec';
    c.resume = resumeCalcul(c);
    console.log('calcul termine : ' + c.libelle + ' (' + code + ', ' + Math.round(ecoule(c) / 1000) + ' s)');
    // Au suivant — ou a la fin de la file, qui sonne. La notification de progression
    // part apres, pour annoncer le calcul qui vient de demarrer.
    suivante();
    annonceAvancement(true);
  };
  try {
    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');
    proc.stdout.on('data', t => sortieStd.lit(t));
    proc.stderr.on('data', t => erreurs.lit(t));
    proc.on('error', e => { garde('\n[erreur] ' + e.message + '\n'); termine('erreur'); });
    proc.on('close', (code, signal) => termine(signal || code));
  } catch (e) {
    // Rien ne doit laisser un calcul « en cours » pour toujours : le serveur refuserait
    // alors tous les suivants, jusqu'a son redemarrage.
    proc.kill();
    termine('erreur');
    throw e;
  }
  console.log('calcul lance : ' + outil.fichier + ' ' + c.args.join(' ') + (c.brouillon ? ' (brouillon)' : ''));
}

// UN FICHIER TEXTE A TELECHARGER (un journal de combat). `nom` est ce que le navigateur
// enregistre ; `Content-Disposition: attachment` evite qu'un fichier de 2 Mo s'ouvre
// dans l'onglet.
function fichierTexte(res, nom, texte) {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Disposition': `attachment; filename="${nom.replace(/[^\w.-]/g, '_')}"`,
    'Cache-Control': 'no-store'
  }).end(texte);
}

const json = (res, code, obj) =>
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    .end(JSON.stringify(obj));

http.createServer((req, res) => {
  const [urlPath, query] = req.url.split('?');

  // « J'ai ajoute une image dans Characters/ » : on rebalaye et on rend la liste, que
  // le builder affiche sans rechargement. Rien a lire dans la requete.
  if (req.method === 'POST' && urlPath === '/api/sprites') {
    genereSprites().then(sprites => {
      console.log('sprites relus : ' + Object.entries(sprites).map(([k, v]) => k + ' ' + v.length).join(' · '));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(sprites));
    }).catch(e => res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(String(e && e.message || e)));
    return;
  }

  // Ou en est la file ? La page le demande toutes les secondes tant qu'elle tourne.
  if (req.method === 'GET' && urlPath === '/api/run') {
    json(res, 200, etatCalcul(new URLSearchParams(query || '').get('depuis')));
    return;
  }

  // La sortie complete d'une ligne de la file — une ligne deja finie, qu'on relit.
  if (req.method === 'GET' && urlPath === '/api/run/ligne') {
    const l = lot && lot.lignes[Number(new URLSearchParams(query || '').get('i'))];
    if (!l) { json(res, 404, { erreur: 'Pas de calcul a ce numero dans la file' }); return; }
    json(res, 200, { i: l.i, libelle: l.libelle, etat: l.etat, resume: l.resume, texte: l.sortie });
    return;
  }

  // LE JOURNAL DE COMBAT d'une ligne de la file — a telecharger. `i=tout` les met bout
  // a bout : un seul fichier a donner a relire, puisqu'on n'a pas de quoi faire un zip
  // sans dependance. Un taux dit qu'un deck gagne ; le journal dit comment.
  if (req.method === 'GET' && urlPath === '/api/run/journal') {
    const q = new URLSearchParams(query || '').get('i');
    if (!lot) { json(res, 404, { erreur: 'Aucune file.' }); return; }
    const avec = lot.lignes.filter(l => l.journal && fs.existsSync(l.journal));
    if (!avec.length) { json(res, 404, { erreur: 'Aucun journal dans cette file.' }); return; }
    if (q === 'tout') {
      const morceaux = avec.map(l => `

======== ${l.libelle} ========

` + fs.readFileSync(l.journal, 'utf8'));
      fichierTexte(res, `journaux-${lot.id}.txt`, morceaux.join(''));
      return;
    }
    const l = lot.lignes[Number(q)];
    if (!l || !l.journal || !fs.existsSync(l.journal)) { json(res, 404, { erreur: 'Pas de journal pour ce calcul.' }); return; }
    fichierTexte(res, `${l.libelle}.txt`, fs.readFileSync(l.journal, 'utf8'));
    return;
  }

  // LE COMMENTAIRE de la file : ce qu'on a compris, ou l'on en est. Il part avec le
  // calcul quand on le range, et revient quand on le rouvre — c'est la memoire de ce
  // qu'on a deja tire de ces chiffres.
  if (req.method === 'POST' && urlPath === '/api/run/commentaire') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; if (body.length > 200000) req.destroy(); });
    req.on('end', () => {
      if (!lot) { json(res, 404, { erreur: 'Aucune file à commenter.' }); return; }
      let texte;
      try { texte = String(JSON.parse(body || '{}').texte || ''); }
      catch { json(res, 400, { erreur: 'Demande illisible.' }); return; }
      lot.commentaire = texte.slice(0, 100000);
      // Ranger n'est jamais bloquant : une cle absente se journalise, le commentaire
      // reste dans la file en memoire.
      range(lot);
      json(res, 200, { ok: true, lot: resumeLot() });
    });
    return;
  }

  // Des calculs a ajouter : ils demarrent une file, ou se mettent a la suite de celle
  // qui tourne.
  if (req.method === 'POST' && urlPath === '/api/run') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        ajouteALaFile(JSON.parse(body || '{}'));
        json(res, 200, etatCalcul(0));
      } catch (e) {
        json(res, 400, { erreur: e.message });
      }
    });
    return;
  }

  // L'analyse par l'IA locale (scripts/lib/ia.mjs) : la lancer sur la derniere file, et
  // lire / regler la liste des machines qui peuvent la faire (avec ce qu'elles repondent).
  if (req.method === 'POST' && urlPath === '/api/run/analyse') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; if (body.length > 1000) req.destroy(); });
    req.on('end', () => {
      let nouvelle = false;
      try { nouvelle = JSON.parse(body || '{}').nouvelle === true; } catch { /* corps vide ou illisible : pas de relance */ }
      lanceAnalyse({ nouvelle }).then(() => json(res, 200, { ok: true, lot: resumeLot() }))
        .catch(e => json(res, 400, { erreur: e.message }));
    });
    return;
  }
  // Le dialogue : une reponse du designer a l'analyse ({ texte }).
  if (req.method === 'POST' && urlPath === '/api/run/question') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; if (body.length > 20000) req.destroy(); });
    req.on('end', () => {
      let texte;
      try { texte = JSON.parse(body || '{}').texte; } catch { json(res, 400, { erreur: 'Demande illisible.' }); return; }
      poseQuestion(texte).then(() => json(res, 200, { ok: true, lot: resumeLot() }))
        .catch(e => json(res, 400, { erreur: e.message }));
    });
    return;
  }
  // LES CALCULS RANGES (scripts/lib/archives.mjs) : ce qu'il y a sur la cle, ou l'on
  // range, et surtout ROUVRIR un calcul — il redevient la file courante, avec ses
  // sorties, son analyse et son dialogue, sans rejouer une partie.
  if (req.method === 'GET' && urlPath === '/api/archives') {
    archives().then(a => a.etat()).then(e => json(res, 200, e))
      .catch(e => json(res, 500, { erreur: e.message }));
    return;
  }
  // Le journal de combat d'un calcul RANGE : on le telecharge sans rouvrir le calcul
  // (rouvrir remplace la file affichee, et c'est refuse pendant qu'un calcul tourne).
  if (req.method === 'GET' && urlPath === '/api/archives/journal') {
    const q = new URLSearchParams(query || '');
    archives().then(a => a.journal(q.get('id'), q.get('i')))
      .then(j => fichierTexte(res, j.nom, fs.readFileSync(j.chemin, 'utf8')))
      .catch(e => json(res, 404, { erreur: e.message }));
    return;
  }
  if (req.method === 'POST' && urlPath.startsWith('/api/archives')) {
    const action = urlPath.slice('/api/archives'.length);
    if (!['', '/charger', '/ranger', '/commentaire'].includes(action)) { json(res, 404, { erreur: 'Inconnu : ' + urlPath }); return; }
    let body = '';
    req.setEncoding('utf8');
    // Le plafond vaut pour un commentaire (le plus gros corps de cette route), pas pour
    // les quelques octets d'un « charger ».
    req.on('data', c => { body += c; if (body.length > 200000) req.destroy(); });
    req.on('end', async () => {
      try {
        const d = JSON.parse(body || '{}');
        const a = await archives();
        if (action === '/charger') { json(res, 200, { ok: true, lot: await chargeArchive(d.id) }); return; }
        // Commenter un calcul range : ce qu'on a compris de ces chiffres, garde avec eux.
        // Si c'est la file affichee, on met aussi a jour la copie en memoire.
        if (action === '/commentaire') {
          const texte = await a.commente(d.id, d.texte);
          if (lot && lot.archive === d.id) lot.commentaire = texte;
          json(res, 200, { ok: true, commentaire: texte, lots: (await a.etat()).lots });
          return;
        }
        // « Ranger maintenant » : la cle a ete branchee apres coup, ou on veut la
        // derniere version (l'analyse, le dialogue) sur le disque tout de suite.
        if (action === '/ranger') {
          if (!lot) throw new Error('Aucune file à ranger.');
          json(res, 200, { ok: true, dossier: await a.range(lot) });
          return;
        }
        await a.enregistreDossier(d.dossier);
        json(res, 200, await a.etat());
      } catch (e) {
        json(res, 400, { erreur: e.message });
      }
    });
    return;
  }

  // Les RENFORTS de calcul (scripts/lib/renforts.mjs) : les PC qui prennent leur part des
  // cases de chaque calcul, et ce qu'ils repondent. Meme forme que /api/ia.
  if (req.method === 'GET' && urlPath === '/api/calcul') {
    import('./lib/renforts.mjs').then(m => m.statuts()).then(s => json(res, 200, { machines: s }))
      .catch(e => json(res, 500, { erreur: e.message }));
    return;
  }
  if (req.method === 'POST' && urlPath === '/api/calcul') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; if (body.length > 20000) req.destroy(); });
    req.on('end', async () => {
      try {
        const m = await import('./lib/renforts.mjs');
        m.enregistreMachines(JSON.parse(body || '{}').machines);
        json(res, 200, { machines: await m.statuts() });
      } catch (e) {
        json(res, 400, { erreur: e.message });
      }
    });
    return;
  }
  if (req.method === 'GET' && urlPath === '/api/ia') {
    ia().then(m => m.statuts()).then(s => json(res, 200, { machines: s }))
      .catch(e => json(res, 500, { erreur: e.message }));
    return;
  }
  if (req.method === 'POST' && urlPath === '/api/ia') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const m = await ia();
        m.enregistreMachines(JSON.parse(body || '{}').machines);
        json(res, 200, { machines: await m.statuts() });
      } catch (e) {
        json(res, 400, { erreur: e.message });
      }
    });
    return;
  }

  // Pause, reprise, arret : les boutons de la page, et ceux des notifications.
  const commandes = { '/api/run/pause': pauseFile, '/api/run/reprendre': reprendFile, '/api/run/stop': arreteFile };
  if (req.method === 'POST' && commandes[urlPath]) {
    commandes[urlPath]();
    json(res, 200, { ok: true, lot: resumeLot() });
    return;
  }

  // Les notifications : la cle publique (pour s'abonner), l'abonnement d'un appareil, son
  // desabonnement, et un message d'essai (le bouton « Tester » de l'accueil, qui affiche
  // ce que le service push a repondu). Voir scripts/lib/push.mjs.
  if (urlPath.startsWith('/api/push/')) {
    const action = urlPath.slice('/api/push/'.length);
    if (req.method === 'GET' && action === 'cle') {
      push().then(p => json(res, 200, { cle: p.clePublique(), abonnes: p.abonnes() }))
        .catch(e => json(res, 500, { erreur: e.message }));
      return;
    }
    if (req.method === 'POST' && ['abonne', 'desabonne', 'test'].includes(action)) {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', c => { body += c; });
      req.on('end', async () => {
        try {
          const p = await push();
          const d = body ? JSON.parse(body) : {};
          if (action === 'abonne') { p.abonne(d); json(res, 200, { ok: true, abonnes: p.abonnes() }); }
          else if (action === 'desabonne') { p.desabonne(d.endpoint); json(res, 200, { ok: true, abonnes: p.abonnes() }); }
          else json(res, 200, await p.notifie({ titre: 'Atelier', corps: 'Les notifications marchent : tu seras prévenu quand un calcul avance et quand il finit.', tag: 'test', bruyante: true }, { urgence: 'high' }));
        } catch (e) {
          json(res, 400, { erreur: e.message });
        }
      });
      return;
    }
  }

  // ---- LES VERSIONS DU JEU ----
  if (urlPath === '/api/versions' || urlPath.startsWith('/api/versions/')) {
    const action = urlPath.slice('/api/versions'.length);
    const q = new URLSearchParams(query || '');
    const repond = p => p.then(r => json(res, 200, r)).catch(e => json(res, 400, { erreur: e.message }));
    if (req.method === 'GET') {
      if (action === '') { repond(versions().then(async v => ({ disponible: true, versions: await v.liste(), courant: await v.etatCourant(lisDonnees()), auMax: v.AUTO_MAX }))); return; }
      if (action === '/une') { repond(versions().then(v => v.lis(q.get('id')))); return; }
      if (action === '/diff') { repond(versions().then(v => v.difference(q.get('id'), q.get('contre') || 'precedente', lisDonnees()))); return; }
      if (action === '/donnees') { repond(versions().then(v => v.donnees(q.get('id')))); return; }
      json(res, 404, { erreur: 'Inconnu : ' + urlPath }); return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', c => { body += c; if (body.length > 200000) req.destroy(); });
      req.on('end', () => {
        let d;
        try { d = JSON.parse(body || '{}'); } catch { json(res, 400, { erreur: 'Demande illisible.' }); return; }
        repond(versions().then(async v => {
          if (action === '/creer') {
            const r = await v.capture({ texte: lisDonnees(), titre: String(d.titre || '').trim().slice(0, 200), description: String(d.description || '').slice(0, 20000), type: 'nommee' });
            console.log('version ' + (r.nouvelle ? 'creee' : r.promue ? 'promue' : 'deja la') + ' : ' + r.version.id + ' ' + r.version.titre);
            return r;
          }
          if (action === '/renommer') return v.renomme(d.id, { titre: d.titre, description: d.description });
          if (action === '/commenter') return v.commente(d.id, d.cible, d.texte);
          if (action === '/commentaire/retirer') { await v.retireCommentaire(d.id, d.commentaire); return { ok: true }; }
          if (action === '/commentaire/modifier') return v.modifieCommentaire(d.id, d.commentaire, d.texte);
          if (action === '/lier') return v.lieCalcul(d.id, d.archive);
          if (action === '/delier') { await v.delieCalcul(d.id, d.archive); return { ok: true }; }
          if (action === '/supprimer') { await v.supprime(d.id, lisDonnees()); return { ok: true }; }
          if (action === '/restaurer') {
            // Calcule d'abord (une erreur ici n'ecrit rien), PUIS photo de securite de l'etat
            // actuel, PUIS ecriture : on ne perd jamais ce qu'on s'apprete a remplacer.
            const courant = lisDonnees();
            const r = await v.pourRestaurer(d.id, d.cle || null, courant);
            const avant = await v.sauvegardeAvantEcriture(courant, r.texte, 'retour');
            fs.writeFileSync(path.join(ROOT, FICHIER_DONNEES), r.texte, 'utf8');
            console.log('retour en arriere : ' + d.id + (d.cle ? ' (' + d.cle + ')' : '') + ' — ' + r.fait);
            return { ok: true, fait: r.fait, sauvegarde: avant ? { id: avant.id, titre: avant.titre } : null, courant: await v.etatCourant(r.texte) };
          }
          throw new Error('Inconnu : ' + urlPath);
        }));
      });
      return;
    }
  }

  if (req.method === 'POST' && urlPath === '/api/write') {
    const rel = decodeURIComponent(new URLSearchParams(query || '').get('path') || '').replace(/\\/g, '/');
    if (!canWrite(rel)) { res.writeHead(403).end('Chemin non autorise : ' + rel); return; }
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      const file = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      // LE FILET DE SECURITE : avant d'ecraser les cartes du jeu, on garde l'etat qu'on va
      // remplacer (une fois : s'il est deja dans une version, rien n'est ajoute). Un onglet
      // perime du builder a deja efface six heros — c'est ce qui permet de les retrouver.
      // Ne bloque jamais l'ecriture : sans Node recent ou sans disque, on ecrit quand meme.
      if (rel === FICHIER_DONNEES) {
        try { const v = await versions(); await v.sauvegardeAvantEcriture(lisDonnees(), body, 'ecriture'); }
        catch (e) { console.log('sauvegarde avant ecriture impossible : ' + e.message); }
      }
      fs.writeFileSync(file, body, 'utf8');
      console.log('ecrit : ' + rel + ' (' + body.length + ' caracteres)');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('ok');
    });
    return;
  }

  let rel = decodeURIComponent(urlPath);
  if (rel === '/') rel = '/game/index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('Not found: ' + rel); return; }
    // CACHE TRES COURT SUR LES SOURCES. Sans lui, chaque Web Worker de la page
    // d'equilibrage refait les 7 requetes du graphe de modules : seize ouvriers font
    // 112 requetes d'un coup, le navigateur n'ouvre que 6 connexions a la fois, et des
    // workers restent muets a attendre leurs modules. Deux secondes suffisent a servir
    // toute la grappe depuis le cache memoire, sans jamais gener l'edition : les
    // DONNEES du jeu, elles, restent en 'no-store' (le builder doit les relire fraiches,
    // et les pages qui veulent la derniere version ajoutent deja un « ?t= »).
    const donnees = rel.startsWith('/game/data/') || file.endsWith('.html');
    // LES IMAGES SE REVALIDENT, elles ne se retelechargent pas. Les sprites pesent ~1,5 Mo
    // (72 Mo pour Characters/) : avec « max-age=2 » un telephone les rechargeait en entier a
    // chaque ouverture, et sur 4G/Tailscale beaucoup n'arrivaient pas (cercles pales a la place
    // des personnages). Avec un ETag, le navigateur redemande et recoit un 304 de quelques octets,
    // et un sprite redessine est repris tout de suite.
    if (/\.(png|webp|jpe?g|gif)$/i.test(file)) {
      const st = fs.statSync(file);
      const etag = `"${st.size}-${Math.floor(st.mtimeMs)}"`;
      if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' }).end(); return; }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache', ETag: etag
      });
      res.end(buf);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': donnees ? 'no-store' : 'max-age=2'
    });
    res.end(buf);
  });
}).listen(PORT, HOTE, () => {
  // AdventureCard.exe annonce deja ces adresses, et mieux que nous (il sait s'il a pu
  // nous lancer) : sous ADVENTURE_DISCRET on ne dit plus que « je suis la », sinon la
  // console du launcher listait le builder et l'Atelier deux fois.
  if (process.env.ADVENTURE_DISCRET) {
    console.log('devserver.js pret  : port ' + PORT + (HOTE ? ' sur ' + HOTE : ''));
    return;
  }
  console.log('Adventure Card dev  : http://localhost:' + PORT + '/game/index.html');
  console.log('Card Builder        : http://localhost:' + PORT + '/builder/index.html');
  console.log('Atelier             : http://localhost:' + PORT + '/builder/accueil.html');
});
