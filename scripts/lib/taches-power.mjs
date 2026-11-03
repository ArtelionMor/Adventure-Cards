// UNE CASE DE LA CALIBRATION DU POWER (scripts/calibre-power.mjs) : un trio de heros au niveau `niveau` (le niveau du JEU, en
// ameliorations : celui que compte le Power, pas un palier de carte) contre un adversaire de la ligne a son niveau d'arene. Le trio
// se monte comme en jeu (`characterDeck`, cartes de base), la partie se joue comme `taches-courbe.mjs` : le joueur commence, le bot
// joue son niveau, l'adversaire le sien. Jouable dans un worker de `scripts/lib/pool.mjs` ; le resultat voyage en JSON.
import { CHAR_BY_ID, characterDeck, pvDeLEquipe } from '../../game/src/config/characters.js';
import { ENCOUNTERS } from '../../game/src/config/world.js';
import { coteEnnemi } from '../../game/src/config/ennemis.js';
import { createBattle } from '../../game/src/combat/engine.js';
import { joue as joueLeCoup } from '../../game/src/combat/journal.js';
import { botAction } from '../../game/src/combat/ai.js';

function cotePuissance(equipe, niveau) {
  const save = { chars: Object.fromEntries(equipe.map(id => [id, { level: niveau, switches: [false, false, false, false, false] }])) };
  const chars = equipe.map(id => CHAR_BY_ID[id]);
  return {
    name: chars.map(c => c.name).join('&'),
    sprite: chars[0].sprite,
    hp: pvDeLEquipe(chars),
    mana: Math.max(...chars.map(c => c.stats.mana)),
    hand: Math.max(...chars.map(c => c.stats.hand)),
    deck: equipe.flatMap(id => characterDeck(id, save))
  };
}

function coteAdverse(id, niveau) {
  const e = niveau > 1 ? { ...ENCOUNTERS[id], ...coteEnnemi(id, niveau) } : ENCOUNTERS[id];
  return { name: e.name, sprite: e.sprite, hp: e.hp, mana: e.mana, hand: e.hand, startArmor: e.startArmor || 0, startMana: e.startMana || 0, deck: e.deck.map(c => ({ ...c })) };
}

function partie(p, e, ia) {
  const B = createBattle(p, e);
  let garde = 0;
  while (!B.over && garde++ < 4000) {
    const k = B.turn;
    const a = botAction(B, k, k === 'e' ? ia : undefined);
    if (!joueLeCoup(B, k, a, 'bot')) joueLeCoup(B, k, { type: 'end' }, 'bot');
  }
  return garde >= 4000 ? 'stuck' : B.winner;
}

/** `runs` parties d'un trio (niveau `niveau`) contre `rencontre` au niveau d'arene `arene`. */
export function joue({ equipe, rencontre, niveau, arene, runs }) {
  let win = 0, stuck = 0;
  for (let i = 0; i < runs; i++) {
    const r = partie(cotePuissance(equipe, niveau), coteAdverse(rencontre, arene), ENCOUNTERS[rencontre].ia);
    if (r === 'p') win++;
    else if (r === 'stuck') stuck++;
  }
  return { win, stuck };
}
