// BANC DES SITUATIONS — chaque fiche de `game/data/situations.js` se monte-t-elle ?
//
//   node scripts/test-situations.mjs
//
// Une situation qui cite une carte renommee dans le builder ne casse rien : elle se
// monte a moitie, le plateau decrit n'est pas celui qu'on obtient, et on joue une
// position qui n'est pas celle qu'on croit. C'est le genre de faux qui ne se voit
// jamais — d'ou ce banc, a relancer apres avoir touche aux cartes.
import { SITUATIONS, FAMILLES, monteSituation } from '../game/src/tools/situation.js';
import { canPlay, attackableTargets } from '../game/src/combat/engine.js';
import { botAction } from '../game/src/combat/ai.js';
import { joue } from '../game/src/combat/journal.js';

const rouge = t => `\x1b[31m${t}\x1b[0m`;
const vert = t => `\x1b[32m${t}\x1b[0m`;
const gris = t => `\x1b[90m${t}\x1b[0m`;

let passes = 0;
const echecs = [];
// ⚠ Elle REND le verdict : un appelant ecrit `if (!verifie(...)) continue;` pour ne pas
// enchainer des controles sur une situation qui ne s'est pas montee. Sans ce retour,
// le `continue` partait a chaque fois et le banc ne verifiait plus que le montage.
const verifie = (nom, ok, detail) => {
  if (ok) { passes++; return true; }
  echecs.push(`${nom} — ${detail}`);
  return false;
};

console.log('\n=== Les situations a tester ===\n');

const vus = new Set();
for (const f of SITUATIONS) {
  // --- l'identite de la fiche
  verifie(`${f.id} a un identifiant unique`, !vus.has(f.id), 'deux fiches portent le meme id.');
  vus.add(f.id);
  verifie(`${f.id} appartient a une famille connue`, !!FAMILLES[f.famille],
    `famille « ${f.famille} » absente de FAMILLES.`);
  verifie(`${f.id} dit ce qu'on y decide`, !!f.question && !!f.regarde,
    'une fiche sans `question` ni `regarde` ne sert a rien : on ne sait pas quoi y faire.');

  // --- le montage
  const { B, soucis } = monteSituation(f);
  if (!verifie(`${f.id} se monte`, !!B && !soucis.length,
    soucis.length ? soucis.join(' ; ') : 'le montage n\'a rendu aucun combat.')) continue;
  if (!B) continue;

  // --- la position est-elle celle qu'on a decrite ?
  for (const k of ['p', 'e']) {
    const cote = f[k] || {};
    // La main se dit de trois facons (cf. `situations.js`) : nommee, comptee, ou
    // absente — et « absente » veut dire « une main normale », pas « vide ».
    const attendue = Array.isArray(cote.main) ? cote.main.length
      : typeof cote.main === 'number' ? Math.min(cote.main, B[k].hand.length + B[k].deck.length)
        : Math.min(B[k].handSize, B[k].hand.length + B[k].deck.length);
    verifie(`${f.id} · ${k} : la main est celle de la fiche`,
      B[k].hand.length === attendue,
      `${B[k].hand.length} carte(s) en main pour ${attendue} attendue(s).`);
    // ⚠ Le plateau peut compter PLUS que demande — un rale ou une aura n'invoque rien
    // a la pose, mais une carte peut en poser une autre. Moins, en revanche, veut dire
    // qu'une carte a ete refusee (un sort, un plateau plein).
    verifie(`${f.id} · ${k} : le plateau est celui de la fiche`,
      B[k].board.length >= (cote.plateau || []).length,
      `${B[k].board.length} unite(s) posee(s) pour ${(cote.plateau || []).length} demandee(s).`);
    if (cote.pv !== undefined) verifie(`${f.id} · ${k} : les PV sont ceux de la fiche`, B[k].hp === cote.pv, `${B[k].hp} au lieu de ${cote.pv}.`);
    if (cote.mana !== undefined) verifie(`${f.id} · ${k} : le mana est celui de la fiche`, B[k].mana === cote.mana, `${B[k].mana} au lieu de ${cote.mana}.`);
    if (cote.pioche !== undefined) verifie(`${f.id} · ${k} : la pioche est tronquee`, B[k].deck.length <= cote.pioche, `${B[k].deck.length} carte(s) pour ${cote.pioche} demandee(s).`);
  }

  // --- LA VRAIE QUESTION : y a-t-il quelque chose a decider ?
  // Une situation ou l'on ne peut rien faire d'autre que passer n'est pas une
  // situation, c'est un ecran. Elle se monterait sans erreur et ne servirait a rien.
  // ⚠ On ne l'exige que des fiches qui NOMMENT leur main : ce sont les points de
  // decision construits a la main. Celles qui partent d'une main normale (une partie
  // entiere, depuis le tour 1) ont le droit de tomber sur un tour ou l'on passe.
  const k = B.turn;
  if (Array.isArray((f[k] || {}).main)) {
    const jouables = B[k].hand.filter(c => canPlay(B, k, c)).length;
    const attaques = B[k].board.filter(u => u.canAttack && u.atk > 0 && attackableTargets(B, k, u).length).length;
    verifie(`${f.id} : il y a un choix a faire`, jouables + attaques > 0,
      `le camp « ${k} » ne peut ni jouer une carte (main de ${B[k].hand.length}) ni attaquer : il ne peut que passer.`);
  }

  // --- et elle se joue jusqu'au bout sans bloquer le moteur
  let garde = 0;
  while (!B.over && garde++ < 2000) {
    const c = B.turn;
    const a = botAction(B, c, undefined);
    if (!joue(B, c, a, 'bot')) joue(B, c, { type: 'end' }, 'bot');
  }
  verifie(`${f.id} : la partie va jusqu'au bout`, B.over,
    'le garde-fou a saute : depuis cette position, le moteur tourne en rond.');
}

for (const e of echecs) console.log(rouge('  ECHEC     ') + e);
if (!echecs.length) {
  const parFamille = Object.keys(FAMILLES).map(f => `${f} : ${SITUATIONS.filter(s => s.famille === f).length}`).join(' · ');
  console.log(vert(`  Les ${SITUATIONS.length} situations se montent et se jouent.`));
  console.log(gris(`  ${parFamille}`));
}
console.log(`\n${passes} test(s) passe(s), ${echecs.length} echec(s).\n`);
process.exit(echecs.length ? 1 : 0);
