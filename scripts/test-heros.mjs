// Banc des HEROS, de leur Power et de leurs ameliorations en lot (refonte boutique, 3 nov. 2026) — aucune partie jouee.
//   Power = 10 x la somme des niveaux ; heros caches / grises / ouverts ; deblocage par les cartes ; niveau de reference et heros en retard ;
//   amelioration en lot (deux etats du bouton) et file d'animations ; offre a l'arrivee d'un heros ; mode Auto verrouille.
//   node scripts/test-heros.mjs
let stockage = {};
globalThis.localStorage = { getItem: k => (k in stockage ? stockage[k] : null), setItem: (k, v) => { stockage[k] = String(v); }, removeItem: k => { delete stockage[k]; } };
globalThis.document = { addEventListener() {}, hidden: false };
globalThis.addEventListener = () => {};

const { BALANCE } = await import('../game/src/config/balance.js');
const E = await import('../game/src/state.js');
const P = await import('../game/src/boutique/partie.js');
const H = await import('../game/src/boutique/heros.js');
const { addCopy } = await import('../game/src/boutique/noyau/state.js');
const { checkHeroUnlock } = await import('../game/src/boutique/noyau/engines/heroUnlock.js');
const { recordWin } = await import('../game/src/boutique/noyau/engines/progression.js');
const { CARTES } = await import('../game/src/boutique/noyau/donnees.js');
const { CHAR_BY_ID } = await import('../game/src/config/characters.js');

let passes = 0;
const echecs = [];
const verifie = (nom, ok, detail = '') => { if (ok) passes++; else echecs.push(`${nom}${detail ? ' — ' + detail : ''}`); };

P.demarreBoutique();
const etat = P.partie();
const { save } = E;

// ------------------------------------------------------------------ le Power
const niveaux = (...l) => { l.forEach(([id, n]) => { save.chars[id].owned = true; save.chars[id].level = n; }); };
verifie('Power d’un heros = 10 x son niveau', E.puissance('lapin1', 7) === 70);
verifie('Power du joueur = 10 x la somme des niveaux des heros possedes', (() => {
  niveaux(['lapin1', 3], ['lapin2', 2]);
  return E.puissanceJoueur() === 10 * (3 + 2);
})());

// ------------------------------------------------------------------ cache / grise / ouvert
verifie('un heros de l’extension 2 est cache tant que sa phase A n’est pas debloquee', H.visibilite('dog2') === 'cache');
verifie('un heros de l’extension 1, cartes pas decouvertes, est grise', H.visibilite('dog') === 'grise');
verifie('un heros que le jeu a donne est ouvert', H.visibilite('lapin1') === 'ouvert');
etat.progression.extensions.push('ext2');
verifie('la phase A de l’extension 2 debloquee : son heros devient grise', H.visibilite('dog2') === 'grise');
const requises = CARTES.filter(c => c.hero === 'Médor' && !c.isSwitch);
verifie('progression : 0 carte sur 5 au depart', H.progresDecouverte('dog').n === 0 && H.progresDecouverte('dog').sur === 5);
requises.slice(0, 4).forEach(c => addCopy(etat, c.id, 'normal'));
verifie('progression : 4 sur 5', H.progresDecouverte('dog').n === 4 && H.visibilite('dog') === 'grise' && !E.possede('dog'));

// ------------------------------------------------------------------ niveau de reference, heros en retard
// Les heros du jeu au niveau : lapin1 10, lapin2 8, lapin3 6, cat 2 (donc 4 heros, le 3e = 6).
niveaux(['lapin1', 10], ['lapin2', 8], ['lapin3', 6], ['cat', 2]);
verifie('niveau de reference = le niveau du 3e meilleur heros', H.niveauDeReference() === 6);
verifie('heros en retard = ceux sous la reference', H.enRetard().map(c => c.id).join() === 'cat');
verifie('le bouton dit « behind » tant qu’un heros est en retard', H.modeDuLot() === 'behind');
const prevu = H.lotPrevu();
verifie('le lot prevu coute la somme des ameliorations a la main', prevu.cout === H.coutJusquA('cat', 6) && prevu.cout > 0);

// ------------------------------------------------------------------ l'amelioration en lot
verifie('le lot est verrouille au depart', !H.lotDebloque());
E.passeLeTutoriel();
verifie('le lot est verrouille jusqu’au rang voulu, meme tutoriel fini', !H.lotDebloque());
verifie('Auto verrouille au depart (tutoriel fini, aucun adversaire battu)', !H.autoDebloque());
for (let i = 0; i < BALANCE.heros.lot.apresVictoires; i++) recordWin(etat, P.ctx);
verifie('le lot se debloque apres quelques adversaires', H.lotDebloque());
save.cur.C = 1;
verifie('sans pieces, rien ne monte', H.ameliorerEnLot().montees === 0 && save.chars.cat.level === 2);
save.cur.C = 1e9;
const r = H.ameliorerEnLot();
verifie('lot « behind » : le heros en retard rejoint la reference', r.mode === 'behind' && save.chars.cat.level === 6 && r.montees === 4, JSON.stringify(r));
verifie('les pieces depensees sont celles du lot', r.depense === prevu.cout, `${r.depense} / ${prevu.cout}`);
verifie('les animations attendent l’ouverture du heros', H.animationsEnAttente('cat').length === 4 && H.animationsEnAttente('lapin1').length === 0);
verifie('apres le lot, plus personne n’est en retard : « all »', H.modeDuLot() === 'all');
const avant = Object.fromEntries(['lapin1', 'lapin2', 'lapin3', 'cat'].map(id => [id, save.chars[id].level]));
const r2 = H.ameliorerEnLot();
verifie('lot « all » : chaque heros monte d’un niveau', r2.mode === 'all' && ['lapin1', 'lapin2', 'lapin3', 'cat'].every(id => save.chars[id].level === avant[id] + 1), JSON.stringify(r2));
verifie('ouvrir le heros vide sa file d’animations', H.prendAnimations('cat').length === 5 && H.animationsEnAttente('cat').length === 0);
save.cur.C = 5;
const niv = save.chars.cat.level;
H.ameliorerEnLot();
verifie('pieces insuffisantes : montees partielles ou nulles, jamais negatives', save.cur.C >= 0 && save.chars.cat.level >= niv);

// ------------------------------------------------------------------ l'offre a l'arrivee d'un heros
save.cur.C = 1e9;
H.reperesLesArrivees();   // l’ecran Deck l’a deja fait une fois : les heros d’avant sont connus
requises.forEach(c => { if (etat.collection[c.id] === undefined) addCopy(etat, c.id, 'normal'); });
checkHeroUnlock(etat, 'Médor', P.ctx);
verifie('toutes les cartes de base decouvertes : le heros est a toi', E.possede('dog'));
H.reperesLesArrivees();
const o = H.offreEnAttente();
verifie('un heros arrive sous la reference : une offre l’attend', !!o && o.id === 'dog' && o.vers === H.niveauDeReference());
verifie('prix de l’offre = une part du prix a la main', o.cout === Math.round(H.coutJusquA('dog', o.vers) * BALANCE.heros.offre.remise));
const pieces = save.cur.C;
verifie('accepter paie et monte le heros a la reference', H.accepteOffre() === 'ok' && save.chars.dog.level === o.vers && pieces - save.cur.C === o.cout);
verifie('une offre acceptee ne revient pas', H.offreEnAttente() === null);

// ------------------------------------------------------------------ le mode Auto
for (let i = etat.progression.opponentIndex; i < BALANCE.heros.auto.apresVictoires; i++) recordWin(etat, P.ctx);
verifie('Auto debloque au rang voulu', H.autoDebloque());

console.log(`${passes} test(s) passe(s), ${echecs.length} echec(s).`);
for (const e of echecs) console.log('  ECHEC ' + e);
process.exit(echecs.length ? 1 : 0);
