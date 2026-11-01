// Ecrit (ou re-ecrit) les 14 CARTES DE LA PILE DE FATIGUE dans characters.data.js, et la pile elle-meme.
// Conception : discussion du 1er nov. 2026 avec le game designer — la carte de fatigue est PAYEE comme les autres,
// et la pile est SYMETRIQUE. Tant que la partie est jeune elle est plus faible qu'une carte de deck ; elle grossit
// avec la partie (tours joues, unites mortes, defausse, allies...) et finit par TERMINER la partie, progressivement,
// sans « tu n'as plus de cartes, tu es mort ». Une espece = une carte, chacune grossit sur SON axe.
// Les nombres (couts, decalages « tours - k ») sont un PREMIER JET : a regler par la mesure (matchups / simulate).
// Idempotent : relancer reecrit les memes cartes (⚠ ecrase les retouches faites depuis dans le builder).
//   node scripts/gen-fatigue.mjs [fichier]
import { readFileSync, writeFileSync } from 'node:fs';

const F = process.argv[2] || 'game/data/characters.data.js';
const src = readFileSync(F, 'utf8');
const crlf = src.includes('\r\n');
const lf = src.replace(/\r\n/g, '\n');
const PRE = 'export const CHARACTER_DATA = ';
const i0 = lf.indexOf(PRE), head = lf.slice(0, i0 + PRE.length), body = lf.slice(head.length);
const end = body.lastIndexOf('};');
const D = JSON.parse(body.slice(0, end + 1));

const cnt = (src, arg = '', plus = 0) => ({ src, arg, plus });
const IMG = e => `Graphical Assets/Cards/Fatigue/Fatigue ${e}.png`;
const ally = o => ({
  id: o.id, name: o.name, type: 'ally', cost: o.cost, keys: o.keys || [], text: o.text,
  play: o.play || [], tiers: [], atk: o.atk ?? 0, hp: o.hp ?? 0, statics: [],
  ...(o.death ? { death: o.death } : {}), ...(o.turnEnd ? { turnEnd: o.turnEnd } : {}),
  sprite: IMG(o.img)
});
const tok = (name, atk, hp, keys) => ({ name, atk, hp, keys, statics: [] });
const pose = (qui, chezMoi) => ({
  op: 'pose_sur_le_plateau', d_ou: 'defausse', choix: 'precise', carte: '', quoi: 'ally', t: 'enemyUnit',
  qui, n: 1, atk: 0, hp: 0, ...(chezMoi ? { chez_moi: true } : {})
});
const copie = (d_ou, extra) => ({
  op: 'copie', t: 'self', d_ou, choix: 'precise', carte: '', quoi: 'ally', argCard: '', tm: 'anyUnit', qui: 'toi', ordre: 'hasard', ...extra
});

const CARTES = [
  // Le Chien (card_njt2j1) n'est pas touche : 1/1 qui grossit de tes tours joues, -7/-7 a l'arrivee (1/1 au tour 8).
  // ---- CORPS ----
  ally({ id: 'fat_loup', name: 'Loup de la fatigue', cost: 5, img: 'Wolf',
    keys: ['type:Loup', 'characteristique_variable:both:unitesMortes::1'],
    text: 'Attaque et vie = les unités mortes dans la partie (les deux camps), +1.' }),
  ally({ id: 'fat_paresseux', name: 'Paresseux de la fatigue', cost: 6, atk: 1, img: 'Sloth',
    keys: ['Taunt', 'type:Paresseux', 'characteristique_variable:hp:ownTurns:::2'],
    text: 'Provocation. Vie = 2 × tes tours joués. Râle d\'agonie : gagne X d\'armure, X est le nombre de tes tours joués.',
    death: [{ op: 'armor', v: cnt('ownTurns') }] }),
  ally({ id: 'fat_pieuvre', name: 'Pieuvre de la fatigue', cost: 6, atk: 1, hp: 1, img: 'Octopus', keys: ['type:Pieuvre'],
    text: 'Fin de ton tour : gagne +X/+X, X est le nombre de cartes dans ta défausse.',
    turnEnd: [{ op: 'buff', t: 'self', atk: cnt('discardCards'), hp: cnt('discardCards') }] }),
  // ---- DEGATS DIRECTS ----
  ally({ id: 'card_kgwz53', name: 'Chat de la fatigue', cost: 4, atk: 2, hp: 2, img: 'Cat', keys: ['type:Chat'],
    text: 'Cri de guerre : Inflige X blessures où X est le nombre de sorts lancés cette partie.',
    play: [{ op: 'dmg', t: 'enemyAny', v: cnt('spellsGame') }] }),
  ally({ id: 'card_l7cd1z', name: 'Corbeau de la fatigue', cost: 4, atk: 1, hp: 1, img: 'Raven', keys: ['elusif'],
    text: 'Elusif. Cri de guerre : Draine X PV à l\'adversaire. X est le nombre de cartes dans la défausse.',
    play: [{ op: 'dmg', t: 'enemyHero', v: cnt('discardCards') }, { op: 'heal', t: 'ownHero', v: cnt('discardCards') }] }),
  ally({ id: 'card_9g5803', name: 'Rouge Gorge de la Fatigue', cost: 5, atk: 5, hp: 1, img: 'Robin', keys: ['Charge'],
    text: 'Charge. Cri de guerre : inflige X blessures au héros adverse, X = tes tours joués − 6.',
    play: [{ op: 'dmg', t: 'enemyHero', v: cnt('ownTurns', '', -6) }] }),
  ally({ id: 'card_fhdq9s', name: 'Faucon de la fatigue', cost: 5, atk: 0, hp: 3, img: 'Falcon',
    keys: ['Charge', 'type:Faucon', 'characteristique_variable:atk:ownTurns::-4'],
    text: 'Charge. Attaque = tes tours joués − 4.' }),
  // ---- LARGEUR : « moins nombreux mais plus gros » (Lapin) contre « plein de petits » (Souris) ----
  ally({ id: 'fat_lapin', name: 'Lapin de la fatigue', cost: 8, atk: 2, hp: 2, img: 'Rabbit', keys: ['type:Lapin'],
    text: 'Cri de guerre : invoque 3 Lapins dont l\'attaque et la vie valent tes tours joués − 10.',
    play: [{ op: 'summon', n: 3, unit: tok('Lapin de la fatigue', 0, 0, ['type:Lapin', 'characteristique_variable:both:ownTurns::-10']) }] }),
  ally({ id: 'fat_souris', name: 'Souris de la fatigue', cost: 6, atk: 1, hp: 1, img: 'Mice', keys: ['type:Souris'],
    text: 'Cri de guerre : invoque X Souris 1/1, X = tes tours joués − 4.',
    play: [{ op: 'summon', n: cnt('ownTurns', '', -4), unit: tok('Souris', 1, 1, ['type:Souris']) }] }),
  ally({ id: 'card_4hz1f1', name: 'Grenouille de la fatigue', cost: 5, atk: 2, hp: 2, img: 'Toad', keys: ['elusif'],
    text: 'Elusif. Cri de guerre : donne +X/+X à un allié, X est le nombre de tes alliés en jeu.',
    play: [{ op: 'buff', t: 'allyUnit', atk: cnt('allyUnits'), hp: cnt('allyUnits') }] }),
  // ---- REPONSES ET REANIMATION ----
  ally({ id: 'card_r7qoup', name: 'Chouette de la fatigue', cost: 6, atk: 2, hp: 2, img: 'Owl', keys: [],
    text: 'Détruit une unité adverse', play: [{ op: 'detruit', t: 'enemyUnit' }] }),
  ally({ id: 'fat_cameleon', name: 'Caméléon de la fatigue', cost: 5, atk: 1, hp: 1, img: 'Cameleon', keys: ['type:Cameleon'],
    text: 'Cri de guerre, au choix : devient une copie d\'une unité en jeu, ou d\'une unité au hasard de ta défausse.',
    play: [{ op: 'choisir', a: [copie('plateau', { quoi: 'all' })], b: [copie('defausse')], c: [] }] }),
  ally({ id: 'fat_chevre', name: 'Chèvre de la fatigue', cost: 6, atk: 3, hp: 3, img: 'Goat', keys: ['type:Chèvre'],
    text: 'Cri de guerre, au choix : réanime une unité au hasard de ta défausse, ou de la défausse adverse (elle sert de ton côté, puis retourne chez son propriétaire).',
    play: [{ op: 'choisir', a: [pose('toi', false)], b: [pose('adversaire', true)], c: [] }] })
];

const IDS_PILE = ['card_njt2j1', 'card_kgwz53', 'card_l7cd1z', 'card_9g5803', 'card_fhdq9s', 'card_4hz1f1', 'card_r7qoup',
  'fat_loup', 'fat_paresseux', 'fat_pieuvre', 'fat_lapin', 'fat_souris', 'fat_cameleon', 'fat_chevre'];
for (const c of CARTES) {
  const at = D.library.findIndex(x => x.id === c.id);
  if (at >= 0) D.library[at] = c; else D.library.push(c);
}
D.fatigue = IDS_PILE.map(card => ({ card, n: 1 }));
const manque = IDS_PILE.filter(id => !D.library.some(c => c.id === id));
if (manque.length) throw new Error('cartes introuvables : ' + manque.join(', '));

const ecrit = head + JSON.stringify(D, null, 2) + body.slice(end + 1);
writeFileSync(F, crlf ? ecrit.replace(/\n/g, '\r\n') : ecrit);
console.log(`pile de fatigue : ${D.fatigue.length} cartes (${CARTES.length} ecrites, Chien inchange)`);
