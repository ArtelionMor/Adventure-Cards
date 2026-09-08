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

/** Comme setup(), mais avec des unites deja posees des DEUX cotes. */
function plateaux(mainJoueur, plateauJoueur, plateauAdverse) {
  const B = setup([...plateauJoueur, ...mainJoueur], plateauAdverse);
  for (const c of plateauJoueur) playCard(B, 'p', B.p.hand.findIndex(x => x.name === c.name), null);
  B.p.mana = B.p.maxMana = 10;
  return B;
}

function setup(mainJoueur, plateauAdverse = [], mana = 10) {
  const B = createBattle(side('Joueur', mainJoueur), side('Adversaire', plateauAdverse), {});
  B.e.hand = plateauAdverse.map(c => ({ ...c }));
  B.e.mana = B.e.maxMana = 10;
  for (const c of plateauAdverse) playCard(B, 'e', B.e.hand.findIndex(x => x.name === c.name), null);
  B.p.hand = mainJoueur.map(c => ({ ...c }));
  B.p.mana = B.p.maxMana = mana;
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

// ---------------------------------------------------------------------------
console.log('\nDestruction');

tendance('detruit la plus grosse menace, pas la plus entamee',
  () => setup([sort('Desintegration', [{ op: 'detruit', t: 'enemyUnit' }])], [
    ally('Rat', 1, 1),
    ally('Colosse', 8, 8)
  ]),
  (B, a) => cibleVisee(B, a) === 'Colosse');

tendance('lance la destruction totale quand c est l adversaire qui perd le plus',
  () => plateaux([sort('Cataclysme', [{ op: 'detruit', t: 'allEnemyUnits' }, { op: 'detruit', t: 'allAllies' }])],
    [ally('Bebe', 1, 1, { keys: ['Charge'] })], [ally('Colosse', 8, 8)]),
  (B, a) => carteJouee(B, a) === 'Cataclysme');

tendance('mais ne se rase pas son propre plateau pour rien',
  () => plateaux([sort('Cataclysme', [{ op: 'detruit', t: 'allEnemyUnits' }, { op: 'detruit', t: 'allAllies' }])],
    [ally('Colosse', 8, 8, { keys: ['Charge'] })], [ally('Bebe', 1, 1)]),
  (B, a) => carteJouee(B, a) !== 'Cataclysme');

// ---------------------------------------------------------------------------
console.log('\nEffets statiques');

tendance('prefere l allie qui allege toute la main',
  () => setup([
    ally('Banal', 2, 2),
    ally('Mecene', 2, 2, { statics: [{ op: 'cout_des_cartes', qui: 'toi', quoi: 'all', sens: 'moins', v: 2 }] })
  ]),
  (B, a) => carteJouee(B, a) === 'Mecene');

tendance('ne joue pas un effet statique qui profite a l adversaire',
  () => setup([
    ally('Banal', 2, 2),
    ally('Genereux', 2, 2, { statics: [{ op: 'mana_du_tour', qui: 'adversaire', sens: 'plus', v: 3 }] })
  ]),
  (B, a) => carteJouee(B, a) === 'Banal');

tendance('vise en priorite l unite adverse qui impose un effet statique',
  () => setup([sort('Frappe', [{ op: 'dmg', t: 'enemyUnit', v: 3 }])], [
    ally('Piou', 2, 2),
    ally('Taxe', 2, 2, { statics: [{ op: 'cout_des_cartes', qui: 'adversaire', quoi: 'all', sens: 'plus', v: 2 }] })
  ]),
  (B, a) => cibleVisee(B, a) === 'Taxe');

// ---------------------------------------------------------------------------
console.log('\nLecture fine (bot « malin »)');

tendance('depense tout son mana plutot que de poser la plus grosse carte',
  () => setup([
    { ...ally('Colosse', 5, 5), cost: 5 },
    { ...ally('Frere1', 3, 3), cost: 2 },
    { ...ally('Frere2', 3, 3), cost: 2 }
  ], [], 5),
  // Deux 3/3 pour 4 mana valent mieux qu'un 5/5 pour 5 : le sac a dos les choisit,
  // et le bot pose donc un frere en premier.
  (B, a) => carteJouee(B, a) !== 'Colosse');

tendance('ne brule pas un gros retrait sur un moucheron',
  () => setup([sort('Gros Sort', [{ op: 'dmg', t: 'enemyUnit', v: 6 }]), sort('Petit Sort', [{ op: 'dmg', t: 'enemyUnit', v: 2 }])],
    [ally('Moucheron', 1, 1)]),
  (B, a) => carteJouee(B, a) === 'Petit Sort');

tendance('n envoie pas son unite mourir dans une provocation qui la mange',
  () => {
    const B = setup([], [ally('Mur', 5, 10, { keys: ['Taunt'] })]);
    // Une 2/2 a nous, prete a attaquer : la seule cible legale est le mur, qui la tue
    // sans mourir. Ne rien faire est meilleur que l'offrir.
    B.p.board.push({
      uid: 'x1', name: 'Piou', baseAtk: 2, baseHp: 2, baseKeys: [], damage: 0, printedAtk: 2, printedHp: 2,
      atk: 2, hp: 2, maxHp: 2, keys: [], canAttack: true, attackedThisTurn: false,
      death: [], turnStart: [], turnEnd: [], aura: null, statics: []
    });
    return B;
  },
  (B, a) => a.type === 'end');

// ---------------------------------------------------------------------------
console.log('\nMelanger dans la pioche');

tendance('recycle sa defausse plutot que de jouer un sort sans cible',
  () => {
    const B = setup([
      sort('Recyclage', [{ op: 'melange_a_la_pioche', qui: 'toi', d_ou: 'defausse', quoi: 'all', n: 3 }]),
      sort('Petite Frappe', [{ op: 'dmg', t: 'enemyUnit', v: 1 }])
    ]);
    // IL FAUT VRAIMENT QUELQUE CHOSE A RECYCLER. Depuis que le bot verifie la
    // faisabilite, un recyclage sur une defausse vide ne vaut rien — et il a raison :
    // sans ces cartes, les deux sorts de la main ne feraient rien du tout, et ne rien
    // jouer serait le bon coup.
    B.p.discard.push(ally('Deja mort', 2, 2), ally('Aussi', 1, 1));
    return B;
  },
  (B, a) => carteJouee(B, a) === 'Recyclage');

tendance('ne remplit pas la pioche de l adversaire par gentillesse',
  () => setup([
    ally('Banal', 2, 2),
    sort('Cadeau', [{ op: 'melange_a_la_pioche', qui: 'adversaire', d_ou: 'creee', carte: 'grunt4', n: 3 }])
  ]),
  (B, a) => carteJouee(B, a) === 'Banal');

// ---------------------------------------------------------------------------
console.log('\nAffaiblir l adversaire');

tendance('prefere affaiblir l adversaire que se renforcer a peine',
  () => {
    const B = setup([
      sort('Poison', [{ op: 'buff', t: 'enemyUnit', atk: -3, hp: -3 }]),
      sort('Souffle', [{ op: 'buff', t: 'allAllies', atk: 0, hp: 0 }])
    ], [ally('Brute', 4, 5)]);
    return B;
  },
  (B, a) => carteJouee(B, a) === 'Poison');

tendance('n offre pas de renfort a l adversaire',
  () => setup([
    ally('Banal', 2, 2),
    sort('Cadeau', [{ op: 'buff', t: 'enemyUnit', atk: 3, hp: 3 }])
  ], [ally('Brute', 4, 5)]),
  (B, a) => carteJouee(B, a) === 'Banal');

// ---------------------------------------------------------------------------
// LA COPIE EST UN ECHANGE : on gagne le corps du modele, on perd le sien. Le bot doit
// donc lire les deux cotes — et le signe s'inverse quand c'est une unite adverse
// qu'on transforme, exactement comme pour un renfort.
console.log('\nCopie');

tendance('se change volontiers en la grosse unite d en face',
  () => setup([
    ally('Banal', 2, 2),
    ally('Mimique', 1, 1, { play: [{ op: 'copie', t: 'self', d_ou: 'plateau', tm: 'enemyUnit' }] })
  ], [ally('Colosse', 6, 7)]),
  (B, a) => carteJouee(B, a) === 'Mimique');

tendance('ne se change pas en plus faible que soi',
  () => setup([
    ally('Banal', 3, 3),
    ally('Mimique', 4, 4, { play: [{ op: 'copie', t: 'self', d_ou: 'plateau', tm: 'enemyUnit' }] })
  ], [ally('Chetif', 0, 1)]),
  (B, a) => carteJouee(B, a) === 'Banal');

tendance('n offre pas un meilleur corps a l adversaire',
  () => plateaux(
    [ally('Banal', 2, 2), sort('Cadeau', [{ op: 'copie', t: 'enemyUnit', d_ou: 'plateau', tm: 'allyUnit' }])],
    [ally('Colosse', 6, 7)], [ally('Chetif', 0, 1)]),
  (B, a) => carteJouee(B, a) === 'Banal');

// ---------------------------------------------------------------------------
// Une cible sans camp ne dit pas au bot ou frapper : c'est a lui de trancher.
console.log('\nCibles sans camp');

tendance('envoie « une unite, alliee ou adverse » sur l adversaire quand ca fait mal',
  () => plateaux([sort('Coup', [{ op: 'dmg', t: 'anyUnit', v: 3 }])],
    [ally('Mien', 2, 5)], [ally('Sien', 2, 5)]),
  (B, a) => cibleVisee(B, a) === 'Sien');

tendance('et sur les siens quand ca fait du bien',
  () => plateaux([sort('Baume', [{ op: 'buff', t: 'anyUnit', atk: 2, hp: 2 }])],
    [ally('Mien', 2, 5)], [ally('Sien', 2, 5)]),
  (B, a) => cibleVisee(B, a) === 'Mien');

tendance('ne balaie pas le plateau quand il y perd plus que l adversaire',
  () => plateaux([ally('Banal', 2, 2), sort('Orage', [{ op: 'dmg', t: 'allUnits', v: 3 }])],
    [ally('Colosse', 4, 6), ally('Garde', 2, 4)], [ally('Chetif', 0, 1)]),
  (B, a) => carteJouee(B, a) === 'Banal');

// ---------------------------------------------------------------------------
// Prendre le controle, c'est un retrait ET un corps : le bot doit le voir comme tel.
console.log('\nPrendre le controle');

tendance('prefere voler le gros corps que poser un banal',
  () => setup([
    ally('Banal', 3, 3),
    sort('Captif', [{ op: 'prendre_le_controle', t: 'enemyUnit' }])
  ], [ally('Colosse', 6, 7)]),
  (B, a) => carteJouee(B, a) === 'Captif');

tendance('vole la plus genante quand il y a le choix',
  () => setup([sort('Captif', [{ op: 'prendre_le_controle', t: 'enemyUnit' }])],
    [ally('Chetif', 0, 1), ally('Colosse', 6, 7)]),
  (B, a) => cibleVisee(B, a) === 'Colosse');

// ---------------------------------------------------------------------------
// Une carte « Choisir » ne part jamais sans reponse, et la reponse est la meilleure
// des deux branches dans cette position.
console.log('\nChoisir');

tendance('prend la branche qui vaut le plus',
  () => setup([sort('Offrande', [{ op: 'choisir',
    a: { op: 'armor', v: 1 },
    b: { op: 'dmg', t: 'enemyUnit', v: 9 } }])], [ally('Brute', 4, 5)]),
  (B, a) => a && a.type === 'play' && a.choix === 'b');

tendance('et l autre quand la position a change',
  () => setup([sort('Offrande', [{ op: 'choisir',
    a: { op: 'armor', v: 8 },
    b: { op: 'dmg', t: 'enemyUnit', v: 1 } }])]),
  (B, a) => a && a.type === 'play' && a.choix === 'a');

console.log(`\n${pass} test(s) passe(s), ${fail} echec(s).`);
process.exit(fail ? 1 : 0);
