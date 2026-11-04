// LE BANC DE FORCE DU BOT (mission bot, 4 nov. 2026) : un niveau d'IA contre un autre, SUR LES MEMES DECKS, cotes echanges.
//
//   node scripts/bench-bot.mjs                          normal contre normal (doit faire ~50 %)
//   node scripts/bench-bot.mjs lecture normal           le niveau A contre le niveau B
//   node scripts/bench-bot.mjs lecture normal --parties 100   parties par paire de decks ET par sens (defaut : BALANCE.ai.bench)
//   node scripts/bench-bot.mjs ... --json f.json        ecrit aussi le resultat (JSON)
//   node scripts/bench-bot.mjs ... --trios dog,crow,frog;cat,owl,dog   d'autres trios (separes par « ; »)
//
// COMMENT ON JUGE. Pour chaque paire de decks (D, O), A joue D contre B qui joue O, PUIS A joue O contre B qui joue D :
// la force des decks s'annule, il ne reste que celle du bot. Dans chaque partie, le camp qui commence alterne. Le taux d'un deck D
// est le taux de A dans TOUTES les parties ou D est en jeu (des deux cotes), contre tous les autres decks de reference.
// Intervalle : Wilson a 95 % (`wilson`). « Pas de chiffre sans son intervalle » : un ecart plus petit que lui est du bruit.
// Le temps par decision est le temps de `botAction` seul (moteur exclu), par niveau d'IA... mesure sur A et B confondus.
// Tout passe par la file commune (lib/pool.mjs) : tous les coeurs et les renforts.
import { BALANCE } from '../game/src/config/balance.js';
import { CHAR_BY_ID } from '../game/src/config/characters.js';
import { wilson } from '../game/src/tools/arene.js';
import { enParallele, nombreDeJobs } from './lib/pool.mjs';
import { writeFileSync } from 'node:fs';

const arg = (nom) => (process.argv.includes(nom) ? process.argv[process.argv.indexOf(nom) + 1] : '');
const positionnels = process.argv.slice(2).filter((x, i, t) => !x.startsWith('--') && !(i > 0 && t[i - 1].startsWith('--')));
const niveauA = positionnels[0] || 'normal', niveauB = positionnels[1] || 'normal';
for (const n of [niveauA, niveauB]) {
  if (!BALANCE.ai.niveaux[n]) { console.error(`Niveau d'IA inconnu : « ${n} » (connus : ${Object.keys(BALANCE.ai.niveaux).join(', ')})`); process.exit(1); }
  if (/^montecarlo/.test(n)) { console.error('Un bot Monte-Carlo est trop lent pour ce banc.'); process.exit(1); }
}
const cfg = BALANCE.ai.bench;
const parties = Number(arg('--parties')) || cfg.parties;
const trios = arg('--trios') ? arg('--trios').split(';').map(t => t.split(',')) : cfg.trios;
for (const t of trios) { if (t.length < 3) { console.error('Que des trios (3 heros ou plus) : ' + t.join(',')); process.exit(1); } for (const id of t) if (!CHAR_BY_ID[id]) { console.error('Heros inconnu : ' + id); process.exit(1); } }
const nom = t => t.map(id => CHAR_BY_ID[id].name).join('+');
const LOT = 25;

const taches = [];
for (let i = 0; i < trios.length; i++) for (let j = i; j < trios.length; j++) {
  for (const arr of i === j ? [0] : [0, 1]) for (let r = 0; r < parties; r += LOT) taches.push({ i, j, arr, parties: Math.min(LOT, parties - r), niveauA, niveauB });
}
console.log(`Banc de force : « ${niveauA} » (A) contre « ${niveauB} » (B), ${trios.length} trios, ${parties} parties par paire et par sens, niveau ${cfg.niveau}, ${taches.length} lots.`);

const par = trios.map(() => ({ v: 0, d: 0 }));
let V = 0, D = 0, ms = 0, decisions = 0, tours = 0, nParties = 0;
await enParallele(taches, new URL('./lib/taches-bench-bot.mjs', import.meta.url), {
  jobs: nombreDeJobs(), unite: 'lots',
  contexte: { trios, niveau: cfg.niveau },
  surResultat: (k, r) => {
    for (const x of new Set([r.i, r.j])) { par[x].v += r.victoiresA; par[x].d += r.decisives; }
    V += r.victoiresA; D += r.decisives; ms += r.ms; decisions += r.decisions; tours += r.tours; nParties += r.parties;
  }
});

const pct = (x, n) => { const w = wilson(n ? x / n : 0.5, n); return `${(100 * (n ? x / n : 0.5)).toFixed(1)} % ± ${(100 * w.demi).toFixed(1)}`; };
console.log('\nTaux de victoire de A, par deck de reference (parties ou ce deck est en jeu, des deux cotes) :');
trios.forEach((t, i) => console.log('  ' + nom(t).padEnd(36) + pct(par[i].v, par[i].d).padStart(16) + `   (${par[i].d} parties)`));
const moyenne = pct(V, D);
console.log(`\nMOYENNE : ${moyenne}  (${D} parties decisives sur ${nParties})`);
console.log(`Longueur moyenne : ${(tours / nParties).toFixed(1)} tours · ${(ms / decisions).toFixed(3)} ms par decision (${decisions} decisions)`);
if (arg('--json')) {
  const out = { niveauA, niveauB, parties, niveau: cfg.niveau, trios, moyenne: { victoires: V, decisives: D, taux: V / D, demi: wilson(V / D, D).demi },
    parDeck: trios.map((t, i) => ({ trio: t, nom: nom(t), victoires: par[i].v, decisives: par[i].d, taux: par[i].v / par[i].d, demi: wilson(par[i].v / par[i].d, par[i].d).demi })),
    toursMoyens: tours / nParties, msParDecision: ms / decisions, decisions };
  writeFileSync(arg('--json'), JSON.stringify(out, null, 2));
}
