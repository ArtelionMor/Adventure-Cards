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
// et /api/run lance des scripts, sans aucun mot de passe.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 7330;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
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
const OUTILS = {
  simulate: { fichier: 'scripts/simulate.mjs', brouillon: true, nom: 'Courbe de difficulté' },
  matchups: { fichier: 'scripts/matchups.mjs', brouillon: true, nom: 'Matrice des matchups' },
  'check-decks': { fichier: 'scripts/check-decks.mjs', brouillon: true, nom: 'Contrôle des decks' },
  'analyse-cartes': { fichier: 'scripts/analyse-cartes.mjs', brouillon: true, nom: 'Analyse des cartes' },
  'test-triggers': { fichier: 'scripts/test-triggers.mjs', brouillon: false, nom: 'Banc du moteur' },
  'test-ai': { fichier: 'scripts/test-ai.mjs', brouillon: false, nom: 'Banc du bot' }
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
    // Une reponse longue (un gros modele qui reflechit) : on previent, la page est
    // peut-etre fermee.
    if (r.duree > 60000) notifie({ titre: 'L\'IA t\'a répondu', corps: r.texte.replace(/[*#_`]/g, '').slice(0, 140), tag: 'calcul', bruyante: true, url: 'lancer.html#resultats' },
      { urgence: 'high', sujet: 'calcul' });
  }).catch(e => Object.assign(echange, { etat: 'echec', erreur: e.message }));
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
    lignes: lot.lignes.map(l => ({ i: l.i, outil: l.outil, libelle: l.libelle, etat: l.etat, resume: l.resume, duree: l.fin ? ecoule(l) : null }))
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
    progression: null, resume: null, pauseTotale: 0, pauseDepuis: null
  }));
}

/** Ajoute des calculs : ils demarrent une nouvelle file, ou se mettent a la suite de celle qui tourne. */
function ajouteALaFile(demande) {
  const lignes = nouvellesLignes(demande);
  const nouvelle = !lotActif();
  if (nouvelle) {
    lot = { id: Date.now().toString(36), lignes: [], debut: Date.now(), fin: null, pause: false, arrete: false,
      pauseTotale: 0, pauseDepuis: null, brouillons: new Set(), dixiemes: 0, derniereNotif: 0 };
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
  // ADVENTURE_PROGRESSION : les scripts ecrivent leur avancement en lignes-marqueurs
  // (scripts/lib/progression.mjs) au lieu d'une ligne de terminal reecrite sur place.
  const proc = spawn(process.execPath, ['--import', CROCHET, outil.fichier, ...c.args], {
    cwd: ROOT, env: { ...process.env, ADVENTURE_BROUILLON: c.brouillon || '', ADVENTURE_PROGRESSION: '1' }, windowsHide: true
  });
  c.proc = proc;
  c.etat = 'encours';
  c.debut = Date.now();
  calcul = c;
  const suitProgression = () => annonceAvancement(false);
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
          else net += l + '\n';
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

  if (req.method === 'POST' && urlPath === '/api/write') {
    const rel = decodeURIComponent(new URLSearchParams(query || '').get('path') || '').replace(/\\/g, '/');
    if (!canWrite(rel)) { res.writeHead(403).end('Chemin non autorise : ' + rel); return; }
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const file = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
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
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': donnees ? 'no-store' : 'max-age=2'
    });
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log('Adventure Card dev  : http://localhost:' + PORT + '/game/index.html');
  console.log('Card Builder        : http://localhost:' + PORT + '/builder/index.html');
});
