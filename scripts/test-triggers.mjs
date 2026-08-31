// Banc de test des moments de carte : rale d'agonie, auras, declencheurs de tour.
// Ce sont les mecaniques les plus faciles a casser sans s'en apercevoir (une aura qui
// tombe ne doit ni "reguerir" ni retuer une unite blessee), donc elles sont testees.
// Tout passe par de vrais chemins de code : on tue avec un sort, jamais en bidouillant
// les PV a la main — sinon le test ne prouve rien sur le vrai jeu.
//   node scripts/test-triggers.mjs
import { createBattle, playCard, endTurn, attackableTargets } from '../game/src/combat/engine.js';
import { resolveCard } from '../game/src/config/characters.js';

let pass = 0, fail = 0;
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? '  ok   ' : '  FAIL ') + label + (ok ? '' : `  →  attendu ${JSON.stringify(want)}, obtenu ${JSON.stringify(got)}`));
  ok ? pass++ : fail++;
}

const ally = (name, atk, hp, extra = {}) =>
  ({ id: name, name, type: 'ally', cost: 1, atk, hp, keys: [], text: '', play: [], tiers: [], ...extra });
const frappe = v =>
  ({ id: 'f' + v, name: 'Frappe' + v, type: 'spell', cost: 1, keys: [], text: '', tiers: [], play: [{ op: 'dmg', t: 'enemyUnit', v }] });

const filler = n => Array.from({ length: n }, (_, i) => ally('Vide' + i, 0, 1));
const side = (name, cards) => ({ name, sprite: '', hp: 30, mana: 10, hand: 1, deck: [...cards, ...filler(8)] });

/** Combat ou les deux camps ont la main choisie et 10 mana. */
function setup(playerCards, enemyCards = []) {
  const B = createBattle(side('Joueur', playerCards), side('Adversaire', enemyCards), {});
  B.p.hand = playerCards.map(c => ({ ...c }));
  B.e.hand = enemyCards.map(c => ({ ...c }));
  B.p.mana = B.p.maxMana = 10;
  B.e.mana = B.e.maxMana = 10;
  return B;
}
const board = (B, k) => B[k].board.map(u => `${u.name} ${u.atk}/${u.hp}`);
const play = (B, k, name, target = null) => {
  const i = B[k].hand.findIndex(c => c.name === name);
  if (i < 0) throw new Error('carte absente de la main : ' + name);
  if (!playCard(B, k, i, target)) throw new Error('carte injouable : ' + name);
};
/** Tue une unite adverse avec un sort, comme le ferait un vrai joueur. */
const tuer = (B, tueur, cibleSide, nom) => {
  const u = B[cibleSide].board.find(x => x.name === nom);
  play(B, tueur, 'Frappe99', { side: cibleSide, uid: u.uid });
};

// ---------------------------------------------------------------------------
console.log("\nRale d'agonie");
{
  const bombe = ally('Bombe', 1, 1, { death: [{ op: 'dmg', t: 'enemyHero', v: 3 }] });
  const B = setup([bombe], [frappe(99)]);
  play(B, 'p', 'Bombe');
  const avant = B.e.hp;
  tuer(B, 'e', 'p', 'Bombe');
  check('le rale part quand l\'unite meurt', B.e.hp, avant - 3);
  check('l\'unite a quitte le plateau', board(B, 'p'), []);
}
{
  const couveuse = ally('Couveuse', 1, 1, { death: [{ op: 'summon', n: 2, unit: { name: 'Larve', atk: 1, hp: 1 } }] });
  const B = setup([couveuse], [frappe(99)]);
  play(B, 'p', 'Couveuse');
  tuer(B, 'e', 'p', 'Couveuse');
  check('un rale peut invoquer', board(B, 'p'), ['Larve 1/1', 'Larve 1/1']);
}

// ---------------------------------------------------------------------------
console.log('\nAuras');
{
  const roi = ally('Roi', 4, 5, { aura: { atk: 1, scope: 'otherAllies' } });
  const chat = ally('Chat', 1, 1);
  const B = setup([chat, roi], [frappe(99)]);
  play(B, 'p', 'Chat');
  check('avant l\'aura', board(B, 'p'), ['Chat 1/1']);
  play(B, 'p', 'Roi');
  check('l\'aura monte les autres, pas son porteur', board(B, 'p'), ['Chat 2/1', 'Roi 4/5']);
  tuer(B, 'e', 'p', 'Roi');
  check('aura retiree : le Chat revient a 1/1', board(B, 'p'), ['Chat 1/1']);
}
{
  // LE cas limite : une unite blessee dont l'aura de PV tombe et l'acheve.
  const totem = ally('Totem', 0, 3, { aura: { hp: 2, scope: 'otherAllies' } });
  const brute = ally('Brute', 2, 3);
  const B = setup([brute, totem], [frappe(3), frappe(99)]);
  play(B, 'p', 'Brute');
  play(B, 'p', 'Totem');
  check('l\'aura donne +2 PV', board(B, 'p'), ['Brute 2/5', 'Totem 0/3']);
  play(B, 'e', 'Frappe3', { side: 'p', uid: B.p.board[0].uid });
  check('Brute encaisse 3 : 5 - 3 = 2 PV', board(B, 'p'), ['Brute 2/2', 'Totem 0/3']);
  tuer(B, 'e', 'p', 'Totem');
  check('aura perdue : 3 PV max - 3 degats = 0, Brute meurt aussi', board(B, 'p'), []);
}
{
  // Meme scenario, blessure plus legere : elle doit survivre, amputee du bonus.
  const totem = ally('Totem', 0, 3, { aura: { hp: 2, scope: 'otherAllies' } });
  const brute = ally('Brute', 2, 4);
  const B = setup([brute, totem], [frappe(2), frappe(99)]);
  play(B, 'p', 'Brute');
  play(B, 'p', 'Totem');
  play(B, 'e', 'Frappe2', { side: 'p', uid: B.p.board[0].uid });
  check('Brute a 6 PV max, blessee de 2', board(B, 'p'), ['Brute 2/4', 'Totem 0/3']);
  tuer(B, 'e', 'p', 'Totem');
  check('sans l\'aura : 4 max - 2 degats = 2 PV, elle survit', board(B, 'p'), ['Brute 2/2']);
}
{
  const chef = ally('Chef', 2, 3, { aura: { key: 'Taunt', scope: 'otherAllies' } });
  const sbire = ally('Sbire', 1, 2);
  const B = setup([sbire, chef]);
  play(B, 'p', 'Sbire');
  play(B, 'p', 'Chef');
  check('l\'aura donne Provocation au Sbire', B.p.board[0].keys, ['Taunt']);
  check('mais pas a son porteur', B.p.board[1].keys, []);
}
{
  const brouillard = ally('Brouillard', 2, 4, { aura: { atk: -1, scope: 'enemyUnits' } });
  const cible = ally('Cible', 2, 3);
  const B = setup([brouillard], [cible]);
  play(B, 'e', 'Cible');
  play(B, 'p', 'Brouillard');
  check('une aura adverse peut debuffer', board(B, 'e'), ['Cible 1/3']);
}

// ---------------------------------------------------------------------------
console.log('\nDeclencheurs de tour');
{
  const puits = ally('Puits', 0, 5, { turnStart: [{ op: 'draw', v: 1 }] });
  const B = setup([puits]);
  play(B, 'p', 'Puits');
  const avant = B.p.hand.length;
  endTurn(B);   // tour adverse
  endTurn(B);   // retour au joueur
  check('debut de tour : la carte pioche', B.p.hand.length > avant, true);
}
{
  const braise = ally('Braise', 1, 3, { turnEnd: [{ op: 'dmg', t: 'enemyHero', v: 2 }] });
  const B = setup([braise]);
  play(B, 'p', 'Braise');
  const avant = B.e.hp;
  endTurn(B);
  check('fin de tour : 2 degats au heros adverse', B.e.hp, avant - 2);
}
{
  const braise = ally('Braise', 1, 3, { turnEnd: [{ op: 'dmg', t: 'enemyHero', v: 2 }] });
  const B = setup([braise], [frappe(99)]);
  play(B, 'p', 'Braise');
  tuer(B, 'e', 'p', 'Braise');
  const avant = B.e.hp;
  endTurn(B);
  check('unite morte : son declencheur ne part plus', B.e.hp, avant);
}

// ---------------------------------------------------------------------------
// La couture entre les donnees du Card Builder et le moteur : les nouveaux champs
// doivent survivre a resolveCard, et l'amplification doit toucher tous les moments.
console.log('\nDonnees du builder vers le moteur');
{
  const def = {
    id: 'x', name: 'Sentinelle', type: 'ally', cost: 3, atk: 2, hp: 3, keys: [], text: '',
    death: [{ op: 'dmg', t: 'enemyHero', v: 2 }],
    turnEnd: [{ op: 'heal', t: 'ownHero', v: 1 }],
    aura: { atk: 1, scope: 'otherAllies' },
    tiers: [{ lvl: 5, amp: 2, text: 'Effet +2' }]
  };
  const bas = resolveCard(def, 1), haut = resolveCard(def, 5);
  check('les moments traversent resolveCard', [bas.death[0].v, bas.turnEnd[0].v], [2, 1]);
  check("l'aura traverse resolveCard", bas.aura, { atk: 1, scope: 'otherAllies' });
  check("l'amplification touche le rale et la fin de tour", [haut.death[0].v, haut.turnEnd[0].v], [4, 3]);
  check("la definition d'origine n'a pas bouge", def.death[0].v, 2);

  const B = setup([{ ...bas }], [frappe(99)]);
  play(B, 'p', 'Sentinelle');
  const avant = B.e.hp;
  tuer(B, 'e', 'p', 'Sentinelle');
  check('une carte issue du builder declenche bien son rale', B.e.hp, avant - 2);
}

// ---------------------------------------------------------------------------
// Un palier doit pouvoir DEBLOQUER n'importe quel moment, pas seulement le cri de
// guerre : rale d'agonie, debut/fin de tour, aura, et ceux qui viendront.
console.log('\nPaliers qui debloquent un moment');
{
  const def = {
    id: 'y', name: 'Veilleur', type: 'ally', cost: 2, atk: 1, hp: 3, keys: [], text: '',
    play: [], death: [], turnStart: [], turnEnd: [], aura: null,
    tiers: [
      { lvl: 2, extra: { op: 'dmg', t: 'enemyHero', v: 2 }, slot: 'death', text: "Rale d'agonie : 2 degats" },
      { lvl: 4, extra: { op: 'draw', v: 1 }, slot: 'turnStart', text: 'Debut de tour : pioche 1' },
      { lvl: 6, aura: { atk: 1, scope: 'otherAllies' }, text: 'Aura : +1 attaque' },
      { lvl: 8, aura: { atk: 1, hp: 1, key: 'Taunt', scope: 'otherAllies' }, text: 'Aura renforcee' },
      { lvl: 10, extra: { op: 'heal', t: 'ownHero', v: 3 }, text: 'Cri de guerre : soigne 3' }
    ]
  };
  check('niveau 1 : aucun moment debloque',
    [resolveCard(def, 1).death.length, resolveCard(def, 1).turnStart.length, resolveCard(def, 1).aura], [0, 0, null]);
  check('niveau 2 : le rale d\'agonie apparait', resolveCard(def, 2).death, [{ op: 'dmg', t: 'enemyHero', v: 2 }]);
  check('niveau 4 : le debut de tour apparait', resolveCard(def, 4).turnStart, [{ op: 'draw', v: 1 }]);
  check('niveau 6 : l\'aura apparait', resolveCard(def, 6).aura, { scope: 'otherAllies', atk: 1, hp: 0, key: '' });
  check('niveau 8 : les paliers d\'aura se cumulent', resolveCard(def, 8).aura, { scope: 'otherAllies', atk: 2, hp: 1, key: 'Taunt' });
  check('niveau 10 : sans slot, l\'effet va au cri de guerre', resolveCard(def, 10).play, [{ op: 'heal', t: 'ownHero', v: 3 }]);
  check('la definition d\'origine reste intacte', [def.death.length, def.aura], [0, null]);

  // Et ca marche vraiment en combat, pas seulement dans les donnees.
  const B = setup([{ ...resolveCard(def, 2) }], [frappe(99)]);
  play(B, 'p', 'Veilleur');
  const avant = B.e.hp;
  tuer(B, 'e', 'p', 'Veilleur');
  check('le rale debloque par un palier part en combat', B.e.hp, avant - 2);
}
{
  // Une aura donnee par un palier doit buffer pour de vrai.
  const def = {
    id: 'z', name: 'Porte-Etendard', type: 'ally', cost: 2, atk: 1, hp: 3, keys: [], text: '',
    play: [], death: [], turnStart: [], turnEnd: [], aura: null,
    tiers: [{ lvl: 5, aura: { atk: 2, scope: 'otherAllies' }, text: 'Aura : +2 attaque' }]
  };
  const B = setup([ally('Piou', 1, 2), { ...resolveCard(def, 5) }]);
  play(B, 'p', 'Piou');
  check('avant l\'etendard', board(B, 'p'), ['Piou 1/2']);
  play(B, 'p', 'Porte-Etendard');
  check('l\'aura debloquee par le palier s\'applique', board(B, 'p'), ['Piou 3/2', 'Porte-Etendard 1/3']);
}

// ---------------------------------------------------------------------------
console.log('\nCibles automatiques');
{
  // « Elle-meme » : l'unite se renforce toute seule a chaque fin de tour.
  const gardien = ally('Gardien', 1, 4, { turnEnd: [{ op: 'buff', t: 'self', atk: 1, hp: 1 }] });
  const B = setup([gardien]);
  play(B, 'p', 'Gardien');
  check('avant', board(B, 'p'), ['Gardien 1/4']);
  endTurn(B); endTurn(B); endTurn(B);
  check('« Elle-meme » se renforce a chaque fin de tour', board(B, 'p'), ['Gardien 3/6']);
}
{
  // « Elle-meme » sur un sort : il n'y a pas de porteur, donc rien ne se passe.
  const rituel = { id: 'r', name: 'Rituel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'self', atk: 5, hp: 5 }] };
  const B = setup([ally('Piou', 1, 2), rituel]);
  play(B, 'p', 'Piou');
  play(B, 'p', 'Rituel');
  check('« Elle-meme » sur un sort ne touche personne', board(B, 'p'), ['Piou 1/2']);
}
{
  // Un allie au hasard : la cible change d'une partie a l'autre, mais c'est toujours un des notres.
  const vus = new Set();
  for (let i = 0; i < 60; i++) {
    const soin = { id: 's', name: 'Vague', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
      play: [{ op: 'buff', t: 'randomAllyUnit', atk: 5, hp: 0 }] };
    const B = setup([ally('Un', 1, 2), ally('Deux', 1, 2), soin]);
    play(B, 'p', 'Un'); play(B, 'p', 'Deux'); play(B, 'p', 'Vague');
    vus.add(B.p.board.filter(u => u.atk === 6).map(u => u.name).join());
  }
  check('« Un allie au hasard » ne touche qu\'un seul allie', [...vus].every(v => v === 'Un' || v === 'Deux'), true);
  check('... et ce n\'est pas toujours le meme', vus.size, 2);
}
{
  // Une unite adverse au hasard : jamais le heros.
  let heros = 0, unites = 0;
  for (let i = 0; i < 60; i++) {
    const trait = { id: 't', name: 'Trait', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
      play: [{ op: 'dmg', t: 'randomEnemyUnit', v: 1 }] };
    const B = setup([trait], [ally('Cible', 1, 5)]);
    play(B, 'e', 'Cible');
    const hpAvant = B.e.hp;
    play(B, 'p', 'Trait');
    if (B.e.hp < hpAvant) heros++;
    if (B.e.board[0] && B.e.board[0].hp === 4) unites++;
  }
  check('« Une unite adverse au hasard » ne vise jamais le heros', heros, 0);
  check('... et touche bien l\'unite', unites, 60);
}
{
  // Un ennemi au hasard : unite OU heros, les deux doivent sortir.
  let heros = 0, unites = 0;
  for (let i = 0; i < 120; i++) {
    const eclair = { id: 'e', name: 'Eclair', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
      play: [{ op: 'dmg', t: 'randomEnemyAny', v: 1 }] };
    const B = setup([eclair], [ally('Cible', 1, 5)]);
    play(B, 'e', 'Cible');
    const hpAvant = B.e.hp;
    play(B, 'p', 'Eclair');
    if (B.e.hp < hpAvant) heros++; else unites++;
  }
  check('« Un ennemi au hasard » touche parfois le heros', heros > 0, true);
  check('... et parfois une unite', unites > 0, true);
}
{
  // « Un allie ou ton heros, au hasard » : soigne parfois une unite, parfois le heros.
  let heros = 0, unites = 0;
  for (let i = 0; i < 120; i++) {
    const priere = { id: 'p', name: 'Priere', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
      play: [{ op: 'heal', t: 'randomAllyAny', v: 2 }] };
    const B = setup([ally('Blesse', 1, 5), priere], [frappe(3)]);
    play(B, 'p', 'Blesse');
    play(B, 'e', 'Frappe3', { side: 'p', uid: B.p.board[0].uid });   // l'unite tombe a 2 PV
    B.p.hp = B.p.maxHp - 5;                                          // et le heros est blesse aussi
    play(B, 'p', 'Priere');
    if (B.p.hp > B.p.maxHp - 5) heros++;
    if (B.p.board[0].hp > 2) unites++;
  }
  check('« Un allie ou ton heros » soigne parfois le heros', heros > 0, true);
  check('... et parfois une unite', unites > 0, true);
  check('... mais jamais les deux a la fois', heros + unites, 120);
}
{
  // Le venin ne doit pas se retourner contre son porteur quand il se blesse lui-meme.
  const serpent = ally('Serpent', 2, 5, { keys: ['Venin'], turnEnd: [{ op: 'dmg', t: 'self', v: 1 }] });
  const B = setup([serpent]);
  play(B, 'p', 'Serpent');
  endTurn(B);
  check('le venin ne tue pas son porteur qui se blesse', board(B, 'p'), ['Serpent 2/4']);
}

// ---------------------------------------------------------------------------
// Mana promis au tour suivant : il s'ajoute au mana du tour ET depasse le plafond.
console.log('\nMana au prochain tour');
{
  const promesse = { id: 'm', name: 'Promesse', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'mana_au_prochain_tour', x: 2 }] };
  const B = setup([promesse]);
  const avant = B.p.mana;
  play(B, 'p', 'Promesse');
  check('le mana promis ne tombe pas dans le tour en cours', B.p.mana, avant - 1);
  check('... il est mis de cote', B.p.nextMana, 2);
  endTurn(B);   // tour adverse
  endTurn(B);   // retour au joueur
  check('il est verse au debut du tour suivant', B.p.mana, B.p.maxMana + 2);
  check('... par-dessus le plafond de mana du personnage', B.p.mana > B.p.manaCap, true);
  check('... et une seule fois', B.p.nextMana, 0);
  endTurn(B); endTurn(B);
  check("le tour d'apres revient au mana normal", B.p.mana, B.p.maxMana);
}
{
  // Deux promesses dans le meme tour s'additionnent.
  const promesse = { id: 'm', name: 'Promesse', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'mana_au_prochain_tour', x: 2 }] };
  const B = setup([promesse, { ...promesse, id: 'm2', name: 'Promesse2' }]);
  play(B, 'p', 'Promesse');
  play(B, 'p', 'Promesse2');
  check('deux promesses se cumulent', B.p.nextMana, 4);
}

// ---------------------------------------------------------------------------
// Le mot-cle a parametre « type:X » : une etiquette que d'autres cartes vont chercher.
console.log('\nType (mot-cle a parametre)');
{
  const chef = ally('Chef', 2, 3, { keys: ['type:Chien'], aura: { scope: 'sameTypeAllies', atk: 1, hp: 1 } });
  const B = setup([ally('Chiot', 1, 1, { keys: ['type:Chien'] }), ally('Corbeau', 1, 1), chef]);
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Corbeau');
  play(B, 'p', 'Chef');
  check("l'aura « meme type » ne touche que les allies etiquetes",
    board(B, 'p'), ['Chiot 2/2', 'Corbeau 1/1', 'Chef 2/3']);
  check("les types sont derives sur l'unite", B.p.board[0].types, ['Chien']);
}
{
  // L'aura par type tombe avec son porteur, comme n'importe quelle autre.
  const chef = ally('Chef', 2, 3, { keys: ['type:Chien'], aura: { scope: 'sameTypeAllies', atk: 1, hp: 1 } });
  const B = setup([ally('Chiot', 1, 1, { keys: ['type:Chien'] }), chef], [frappe(99)]);
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Chef');
  tuer(B, 'e', 'p', 'Chef');
  check('elle tombe avec son porteur, sans tuer la meute', board(B, 'p'), ['Chiot 1/1']);
}
{
  // Cible « tes autres allies du meme type », portee par un allie etiquete.
  const rassemblement = ally('Rassemblement', 1, 1, {
    keys: ['type:Chien'],
    play: [{ op: 'buff', t: 'sameTypeAllies', atk: 1, hp: 1 }]
  });
  const B = setup([ally('Chiot', 1, 1, { keys: ['type:Chien'] }), ally('Corbeau', 1, 1), rassemblement]);
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Corbeau');
  play(B, 'p', 'Rassemblement');
  check('le renfort par type ne touche que la meute, porteur exclu',
    board(B, 'p'), ['Chiot 2/2', 'Corbeau 1/1', 'Rassemblement 1/1']);
}
{
  // Sans porteur (un sort) ou sans type, la cible ne trouve personne.
  const cri = { id: 'c', name: 'Cri', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'sameTypeAllies', atk: 5, hp: 5 }] };
  const B = setup([ally('Chiot', 1, 1, { keys: ['type:Chien'] }), cri]);
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Cri');
  check("un sort n'a pas de type : il ne renforce personne", board(B, 'p'), ['Chiot 1/1']);

  const muet = ally('Muet', 1, 1, { play: [{ op: 'buff', t: 'sameTypeAllies', atk: 5, hp: 5 }] });
  const B2 = setup([ally('Chiot', 1, 1, { keys: ['type:Chien'] }), muet]);
  play(B2, 'p', 'Chiot');
  play(B2, 'p', 'Muet');
  check('un allie sans type ne renforce personne', board(B2, 'p'), ['Chiot 1/1', 'Muet 1/1']);
}
{
  // Deux types differents ne se melangent pas.
  const chef = ally('Chef', 2, 3, { keys: ['type:Chien'], aura: { scope: 'sameTypeAllies', atk: 2, hp: 0 } });
  const B = setup([ally('Chat', 1, 1, { keys: ['type:Chat'] }), chef]);
  play(B, 'p', 'Chat');
  play(B, 'p', 'Chef');
  check("un autre type ne profite pas de l'aura", board(B, 'p'), ['Chat 1/1', 'Chef 2/3']);
}
{
  // Un type ne doit pas casser les mots-cles simples portes par la meme unite.
  const molosse = ally('Molosse', 2, 3, { keys: ['Taunt', 'type:Chien'] });
  const B = setup([molosse]);
  play(B, 'p', 'Molosse');
  const cibles = attackableTargets(B, 'e', null).map(t => t.uid);
  check("la provocation marche encore a cote d'un type", cibles, [B.p.board[0].uid]);
  check("aucune mecanique n'est signalee comme non codee", B.pending, []);
}

// ---------------------------------------------------------------------------
// Un jeton invoque est une unite comme une autre : mots-cles, type, aura et moments.
console.log('\nCapacites des jetons invoques');
{
  const invoc = (unit, n = 1) => ({ id: 'i', name: 'Invocation', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'summon', n, unit }] });
  {
    const B = setup([invoc({ name: 'Sentinelle', atk: 1, hp: 2, keys: ['Taunt'] })]);
    play(B, 'p', 'Invocation');
    const cibles = attackableTargets(B, 'e', null).map(t => t.uid);
    check('un jeton porte ses mots-cles', cibles, [B.p.board[0].uid]);
  }
  {
    const B = setup([invoc({ name: 'Chiot', atk: 1, hp: 1, keys: ['type:Chien'] }),
      ally('Chef', 2, 3, { keys: ['type:Chien'], aura: { scope: 'sameTypeAllies', atk: 1, hp: 1 } })]);
    play(B, 'p', 'Invocation');
    play(B, 'p', 'Chef');
    check("un jeton porte un type, et l'aura de meute le trouve", board(B, 'p'), ['Chiot 2/2', 'Chef 2/3']);
  }
  {
    const B = setup([invoc({ name: 'Bombe', atk: 1, hp: 1, death: [{ op: 'dmg', t: 'enemyHero', v: 3 }] })], [frappe(99)]);
    play(B, 'p', 'Invocation');
    const avant = B.e.hp;
    tuer(B, 'e', 'p', 'Bombe');
    check("le rale d'agonie d'un jeton part quand il meurt", B.e.hp, avant - 3);
  }
  {
    const B = setup([invoc({ name: 'Forge', atk: 1, hp: 4, turnEnd: [{ op: 'dmg', t: 'enemyHero', v: 2 }] })]);
    play(B, 'p', 'Invocation');
    const avant = B.e.hp;
    endTurn(B);
    check('le declencheur de tour d un jeton part aussi', B.e.hp, avant - 2);
  }
  {
    const B = setup([ally('Piou', 1, 2), invoc({ name: 'Etendard', atk: 1, hp: 1, aura: { scope: 'otherAllies', atk: 2 } })]);
    play(B, 'p', 'Piou');
    play(B, 'p', 'Invocation');
    check("l'aura d'un jeton buffe le plateau", board(B, 'p'), ['Piou 3/2', 'Etendard 1/1']);
  }
  {
    // « A la pose » ne suit PAS un jeton : il n'est pas joue depuis la main.
    const B = setup([invoc({ name: 'Muet', atk: 1, hp: 1, play: [{ op: 'dmg', t: 'enemyHero', v: 5 }] })]);
    const avant = B.e.hp;
    play(B, 'p', 'Invocation');
    check("un jeton ne declenche pas de cri de guerre", B.e.hp, avant);
  }
  {
    // Un jeton qui en invoque un autre : la poupee russe tient debout.
    const B = setup([invoc({ name: 'Mere', atk: 1, hp: 1, death: [{ op: 'summon', n: 2, unit: { name: 'Larve', atk: 1, hp: 1 } }] })], [frappe(99)]);
    play(B, 'p', 'Invocation');
    tuer(B, 'e', 'p', 'Mere');
    check('un jeton peut en invoquer un autre en mourant', board(B, 'p'), ['Larve 1/1', 'Larve 1/1']);
  }
}

// ---------------------------------------------------------------------------
// « Lui » : enchainer deux effets sur la meme chose, sans avoir a la redesigner.
console.log('\nCible « Lui »');
{
  // « Invoque un jeton, LUI inflige 6 blessures » : c'est bien le jeton qui tombe.
  const rituel = { id: 'r', name: 'Rituel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [
      { op: 'summon', n: 1, unit: { name: 'Appele', atk: 1, hp: 1, death: [{ op: 'dmg', t: 'enemyHero', v: 3 }] } },
      { op: 'dmg', t: 'previous', v: 6 }
    ] };
  const B = setup([ally('Temoin', 2, 2), rituel]);
  play(B, 'p', 'Temoin');
  const avant = B.e.hp;
  play(B, 'p', 'Rituel');
  check('« lui » vise le jeton qui vient d arriver', board(B, 'p'), ['Temoin 2/2']);
  check('... et son rale part normalement', B.e.hp, avant - 3);
}
{
  // Le renfort suit la meme chaine : seul le jeton invoque en profite.
  const rituel = { id: 'r', name: 'Rituel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [
      { op: 'summon', n: 1, unit: { name: 'Appele', atk: 1, hp: 1 } },
      { op: 'buff', t: 'previous', atk: 3, hp: 3 }
    ] };
  const B = setup([ally('Temoin', 2, 2), rituel]);
  play(B, 'p', 'Temoin');
  play(B, 'p', 'Rituel');
  check('« lui » ne renforce que le jeton, pas le voisin', board(B, 'p'), ['Temoin 2/2', 'Appele 4/4']);
}
{
  // Deux jetons d'un coup : « lui » les designe tous les deux.
  const rituel = { id: 'r', name: 'Rituel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [
      { op: 'summon', n: 2, unit: { name: 'Appele', atk: 1, hp: 1 } },
      { op: 'buff', t: 'previous', atk: 1, hp: 1 }
    ] };
  const B = setup([rituel]);
  play(B, 'p', 'Rituel');
  check('« lui » couvre toute une fournee de jetons', board(B, 'p'), ['Appele 2/2', 'Appele 2/2']);
}
{
  // Sur une cible adverse : on frappe, puis on enchaine sur la meme unite.
  const combo = { id: 'c', name: 'Combo', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [
      { op: 'dmg', t: 'enemyUnit', v: 1 },
      { op: 'dmg', t: 'previous', v: 1 }
    ] };
  const B = setup([combo], [ally('Cible', 1, 5), ally('Voisin', 1, 5)]);
  play(B, 'e', 'Cible');
  play(B, 'e', 'Voisin');
  play(B, 'p', 'Combo', { side: 'e', uid: B.e.board[0].uid });
  check('« lui » reprend la cible designee par le joueur', board(B, 'e'), ['Cible 1/3', 'Voisin 1/5']);
}
{
  // Pioche, armure et mana n'ont pas de destinataire : ils ne coupent pas la chaine.
  const rituel = { id: 'r', name: 'Rituel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [
      { op: 'summon', n: 1, unit: { name: 'Appele', atk: 1, hp: 1 } },
      { op: 'draw', v: 1 },
      { op: 'armor', v: 2 },
      { op: 'buff', t: 'previous', atk: 2, hp: 2 }
    ] };
  const B = setup([rituel]);
  play(B, 'p', 'Rituel');
  check('un effet sans cible ne casse pas la chaine', board(B, 'p'), ['Appele 3/3']);
}
{
  // Les morts ne sont ramassees qu a la fin de la carte : on peut sauver in extremis.
  const rituel = { id: 'r', name: 'Rituel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [
      { op: 'summon', n: 1, unit: { name: 'Appele', atk: 1, hp: 1 } },
      { op: 'dmg', t: 'previous', v: 3 },
      { op: 'buff', t: 'previous', atk: 0, hp: 5 }
    ] };
  const B = setup([rituel]);
  play(B, 'p', 'Rituel');
  check('« lui » tient sur toute la carte, meme apres un coup fatal', board(B, 'p'), ['Appele 1/3']);
}
{
  // « Lui » en premier effet ne designe rien : la carte le dit au lieu de faire n importe quoi.
  const perdu = { id: 'p', name: 'Perdu', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'previous', v: 5 }] };
  const B = setup([ally('Temoin', 2, 2), perdu]);
  play(B, 'p', 'Temoin');
  const avant = B.e.hp;
  play(B, 'p', 'Perdu');
  check('« lui » sans effet precedent ne touche personne', [board(B, 'p'), B.e.hp], [['Temoin 2/2'], avant]);
}

// ---------------------------------------------------------------------------
// Cible a parametre : le type est ecrit dans la cible, « allyType:Chien ». Elle ne
// depend pas du porteur — un sort peut donc dire « les allies Chien gagnent +1/+1 ».
console.log('\nCibles par type');
{
  const ralliement = { id: 'r', name: 'Ralliement', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allyType:Chien', atk: 1, hp: 1 }] };
  const B = setup([
    ally('Chiot', 1, 1, { keys: ['type:Chien'] }),
    ally('Molosse', 2, 2, { keys: ['type:Chien'] }),
    ally('Corbeau', 1, 1, { keys: ['type:Corbeau'] }),
    ally('Sans-type', 1, 1),
    ralliement
  ]);
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Molosse');
  play(B, 'p', 'Corbeau');
  play(B, 'p', 'Sans-type');
  play(B, 'p', 'Ralliement');
  check('un sort peut renforcer tous les allies d un type',
    board(B, 'p'), ['Chiot 2/2', 'Molosse 3/3', 'Corbeau 1/1', 'Sans-type 1/1']);
}
{
  // Portee par une unite, la cible par type inclut le porteur s il a l etiquette
  // (contrairement a « tes autres allies du meme type », qui l exclut).
  const chef = ally('Chef', 2, 2, { keys: ['type:Chien'], play: [{ op: 'buff', t: 'allyType:Chien', atk: 1, hp: 1 }] });
  const B = setup([ally('Chiot', 1, 1, { keys: ['type:Chien'] }), chef]);
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Chef');
  check('portee par une unite, elle compte le porteur', board(B, 'p'), ['Chiot 2/2', 'Chef 3/3']);
}
{
  // Cote adverse : on frappe une meute et personne d autre.
  const peste = { id: 'p', name: 'Peste', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyType:Chien', v: 2 }] };
  const B = setup([peste], [ally('Chiot', 1, 5, { keys: ['type:Chien'] }), ally('Corbeau', 1, 5, { keys: ['type:Corbeau'] })]);
  play(B, 'e', 'Chiot');
  play(B, 'e', 'Corbeau');
  const hpAvant = B.e.hp;
  play(B, 'p', 'Peste');
  check('la cible adverse par type ne touche que ce type', board(B, 'e'), ['Chiot 1/3', 'Corbeau 1/5']);
  check('... et jamais le heros', B.e.hp, hpAvant);
}
{
  // Un jeton invoque porte son type : la cible par type le trouve comme les autres.
  const invoc = { id: 'i', name: 'Invocation', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [
      { op: 'summon', n: 2, unit: { name: 'Chiot', atk: 1, hp: 1, keys: ['type:Chien'] } },
      { op: 'buff', t: 'allyType:Chien', atk: 1, hp: 0 }
    ] };
  const B = setup([invoc]);
  play(B, 'p', 'Invocation');
  check('elle attrape aussi les jetons du bon type', board(B, 'p'), ['Chiot 2/1', 'Chiot 2/1']);
}
{
  // Type absent du plateau, ou cible laissee sans type : personne n est touche.
  const vide = { id: 'v', name: 'Vide', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allyType:Dragon', atk: 5, hp: 5 }] };
  const sansType = { id: 's', name: 'SansType', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allyType:', atk: 5, hp: 5 }] };
  const B = setup([ally('Chiot', 1, 1, { keys: ['type:Chien'] }), vide, sansType]);
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Vide');
  check('un type absent du plateau ne renforce personne', board(B, 'p'), ['Chiot 1/1']);
  play(B, 'p', 'SansType');
  check('une cible par type laissee vide ne renforce personne', board(B, 'p'), ['Chiot 1/1']);
}
{
  // Elle s enchaine avec « Lui » : le renfort par type devient le « lui » suivant.
  const combo = { id: 'c', name: 'Combo', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [
      { op: 'buff', t: 'allyType:Chien', atk: 1, hp: 0 },
      { op: 'heal', t: 'previous', v: 2 }
    ] };
  const B = setup([ally('Chiot', 1, 5, { keys: ['type:Chien'] }), combo], [frappe(3)]);
  play(B, 'p', 'Chiot');
  play(B, 'e', 'Frappe3', { side: 'p', uid: B.p.board[0].uid });
  play(B, 'p', 'Combo');
  // 3 degats encaisses, 2 rendus : 4 PV. Sans la chaine, le soin ne serait alle nulle part.
  check('« lui » reprend les cibles designees par le type', board(B, 'p'), ['Chiot 2/4']);
}

console.log(`\n${pass} test(s) passe(s), ${fail} echec(s).`);
process.exit(fail ? 1 : 0);
