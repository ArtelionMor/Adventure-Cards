// Banc d'essai d'equilibrage : fait jouer le bot contre lui-meme sur toutes les
// rencontres, a plusieurs niveaux de personnage. Sert a reperer les murs et les
// combats gagnes d'avance avant de toucher au GAME CONFIG.
//   node scripts/simulate.mjs [nbParties]
import { CHARACTERS, CHAR_BY_ID, resolveCard, STARTERS } from '../game/src/config/characters.js';
import { ENCOUNTERS } from '../game/src/config/world.js';
import { createBattle, playCard, attack, endTurn } from '../game/src/combat/engine.js';
import { botAction } from '../game/src/combat/ai.js';
import { pendingMechanics } from '../game/src/config/mechanics.js';

const RUNS = Number(process.argv[2] || 200);

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

const scenarios = [
  { label: '1 perso  niv.1 ', team: [STARTERS[0]], level: 1 },
  { label: '1 perso  niv.5 ', team: [STARTERS[0]], level: 5 },
  { label: '2 persos niv.5 ', team: STARTERS.slice(0, 2), level: 5 },
  { label: '3 persos niv.8 ', team: STARTERS, level: 8 },
  { label: '3 persos niv.12', team: STARTERS, level: 12 }
];

let issues = 0;
console.log(`Simulation : ${RUNS} parties par case.\n`);
const encIds = Object.keys(ENCOUNTERS);
process.stdout.write('deck            | ' + encIds.map(i => i.padEnd(9)).join('') + '\n');
for (const s of scenarios) {
  const row = [];
  for (const id of encIds) {
    let win = 0, stuck = 0;
    for (let i = 0; i < RUNS; i++) {
      const r = run(playerSide(s.team, s.level), enemySide(id), ENCOUNTERS[id].ia);
      if (r === 'p') win++;
      else if (r === 'stuck') stuck++;
    }
    if (stuck) { issues++; row.push('BLOQUE'.padEnd(9)); }
    else row.push(((win / RUNS * 100).toFixed(0) + '%').padEnd(9));
  }
  console.log(s.label + ' | ' + row.join(''));
}
console.log(issues ? `\n${issues} case(s) bloquee(s) — le moteur boucle.` : '\nAucun blocage moteur.');

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
