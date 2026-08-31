// Banc de test du bot : verifie qu'il VALORISE les rales d'agonie, les auras et les
// declencheurs de tour, au lieu de ne regarder que le cout des cartes.
// Le bot joue volontairement au hasard une fois sur huit (GDD), donc chaque decision
// est prise 300 fois et on regarde la tendance, pas un coup isole.
//   node scripts/test-ai.mjs
import { createBattle, playCard } from '../game/src/combat/engine.js';
import { botAction } from '../game/src/combat/ai.js';

let pass = 0, fail = 0;
const TIRAGES = 300;
const SEUIL = 0.7;   // le bon choix doit sortir au moins 70% du temps

function tendance(label, fabrique, bon) {
  let ok = 0;
  for (let i = 0; i < TIRAGES; i++) {
    const B = fabrique();
    const a = botAction(B, 'p');
    if (bon(B, a)) ok++;
  }
  const taux = ok / TIRAGES;
  const reussi = taux >= SEUIL;
  console.log((reussi ? '  ok   ' : '  FAIL ') + label + `  (${Math.round(taux * 100)}%)`);
  reussi ? pass++ : fail++;
}

const ally = (name, atk, hp, extra = {}) =>
  ({ id: name, name, type: 'ally', cost: 2, atk, hp, keys: [], text: '', play: [], tiers: [], ...extra });
const sort = (name, effects, cost = 2) =>
  ({ id: name, name, type: 'spell', cost, keys: [], text: '', tiers: [], play: effects });

const filler = n => Array.from({ length: n }, (_, i) => ally('Vide' + i, 0, 1));
const side = (name, cards) => ({ name, sprite: '', hp: 30, mana: 10, hand: 1, deck: [...cards, ...filler(8)] });

function setup(mainJoueur, plateauAdverse = []) {
  const B = createBattle(side('Joueur', mainJoueur), side('Adversaire', plateauAdverse), {});
  B.e.hand = plateauAdverse.map(c => ({ ...c }));
  B.e.mana = B.e.maxMana = 10;
  for (const c of plateauAdverse) playCard(B, 'e', B.e.hand.findIndex(x => x.name === c.name), null);
  B.p.hand = mainJoueur.map(c => ({ ...c }));
  B.p.mana = B.p.maxMana = 10;
  B.turn = 'p';
  return B;
}
const carteJouee = (B, a) => (a && a.type === 'play') ? B.p.hand[a.index].name : null;
const cibleVisee = (B, a) => {
  if (!a || !a.target || a.target.uid === 'hero') return null;
  return B[a.target.side].board.find(u => u.uid === a.target.uid)?.name || null;
};

// ---------------------------------------------------------------------------
console.log('\nChoix de la carte a poser (stats identiques, meme cout)');

tendance('prefere l\'allie qui laisse un rale d\'agonie',
  () => setup([
    ally('Banal', 2, 2),
    ally('Kamikaze', 2, 2, { death: [{ op: 'dmg', t: 'enemyHero', v: 4 }] })
  ]),
  (B, a) => carteJouee(B, a) === 'Kamikaze');

tendance('prefere l\'allie a declencheur de tour',
  () => setup([
    ally('Banal', 2, 2),
    ally('Forge', 2, 2, { turnEnd: [{ op: 'dmg', t: 'enemyHero', v: 2 }] })
  ]),
  (B, a) => carteJouee(B, a) === 'Forge');

tendance('prefere le porteur d\'aura quand il y a du monde a buffer',
  () => {
    const B = setup([
      ally('Banal', 3, 3),
      ally('Etendard', 2, 2, { aura: { atk: 2, scope: 'otherAllies' } })
    ]);
    // Deux allies deja en place : l'aura vaut alors bien plus que 1 attaque de plus.
    B.p.board.push(...[1, 2].map(i => ({
      uid: 'x' + i, name: 'Piou' + i, baseAtk: 1, baseHp: 1, baseKeys: [], damage: 0,
      atk: 1, hp: 1, maxHp: 1, keys: [], canAttack: false, attackedThisTurn: false,
      death: [], turnStart: [], turnEnd: [], aura: null
    })));
    return B;
  },
  (B, a) => carteJouee(B, a) === 'Etendard');

tendance('ne surestime pas une mecanique pas encore codee',
  () => setup([
    ally('Solide', 3, 3),
    ally('Fantome', 1, 1, { death: [{ op: 'mecanique_inexistante', v: 9 }] })
  ]),
  (B, a) => carteJouee(B, a) === 'Solide');

tendance('valorise le jeton invoque pour ce qu il sait faire, pas pour ses stats',
  () => setup([
    sort('Pierres', [{ op: 'summon', n: 1, unit: { name: 'Caillou', atk: 2, hp: 2 } }]),
    sort('Meute', [{ op: 'summon', n: 1, unit: { name: 'Molosse', atk: 2, hp: 2, keys: ['Taunt'], death: [{ op: 'dmg', t: 'enemyHero', v: 4 }] } }])
  ]),
  (B, a) => carteJouee(B, a) === 'Meute');

// ---------------------------------------------------------------------------
console.log('\nChoix de la cible a abattre');

tendance('vise le porteur d\'aura adverse en priorite',
  () => setup([sort('Frappe', [{ op: 'dmg', t: 'enemyUnit', v: 3 }])], [
    ally('Piou', 2, 2),
    ally('Chef', 2, 2, { aura: { atk: 2, scope: 'otherAllies' } })
  ]),
  (B, a) => cibleVisee(B, a) === 'Chef');

tendance('vise le moteur recurrent adverse en priorite',
  () => setup([sort('Frappe', [{ op: 'dmg', t: 'enemyUnit', v: 3 }])], [
    ally('Piou', 2, 2),
    ally('Puits', 2, 2, { turnStart: [{ op: 'draw', v: 2 }] })
  ]),
  (B, a) => cibleVisee(B, a) === 'Puits');

tendance('evite de declencher un gros rale adverse',
  () => setup([sort('Frappe', [{ op: 'dmg', t: 'enemyUnit', v: 3 }])], [
    ally('Inoffensif', 2, 2),
    ally('Piege', 2, 2, { death: [{ op: 'dmg', t: 'enemyHero', v: 6 }] })
  ]),
  (B, a) => cibleVisee(B, a) === 'Inoffensif');

console.log(`\n${pass} test(s) passe(s), ${fail} echec(s).`);
process.exit(fail ? 1 : 0);
