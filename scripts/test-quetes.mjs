// Banc du FIL DE QUETES (game/src/config/quetes.js, docs/TUTORIEL.md) — aucune partie jouee.
//   1. le fil est valide : identifiants uniques, objectifs connus, heros et arenes qui existent, une fin de tutoriel ;
//   2. une partie NEUVE : Pompon seul, une place, et le tutoriel se deroule jusqu'au bout (etats et evenements simules) ;
//   3. une sauvegarde d'AVANT les quetes saute le tutoriel, recoit les Lapins, et les quetes de heros deja possedes
//      sont sautees ;
//   4. la taille minimale du deck suit les places ouvertes.
//   node scripts/test-quetes.mjs
import { QUETES, QUETE_PAR_ID } from '../game/src/config/quetes.js';
import { CHAR_BY_ID } from '../game/src/config/characters.js';
import { ARENE_PAR_ID } from '../game/src/config/arenes.js';
import { BALANCE } from '../game/src/config/balance.js';

const vert = s => `\x1b[32m${s}\x1b[0m`, rouge = s => `\x1b[31m${s}\x1b[0m`;
let passes = 0;
const echecs = [];
const verifie = (nom, ok, detail = '') => { if (ok) passes++; else echecs.push(`${nom}${detail ? ' — ' + detail : ''}`); };

// Une sauvegarde en memoire : state.js lit `localStorage` a l'import. Chaque import « ?n » est une instance neuve.
let stockage = {};
globalThis.localStorage = { getItem: k => (k in stockage ? stockage[k] : null), setItem: (k, v) => { stockage[k] = String(v); }, removeItem: k => { delete stockage[k]; } };
let instance = 0;
const etat = () => import(`../game/src/state.js?${++instance}`);

// ------------------------------------------------------------------ 1. le fil
console.log('=== Le fil de quetes ===\n');
const OBJECTIFS = ['arene', 'equipe', 'victoire', 'ameliore', 'switch', 'plante', 'vend'];
verifie('identifiants uniques', new Set(QUETES.map(q => q.id)).size === QUETES.length);
verifie('une seule fin de tutoriel', QUETES.filter(q => q.finTutoriel).length === 1);
for (const q of QUETES) {
  const o = q.objectif || {};
  verifie(`${q.id} : objectif connu`, OBJECTIFS.includes(o.quoi), `« ${o.quoi} »`);
  verifie(`${q.id} : un titre et un texte`, !!q.titre && !!q.texte);
  if (o.quoi === 'arene') verifie(`${q.id} : l'arene existe`, !!ARENE_PAR_ID[o.arene], o.arene);
  if (o.quoi === 'equipe') verifie(`${q.id} : le heros existe`, !!CHAR_BY_ID[o.heros], o.heros);
  if (q.recompense && q.recompense.heros) verifie(`${q.id} : le heros offert existe`, !!CHAR_BY_ID[q.recompense.heros], q.recompense.heros);
}
// Une quete « mets X dans l'equipe » vient apres celle qui donne X.
for (const q of QUETES.filter(x => x.objectif.quoi === 'equipe')) {
  const donne = QUETES.findIndex(x => x.recompense && x.recompense.heros === q.objectif.heros);
  verifie(`${q.id} : le heros est donne avant`, donne >= 0 && donne < QUETES.indexOf(q));
}

// ------------------------------------------------------------------ 2. une partie neuve
{
  stockage = {};
  const S = await etat();
  const { save } = S;
  verifie('partie neuve : Pompon seul', save.team.filter(Boolean).join() === 'lapin1', save.team.join());
  verifie('partie neuve : une place', save.rosterSlots === 1, String(save.rosterSlots));
  verifie('partie neuve : Medor pas encore la', !save.chars.dog.owned);
  verifie('partie neuve : premiere quete', S.queteCourante().id === QUETES[0].id);
  verifie('partie neuve : minimum du deck = 5', S.tailleMinDuDeck() === 5, String(S.tailleMinDuDeck()));
  verifie('partie neuve : le tutoriel n\'est pas fini', !S.tutorielFini());

  // On deroule le fil jusqu'a la fin du tutoriel, en faisant ce que chaque quete demande.
  const bat = (arene, niveau) => { const a = S.etatArene(arene); a.meilleur = Math.max(a.meilleur, niveau); };
  let garde = 0;
  while (!S.tutorielFini() && garde++ < 50) {
    const q = S.queteCourante();
    const o = q.objectif;
    verifie(`${q.id} : pas remplie d'avance`, !S.progresQuete(q).fait);
    if (o.quoi === 'arene') bat(o.arene, o.niveau);
    else if (o.quoi === 'equipe') {
      const place = save.team.findIndex((x, i) => !x && i < save.rosterSlots);
      verifie(`${q.id} : une place libre pour ${o.heros}`, S.setTeamSlot(place >= 0 ? place : save.rosterSlots - 1, o.heros));
    } else for (let k = 0; k < (o.n || 1); k++) S.signale(o.quoi, { equipe: S.team().length });
    verifie(`${q.id} : remplie`, S.progresQuete(q).fait, JSON.stringify(S.progresQuete(q)));
    const r = S.recupereQuete();
    verifie(`${q.id} : recompense recuperee`, !!r && r.quete.id === q.id);
  }
  verifie('tutoriel : fini', S.tutorielFini());
  verifie('tutoriel : trois Lapins', ['lapin1', 'lapin2', 'lapin3'].every(id => save.chars[id].owned));
  verifie('tutoriel : trois places', save.rosterSlots === 3, String(save.rosterSlots));
  verifie('tutoriel : minimum du deck = 15', S.tailleMinDuDeck() === Math.min(15, BALANCE.decks.tailleMin));
  verifie('apres le tutoriel : Medor', S.queteCourante() && S.queteCourante().id === 'medor', S.queteCourante() && S.queteCourante().id);

  // Une victoire avec deux heros ne compte pas pour « gagne avec tes trois Lapins » (on le rejoue sur une copie).
  const trio = QUETES.find(q => q.finTutoriel);
  save.quetes.courante = trio.id; save.quetes.compte = 0;
  S.signale('victoire', { equipe: 2 });
  verifie('« trois Lapins » : une victoire a deux ne compte pas', !S.progresQuete(trio).fait);
  S.signale('victoire', { equipe: 3 });
  verifie('« trois Lapins » : une victoire a trois compte', S.progresQuete(trio).fait);
  // Une quete pas remplie ne se recupere pas, et un evenement d'une autre sorte ne compte pas.
  save.quetes.courante = 'ameliore'; save.quetes.compte = 0;
  verifie('pas remplie : rien a recuperer', S.recupereQuete() === null);
  S.signale('plante');
  verifie('un autre evenement ne compte pas', !S.progresQuete(QUETE_PAR_ID.ameliore).fait);
}

// ------------------------------------------------------------------ 3. une sauvegarde d'avant les quetes
{
  stockage = {};
  const vieux = (await etat()).freshSave();
  delete vieux.quetes;
  vieux.rosterSlots = 3;
  for (const id of ['dog', 'cat', 'crow']) vieux.chars[id].owned = true;
  for (const id of ['lapin1', 'lapin2', 'lapin3']) delete vieux.chars[id];
  vieux.team = ['dog', 'cat', 'crow'];
  stockage[BALANCE.save.key] = JSON.stringify(vieux);
  const S = await etat();
  verifie('ancienne sauvegarde : tutoriel sauté', S.tutorielFini());
  verifie('ancienne sauvegarde : les Lapins reçus', ['lapin1', 'lapin2', 'lapin3'].every(id => S.save.chars[id].owned));
  verifie('ancienne sauvegarde : son equipe gardee', S.save.team.join() === 'dog,cat,crow', S.save.team.join());
  verifie('ancienne sauvegarde : Medor, Felix, Corax sautés → la Ferme',
    S.queteCourante() && S.queteCourante().id === 'plante', S.queteCourante() && S.queteCourante().id);
}

for (const e of echecs) console.log(rouge('  ECHEC     ') + e);
if (!echecs.length) console.log(vert(`  ${QUETES.length} quetes, tutoriel deroule, migration verifiee.`));
console.log(`\n${passes} test(s) passe(s), ${echecs.length} echec(s).\n`);
process.exit(echecs.length ? 1 : 0);
