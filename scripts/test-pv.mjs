// Banc des PV des heros (4 nov. 2026) : de la feuille jusqu'au combat. `node scripts/test-pv.mjs`
// Montre, pour chaque heros, les PV du builder (characters.data.js brut), ceux apres la feuille (onglet `heroes`),
// et les PV d'equipe de quelques trios. Regle de `pvDeLEquipe` : base 20 + surplus de chacun (23 + 26 -> 29).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FEUILLE } from '../game/data/feuille.data.js';
import { CHARACTERS, CHAR_BY_ID, pvDeLEquipe, pvDuHeros, ameliorationsDuHeros, profilDeHeros, avecPvDeNiveau } from '../game/src/config/characters.js';
// Import dynamique : ce banc monte des camps mais ne joue AUCUNE partie (test-partage.mjs exige enParallele() des qu'on importe arene.js).
const { campPerso } = await import('../game/src/tools/' + 'arene.js');
import { BALANCE } from '../game/src/config/balance.js';

let echecs = 0;
const test = (nom, f) => { try { f(); console.log(`ok     ${nom}`); } catch (e) { echecs++; console.log(`ECHEC  ${nom}\n       ${e.message.split('\n')[0]}`); } };
// Le fichier du builder LU A PLAT : `characters.js` pose la feuille sur l'objet importe, en place.
const BRUT = JSON.parse(fs.readFileSync(new URL('../game/data/characters.data.js', import.meta.url), 'utf8').replace(/^[\s\S]*?export const CHARACTER_DATA = /, '').replace(/;\s*$/, ''));
const brut = id => (BRUT.characters.find(c => c.id === id) || {}).stats?.hp;
const apres = id => CHAR_BY_ID[id].stats.hp;
const base = BALANCE.combat.pvBase;

console.log(`pvBase = ${base}\n`);
console.log('heros'.padEnd(10), 'builder'.padStart(8), 'apres feuille'.padStart(14));
const ecrases = [];
for (const c of BRUT.characters) {
  const ligne = (FEUILLE.heroes || []).find(l => String(l.id) === c.id);
  const b = brut(c.id), a = apres(c.id);
  console.log(c.id.padEnd(10), String(b).padStart(8), String(a).padStart(14), ligne && ligne.PV_Max !== undefined && ligne.PV_Max !== '' ? `  <- feuille PV_Max=${ligne.PV_Max}` : '');
  if (ligne && ligne.PV_Max !== undefined && ligne.PV_Max !== '' && Number(ligne.PV_Max) !== b) ecrases.push(`${c.id}: builder ${b} -> feuille ${ligne.PV_Max}`);
}
console.log(`\nCases heroes.PV_Max qui ecrasent une valeur differente du builder : ${ecrases.length}`);
for (const e of ecrases) console.log('  ', e);

const trios = [['dog', 'crow', 'frog'], ['cat', 'owl', 'dog'], ['frog', 'crow', 'cat']].filter(t => t.every(id => CHAR_BY_ID[id]));
console.log('\ntrio'.padEnd(20), 'PV builder'.padStart(11), 'PV en jeu'.padStart(10));
for (const t of trios) {
  const pb = base + t.reduce((s, id) => s + Math.max(0, brut(id) - base), 0);
  console.log(t.join('+').padEnd(19), String(pb).padStart(11), String(pvDeLEquipe(t.map(id => CHAR_BY_ID[id]))).padStart(10));
}

test('regle : deux heros a 23 et 26 jouent a 29 PV', () => {
  assert.equal(pvDeLEquipe([{ stats: { hp: 23 } }, { stats: { hp: 26 } }]), base + 3 + 6);
  assert.equal(base, 20);
});
test('regle : un heros sous la base n\'enleve rien', () => {
  assert.equal(pvDeLEquipe([{ stats: { hp: 15 } }, { stats: { hp: 20 } }, { stats: { hp: 20 } }]), 20);
});
// ---- health_up : les lignes d'amelioration (onglet progress_profile) arrivent en jeu
test("un heros de niveau 1 n'a aucun health_up", () => {
  for (const c of CHARACTERS) assert.equal(pvDuHeros(c, 1), c.stats.hp, c.id);
});
test("health_up s'additionne par niveau, selon le profil de l'archetype", () => {
  const faux = a => ({ id: 'x', archetype: a, stats: { hp: 23 } });
  const hu = a => profilDeHeros(faux(a)).filter(l => l.upgrade === 'health_up').sort((x, y) => x.level - y.level);
  for (const a of ['control', 'combo']) {
    const lignes = hu(a); assert.ok(lignes.length, a);
    assert.equal(pvDuHeros(faux(a), lignes[0].level - 1), 23);
    assert.equal(pvDuHeros(faux(a), lignes[0].level), 23 + lignes[0].value);
    assert.equal(pvDuHeros(faux(a), 9999), 23 + lignes.reduce((n, l) => n + l.value, 0));
  }
  assert.equal(hu('aggro').length, 0, "le profil aggro n'a pas de health_up dans la feuille");
});
test("un health_up atteint entre dans les PV de l'equipe : (23 + health_up) et 26 -> 20 + surplus", () => {
  const a = { id: 'x', archetype: 'inconnu', stats: { hp: 23 } };       // profil de repli : progress_profile_base
  const niv = 9999, plus = ameliorationsDuHeros(a, niv).health_up;
  assert.ok(plus > 0);
  assert.equal(pvDeLEquipe([avecPvDeNiveau(a, niv), { stats: { hp: 26 } }]), 20 + (3 + plus) + 6);
});
test("l'arene voit les PV du jeu : niveau haut >= niveau 1, et jamais sous les PV de la feuille", () => {
  const ids = ['cat', 'owl', 'dog'], tous = ids.map(id => CHAR_BY_ID[id]);
  assert.ok(campPerso(ids, 1).hp === pvDeLEquipe(tous));
  assert.ok(campPerso(ids, 99).hp >= pvDeLEquipe(tous));
});

// Decision du game designer (16 oct.) : qui gagne, feuille ou builder, est a lui. Ce n'est donc pas un echec : un AVERTISSEMENT.
if (ecrases.length) console.log(`
⚠ ${ecrases.length} case(s) de la feuille BAISSENT les PV du builder : a vider, ou a remplir avec les vraies valeurs (decision du game designer).`);
console.log(echecs ? `\n${echecs} echec(s)` : '\ntout est vert');
process.exit(echecs ? 1 : 0);
