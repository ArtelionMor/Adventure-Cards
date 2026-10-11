// Banc de test du bot : verifie qu'il VALORISE les rales d'agonie, les auras et les
// declencheurs de tour, au lieu de ne regarder que le cout des cartes.
// Le bot joue volontairement au hasard une fois sur huit (GDD), donc chaque decision
// est prise 300 fois et on regarde la tendance, pas un coup isole.
//   node scripts/test-ai.mjs
import { createBattle } from '../game/src/combat/engine.js';
import { botAction, coupsPossibles } from '../game/src/combat/ai.js';
// Monter une position, c'est jouer des cartes — et une action passe par joue(), ici
// comme ailleurs (cf. le banc du partage). Journal eteint, c'est un appel de plus.
import { joue } from '../game/src/combat/journal.js';
// La pile de fatigue est une donnee de jeu : les tests de l'appat la remplissent puis la revident.
import { CHARACTER_DATA } from '../game/data/characters.data.js';
CHARACTER_DATA.fatigue = [];

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
  for (const c of plateauJoueur) joue(B, 'p', { type: 'play', index: B.p.hand.findIndex(x => x.name === c.name), target: null });
  B.p.mana = B.p.maxMana = 10;
  return B;
}

function setup(mainJoueur, plateauAdverse = [], mana = 10) {
  const B = createBattle(side('Joueur', mainJoueur), side('Adversaire', plateauAdverse), {});
  B.e.hand = plateauAdverse.map(c => ({ ...c }));
  B.e.mana = B.e.maxMana = 10;
  for (const c of plateauAdverse) joue(B, 'e', { type: 'play', index: B.e.hand.findIndex(x => x.name === c.name), target: null });
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
// LES BRIQUES COMMUNES DE LA V3 (docs/V3-HEROS.md, 4.0). La main n'a plus de plafond : le
// bot calculait « combien de cartes tiennent encore » avec ce plafond, et aurait cru
// qu'une main sans limite n'avait plus aucune place — il ne piochait plus rien.
console.log('\nUne main sans plafond');

tendance('une main de dix cartes n\'empeche pas de piocher',
  () => setup([
    sort('Pioche', [{ op: 'draw', v: 2 }]),
    sort('Rien', []),
    ...Array.from({ length: 10 }, (_, i) => ally('Gros' + i, 5, 5, { cost: 9 }))
  ], [], 2),
  (B, a) => carteJouee(B, a) === 'Pioche');

tendance('et ne cree pas dans le vide non plus',
  () => setup([
    sort('Cree', [{ op: 'cree', choix: 'precise', carte: 'grunt1', n: 2, lvl: 1 }]),
    sort('Rien', []),
    ...Array.from({ length: 10 }, (_, i) => ally('Gros' + i, 5, 5, { cost: 9 }))
  ], [], 2),
  (B, a) => carteJouee(B, a) === 'Cree');

// Une meule ne gagne rien a elle seule : une carte meulee change de paquet, elle n'est
// ni gagnee ni perdue. Le bot ne la paie pas — il preferera un allie.
tendance('ne paie pas une meule seule',
  () => setup([
    sort('Meule', [{ op: 'met_a_la_defausse', d_ou: 'pioche', qui: 'toi', quoi: 'all', ordre: 'dessus', n: 2 }]),
    ally('Banal', 2, 2)
  ], [], 2),
  (B, a) => carteJouee(B, a) === 'Banal');

// Faire defausser l'adversaire, lui, lui coute une carte : c'est un gain.
tendance('prefere faire defausser l\'adversaire a ne rien faire',
  () => {
    const B = setup([
      sort('Defausse', [{ op: 'met_a_la_defausse', d_ou: 'main', qui: 'adversaire', quoi: 'all', ordre: 'hasard', n: 1 }]),
      sort('Rien', [])
    ], [ally('Reste', 1, 1)], 2);
    B.e.hand = [ally('Carte1', 1, 1), ally('Carte2', 1, 1)];
    return B;
  },
  (B, a) => carteJouee(B, a) === 'Defausse');

// ---------------------------------------------------------------------------
// LA REPRISE. Un sort a Reprise de la defausse est un coup comme un autre — et gratuit en
// cartes. Le bot doit le VOIR (la liste des coups, le Monte-Carlo) et le JOUER quand c'est le
// meilleur coup, sans jamais en inventer un pour un sort qui n'a pas le mot-cle.
console.log('\nLa Reprise');

function verifie(label, ok) {
  console.log((ok ? '  ok   ' : '  FAIL ') + label);
  ok ? pass++ : fail++;
}

const eclairReprise = () => ({ id: 'EclairR', name: 'EclairR', type: 'spell', cost: 2, keys: ['reprise'], text: '', tiers: [],
  play: [{ op: 'dmg', t: 'enemyUnit', v: 3 }] });
const avecDefausse = (reprise, main = []) => () => {
  const B = setup(main, [ally('Cible', 1, 3)]);
  B.p.discard = [reprise];
  return B;
};

{
  const B = avecDefausse(eclairReprise())();
  const coups = coupsPossibles(B, 'p');
  verifie('la liste des coups contient la reprise',
    coups.some(c => c.type === 'play' && c.zone === 'defausse' && c.index === 0));
  const sans = avecDefausse({ ...eclairReprise(), keys: [] })();
  verifie('mais pas un sort sans le mot-cle', !coupsPossibles(sans, 'p').some(c => c.zone === 'defausse'));
}

tendance('joue la reprise quand c\'est le seul bon coup',
  avecDefausse(eclairReprise(), [sort('Rien', [])]),
  (B, a) => a && a.type === 'play' && a.zone === 'defausse' && cibleVisee(B, a) === 'Cible');

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

// ---------------------------------------------------------------------------
// CHAROGNE ET APPAT (docs/V3-HEROS.md, 4.3 et 4.3 bis). Une Charogne vaut ce qu'elle va MANGER :
// les dernieres cartes de la defausse adverse (+2 par carte, plus les mots-cles d'allies), zero si
// elle est vide. Un appat vaut un repas a venir — et RIEN s'il n'y a aucune Charogne a nourrir.
console.log('\nCharogne et Appat');
const charogne = n => ({ op: 'charogne', n, t: 'self' });
const appat = n => ({ op: 'appat', n });
/** Meme stats, meme cout : seule la Charogne distingue le gourmand du banal. */
const gourmand = (play, cout = 3) => ally('Gourmand', 2, 2, { cost: cout, play });

tendance('prefere la Charogne qui a de quoi manger a un corps identique',
  () => {
    const B = setup([ally('Banal', 2, 2, { cost: 3 }), gourmand([charogne(3)])], [], 3);
    B.e.discard = [ally('Mort1', 3, 3, { keys: ['Taunt'] }), ally('Mort2', 2, 2), ally('Mort3', 1, 1)];
    return B;
  },
  (B, a) => carteJouee(B, a) === 'Gourmand');

tendance('un appat nourrit une Charogne qui attend en main',
  () => {
    CHARACTER_DATA.fatigue = [{ card: 'grunt1', n: 1, lvl: 1 }];
    // L'allie qui fait l'appat et une Charogne trop chere pour ce tour : le bot voit qu'il la nourrit.
    const B = setup([ally('Banal', 2, 2, { cost: 3 }), ally('Pie', 2, 2, { cost: 3, play: [appat(2)] }),
      ally('Colosse', 5, 5, { cost: 9, play: [charogne(5)] })], [], 3);
    return B;
  },
  (B, a) => { CHARACTER_DATA.fatigue = []; return carteJouee(B, a) === 'Pie'; });

tendance('mais un appat sans aucune Charogne a nourrir ne vaut rien : il joue le corps le plus fort',
  () => {
    CHARACTER_DATA.fatigue = [{ card: 'grunt1', n: 1, lvl: 1 }];
    return setup([ally('Pie', 2, 2, { cost: 3, play: [appat(2)] }), ally('Costaud', 3, 3, { cost: 3 })], [], 3);
  },
  (B, a) => { CHARACTER_DATA.fatigue = []; return carteJouee(B, a) === 'Costaud'; });

tendance('« appat puis Charogne » vaut ce que l appat lui fabrique, meme sur une defausse vide',
  () => {
    CHARACTER_DATA.fatigue = [{ card: 'grunt1', n: 1, lvl: 1 }];
    return setup([ally('Banal', 2, 2, { cost: 3 }), gourmand([appat(1), charogne(2)])], [], 3);
  },
  (B, a) => { CHARACTER_DATA.fatigue = []; return carteJouee(B, a) === 'Gourmand'; });

// ---------------------------------------------------------------------------
// LE PISTAGE (docs/V3-HEROS.md, 4.1). Le bot « joue tout » : sans le prix des punitions, il paierait 5 PV pour un
// 1/1 pistee, et Patou serait trop fort contre lui. Une carte pistee se joue pour ce qu'elle vaut MOINS ce que
// l'adversaire a en reserve ; et une marque se pose quand il y a de quoi la punir ou la taxer.
console.log('\nLe pistage');
const punisseur = (v = 5) => ally('Berger', 1, 5, { cost: 1, on_pistee_foe: [{ op: 'dmg', t: 'enemyHero', v }] });

tendance('ne paie pas 5 PV pour jouer une carte pistee : il joue la libre',
  () => setup([{ ...ally('Pistee', 2, 2, { cost: 3 }), pistee: true }, ally('Libre', 1, 1, { cost: 3 })], [punisseur(5)], 3),
  (B, a) => carteJouee(B, a) === 'Libre');

tendance('et sans punition en face, la carte pistee se joue comme une autre (la meilleure)',
  () => setup([{ ...ally('Pistee', 2, 2, { cost: 3 }), pistee: true }, ally('Libre', 1, 1, { cost: 3 })], [], 3),
  (B, a) => carteJouee(B, a) === 'Pistee');

tendance('une marque vaut quelque chose quand la main adverse a de quoi etre pistee',
  () => {
    const B = setup([ally('Pisteur', 1, 1, { cost: 2, play: [{ op: 'piste', n: 1 }] }), ally('Banal', 1, 1, { cost: 2 })], [], 2);
    B.e.hand = [ally('Cible1', 1, 1), ally('Cible2', 1, 1)];
    return B;
  },
  (B, a) => carteJouee(B, a) === 'Pisteur');

// ---------------------------------------------------------------------------
// LA TOXINE (docs/V3-HEROS.md, 4.4). Une unite qui meurt de sa Toxine avant d'agir ne vaut plus un coup ; un
// poseur de marqueurs vaut ce que les marqueurs prendront.
console.log('\nLa Toxine');

tendance('ne frappe pas l unite que sa Toxine va tuer : il en choisit une autre',
  () => {
    const B = plateaux([], [ally('Frappeur', 5, 5, { cost: 1, keys: ['Charge'] })],
      [ally('Condamnee', 4, 1, { cost: 1, keys: ['Taunt'] }), ally('Normale', 1, 2, { cost: 1, keys: ['Taunt'] })]);
    B.e.board.find(u => u.name === 'Condamnee').tox = 1;
    B.p.board[0].canAttack = true;
    return B;
  },
  (B, a) => a && a.type === 'attack' && cibleVisee(B, a) === 'Normale');

tendance('prefere un Dard empoisonne a un petit corps, quand il y a un gros plateau adverse',
  () => setup([sort('Dard', [{ op: 'toxine', t: 'enemyUnit', v: 3 }], 3), ally('Petit', 1, 1, { cost: 3 })],
    [ally('Colosse', 5, 5)], 3),
  (B, a) => carteJouee(B, a) === 'Dard');

tendance('et ne paie pas une Contagion quand personne ne porte de Toxine',
  () => setup([sort('Cont', [{ op: 'contagion', v: 1, dmg: 0 }], 3), ally('Petit', 1, 1, { cost: 3 })], [ally('Colosse', 5, 5)], 3),
  (B, a) => carteJouee(B, a) === 'Petit');

// ---------------------------------------------------------------------------
// EX-LIBRIS ET LA PILE DE FATIGUE PAR CAMP (docs/V3-HEROS.md, 4.5). Une carte qui tire dans la pile ne vaut que
// ce que la pile contient — celle du CAMP, vide par defaut.
console.log('\nEx-libris et la pile de fatigue');

tendance('ne paie pas un Index quand sa pile de fatigue est vide',
  () => {
    CHARACTER_DATA.fatigue = [];
    return setup([sort('Index', [{ op: 'cree', choix: 'fatigue', n: 1, atk: 2, hp: 2 }], 3), ally('Petit', 1, 1, { cost: 3 })], [ally('Colosse', 5, 5)], 3);
  },
  (B, a) => carteJouee(B, a) === 'Petit');

tendance('mais en joue un quand la pile a de quoi donner',
  () => {
    CHARACTER_DATA.fatigue = [{ card: 'grunt1', n: 1, lvl: 1 }];
    return setup([sort('Index', [{ op: 'cree', choix: 'fatigue', n: 1, atk: 2, hp: 2 }], 3), ally('Petit', 1, 1, { cost: 3 })], [ally('Colosse', 5, 5)], 3);
  },
  (B, a) => { CHARACTER_DATA.fatigue = []; return carteJouee(B, a) === 'Index'; });

console.log(`\n${pass} test(s) passe(s), ${fail} echec(s).`);
process.exit(fail ? 1 : 0);
