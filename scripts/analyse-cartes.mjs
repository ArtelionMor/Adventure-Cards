// CE QUE LE BOT A PREFERE — et pourquoi.
//
// Un taux de victoire dit qu'un deck gagne ; il ne dit jamais QUELLE carte a fait le
// travail, ni laquelle est restee en main tout du long. Cet outil ecoute les decisions
// du bot : a chaque fois qu'il avait le CHOIX, il note ce qu'il pouvait jouer, ce que
// chaque candidat valait, et celui qu'il a garde.
//
// Avec le bot `montecarlo`, l'argument est le vrai : pour chaque coup possible il finit
// la partie N fois et garde celui qui gagne le plus souvent. On lit donc « il a joue
// cette carte parce qu'elle gagne 62 % des fins de partie, contre 48 % a l'autre ».
// Avec les autres niveaux, l'argument est sa fonction de valeur (`cardValue`) — moins
// fiable, mais c'est bien ce qui le fait choisir.
//
//   node scripts/analyse-cartes.mjs [parties] [niveau] [options]
//     --persos dog,cat   les personnages du camp joueur (defaut : les starters)
//     --niv 5            le niveau des cartes du heros
//     --pnj wolf         l'adversaire (defaut : le premier de la liste)
//     --switch           les cartes switch au lieu des cartes de base
//     --rollouts 30      parties simulees par coup (defaut : celui du GAME CONFIG)
//     --jobs 8           parties en parallele (defaut : un par coeur ; 1 pour desactiver)
//     --logs f.txt       ecrit le detail de chaque decision dans un fichier
//     --tout             affiche toutes les cartes, pas seulement les remarquables
import { writeFileSync } from 'node:fs';
import { enParallele, nombreDeJobs } from './lib/pool.mjs';
import { CHARACTER_DATA } from '../game/data/characters.data.js';
import { campPerso, campPnj } from '../game/src/tools/arene.js';
import { BALANCE } from '../game/src/config/balance.js';

// ---------------------------------------------------------------- arguments
const args = process.argv.slice(2);
const drapeau = nom => args.includes('--' + nom);
const valeur = (nom, defaut) => {
  const i = args.indexOf('--' + nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const positionnels = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['switch', 'tout'].includes(args[i - 1].slice(2))));

const parties = Number(positionnels[0]) || 10;
const niveauBot = positionnels[1] || 'montecarlo';
const niveauCartes = Number(valeur('niv', 5)) || 5;
const cote = drapeau('switch') ? 'switches' : 'cards';
const persos = valeur('persos', (CHARACTER_DATA.starters || []).slice(0, 1).join(',')).split(',').filter(Boolean);
const pnjId = valeur('pnj', ((CHARACTER_DATA.npcs || [])[0] || {}).id);
const fichierLogs = valeur('logs', null);
const rollouts = Number(valeur('rollouts', 0)) || 0;
// Un niveau peut se donner en clair : c'est ce qui permet d'affiner la recherche sans
// toucher au GAME CONFIG. Plus de rollouts = un ecart plus fin, et plus de temps.
const reglageBot = rollouts ? { ...BALANCE.ai.niveaux[niveauBot], rollouts } : niveauBot;

const campJoueur = campPerso(persos, niveauCartes, cote);
const campAdverse = campPnj(pnjId);
if (!campJoueur) { console.error(`Personnage(s) introuvable(s) : ${persos.join(', ')}`); process.exit(1); }
if (!campAdverse) { console.error(`Adversaire introuvable : ${pnjId}`); process.exit(1); }
if (!BALANCE.ai.niveaux[niveauBot]) {
  console.error(`Niveau de bot inconnu : ${niveauBot} (${Object.keys(BALANCE.ai.niveaux).join(', ')})`);
  process.exit(1);
}

const pc = x => Math.round(x * 100) + '%';
const pts = x => (x * 100).toFixed(1);

// ------------------------------------------------------------- le depouillement
// Une ligne par carte, quel que soit le camp qui la tient : ce qu'on veut savoir,
// c'est si LA CARTE seduit le bot, pas qui la joue.
const cartes = new Map();
const fiche = nom => {
  if (!cartes.has(nom)) cartes.set(nom, {
    nom, propose: 0, joue: 0, sommeVictoires: 0, nVictoires: 0,
    sommeValeur: 0, nValeur: 0, sommeEcart: 0, nEcart: 0, prefereA: new Map()
  });
  return cartes.get(nom);
};

let decisions = 0, avecChoix = 0;
const lignes = [];

// ------------------------------------------------------------------ les parties
// UNE PARTIE NE DEPEND D'AUCUNE AUTRE : elles passent par la file de taches commune
// (scripts/lib/pool.mjs), donc sur tous les coeurs d'ici ET sur ceux des renforts.
// Chaque tache depouille sa part et rend des COMPTEURS ; le total n'est qu'une somme, si
// bien que le resultat est le meme qu'en un seul fil (au hasard des tirages pres).
let victoires = 0, nulles = 0;

function fusionne(q) {
  victoires += q.victoires; nulles += q.nulles;
  decisions += q.decisions; avecChoix += q.avecChoix;
  lignes.push(...q.lignes);
  for (const g of q.cartes) {
    const f = fiche(g.nom);
    for (const c of ['propose', 'joue', 'sommeValeur', 'nValeur', 'sommeEcart', 'nEcart']) f[c] += g[c];
    for (const [nom, n] of g.prefereA) f.prefereA.set(nom, (f.prefereA.get(nom) || 0) + n);
  }
}

// Une tache = UNE partie tant que ca reste raisonnable : c'est le grain le plus fin, donc
// le mieux reparti entre des machines qui n'ont ni le meme nombre de coeurs ni la meme
// vitesse. Au-dela, on groupe pour ne pas envoyer des milliers de messages.
const parTache = Math.max(1, Math.ceil(parties / 256));
const taches = [];
for (let fait = 0; fait < parties; fait += parTache) taches.push({ n: Math.min(parTache, parties - fait), depart: fait });

const jobs = Math.max(1, Math.min(nombreDeJobs(), taches.length));
console.log(`\nAnalyse : ${parties} partie(s), bot « ${niveauBot} », ${jobs} en parallèle.`);
console.log(`  ${campJoueur.name} (niveau ${niveauCartes}, ${cote === 'cards' ? 'base' : 'switch'}) contre ${campAdverse.name}.`);

const debut = Date.now();
await enParallele(taches, new URL('./lib/taches-analyse.mjs', import.meta.url), {
  contexte: { persos, niveau: niveauCartes, cote, pnj: pnjId, bot: reglageBot, logs: !!fichierLogs },
  jobs,
  unite: parTache === 1 ? 'partie(s)' : 'paquet(s)',
  surResultat: (i, q) => fusionne(q)
});
console.log(`\r  ${parties} partie(s) en ${Math.round((Date.now() - debut) / 1000)} s — ${campJoueur.name} gagne ${victoires}, nul/bloque ${nulles}.`);
console.log(`  ${decisions} decision(s) avec un choix, dont ${avecChoix} ou une carte etait jouable.\n`);

if (!cartes.size) {
  console.log('Aucune carte jouable ne s’est presentee : rien a analyser.');
  process.exit(0);
}

// ------------------------------------------------------------------ le tableau
const liste = [...cartes.values()].map(f => ({
  ...f,
  preference: f.propose ? f.joue / f.propose : 0,
  valeur: f.nValeur ? f.sommeValeur / f.nValeur : null,
  ecart: f.nEcart ? f.sommeEcart / f.nEcart : null
})).sort((a, b) => b.preference - a.preference || b.propose - a.propose);

const large = Math.max(20, ...liste.map(f => f.nom.length));
const col = (s, n) => String(s).padEnd(n);
const colD = (s, n) => String(s).padStart(n);
console.log(col('carte', large) + colD('proposée', 10) + colD('jouée', 8) + colD('préférée', 10)
  + colD('écart', 9) + colD('valeur', 9));
console.log('-'.repeat(large + 46));
const montre = drapeau('tout') ? liste : liste.filter(f => f.propose >= 3);
for (const f of montre) {
  console.log(col(f.nom, large) + colD(f.propose, 10) + colD(f.joue, 8) + colD(pc(f.preference), 10)
    + colD(f.ecart === null ? '—' : pts(f.ecart), 9)
    + colD(f.valeur === null ? '—' : f.valeur.toFixed(1), 9));
}
console.log(`\n  « écart » : combien de points de victoire la carte perd, en moyenne, face au`);
console.log(`  meilleur coup du moment (0 = elle valait le meilleur). C'est l'argument du bot.`);
console.log(`  « valeur » : ce qu'en pense sa fonction de valeur, un tout autre avis.`);
if (montre.length < liste.length) console.log(`\n  (${liste.length - montre.length} carte(s) vues moins de 3 fois, masquees — « --tout » pour les voir)`);

// --------------------------------------------------------- ce qu'il leur prefere
// LA question du designer : quand cette carte etait jouable et qu'il ne l'a pas jouee,
// qu'a-t-il joue a la place ? C'est ce qui dit si une carte est morte ou juste lente.
const boudees = montre.filter(f => f.preference < 0.34 && f.propose >= 4)
  .sort((a, b) => a.preference - b.preference).slice(0, 6);
if (boudees.length) {
  console.log('\nCartes boudées — proposées souvent, jouées rarement :');
  for (const f of boudees) {
    const rivales = [...f.prefereA.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([nom, n]) => `${nom} (${n}×)`).join(', ');
    const perte = f.ecart === null ? '' : `, à ${pts(f.ecart)} points du meilleur coup`;
    console.log(`  - ${f.nom} — jouable ${f.propose} fois, jouée ${f.joue}${perte}`);
    console.log(`      il lui a préféré : ${rivales}`);
    // Un ecart nul et zero partie jouee n'est pas une contradiction : a egalite le bot
    // garde le PREMIER coup de sa liste, donc l'ordre de la main departage.
    if (f.ecart !== null && f.ecart < 0.02) console.log('      (à égalité avec le meilleur coup : c’est l’ordre de la main qui a tranché)');
  }
}

const cheries = montre.filter(f => f.preference > 0.66 && f.propose >= 4).slice(0, 6);
if (cheries.length) {
  console.log('\nCartes chéries — jouables et jouées presque à chaque fois :');
  for (const f of cheries) console.log(`  - ${f.nom} — ${f.joue}/${f.propose} (${pc(f.preference)})`);
}

// Le desaccord entre les deux avis est un signal a lui seul : le Monte-Carlo CHERCHE,
// la fonction de valeur SUPPOSE. Quand ils divergent, c'est `cardValue` dans ai.js qu'il
// faut relire — pas la carte. On compare l'ecart (relatif, donc honnete) a la note.
const desaccords = montre.filter(f => f.ecart !== null && f.valeur !== null && f.propose >= 4)
  .filter(f => (f.ecart <= 0.03 && f.valeur < 2) || (f.ecart >= 0.15 && f.valeur > 6));
if (desaccords.length) {
  console.log('\nLe Monte-Carlo et la fonction de valeur ne sont pas d’accord :');
  for (const f of desaccords) {
    const sous = f.ecart <= 0.03;
    console.log(`  - ${f.nom} — à ${pts(f.ecart)} points du meilleur coup, mais notée ${f.valeur.toFixed(1)}`
      + ` : ${sous ? 'cardValue() la sous-estime' : 'cardValue() la surestime'}`);
  }
}

if (fichierLogs) {
  writeFileSync(fichierLogs, [
    `# Decisions du bot — ${parties} partie(s), niveau ${niveauBot}`,
    `# ${campJoueur.name} (niv. ${niveauCartes}) contre ${campAdverse.name}`,
    '', ...lignes
  ].join('\n'), 'utf8');
  console.log(`\n${lignes.length} decision(s) detaillees dans ${fichierLogs}`);
}
console.log('');
