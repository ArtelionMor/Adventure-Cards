// UNE COMBINAISON DE LA COURBE DE DIFFICULTE (scripts/simulate.mjs) : une equipe de
// heros contre une rencontre du monde, jouable dans un worker de scripts/lib/pool.mjs.
//
// La partie se joue exactement comme avant la parallelisation : le joueur commence
// toujours, le bot joue son niveau par defaut, la rencontre le sien (les boss jouent
// serre) — la simulation doit voir la meme difficulte que le joueur, sinon elle ment.
import { CHAR_BY_ID, resolveCard } from '../../game/src/config/characters.js';
import { ENCOUNTERS } from '../../game/src/config/world.js';
import { createBattle, playCard, attack, endTurn } from '../../game/src/combat/engine.js';
import { botAction } from '../../game/src/combat/ai.js';

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

/** Une partie. Les mecaniques pas encore codees qu'elle a croisees vont dans `vues`. */
function run(p, e, ia, vues) {
  const B = createBattle(p, e);
  let guard = 0;
  while (!B.over && guard++ < 4000) {
    const a = botAction(B, B.turn, B.turn === 'e' ? ia : undefined);
    if (!a || a.type === 'end') endTurn(B);
    else if (a.type === 'play') { if (!playCard(B, B.turn, a.index, a.target, a.choix)) endTurn(B); }
    else if (a.type === 'attack') { if (!attack(B, B.turn, a.uid, a.target)) endTurn(B); }
  }
  for (const id of B.pending) vues.add(id);
  if (guard >= 4000) return 'stuck';
  return B.winner;
}

/** `runs` parties d'une equipe contre une rencontre. */
export function joue({ equipe, rencontre, niveau, runs }) {
  let win = 0, stuck = 0;
  const vues = new Set();
  for (let i = 0; i < runs; i++) {
    const r = run(playerSide(equipe, niveau), enemySide(rencontre), ENCOUNTERS[rencontre].ia, vues);
    if (r === 'p') win++;
    else if (r === 'stuck') stuck++;
  }
  return { win, stuck, pending: [...vues] };
}
