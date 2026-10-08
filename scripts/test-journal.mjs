// BANC DU JOURNAL DE DECISIONS — le fichier qu'on enregistre est-il relisible ?
//
//   node scripts/test-journal.mjs [parties]
//
// Un journal de combat ne sert a rien s'il ment, et il ment SANS LE DIRE : un `inst`
// qui designe deux cartes, un coup absent des coups legaux, une ligne de texte perdue
// entre deux decisions — rien de tout cela ne casse quoi que ce soit, on s'en apercoit
// six mois plus tard en essayant de comprendre une partie. D'ou ce banc.
//
// Il joue des parties bot contre bot avec le journal allume et verifie, fichier par
// fichier, les criteres d'acceptation de la spec. Il ne joue PAS de serie de mesure :
// c'est un test, il reste sur cette machine (cf. le banc du partage).
import { CHAR_BY_ID, resolveCard } from '../game/src/config/characters.js';
import { CHARACTER_DATA } from '../game/data/characters.data.js';
import { ENCOUNTERS } from '../game/src/config/world.js';
import { createBattle } from '../game/src/combat/engine.js';
import { botAction } from '../game/src/combat/ai.js';
import { ouvreJournal, fermeJournal, joue, VERSION } from '../game/src/combat/journal.js';

const rouge = t => `\x1b[31m${t}\x1b[0m`;
const vert = t => `\x1b[32m${t}\x1b[0m`;
const gris = t => `\x1b[90m${t}\x1b[0m`;

const PARTIES = Number(process.argv[2]) || 50;

let passes = 0;
const echecs = [];
function verifie(nom, ok, detail) {
  if (ok) { passes++; return true; }
  echecs.push(`${nom} — ${detail}`);
  return false;
}
/** Un echec par regle, pas un par partie : 50 fois la meme phrase n'apprend rien. */
const dejaDit = new Set();
function verifieUneFois(nom, ok, detail) {
  if (ok) { passes++; return true; }
  if (dejaDit.has(nom)) return false;
  dejaDit.add(nom);
  echecs.push(`${nom} — ${detail}`);
  return false;
}

// ----------------------------------------------------------------- les camps
function campHeros(ids, niveau) {
  const chars = ids.map(id => CHAR_BY_ID[id]).filter(Boolean);
  return {
    name: chars.map(c => c.name).join('&'),
    sprite: chars[0].sprite,
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

const EQUIPES = (CHARACTER_DATA.characters || []).map(c => c.id);
const RENCONTRES = Object.keys(ENCOUNTERS);

/**
 * Une partie enregistree. La boucle est exactement celle de l'arene : `botAction`
 * decide, `joue()` applique — c'est le seul chemin, et c'est celui qu'on teste.
 * Rend le texte JSONL, le combat, et le nombre d'actions REELLEMENT tentees.
 */
function partieEnregistree(equipe, rencontre, niveau) {
  const B = createBattle(campHeros(equipe, niveau), campPnj(rencontre), {});
  ouvreJournal(B, {
    source: 'simulateur',
    rencontre: { id: rencontre, nom: ENCOUNTERS[rencontre].name },
    camps: { p: { controle: 'bot' }, e: { controle: 'bot', niveauBot: ENCOUNTERS[rencontre].ia || null } }
  });
  let actions = 0, garde = 0;
  while (!B.over && garde++ < 4000) {
    const k = B.turn;
    const a = botAction(B, k, k === 'e' ? ENCOUNTERS[rencontre].ia : undefined);
    actions++;
    if (!joue(B, k, a, 'bot', null)) { actions++; joue(B, k, { type: 'end' }, 'bot', null); }
  }
  // `queue` : les lignes que `B.log` a encore a la fin (400 au plus). C'est le temoin
  // INDEPENDANT du decoupage : le journal a beau compter ses lignes tout seul, la fin
  // de ce qu'il a recopie doit etre mot pour mot ce que le combat a sous les yeux.
  const queue = [...B.log];
  const total = B.logTotal;
  return { texte: fermeJournal(B), B, actions, queue, total };
}

// -------------------------------------------------------------- les controles
const memeCoup = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function controle(fichier, actions, queue, total) {
  const brutes = fichier.split('\n').filter(l => l.length);
  const lignes = [];
  for (const [n, l] of brutes.entries()) {
    try { lignes.push(JSON.parse(l)); }
    catch (e) { verifieUneFois('chaque ligne est un JSON valide', false, `ligne ${n} illisible : ${e.message}`); return; }
  }
  passes++;   // les lignes se relisent toutes

  // --- 1. la forme du fichier
  verifieUneFois('les lignes portent t, v et i', lignes.every(l => l.t && l.v === VERSION && Number.isInteger(l.i)),
    'une ligne n\'a pas ses trois champs communs, ou porte une autre version du schema.');
  verifieUneFois('les i se suivent sans trou', lignes.every((l, n) => l.i === n),
    'les numeros d\'ordre sautent : une ligne a ete ecrite hors de `ligne()`.');
  verifieUneFois('un debut, puis des decisions, puis une fin',
    lignes[0].t === 'debut' && lignes[lignes.length - 1].t === 'fin'
      && lignes.slice(1, -1).every(l => l.t === 'decision'),
    'le fichier ne commence pas par `debut` ou ne finit pas par `fin`.');

  const debut = lignes[0];
  const fin = lignes[lignes.length - 1];
  const decisions = lignes.filter(l => l.t === 'decision');

  // --- 2. le compte des decisions
  verifieUneFois('une decision par action tentee', decisions.length === actions,
    `${decisions.length} ligne(s) `+ `decision` + ` pour ${actions} action(s) tentee(s) : une action passe a cote de joue().`);
  verifieUneFois('le compte de `fin` est le bon',
    fin.decisions.p + fin.decisions.e === decisions.length
    && fin.decisions.p === decisions.filter(d => d.camp === 'p').length,
    'le champ `decisions` de la derniere ligne ne compte pas les memes lignes que le fichier.');

  // --- 3. chaque coup joue etait un coup legal
  for (const d of decisions) {
    if (!verifieUneFois('le coup joue figure dans les coups legaux',
      d.coupsLegaux.some(c => memeCoup(c, d.coup)),
      `tour ${d.tour}, camp ${d.camp} : ${JSON.stringify(d.coup)} n'est pas dans les ${d.coupsLegaux.length} coups legaux.`)) break;
  }

  // --- 4. tout identifiant cite est un identifiant connu
  // Un `inst` ne designe qu'UNE carte pour tout le combat : c'est toute sa raison
  // d'etre. On verifie qu'il ne change jamais de nom en route — c'est ainsi qu'une
  // carte copiee qui garderait l'identifiant de son modele se ferait prendre.
  // UNE EXCEPTION VOULUE : la carte Miroir. Elle DEVIENT la derniere carte jouee en
  // face, en gardant son identifiant (c'est le meme exemplaire qui change de visage), et
  // son mot-cle `miroir` la suit partout, plateau compris. On la compte donc sous le nom
  // « Miroir » : deux cartes qui partageraient son identifiant se feraient quand meme prendre.
  const nomDe = new Map();
  const stable = (inst, nom, cles = []) => {
    if (cles.includes('miroir')) nom = 'Miroir';
    if (!nomDe.has(inst)) { nomDe.set(inst, nom); return true; }
    return nomDe.get(inst) === nom;
  };
  let identifiantsOk = true;
  for (const c of [...debut.camps.p.deck, ...debut.camps.e.deck]) identifiantsOk &&= stable(c.inst, c.nom, c.cles);
  for (const d of decisions) {
    for (const k of ['p', 'e']) {
      for (const c of d.etat[k].main) identifiantsOk &&= stable(c.inst, c.nom, c.cles);
      for (const u of d.etat[k].plateau) if (u.inst) identifiantsOk &&= stable(u.inst, u.nom, u.cles);
    }
  }
  verifieUneFois('un `inst` ne designe qu\'une carte', identifiantsOk,
    'un meme identifiant d\'exemplaire porte deux noms differents : deux cartes le partagent.');

  // Un coup « je joue cette carte » doit pouvoir se relire : la carte est decrite en
  // entier dans la main du meme etat, sinon le fichier cite un identifiant orphelin.
  let citesOk = true;
  for (const d of decisions) {
    const main = new Set(d.etat[d.camp].main.map(c => c.inst));
    const plateau = new Set([...d.etat.p.plateau, ...d.etat.e.plateau].map(u => u.uid));
    if (d.coup.type === 'play') citesOk &&= main.has(d.coup.inst);
    if (d.coup.type === 'attack') citesOk &&= plateau.has(d.coup.uid);
    if (d.coup.cible && d.coup.cible.uid !== 'hero') citesOk &&= plateau.has(d.coup.cible.uid);
  }
  verifieUneFois('tout `inst` et tout `uid` cite est connu', citesOk,
    'un coup designe une carte ou une unite qui ne figure dans aucun etat.');

  // --- 5. l'etat final dit la meme chose que la fin
  verifieUneFois('l\'etat final concorde avec la fin',
    fin.etatFinal.p.pv === fin.pv.p && fin.etatFinal.e.pv === fin.pv.e
    && ['p', 'e', 'nul', 'abandon'].includes(fin.vainqueur),
    'les PV de `etatFinal` ne sont pas ceux de `pv`, ou le vainqueur n\'est pas un des quatre mots attendus.');

  // --- 6. aucune ligne de texte perdue ni dupliquee
  // Deux controles, et le second est celui qui compte : le nombre de lignes pourrait
  // etre juste avec un decoupage faux (une ligne recopiee deux fois, une autre sautee).
  // On compare donc la FIN de ce qu'a recopie le journal a ce que `B.log` a encore,
  // mot pour mot — un temoin que le journal ne fabrique pas lui-meme.
  const recolte = lignes.flatMap(l => l.journal || []);
  verifieUneFois('le journal recopie autant de lignes que le combat en a dit',
    recolte.length === total && fin.lignesJournal === total,
    `le journal recopie ${recolte.length} ligne(s) et en annonce ${fin.lignesJournal} la ou le combat en a dit ${total}.`);
  const fini = recolte.slice(Math.max(0, recolte.length - queue.length));
  verifieUneFois('aucune ligne de journal perdue ni dupliquee',
    fini.length === queue.length && fini.every((l, n) => l === queue[n]),
    'la suite des lignes recopiees ne se termine pas par ce que le combat a sous les yeux : une ligne a saute ou s\'est repetee.');

  // --- 7. l'evaluation du bot est la
  const notees = decisions.filter(d => d.evaluationBot && d.evaluationBot.candidats.length);
  verifieUneFois('le bot dit ce qu\'il a compare', decisions.length < 4 || notees.length > 0,
    'aucune decision ne porte les candidats du bot : le mouchard n\'est pas branche.');

  return { lignes: lignes.length, decisions: decisions.length };
}

// ------------------------------------------------------------------ le banc
console.log('\n=== Le journal de decisions ===\n');

let octets = 0, totalDecisions = 0, longues = 0;
const t0 = Date.now();
for (let i = 0; i < PARTIES; i++) {
  // On fait tourner equipes et rencontres : un seul matchup ne croiserait jamais les
  // cartes qui fabriquent des cartes, et c'est justement la que les `inst` se jouent.
  const equipe = [EQUIPES[i % EQUIPES.length], EQUIPES[(i + 1) % EQUIPES.length], EQUIPES[(i + 2) % EQUIPES.length]];
  const rencontre = RENCONTRES[i % RENCONTRES.length];
  const { texte, actions, queue, total } = partieEnregistree(equipe, rencontre, 8);
  octets += texte.length;
  if (total > 400) longues++;
  const bilan = controle(texte, actions, queue, total);
  if (bilan) totalDecisions += bilan.decisions;
}

// LE CAS QUI COMPTE : un combat de plus de 400 lignes, celui ou `B.log` perd ses
// premieres phrases. Sans lui, le controle ci-dessus n'a rien prouve — et une partie
// courte ne tronque jamais rien. On en force donc une si le hasard n'en a pas donne.
for (let i = 0; longues === 0 && i < 40; i++) {
  const { texte, actions, queue, total } = partieEnregistree(EQUIPES.slice(0, 3), RENCONTRES[RENCONTRES.length - 1], 8);
  if (total <= 400) continue;
  longues++;
  controle(texte, actions, queue, total);
}
verifie('un combat de plus de 400 lignes a ete joue', longues > 0,
  'aucune partie n\'a tronque B.log : le decoupage du texte n\'a pas ete mis a l\'epreuve.');
const secondes = (Date.now() - t0) / 1000;

// --- Journal eteint : rien ne change, et rien n'est alloue.
{
  const B = createBattle(campHeros([EQUIPES[0], EQUIPES[1], EQUIPES[2]], 8), campPnj(RENCONTRES[0]), {});
  let garde = 0;
  while (!B.over && garde++ < 4000) {
    const k = B.turn;
    const a = botAction(B, k, undefined);
    if (!joue(B, k, a, 'bot')) joue(B, k, { type: 'end' }, 'bot');
  }
  verifie('journal eteint : le combat se joue sans rien enregistrer', !B.journal && B.over,
    'un combat sans journal en a fabrique un : `joue()` n\'a pas pris son raccourci.');
  verifie('journal eteint : aucune carte ne recoit d\'identifiant fabrique',
    [...B.p.hand, ...B.p.deck, ...B.p.discard].every(c => !c.inst || /^p-\d\d$/.test(c.inst)),
    'une carte porte un identifiant en `c` alors que rien n\'enregistrait.');
}

for (const e of echecs) console.log(rouge('  ECHEC     ') + e);
if (!echecs.length) {
  console.log(vert(`  ${PARTIES} partie(s) enregistrees, ${totalDecisions} decision(s), tout se relit.`));
  console.log(gris(`  ${(octets / PARTIES / 1024).toFixed(0)} ko par partie en moyenne, ${secondes.toFixed(1)} s.`));
}
console.log(`\n${passes} test(s) passe(s), ${echecs.length} echec(s).\n`);
process.exit(echecs.length ? 1 : 0);
