// Banc de test des moments de carte : rale d'agonie, auras, declencheurs de tour.
// Ce sont les mecaniques les plus faciles a casser sans s'en apercevoir (une aura qui
// tombe ne doit ni "reguerir" ni retuer une unite blessee), donc elles sont testees.
// Tout passe par de vrais chemins de code : on tue avec un sort, jamais en bidouillant
// les PV a la main — sinon le test ne prouve rien sur le vrai jeu.
//   node scripts/test-triggers.mjs
import { createBattle, playCard, endTurn, attack, attackableTargets, canPlay, cardCost, draw, needsTarget, needsChoice, legalTargets } from '../game/src/combat/engine.js';
import { resolveCard } from '../game/src/config/characters.js';
import { BALANCE } from '../game/src/config/balance.js';
// La pile de fatigue est une donnee de jeu, pas un etat de combat : les tests la
// remplissent puis la revident, comme le designer le ferait dans le builder.
import { CHARACTER_DATA } from '../game/data/characters.data.js';
// Les tests qui piochent dans la pile designent de VRAIES cartes du jeu : ils lisent
// donc leur nom et leurs stats dans le catalogue, jamais en dur — sinon renommer une
// carte dans le builder ferait echouer le banc.
import { cardById } from '../game/src/config/npcs.js';
// « Est-elle de ce type ? » se demande au registre, jamais en comparant les mots-cles
// a la main : une carte « Type : tous » repond oui sans porter l'etiquette.
import { estDuType, eventSlot, momentLabel, ALL_EFFECTS, ALL_KEYWORDS } from '../game/src/config/mechanics.js';
// Le banc verifie aussi les regles du builder : elles vivent dans le meme registre, et
// une carte valide signalee a tort coute autant qu'un effet qui ne part pas.
import { validateData } from '../game/src/config/validate.js';

// LE BANC PART D'UNE PILE VIDE, quoi que le designer ait mis dans la sienne : ces tests
// disent ce que fait le MOTEUR, pas ce que vaut l'equilibrage du moment. Sans ca, remplir
// la pile dans le builder ferait echouer les tests de fin de pioche.
CHARACTER_DATA.fatigue = [];

// L'effet « Switch » remplace une carte par celle qui occupe le meme slot de l'autre
// cote. Le banc se donne donc un personnage a lui, avec ses deux faces, plutot que de
// dependre des cartes que le designer a ecrites aujourd'hui.
CHARACTER_DATA.characters.push({
  id: 'banc', name: 'Banc d\'essai', sprite: '',
  cards: [
    { id: 'banc_base', name: 'Chenille', type: 'ally', cost: 1, atk: 1, hp: 1, keys: [], text: '', play: [], tiers: [] },
    { id: 'banc_corps', name: 'Cocon', type: 'ally', cost: 1, atk: 0, hp: 4, keys: [], text: '', play: [], tiers: [] }
  ],
  switches: [
    { id: 'banc_switch', name: 'Papillon', type: 'ally', cost: 1, atk: 3, hp: 2, keys: ['Charge'], text: '', play: [], tiers: [] },
    { id: 'banc_sort', name: 'Envol', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
      play: [{ op: 'dmg', t: 'enemyHero', v: 3 }] }
  ]
});

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

/** Un sort qui detruit, quelle que soit la cible visee. */
const desintegre = (name, t, cost = 1) =>
  ({ id: name, name, type: 'spell', cost, keys: [], text: '', tiers: [], play: [{ op: 'detruit', t }] });

const filler = n => Array.from({ length: n }, (_, i) => ally('Vide' + i, 0, 1));
const side = (name, cards) => ({ name, sprite: '', hp: 30, mana: 10, hand: 1, deck: [...cards, ...filler(8)] });

/** Combat ou les deux camps ont la main choisie et 10 mana. */
function setup(playerCards, enemyCards = [], deckJoueur = []) {
  const B = createBattle(side('Joueur', playerCards), side('Adversaire', enemyCards), {});
  B.p.hand = playerCards.map(c => ({ ...c }));
  B.e.hand = enemyCards.map(c => ({ ...c }));
  B.p.mana = B.p.maxMana = 10;
  B.e.mana = B.e.maxMana = 10;
  // Cartes placees expres dans le deck (pour tester les pioches ciblees).
  for (const c of deckJoueur) B.p.deck.push({ ...c });
  return B;
}
const board = (B, k) => B[k].board.map(u => `${u.name} ${u.atk}/${u.hp}`);
const play = (B, k, name, target = null, choix = null) => {
  const i = B[k].hand.findIndex(c => c.name === name);
  if (i < 0) throw new Error('carte absente de la main : ' + name);
  if (!playCard(B, k, i, target, choix)) throw new Error('carte injouable : ' + name);
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

// ---------------------------------------------------------------------------
// Caracteristique variable : l'attaque et/ou la vie valent un compteur. C'est un
// DERIVE — donc il doit se comporter comme une aura : monter, descendre, tuer si la
// vie tombe a zero, et ne jamais reguerir ni retuer une unite deja blessee.
console.log('\nCaracteristique variable');
const variable = (stat, src, arg = '') => `characteristique_variable:${stat}:${src}:${arg}`;
{
  const foufi = ally('Foufi', 0, 0, { keys: [variable('both', 'ownTurns')] });
  const B = setup([foufi]);
  play(B, 'p', 'Foufi');
  check('elle vaut le compteur des la pose', board(B, 'p'), ['Foufi 1/1']);
  endTurn(B); endTurn(B);
  check('elle suit le compteur sans qu on joue quoi que ce soit', board(B, 'p'), ['Foufi 2/2']);
  endTurn(B); endTurn(B);
  check('... a chaque tour', board(B, 'p'), ['Foufi 3/3']);
}
{
  // Le compteur monte pendant que l'unite est blessee : les degats restent.
  const foufi = ally('Foufi', 0, 0, { keys: [variable('hp', 'ownTurns')] });
  const B = setup([foufi], [frappe(2)]);
  endTurn(B); endTurn(B); endTurn(B); endTurn(B);   // on arrive au tour 3
  play(B, 'p', 'Foufi');
  check('vie variable au tour 3', board(B, 'p'), ['Foufi 0/3']);
  play(B, 'e', 'Frappe2', { side: 'p', uid: B.p.board[0].uid });
  check('blessee de 2', board(B, 'p'), ['Foufi 0/1']);
  endTurn(B); endTurn(B);
  check('le compteur monte : la blessure reste', board(B, 'p'), ['Foufi 0/2']);
}
{
  // La vie variable tombe a zero : l'unite meurt, et son rale part.
  const chien = ally('Chien', 1, 1, { keys: ['type:Chien'] });
  const totem = ally('Totem', 0, 0, {
    keys: [variable('hp', 'alliesOfType', 'Chien')],
    death: [{ op: 'dmg', t: 'enemyHero', v: 3 }]
  });
  const B = setup([chien, totem], [frappe(99)]);
  play(B, 'p', 'Chien');
  play(B, 'p', 'Totem');
  check('un allie du type : le totem tient a 1 PV', board(B, 'p'), ['Chien 1/1', 'Totem 0/1']);
  const avant = B.e.hp;
  tuer(B, 'e', 'p', 'Chien');
  check('le dernier Chien tombe : le totem s effondre avec lui', board(B, 'p'), []);
  check('... et son rale d agonie part quand meme', B.e.hp, avant - 3);
}
{
  // Un renfort recu en combat s'ajoute au compteur, il n'est pas avale par lui.
  const foufi = ally('Foufi', 0, 0, { keys: [variable('both', 'ownTurns')] });
  const renfort = { id: 'r', name: 'Renfort', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allyUnit', atk: 2, hp: 3 }] };
  const B = setup([foufi, renfort]);
  play(B, 'p', 'Foufi');
  play(B, 'p', 'Renfort', { side: 'p', uid: B.p.board[0].uid });
  check('le renfort s ajoute au compteur', board(B, 'p'), ['Foufi 3/4']);
  endTurn(B); endTurn(B);
  check('... et il reste acquis quand le compteur monte', board(B, 'p'), ['Foufi 4/5']);
}
{
  // Une aura se pose par-dessus, et se retire proprement.
  const foufi = ally('Foufi', 0, 0, { keys: [variable('both', 'ownTurns')] });
  const chef = ally('Chef', 1, 3, { aura: { scope: 'otherAllies', atk: 2, hp: 2 } });
  const B = setup([foufi, chef], [frappe(99)]);
  play(B, 'p', 'Foufi');
  play(B, 'p', 'Chef');
  check('aura par-dessus une caracteristique variable', board(B, 'p'), ['Foufi 3/3', 'Chef 1/3']);
  tuer(B, 'e', 'p', 'Chef');
  check('l aura tombe : on revient au compteur seul', board(B, 'p'), ['Foufi 1/1']);
}
{
  // Les statistiques ecrites sur la carte sont ignorees pour la caracteristique qui
  // varie, mais pas pour l'autre.
  const mixte = ally('Mixte', 7, 4, { keys: [variable('atk', 'ownTurns')] });
  const B = setup([mixte]);
  play(B, 'p', 'Mixte');
  check('seule l attaque varie, la vie ecrite reste', board(B, 'p'), ['Mixte 1/4']);
}
{
  // Un jeton invoque peut lui aussi porter une caracteristique variable.
  const invoc = { id: 'i', name: 'Invocation', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'summon', n: 1, unit: { name: 'Echo', atk: 0, hp: 0, keys: [variable('both', 'handCards')] } }] };
  const B = setup([invoc, ally('A', 1, 1), ally('B', 1, 1)]);
  play(B, 'p', 'Invocation');
  check('un jeton suit lui aussi son compteur', board(B, 'p'), ['Echo ' + B.p.hand.length + '/' + B.p.hand.length]);
  const avant = B.p.hand.length;
  play(B, 'p', 'A');
  check('la main se vide : le jeton retrecit', board(B, 'p')[0], 'Echo ' + (avant - 1) + '/' + (avant - 1));
}
{
  // Compteur inconnu (mecanique a moitie decrite) : 0, et surtout pas un plantage.
  const cassee = ally('Cassee', 3, 3, { keys: ['characteristique_variable:atk:compteur_qui_nexiste_pas:'] });
  const B = setup([cassee]);
  play(B, 'p', 'Cassee');
  check('un compteur inconnu vaut 0 sans casser le combat', board(B, 'p'), ['Cassee 0/3']);
}

// ---------------------------------------------------------------------------
// Montants variables : n'importe quel nombre d'un effet peut valoir un compteur.
// « Inflige X degats, X = tes allies Chien » — et pareil pour le soin, la pioche,
// le renfort, l'armure, le mana, le nombre de jetons invoques.
console.log('\nMontants variables');
const X = (src, arg = '', plus = 0) => ({ src, arg, plus });
{
  const peste = { id: 'p', name: 'Peste', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyHero', v: X('alliesOfType', 'Chien') }] };
  const chien = name => ally(name, 1, 1, { keys: ['type:Chien'] });
  const B = setup([chien('Un'), chien('Deux'), ally('Corbeau', 1, 1), peste]);
  const avant = B.e.hp;
  play(B, 'p', 'Peste');
  check('sans meute, X vaut 0', B.e.hp, avant);
  play(B, 'p', 'Un'); play(B, 'p', 'Corbeau');
  const avant2 = B.e.hp;
  const peste2 = { ...peste, id: 'p2', name: 'Peste2' };
  B.p.hand.push(peste2);
  play(B, 'p', 'Peste2');
  check('un Chien sur le plateau : X vaut 1', B.e.hp, avant2 - 1);
  play(B, 'p', 'Deux');
  const avant3 = B.e.hp;
  B.p.hand.push({ ...peste, id: 'p3', name: 'Peste3' });
  play(B, 'p', 'Peste3');
  check('deux Chiens : X vaut 2, le montant a suivi', B.e.hp, avant3 - 2);
}
{
  // Le montant est lu au moment ou l'effet part, pas quand la carte entre en main.
  const forge = ally('Forge', 1, 5, { turnEnd: [{ op: 'dmg', t: 'enemyHero', v: X('ownTurns') }] });
  const B = setup([forge]);
  play(B, 'p', 'Forge');
  const t1 = B.e.hp;
  endTurn(B);
  check('fin du tour 1 : 1 degat', B.e.hp, t1 - 1);
  endTurn(B);
  const t2 = B.e.hp;
  endTurn(B);
  check('fin du tour 2 : 2 degats, le compteur a bouge', B.e.hp, t2 - 2);
}
{
  // Tous les nombres marchent, pas seulement les degats : pioche, armure, mana, renfort.
  const rituel = { id: 'r', name: 'Rituel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [
      { op: 'draw', v: X('alliesOfType', 'Chien') },
      { op: 'armor', v: X('allyUnits') },
      { op: 'mana', v: X('alliesOfType', 'Chien') }
    ] };
  const chien = name => ally(name, 1, 1, { keys: ['type:Chien'] });
  const B = setup([chien('Un'), chien('Deux'), rituel]);
  play(B, 'p', 'Un'); play(B, 'p', 'Deux');
  const mainAvant = B.p.hand.length, manaAvant = B.p.mana;
  play(B, 'p', 'Rituel');
  check('la pioche suit le compteur', B.p.hand.length, mainAvant - 1 + 2);   // -1 : le rituel quitte la main
  check('l armure suit le compteur', B.p.armor, 2);
  check('le mana suit le compteur', B.p.mana, manaAvant - 1 + 2);
}
{
  // Un renfort dont l'attaque ET la vie sont variables.
  const meute = { id: 'm', name: 'Cri de meute', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allyType:Chien', atk: X('alliesOfType', 'Chien'), hp: 1 }] };
  const chien = name => ally(name, 1, 1, { keys: ['type:Chien'] });
  const B = setup([chien('Un'), chien('Deux'), meute]);
  play(B, 'p', 'Un'); play(B, 'p', 'Deux');
  play(B, 'p', 'Cri de meute');
  check('le renfort variable touche toute la meute', board(B, 'p'), ['Un 3/2', 'Deux 3/2']);
}
{
  // Le nombre de jetons invoques peut lui aussi etre un compteur.
  const nuee = { id: 'n', name: 'Nuee', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'summon', n: X('handCards'), unit: { name: 'Moucheron', atk: 1, hp: 1 } }] };
  const B = setup([nuee, ally('A', 1, 1), ally('B', 1, 1)]);
  const enMain = B.p.hand.length - 1;   // la Nuee quitte la main avant de se resoudre
  play(B, 'p', 'Nuee');
  check('le nombre d invocations suit le compteur', B.p.board.length, enMain);
}
{
  // Un palier « Amplifie les effets » nourrit le bonus a plat du montant variable.
  const def = { id: 'a', name: 'Vague', type: 'spell', cost: 1, keys: [], text: '',
    play: [{ op: 'dmg', t: 'enemyHero', v: X('ownTurns') }],
    tiers: [{ lvl: 3, amp: 2, text: 'Effet +2' }] };
  const bas = resolveCard(def, 1), haut = resolveCard(def, 3);
  check('sans le palier, le montant reste nu', bas.play[0].v, { src: 'ownTurns', arg: '', plus: 0 });
  check('le palier amplifie le bonus a plat, pas le compteur', haut.play[0].v, { src: 'ownTurns', arg: '', plus: 2 });
  check('la definition d origine n a pas bouge', def.play[0].v.plus, 0);
  const B = setup([{ ...haut }]);
  const avant = B.e.hp;
  play(B, 'p', 'Vague');
  check('en combat : compteur (1) + bonus (2)', B.e.hp, avant - 3);
}
{
  // Compteur inconnu : 0 degat, pas de NaN et surtout pas de plantage.
  const cassee = { id: 'c', name: 'Cassee', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyHero', v: X('compteur_inexistant') }] };
  const B = setup([cassee]);
  const avant = B.e.hp;
  play(B, 'p', 'Cassee');
  check('un compteur inconnu fait 0, sans casser le combat', B.e.hp, avant);
}
{
  // Le rale d'agonie choisit sa cible en connaissant le vrai montant.
  const bombe = ally('Bombe', 1, 1, { keys: ['type:Chien'], death: [{ op: 'dmg', t: 'enemyUnit', v: X('alliesOfType', 'Chien', 2) }] });
  const B = setup([bombe], [ally('Gros', 1, 9), frappe(99)]);
  play(B, 'e', 'Gros');
  play(B, 'p', 'Bombe');
  tuer(B, 'e', 'p', 'Bombe');
  // Le porteur meurt avant le rale : il ne se compte plus, X = 0 + 2.
  check('le rale applique le montant calcule a l instant ou il part', board(B, 'e'), ['Gros 1/7']);
}

// ---------------------------------------------------------------------------
// « Quand X alors Y » : des moments de plus, declenches par un evenement et pas par
// le tour. Ce sont les plus dangereux du moteur — ils peuvent se rappeler entre eux.
console.log('\nEvenements (quand X alors Y)');
// Un sort qui vise directement un heros : pas besoin d'unite sur le plateau.
const eclair = (v, nom = 'Eclair') =>
  ({ id: nom, name: nom, type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyHero', v }] });
{
  // Quand TU lances un sort : le sort de l'adversaire ne doit rien declencher.
  const veilleur = ally('Veilleur', 1, 5, { on_spell_self: [{ op: 'dmg', t: 'enemyHero', v: 2 }] });
  const B = setup([veilleur, eclair(1)], [eclair(1)]);
  play(B, 'p', 'Veilleur');
  const avant = B.e.hp, avantJ = B.p.hp;
  play(B, 'e', 'Eclair');
  check('le sort adverse ne declenche pas « quand TU lances un sort »', [B.e.hp, B.p.hp], [avant, avantJ - 1]);
  play(B, 'p', 'Eclair');
  check('ton propre sort le declenche', B.e.hp, avant - 1 - 2);
}
{
  // Quand l'ADVERSAIRE joue un allie.
  const guetteur = ally('Guetteur', 1, 5, { on_ally_foe: [{ op: 'dmg', t: 'enemyHero', v: 2 }] });
  const B = setup([guetteur, ally('Ami', 1, 1)], [ally('Sbire', 1, 1)]);
  play(B, 'p', 'Guetteur');
  const avant = B.e.hp;
  play(B, 'p', 'Ami');
  check('poser TON allie ne le declenche pas', B.e.hp, avant);
  play(B, 'e', 'Sbire');
  check('l allie adverse le declenche', B.e.hp, avant - 2);
}
{
  // « N'importe qui » ecoute les deux camps.
  const echo = ally('Echo', 1, 9, { on_ally_any: [{ op: 'heal', t: 'ownHero', v: 1 }] });
  const B = setup([echo, ally('Ami', 1, 1)], [ally('Sbire', 1, 1)]);
  B.p.hp = B.p.maxHp - 10;
  play(B, 'p', 'Echo');
  const apresEcho = B.p.hp;
  play(B, 'p', 'Ami');
  check('un allie a toi declenche « n importe qui »', B.p.hp, apresEcho + 1);
  play(B, 'e', 'Sbire');
  check('... et un allie adverse aussi', B.p.hp, apresEcho + 2);
}
{
  // Quand ton heros perd des PV.
  const rancunier = ally('Rancunier', 1, 5, { on_heroHurt_self: [{ op: 'dmg', t: 'enemyHero', v: 3 }] });
  const B = setup([rancunier], [eclair(2)]);
  play(B, 'p', 'Rancunier');
  const avant = B.e.hp;
  play(B, 'e', 'Eclair');
  check('les PV perdus par ton heros declenchent la riposte', B.e.hp, avant - 3);
}
{
  // Quand une unite meurt, des deux cotes.
  const charognard = ally('Charognard', 1, 9, { on_unitDies_any: [{ op: 'buff', t: 'self', atk: 1, hp: 0 }] });
  const B = setup([charognard, ally('Pion', 1, 1), frappe(99)], [ally('Cible', 1, 1), frappe(99)]);
  play(B, 'p', 'Charognard');
  play(B, 'p', 'Pion');
  play(B, 'e', 'Cible');
  tuer(B, 'e', 'p', 'Pion');
  check('la mort d un allie le nourrit', B.p.board[0].atk, 2);
  tuer(B, 'p', 'e', 'Cible');
  check('la mort d une unite adverse aussi', B.p.board[0].atk, 3);
}
{
  // Quand tu pioches. Le declencheur part a chaque carte piochee.
  const archiviste = ally('Archiviste', 1, 9, { on_draw_self: [{ op: 'dmg', t: 'enemyHero', v: 1 }] });
  const pioche = { id: 'p2', name: 'Etude', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'draw', v: 2 }] };
  const B = setup([archiviste, pioche]);
  play(B, 'p', 'Archiviste');
  const avant = B.e.hp;
  play(B, 'p', 'Etude');
  check('deux cartes piochees : deux declenchements', B.e.hp, avant - 2);
}
{
  // LE cas dangereux : « quand tu pioches, pioche ». Le combat doit tenir.
  const boucle = ally('Boucle', 1, 9, { on_draw_self: [{ op: 'draw', v: 1 }] });
  const B = setup([boucle]);
  play(B, 'p', 'Boucle');
  const depart = Date.now();
  endTurn(B); endTurn(B);          // la pioche de debut de tour amorce la chaine
  const duree = Date.now() - depart;
  check('la boucle infinie est coupee', duree < 2000, true);
  check('le combat continue', B.over, false);
  check('la coupure est dite dans le journal', B.log.some(l => l.includes('chaine de declenchements')), true);
}
{
  // Une unite qui n'ecoute pas ne fait rien, et « a la pose » reste different.
  const muet = ally('Muet', 1, 5, { play: [{ op: 'dmg', t: 'enemyHero', v: 1 }] });
  const B = setup([muet, eclair(1)]);
  play(B, 'p', 'Muet');
  const avant = B.e.hp;
  play(B, 'p', 'Eclair');
  check('un cri de guerre ne se rejoue pas a chaque sort', B.e.hp, avant - 1);
}
{
  // Le declencheur voyage par resolveCard et par un jeton invoque, comme les autres.
  const def = { id: 'g', name: 'Gardien', type: 'ally', cost: 2, atk: 1, hp: 5, keys: [], text: '', play: [],
    tiers: [{ lvl: 4, extra: { op: 'dmg', t: 'enemyHero', v: 2 }, slot: 'on_spell_foe', text: 'Riposte aux sorts' }] };
  check('niveau 1 : rien', (resolveCard(def, 1).on_spell_foe || []).length, 0);
  check('niveau 4 : le palier debloque un evenement', resolveCard(def, 4).on_spell_foe, [{ op: 'dmg', t: 'enemyHero', v: 2 }]);
  const B = setup([{ ...resolveCard(def, 4) }], [eclair(1)]);
  play(B, 'p', 'Gardien');
  const avant = B.e.hp;
  play(B, 'e', 'Eclair');
  check('et il part vraiment en combat', B.e.hp, avant - 2);
}
{
  const invoc = { id: 'i', name: 'Invocation', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'summon', n: 1, unit: { name: 'Sentinelle', atk: 1, hp: 5, on_ally_foe: [{ op: 'dmg', t: 'enemyHero', v: 2 }] } }] };
  const B = setup([invoc], [ally('Sbire', 1, 1)]);
  play(B, 'p', 'Invocation');
  const avant = B.e.hp;
  play(B, 'e', 'Sbire');
  check('un jeton peut ecouter un evenement', B.e.hp, avant - 2);
}

// ---------------------------------------------------------------------------
// Pioche ciblee, Elusif, Passe-Murailles et reduction de cout.
console.log('\nPioche ciblee');
{
  const tresor = ally('Tresor', 5, 5);
  const chercher = { id: 'c', name: 'Fouille', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pioche_x', carte: 'Tresor' }] };
  const B = setup([chercher], [], [tresor]);
  check('le tresor est bien dans le deck, pas en main', B.p.hand.some(c => c.name === 'Tresor'), false);
  play(B, 'p', 'Fouille');
  check('la carte cherchee arrive en main', B.p.hand.some(c => c.name === 'Tresor'), true);
  check('... et a quitte le deck', B.p.deck.some(c => c.name === 'Tresor'), false);
}
{
  // Nom inconnu : rien ne se passe, et le journal le dit.
  const rate = { id: 'r', name: 'Fouille', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pioche_x', carte: 'Carte Qui N Existe Pas' }] };
  const B = setup([rate]);
  const mainAvant = B.p.hand.length;
  play(B, 'p', 'Fouille');
  check('un nom inconnu ne pioche rien', B.p.hand.length, mainAvant - 1);
  check('... et le journal le dit', B.log.some(l => l.includes('Rien qui s')), true);
}
{
  // Les accents et les majuscules ne doivent pas faire rater la carte.
  const carte = ally('Épée Sacrée', 2, 2);
  const chercher = { id: 'c', name: 'Fouille', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pioche_x', carte: 'epee sacree' }] };
  const B = setup([chercher], [], [carte]);
  play(B, 'p', 'Fouille');
  check('le nom est compare sans accents ni majuscules', B.p.hand.some(c => c.name === 'Épée Sacrée'), true);
}
{
  // Pioche par genre : un sort, pas un allie.
  const chercher = { id: 'c', name: 'Fouille', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pioche_une_carte_de_type', type: 'spell' }] };
  const unSort = { id: 's', name: 'Boule', type: 'spell', cost: 1, keys: [], text: '', tiers: [], play: [] };
  const B = setup([chercher], [], [ally('Gros', 9, 9), unSort]);
  play(B, 'p', 'Fouille');
  check('elle pioche un sort et pas l allie', [B.p.hand.some(c => c.name === 'Boule'), B.p.hand.some(c => c.name === 'Gros')], [true, false]);
}
{
  // La pioche ciblee declenche « quand tu pioches », comme une pioche normale.
  const guet = ally('Guet', 1, 9, { on_draw_self: [{ op: 'dmg', t: 'enemyHero', v: 1 }] });
  const chercher = { id: 'c', name: 'Fouille', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pioche_x', carte: 'Tresor' }] };
  const B = setup([guet, chercher], [], [ally('Tresor', 1, 1)]);
  play(B, 'p', 'Guet');
  const avant = B.e.hp;
  play(B, 'p', 'Fouille');
  check('une pioche ciblee reste une pioche', B.e.hp, avant - 1);
}

console.log('\nElusif et Passe-Murailles');
{
  const chat = ally('Chat', 2, 2, { keys: ['elusif'] });
  const B = setup([chat]);
  play(B, 'p', 'Chat');
  const cibles = attackableTargets(B, 'e', null).map(t => t.uid);
  check('une unite elusive n est pas attaquable', cibles, ['hero']);
  // Mais un sort l'atteint toujours.
  const B2 = setup([chat], [frappe(99)]);
  play(B2, 'p', 'Chat');
  tuer(B2, 'e', 'p', 'Chat');
  check('... mais un sort la touche quand meme', board(B2, 'p'), []);
}
{
  // Une provocation elusive ne protege plus personne : elle n'est pas attaquable.
  const mur = ally('Mur', 1, 5, { keys: ['Taunt', 'elusif'] });
  const autre = ally('Autre', 1, 1);
  const B = setup([mur, autre]);
  play(B, 'p', 'Mur');
  play(B, 'p', 'Autre');
  const cibles = attackableTargets(B, 'e', null).map(t => t.uid).sort();
  check('une provocation elusive ne bloque pas le passage',
    cibles.includes('hero') && cibles.includes(B.p.board[1].uid) && !cibles.includes(B.p.board[0].uid), true);
}
{
  // Passe-Murailles ignore la provocation adverse.
  const mur = ally('Mur', 0, 5, { keys: ['Taunt'] });
  const voleur = ally('Voleur', 3, 3, { keys: ['passe_murailles', 'Charge'] });
  const B = setup([voleur], [mur]);
  play(B, 'e', 'Mur');
  play(B, 'p', 'Voleur');
  const v = B.p.board[0];
  const cibles = attackableTargets(B, 'p', v).map(t => t.uid);
  check('il peut viser le heros malgre la provocation', cibles.includes('hero'), true);
  const avant = B.e.hp;
  attack(B, 'p', v.uid, { side: 'e', uid: 'hero' });
  check('et il frappe vraiment au visage', B.e.hp, avant - 3);
}
{
  // Sans Passe-Murailles, la provocation tient toujours.
  const mur = ally('Mur', 0, 5, { keys: ['Taunt'] });
  const banal = ally('Banal', 3, 3, { keys: ['Charge'] });
  const B = setup([banal], [mur]);
  play(B, 'e', 'Mur');
  play(B, 'p', 'Banal');
  const cibles = attackableTargets(B, 'p', B.p.board[0]).map(t => t.uid);
  check('la provocation arrete toujours les autres', cibles, [B.e.board[0].uid]);
}

console.log('\nReduction de cout');
{
  const alleger = { id: 'a', name: 'Alleger', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'reduit_le_cout_de', quoi: 'ally', v: 2 }] };
  const gros = { ...ally('Gros', 5, 5), cost: 5 };
  const sort = { id: 's', name: 'Boule', type: 'spell', cost: 4, keys: [], text: '', tiers: [], play: [] };
  const B = setup([alleger, gros, sort]);
  play(B, 'p', 'Alleger');
  const enMain = n => B.p.hand.find(c => c.name === n);
  check('l allie coute 2 de moins', enMain('Gros').cost, 3);
  check('le sort n est pas touche', enMain('Boule').cost, 4);
}
{
  // Par mot-cle, et le cout ne descend jamais sous zero.
  const alleger = { id: 'a', name: 'Alleger', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'reduit_le_cout_de', quoi: 'withKey', argKey: 'Charge', v: 9 }] };
  const rapide = { ...ally('Rapide', 2, 2, { keys: ['Charge'] }), cost: 3 };
  const lent = { ...ally('Lent', 2, 2), cost: 3 };
  const B = setup([alleger, rapide, lent]);
  play(B, 'p', 'Alleger');
  const enMain = n => B.p.hand.find(c => c.name === n);
  check('seules les cartes avec le mot-cle sont allegees', [enMain('Rapide').cost, enMain('Lent').cost], [0, 3]);
}
{
  // Par type, avec un montant variable, et la carte devient vraiment moins chere a jouer.
  const alleger = { id: 'a', name: 'Alleger', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'reduit_le_cout_de', quoi: 'ofType', argType: 'Chien', v: { src: 'ownTurns', arg: '', plus: 0 } }] };
  const chien = { ...ally('Molosse', 2, 2, { keys: ['type:Chien'] }), cost: 4 };
  const B = setup([alleger, chien]);
  play(B, 'p', 'Alleger');
  check('le montant variable marche aussi ici (tour 1 : -1)', B.p.hand.find(c => c.name === 'Molosse').cost, 3);
  B.p.mana = 3;
  play(B, 'p', 'Molosse');
  check('et la carte se joue bien au nouveau cout', board(B, 'p'), ['Molosse 2/2']);
}
{
  // Les cartes piochees APRES ne sont pas allegees : c'est un effet ponctuel.
  const alleger = { id: 'a', name: 'Alleger', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'reduit_le_cout_de', quoi: 'all', v: 1 }, { op: 'draw', v: 1 }] };
  const tard = { ...ally('Tardif', 1, 1), cost: 3 };
  const B = setup([alleger], [], [tard]);
  play(B, 'p', 'Alleger');
  const t = B.p.hand.find(c => c.name === 'Tardif');
  check('une carte piochee ensuite garde son cout', t ? t.cost : null, 3);
}

console.log('\nDestruction');
{
  // Peu importe les PV : la destruction ne compare rien, elle enleve.
  const colosse = ally('Colosse', 9, 9);
  const B = setup([desintegre('Desintegration', 'enemyUnit')], [colosse]);
  play(B, 'e', 'Colosse');
  const c = B.e.board[0];
  play(B, 'p', 'Desintegration', { side: 'e', uid: c.uid });
  check('le colosse 9/9 tombe', board(B, 'e'), []);
}
{
  // Une unite detruite meurt vraiment : son rale d'agonie part.
  const bombe = ally('Bombe', 1, 9, { death: [{ op: 'dmg', t: 'enemyHero', v: 3 }] });
  const B = setup([bombe], [desintegre('Desintegration', 'enemyUnit')]);
  play(B, 'p', 'Bombe');
  const avant = B.e.hp;
  play(B, 'e', 'Desintegration', { side: 'p', uid: B.p.board[0].uid });
  check('le rale part quand l\'unite est detruite', B.e.hp, avant - 3);
  check('elle a bien quitte le plateau', board(B, 'p'), []);
}
{
  // Le Bouclier absorbe une PERTE DE PV : il n'arrete pas une destruction.
  const garde = ally('Garde', 2, 4, { keys: ['Bouclier'] });
  const B = setup([desintegre('Desintegration', 'enemyUnit')], [garde]);
  play(B, 'e', 'Garde');
  play(B, 'p', 'Desintegration', { side: 'e', uid: B.e.board[0].uid });
  check('le bouclier ne protege pas de la destruction', board(B, 'e'), []);
}
{
  // « Nuit Sans Lune » : les deux plateaux, en un seul sort.
  const cataclysme = { id: 'cata', name: 'Cataclysme', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'detruit', t: 'allEnemyUnits' }, { op: 'detruit', t: 'allAllies' }] };
  const mien = ally('Mien', 3, 3);
  const sien = ally('Sien', 4, 4);
  const B = setup([cataclysme, mien], [sien]);
  play(B, 'e', 'Sien');
  play(B, 'p', 'Mien');
  play(B, 'p', 'Cataclysme');
  check('les deux plateaux sont vides', [board(B, 'p'), board(B, 'e')], [[], []]);
}
{
  // Un heros dans les destinataires (via « Lui ») est simplement ignore.
  const eclair = { id: 'ecl', name: 'Eclair', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyHero', v: 2 }, { op: 'detruit', t: 'previous' }] };
  const B = setup([eclair]);
  const avant = B.e.hp;
  play(B, 'p', 'Eclair');
  check('le heros perd ses PV mais n\'est pas detruit', [B.e.hp, B.over], [avant - 2, false]);
}
{
  // Meme regle que pour des degats mortels : tant que la carte n'est pas finie, un
  // soin sur « Lui » rattrape l'unite. C'est ce qui permet « detruis puis ranime ».
  const rituel = { id: 'rit', name: 'Rituel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'detruit', t: 'allAllies' }, { op: 'heal', t: 'previous', v: 5 }] };
  const sacrifie = ally('Sacrifie', 2, 8);
  const B = setup([rituel, sacrifie]);
  play(B, 'p', 'Sacrifie');
  play(B, 'p', 'Rituel');
  check('un soin dans la meme carte sauve encore la victime', board(B, 'p'), ['Sacrifie 2/5']);
}

console.log('\nCout X de moins/de plus');
{
  const gros = { ...ally('Gros', 5, 5), cost: 5, keys: ['cout_x_de_moins_de_plus:moins:2'] };
  const B = setup([gros]);
  B.p.mana = 3;
  play(B, 'p', 'Gros');
  check('la carte se joue a 3 au lieu de 5', [board(B, 'p'), B.p.mana], [['Gros 5/5'], 0]);
}
{
  const lourd = { ...ally('Lourd', 5, 5), cost: 3, keys: ['cout_x_de_moins_de_plus:plus:2'] };
  const B = setup([lourd]);
  B.p.mana = 4;
  check('a 4 mana elle est injouable (elle coute 5)', canPlay(B, 'p', B.p.hand[0]), false);
  B.p.mana = 5;
  play(B, 'p', 'Lourd');
  check('a 5 mana elle passe, et prend tout', [board(B, 'p'), B.p.mana], [['Lourd 5/5'], 0]);
}
{
  const gratos = { ...ally('Gratos', 1, 1), cost: 2, keys: ['cout_x_de_moins_de_plus:moins:9:fixe:'] };
  const B = setup([gratos]);
  B.p.mana = 0;
  play(B, 'p', 'Gratos');
  check('un cout ne descend jamais sous zero', [board(B, 'p'), B.p.mana], [['Gratos 1/1'], 0]);
}
{
  // X est un compteur, comme n'importe quel montant du jeu : la carte devient moins
  // chere a mesure que la partie avance.
  const patient = { ...ally('Patient', 4, 4), cost: 6, keys: ['cout_x_de_moins_de_plus:moins:0:ownTurns:'] };
  const B = setup([patient]);
  check('tour 1 : 6 - 1 = 5', cardCost(B.p.hand[0], B, 'p'), 5);
  endTurn(B); endTurn(B);
  check('tour 2 : 6 - 2 = 4', cardCost(B.p.hand.find(c => c.name === 'Patient'), B, 'p'), 4);
}
{
  // Le mot-cle et la reduction ponctuelle se cumulent : l'un bouge le cout ecrit,
  // l'autre s'applique par-dessus.
  const alleger = { id: 'a', name: 'Alleger', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'reduit_le_cout_de', quoi: 'ally', v: 2 }] };
  const gros = { ...ally('Gros', 5, 5), cost: 6, keys: ['cout_x_de_moins_de_plus:moins:1'] };
  const B = setup([alleger, gros]);
  play(B, 'p', 'Alleger');
  check('6 - 2 (reduction) - 1 (mot-cle) = 3', cardCost(B.p.hand.find(c => c.name === 'Gros'), B, 'p'), 3);
}

console.log('\nEffets statiques');
{
  // Le cout des cartes en main baisse tant que le porteur est la, et REMONTE quand
  // il meurt : c'est ce qui separe un effet statique d'une reduction ponctuelle.
  const mecene = ally('Mecene', 1, 4, { statics: [{ op: 'cout_des_cartes', qui: 'toi', quoi: 'spell', sens: 'moins', v: 2 }] });
  const boule = { id: 'b', name: 'Boule', type: 'spell', cost: 4, keys: [], text: '', tiers: [], play: [] };
  const gros = { ...ally('Gros', 5, 5), cost: 4 };
  const B = setup([mecene, boule, gros], [frappe(99)]);
  play(B, 'p', 'Mecene');
  const cout = n => cardCost(B.p.hand.find(c => c.name === n), B, 'p');
  check('le sort coute 2 de moins', cout('Boule'), 2);
  check('l allie n est pas concerne', cout('Gros'), 4);
  tuer(B, 'e', 'p', 'Mecene');
  check('le porteur meurt : le cout remonte', cout('Boule'), 4);
}
{
  // Il porte aussi sur le camp d'en face, et le cout ne descend jamais sous zero.
  const taxe = ally('Taxe', 1, 4, { statics: [{ op: 'cout_des_cartes', qui: 'adversaire', quoi: 'all', sens: 'plus', v: 2 }] });
  const cadeau = ally('Cadeau', 1, 4, { statics: [{ op: 'cout_des_cartes', qui: 'toi', quoi: 'all', sens: 'moins', v: 9 }] });
  const petit = { ...ally('Petit', 1, 1), cost: 1 };
  const B = setup([petit, cadeau], [taxe]);
  play(B, 'e', 'Taxe');
  check('la carte adverse coute 2 de plus', cardCost(B.p.hand.find(c => c.name === 'Petit'), B, 'p'), 3);
  play(B, 'p', 'Cadeau');
  check('les deux se cumulent et le cout plancher a 0', cardCost(B.p.hand.find(c => c.name === 'Petit'), B, 'p'), 0);
}
{
  // Les montants des effets : le meme geste qu'un palier « Amplifie », mais tant que
  // l'unite tient le plateau.
  const totem = ally('Totem', 0, 4, { statics: [{ op: 'montant_des_effets', qui: 'toi', cible: 'dmg', sens: 'plus', v: 2 }] });
  const B = setup([totem, frappe(3)], [ally('Cible', 0, 9)]);
  play(B, 'e', 'Cible');
  play(B, 'p', 'Totem');
  const cible = B.e.board[0];
  play(B, 'p', 'Frappe3', { side: 'e', uid: cible.uid });
  check('3 degats deviennent 5', board(B, 'e'), ['Cible 0/4']);
}
{
  // Les degats subis par un heros, dans les deux sens.
  const abri = ally('Abri', 0, 4, { statics: [{ op: 'degats_du_heros', qui: 'toi', sens: 'moins', v: 2 }] });
  const malediction = ally('Malediction', 0, 4, { statics: [{ op: 'degats_du_heros', qui: 'adversaire', sens: 'plus', v: 1 }] });
  const brulure = { id: 'br', name: 'Brulure', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyHero', v: 4 }] };
  const B = setup([abri, malediction, { ...brulure, id: 'br2', name: 'Brulure2' }], [{ ...brulure }]);
  play(B, 'p', 'Abri');
  const avant = B.p.hp;
  play(B, 'e', 'Brulure', { side: 'p', uid: 'hero' });
  check('4 degats deviennent 2 sur ton heros', B.p.hp, avant - 2);
  play(B, 'p', 'Malediction');
  const avantE = B.e.hp;
  play(B, 'p', 'Brulure2', { side: 'e', uid: 'hero' });
  check('le heros adverse encaisse 1 de plus', B.e.hp, avantE - 5);
}
{
  // La pioche et le mana de debut de tour.
  const bibliotheque = ally('Bibliotheque', 0, 4, { statics: [{ op: 'pioche_du_tour', qui: 'toi', sens: 'plus', v: 1 }] });
  const puits = ally('Puits', 0, 4, { statics: [{ op: 'mana_du_tour', qui: 'toi', sens: 'plus', v: 3 }] });
  const B = setup([bibliotheque, puits]);
  play(B, 'p', 'Bibliotheque');
  play(B, 'p', 'Puits');
  const mainAvant = B.p.hand.length;
  endTurn(B); endTurn(B);   // un tour complet : on revient chez nous
  check('on pioche 2 cartes au lieu d une', B.p.hand.length, mainAvant + 2);
  check('et le mana depasse la courbe', B.p.mana, B.p.maxMana + 3);
}
{
  // Un effet statique porte par un JETON marche comme sur n importe quelle unite.
  const invoc = { id: 'i', name: 'Rituel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'summon', n: 1, unit: { name: 'Esprit', atk: 1, hp: 1, keys: [],
      statics: [{ op: 'cout_des_cartes', qui: 'toi', quoi: 'all', sens: 'moins', v: 1 }] } }] };
  const gros = { ...ally('Gros', 5, 5), cost: 4 };
  const B = setup([invoc, gros]);
  play(B, 'p', 'Rituel');
  check('le jeton allege la main', cardCost(B.p.hand.find(c => c.name === 'Gros'), B, 'p'), 3);
}
{
  // Un palier peut poser un effet statique de plus.
  const def = { ...ally('Marchand', 1, 3), tiers: [{ lvl: 4, statique: { op: 'cout_des_cartes', qui: 'toi', quoi: 'ally', sens: 'moins', v: 1 }, text: 'Tes allies coutent 1 de moins' }] };
  check('niveau 1 : aucun effet statique', (resolveCard(def, 1).statics || []).length, 0);
  const haut = resolveCard(def, 4);
  check('niveau 4 : le palier en pose un', haut.statics.length, 1);
  const gros = { ...ally('Gros', 5, 5), cost: 4 };
  const B = setup([haut, gros]);
  play(B, 'p', 'Marchand');
  check('et il agit vraiment en combat', cardCost(B.p.hand.find(c => c.name === 'Gros'), B, 'p'), 3);
}

console.log('\nCompteurs de sorts');
{
  const frappe1 = { id: 'f1', name: 'Frappe1', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyHero', v: 1 }] };
  // Un allie dont l attaque vaut les sorts joues ce tour, et un autre la partie entiere.
  const chef = ally('Chef', 0, 5, { keys: ['characteristique_variable:atk:spellsTurn:'] });
  const archive = ally('Archive', 0, 5, { keys: ['characteristique_variable:atk:spellsGame:'] });
  const B = setup([chef, archive, { ...frappe1 }, { ...frappe1, id: 'f2', name: 'Frappe1bis' }]);
  play(B, 'p', 'Chef');
  play(B, 'p', 'Archive');
  check('aucun sort joue : 0 attaque', board(B, 'p'), ['Chef 0/5', 'Archive 0/5']);
  play(B, 'p', 'Frappe1', { side: 'e', uid: 'hero' });
  play(B, 'p', 'Frappe1bis', { side: 'e', uid: 'hero' });
  check('deux sorts joues ce tour', board(B, 'p'), ['Chef 2/5', 'Archive 2/5']);
  endTurn(B); endTurn(B);
  check('le compteur du tour est remis a zero, pas celui de la partie', board(B, 'p'), ['Chef 0/5', 'Archive 2/5']);
}

console.log('\nLe combat ne dure pas indefiniment');
{
  // Deux camps qui ne peuvent pas se tuer (que des unites a 0 attaque, la defausse se
  // remelange donc la fatigue n'arrive jamais) : sans plafond, la partie tourne dans
  // le vide pour toujours. C'est arrive une fois sur 10 000 dans les mesures.
  const pique = { id: 'pq', name: 'Pique', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyHero', v: 5 }] };
  // Un deck volumineux des deux cotes : sinon c'est la fatigue qui tranche avant le
  // plafond, et on ne testerait pas ce qu'on croit.
  const B = createBattle(side('Joueur', filler(300)), side('Adversaire', filler(300)), {});
  B.p.hand = [{ ...pique }];
  B.p.mana = B.p.maxMana = 10;
  play(B, 'p', 'Pique', { side: 'e', uid: 'hero' });
  const avance = B.e.hp;
  for (let i = 0; i < 400 && !B.over; i++) endTurn(B);
  check('la partie finit toute seule', B.over, true);
  check('elle finit au plafond de tours', B.turnNo, BALANCE.combat.maxTurns + 1);
  check('celui qui a le plus de PV l emporte', [B.winner, avance < B.p.hp], ['p', true]);
  check('et le journal le dit', B.log.some(l => l.includes('s\'eternise')), true);
}

console.log('\nFinir sa pioche');
{
  // Le deck NE SE REMELANGE PAS : finir sa pioche veut dire qu'on ne pioche plus.
  // Sans cette regle, « sort a 0 mana qui fait piocher » tourne en boucle sans fin.
  const B = setup([]);
  B.p.deck = [ally('Derniere', 1, 1)];
  B.p.discard = [ally('Deja jouee', 1, 1), ally('Aussi', 1, 1)];
  const main = B.p.hand.length;
  draw(B, 'p');
  check('la derniere carte du deck arrive bien en main', [B.p.hand.length, B.p.deck.length], [main + 1, 0]);
  draw(B, 'p');
  check('deck vide : on ne pioche plus rien', B.p.hand.length, main + 1);
  check('et la defausse reste ou elle est', B.p.discard.length, 2);
  check('le journal le dit une fois', B.log.filter(l => l.includes('fini sa pioche')).length, 1);
}
{
  // La boucle que la regle empeche : un sort a 0 mana qui pioche... lui-meme.
  const boucle = { id: 'bcl', name: 'Echo', type: 'spell', cost: 0, keys: [], text: '', tiers: [],
    play: [{ op: 'draw', v: 1 }] };
  const B = setup([{ ...boucle }]);
  B.p.deck = [{ ...boucle, id: 'bcl2' }];
  B.p.discard = [];
  play(B, 'p', 'Echo');            // pioche la copie du deck
  play(B, 'p', 'Echo');            // la rejoue : le deck est vide, la boucle s'arrete
  check('la boucle se coupe toute seule', [B.p.hand.length, B.p.discard.length], [0, 2]);
}
{
  // Plus personne ne peut rien faire : on tranche aux PV plutot que de tourner en rond.
  const pique = { id: 'pq2', name: 'Pique', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyHero', v: 5 }] };
  const B = setup([pique]);
  play(B, 'p', 'Pique', { side: 'e', uid: 'hero' });
  B.p.deck = []; B.e.deck = []; B.p.hand = []; B.e.hand = [];
  endTurn(B);
  check('la partie s arrete', B.over, true);
  check('celui qui a le plus de PV gagne', B.winner, 'p');
  check('et le journal explique pourquoi', B.log.some(l => l.includes('plus personne ne peut jouer')), true);
}
{
  // Egalite parfaite : match nul (que l'UI compte comme une defaite du joueur).
  const B = setup([]);
  B.p.deck = []; B.e.deck = []; B.p.hand = []; B.e.hand = [];
  endTurn(B);
  check('a PV egaux, match nul', [B.over, B.winner], [true, 'draw']);
}
{
  // Un camp a sec continue de jouer ce qu'il a : la partie ne s arrete pas pour lui.
  const gros = ally('Gros', 3, 3);
  const B = setup([gros]);
  play(B, 'p', 'Gros');
  B.p.deck = []; B.p.hand = [];
  endTurn(B);
  check('l adversaire peut encore agir : on continue', B.over, false);
}

console.log('\nPile de fatigue');
{
  // « Les cartes qu'on pioche quand on essaie de piocher avec une pioche vide » : une
  // pile globale, editee dans le builder, qui ne s'epuise JAMAIS (chaque tirage en
  // fabrique une copie). Pile vide = la regle d'avant, telle quelle (bloc precedent).
  CHARACTER_DATA.fatigue = [{ card: 'grunt1', n: 1, lvl: 1 }];
  const B = setup([]);
  B.p.deck = []; B.p.hand = [];
  draw(B, 'p');
  check('pioche vide : on tire dans la pile', B.p.hand.length, 1);
  check('et c est bien la carte de la pile', B.p.hand[0].id, 'grunt1');
  draw(B, 'p', 2);
  check('la pile ne s epuise pas', B.p.hand.length, 3);
  check('le journal le dit', B.log.some(l => l.includes('pile de fatigue')), true);
  CHARACTER_DATA.fatigue = [];
}
{
  // Le niveau est celui de la LIGNE de pile : la pile n'appartient a personne, elle ne
  // peut donc pas heriter du niveau d'un heros ou d'un PNJ.
  CHARACTER_DATA.fatigue = [{ card: 'dog_pup', n: 1, lvl: 5 }];
  const B = setup([]);
  B.p.deck = []; B.p.hand = [];
  draw(B, 'p');
  const niv5 = resolveCard(cardById('dog_pup'), 5), niv1 = resolveCard(cardById('dog_pup'), 1);
  check('la carte sort au niveau de sa ligne', [B.p.hand[0].atk, B.p.hand[0].hp], [niv5.atk, niv5.hp]);
  check('et pas dans sa version niveau 1', niv5.atk !== niv1.atk || niv5.hp !== niv1.hp, true);
  CHARACTER_DATA.fatigue = [];
}
{
  // LE PLAFOND PAR TOUR. Il remplace la protection que donnait l'ancienne regle : une
  // pioche vide rend desormais toujours une carte, donc « sort a 0 mana qui pioche »
  // tournerait sans fin. Au-dela du plafond, la pioche ne rend plus rien.
  CHARACTER_DATA.fatigue = [{ card: 'grunt1', n: 1 }];
  const cap = BALANCE.combat.maxPiochesAVideParTour;
  const B = setup([]);
  B.p.deck = []; B.p.hand = []; B.p.discard = [];
  draw(B, 'p', cap + 5);
  check('le plafond du tour coupe la pioche', B.p.hand.length + B.p.discard.length, cap);
  check('et le journal le dit', B.log.some(l => l.includes('ne peut plus piocher dans la pile')), true);
  endTurn(B); endTurn(B);                    // retour au tour du joueur
  const avant = B.p.hand.length + B.p.discard.length;
  draw(B, 'p');
  check('le plafond se remet a zero au tour suivant', B.p.hand.length + B.p.discard.length, avant + 1);
  CHARACTER_DATA.fatigue = [];
}
{
  // Deux camps a sec, mais une pile : personne n'est bloque, la partie continue.
  CHARACTER_DATA.fatigue = [{ card: 'grunt1', n: 1 }];
  const B = setup([]);
  B.p.deck = []; B.e.deck = []; B.p.hand = []; B.e.hand = [];
  endTurn(B);
  check('avec une pile, la partie ne s arrete pas', B.over, false);
  CHARACTER_DATA.fatigue = [];
}
{
  // Et sans pile, exactement comme avant : la partie se tranche aux PV.
  const B = setup([]);
  B.p.deck = []; B.e.deck = []; B.p.hand = []; B.e.hand = [];
  endTurn(B);
  check('sans pile, on retombe sur l ancienne regle', [B.over, B.winner], [true, 'draw']);
}

console.log('\nCreer une carte');
{
  // « Cree » ne touche pas au deck : la carte apparait en main, meme deck fini.
  // On prend une carte du catalogue reel (la bibliotheque de cartes libres).
  const rituel = { id: 'rit2', name: 'Invocation', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'cree', carte: 'grunt1', n: 2, lvl: 1 }] };
  const B = setup([rituel]);
  B.p.deck = [];
  const avant = B.p.hand.length;
  play(B, 'p', 'Invocation');
  const creees = B.p.hand.filter(c => c.id === 'grunt1');
  check('deux cartes creees en main', creees.length, 2);
  check('sans toucher au deck', B.p.deck.length, 0);
  check('et elles sont jouables', canPlay(B, 'p', creees[0]), true);
}
{
  // Une carte qui n'existe pas ne cree rien, et le dit.
  const rate = { id: 'rat', name: 'Rate', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'cree', carte: 'nexiste_pas', n: 1 }] };
  const B = setup([rate]);
  const avant = B.p.hand.length;
  play(B, 'p', 'Rate');
  check('rien n est cree', B.p.hand.length, avant - 1);
  check('et le journal le dit', B.log.some(l => l.includes("n'existe pas")), true);
}
{
  // AU HASARD : on ne nomme plus la carte, on decrit le sac ou l'on pioche. Ici les
  // allies du catalogue — donc jamais un sort.
  const loterie = { id: 'lot', name: 'Loterie', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'cree', choix: 'hasard', quoi: 'ally', n: 3, lvl: 1 }] };
  const B = setup([loterie]);
  play(B, 'p', 'Loterie');
  check('trois cartes tirees en main', B.p.hand.length, 3);
  check('et ce sont bien des allies', B.p.hand.every(c => c.type === 'ally'), true);
}
{
  // Au hasard PARMI UN TYPE : le filtre est celui de CARD_FILTERS, applique au
  // catalogue du jeu et non a une main.
  const meute = { id: 'meu', name: 'Appel de la meute', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'cree', choix: 'hasard', quoi: 'ofType', argType: 'Chien', n: 6, lvl: 1 }] };
  const B = setup([meute]);
  play(B, 'p', 'Appel de la meute');
  check('six chiens tires', B.p.hand.length, 6);
  check('et tous sont des Chiens', B.p.hand.every(c => estDuType(c, 'Chien')), true);
  // Un tirage PAR EXEMPLAIRE : six copies de la meme carte seraient un tirage unique
  // recopie (le catalogue compte assez de Chiens pour que ce soit indiscutable).
  check('des tirages independants', new Set(B.p.hand.map(c => c.id)).size > 1, true);
}
{
  // Un filtre que rien ne satisfait ne cree rien, et le journal explique lequel.
  // Le filtre est un MOT-CLE inexistant, et pas un type : depuis « Type : tous », une
  // carte du catalogue peut repondre oui a n'importe quel type, donc aucun type ne
  // garantit un sac vide — ce banc teste le moteur, pas les cartes du moment.
  const chimere = { id: 'chi', name: 'Chimere', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'cree', choix: 'hasard', quoi: 'withKey', argKey: 'licorne_imaginaire', n: 2 }] };
  const B = setup([chimere]);
  play(B, 'p', 'Chimere');
  check('rien ne correspond, rien n arrive', B.p.hand.length, 0);
  check('et le journal nomme le sac vide', B.log.some(l => l.includes('licorne_imaginaire')), true);
}
{
  // Le hasard sert aussi aux trois deplacements, par la zone « creees de toutes
  // pieces » : ici on melange deux sorts du catalogue dans sa propre pioche.
  const bricolage = { id: 'bri', name: 'Bricolage', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'melange_a_la_pioche', d_ou: 'creee', choix: 'hasard', quoi: 'spell', qui: 'toi', n: 2, lvl: 1 }] };
  const B = setup([bricolage]);
  const avant = B.p.deck.length;
  const sortsAvant = B.p.deck.filter(c => c.type !== 'ally').length;
  play(B, 'p', 'Bricolage');
  check('deux cartes melangees dans la pioche', B.p.deck.length, avant + 2);
  check('et ce sont bien deux sorts', B.p.deck.filter(c => c.type !== 'ally').length, sortsAvant + 2);
}

console.log('\nMelanger dans la pioche');
{
  // Recycler sa defausse : c'est la porte de sortie de « finir sa pioche, c'est fini ».
  const recycle = { id: 'rec', name: 'Recyclage', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'melange_a_la_pioche', qui: 'toi', d_ou: 'defausse', quoi: 'all', n: 2 }] };
  const B = setup([recycle]);
  B.p.deck = [];
  B.p.discard = [ally('Vieux1', 1, 1), ally('Vieux2', 1, 1), ally('Vieux3', 1, 1)];
  play(B, 'p', 'Recyclage');
  // Le sort joue part lui aussi a la defausse : elle en avait 3, il en reste 2.
  check('deux cartes reviennent dans le deck', B.p.deck.length, 2);
  check('et la defausse a diminue d autant', B.p.discard.length, 2);
  check('le deck n est plus considere comme fini', B.p.aVide, false);
  draw(B, 'p');
  check('on repioche vraiment', B.p.hand.length, 1);
}
{
  // Depuis la main : le camp vise perd son tempo mais garde la carte pour plus tard.
  const range = { id: 'rng', name: 'Rangement', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'melange_a_la_pioche', qui: 'toi', d_ou: 'main', quoi: 'ally', n: 5 }] };
  const B = setup([range, ally('A', 1, 1), ally('B', 1, 1), frappe(3)]);
  B.p.deck = [];
  play(B, 'p', 'Rangement');
  check('les deux allies quittent la main', B.p.hand.map(c => c.name), ['Frappe3']);
  check('et se retrouvent dans le deck', B.p.deck.length, 2);
}
{
  // Creer une carte directement dans la pioche ADVERSE : on lui impose une carte.
  const cadeau = { id: 'cad', name: 'Cadeau', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'melange_a_la_pioche', qui: 'adversaire', d_ou: 'creee', carte: 'grunt1', n: 2 }] };
  const B = setup([cadeau]);
  const avant = B.e.deck.length;
  play(B, 'p', 'Cadeau');
  check('la pioche adverse gagne deux cartes', B.e.deck.length, avant + 2);
  check('et ce sont les bonnes', B.e.deck.filter(c => c.id === 'grunt1').length, 2);
  check('la notre n a pas bouge', B.p.deck.filter(c => c.id === 'grunt1').length, 0);
}
{
  // Le garde-fou : une boucle « je me remets dans la pioche et je repioche » ne peut
  // pas tourner sans fin dans un meme tour.
  const boucle = { id: 'bcl2', name: 'Ourobore', type: 'spell', cost: 0, keys: [], text: '', tiers: [],
    play: [{ op: 'melange_a_la_pioche', qui: 'toi', d_ou: 'defausse', quoi: 'all', n: 1 }, { op: 'draw', v: 1 }] };
  const B = setup([boucle]);
  B.p.deck = [];
  B.p.discard = [];
  let coups = 0;
  while (B.p.hand.some(c => c.name === 'Ourobore') && coups < 200) { play(B, 'p', 'Ourobore'); coups++; }
  check('la boucle est coupee par le plafond du tour', coups <= BALANCE.combat.maxRecyclageParTour + 1, true);
  check('et le journal le dit', B.log.some(l => l.includes('ne peut plus remelanger')), true);
}

console.log('\nZones : renvoyer et poser');
{
  // La regle de base du modele : un allie EN JEU n'est pas dans la defausse. Il n'y
  // tombe qu'en mourant. Sans ca, on reanimerait une unite encore vivante.
  const brute = ally('Brute', 2, 2);
  const B = setup([brute], [frappe(99)]);
  play(B, 'p', 'Brute');
  check('l allie joue n est pas a la defausse', B.p.discard.length, 0);
  tuer(B, 'e', 'p', 'Brute');
  check('il y tombe en mourant', B.p.discard.map(c => c.name), ['Brute']);
}
{
  // Reanimation : depuis la defausse, directement sur le plateau, sans payer.
  const reanime = { id: 'rea', name: 'Reanimation', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pose_sur_le_plateau', d_ou: 'defausse', qui: 'toi', quoi: 'ally', n: 1 }] };
  const colosse = { ...ally('Colosse', 5, 5, { play: [{ op: 'dmg', t: 'enemyHero', v: 3 }] }), cost: 7 };
  const B = setup([reanime, colosse], [frappe(99)]);
  B.p.discard = [{ ...colosse }];
  const avant = B.e.hp;
  play(B, 'p', 'Reanimation');
  check('le colosse revient en jeu sans etre paye', board(B, 'p'), ['Colosse 5/5']);
  check('« A la pose » ne se declenche pas : la carte n est pas jouee', B.e.hp, avant);
  check('et il a quitte la defausse', B.p.discard.length, 1);   // il ne reste que le sort
}
{
  // Triche de cout : poser depuis la MAIN, sans payer le cout.
  const triche = { id: 'tri', name: 'Passe-droit', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pose_sur_le_plateau', d_ou: 'main', qui: 'toi', quoi: 'ally', n: 1 }] };
  const gros = { ...ally('Gros', 6, 6), cost: 9 };
  const B = setup([triche, gros]);
  B.p.mana = 1;
  play(B, 'p', 'Passe-droit');
  check('le 9 mana arrive en jeu pour 1', board(B, 'p'), ['Gros 6/6']);
  check('et il n est plus en main', B.p.hand.length, 0);
}
{
  // Un sort ne se pose pas sur le plateau : il part a la defausse, et on le dit.
  const pose = { id: 'ps', name: 'Pose', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pose_sur_le_plateau', d_ou: 'main', qui: 'toi', quoi: 'spell', n: 1 }] };
  const B = setup([pose, frappe(3)]);
  play(B, 'p', 'Pose');
  check('le sort ne se pose pas', board(B, 'p'), []);
  check('et le journal le dit', B.log.some(l => l.includes('ne se pose pas')), true);
}
{
  // Rebond : une unite ciblee repart en main SANS mourir (donc sans rale d agonie).
  const rebond = { id: 'reb', name: 'Rebond', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'renvoie_en_main', d_ou: 'plateau', t: 'enemyUnit' }] };
  const bombe = ally('Bombe', 2, 2, { death: [{ op: 'dmg', t: 'enemyHero', v: 5 }] });
  const B = setup([rebond], [bombe]);
  play(B, 'e', 'Bombe');
  const avant = B.p.hp;
  play(B, 'p', 'Rebond', { side: 'e', uid: B.e.board[0].uid });
  check('l unite quitte le plateau', board(B, 'e'), []);
  check('sans mourir : pas de rale', B.p.hp, avant);
  check('et elle est de retour dans SA main', B.e.hand.filter(c => c.name === 'Bombe').length, 1);
  check('pas dans la notre', B.p.hand.filter(c => c.name === 'Bombe').length, 0);
}
{
  // Un jeton renvoye n'est pas une carte : il disparait, et on le dit.
  const invoc = { id: 'inv', name: 'Invoque', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'summon', n: 1, unit: { name: 'Larve', atk: 1, hp: 1 } }] };
  const rebond = { id: 'reb2', name: 'Rebond', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'renvoie_en_main', d_ou: 'plateau', t: 'allyUnit' }] };
  const B = setup([invoc, rebond]);
  play(B, 'p', 'Invoque');
  play(B, 'p', 'Rebond', { side: 'p', uid: B.p.board[0].uid });
  check('le jeton disparait', board(B, 'p'), []);
  check('et rien n arrive en main', B.p.hand.length, 0);
  check('le journal l explique', B.log.some(l => l.includes("n'est pas une carte")), true);
}
{
  // Melanger une unite ciblee dans la pioche de SON proprietaire.
  const enterre = { id: 'ent', name: 'Enterrement', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'melange_a_la_pioche', d_ou: 'plateau', t: 'enemyUnit' }] };
  const cible = ally('Cible', 3, 3);
  const B = setup([enterre], [cible]);
  play(B, 'e', 'Cible');
  const avant = B.e.deck.length;
  play(B, 'p', 'Enterrement', { side: 'e', uid: B.e.board[0].uid });
  check('elle quitte le plateau', board(B, 'e'), []);
  check('et retourne dans SA pioche', B.e.deck.length, avant + 1);
}
{
  // Chercher dans la pioche : « renvoie en main » depuis la zone pioche.
  const cherche = { id: 'ch', name: 'Recherche', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'renvoie_en_main', d_ou: 'pioche', qui: 'toi', quoi: 'ofType', argType: 'Chien', n: 1 }] };
  const chien = ally('Molosse', 2, 2, { keys: ['type:Chien'] });
  const B = setup([cherche]);
  B.p.deck = [ally('Autre', 1, 1), { ...chien }];
  play(B, 'p', 'Recherche');
  check('le chien arrive en main', B.p.hand.map(c => c.name), ['Molosse']);
  check('et il a quitte la pioche', B.p.deck.length, 1);
}

console.log('\nEt leur donne +X/+Y');
{
  // « Cri de guerre : remelange ta defausse dans ta pioche, et donne-leur +2/+2 ». Le
  // renfort va aux cartes QU'ON VIENT DE DEPLACER, et il s'ecrit sur la carte : elle
  // reste grossie jusqu'a ce qu'on la joue. Le sort de la defausse, lui, passe sans rien.
  const sort = { id: 'srt9', name: 'Sortilege', type: 'spell', cost: 1, keys: [], text: '', tiers: [], play: [] };
  const faucon = { id: 'fauc', name: 'Faucon', type: 'ally', cost: 1, atk: 3, hp: 3, keys: [], text: '', tiers: [],
    play: [{ op: 'melange_a_la_pioche', d_ou: 'defausse', qui: 'toi', quoi: 'all', n: { src: 'discardCards' }, atk: 2, hp: 2 }] };
  const B = setup([faucon]);
  B.p.deck = [];
  B.p.discard = [ally('Chien', 1, 1), { ...sort }];
  play(B, 'p', 'Faucon');
  check('toute la defausse repart dans la pioche', [B.p.deck.length, B.p.discard.length], [2, 0]);
  check('l allie deplace a gagne +2/+2', (() => { const c = B.p.deck.find(x => x.name === 'Chien'); return [c.atk, c.hp]; })(), [3, 3]);
  check('le sort passe sans rien recevoir', B.p.deck.find(x => x.name === 'Sortilege').atk, undefined);
  check('et le journal dit le renfort', B.log.some(l => l.includes('+2/+2 pour Chien')), true);
}
{
  // Posee sur le plateau, la carte arrive DEJA grossie : le bonus est applique avant
  // le depot, donc l'unite nait avec (et les auras se cumulent par-dessus, comme d'hab).
  const rituel = { id: 'rit9', name: 'Reanimation', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pose_sur_le_plateau', d_ou: 'defausse', qui: 'toi', quoi: 'ally', n: 1, atk: 2, hp: 2 }] };
  const B = setup([rituel]);
  B.p.discard = [ally('Molosse', 2, 2)];
  play(B, 'p', 'Reanimation');
  check('l unite arrive avec le bonus', board(B, 'p'), ['Molosse 4/4']);
}
{
  // Sans bonus, rien ne change et le journal n'invente pas de ligne. Le filtre « allies »
  // n'est pas decoratif : un SORT est mis a la defausse AVANT que ses effets partent, il
  // pourrait donc se remelanger lui-meme et on ne saurait plus quelle carte on regarde.
  const echo = { id: 'ech9', name: 'Echo', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'melange_a_la_pioche', d_ou: 'defausse', qui: 'toi', quoi: 'ally', n: 1 }] };
  const B = setup([echo]);
  B.p.deck = [];
  B.p.discard = [ally('Chien', 1, 1)];
  play(B, 'p', 'Echo');
  check('pas de bonus : la carte est intacte', (() => { const c = B.p.deck.find(x => x.name === 'Chien'); return [c.atk, c.hp]; })(), [1, 1]);
  check('et rien dans le journal', B.log.some(l => l.includes('+0/+0')), false);
}

console.log('\nQuand cette unite recoit du renfort');
// C'est un EVENEMENT, pas un mot-cle — mais le seul dont le SUJET est une unite : le
// moment « soi » n'est ecoute que par l'unite reellement renforcee. Les variantes
// adverse / n'importe qui, elles, restent de camp.
const tetard = () => ally('Tetard', 1, 1, {
  keys: ['type:Tetard'],
  on_renfort_self: [{ op: 'buff', t: 'self', atk: 1, hp: 1 }]
});
const donneur = (atk, hp, key, t = 'allAllies') => ({ id: 'don', name: 'Donneur', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
  play: [{ op: 'buff', t, atk, hp, ...(key ? { key } : {}) }] });
{
  // Le Tetard prend le renfort PUIS son propre declencheur : +2/+2 puis +1/+1.
  const B = setup([tetard(), ally('Gros', 2, 3), donneur(2, 2)]);
  play(B, 'p', 'Tetard');
  play(B, 'p', 'Gros');
  play(B, 'p', 'Donneur');
  check('le renfort declenche le moment', board(B, 'p'), ['Tetard 4/4', 'Gros 4/5']);
  check('et le journal nomme le moment', B.log.some(l => l.includes('Quand cette unite recoit du renfort — Tetard')), true);
}
{
  // UNE FOIS PAR PILE : le +1/+1 du declencheur ne se redeclenche pas lui-meme. Sans ce
  // garde-fou, « quand cette unite recoit du renfort, +1/+1 » tournerait jusqu'a la
  // limite de chaine et la carte donnerait quatre fois ce qu'elle annonce.
  const B = setup([tetard(), donneur(1, 1)]);
  play(B, 'p', 'Tetard');
  play(B, 'p', 'Donneur');
  check('un seul rebond, pas une cascade', board(B, 'p'), ['Tetard 3/3']);
}
{
  // ... et pas davantage en passant par un VOISIN : le renfort donne pendant la pile ne
  // reveille personne d'autre, sinon deux Tetards se relanceraient l'un l'autre.
  const passeur = () => ally('Passeur', 1, 1, { on_renfort_self: [{ op: 'buff', t: 'allAllies', atk: 1, hp: 1 }] });
  const B = setup([passeur(), tetard(), donneur(1, 1, null, 'allyUnit')]);
  play(B, 'p', 'Passeur');
  play(B, 'p', 'Tetard');
  const passe = B.p.board.find(u => u.name === 'Passeur');
  play(B, 'p', 'Donneur', { side: 'p', uid: passe.uid });
  check('la pile ne rebondit pas d une unite a l autre', board(B, 'p'), ['Passeur 2/2', 'Tetard 2/2']);
}
{
  // LE SUJET EST L'UNITE : renforcer le voisin ne reveille pas le Tetard.
  const B = setup([tetard(), ally('Gros', 2, 3), donneur(2, 2, null, 'allyUnit')]);
  play(B, 'p', 'Tetard');
  play(B, 'p', 'Gros');
  const gros = B.p.board.find(u => u.name === 'Gros');
  play(B, 'p', 'Donneur', { side: 'p', uid: gros.uid });
  check('le renfort du voisin ne le declenche pas', board(B, 'p'), ['Tetard 1/1', 'Gros 4/5']);
}
{
  // « N'importe qui », lui, reste de CAMP : il entend le renfort du voisin.
  const guetteur = ally('Guetteur', 1, 1, { on_renfort_any: [{ op: 'buff', t: 'self', atk: 1, hp: 0 }] });
  const B = setup([guetteur, ally('Gros', 2, 3), donneur(2, 2, null, 'allyUnit')]);
  play(B, 'p', 'Guetteur');
  play(B, 'p', 'Gros');
  const gros = B.p.board.find(u => u.name === 'Gros');
  play(B, 'p', 'Donneur', { side: 'p', uid: gros.uid });
  check('« n importe qui » entend le renfort du voisin', board(B, 'p'), ['Guetteur 2/1', 'Gros 4/5']);
}
{
  // Un renfort qui ne donne QU'UN MOT-CLE (+0/+0) n'est pas un renfort : rien ne part.
  const B = setup([tetard(), donneur(0, 0, 'Taunt')]);
  play(B, 'p', 'Tetard');
  play(B, 'p', 'Donneur');
  check('0/0 + mot-cle : le moment ne part pas', board(B, 'p'), ['Tetard 1/1']);
  check('mais le mot-cle est bien donne', B.p.board[0].keys.includes('Taunt'), true);
}
{
  // UNE AURA N'EST PAS UN RENFORT : elle modifie tant qu'elle dure, elle ne donne rien.
  const B = setup([tetard(), ally('Roi', 2, 2, { aura: { atk: 1, hp: 1, scope: 'otherAllies' } })]);
  play(B, 'p', 'Tetard');
  play(B, 'p', 'Roi');
  check('l aura ne declenche pas le moment', board(B, 'p'), ['Tetard 2/2', 'Roi 2/2']);
}
{
  // L'evenement part pour le camp de l'unite RENFORCEE : une unite d'en face renforcee
  // par « Lui » reveille les ecouteurs adverses, pas les notres.
  const sournois = { id: 'sou', name: 'Sournois', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyUnit', v: 0 }, { op: 'buff', t: 'previous', atk: 1, hp: 1 }] };
  const B = setup([tetard(), sournois], [ally('Cible', 1, 4)]);
  play(B, 'p', 'Tetard');
  play(B, 'e', 'Cible');
  const cible = B.e.board[0];
  play(B, 'p', 'Sournois', { side: 'e', uid: cible.uid });
  check('l unite d en face est renforcee', board(B, 'e'), ['Cible 2/5']);
  check('et notre Tetard n a rien recu', board(B, 'p'), ['Tetard 1/1']);
}

console.log('\nFiltre : une carte precise');
{
  // « Va chercher CELLE-LA » : le filtre de cartes sait desormais designer UNE carte par
  // son identifiant, comme le fait un deck de PNJ. Depuis la pioche vers le plateau,
  // ca fait un tuteur ; c'est le meme filtre partout ou l'on choisit « lesquelles ».
  const appel = { id: 'app', name: 'Appel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pose_sur_le_plateau', d_ou: 'pioche', qui: 'toi', quoi: 'oneCard', argCard: 'Chien', n: 1 }] };
  const B = setup([appel]);
  B.p.deck = [ally('Chat', 1, 1), ally('Chien', 2, 2), ally('Corbeau', 1, 1)];
  play(B, 'p', 'Appel');
  check('la carte designee arrive sur le plateau', board(B, 'p'), ['Chien 2/2']);
  check('et elle seule a quitte la pioche', B.p.deck.map(c => c.name), ['Chat', 'Corbeau']);
}
{
  // Un identifiant qui ne correspond a rien ne prend rien : le filtre ne se rabat pas
  // sur « toutes les cartes ».
  const rate = { id: 'rte', name: 'Rate', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'renvoie_en_main', d_ou: 'pioche', qui: 'toi', quoi: 'oneCard', argCard: 'Licorne', n: 1 }] };
  const B = setup([rate]);
  B.p.deck = [ally('Chat', 1, 1)];
  play(B, 'p', 'Rate');
  check('rien ne correspond, rien ne bouge', [B.p.deck.length, B.p.hand.length], [1, 0]);
}
{
  // La reduction de cout partage le meme registre de filtres : elle gagne « Une carte
  // precise » sans une ligne de moteur en plus.
  const remise = { id: 'rem', name: 'Remise', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'reduit_le_cout_de', quoi: 'oneCard', argCard: 'Cher', v: 2 }] };
  const B = setup([remise, ally('Cher', 1, 1, { cost: 5 }), ally('Autre', 1, 1, { cost: 5 })]);
  play(B, 'p', 'Remise');
  const main = Object.fromEntries(B.p.hand.map(c => [c.name, c.cost]));
  check('seule la carte designee baisse', [main.Cher, main.Autre], [3, 5]);
}

console.log('\nDu dessus, et completer par la fatigue');
{
  // « Les X cartes du dessus » : le dessus d'un paquet est la FIN du tableau, la ou
  // `draw()` va chercher. Ici, les deux du dessus de la pioche arrivent sur le plateau.
  const appel = { id: 'apd', name: 'Appel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pose_sur_le_plateau', d_ou: 'pioche', qui: 'toi', quoi: 'all', ordre: 'dessus', n: 2 }] };
  const B = setup([appel]);
  B.p.deck = [ally('Fond', 1, 1), ally('Milieu', 2, 2), ally('Dessus', 3, 3)];
  play(B, 'p', 'Appel');
  check('les deux du dessus sont posees', board(B, 'p'), ['Dessus 3/3', 'Milieu 2/2']);
  check('et le fond du paquet n a pas bouge', B.p.deck.map(c => c.name), ['Fond']);
}
{
  // Au hasard (le defaut) : on ne sait pas laquelle, mais elle vient bien du paquet.
  const appel = { id: 'aph', name: 'Appel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pose_sur_le_plateau', d_ou: 'pioche', qui: 'toi', quoi: 'all', n: 1 }] };
  const B = setup([appel]);
  B.p.deck = [ally('Fond', 1, 1), ally('Milieu', 2, 2), ally('Dessus', 3, 3)];
  play(B, 'p', 'Appel');
  check('une carte du paquet est posee', [B.p.board.length, B.p.deck.length], [1, 2]);
}
{
  // S'IL EN MANQUE : les cartes qui manquent sont fabriquees par la pile de fatigue,
  // exactement comme a une pioche a vide. Pioche vide, on demande deux cartes.
  CHARACTER_DATA.fatigue = [{ card: 'grunt1', n: 1, lvl: 1 }];
  const appel = { id: 'apf', name: 'Appel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pose_sur_le_plateau', d_ou: 'pioche', qui: 'toi', quoi: 'all', n: 2, fatigue: true }] };
  const B = setup([appel]);
  B.p.deck = [];
  play(B, 'p', 'Appel');
  const modele = resolveCard(cardById('grunt1'), 1);
  check('la fatigue complete le paquet vide', board(B, 'p'), Array(2).fill(`${modele.name} ${modele.atk}/${modele.hp}`));
  check('et le journal le dit', B.log.some(l => l.includes('Il en manque')), true);
  CHARACTER_DATA.fatigue = [];
}
{
  // Sans la case cochee, un paquet vide ne fabrique rien : c'est le comportement d'avant.
  CHARACTER_DATA.fatigue = [{ card: 'grunt1', n: 1, lvl: 1 }];
  const appel = { id: 'aps', name: 'Appel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'pose_sur_le_plateau', d_ou: 'pioche', qui: 'toi', quoi: 'all', n: 2 }] };
  const B = setup([appel]);
  B.p.deck = [];
  play(B, 'p', 'Appel');
  check('sans la case, rien n est fabrique', B.p.board.length, 0);
  CHARACTER_DATA.fatigue = [];
}

console.log('\nRenforcer des cartes la ou elles sont');
{
  // Renforcer des ALLIES EN MAIN : `buff` ne connait que le plateau, celui-ci ecrit sur
  // la carte. Le sort de la main n'a ni attaque ni vie : il traverse sans rien recevoir.
  const cri = { id: 'cri', name: 'Cri', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'renforce_les_cartes', d_ou: 'main', qui: 'toi', quoi: 'all', n: 9, atk: 2, hp: 2 }] };
  const sort = { id: 'srt8', name: 'Sortilege', type: 'spell', cost: 1, keys: [], text: '', tiers: [], play: [] };
  const B = setup([cri, ally('Chien', 1, 1), ally('Chat', 2, 2), sort]);
  play(B, 'p', 'Cri');
  const main = Object.fromEntries(B.p.hand.map(c => [c.name, `${c.atk}/${c.hp}`]));
  check('les allies de la main grossissent', [main.Chien, main.Chat], ['3/3', '4/4']);
  check('le sort traverse sans rien', [main.Sortilege, B.p.hand.find(c => c.name === 'Sortilege').atk], ['undefined/undefined', undefined]);
}
{
  // Renforcer dans la PIOCHE : la carte arrive grossie quand on la tire et qu'on la joue.
  const cri = { id: 'cr2', name: 'Cri', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'renforce_les_cartes', d_ou: 'pioche', qui: 'toi', quoi: 'ally', n: 9, atk: 1, hp: 3 }] };
  const B = setup([cri]);
  B.p.deck = [ally('Chien', 1, 1)];
  play(B, 'p', 'Cri');
  draw(B, 'p');
  play(B, 'p', 'Chien');
  check('l unite arrive deja grossie', board(B, 'p'), ['Chien 2/4']);
}
{
  // Renforcer dans la DEFAUSSE, puis reanimer : la carte revient grossie.
  const cri = { id: 'cr3', name: 'Cri', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [
      { op: 'renforce_les_cartes', d_ou: 'defausse', qui: 'toi', quoi: 'ally', n: 9, atk: 2, hp: 2 },
      { op: 'pose_sur_le_plateau', d_ou: 'defausse', qui: 'toi', quoi: 'ally', n: 1 }
    ] };
  const B = setup([cri]);
  B.p.discard = [ally('Mort', 1, 1)];
  play(B, 'p', 'Cri');
  check('la carte reanimee revient grossie', board(B, 'p'), ['Mort 3/3']);
}
{
  // Renforcer CHEZ L'ADVERSAIRE reste possible (c'est un cadeau, le bot le sait) : la
  // carte visee est bien celle d'en face, pas la notre.
  const cadeau = { id: 'cad', name: 'Cadeau', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'renforce_les_cartes', d_ou: 'main', qui: 'adversaire', quoi: 'ally', n: 9, atk: 1, hp: 1 }] };
  const B = setup([cadeau, ally('Chien', 1, 1)], [ally('Loup', 2, 2)]);
  play(B, 'p', 'Cadeau');
  check('c est la main d en face qui grossit', B.e.hand.map(c => `${c.atk}/${c.hp}`), ['3/3']);
  check('et la notre est intacte', B.p.hand.map(c => `${c.atk}/${c.hp}`), ['1/1']);
}

console.log('\nLes sorts joues retournent dans la pioche');
const gardien = (qui = 'toi', quoi = 'tout') => ally('Gardien', 1, 5, {
  statics: [{ op: 'cartes_jouees_remelangees', qui, quoi }]
});
{
  // L'effet statique dure tant que le porteur est la : le sort joue repart dans la
  // pioche au lieu d'aller a la defausse.
  const B = setup([gardien(), frappe(1)], [ally('Cible', 1, 9)]);
  play(B, 'p', 'Gardien');
  play(B, 'e', 'Cible');
  B.p.deck = []; B.p.discard = [];
  const cible = B.e.board[0];
  play(B, 'p', 'Frappe1', { side: 'e', uid: cible.uid });
  check('le sort repart dans la pioche', B.p.deck.map(c => c.name), ['Frappe1']);
  check('et pas a la defausse', B.p.discard.length, 0);
  check('son effet a bien eu lieu', B.e.board[0].hp, 8);
}
{
  // Sans le porteur, rien ne change : le sort va a la defausse, comme toujours.
  const B = setup([frappe(1)], [ally('Cible', 1, 9)]);
  play(B, 'e', 'Cible');
  B.p.deck = []; B.p.discard = [];
  const cible = B.e.board[0];
  play(B, 'p', 'Frappe1', { side: 'e', uid: cible.uid });
  check('sans le statique, le sort va a la defausse', [B.p.deck.length, B.p.discard.length], [0, 1]);
}
{
  // UN ALLIE N'EST PAS CONCERNE : sa carte voyage avec l'unite et ne tombe a la
  // defausse qu'a sa mort. La remelanger a la pose la dupliquerait.
  const B = setup([gardien(), ally('Chien', 1, 1)]);
  play(B, 'p', 'Gardien');
  B.p.deck = [];
  play(B, 'p', 'Chien');
  check('l allie reste sur le plateau', board(B, 'p'), ['Gardien 1/5', 'Chien 1/1']);
  check('et rien n est remelange', B.p.deck.length, 0);
}
{
  // L'ALLIE, LUI, N'Y VA QU'A SA MORT. Sa carte suit l'unite tant qu'elle tient le
  // plateau : c'est la mort, et elle seule, qui la renvoie dans la pioche.
  const B = setup([gardien(), ally('Chien', 1, 1)], [frappe(99)]);
  play(B, 'p', 'Gardien');
  play(B, 'p', 'Chien');
  B.p.deck = []; B.p.discard = [];
  tuer(B, 'e', 'p', 'Chien');
  check('l allie mort repart dans la pioche', B.p.deck.map(c => c.name), ['Chien']);
  check('et pas a la defausse', B.p.discard.length, 0);
}
{
  // LA DISTINCTION : « seulement les sorts » laisse l'allie mort a la defausse.
  const B = setup([gardien('toi', 'sorts'), ally('Chien', 1, 1)], [frappe(99)]);
  play(B, 'p', 'Gardien');
  play(B, 'p', 'Chien');
  B.p.deck = []; B.p.discard = [];
  tuer(B, 'e', 'p', 'Chien');
  check('« seulement les sorts » : l allie va a la defausse', [B.p.deck.length, B.p.discard.map(c => c.name)], [0, ['Chien']]);
}
{
  // Et « seulement les allies » laisse le sort joue a la defausse.
  const B = setup([gardien('toi', 'allies'), frappe(1)], [ally('Cible', 1, 9)]);
  play(B, 'p', 'Gardien');
  play(B, 'e', 'Cible');
  B.p.deck = []; B.p.discard = [];
  play(B, 'p', 'Frappe1', { side: 'e', uid: B.e.board[0].uid });
  check('« seulement les allies » : le sort va a la defausse', [B.p.deck.length, B.p.discard.map(c => c.name)], [0, ['Frappe1']]);
}
{
  // LE PORTEUR NE S'APPLIQUE PAS A LUI-MEME : un statique s'arrete avec celui qui le
  // porte, et il a deja quitte le plateau quand on ramasse les morts.
  const B = setup([gardien()], [frappe(99)]);
  play(B, 'p', 'Gardien');
  B.p.deck = []; B.p.discard = [];
  tuer(B, 'e', 'p', 'Gardien');
  check('le porteur mort va a la defausse, pas dans sa pioche', [B.p.deck.length, B.p.discard.map(c => c.name)], [0, ['Gardien']]);
}
{
  // « Chez l'adversaire » : c'est SA pioche qui se remplit, pas la notre.
  const B = setup([gardien('adversaire')], [frappe(1)]);
  play(B, 'p', 'Gardien');
  B.e.deck = []; B.e.discard = [];
  play(B, 'e', 'Frappe1', { side: 'p', uid: B.p.board[0].uid });
  check('le sort d en face repart dans SA pioche', B.e.deck.map(c => c.name), ['Frappe1']);
  check('et la notre n a rien recu', B.p.deck.filter(c => c.name === 'Frappe1').length, 0);
}

console.log('\nAffaiblir : un renfort negatif');
{
  // Les memes champs que le renfort, des nombres qui descendent sous zero, et les
  // cibles d'en face dans la liste : « -2/-2 a une unite adverse » n'a pas besoin
  // d'un effet a lui.
  const poison = { id: 'poi9', name: 'Poison', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'enemyUnit', atk: -2, hp: -2 }] };
  const B = setup([poison], [ally('Brute', 4, 5)]);
  play(B, 'e', 'Brute');
  play(B, 'p', 'Poison', { side: 'e', uid: B.e.board[0].uid });
  check('l unite adverse est affaiblie', board(B, 'e'), ['Brute 2/3']);
  check('et le journal parle d affaiblissement', B.log.some(l => l.includes('Affaiblissement : -2/-2')), true);
}
{
  // Une vie tombee a zero tue, comme n'importe quels degats ; l'attaque, elle, ne
  // descend jamais sous zero (refresh la borne).
  const poison = { id: 'poi8', name: 'Poison', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allEnemyUnits', atk: -9, hp: -1 }] };
  const B = setup([poison], [ally('Moucheron', 1, 1), ally('Brute', 4, 5)]);
  play(B, 'e', 'Moucheron');
  play(B, 'e', 'Brute');
  play(B, 'p', 'Poison');
  check('celui qui tombe a 0 PV meurt', board(B, 'e'), ['Brute 0/4']);
  check('et l attaque ne passe pas sous zero', B.e.board[0].atk, 0);
}
{
  // UN MALUS N'EST PAS UN RENFORT : « quand cette unite recoit du renfort » ne part pas.
  const tetard = ally('Tetard', 3, 3, { on_renfort_self: [{ op: 'buff', t: 'self', atk: 1, hp: 1 }] });
  const poison = { id: 'poi7', name: 'Poison', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'enemyUnit', atk: -1, hp: -1 }] };
  const B = setup([poison], [tetard]);
  play(B, 'e', 'Tetard');
  play(B, 'p', 'Poison', { side: 'e', uid: B.e.board[0].uid });
  check('le malus ne reveille pas le declencheur de renfort', board(B, 'e'), ['Tetard 2/2']);
}

console.log('\nLes plafonds par tour');
const bride = (op, v = 1, qui = 'adversaire') => ally('Bride', 1, 9, { statics: [{ op, qui, v }] });
{
  // « L'adversaire ne joue pas plus d'une carte par tour » : c'est une question de
  // JOUABILITE, donc `canPlay` la voit — le bot et l'interface aussi.
  const B = setup([ally('Un', 1, 1), ally('Deux', 1, 1)], [bride('limite_de_cartes_jouees')]);
  play(B, 'e', 'Bride');
  check('la premiere carte passe', canPlay(B, 'p', B.p.hand[0]), true);
  play(B, 'p', 'Un');
  check('la seconde est bloquee', canPlay(B, 'p', B.p.hand[0]), false);
  endTurn(B); endTurn(B);
  check('et le tour suivant remet le compteur a zero', canPlay(B, 'p', B.p.hand[0]), true);
}
{
  // Deux plafonds en jeu : c'est le PLUS SEVERE qui vaut. Ils ne s'additionnent pas,
  // contrairement a tous les autres statiques.
  const B = setup([ally('Un', 1, 1)], [bride('limite_de_cartes_jouees', 3), bride('limite_de_cartes_jouees', 1)]);
  play(B, 'e', 'Bride');
  play(B, 'e', 'Bride');
  play(B, 'p', 'Un');
  check('c est la limite la plus severe qui vaut', canPlay(B, 'p', B.p.hand[0] || { cost: 0 }), false);
}
{
  // Le plafond d'attaques : plus aucune cible legale une fois atteint.
  const B = setup([ally('Un', 2, 2), ally('Deux', 2, 2)], [bride('nombre_d_attaques')]);
  play(B, 'e', 'Bride');
  play(B, 'p', 'Un');
  play(B, 'p', 'Deux');
  endTurn(B); endTurn(B);                       // nos unites peuvent attaquer
  const [u1, u2] = B.p.board;
  check('la premiere unite peut frapper', attackableTargets(B, 'p', u1).length > 0, true);
  attack(B, 'p', u1.uid, { side: 'e', uid: 'hero' });
  check('la seconde n a plus de cible', attackableTargets(B, 'p', u2).length, 0);
}
{
  // Le plafond de pioche : la pioche de debut de tour compte dedans.
  const B = setup([{ id: 'pio', name: 'Pioche', type: 'spell', cost: 1, keys: [], text: '', tiers: [], play: [{ op: 'draw', v: 3 }] }],
    [bride('nombre_de_cartes_piochees', 2)]);
  play(B, 'e', 'Bride');
  B.p.piochees = 0;
  const avant = B.p.hand.length;
  play(B, 'p', 'Pioche');
  check('on ne pioche que jusqu au plafond', B.p.hand.length - (avant - 1), 2);
  check('et le journal le dit une fois', B.log.filter(l => l.includes('limite de pioche')).length, 1);
}

console.log('\nLe niveau du proprietaire comme nombre');
{
  // Une carte resolue au niveau 7 : ses effets peuvent valoir 7.
  const def = { id: 'lame', name: 'Lame du Rang', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyHero', v: { src: 'ownerLevel', arg: '', plus: 0 } }] };
  const B = setup([resolveCard(def, 7)]);
  const avant = B.e.hp;
  play(B, 'p', 'Lame du Rang');
  check('le sort frappe pour le niveau du proprietaire', B.e.hp, avant - 7);
}
{
  // Une caracteristique variable qui suit le niveau : l'unite arrive en 7/7.
  const def = { ...ally('Champion', 0, 0, { keys: ['characteristique_variable:both:ownerLevel:'] }) };
  const B = setup([resolveCard(def, 7)]);
  play(B, 'p', 'Champion');
  check('l unite vaut son niveau en attaque et en vie', board(B, 'p'), ['Champion 7/7']);
}
{
  // Le cout aussi : une carte qui coute son niveau de moins, lue en main.
  const def = { ...ally('Veteran', 3, 3), cost: 9, keys: ['cout_x_de_moins_de_plus:moins:0:ownerLevel:'] };
  const B = setup([resolveCard(def, 4)]);
  check('9 - 4 = 5', cardCost(B.p.hand[0], B, 'p'), 5);
  B.p.mana = 5;
  play(B, 'p', 'Veteran');
  check('et elle se joue bien a ce prix', board(B, 'p'), ['Veteran 3/3']);
}
{
  // Un jeton herite du niveau de celui qui l'invoque.
  const def = { id: 'app', name: 'Appel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'summon', n: 1, unit: { name: 'Echo', atk: 0, hp: 5, keys: ['characteristique_variable:atk:ownerLevel:'] } }] };
  const B = setup([resolveCard(def, 6)]);
  play(B, 'p', 'Appel');
  check('le jeton compte le niveau de son invocateur', board(B, 'p'), ['Echo 6/5']);
}

// ---------------------------------------------------------------------------
// « Type : tous » repond oui a n'importe quelle etiquette. Il ne se code nulle part
// dans le moteur : tout ce qui demande un type passe par `estDuType`/`partageType`,
// donc cibles, auras, compteurs et filtres de cartes le voient d'un coup. C'est
// exactement ce que ces tests verifient — les quatre chemins, pas la fonction.
console.log('\nType : tous');
{
  const chef = ally('Chef', 2, 3, { keys: ['type:Chien'], aura: { scope: 'sameTypeAllies', atk: 1, hp: 1 } });
  const B = setup([ally('Cameleon', 1, 1, { keys: ['type_tous'] }), ally('Corbeau', 1, 1), chef]);
  play(B, 'p', 'Cameleon');
  play(B, 'p', 'Corbeau');
  play(B, 'p', 'Chef');
  check("l'aura « meme type » touche le cameleon, pas l'unite sans type",
    board(B, 'p'), ['Cameleon 2/2', 'Corbeau 1/1', 'Chef 2/3']);
}
{
  // Dans l'autre sens : c'est lui qui porte l'aura. Une unite sans aucune etiquette
  // ne partage rien avec personne, pas meme avec « tous ».
  const cam = ally('Cameleon', 2, 3, { keys: ['type_tous'], aura: { scope: 'sameTypeAllies', atk: 1, hp: 0 } });
  const B = setup([ally('Chiot', 1, 1, { keys: ['type:Chien'] }), ally('Muet', 1, 1), cam]);
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Muet');
  play(B, 'p', 'Cameleon');
  check('son aura porte sur tout ce qui est etiquete, et rien d\'autre',
    board(B, 'p'), ['Chiot 2/1', 'Muet 1/1', 'Cameleon 2/3']);
}
{
  const meute = { id: 'me', name: 'Meute', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allyType:Chat', atk: 1, hp: 1 }] };
  const B = setup([ally('Cameleon', 1, 1, { keys: ['type_tous'] }), ally('Chiot', 1, 1, { keys: ['type:Chien'] }), meute]);
  play(B, 'p', 'Cameleon');
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Meute');
  check('la cible « tes allies Chat » le prend', board(B, 'p'), ['Cameleon 2/2', 'Chiot 1/1']);
}
{
  const meneur = ally('Meneur', 0, 5, { keys: ['characteristique_variable:atk:alliesOfType:Chat'] });
  const B = setup([ally('Cameleon', 1, 1, { keys: ['type_tous'] }), meneur]);
  play(B, 'p', 'Cameleon');
  play(B, 'p', 'Meneur');
  check('il compte dans « tes allies d\'un type »', board(B, 'p'), ['Cameleon 1/1', 'Meneur 1/5']);
}
{
  // Le filtre de cartes le voit aussi : c'est le meme `estDuType`, sur une carte en
  // main cette fois — un chemin de plus qu'il n'a pas fallu ecrire.
  const cam = ally('Cameleon', 1, 1, { keys: ['type_tous'] });
  cam.cost = 3;
  const remise = { id: 'rem', name: 'Remise', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'reduit_le_cout_de', quoi: 'ofType', argType: 'Chat', v: 2 }] };
  const B = setup([cam, remise]);
  play(B, 'p', 'Remise');
  check('le filtre « tes cartes Chat » l\'allege en main', cardCost(B.p.hand[0], B, 'p'), 1);
}

{
  // UN TYPE DONNE PAR UNE AURA compte comme celui qui est ecrit sur la carte... sauf
  // pour decider de la PORTEE des auras, qui se lit sur les types imprimes. Sans cette
  // exception, une aura qui donne un type elargirait la portee des auras « meme type ».
  const chef = ally('Chef', 2, 3, { keys: ['type:Chien'], aura: { scope: 'sameTypeAllies', atk: 1, hp: 1 } });
  const donneur = ally('Donneur', 1, 1, { aura: { scope: 'otherAllies', atk: 0, hp: 0, key: 'type_tous' } });
  const rappel = { id: 'rp', name: 'Rappel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allyType:Chien', atk: 1, hp: 0 }] };
  const B = setup([chef, donneur, ally('Muet', 1, 1), rappel]);
  play(B, 'p', 'Chef');
  play(B, 'p', 'Donneur');
  play(B, 'p', 'Muet');
  check("l'aura « meme type » ne s'etend pas a ce qu'elle vient d'etiqueter",
    board(B, 'p'), ['Chef 2/3', 'Donneur 1/1', 'Muet 1/1']);
  play(B, 'p', 'Rappel');
  check('mais le type recu compte pour les cibles par type',
    board(B, 'p'), ['Chef 3/3', 'Donneur 1/1', 'Muet 2/1']);
}
{
  // Donne par un RENFORT : il s'ecrit sur l'unite, il reste quand la carte est partie.
  const marque = { id: 'mq', name: 'Marque', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allyUnit', atk: 0, hp: 0, key: 'type_tous' }] };
  const rappel = { id: 'rp2', name: 'Rappel2', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allyType:Chat', atk: 1, hp: 1 }] };
  const B = setup([ally('Muet', 1, 1), marque, rappel]);
  play(B, 'p', 'Muet');
  play(B, 'p', 'Marque', { side: 'p', uid: B.p.board[0].uid });
  play(B, 'p', 'Rappel2');
  check('un renfort peut donner « Type : tous »', board(B, 'p'), ['Muet 2/2']);
}
{
  // Et un JETON le porte comme n'importe quel mot-cle.
  const appel = { id: 'ap2', name: 'Appel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'summon', n: 1, unit: { name: 'Echo', atk: 1, hp: 1, keys: ['type_tous'] } },
      { op: 'buff', t: 'allyType:Chien', atk: 2, hp: 0 }] };
  const B = setup([appel]);
  play(B, 'p', 'Appel');
  check('un jeton « Type : tous » est pris par une cible par type', board(B, 'p'), ['Echo 3/1']);
}

// ---------------------------------------------------------------------------
// Plusieurs types sur la meme carte. Le moteur lisait deja toutes les valeurs d'un
// mot-cle (`keyArgs`) : ces tests disent qu'un corbeau est bien « Corbeau » ET
// « Oiseau » partout, et non seulement dans le premier des deux.
console.log('\nPlusieurs types sur une carte');
{
  const corbeau = ally('Corbeau', 1, 1, { keys: ['type:Corbeau', 'type:Oiseau'] });
  const B = setup([corbeau]);
  play(B, 'p', 'Corbeau');
  check('les deux etiquettes sont derivees sur l\'unite', B.p.board[0].types, ['Corbeau', 'Oiseau']);
}
{
  const chef = ally('Rapace', 2, 3, { keys: ['type:Oiseau'], aura: { scope: 'sameTypeAllies', atk: 1, hp: 1 } });
  const B = setup([ally('Corbeau', 1, 1, { keys: ['type:Corbeau', 'type:Oiseau'] }), ally('Chiot', 1, 1, { keys: ['type:Chien'] }), chef]);
  play(B, 'p', 'Corbeau');
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Rapace');
  check('un seul type en commun suffit a partager l\'aura',
    board(B, 'p'), ['Corbeau 2/2', 'Chiot 1/1', 'Rapace 2/3']);
}
{
  const cri = { id: 'cr', name: 'Cri', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'allyType:Corbeau', atk: 2, hp: 0 }] };
  const B = setup([ally('Corbeau', 1, 1, { keys: ['type:Corbeau', 'type:Oiseau'] }), cri]);
  play(B, 'p', 'Corbeau');
  play(B, 'p', 'Cri');
  check('la cible trouve le second type comme le premier', board(B, 'p'), ['Corbeau 3/1']);
}

// ---------------------------------------------------------------------------
// LA COPIE. Deux cibles sur un meme effet (qui devient la copie, et de quoi), un
// modele qu'on lit sans le deplacer, et une unite qui repart a neuf.
console.log('\nCopie');
const golem = ally('Golem', 5, 6, { keys: ['type:Golem'] });
/** Un allie dont le cri de guerre le transforme en une carte de sa pioche. */
const singe = (nom, type) => ally(nom, 1, 1, {
  play: [{ op: 'copie', t: 'self', d_ou: 'pioche', quoi: 'ofType', argType: type }]
});
{
  const mimique = ally('Mimique', 1, 1, { play: [{ op: 'copie', t: 'self', d_ou: 'plateau', tm: 'enemyUnit' }] });
  const B = setup([mimique], [ally('Ogre', 4, 5)]);
  play(B, 'e', 'Ogre');
  check('la cible du modele est bien demandee au joueur', needsTarget(mimique), true);
  check('et les unites adverses sont proposees', legalTargets(B, 'p', mimique).map(t => t.side), ['e']);
  play(B, 'p', 'Mimique', { side: 'e', uid: B.e.board[0].uid });
  check('l\'unite devient la copie de la carte ciblee', board(B, 'p'), ['Ogre 4/5']);
  check('le modele, lui, n\'a pas bouge', board(B, 'e'), ['Ogre 4/5']);
}
{
  // Une copie repart a neuf : les degats subis s'effacent, et la carte modele reste
  // dans le paquet ou on est alle la lire.
  const meta = { id: 'mt', name: 'Metamorphose', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'copie', t: 'allyUnit', d_ou: 'pioche', quoi: 'ofType', argType: 'Golem' }] };
  const B = setup([ally('Blesse', 3, 5), meta], [frappe(2)], [golem]);
  play(B, 'p', 'Blesse');
  const u = B.p.board[0];
  play(B, 'e', 'Frappe2', { side: 'p', uid: u.uid });
  check('l\'unite est bien entamee', board(B, 'p'), ['Blesse 3/3']);
  play(B, 'p', 'Metamorphose', { side: 'p', uid: u.uid });
  check('elle devient la carte de la pioche, sans ses degats', board(B, 'p'), ['Golem 5/6']);
  check('c\'est toujours la meme unite sur le plateau', B.p.board[0].uid, u.uid);
  check('et le modele est reste dans la pioche', B.p.deck.filter(c => c.name === 'Golem').length, 1);
}
{
  const bombe = ally('Bombe', 1, 1, { keys: ['type:Bombe'], death: [{ op: 'dmg', t: 'enemyHero', v: 3 }] });
  const B = setup([singe('Singe', 'Bombe')], [frappe(99)], [bombe]);
  play(B, 'p', 'Singe');
  check('elle prend le nom et la ligne de statistiques du modele', board(B, 'p'), ['Bombe 1/1']);
  const avant = B.e.hp;
  tuer(B, 'e', 'p', 'Bombe');
  check('et son rale d\'agonie', B.e.hp, avant - 3);
}
{
  const foudre = ally('Foudre', 3, 3, { keys: ['Charge', 'type:Foudre'] });
  const B = setup([singe('Singe', 'Foudre')], [], [foudre]);
  play(B, 'p', 'Singe');
  check('la Charge du modele permet de frapper tout de suite', B.p.board[0].canAttack, true);
}
{
  // « Lui » designe l'unite qu'on vient de transformer.
  const singeur = ally('Singeur', 1, 1, {
    play: [{ op: 'copie', t: 'self', d_ou: 'pioche', quoi: 'ofType', argType: 'Golem' },
      { op: 'buff', t: 'previous', atk: 1, hp: 1 }]
  });
  const B = setup([singeur], [], [golem]);
  play(B, 'p', 'Singeur');
  check('le renfort qui suit tombe sur la copie', board(B, 'p'), ['Golem 6/7']);
}
{
  // Un seul modele, meme quand la cible designe plusieurs unites.
  const foule = { id: 'fo', name: 'Foule', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'copie', t: 'allAllies', d_ou: 'pioche', quoi: 'ofType', argType: 'Golem' }] };
  const B = setup([ally('A', 1, 1), ally('B', 2, 2), foule], [], [golem]);
  play(B, 'p', 'A');
  play(B, 'p', 'B');
  play(B, 'p', 'Foule');
  check('tout le monde devient la MEME carte', board(B, 'p'), ['Golem 5/6', 'Golem 5/6']);
}
{
  // Un jeton n'a pas de carte : on copie ce qu'il annoncait en arrivant.
  const appel = { id: 'ap', name: 'Appel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'summon', n: 1, unit: { name: 'Larve', atk: 2, hp: 2, keys: ['Taunt'] } }] };
  const mimique = ally('Mimique', 1, 1, { play: [{ op: 'copie', t: 'self', d_ou: 'plateau', tm: 'enemyUnit' }] });
  const B = setup([mimique], [appel]);
  play(B, 'e', 'Appel');
  play(B, 'p', 'Mimique', { side: 'e', uid: B.e.board[0].uid });
  check('on peut copier un jeton', board(B, 'p'), ['Larve 2/2']);
  check('avec ses mots-cles', B.p.board[0].keys, ['Taunt']);
}
{
  // Un sort n'a ni attaque ni vie : on ne peut pas en devenir la copie.
  const eclair = { id: 'ec', name: 'Eclair', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyHero', v: 2 }] };
  const singeur = ally('Singeur', 2, 2, { play: [{ op: 'copie', t: 'self', d_ou: 'pioche', quoi: 'spell' }] });
  const B = setup([singeur], [], [eclair]);
  play(B, 'p', 'Singeur');
  check('une unite ne devient pas un sort', board(B, 'p'), ['Singeur 2/2']);
}
{
  // Rien a copier : la carte le dit et ne fait rien de plus.
  const B = setup([singe('Singe', 'Golem')]);
  play(B, 'p', 'Singe');
  check('sans modele dans le paquet, l\'unite reste elle-meme', board(B, 'p'), ['Singe 1/1']);
  check('et aucune mecanique n\'est signalee comme non codee', B.pending, []);
}

// ---------------------------------------------------------------------------
// LES CIBLES SANS CAMP. Toutes les autres obligent a choisir un cote avant de choisir
// une unite ; celles-ci prennent des deux. Le camp n'est plus une question.
console.log('\nCibles sans camp');
{
  // Designee : c'est la cible fournie qui dit de quel cote elle est. Le meme sort
  // frappe donc chez soi comme en face.
  const coup = { id: 'co', name: 'Coup', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'anyUnit', v: 2 }] };
  const B = setup([ally('Mien', 2, 5), coup, { ...coup, id: 'co2', name: 'Coup2' }], [ally('Sien', 2, 5)]);
  play(B, 'e', 'Sien');
  play(B, 'p', 'Mien');
  check('les deux plateaux sont proposes au joueur',
    legalTargets(B, 'p', coup).map(t => t.side).sort(), ['e', 'p']);
  play(B, 'p', 'Coup', { side: 'e', uid: B.e.board[0].uid });
  play(B, 'p', 'Coup2', { side: 'p', uid: B.p.board[0].uid });
  check('elle frappe en face...', board(B, 'e'), ['Sien 2/3']);
  check('...comme chez soi', board(B, 'p'), ['Mien 2/3']);
}
{
  // Sans personne pour designer (un rale d'agonie), le moteur tranche par la nature de
  // l'effet : ce qui blesse part en face.
  const bombe = ally('Bombe', 1, 1, { death: [{ op: 'dmg', t: 'anyUnit', v: 3 }] });
  const B = setup([bombe], [ally('Cible', 1, 5), frappe(99)]);
  play(B, 'e', 'Cible');
  play(B, 'p', 'Bombe');
  tuer(B, 'e', 'p', 'Bombe');
  check('le rale choisit une unite adverse', board(B, 'e'), ['Cible 1/2']);
}
{
  const orage = { id: 'or', name: 'Orage', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'allUnits', v: 1 }] };
  const B = setup([ally('A', 1, 3), ally('B', 1, 3), orage], [ally('C', 1, 3)]);
  play(B, 'e', 'C');
  play(B, 'p', 'A');
  play(B, 'p', 'B');
  play(B, 'p', 'Orage');
  check('« toutes les unites » n\'epargne personne, des deux cotes',
    [...board(B, 'p'), ...board(B, 'e')], ['A 1/2', 'B 1/2', 'C 1/2']);
}
{
  // « Toutes » veut dire toutes : le porteur de l'effet en est, contrairement a
  // « Tous tes allies ».
  const cataclysme = ally('Cataclysme', 1, 3, { play: [{ op: 'dmg', t: 'allUnits', v: 1 }] });
  const B = setup([ally('A', 1, 3), cataclysme]);
  play(B, 'p', 'A');
  play(B, 'p', 'Cataclysme');
  check('le porteur se compte dedans', board(B, 'p'), ['A 1/2', 'Cataclysme 1/2']);
}
{
  // Par type, des deux cotes : une seule cible pour « tous les Chiens du plateau ».
  const rappel = { id: 'ra', name: 'Rappel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'buff', t: 'anyType:Chien', atk: 1, hp: 1 }] };
  const B = setup([ally('Chiot', 1, 1, { keys: ['type:Chien'] }), ally('Chat', 1, 1, { keys: ['type:Chat'] }), rappel],
    [ally('Molosse', 2, 2, { keys: ['type:Chien'] })]);
  play(B, 'e', 'Molosse');
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Chat');
  play(B, 'p', 'Rappel');
  check('les Chiens des deux camps sont touches',
    [...board(B, 'p'), ...board(B, 'e')], ['Chiot 2/2', 'Chat 1/1', 'Molosse 3/3']);
}
{
  // Au hasard des deux camps : on ne sait pas qui, mais quelqu'un — et une seule.
  const des = { id: 'de', name: 'Des', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'randomUnit', v: 1 }] };
  const B = setup([ally('A', 1, 3), des], [ally('C', 1, 3)]);
  play(B, 'e', 'C');
  play(B, 'p', 'A');
  play(B, 'p', 'Des');
  const pv = [...B.p.board, ...B.e.board].map(u => u.hp).sort();
  check('une seule unite est touchee, d\'un cote ou de l\'autre', pv, [2, 3]);
}
{
  // Et la copie s'en sert comme les autres : le modele peut venir de n'importe ou.
  const mimique = ally('Mimique', 1, 1, { play: [{ op: 'copie', t: 'self', d_ou: 'plateau', tm: 'anyUnit' }] });
  const B = setup([ally('Totem', 4, 6), mimique]);
  play(B, 'p', 'Totem');
  play(B, 'p', 'Mimique', { side: 'p', uid: B.p.board[0].uid });
  check('on copie un allie a soi avec une cible sans camp', board(B, 'p'), ['Totem 4/6', 'Totem 4/6']);
}

// ---------------------------------------------------------------------------
// « CHEZ QUI » ne designe plus seulement un camp fixe : « son proprietaire » suit la
// cible de l'effet, « un joueur au hasard » tire a pile ou face. C'est ce qui permet
// « l'unite ciblee devient une carte au hasard de la pioche de SON proprietaire ».
console.log('\nChez qui : son proprietaire, un joueur au hasard');
/** Le sort de la carte « Camouflage » : la cible devient une carte de SA pioche. */
const camouflage = { id: 'cam', name: 'Camouflage', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
  play: [{ op: 'copie', t: 'anyUnit', d_ou: 'pioche', qui: 'proprietaire', quoi: 'all', ordre: 'hasard' }] };
{
  // Visee en face : c'est la pioche de l'adversaire qu'on lit, pas la notre.
  const B = setup([ally('Mien', 1, 1), camouflage], [ally('Sien', 1, 1)]);
  B.p.deck = [ally('MonGolem', 5, 5)];
  B.e.deck = [ally('SonGolem', 4, 4)];
  play(B, 'e', 'Sien');
  play(B, 'p', 'Mien');
  play(B, 'p', 'Camouflage', { side: 'e', uid: B.e.board[0].uid });
  check('l unite adverse devient une carte de SA pioche', board(B, 'e'), ['SonGolem 4/4']);
  check('et la notre n a pas bouge', board(B, 'p'), ['Mien 1/1']);
  check('le modele est reste dans sa pioche', B.e.deck.length, 1);
}
{
  // La meme carte, visee chez soi : c'est notre pioche.
  const B = setup([ally('Mien', 1, 1), camouflage], [ally('Sien', 1, 1)]);
  B.p.deck = [ally('MonGolem', 5, 5)];
  B.e.deck = [ally('SonGolem', 4, 4)];
  play(B, 'e', 'Sien');
  play(B, 'p', 'Mien');
  play(B, 'p', 'Camouflage', { side: 'p', uid: B.p.board[0].uid });
  check('visee chez soi, c est notre pioche qu on lit', board(B, 'p'), ['MonGolem 5/5']);
}
{
  // « Un joueur au hasard » : on ne sait pas de quelle pioche ca sort, mais les deux
  // sortent. Quarante tirages : deux resultats identiques quarante fois de suite
  // seraient plus improbables qu'un bug.
  const roulette = { id: 'rou', name: 'Roulette', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'copie', t: 'self', d_ou: 'pioche', qui: 'hasard', quoi: 'all', ordre: 'hasard' }] };
  const vus = new Set();
  for (let i = 0; i < 40; i++) {
    const B = setup([ally('Cameleon', 1, 1, { play: roulette.play })]);
    B.p.deck = [ally('AMoi', 2, 2)];
    B.e.deck = [ally('ALui', 3, 3)];
    play(B, 'p', 'Cameleon');
    vus.add(B.p.board[0].name);
  }
  check('les deux pioches sortent', [...vus].sort(), ['ALui', 'AMoi']);
}

// ---------------------------------------------------------------------------
// PRENDRE LE CONTROLE. L'unite change de CAMP sans changer de PROPRIETAIRE : elle se
// bat pour toi, mais sa carte reste la sienne. C'est la seule chose du moteur qui
// separe « de quel cote elle est » de « a qui elle est ».
console.log('\nPrendre le controle');
const vol = { id: 'vo', name: 'Captif', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
  play: [{ op: 'prendre_le_controle', t: 'enemyUnit' }] };
{
  const B = setup([vol], [ally('Ogre', 4, 5)]);
  play(B, 'e', 'Ogre');
  play(B, 'p', 'Captif', { side: 'e', uid: B.e.board[0].uid });
  check('l unite passe de notre cote', board(B, 'p'), ['Ogre 4/5']);
  check('et quitte celui d en face', board(B, 'e'), []);
  check('elle vient d arriver : elle n attaque pas ce tour-ci', B.p.board[0].canAttack, false);
}
{
  // Une unite volee qui meurt retourne dans la defausse de SON proprietaire, mais son
  // rale d'agonie part de notre cote — c'est nous qui la controlons quand elle tombe.
  const bombe = ally('Bombe', 1, 1, { death: [{ op: 'dmg', t: 'enemyHero', v: 3 }] });
  // Une fois volee, l'unite est de NOTRE cote : c'est un sort qui frappe nos propres
  // allies qui l'abat, pas « une unite adverse ».
  const sacrifice = { id: 'sac', name: 'Sacrifice', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'allyUnit', v: 99 }] };
  const B = setup([vol, sacrifice], [bombe]);
  play(B, 'e', 'Bombe');
  play(B, 'p', 'Captif', { side: 'e', uid: B.e.board[0].uid });
  const avant = B.e.hp;
  const u = B.p.board[0];
  play(B, 'p', 'Sacrifice', { side: 'p', uid: u.uid });
  check('le rale part du cote de celui qui la controle', B.e.hp, avant - 3);
  check('mais la carte rentre chez son proprietaire', B.e.discard.some(c => c.name === 'Bombe'), true);
  check('et pas chez nous', B.p.discard.some(c => c.name === 'Bombe'), false);
}
{
  // Meme regle quand elle quitte le plateau sans mourir : elle rentre chez lui.
  const rappel = { id: 'rap', name: 'Rappel', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'renvoie_en_main', d_ou: 'plateau', t: 'allyUnit' }] };
  const B = setup([vol, rappel], [ally('Ogre', 4, 5)]);
  play(B, 'e', 'Ogre');
  play(B, 'p', 'Captif', { side: 'e', uid: B.e.board[0].uid });
  play(B, 'p', 'Rappel', { side: 'p', uid: B.p.board[0].uid });
  check('renvoyee en main, elle va dans SA main a lui', B.e.hand.some(c => c.name === 'Ogre'), true);
  check('et pas dans la notre', B.p.hand.some(c => c.name === 'Ogre'), false);
}
{
  // Prendre une unite deja a soi ne fait rien, et le dit.
  const chezSoi = { id: 'cs', name: 'Rapatriement', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'prendre_le_controle', t: 'allyUnit' }] };
  const B = setup([ally('Mien', 2, 2), chezSoi]);
  play(B, 'p', 'Mien');
  play(B, 'p', 'Rapatriement', { side: 'p', uid: B.p.board[0].uid });
  check('rien ne bouge', board(B, 'p'), ['Mien 2/2']);
}
{
  // Une unite volee garde son aura, et la donne desormais a NOS allies.
  const chef = ally('Chef', 2, 3, { aura: { scope: 'otherAllies', atk: 1, hp: 0 } });
  const B = setup([ally('Recrue', 1, 1), vol], [chef]);
  play(B, 'e', 'Chef');
  play(B, 'p', 'Recrue');
  check('avant le vol, notre recrue ne recoit rien', board(B, 'p'), ['Recrue 1/1']);
  play(B, 'p', 'Captif', { side: 'e', uid: B.e.board[0].uid });
  check('apres le vol, l aura profite a notre camp', board(B, 'p'), ['Recrue 2/1', 'Chef 2/3']);
}

// ---------------------------------------------------------------------------
// CHOISIR. Une seule des deux branches part — celle que le joueur designe en jouant la
// carte. C'est le premier effet dont les parametres sont d'autres effets.
console.log('\nChoisir');
const modale = (nom, a, b) => ({ id: nom, name: nom, type: 'spell', cost: 1, keys: [], text: '', tiers: [],
  play: [{ op: 'choisir', a, b }] });
{
  const c = modale('Offrande', { op: 'draw', v: 1 }, { op: 'armor', v: 4 });
  const B = setup([c, { ...c, id: 'of2', name: 'Offrande2' }]);
  const mainAvant = B.p.hand.length;
  play(B, 'p', 'Offrande', null, 'a');
  check('la branche A pioche', B.p.hand.length, mainAvant - 1 + 1);
  check('et ne donne pas d armure', B.p.armor, 0);
  play(B, 'p', 'Offrande2', null, 'b');
  check('la branche B donne l armure', B.p.armor, 4);
}
{
  // Sans reponse — un rale d'agonie, personne n'est la pour choisir — c'est la
  // premiere branche qui part.
  const bombe = ally('Bombe', 1, 1, {
    death: [{ op: 'choisir', a: { op: 'dmg', t: 'enemyHero', v: 3 }, b: { op: 'armor', v: 9 } }]
  });
  const B = setup([bombe], [frappe(99)]);
  play(B, 'p', 'Bombe');
  const avant = B.e.hp;
  tuer(B, 'e', 'p', 'Bombe');
  check('la premiere branche part toute seule', B.e.hp, avant - 3);
  check('la seconde n a rien fait', B.p.armor, 0);
}
{
  // « Lui » traverse une branche : la cible du choix reste celle de l'effet suivant.
  const c = { id: 'ench', name: 'Enchainement', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'choisir', a: { op: 'summon', n: 1, unit: { name: 'Larve', atk: 1, hp: 1 } }, b: { op: 'draw', v: 1 } },
      { op: 'buff', t: 'previous', atk: 2, hp: 2 }] };
  const B = setup([c]);
  play(B, 'p', 'Enchainement', null, 'a');
  check('le renfort tombe sur ce que la branche a cree', board(B, 'p'), ['Larve 3/3']);
}
{
  // Un palier « Amplifie » amplifie les DEUX branches : celle qu'on ne prend pas
  // aujourd'hui est celle qu'on prendra demain.
  const def = { id: 'am', name: 'Ambivalence', type: 'spell', cost: 1, keys: [], text: '',
    play: [{ op: 'choisir', a: { op: 'dmg', t: 'enemyHero', v: 2 }, b: { op: 'heal', t: 'ownHero', v: 2 } }],
    tiers: [{ lvl: 2, amp: 3, text: 'Effet +3' }] };
  const B = setup([resolveCard(def, 2), { ...resolveCard(def, 2), id: 'am2', name: 'Ambivalence2' }]);
  const avant = B.e.hp;
  play(B, 'p', 'Ambivalence', null, 'a');
  check('la branche A est amplifiee', B.e.hp, avant - 5);
  B.p.hp = 10;
  play(B, 'p', 'Ambivalence2', null, 'b');
  check('la branche B aussi', B.p.hp, 15);
  // Et la definition d'origine n'a pas bouge : la relire au meme niveau redonne 2+3.
  // (`resolveCard` rend toujours une branche comme une LISTE, meme ecrite ici en un
  // seul effet : c'est la ou l'ancienne forme est normalisee.)
  check('la definition n a pas ete amplifiee deux fois', resolveCard(def, 2).play[0].a[0].v, 5);
}
{
  // La carte previent qu'elle demande une reponse : c'est ce que l'interface lit.
  const c = modale('Double', { op: 'draw', v: 1 }, { op: 'armor', v: 4 });
  check('la carte reclame un choix', needsChoice(c), true);
  check('une carte ordinaire, non', needsChoice(frappe(2)), false);
}

// ---------------------------------------------------------------------------
// « LES AUTRES UNITES DU MEME TYPE QUE LUI ». Le type n'est pas ecrit sur la carte :
// c'est celui de l'unite que l'effet precedent a visee. C'est ce qui rend dicible
// « inflige 2 blessures a une unite au hasard, puis repete sur chaque unite du meme
// type » — le type n'est connu qu'une fois le hasard tire.
console.log('\nDu meme type que Lui');
const chaine = { id: 'ch', name: 'Chaine', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
  play: [{ op: 'dmg', t: 'enemyUnit', v: 2 }, { op: 'dmg', t: 'previousType', v: 2 }] };
{
  const B = setup([chaine],
    [ally('Molosse', 1, 9, { keys: ['type:Chien'] }), ally('Chiot', 1, 9, { keys: ['type:Chien'] }), ally('Chat', 1, 9, { keys: ['type:Chat'] })]);
  for (const n of ['Molosse', 'Chiot', 'Chat']) play(B, 'e', n);
  play(B, 'p', 'Chaine', { side: 'e', uid: B.e.board[0].uid });
  check('la premiere prend 2, ses semblables aussi, les autres rien',
    board(B, 'e'), ['Molosse 1/7', 'Chiot 1/7', 'Chat 1/9']);
}
{
  // Elle repete du COTE de « Lui » : un Chien a nous ne prend rien quand c'est un
  // Chien d'en face qui a ete frappe.
  const B = setup([ally('Notre Chien', 1, 9, { keys: ['type:Chien'] }), chaine],
    [ally('Leur Chien', 1, 9, { keys: ['type:Chien'] }), ally('Autre', 1, 9, { keys: ['type:Chien'] })]);
  play(B, 'p', 'Notre Chien');
  play(B, 'e', 'Leur Chien');
  play(B, 'e', 'Autre');
  play(B, 'p', 'Chaine', { side: 'e', uid: B.e.board[0].uid });
  check('la chaine reste dans le camp de la premiere touchee', board(B, 'e'), ['Leur Chien 1/7', 'Autre 1/7']);
  check('notre Chien n a rien pris', board(B, 'p'), ['Notre Chien 1/9']);
}
{
  // Une unite sans etiquette ne partage rien : la chaine s'arrete d'elle-meme.
  const B = setup([chaine], [ally('Muet', 1, 9), ally('Autre', 1, 9)]);
  play(B, 'e', 'Muet');
  play(B, 'e', 'Autre');
  play(B, 'p', 'Chaine', { side: 'e', uid: B.e.board[0].uid });
  check('sans type, personne ne suit', board(B, 'e'), ['Muet 1/7', 'Autre 1/9']);
}
{
  // « Type : tous » repond a n'importe quelle etiquette : touche en premier, il
  // entraine tous ceux qui en portent une — et personne d'autre.
  const B = setup([chaine],
    [ally('Cameleon', 1, 9, { keys: ['type_tous'] }), ally('Chiot', 1, 9, { keys: ['type:Chien'] }), ally('Muet', 1, 9)]);
  for (const n of ['Cameleon', 'Chiot', 'Muet']) play(B, 'e', n);
  play(B, 'p', 'Chaine', { side: 'e', uid: B.e.board[0].uid });
  check('« tous » entraine tout ce qui est etiquete', board(B, 'e'), ['Cameleon 1/7', 'Chiot 1/7', 'Muet 1/9']);
}

{
  // EN PREMIERE POSITION elle ne designe personne : aucun effet ne l'a precedee. La
  // validation le dit comme bloquant ; le moteur, lui, ne fait rien et l'ecrit.
  const seule = { id: 'sl', name: 'Seule', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'previousType', v: 2 }] };
  const B = setup([seule], [ally('Chiot', 1, 9, { keys: ['type:Chien'] })]);
  play(B, 'e', 'Chiot');
  play(B, 'p', 'Seule');
  check('sans effet avant elle, elle ne touche personne', board(B, 'e'), ['Chiot 1/9']);
  check('et le journal le dit', B.log.some(l => l.includes('Aucune cible')), true);
}

// ---------------------------------------------------------------------------
// UNE BRANCHE EST UNE LISTE : « inflige 2 blessures au hasard PUIS repete sur le meme
// type » est UN choix, pas deux. C'est la carte que le designer voulait ecrire.
console.log('\nUne branche porte plusieurs effets');
{
  const gobeur = ally('Gobeur', 2, 2, {
    play: [
      { op: 'choisir',
        a: [{ op: 'dmg', t: 'randomEnemyUnit', v: 2 }, { op: 'dmg', t: 'previousType', v: 2 }],
        b: [{ op: 'buff', t: 'allyUnit', atk: 1, hp: 1 }] },
      { op: 'buff', t: 'randomAllyUnit', atk: 2, hp: 2 }
    ]
  });
  const B = setup([gobeur], [ally('Chiot', 1, 9, { keys: ['type:Chien'] }), ally('Molosse', 1, 9, { keys: ['type:Chien'] })]);
  play(B, 'e', 'Chiot');
  play(B, 'e', 'Molosse');
  play(B, 'p', 'Gobeur', null, 'a');
  check('les deux effets de la branche partent', board(B, 'e'), ['Chiot 1/7', 'Molosse 1/7']);
  check('et ce qui suit le choix part aussi', board(B, 'p'), ['Gobeur 4/4']);
}
{
  // L'ancienne ecriture — une branche = UN effet, sans crochets — se lit toujours :
  // les cartes ecrites avant que la branche devienne une liste marchent telles quelles.
  const vieux = { id: 'vx', name: 'Ancienne', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'choisir', a: { op: 'armor', v: 3 }, b: { op: 'draw', v: 1 } }] };
  const B = setup([vieux]);
  play(B, 'p', 'Ancienne', null, 'a');
  check('une branche ecrite comme un seul effet fonctionne encore', B.p.armor, 3);
}

// ---------------------------------------------------------------------------
// UN TYPE QU'ON NE CONNAIT PAS ENCORE. Le filtre ne porte plus le type ecrit : il le
// LIT sur une carte, la ou on lui dit de regarder. Il n'est donc connu qu'au moment ou
// l'effet part — comme un montant variable, et resolu au meme endroit.
console.log('\nUn type lu sur une carte');
/** Un sort qui cree une carte du type de ce qu'il trouve dans la zone demandee. */
const copieur = (nom, typeDe, typeQui) => ({ id: nom, name: nom, type: 'spell', cost: 1, keys: [], text: '', tiers: [],
  play: [{ op: 'cree', choix: 'hasard', quoi: 'ofType', typeDe, typeQui, n: 1, lvl: 1 }] });
{
  // Le type vient de NOTRE main : la seule etiquette qui s'y trouve est « Chien », donc
  // la carte creee en est une.
  const B = setup([copieur('Mimetisme', 'main', 'toi')]);
  B.p.hand.push(ally('Appat', 1, 1, { keys: ['type:Chien'] }));
  play(B, 'p', 'Mimetisme');
  const creee = B.p.hand.find(c => c.name !== 'Appat');
  check('la carte creee porte le type lu en main', creee && estDuType(creee, 'Chien'), true);
}
{
  // Lu CHEZ L'ADVERSAIRE, sur son plateau : c'est son etiquette a lui qui compte.
  const B = setup([copieur('Espionnage', 'plateau', 'adversaire')], [ally('Molosse', 1, 1, { keys: ['type:Chien'] })]);
  play(B, 'e', 'Molosse');
  play(B, 'p', 'Espionnage');
  const creee = B.p.hand[0];
  check('le type vient du plateau d en face', creee && estDuType(creee, 'Chien'), true);
}
{
  // Rien a lire : aucun type, donc le filtre ne prend rien et le journal le dit.
  const B = setup([copieur('Vide', 'defausse', 'toi')]);
  B.p.discard = [];
  play(B, 'p', 'Vide');
  check('sans etiquette a lire, rien n est cree', B.p.hand.length, 0);
}
{
  // Le type lu sert a N'IMPORTE QUEL filtre : ici un deplacement, pas une creation.
  const tri = { id: 'tri', name: 'Tri', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'renvoie_en_main', d_ou: 'pioche', qui: 'toi', quoi: 'ofType', typeDe: 'plateau', typeQui: 'toi', n: 1 }] };
  const B = setup([ally('Chiot', 1, 1, { keys: ['type:Chien'] }), tri]);
  B.p.deck = [ally('Chat', 1, 1, { keys: ['type:Chat'] }), ally('Molosse', 2, 2, { keys: ['type:Chien'] })];
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Tri');
  check('le deplacement prend la carte du type lu sur le plateau',
    B.p.hand.some(c => c.name === 'Molosse'), true);
  check('et laisse celle d un autre type', B.p.deck.map(c => c.name), ['Chat']);
}

{
  // UNE CIBLE QUI NOMME UN CAMP ne se laisse pas designer de l'autre cote. Ca n'arrive
  // qu'avec deux cibles a designer sur la meme carte — elles recoivent la meme reponse
  // — et il vaut mieux que l'effet ne fasse rien que de renforcer l'adversaire.
  const double = { id: 'db', name: 'Double', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'dmg', t: 'enemyAny', v: 1 }, { op: 'buff', t: 'allyUnit', atk: 5, hp: 5 }] };
  const B = setup([ally('Mien', 1, 9), double], [ally('Sien', 1, 9)]);
  play(B, 'p', 'Mien');
  play(B, 'e', 'Sien');
  play(B, 'p', 'Double', { side: 'e', uid: B.e.board[0].uid });
  check('les degats partent sur la cible designee', board(B, 'e'), ['Sien 1/8']);
  check('mais le renfort « un de tes allies » ne va pas en face', B.e.board[0].atk, 1);
  check('et notre unite n a rien recu non plus', board(B, 'p'), ['Mien 1/9']);
}

// ---------------------------------------------------------------------------
// LE PALIER « CHOISIT LES DEUX ». Au-dela du niveau, la carte ne demande plus rien :
// les deux branches partent, dans l'ordre. C'est `resolveCard` qui la DEROULE, une
// fois pour toutes — le moteur, le bot et l'interface ne voient plus aucun choix.
console.log('\nPalier « Choisit les deux »');
const ambivalent = {
  id: 'amb', name: 'Ambivalent', type: 'spell', cost: 1, keys: [], text: '',
  play: [{ op: 'choisir', a: [{ op: 'armor', v: 3 }], b: [{ op: 'draw', v: 1 }] }],
  tiers: [{ lvl: 5, lesDeux: true, text: 'les deux choix partent' }]
};
{
  // Sous le palier : une seule branche, celle qu'on designe.
  const B = setup([resolveCard(ambivalent, 1)]);
  const main = B.p.hand.length;
  play(B, 'p', 'Ambivalent', null, 'a');
  check('avant le palier, seule la branche choisie part', [B.p.armor, B.p.hand.length], [3, main - 1]);
}
{
  const carte = resolveCard(ambivalent, 5);
  check('au palier, la carte n a plus rien a demander', needsChoice(carte), false);
  const B = setup([carte]);
  const main = B.p.hand.length;
  play(B, 'p', 'Ambivalent');
  check('les deux branches partent', [B.p.armor, B.p.hand.length], [3, main - 1 + 1]);
}
{
  // Deroulee, la carte reste amplifiable : les deux branches profitent du palier.
  const def = { ...ambivalent, id: 'am2', name: 'Ambivalent2',
    play: [{ op: 'choisir', a: [{ op: 'dmg', t: 'enemyHero', v: 2 }], b: [{ op: 'heal', t: 'ownHero', v: 2 }] }],
    tiers: [{ lvl: 3, lesDeux: true }, { lvl: 5, amp: 1, text: 'Effet +1' }] };
  const B = setup([resolveCard(def, 5)]);
  B.p.hp = 20;
  const avant = B.e.hp;
  play(B, 'p', 'Ambivalent2');
  check('les deux branches deroulees sont amplifiees', [avant - B.e.hp, B.p.hp], [3, 23]);
}
{
  // La definition d'origine n'est pas touchee : relue plus bas, elle choisit encore.
  check('la carte de depart choisit toujours', needsChoice(resolveCard(ambivalent, 1)), true);
}

// ---------------------------------------------------------------------------
// SWITCH. Chaque slot d'un personnage porte deux cartes ; l'effet echange l'une pour
// l'autre. Dans un paquet, la carte est remplacee sur place pour tout le combat ; sur
// le plateau, l'unite DEVIENT l'autre face — et si c'est un sort, elle s'en va en le
// lancant. L'echange va dans les deux sens : sinon l'effet serait mort sur la moitie
// des cartes du jeu, celles qu'on a justement equipees en switch.
console.log('\nSwitch');
const chenille = () => ({ id: 'banc_base', name: 'Chenille', type: 'ally', cost: 1, atk: 1, hp: 1, keys: [], text: '', play: [], tiers: [] });
const cocon = () => ({ id: 'banc_corps', name: 'Cocon', type: 'ally', cost: 1, atk: 0, hp: 4, keys: [], text: '', play: [], tiers: [] });
const switcheur = (t, extra = {}) => ({ id: 'sw' + (extra.id || ''), name: extra.name || 'Mue', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
  play: [{ op: 'switch', d_ou: 'plateau', t }] });
{
  const B = setup([chenille(), switcheur('allyUnit')]);
  play(B, 'p', 'Chenille');
  const uid = B.p.board[0].uid;
  play(B, 'p', 'Mue', { side: 'p', uid });
  check('l unite devient son autre face', board(B, 'p'), ['Papillon 3/2']);
  check('c est toujours la meme unite sur le plateau', B.p.board[0].uid, uid);
  check('avec les mots-cles de l autre face', B.p.board[0].keys, ['Charge']);
}
{
  // Et dans l'autre sens : une carte deja switchee revient a sa base.
  const papillon = { id: 'banc_switch', name: 'Papillon', type: 'ally', cost: 1, atk: 3, hp: 2, keys: ['Charge'], text: '', play: [], tiers: [] };
  const B = setup([papillon, switcheur('allyUnit')]);
  play(B, 'p', 'Papillon');
  play(B, 'p', 'Mue', { side: 'p', uid: B.p.board[0].uid });
  check('un switch revient a sa base', board(B, 'p'), ['Chenille 1/1']);
}
{
  // L'autre face est un SORT : l'unite s'en va, le sort part et se choisit sa cible.
  const B = setup([cocon(), switcheur('allyUnit')]);
  play(B, 'p', 'Cocon');
  const avant = B.e.hp;
  play(B, 'p', 'Mue', { side: 'p', uid: B.p.board[0].uid });
  check('l unite a quitte le plateau', board(B, 'p'), []);
  check('et le sort de l autre face est parti', B.e.hp, avant - 3);
  check('la carte finit a la defausse de son proprietaire', B.p.discard.some(c => c.name === 'Envol'), true);
  check('sans passer par la mort : aucun rale n a ete compte', B.fired.death || 0, 0);
}
{
  // Dans un paquet : la carte est echangee sur place, elle ne bouge pas de zone.
  const enMain = { id: 'em', name: 'Retournement', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'switch', d_ou: 'main', qui: 'toi', quoi: 'oneCard', argCard: 'banc_base', n: 1 }] };
  const B = setup([enMain, chenille()]);
  play(B, 'p', 'Retournement');
  check('la carte de la main a change de face', B.p.hand.map(c => c.name), ['Papillon']);
  check('et elle est toujours en main', B.p.hand.length, 1);
}
{
  // Une carte libre n'occupe aucun slot : elle n'a pas d'autre face, et on le dit.
  const B = setup([ally('Orpheline', 2, 2), switcheur('allyUnit')]);
  play(B, 'p', 'Orpheline');
  play(B, 'p', 'Mue', { side: 'p', uid: B.p.board[0].uid });
  check('sans autre face, rien ne change', board(B, 'p'), ['Orpheline 2/2']);
  check('et le journal le dit', B.log.some(l => l.includes("n'a pas d'autre face")), true);
}
{
  // On peut switcher EN FACE : c'est la meme mecanique, l'autre camp n'y coupe pas.
  const B = setup([switcheur('enemyUnit')], [chenille()]);
  play(B, 'e', 'Chenille');
  play(B, 'p', 'Mue', { side: 'e', uid: B.e.board[0].uid });
  check('une unite adverse se switche aussi', board(B, 'e'), ['Papillon 3/2']);
}

// ---------------------------------------------------------------------------
// « LUI » DANS UN EVENEMENT. Un evenement a un SUJET — l'allie qu'on vient de poser,
// l'unite qui vient d'attaquer — et ce sujet est « Lui » pour les effets du moment.
// Sans ca, « quand tu joues un allie, les autres unites du meme type que Lui gagnent
// +1/+1 » ne toucherait personne : la chaine commencerait vide.
console.log('\nLe sujet d un evenement est « Lui »');
{
  const cohorte = ally('Cohorte', 4, 4, {
    [eventSlot('ally', 'self')]: [{ op: 'buff', t: 'previousType', atk: 1, hp: 1 }]
  });
  const B = setup([cohorte, ally('Chiot', 1, 1, { keys: ['type:Chien'] }),
    ally('Chat', 1, 1, { keys: ['type:Chat'] }), ally('Molosse', 1, 1, { keys: ['type:Chien'] })]);
  play(B, 'p', 'Cohorte');
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Chat');
  check('rien tant qu il n y a pas deux fois le meme type',
    board(B, 'p'), ['Cohorte 4/4', 'Chiot 1/1', 'Chat 1/1']);
  play(B, 'p', 'Molosse');
  check('le second Chien renforce le premier, et lui seul',
    board(B, 'p'), ['Cohorte 4/4', 'Chiot 2/2', 'Chat 1/1', 'Molosse 1/1']);
}
{
  // Le moment est ecoute par TOUT LE MONDE, pas seulement par le sujet : c'est la
  // Cohorte qui porte l'effet, pas l'allie qu'on pose.
  const espion = ally('Espion', 1, 1, {
    [eventSlot('ally', 'foe')]: [{ op: 'dmg', t: 'previous', v: 2 }]
  });
  const B = setup([espion], [ally('Brute', 2, 5)]);
  play(B, 'p', 'Espion');
  play(B, 'e', 'Brute');
  check('« quand l adversaire joue un allie » frappe Lui', board(B, 'e'), ['Brute 2/3']);
}
{
  // Un evenement SANS sujet ne designe personne : « Lui » y reste vide.
  const nerveux = ally('Nerveux', 1, 1, {
    [eventSlot('draw', 'self')]: [{ op: 'dmg', t: 'previous', v: 2 }]
  });
  const B = setup([nerveux], [ally('Brute', 2, 5)]);
  play(B, 'e', 'Brute');
  play(B, 'p', 'Nerveux');
  draw(B, 'p', 1);
  check('une pioche n a pas de sujet : rien n est vise', board(B, 'e'), ['Brute 2/5']);
}

// ---------------------------------------------------------------------------
// LES CIBLES D'UN « CHOISIR » SONT DANS SES BRANCHES. Sans descendre dedans, une carte
// dont tout le contenu est dans un choix paraitrait n'avoir aucune cible : elle
// partirait sans rien viser. Et la branche etant choisie AVANT, on ne propose que les
// cibles qu'elle demande.
console.log('\nCibler depuis une branche');
const modal = ally('Modal', 2, 2, {
  play: [{ op: 'choisir',
    a: [{ op: 'dmg', t: 'enemyUnit', v: 2 }],
    b: [{ op: 'buff', t: 'allyUnit', atk: 2, hp: 2 }] }]
});
{
  const B = setup([ally('Mien', 1, 5), modal], [ally('Sien', 1, 5)]);
  play(B, 'p', 'Mien');
  play(B, 'e', 'Sien');
  check('la carte reclame bien une cible', needsTarget(modal), true);
  check('sans reponse, les deux camps sont proposes',
    legalTargets(B, 'p', modal).map(t => t.side).sort(), ['e', 'p']);
  check('branche A : seulement en face', legalTargets(B, 'p', modal, 'a').map(t => t.side), ['e']);
  check('branche B : seulement chez soi', legalTargets(B, 'p', modal, 'b').map(t => t.side), ['p']);
}
{
  // Et la carte part vraiment sur la cible designee, branche par branche.
  const B = setup([ally('Mien', 1, 5), modal, { ...modal, id: 'm2', name: 'Modal2' }], [ally('Sien', 1, 5)]);
  play(B, 'p', 'Mien');
  play(B, 'e', 'Sien');
  play(B, 'p', 'Modal', { side: 'e', uid: B.e.board[0].uid }, 'a');
  check('branche A frappe la cible designee', board(B, 'e'), ['Sien 1/3']);
  play(B, 'p', 'Modal2', { side: 'p', uid: B.p.board[0].uid }, 'b');
  check('branche B renforce la notre', board(B, 'p')[0], 'Mien 3/7');
}
{
  // UNE BRANCHE SUFFIT : un choix dont l'autre moitie ne trouve personne reste jouable.
  const secours = { id: 'sec', name: 'Secours', type: 'spell', cost: 1, keys: [], text: '', tiers: [],
    play: [{ op: 'choisir', a: [{ op: 'armor', v: 8 }], b: [{ op: 'dmg', t: 'enemyUnit', v: 1 }] }] };
  const B = setup([secours]);
  check('jouable meme sans unite a viser', canPlay(B, 'p', B.p.hand[0]), true);
  play(B, 'p', 'Secours', null, 'a');
  check('et la branche sans cible fait son travail', B.p.armor, 8);
}

// ---------------------------------------------------------------------------
// LES REGLES DE VALIDATION qui dependent du registre. Elles se lisent depuis le
// builder, ou personne ne les teste : une faute de champ (`def.event`, le drapeau, au
// lieu de `def.ev`, l'identifiant) suffit a signaler une carte parfaitement valide.
console.log('\nValidation : « Lui » selon le moment');
{
  const carte = (nom, slot) => ({
    id: nom, name: nom, type: 'ally', cost: 1, atk: 1, hp: 1, keys: [], text: '',
    play: [], statics: [], tiers: [], [slot]: [{ op: 'buff', t: 'previousType', atk: 1, hp: 1 }]
  });
  const DB = {
    characters: [{ id: 'x', name: 'Test', switches: [], cards: [
      carte('Cohorte', eventSlot('ally', 'self')),   // l'evenement a un sujet : c'est « Lui »
      carte('Fautive', eventSlot('draw', 'self')),   // une pioche n'a pas de sujet
      carte('Muette', 'play'),                       // « A la pose » non plus
      null, null] }],
    library: [], npcs: [], fatigue: [], starters: []
  };
  const dit = nom => validateData(DB, ALL_EFFECTS, ALL_KEYWORDS)
    .some(i => i.bad && i.msg.includes(nom) && i.msg.includes('aucun effet ne le précède'));
  check('un evenement a sujet n est pas signale', dit('Cohorte'), false);
  check('un evenement sans sujet, si', dit('Fautive'), true);
  check('un moment ordinaire aussi', dit('Muette'), true);
}

// ---------------------------------------------------------------------------
// LA GARDE D'UN MOMENT — « seulement quand c'est un Chien qui attaque », « seulement
// quand c'est cette unite-la ». L'evenement dit ce qui se produit, la garde regarde le
// SUJET et decide si le moment part vraiment. Sans garde, il part toujours.
console.log('\nLa garde d un moment');
const guetteur = (nom, garde) => ally(nom, 1, 9, {
  [eventSlot('attack', 'self')]: [{ op: 'dmg', t: 'enemyHero', v: 1 }],
  gardes: garde ? { [eventSlot('attack', 'self')]: garde } : undefined
});
/** Fait attaquer une unite a nous, et rend les PV perdus par le heros adverse. */
function attaqueAvec(B, nom) {
  const u = B.p.board.find(x => x.name === nom);
  u.canAttack = true;
  const avant = B.e.hp;
  attack(B, 'p', u.uid, { side: 'e', uid: 'hero' });
  return avant - B.e.hp - u.atk;   // ce que le moment a ajoute, hors degats de l'attaque
}
{
  const B = setup([guetteur('Guetteur'), ally('Chiot', 1, 9, { keys: ['type:Chien'] })]);
  play(B, 'p', 'Guetteur');
  play(B, 'p', 'Chiot');
  check('sans garde, le moment part sur n importe qui', attaqueAvec(B, 'Chiot'), 1);
  check('et sur le porteur aussi', attaqueAvec(B, 'Guetteur'), 1);
}
{
  // « Cette unite » : le moment ne part que quand c'est LE PORTEUR qui attaque.
  const B = setup([guetteur('Guetteur', 'moi'), ally('Chiot', 1, 9, { keys: ['type:Chien'] })]);
  play(B, 'p', 'Guetteur');
  play(B, 'p', 'Chiot');
  check('un autre attaque : rien', attaqueAvec(B, 'Chiot'), 0);
  check('le porteur attaque : ca part', attaqueAvec(B, 'Guetteur'), 1);
}
{
  // « Une unite d'un type » : le sujet doit porter l'etiquette.
  const B = setup([guetteur('Guetteur', 'type:Chien'), ally('Chiot', 1, 9, { keys: ['type:Chien'] }),
    ally('Chat', 1, 9, { keys: ['type:Chat'] })]);
  play(B, 'p', 'Guetteur');
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Chat');
  check('un Chien attaque : ca part', attaqueAvec(B, 'Chiot'), 1);
  check('un Chat attaque : rien', attaqueAvec(B, 'Chat'), 0);
}
{
  // « Du meme type que le porteur » : pas de valeur a ecrire, c'est le type de la carte.
  const B = setup([guetteur('Meneur', 'memeType'), ally('Chiot', 1, 9, { keys: ['type:Chien'] }),
    ally('Chat', 1, 9, { keys: ['type:Chat'] })]);
  B.p.hand[0].keys = ['type:Chien'];
  play(B, 'p', 'Meneur');
  play(B, 'p', 'Chiot');
  play(B, 'p', 'Chat');
  check('le meme type que le porteur : ca part', attaqueAvec(B, 'Chiot'), 1);
  check('un autre type : rien', attaqueAvec(B, 'Chat'), 0);
}
{
  // La garde suit la carte a travers `resolveCard` : elle n'est pas perdue au passage.
  const def = { ...guetteur('Garde', 'type:Chien'), id: 'gd', tiers: [{ lvl: 2, amp: 1, text: 'Effet +1' }] };
  const c = resolveCard(def, 2);
  check('la garde survit a la resolution', c.gardes[eventSlot('attack', 'self')], 'type:Chien');
  check('et le libelle la dit', momentLabel(eventSlot('attack', 'self'), c).includes('Chien seulement'), true);
}

console.log(`\n${pass} test(s) passe(s), ${fail} echec(s).`);
process.exit(fail ? 1 : 0);
