// Banc de la boutique (refonte du 3 nov. 2026) : le noyau généré (`game/src/boutique/noyau/`) tient les règles décidées.
// Aucune partie de combat jouée. `node scripts/test-boutique.mjs`
import assert from 'node:assert/strict';
import { CARTES, CONFIG } from '../game/src/boutique/noyau/donnees.js';
import { createContext } from '../game/src/boutique/noyau/context.js';
import { createState, addCopy, checkSellable, recordDeckPlayed } from '../game/src/boutique/noyau/state.js';
import { openBooster } from '../game/src/boutique/noyau/engines/packs.js';
import { recordWin } from '../game/src/boutique/noyau/engines/progression.js';
import { marketPrice, openLotNow, placeBid } from '../game/src/boutique/noyau/engines/market.js';
import { tick } from '../game/src/boutique/noyau/engines/tick.js';

let n = 0, echecs = 0;
const test = (nom, f) => {
  try { f(); n++; } catch (e) { echecs++; console.log(`ECHEC  ${nom}\n       ${e.message.split('\n')[0]}`); }
};
const neuf = (graine = 1) => {
  const ctx = createContext(CONFIG, CARTES, graine);
  return { ctx, etat: createState(ctx) };
};

test('identifiants en anglais : legendary, mythic, Control', () => {
  assert.deepEqual(CONFIG.rarities.map(r => r.id), ['common', 'rare', 'epic', 'legendary', 'mythic']);
  assert.ok(CONFIG.archetypes.some(a => a.id === 'Control'));
  assert.ok(!CARTES.some(c => c.archetype === 'Contrôle' || c.rarity === 'mythique' || c.rarity === 'legendaire'));
  assert.equal('switchCardsDrop' in CONFIG.boosters, false);
});

test('les mythiques sont des cartes switch, une par héros', () => {
  const mythiques = CARTES.filter(c => c.rarity === 'mythic');
  assert.equal(mythiques.length, 21);
  assert.ok(mythiques.every(c => c.isSwitch));
  assert.equal(new Set(mythiques.map(c => c.hero)).size, 21);
});

test('une partie neuve : phase A de l’extension 1 seule, aucune phase B', () => {
  const { etat } = neuf();
  assert.deepEqual(etat.progression.extensions, ['ext1']);
  assert.deepEqual(etat.progression.switchExtensions, []);
});

test('phase A : ni switch ni mythique ; phase B : les switch (et les mythiques) sortent', () => {
  const { ctx, etat } = neuf(3);
  const tire = () => {
    const sorties = [];
    for (let i = 0; i < 1500; i++) {
      etat.boosters.stock = 1;
      const r = openBooster(etat, ctx, { extension: 'ext1' });
      assert.ok(r.ok);
      for (const id of r.value) sorties.push(ctx.index.cardById.get(id));
    }
    return sorties;
  };
  const a = tire();
  assert.ok(a.every(c => c.extension === 'ext1' && !c.isSwitch && c.rarity !== 'mythic'));
  etat.progression.switchExtensions = ['ext1'];
  const b = tire();
  assert.ok(b.some(c => c.isSwitch) && b.some(c => c.rarity === 'mythic'));
});

test('le booster d’une extension pas encore débloquée est refusé', () => {
  const { ctx, etat } = neuf();
  etat.boosters.stock = 3;
  assert.equal(openBooster(etat, ctx, { extension: 'ext3' }).ok, false);
  assert.equal(etat.boosters.stock, 3);
});

test('une victoire suffit pour battre un adversaire, et chaque marche débloque quelque chose', () => {
  const { ctx, etat } = neuf();
  assert.equal(CONFIG.progression.ladder.winsToAdvance, 1);
  assert.equal(recordWin(etat, ctx), true);
  assert.equal(etat.progression.opponentIndex, 1);
  const vide = CONFIG.progression.steps.filter(s => !s.extensions.length && !s.switchExtensions.length && !s.features.length && !s.gems && !Object.keys(s.premiumBoosters).length);
  assert.equal(vide.length, 0, 'un palier ne débloque rien');
  const phases = CONFIG.progression.steps.flatMap(s => [...s.extensions.map(e => `${e}A`), ...s.switchExtensions.map(e => `${e}B`)]);
  assert.deepEqual(phases, ['ext1A', 'ext1B', 'ext2A', 'ext2B', 'ext3A', 'ext3B'], 'six déblocages, la A avant la B');
});

test('les doubles se vendent toujours, même ceux d’un deck utilisé', () => {
  const { etat } = neuf();
  const id = CARTES[0].id;
  addCopy(etat, id, 'normal');
  const double = addCopy(etat, id, 'normal').id;
  recordDeckPlayed(etat, { heroes: ['a', 'b', 'c'], cards: [id] });
  assert.equal(checkSellable(etat, double).ok, true);
  assert.equal('lockedByDeck' in etat, false);
});

test('parties jouées par carte et dernier deck', () => {
  const { etat } = neuf();
  recordDeckPlayed(etat, { heroes: ['a', 'b', 'c'], cards: ['x', 'y'] });
  recordDeckPlayed(etat, { heroes: ['a', 'd', 'e'], cards: ['x'] });
  assert.deepEqual(etat.plays, { x: 2, y: 1 });
  assert.deepEqual(etat.lastDeck, { heroes: ['a', 'd', 'e'], cards: ['x'] });
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(etat)));
});

test('enchères : on mise sur une carte déjà possédée, la copie gagnée va au stock, et un double coûte plus cher', () => {
  const { ctx, etat } = neuf(8);
  etat.progression.features = ['cardMarket'];
  etat.progression.extensions = ['ext1', 'ext2', 'ext3'];
  etat.progression.switchExtensions = ['ext1', 'ext2', 'ext3'];
  for (const c of CARTES) addCopy(etat, c.id, 'normal');
  etat.market.nextRefreshMs = Infinity;
  const carte = openLotNow(etat, ctx);
  const lot = etat.market.lots[0];
  assert.ok(carte && lot.owned);
  etat.gold = 1e9;
  const manquant = { ...etat, collection: {} };
  assert.ok(marketPrice(carte, etat, ctx) > marketPrice(carte, manquant, ctx));
  assert.equal(placeBid(etat, lot.id, ctx).ok, true);
  lot.nextRivalMs = null;
  lot.endMs = etat.nowMs + 60000;
  tick(etat, 120000, ctx);
  const copies = Object.values(etat.instances).filter(i => i.cardId === carte);
  assert.equal(copies.length, 2);
  assert.ok(copies.some(i => i.location === 'stock'));
});

test('enchères : la plus basse victoire sur un double coûte plus qu’une revente aux enchères (aucun profit garanti)', () => {
  const { lot, buyMultiplier, ownedBuyMultiplier } = CONFIG.market;
  const plusBas = (lot.rivalMaxMin * buyMultiplier * ownedBuyMultiplier) / (1 + lot.incrementFraction);
  const meilleure = Math.max(...CONFIG.auction.durationsHours.map(h => 1 + (CONFIG.auction.c - 1) * CONFIG.auction.gainByDuration[h]));
  assert.ok(plusBas >= meilleure, `${plusBas} < ${meilleure}`);
});

test('le profil de référence : deux sessions de 30 minutes, à 8 h et à 19 h', () => {
  assert.deepEqual(CONFIG.profiles.reference.sessions, [{ startMinute: 480, durationMinutes: 30 }, { startMinute: 1140, durationMinutes: 30 }]);
});

console.log(`${n} test(s) passe(s), ${echecs} echec(s).`);
process.exit(echecs ? 1 : 0);
