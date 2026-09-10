// EQUILIBRAGE DECK CONTRE DECK — la matrice des matchups, estimee en jouant.
//
// POURQUOI DES PARTIES ET PAS UN CALCUL. Un combat est une chaine de Markov : l'etat
// (mains, plateaux, PV, decks) suffit a decrire ce qui peut arriver ensuite. Mais le
// nombre d'etats est astronomique — melange, pioche, cibles au hasard, erreurs
// volontaires du bot — donc personne ne resout cette chaine exactement. On l'ESTIME
// par Monte-Carlo : on joue beaucoup de parties et on compte. C'est exactement ce que
// font les jeux de cartes du marche pour lire leur meta.
//
// CE QUE VISE LE DESIGNER (demande) :
//   ~66 % quand le deck a le matchup, ~33 % quand il ne l'a pas, ~50 % sinon.
// La colonne « lecture » range chaque case dans une de ces trois cibles, ou dit qu'on
// est en dehors. L'intervalle ± est celui de Wilson a 95 % : deux cases qui se
// chevauchent ne sont PAS differentes, meme si leurs chiffres different — c'est la
// seule facon de ne pas « corriger » du bruit.
//
// ATTENTION A CE QUE MESURE LA MATRICE : des decks TELS QUE LE BOT LES JOUE. Un deck
// que le bot ne sait pas piloter parait faible alors que ses cartes sont bonnes. Avant
// de corriger des cartes, verifier le matchup suspect avec la reference qui cherche
// vraiment (`--pair a,b --fort`) : si l'ecart s'efface, le probleme etait le bot.
//
// Les cases sont independantes : elles se jouent sur tous les coeurs (scripts/lib/pool.mjs).
//
//   node scripts/matchups.mjs [parties par paire] [niveau]
//   node scripts/matchups.mjs 200 5 --trio          equipes de 3 (20 decks, plus long)
//   node scripts/matchups.mjs 200 5 --bots          compare les niveaux de bot entre eux
//   node scripts/matchups.mjs 200 5 --csv sortie.csv   ecrit la matrice (une ligne par matchup)
//   node scripts/matchups.mjs 200 5 --logs sortie.txt  ecrit un journal de partie par matchup
//   node scripts/matchups.mjs 200 5 --mix           decks melanges base/switch (le cas reel)
//   node scripts/matchups.mjs 200 5 --switch        decks tout-switch
//   node scripts/matchups.mjs 200 5 --pnj           ajoute les adversaires (PNJ)
//   node scripts/matchups.mjs 200 5 --jobs 4        cases en parallele (defaut : un par coeur moins un ; 1 = sans worker)
//   node scripts/matchups.mjs 30 5 --pair dog,cat   une seule paire
//   node scripts/matchups.mjs 20 5 --pair dog,cat --fort   ... avec le bot Monte-Carlo
import { CHARACTERS } from '../game/src/config/characters.js';
import { CHARACTER_DATA } from '../game/data/characters.data.js';
import { BALANCE } from '../game/src/config/balance.js';
import { duel, wilson, lecture, matriceCsv, journauxTexte, CIBLES, TOLERANCE } from '../game/src/tools/arene.js';
import { camp } from './lib/taches-matchups.mjs';
import { enParallele, nombreDeJobs } from './lib/pool.mjs';
import { writeFileSync } from 'node:fs';

const PARTIES = Number(process.argv[2] || 120);
const NIVEAU = Number(process.argv[3] || 5);
const TRIO = process.argv.includes('--trio');
// Quelles cartes composent un deck de personnage : ses 5 cartes de base, ses 5 switch,
// ou un melange retire a chaque partie — c'est ce dernier qui ressemble a un vrai deck.
const MELANGE = process.argv.includes('--mix');
const COTE = process.argv.includes('--switch') ? 'switches' : 'cards';
const DUEL_DE_BOTS = process.argv.includes('--bots');
const AVEC_MC = process.argv.includes('--mc');
// La reference : le bot avec lequel on mesure. Monte-Carlo lit bien mieux les cartes,
// mais il joue environ 50 fois plus lentement — a reserver a une paire precise.
const FORT = process.argv.includes('--fort');
const REFERENCE = FORT ? 'montecarlo' : BALANCE.ai.defaut;
const paireVoulue = (process.argv.find(a => a.startsWith('--pair=')) || '').slice(7)
  || (process.argv.includes('--pair') ? process.argv[process.argv.indexOf('--pair') + 1] : '');
const valeurDe = drapeau => (process.argv.includes(drapeau) ? process.argv[process.argv.indexOf(drapeau) + 1] : '');
const FICHIER_CSV = valeurDe('--csv');
const FICHIER_LOGS = valeurDe('--logs');
const JOBS = nombreDeJobs();

const gris = t => `\x1b[90m${t}\x1b[0m`;
const vert = t => `\x1b[32m${t}\x1b[0m`;
const jaune = t => `\x1b[33m${t}\x1b[0m`;
const rouge = t => `\x1b[31m${t}\x1b[0m`;
const pc = x => (x * 100).toFixed(0) + '%';

// Les cibles (33 / 50 / 66) et leur tolerance vivent dans l'arene : la page
// d'equilibrage du builder lit exactement les memes.

/** Une case coloree : vert = sur une cible, jaune = entre deux, rouge = hors bornes. */
function caseTexte(taux) {
  const t = pc(taux).padStart(4);
  const l = lecture(taux);
  return l.ecrasant ? rouge(t) : l.dedans ? vert(t) : jaune(t);
}

// ---------------------------------------------------------------- les decks
function combinaisons(liste, n) {
  if (n === 1) return liste.map(x => [x]);
  const out = [];
  liste.forEach((x, i) => { for (const reste of combinaisons(liste.slice(i + 1), n - 1)) out.push([x, ...reste]); });
  return out;
}

const ids = CHARACTERS.map(c => c.id);
const voulus = paireVoulue ? paireVoulue.split(',').map(x => x.trim()) : null;
if (voulus) for (const id of voulus) if (!ids.includes(id)) {
  console.log(`\nPersonnage inconnu : « ${id} ». Ceux qui existent : ${ids.join(', ')}\n`);
  process.exit(1);
}
// Un deck se decrit par sa RECETTE : c'est elle qui part aux workers, qui remontent le
// camp eux-memes (un deck melange est une fabrique, et une fonction ne traverse pas un
// postMessage).
const typeDeck = MELANGE ? 'mix' : COTE === 'switches' ? 'switch' : 'base';
const decks = (voulus ? voulus.map(id => [id]) : TRIO ? combinaisons(ids, 3) : ids.map(id => [id]))
  .map(equipe => {
    const recette = { type: typeDeck, ids: equipe, niveau: NIVEAU };
    return { ids: equipe, nom: equipe.map(id => CHARACTERS.find(c => c.id === id).name).join('+'), recette, cfg: camp(recette) };
  });

// Les adversaires du jeu entrent dans la matrice comme n'importe quel deck : c'est la
// seule facon de savoir si une rencontre est a sa place.
if (process.argv.includes('--pnj')) {
  for (const n of CHARACTER_DATA.npcs || []) {
    const recette = { type: 'pnj', ids: [n.id] };
    const cfg = camp(recette);
    if (cfg) decks.push({ ids: [n.id], nom: n.name.split(' ')[0], recette, cfg });
  }
}

// ------------------------------------------------------- duel de bots (option)
if (DUEL_DE_BOTS) {
  console.log(`\nDeux niveaux de bot sur les memes decks — ${PARTIES} parties par paire, niveau ${NIVEAU}.`);
  console.log(gris('Le meme deck des deux cotes : tout ecart au-dessus de 50 % vient du bot, pas des cartes.\n'));
  // Le niveau qui cherche joue ~50 fois plus lentement : on ne l'inclut que si on le
  // demande (--mc), et sur bien moins de parties.
  const niveaux = Object.keys(BALANCE.ai.niveaux).filter(n => AVEC_MC || !BALANCE.ai.niveaux[n].rollouts);
  for (const fort of niveaux) {
    for (const faible of niveaux) {
      if (fort === faible) continue;
      const cherche = BALANCE.ai.niveaux[fort].rollouts || BALANCE.ai.niveaux[faible].rollouts;
      const n = cherche ? Math.max(3, Math.round(PARTIES / 20)) : PARTIES;
      let gagnees = 0, total = 0;
      for (const d of decks) {
        for (let i = 0; i < n; i++) {
          // On alterne qui commence : celui qui ouvre a un avantage reel.
          const aGauche = i % 2 === 0;
          const { winner } = duel(d.cfg, d.cfg, aGauche ? { p: fort, e: faible } : { p: faible, e: fort });
          if (winner === 'stuck' || winner === 'draw') continue;
          total++;
          if ((aGauche && winner === 'p') || (!aGauche && winner === 'e')) gagnees++;
        }
      }
      const taux = total ? gagnees / total : 0.5;
      const { demi } = wilson(taux, total);
      console.log(`  ${fort.padEnd(7)} contre ${faible.padEnd(7)} : ${pc(taux).padStart(4)} ± ${pc(demi)}  (${total} parties)`);
    }
  }
  console.log('');
  process.exit(0);
}

// ---------------------------------------------------------------- la matrice
const quoi = MELANGE ? 'decks melanges base/switch' : COTE === 'switches' ? 'decks tout-switch' : 'decks de base';
console.log(`\nMatchups — ${PARTIES} parties par paire, niveau ${NIVEAU}, ${quoi}, bot « ${REFERENCE} », ${JOBS} en parallele.`);
if (MELANGE) console.log(gris('Chaque partie retire un slot sur deux : le taux est la moyenne sur tous les decks montables.'));
if (FORT) console.log(gris('Reference Monte-Carlo : lente, mais elle joue les cartes pour ce qu\'elles valent.'));
console.log(gris('Chaque case : victoires de la LIGNE contre la COLONNE. Moitie des parties en commencant, moitie en subissant.\n'));

const largeur = Math.max(...decks.map(d => d.nom.length)) + 1;
const entete = ' '.repeat(largeur) + '| ' + decks.map(d => (TRIO ? d.nom.slice(0, 6) : d.nom).padEnd(7)).join('');
console.log(entete);
console.log(gris('-'.repeat(entete.length - 10)));

// Une tache par case. Elles partent sur tous les coeurs et reviennent DANS L'ORDRE : une
// ligne s'affiche des que sa derniere case est jouee, comme avant la parallelisation.
const debut = Date.now();
const taches = decks.flatMap((a, i) => decks.map((b, j) => ({ i, j, parties: PARTIES, bot: REFERENCE })));
const resultats = [];
let avantagePremier = 0, casesMesurees = 0, bloquees = 0;
let ligne = [];
await enParallele(taches, new URL('./lib/taches-matchups.mjs', import.meta.url), {
  jobs: JOBS, unite: 'cases',
  contexte: { recettes: decks.map(d => d.recette) },
  surResultat: (k, r) => {
    const a = decks[taches[k].i], b = decks[taches[k].j];
    const w = wilson(r.taux, r.parties - r.nulles - r.bloquees);
    resultats.push({ a, b, ...r, demi: w.demi });
    avantagePremier += r.avantagePremier;
    casesMesurees++;
    bloquees += r.bloquees;
    ligne.push(caseTexte(r.taux).padEnd(16));
    if (taches[k].j === decks.length - 1) {
      console.log(a.nom.padEnd(largeur) + '| ' + ligne.join(''));
      ligne = [];
    }
  }
});
console.log(gris(`\n  ${taches.length} cases en ${Math.round((Date.now() - debut) / 1000)} s.`));

// Les exports : le CSV pour croiser les chiffres, les journaux pour comprendre.
const meta = { niveau: NIVEAU, parties_par_case: PARTIES, bot: REFERENCE, decks: quoi };
if (FICHIER_CSV) {
  writeFileSync(FICHIER_CSV, '﻿' + matriceCsv(resultats, d => d.nom, meta), 'utf8');
  console.log(gris(`\n  Matrice ecrite dans ${FICHIER_CSV}`));
}
if (FICHIER_LOGS) {
  writeFileSync(FICHIER_LOGS, journauxTexte(resultats, d => d.nom, meta), 'utf8');
  console.log(gris(`  Journaux ecrits dans ${FICHIER_LOGS}`));
}

const demiMoyen = resultats.reduce((s, r) => s + r.demi, 0) / resultats.length;
console.log(gris(`\n  Precision : ±${pc(demiMoyen)} par case (Wilson 95 %). Un ecart plus petit que ca ne veut rien dire.`));
console.log(gris(`  Avantage de celui qui commence : ${pc(avantagePremier / casesMesurees)} (50 % = aucun avantage).`));
if (bloquees) console.log(rouge(`  ${bloquees} partie(s) bloquee(s) : le moteur tourne en rond quelque part.`));

// ---------------------------------------------------------------- lectures
console.log('\n  Lecture des matchups (hors miroirs) :\n');
const horsMiroir = resultats.filter(r => r.a !== r.b);
const ecrases = horsMiroir.filter(r => lecture(r.taux).ecrasant);
const cibles = {};
for (const c of CIBLES) cibles[c.nom] = 0;
let hors = 0;
for (const r of horsMiroir) {
  const l = lecture(r.taux);
  if (!l.ecrasant && l.dedans) cibles[l.cible.nom]++; else hors++;
}
const surCible = CIBLES.reduce((a, c) => a + cibles[c.nom], 0);
console.log(`    ${vert('sur une cible')} (33 / 50 / 66 ± ${pc(TOLERANCE)}) : ${surCible} / ${horsMiroir.length}`);
console.log(`      ${CIBLES.map(c => `${cibles[c.nom]} ${c.nom}`).join(', ')}`);
console.log(`    ${jaune('entre deux cibles')} ou ${rouge('hors bornes')} : ${hors}`);

if (ecrases.length) {
  console.log(rouge(`\n    ${ecrases.length} matchup(s) ecrasant(s) — c'est la que l'equilibrage se joue :`));
  for (const r of ecrases.sort((x, y) => y.taux - x.taux).slice(0, 12)) {
    console.log(`      ${r.a.nom} bat ${r.b.nom} ${pc(r.taux)} ± ${pc(r.demi)}`);
  }
}

// Un deck qui gagne partout (ou nulle part) : c'est lui qu'il faut toucher en premier.
console.log('\n  Force globale de chaque deck (moyenne de ses matchups) :\n');
const forces = decks.map(d => {
  const siens = horsMiroir.filter(r => r.a === d);
  return { d, moyenne: siens.reduce((s, r) => s + r.taux, 0) / siens.length };
}).sort((x, y) => y.moyenne - x.moyenne);
for (const f of forces) {
  const barre = '█'.repeat(Math.round(f.moyenne * 30));
  const t = pc(f.moyenne).padStart(4);
  console.log(`    ${f.d.nom.padEnd(largeur)} ${f.moyenne > 0.6 || f.moyenne < 0.4 ? jaune(t) : vert(t)} ${gris(barre)}`);
}
console.log(gris('\n    Une cible saine : tout le monde entre 45 % et 55 % de moyenne, avec des matchups tranches en dessous.'));
console.log(gris(`    Un matchup suspect se verifie avec une meilleure reference :`));
console.log(gris(`      node scripts/matchups.mjs 20 ${NIVEAU} --pair ${forces[0].d.ids[0]},${forces[forces.length - 1].d.ids[0]} --fort\n`));
