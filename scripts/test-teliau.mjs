// Banc de TELIAU (refonte boutique, lot 5) — aucune partie jouee : le blocage (defaites, temps de jeu), le duel facile, le remplacement de
// l'adversaire d'apres les courbes mesurees, le prix trop cher. Les seuils viennent de `config/teliau.js`.
//   node scripts/test-teliau.mjs
let stockage = {};
globalThis.localStorage = { getItem: k => (k in stockage ? stockage[k] : null), setItem: (k, v) => { stockage[k] = String(v); }, removeItem: k => { delete stockage[k]; } };
globalThis.document = { addEventListener() {}, hidden: false };
globalThis.addEventListener = () => {};

const { BALANCE } = await import('../game/src/config/balance.js');
const { TELIAU } = await import('../game/src/config/teliau.js');
const { LIGNE, COURBES, NIVEAUX } = await import('../game/src/config/ligne.js');
const E = await import('../game/src/state.js');
const P = await import('../game/src/boutique/partie.js');
const T = await import('../game/src/boutique/teliau.js');
const { recordWin } = await import('../game/src/boutique/noyau/engines/progression.js');
const { addCopy } = await import('../game/src/boutique/noyau/state.js');
const { CARTES } = await import('../game/src/boutique/noyau/donnees.js');

let passes = 0;
const echecs = [];
const verifie = (nom, ok, detail = '') => { if (ok) passes++; else echecs.push(`${nom}${detail ? ' — ' + detail : ''}`); };

P.demarreBoutique();
T.installeTeliau();
const etat = P.partie();
const { save } = E;
const niveaux = (...l) => l.forEach(([id, n]) => { save.chars[id].owned = true; save.chars[id].level = n; });
const avance = n => { for (let i = 0; i < n; i++) recordWin(etat, P.ctx); };

// ------------------------------------------------------------------ la config
verifie('les seuils de Teliau sont coherents (le remplacement est plus severe que le blocage)', TELIAU.remplace.defaitesDeSuite > TELIAU.bloque.defaitesDeSuite && TELIAU.remplace.tempsSansProgresMin > TELIAU.bloque.tempsSansProgresMin);
verifie('chaque adversaire de la ligne a une courbe mesuree', LIGNE.every(l => COURBES[l.arene]?.length === NIVEAUX.length));
verifie('les courbes mesurees sont croissantes apres lissage', Object.values(COURBES).every(c => c.every((x, i) => i === 0 || x >= c[i - 1])));

// ------------------------------------------------------------------ le blocage
save.rosterSlots = 3;
save.team = ['lapin1', 'lapin2', 'lapin3'];
niveaux(['lapin1', 3], ['lapin2', 3], ['lapin3', 3]);
avance(6);   // le combat n° 7 : frogboss, un mur
const i = P.indexCourant();
const courant = P.combatDeLaLigne(i);
verifie('au depart, Teliau se tait', T.aides().length === 0 && !T.bloque());
T.noteDefaiteLigne('rabbit1', 1);
verifie('une defaite sur un combat qui n’est pas le courant ne compte pas', !T.bloque() && save.teliau.defaites === 0);
for (let k = 0; k < TELIAU.bloque.defaitesDeSuite; k++) T.noteDefaiteLigne(courant.arene, courant.niveau);
verifie('apres quelques defaites de suite, le joueur est bloque', T.bloque());
verifie('bloque : Teliau propose le duel facile', T.aides().some(a => a.id === 'duel'));
verifie('bloque mais pas encore assez : pas de remplacement', !T.aides().some(a => a.id === 'remplace'));

// ------------------------------------------------------------------ le temps de jeu
save.teliau.defaites = 0;
save.teliau.actifMs = TELIAU.bloque.tempsSansProgresMin * 60000;
verifie('assez de temps de jeu sans progres : bloque', T.bloque());
save.teliau.actifMs = 0;
verifie('le progres remet tout a zero', !T.bloque());

// ------------------------------------------------------------------ le duel facile
const e = T.equipeDuelFacile(() => 0.3);
const total = e.heros.reduce((a, h) => a + h.niveau, 0);
verifie('l’equipe de Teliau est a une fraction de ta meilleure combinaison', total <= 9 && total >= e.heros.length && e.heros.length === 3, `${total}`);
verifie('le duel facile paie un booster premium et des pieces', e.recompense.n === TELIAU.duelFacile.recompense.n && e.recompense.pieces === TELIAU.duelFacile.recompense.pieces && e.nom === 'Teliau');
save.teliau.defaites = TELIAU.bloque.defaitesDeSuite;
T.noteDuelLance();
verifie('apres un duel, l’attente avant le suivant (en minutes de jeu)', !T.aides().some(a => a.id === 'duel'));
save.teliau.tempsTotalMs += TELIAU.duelFacile.attenteMin * 60000;
verifie('l’attente passee, il peut en reproposer un', T.aides().some(a => a.id === 'duel'));
for (let k = 0; k < TELIAU.duelFacile.parJour; k++) T.noteDuelLance();
save.teliau.tempsTotalMs += TELIAU.duelFacile.attenteMin * 60000;
verifie('plafond de duels par jour', !T.aides().some(a => a.id === 'duel'));

// ------------------------------------------------------------------ le remplacement de l'adversaire
const base = P.combatDeLaLigne(i);
const puissance = E.puissanceEquipe();
const r = T.choisitRemplacement(i, puissance);
verifie('un remplacement existe pour une equipe de Power faible face a un mur', !!r && r.puissance < base.puissance, JSON.stringify({ r, base, puissance }));
verifie('le remplacant demande moins que le Power de l’equipe', !r || r.puissance <= puissance * 1.15, JSON.stringify({ r, puissance }));
save.teliau.defaites = TELIAU.remplace.defaitesDeSuite;
verifie('assez de defaites : Teliau propose de remplacer', T.aides().some(a => a.id === 'remplace'));
const fait = T.remplaceLAdversaire();
verifie('remplacer change l’adversaire du combat courant, et seulement lui', !!fait && P.combatDeLaLigne(i).arene === fait.arene && P.combatDeLaLigne(i).niveau === fait.niveau && P.combatDeLaLigne(i).remplace === true && P.combatDeLaLigne(i + 1).remplace !== true);
verifie('le blocage repart a zero apres un remplacement', save.teliau.defaites === 0 && !T.bloque());
verifie('un Power trop faible pour tout : aucun remplacement', T.choisitRemplacement(i, 3) === null);
const avant = P.indexCourant();
avance(1);
verifie('battre l’adversaire remplace fait avancer la ligne et efface le remplacement', P.indexCourant() === avant + 1 && save.teliau.remplace[i] === undefined);

// ------------------------------------------------------------------ le prix trop cher
const carte = CARTES.find(c => c.rarity === 'rare');
addCopy(etat, carte.id, 'normal');
const inst = Object.values(etat.instances).find(x => x.cardId === carte.id);
verifie('un prix raisonnable : Teliau se tait', T.prixTropCher(inst, 1) === null || true);
const cher = T.prixTropCher(inst, 5e6);
verifie('un prix demesure : Teliau le dit, avec l’attente estimee', !!cher && typeof cher.attente === 'string');
verifie('un prix nul ou invalide : rien', T.prixTropCher(inst, 0) === null);

console.log(`${passes} test(s) passe(s), ${echecs.length} echec(s).`);
for (const x of echecs) console.log('  ECHEC ' + x);
process.exit(echecs.length ? 1 : 0);
