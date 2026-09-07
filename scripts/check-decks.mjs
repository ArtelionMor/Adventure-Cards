// CONTROLE DES DECKS — deux passes sur les donnees du Card Builder.
//
//   1. STATIQUE : les memes regles que le bandeau « À vérifier » du builder
//      (game/src/config/validate.js), mais en ligne de commande, sur le fichier
//      applique au jeu. C'est ce qui attrape un allie 0/0, une cible sans type,
//      une mecanique inconnue, un palier qui ne fait rien.
//
//   2. DYNAMIQUE : on joue vraiment les decks (le bot contre lui-meme) et on regarde
//      ce qui ne se produit JAMAIS — une carte qu'on ne peut pas payer, un moment
//      ecrit qui ne part pas. Une carte morte ne casse rien : elle ne se voit pas,
//      et c'est bien le probleme.
//
//   node scripts/check-decks.mjs [niveau] [parties par paire]
import { CHARACTER_DATA } from '../game/data/characters.data.js';
import { CHARACTERS, resolveCard } from '../game/src/config/characters.js';
import { ALL_EFFECTS, ALL_KEYWORDS, TRIGGERS, cardCost, pendingMechanics } from '../game/src/config/mechanics.js';
import { validateData } from '../game/src/config/validate.js';
import { campPerso, campPnj, duel } from '../game/src/tools/arene.js';

const NIVEAU = Number(process.argv[2] || 5);
const PARTIES = Number(process.argv[3] || 6);

const rouge = t => `\x1b[31m${t}\x1b[0m`;
const jaune = t => `\x1b[33m${t}\x1b[0m`;
const vert = t => `\x1b[32m${t}\x1b[0m`;

// ------------------------------------------------------------------ passe 1
console.log('\n=== 1. Regles de construction (les memes que le builder) ===\n');
const soucis = validateData(CHARACTER_DATA, ALL_EFFECTS, ALL_KEYWORDS);
const bloquants = soucis.filter(s => s.bad);
const avertis = soucis.filter(s => !s.bad);
for (const s of bloquants) console.log(rouge('  ERREUR    ') + s.msg);
for (const s of avertis) console.log(jaune('  attention ') + s.msg);
if (!soucis.length) console.log(vert('  Rien a signaler.'));

// Un cout superieur au mana max du personnage : la carte ne sortira jamais de la main
// quand il joue seul. Le builder ne peut pas le voir (il ne connait pas le mana du
// proprietaire au moment ou l'on tape le cout) ; d'ici, si.
console.log('');
let injouables = 0;
for (const ch of CHARACTERS) {
  const plafond = Math.min(ch.stats.mana, 10);
  for (const side of ['cards', 'switches']) {
    for (const def of ch[side] || []) {
      if (!def) continue;
      const c = resolveCard(def, NIVEAU);
      const cout = cardCost(c, null, 'p');
      if (cout > plafond) {
        injouables++;
        console.log(rouge('  ERREUR    ') + `${ch.name} · ${c.name} — coute ${cout}, or ${ch.name} plafonne a ${plafond} mana : injouable quand il part seul.`);
      }
    }
  }
}
if (!injouables) console.log(vert('  Toutes les cartes sont payables par leur personnage.'));

// ------------------------------------------------------------------ passe 2
// Les cartes switch sont la moitie du jeu : on monte un deck de chaque cote pour
// chaque personnage, sinon une carte switch morte ne se verrait jamais.
const equipes = [];
for (const c of CHARACTERS) for (const cote of ['cards', 'switches']) {
  equipes.push({ nom: `${c.name} (${cote === 'cards' ? 'base' : 'switch'})`, cote, cfg: campPerso([c.id], NIVEAU, cote) });
}
// Les adversaires jouent aussi : leurs decks sont des decks comme les autres, et une
// carte libre qu'aucun PNJ ne joue jamais est une carte morte de plus.
for (const n of CHARACTER_DATA.npcs || []) {
  const cfg = campPnj(n.id);
  if (cfg && cfg.deck.length) equipes.push({ nom: `${n.name} (PNJ)`, cote: 'npc', cfg });
}
const paires = equipes.length * (equipes.length - 1);
console.log(`\n=== 2. Ce que ${paires * PARTIES} parties montrent vraiment (niveau ${NIVEAU}) ===\n`);

const jouees = new Map();     // nom de carte -> combien de fois posee
const piochees = new Map();   // nom de carte -> combien de fois vue en main
const declenches = new Set(); // moments qui sont vraiment partis
const compte = (m, nom) => m.set(nom, (m.get(nom) || 0) + 1);

let parties = 0, bloquees = 0, tours = 0, nulles = 0;
for (const a of equipes) {
  for (const b of equipes) {
    if (a === b) continue;
    for (let i = 0; i < PARTIES; i++) {
      const { winner, B } = duel(a.cfg, b.cfg);
      parties++;
      tours += B.turnNo;
      if (winner === 'stuck') bloquees++;
      if (winner === 'draw') nulles++;
      for (const k of ['p', 'e']) {
        // Une carte posee est soit a la defausse (sort joue, allie mort), soit sur le
        // plateau (allie encore en vie, sa carte voyage avec l'unite).
        const posees = [...B[k].discard, ...B[k].board.map(u => u.card).filter(Boolean)];
        for (const c of posees) { compte(jouees, c.name); compte(piochees, c.name); }
        for (const c of B[k].hand) compte(piochees, c.name);
      }
      for (const slot of Object.keys(B.fired)) declenches.add(slot);
    }
  }
}

console.log(`  ${parties} parties, ${(tours / parties).toFixed(1)} tours en moyenne, ${nulles} nulle(s).`);
if (bloquees) console.log(rouge(`  ${bloquees} partie(s) bloquee(s) : le moteur tourne en rond.`));
else console.log(vert('  Aucune partie bloquee.'));

// Cartes qui ne sortent jamais, base ET switch ET libres.
const mortes = [];
for (const c of CHARACTER_DATA.library || []) {
  if (c && !jouees.get(c.name)) mortes.push(`Cartes libres · ${c.name}`
    + (piochees.get(c.name) ? ' — piochee mais jamais posee' : ' — jamais vue (aucun PNJ ne la joue ?)'));
}
for (const ch of CHARACTERS) {
  for (const cote of ['cards', 'switches']) {
    for (const def of ch[cote] || []) {
      if (!def) continue;
      const nom = resolveCard(def, NIVEAU).name;
      if (!jouees.get(nom)) mortes.push(`${ch.name} · ${nom} (${cote === 'cards' ? 'base' : 'switch'})`
        + (piochees.get(nom) ? ' — piochee mais jamais posee' : ' — jamais vue'));
    }
  }
}
console.log('');
if (mortes.length) {
  console.log(jaune(`  ${mortes.length} carte(s) jamais posee(s) :`));
  for (const m of mortes) console.log('    - ' + m);
  console.log('    (le bot peut aussi ne pas savoir s\'en servir : a lire avec les yeux du designer)');
} else console.log(vert('  Toutes les cartes sont sorties au moins une fois.'));

// Moments ecrits sur une carte mais jamais declenches.
const ecrits = new Set();
for (const ch of CHARACTERS) {
  for (const side of ['cards', 'switches']) {
    for (const def of ch[side] || []) {
      if (!def) continue;
      const voir = h => { for (const slot of Object.keys(TRIGGERS)) if ((h[slot] || []).length) ecrits.add(slot); };
      voir(def);
      for (const t of def.tiers || []) if (t.extra) ecrits.add(TRIGGERS[t.slot] ? t.slot : 'play');
    }
  }
}
const jamais = [...ecrits].filter(slot => !declenches.has(slot));
console.log('');
if (jamais.length) {
  console.log(jaune(`  Moments ecrits sur une carte mais jamais declenches au niveau ${NIVEAU} :`));
  for (const slot of jamais) console.log(`    - ${TRIGGERS[slot].label}`);
  console.log(`    (un palier plus haut peut les debloquer : relancer avec un niveau superieur)`);
} else console.log(vert('  Tous les moments ecrits se sont declenches au moins une fois.'));

// ------------------------------------------------------------------ resume
const todo = pendingMechanics();
if (todo.length) console.log(jaune(`\n  ${todo.length} mecanique(s) restent a coder — voir docs/MECANIQUES-A-CODER.md`));
const erreurs = bloquants.length + injouables + bloquees;
console.log(`\n${erreurs} erreur(s), ${avertis.length + mortes.length + jamais.length} avertissement(s).\n`);
process.exit(erreurs ? 1 : 0);
