// Audit des paliers de niveau : « les montees en niveau se sentent-elles ? », sans lire un seul palier.
// usage : node scripts/audit-paliers.mjs [--hero dog2,cat2] [--json] [--strict]
//   --hero    ne regarder que ces heros (ids, separes par des virgules)
//   --json    sortie lisible par une machine (une IA, un tableur) : voir `docs/GRAMMAIRE-DES-PALIERS.md`
//   --strict  code de sortie 1 des qu'il y a un avertissement (et pas seulement une erreur)
//
// Ce qu'il mesure, et pourquoi (les regles sont celles de docs/GRAMMAIRE-DES-PALIERS.md) :
//   - la NATURE de chaque palier : chiffre (stats / effet + / cout) ou VERBE (un effet, un moment,
//     une aura, un mot-cle, un statique, « choisit les deux »). Un palier de verbe se raconte ;
//     un palier de chiffre se lit. Une montee de niveau faite de chiffres ne se SENT pas.
//   - le CALENDRIER du heros : chaque niveau de 2 a MAX_NIVEAU change au moins une carte, et pas
//     plus de MAX_PAR_NIVEAU a la fois. Un niveau muet est un niveau qui ne se paie pas.
//   - le COUT : un palier « cout -1 » qui n'a plus rien a retirer est mort, et une carte qui
//     tombe a 0 est un choix de design, pas un accident.
//   - le COPIE-COLLE : les trois paliers par defaut du builder (2/5/10 : +0/+1, +1/+0, +1/+2).
import { CHARACTER_DATA as D } from '../game/data/characters.data.js';
import { tierIssue } from '../game/src/config/validate.js';

// ------------------------------------------------------------------ reglages de l'audit
// Ce ne sont pas des valeurs d'equilibrage du jeu : ce sont les seuils de LECTURE de l'audit.
const MAX_NIVEAU = 20;          // BALANCE.progression.maxLevel (game/src/config/balance.js)
const MAX_PAR_NIVEAU = 3;       // cartes d'un meme heros qui changent au meme niveau (base + switch confondus)
const MAX_NUMERIQUES = 1;       // paliers « chiffre seulement » tolerables sur une meme carte
const MIN_VERBES_PAR_CARTE = 1; // une carte doit gagner au moins un VERBE sur toute sa progression
const PAR_DEFAUT = ['2:0/1', '5:1/0', '10:1/2'];

const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const val = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const filtre = val('hero') ? new Set(val('hero').split(',')) : null;

const nature = t => t.stats ? 'stats' : t.amp !== undefined ? 'amp' : t.cost ? 'cout'
  : t.aura ? 'aura' : t.statique ? 'statique' : t.key ? 'motcle' : t.lesDeux ? 'lesDeux'
  : t.extra ? 'extra' : '?';
const NUMERIQUE = new Set(['stats', 'amp', 'cout']);
const momentDe = t => t.extra ? (t.slot || 'play') : null;

const trouvailles = [];   // { niveau: 'erreur'|'avertissement', hero, carte, msg }
const dit = (niveau, hero, carte, msg) => trouvailles.push({ niveau, hero, carte: carte || null, msg });

const heros = D.characters.filter(h => !filtre || filtre.has(h.id));
const rapport = [];

for (const h of heros) {
  const cartes = [...h.cards.map(c => ({ c, cote: 'base' })), ...h.switches.map(c => ({ c, cote: 'switch' }))];
  const calendrier = {};            // niveau -> noms des cartes
  const parCote = { base: {}, switch: {} };
  const compte = { stats: 0, amp: 0, cout: 0, aura: 0, statique: 0, motcle: 0, lesDeux: 0, extra: 0 };
  let tiersTotal = 0, cartesNumeriques = 0, cartesSansVerbe = 0;

  for (const { c, cote } of cartes) {
    const ts = c.tiers || [];
    const natures = ts.map(nature);
    tiersTotal += ts.length;
    for (const n of natures) if (compte[n] !== undefined) compte[n]++;

    // --- le chiffre qui accompagne, jamais qui remplace
    const nbNum = natures.filter(n => NUMERIQUE.has(n)).length;
    const nbVerbes = ts.length - nbNum;
    if (!ts.length) dit('avertissement', h.id, c.name, 'aucun palier : la carte ne progresse jamais.');
    else if (nbVerbes < MIN_VERBES_PAR_CARTE) { cartesSansVerbe++; dit('avertissement', h.id, c.name, `${nbNum} palier(s), tous des chiffres : elle ne gagne aucun verbe.`); }
    if (nbNum > MAX_NUMERIQUES) dit('avertissement', h.id, c.name, `${nbNum} paliers purement numériques (${natures.filter(n => NUMERIQUE.has(n)).join(', ')}) : maximum ${MAX_NUMERIQUES}.`);
    if (ts.length && nbNum === ts.length) cartesNumeriques++;

    // --- copie-colle des paliers par defaut du builder
    const sig = ts.filter(t => t.stats).map(t => `${t.lvl}:${t.stats.atk || 0}/${t.stats.hp || 0}`);
    if (PAR_DEFAUT.every(s => sig.includes(s))) dit('avertissement', h.id, c.name, 'paliers 2/5/10 du builder laissés tels quels (+0/+1, +1/+0, +1/+2).');

    // --- le cout
    const delta = ts.reduce((a, t) => a + (t.cost || 0), 0);
    const nbCout = ts.filter(t => t.cost).length;
    if (nbCout) {
      const net = c.cost + delta;
      if (net < 0) dit('erreur', h.id, c.name, `coût ${c.cost} avec ${nbCout} palier(s) « coût » (${delta}) : tombe sous 0 (le moteur le plancher à 0, le dernier palier est mort).`);
      else if (net === 0) dit('avertissement', h.id, c.name, `coût ${c.cost} → 0 au bout de ${nbCout} palier(s) : voulu ? (une carte gratuite change ce qu'elle est).`);
    }

    // --- contradictions de mots-cles
    const motcles = new Set([...(c.keys || []), ...ts.filter(t => t.key).map(t => t.key)].map(k => String(k).split(':')[0].toLowerCase()));
    if (motcles.has('taunt') && motcles.has('elusif')) dit('avertissement', h.id, c.name, 'Provocation et Élusif sur la même unité : l’un annule l’autre.');

    // --- ce que le builder signale deja (palier sans effet sur sa carte)
    for (const t of ts) { const w = tierIssue(c, t); if (w) dit('erreur', h.id, c.name, `palier ${t.lvl} sans effet : ${w}`); if (!t.text) dit('avertissement', h.id, c.name, `palier ${t.lvl} sans texte : le joueur ne verra pas ce qui change.`); }
    const vus = new Set();
    for (const t of ts) { if (vus.has(t.lvl)) dit('avertissement', h.id, c.name, `deux paliers au niveau ${t.lvl} : il se lira comme un seul changement.`); vus.add(t.lvl); }

    for (const t of ts) {
      (calendrier[t.lvl] = calendrier[t.lvl] || []).push(c.name);
      (parCote[cote][t.lvl] = parCote[cote][t.lvl] || []).push(c.name);
      if (t.lvl > MAX_NIVEAU) dit('erreur', h.id, c.name, `palier au niveau ${t.lvl} : au-delà du niveau max (${MAX_NIVEAU}).`);
    }
  }

  // --- le calendrier du heros
  const muets = [], surcharges = [];
  for (let l = 2; l <= MAX_NIVEAU; l++) {
    const n = (calendrier[l] || []).length;
    if (!n) muets.push(l);
    else if (n > MAX_PAR_NIVEAU) surcharges.push(`${l} (${n} cartes)`);
  }
  const muetsCote = c => { const m = []; for (let l = 2; l <= 16; l++) if (!(parCote[c][l] || []).length) m.push(l); return m; };
  if (muets.length) dit('avertissement', h.id, null, `niveaux muets (rien ne change) : ${muets.join(', ')}.`);
  if (surcharges.length) dit('avertissement', h.id, null, `niveaux surchargés (> ${MAX_PAR_NIVEAU} cartes à la fois) : ${surcharges.join(', ')}.`);

  rapport.push({
    hero: h.id, nom: h.name, cartes: cartes.length, paliers: tiersTotal,
    nature: compte,
    partDeVerbes: tiersTotal ? +(1 - (compte.stats + compte.amp + compte.cout) / tiersTotal).toFixed(2) : 0,
    cartesToutNumeriques: cartesNumeriques, cartesSansVerbe,
    niveauxMuets: muets, niveauxMuetsBase: muetsCote('base'), niveauxMuetsSwitch: muetsCote('switch'),
    calendrier: Object.fromEntries(Object.entries(calendrier).sort((a, b) => a[0] - b[0]).map(([l, n]) => [l, n.length]))
  });
}

// ------------------------------------------------------------------ sortie
const erreurs = trouvailles.filter(t => t.niveau === 'erreur').length;
const avertissements = trouvailles.filter(t => t.niveau === 'avertissement').length;

if (flag('json')) {
  console.log(JSON.stringify({ reglages: { MAX_NIVEAU, MAX_PAR_NIVEAU, MAX_NUMERIQUES, MIN_VERBES_PAR_CARTE }, heros: rapport, trouvailles }, null, 2));
} else {
  console.log('Paliers par héros — part de VERBES (le reste = chiffres), cartes 100 % numériques, niveaux muets\n');
  for (const r of rapport) {
    const n = r.nature;
    console.log(`${r.hero.padEnd(10)} ${String(r.paliers).padStart(3)} paliers · verbes ${String(Math.round(r.partDeVerbes * 100)).padStart(3)} %`
      + ` (extra ${n.extra}, aura ${n.aura}, statique ${n.statique}, mot-clé ${n.motcle}, choisit-les-deux ${n.lesDeux})`
      + ` · chiffres (stats ${n.stats}, effet+ ${n.amp}, coût ${n.cout})`
      + ` · cartes 100 % chiffres : ${r.cartesToutNumeriques}/${r.cartes}`
      + ` · muets : ${r.niveauxMuets.length ? r.niveauxMuets.join(',') : '—'}`);
  }
  const ordre = { erreur: 0, avertissement: 1 };
  trouvailles.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
  if (trouvailles.length) {
    console.log('');
    for (const t of trouvailles) console.log(`${t.niveau === 'erreur' ? 'ERREUR      ' : 'attention   '}${t.hero}${t.carte ? ' · ' + t.carte : ''} — ${t.msg}`);
  }
  console.log(`\n${erreurs} erreur(s), ${avertissements} avertissement(s).`);
}
process.exit(erreurs || (flag('strict') && avertissements) ? 1 : 0);
