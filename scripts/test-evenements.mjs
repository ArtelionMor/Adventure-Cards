// BANC DES EVENEMENTS DU COMBAT — le journal graphique dit-il vrai ?
//
//   node scripts/test-evenements.mjs [parties]
//
// Les evenements (combat/evenements.js) racontent un combat en donnees : qui a fait quoi, avec
// quels chiffres avant et apres, et a cause de QUOI. Un recit qui se trompe ne casse rien et
// ne se voit pas : il montre une mort sans son coup, un coup sans sa carte, un PV qui ne tombe
// pas juste — et le joueur qui cherche a comprendre sa defaite lit un faux. D'ou ce banc, qui
// verifie quatre choses :
//   1. ETEINT PAR DEFAUT, et SANS EFFET : un combat enregistre se joue mot pour mot comme un
//      combat qui ne l'est pas (memes tirages, memes lignes de journal, memes PV) ;
//   2. une FORME saine : numerotes sans trou, causes qui pointent en arriere, JSON pur ;
//   3. des SCENARIOS exacts, dont celui de la maquette du game designer (un Chien 3/3 contre
//      un Hibou 2/5 : 5 → 2 d'un cote, 3 → 1 de l'autre) et un rale d'agonie en chaine ;
//   4. la COMPLETUDE sur des parties entieres : rejouer les evenements redonne les PV de fin,
//      et toute unite qui meurt ou qui reste en jeu est nee d'un evenement.
import { CHAR_BY_ID, resolveCard } from '../game/src/config/characters.js';
import { CHARACTER_DATA } from '../game/data/characters.data.js';
import { ENCOUNTERS } from '../game/src/config/world.js';
import { createBattle, cloneBattle } from '../game/src/combat/engine.js';
import { botAction } from '../game/src/combat/ai.js';
import { joue } from '../game/src/combat/journal.js';

const rouge = t => `\x1b[31m${t}\x1b[0m`;
const vert = t => `\x1b[32m${t}\x1b[0m`;

const PARTIES = Number(process.argv[2]) || 60;

let passes = 0;
const echecs = [];
function verifie(nom, ok, detail) {
  if (ok) { passes++; return true; }
  echecs.push(`${nom} — ${detail}`);
  return false;
}
const dejaDit = new Set();
/** Un echec par regle, pas un par partie : 60 fois la meme phrase n'apprend rien. */
function verifieUneFois(nom, ok, detail) {
  if (ok) { passes++; return true; }
  if (dejaDit.has(nom)) return false;
  dejaDit.add(nom);
  echecs.push(`${nom} — ${detail}`);
  return false;
}

// Des tirages graines : sans eux, deux parties « identiques » ne le sont pas.
function graine(s) {
  return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const vraiHasard = Math.random;

// ----------------------------------------------------------------- les camps
function campHeros(ids, niveau) {
  const chars = ids.map(id => CHAR_BY_ID[id]).filter(Boolean);
  return {
    name: chars.map(c => c.name).join('&'), sprite: chars[0].sprite,
    hp: chars.reduce((a, c) => a + c.stats.hp, 0),
    mana: Math.max(...chars.map(c => c.stats.mana)),
    hand: Math.max(...chars.map(c => c.stats.hand)),
    deck: chars.flatMap(ch => ch.cards.map(c => ({ ...resolveCard(c, niveau), sprite: ch.sprite })))
  };
}
const campPnj = id => {
  const e = ENCOUNTERS[id];
  return { name: e.name, sprite: e.sprite, hp: e.hp, mana: e.mana, hand: e.hand, deck: e.deck.map(c => ({ ...c })) };
};
const IDS = (CHARACTER_DATA.characters || []).map(c => c.id);
const RENCONTRES = Object.keys(ENCOUNTERS);

/** Une partie bot contre bot, tirages graines. Rend le combat. */
function partie(g, evenements) {
  const equipe = [IDS[g % IDS.length], IDS[(g * 3 + 1) % IDS.length], IDS[(g * 5 + 2) % IDS.length]].filter((x, i, a) => a.indexOf(x) === i);
  const renc = RENCONTRES[g % RENCONTRES.length];
  Math.random = graine(7000 + g);
  const B = createBattle(campHeros(equipe, 5 + (g % 6)), campPnj(renc), evenements ? { evenements: true } : {});
  const pv0 = { p: B.p.maxHp, e: B.e.maxHp };
  let garde = 0;
  while (!B.over && garde++ < 4000) {
    const k = B.turn;
    const a = botAction(B, k, k === 'e' ? ENCOUNTERS[renc].ia : undefined);
    if (!joue(B, k, a, 'bot', null)) joue(B, k, { type: 'end' }, 'bot', null);
  }
  Math.random = vraiHasard;
  return { B, pv0 };
}

// ------------------------------------------------- les scenarios, a la main
const carte = (nom, atk, hp, plus = {}) => ({
  id: nom.toLowerCase(), name: nom, type: 'ally', cost: 0, atk, hp, keys: [], play: [], sprite: '', ...plus
});
function duel(cartesP, cartesE) {
  const cfg = (nom, cartes) => ({ name: nom, sprite: '', hp: 30, mana: 5, hand: 1, deck: cartes });
  return createBattle(cfg('Toi', cartesP), cfg('Lui', cartesE), { evenements: true });
}
// Les actions des scenarios passent par joue() — le chemin du jeu, le seul.
const jouer = (B, k, index, target = null) => joue(B, k, { type: 'play', index, zone: 'main', target, choix: null }, 'humain');
const frapper = (B, k, uid, target) => joue(B, k, { type: 'attack', uid, target }, 'humain');
const finDeTour = B => joue(B, B.turn, { type: 'end' }, 'humain');
const trouve = (B, t, f = () => true) => B.evts.filter(e => e.t === t && f(e));

// ------------------------------------------------------------------ 1. eteint
{
  const B = createBattle(campHeros(['dog'], 5), campPnj('wolf'), {});
  verifie('eteint par defaut : pas de B.evts', B.evts === undefined, 'createBattle sans option a ouvert l\'enregistrement.');
  const C = cloneBattle(duel([carte('A', 1, 1)], [carte('B', 1, 1)]));
  verifie('une copie du combat n\'emporte pas les evenements', C.evts === undefined && C.evtCause === undefined, 'cloneBattle a copie l\'histoire.');
  // jouer sur la copie n'ecrit pas dans l'original
  const O = duel([carte('A', 1, 1)], [carte('B', 1, 1)]);
  const n0 = O.evts.length;
  const K = cloneBattle(O);
  jouer(K, 'p', 0);
  verifie('jouer sur la copie n\'ecrit pas dans le recit', O.evts.length === n0, 'la copie ecrit dans les evenements de l\'original.');
}

// ------------------------------------------- 3. le duel de la maquette (3/3 contre 2/5)
{
  const B = duel([carte('Chien', 3, 3)], [carte('Hibou', 2, 5)]);
  jouer(B, 'p', 0);                  // le Chien arrive
  finDeTour(B);                           // tour de l'adversaire
  jouer(B, 'e', 0);                  // le Hibou arrive
  finDeTour(B);                           // retour au Chien
  const chien = B.p.board[0], hibou = B.e.board[0];
  frapper(B, 'p', chien.uid, { side: 'e', uid: hibou.uid });

  const att = trouve(B, 'attaque')[0];
  verifie('duel : un evenement `attaque`', !!att && att.src.nom === 'Chien' && att.cible.nom === 'Hibou', 'pas d\'attaque Chien → Hibou.');
  const coups = trouve(B, 'degats', e => e.cause === (att && att.i));
  verifie('duel : deux coups causes par l\'attaque (le coup, la riposte)', coups.length === 2, `${coups.length} coup(s) au lieu de 2.`);
  const coup = coups.find(e => !e.riposte), rip = coups.find(e => e.riposte);
  verifie('duel : le Hibou passe de 5 a 2', coup && coup.cible.nom === 'Hibou' && coup.avant === 5 && coup.apres === 2 && coup.perdu === 3, JSON.stringify(coup));
  verifie('duel : le Chien passe de 3 a 1 a la riposte', rip && rip.cible.nom === 'Chien' && rip.avant === 3 && rip.apres === 1 && rip.perdu === 2, JSON.stringify(rip));
  verifie('duel : la riposte vient du Hibou', rip && rip.src.nom === 'Hibou' && rip.src.atk === 2, JSON.stringify(rip && rip.src));
  verifie('duel : personne ne meurt', trouve(B, 'meurt').length === 0, 'un 3/3 et un 2/5 ne se tuent pas.');
  const joues = trouve(B, 'joue');
  verifie('duel : deux cartes jouees, chacune suivie de son unite',
    joues.length === 2 && trouve(B, 'invoque', e => e.via === 'carte' && e.cause === joues[0].i).length === 1,
    `${joues.length} carte(s) jouee(s).`);
  verifie('duel : les tours sont des evenements sans cause', trouve(B, 'tour').every(e => e.cause === null) && trouve(B, 'tour').length >= 3,
    'un evenement `tour` a une cause, ou il en manque.');
}

// ------------------------------------------- un rale d'agonie, du coup a l'invocation
{
  const chiot = { name: 'Chiot', atk: 1, hp: 1, keys: [] };
  const B = duel(
    [carte('Brave', 1, 1, { death: [{ op: 'summon', n: 1, unit: chiot }] })],
    [carte('Brute', 4, 9)]);
  jouer(B, 'p', 0);
  finDeTour(B);
  jouer(B, 'e', 0);          // la Brute arrive : elle ne peut pas encore frapper
  finDeTour(B);
  finDeTour(B);                   // le tour suivant de l'adversaire : elle est prete
  const brute = B.e.board[0];
  frapper(B, 'e', brute.uid, { side: 'p', uid: B.p.board[0].uid });
  const mort = trouve(B, 'meurt', e => e.unite.nom === 'Brave')[0];
  verifie('rale : le Brave meurt', !!mort, 'pas d\'evenement `meurt` pour le Brave.');
  const coupMortel = mort && B.evts[mort.cause];
  verifie('rale : sa mort a pour cause le COUP qui l\'a tue, pas l\'attaque', coupMortel && coupMortel.t === 'degats' && coupMortel.cible.nom === 'Brave',
    `cause = ${coupMortel ? coupMortel.t : 'rien'}.`);
  const rale = trouve(B, 'declenche', e => e.moment === 'death')[0];
  verifie('rale : le declencheur a pour cause la mort', rale && rale.cause === (mort && mort.i) && rale.src.nom === 'Brave', JSON.stringify(rale));
  const jeton = trouve(B, 'invoque', e => e.via === 'jeton')[0];
  verifie('rale : le Chiot arrive, cause = le declencheur', jeton && jeton.cause === (rale && rale.i) && jeton.unite.nom === 'Chiot', JSON.stringify(jeton));
  verifie('rale : le Chiot est vraiment sur le plateau', B.p.board.some(u => u.name === 'Chiot'), 'le recit annonce un Chiot qui n\'est pas la.');
}

// ----------------------------- un sort : sa carte est la cause de ses effets
{
  const foudre = { id: 'foudre', name: 'Foudre', type: 'spell', cost: 0, keys: [], sprite: '', play: [{ op: 'dmg', v: 2, t: 'enemyHero' }] };
  const B = duel([foudre], [carte('Hibou', 2, 5)]);
  jouer(B, 'p', 0);
  const j = trouve(B, 'joue')[0];
  const d = trouve(B, 'degats')[0];
  verifie('sort : `joue` puis `degats`, le second cause par le premier', j && d && d.cause === j.i && d.cible.k === 'heros' && d.avant === 30 && d.apres === 28,
    JSON.stringify({ j: j && j.t, d }));
  verifie('sort : la source du coup est la carte', d && d.src && d.src.k === 'carte' && d.src.nom === 'Foudre', JSON.stringify(d && d.src));
}

// ------------------- ce qui change un montant : un effet statique, dit avec son porteur
{
  const forgeron = carte('Forgeron', 1, 4, { statics: [{ op: 'montant_des_effets', qui: 'toi', cible: 'dmg', sens: 'plus', v: 1 }] });
  const foudre = { id: 'foudre', name: 'Foudre', type: 'spell', cost: 0, keys: [], sprite: '', play: [{ op: 'dmg', v: 2, t: 'enemyHero' }] };
  const B = duel([forgeron, foudre], [carte('Hibou', 2, 5)]);
  const iForgeron = B.p.hand.findIndex(c => c.name === 'Forgeron');
  if (iForgeron < 0) { B.p.hand.push(forgeron); }
  jouer(B, 'p', B.p.hand.findIndex(c => c.name === 'Forgeron'));
  if (!B.p.hand.some(c => c.name === 'Foudre')) B.p.hand.push(foudre);
  jouer(B, 'p', B.p.hand.findIndex(c => c.name === 'Foudre'));
  const d = trouve(B, 'degats', e => e.src && e.src.nom === 'Foudre')[0];
  verifie('montant : la Foudre fait 2 + 1 = 3', d && d.n === 3 && d.apres === 27, JSON.stringify(d));
  verifie('montant : l\'evenement dit +1 et QUI l\'a donne',d && d.bonus === 1 && d.via && d.via.length === 1 && d.via[0].nom === 'Forgeron' && d.via[0].v === 1, JSON.stringify(d && [d.bonus, d.via]));
}

// ------------------------------------------------ 1 + 2 + 4 : des parties entieres
let pioches = 0, morts = 0, coupsLus = 0, avecVia = 0, declenches = 0;
for (let g = 0; g < PARTIES; g++) {
  const sans = partie(g, false);
  const avec = partie(g, true);
  const B = avec.B;

  // 1. sans effet : la meme partie, mot pour mot
  verifieUneFois('allume = eteint : memes lignes de journal', JSON.stringify(sans.B.log) === JSON.stringify(B.log),
    `partie ${g} : le recit change la partie (les tirages ou l'ordre ont bouge).`);
  verifieUneFois('allume = eteint : memes PV et meme vainqueur',
    sans.B.p.hp === B.p.hp && sans.B.e.hp === B.e.hp && sans.B.winner === B.winner && sans.B.turnNo === B.turnNo,
    `partie ${g} : ${sans.B.p.hp}/${sans.B.e.hp} contre ${B.p.hp}/${B.e.hp}.`);
  verifieUneFois('eteint : rien n\'est ecrit nulle part', sans.B.evts === undefined, 'une partie sans option a des evenements.');

  const ev = B.evts;
  // 2. la forme
  verifieUneFois('les evenements sont numerotes sans trou', ev.every((e, n) => e.i === n), `partie ${g} : un indice ne suit pas son rang.`);
  verifieUneFois('chaque evenement a un type et un tour', ev.every(e => typeof e.t === 'string' && Number.isInteger(e.tour)), `partie ${g}.`);
  verifieUneFois('une cause pointe en arriere (ou nulle part)', ev.every(e => e.cause === null || (Number.isInteger(e.cause) && e.cause >= 0 && e.cause < e.i)),
    `partie ${g} : une cause pointe en avant ou hors de la liste.`);
  verifieUneFois('les evenements sont du JSON pur', JSON.stringify(JSON.parse(JSON.stringify(ev))) === JSON.stringify(ev),
    `partie ${g} : un evenement ne survit pas a un aller-retour JSON.`);
  verifieUneFois('il y a un `tour` et une `fin`', ev.some(e => e.t === 'tour') && ev.filter(e => e.t === 'fin').length === 1,
    `partie ${g} : ${ev.filter(e => e.t === 'fin').length} evenement(s) \`fin\`.`);

  // causes qui ont du sens
  for (const e of ev) {
    if (e.t === 'meurt') {
      morts++;
      const c = e.cause === null ? null : ev[e.cause];
      verifieUneFois('une mort a une cause', !!c, `partie ${g} : mort de ${e.unite.nom} sans cause.`);
    }
    if (e.t === 'declenche' && e.moment === 'death') {
      declenches++;
      const c = ev[e.cause];
      verifieUneFois('un rale d\'agonie a pour cause la mort de SON unite', c && c.t === 'meurt' && c.unite.uid === e.src.uid,
        `partie ${g} : rale de ${e.src.nom} sans sa mort.`);
    }
    if (e.t === 'degats') {
      coupsLus++;
      verifieUneFois('des degats : perdu = avant - apres, jamais negatif', e.perdu === e.avant - e.apres && e.perdu >= 0,
        `partie ${g} : ${JSON.stringify(e)}`);
      if (e.riposte) verifieUneFois('une riposte a une attaque pour cause', ev[e.cause] && ev[e.cause].t === 'attaque', `partie ${g}.`);
      if (e.bonus !== undefined) {
        avecVia++;
        verifieUneFois('un montant change dit par QUI', Array.isArray(e.via) && e.via.reduce((a, x) => a + x.v, 0) === e.bonus,
          `partie ${g} : bonus ${e.bonus}, via ${JSON.stringify(e.via)}`);
      }
    }
    if (e.t === 'pioche') pioches++;
  }

  // 4. la completude : rejouer les evenements redonne les PV de fin
  for (const camp of ['p', 'e']) {
    let pv = avec.pv0[camp];
    for (const e of ev) {
      if (e.cible && e.cible.k === 'heros' && e.cible.camp === camp) {
        if (e.t === 'degats') pv -= e.perdu;
        else if (e.t === 'soin') pv += e.soigne;
      }
    }
    verifieUneFois('rejouer les evenements redonne les PV des heros', pv === B[camp].hp,
      `partie ${g}, camp ${camp} : les evenements donnent ${pv}, le combat ${B[camp].hp}.`);
  }
  // toute unite qui meurt ou qui reste en jeu est nee d'un evenement
  const nees = new Set(ev.filter(e => e.t === 'invoque').map(e => e.unite.uid));
  verifieUneFois('toute unite morte est nee d\'un evenement', ev.filter(e => e.t === 'meurt').every(e => nees.has(e.unite.uid)),
    `partie ${g} : une unite meurt sans etre jamais arrivee.`);
  verifieUneFois('toute unite en jeu est nee d\'un evenement', [...B.p.board, ...B.e.board].every(u => nees.has(u.uid)),
    `partie ${g} : une unite est en jeu sans etre jamais arrivee.`);
}

// ------------------------------- les combats GARDES (ui/combats.js) : un recit survit au stockage
{
  // Un localStorage de bouchon : sans navigateur, c'est tout ce que le module demande.
  const rayon = new Map();
  let plafond = Infinity;
  globalThis.localStorage = {
    getItem: k => (rayon.has(k) ? rayon.get(k) : null),
    setItem: (k, v) => { if (String(v).length > plafond) throw new Error('QuotaExceededError'); rayon.set(k, String(v)); },
    removeItem: k => rayon.delete(k)
  };
  const { gardeCombat, listeCombats, chargeCombat } = await import('../game/src/ui/combats.js');
  const { B } = partie(3, true);
  const meta = n => ({ nom: `Combat ${n}`, gagnant: 'p', tours: 9, equipe: 'Toi', heros: { p: 'Characters/Dog.png', e: 'Characters/Cat.png' }, evts: B.evts });

  const id = gardeCombat(meta(0));
  const relu = chargeCombat(id);
  verifie('un combat garde se relit a l\'identique (sprites compris)', JSON.stringify(relu.evts) === JSON.stringify(B.evts),
    'le recit relu n\'est pas celui qu\'on a garde : la table de sprites se trompe.');
  verifie('la liste des combats ne porte pas le recit', listeCombats().length === 1 && listeCombats()[0].evts === undefined && listeCombats()[0].recit === undefined,
    'la liste emporte le recit entier : le Sac chargerait des centaines de ko pour afficher cinq lignes.');
  verifie('un combat sans evenement n\'est pas garde', gardeCombat({ ...meta(1), evts: [] }) === null, 'un combat vide a ete garde.');
  for (let n = 1; n <= 7; n++) gardeCombat(meta(n));
  verifie('on ne garde que les 5 derniers, le plus recent en tete', listeCombats().length === 5 && listeCombats()[0].nom === 'Combat 7',
    `${listeCombats().length} combat(s) gardes, le premier est ${listeCombats()[0] && listeCombats()[0].nom}.`);
  // Un stockage presque plein ne doit jamais gener un combat : on sacrifie les plus anciens.
  plafond = JSON.stringify(rayon.get('adventureCard.combats.v1')).length / 2;
  let leve = false;
  try { gardeCombat(meta(8)); } catch { leve = true; }
  verifie('un stockage plein ne leve rien', !leve, 'gardeCombat a laisse passer une erreur de quota.');
  verifie('un stockage plein garde moins, pas rien', listeCombats().length >= 1 && listeCombats().length < 5, `${listeCombats().length} combat(s) apres le quota.`);
  plafond = 10;
  let leve2 = false, ok = null;
  try { ok = gardeCombat(meta(9)); } catch { leve2 = true; }
  verifie('un combat qui ne tient nulle part est abandonne sans bruit', !leve2 && ok === null, 'une erreur a ete levee, ou un identifiant rendu pour rien.');
  delete globalThis.localStorage;
}

// ------------------------------------------------------------------- le bilan
console.log('\n=== Les evenements du combat ===\n');
console.log(`  ${PARTIES} parties jouees deux fois (sans, puis avec le recit) · ${coupsLus} coups · ${morts} morts · ${declenches} rales · ${pioches} pioches · ${avecVia} montants modifies`);
if (!morts) echecs.push('couverture — aucune mort dans les parties jouees : le banc ne verifie rien des morts.');
if (!pioches) echecs.push('couverture — aucune pioche racontee.');
console.log('');
if (echecs.length) {
  for (const e of echecs) console.log(rouge('  ECHEC     ') + e);
  console.log('\n' + rouge(`${passes} test(s) passe(s), ${echecs.length} echec(s).`));
  process.exit(1);
}
console.log(vert(`${passes} test(s) passe(s), 0 echec(s).`));
