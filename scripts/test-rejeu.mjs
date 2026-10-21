// BANC DU REJEU — un combat rejoue finit-il EXACTEMENT comme l'original ?
//
//   node scripts/test-rejeu.mjs [parties]
//
// « Revoir le combat » rejoue un combat avec le moteur, depuis son point de depart, sa graine et la liste de ses
// actions (game/src/combat/rejeu.js). Un rejeu qui derive ne casse rien et ne se voit pas tout de suite : il montre
// au joueur une partie qu'il n'a pas jouee. Ce banc enregistre des parties bot contre bot DANS LES CONDITIONS DU JEU —
// le bot reflechit avec le vrai hasard, un apercu joue un coup sur une copie entre deux actions (il fait avancer le
// compteur d'unites du moteur), une partie sur deux a le journal de decisions allume — puis il les rejoue apres un
// passage par JSON (comme le stockage) et compare : vainqueur, tours, PV, plateaux, mains, defausses, recit.
// Il verifie aussi qu'un rejeu coupe au debut d'un tour puis continue finit pareil (les fleches de l'ecran).
import { CHAR_BY_ID, resolveCard } from '../game/src/config/characters.js';
import { CHARACTER_DATA } from '../game/data/characters.data.js';
import { ENCOUNTERS } from '../game/src/config/world.js';
import { createBattle, cloneBattle } from '../game/src/combat/engine.js';
import { botAction } from '../game/src/combat/ai.js';
import { ouvreJournal, joue } from '../game/src/combat/journal.js';
import { enregistre, joueEtNote, sousGraine, rejoue, pas, debutDuTour, toursJoues, copie } from '../game/src/combat/rejeu.js';

const rouge = t => `\x1b[31m${t}\x1b[0m`;
const vert = t => `\x1b[32m${t}\x1b[0m`;
const PARTIES = Number(process.argv[2]) || 40;

let passes = 0;
const echecs = [];
const dejaDit = new Set();
function verifie(nom, ok, detail) {
  if (ok) { passes++; return true; }
  if (!dejaDit.has(nom)) { dejaDit.add(nom); echecs.push(`${nom} — ${detail}`); }
  return false;
}

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
  return { name: e.name, sprite: e.sprite, hp: e.hp, mana: e.mana, hand: e.hand, startArmor: e.startArmor || 0, startMana: e.startMana || 0, deck: e.deck.map(c => ({ ...c })) };
};
const IDS = (CHARACTER_DATA.characters || []).map(c => c.id);
const RENCONTRES = Object.keys(ENCOUNTERS);

/** Ce qu'on compare entre l'original et le rejeu : tout ce que le joueur voit. */
function photo(B) {
  const camp = k => ({
    hp: B[k].hp, armure: B[k].armor, mana: B[k].mana,
    plateau: B[k].board.map(u => `${u.name} ${u.atk}/${u.hp}${u.shield ? ' B' : ''}${u.tox ? ` T${u.tox}` : ''}`),
    main: B[k].hand.map(c => c.name), defausse: B[k].discard.map(c => c.name), pioche: B[k].deck.length
  });
  return JSON.stringify({ over: B.over, winner: B.winner, tour: B.turnNo, p: camp('p'), e: camp('e'), recit: (B.evts || []).map(e => e.t).join(',') });
}

/** Un coup joue a blanc sur une copie, comme l'apercu de l'ecran : il fait avancer le compteur d'unites du moteur. */
function apercu(B) {
  const c = cloneBattle(B);
  const k = c.turn;
  try { joue(c, k, botAction(c, k)); } catch { /* une copie n'a pas a tenir */ }
}

console.log('\n=== Le rejeu des combats ===\n');
let tours = 0, actions = 0, coupes = 0;
for (let g = 0; g < PARTIES; g++) {
  const equipe = [IDS[g % IDS.length], IDS[(g * 3 + 1) % IDS.length], IDS[(g * 5 + 2) % IDS.length]].filter((x, i, a) => a.indexOf(x) === i);
  const renc = RENCONTRES[g % RENCONTRES.length];
  const depart = { p: campHeros(equipe, 3 + (g % 8)), e: campPnj(renc) };
  // Comme le jeu : les camps ORIGINAUX vont au moteur, l'enregistrement en garde une copie prise AVANT.
  const rec = enregistre(depart, { evenements: true });
  const B = sousGraine(rec.rng, () => createBattle(depart.p, depart.e, { evenements: true }));
  if (g % 2) ouvreJournal(B, { source: 'banc', camps: { p: { controle: 'humain' }, e: { controle: 'bot' } } });
  let garde = 0;
  while (!B.over && garde++ < 4000) {
    const k = B.turn;
    apercu(B);
    const a = botAction(B, k, k === 'e' ? ENCOUNTERS[renc].ia : undefined);
    const controle = g % 2 && k === 'p' ? 'humain' : 'bot';
    if (!joueEtNote(rec, B, k, a, controle)) joueEtNote(rec, B, k, { type: 'end' }, controle);
  }
  const donnees = JSON.parse(JSON.stringify(rec.donnees));
  tours += B.turnNo; actions += donnees.actions.length;

  // 1. Le rejeu entier.
  const r = rejoue(donnees);
  verifie('le rejeu finit comme l\'original', photo(r.B) === photo(B), `partie ${g} (${equipe.join('+')} contre ${renc}) : ${photo(r.B).slice(0, 160)} …\n      au lieu de ${photo(B).slice(0, 160)} …`);
  verifie('aucune action ne derive', !r.derive, `partie ${g} : une action n'a pas fait la meme chose au rejeu`);
  verifie('toutes les actions sont rejouees', r.i === donnees.actions.length, `partie ${g} : ${r.i} sur ${donnees.actions.length}`);

  // 2. Couper au debut d'un tour (les fleches), puis continuer : meme fin.
  const t = toursJoues(donnees, donnees.actions.length);
  const milieu = Math.floor(t / 2);
  const coupe = rejoue(donnees, debutDuTour(donnees, milieu));
  verifie('un rejeu coupe tombe au debut du bon tour', toursJoues(donnees, coupe.i) === milieu, `partie ${g} : tour ${toursJoues(donnees, coupe.i)} au lieu de ${milieu}`);
  while (coupe.i < donnees.actions.length && !coupe.B.over) pas(coupe, donnees);
  verifie('un rejeu coupe puis continue finit pareil', photo(coupe.B) === photo(B), `partie ${g}`);
  coupes++;

  // 3. Rien ne fuit : le hasard du jeu est rendu apres chaque action.
  verifie('Math.random est rendu', Math.random !== rec.rng, 'le hasard a graine est reste en place');
}
// 4. Les positions : une attaque se rejoue sur l'unite a la meme PLACE, meme si les identifiants different.
{
  const depart = { p: campHeros([IDS[0]], 5), e: campPnj(RENCONTRES[0]) };
  const rec = enregistre(depart, { evenements: true });
  const B = sousGraine(rec.rng, () => createBattle(copie(depart.p), copie(depart.e), { evenements: true }));
  while (!B.over && rec.donnees.actions.length < 200) {
    const k = B.turn;
    for (let i = 0; i < 5; i++) apercu(B);   // beaucoup d'unites fabriquees a blanc : les identifiants divergent
    const a = botAction(B, k);
    if (!joueEtNote(rec, B, k, a)) joueEtNote(rec, B, k, { type: 'end' });
  }
  const attaques = rec.donnees.actions.filter(x => x.a.type === 'attack');
  verifie('une attaque s\'enregistre par place, pas par identifiant', attaques.every(x => typeof x.a.uid === 'number'), JSON.stringify(attaques[0] && attaques[0].a));
  verifie('le rejeu retrouve la partie malgre des identifiants differents', photo(rejoue(copie(rec.donnees)).B) === photo(B), 'les places ne suffisent pas');
}

console.log(`  ${PARTIES} parties (${actions} actions, ${tours} tours), ${coupes} rejeux coupes au milieu.`);
console.log('');
if (echecs.length) {
  for (const e of echecs) console.log(rouge(`  ECHEC     ${e}`));
  console.log('');
}
console.log(`${passes} test(s) passe(s), ${echecs.length} echec(s).`);
process.exit(echecs.length ? 1 : 0);
