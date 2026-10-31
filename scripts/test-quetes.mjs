// Banc du FIL DE QUETES (game/src/config/quetes.js, docs/TUTORIEL.md) — aucune partie jouee.
//   1. le fil est valide : identifiants uniques, objectifs connus, heros et arenes qui existent, une fin de tutoriel ;
//   2. une partie NEUVE : Pompon seul, une place, et le tutoriel se deroule jusqu'au bout (etats et evenements simules) ;
//   3. une sauvegarde d'AVANT les quetes saute le tutoriel, recoit les Lapins, et les quetes de heros deja possedes
//      sont sautees ;
//   4. la taille minimale du deck suit les places ouvertes ;
//   5. le combat guide (config/guide.js) : les guides cites existent, leurs etapes et leurs cibles sont connues ;
//   6. la Google Sheet (onglets « quests », « tutorial_guide », « start ») : aucune ligne ecartee, une ligne fautive
//      l'est, et l'onglet « start » se pose sur BALANCE.
//   node scripts/test-quetes.mjs
import { QUETES, QUETE_PAR_ID } from '../game/src/config/quetes.js';
import { CHAR_BY_ID } from '../game/src/config/characters.js';
import { ARENE_PAR_ID } from '../game/src/config/arenes.js';
import { BALANCE } from '../game/src/config/balance.js';
import { GUIDES } from '../game/src/config/guide.js';
import { FEUILLE } from '../game/data/feuille.data.js';
import { verifieQuetes, quetesDepuisFeuille, verifieGuide, guidesDepuisFeuille, verifieDepart, appliqueDepart } from '../game/src/config/feuille.js';

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
// Le combat guide : une quete ne cite qu'un guide qui existe, et ses etapes ne pointent que des cibles connues.
const CIBLES = ['carte', 'unite', 'heros', 'fin', 'pioche', 'auto'];
const ETAPES = ['poser', 'attaque', 'heros', 'fin', 'fatigue', 'auto'];   // celles dont ui/guide.js connait le moment
for (const q of QUETES.filter(x => x.guide)) {
  verifie(`${q.id} : le guide « ${q.guide} » existe`, !!GUIDES[q.guide]);
  verifie(`${q.id} : un guide sur un combat d'arene`, q.objectif.quoi === 'arene');
}
for (const [nom, etapes] of Object.entries(GUIDES)) for (const e of etapes) {
  verifie(`guide ${nom} · ${e.id} : etape connue`, ETAPES.includes(e.id));
  verifie(`guide ${nom} · ${e.id} : cible connue`, CIBLES.includes(e.cible), e.cible);
  verifie(`guide ${nom} · ${e.id} : un texte`, !!e.texte);
}
// Une quete « mets X dans l'equipe » vient apres celle qui donne X.
for (const q of QUETES.filter(x => x.objectif.quoi === 'equipe')) {
  const donne = QUETES.findIndex(x => x.recompense && x.recompense.heros === q.objectif.heros);
  verifie(`${q.id} : le heros est donne avant`, donne >= 0 && donne < QUETES.indexOf(q));
}

// ------------------------------------------------------------------ 1 bis. la feuille
{
  const connus = { heros: new Set(Object.keys(CHAR_BY_ID)), arenes: new Set(Object.keys(ARENE_PAR_ID)) };
  for (const x of verifieQuetes(FEUILLE.quests || [], connus)) verifie(`feuille « quests » : ${x.id}`, false, x.raison);
  for (const x of verifieGuide(FEUILLE.tutorial_guide || [])) verifie(`feuille « tutorial_guide » : ${x.id}`, false, x.raison);
  for (const x of verifieDepart(FEUILLE.start || [])) verifie(`feuille « start » : ${x.id}`, false, x.raison);
  // Une ligne fautive est ecartee, les autres restent, dans l'ordre.
  const lignes = [
    { id: 'a', titre: 'A', objectif: 'arene', arene: 'rabbit1', niveau: 1, pieces: 5, guide: 'premierCombat' },
    { id: 'b', titre: 'B', objectif: 'danse' },
    { id: 'c', titre: 'C', objectif: 'equipe', heros: 'lapin2', heros_offert: 'lapin3', places: 1, fin_tutoriel: true }
  ];
  const q = quetesDepuisFeuille(lignes, connus);
  verifie('feuille : la ligne fautive est ecartee', q.map(x => x.id).join() === 'a,c', q.map(x => x.id).join());
  verifie('feuille : une quete lue', JSON.stringify(q[0]) === JSON.stringify({ id: 'a', chapitre: 1, titre: 'A', texte: '', objectif: { quoi: 'arene', arene: 'rabbit1', niveau: 1 }, recompense: { C: 5 }, guide: 'premierCombat' }), JSON.stringify(q[0]));
  verifie('feuille : recompense heros + place, fin du tutoriel', q[1].recompense.heros === 'lapin3' && q[1].recompense.place === 1 && q[1].finTutoriel === true, JSON.stringify(q[1]));
  verifie('feuille : un onglet vide garde le code', quetesDepuisFeuille([], connus) === null && guidesDepuisFeuille([]) === null);
  const g = guidesDepuisFeuille([{ id: 'poser', cible: 'carte', texte: 'x' }, { id: 'auto', cible: 'nulle-part', texte: 'y' }, { id: 'fatigue', cible: 'pioche', texte: 'z', duree_s: 2.5 }]);
  verifie('feuille : guide lu (cible inconnue ecartee, duree en secondes)', JSON.stringify(g) === JSON.stringify({ premierCombat: [{ id: 'poser', cible: 'carte', texte: 'x' }, { id: 'fatigue', cible: 'pioche', texte: 'z', dureeMs: 2500 }] }), JSON.stringify(g));
  const b = appliqueDepart({ depart: { places: 1, monnaies: { A: 0, B: 0, C: 40, G: 0 }, heros: null }, decks: { tailleMin: 15 } },
    [{ id: 'places', value: 2 }, { id: 'pieces', value: '75' }, { id: 'heros_depart', value: 'lapin1, lapin2' }, { id: 'deck_minimum', value: 10 }, { id: 'sceaux', value: 'beaucoup' }]);
  verifie('feuille : « start » se pose (et une valeur fausse est ignoree)', b.depart.places === 2 && b.depart.monnaies.C === 75 && b.depart.monnaies.B === 0 && b.depart.heros.join() === 'lapin1,lapin2' && b.decks.tailleMin === 10, JSON.stringify(b));
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
  // La Ferme est hors du jeu (BALANCE.fermeActive) : ses quêtes se sautent aussi.
  verifie('ancienne sauvegarde : Medor, Felix, Corax sautés, et la Ferme aussi',
    !S.queteCourante() || !['plante', 'vend'].includes(S.queteCourante().objectif.quoi), S.queteCourante() && S.queteCourante().id);
}

// ------------------------------------------------------------------ 7. « tout debloque » (provisoire) et la triche
// `BALANCE.toutDebloque` rend tous les heros alignables SANS l'ecrire dans la sauvegarde : le tutoriel n'en voit rien.
{
  const avant = BALANCE.toutDebloque;
  stockage = {};
  const S = await etat();
  BALANCE.toutDebloque = true;
  verifie('tout débloqué : Médor alignable', S.possede('dog'));
  verifie('tout débloqué : rien d\'écrit dans la sauvegarde', !S.save.chars.dog.owned && !JSON.parse(stockage[BALANCE.save.key] || '{"chars":{}}').chars.dog?.owned);
  verifie('tout débloqué : le tutoriel commence quand même', S.queteCourante().id === QUETES[0].id && S.save.rosterSlots === 1);
  BALANCE.toutDebloque = false;
  verifie('réglage coupé : Médor plus alignable', !S.possede('dog'));
  // « Passer le tutoriel » (la console de triche) : comme une sauvegarde d'avant les quetes.
  const n = S.passeLeTutoriel();
  verifie('passer le tutoriel : fini', S.tutorielFini() && n > 0, String(n));
  verifie('passer le tutoriel : trois Lapins, trois places', ['lapin1', 'lapin2', 'lapin3'].every(id => S.save.chars[id].owned) && S.save.rosterSlots === 3, String(S.save.rosterSlots));
  verifie('passer le tutoriel : équipe remplie', S.save.team.filter(Boolean).length === 3, S.save.team.join());
  verifie('passer le tutoriel : la suite est Médor', S.queteCourante() && S.queteCourante().id === 'medor', S.queteCourante() && S.queteCourante().id);
  verifie('passer le tutoriel deux fois ne donne rien', S.passeLeTutoriel() === 0 && S.save.rosterSlots === 3);
  BALANCE.toutDebloque = avant;
}

for (const e of echecs) console.log(rouge('  ECHEC     ') + e);
if (!echecs.length) console.log(vert(`  ${QUETES.length} quetes, tutoriel deroule, migration verifiee.`));
console.log(`\n${passes} test(s) passe(s), ${echecs.length} echec(s).\n`);
process.exit(echecs.length ? 1 : 0);
