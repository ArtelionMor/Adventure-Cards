// LA COURBE DE DIFFICULTE. Le bot joue contre lui-meme sur toutes les rencontres du
// monde, et on regarde ou ca casse.
//
// On ne teste plus une equipe figee : en jeu, le joueur monte l'equipe qu'il veut. On
// essaie donc TOUTES LES COMBINAISONS de heros a la taille prevue par le palier, et
// c'est la PIRE qui dit si une rencontre est un mur — pas la moyenne, qui masquerait
// qu'une seule equipe passe. La meilleure, elle, dit si le combat est gagne d'avance.
//
// Les paliers (combien de heros face a quelle rencontre, a quel niveau) sont du GAME
// CONFIG : ils vivent dans `BALANCE.simulation`, pas ici.
//   node scripts/simulate.mjs [parties par combinaison] [options]
//     --paliers 1,2,3     combien de heros par palier, en surchargeant la config
//     --csv fichier.csv   une ligne par combinaison, pour croiser dans un tableur
import { writeFileSync } from 'node:fs';
import { CHARACTERS, CHAR_BY_ID, resolveCard } from '../game/src/config/characters.js';
import { ENCOUNTERS } from '../game/src/config/world.js';
import { BALANCE } from '../game/src/config/balance.js';
import { createBattle, playCard, attack, endTurn } from '../game/src/combat/engine.js';
import { botAction } from '../game/src/combat/ai.js';
import { pendingMechanics } from '../game/src/config/mechanics.js';

// ---------------------------------------------------------------- arguments
const args = process.argv.slice(2);
const valeur = (nom, def) => { const i = args.indexOf('--' + nom); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const positionnel = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));

const RUNS = Number(positionnel) || BALANCE.simulation.parties;
const fichierCsv = valeur('csv', null);
// « --paliers 1,2,3 » remplace le nombre de heros de chaque palier sans toucher au reste.
const surcharge = valeur('paliers', '').split(',').filter(Boolean).map(Number);
const PALIERS = BALANCE.simulation.paliers.map((p, i) => ({ ...p, heros: surcharge[i] || p.heros }));

// ------------------------------------------------------------------ les camps
function playerSide(teamIds, level) {
  const chars = teamIds.map(id => CHAR_BY_ID[id]);
  const deck = teamIds.flatMap(id =>
    CHAR_BY_ID[id].cards.map(c => ({ ...resolveCard(c, level), sprite: CHAR_BY_ID[id].sprite })));
  return {
    name: chars.map(c => c.name).join('&'),
    sprite: chars[0].sprite,
    hp: chars.reduce((a, c) => a + c.stats.hp, 0),
    mana: Math.max(...chars.map(c => c.stats.mana)),
    hand: Math.max(...chars.map(c => c.stats.hand)),
    deck
  };
}

function enemySide(id) {
  const e = ENCOUNTERS[id];
  return { name: e.name, sprite: e.sprite, hp: e.hp, mana: e.mana, hand: e.hand,
           deck: e.deck.map(c => ({ ...c })) };
}

const seenPending = new Set();

function run(p, e, ia) {
  const B = createBattle(p, e);
  let guard = 0;
  while (!B.over && guard++ < 4000) {
    // La rencontre peut demander un niveau de jeu (les boss jouent serre) : la
    // simulation doit voir la meme difficulte que le joueur, sinon elle ment.
    const a = botAction(B, B.turn, B.turn === 'e' ? ia : undefined);
    if (!a || a.type === 'end') endTurn(B);
    else if (a.type === 'play') { if (!playCard(B, B.turn, a.index, a.target)) endTurn(B); }
    else if (a.type === 'attack') { if (!attack(B, B.turn, a.uid, a.target)) endTurn(B); }
  }
  for (const id of B.pending) seenPending.add(id);
  if (guard >= 4000) return 'stuck';
  return B.winner;
}

// ------------------------------------------------------- les combinaisons d'equipe
/** Toutes les equipes de `taille` heros, dans l'ordre du roster. */
function combinaisons(ids, taille) {
  if (taille <= 0 || taille > ids.length) return [];
  if (taille === 1) return ids.map(id => [id]);
  const out = [];
  for (let i = 0; i <= ids.length - taille; i++)
    for (const reste of combinaisons(ids.slice(i + 1), taille - 1)) out.push([ids[i], ...reste]);
  return out;
}

/** On en garde `max` au hasard quand il y en a trop (0 = toutes). */
function echantillon(liste, max) {
  if (!max || liste.length <= max) return liste;
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie.slice(0, max).sort();
}

// Chaque palier prend sa tranche de rencontres, dans l'ordre du monde. Le dernier
// ramasse le reste : c'est ce que veut dire `rencontres: 0`.
const encIds = Object.keys(ENCOUNTERS);
const rosterIds = CHARACTERS.map(c => c.id);
let curseur = 0;
const plan = PALIERS.map(p => {
  const combien = p.rencontres > 0 ? p.rencontres : encIds.length - curseur;
  const rencontres = encIds.slice(curseur, curseur + combien);
  curseur += combien;
  return { ...p, rencontres, equipes: echantillon(combinaisons(rosterIds, p.heros), BALANCE.simulation.equipesMax) };
}).filter(p => p.rencontres.length && p.equipes.length);

// ------------------------------------------------------------------ la mesure
const pc = x => Math.round(x * 100) + '%';
const col = (s, n) => String(s).padEnd(n);
const colD = (s, n) => String(s).padStart(n);

console.log(`\nCourbe de difficulte : ${RUNS} partie(s) par combinaison.`);
for (const p of plan) {
  console.log(`  ${p.heros} heros, niveau ${p.niveau} — ${p.rencontres.join(', ')}`
    + ` — ${p.equipes.length} combinaison(s)`);
}
const total = plan.reduce((a, p) => a + p.rencontres.length * p.equipes.length, 0);
console.log(`  ${total} case(s), ${total * RUNS} parties.\n`);

let issues = 0;
const lignes = [];   // pour le CSV : une ligne par combinaison
const large = Math.max(16, ...encIds.map(i => i.length));
console.log(col('rencontre', large) + colD('combis', 8) + colD('pire', 7) + colD('median', 8) + colD('meilleur', 10)
  + '   ' + 'la plus faible / la plus forte');
console.log('-'.repeat(large + 33 + 40));

const debut = Date.now();
for (const p of plan) {
  for (const id of p.rencontres) {
    const scores = [];
    for (const equipe of p.equipes) {
      let win = 0, stuck = 0;
      for (let i = 0; i < RUNS; i++) {
        const r = run(playerSide(equipe, p.niveau), enemySide(id), ENCOUNTERS[id].ia);
        if (r === 'p') win++;
        else if (r === 'stuck') stuck++;
      }
      if (stuck) issues++;
      const taux = win / RUNS;
      scores.push({ equipe, taux, stuck });
      lignes.push([id, ENCOUNTERS[id].name, p.heros, p.niveau,
        equipe.map(x => CHAR_BY_ID[x].name).join('&'), RUNS, win, (taux * 100).toFixed(1).replace('.', ','), stuck]);
    }
    scores.sort((a, b) => a.taux - b.taux);
    const pire = scores[0], meilleur = scores[scores.length - 1];
    const median = scores[Math.floor(scores.length / 2)];
    const nom = e => e.equipe.map(x => CHAR_BY_ID[x].name).join('&');
    console.log(col(id, large) + colD(scores.length, 8) + colD(pc(pire.taux), 7)
      + colD(pc(median.taux), 8) + colD(pc(meilleur.taux), 10)
      + '   ' + `${nom(pire)} ${pc(pire.taux)} / ${nom(meilleur)} ${pc(meilleur.taux)}`);
  }
}
console.log(`\n${Math.round((Date.now() - debut) / 1000)} s.`);

// ------------------------------------------------------------------ ce qui cloche
// UN MUR : meme la meilleure equipe ne passe pas. UN COMBAT OFFERT : meme la pire
// gagne haut la main. Les deux sont des defauts de courbe, pas des accidents.
const parRencontre = new Map();
for (const l of lignes) {
  const t = Number(String(l[7]).replace(',', '.')) / 100;
  const f = parRencontre.get(l[0]) || { min: 1, max: 0, nom: l[1] };
  f.min = Math.min(f.min, t); f.max = Math.max(f.max, t);
  parRencontre.set(l[0], f);
}
const murs = [...parRencontre].filter(([, f]) => f.max < 0.35);
const offerts = [...parRencontre].filter(([, f]) => f.min > 0.9);
if (murs.length) {
  console.log('\nMurs — meme la meilleure equipe ne passe pas :');
  for (const [id, f] of murs) console.log(`  - ${id} (${f.nom}) — au mieux ${pc(f.max)}`);
}
if (offerts.length) {
  console.log('\nCombats offerts — meme la pire equipe gagne :');
  for (const [id, f] of offerts) console.log(`  - ${id} (${f.nom}) — au pire ${pc(f.min)}`);
}
console.log(issues ? `\n${issues} case(s) bloquee(s) — le moteur boucle.` : '\nAucun blocage moteur.');

if (fichierCsv) {
  const entete = 'rencontre;nom;heros;niveau;equipe;parties;victoires;taux;bloquees';
  writeFileSync(fichierCsv, '﻿' + [entete, ...lignes.map(l => l.join(';'))].join('\n'), 'utf8');
  console.log(`\n${lignes.length} ligne(s) dans ${fichierCsv}`);
}

// Mecaniques inventees dans le Card Builder et pas encore codees : les combats
// tournent quand meme, mais ces cartes ne font rien. Voir docs/MECANIQUES-A-CODER.md.
const todo = pendingMechanics();
if (todo.length) {
  console.log(`\n${todo.length} mecanique(s) a coder :`);
  for (const m of todo) {
    const hit = seenPending.has(m.id) ? 'rencontree en combat' : 'jamais tiree dans ces parties';
    console.log(`  - ${m.id} (${m.label}) — ${hit}`);
  }
  console.log('  -> docs/MECANIQUES-A-CODER.md');
}
