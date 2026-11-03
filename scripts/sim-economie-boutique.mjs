// Simule le joueur de référence de la boutique avec les vrais moteurs du noyau (dépôt TypeScript `core/`, lu en place : Node 24 retire les types).
// RECRÉÉ le 3 nov. 2026 : l'original (2 nov.) était introuvable sur ce PC ; mêmes options, sens à confirmer.
//   node scripts/sim-economie-boutique.mjs [--core <dossier de core/>] [--days 60] [--seeds 8] [--profile reference]
//        [--config surcharge.json] [--first] [--wins N]
//   --config  un JSON { "chemin.dans.la.config": valeur } appliqué à la config du noyau (ex. { "market.lot.ownedFraction": 0.5 })
//   --first   dit aussi, pour chaque extension, le jour où sa phase A est complète, et le jour de la première mythique du héros de tête
//   --wins N  victoires du mode Auto par jour (remplace `auto.minutesPerWin` de la simulation du noyau : 1440 / N)
//   --profile le profil de sessions (config/profiles.json : `reference` = 2 × 30 minutes, 8 h et 19 h)
// Les paramètres du joueur de référence (sessions, politique de vente) vivent dans core/config/{profiles,simulation}.json ; la Sheet « Config
// Adventure-Cards », onglet ~boutique_simulation, en garde la copie lisible.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (nom, defaut) => {
  const i = process.argv.indexOf(`--${nom}`);
  return i < 0 ? defaut : process.argv[i + 1];
};
const drapeau = nom => process.argv.includes(`--${nom}`);
const CORE = arg('core', process.env.AC_CORE ?? 'D:/tcg-card-tycoon_-marché-&-enchères/core');
const charge = chemin => import(pathToFileURL(join(CORE, 'src', chemin)).href);

const [{ loadCatalog, loadConfig, loadSimulationConfig }, { runSimulation, applyOverrides }, { validateConfig }] =
  await Promise.all([charge('load.ts'), charge('sim/run.ts'), charge('config.ts')]);

const jours = Number(arg('days', 60));
const graines = Number(arg('seeds', 8));
const profil = arg('profile', 'reference');
const surcharge = arg('config') ? JSON.parse(readFileSync(arg('config'), 'utf8')) : {};
const cfg = applyOverrides(loadConfig(), surcharge);
const cartes = loadCatalog(cfg);
const sim = loadSimulationConfig();
const auto = { ...sim.defaults.auto };
if (arg('wins')) auto.minutesPerWin = 1440 / Number(arg('wins'));

const erreurs = validateConfig(cfg).filter(i => i.level === 'error');
for (const e of erreurs) console.log(`[erreur] ${e.code} : ${e.message}`);
if (erreurs.length) process.exit(1);

const mediane = a => { const s = a.filter(x => x !== undefined && !Number.isNaN(x)).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
const lance = (j, s) => runSimulation(cfg, cartes, { id: profil, profile: profil }, sim.policy, { days: j, seed: sim.defaults.seed + s * 7919, topHero: sim.defaults.topHero, auto });
const trio = ['Pompon', 'Caramel', 'Séléné'];
const niveauTrio = m => trio.reduce((a, h) => a + (m.levelByHero[h] ?? 1), 0) / trio.length;

const longues = Array.from({ length: graines }, (_, s) => lance(jours, s));
console.log(`profil ${profil}, ${jours} jours, ${graines} graines${Object.keys(surcharge).length ? `, surcharge ${JSON.stringify(surcharge)}` : ''}`);
console.log(`boosters ouverts par jour : ${(mediane(longues.map(m => m.boostersOpened)) / jours).toFixed(1)}`);
console.log(`or gagné par jour : ${Math.round(mediane(longues.map(m => m.goldEarned)) / jours)} (ventes : vitrine ${Math.round(mediane(longues.map(m => m.channels.showcase.gold)))}, enchères ${Math.round(mediane(longues.map(m => m.channels.auction.gold)))}, bulk ${Math.round(mediane(longues.map(m => m.channels.bulk.gold)))})`);
console.log(`or dépensé : améliorations ${Math.round(mediane(longues.map(m => m.goldOnUpgrades)))}, grading ${Math.round(mediane(longues.map(m => m.goldOnGrading)))}, marché ${Math.round(mediane(longues.map(m => m.goldOnMarket)))} (${mediane(longues.map(m => m.marketBuys))} achats)`);
if (drapeau('first')) {
  for (const ext of cfg.extensions) {
    const js = longues.map(m => m.phaseADay[ext.id]);
    console.log(`phase A ${ext.id} complète : jour ${mediane(js)} (médiane), ${js.filter(x => x !== undefined).length}/${graines} graines`);
  }
  console.log(`mythiques du héros de tête sur ${jours} jours : ${mediane(longues.map(m => m.topByWeek.reduce((a, b) => a + b, 0)))} (médiane) ; écart médian ${mediane(longues.flatMap(m => m.topGaps))} boosters`);
}
const focus = { ...sim.policy, upgradeOnly: trio };
for (const j of [7, 14, 30, 60].filter(j => j <= jours)) {
  const ms = Array.from({ length: Math.min(graines, 6) }, (_, s) => runSimulation(cfg, cartes, { id: profil, profile: profil }, focus, { days: j, seed: sim.defaults.seed + s * 7919, topHero: sim.defaults.topHero, auto }));
  console.log(`jour ${j} : niveau du trio de départ ${mediane(ms.map(niveauTrio)).toFixed(1)}`);
}
